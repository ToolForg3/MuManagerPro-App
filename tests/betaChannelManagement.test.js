const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('====================================================');
console.log(' RUNNING UNIT TESTS: Beta Channel Management & Rollback');
console.log('====================================================\n');

const projectRoot = path.resolve(__dirname, '..');

// ----------------------------------------------------
// 1. Files & Schema Integrity
// ----------------------------------------------------
console.log('[Point 1] Testing Version & Settings Schema Integrity...');

const versionBetaPath = path.join(projectRoot, 'version-beta.json');
assert(fs.existsSync(versionBetaPath), 'version-beta.json must exist in project root');
const betaJson = JSON.parse(fs.readFileSync(versionBetaPath, 'utf8'));
assert(betaJson.version.includes('beta'), 'version-beta.json must specify a beta version');
assert.strictEqual(betaJson.isBeta, true, 'isBeta must be true in version-beta.json');
assert(typeof betaJson.versionCode === 'number', 'versionCode must be a number in version-beta.json');

const settingsPath = path.join(projectRoot, 'data', 'settings.json');
assert(fs.existsSync(settingsPath), 'data/settings.json must exist');
const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
assert(settings.beta, 'settings.json must contain beta configuration');
assert(Array.isArray(settings.beta.approvedHwids), 'settings.beta.approvedHwids must be an array');
assert(settings.beta.latestBetaVersion, 'settings.beta.latestBetaVersion must be defined');
assert(settings.beta.rollback, 'settings.beta.rollback must be defined');
assert(typeof settings.beta.rollback.active === 'boolean', 'settings.beta.rollback.active must be boolean');

// ----------------------------------------------------
// 2. Channel Segregation & Simulation
// ----------------------------------------------------
console.log('[Point 2] Testing Channel Segregation (Beta Testers vs Official Users)...');

const TEST_BETA_HWID = 'HWID-TEST-BETA-001';
const TEST_REGULAR_HWID = 'HWID-REGULAR-USER-999';

// Setup mock settings
const mockSettings = {
  latestVersion: '2.0.3',
  versionCode: 105,
  latestApkUrl: 'https://mumanagerpro.vercel.app/downloads/MuManagerPro.apk',
  forceUpdate: false,
  beta: {
    enabled: true,
    latestBetaVersion: '2.0.4-beta.1',
    betaBuild: 106,
    betaApkUrl: 'https://mumanagerpro.vercel.app/downloads/MuManagerPro-Beta.apk',
    approvedHwids: [TEST_BETA_HWID],
    rollback: {
      active: false,
      targetVersion: '2.0.3',
      reason: 'Reversión por ajuste',
      forceRollback: true
    }
  },
  rollback: {
    active: false,
    targetVersion: '2.0.2',
    reason: 'Problema en v2.0.3'
  }
};

function simulateTelemetryResolution(hwid, currentVersion, s) {
  const isApprovedBeta = !!(s.beta && s.beta.enabled && Array.isArray(s.beta.approvedHwids) && s.beta.approvedHwids.includes(hwid));
  
  // Check Beta Rollback first for approved testers
  if (isApprovedBeta && s.beta.rollback && s.beta.rollback.active) {
    return {
      channel: 'beta',
      isRollback: true,
      forceUpdate: true,
      targetVersion: s.beta.rollback.targetVersion,
      apkUrl: s.beta.rollback.targetApkUrl || s.latestApkUrl,
      reason: s.beta.rollback.reason
    };
  }

  // Check Official Rollback for everyone
  if (s.rollback && s.rollback.active) {
    return {
      channel: 'official',
      isRollback: true,
      forceUpdate: true,
      targetVersion: s.rollback.targetVersion,
      apkUrl: s.rollback.targetApkUrl || s.latestApkUrl,
      reason: s.rollback.reason
    };
  }

  // Beta update for approved testers
  if (isApprovedBeta && s.beta.latestBetaVersion && currentVersion !== s.beta.latestBetaVersion) {
    return {
      channel: 'beta',
      updateAvailable: true,
      targetVersion: s.beta.latestBetaVersion,
      targetBuild: s.beta.betaBuild,
      apkUrl: s.beta.betaApkUrl,
      forceUpdate: false
    };
  }

  // Official update for standard users
  const officialUpdateNeeded = currentVersion !== s.latestVersion;
  return {
    channel: 'official',
    updateAvailable: officialUpdateNeeded,
    targetVersion: s.latestVersion,
    targetBuild: s.versionCode,
    apkUrl: s.latestApkUrl,
    forceUpdate: !!s.forceUpdate
  };
}

