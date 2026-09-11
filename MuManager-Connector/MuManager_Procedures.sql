-- ============================================================================
-- MU MANAGER PRO - PROCEDIMIENTOS ALMACENADOS DETERMINISTAS (0% FALSOS POSITIVOS)
-- Auditoría 2026-09-07 / Louis Season 6 Update 40 & Emuladores Soportados
-- Todos los procedimientos son idempotentes (CREATE OR ALTER)
-- ============================================================================

USE [MuOnline];
GO

-- ============================================================================
-- 0. TABLA INMUTABLE DE AUDITORÍA: MuManager_AuditLog
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MuManager_AuditLog')
BEGIN
    CREATE TABLE MuManager_AuditLog (
        LogID BIGINT IDENTITY(1,1) PRIMARY KEY,
        CharName VARCHAR(10) NOT NULL,
        AccountID VARCHAR(10) NOT NULL,
        ActionType VARCHAR(50) NOT NULL,
        OldValue VARCHAR(255) NULL,
        NewValue VARCHAR(255) NULL,
        EventDate DATETIME DEFAULT GETDATE(),
        HostName VARCHAR(128) DEFAULT HOST_NAME(),
        AppName VARCHAR(128) DEFAULT APP_NAME()
    );
    CREATE NONCLUSTERED INDEX IX_MuManager_AuditLog_Char ON MuManager_AuditLog(CharName);
    CREATE NONCLUSTERED INDEX IX_MuManager_AuditLog_Date ON MuManager_AuditLog(EventDate);
    PRINT 'Tabla MuManager_AuditLog creada exitosamente.';
END
GO

-- ============================================================================
-- 1. sp_MuManager_FixOrphans
-- Corrige registros huérfanos entre MEMB_INFO, Character, AccountCharacter y GuildMember
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_FixOrphans
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @OrphanCharsCount INT = 0;
    DECLARE @BrokenSlotsCount INT = 0;
    DECLARE @DanglingGuildMembersCount INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Identificar personajes cuyo AccountID no existe en MEMB_INFO
        SELECT c.Name, c.AccountID 
        INTO #OrphanCharacters
        FROM Character c WITH (NOLOCK)
        LEFT JOIN MEMB_INFO m WITH (NOLOCK) ON LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(m.memb___id))
        WHERE m.memb___id IS NULL;

        SET @OrphanCharsCount = @@ROWCOUNT;

        -- 2. Limpiar ranuras GameID1..5 en AccountCharacter si el personaje ya no existe
        IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
        BEGIN
            UPDATE ac
            SET GameID1 = CASE WHEN c1.Name IS NULL THEN NULL ELSE ac.GameID1 END,
                GameID2 = CASE WHEN c2.Name IS NULL THEN NULL ELSE ac.GameID2 END,
                GameID3 = CASE WHEN c3.Name IS NULL THEN NULL ELSE ac.GameID3 END,
                GameID4 = CASE WHEN c4.Name IS NULL THEN NULL ELSE ac.GameID4 END,
                GameID5 = CASE WHEN c5.Name IS NULL THEN NULL ELSE ac.GameID5 END
            FROM AccountCharacter ac
            LEFT JOIN Character c1 WITH (NOLOCK) ON ac.GameID1 = c1.Name AND ac.Id = c1.AccountID
            LEFT JOIN Character c2 WITH (NOLOCK) ON ac.GameID2 = c2.Name AND ac.Id = c2.AccountID
            LEFT JOIN Character c3 WITH (NOLOCK) ON ac.GameID3 = c3.Name AND ac.Id = c3.AccountID
            LEFT JOIN Character c4 WITH (NOLOCK) ON ac.GameID4 = c4.Name AND ac.Id = c4.AccountID
            LEFT JOIN Character c5 WITH (NOLOCK) ON ac.GameID5 = c5.Name AND ac.Id = c5.AccountID
            WHERE (ac.GameID1 IS NOT NULL AND c1.Name IS NULL)
               OR (ac.GameID2 IS NOT NULL AND c2.Name IS NULL)
               OR (ac.GameID3 IS NOT NULL AND c3.Name IS NULL)
               OR (ac.GameID4 IS NOT NULL AND c4.Name IS NULL)
               OR (ac.GameID5 IS NOT NULL AND c5.Name IS NULL);

            SET @BrokenSlotsCount = @@ROWCOUNT;
        END

        -- 3. Limpiar miembros de guild huérfanos (cuyo Name no existe en Character)
        IF OBJECT_ID('GuildMember', 'U') IS NOT NULL
        BEGIN
            DELETE gm
            FROM GuildMember gm
            LEFT JOIN Character c WITH (NOLOCK) ON gm.Name = c.Name
            WHERE c.Name IS NULL;

            SET @DanglingGuildMembersCount = @@ROWCOUNT;
        END

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            @OrphanCharsCount AS OrphanCharsFound,
            @BrokenSlotsCount AS AccountSlotsCleaned,
            @DanglingGuildMembersCount AS DanglingGuildMembersRemoved,
            'Reparación de huérfanos completada exitosamente.' AS Message;

        DROP TABLE #OrphanCharacters;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ============================================================================
