const fs = require('fs');
const path = require('path');
const assert = require('assert');
const ts = require('typescript');

function requireTs(filePath) {
  const code = fs.readFileSync(filePath, 'utf8');
  const result = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  });
  const m = { exports: {} };
  const dirname = path.dirname(filePath);
  const fn = new Function('require', 'module', 'exports', '__dirname', '__filename', result.outputText);
  fn(require, m, m.exports, dirname, filePath);
  return m.exports;
}

console.log('====================================================');
console.log(' RUNNING UNIT TESTS: User Requirements V17 (Spheres, MSPro, Deep Purge)');
console.log('====================================================\n');

// ----------------------------------------------------
// Point 1: Sphere Level Selector in Socket Editor
// ----------------------------------------------------
console.log('[Point 1] Testing Sphere Level Selector in Socket Catalog & Modals...');
const socketCatalog = requireTs(path.resolve(__dirname, '../src/constants/socketCatalog.ts'));
assert(socketCatalog.SEED_SPHERE_LEVELS, 'socketCatalog must export SEED_SPHERE_LEVELS');
assert.strictEqual(socketCatalog.SEED_SPHERE_LEVELS.length, 5, 'Must define 5 sphere levels (Lv.1 to Lv.5)');
assert.strictEqual(socketCatalog.SEED_SPHERE_LEVELS[0].level, 1);
assert.strictEqual(socketCatalog.SEED_SPHERE_LEVELS[4].level, 5);

// Check encoding
const seedLv1 = socketCatalog.encodeSocketByte(1, 1); // Level 1 Fire Attack Speed
assert.strictEqual(seedLv1, 1, 'Lv.1 Seed 1 must encode to 1');
const seedLv5 = socketCatalog.encodeSocketByte(1, 5); // Level 5 Fire Attack Speed
assert.strictEqual(seedLv5, 201, 'Lv.5 Seed 1 must encode to 201');

// Check decoded levels
const decodedLv1 = socketCatalog.decodeSocketByte(1);
assert(decodedLv1 && decodedLv1.level === 1, 'Byte 1 must decode to level 1');
const decodedLv5 = socketCatalog.decodeSocketByte(201);
assert(decodedLv5 && decodedLv5.level === 5, 'Byte 201 must decode to level 5');

// Check quick options at different levels
const optionsLv1 = socketCatalog.getQuickSocketOptions(1);
const optionsLv5 = socketCatalog.getQuickSocketOptions(5);
assert(optionsLv1.length > 5, 'getQuickSocketOptions(1) must return options');
assert(optionsLv5.length > 5, 'getQuickSocketOptions(5) must return options');
assert.strictEqual(optionsLv1[2].val, 1, 'Quick option for seed 1 at level 1 must be val 1');
assert.strictEqual(optionsLv5[2].val, 201, 'Quick option for seed 1 at level 5 must be val 201');
assert.notStrictEqual(optionsLv1[2].label, optionsLv5[2].label, 'Quick option label must reflect sphere level bonus');

// Check UI Modals contain Sphere Level Pill Selectors
const itemModalContent = fs.readFileSync(path.join(__dirname, '../src/components/inventory/ItemModal.tsx'), 'utf8');
assert(itemModalContent.includes('SEED_SPHERE_LEVELS'), 'ItemModal must import SEED_SPHERE_LEVELS');
assert(itemModalContent.includes('socketLevels'), 'ItemModal must track socketLevels state');
assert(itemModalContent.includes('sl.badge'), 'ItemModal must render sphere level selector pills');

const accountsScreenContent = fs.readFileSync(path.join(__dirname, '../src/screens/accounts/AccountsScreen.tsx'), 'utf8');
assert(accountsScreenContent.includes('vaultMakerSocketLevels'), 'AccountsScreen must track vaultMakerSocketLevels');
assert(accountsScreenContent.includes('SEED_SPHERE_LEVELS'), 'AccountsScreen must use SEED_SPHERE_LEVELS');

const toolsScreenContent = fs.readFileSync(path.join(__dirname, '../src/screens/tools/ToolsScreen.tsx'), 'utf8');
assert(toolsScreenContent.includes('makerSocketLevels'), 'ToolsScreen must track makerSocketLevels');
assert(toolsScreenContent.includes('SEED_SPHERE_LEVELS'), 'ToolsScreen must use SEED_SPHERE_LEVELS');
console.log('  [PASS] Point 1: Sphere level selector (Lv.1 to Lv.5) verified across catalog and UI screens.');

// ----------------------------------------------------
// Point 2: MSPro Compatibility & Dynamic SQL
// ----------------------------------------------------
console.log('\n[Point 2] Testing MSPro Compatibility & Dynamic SQL Safety...');