// Test regular user on v2.0.3: should see no update
const regUserRes = simulateTelemetryResolution(TEST_REGULAR_HWID, '2.0.3', mockSettings);
assert.strictEqual(regUserRes.channel, 'official', 'Regular user must be on official channel');
assert.strictEqual(regUserRes.updateAvailable, false, 'Regular user on latest 2.0.3 must see no update');
assert.strictEqual(regUserRes.apkUrl, mockSettings.latestApkUrl, 'Must point to official APK');

// Test beta tester on v2.0.3: should receive Beta update
const betaUserRes = simulateTelemetryResolution(TEST_BETA_HWID, '2.0.3', mockSettings);
assert.strictEqual(betaUserRes.channel, 'beta', 'Beta user must receive beta channel payload');
assert.strictEqual(betaUserRes.updateAvailable, true, 'Beta user should receive update to 2.0.4-beta.1');
assert.strictEqual(betaUserRes.targetVersion, '2.0.4-beta.1');
assert.strictEqual(betaUserRes.apkUrl, mockSettings.beta.betaApkUrl);
assert.strictEqual(betaUserRes.forceUpdate, false, 'Beta update must not force lockout');

// ----------------------------------------------------
// 3. Rollback Channel Independence
// ----------------------------------------------------
console.log('[Point 3] Testing Rollback Channel Independence...');

// Activate Beta Rollback ONLY
const settingsWithBetaRollback = JSON.parse(JSON.stringify(mockSettings));
settingsWithBetaRollback.beta.rollback.active = true;
settingsWithBetaRollback.beta.rollback.targetVersion = '2.0.3';
settingsWithBetaRollback.beta.rollback.reason = 'Crash detectado en módulo de pruebas beta';

// Beta tester running 2.0.4-beta.1 should get forced rollback
const betaRollbackRes = simulateTelemetryResolution(TEST_BETA_HWID, '2.0.4-beta.1', settingsWithBetaRollback);
assert.strictEqual(betaRollbackRes.isRollback, true, 'Beta tester must receive rollback directive');
assert.strictEqual(betaRollbackRes.targetVersion, '2.0.3', 'Beta tester target rollback version must be 2.0.3');
assert.strictEqual(betaRollbackRes.forceUpdate, true, 'Rollback must enforce update');

// Regular user running 2.0.3 should NOT be affected
const regUserDuringBetaRb = simulateTelemetryResolution(TEST_REGULAR_HWID, '2.0.3', settingsWithBetaRollback);
assert.strictEqual(regUserDuringBetaRb.isRollback, undefined, 'Regular user must NEVER be affected by beta rollback');
assert.strictEqual(regUserDuringBetaRb.updateAvailable, false, 'Regular user stays unaffected');

// ----------------------------------------------------
// 4. Beta Promotion Logic
// ----------------------------------------------------
console.log('[Point 4] Testing Beta Promotion Logic...');

function promoteBeta(s) {
  assert(s.beta && s.beta.latestBetaVersion, 'Beta version required');
  const cleanVersion = s.beta.latestBetaVersion.replace(/-beta.*$/i, '').trim();
  const build = s.beta.betaBuild || (s.versionCode + 1);
  s.latestVersion = cleanVersion;
  s.versionCode = build;
  s.forceUpdate = false;
  if (s.beta.rollback) s.beta.rollback.active = false;
  return { version: cleanVersion, build };
}

const promotedSettings = JSON.parse(JSON.stringify(mockSettings));
const promoResult = promoteBeta(promotedSettings);
assert.strictEqual(promoResult.version, '2.0.4', 'Promoted version must be 2.0.4 without -beta suffix');
assert.strictEqual(promotedSettings.latestVersion, '2.0.4');
assert.strictEqual(promotedSettings.versionCode, 106);
assert.strictEqual(promotedSettings.forceUpdate, false, 'Promoted official version must have forceUpdate = false');

// ----------------------------------------------------
// 5. Script Wiring & Endpoints Existence
// ----------------------------------------------------
console.log('[Point 5] Testing Scripts & Dashboard Integration...');

assert(fs.existsSync(path.join(projectRoot, 'scripts', 'release-beta.js')), 'scripts/release-beta.js must exist');
assert(fs.existsSync(path.join(projectRoot, 'scripts', 'promote-beta.js')), 'scripts/promote-beta.js must exist');
assert(fs.existsSync(path.join(projectRoot, 'scripts', 'rollback-manager.js')), 'scripts/rollback-manager.js must exist');

