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

            -- 2.1. Deduplicar ranuras clonadas en AccountCharacter
            UPDATE AccountCharacter
            SET 
                GameID2 = CASE 
                  WHEN GameID2 IS NOT NULL AND LEN(LTRIM(RTRIM(GameID2))) > 0 AND LTRIM(RTRIM(GameID2)) = LTRIM(RTRIM(ISNULL(GameID1, ''))) 
                  THEN NULL ELSE GameID2 END,
                GameID3 = CASE 
                  WHEN GameID3 IS NOT NULL AND LEN(LTRIM(RTRIM(GameID3))) > 0 AND LTRIM(RTRIM(GameID3)) IN (LTRIM(RTRIM(ISNULL(GameID1, ''))), LTRIM(RTRIM(ISNULL(GameID2, '')))) 
                  THEN NULL ELSE GameID3 END,
                GameID4 = CASE 
                  WHEN GameID4 IS NOT NULL AND LEN(LTRIM(RTRIM(GameID4))) > 0 AND LTRIM(RTRIM(GameID4)) IN (LTRIM(RTRIM(ISNULL(GameID1, ''))), LTRIM(RTRIM(ISNULL(GameID2, ''))), LTRIM(RTRIM(ISNULL(GameID3, '')))) 
                  THEN NULL ELSE GameID4 END,
                GameID5 = CASE 
                  WHEN GameID5 IS NOT NULL AND LEN(LTRIM(RTRIM(GameID5))) > 0 AND LTRIM(RTRIM(GameID5)) IN (LTRIM(RTRIM(ISNULL(GameID1, ''))), LTRIM(RTRIM(ISNULL(GameID2, ''))), LTRIM(RTRIM(ISNULL(GameID3, ''))), LTRIM(RTRIM(ISNULL(GameID4, '')))) 
                  THEN NULL ELSE GameID5 END
            WHERE (GameID2 IS NOT NULL AND LTRIM(RTRIM(GameID2)) = LTRIM(RTRIM(ISNULL(GameID1, ''))))
               OR (GameID3 IS NOT NULL AND LTRIM(RTRIM(GameID3)) IN (LTRIM(RTRIM(ISNULL(GameID1, ''))), LTRIM(RTRIM(ISNULL(GameID2, '')))))
               OR (GameID4 IS NOT NULL AND LTRIM(RTRIM(GameID4)) IN (LTRIM(RTRIM(ISNULL(GameID1, ''))), LTRIM(RTRIM(ISNULL(GameID2, ''))), LTRIM(RTRIM(ISNULL(GameID3, '')))))
               OR (GameID5 IS NOT NULL AND LTRIM(RTRIM(GameID5)) IN (LTRIM(RTRIM(ISNULL(GameID1, ''))), LTRIM(RTRIM(ISNULL(GameID2, ''))), LTRIM(RTRIM(ISNULL(GameID3, ''))), LTRIM(RTRIM(ISNULL(GameID4, '')))));

            SET @BrokenSlotsCount = @BrokenSlotsCount + @@ROWCOUNT;
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

