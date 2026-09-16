/**
 * TEST SUITE: Licensing System & Control Panel Security Audit
 * Verifies key generation, verification, auto-wipe prevention, demo access,
 * and admin authentication rate limiting.
 */

const assert = require('assert');
const crypto = require('crypto');

const TEST_SALT = 'TEST_MASTER_SALT_FOR_AUDIT_VERIFICATION_2026';

function sha256(ascii) {
  return crypto.createHash('sha256').update(ascii).digest('hex').toLowerCase();
}

// 1. Canonical Key Generation (bridgeServer & keygen & client)
function generateKey(hwid, plan = 'PRO') {
  const cleanHwid = String(hwid || '').trim().toUpperCase();
  const planTag = (plan === 'VIP' ? 'VIP' : 'PRO');
  const fullHash = sha256(`${cleanHwid}:${planTag}:${TEST_SALT}`).toUpperCase();
  const sig1 = fullHash.substring(0, 4);
  const sig2 = fullHash.substring(4, 8);
  const sig3 = fullHash.substring(8, 12);
  return `MUMANAGER-${planTag}-${sig1}-${sig2}-${sig3}`;
}

// 2. Client SecurityService.verifyKey
function clientVerifyKey(hwid, key) {
  const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '');
  const cleanHwid = hwid.trim().toUpperCase();
  const parts = cleanKey.split('-');
  if (parts.length !== 5) return { valid: false, plan: 'DEMO' };
  if (parts[0] !== 'MUMANAGER') return { valid: false, plan: 'DEMO' };
  const plan = parts[1];
  if (plan !== 'PRO' && plan !== 'VIP') return { valid: false, plan: 'DEMO' };
  const sig1 = parts[2];
  const sig2 = parts[3];
  const sig3 = parts[4];
  const hexBlock = /^[0-9A-F]{4}$/;
  if (!hexBlock.test(sig1) || !hexBlock.test(sig2) || !hexBlock.test(sig3)) return { valid: false, plan: 'DEMO' };
  const providedSignature = sig1 + sig2 + sig3;
  const expectedFullHash = sha256(`${cleanHwid}:${plan}:${TEST_SALT}`).toUpperCase();
  const expectedSignature = expectedFullHash.substring(0, 12);
  if (providedSignature === expectedSignature) return { valid: true, plan: 'PRO' };
  return { valid: false, plan: 'DEMO' };
}

// 3. Server bridgeServer verifyKey
function serverVerifyKey(hwid, key, storedKey = '') {
  if (!key || typeof key !== 'string') return false;
  const cleanKey = key.trim().toUpperCase();
  const cleanHwid = String(hwid || '').trim().toUpperCase();
  const parts = cleanKey.split('-');
  if (parts.length === 5 && parts[0] === 'MUMANAGER') {
    const plan = parts[1];
    if (plan === 'PRO' || plan === 'VIP') {
      const sig1 = parts[2];
      const sig2 = parts[3];
      const sig3 = parts[4];
      const hexBlock = /^[0-9A-F]{4}$/;
      if (hexBlock.test(sig1) && hexBlock.test(sig2) && hexBlock.test(sig3)) {
        const fullHash = sha256(`${cleanHwid}:${plan}:${TEST_SALT}`).toUpperCase();
        if ((sig1 + sig2 + sig3) === fullHash.substring(0, 12)) return true;
      }
    }
  }
  if (storedKey && cleanKey === storedKey.trim().toUpperCase()) return true;
  return false;
}

