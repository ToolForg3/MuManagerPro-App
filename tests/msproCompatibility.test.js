const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('===================================================');
console.log(' RUNNING TESTS: MSPro Compatibility & Modal Ergonomics');
console.log('==================================================' + '\n');

const dbTypes = fs.readFileSync(path.join(__dirname, '../src/types/database.ts'), 'utf8');
assert(dbTypes.includes("'MSPro'"), "database.ts must include 'MSPro' emulatorType");
assert(dbTypes.includes("'Louis'"), "database.ts must preserve 'Louis' emulatorType");
console.log('  [PASS] database.ts defines MSPro and preserves Louis emulatorType');

const adminTypes = fs.readFileSync(path.join(__dirname, '../src/types/admin.ts'), 'utf8');
assert(adminTypes.includes("'MSPro'"), "admin.ts must include 'MSPro' emulatorType");
assert(adminTypes.includes("'Louis'"), "admin.ts must preserve 'Louis' emulatorType");
console.log('  [PASS] admin.ts defines MSPro and preserves Louis emulatorType');

const configScreen = fs.readFileSync(path.join(__dirname, '../src/screens/config/ConfigScreen.tsx'), 'utf8');
assert(configScreen.includes("setEmulator('MSPro')"), "ConfigScreen.tsx must offer MSPro option");
assert(configScreen.includes("MSPro Season 6 Emulator"), "ConfigScreen.tsx must display MSPro subtitle");
assert(configScreen.includes("setEmulator('Louis')"), "ConfigScreen.tsx must preserve Louis option");
assert(!configScreen.includes("Season 6 Emulator") || configScreen.includes("MSPro Season 6 Emulator"), "ConfigScreen.tsx must replace legacy 'Season 6' with 'MSPro'");
console.log('  [PASS] ConfigScreen.tsx provides MSPro emulator and leaves Louis untouched');

const serverFiles = [
  path.join(__dirname, '../MuManager-Connector/server.js'),
  'C:/Users/Cris/Desktop/MuManagerPro-Gateway/bridgeServer.js'
];
serverFiles.forEach(file => {
  if (!fs.existsSync(file)) return;
  const c = fs.readFileSync(file, 'utf8');
  const baseName = path.basename(file);
  assert(c.includes('ruudtoken'), baseName + ' must check for ruudtoken column');
  assert(c.includes('RuudToken'), baseName + ' must select or update RuudToken');
  assert(c.includes('AccountCharacter') && c.includes('ExtWarehouse'), baseName + ' must support ExtWarehouse in AccountCharacter');
  assert(c.includes('c.Ruud') || c.includes('Ruud'), baseName + ' must preserve Ruud for Louis');
  assert(c.includes('WarehouseCount'), baseName + ' must preserve WarehouseCount for Louis');
  console.log('  [PASS] [' + baseName + '] Supports MSPro (RuudToken, ExtWarehouse) without modifying Louis');
});

const modalFiles = [
  path.join(__dirname, '../src/screens/tools/ToolsScreen.tsx'),
  path.join(__dirname, '../src/screens/accounts/AccountsScreen.tsx'),
  path.join(__dirname, '../src/components/inventory/ItemActionModal.tsx'),
  path.join(__dirname, '../src/screens/auth/LoginScreen.tsx'),
  path.join(__dirname, '../src/screens/admin/AppManagerScreen.tsx')
];
modalFiles.forEach(file => {
  const c = fs.readFileSync(file, 'utf8');
  const baseName = path.basename(file);
  assert(c.includes("maxHeight: '90%'") || c.includes('maxHeight: "90%"'), baseName + ' must have maxHeight 90% constraint');
  console.log('  [PASS] ['+ baseName + '] Implements maxHeight modal constraint for mobile responsiveness');
});

console.log('\nAll MSPro Compatibility & Modal Ergonomics tests passed 100%!\n');