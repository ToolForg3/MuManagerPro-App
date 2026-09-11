-- =========================================================================
--   MU MANAGER PRO - SCRIPT DE CREACIÓN DE CUENTAS DE TEST PARA MU ONLINE
-- =========================================================================
--   Instrucciones:
--   1. Abre SQL Server Management Studio (SSMS) en tu VPS o PC de servidor MU.
--   2. Abre este archivo o copia y pega este contenido.
--   3. Presiona F5 o haz clic en Execute.
--   4. ¡Listo! Ya tendrás 2 cuentas y 2 personajes listos para probar con la app.
-- =========================================================================

USE [MuOnline]
GO

SET NOCOUNT ON;

PRINT '====================================================';
PRINT '  MU MANAGER PRO - CREANDO CUENTAS Y PJS DE TEST';
PRINT '====================================================';

-- 1. CUENTA TEST ADMIN (Nivel VIP / GM)
IF NOT EXISTS (SELECT 1 FROM MEMB_INFO WHERE memb___id = 'testadmin')
BEGIN
    INSERT INTO MEMB_INFO (
        memb___id, memb__pwd, memb_name, sno__numb, post_code, 
        addr_info, addr_deta, tel__numb, mail_addr, fpas_ques, 
        fpas_answ, job__code, appl_days, modi_days, out__days, 
        true_days, mail_chek, bloc_code, ctl1_code, AccountLevel
    )
    VALUES (
        'testadmin', 'test1234', 'Admin Test', '1111111111111', '1234',
        'Local', 'Local', '12345678', 'testadmin@muonline.com', 'pregunta',
        'respuesta', '1', GETDATE(), GETDATE(), GETDATE(),
        GETDATE(), '1', '0', '0', 2
    );
    PRINT '[OK] Cuenta [testadmin] creada con clave: test1234 (Nivel VIP: 2)';
END
ELSE
BEGIN
    PRINT '[INFO] Cuenta [testadmin] ya existia en el servidor.';
END
GO

-- 2. CUENTA TEST USER (Jugador Normal)
IF NOT EXISTS (SELECT 1 FROM MEMB_INFO WHERE memb___id = 'testuser')
BEGIN
    INSERT INTO MEMB_INFO (
        memb___id, memb__pwd, memb_name, sno__numb, post_code, 
        addr_info, addr_deta, tel__numb, mail_addr, fpas_ques, 
        fpas_answ, job__code, appl_days, modi_days, out__days, 
        true_days, mail_chek, bloc_code, ctl1_code, AccountLevel
    )
    VALUES (
        'testuser', 'test1234', 'User Test', '2222222222222', '1234',
        'Local', 'Local', '12345678', 'testuser@muonline.com', 'pregunta',
        'respuesta', '1', GETDATE(), GETDATE(), GETDATE(),
        GETDATE(), '1', '0', '0', 0
    );
    PRINT '[OK] Cuenta [testuser] creada con clave: test1234 (Nivel Normal: 0)';
END
ELSE
BEGIN
    PRINT '[INFO] Cuenta [testuser] ya existia en el servidor.';
END
GO

-- 3. PERSONAJE TEST PARA TESTADMIN: TestGM (Blade Master, Class 17)
IF NOT EXISTS (SELECT 1 FROM Character WHERE Name = 'TestGM')
BEGIN
    INSERT INTO Character (
        AccountID, Name, cLevel, LevelUpPoint, Class, 
        Experience, Strength, Dexterity, Vitality, Energy, 
        Leadership, Money, Life, MaxLife, Mana, MaxMana, 
        MapNumber, MapPosX, MapPosY, MapDir, PkCount, 
        PkLevel, PkTime, CtlCode, Resets
    )
    VALUES (
        'testadmin', 'TestGM', 400, 1000, 17, 
        1000000, 1500, 1200, 1000, 800, 
        500, 2000000000, 2500, 2500, 1500, 1500, 
        0, 125, 125, 3, 0, 
        3, 0, 32, 50
    );

    IF EXISTS (SELECT 1 FROM AccountCharacter WHERE Id = 'testadmin')
    BEGIN
        UPDATE AccountCharacter SET GameID1 = 'TestGM' WHERE Id = 'testadmin';
    END
    ELSE
    BEGIN
        INSERT INTO AccountCharacter (Id, GameID1) VALUES ('testadmin', 'TestGM');
    END

    PRINT '[OK] Personaje [TestGM] (Blade Master) creado para la cuenta testadmin.';
END
ELSE
BEGIN
    PRINT '[INFO] Personaje [TestGM] ya existia en el servidor.';
END
GO

-- 4. PERSONAJE TEST PARA TESTUSER: TestDW (Soul Master, Class 1)
IF NOT EXISTS (SELECT 1 FROM Character WHERE Name = 'TestDW')
BEGIN
    INSERT INTO Character (
        AccountID, Name, cLevel, LevelUpPoint, Class, 
        Experience, Strength, Dexterity, Vitality, Energy, 
        Leadership, Money, Life, MaxLife, Mana, MaxMana, 
        MapNumber, MapPosX, MapPosY, MapDir, PkCount, 
        PkLevel, PkTime, CtlCode, Resets
    )
    VALUES (
        'testuser', 'TestDW', 250, 500, 1, 
        500000, 400, 500, 400, 1200, 
        0, 500000000, 1200, 1200, 2000, 2000, 
        0, 130, 120, 2, 0, 
        3, 0, 0, 5
    );

    IF EXISTS (SELECT 1 FROM AccountCharacter WHERE Id = 'testuser')
    BEGIN
        UPDATE AccountCharacter SET GameID1 = 'TestDW' WHERE Id = 'testuser';
    END
    ELSE
    BEGIN
        INSERT INTO AccountCharacter (Id, GameID1) VALUES ('testuser', 'TestDW');
    END

    PRINT '[OK] Personaje [TestDW] (Soul Master) creado para la cuenta testuser.';
END
ELSE
BEGIN
    PRINT '[INFO] Personaje [TestDW] ya existia en el servidor.';
END
GO

PRINT '====================================================';
PRINT '  ¡INSTALACION DE CUENTAS DE PRUEBA COMPLETADA!';
PRINT '  Cuentas: testadmin (VIP) / testuser (Normal)';
PRINT '  Clave para ambas: test1234';
PRINT '====================================================';
