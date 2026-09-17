const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const https = require('https');

console.log('================================================================');
console.log('       MU MANAGER PRO - PIPELINE DE LANZAMIENTO BETA            ');
console.log('  DISTRIBUCIÓN SEGREGADA Y EXCLUSIVA PARA EVALUADORES APROBADOS ');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const appRepoDir = 'C:/Users/Cris/Desktop/MuManagerPro-App';
const desktopBetaApkPath = 'C:/Users/Cris/Desktop/MuManagerPro-Beta.apk';

// 1. Localizar Git ejecutable
function getGitExe() {
  const possiblePaths = [
    'git',
    'C:/Users/Cris/AppData/Local/GitHubDesktop/app-3.6.5/resources/app/git/cmd/git.exe',
    'C:/Program Files/Git/cmd/git.exe',
    'C:/Program Files (x86)/Git/cmd/git.exe'
  ];

  const ghDesktopRoot = 'C:/Users/Cris/AppData/Local/GitHubDesktop';
  if (fs.existsSync(ghDesktopRoot)) {
    const subdirs = fs.readdirSync(ghDesktopRoot);
    for (const d of subdirs) {
      if (d.startsWith('app-')) {
        const candidate = path.join(ghDesktopRoot, d, 'resources', 'app', 'git', 'cmd', 'git.exe');
        if (fs.existsSync(candidate)) {
          possiblePaths.unshift(candidate);
        }
      }
    }
  }

  for (const p of possiblePaths) {
    try {
      cp.execSync(`"${p}" --version`, { stdio: 'ignore' });
      return p;
    } catch (_) {}
  }
  throw new Error('No se encontró el ejecutable de git. Instala Git o GitHub Desktop.');
}

const gitExe = getGitExe();
console.log(`[OK] Git localizado en: ${gitExe}\n`);

// 2. Leer version-beta.json
console.log('1. Leyendo metadatos del Canal Beta...');
const versionBetaJsonPath = path.join(projectRoot, 'version-beta.json');
if (!fs.existsSync(versionBetaJsonPath)) {
  console.error('[ERROR] version-beta.json no encontrado en la raíz del proyecto.');
  process.exit(1);
}

const betaData = JSON.parse(fs.readFileSync(versionBetaJsonPath, 'utf8'));
const betaVersion = String(betaData.version).trim();
const betaBuild = parseInt(String(betaData.build), 10);
console.log(`[OK] Versión Beta objetivo: v${betaVersion} (Build ${betaBuild})\n`);