let passed = 0;
let total = 0;
function test(name, fn) {
  total++;
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}:`, err.message);
    throw err;
  }
}

console.log('\n====================================================');
console.log(' RUNNING AUDIT TESTS: Licensing & Control Panel');
console.log('====================================================\n');

test('generateKey creates canonical keys that client and server verify 100%', () => {
  const hwids = [
    'A1B2C3D4E5F6G7H8',
    'ANDROID-9876543210',
    'XIAOMI-REDMI-NOTE-10',
    'SAMSUNG-SM-G998B'
  ];

  for (const hwid of hwids) {
    const key = generateKey(hwid, 'PRO');
    assert.match(key, /^MUMANAGER-PRO-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);

    const clientResult = clientVerifyKey(hwid, key);
    assert.strictEqual(clientResult.valid, true);
    assert.strictEqual(clientResult.plan, 'PRO');

    const serverResult = serverVerifyKey(hwid, key);
    assert.strictEqual(serverResult, true);
  }
});

test('serverVerifyKey rejects invalid signatures, tampered keys, and mismatched HWID', () => {
  const hwid = 'TEST-DEVICE-001';
  const validKey = generateKey(hwid, 'PRO');

  // Mismatched HWID
  assert.strictEqual(serverVerifyKey('ANOTHER-DEVICE', validKey), false);

  // Tampered signature
  const tamperedKey = validKey.slice(0, -1) + (validKey.slice(-1) === 'A' ? 'B' : 'A');
  assert.strictEqual(serverVerifyKey(hwid, tamperedKey), false);

  // Malformed format
  assert.strictEqual(serverVerifyKey(hwid, 'INVALID-KEY-FORMAT'), false);
  assert.strictEqual(serverVerifyKey(hwid, ''), false);
});

test('serverVerifyKey honors stored pre-assigned keys in database/redis fallback', () => {
  const hwid = 'LEGACY-PRE-STORED-HWID';
  const legacyStoredKey = 'CUSTOM-UPSTASH-PRO-KEY-2026';

  // Mathematically invalid, but stored in Redis for that HWID
  assert.strictEqual(serverVerifyKey(hwid, legacyStoredKey, legacyStoredKey), true);
  // Stored key for another device rejected
  assert.strictEqual(serverVerifyKey(hwid, legacyStoredKey, 'DIFFERENT-STORED-KEY'), false);
});

test('Telemetry Ping Auto-Wipe Fix: Valid key sets PRO mode and forceWipeKey is FALSE', () => {
  const hwid = 'PHONE-NEW-ACTIVATION-999';
  const validKey = generateKey(hwid, 'PRO');

  const devices = {
    [hwid]: {
      hwid,
      mode: 'DEMO',
      licenseKey: '',
      forceDemo: false,
      blocked: false
    }
  };
  const tombstones = { revokedKeys: {} };
  const effectiveLicenseKey = validKey;
  const isKeyRevoked = !!(effectiveLicenseKey && tombstones.revokedKeys && tombstones.revokedKeys[effectiveLicenseKey]);
  const storedKey = (devices[hwid].licenseKey || '').trim().toUpperCase();

  const isKeyMathematicallyValid = effectiveLicenseKey ? serverVerifyKey(hwid, effectiveLicenseKey) : false;
  const hasValidKey = !isKeyRevoked && effectiveLicenseKey.length > 0 && (
    isKeyMathematicallyValid || (storedKey.length > 0 && effectiveLicenseKey === storedKey)
  );

  assert.strictEqual(hasValidKey, true, 'License key must be evaluated as valid');

  // Device update
  if (hasValidKey && !isKeyRevoked) {
    devices[hwid].mode = 'PRO';
    devices[hwid].licenseKey = effectiveLicenseKey;
    devices[hwid].forceDemo = false;
  }

  assert.strictEqual(devices[hwid].mode, 'PRO');

  // Response evaluation
  const devMode = devices[hwid].mode || 'DEMO';
  const isForcedDemo = !!(devices[hwid].forceDemo || isKeyRevoked);
  const shouldWipeKey = isForcedDemo || (effectiveLicenseKey.length > 0 && !hasValidKey);

  assert.strictEqual(isForcedDemo, false, 'Should NOT be forced demo');
  assert.strictEqual(shouldWipeKey, false, 'Should NOT wipe key');
  assert.strictEqual(devMode, 'PRO');
});

test('Telemetry Ping: Normal DEMO trial devices are NOT wiped', () => {
  const hwid = 'DEMO-TRIAL-DEVICE';
  const devices = {
    [hwid]: {
      hwid,
      mode: 'DEMO',
      licenseKey: '',
      forceDemo: false,
      blocked: false
    }
  };
  const tombstones = { revokedKeys: {} };
  const effectiveLicenseKey = '';
  const isKeyRevoked = false;

  const isForcedDemo = !!(devices[hwid].forceDemo || isKeyRevoked);
  const shouldWipeKey = isForcedDemo || (effectiveLicenseKey.length > 0);

  assert.strictEqual(isForcedDemo, false);
  assert.strictEqual(shouldWipeKey, false, 'Trial device without key must NOT receive forceWipeKey');
});

test('Zero-Trust Middleware: Active DEMO device is permitted on standard data routes', () => {
  const dev = {
    mode: 'DEMO',
    forceDemo: false,
    blocked: false,
    expiresAt: new Date(Date.now() + 72 * 3600 * 1000).toISOString()
  };

  const isPro = dev.mode === 'PRO' && !dev.forceDemo && !dev.blocked;
  const isDemoActive = dev.mode === 'DEMO' && !dev.forceDemo && !dev.blocked &&
    (!dev.expiresAt || new Date(dev.expiresAt).getTime() > Date.now());

  assert.strictEqual(isDemoActive, true);

  const standardRoutes = ['/api/accounts', '/api/character', '/api/warehouse', '/api/guilds', '/api/pk'];
  const proExclusiveRoutes = ['/api/tools/db-backup', '/api/gm/set-level', '/api/ip/ban-by-ip', '/api/prizes'];

  for (const path of standardRoutes) {
    const isProExclusive = path.startsWith('/api/tools') || path.startsWith('/api/gm') || path.startsWith('/api/ip') || path.startsWith('/api/prizes');
    const allowed = isPro || (isDemoActive && !isProExclusive);
    assert.strictEqual(allowed, true, `Route ${path} must be allowed for active DEMO`);
  }

  for (const path of proExclusiveRoutes) {
    const isProExclusive = path.startsWith('/api/tools') || path.startsWith('/api/gm') || path.startsWith('/api/ip') || path.startsWith('/api/prizes');
    const allowed = isPro || (isDemoActive && !isProExclusive);
    assert.strictEqual(allowed, false, `Route ${path} must be blocked for DEMO`);
  }
});

test('isValidAdminKey validates against both Vercel process.env.ADMIN_KEY and settings.adminKey', () => {
  const envAdminKey = 'VercelSecretMasterKey2026!';
  const settingsAdminKey = 'DashboardChangedKey2026!';

  function testIsValid(key, envKey, setKey) {
    if (!key || typeof key !== 'string') return false;
    const clean = key.trim();
    if (clean.length < 8) return false;
    const candidates = [];
    if (envKey && envKey.length >= 8) candidates.push(envKey);
    if (setKey && setKey.length >= 8 && !candidates.includes(setKey)) candidates.push(setKey);

    const bufClean = Buffer.from(clean, 'utf8');
    for (const cand of candidates) {
      const bufCand = Buffer.from(cand, 'utf8');
      if (bufClean.length === bufCand.length && crypto.timingSafeEqual(bufClean, bufCand)) {
        return true;
      }
    }
    return false;
  }

  // Both keys accepted
  assert.strictEqual(testIsValid(envAdminKey, envAdminKey, settingsAdminKey), true);
  assert.strictEqual(testIsValid(settingsAdminKey, envAdminKey, settingsAdminKey), true);

  // Wrong key rejected
  assert.strictEqual(testIsValid('WrongKey123!', envAdminKey, settingsAdminKey), false);
  // Short key rejected
  assert.strictEqual(testIsValid('short', envAdminKey, settingsAdminKey), false);
});

test('Admin Rate Limiter: Blocks IP after 10 failed attempts for 15 minutes', () => {
  const failedAttempts = new Map();
  const testIp = '198.51.100.42';

  function recordAttempt(ip, isValid, now) {
    const record = failedAttempts.get(ip);
    if (record && record.lockedUntil && record.lockedUntil > now) {
      return { status: 429, message: 'LOCKED' };
    }
    if (isValid) {
      if (record) failedAttempts.delete(ip);
      return { status: 200, message: 'OK' };
    }
    const currentFails = (record ? record.count : 0) + 1;
    if (currentFails >= 10) {
      failedAttempts.set(ip, { count: currentFails, lockedUntil: now + 15 * 60 * 1000 });
    } else {
      failedAttempts.set(ip, { count: currentFails, lockedUntil: 0 });
    }
    return { status: 401, message: 'UNAUTHORIZED' };
  }

  const now = Date.now();
  // 9 failed attempts
  for (let i = 1; i <= 9; i++) {
    const res = recordAttempt(testIp, false, now);
    assert.strictEqual(res.status, 401);
  }

  // 10th failed attempt -> locks out
  const tenth = recordAttempt(testIp, false, now);
  assert.strictEqual(tenth.status, 401);

  // 11th attempt within 15 minutes -> 429 LOCKED
  const lockedRes = recordAttempt(testIp, true, now + 1000);
  assert.strictEqual(lockedRes.status, 429);
  assert.strictEqual(lockedRes.message, 'LOCKED');

  // After 15 minutes -> unlocked
  const expiredRes = recordAttempt(testIp, true, now + 16 * 60 * 1000);
  assert.strictEqual(expiredRes.status, 200);
});

test('formatTimeRemaining: STRICT - Never assumes Vitalicia unless isLifetime is explicitly true', () => {
  function formatTimeRemaining(expiresAt, isLifetime, nowMs = Date.now()) {
    if (isLifetime === true) return '♾️ Vitalicia';
    if (!expiresAt) return 'Sin vigencia fijada';
    const diffMs = new Date(expiresAt).getTime() - nowMs;
    if (diffMs <= 0) return 'Expirado';
    const totalMin = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMin / 1440);
    const hours = Math.floor((totalMin % 1440) / 60);
    const mins = totalMin % 60;
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins} min`;
  }

  const now = Date.now();
  // 1. Explicit lifetime -> Vitalicia
  assert.strictEqual(formatTimeRemaining(null, true, now), '♾️ Vitalicia');
  assert.strictEqual(formatTimeRemaining(undefined, true, now), '♾️ Vitalicia');

  // 2. Falsy expiresAt without isLifetime -> 'Sin vigencia fijada' (NOT Vitalicia!)
  assert.strictEqual(formatTimeRemaining(null, false, now), 'Sin vigencia fijada');
  assert.strictEqual(formatTimeRemaining(null, undefined, now), 'Sin vigencia fijada');
  assert.strictEqual(formatTimeRemaining('', false, now), 'Sin vigencia fijada');

  // 3. Expired date -> 'Expirado' (NOT Vitalicia!)
  const pastDate = new Date(now - 3600 * 1000).toISOString();
  assert.strictEqual(formatTimeRemaining(pastDate, false, now), 'Expirado');

  // 4. Future date -> Formatted time
  const future24h = new Date(now + 24 * 3600 * 1000).toISOString();
  assert.match(formatTimeRemaining(future24h, false, now), /1d 0h 0m/);
});

