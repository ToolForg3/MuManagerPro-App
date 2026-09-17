const fs = require('fs');
const path = require('path');
const cp = require('child_process');

console.log('================================================================');
console.log('    MU MANAGER PRO - PROMOCIÓN DE CANAL BETA A OFICIAL          ');
console.log('  GRADUACIÓN DE COMPILACIÓN PROBADA HACIA PRODUCCIÓN (100% USERS) ');
console.log('================================================================\n');

const projectRoot = path.resolve(__dirname, '..');
const versionBetaJsonPath = path.join(projectRoot, 'version-beta.json');

if (!fs.existsSync(versionBetaJsonPath)) {
  console.error('[ERROR CRÍTICO] No se encontró version-beta.json.');
  process.exit(1);
}

const betaData = JSON.parse(fs.readFileSync(versionBetaJsonPath, 'utf8'));
const rawBetaVersion = String(betaData.version).trim();
const promotedVersion = rawBetaVersion.replace(/-beta.*$/i, '').trim();
const promotedBuild = parseInt(String(betaData.build), 10);
const promotedChangelog = betaData.changelog
  ? betaData.changelog.replace(/Canal Beta.*?\n/i, 'Versión Oficial Estable:\n')
  : `MuManager PRO v${promotedVersion} (Build ${promotedBuild}) - Versión Oficial Estable.`;

console.log(`[*] Versión Beta origen    : v${rawBetaVersion} (Build ${promotedBuild})`);
console.log(`[+] Versión Oficial destino : v${promotedVersion} (Build ${promotedBuild})\n`);

// 1. Sincronizar simultáneamente los 6 archivos obligatorios
console.log('1. Sincronizando los 6 archivos obligatorios de versión oficial...');

// 1.1 package.json
const pkgPath = path.join(projectRoot, 'package.json');
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
pkg.version = promotedVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
console.log(`   [OK] package.json -> v${promotedVersion}`);

// 1.2 src/constants/appVersion.ts
const appVerPath = path.join(projectRoot, 'src', 'constants', 'appVersion.ts');
let appVerContent = fs.readFileSync(appVerPath, 'utf8');
appVerContent = appVerContent.replace(/Application\.nativeApplicationVersion\s*\|\|\s*'[^']+'/, `Application.nativeApplicationVersion ||\n  '${promotedVersion}'`);
appVerContent = appVerContent.replace(/Application\.nativeBuildVersion\s*\|\|\s*'[^']+'/, `Application.nativeBuildVersion ||\n  '${promotedBuild}'`);
fs.writeFileSync(appVerPath, appVerContent, 'utf8');
console.log(`   [OK] src/constants/appVersion.ts -> v${promotedVersion} (Build ${promotedBuild})`);

// 1.3 app.json
const appJsonPath = path.join(projectRoot, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
appJson.expo.version = promotedVersion;
if (appJson.expo.android) {
  appJson.expo.android.versionCode = promotedBuild;
}
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
console.log(`   [OK] app.json -> v${promotedVersion} (Build ${promotedBuild})`);

// 1.4 android/app/build.gradle
const buildGradlePath = path.join(projectRoot, 'android', 'app', 'build.gradle');
let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');
gradleContent = gradleContent.replace(/versionCode\s+\d+/, `versionCode ${promotedBuild}`);
gradleContent = gradleContent.replace(/versionName\s+"[^"]+"/, `versionName "${promotedVersion}"`);
fs.writeFileSync(buildGradlePath, gradleContent, 'utf8');
console.log(`   [OK] android/app/build.gradle -> v${promotedVersion} (Build ${promotedBuild})`);

// 1.5 version.json
const versionJsonPath = path.join(projectRoot, 'version.json');
const versionData = {
  version: promotedVersion,
  minRequiredVersion: betaData.minRequiredVersion || '1.9.9',
  githubReleaseUrl: 'https://github.com/ToolForg3/MuManagerPro-App/raw/main/MuManagerPro.apk',
  publishedAt: new Date().toISOString(),
  downloadUrl: 'https://github.com/ToolForg3/MuManagerPro-App/raw/main/MuManagerPro.apk',
  build: promotedBuild,
  forceUpdate: false,
  changelog: promotedChangelog
};
fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');
console.log(`   [OK] version.json -> v${promotedVersion} (Build ${promotedBuild})`);

// 1.6 settings.json
const settingsFiles = [
  path.join(projectRoot, 'data', 'settings.json'),
  path.join(projectRoot, 'server', 'data', 'settings.json')
];
for (const sf of settingsFiles) {
  if (fs.existsSync(sf)) {
    const s = JSON.parse(fs.readFileSync(sf, 'utf8'));
    s.latestVersion = promotedVersion;
    s.versionCode = promotedBuild;
    s.buildNumber = promotedBuild;
    s.appVersion = promotedVersion;
    s.updateTitle = `MuManager PRO v${promotedVersion} (Build ${promotedBuild})`;
    s.updateChangelog = promotedChangelog;
    s.releaseNotes = promotedChangelog;
    s.forceUpdate = false;
    if (s.beta && s.beta.rollback) {
      s.beta.rollback.active = false;
    }
    fs.writeFileSync(sf, JSON.stringify(s, null, 2), 'utf8');
    console.log(`   [OK] ${path.basename(path.dirname(sf))}/settings.json sincronizado.`);
  }
}

// 2. Ejecutar pipeline de lanzamiento oficial maestro
console.log('\n2. Ejecutando pipeline oficial de compilación y publicación (release-update.js)...');
try {
  cp.execSync('node scripts/release-update.js', { cwd: projectRoot, stdio: 'inherit' });
  console.log('\n================================================================');
  console.log('   ¡PROMOCIÓN A VERSIÓN OFICIAL COMPLETADA EXITOSAMENTE!        ');
  console.log(`  Versión promovida: v${promotedVersion} (Build ${promotedBuild})`);
  console.log('  La actualización ha sido enviada al 100% de los usuarios.');
  console.log('================================================================\n');
} catch (err) {
  console.error('[ERROR CRÍTICO] Falló el pipeline oficial durante la promoción:', err.message);
  process.exit(1);
}