// 2.1 Localizar aapt.exe
function getAaptExe() {
  const localAppData = process.env.LOCALAPPDATA || 'C:/Users/Cris/AppData/Local';
  const sdkBuildTools = path.join(localAppData, 'Android', 'Sdk', 'build-tools');
  if (fs.existsSync(sdkBuildTools)) {
    const dirs = fs.readdirSync(sdkBuildTools).reverse();
    for (const d of dirs) {
      const candidate = path.join(sdkBuildTools, d, 'aapt.exe');
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return null;
}

const aaptExe = getAaptExe();

function getApkMetadata(apkPath) {
  if (!fs.existsSync(apkPath) || !aaptExe) return null;
  try {
    const out = cp.execSync(`"${aaptExe}" dump badging "${apkPath}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = out.match(/package:\s+name='([^']+)'\s+versionCode='([^']+)'\s+versionName='([^']+)'/);
    if (match) {
      return {
        packageName: match[1],
        versionCode: parseInt(match[2], 10),
        versionName: match[3]
      };
    }
  } catch (_) {}
  return null;
}

// 2.2 Verificar o compilar APK con Gradle
console.log('2. Verificando binario APK para Canal Beta...');
const buildApk = path.join(projectRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
let apkMeta = getApkMetadata(buildApk);
let needsBuild = false;

if (!fs.existsSync(buildApk)) {
  console.log('[!] No existe app-release.apk. Se compilará con Gradle.');
  needsBuild = true;
} else if (apkMeta) {
  console.log(`[*] APK compilado actual: v${apkMeta.versionName} (Build ${apkMeta.versionCode})`);
  if (apkMeta.versionCode !== betaBuild) {
    console.log(`[!] El APK existente (build ${apkMeta.versionCode}) difiere del build Beta (${betaBuild}). Compilando...`);
    needsBuild = true;
  }
}

if (needsBuild) {
  console.log('\n================================================================');
  console.log('  COMPILANDO APK BETA CON GRADLE (HERMES BYTECODE)...');
  console.log('================================================================');
  const androidDir = path.join(projectRoot, 'android');
  try {
    cp.execSync('cmd.exe /c gradlew.bat assembleRelease', { cwd: androidDir, stdio: 'inherit' });
    console.log('\n[OK] Compilación Gradle finalizada con éxito.');
  } catch (err) {
    console.error('\n[ERROR CRÍTICO] La compilación de Gradle falló:', err.message);
    process.exit(1);
  }
}

// Copiar APK oficial a Escritorio como Beta
fs.copyFileSync(buildApk, desktopBetaApkPath);
console.log(`[OK] Copiado APK Beta a Escritorio: ${desktopBetaApkPath}`);

// 3. Sincronizar metadatos de Beta en settings.json (sin tocar la versión oficial)
console.log('\n3. Sincronizando metadatos de Beta en settings.json...');
const settingsPaths = [
  path.join(projectRoot, 'data', 'settings.json'),
  path.join(projectRoot, 'server', 'data', 'settings.json'),
  path.join('C:/Users/Cris/Desktop/MuManagerPro-Gateway', 'data', 'settings.json'),
  path.join(appRepoDir, 'data', 'settings.json'),
  path.join(appRepoDir, 'server', 'data', 'settings.json')
];

for (const sp of settingsPaths) {
  if (fs.existsSync(sp)) {
    try {
      const s = JSON.parse(fs.readFileSync(sp, 'utf8'));
      if (!s.beta) s.beta = { enabled: true, approvedHwids: [], requests: [] };
      s.beta.enabled = true;
      s.beta.latestBetaVersion = betaVersion;
      s.beta.betaBuild = betaBuild;
      s.beta.betaChangelog = betaData.changelog;
      s.beta.betaApkUrl = betaData.downloadUrl;
      s.beta.publishedAt = new Date().toISOString();
      if (s.beta.rollback) s.beta.rollback.active = false; // Desactivar rollback anterior si existía

      fs.writeFileSync(sp, JSON.stringify(s, null, 2), 'utf8');
      console.log(`   [OK] Canal Beta actualizado en: ${sp}`);
    } catch (e) {
      console.warn(`   [!] Advertencia en ${sp}:`, e.message);
    }
  }
}

// 4. Copiar archivos a repositorio MuManagerPro-App
console.log(`\n4. Sincronizando Canal Beta con repositorio ${appRepoDir}...`);
if (fs.existsSync(appRepoDir)) {
  fs.copyFileSync(buildApk, path.join(appRepoDir, 'MuManagerPro-Beta.apk'));
  fs.copyFileSync(versionBetaJsonPath, path.join(appRepoDir, 'version-beta.json'));
  console.log('[OK] Binario MuManagerPro-Beta.apk y version-beta.json copiados al repositorio.');

  try {
    cp.execSync(`"${gitExe}" add MuManagerPro-Beta.apk version-beta.json data/settings.json server/data/settings.json`, { cwd: appRepoDir, stdio: 'inherit' });
    const commitMsg = `🧪 Beta Release v${betaVersion} (Build ${betaBuild}): Compilación de pruebas para evaluadores`;
    try {
      cp.execSync(`"${gitExe}" commit -m "${commitMsg}"`, { cwd: appRepoDir, stdio: 'inherit' });
    } catch (_) {
      console.log('   (Sin cambios para commit en App repo)');
    }
    console.log('   Enviando commits a GitHub (git push origin main)...');
    cp.execSync(`"${gitExe}" push origin main`, { cwd: appRepoDir, stdio: 'inherit' });
    console.log('[OK] Repositorio MuManagerPro-App actualizado con Canal Beta.');
  } catch (e) {
    console.error('[ERROR] Error en git push de Beta:', e.message);
  }
}

// 5. Sincronizar Gateway
console.log('\n5. Sincronizando Pasarela Gateway...');
const syncGatewayScript = path.join(projectRoot, 'scripts', 'sync-gateway.js');
if (fs.existsSync(syncGatewayScript)) {
  try {
    cp.execSync(`node "${syncGatewayScript}"`, { cwd: projectRoot, stdio: 'inherit' });
    console.log('[OK] Pasarela Gateway sincronizada con Canal Beta.');
  } catch (e) {
    console.warn('[!] Advertencia en sync-gateway:', e.message);
  }
}

console.log('\n================================================================');
console.log('       ¡LANZAMIENTO BETA COMPLETADO EXITOSAMENTE!               ');
console.log(`  Versión Beta: v${betaVersion} (Build ${betaBuild})`);
console.log('  Solo los dispositivos evaluadores aprobados recibirán el aviso.');
console.log('  Los usuarios del Canal Oficial permanecen 100% intactos.');
console.log('================================================================\n');