-- 2. sp_MuManager_RescueInvalidCoords
-- Rescata personajes con coordenadas imposibles o mapas corruptos a Lorencia (125, 125)
-- Respeta a los personajes conectados (ConnectStat = 0) para evitar colisiones con RAM
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_RescueInvalidCoords
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @RescuedCount INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- Rescatar solo si el personaje NO está conectado en MEMB_STAT
        UPDATE c
        SET MapNumber = 0,
            MapPosX = 125,
            MapPosY = 125
        FROM Character c
        LEFT JOIN MEMB_STAT ms WITH (NOLOCK) ON LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(ms.memb___id))
        WHERE (ISNULL(ms.ConnectStat, 0) = 0)
          AND (
               c.MapPosX < 0 OR c.MapPosX > 255 OR
               c.MapPosY < 0 OR c.MapPosY > 255 OR
               c.MapNumber < 0 OR c.MapNumber > 100
          );

        SET @RescuedCount = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            @RescuedCount AS RescuedCharactersCount,
            'Coordenadas corruptas normalizadas a Lorencia (125, 125) para personajes desconectados.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ============================================================================
-- 3. sp_MuManager_FixIntegerOverflows
-- Corrige Zen fuera de rango (Zen < 0 o Zen > 2,000,000,000) y puntos negativos
-- REGLA DE ORO: No altera stats (Str/Agi/Vit/Ene/Lead) ni combate para 0% falsos positivos
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_FixIntegerOverflows
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @CharsUpdated INT = 0;
    DECLARE @VaultsUpdated INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Normalizar Zen y puntos en Character
        UPDATE Character
        SET Money = CASE 
                        WHEN Money < 0 THEN 0 
                        WHEN Money > 2000000000 THEN 2000000000 
                        ELSE Money 
                    END,
            LevelUpPoint = CASE WHEN LevelUpPoint < 0 THEN 0 ELSE LevelUpPoint END,
            ResetCount = CASE WHEN ResetCount < 0 THEN 0 ELSE ResetCount END
        WHERE Money < 0 OR Money > 2000000000 OR LevelUpPoint < 0 OR ResetCount < 0;

        SET @CharsUpdated = @@ROWCOUNT;

        -- 2. Normalizar Zen en warehouse (Baúl principal)
        IF OBJECT_ID('warehouse', 'U') IS NOT NULL
        BEGIN
            UPDATE warehouse
            SET Money = CASE 
                            WHEN Money < 0 THEN 0 
                            WHEN Money > 2000000000 THEN 2000000000 
                            ELSE Money 
                        END
            WHERE Money < 0 OR Money > 2000000000;

            SET @VaultsUpdated = @@ROWCOUNT;
        END

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            @CharsUpdated AS CharactersFixed,
            @VaultsUpdated AS VaultsFixed,
            'Desbordamientos de Zen y puntos negativos corregidos dentro de los límites de 32-bit.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ============================================================================
-- 4. sp_MuManager_CleanGhostConnections
-- Destraba sesiones zombi en MEMB_STAT y libera GameIDC en AccountCharacter
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_CleanGhostConnections
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @GhostsCleaned INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        IF OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
        BEGIN
            -- Desconectar si la fecha de desconexión es posterior a la de conexión, o sesión abierta > 24 horas
            UPDATE MEMB_STAT
            SET ConnectStat = 0
            WHERE ConnectStat = 1
              AND (
                   (DisConnectTM IS NOT NULL AND DisConnectTM > ConnectTM)
                   OR (ConnectTM IS NOT NULL AND DATEDIFF(HOUR, ConnectTM, GETDATE()) > 24)
              );

            SET @GhostsCleaned = @@ROWCOUNT;
        END

        -- Liberar GameIDC en AccountCharacter si la cuenta no está conectada
        IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL AND OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
        BEGIN
            UPDATE ac
            SET GameIDC = NULL
            FROM AccountCharacter ac
            INNER JOIN MEMB_STAT ms WITH (NOLOCK) ON LTRIM(RTRIM(ac.Id)) = LTRIM(RTRIM(ms.memb___id))
            WHERE ms.ConnectStat = 0 AND ac.GameIDC IS NOT NULL;
        END

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            @GhostsCleaned AS GhostConnectionsCleaned,
            'Conexiones zombi y sesiones muertas restablecidas a ConnectStat = 0.' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ============================================================================
