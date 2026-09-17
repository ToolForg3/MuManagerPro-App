const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('================================================================');
console.log('       MU MANAGER PRO - GESTOR DE ROLLBACK SEGREGADO           ');
console.log('   CONTROL DE REVERSIÓN INDEPENDIENTE (CANAL BETA Y OFICIAL)    ');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);

function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

const isStatus = args.includes('--status') || args.length === 0;
const isClear = args.includes('--clear');
const channel = (getArg('--channel') || 'all').toLowerCase(); // 'beta', 'official', 'all'
const targetVersion = getArg('--target');
const reason = getArg('--reason') || 'Rollback administrativo ejecutado con éxito.';

const settingsPaths = [
  path.join(projectRoot, 'data', 'settings.json'),
  path.join(projectRoot, 'server', 'data', 'settings.json'),
  path.join('C:/Users/Cris/Desktop/MuManagerPro-Gateway', 'data', 'settings.json'),
  path.join('C:/Users/Cris/Desktop/MuManagerPro-App', 'data', 'settings.json'),
  path.join('C:/Users/Cris/Desktop/MuManagerPro-App', 'server', 'data', 'settings.json')
];

function readSettings() {
  const sp = settingsPaths[0];
  if (fs.existsSync(sp)) {
    return JSON.parse(fs.readFileSync(sp, 'utf8'));
  }
  return null;
}

function writeSettings(mutator) {
  for (const sp of settingsPaths) {
    if (fs.existsSync(sp)) {
      try {
        const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
        mutator(s);
        fs.writeFileSync(sp, JSON.stringify(s, null, 2), 'utf8');
      } catch (e) {
        console.warn(`   [!] Error en ${sp}:`, e.message);
      }
    }
  }
}

if (isStatus) {
  const s = readSettings();
  if (!s) {
    console.error('[ERROR] No se pudieron cargar settings.json.');
    process.exit(1);
  }
  console.log('📊 ESTADO ACTUAL DE VERSIONES Y ROLLBACKS:');
  console.log('----------------------------------------------------------------');
  console.log(`• Canal Oficial : v${s.latestVersion || 'N/A'} (Build ${s.versionCode || 'N/A'})`);
  console.log(`  - Rollback Oficial Activo : ${s.rollback?.active ? '🚨 SÍ' : '✅ NO'}`);
  if (s.rollback?.active) {
    console.log(`    * Versión Destino : v${s.rollback.targetVersion}`);
    console.log(`    * Motivo          : ${s.rollback.reason}`);
    console.log(`    * Forzado         : ${s.rollback.forceRollback ? 'SÍ' : 'NO'}`);
  }
  console.log(`• Canal Beta    : v${s.beta?.latestBetaVersion || 'N/A'} (Build ${s.beta?.betaBuild || 'N/A'})`);
  console.log(`  - Rollback Beta Activo    : ${s.beta?.rollback?.active ? '🚨 SÍ' : '✅ NO'}`);
  if (s.beta?.rollback?.active) {
    console.log(`    * Versión Destino : v${s.beta.rollback.targetVersion}`);
    console.log(`    * Motivo          : ${s.beta.rollback.reason}`);
    console.log(`    * Forzado         : ${s.beta.rollback.forceRollback ? 'SÍ' : 'NO'}`);
  }
  console.log(`  - Evaluadores Aprobados   : ${(s.beta?.approvedHwids || []).length} dispositivos`);
  console.log('----------------------------------------------------------------\n');
  console.log('Comandos disponibles:');
  console.log('  node scripts/rollback-manager.js --channel beta --target 2.0.3 --reason "Bugs en beta"');
  console.log('  node scripts/rollback-manager.js --channel official --target 2.0.2 --reason "Falla crítica"');
  console.log('  node scripts/rollback-manager.js --channel beta --clear');
  console.log('  node scripts/rollback-manager.js --channel official --clear\n');
  process.exit(0);
}

if (isClear) {
  writeSettings((s) => {
    if (channel === 'beta' || channel === 'all') {
      if (!s.beta) s.beta = { enabled: true };
      if (!s.beta.rollback) s.beta.rollback = {};
      s.beta.rollback.active = false;
      console.log('✅ Rollback del Canal Beta DESACTIVADO.');
    }
    if (channel === 'official' || channel === 'all') {
      if (!s.rollback) s.rollback = {};
      s.rollback.active = false;
      console.log('✅ Rollback del Canal Oficial DESACTIVADO.');
    }
  });
} else {
  if (!targetVersion) {
    console.error('[ERROR] Debes especificar la versión destino con --target (ej. --target 2.0.3)');
    process.exit(1);
  }

  writeSettings((s) => {
    if (channel === 'beta') {
      if (!s.beta) s.beta = { enabled: true, approvedHwids: [], requests: [] };
      s.beta.rollback = {
        active: true,
        targetVersion: targetVersion.trim(),
        targetApkUrl: s.latestApkUrl || '',
        reason: reason.trim(),
        forceRollback: true,
        triggeredAt: new Date().toISOString()
      };
      console.log(`🚨 Rollback del Canal BETA ACTIVADO hacia v${targetVersion}.`);
      console.log('   (Los usuarios del Canal Oficial permanecen intactos).');
    } else if (channel === 'official') {
      if (!s.rollback) s.rollback = {};
      s.rollback = {
        active: true,
        targetVersion: targetVersion.trim(),
        targetApkUrl: s.latestApkUrl || '',
        reason: reason.trim(),
        forceRollback: true,
        triggeredAt: new Date().toISOString()
      };
      console.log(`🚨 Rollback del Canal OFICIAL ACTIVADO hacia v${targetVersion}.`);
    } else {
      console.error('[ERROR] Especifica --channel beta o --channel official');
      process.exit(1);
    }
  });
}

// Sincronizar Pasarela Gateway
console.log('\nSincronizando cambios de Rollback con la Pasarela...');
const syncGatewayScript = path.join(projectRoot, 'scripts', 'sync-gateway.js');
if (fs.existsSync(syncGatewayScript)) {
  try {
    cp.execSync(`node "${syncGatewayScript}"`, { cwd: projectRoot, stdio: 'inherit' });
    console.log('[OK] Pasarela actualizada.');
  } catch (e) {
    console.warn('[!] Advertencia al sincronizar pasarela:', e.message);
  }
}

console.log('\n[OK] Operación de rollback finalizada y guardada.');