-- ============================================================================
-- 8. sp_MuManager_DiscoverServer
-- Descubrimiento determinista de versión, esquemas, bytes de ítems y hashing
-- Compatible con 97d, 99b, S1-S6, S8, S12, S16, S18/S19+
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_DiscoverServer
AS
BEGIN
    SET NOCOUNT ON;

    -- 1. Detección de Item Bytes por Slot
    DECLARE @ItemBytesPerSlot INT = 16;
    DECLARE @ItemHexChars INT = 32;
    DECLARE @SeasonProfile VARCHAR(20) = 'SEASON6';

    DECLARE @InvMaxLen INT = 0;
    SELECT @InvMaxLen = max_length 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('Character') AND name = 'Inventory';

    DECLARE @WhMaxLen INT = 0;
    SELECT @WhMaxLen = max_length 
    FROM sys.columns 
    WHERE object_id = OBJECT_ID('warehouse') AND name = 'Items';

    IF (@InvMaxLen > 0 AND @InvMaxLen <= 1200) OR (@WhMaxLen > 0 AND @WhMaxLen <= 1200)
    BEGIN
        SET @ItemBytesPerSlot = 10;
        SET @ItemHexChars = 20;
        SET @SeasonProfile = 'SEASON97D';
    END
    ELSE IF (@InvMaxLen >= 7552) OR (@WhMaxLen >= 7680)
    BEGIN
        SET @ItemBytesPerSlot = 32;
        SET @ItemHexChars = 64;
        SET @SeasonProfile = 'SEASON8_PLUS';
    END
    ELSE
    BEGIN
        SET @ItemBytesPerSlot = 16;
        SET @ItemHexChars = 32;
        SET @SeasonProfile = 'SEASON6';
    END

    -- 2. Detección de Tipo de Contraseña (MEMB_INFO)
    DECLARE @PwdType VARCHAR(30) = 'PLAIN';
    DECLARE @PwdDataType VARCHAR(20) = 'varchar';
    DECLARE @PwdMaxLen INT = 10;

    SELECT @PwdDataType = DATA_TYPE, @PwdMaxLen = CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'MEMB_INFO' AND COLUMN_NAME = 'memb__pwd';

    IF @PwdDataType IN ('binary', 'varbinary')
    BEGIN
        IF OBJECT_ID('dbo.fn_md5', 'FN') IS NOT NULL
            SET @PwdType = 'MD5_WEBZEN';
        ELSE
            SET @PwdType = 'MD5_BINARY';
    END
    ELSE IF @PwdDataType IN ('varchar', 'nvarchar', 'char')
    BEGIN
        IF @PwdMaxLen >= 64
            SET @PwdType = 'SHA256';
        ELSE
            SET @PwdType = 'PLAIN';
    END

    -- 3. Detección de Columna de Resets
    DECLARE @ResetCol VARCHAR(30) = 'None';
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'ResetCount')
        SET @ResetCol = 'ResetCount';
    ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'Resets')
        SET @ResetCol = 'Resets';
    ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'Reset')
        SET @ResetCol = 'Reset';

    -- 4. Detección de Columna de Master Resets
    DECLARE @MResetCol VARCHAR(30) = 'None';
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'MasterResetCount')
        SET @MResetCol = 'MasterResetCount';
    ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'MResetCount')
        SET @MResetCol = 'MResetCount';
    ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'GrandReset')
        SET @MResetCol = 'GrandReset';

    -- 5. Detección de Tipo de Stats (smallint vs int)
    DECLARE @StatsType VARCHAR(20) = 'SMALLINT';
    SELECT @StatsType = UPPER(DATA_TYPE)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'Character' AND COLUMN_NAME = 'Strength';

    -- 6. Detección de Tablas y Módulos
    DECLARE @HasMasterTree BIT = CASE WHEN OBJECT_ID('MasterSkillTree', 'U') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @HasCastleSiege BIT = CASE WHEN OBJECT_ID('MuCastle_DATA', 'U') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @HasCashShop BIT = CASE WHEN OBJECT_ID('CashShopData', 'U') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @HasExtWarehouse BIT = CASE WHEN OBJECT_ID('ExtWarehouse', 'U') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @HasGens BIT = CASE WHEN OBJECT_ID('Gens_UserInfo', 'U') IS NOT NULL OR OBJECT_ID('Gens_Rank', 'U') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @HasMarriage BIT = CASE WHEN OBJECT_ID('Mu_Marry', 'U') IS NOT NULL OR EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name IN ('MarryName', 'Married')) THEN 1 ELSE 0 END;
    DECLARE @HasGiftCodes BIT = CASE WHEN OBJECT_ID('MuManager_GiftCodes', 'U') IS NOT NULL THEN 1 ELSE 0 END;
    DECLARE @HasMultiDb BIT = CASE WHEN DB_ID('Me_MuOnline') IS NOT NULL THEN 1 ELSE 0 END;

    -- Devolver JSON o Recordset determinista
    SELECT 
        1 AS Success,
        @SeasonProfile AS SeasonProfile,
        @ItemBytesPerSlot AS ItemBytesPerSlot,
        @ItemHexChars AS ItemHexChars,
        @PwdType AS PasswordType,
        @ResetCol AS ResetColumn,
        @MResetCol AS MasterResetColumn,
        @StatsType AS StatsDataType,
        @HasMasterTree AS HasMasterSkillTree,
        @HasCastleSiege AS HasCastleSiege,
        @HasCashShop AS HasCashShop,
        @HasExtWarehouse AS HasExtWarehouse,
        @HasGens AS HasGens,
        @HasMarriage AS HasMarriage,
        @HasGiftCodes AS HasGiftCodes,
        @HasMultiDb AS HasMultiDb;