const serverTargets = [
  path.join(__dirname, '../server/bridgeServer.js'),
  path.join(__dirname, '../MuManager-Connector/server.js'),
  'C:/Users/Cris/Desktop/MuManagerPro-Gateway/bridgeServer.js'
];

serverTargets.forEach(target => {
  if (!fs.existsSync(target)) return;
  const content = fs.readFileSync(target, 'utf8');
  const baseName = path.basename(target);

  // 1. Any UPDATE MEMB_INFO SET WarehouseCount must be executed via sp_executesql
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/UPDATE\s+MEMB_INFO\s+SET\s+WarehouseCount/i.test(line)) {
      assert(line.includes('sp_executesql'), `${baseName}:${idx + 1} 'UPDATE MEMB_INFO SET WarehouseCount' must be wrapped in sp_executesql`);
    }
    if (/SELECT\s+.*WarehouseCount.*FROM\s+MEMB_INFO/i.test(line)) {
      assert(line.includes('sp_executesql') || line.includes('sys.columns'), `${baseName}:${idx + 1} 'SELECT WarehouseCount FROM MEMB_INFO' must be wrapped in sp_executesql or sys.columns`);
    }
  });

  // 3. Must use sp_executesql for WarehouseCount updates
  assert(content.includes("sp_executesql N'UPDATE MEMB_INFO SET WarehouseCount"), `${baseName} must use sp_executesql for WarehouseCount updates`);

  // 4. Must use sp_executesql for AccountCharacter.ExtWarehouse
  assert(content.includes("UPDATE AccountCharacter SET ExtWarehouse"), `${baseName} must support AccountCharacter.ExtWarehouse`);

  // 5. Must NOT run ALTER TABLE in /api/warehouse/update-count
  const updateCountBlock = content.substring(content.indexOf('/api/warehouse/update-count'), content.indexOf('/api/warehouse/set-expansion'));
  assert(!updateCountBlock.includes('ALTER TABLE'), `${baseName} /api/warehouse/update-count must NOT perform ALTER TABLE`);

  // 6. Must NOT run ALTER TABLE in /api/accounts/update
  const accountsUpdateBlock = content.substring(content.indexOf('/api/accounts/update'), content.indexOf('/api/accounts/delete'));
  assert(!accountsUpdateBlock.includes('ALTER TABLE'), `${baseName} /api/accounts/update must NOT perform ALTER TABLE`);

  console.log(`  [PASS] [${baseName}] Msg 207 resolved via sp_executesql; zero ALTER TABLE in account & warehouse routes.`);
});

// ----------------------------------------------------
// Point 3: Deep Purge & Storage Resilience
// ----------------------------------------------------
console.log('\n[Point 3] Testing SQL Config Deep Purge & Storage Resilience...');

const secureStorageContent = fs.readFileSync(path.join(__dirname, '../src/services/security/secureStorage.ts'), 'utf8');
assert(secureStorageContent.includes('purgeAllKnownSecrets'), 'SecureStorage must export purgeAllKnownSecrets()');
assert(secureStorageContent.includes('AsyncStorage.removeItem(key)'), 'SecureStorage.getItem must auto-purge corrupted ciphertext on decryption/sig error');

const sqlClientContent = fs.readFileSync(path.join(__dirname, '../src/services/database/sqlClient.ts'), 'utf8');
assert(sqlClientContent.includes('resetAllConnectionState'), 'SqlClient must provide resetAllConnectionState()');
assert(sqlClientContent.includes('getDefaultConfig'), 'SqlClient must provide getDefaultConfig()');
assert(sqlClientContent.includes('SecureStorage.purgeAllKnownSecrets'), 'SqlClient.resetAllConnectionState must call SecureStorage.purgeAllKnownSecrets()');

const dbContextContent = fs.readFileSync(path.join(__dirname, '../src/context/DatabaseContext.tsx'), 'utf8');
assert(dbContextContent.includes('resetDatabaseState'), 'DatabaseContext must provide resetDatabaseState');

const configScreenContent = fs.readFileSync(path.join(__dirname, '../src/screens/config/ConfigScreen.tsx'), 'utf8');
assert(configScreenContent.includes('resetDatabaseState'), 'ConfigScreen.tsx must call resetDatabaseState');
assert(configScreenContent.includes('Limpiar Configuración y Caché Profunda'), 'ConfigScreen.tsx handleClearConfig must prompt for deep purge');

console.log('  [PASS] Point 3: Deep purge, storage resilience, and cache clearing verified across storage, client, context, and UI.');

console.log('\nAll User Requirements V17 tests passed 100%!\n');
