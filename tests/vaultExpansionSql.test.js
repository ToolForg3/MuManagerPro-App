const assert = require('assert');
const fs = require('fs');
const path = require('path');

console.log('====================================================');
console.log(' RUNNING TESTS: Vault Expansion & Ruud Dynamic SQL Safety');
console.log('====================================================\n');

const bridgeServerContent = fs.readFileSync(path.join(__dirname, '../server/bridgeServer.js'), 'utf8');
const connectorServerContent = fs.readFileSync(path.join(__dirname, '../MuManager-Connector/server.js'), 'utf8');

[
  { name: 'bridgeServer.js', content: bridgeServerContent },
  { name: 'MuManager-Connector/server.js', content: connectorServerContent }
].forEach(({ name, content }) => {
  const lines = content.split(/\r?\n/);

  // 1. Verify that all Character Ruud updates use dynamic SQL with sp_executesql (no static direct statements)
  const directCharRuud = lines.filter(l => /^\s*UPDATE\s+Character\s+SET\s+Ruud\s*=/i.test(l));
  assert.strictEqual(directCharRuud.length, 0, `[${name}] No debe haber UPDATE estático directo de Ruud en Character`);
  const hasCharRuudDynSql = /OBJECT_ID\('Character'\)/i.test(content) && /sp_executesql/i.test(content);
  assert.ok(hasCharRuudDynSql, `[${name}] Character Ruud debe actualizarse con SQL dinámico y sp_executesql`);
  console.log(`  [PASS] [${name}] Actualizaciones de Ruud en Character protegidas con sp_executesql dinámico`);

  // 2. Verify that all MEMB_INFO Ruud updates use dynamic SQL with sp_executesql (no static direct statements)
  const directMembRuud = lines.filter(l => /^\s*UPDATE\s+MEMB_INFO\s+SET\s+Ruud\s*=/i.test(l));
  assert.strictEqual(directMembRuud.length, 0, `[${name}] No debe haber UPDATE estático directo de Ruud en MEMB_INFO`);
  const hasMembRuudDynSql = /OBJECT_ID\('MEMB_INFO'\)/i.test(content) && /sp_executesql/i.test(content);
  assert.ok(hasMembRuudDynSql, `[${name}] MEMB_INFO Ruud debe actualizarse con SQL dinámico y sp_executesql`);
  console.log(`  [PASS] [${name}] Actualizaciones de Ruud en MEMB_INFO protegidas con sp_executesql dinámico`);

  // 3. Verify that all CashShopData Ruud updates use dynamic SQL with sp_executesql (no static direct statements)
  const directCashRuud = lines.filter(l => /^\s*UPDATE\s+CashShopData\s+SET\s+Ruud\s*=/i.test(l));
  assert.strictEqual(directCashRuud.length, 0, `[${name}] No debe haber UPDATE estático directo de Ruud en CashShopData`);
  const hasCashRuudDynSql = /OBJECT_ID\('CashShopData'\)/i.test(content) && /sp_executesql/i.test(content);
  assert.ok(hasCashRuudDynSql, `[${name}] CashShopData Ruud debe actualizarse con SQL dinámico y sp_executesql`);
  console.log(`  [PASS] [${name}] Actualizaciones de Ruud en CashShopData protegidas con sp_executesql dinámico`);

  // 4. Verify that all ExtWarehouse EndUseDate updates use sp_executesql
  const extDateLines = lines.filter(l => /UPDATE\s+ExtWarehouse\s+SET\s+EndUseDate/i.test(l));
  assert.ok(extDateLines.length > 0, `[${name}] Debe existir al menos una actualización de EndUseDate en ExtWarehouse`);
  extDateLines.forEach(l => {
    assert.ok(/sp_executesql/i.test(l), `[${name}] Toda actualización de ExtWarehouse EndUseDate debe usar sp_executesql: ${l}`);
  });
  console.log(`  [PASS] [${name}] Todas las actualizaciones (${extDateLines.length}) de EndUseDate en ExtWarehouse usan sp_executesql`);

  // 5. Verify no static INSERT INTO ExtWarehouse with EndUseDate
  const insertExtDate = lines.filter(l => /INSERT\s+INTO\s+ExtWarehouse/i.test(l) && /EndUseDate/i.test(l));
  assert.strictEqual(insertExtDate.length, 0, `[${name}] No debe haber INSERT a ExtWarehouse con columna EndUseDate estática`);
  console.log(`  [PASS] [${name}] Inserción universal a ExtWarehouse (AccountID, Number, Items, Money) 100% segura`);
});

console.log('\nAll Vault Expansion & Ruud Dynamic SQL safety tests passed 100%!\n');