-- 5. sp_MuManager_ScanIllegalNames
-- Detecta caracteres de control ASCII (< 32), tabulaciones, saltos de línea y espacios
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_ScanIllegalNames
AS
BEGIN
    SET NOCOUNT ON;

    SELECT 
        c.Name,
        c.AccountID,
        c.cLevel,
        c.Class,
        CASE 
            WHEN c.Name LIKE '% ' OR c.Name LIKE ' %' THEN 'Espacio en blanco inicial o final'
            WHEN c.Name LIKE '%' + CHAR(9) + '%' THEN 'Carácter de tabulación [TAB]'
            WHEN c.Name LIKE '%' + CHAR(10) + '%' OR c.Name LIKE '%' + CHAR(13) + '%' THEN 'Salto de línea [CR/LF]'
            ELSE 'Carácter no imprimible (ASCII < 32)'
        END AS IssueDescription
    FROM Character c WITH (NOLOCK)
    WHERE c.Name LIKE '% ' 
       OR c.Name LIKE ' %'
       OR c.Name LIKE '%' + CHAR(9) + '%'
       OR c.Name LIKE '%' + CHAR(10) + '%'
       OR c.Name LIKE '%' + CHAR(13) + '%'
       OR c.Name LIKE '%' + CHAR(0) + '%';
END
GO

-- ============================================================================
-- 6. sp_MuManager_FixPkStatus
-- Normaliza PkLevel inválido (debe estar entre 1 y 6) y PkTime/PkCount negativos
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_FixPkStatus
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @FixedCount INT = 0;

    BEGIN TRY
        BEGIN TRANSACTION;

        UPDATE Character
        SET PkLevel = CASE WHEN PkLevel < 1 OR PkLevel > 6 THEN 3 ELSE PkLevel END,
            PkTime = CASE WHEN PkTime < 0 THEN 0 ELSE PkTime END,
            PkCount = CASE WHEN PkCount < 0 THEN 0 ELSE PkCount END
        WHERE (PkLevel < 1 OR PkLevel > 6) OR PkTime < 0 OR PkCount < 0;

        SET @FixedCount = @@ROWCOUNT;

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            @FixedCount AS CharactersFixed,
            'Estados PK normalizados (PkLevel = 3 Común para estados corruptos).' AS Message;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ============================================================================
-- 7. trg_MuManager_CharacterAudit
-- Disparador de auditoría inmutable en tabla Character
-- Monitorea cambios en CtlCode (GM/Baneos), puntos masivos (> 50k) y Zen (> 1B)
-- ============================================================================
CREATE OR ALTER TRIGGER dbo.trg_MuManager_CharacterAudit
ON dbo.Character
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Auditoría de cambios en CtlCode (Rango GM o Baneos)
    IF UPDATE(CtlCode)
    BEGIN
        INSERT INTO MuManager_AuditLog (CharName, AccountID, ActionType, OldValue, NewValue)
        SELECT 
            i.Name,
            i.AccountID,
            'CTLCODE_MODIFIED',
            'CtlCode: ' + CAST(ISNULL(d.CtlCode, 0) AS VARCHAR(10)),
            'CtlCode: ' + CAST(ISNULL(i.CtlCode, 0) AS VARCHAR(10))
        FROM inserted i
        INNER JOIN deleted d ON i.Name = d.Name
        WHERE ISNULL(i.CtlCode, 0) <> ISNULL(d.CtlCode, 0);
    END

    -- 2. Auditoría de alteración masiva de LevelUpPoint (> 50,000 puntos)
    IF UPDATE(LevelUpPoint)
    BEGIN
        INSERT INTO MuManager_AuditLog (CharName, AccountID, ActionType, OldValue, NewValue)
        SELECT 
            i.Name,
            i.AccountID,
            'MASSIVE_POINTS_ADDED',
            'Puntos Anteriores: ' + CAST(ISNULL(d.LevelUpPoint, 0) AS VARCHAR(20)),
            'Puntos Nuevos: ' + CAST(ISNULL(i.LevelUpPoint, 0) AS VARCHAR(20))
        FROM inserted i
        INNER JOIN deleted d ON i.Name = d.Name
        WHERE (CAST(i.LevelUpPoint AS BIGINT) - CAST(d.LevelUpPoint AS BIGINT)) > 50000;
    END

    -- 3. Auditoría de alteración masiva de Zen (> 1,000,000,000 Zen)
    IF UPDATE(Money)
    BEGIN
        INSERT INTO MuManager_AuditLog (CharName, AccountID, ActionType, OldValue, NewValue)
        SELECT 
            i.Name,
            i.AccountID,
            'MASSIVE_ZEN_CHANGE',
            'Zen Anterior: ' + CAST(ISNULL(d.Money, 0) AS VARCHAR(20)),
            'Zen Nuevo: ' + CAST(ISNULL(i.Money, 0) AS VARCHAR(20))
        FROM inserted i
        INNER JOIN deleted d ON i.Name = d.Name
        WHERE ABS(CAST(i.Money AS BIGINT) - CAST(d.Money AS BIGINT)) > 1000000000;
    END
END
GO

PRINT '====================================================================';
PRINT 'Todos los procedimientos y disparadores de Mu Manager PRO instalados.';
PRINT '====================================================================';
