export const SQL_QUERIES = {
  // 1. Resumen del Dashboard
  DASHBOARD_SUMMARY: `
SELECT 
    (SELECT COUNT(*) FROM MEMB_INFO) AS Cuentas,
    (SELECT COUNT(*) FROM Character) AS Personajes,
    (SELECT COUNT(*) FROM MEMB_STAT WHERE ConnectStat = 1) AS Online,
    (SELECT COUNT(*) FROM MEMB_INFO WHERE AccountLevel > 0) AS VIP;
`.trim(),

  // 2. Obtener Lista de Personajes (Compatible Louis S6 Up40)
  CHARACTER_LIST: `
SELECT Name, cLevel, Class, ISNULL(ResetCount, 0) AS ResetCount, Money, AccountID 
FROM Character 
ORDER BY cLevel DESC;
`.trim(),

  // 3. Cargar Datos Completos de un Personaje (Con MasterSkillTree de S6 Up40)
  CHARACTER_DETAIL: `
SELECT c.Name, c.AccountID, c.Class, c.cLevel, c.LevelUpPoint,
       ISNULL(m.MasterLevel, 0) AS MasterLevel,
       ISNULL(m.MasterPoint, 0) AS MasterPoint,
       c.Strength, c.Dexterity, c.Vitality, c.Energy, c.Leadership, c.Money,
       ISNULL(c.FruitPoint, 0) AS FruitPoint,
       ISNULL(c.ResetCount, 0) AS ResetCount,
       ISNULL(c.MasterResetCount, 0) AS MasterResetCount,
       ISNULL(c.MapNumber, 0) AS MapNumber,
       ISNULL(c.MapPosX, 125) AS MapPosX,
       ISNULL(c.MapPosY, 125) AS MapPosY,
       ISNULL(c.PkCount, 0) AS PkCount,
       ISNULL(c.PkLevel, 3) AS PkLevel,
       ISNULL(c.CtlCode, 0) AS CtlCode,
       CONVERT(VARCHAR(MAX), c.Inventory, 2) AS InventoryHex,
       ISNULL(CONVERT(VARCHAR(MAX), c.MagicList, 2), '') AS MagicListHex
FROM Character c
LEFT JOIN MasterSkillTree m ON c.Name = m.Name
WHERE c.Name = @CharName;
`.trim(),

  // 4. Actualizar Stats del Personaje
  UPDATE_CHARACTER_STATS: `
UPDATE Character 
SET Strength = @STR, Dexterity = @AGI, Vitality = @VIT, Energy = @ENE, 
    Leadership = @CMD, Money = @Zen, LevelUpPoint = @Points
WHERE Name = @CharName;
`.trim(),

  // 5. Actualizar Inventario Completo del Personaje
  UPDATE_CHARACTER_INVENTORY: `
UPDATE Character 
SET Inventory = CONVERT(VARBINARY(MAX), @InventoryHex, 2)
WHERE Name = @CharName;
`.trim(),

  // 5b. Actualizar Habilidades (MagicList) del Personaje
  UPDATE_CHARACTER_SKILLS: `
UPDATE Character 
SET MagicList = CONVERT(VARBINARY(180), @MagicListHex, 2)
WHERE Name = @CharName;
`.trim(),

  // 6. Lista de Cuentas (Louis S6 Update 40)
  RECENT_ACCOUNTS: `
SELECT memb___id, memb_name, sno__numb, mail_addr, bloc_code, AccountLevel, AccountExpireDate
FROM MEMB_INFO
ORDER BY memb___id ASC;
`.trim(),

  // 6b. Personajes de una Cuenta específica
  CHARACTERS_BY_ACCOUNT: `
SELECT Name, cLevel, Class, ISNULL(ResetCount, 0) AS ResetCount, Money, AccountID 
FROM Character 
WHERE AccountID = @AccountID
ORDER BY cLevel DESC;
`.trim(),

  // 6c. Baúl de Cuenta (Warehouse)
  ACCOUNT_WAREHOUSE: `
SELECT AccountID, Money, CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex, pw
FROM warehouse
WHERE AccountID = @AccountID;
`.trim(),

  // 7. Joyero Louis S6 Update 40 (CustomJewelBank)
  JEWEL_BANK: `
SELECT AccountID, Bless, Soul, Chaos, Life, Creation, Guardian, Harmony, LowStone, HighStone, GemStone
FROM CustomJewelBank
WHERE AccountID = @AccountID;
`.trim(),

  // 8. Monedas CashShop Louis S6 (CashShopData)
  CASH_SHOP: `
SELECT AccountID, WCoinC, WCoinP, GoblinPoint
FROM CashShopData
WHERE AccountID = @AccountID;
`.trim(),
};