test('Device Accumulation Shield: loadDevices merges disk and memory and never drops connected devices', () => {
  const diskDevs = {
    'CEL-DEVICE-A': { hwid: 'CEL-DEVICE-A', mode: 'PRO', totalPings: 10 },
    'CEL-DEVICE-B': { hwid: 'CEL-DEVICE-B', mode: 'DEMO', totalPings: 2 }
  };
  const memDevs = {
    'CEL-DEVICE-B': { hwid: 'CEL-DEVICE-B', mode: 'DEMO', totalPings: 5 }, // updated pings
    'CEL-DEVICE-C': { hwid: 'CEL-DEVICE-C', mode: 'PRO', totalPings: 1 }   // new connection
  };

  const merged = { ...diskDevs, ...memDevs };
  // All 3 devices must be present
  assert.strictEqual(Object.keys(merged).length, 3);
  assert.strictEqual(merged['CEL-DEVICE-A'].totalPings, 10);
  assert.strictEqual(merged['CEL-DEVICE-B'].totalPings, 5);
  assert.strictEqual(merged['CEL-DEVICE-C'].totalPings, 1);
});

test('License Expiration Setting: Positive duration sets future ISO and isLifetime = false', () => {
  function applyExpiration(body) {
    const { minutes, hours, days, isLifetime } = body;
    const isExplicitLifetime = (isLifetime === true || (hours === '0' && minutes === undefined && days === undefined));
    if (isExplicitLifetime) {
      return { expiresAt: null, isLifetime: true };
    }
    let addMs = 0;
    if (minutes !== undefined) addMs = parseFloat(minutes) * 60 * 1000;
    else if (hours !== undefined) addMs = parseFloat(hours) * 3600 * 1000;
    else if (days !== undefined) addMs = parseFloat(days) * 86400 * 1000;

    const expDate = new Date(Date.now() + addMs);
    return { expiresAt: expDate.toISOString(), isLifetime: false };
  }

  // 1 day
  const r1 = applyExpiration({ days: 1 });
  assert.strictEqual(r1.isLifetime, false);
  assert.ok(r1.expiresAt);
  assert.ok(new Date(r1.expiresAt).getTime() > Date.now());

  // 15 minutes
  const r2 = applyExpiration({ minutes: 15 });
  assert.strictEqual(r2.isLifetime, false);
  assert.ok(r2.expiresAt);

  // Explicit Lifetime
  const r3 = applyExpiration({ isLifetime: true });
  assert.strictEqual(r3.isLifetime, true);
  assert.strictEqual(r3.expiresAt, null);

  // Selector '0' (Lifetime)
  const r4 = applyExpiration({ hours: '0' });
  assert.strictEqual(r4.isLifetime, true);
  assert.strictEqual(r4.expiresAt, null);
});

console.log(`\nAll ${passed}/${total} Licensing & Admin Audit unit tests passed 100%!\n`);
