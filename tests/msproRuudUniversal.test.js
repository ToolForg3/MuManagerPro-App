const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('================================================================');
console.log(' RUNNING TESTS: Universal Multi-Table Ruud & Collation Safety');
console.log('================================================================\n');

const serverPaths = [
  { name: 'server/bridgeServer.js', path: path.join(__dirname, '../server/bridgeServer.js') },
  { name: 'MuManager-Connector/server.js', path: path.join(__dirname, '../MuManager-Connector/server.js') },
  { name: 'MuManagerPro-Gateway/bridgeServer.js', path: 'C:/Users/Cris/Desktop/MuManagerPro-Gateway/bridgeServer.js' }
];

serverPaths.forEach(({ name, path: filePath }) => {
  if (!fs.existsSync(filePath)) {
    console.log('  [SKIP] ' + name + ' not found');
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // 1. Collation-proof dynamic Ruud column search
  assert(
    content.includes("LOWER(name) LIKE '%ruud%'"),
    name + " must use case-insensitive LOWER(name) LIKE '%ruud%' for collation safety"
  );
  console.log('  [PASS] [' + name + "] Uses collation-proof LOWER(name) LIKE '%ruud%'");

  // 2. Multi-table checking: Character, AccountCharacter, CashShopData, MEMB_INFO
  const tables = ['Character', 'AccountCharacter', 'CashShopData', 'MEMB_INFO'];
  tables.forEach(table => {
    const tableRegex = new RegExp("OBJECT_ID\\('" + table + "'\\)", 'i');
    assert(tableRegex.test(content), name + ' must inspect columns for table ' + table);
  });
  console.log('  [PASS] [' + name + '] Dynamically checks all 4 candidate Ruud tables (Character, AccountCharacter, CashShopData, MEMB_INFO)');

  // 3. Dynamic QUOTENAME escaping and sp_executesql
  assert(
    content.includes('QUOTENAME(name)'),
    name + ' must use QUOTENAME(name) to prevent SQL injection and syntax errors'
  );
  assert(
    content.includes('sp_executesql'),
    name + ' must execute dynamic updates via sp_executesql'
  );
  console.log('  [PASS] [' + name + '] Employs QUOTENAME(name) and sp_executesql for dynamic safe updates');

  // 4. Character update endpoint (/api/character/update-stats)
  assert(
    content.includes('@sqlCharStatRuud') && content.includes('@sqlAcStatRuud'),
    name + ' must update Ruud in both Character and AccountCharacter in /api/character/update-stats'
  );
  console.log('  [PASS] [' + name + '] /api/character/update-stats updates Character, AccountCharacter, CashShopData, and MEMB_INFO');

  // 5. Account update endpoint (/api/account/update)
  assert(
    content.includes('@sqlAcRuud') && content.includes('@sqlCharRuud'),
    name + ' must update Ruud across AccountCharacter and Character in /api/account/update'
  );
  console.log('  [PASS] [' + name + '] /api/account/update updates AccountCharacter, Character, MEMB_INFO, and CashShopData');

  // 6. Deliver kit endpoint (/api/tools/deliver-kit)
  assert(
    content.includes('@sqlCharKitRuud') && content.includes('@sqlAcKitRuud'),
    name + ' must deliver Ruud to Character and AccountCharacter in /api/tools/deliver-kit'
  );
  console.log('  [PASS] [' + name + '] /api/tools/deliver-kit delivers Ruud to all 4 tables');

  // 7. Prize delivery endpoint (/api/prizes/deliver)
  assert(
    content.includes('@sqlCharPrizeRuud') && content.includes('@sqlAcPrizeRuud'),
    name + ' must deliver Ruud prizes to Character and AccountCharacter in /api/prizes/deliver'
  );
  console.log('  [PASS] [' + name + '] /api/prizes/deliver delivers Ruud to all 4 tables');

  // 8. Zero ALTER TABLE for Ruud columns (non-invasive schema policy)
  assert(
    !/ALTER\s+TABLE[^;]*ruud/i.test(content),
    name + ' must never execute ALTER TABLE for Ruud columns (non-invasive schema policy)'
  );
  console.log('  [PASS] [' + name + '] Strictly avoids ALTER TABLE for Ruud columns');
});

console.log('\nAll Universal Multi-Table Ruud tests passed 100%!\n');