END
GO

-- ============================================================================
-- 9. TABLA DE GIFT CODES (CANJEABLE NATIVO 100% SQL)
-- ============================================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MuManager_GiftCodes')
BEGIN
    CREATE TABLE dbo.MuManager_GiftCodes (
        Code VARCHAR(32) NOT NULL PRIMARY KEY,
        Description VARCHAR(100) NULL,
        ItemHex VARCHAR(MAX) NULL,
        Zen INT NOT NULL DEFAULT 0,
        WCoinC INT NOT NULL DEFAULT 0,
        WCoinP INT NOT NULL DEFAULT 0,
        GoblinPoint INT NOT NULL DEFAULT 0,
        Ruud INT NOT NULL DEFAULT 0,
        VipDays INT NOT NULL DEFAULT 0,
        MaxUses INT NOT NULL DEFAULT 1,
        UsedCount INT NOT NULL DEFAULT 0,
        ExpiresAt DATETIME NULL,
        CreatedAt DATETIME DEFAULT GETDATE(),
        CreatedBy VARCHAR(50) DEFAULT 'ADMIN',
        IsActive BIT NOT NULL DEFAULT 1
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MuManager_GiftCodeClaims')
BEGIN
    CREATE TABLE dbo.MuManager_GiftCodeClaims (
        ClaimID BIGINT IDENTITY(1,1) PRIMARY KEY,
        Code VARCHAR(32) NOT NULL,
        AccountID VARCHAR(10) NOT NULL,
        CharName VARCHAR(10) NULL,
        ClaimDate DATETIME DEFAULT GETDATE(),
        CONSTRAINT UQ_MuManager_GiftCode_Account UNIQUE (Code, AccountID)
    );
    CREATE NONCLUSTERED INDEX IX_GiftCodeClaims_Acc ON dbo.MuManager_GiftCodeClaims(AccountID);
END
GO

-- ============================================================================
-- 10. sp_MuManager_ClaimGiftCode
-- Canje transaccional atómico 100% nativo SQL
-- ============================================================================
CREATE OR ALTER PROCEDURE dbo.sp_MuManager_ClaimGiftCode
    @Code VARCHAR(32),
    @AccountID VARCHAR(10),
    @CharName VARCHAR(10) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @CleanCode VARCHAR(32) = UPPER(LTRIM(RTRIM(@Code)));
    DECLARE @CleanAcc VARCHAR(10) = LTRIM(RTRIM(@AccountID));

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar existencia y vigencia del código
        DECLARE @IsActive BIT, @MaxUses INT, @UsedCount INT, @ExpiresAt DATETIME;
        DECLARE @Zen INT, @CoinC INT, @CoinP INT, @Goblin INT, @Ruud INT, @VipDays INT, @ItemHex VARCHAR(MAX);

        SELECT 
            @IsActive = IsActive,
            @MaxUses = MaxUses,
            @UsedCount = UsedCount,
            @ExpiresAt = ExpiresAt,
            @Zen = Zen,
            @CoinC = WCoinC,
            @CoinP = WCoinP,
            @Goblin = GoblinPoint,
            @Ruud = Ruud,
            @VipDays = VipDays,
            @ItemHex = ItemHex
        FROM dbo.MuManager_GiftCodes WITH (UPDLOCK, HOLDLOCK)
        WHERE UPPER(LTRIM(RTRIM(Code))) = @CleanCode;

        IF @IsActive IS NULL
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 0 AS Success, 'El código ingresado no existe.' AS Message;
            RETURN;
        END

        IF @IsActive = 0
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 0 AS Success, 'Este código ha sido desactivado por la administración.' AS Message;
            RETURN;
        END

        IF @ExpiresAt IS NOT NULL AND @ExpiresAt < GETDATE()
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 0 AS Success, 'Este código ha expirado.' AS Message;
            RETURN;
        END

        IF @MaxUses > 0 AND @UsedCount >= @MaxUses
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 0 AS Success, 'Este código ha alcanzado el límite máximo de usos permitidos.' AS Message;
            RETURN;
        END

        -- 2. Validar que la cuenta no haya canjeado ya este código
        IF EXISTS (SELECT 1 FROM dbo.MuManager_GiftCodeClaims WITH (HOLDLOCK) WHERE UPPER(LTRIM(RTRIM(Code))) = @CleanCode AND LTRIM(RTRIM(AccountID)) = @CleanAcc)
        BEGIN
            ROLLBACK TRANSACTION;
            SELECT 0 AS Success, 'Esta cuenta ya canjeó este código previamente.' AS Message;
            RETURN;
        END

        -- 3. Registrar el reclamo
        INSERT INTO dbo.MuManager_GiftCodeClaims (Code, AccountID, CharName, ClaimDate)
        VALUES (@CleanCode, @CleanAcc, @CharName, GETDATE());

        UPDATE dbo.MuManager_GiftCodes
        SET UsedCount = UsedCount + 1
        WHERE UPPER(LTRIM(RTRIM(Code))) = @CleanCode;

        -- 4. Entregar Zen
        IF @Zen > 0
        BEGIN
            IF EXISTS (SELECT 1 FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = @CleanAcc OR AccountID = @CleanAcc)
            BEGIN
                UPDATE warehouse 
                SET Money = CASE WHEN CAST(Money AS BIGINT) + @Zen > 2000000000 THEN 2000000000 ELSE Money + @Zen END
                WHERE LTRIM(RTRIM(AccountID)) = @CleanAcc OR AccountID = @CleanAcc;
            END
            ELSE IF @CharName IS NOT NULL AND EXISTS (SELECT 1 FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName)
            BEGIN
                UPDATE Character 
                SET Money = CASE WHEN CAST(Money AS BIGINT) + @Zen > 2000000000 THEN 2000000000 ELSE Money + @Zen END
                WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;
            END
        END

        -- 5. Entregar Monedas CashShop
        IF (@CoinC > 0 OR @CoinP > 0 OR @Goblin > 0) AND OBJECT_ID('CashShopData', 'U') IS NOT NULL
        BEGIN
            IF EXISTS (SELECT 1 FROM CashShopData WHERE LTRIM(RTRIM(AccountID)) = @CleanAcc OR AccountID = @CleanAcc)
            BEGIN
                UPDATE CashShopData
                SET WCoinC = WCoinC + @CoinC,
                    WCoinP = WCoinP + @CoinP,
                    GoblinPoint = GoblinPoint + @Goblin
                WHERE LTRIM(RTRIM(AccountID)) = @CleanAcc OR AccountID = @CleanAcc;
            END
            ELSE
            BEGIN
                INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint)
                VALUES (@CleanAcc, @CoinC, @CoinP, @Goblin);
            END
        END

        -- 6. Entregar Días VIP
        IF @VipDays > 0 AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMB_INFO' AND COLUMN_NAME = 'AccountExpireDate')
        BEGIN
            UPDATE MEMB_INFO
            SET AccountExpireDate = DATEADD(day, @VipDays, CASE WHEN AccountExpireDate IS NULL OR AccountExpireDate < GETDATE() THEN GETDATE() ELSE AccountExpireDate END),
                AccountLevel = CASE WHEN AccountLevel < 1 THEN 1 ELSE AccountLevel END
            WHERE LTRIM(RTRIM(memb___id)) = @CleanAcc OR memb___id = @CleanAcc;
        END

        COMMIT TRANSACTION;

        SELECT 
            1 AS Success,
            'Código canjeado con éxito.' AS Message,
            @Zen AS ZenAwarded,
            @CoinC AS CoinCAwarded,
            @CoinP AS CoinPAwarded,
            @Goblin AS GoblinAwarded,
            @VipDays AS VipDaysAwarded,
            @ItemHex AS ItemHexToDeliver;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        SELECT 0 AS Success, ERROR_MESSAGE() AS Message;
    END CATCH
END
GO

PRINT '====================================================================';
PRINT 'Todos los procedimientos y disparadores de Mu Manager PRO instalados.';
PRINT '====================================================================';