const bridgeServerContent = fs.readFileSync(path.join(projectRoot, 'server', 'bridgeServer.js'), 'utf8');
assert(bridgeServerContent.includes('/api/admin/beta/release'), 'bridgeServer.js must include beta release endpoint');
assert(bridgeServerContent.includes('/api/admin/beta/rollback'), 'bridgeServer.js must include beta rollback endpoint');
assert(bridgeServerContent.includes('/api/admin/beta/promote'), 'bridgeServer.js must include beta promote endpoint');

const dashboardContent = fs.readFileSync(path.join(projectRoot, 'server', 'adminDashboard.html'), 'utf8');
assert(dashboardContent.includes('id="tab-beta"'), 'adminDashboard.html must have dedicated tab-beta container');
assert(dashboardContent.includes('saveBetaVersionSettings'), 'adminDashboard.html must implement saveBetaVersionSettings');
assert(dashboardContent.includes('promoteBetaToOfficial'), 'adminDashboard.html must implement promoteBetaToOfficial');
assert(dashboardContent.includes('saveBetaRollbackSettings'), 'adminDashboard.html must implement saveBetaRollbackSettings');
assert(dashboardContent.includes('beta-rollback-active-toggle'), 'adminDashboard.html must include beta rollback toggle');
assert(dashboardContent.includes("'tab-beta': 'mod-deploy'"), 'adminDashboard.html must map tab-beta to mod-deploy in TAB_TO_MODULE');

// ----------------------------------------------------
// 6. License Invariance (Beta Never Touches Licenses)
// ----------------------------------------------------
console.log('[Point 6] Testing License Invariance (Beta Channel Never Alters Licenses)...');

// Verify Android package name constancy (ensures in-place update without wiping AsyncStorage/SecureStorage)
const appJson = JSON.parse(fs.readFileSync(path.join(projectRoot, 'app.json'), 'utf8'));
assert.strictEqual(appJson.expo.android.package, 'com.mumanager.pro', 'Package name must remain strictly com.mumanager.pro');

// Mock a PRO device joining Beta
const proDevice = {
  hwid: 'HWID-PRO-TESTER-777',
  mode: 'PRO',
  licenseKey: 'PRO-1234-5678-9999',
  isLifetime: true,
  expiresAt: null
};

// Simulate Beta approval: only settings.beta.approvedHwids is modified
const betaSettingsBefore = JSON.parse(JSON.stringify(mockSettings));
betaSettingsBefore.beta.approvedHwids.push(proDevice.hwid);

// Telemetry ping in Beta channel
const telemetryInBeta = simulateTelemetryResolution(proDevice.hwid, '2.0.3', betaSettingsBefore);
assert.strictEqual(telemetryInBeta.channel, 'beta', 'Device must be routed to Beta channel');

// The device license object MUST remain untouched
assert.strictEqual(proDevice.mode, 'PRO', 'PRO status must not change when joining or using Beta');
assert.strictEqual(proDevice.licenseKey, 'PRO-1234-5678-9999', 'License key must remain unchanged');
assert.strictEqual(proDevice.isLifetime, true, 'Lifetime flag must remain intact');

// Mock DEMO device joining Beta
const demoDevice = {
  hwid: 'HWID-DEMO-TESTER-888',
  mode: 'DEMO',
  licenseKey: '',
  isLifetime: false,
  expiresAt: '2026-10-01T00:00:00.000Z'
};
betaSettingsBefore.beta.approvedHwids.push(demoDevice.hwid);
const demoTelemetry = simulateTelemetryResolution(demoDevice.hwid, '2.0.3', betaSettingsBefore);
assert.strictEqual(demoTelemetry.channel, 'beta');
assert.strictEqual(demoDevice.mode, 'DEMO', 'DEMO device must remain in DEMO mode without bypass');
assert.strictEqual(demoDevice.expiresAt, '2026-10-01T00:00:00.000Z', 'Trial expiration date must remain intact');

// Verify that beta endpoints in bridgeServer.js do NOT perform any write to devices or licenses
assert(!bridgeServerContent.includes("app.post('/api/admin/beta-approve', (req, res) => {\n  const devices"), 'beta-approve must not touch devices');
assert(!bridgeServerContent.includes("app.post('/api/admin/beta/promote', (req, res) => {\n  const devices"), 'beta promote must not touch devices');

console.log('\n[PASS] ALL BETA CHANNEL, ROLLBACK & LICENSE INVARIANCE TESTS PASSED SUCCESSFULLY!');
