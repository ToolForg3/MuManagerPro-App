/**
 * MU MANAGER PRO - SQL SERVER REST BRIDGE & TELEMETRY CONTROL
 * -----------------------------------------------------------
 * Microservicio intermedio seguro para conexiones móviles a SQL Server
 * y Panel de Control en tiempo real para auditar celulares con DEMO y PRO.
 *
 * Puerto por defecto: 3001
 * Panel de Monitoreo Web: http://localhost:3001/admin
 */

try {
  require('dotenv').config();
} catch (_) {}

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');
const tls = require('tls');
const net = require('net');
let sql;
try {
  sql = require('mssql');
} catch (e) {
  console.warn('[!] mssql package not installed');
}

let Jimp;
try {
  Jimp = require('jimp');
} catch (e) {
  console.warn('[!] jimp package not installed');
}

const app = express();

app.get('/api/ping', (req, res) => {
  res.json({
    success: true,
    status: 'ONLINE',
    service: 'MuManager PRO Gateway',
    platform: process.env.VERCEL ? 'Vercel Serverless' : 'NodeJS',
    timestamp: new Date().toISOString()
  });
});


// BUG-16: CORS configurado con cabeceras permitidas explícitas (Primero antes de cualquier ruta)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-HWID', 'X-Req-Timestamp', 'X-Req-Nonce', 'X-Req-Signature', 'X-Admin-Key'],
}));

app.use(express.json({ limit: '15mb', verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 3001;
const isVercel = !!process.env.VERCEL;
const os = require('os');
const BASE_DATA_DIR = isVercel ? path.join(os.tmpdir(), 'mumanager-data') : path.join(__dirname, 'data');

if (isVercel) {
  try {
    if (!fs.existsSync(BASE_DATA_DIR)) {
      fs.mkdirSync(BASE_DATA_DIR, { recursive: true });
    }
    const seedDir = path.join(__dirname, 'data');
    if (fs.existsSync(seedDir)) {
      const files = fs.readdirSync(seedDir);
      files.forEach(f => {
        const src = path.join(seedDir, f);
        const dst = path.join(BASE_DATA_DIR, f);
        const shouldCopy = !fs.existsSync(dst) || (f === 'settings.json' && fs.statSync(src).mtimeMs > (fs.existsSync(dst) ? fs.statSync(dst).mtimeMs : 0));
        if (shouldCopy && fs.statSync(src).isFile()) {
          try { fs.copyFileSync(src, dst); } catch (_) {}
        }
      });
    }
  } catch (_) {}
}

const DATA_FILE = path.join(BASE_DATA_DIR, 'devices.json');
const SETTINGS_FILE = path.join(BASE_DATA_DIR, 'settings.json');
const USERS_FILE = path.join(BASE_DATA_DIR, 'users.json');
const PRO_REQUESTS_FILE = path.join(BASE_DATA_DIR, 'proRequests.json');
const SECURITY_LOGS_FILE = path.join(BASE_DATA_DIR, 'securityLogs.json');
const TOMBSTONES_FILE = path.join(BASE_DATA_DIR, 'tombstones.json');
// [SEC-01] MASTER_SECURITY_SALT — Exclusivamente por variable de entorno (Vercel / .env)
if (!process.env.MASTER_SECURITY_SALT) {
  if (process.env.NODE_ENV === 'production') {
    console.error('\x1b[31m[FATAL SECURITY] MASTER_SECURITY_SALT es obligatorio en producción. Configura la variable de entorno y reinicia.\x1b[0m');
    process.exit(1);
  } else {
    console.warn('\x1b[33m[⚠ SECURITY] MASTER_SECURITY_SALT no configurada en desarrollo. Usando salt efímero aleatorio.\x1b[0m');
  }
}
const MASTER_SECURITY_SALT = (process.env.MASTER_SECURITY_SALT && process.env.MASTER_SECURITY_SALT.trim().length >= 16)
  ? process.env.MASTER_SECURITY_SALT.trim()
  : crypto.randomBytes(32).toString('hex');
const GITHUB_RELEASE_DOWNLOAD_URL = process.env.GITHUB_RELEASE_DOWNLOAD_URL || 'https://github.com/ToolForg3/MuManagerPro-App/releases/download/v1.5.1/MuManagerPro-v1.5.1.apk';

// [H05/N03/H02] Verificación de variables de entorno críticas al arranque
if (!process.env.JWT_SECRET) {
  console.warn('\x1b[33m[⚠ SECURITY] JWT_SECRET env var no configurada. El secreto JWT está usando el fallback interno. Configura JWT_SECRET en producción.\x1b[0m');
}
if (!process.env.ADMIN_KEY) {
  console.warn('\x1b[33m[⚠ SECURITY] ADMIN_KEY env var no configurada. Se usará la clave efímera aleatoria de desarrollo. Configura ADMIN_KEY en producción.\x1b[0m');
}

// [SEC-02] Clave admin efímera — se genera aleatoriamente en cada arranque del servidor en DEV.
// En producción SIEMPRE se usa process.env.ADMIN_KEY y nunca hay fallback hardcodeado.
let devEphemeralAdminKey = null;
function getActiveAdminKey() {
  if (process.env.ADMIN_KEY && typeof process.env.ADMIN_KEY === 'string' && process.env.ADMIN_KEY.trim().length >= 8) {
    return process.env.ADMIN_KEY.trim();
  }
  try {
    const s = loadSettings();
    if (s && s.adminKey && typeof s.adminKey === 'string' && s.adminKey.trim().length >= 8) {
      return s.adminKey.trim();
    }
  } catch (_) {}
  if (process.env.NODE_ENV === 'production') {
    return null; // En producción NUNCA permitir una clave administrativa por defecto
  }
  if (!devEphemeralAdminKey) {
    devEphemeralAdminKey = crypto.randomBytes(20).toString('hex'); // 40 chars hex — impredecible
    console.warn(`\x1b[33m[DEV ADMIN KEY] Clave de administrador efímera para esta sesión: \x1b[1m${devEphemeralAdminKey}\x1b[0m\x1b[33m (válida solo hasta reiniciar el servidor)\x1b[0m`);
  }
  return devEphemeralAdminKey;
}

function isValidAdminKey(key) {
  if (!key || typeof key !== 'string') return false;
  const clean = key.trim();
  if (clean.length < 8) return false;

  const keysToCheck = [];
  const envKey = process.env.ADMIN_KEY && typeof process.env.ADMIN_KEY === 'string' ? process.env.ADMIN_KEY.trim() : '';
  if (envKey && envKey.length >= 8) {
    keysToCheck.push(envKey);
  }

  try {
    const s = loadSettings();
    if (s && s.adminKey && typeof s.adminKey === 'string' && s.adminKey.trim().length >= 8) {
      const setKey = s.adminKey.trim();
      if (!keysToCheck.includes(setKey)) {
        keysToCheck.push(setKey);
      }
    }
  } catch (_) {}

  if (keysToCheck.length === 0 && process.env.NODE_ENV !== 'production') {
    const activeDevKey = getActiveAdminKey();
    if (activeDevKey && activeDevKey.length >= 8) {
      keysToCheck.push(activeDevKey);
    }
  }

  const bufClean = Buffer.from(clean, 'utf8');
  for (const candidate of keysToCheck) {
    const bufCand = Buffer.from(candidate, 'utf8');
    if (bufClean.length === bufCand.length && crypto.timingSafeEqual(bufClean, bufCand)) {
      return true;
    }
  }
  return false;
}


const DEFAULT_SETTINGS = {
  globalMaintenance: false,
  maintenanceMessage: 'Servidor temporalmente en mantenimiento por el administrador. Intenta de nuevo en breve.',
  broadcastAnnouncement: '',
  minRequiredVersion: '1.5.8',
  latestVersion: '1.6.7',
  latestApkUrl: 'https://raw.githubusercontent.com/ToolForg3/MuManagerPro-App/main/MuManagerPro.apk',
  updateChangelog: '🔒 MuManager PRO v1.6.7 (Build 69):\n• 🛡️ Blindaje avanzado de seguridad (ProGuard/R8) activo en APK de release.\n• 🔒 Telemetria segura: la asociacion de identidad requiere sesion autenticada.\n• ⚠️ Verificacion de vars de entorno criticas al arranque (JWT_SECRET, ADMIN_KEY).\n• 🛡️ Validacion estricta de licencia PRO en el conector SQL.\n• 🔐 Eliminacion de metadatos sensibles en bytecode del APK.\n🚀 MuManager PRO v1.6.5 (Build 67):\n• 👑 Nueva Categoria Oficial Ancient y Box of Kundun +1 a +5.\n• 📢 Selector de Cantidades: x1, x10, x30, x50, x100, x255.\n• 🧩 Asignacion 2D sin colisiones en baul y boveda expandida.\n• 🔍 Filtros predictivos con autocompletado y chips de cuentas recientes.',
  forceUpdate: true,
  whitelistOnly: false,
  demoDurationHours: 72,
  broadcast: {
    active: false,
    id: 'ann_init',
    title: '',
    message: '',
    type: 'INFO',
    displayMode: 'BANNER',
    updatedAt: ''
  },
  whatsapp: {
    enabled: true,
    phone: process.env.ADMIN_PHONE || '',
    apiKey: '',
    provider: 'callmebot',
    webhookUrl: '',
    events: {
      tamper: true,
      sqlExploit: true,
      bruteForce: true,
      deviceBlocked: true
    }
  },
  beta: {
    enabled: true,
    latestBetaVersion: '1.1.9',
    betaChangelog: '• Canal Beta: Pruebas de nuevas funciones y optimizaciones.',
    approvedHwids: [],
    requests: []
  },
  rollback: {
    active: false,
    targetVersion: '1.1.7',
    targetApkUrl: '',
    reason: 'Rollback de emergencia preventivo por estabilidad.',
    forceRollback: true,
    triggeredAt: null
  }
};

function parseVersion(v) {
  if (!v || typeof v !== 'string') return [1, 0, 0];
  const parts = v.replace(/^v/i, '').split('.').map(n => parseInt(n, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

function compareVersions(v1, v2) {
  const [a1, b1, c1] = parseVersion(v1);
  const [a2, b2, c2] = parseVersion(v2);
  if (a1 !== a2) return a1 - a2;
  if (b1 !== b2) return b1 - b2;
  return c1 - c2;
}

function isNewerVersion(remote, local) {
  return compareVersions(remote, local) > 0;
}

function isOlderThanMin(local, min) {
  return compareVersions(local, min) < 0;
}

let cachedSettings = null;
let lastSettingsCheck = 0;
const SETTINGS_CACHE_TTL = 3000; // Recargar desde disco como máximo cada 3 segundos

function loadSettings() {
  const now = Date.now();
  if (cachedSettings && (now - lastSettingsCheck < SETTINGS_CACHE_TTL)) {
    return cachedSettings;
  }
  lastSettingsCheck = now;
  const candidateFiles = [
    path.join(__dirname, 'data', 'settings.json'),
    path.join(__dirname, 'server', 'data', 'settings.json'),
    path.join(process.cwd(), 'data', 'settings.json'),
    path.join(process.cwd(), 'server', 'data', 'settings.json'),
    SETTINGS_FILE
  ];
  for (const f of candidateFiles) {
    if (fs.existsSync(f)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(f, 'utf8'));
        if (parsed && parsed.latestVersion) {
          cachedSettings = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...(parsed.whatsapp || {}) },
            beta: { ...DEFAULT_SETTINGS.beta, ...(parsed.beta || {}) },
            rollback: { ...DEFAULT_SETTINGS.rollback, ...(parsed.rollback || {}) }
          };
          return cachedSettings;
        }
      } catch (_) {}
    }
  }
  if (!cachedSettings) {
    cachedSettings = { ...DEFAULT_SETTINGS };
  }
  return cachedSettings;
}

// Servicio de Alertas WhatsApp en Tiempo Real
async function sendWhatsAppAlert(eventKey, title, details, hwid = 'N/A', ip = '127.0.0.1') {
  try {
    let httpsMod, httpMod;
    try {
      httpsMod = require('https');
      httpMod = require('http');
    } catch (_) {}
    if (!httpsMod) return { success: false, reason: 'Módulos de red no disponibles' };

    const settings = loadSettings();
    const wa = settings.whatsapp || DEFAULT_SETTINGS.whatsapp;
    if (!wa || !wa.enabled) return { success: false, reason: 'Alertas de WhatsApp desactivadas' };
    if (wa.events && wa.events[eventKey] === false) return { success: false, reason: 'Evento desactivado' };

    const rawPhone = String(wa.phone || process.env.ADMIN_PHONE || '').trim();
    const phone = rawPhone.replace(/[^0-9]/g, '');
    if (!phone) return { success: false, reason: 'Número de WhatsApp no configurado' };

    const timeStr = new Date().toLocaleString('es-ES', { timeZone: 'America/Sao_Paulo' });
    const messageText = 
      `🚨 *ALERTA DE SEGURIDAD - MU MANAGER PRO* 🚨\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `⚠️ *Alerta:* ${title}\n` +
      `📱 *Dispositivo:* ${hwid}\n` +
      `🌐 *IP:* ${ip}\n` +
      `⏰ *Hora:* ${timeStr}\n` +
      `📝 *Detalles:* ${details}\n` +
      `🛑 *Estado:* Tráfico protegido / Acción registrada`;

    if (wa.provider === 'webhook' && wa.webhookUrl) {
      return new Promise((resolve) => {
        try {
          const parsed = new URL(wa.webhookUrl);
          const lib = parsed.protocol === 'https:' ? httpsMod : (httpMod || httpsMod);
          const postData = JSON.stringify({
            phone,
            message: messageText,
            event: eventKey,
            title,
            details,
            hwid,
            ip,
            timestamp: new Date().toISOString()
          });
          const req = lib.request(parsed, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(postData)
            },
            timeout: 8000
          }, (res) => {
            resolve({ success: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode });
          });
          req.on('error', (err) => resolve({ success: false, error: err.message }));
          req.write(postData);
          req.end();
        } catch (e) {
          resolve({ success: false, error: e.message });
        }
      });
    } else {
      // CallMeBot WhatsApp API
      return new Promise((resolve) => {
        if (!wa.apiKey) {
          return resolve({
            success: false,
            error: 'Falta la API Key de CallMeBot. Para obtenerla gratis: agrega a tus contactos de WhatsApp el número oficial (+34 644 10 55 84 o +34 644 76 66 43) y envíale el mensaje: I allow callmebot to send me messages'
          });
        }
        const apiKeyParam = `&apikey=${encodeURIComponent(wa.apiKey)}`;
        const callmeUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(messageText)}${apiKeyParam}`;
        httpsMod.get(callmeUrl, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            const isOk = res.statusCode === 200 && !data.toLowerCase().includes('error') && !data.toLowerCase().includes('not allowed');
            resolve({
              success: isOk,
              statusCode: res.statusCode,
              response: data,
              error: isOk ? undefined : (data || `HTTP ${res.statusCode}`)
            });
          });
        }).on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    }
  } catch (e) {
    return { success: false, error: e.message };
  }
}

let inMemoryFallback = {};

function safeAtomicWriteJson(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${filePath}.${Date.now()}_${Math.floor(Math.random() * 10000)}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
    if (fs.existsSync(filePath)) {
      try {
        fs.copyFileSync(filePath, `${filePath}.bak`);
      } catch (_) {}
    }
    fs.renameSync(tmpPath, filePath);
    inMemoryFallback[filePath] = data;
    return true;
  } catch (e) {
    console.error(`Error in safeAtomicWriteJson for ${filePath}:`, e);
    try {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      inMemoryFallback[filePath] = data;
      return true;
    } catch (err) {
      console.error(`Fallback write failed for ${filePath}:`, err);
      inMemoryFallback[filePath] = data;
      return false;
    }
  }
}

// =========================================================================
// MOTOR UNIVERSAL DE PERSISTENCIA CLOUD (UPSTASH REDIS / VERCEL KV)
// =========================================================================
const CLOUD_STORAGE = {
  enabled: !!(process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL),
  url: (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/+$/, ''),
  token: process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '',
  provider: (process.env.UPSTASH_REDIS_REST_URL ? 'Upstash Redis Cloud' : (process.env.KV_REST_API_URL ? 'Vercel KV Cloud' : 'Local Serverless (/tmp)')),
  async exec(cmd, ...args) {
    if (!this.enabled || !this.url || !this.token) return null;
    try {
      const res = await fetch(this.url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([cmd, ...args])
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.result;
    } catch (err) {
      console.error('[CloudStorage Error]', err.message);
      return null;
    }
  },
  async get(key) {
    const raw = await this.exec('GET', key);
    if (!raw) return null;
    try { return typeof raw === 'string' ? JSON.parse(raw) : raw; } catch (_) { return raw; }
  },
  async set(key, val) {
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    return await this.exec('SET', key, str);
  }
};

let cloudStorageInitialized = false;
async function initCloudStorage() {
  if (cloudStorageInitialized || !CLOUD_STORAGE.enabled) return;
  cloudStorageInitialized = true;
  try {
    const [cDev, cSet, cUsr, cTom] = await Promise.all([
      CLOUD_STORAGE.get('mumanager:devices'),
      CLOUD_STORAGE.get('mumanager:settings'),
      CLOUD_STORAGE.get('mumanager:users'),
      CLOUD_STORAGE.get('mumanager:tombstones')
    ]);
    if (cDev && typeof cDev === 'object') {
      inMemoryFallback[DATA_FILE] = cDev;
      safeAtomicWriteJson(DATA_FILE, cDev);
    }
    if (cSet && typeof cSet === 'object' && Object.keys(cSet).length > 0) {
      try {
        const seedPath = path.join(__dirname, 'data', 'settings.json');
        if (fs.existsSync(seedPath)) {
          const seedSettings = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
          if (seedSettings && isNewerVersion(seedSettings.latestVersion, cSet.latestVersion)) {
            cSet.latestVersion = seedSettings.latestVersion;
            cSet.updateChangelog = seedSettings.updateChangelog;
            cSet.forceUpdate = seedSettings.forceUpdate !== undefined ? seedSettings.forceUpdate : true;
            cSet.latestApkUrl = seedSettings.latestApkUrl || cSet.latestApkUrl;
            cSet.updateTitle = seedSettings.updateTitle || cSet.updateTitle;
            cSet.versionCode = seedSettings.versionCode || cSet.versionCode;
            cSet.appVersion = seedSettings.appVersion || cSet.appVersion;
            cSet.buildNumber = seedSettings.buildNumber || cSet.buildNumber;
            cSet.releaseNotes = seedSettings.releaseNotes || cSet.releaseNotes;
            CLOUD_STORAGE.set('mumanager:settings', cSet).catch(() => {});
          }
        }
      } catch (_) {}
      inMemoryFallback[SETTINGS_FILE] = cSet;
      safeAtomicWriteJson(SETTINGS_FILE, cSet);
    }
    if (cUsr && Array.isArray(cUsr)) {
      inMemoryFallback[USERS_FILE] = cUsr;
      safeAtomicWriteJson(USERS_FILE, cUsr);
    }
    if (cTom && typeof cTom === 'object') {
      inMemoryFallback[TOMBSTONES_FILE] = cTom;
      safeAtomicWriteJson(TOMBSTONES_FILE, cTom);
    }
    console.log(`[CloudStorage] Sincronizado exitosamente con ${CLOUD_STORAGE.provider}`);
  } catch (e) {
    console.error('[CloudStorage Init Error]', e.message);
  }
}

function safeJsonParse(raw, fallback = {}) {
  if (!raw || typeof raw !== 'string') return fallback;
  try {
    const clean = raw.replace(/^\uFEFF/, '').trim();
    return JSON.parse(clean);
  } catch (_) {
    return fallback;
  }
}

function loadTombstones() {
  let result = null;
  if (inMemoryFallback[TOMBSTONES_FILE]) {
    result = inMemoryFallback[TOMBSTONES_FILE];
  } else {
    try {
      if (fs.existsSync(TOMBSTONES_FILE)) {
        result = safeJsonParse(fs.readFileSync(TOMBSTONES_FILE, 'utf8'), {});
      } else {
        const seed = path.join(__dirname, 'data', 'tombstones.json');
        if (fs.existsSync(seed)) {
          result = safeJsonParse(fs.readFileSync(seed, 'utf8'), {});
        }
      }
    } catch (e) {
      console.error('Error reading tombstones data', e);
    }
  }
  if (!result || typeof result !== 'object') result = {};
  if (!result.revokedKeys) result.revokedKeys = {};
  if (!result.deletedUsers) result.deletedUsers = {};
  return result;
}

function saveTombstones(data) {
  inMemoryFallback[TOMBSTONES_FILE] = data;
  if (!safeAtomicWriteJson(TOMBSTONES_FILE, data)) {
    throw new Error("Disk error saving tombstones");
  }
  if (CLOUD_STORAGE.enabled) {
    CLOUD_STORAGE.set('mumanager:tombstones', data).catch(() => {});
  }
  return true;
}

function saveSettings(data) {
  if (!safeAtomicWriteJson(SETTINGS_FILE, data)) {
    throw new Error("Disk error saving settings");
  }
  cachedSettings = {
    ...DEFAULT_SETTINGS,
    ...data,
    whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...(data.whatsapp || {}) },
    beta: { ...DEFAULT_SETTINGS.beta, ...(data.beta || {}) },
    rollback: { ...DEFAULT_SETTINGS.rollback, ...(data.rollback || {}) }
  };
  lastSettingsCheck = Date.now();
  if (CLOUD_STORAGE.enabled) {
    CLOUD_STORAGE.set('mumanager:settings', data).catch(() => {});
  }
  return true;
}

const DEFAULT_SEED_DEVICES = {};

const DEFAULT_SEED_USERS = [];

function loadDevices() {
  let currentDevs = {};
  if (inMemoryFallback[DATA_FILE]) {
    currentDevs = inMemoryFallback[DATA_FILE];
  } else {
    try {
      if (fs.existsSync(DATA_FILE)) {
        currentDevs = safeJsonParse(fs.readFileSync(DATA_FILE, 'utf8'), {});
      } else {
        const seed = path.join(__dirname, 'data', 'devices.json');
        if (fs.existsSync(seed)) {
          currentDevs = safeJsonParse(fs.readFileSync(seed, 'utf8'), {});
        }
      }
    } catch (e) {
      console.error('Error reading devices data', e);
    }
  }

  // Comprobar lista de dispositivos revocados/eliminados (Tombstones)
  const tombstones = loadTombstones();

  // Smart merge determinista con DEFAULT_SEED_DEVICES:
  // 1. Asegura que los dispositivos y licencias canónicas existan siempre,
  //    SALVO aquellos eliminados explícitamente por el administrador (Tombstones).
  // 2. Si en runtime un dispositivo se actualizó (pings, lastSeen, ip, etc.), preserva los datos actualizados.
  const merged = {};
  for (const [hwid, dev] of Object.entries(DEFAULT_SEED_DEVICES)) {
    const cleanHwid = String(hwid).trim().toUpperCase();
    if (!tombstones[cleanHwid] && !tombstones[hwid]) {
      merged[hwid] = { ...dev };
    }
  }
  if (currentDevs && typeof currentDevs === 'object') {
    for (const [hwid, dev] of Object.entries(currentDevs)) {
      const cleanHwid = String(hwid).trim().toUpperCase();
      if (!tombstones[cleanHwid] && !tombstones[hwid] && dev && typeof dev === 'object') {
        merged[hwid] = merged[hwid] ? { ...merged[hwid], ...dev } : dev;
      }
    }
  }
  inMemoryFallback[DATA_FILE] = merged;
  return merged;
}

function saveDevices(data) {
  inMemoryFallback[DATA_FILE] = data;
  if (!safeAtomicWriteJson(DATA_FILE, data)) {
    throw new Error("Disk error saving devices");
  }
  try {
    const seed = path.join(__dirname, 'data', 'devices.json');
    if (fs.existsSync(path.dirname(seed))) {
      safeAtomicWriteJson(seed, data);
    }
  } catch (_) {}
  if (CLOUD_STORAGE.enabled) {
    CLOUD_STORAGE.set('mumanager:devices', data).catch(() => {});
  }
  return true;
}

function loadUsers() {
  let diskUsers = [];
  try {
    if (fs.existsSync(USERS_FILE)) {
      const parsed = safeJsonParse(fs.readFileSync(USERS_FILE, 'utf8'), []);
      if (Array.isArray(parsed)) diskUsers = parsed;
    }
  } catch (e) {
    console.error('Error reading users data', e);
  }

  // Lista de usuarios eliminados explícitamente (Tombstones)
  const tombstones = loadTombstones();
  const deletedUsers = (tombstones && tombstones.deletedUsers && typeof tombstones.deletedUsers === 'object')
    ? tombstones.deletedUsers
    : {};

  // Smart merge bidireccional anti-pérdida:
  // Todos los usuarios canónicos se inicializan y nunca desaparecen,
  // SALVO si fueron explícitamente eliminados por el administrador (Tombstones).
  // Los usuarios registrados o actualizados en caliente se preservan y fusionan sin pérdida.
  const userMap = new Map();
  for (const u of DEFAULT_SEED_USERS) {
    const emailKey = (u.email || '').toLowerCase().trim();
    const idKey = (u.id || '').toLowerCase().trim();
    const isDeleted = (emailKey && deletedUsers[emailKey]) || (idKey && deletedUsers[idKey]);
    if (!isDeleted) {
      const mapKey = emailKey || idKey;
      if (mapKey) userMap.set(mapKey, { ...u });
    }
  }
  for (const u of diskUsers) {
    const emailKey = (u.email || '').toLowerCase().trim();
    const idKey = (u.id || '').toLowerCase().trim();
    const isDeleted = (emailKey && deletedUsers[emailKey]) || (idKey && deletedUsers[idKey]);
    if (!isDeleted) {
      const mapKey = emailKey || idKey;
      if (mapKey) {
        if (userMap.has(mapKey)) {
          userMap.set(mapKey, { ...userMap.get(mapKey), ...u });
        } else {
          userMap.set(mapKey, u);
        }
      }
    }
  }
  const merged = Array.from(userMap.values());
  inMemoryFallback[USERS_FILE] = merged;
  return merged;
}

function saveUsers(data) {
  inMemoryFallback[USERS_FILE] = data;
  if (!safeAtomicWriteJson(USERS_FILE, data)) {
    throw new Error("Disk error saving users");
  }
  if (CLOUD_STORAGE.enabled) {
    CLOUD_STORAGE.set('mumanager:users', data).catch(() => {});
  }
  return true;
}

app.use(async (req, res, next) => {
  if (CLOUD_STORAGE.enabled && !cloudStorageInitialized) {
    await initCloudStorage();
  }
  next();
});

if (CLOUD_STORAGE.enabled) {
  initCloudStorage().catch(e => console.error('[CloudStorage Boot Init Error]', e.message));
}

function loadProRequests() {
  try {
    if (fs.existsSync(PRO_REQUESTS_FILE)) {
      const parsed = safeJsonParse(fs.readFileSync(PRO_REQUESTS_FILE, 'utf8'), []);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Error reading proRequests data', e);
  }
  return [];
}

function saveProRequests(data) {
  if (!safeAtomicWriteJson(PRO_REQUESTS_FILE, data)) {
    throw new Error("Disk error saving pro requests");
  }
  return true;
}

function loadSecurityLogs() {
  try {
    if (fs.existsSync(SECURITY_LOGS_FILE)) {
      const parsed = safeJsonParse(fs.readFileSync(SECURITY_LOGS_FILE, 'utf8'), []);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('Error reading securityLogs data', e);
  }
  return [];
}

function saveSecurityLogs(data) {
  const ok = safeAtomicWriteJson(SECURITY_LOGS_FILE, data.slice(0, 500));
  try {
    const seed = path.join(__dirname, 'data', 'securityLogs.json');
    if (fs.existsSync(path.dirname(seed))) {
      safeAtomicWriteJson(seed, data.slice(0, 500));
    }
  } catch (_) {}
  return ok;
}

function addSecurityLog(type, hwid, ip, message, details = null, req = null) {
  const logs = loadSecurityLogs();
  const devices = loadDevices();
  const dev = (hwid && devices[hwid]) ? devices[hwid] : null;
  const geo = req ? extractGeoFromReq(req) : null;

  const flag = (geo && geo.flag && geo.flag !== '🌐') ? geo.flag : ((dev && dev.flag) || '🌐');
  const country = (geo && geo.countryName && geo.countryName !== 'Desconocido') ? geo.countryName : ((dev && dev.country) || 'Desconocido');
  const city = (geo && geo.city) ? geo.city : ((dev && dev.city) || '');
  const countryCode = (geo && geo.countryCode) ? geo.countryCode : ((dev && dev.countryCode) || '');
  const deviceModel = (dev && dev.deviceModel) || (req && req.body && req.body.deviceModel) || '';
  const deviceBrand = (dev && dev.deviceBrand) || (req && req.body && req.body.deviceBrand) || '';
  const isEmulator = dev ? !!dev.isEmulator : (req && req.body && !!req.body.isEmulator);
  const userEmail = (dev && dev.currentUser) || (req && req.body && req.body.userEmail) || '';

  const isCritical = (
    type === 'TAMPER_ALERT' ||
    type === 'SQL_EXPLOIT_ATTEMPT' ||
    type === 'REPLAY_DETECTED' ||
    type === 'SIG_MISMATCH' ||
    type === 'EMERGENCY_LOCK'
  );

  const entry = {
    id: 'sec_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    type,
    hwid: hwid || 'N/A',
    ip: ip || '127.0.0.1',
    message,
    details: details || {},
    countryCode,
    country,
    city,
    flag,
    deviceModel,
    deviceBrand,
    isEmulator,
    userEmail,
    read: false,
    severity: isCritical ? 'CRITICAL' : 'HIGH'
  };

  logs.unshift(entry);
  saveSecurityLogs(logs);
  return entry;
}

function hashPassword(password, salt = null) {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const iterations = 100000;
  const derived = crypto.pbkdf2Sync(password, actualSalt, iterations, 32, 'sha256').toString('hex');
  return `$pbkdf2$${iterations}$${actualSalt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return { valid: false, needsUpgrade: false };
  const cleanPass = String(password).trim();
  const cleanHash = String(storedHash).trim();

  if (cleanHash.startsWith('$pbkdf2$')) {
    const parts = cleanHash.split('$');
    if (parts.length === 5) {
      const iterations = parseInt(parts[2], 10);
      const salt = parts[3];
      const expectedHash = parts[4];
      try {
        const derived = crypto.pbkdf2Sync(cleanPass, salt, iterations, 32, 'sha256').toString('hex');
        const match = crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(expectedHash, 'hex'));
        return { valid: match, needsUpgrade: false };
      } catch (_) {
        return { valid: false, needsUpgrade: false };
      }
    }
  }

  const legacyHash = sha256(`${cleanPass}:${MASTER_SECURITY_SALT}`).toLowerCase();
  if (cleanHash.toLowerCase() === legacyHash) {
    return { valid: true, needsUpgrade: true };
  }

  return { valid: false, needsUpgrade: false };
}

const EPHEMERAL_JWT_SECRET = crypto.randomBytes(32).toString('hex');
const JWT_SESSION_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.trim().length >= 16)
  ? process.env.JWT_SECRET.trim()
  : (process.env.NODE_ENV === 'production'
      ? (() => { console.error('\x1b[31m[FATAL SECURITY] JWT_SECRET obligatorio en producción.\x1b[0m'); process.exit(1); })()
      : EPHEMERAL_JWT_SECRET);

function generateSessionToken(email, role = 'USER', hwid = '') {
  const payload = {
    sub: String(email || '').trim().toLowerCase(),
    role: role || 'USER',
    hwid: String(hwid || '').trim(),
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (7 * 24 * 3600),
  };
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SESSION_SECRET).update(`${header}.${payloadB64}`).digest('base64url');
  return `${header}.${payloadB64}.${signature}`;
}

function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  const [headerB64, payloadB64, signature] = parts;
  try {
    const expectedSig = crypto.createHmac('sha256', JWT_SESSION_SECRET).update(`${headerB64}.${payloadB64}`).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const nowSec = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < nowSec) {
      return null;
    }
    return payload;
  } catch (_) {
    return null;
  }
}

const replayNonceCache = new Map();
if (typeof setInterval === 'function') {
  setInterval(() => {
    const now = Date.now();
    for (const [nonce, ts] of replayNonceCache.entries()) {
      if (now - ts > 10 * 60 * 1000) {
        replayNonceCache.delete(nonce);
      }
    }
  }, 5 * 60 * 1000);
}

const MAX_AUDIT_LOGS = 250;
const auditLogs = [];

function getLogCategory(type) {
  const t = String(type || '').toUpperCase();
  if (t.includes('SQL') || t.includes('TAMPER') || t.includes('REPLAY') || t.includes('SIG_') || t.includes('AUTH_') || t.includes('EMERGENCY') || t.includes('THREAT') || t.includes('FIREWALL')) {
    return 'SECURITY';
  }
  if (t.includes('KEY') || t.includes('PLAN') || t.includes('PRO') || t.includes('DEMO') || t.includes('EXPIR')) {
    return 'LICENSE';
  }
  if (t.includes('USER') || t.includes('SESSION') || t.includes('LOGIN') || t.includes('PW_') || t.includes('ROLE')) {
    return 'USERS';
  }
  if (t.includes('DEVICE') || t.includes('BLOCK') || t.includes('NOTE') || t.includes('PURGE')) {
    return 'DEVICES';
  }
  return 'SYSTEM';
}

function addAuditLog(type, hwid, ip, message, status = 'OK') {
  auditLogs.unshift({
    id: Date.now() + '-' + Math.floor(Math.random() * 1000),
    timestamp: new Date().toISOString(),
    type,
    category: getLogCategory(type),
    hwid: hwid || 'N/A',
    ip: ip || '127.0.0.1',
    message,
    status
  });
  if (auditLogs.length > MAX_AUDIT_LOGS) {
    auditLogs.pop();
  }
}

// BUG-16: CORS configurado con cabeceras permitidas explícitas
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-Token', 'X-Device-HWID', 'X-Req-Timestamp', 'X-Req-Nonce', 'X-Req-Signature', 'X-Admin-Key'],
}));

app.use(express.json({ limit: '15mb', verify: (req, res, buf) => { req.rawBody = buf.toString('utf8'); } }));
app.use(express.urlencoded({ extended: true }));

// Cabeceras de seguridad y Content-Security-Policy (H03)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // [SEC-05] HSTS: fuerza HTTPS durante 1 año en producción
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Evita que el navegador filtre la URL de referencia a terceros
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Restringe APIs de navegador potencialmente peligrosas
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (req.path.startsWith('/admin') || req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https:;"
    );
  }
  next();
});

function getClientIp(req) {
  const isTrusted = req.app && req.app.get && req.app.get('trust proxy');
  if (isTrusted && req.headers['x-forwarded-for']) {
    const parts = String(req.headers['x-forwarded-for']).split(',');
    return parts[0].trim();
  }
  return req.socket ? (req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
}

// Rate Limiting global seguro en memoria (H28)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 120;

// [SEC-04] Rate limit estricto para endpoints de autenticación y activación de licencias
// Previene ataques de fuerza bruta sobre login, registro y OTP
const authRateCounts = new Map();
const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const AUTH_MAX_ATTEMPTS = 5;

function authRateLimitMiddleware(req, res, next) {
  const clientIp = getClientIp(req);
  const key = `auth:${clientIp}`;
  const now = Date.now();
  let record = authRateCounts.get(key);
  if (!record || now - record.startTime > AUTH_RATE_WINDOW_MS) {
    record = { count: 1, startTime: now };
    authRateCounts.set(key, record);
  } else {
    record.count++;
    if (record.count > AUTH_MAX_ATTEMPTS) {
      const retryAfterSec = Math.ceil((AUTH_RATE_WINDOW_MS - (now - record.startTime)) / 1000);
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: `Demasiados intentos. Espera ${Math.ceil(retryAfterSec / 60)} minuto(s) antes de intentar nuevamente.`
      });
    }
  }
  next();
}

// Purga periódica de entradas expiradas para prevenir fugas de memoria
if (typeof setInterval === 'function') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of requestCounts.entries()) {
      if (now - record.startTime > RATE_LIMIT_WINDOW_MS * 2) {
        requestCounts.delete(ip);
      }
    }
    for (const [key, record] of authRateCounts.entries()) {
      if (now - record.startTime > AUTH_RATE_WINDOW_MS * 2) {
        authRateCounts.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

app.use((req, res, next) => {
  const clientIp = getClientIp(req);
  const now = Date.now();
  let record = requestCounts.get(clientIp);
  if (!record || now - record.startTime > RATE_LIMIT_WINDOW_MS) {
    record = { count: 1, startTime: now };
    requestCounts.set(clientIp, record);
  } else {
    record.count++;
    if (record.count > MAX_REQUESTS_PER_WINDOW) {
      return res.status(429).json({ error: 'Demasiadas peticiones. Intenta de nuevo más tarde.' });
    }
  }
  next();
});

// Directorios de contenido estático y descargas
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
const websiteDir = fs.existsSync(path.join(__dirname, 'website'))
  ? path.join(__dirname, 'website')
  : path.join(__dirname, '..', 'website');

app.use(express.static(publicDir));
app.use('/public', express.static(publicDir));
if (fs.existsSync(websiteDir)) {
  app.use(express.static(websiteDir));
  app.use('/downloads', express.static(path.join(websiteDir, 'downloads')));
}

// Resolver dinámico y permanente del ÚLTIMO APK oficial
function getLatestApkInfo() {
  const settings = loadSettings();
  const targetVer = (settings.latestVersion || '1.0.7').replace(/^v/i, '').trim();

  const searchDirs = [
    publicDir,
    path.join(websiteDir, 'downloads'),
    path.join(__dirname, 'website', 'downloads')
  ];

  // 1. Coincidencia exacta con la versión oficial de settings.json (ej: MuManagerPro-v1.0.6.apk)
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const exactCandidate = path.join(dir, `MuManagerPro-v${targetVer}.apk`);
    if (fs.existsSync(exactCandidate) && fs.statSync(exactCandidate).size > 10000000) {
      return {
        path: exactCandidate,
        version: targetVer,
        filename: `MuManagerPro-v${targetVer}.apk`
      };
    }
  }

  // 2. Si existe MuManagerPro.apk genérico en los directorios, es el recién generado
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const generic = path.join(dir, 'MuManagerPro.apk');
    if (fs.existsSync(generic) && fs.statSync(generic).size > 10000000) {
      return {
        path: generic,
        version: targetVer,
        filename: `MuManagerPro-v${targetVer}.apk`
      };
    }
  }

  // 3. Fallback: Ordenar estrictamente por fecha de última modificación (mtime) DESCENDENTE
  const allApks = [];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (!file.toLowerCase().endsWith('.apk')) continue;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.size < 10000000) continue;
        allApks.push({ path: fullPath, filename: file, mtime: stat.mtimeMs });
      }
    } catch (_) {}
  }

  if (allApks.length > 0) {
    allApks.sort((a, b) => b.mtime - a.mtime);
    const best = allApks[0];
    return {
      path: best.path,
      version: targetVer,
      filename: `MuManagerPro-v${targetVer}.apk`
    };
  }

  return null;
}

/// Redirección permanente a GitHub CDN para descarga del APK (0 consumo de ancho de banda en Render)
const GITHUB_APK_CDN = process.env.GITHUB_APK_CDN || 'https://raw.githubusercontent.com/ToolForg3/MuManagerPro-App/main/MuManagerPro.apk';

app.get([
  '/download/MuManagerPro.apk',
  '/downloads/MuManagerPro.apk',
  '/download/latest',
  '/downloads/latest',
  '/download/latest.apk',
  '/downloads/latest.apk',
  '/download/MuManagerPro-latest.apk'
], (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  return res.redirect(302, GITHUB_APK_CDN);
});

app.get(['/download/:filename', '/downloads/:filename'], (req, res) => {
  const safeFilename = path.basename(req.params.filename);
  if (safeFilename.toLowerCase().endsWith('.apk')) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    return res.redirect(302, GITHUB_APK_CDN);
  }
  res.status(404).send('Archivo no encontrado.');
});

// BUG-17: Protección estricta de rutas administrativas /api/admin/*
// [SEC-03] La clave admin SOLO se acepta en el header X-Admin-Key (nunca en el body para evitar logs)
// Rate limiter dedicado para intentos fallidos de autenticación administrativa (10 fallos / 15 min bloqueo)
const adminFailedAttempts = new Map(); // ip -> { count, lockedUntil }

app.use('/api/admin', (req, res, next) => {
  if (req.path === '/storage/status') {
    return next();
  }
  const clientIp = getClientIp(req);
  const now = Date.now();

  const failRecord = adminFailedAttempts.get(clientIp);
  if (failRecord && failRecord.lockedUntil && failRecord.lockedUntil > now) {
    const remainingMin = Math.ceil((failRecord.lockedUntil - now) / 60000);
    return res.status(429).json({
      error: `Demasiados intentos fallidos. Acceso administrativo bloqueado temporalmente por ${remainingMin} minuto(s).`
    });
  }

  const adminKey = req.headers['x-admin-key']; // [SEC-03] Header solamente, no body
  if (isValidAdminKey(adminKey)) {
    if (failRecord) adminFailedAttempts.delete(clientIp);
    return next();
  }

  // Intento fallido
  const currentFails = (failRecord ? failRecord.count : 0) + 1;
  if (currentFails >= 10) {
    adminFailedAttempts.set(clientIp, { count: currentFails, lockedUntil: now + 15 * 60 * 1000 });
    addAuditLog('ADMIN_BRUTE_FORCE_BLOCKED', 'ANONYMOUS', clientIp, 'IP bloqueada por 15 min tras 10 intentos fallidos de Admin-Key', 'BLOCKED');
  } else {
    adminFailedAttempts.set(clientIp, { count: currentFails, lockedUntil: 0 });
  }

  return res.status(401).json({ error: 'No autorizado. Se requiere clave de administrador válida.' });
});

// Middleware de Seguridad Zero-Trust: Autenticación por Token / Admin-Key + Firma Criptográfica y Replay Protection (H01-H04)
app.use((req, res, next) => {
  // 1. Whitelist de rutas públicas mínimas y recursos estáticos
  if (
    req.path === '/' ||
    req.path === '/admin' ||
    req.path.startsWith('/admin/') ||
    req.path.startsWith('/api/admin') ||
    req.path === '/api/ping' ||
    req.path.startsWith('/api/telemetry') ||
    req.path.startsWith('/api/auth/') ||
    req.path === '/api/test-connection' ||
    req.path === '/api/admin/storage/status' ||
    req.path.startsWith('/public') ||
    req.path.startsWith('/download') ||
    req.path.startsWith('/downloads') ||
    req.path.startsWith('/css') ||
    req.path.startsWith('/js') ||
    req.path.startsWith('/assets') ||
    req.path.endsWith('.html') ||
    req.path.endsWith('.png') ||
    req.path.endsWith('.jpg') ||
    req.path.endsWith('.ico') ||
    req.path.endsWith('.svg') ||
    req.path.endsWith('.css') ||
    req.path.endsWith('.js') ||
    req.path.endsWith('.apk')
  ) {
    return next();
  }

  const clientIp = getClientIp(req);
  const settings = loadSettings();

  if (settings.globalMaintenance) {
    return res.status(403).json({
      success: false,
      blocked: true,
      error: 'MANTENIMIENTO_GLOBAL',
      message: settings.maintenanceMessage || 'Servicio temporalmente deshabilitado por el administrador.',
    });
  }

  // 2. Validación de Clave Administrativa X-Admin-Key O Token de Sesión Firmado (H01, H02, H04, P05)
  // [SEC-03] Admin key SOLO via header — nunca desde body (evita que quede en logs de proxies)
  const adminKey = req.headers['x-admin-key'];
  let isAuthorized = false;
  let authUser = null;

  if (isValidAdminKey(adminKey)) {
    isAuthorized = true;
    authUser = { role: 'ADMIN', email: 'admin' };
    req.user = authUser;
  } else {
    const authHeader = req.headers['authorization'] || req.headers['x-session-token'];
    const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : '';
    if (token) {
      const decoded = verifySessionToken(token);
      if (decoded) {
        isAuthorized = true;
        authUser = decoded;
        req.user = decoded;
      }
    }
  }

  // 3. Validación Criptográfica de la Petición y Prevención de Replay Attack (H03)
  const hwid = req.headers['x-device-hwid'] || (req.body && req.body.hwid);
  const timestamp = req.headers['x-req-timestamp'];
  const nonce = req.headers['x-req-nonce'];
  const signature = req.headers['x-req-signature'];
  let isCryptoValid = false;

// Firewall SQL y Anti-Exploits: Inspección profunda de cargas útiles antes de ejecutar consultas
function inspectForSqlThreats(val, keyName = '', reqPath = '') {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' || typeof val === 'boolean') return null;
  if (typeof val === 'object') {
    for (const k of Object.keys(val)) {
      const lowerK = k.toLowerCase();
      if (
        lowerK.includes('password') ||
        lowerK.includes('pass') ||
        lowerK.includes('token') ||
        lowerK.includes('secret') ||
        lowerK.includes('rawbody') ||
        lowerK === 'note' ||
        lowerK === 'notes' ||
        lowerK === 'message' ||
        lowerK === 'changelog' ||
        lowerK === 'announcement'
      ) {
        continue;
      }
      const threat = inspectForSqlThreats(val[k], k, reqPath);
      if (threat) return threat;
    }
    return null;
  }
  if (typeof val === 'string') {
    const str = val.trim();
    // Excluir cadenas de inventario/item hex válidas (ej: 'FFFFFFFF...')
    if (str.length > 50 && /^[0-9A-Fa-f]+$/.test(str)) {
      return null;
    }
    // Si la ruta es instalación autorizada de procedimientos, permitir DDL de procedimientos
    const isProcedureInstall = reqPath === '/api/tools/install-procedures';

    // Patrones de inyección SQL destructivos de alta severidad
    const dangerousPatterns = [
      isProcedureInstall ? /(\b(DROP|TRUNCATE)\s+(TABLE|DATABASE)\b)/i : /(\b(DROP|TRUNCATE|ALTER)\s+(TABLE|DATABASE|TRIGGER|VIEW)\b)/i,
      /(\bEXEC(\s+|\()+(xp_cmdshell|xp_regread|sp_executesql))/i,
      /(\bUNION\s+(ALL\s+)?SELECT\b)/i,
      /(;\s*--)/,
      /(\bWAITFOR\s+DELAY\b)/i,
      /(\bSHUTDOWN\b)/i,
      /('\s*OR\s+'?1'?\s*=\s*'?1)/i,
      /('\s*OR\s+1\s*=\s*1)/i,
      /(;\s*(DROP|TRUNCATE)\b)/i,
      /(\bOR\s+1=1\b)/i,
    ];

    for (const p of dangerousPatterns) {
      if (p.test(str)) {
        return { pattern: p.toString(), matched: str.substring(0, 80), field: keyName };
      }
    }
  }
  return null;
}

  if (hwid && timestamp && nonce && signature) {
    const reqTs = parseInt(timestamp, 10);
    const now = Date.now();

    // Ventana de tiempo estricta (+/- 5 minutos)
    if (isNaN(reqTs) || Math.abs(now - reqTs) > 5 * 60 * 1000) {
      addAuditLog('REPLAY_DETECTED', hwid, clientIp, `Timestamp expirado o inválido en ${req.path}`, 'BLOCKED');
      addSecurityLog('REPLAY_DETECTED', hwid, clientIp, `Timestamp expirado o desfase excesivo en ${req.path}`, { path: req.path, deltaMs: Math.abs(now - reqTs) }, req);
      return res.status(401).json({ success: false, error: 'TIMESTAMP_INVALIDO', message: 'Desfase temporal de solicitud excesivo.' });
    }

    // Replay Cache: Nonce único dentro de la ventana de 10 min
    if (replayNonceCache.has(nonce)) {
      addAuditLog('REPLAY_DETECTED', hwid, clientIp, `Nonce duplicado (Replay Attack) en ${req.path}`, 'BLOCKED');
      addSecurityLog('REPLAY_DETECTED', hwid, clientIp, `Intento de Replay Attack (Nonce duplicado: ${nonce}) en ${req.path}`, { path: req.path, nonce }, req);
      return res.status(401).json({ success: false, error: 'REPLAY_ATTACK', message: 'Petición rechazada: intento de repetición detectado.' });
    }
    replayNonceCache.set(nonce, reqTs);

    // Verificación de Firma Criptográfica
    const bodyStr = req.rawBody !== undefined ? req.rawBody : (req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : '');
    const bodyHash = sha256(bodyStr).substring(0, 16);
    const expectedSig = sha256(`${hwid}:${timestamp}:${nonce}:${bodyHash}:${MASTER_SECURITY_SALT}`).toUpperCase();

    if (signature.toUpperCase() === expectedSig) {
      isCryptoValid = true;
      // Seguridad L02: La firma criptográfica valida integridad y anti-replay, pero no otorga sesión ni autorización por sí sola
    } else {
      addAuditLog('SIG_MISMATCH', hwid, clientIp, `Firma criptográfica inválida en ${req.path}`, 'BLOCKED');
      addSecurityLog('SIG_MISMATCH', hwid, clientIp, `Firma criptográfica alterada o inválida en ${req.path}`, { path: req.path, signature }, req);
      return res.status(401).json({ success: false, error: 'FIRMA_INVALIDA', message: 'Firma de solicitud inválida o manipulada.' });
    }
  }

  // Si no está autorizado por Admin-Key o Token de sesión firmado -> DENEGAR POR DEFECTO (H01, L02)
  if (!isAuthorized) {
    addAuditLog('AUTH_DENIED', 'ANONYMOUS', clientIp, `Acceso denegado a ruta no autenticada: ${req.path}`, 'DENIED');
    return res.status(401).json({
      success: false,
      error: 'NO_AUTORIZADO',
      message: 'Acceso denegado. Se requiere autenticación válida mediante token de sesión firmado o clave administrativa.'
    });
  }

  // 3.5 Control de versión mínima requerida: Solicitar actualización sin bloquear el dispositivo
  const isAdmin = authUser && authUser.role === 'ADMIN';
  const clientAppVer = req.headers['x-app-version'] || (req.body && req.body.appVersion) || (isAdmin ? '1.5.4' : '1.0.0');
  if (!isAdmin && settings.minRequiredVersion && isOlderThanMin(clientAppVer, settings.minRequiredVersion)) {
    if (!req.path.startsWith('/api/telemetry')) {
      addAuditLog('UPDATE_REQUIRED', hwid || 'ANONYMOUS', clientIp, `Acceso pausado por versión desactualizada v${clientAppVer} (requerida: v${settings.minRequiredVersion}). Se solicita actualizar.`);
      return res.status(426).json({
        success: false,
        blocked: false,
        updateRequired: true,
        error: 'ACTUALIZACION_REQUERIDA',
        minRequiredVersion: settings.minRequiredVersion,
        message: `Hay una nueva versión obligatoria disponible (v${settings.minRequiredVersion}). Por favor actualiza la aplicación para continuar.`
      });
    }
  }

  // 4. Kill-Switch y validación de estado del dispositivo si hay HWID
  if (hwid) {
    const devices = loadDevices();
    const tombstones = loadTombstones();
    const dev = devices[hwid];

    // Verificar tombstone del HWID (revocado permanentemente)
    const isHwidTombstoned = !!(tombstones[hwid] && typeof tombstones[hwid] === 'object' && tombstones[hwid].blocked !== false);

    if (isHwidTombstoned) {
      addAuditLog('SQL_BLOCKED', hwid, clientIp, 'Acceso bloqueado: dispositivo revocado permanentemente (tombstone)', 'BLOCKED');
      return res.status(403).json({
        success: false,
        blocked: true,
        forceWipeKey: true,
        error: 'DISPOSITIVO_REVOCADO',
        message: 'Este dispositivo ha sido revocado permanentemente por el administrador.',
      });
    }

    if (dev) {
      if (dev.expiresAt && new Date(dev.expiresAt) < new Date() && !dev.blocked) {
        dev.blocked = true;
        dev.blockReason = 'Período de prueba finalizado.';
        saveDevices(devices);
      }
      if (dev.blocked) {
        addAuditLog('SQL_BLOCKED', hwid, clientIp, `Acceso bloqueado: ${dev.blockReason || 'Dispositivo revocado'}`, 'BLOCKED');
        return res.status(403).json({
          success: false,
          blocked: true,
          error: 'ACCESO_REVOCADO',
          message: dev.blockReason || 'Tu acceso a Mu Manager PRO ha sido revocado.',
        });
      }

    }
  }

  // 4.2 Verificación Autoritativa Server-Side de Licencia PRO y Rol de Administrador
  const isProtectedDataRoute =
    req.path.startsWith('/api/tools') ||
    req.path.startsWith('/api/mu') ||
    req.path.startsWith('/api/accounts') ||
    req.path.startsWith('/api/account/') ||
    req.path.startsWith('/api/items') ||
    req.path.startsWith('/api/character') ||
    req.path.startsWith('/api/warehouse') ||
    req.path.startsWith('/api/guilds') ||
    req.path.startsWith('/api/pk') ||
    req.path.startsWith('/api/players') ||
    req.path.startsWith('/api/kit') ||
    req.path.startsWith('/api/prizes') ||
    req.path.startsWith('/api/gm') ||
    req.path.startsWith('/api/ip');

  if (isProtectedDataRoute && !isAdmin && !req.path.startsWith('/api/admin')) {
    const devices = loadDevices();
    let dev = hwid ? devices[hwid] : null;

    // Auto-reconciliación: si el dispositivo tiene clave válida no revocada, asegurar modo PRO
    if (dev && dev.mode !== 'PRO' && !dev.forceDemo && !dev.blocked) {
      const devKey = (dev.licenseKey || dev.generatedKey || '').trim().toUpperCase();
      if (devKey && verifyKey(hwid, devKey)) {
        dev.mode = 'PRO';
        saveDevices(devices);
      }
    }

    const isPro = dev && dev.mode === 'PRO' && !dev.forceDemo && !dev.blocked &&
      (!dev.expiresAt || new Date(dev.expiresAt).getTime() > Date.now());

    const isDemoActive = dev && dev.mode === 'DEMO' && !dev.forceDemo && !dev.blocked &&
      (!dev.expiresAt || new Date(dev.expiresAt).getTime() > Date.now());

    // Rutas exclusivas para PRO / ADMIN (herramientas de sistema, GM, control IP, premios)
    const isProExclusiveRoute =
      req.path.startsWith('/api/tools') ||
      req.path.startsWith('/api/gm') ||
      req.path.startsWith('/api/ip') ||
      req.path.startsWith('/api/prizes');

    if (!isPro) {
      // Si el dispositivo está en período de prueba (DEMO de 72h) activo y la ruta no es exclusiva PRO:
      if (isDemoActive && !isProExclusiveRoute) {
        // Permitir acceso durante el período de prueba (cuentas, personajes, items, almacén, etc.)
      } else {
        const isExpiredDemo = dev && dev.mode === 'DEMO' && dev.expiresAt && new Date(dev.expiresAt).getTime() <= Date.now();
        addAuditLog('SQL_BLOCKED', hwid || 'ANONYMOUS', clientIp, `Acceso denegado a ruta de datos (${req.path}): ${isExpiredDemo ? 'DEMO expirado' : 'licencia requerida'}`, 'BLOCKED');
        return res.status(403).json({
          success: false,
          blocked: !!(dev && dev.blocked),
          forceWipeKey: !!(dev && dev.forceDemo),
          authoritativeMode: 'DEMO',
          error: isExpiredDemo ? 'DEMO_EXPIRADO' : 'LICENCIA_REQUERIDA',
          message: isExpiredDemo
            ? 'Tu período de prueba de 72 horas ha finalizado. Adquiere una licencia PRO para continuar.'
            : isProExclusiveRoute
              ? 'Esta función avanzada requiere una licencia PRO activa.'
              : 'Esta operación requiere un dispositivo con licencia PRO activa o período de prueba válido.',
        });
      }
    }
  }

  // 4.3 Rutas estrictamente administrativas que requieren rol ADMIN explícito
  const isStrictAdminRoute =
    req.path.startsWith('/api/tools/db-backup') ||
    req.path.startsWith('/api/tools/install-procedures') ||
    req.path.startsWith('/api/admin/migrate-schema') ||
    req.path.startsWith('/api/gm/set-level') ||
    req.path.startsWith('/api/ip/ban-by-ip') ||
    req.path.startsWith('/api/ip/disconnect-by-ip') ||
    req.path.startsWith('/api/ip/enforce-limit') ||
    req.path.startsWith('/api/guilds/delete');

  if (isStrictAdminRoute && !isAdmin) {
    addAuditLog('AUTH_DENIED', hwid || 'ANONYMOUS', clientIp, `Acceso denegado a función administrativa crítica: ${req.path}`, 'DENIED');
    return res.status(403).json({
      success: false,
      error: 'ACCESO_DENEGADO',
      message: 'Esta operación requiere privilegios de Administrador (ADMIN).'
    });
  }

  // 4.5 Firewall SQL: Inspección profunda de seguridad de payloads entrantes antes de tocar la base de datos
  const sqlThreat = inspectForSqlThreats(req.body, '', req.path);
  if (sqlThreat) {
    const threatMsg = `Intento de inyección SQL bloqueado en campo '${sqlThreat.field}': ${sqlThreat.matched}`;
    addAuditLog('SQL_EXPLOIT_ATTEMPT', hwid || 'ANONYMOUS', clientIp, threatMsg, 'BLOCKED');
    addSecurityLog('SQL_EXPLOIT_ATTEMPT', hwid || 'ANONYMOUS', clientIp, threatMsg, {
      path: req.path,
      field: sqlThreat.field,
      matched: sqlThreat.matched,
      pattern: sqlThreat.pattern
    }, req);

    if (hwid) {
      const devices = loadDevices();
      if (devices[hwid]) {
        devices[hwid].blocked = true;
        devices[hwid].blockReason = `Auto-bloqueo: Inyección SQL detectada (${sqlThreat.field})`;
        saveDevices(devices);
      }
    }

    sendWhatsAppAlert('tamper', 'ATAQUE SQL BLOQUEADO', threatMsg, hwid, clientIp);

    return res.status(403).json({
      success: false,
      blocked: true,
      error: 'SQL_FIREWALL_BLOCK',
      message: 'Operación denegada: Patrón malicioso o intento de inyección SQL detectado y bloqueado.'
    });
  }

  addAuditLog('SQL_REQUEST', hwid || (authUser ? authUser.email : 'ADMIN'), clientIp, `Consulta autorizada: ${req.path}`);
  next();
});

console.log('----------------------------------------------------');
console.log('  MU MANAGER PRO - PUENTE SQL SERVER & TELEMETRÍA');
console.log('----------------------------------------------------');

function sha256(ascii) {
  function rightRotate(value, amount) {
    return (value >>> amount) | (value << (32 - amount));
  }
  const maxWord = Math.pow(2, 32);
  let result = '';
  const words = [];
  const asciiBitLength = ascii.length * 8;
  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  let compositeClear = '\x80';
  while ((ascii.length + compositeClear.length) % 64 !== 56) {
    compositeClear += '\x00';
  }
  ascii += compositeClear;
  for (let i = 0; i < ascii.length; i++) {
    const j = ascii.charCodeAt(i);
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;
  for (let j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = i < 16 ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const temp2 = (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj;
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (let i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (let i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

function generateKey(hwid, plan = 'PRO') {
  // Clave canónica matemática idéntica a keygen.js y a la verificación del APK móvil
  // Formato: MUMANAGER-{plan}-{sig1}-{sig2}-{sig3}
  const cleanHwid = String(hwid || '').trim().toUpperCase();
  const cleanPlan = String(plan || 'PRO').trim().toUpperCase();
  const signatureRaw = crypto.createHash('sha256')
    .update(`${cleanHwid}:${cleanPlan}:${MASTER_SECURITY_SALT}`)
    .digest('hex')
    .toUpperCase();

  const p1 = signatureRaw.substring(0, 4);
  const p2 = signatureRaw.substring(4, 8);
  const p3 = signatureRaw.substring(8, 12);

  return `MUMANAGER-${cleanPlan}-${p1}-${p2}-${p3}`;
}

function verifyKey(hwid, key) {
  if (!hwid || !key || typeof key !== 'string') return false;
  const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '');
  const cleanHwid = hwid.trim().toUpperCase();

  // Verificación 1: Clave canónica matemática (idéntica a keygen.js y al APK móvil)
  const expectedPro = generateKey(cleanHwid, 'PRO');
  if (cleanKey === expectedPro) return true;
  const expectedVip = generateKey(cleanHwid, 'VIP');
  if (cleanKey === expectedVip) return true;

  // Verificación 2: Clave registrada previamente en el servidor (Upstash Redis / devices.json)
  const devices = loadDevices();
  const dev = devices[cleanHwid] || devices[hwid];
  if (dev) {
    const stored = (dev.licenseKey || dev.generatedKey || '').trim().toUpperCase();
    if (stored.length > 0 && cleanKey === stored) return true;
  }

  // Verificación 3 (retrocompatibilidad): validar binding HMAC embebido en claves previas
  // Formato: MUMANAGER-PRO-{rand1}-{rand2}-{hmac4}
  const parts = cleanKey.split('-');
  if (parts.length === 5 && parts[0] === 'MUMANAGER') {
    const rand1 = parts[2];
    const rand2 = parts[3];
    const providedHmac = parts[4];
    const expectedHmac = crypto.createHmac('sha256', MASTER_SECURITY_SALT)
      .update(`${cleanHwid}:${rand1}${rand2}`)
      .digest('hex')
      .substring(0, 4)
      .toUpperCase();
    if (providedHmac === expectedHmac) return true;
  }
  return false;
}

const getDbConfig = (cfg) => ({
  user: cfg.user || 'sa',
  password: cfg.password || '',
  server: cfg.host || 'localhost',
  port: parseInt(cfg.port, 10) || 1433,
  database: cfg.database || 'MuOnline',
  options: {
    encrypt: cfg.encrypt === true || cfg.encrypt === 'true',
    trustServerCertificate: true,
  },
  connectionTimeout: 7000,
  requestTimeout: 15000,
});

function isForbiddenHost(host) {
  if (!host || typeof host !== 'string') return false;
  const h = host.trim().toLowerCase();
  if (
    h === '169.254.169.254' ||
    h.startsWith('169.254.') ||
    h === 'metadata.google.internal' ||
    h === 'instance-data' ||
    h.includes('169.254') ||
    h === 'metadata'
  ) {
    return true;
  }
  return false;
}

// Aislamiento de Conexiones SQL & Pool Singleton Reutilizable (Optimización de Concurrencia)
const sqlPoolsCache = new Map();
const sqlPoolConnectingPromises = new Map();

async function getOrCreatePool(config) {
  const host = config.server || config.host || 'localhost';
  const port = config.port || 1433;
  const poolKey = `${config.user}:${config.password}@${host}:${port}/${config.database}`;

  let pool = sqlPoolsCache.get(poolKey);
  if (pool && pool.connected && !pool.closed) {
    return pool;
  }

  // Si ya hay una promesa de conexión activa para esta clave, esperarla para evitar conexiones duplicadas
  if (sqlPoolConnectingPromises.has(poolKey)) {
    return await sqlPoolConnectingPromises.get(poolKey);
  }

  if (pool) {
    try { if (typeof pool.close === 'function') await pool.close(); } catch (_) {}
    sqlPoolsCache.delete(poolKey);
  }

  const poolOptions = {
    ...config,
    pool: {
      max: 15,
      min: 1,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 10000,
    },
  };

  const connectPromise = (async () => {
    try {
      let p;
      if (typeof sql.ConnectionPool === 'function') {
        p = new sql.ConnectionPool(poolOptions);
        await p.connect();
      } else {
        p = await sql.connect(poolOptions);
      }

      if (p && typeof p.on === 'function') {
        p.on('error', (err) => {
          console.warn('[SQL Pool Warning]', err.message);
          try { if (typeof p.close === 'function') p.close(); } catch (_) {}
          sqlPoolsCache.delete(poolKey);
        });
      }

      sqlPoolsCache.set(poolKey, p);
      return p;
    } finally {
      sqlPoolConnectingPromises.delete(poolKey);
    }
  })();

  sqlPoolConnectingPromises.set(poolKey, connectPromise);
  return await connectPromise;
}

async function executeSql(configInput, callback) {
  const targetHost = (configInput && (configInput.host || configInput.server)) || 'localhost';
  if (isForbiddenHost(targetHost)) {
    throw new Error('HOST_PROHIBIDO: Conexión rechazada por políticas de protección SSRF.');
  }
  const config = getDbConfig(configInput || {});
  if (!sql) throw new Error('mssql package not installed');

  const host = config.server || config.host || 'localhost';
  const port = config.port || 1433;
  const poolKey = `${config.user}:${config.password}@${host}:${port}/${config.database}`;
  let pool;
  try {
    pool = await getOrCreatePool(config);
    return await callback(pool, config);
  } catch (err) {
    // Si la conexión falló o se cortó, invalidar pool en caché para reconectar limpiamente
    if (sqlPoolsCache.has(poolKey)) {
      try {
        const p = sqlPoolsCache.get(poolKey);
        if (p && typeof p.close === 'function') await p.close();
      } catch (_) {}
      sqlPoolsCache.delete(poolKey);
    }
    throw err;
  }
}

// =========================================================================
// SISTEMA DE DESCONEXIÓN INMEDIATA Y BANEOS FORZADOS (RAM GAMESERVER + SQL)
// =========================================================================

// BANEAR PERSONAJE (CtlCode = 1 + DESCONEXIÓN INMEDIATA)
app.post('/api/character/ban', async (req, res) => {
  try {
    const { charName, reason, config } = req.body || {};
    if (!charName) return res.status(400).json({ success: false, error: 'charName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const updated = await executeSql(config, async (pool) => {
      const q = await pool.request()
        .input('Name', sql.VarChar(10), charName.trim())
        .query(`
          -- Banear personaje con CtlCode = 1 (1 = Bloqueado/Baneado)
          UPDATE Character SET CtlCode = 1 
          WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(LTRIM(RTRIM(@Name))) OR Name = @Name;

          DECLARE @RowsUpdated INT = @@ROWCOUNT;

          -- Desconectar forzosamente al jugador si está en línea
          DECLARE @Acc VARCHAR(10);
          SELECT TOP 1 @Acc = AccountID FROM Character 
          WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(LTRIM(RTRIM(@Name))) OR Name = @Name;
          
          IF @Acc IS NOT NULL
          BEGIN
            UPDATE MEMB_STAT SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE()
            WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;

            IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
              UPDATE AccountCharacter SET GameIDC = NULL WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;

            IF OBJECT_ID('WZ_DISCONNECT_MEMB', 'P') IS NOT NULL
              EXEC WZ_DISCONNECT_MEMB @Acc;
          END

          -- Forzar reset de coordenadas para abortar la sesión activa del GameServer
          UPDATE Character 
          SET MapNumber = 0, MapPosX = 125, MapPosY = 125 
          WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(LTRIM(RTRIM(@Name))) OR Name = @Name;

          SELECT @RowsUpdated AS RowsUpdated;
        `);
      return (q.recordset && q.recordset[0] && q.recordset[0].RowsUpdated) || 0;
    });

    if (updated === 0) {
      return res.status(404).json({ success: false, error: "No se encontró el personaje '" + charName + "' en la base de datos." });
    }

    res.json({ success: true, message: "Personaje '" + charName + "' baneado y desconectado con éxito (CtlCode = 1)." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DESBANEAR PERSONAJE (CtlCode = 0)
app.post('/api/character/unban', async (req, res) => {
  try {
    const { charName, config } = req.body || {};
    if (!charName) return res.status(400).json({ success: false, error: 'charName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const updated = await executeSql(config, async (pool) => {
      const q = await pool.request()
        .input('Name', sql.VarChar(10), charName.trim())
        .query(`
          UPDATE Character SET CtlCode = 0 
          WHERE LOWER(LTRIM(RTRIM(Name))) = LOWER(LTRIM(RTRIM(@Name))) OR Name = @Name;
          SELECT @@ROWCOUNT AS RowsUpdated;
        `);
      return (q.recordset && q.recordset[0] && q.recordset[0].RowsUpdated) || 0;
    });

    if (updated === 0) {
      return res.status(404).json({ success: false, error: "No se encontró el personaje '" + charName + "' en la base de datos." });
    }

    res.json({ success: true, message: "Personaje '" + charName + "' desbaneado con éxito (CtlCode = 0)." });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// BANEAR CUENTA (bloc_code = 1 + CtlCode = 1 + DESCONEXIÓN INMEDIATA)
app.post('/api/accounts/ban', async (req, res) => {
  try {
    const { accountId, reason, config } = req.body || {};
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      const check = await pool.request().query(`
        SELECT 
          CASE 
            WHEN OBJECT_ID('MEMB_INFO', 'U') IS NOT NULL THEN 'MEMB_INFO'
            WHEN OBJECT_ID('Me_MuOnline.dbo.MEMB_INFO', 'U') IS NOT NULL THEN 'Me_MuOnline.dbo.MEMB_INFO'
            WHEN OBJECT_ID('MuOnline.dbo.MEMB_INFO', 'U') IS NOT NULL THEN 'MuOnline.dbo.MEMB_INFO'
            ELSE 'MEMB_INFO'
          END AS MembTable;
      `);
      const tbl = (check.recordset && check.recordset[0] && check.recordset[0].MembTable) || 'MEMB_INFO';

      await pool.request()
        .input('Acc', sql.VarChar(10), accountId.trim())
        .query(`
          UPDATE ${tbl} SET bloc_code = 1 WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
          UPDATE Character SET CtlCode = 1 WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
          UPDATE MEMB_STAT SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE() WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
          IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
            UPDATE AccountCharacter SET GameIDC = NULL WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;
          IF OBJECT_ID('WZ_DISCONNECT_MEMB', 'P') IS NOT NULL
            EXEC WZ_DISCONNECT_MEMB @Acc;
        `);
    });

    res.json({ success: true, message: `Cuenta '${accountId}' baneada y desconectada forzosamente con éxito.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DESBANEAR CUENTA (bloc_code = 0 + CtlCode = 0)
app.post('/api/accounts/unban', async (req, res) => {
  try {
    const { accountId, config } = req.body || {};
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      const check = await pool.request().query(`
        SELECT 
          CASE 
            WHEN OBJECT_ID('MEMB_INFO', 'U') IS NOT NULL THEN 'MEMB_INFO'
            WHEN OBJECT_ID('Me_MuOnline.dbo.MEMB_INFO', 'U') IS NOT NULL THEN 'Me_MuOnline.dbo.MEMB_INFO'
            WHEN OBJECT_ID('MuOnline.dbo.MEMB_INFO', 'U') IS NOT NULL THEN 'MuOnline.dbo.MEMB_INFO'
            ELSE 'MEMB_INFO'
          END AS MembTable;
      `);
      const tbl = (check.recordset && check.recordset[0] && check.recordset[0].MembTable) || 'MEMB_INFO';

      await pool.request()
        .input('Acc', sql.VarChar(10), accountId.trim())
        .query(`
          UPDATE ${tbl} SET bloc_code = 0 WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
          UPDATE Character SET CtlCode = 0 WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
        `);
    });

    res.json({ success: true, message: `Cuenta '${accountId}' reactivada y desbaneada con éxito.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/dashboard', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ error: 'mssql package not installed on server' });
    const data = await executeSql(req.body.config, async (pool) => {
      const schemaCheck = await pool.request().query(`
        SELECT 
          OBJECT_ID('MEMB_INFO', 'U') AS HasMembInfo,
          OBJECT_ID('Me_MuOnline.dbo.MEMB_INFO', 'U') AS HasMeMembInfo,
          OBJECT_ID('Character', 'U') AS HasCharacter,
          OBJECT_ID('MEMB_STAT', 'U') AS HasMembStat,
          OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') AS HasMeMembStat,
          OBJECT_ID('Guild', 'U') AS HasGuild,
          COL_LENGTH('MEMB_INFO', 'AccountLevel') AS HasAccLevel,
          COL_LENGTH('Me_MuOnline.dbo.MEMB_INFO', 'AccountLevel') AS HasMeAccLevel;
      `);
      const row = (schemaCheck.recordset && schemaCheck.recordset[0]) || {};
      const membTable = row.HasMembInfo ? 'MEMB_INFO' : (row.HasMeMembInfo ? 'Me_MuOnline.dbo.MEMB_INFO' : null);
      const statTable = row.HasMembStat ? 'MEMB_STAT' : (row.HasMeMembStat ? 'Me_MuOnline.dbo.MEMB_STAT' : null);
      const hasChar = !!row.HasCharacter;
      const hasGuild = !!row.HasGuild;
      const hasVipCol = (row.HasAccLevel !== null && row.HasAccLevel !== undefined) || (row.HasMeAccLevel !== null && row.HasMeAccLevel !== undefined);

      const query = `
        SELECT 
          ${membTable ? `(SELECT COUNT(*) FROM ${membTable})` : '0'} AS Cuentas,
          ${hasChar ? '(SELECT COUNT(*) FROM Character)' : '0'} AS Personajes,
          ${statTable ? `(SELECT COUNT(*) FROM ${statTable} WHERE ConnectStat = 1)` : '0'} AS Online,
          ${(membTable && hasVipCol) ? `(SELECT COUNT(*) FROM ${membTable} WHERE AccountLevel > 0)` : '0'} AS VIP,
          ${hasGuild ? '(SELECT COUNT(*) FROM Guild)' : '0'} AS Guilds;
      `;
      const result = await pool.request().query(query);
      return result.recordset[0] || { Cuentas: 0, Personajes: 0, Online: 0, VIP: 0, Guilds: 0 };
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/characters', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    const { accountId, config } = req.body;
    const data = await executeSql(config || req.body.config, async (pool) => {
      const colsRes = await pool.request().query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');");
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));
      if (charCols.size === 0) return [];

      const hasMr = charCols.has('masterresetcount');
      const hasMapNum = charCols.has('mapnumber');
      const hasMapPosX = charCols.has('mapposx');
      const hasMapPosY = charCols.has('mapposy');
      const hasPkCount = charCols.has('pkcount');
      const hasPkLevel = charCols.has('pklevel');
      const hasCtlCode = charCols.has('ctlcode');
      // Soporte MSPro y Louis: Ruud, RuudToken, ruudtoken, ExtRuud
      const ruudColName = Array.from(charCols).find(col => col.includes('ruud') || col === 'ruudtoken' || col === 'wcoinr' || col === 'coinr');
      const hasRuud = !!ruudColName;
      const ruudCol = ruudColName ? `c.[${ruudColName}]` : 'c.Ruud';
      const resetExpr = charCols.has('resetcount') ? 'ISNULL(c.ResetCount, 0)' : (charCols.has('resets') ? 'ISNULL(c.Resets, 0)' : '0');
      const moneyExpr = charCols.has('money') ? 'ISNULL(c.Money, 0)' : '0';

      const statCheck = await pool.request().query(`
        SELECT 
          OBJECT_ID('MEMB_STAT', 'U') AS HasMembStat,
          OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') AS HasMeMembStat,
          OBJECT_ID('GuildMember', 'U') AS HasGuildMember,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken'))) AS AcRuudCol,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'wcoinr'))) AS CsRuudCol,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken'))) AS MembRuudCol;
      `);
      const statRow = (statCheck.recordset && statCheck.recordset[0]) || {};
      const statTable = statRow.HasMembStat ? 'MEMB_STAT' : (statRow.HasMeMembStat ? 'Me_MuOnline.dbo.MEMB_STAT' : null);
      const hasGm = !!statRow.HasGuildMember;
      const acRuudCol = statRow.AcRuudCol;
      const csRuudCol = statRow.CsRuudCol;
      const membRuudCol = statRow.MembRuudCol;

      let ruudExpr = '0';
      if (hasRuud) {
        ruudExpr = `ISNULL(${ruudCol}, 0)`;
      } else if (acRuudCol) {
        ruudExpr = `ISNULL((SELECT TOP 1 ac.[${acRuudCol}] FROM AccountCharacter ac WHERE LTRIM(RTRIM(ac.Id)) = LTRIM(RTRIM(c.AccountID)) OR ac.Id = c.AccountID), 0)`;
      } else if (csRuudCol) {
        ruudExpr = `ISNULL((SELECT TOP 1 cs.[${csRuudCol}] FROM CashShopData cs WHERE LTRIM(RTRIM(cs.AccountID)) = LTRIM(RTRIM(c.AccountID)) OR cs.AccountID = c.AccountID), 0)`;
      } else if (membRuudCol) {
        ruudExpr = `ISNULL((SELECT TOP 1 m.[${membRuudCol}] FROM MEMB_INFO m WHERE LTRIM(RTRIM(m.memb___id)) = LTRIM(RTRIM(c.AccountID)) OR m.memb___id = c.AccountID), 0)`;
      }

      const q = pool.request();
      let queryStr = `
        SELECT 
          c.Name, 
          ISNULL(c.cLevel, 1) AS cLevel, 
          ISNULL(c.Class, 0) AS Class, 
          ${resetExpr} AS ResetCount, 
          ${moneyExpr} AS Money, 
          ${ruudExpr} AS Ruud,
          c.AccountID,
          ${hasMr ? 'ISNULL(c.MasterResetCount, 0)' : '0'} AS MasterResetCount,
          ${hasMapNum ? 'ISNULL(c.MapNumber, 0)' : '0'} AS MapNumber,
          ${hasMapPosX ? 'ISNULL(c.MapPosX, 125)' : '125'} AS MapPosX,
          ${hasMapPosY ? 'ISNULL(c.MapPosY, 125)' : '125'} AS MapPosY,
          ${hasPkCount ? 'ISNULL(c.PkCount, 0)' : '0'} AS PkCount,
          ${hasPkLevel ? 'ISNULL(c.PkLevel, 3)' : '3'} AS PkLevel,
          ${hasCtlCode ? 'ISNULL(c.CtlCode, 0)' : '0'} AS CtlCode,
          ${statTable ? 'ISNULL(m.ConnectStat, 0)' : '0'} AS ConnectStat,
          ${hasGm ? "ISNULL((SELECT TOP 1 G_Name FROM GuildMember WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(c.Name)) OR Name = c.Name), '')" : "''"} AS GuildName
        FROM Character c
        ${statTable ? `LEFT JOIN ${statTable} m ON (LTRIM(RTRIM(m.memb___id)) = LTRIM(RTRIM(c.AccountID)) OR m.memb___id = c.AccountID)` : ''}
      `;
      if (accountId && typeof accountId === 'string' && accountId.trim().length > 0) {
        q.input('Acc', sql.VarChar, accountId.trim());
        queryStr += ' WHERE LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(@Acc)) OR c.AccountID = @Acc';
      }
      queryStr += ' ORDER BY c.cLevel DESC;';
      const result = await q.query(queryStr);
      return result.recordset || [];
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para Creación de Personaje en Cuenta (Season 6 Louis Update 40/50)
app.post('/api/character/create', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql package not installed' });
    const { accountId, name, classId, level, resets, points, zen, config } = req.body;

    if (!accountId || typeof accountId !== 'string' || !accountId.trim()) {
      return res.status(400).json({ success: false, error: 'Debe especificar el AccountID de la cuenta.' });
    }
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Debe especificar el nombre del personaje.' });
    }

    const cleanAccountId = accountId.trim();
    const cleanName = name.trim();

    if (cleanName.length < 3 || cleanName.length > 10) {
      return res.status(400).json({ success: false, error: 'El nombre del personaje debe tener entre 3 y 10 caracteres.' });
    }

    if (!/^[A-Za-z0-9_]+$/.test(cleanName)) {
      return res.status(400).json({ success: false, error: 'El nombre del personaje solo puede contener letras, números y guión bajo.' });
    }

    const cleanClass = parseInt(classId, 10);
    if (isNaN(cleanClass)) {
      return res.status(400).json({ success: false, error: 'Debe seleccionar una clase válida.' });
    }

    const cleanLevel = Math.max(1, Math.min(400, parseInt(level, 10) || 1));
    const cleanResets = Math.max(0, parseInt(resets, 10) || 0);
    const cleanPoints = Math.max(0, parseInt(points, 10) || 0);
    const cleanZen = Math.max(0, parseInt(zen, 10) || 0);

    // Definición de atributos base según clase Mu Online S6
    let str = 18, agi = 18, vit = 15, ene = 30, cmd = 0;
    let life = 60, mana = 60;
    let map = 0, x = 143, y = 134;

    if (cleanClass >= 16 && cleanClass <= 19) {
      // Dark Knight / Blade Knight / Blade Master
      str = 28; agi = 20; vit = 25; ene = 10; cmd = 0;
      life = 110; mana = 20;
      map = 0; x = 143; y = 134;
    } else if (cleanClass >= 32 && cleanClass <= 35) {
      // Fairy Elf / Muse Elf / High Elf
      str = 22; agi = 25; vit = 20; ene = 15; cmd = 0;
      life = 80; mana = 30;
      map = 3; x = 175; y = 112;
    } else if (cleanClass >= 48 && cleanClass <= 50) {
      // Magic Gladiator / Duel Master
      str = 26; agi = 26; vit = 26; ene = 26; cmd = 0;
      life = 110; mana = 60;
      map = 0; x = 143; y = 134;
    } else if (cleanClass >= 64 && cleanClass <= 66) {
      // Dark Lord / Lord Emperor
      str = 26; agi = 20; vit = 20; ene = 15; cmd = 25;
      life = 90; mana = 40;
      map = 0; x = 143; y = 134;
    } else if (cleanClass >= 80 && cleanClass <= 83) {
      // Summoner / Bloody Summoner / Dimension Master
      str = 21; agi = 21; vit = 18; ene = 23; cmd = 0;
      life = 70; mana = 40;
      map = 51; x = 51; y = 225;
    } else if (cleanClass >= 96 && cleanClass <= 98) {
      // Rage Fighter / Fist Master
      str = 32; agi = 27; vit = 25; ene = 20; cmd = 0;
      life = 100; mana = 40;
      map = 0; x = 143; y = 134;
    }

    // Buffer de inventario vacío: 3776 bytes de 0xFF (7552 caracteres 'F')
    const emptyInventoryHex = 'F'.repeat(7552);

    await executeSql(config || req.body.config, async (pool) => {
      // 1. Verificar si la cuenta existe en MEMB_INFO
      const chkAccount = await pool.request()
        .input('Acc', sql.VarChar, cleanAccountId)
        .query('SELECT memb___id FROM MEMB_INFO WHERE memb___id = @Acc');
      if (!chkAccount.recordset || chkAccount.recordset.length === 0) {
        throw new Error(`La cuenta '${cleanAccountId}' no existe en MEMB_INFO.`);
      }

      // 2. Verificar si el nombre del personaje ya existe
      const chkChar = await pool.request()
        .input('Name', sql.VarChar, cleanName)
        .query('SELECT Name FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name');
      if (chkChar.recordset && chkChar.recordset.length > 0) {
        throw new Error(`El nombre de personaje '${cleanName}' ya está en uso.`);
      }

      // 3. Verificar / Crear registro en AccountCharacter y buscar slot libre
      const hasAccCharTable = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AccountCharacter';
      `);
      let targetSlot = 1;
      if (hasAccCharTable.recordset && hasAccCharTable.recordset.length > 0) {
        const accCharRes = await pool.request()
          .input('Acc', sql.VarChar, cleanAccountId)
          .query(`
            IF NOT EXISTS (SELECT 1 FROM AccountCharacter WHERE Id = @Acc)
              INSERT INTO AccountCharacter (Id) VALUES (@Acc);
            SELECT GameID1, GameID2, GameID3, GameID4, GameID5 FROM AccountCharacter WHERE Id = @Acc;
          `);
        const row = accCharRes.recordset && accCharRes.recordset[0];
        if (row) {
          if (!row.GameID1 || row.GameID1.trim() === '') targetSlot = 1;
          else if (!row.GameID2 || row.GameID2.trim() === '') targetSlot = 2;
          else if (!row.GameID3 || row.GameID3.trim() === '') targetSlot = 3;
          else if (!row.GameID4 || row.GameID4.trim() === '') targetSlot = 4;
          else if (!row.GameID5 || row.GameID5.trim() === '') targetSlot = 5;
          else {
            throw new Error(`La cuenta '${cleanAccountId}' ya tiene el máximo permitido de 5 personajes.`);
          }
        }
      }

      // 4. Detectar columnas dinámicas de la tabla Character
      const colsRes = await pool.request().query(`
        SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');
      `);
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));

      const insertCols = ['AccountID', 'Name', 'cLevel', 'LevelUpPoint', 'Class', 'Strength', 'Dexterity', 'Vitality', 'Energy', 'Money', 'Life', 'MaxLife', 'Mana', 'MaxMana', 'MapNumber', 'MapPosX', 'MapPosY', 'MapDir', 'PkCount', 'PkLevel', 'PkTime'];
      const insertVals = ['@Acc', '@Name', '@cLevel', '@LevelUpPoint', '@Class', '@Strength', '@Dexterity', '@Vitality', '@Energy', '@Money', '@Life', '@MaxLife', '@Mana', '@MaxMana', '@MapNumber', '@MapPosX', '@MapPosY', '0', '0', '3', '0'];

      const q = pool.request()
        .input('Acc', sql.VarChar, cleanAccountId)
        .input('Name', sql.VarChar, cleanName)
        .input('cLevel', sql.SmallInt, cleanLevel)
        .input('LevelUpPoint', sql.Int, cleanPoints)
        .input('Class', sql.TinyInt, cleanClass)
        .input('Strength', sql.SmallInt, str)
        .input('Dexterity', sql.SmallInt, agi)
        .input('Vitality', sql.SmallInt, vit)
        .input('Energy', sql.SmallInt, ene)
        .input('Money', sql.BigInt, cleanZen)
        .input('Life', sql.Real, life)
        .input('MaxLife', sql.Real, life)
        .input('Mana', sql.Real, mana)
        .input('MaxMana', sql.Real, mana)
        .input('MapNumber', sql.SmallInt, map)
        .input('MapPosX', sql.SmallInt, x)
        .input('MapPosY', sql.SmallInt, y);

      if (charCols.has('leadership')) {
        insertCols.push('Leadership');
        insertVals.push('@Leadership');
        q.input('Leadership', sql.SmallInt, cmd);
      }
      if (charCols.has('resetcount')) {
        insertCols.push('ResetCount');
        insertVals.push('@ResetCount');
        q.input('ResetCount', sql.Int, cleanResets);
      } else if (charCols.has('resets')) {
        insertCols.push('Resets');
        insertVals.push('@Resets');
        q.input('Resets', sql.Int, cleanResets);
      }
      if (charCols.has('ctlcode')) {
        insertCols.push('CtlCode');
        insertVals.push('0');
      }
      if (charCols.has('inventory')) {
        insertCols.push('Inventory');
        insertVals.push('CONVERT(VARBINARY(MAX), @EmptyInv, 2)');
        q.input('EmptyInv', sql.VarChar, emptyInventoryHex);
      }
      if (charCols.has('experience')) {
        insertCols.push('Experience');
        insertVals.push('0');
      }

      await q.query(`
        INSERT INTO Character (${insertCols.join(', ')})
        VALUES (${insertVals.join(', ')});
      `);

      // 5. Actualizar slot en AccountCharacter
      if (hasAccCharTable.recordset && hasAccCharTable.recordset.length > 0) {
        await pool.request()
          .input('Acc', sql.VarChar, cleanAccountId)
          .input('Name', sql.VarChar, cleanName)
          .query(`
            UPDATE AccountCharacter 
            SET GameID${targetSlot} = @Name,
                GameIDC = ISNULL(GameIDC, @Name)
            WHERE Id = @Acc;
          `);
      }

      // 6. Si es clase 3ra (Master), inicializar MasterSkillTree si la tabla existe
      const isTier3 = (cleanClass === 2 || cleanClass === 3 || cleanClass === 18 || cleanClass === 19 || cleanClass === 34 || cleanClass === 35 || cleanClass === 49 || cleanClass === 50 || cleanClass === 65 || cleanClass === 66 || cleanClass === 82 || cleanClass === 83 || cleanClass === 97 || cleanClass === 98);
      if (isTier3) {
        const hasMst = await pool.request().query(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MasterSkillTree';
        `);
        if (hasMst.recordset && hasMst.recordset.length > 0) {
          await pool.request()
            .input('Name', sql.VarChar, cleanName)
            .query(`
              IF NOT EXISTS (SELECT 1 FROM MasterSkillTree WHERE Name = @Name)
                INSERT INTO MasterSkillTree (Name, MasterLevel, MasterPoint, MasterExperience)
                VALUES (@Name, 1, 0, 0);
            `);
        }
      }
    });

    res.json({
      success: true,
      message: `Personaje '${cleanName}' creado exitosamente para la cuenta '${cleanAccountId}'.`,
      character: {
        Name: cleanName,
        AccountID: cleanAccountId,
        Class: cleanClass,
        cLevel: cleanLevel,
        ResetCount: cleanResets,
        Money: cleanZen,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// BUG-04: Definir update-stats, update-inventory y update-location ANTES de :name
app.post('/api/character/update-stats', async (req, res) => {
  try {
    const { charName, params, config } = req.body;
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    if (!charName || !params) return res.status(400).json({ success: false, error: 'Datos de personaje incompletos' });

    // Hallazgo 14: Validar estadísticas y no permitir negativos
    const cleanStr = Math.max(0, parseInt(params.STR, 10) || 0);
    const cleanAgi = Math.max(0, parseInt(params.AGI, 10) || 0);
    const cleanVit = Math.max(0, parseInt(params.VIT, 10) || 0);
    const cleanEne = Math.max(0, parseInt(params.ENE, 10) || 0);
    const cleanCmd = Math.max(0, parseInt(params.CMD, 10) || 0);
    const cleanZen = Math.max(0, parseInt(params.Zen, 10) || 0);
    const cleanPoints = Math.max(0, parseInt(params.Points, 10) || 0);

    // Diferenciar explícitamente 0 de ausencia de valor
    const cleanLevel = (params.Level !== undefined && params.Level !== null) ? Math.max(0, parseInt(params.Level, 10) || 0) : null;
    const cleanMLevel = (params.MasterLevel !== undefined && params.MasterLevel !== null) ? Math.max(0, parseInt(params.MasterLevel, 10) || 0) : null;
    const cleanMPoints = (params.MasterPoint !== undefined && params.MasterPoint !== null) ? Math.max(0, parseInt(params.MasterPoint, 10) || 0) : null;
    const cleanFruit = (params.FruitPoint !== undefined && params.FruitPoint !== null) ? Math.max(0, parseInt(params.FruitPoint, 10) || 0) : null;
    const cleanCtlCode = params.CtlCode !== undefined && params.CtlCode !== null ? parseInt(params.CtlCode, 10) : null;
    const cleanRuud = (params.Ruud !== undefined && params.Ruud !== null)
      ? Math.max(0, parseInt(params.Ruud, 10) || 0)
      : (params.ruud !== undefined && params.ruud !== null ? Math.max(0, parseInt(params.ruud, 10) || 0) : null);

    const result = await executeSql(config, async (pool) => {
      const q = pool.request()
        .input('CharName', sql.VarChar, charName)
        .input('STR', sql.Int, cleanStr)
        .input('AGI', sql.Int, cleanAgi)
        .input('VIT', sql.Int, cleanVit)
        .input('ENE', sql.Int, cleanEne)
        .input('CMD', sql.Int, cleanCmd)
        .input('Zen', sql.BigInt, cleanZen)
        .input('Points', sql.Int, cleanPoints)
        .input('Level', sql.Int, cleanLevel)
        .input('MasterLevel', sql.Int, cleanMLevel)
        .input('MasterPoint', sql.Int, cleanMPoints)
        .input('FruitPoint', sql.Int, cleanFruit);

      if (cleanRuud !== null) {
        q.input('Ruud', sql.Int, cleanRuud);
      }

      let ctlQueryPart = '';
      if (cleanCtlCode !== null) {
        q.input('CtlCode', sql.SmallInt, cleanCtlCode);
        ctlQueryPart = ', CtlCode = @CtlCode';
      }

      return await q.query(`
        IF NOT EXISTS (SELECT 1 FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName)
        BEGIN
          SELECT 0 AS CharacterFound;
          RETURN;
        END

        UPDATE Character 
        SET Strength = @STR, Dexterity = @AGI, Vitality = @VIT, Energy = @ENE, 
            Leadership = @CMD, Money = @Zen, LevelUpPoint = @Points,
            cLevel = ISNULL(@Level, cLevel),
            FruitPoint = ISNULL(@FruitPoint, FruitPoint)
            ${ctlQueryPart}
        WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;

        ${cleanRuud !== null ? `
        -- 1. Actualizar Ruud en Character (LOWER y QUOTENAME dinámico para cualquier variante)
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr')))
        BEGIN
          DECLARE @sqlCharStatRuud NVARCHAR(MAX) = (
            SELECT TOP 1 'UPDATE Character SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;'
            FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr'))
          );
          IF @sqlCharStatRuud IS NOT NULL
            EXEC sp_executesql @sqlCharStatRuud, N'@RuudVal INT, @CharName VARCHAR(10)', @RuudVal = @Ruud, @CharName = @CharName;
        END

        -- 2. Actualizar Ruud en AccountCharacter (MSPro) si existe columna
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney')))
        BEGIN
          DECLARE @sqlAcStatRuud NVARCHAR(MAX) = (
            SELECT TOP 1 'UPDATE AccountCharacter SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(Id)) = (SELECT TOP 1 LTRIM(RTRIM(AccountID)) FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName);'
            FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney'))
          );
          IF @sqlAcStatRuud IS NOT NULL
            EXEC sp_executesql @sqlAcStatRuud, N'@RuudVal INT, @CharName VARCHAR(10)', @RuudVal = @Ruud, @CharName = @CharName;
        END

        -- 3. Actualizar Ruud en CashShopData si existe columna
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr')))
        BEGIN
          DECLARE @sqlCsStatRuud NVARCHAR(MAX) = (
            SELECT TOP 1 'UPDATE CashShopData SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(AccountID)) = (SELECT TOP 1 LTRIM(RTRIM(AccountID)) FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName);'
            FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr'))
          );
          IF @sqlCsStatRuud IS NOT NULL
            EXEC sp_executesql @sqlCsStatRuud, N'@RuudVal INT, @CharName VARCHAR(10)', @RuudVal = @Ruud, @CharName = @CharName;
        END

        -- 4. Actualizar Ruud en MEMB_INFO si existe columna
        IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney')))
        BEGIN
          DECLARE @sqlMembStatRuud NVARCHAR(MAX) = (
            SELECT TOP 1 'UPDATE MEMB_INFO SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(memb___id)) = (SELECT TOP 1 LTRIM(RTRIM(AccountID)) FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName);'
            FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney'))
          );
          IF @sqlMembStatRuud IS NOT NULL
            EXEC sp_executesql @sqlMembStatRuud, N'@RuudVal INT, @CharName VARCHAR(10)', @RuudVal = @Ruud, @CharName = @CharName;
        END
        ` : ''}

        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MasterSkillTree')
        BEGIN
          IF EXISTS (SELECT 1 FROM MasterSkillTree WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName)
          BEGIN
            UPDATE MasterSkillTree 
            SET MasterLevel = ISNULL(@MasterLevel, MasterLevel),
                MasterPoint = ISNULL(@MasterPoint, MasterPoint)
            WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;
          END
          ELSE IF (@MasterLevel IS NOT NULL OR @MasterPoint IS NOT NULL)
          BEGIN
            INSERT INTO MasterSkillTree (Name, MasterLevel, MasterPoint, MasterExperience)
            VALUES (@CharName, ISNULL(@MasterLevel, 1), ISNULL(@MasterPoint, 0), 0);
          END
        END

        SELECT 1 AS CharacterFound;
      `);
    });

    if (result.recordset && result.recordset[0] && result.recordset[0].CharacterFound === 0) {
      return res.status(404).json({ success: false, error: 'Personaje no encontrado' });
    }

    res.json({ success: true, message: 'Stats updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/character/update-inventory', async (req, res) => {
  try {
    const { charName, inventoryHex, config } = req.body;
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });

    // H06: Validar que inventoryHex sea un string hexadecimal válido
    if (!inventoryHex || typeof inventoryHex !== 'string' || !/^[0-9A-Fa-f]+$/.test(inventoryHex.trim())) {
      return res.status(400).json({ success: false, error: 'Inventario hexadecimal inválido o vacío' });
    }

    const cleanHex = inventoryHex.trim().toUpperCase();

    // H06: Mínimo 76 slots (equipamiento + 64 slots de inventario base = 2432 hex) y múltiplo estricto de 32 hex (16 bytes por slot)
    if (cleanHex.length < 2432 || cleanHex.length % 32 !== 0) {
      return res.status(400).json({
        success: false,
        error: `Longitud de inventario inválida (${cleanHex.length} caracteres hex). Se requiere alineación exacta de slots de 32 caracteres hexadecimales (mínimo 2432 hex para 76 slots).`
      });
    }

    const result = await executeSql(config, async (pool) => {
      // Auto-expand Character.Inventory si es menor a 3776 bytes
      try {
        await pool.request().query(`
          IF EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Character' AND COLUMN_NAME = 'Inventory' 
              AND CHARACTER_MAXIMUM_LENGTH < 3776 AND CHARACTER_MAXIMUM_LENGTH > 0
          )
          BEGIN
            ALTER TABLE Character ALTER COLUMN Inventory VARBINARY(MAX);
          END
        `);
      } catch (colErr) {
        console.warn('[bridgeServer] Notice: Could not alter Character.Inventory column length:', colErr.message);
      }

      return await pool.request()
        .input('CharName', sql.VarChar, charName.trim())
        .input('InventoryHex', sql.VarChar, cleanHex)
        .query(`
          DECLARE @Acc VARCHAR(20);
          SELECT TOP 1 @Acc = AccountID FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;

          IF @Acc IS NULL
          BEGIN
            SELECT 0 AS CharacterFound, 0 AS IsConnected;
            RETURN;
          END

          -- H06: Bloquear escritura si la cuenta está actualmente conectada en el juego
          IF EXISTS (SELECT 1 FROM MEMB_STAT WHERE (LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc) AND ConnectStat = 1)
          BEGIN
            SELECT 1 AS CharacterFound, 1 AS IsConnected;
            RETURN;
          END

          UPDATE Character 
          SET Inventory = CONVERT(VARBINARY(MAX), @InventoryHex, 2)
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;

          SELECT 1 AS CharacterFound, 0 AS IsConnected;
        `);
    });

    if (result.recordset && result.recordset[0]) {
      if (result.recordset[0].CharacterFound === 0) {
        return res.status(404).json({ success: false, error: 'Personaje no encontrado' });
      }
      if (result.recordset[0].IsConnected === 1) {
        return res.status(409).json({
          success: false,
          error: 'El personaje o su cuenta está actualmente CONECTADO en el servidor. Debe salir del juego antes de modificar el inventario para evitar corrupción de datos.'
        });
      }
    }

    res.json({ success: true, message: 'Inventario actualizado con éxito.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Endpoint para actualizar Habilidades (MagicList) del Personaje (Louis S6)
app.post('/api/character/update-skills', async (req, res) => {
  try {
    const { charName, magicListHex, config } = req.body;
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });

    // Validar formato hexadecimal
    let cleanHex = (magicListHex || '').trim().toUpperCase().replace(/^0X/, '');
    if (!cleanHex || !/^[0-9A-F]+$/i.test(cleanHex)) {
      cleanHex = 'FFFF00'.repeat(60); // 180 bytes vacíos si viene vacío
    }

    // Asegurar tamaño mínimo de 360 hex (180 bytes) rellenando con FFFF00
    if (cleanHex.length < 360) {
      const remainingSlots = Math.max(0, Math.floor((360 - cleanHex.length) / 6));
      cleanHex = cleanHex + 'FFFF00'.repeat(remainingSlots);
    }
    cleanHex = cleanHex.substring(0, 360);

    const result = await executeSql(config, async (pool) => {
      // Auto-expand Character.MagicList si es menor a 180 bytes
      try {
        await pool.request().query(`
          IF EXISTS (
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_NAME = 'Character' AND COLUMN_NAME = 'MagicList' 
              AND CHARACTER_MAXIMUM_LENGTH < 180 AND CHARACTER_MAXIMUM_LENGTH > 0
          )
          BEGIN
            ALTER TABLE Character ALTER COLUMN MagicList VARBINARY(180);
          END
        `);
      } catch (colErr) {
        console.warn('[bridgeServer] Notice: Could not alter Character.MagicList column length:', colErr.message);
      }

      return await pool.request()
        .input('CharName', sql.VarChar, charName.trim())
        .input('MagicListHex', sql.VarChar, cleanHex)
        .query(`
          DECLARE @Acc VARCHAR(20);
          SELECT TOP 1 @Acc = AccountID FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;

          IF @Acc IS NULL
          BEGIN
            SELECT 0 AS CharacterFound, 0 AS IsConnected;
            RETURN;
          END

          -- Bloquear si el personaje o cuenta está actualmente conectado en el juego
          IF EXISTS (SELECT 1 FROM MEMB_STAT WHERE (LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc) AND ConnectStat = 1)
          BEGIN
            SELECT 1 AS CharacterFound, 1 AS IsConnected;
            RETURN;
          END

          UPDATE Character 
          SET MagicList = CONVERT(VARBINARY(180), @MagicListHex, 2)
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;

          SELECT 1 AS CharacterFound, 0 AS IsConnected;
        `);
    });

    if (result.recordset && result.recordset[0]) {
      if (result.recordset[0].CharacterFound === 0) {
        return res.status(404).json({ success: false, error: 'Personaje no encontrado' });
      }
      if (result.recordset[0].IsConnected === 1) {
        return res.status(409).json({
          success: false,
          error: 'El personaje o su cuenta está actualmente CONECTADO en el servidor. Debe salir del juego antes de modificar las habilidades para evitar corrupción de datos.'
        });
      }
    }

    res.json({ success: true, message: 'Habilidades (MagicList) actualizadas con éxito en SQL Server.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// BUG-11: Endpoint para actualizar mapa y coordenadas del personaje
app.post('/api/character/update-location', async (req, res) => {
  try {
    const { charName, map, x, y, config } = req.body;
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });

    const parsedMap = Number.isInteger(Number(map)) ? Number(map) : 0;
    const parsedX = Number.isInteger(Number(x)) ? Number(x) : 125;
    const parsedY = Number.isInteger(Number(y)) ? Number(y) : 125;

    const result = await executeSql(config, async (pool) => {
      const colsRes = await pool.request().query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');");
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));
      const hasMapPosX = charCols.has('mapposx');
      const hasMapX = charCols.has('mapx');
      const hasMapPosY = charCols.has('mapposy');
      const hasMapY = charCols.has('mapy');
      const hasMapDir = charCols.has('mapdir');

      let updateParts = ['MapNumber = @Map'];
      if (hasMapPosX) updateParts.push('MapPosX = @PosX');
      if (hasMapX) updateParts.push('MapX = @PosX');
      if (hasMapPosY) updateParts.push('MapPosY = @PosY');
      if (hasMapY) updateParts.push('MapY = @PosY');
      if (hasMapDir) updateParts.push('MapDir = 0');

      return await pool.request()
        .input('CharName', sql.VarChar(20), charName.trim())
        .input('Map', sql.SmallInt, parsedMap)
        .input('PosX', sql.SmallInt, parsedX)
        .input('PosY', sql.SmallInt, parsedY)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName)
          BEGIN
            SELECT 0 AS CharacterFound;
            RETURN;
          END

          DECLARE @Acc VARCHAR(20);
          SELECT TOP 1 @Acc = AccountID FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;

          UPDATE Character 
          SET ${updateParts.join(', ')}
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;

          -- Desconectar sesión activa para que el GameServer no sobreescriba coordenadas
          IF @Acc IS NOT NULL
          BEGIN
            IF OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
              UPDATE MEMB_STAT SET ConnectStat = 0 WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
            IF OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') IS NOT NULL
              UPDATE Me_MuOnline.dbo.MEMB_STAT SET ConnectStat = 0 WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
            IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
              UPDATE AccountCharacter SET GameIDC = NULL WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;
          END

          SELECT 1 AS CharacterFound;
        `);
    });

    if (result.recordset && result.recordset[0] && result.recordset[0].CharacterFound === 0) {
      return res.status(404).json({ success: false, error: 'Personaje no encontrado' });
    }

    res.json({ success: true, message: `Personaje ${charName} movido a mapa ${parsedMap} (${parsedX}, ${parsedY}) con éxito.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Endpoint para actualizar Progreso del Personaje (Resets, M.Resets, MasterLevel, PK)
app.post('/api/character/update-progress', async (req, res) => {
  try {
    const { charName, resets, masterResets, masterLevel, masterPoints, pkLevel, pkCount, pkTime, config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql package not installed' });
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });

    const cleanResets = (resets !== undefined && resets !== null) ? Math.max(0, parseInt(resets, 10) || 0) : null;
    const cleanMResets = (masterResets !== undefined && masterResets !== null) ? Math.max(0, parseInt(masterResets, 10) || 0) : null;
    const cleanMLevel = (masterLevel !== undefined && masterLevel !== null) ? Math.max(0, parseInt(masterLevel, 10) || 0) : null;
    const cleanMPoints = (masterPoints !== undefined && masterPoints !== null) ? Math.max(0, parseInt(masterPoints, 10) || 0) : null;
    const cleanPkLevel = (pkLevel !== undefined && pkLevel !== null) ? Math.max(1, Math.min(6, parseInt(pkLevel, 10) || 3)) : null;
    const cleanPkCount = (pkCount !== undefined && pkCount !== null) ? Math.max(0, parseInt(pkCount, 10) || 0) : null;
    const cleanPkTime = (pkTime !== undefined && pkTime !== null) ? Math.max(0, parseInt(pkTime, 10) || 0) : null;

    await executeSql(config, async (pool) => {
      const colsRes = await pool.request().query(`
        SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');
      `);
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));

      const hasMst = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MasterSkillTree';
      `);
      const hasMstTable = (hasMst.recordset || []).length > 0;

      const q = pool.request().input('CharName', sql.VarChar, charName.trim());
      const setParts = [];

      if (cleanResets !== null) {
        q.input('Resets', sql.Int, cleanResets);
        if (charCols.has('resetcount')) setParts.push('ResetCount = @Resets');
        if (charCols.has('resets')) setParts.push('Resets = @Resets');
      }

      if (cleanMResets !== null) {
        q.input('MResets', sql.Int, cleanMResets);
        if (charCols.has('masterresetcount')) setParts.push('MasterResetCount = @MResets');
        if (charCols.has('mresetcount')) setParts.push('MResetCount = @MResets');
      }

      if (cleanPkLevel !== null && charCols.has('pklevel')) {
        q.input('PkLevel', sql.Int, cleanPkLevel);
        setParts.push('PkLevel = @PkLevel');
      }

      if (cleanPkCount !== null && charCols.has('pkcount')) {
        q.input('PkCount', sql.Int, cleanPkCount);
        setParts.push('PkCount = @PkCount');
      }

      if (cleanPkTime !== null && charCols.has('pktime')) {
        q.input('PkTime', sql.Int, cleanPkTime);
        setParts.push('PkTime = @PkTime');
      }

      let charSql = '';
      if (setParts.length > 0) {
        charSql = `
          UPDATE Character 
          SET ${setParts.join(', ')} 
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;
        `;
      }

      let mstSql = '';
      if (hasMstTable && (cleanMLevel !== null || cleanMPoints !== null)) {
        q.input('MasterLevel', sql.Int, cleanMLevel !== null ? cleanMLevel : 1);
        q.input('MasterPoint', sql.Int, cleanMPoints !== null ? cleanMPoints : 0);

        const mstUpdates = [];
        if (cleanMLevel !== null) mstUpdates.push('MasterLevel = @MasterLevel');
        if (cleanMPoints !== null) mstUpdates.push('MasterPoint = @MasterPoint');

        mstSql = `
          IF EXISTS (SELECT 1 FROM MasterSkillTree WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName)
          BEGIN
            UPDATE MasterSkillTree 
            SET ${mstUpdates.join(', ')} 
            WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;
          END
          ELSE
          BEGIN
            INSERT INTO MasterSkillTree (Name, MasterLevel, MasterPoint, MasterExperience)
            VALUES (@CharName, ISNULL(@MasterLevel, 1), ISNULL(@MasterPoint, 0), 0);
          END
        `;
      }

      const fullQuery = `${charSql}\n${mstSql}`;
      if (!fullQuery.trim()) {
        throw new Error('El esquema de base de datos no contiene columnas de progreso compatibles.');
      }
      await q.query(fullQuery);
    });

    res.json({ success: true, message: 'Progreso del personaje guardado exitosamente en SQL Server.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint para actualizar Quests, Misiones y Evolución de Clase
app.post('/api/character/update-quest', async (req, res) => {
  try {
    const { charName, classId, marlonCombo, marlonPoints, thirdClassComplete, questHex, config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql package not installed' });
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });

    await executeSql(config, async (pool) => {
      const colsRes = await pool.request().query(`
        SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');
      `);
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));

      const hasMst = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MasterSkillTree';
      `);
      const hasMstTable = (hasMst.recordset || []).length > 0;

      const q = pool.request().input('CharName', sql.VarChar, charName.trim());
      const setParts = [];

      if (classId !== undefined && classId !== null) {
        let cleanClass = parseInt(classId, 10);
        if (!isNaN(cleanClass)) {
          q.input('Class', sql.TinyInt, cleanClass);
          setParts.push('Class = @Class');
        }
      }

      // Preservar misiones existentes; solo actualizar Quest si se solicita explícitamente
      const shouldUpdateQuest = questHex !== undefined || thirdClassComplete !== undefined || marlonCombo !== undefined || marlonPoints !== undefined;

      if (charCols.has('quest') && shouldUpdateQuest) {
        let currentQuestHex = questHex;
        if (!currentQuestHex) {
          const questRead = await pool.request()
            .input('CharName', sql.VarChar, charName.trim())
            .query('SELECT CONVERT(VARCHAR(MAX), Quest, 2) AS QuestHex FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;');
          if (questRead.recordset && questRead.recordset[0] && questRead.recordset[0].QuestHex) {
            currentQuestHex = questRead.recordset[0].QuestHex.toUpperCase();
          }
        }

        const qBytes = Buffer.alloc(50, 0xFF);
        if (currentQuestHex && /^[0-9A-F]+$/i.test(currentQuestHex)) {
          const buf = Buffer.from(currentQuestHex, 'hex');
          buf.copy(qBytes, 0, 0, Math.min(buf.length, 50));
        }

        // Season 6 Quest Format:
        // Byte 0: Quest Sebina 1 (Scroll of Emperor) -> 0xAA / 0x02
        // Byte 1: Quest Sebina 2 (Tear of Elf / Broken Sword / Soul of Wizard) -> 0xAA / 0x02
        // Byte 2: Marlon Quest 1 (Ring of Honor / Glory) -> 0xAA / 0x02
        // Byte 3: Marlon Quest 2 (Dark Stone - Combo Skill) -> 0xAA / 0x02
        // Bytes 4-49 se preservan intactos para no corromper estados del GameServer S6.
        if (thirdClassComplete) {
          qBytes[0] = 0xAA;
          qBytes[1] = 0xAA;
          qBytes[2] = 0xAA;
          if (marlonCombo) {
            qBytes[3] = 0xAA;
          }
        } else {
          if (marlonPoints) {
            qBytes[0] = 0xAA;
            qBytes[1] = 0xAA;
            qBytes[2] = 0xAA;
          }
          if (marlonCombo) {
            qBytes[3] = 0xAA;
          }
        }

        const finalHex = qBytes.toString('hex').toUpperCase();
        q.input('QuestHex', sql.VarChar, finalHex);
        setParts.push('Quest = CONVERT(VARBINARY(50), @QuestHex, 2)');
      }

      let charSql = '';
      if (setParts.length > 0) {
        charSql = `
          UPDATE Character 
          SET ${setParts.join(', ')} 
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;
        `;
      }

      let mstSql = '';
      if (hasMstTable && (thirdClassComplete || [2, 3, 18, 19, 34, 35, 49, 50, 65, 66, 82, 83, 97, 98].includes(parseInt(classId, 10)))) {
        mstSql = `
          IF NOT EXISTS (SELECT 1 FROM MasterSkillTree WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName)
          BEGIN
            INSERT INTO MasterSkillTree (Name, MasterLevel, MasterPoint, MasterExperience)
            VALUES (@CharName, 1, 0, 0);
          END
        `;
      }

      const fullQuery = `${charSql}\n${mstSql}`;
      if (fullQuery.trim()) {
        await q.query(fullQuery);
      }
    });

    res.json({ success: true, message: `Misiones y clase de ${charName} actualizadas exitosamente.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verificar si una cuenta o personaje está conectado en el juego (MEMB_STAT)
app.post('/api/account/status', async (req, res) => {
  try {
    const { username, charName, config } = req.body || {};
    const targetUser = (username || '').trim();
    const targetChar = (charName || '').trim();
    if (!targetUser && !targetChar) return res.status(400).json({ success: false, connected: false });
    if (!sql) return res.status(500).json({ success: false, connected: false, error: 'mssql not installed' });

    const statusData = await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('User', sql.VarChar, targetUser)
        .input('CharName', sql.VarChar, targetChar)
        .query(`
          DECLARE @FoundAcc VARCHAR(20) = @User;
          DECLARE @IsOnline INT = 0;

          -- Si nos pasaron el nombre de personaje y no tenemos AccountID (o para reconfirmar)
          IF (@CharName IS NOT NULL AND LEN(@CharName) > 0)
          BEGIN
            SELECT TOP 1 @FoundAcc = AccountID 
            FROM Character 
            WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;
          END

          -- Verificar ConnectStat en MEMB_STAT para @FoundAcc o @User
          IF OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
          BEGIN
            SELECT TOP 1 @IsOnline = ISNULL(ConnectStat, 0)
            FROM MEMB_STAT 
            WHERE LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@FoundAcc))) 
               OR LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@User)))
               OR memb___id = @FoundAcc
               OR memb___id = @User;
          END
          ELSE IF OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') IS NOT NULL
          BEGIN
            SELECT TOP 1 @IsOnline = ISNULL(ConnectStat, 0)
            FROM Me_MuOnline.dbo.MEMB_STAT 
            WHERE LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@FoundAcc))) 
               OR LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@User)))
               OR memb___id = @FoundAcc
               OR memb___id = @User;
          END

          -- Doble confirmación con AccountCharacter.GameIDC (si ConnectStat quedó desfasado)
          IF @IsOnline = 0 AND OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
          BEGIN
            SELECT TOP 1 @IsOnline = CASE WHEN GameIDC IS NOT NULL AND LEN(LTRIM(RTRIM(GameIDC))) > 0 THEN 1 ELSE 0 END
            FROM AccountCharacter
            WHERE LOWER(LTRIM(RTRIM(Id))) = LOWER(LTRIM(RTRIM(@FoundAcc))) OR Id = @FoundAcc;
          END

          SELECT @IsOnline AS ConnectStat, ISNULL(@FoundAcc, @User) AS AccountID;
        `);
      const row = r.recordset && r.recordset[0];
      return {
        connected: row ? Number(row.ConnectStat) === 1 : false,
        accountId: row ? row.AccountID : targetUser
      };
    });

    res.json({ success: true, connected: !!statusData.connected, accountId: statusData.accountId });
  } catch (e) {
    res.json({ success: true, connected: false });
  }
});

// Desbloquear Mochilas Extendidas y Personal Store del Personaje (Louis S6 Update 40/50)
app.post('/api/character/unlock-extensions', async (req, res) => {
  try {
    const { charName, config } = req.body;
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const cleanName = charName.trim();
    const result = await executeSql(config, async (pool) => {
      return await pool.request()
        .input('Name', sql.VarChar, cleanName)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name)
          BEGIN
            SELECT 0 AS CharacterFound;
            RETURN;
          END

          -- Garantizar que la columna ExtInventory existe en Character (Louis Season 6)
          IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'ExtInventory')
          BEGIN
            BEGIN TRY
              ALTER TABLE Character ADD ExtInventory TINYINT NOT NULL DEFAULT 0;
            END TRY
            BEGIN CATCH END CATCH
          END

          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'ExtInventory')
            EXEC sp_executesql N'UPDATE Character SET ExtInventory = 2 WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@N)) OR Name = @N', N'@N VARCHAR(20)', @N=@Name;

          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'InventoryExpansion')
            EXEC sp_executesql N'UPDATE Character SET InventoryExpansion = 2 WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@N)) OR Name = @N', N'@N VARCHAR(20)', @N=@Name;

          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'ExtendedInventory')
            EXEC sp_executesql N'UPDATE Character SET ExtendedInventory = 2 WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@N)) OR Name = @N', N'@N VARCHAR(20)', @N=@Name;

          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'PShopOpen')
            EXEC sp_executesql N'UPDATE Character SET PShopOpen = 0 WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@N)) OR Name = @N', N'@N VARCHAR(20)', @N=@Name;

          SELECT 1 AS CharacterFound;
        `);
    });

    if (result.recordset && result.recordset[0] && result.recordset[0].CharacterFound === 0) {
      return res.status(404).json({ success: false, error: `Personaje "${cleanName}" no existe en la base de datos.` });
    }

    res.json({ success: true, message: `Mochilas mágicas (Ext 1 y 2) y Tienda Personal desbloqueadas exitosamente para ${cleanName}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ACCIONES ESPECÍFICAS DE PERSONAJE (DECLARED BEFORE WILDCARD :name)
// ==========================================

// 0.2 ACREDITAR ZEN A PERSONAJE
app.post('/api/character/add-zen', async (req, res) => {
  try {
    const { charName, amount, config } = req.body;
    if (!charName) return res.status(400).json({ success: false, error: 'charName requerido' });
    const addZen = parseInt(amount, 10) || 0;
    if (addZen <= 0) return res.status(400).json({ success: false, error: 'Cantidad de Zen inválida' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      await pool.request()
        .input('Name', sql.VarChar(10), charName.trim())
        .input('Zen', sql.Int, addZen)
        .query(`
          UPDATE Character 
          SET Money = CASE WHEN Money + @Zen > 2000000000 THEN 2000000000 ELSE Money + @Zen END
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;
        `);
    });

    res.json({ success: true, message: `${addZen.toLocaleString()} Zen acreditados a '${charName}'.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. GESTIÓN INTEGRAL DE GUILDS / CLANES (100% NATIVO EN SQL SERVER)

// 7. TELETRANSPORTE / MOVER PERSONAJE (ROBUSTO Y DINÁMICO)
app.post('/api/character/teleport', async (req, res) => {
  try {
    const { charName, map, x, y, config } = req.body;
    if (!charName) return res.status(400).json({ success: false, error: 'charName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const parsedMap = Number.isInteger(Number(map)) ? Number(map) : 0;
    const parsedX = Number.isInteger(Number(x)) ? Number(x) : 125;
    const parsedY = Number.isInteger(Number(y)) ? Number(y) : 125;

    const result = await executeSql(config, async (pool) => {
      const colsRes = await pool.request().query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');");
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));
      const hasMapPosX = charCols.has('mapposx');
      const hasMapX = charCols.has('mapx');
      const hasMapDir = charCols.has('mapdir');

      let updateParts = ['MapNumber = @Map'];
      if (hasMapPosX) updateParts.push('MapPosX = @PosX');
      if (hasMapX) updateParts.push('MapX = @PosX');
      if (charCols.has('mapposy')) updateParts.push('MapPosY = @PosY');
      if (charCols.has('mapy')) updateParts.push('MapY = @PosY');
      if (hasMapDir) updateParts.push('MapDir = 0');

      return await pool.request()
        .input('Name', sql.VarChar(20), charName.trim())
        .input('Map', sql.SmallInt, parsedMap)
        .input('PosX', sql.SmallInt, parsedX)
        .input('PosY', sql.SmallInt, parsedY)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name)
          BEGIN
            SELECT 0 AS RowsAffected;
            RETURN;
          END

          DECLARE @Acc VARCHAR(20);
          SELECT TOP 1 @Acc = AccountID FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;

          UPDATE Character 
          SET ${updateParts.join(', ')}
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;

          DECLARE @Updated INT = @@ROWCOUNT;

          -- Desconectar sesión activa para que el GameServer no sobreescriba coordenadas
          IF @Acc IS NOT NULL
          BEGIN
            IF OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
              UPDATE MEMB_STAT SET ConnectStat = 0, DisConnectTM = GETDATE() WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
            IF OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') IS NOT NULL
              UPDATE Me_MuOnline.dbo.MEMB_STAT SET ConnectStat = 0, DisConnectTM = GETDATE() WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
            IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
              UPDATE AccountCharacter SET GameIDC = NULL WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;
            IF OBJECT_ID('WZ_DISCONNECT_MEMB', 'P') IS NOT NULL
              EXEC WZ_DISCONNECT_MEMB @Acc;
          END

          DECLARE @WasOnline INT = 0;
          IF @Acc IS NOT NULL
            SELECT TOP 1 @WasOnline = ISNULL(ConnectStat, 0) FROM MEMB_STAT WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
          SELECT @Updated AS RowsAffected, @WasOnline AS WasOnline;
        `);
    });

    const rows = (result && result.recordset && result.recordset[0] && result.recordset[0].RowsAffected) || 0;
    if (rows === 0) {
      return res.status(404).json({ success: false, error: `No se encontró el personaje '${charName}' en la base de datos.` });
    }

    const wasOnline = !!(result && result.recordset && result.recordset[0] && result.recordset[0].WasOnline);
    res.json({
      success: true,
      wasOnline,
      message: wasOnline
        ? `'${charName}' estaba conectado. Se desconectó del juego y se teletransportó a mapa ${parsedMap} (${parsedX}, ${parsedY}). Al reconectarse aparecerá en el destino.`
        : `'${charName}' teletransportado a mapa ${parsedMap} (${parsedX}, ${parsedY}) con éxito.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Banco de Joyas Louis S6 Update 40 (CustomJewelBank)
app.post('/api/character/jewel-bank', async (req, res) => {
  try {
    const { accountId, config, update, jewels } = req.body;
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    if (!accountId) return res.status(400).json({ success: false, error: 'AccountID requerido' });

    const data = await executeSql(config, async (pool) => {
      if (update && jewels) {
        await pool.request()
          .input('Acc', sql.VarChar, accountId)
          .input('Bless', sql.Int, Math.max(0, parseInt(jewels.Bless, 10) || 0))
          .input('Soul', sql.Int, Math.max(0, parseInt(jewels.Soul, 10) || 0))
          .input('Chaos', sql.Int, Math.max(0, parseInt(jewels.Chaos, 10) || 0))
          .input('Life', sql.Int, Math.max(0, parseInt(jewels.Life, 10) || 0))
          .input('Creation', sql.Int, Math.max(0, parseInt(jewels.Creation, 10) || 0))
          .input('Guardian', sql.Int, Math.max(0, parseInt(jewels.Guardian, 10) || 0))
          .input('Harmony', sql.Int, Math.max(0, parseInt(jewels.Harmony, 10) || 0))
          .input('GemStone', sql.Int, Math.max(0, parseInt(jewels.GemStone, 10) || 0))
          .input('LowStone', sql.Int, Math.max(0, parseInt(jewels.LowStone, 10) || 0))
          .input('HighStone', sql.Int, Math.max(0, parseInt(jewels.HighStone, 10) || 0))
          .query(`
            IF EXISTS (SELECT 1 FROM CustomJewelBank WHERE AccountID = @Acc)
            BEGIN
              UPDATE CustomJewelBank
              SET Bless = @Bless, Soul = @Soul, Chaos = @Chaos, Life = @Life,
                  Creation = @Creation, Guardian = @Guardian, Harmony = @Harmony,
                  GemStone = @GemStone, LowStone = @LowStone, HighStone = @HighStone
              WHERE AccountID = @Acc;
            END
            ELSE
            BEGIN
              INSERT INTO CustomJewelBank (AccountID, Bless, Soul, Chaos, Life, Creation, Guardian, Harmony, GemStone, LowStone, HighStone)
              VALUES (@Acc, @Bless, @Soul, @Chaos, @Life, @Creation, @Guardian, @Harmony, @GemStone, @LowStone, @HighStone);
            END
          `);
      }

      const q = await pool.request()
        .input('Acc', sql.VarChar, accountId)
        .query('SELECT AccountID, Bless, Soul, Chaos, Life, Creation, Guardian, Harmony, LowStone, HighStone, GemStone FROM CustomJewelBank WHERE AccountID = @Acc;');
      return q.recordset[0] || null;
    });

    res.json({ success: true, bank: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Monedas CashShop Louis S6 (CashShopData: WCoinC, WCoinP, GoblinPoint)
app.post('/api/character/cash-shop', async (req, res) => {
  try {
    const { accountId, config, update, coins } = req.body;
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    if (!accountId) return res.status(400).json({ success: false, error: 'AccountID requerido' });

    const data = await executeSql(config, async (pool) => {
      if (update && coins) {
        await pool.request()
          .input('Acc', sql.VarChar, accountId)
          .input('WCoinC', sql.Int, Math.max(0, parseInt(coins.WCoinC, 10) || 0))
          .input('WCoinP', sql.Int, Math.max(0, parseInt(coins.WCoinP, 10) || 0))
          .input('GoblinPoint', sql.Int, Math.max(0, parseInt(coins.GoblinPoint, 10) || 0))
          .query(`
            IF EXISTS (SELECT 1 FROM CashShopData WHERE AccountID = @Acc)
            BEGIN
              UPDATE CashShopData
              SET WCoinC = @WCoinC, WCoinP = @WCoinP, GoblinPoint = @GoblinPoint
              WHERE AccountID = @Acc;
            END
            ELSE
            BEGIN
              INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint)
              VALUES (@Acc, @WCoinC, @WCoinP, @GoblinPoint);
            END
          `);
      }

      const q = await pool.request()
        .input('Acc', sql.VarChar, accountId)
        .query('SELECT AccountID, WCoinC, WCoinP, GoblinPoint FROM CashShopData WHERE AccountID = @Acc;');
      return q.recordset[0] || null;
    });

    res.json({ success: true, cash: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


app.post('/api/character/:name', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ error: 'mssql package not installed' });
    const data = await executeSql(req.body.config, async (pool) => {
      const colsRes = await pool.request().query(`
        SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');
      `);
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));

      const hasMst = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MasterSkillTree';
      `);
      const hasMstTable = (hasMst.recordset || []).length > 0;

      const hasStat = await pool.request().query(`
        SELECT 
          OBJECT_ID('MEMB_STAT', 'U') AS HasMembStat,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken'))) AS AcRuudCol,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'wcoinr'))) AS CsRuudCol,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken'))) AS MembRuudCol;
      `);
      const statRow = (hasStat.recordset && hasStat.recordset[0]) || {};
      const hasStatTable = !!statRow.HasMembStat;
      const acRuudCol = statRow.AcRuudCol;
      const csRuudCol = statRow.CsRuudCol;
      const membRuudCol = statRow.MembRuudCol;

      const resetExpr = charCols.has('resetcount') ? 'ISNULL(c.ResetCount, 0)' : (charCols.has('resets') ? 'ISNULL(c.Resets, 0)' : '0');
      const mresetExpr = charCols.has('masterresetcount') ? 'ISNULL(c.MasterResetCount, 0)' : (charCols.has('mresetcount') ? 'ISNULL(c.MResetCount, 0)' : '0');
      const leadExpr = charCols.has('leadership') ? 'c.Leadership' : '0 AS Leadership';
      const fruitExpr = charCols.has('fruitpoint') ? 'ISNULL(c.FruitPoint, 0)' : '0';
      const mapNumExpr = charCols.has('mapnumber') ? 'ISNULL(c.MapNumber, 0)' : '0';
      const mapXExpr = charCols.has('mapposx') ? 'ISNULL(c.MapPosX, 125)' : '125';
      const mapYExpr = charCols.has('mapposy') ? 'ISNULL(c.MapPosY, 125)' : '125';
      const pkCountExpr = charCols.has('pkcount') ? 'ISNULL(c.PkCount, 0)' : '0';
      const pkLevelExpr = charCols.has('pklevel') ? 'ISNULL(c.PkLevel, 3)' : '3';
      const pkTimeExpr = charCols.has('pktime') ? 'ISNULL(c.PkTime, 0)' : '0';
      const questExpr = charCols.has('quest') ? 'CONVERT(VARCHAR(MAX), c.Quest, 2)' : "''";
      const ctlCodeExpr = charCols.has('ctlcode') ? 'ISNULL(c.CtlCode, 0)' : '0';
      const magicExpr = charCols.has('magiclist') ? 'CONVERT(VARCHAR(MAX), c.MagicList, 2)' : "''";

      const charRuudCol = Array.from(charCols).find(col => col.includes('ruud') || col === 'ruudtoken' || col === 'wcoinr' || col === 'coinr');
      let ruudExpr = '0';
      if (charRuudCol) {
        ruudExpr = `ISNULL(c.[${charRuudCol}], 0)`;
      } else if (acRuudCol) {
        ruudExpr = `ISNULL((SELECT TOP 1 ac.[${acRuudCol}] FROM AccountCharacter ac WHERE LTRIM(RTRIM(ac.Id)) = LTRIM(RTRIM(c.AccountID)) OR ac.Id = c.AccountID), 0)`;
      } else if (csRuudCol) {
        ruudExpr = `ISNULL((SELECT TOP 1 cs.[${csRuudCol}] FROM CashShopData cs WHERE LTRIM(RTRIM(cs.AccountID)) = LTRIM(RTRIM(c.AccountID)) OR cs.AccountID = c.AccountID), 0)`;
      } else if (membRuudCol) {
        ruudExpr = `ISNULL((SELECT TOP 1 m.[${membRuudCol}] FROM MEMB_INFO m WHERE LTRIM(RTRIM(m.memb___id)) = LTRIM(RTRIM(c.AccountID)) OR m.memb___id = c.AccountID), 0)`;
      }

      const result = await pool.request()
        .input('CharName', sql.VarChar, req.params.name.trim())
        .query(`
          SELECT c.Name, c.AccountID, c.Class, c.cLevel, c.LevelUpPoint,
                 ${hasMstTable ? 'ISNULL(m.MasterLevel, 0)' : '0'} AS MasterLevel,
                 ${hasMstTable ? 'ISNULL(m.MasterPoint, 0)' : '0'} AS MasterPoint,
                 c.Strength, c.Dexterity, c.Vitality, c.Energy, ${leadExpr}, c.Money,
                 ${ruudExpr} AS Ruud,
                 ${fruitExpr} AS FruitPoint,
                 ${resetExpr} AS ResetCount,
                 ${mresetExpr} AS MasterResetCount,
                 ${mapNumExpr} AS MapNumber,
                 ${mapXExpr} AS MapPosX,
                 ${mapYExpr} AS MapPosY,
                 ${pkCountExpr} AS PkCount,
                 ${pkLevelExpr} AS PkLevel,
                 ${pkTimeExpr} AS PkTime,
                 ${questExpr} AS QuestHex,
                 ${ctlCodeExpr} AS CtlCode,
                 ${hasStatTable ? 'ISNULL(s.ConnectStat, 0)' : '0'} AS ConnectStat,
                 CONVERT(VARCHAR(MAX), c.Inventory, 2) AS InventoryHex,
                 ISNULL(${magicExpr}, '') AS MagicListHex
          FROM Character c
          ${hasMstTable ? 'LEFT JOIN MasterSkillTree m ON (LTRIM(RTRIM(c.Name)) = LTRIM(RTRIM(m.Name)) OR c.Name = m.Name)' : ''}
          ${hasStatTable ? 'LEFT JOIN MEMB_STAT s ON (LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(s.memb___id)) OR c.AccountID = s.memb___id)' : ''}
          WHERE LTRIM(RTRIM(c.Name)) = LTRIM(RTRIM(@CharName)) OR c.Name = @CharName;
        `);
      return result.recordset[0];
    });
    if (!data) return res.status(404).json({ error: 'Character not found' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/// Test real de conexión con diagnóstico de base de datos
app.post('/api/test-connection', async (req, res) => {
  const startTime = Date.now();
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'Driver mssql no instalado en el servidor' });
    const result = await executeSql(req.body.config, async (pool, config) => {
      const q = await pool.request().query(`
        SELECT 
          @@VERSION AS ServerVersion, 
          DB_NAME() AS CurrentDB,
          OBJECT_ID('Character', 'U') AS HasCharacter,
          OBJECT_ID('MEMB_INFO', 'U') AS HasMembInfo,
          OBJECT_ID('Me_MuOnline.dbo.MEMB_INFO', 'U') AS HasMeMembInfo,
          OBJECT_ID('MEMB_STAT', 'U') AS HasMembStat;
      `);
      const row = (q.recordset && q.recordset[0]) || {};
      return { 
        currentDb: row.CurrentDB || 'Desconocida', 
        server: config.server, 
        port: config.port,
        hasCharacter: !!row.HasCharacter,
        hasMembInfo: !!row.HasMembInfo || !!row.HasMeMembInfo,
        hasMembStat: !!row.HasMembStat,
      };
    });
    const duration = Date.now() - startTime;
    let detailNote = '';
    if (!result.hasCharacter && !result.hasMembInfo) {
      detailNote = ` [Aviso: BD '${result.currentDb}' no tiene tablas de MU Online]`;
    }
    res.json({
      success: true,
      message: `Conectado a ${result.server}:${result.port} [BD: ${result.currentDb}] (${duration}ms)${detailNote}`,
      db: result.currentDb,
      hasMuTables: result.hasCharacter || result.hasMembInfo,
      latency: duration,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, latency: Date.now() - startTime });
  }
});

// Cuentas (MEMB_INFO - Compatible Louis Season 6, Webzen, SCF, Me_MuOnline)
app.post('/api/accounts', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ error: 'mssql not installed' });
    const data = await executeSql(req.body.config, async (pool) => {
      const checkRes = await pool.request().query(`
        SELECT 
          OBJECT_ID('MEMB_INFO', 'U') AS HasMembInfo,
          OBJECT_ID('Me_MuOnline.dbo.MEMB_INFO', 'U') AS HasMeMembInfo,
          OBJECT_ID('MEMB_STAT', 'U') AS HasMembStat,
          OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') AS HasMeMembStat,
          OBJECT_ID('Character', 'U') AS HasCharTable,
          (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND name = 'WarehouseCount') AS HasWareCount,
          (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND name = 'ExtWarehouse') AS HasExtWarehouse,
          (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND name = 'AccountLevel') AS HasAccLevel,
          (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND name = 'AccountExpireDate') AS HasExpireDate,
          (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashShopData') AS HasCashShop,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr'))) AS CharRuudCol,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney'))) AS AcRuudCol,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr'))) AS CsRuudCol,
          (SELECT TOP 1 name FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney'))) AS MembRuudCol;
      `);
      const row = (checkRes.recordset && checkRes.recordset[0]) || {};
      const membTable = row.HasMembInfo ? 'MEMB_INFO' : (row.HasMeMembInfo ? 'Me_MuOnline.dbo.MEMB_INFO' : null);
      if (!membTable) return [];

      const statTable = row.HasMembStat ? 'MEMB_STAT' : (row.HasMeMembStat ? 'Me_MuOnline.dbo.MEMB_STAT' : null);
      const hasWareCount = !!row.HasWareCount;
      const hasExtWarehouse = !!row.HasExtWarehouse;
      const hasAccLevel = !!row.HasAccLevel;
      const hasExpireDate = !!row.HasExpireDate;
      const hasCashShop = !!row.HasCashShop;
      const charRuudCol = row.CharRuudCol;
      const acRuudCol = row.AcRuudCol;
      const csRuudCol = row.CsRuudCol;
      const membRuudCol = row.MembRuudCol;
      const hasCharTable = !!row.HasCharTable;

      let ruudSelect = '0';
      if (charRuudCol) {
        ruudSelect = `ISNULL((SELECT SUM(ISNULL(c.[${charRuudCol}], 0)) FROM Character c WHERE LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(m.memb___id)) OR c.AccountID = m.memb___id), 0)`;
      } else if (acRuudCol) {
        ruudSelect = `ISNULL((SELECT TOP 1 ac.[${acRuudCol}] FROM AccountCharacter ac WHERE LTRIM(RTRIM(ac.Id)) = LTRIM(RTRIM(m.memb___id)) OR ac.Id = m.memb___id), 0)`;
      } else if (csRuudCol && hasCashShop) {
        ruudSelect = `ISNULL(cs.[${csRuudCol}], 0)`;
      } else if (membRuudCol) {
        ruudSelect = `ISNULL(m.[${membRuudCol}], 0)`;
      }

      const query = `
        SELECT 
          m.memb___id, 
          m.memb__pwd, 
          ISNULL(m.memb_name, '') AS memb_name, 
          ISNULL(m.sno__numb, '') AS sno__numb, 
          ISNULL(m.mail_addr, '') AS mail_addr, 
          ISNULL(m.bloc_code, '0') AS bloc_code, 
          ${hasAccLevel ? 'ISNULL(m.AccountLevel, 0)' : '0'} AS AccountLevel, 
          ${hasExpireDate ? 'm.AccountExpireDate' : 'NULL'} AS AccountExpireDate,
          ${hasWareCount ? 'ISNULL(m.WarehouseCount, 1)' : (hasExtWarehouse ? 'ISNULL((SELECT CASE WHEN ISNULL(ac.ExtWarehouse, 0) > 0 THEN 2 ELSE 1 END FROM AccountCharacter ac WHERE LTRIM(RTRIM(ac.Id)) = LTRIM(RTRIM(m.memb___id)) OR ac.Id = m.memb___id), 1)' : '1')} AS WarehouseCount,
          ${hasCashShop ? 'ISNULL(cs.WCoinC, 0)' : '0'} AS WCoinC,
          ${hasCashShop ? 'ISNULL(cs.WCoinP, 0)' : '0'} AS WCoinP,
          ${hasCashShop ? 'ISNULL(cs.GoblinPoint, 0)' : '0'} AS GoblinPoint,
          ${ruudSelect} AS Ruud,
          ${statTable ? 'ISNULL(ms.ConnectStat, 0)' : '0'} AS ConnectStat,
          ${statTable ? "ISNULL(ms.IP, '')" : "''"} AS IP,
          ${hasCharTable ? "(SELECT COUNT(*) FROM Character WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(m.memb___id)) OR AccountID = m.memb___id)" : '0'} AS CharCount
        FROM ${membTable} m
        ${hasCashShop ? 'LEFT JOIN CashShopData cs ON cs.AccountID = m.memb___id' : ''}
        ${statTable ? `LEFT JOIN ${statTable} ms ON LTRIM(RTRIM(ms.memb___id)) = LTRIM(RTRIM(m.memb___id))` : ''}
        ORDER BY m.memb___id ASC;
      `;
      const result = await pool.request().query(query);
      return (result.recordset || []).map(acc => ({
        ...acc,
        online: !!(Number(acc.ConnectStat) === 1),
      }));
    });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Baúl de Cuenta (warehouse & ExtWarehouse - Louis Season 6 Update 40)
app.post('/api/warehouse', async (req, res) => {
  try {
    const { accountId, warehouseIndex = 0, config } = req.body;
    if (!accountId) return res.status(400).json({ error: 'AccountID requerido' });
    if (!sql) return res.status(500).json({ error: 'mssql not installed' });

    const wareIdx = parseInt(warehouseIndex, 10) || 0;

    const data = await executeSql(config, async (pool) => {
      // 1. Obtener WarehouseCount desde MEMB_INFO o AccountCharacter.ExtWarehouse (vía sp_executesql dinámico)
      let wareCount = 1;
      try {
        const countRes = await pool.request()
          .input('Acc', sql.VarChar, accountId)
          .query(`
            DECLARE @Cnt INT = 1;
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND name = 'WarehouseCount')
            BEGIN
              EXEC sp_executesql N'SELECT @outCnt = ISNULL(WarehouseCount, 1) FROM MEMB_INFO WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;', N'@Acc VARCHAR(10), @outCnt INT OUTPUT', @Acc, @outCnt = @Cnt OUTPUT;
            END
            ELSE IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND name = 'ExtWarehouse')
            BEGIN
              EXEC sp_executesql N'SELECT @outCnt = CASE WHEN ISNULL(ExtWarehouse, 0) > 0 THEN 2 ELSE 1 END FROM AccountCharacter WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;', N'@Acc VARCHAR(10), @outCnt INT OUTPUT', @Acc, @outCnt = @Cnt OUTPUT;
            END
            SELECT ISNULL(@Cnt, 1) AS WarehouseCount;
          `);
        if (countRes.recordset && countRes.recordset.length > 0) {
          wareCount = countRes.recordset[0].WarehouseCount || 1;
        }
      } catch (e) {
        console.warn('Error fetching WarehouseCount:', e.message);
      }

      // 2. Auto-crear tabla ExtWarehouse si no existe para compatibilidad universal con multi-baúl
      try {
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExtWarehouse')
          BEGIN
            CREATE TABLE [dbo].[ExtWarehouse](
              [AccountID] [varchar](10) NOT NULL,
              [Number] [int] NOT NULL DEFAULT 0,
              [Items] [varbinary](MAX) NULL,
              [Money] [int] NULL DEFAULT 0,
              CONSTRAINT [PK_ExtWarehouse] PRIMARY KEY CLUSTERED ([AccountID] ASC, [Number] ASC)
            );
          END
          ELSE
          BEGIN
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ExtWarehouse') AND name = 'Items' AND max_length < 3840 AND max_length > 0)
            BEGIN
              ALTER TABLE ExtWarehouse ALTER COLUMN Items VARBINARY(MAX);
            END
          END
        `);
      } catch (tblErr) {
        console.warn('[bridgeServer] Notice: Could not auto-create/alter ExtWarehouse table:', tblErr.message);
      }

      // 3. Obtener datos del Baúl (Principal o Extendido)
      let wareData = null;
      if (wareIdx === 0) {
        const result = await pool.request()
          .input('Acc', sql.VarChar, accountId.trim())
          .query(`
            SELECT AccountID, Money, CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex, pw
            FROM warehouse
            WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
          `);
        wareData = result.recordset[0] || null;
      } else {
        // Baúl extendido (ExtWarehouse) - Nunca consultar columna 'pw' ya que ExtWarehouse oficial Season 6 no la contiene
        const result = await pool.request()
          .input('Acc', sql.VarChar, accountId.trim())
          .input('Num', sql.Int, wareIdx)
          .query(`
            SELECT AccountID, Money, CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex, 0 AS pw
            FROM ExtWarehouse
            WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;
          `);
        wareData = result.recordset[0] || null;
      }

      // Season 6 Update 40 (Louis): El baúl soporta 240 slots (3840 bytes = 7680 caracteres hex)
      // Slots 0-119: Baúl Normal (3840 hex chars)
      // Slots 120-239: Bóveda Expandida oficial (3840 hex chars)
      const emptyVaultHex = 'F'.repeat(7680);
      if (!wareData) {
        wareData = { AccountID: accountId, Money: 0, ItemsHex: emptyVaultHex, pw: 0 };
      } else if (!wareData.ItemsHex) {
        wareData.ItemsHex = emptyVaultHex;
      } else if (wareData.ItemsHex.trim().length < 7680) {
        wareData.ItemsHex = wareData.ItemsHex.trim().padEnd(7680, 'F');
      }

      // Consultar nivel de Expansión de Baúl Season 6 (AccountCharacter.ExtWarehouse = 0, 1 o 2 vía sp_executesql)
      let extWarehouseLevel = 0;
      try {
        const extRes = await pool.request()
          .input('Acc', sql.VarChar, accountId.trim())
          .query(`
            DECLARE @ExtLvl INT = 0;
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND name = 'ExtWarehouse')
            BEGIN
              EXEC sp_executesql N'SELECT @outLvl = ISNULL(ExtWarehouse, 0) FROM AccountCharacter WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;', N'@Acc VARCHAR(10), @outLvl INT OUTPUT', @Acc, @outLvl = @ExtLvl OUTPUT;
            END
            SELECT ISNULL(@ExtLvl, 0) AS ExtWarehouse;
          `);
        if (extRes.recordset && extRes.recordset.length > 0) {
          extWarehouseLevel = extRes.recordset[0].ExtWarehouse || 0;
        }
      } catch (e) {
        // Columna no presente en versiones anteriores
      }

      wareData.WarehouseCount = wareCount;
      wareData.warehouseIndex = wareIdx;
      wareData.extWarehouseLevel = extWarehouseLevel;
      return wareData;
    });

    res.json({ success: true, warehouse: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Guardar cambios en el Baúl (Items & Zen)
app.post('/api/warehouse/save', async (req, res) => {
  try {
    const { accountId, warehouseIndex = 0, itemsHex, money = 0, config } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'AccountID requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    // H10: Validar que itemsHex esté presente, tenga longitud válida y sea hexadecimal
    if (itemsHex === undefined || itemsHex === null || typeof itemsHex !== 'string') {
      return res.status(400).json({ success: false, error: 'Payload itemsHex requerido para guardar el baúl.' });
    }
    const cleanHex = itemsHex.replace(/^0x/i, '').replace(/\s+/g, '').toUpperCase();
    if (cleanHex.length < 3840 || cleanHex.length % 32 !== 0 || !/^[0-9A-F]+$/.test(cleanHex)) {
      return res.status(400).json({
        success: false,
        error: `Payload hexadecimal de baúl inválido (longitud ${cleanHex.length}, debe ser múltiplo de 32 y al menos 3840 caracteres para Season 6).`
      });
    }

    // Asegurar búfer completo de 240 slots (7680 caracteres hex = 3840 bytes)
    const finalHex = cleanHex.length < 7680 ? cleanHex.padEnd(7680, 'F') : cleanHex;

    const wareIdx = parseInt(warehouseIndex, 10) || 0;
    const cleanMoney = Math.max(0, parseInt(money, 10) || 0);

    await executeSql(config, async (pool) => {
      // H14: Verificar si la cuenta está actualmente conectada para evitar corrupción concurrente
      const connCheck = await pool.request()
        .input('Acc', sql.VarChar, accountId.trim())
        .query(`
          IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MEMB_STAT')
            SELECT ConnectStat FROM MEMB_STAT WHERE memb___id = @Acc;
          ELSE
            SELECT 0 AS ConnectStat;
        `);
      if (connCheck.recordset && connCheck.recordset[0] && connCheck.recordset[0].ConnectStat === 1) {
        throw new Error('La cuenta está conectada en el juego. Para guardar baúl de forma segura, el jugador debe desconectarse.');
      }

      if (wareIdx === 0) {
        await pool.request()
          .input('Acc', sql.VarChar, accountId.trim())
          .input('ItemsHex', sql.VarChar, finalHex)
          .input('Money', sql.Int, cleanMoney)
          .query(`
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('warehouse') AND name = 'Items' AND max_length < 3840 AND max_length > 0)
            BEGIN
              ALTER TABLE warehouse ALTER COLUMN Items VARBINARY(MAX);
            END

            IF EXISTS (SELECT 1 FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc)
            BEGIN
              UPDATE warehouse
              SET Items = CONVERT(VARBINARY(MAX), @ItemsHex, 2),
                  Money = @Money
              WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
            END
            ELSE
            BEGIN
              INSERT INTO warehouse (AccountID, Items, Money, EndUseDate, DbVersion, pw)
              VALUES (@Acc, CONVERT(VARBINARY(MAX), @ItemsHex, 2), @Money, DATEADD(year, 1, GETDATE()), 3, 0);
            END
          `);
      } else {
        // Auto-crear o actualizar tabla ExtWarehouse si no existe
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExtWarehouse')
          BEGIN
            CREATE TABLE [dbo].[ExtWarehouse](
              [AccountID] [varchar](10) NOT NULL,
              [Number] [int] NOT NULL DEFAULT 0,
              [Items] [varbinary](MAX) NULL,
              [Money] [int] NULL DEFAULT 0,
              CONSTRAINT [PK_ExtWarehouse] PRIMARY KEY CLUSTERED ([AccountID] ASC, [Number] ASC)
            );
          END
          ELSE
          BEGIN
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ExtWarehouse') AND name = 'Items' AND max_length < 3840 AND max_length > 0)
            BEGIN
              ALTER TABLE ExtWarehouse ALTER COLUMN Items VARBINARY(MAX);
            END
          END
        `);

        await pool.request()
          .input('Acc', sql.VarChar, accountId.trim())
          .input('Num', sql.Int, wareIdx)
          .input('ItemsHex', sql.VarChar, finalHex)
          .input('Money', sql.Int, cleanMoney)
          .query(`
            IF EXISTS (SELECT 1 FROM ExtWarehouse WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num)
            BEGIN
              UPDATE ExtWarehouse
              SET Items = CONVERT(VARBINARY(MAX), @ItemsHex, 2),
                  Money = @Money
              WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;
            END
            ELSE
            BEGIN
              INSERT INTO ExtWarehouse (AccountID, Number, Items, Money)
              VALUES (@Acc, @Num, CONVERT(VARBINARY(MAX), @ItemsHex, 2), @Money);
            END

            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ExtWarehouse') AND name = 'EndUseDate')
            BEGIN
              EXEC sp_executesql N'UPDATE ExtWarehouse SET EndUseDate = DATEADD(year, 10, GETDATE()) WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;', N'@Acc VARCHAR(10), @Num INT', @Acc, @Num;
            END
          `);
      }
    });

    res.json({ success: true, message: `Baúl #${wareIdx} de '${accountId}' guardado exitosamente.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Desbloquear / Actualizar número de Baúles Adicionales (WarehouseCount en MEMB_INFO y ExtWarehouse en AccountCharacter)
app.post('/api/warehouse/update-count', async (req, res) => {
  try {
    const { accountId, count, config } = req.body;
    if (!accountId) return res.status(400).json({ error: 'AccountID requerido' });
    if (!sql) return res.status(500).json({ error: 'mssql not installed' });

    const newCount = Math.max(1, Math.min(250, parseInt(count, 10) || 1));

    await executeSql(config, async (pool) => {
      await pool.request()
        .input('Acc', sql.VarChar, accountId)
        .input('Count', sql.Int, newCount)
        .query(`
          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND name = 'WarehouseCount')
          BEGIN
            EXEC sp_executesql N'UPDATE MEMB_INFO SET WarehouseCount = @cnt WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@acc)) OR memb___id = @acc;', N'@cnt INT, @acc VARCHAR(10)', @Count, @Acc;
          END

          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND name = 'ExtWarehouse')
          BEGIN
            EXEC sp_executesql N'UPDATE AccountCharacter SET ExtWarehouse = CASE WHEN @cnt > 1 THEN 2 ELSE 0 END WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@acc)) OR Id = @acc;', N'@cnt INT, @acc VARCHAR(10)', @Count, @Acc;
          END
        `);
    });

    res.json({ success: true, warehouseCount: newCount });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Activar / Configurar Expansión de Baúl Season 6 (AccountCharacter.ExtWarehouse = 0, 1)
app.post('/api/warehouse/set-expansion', async (req, res) => {
  try {
    const { accountId, level = 1, config } = req.body;
    if (!accountId) return res.status(400).json({ error: 'AccountID requerido' });
    if (!sql) return res.status(500).json({ error: 'mssql not installed' });

    const expLevel = Math.max(0, Math.min(1, parseInt(level, 10) || 1));

    await executeSql(config, async (pool) => {
      // 1. Actualizar o insertar en AccountCharacter (vía sp_executesql dinámico sin ALTER TABLE)
      await pool.request()
        .input('Acc', sql.VarChar, accountId.trim())
        .input('Lvl', sql.Int, expLevel)
        .query(`
          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND name = 'ExtWarehouse')
          BEGIN
            IF EXISTS (SELECT 1 FROM AccountCharacter WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc)
            BEGIN
              EXEC sp_executesql N'UPDATE AccountCharacter SET ExtWarehouse = @Lvl WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;', N'@Lvl INT, @Acc VARCHAR(10)', @Lvl, @Acc;
            END
            ELSE
            BEGIN
              EXEC sp_executesql N'INSERT INTO AccountCharacter (Id, ExtWarehouse) VALUES (@Acc, @Lvl);', N'@Lvl INT, @Acc VARCHAR(10)', @Lvl, @Acc;
            END
          END
        `);

      // 3. Asegurar columna Items en warehouse y ampliar a 3840 bytes si es necesario
      await pool.request()
        .input('Acc', sql.VarChar, accountId.trim())
        .query(`
          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('warehouse') AND name = 'Items' AND max_length < 3840 AND max_length > 0)
          BEGIN
            ALTER TABLE warehouse ALTER COLUMN Items VARBINARY(MAX);
          END

          IF EXISTS (SELECT 1 FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc)
          BEGIN
            DECLARE @CurLen INT = (SELECT DATALENGTH(Items) FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc);
            IF @CurLen IS NOT NULL AND @CurLen < 3840
            BEGIN
              DECLARE @PadHex VARCHAR(MAX) = REPLICATE('F', (3840 - @CurLen) * 2);
              UPDATE warehouse
              SET Items = Items + CONVERT(VARBINARY(MAX), @PadHex, 2)
              WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
            END
          END

          IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('warehouse') AND name = 'EndUseDate')
          BEGIN
            EXEC sp_executesql N'UPDATE warehouse SET EndUseDate = DATEADD(year, 10, GETDATE()) WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;', N'@Acc VARCHAR(10)', @Acc;
          END
        `);
    });

    res.json({
      success: true,
      extWarehouseLevel: expLevel,
      message: `Bóveda Expandida activada con éxito en juego para '${accountId}'. Bóveda inicializada y lista para editar.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Registrar Nueva Cuenta en MEMB_INFO
app.post('/api/account/create', async (req, res) => {
  try {
    const { username, password, email, accountLevel, config } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos' });
    }
    if (!sql) return res.status(500).json({ error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      const check = await pool.request()
        .input('User', sql.VarChar, username)
        .query('SELECT memb___id FROM MEMB_INFO WHERE memb___id = @User;');

      if (check.recordset.length > 0) {
        throw new Error('DUPLICATE_USER');
      }

      await pool.request()
        .input('User', sql.VarChar, username)
        .input('Pass', sql.VarChar, password)
        .input('Email', sql.VarChar, email || (username + '@mu.com'))
        .input('Level', sql.Int, parseInt(accountLevel, 10) || 0)
        .query(`
          INSERT INTO MEMB_INFO (
            memb___id, memb__pwd, memb_name, sno__numb, post_code, addr_info, addr_deta, 
            tel__numb, mail_addr, phon_numb, fpas_ques, fpas_answ, job__code, 
            appl_days, modi_days, out__days, true_days, mail_chek, bloc_code, ctl1_code, AccountLevel
          )
          VALUES (
            @User, @Pass, @User, '1111111111111', '1234', 'Local', 'Local', 
            '12345678', @Email, '12345678', 'pregunta', 'respuesta', '1', 
            GETDATE(), GETDATE(), GETDATE(), GETDATE(), '1', '0', '0', @Level
          );

          IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMB_INFO' AND COLUMN_NAME = 'AccountExpireDate')
          BEGIN
            EXEC sp_executesql N'UPDATE MEMB_INFO SET AccountExpireDate = DATEADD(year, 1, GETDATE()) WHERE memb___id = @U', N'@U VARCHAR(10)', @U = @User;
          END

          IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AccountCharacter')
          BEGIN
            EXEC sp_executesql N'IF NOT EXISTS (SELECT 1 FROM AccountCharacter WHERE Id = @U) INSERT INTO AccountCharacter (Id) VALUES (@U)', N'@U VARCHAR(10)', @U = @User;
          END

          IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashShopData')
          BEGIN
            EXEC sp_executesql N'IF NOT EXISTS (SELECT 1 FROM CashShopData WHERE AccountID = @U) INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint) VALUES (@U, 0, 0, 0)', N'@U VARCHAR(10)', @U = @User;
          END

          IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CustomJewelBank')
          BEGIN
            EXEC sp_executesql N'IF NOT EXISTS (SELECT 1 FROM CustomJewelBank WHERE AccountID = @U) INSERT INTO CustomJewelBank (AccountID, Bless, Soul, Chaos, Life, Creation, Guardian, Harmony, LowStone, HighStone, GemStone) VALUES (@U, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)', N'@U VARCHAR(10)', @U = @User;
          END
        `);
    });

    res.json({ success: true, message: `Cuenta '${username}' creada exitosamente en MEMB_INFO` });
  } catch (err) {
    if (err.message === 'DUPLICATE_USER') {
      return res.status(400).json({ success: false, error: 'El nombre de usuario ya existe en MEMB_INFO' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// Bloquear / Desbloquear Cuenta (Ban/Unban)
app.post('/api/account/toggle-block', async (req, res) => {
  try {
    const { username, block, config } = req.body;
    if (!sql) return res.status(500).json({ error: 'mssql not installed' });
    const newCode = block ? '1' : '0';

    const result = await executeSql(config, async (pool) => {
      return await pool.request()
        .input('User', sql.VarChar, username)
        .input('Code', sql.Char(1), newCode)
        .query('UPDATE MEMB_INFO SET bloc_code = @Code WHERE memb___id = @User;');
    });

    if (!result.rowsAffected || result.rowsAffected[0] === 0) {
      return res.status(404).json({ success: false, error: 'Cuenta no encontrada' });
    }

    res.json({ success: true, message: `Cuenta '${username}' ${block ? 'bloqueada' : 'desbloqueada'} exitosamente` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Actualizar información completa de Cuenta (Password, VIP, Monedas, etc.)
app.post('/api/account/update', async (req, res) => {
  try {
    const {
      username,
      newUsername,
      password,
      name,
      email,
      accountLevel,
      addVipDays,
      accountExpireDate,
      bloc_code,
      warehouseCount,
      wCoinC,
      wCoinP,
      goblinPoint,
      ruud,
      config
    } = req.body;

    if (!username) return res.status(400).json({ success: false, error: 'Usuario requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'Driver mssql no instalado' });

    const cleanUser = username.trim();
    const cleanNewUser = newUsername ? newUsername.trim() : '';
    const cleanRuud = (ruud !== undefined && ruud !== null) ? Math.max(0, parseInt(ruud, 10) || 0) : null;

    await executeSql(config, async (pool) => {
      // 1. Verificación previa de conexión y existencia de cuenta destino (H07)
      const preCheck = await pool.request()
        .input('OldU', sql.VarChar(10), cleanUser)
        .input('NewU', sql.VarChar(10), cleanNewUser)
        .query(`
          -- Verificar si la cuenta origen existe
          IF NOT EXISTS (SELECT 1 FROM MEMB_INFO WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@OldU)) OR memb___id = @OldU)
          BEGIN
            SELECT -1 AS CheckStatus; -- Cuenta origen no existe
            RETURN;
          END

          -- Verificar si la cuenta origen está conectada
          IF EXISTS (SELECT 1 FROM MEMB_STAT WHERE (LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@OldU)) OR memb___id = @OldU) AND ConnectStat = 1)
          BEGIN
            SELECT -2 AS CheckStatus; -- Cuenta conectada
            RETURN;
          END

          -- Si hay nuevo usuario, verificar colisión antes de mutar
          IF @NewU <> '' AND LOWER(LTRIM(RTRIM(@NewU))) <> LOWER(LTRIM(RTRIM(@OldU)))
          BEGIN
            IF EXISTS (SELECT 1 FROM MEMB_INFO WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@NewU)) OR memb___id = @NewU)
            BEGIN
              SELECT -3 AS CheckStatus; -- Nuevo usuario ya existe
              RETURN;
            END
          END

          SELECT 1 AS CheckStatus;
        `);

      const status = preCheck.recordset && preCheck.recordset[0] ? preCheck.recordset[0].CheckStatus : 0;
      if (status === -1) throw new Error(`La cuenta '${cleanUser}' no existe en la base de datos.`);
      if (status === -2) throw new Error(`La cuenta '${cleanUser}' está CONECTADA en el juego. Debe desconectarse antes de actualizar sus datos.`);
      if (status === -3) throw new Error(`El usuario de destino '${cleanNewUser}' ya existe en la base de datos.`);

      // 2. Transacción T-SQL Atómica (BEGIN TRAN ... COMMIT / ROLLBACK)
      await pool.request()
        .input('OldUser', sql.VarChar(10), cleanUser)
        .input('NewUser', sql.VarChar(10), cleanNewUser)
        .input('Pwd', sql.VarChar(10), password !== undefined && password !== null && String(password).trim() !== '' ? String(password).trim() : null)
        .input('MembName', sql.VarChar(50), name !== undefined && name !== null ? String(name).trim() : null)
        .input('Email', sql.VarChar(50), email !== undefined && email !== null ? String(email).trim() : null)
        .input('AccLevel', sql.Int, accountLevel !== undefined && accountLevel !== null ? (parseInt(accountLevel, 10) || 0) : null)
        .input('BlocCode', sql.Char(1), bloc_code !== undefined && bloc_code !== null ? String(bloc_code) : null)
        .input('Days', sql.Int, addVipDays !== undefined ? (parseInt(addVipDays, 10) || 0) : 0)
        .input('ExpDate', sql.DateTime, accountExpireDate ? new Date(accountExpireDate) : null)
        .input('WCount', sql.Int, warehouseCount !== undefined && warehouseCount !== null ? Math.max(1, parseInt(warehouseCount, 10) || 1) : null)
        .input('CoinC', sql.Int, wCoinC !== undefined ? Math.max(0, parseInt(wCoinC, 10) || 0) : null)
        .input('CoinP', sql.Int, wCoinP !== undefined ? Math.max(0, parseInt(wCoinP, 10) || 0) : null)
        .input('Goblin', sql.Int, goblinPoint !== undefined ? Math.max(0, parseInt(goblinPoint, 10) || 0) : null)
        .input('Ruud', sql.Int, cleanRuud)
        .query(`
          BEGIN TRY
            BEGIN TRANSACTION;

            -- 1. Actualizar MEMB_INFO
            UPDATE MEMB_INFO
            SET 
              memb__pwd = COALESCE(@Pwd, memb__pwd),
              memb_name = COALESCE(@MembName, memb_name),
              mail_addr = COALESCE(@Email, mail_addr),
              AccountLevel = COALESCE(@AccLevel, AccountLevel),
              bloc_code = COALESCE(@BlocCode, bloc_code)
            WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@OldUser)) OR memb___id = @OldUser;

            -- 2. VIP Expire Date
            IF @Days > 0 AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMB_INFO' AND COLUMN_NAME = 'AccountExpireDate')
            BEGIN
              UPDATE MEMB_INFO
              SET AccountExpireDate = DATEADD(day, @Days, CASE WHEN AccountExpireDate IS NULL OR AccountExpireDate < GETDATE() THEN GETDATE() ELSE AccountExpireDate END)
              WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@OldUser)) OR memb___id = @OldUser;
            END
            ELSE IF @ExpDate IS NOT NULL AND EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'MEMB_INFO' AND COLUMN_NAME = 'AccountExpireDate')
            BEGIN
              UPDATE MEMB_INFO
              SET AccountExpireDate = @ExpDate
              WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@OldUser)) OR memb___id = @OldUser;
            END

            -- 3. WarehouseCount / ExtWarehouse (vía sp_executesql dinámico sin ALTER TABLE)
            IF @WCount IS NOT NULL
            BEGIN
              IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND name = 'WarehouseCount')
              BEGIN
                EXEC sp_executesql N'UPDATE MEMB_INFO SET WarehouseCount = @cnt WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@user)) OR memb___id = @user;', N'@cnt INT, @user VARCHAR(10)', @WCount, @OldUser;
              END

              IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND name = 'ExtWarehouse')
              BEGIN
                EXEC sp_executesql N'UPDATE AccountCharacter SET ExtWarehouse = CASE WHEN @cnt > 1 THEN 2 ELSE 0 END WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@user)) OR Id = @user;', N'@cnt INT, @user VARCHAR(10)', @WCount, @OldUser;
              END
            END

            -- 4. CashShopData
            IF @CoinC IS NOT NULL OR @CoinP IS NOT NULL OR @Goblin IS NOT NULL
            BEGIN
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashShopData')
              BEGIN
                IF EXISTS (SELECT 1 FROM CashShopData WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@OldUser)) OR AccountID = @OldUser)
                BEGIN
                  UPDATE CashShopData
                  SET 
                    WCoinC = COALESCE(@CoinC, WCoinC),
                    WCoinP = COALESCE(@CoinP, WCoinP),
                    GoblinPoint = COALESCE(@Goblin, GoblinPoint)
                  WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@OldUser)) OR AccountID = @OldUser;
                END
                ELSE
                BEGIN
                  INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint)
                  VALUES (@OldUser, ISNULL(@CoinC, 0), ISNULL(@CoinP, 0), ISNULL(@Goblin, 0));
                END
              END
            END

            -- 4.5. Actualizar Ruud (Detección Universal Multi-Tabla y Multi-Columna con LOWER y QUOTENAME)
            IF @Ruud IS NOT NULL
            BEGIN
              -- A. MEMB_INFO
              IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney')))
              BEGIN
                DECLARE @sqlMembRuud NVARCHAR(MAX) = (
                  SELECT TOP 1 'UPDATE MEMB_INFO SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@User)) OR memb___id = @User;'
                  FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney'))
                );
                IF @sqlMembRuud IS NOT NULL
                  EXEC sp_executesql @sqlMembRuud, N'@RuudVal INT, @User VARCHAR(10)', @RuudVal = @Ruud, @User = @OldUser;
              END

              -- B. AccountCharacter (MSPro)
              IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney')))
              BEGIN
                DECLARE @sqlAcRuud NVARCHAR(MAX) = (
                  SELECT TOP 1 'UPDATE AccountCharacter SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@User)) OR Id = @User;'
                  FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney'))
                );
                IF @sqlAcRuud IS NOT NULL
                  EXEC sp_executesql @sqlAcRuud, N'@RuudVal INT, @User VARCHAR(10)', @RuudVal = @Ruud, @User = @OldUser;
              END

              -- C. CashShopData
              IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr')))
              BEGIN
                DECLARE @sqlCsRuud NVARCHAR(MAX) = (
                  SELECT TOP 1 'UPDATE CashShopData SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@User)) OR AccountID = @User;'
                  FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr'))
                );
                IF @sqlCsRuud IS NOT NULL
                  EXEC sp_executesql @sqlCsRuud, N'@RuudVal INT, @User VARCHAR(10)', @RuudVal = @Ruud, @User = @OldUser;
              END

              -- D. Character (Louis y MSPro)
              IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr')))
              BEGIN
                DECLARE @sqlCharRuud NVARCHAR(MAX) = (
                  SELECT TOP 1 'UPDATE Character SET ' + QUOTENAME(name) + ' = @RuudVal WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@User)) OR AccountID = @User;'
                  FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr'))
                );
                IF @sqlCharRuud IS NOT NULL
                  EXEC sp_executesql @sqlCharRuud, N'@RuudVal INT, @User VARCHAR(10)', @RuudVal = @Ruud, @User = @OldUser;
              END
            END

            -- 5. Renombrado atómico en cascada si NewUser no está vacío y es distinto
            IF @NewUser <> '' AND LOWER(LTRIM(RTRIM(@NewUser))) <> LOWER(LTRIM(RTRIM(@OldUser)))
            BEGIN
              UPDATE MEMB_INFO SET memb___id = @NewUser WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@OldUser)) OR memb___id = @OldUser;
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AccountCharacter')
                UPDATE AccountCharacter SET Id = @NewUser WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@OldUser)) OR Id = @OldUser;
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Character')
                UPDATE Character SET AccountID = @NewUser WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@OldUser)) OR AccountID = @OldUser;
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'warehouse')
                UPDATE warehouse SET AccountID = @NewUser WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@OldUser)) OR AccountID = @OldUser;
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ExtWarehouse')
                UPDATE ExtWarehouse SET AccountID = @NewUser WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@OldUser)) OR AccountID = @OldUser;
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CashShopData')
                UPDATE CashShopData SET AccountID = @NewUser WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@OldUser)) OR AccountID = @OldUser;
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'MEMB_STAT')
                UPDATE MEMB_STAT SET memb___id = @NewUser WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@OldUser)) OR memb___id = @OldUser;
              IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'CustomJewelBank')
                UPDATE CustomJewelBank SET AccountID = @NewUser WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@OldUser)) OR AccountID = @OldUser;
            END

            COMMIT TRANSACTION;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH
        `);
    });

    res.json({ success: true, message: 'Datos de la cuenta actualizados correctamente con transacción atómica.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Desconectar Cuenta Trabada (ConnectStat = 0 en MEMB_STAT) - Soporte AccountID y Nombre PJ
app.post('/api/account/disconnect', async (req, res) => {
  try {
    const { username, charName, config } = req.body || {};
    const targetUser = (username || req.body?.accountId || req.body?.account || '').trim();
    const targetChar = (charName || '').trim();
    if (!targetUser && !targetChar) return res.status(400).json({ success: false, error: 'Usuario o personaje requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const result = await executeSql(config, async (pool) => {
      return await pool.request()
        .input('User', sql.VarChar(20), targetUser)
        .input('CharName', sql.VarChar(20), targetChar)
        .query(`
          DECLARE @TargetAcc VARCHAR(20) = @User;
          DECLARE @ResolvedChar VARCHAR(20) = @CharName;

          -- Si @User no existe en MEMB_INFO pero coincide con un Personaje, resolver su AccountID
          IF @TargetAcc IS NOT NULL AND LEN(@TargetAcc) > 0 AND NOT EXISTS (SELECT 1 FROM MEMB_INFO WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@TargetAcc)) OR memb___id = @TargetAcc)
          BEGIN
            SELECT TOP 1 @TargetAcc = AccountID, @ResolvedChar = Name 
            FROM Character 
            WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@TargetAcc)) OR Name = @TargetAcc;
          END

          -- Si aún no hay TargetAcc y se especificó CharName, buscar por CharName
          IF (@TargetAcc IS NULL OR LEN(@TargetAcc) = 0) AND (@CharName IS NOT NULL AND LEN(@CharName) > 0)
          BEGIN
            SELECT TOP 1 @TargetAcc = AccountID, @ResolvedChar = Name 
            FROM Character 
            WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@CharName)) OR Name = @CharName;
          END

          -- 1. Actualizar MEMB_STAT (liberar sesión activa)
          IF OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
          BEGIN
            UPDATE MEMB_STAT 
            SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE()
            WHERE LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@TargetAcc))) 
               OR memb___id = @TargetAcc
               OR LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@User)))
               OR memb___id = @User;
          END
          IF OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') IS NOT NULL
          BEGIN
            UPDATE Me_MuOnline.dbo.MEMB_STAT 
            SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE()
            WHERE LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@TargetAcc))) 
               OR memb___id = @TargetAcc
               OR LOWER(LTRIM(RTRIM(memb___id))) = LOWER(LTRIM(RTRIM(@User)))
               OR memb___id = @User;
          END

          -- 2. Liberar bloqueo en AccountCharacter (GameIDC) y forzar desconexión
          IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
          BEGIN
            UPDATE AccountCharacter 
            SET GameIDC = NULL 
            WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@TargetAcc)) OR Id = @TargetAcc;
          END

          IF OBJECT_ID('WZ_DISCONNECT_MEMB', 'P') IS NOT NULL
            EXEC WZ_DISCONNECT_MEMB @TargetAcc;

          -- 3. Si el personaje quedó atrapado en mapa de eventos, moverlo a Lorencia Centro
          IF @ResolvedChar IS NOT NULL AND LEN(@ResolvedChar) > 0
          BEGIN
            DECLARE @RescueSQL NVARCHAR(MAX);
            DECLARE @HasMapPosX INT = 0;
            DECLARE @HasMapX INT = 0;
            SELECT @HasMapPosX = COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'MapPosX';
            SELECT @HasMapX = COUNT(*) FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND name = 'MapX';

            IF @HasMapPosX > 0
              SET @RescueSQL = 'UPDATE Character SET MapNumber = 0, MapPosX = 125, MapPosY = 125 WHERE (LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Char)) OR Name = @Char) AND MapNumber IN (9, 11, 18, 19, 20, 21, 22, 23, 32, 34, 45, 52, 53)';
            ELSE IF @HasMapX > 0
              SET @RescueSQL = 'UPDATE Character SET MapNumber = 0, MapX = 125, MapY = 125 WHERE (LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Char)) OR Name = @Char) AND MapNumber IN (9, 11, 18, 19, 20, 21, 22, 23, 32, 34, 45, 52, 53)';
            ELSE
              SET @RescueSQL = 'UPDATE Character SET MapNumber = 0 WHERE (LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Char)) OR Name = @Char) AND MapNumber IN (9, 11, 18, 19, 20, 21, 22, 23, 32, 34, 45, 52, 53)';

            EXEC sp_executesql @RescueSQL, N'@Char VARCHAR(20)', @Char = @ResolvedChar;
          END

          SELECT @TargetAcc AS FinalAcc, @ResolvedChar AS FinalChar;
        `);
    });

    const finalAcc = result && result.recordset && result.recordset[0] ? result.recordset[0].FinalAcc : (targetUser || targetChar);
    const finalChar = result && result.recordset && result.recordset[0] ? result.recordset[0].FinalChar : '';
    res.json({
      success: true,
      message: `Cuenta '${finalAcc}' destrabada exitosamente (ConnectStat = 0, GameIDC liberado)${finalChar ? ` [PJ: ${finalChar}]` : ''}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// PACK COMPLETO DE SUPER-HERRAMIENTAS (LOUIS S6)
// ==========================================

const SERVER_ITEM_NAMES = {
  '0_0': 'Kris', '0_1': 'Short Sword', '0_2': 'Rapier', '0_3': 'Assassin Blade', '0_4': 'Gladius',
  '0_5': 'Falchion', '0_6': 'Serpent Sword', '0_7': 'Salamander Blade', '0_8': 'Light Saber',
  '0_9': 'Legendary Sword', '0_10': 'Heliacal Sword', '0_11': 'Double Blade', '0_12': 'Lighting Sword',
  '0_13': 'Giant Sword', '0_14': 'Blade', '0_15': 'Dark Breaker', '0_16': 'Bone Blade',
  '0_17': 'Dragon Blade', '0_18': 'Thunder Blade', '0_19': 'Divine Sword of Archangel',
  '0_20': 'Knight Blade', '0_21': 'Dark Reign Blade', '0_22': 'Daybreak', '0_23': 'Sword of Destruction',
  '0_24': 'Rune Blade', '0_31': 'Rune Bastard Sword',
  '1_0': 'Small Axe', '1_1': 'Hand Axe', '1_2': 'Double Axe', '1_3': 'Tomahawk', '1_8': 'Crescent Axe',
  '2_0': 'Mace', '2_1': 'Morning Star', '2_2': 'Flail', '2_3': 'Great Hammer', '2_4': 'Crystal Morning Star',
  '2_8': 'Master Scepter', '2_13': 'Lord Scepter', '2_14': 'Great Lord Scepter', '2_15': 'Absolute Scepter',
  '2_16': 'Solay Scepter', '2_17': 'Shining Scepter',
  '3_0': 'Light Spear', '3_1': 'Spear', '3_2': 'Dragon Lance', '3_3': 'Giant Trident', '3_4': 'Serpent Spear',
  '3_5': 'Double Poleaxe', '3_6': 'Halberd', '3_7': 'Berdysh', '3_8': 'Great Scythe', '3_9': 'Bill of Balrog', '3_10': 'Dragon Spear',
  '4_0': 'Short Bow', '4_1': 'Bow', '4_8': 'Crossbow', '4_9': 'Golden Crossbow', '4_16': 'Saint Crossbow',
  '4_17': 'Celestial Bow', '4_18': 'Divine Crossbow of Archangel', '4_19': 'Great Reign Crossbow',
  '4_20': 'Arrow Viper Bow', '4_21': 'Sylph Wind Bow',
  '5_0': 'Skull Staff', '5_1': 'Angelic Staff', '5_2': 'Serpent Staff', '5_3': 'Thunder Staff',
  '5_4': 'Gorgon Staff', '5_5': 'Legendary Staff', '5_6': 'Resurrection Staff', '5_7': 'Chaos Lightning Staff',
  '5_8': 'Destruction Staff', '5_9': 'Dragon Soul Staff', '5_10': 'Divine Staff of Archangel',
  '5_11': 'Kundun Staff', '5_12': 'Grand Viper Staff', '5_13': 'Platina Wing Staff',
  '6_0': 'Small Shield', '6_1': 'Horn Shield', '6_2': 'Kite Shield', '6_3': 'Elven Shield', '6_4': 'Buckler',
  '6_5': 'Dragon Slayer Shield', '6_6': 'Skull Shield', '6_7': 'Spike Shield', '6_8': 'Tower Shield',
  '6_9': 'Iron Defender', '6_10': 'Plate Shield', '6_11': 'Large Round Shield', '6_12': 'Serpent Shield',
  '6_13': 'Bronze Shield', '6_14': 'Dragon Shield', '6_15': 'Legendary Shield', '6_16': 'Grand Soul Shield',
  '7_0': 'Bronze Helm', '7_1': 'Dragon Helm', '7_2': 'Pad Helm', '7_3': 'Legendary Helm', '7_4': 'Bone Helm',
  '7_5': 'Leather Helm', '7_6': 'Scale Helm', '7_7': 'Sphinx Helm', '7_8': 'Brass Helm', '7_9': 'Plate Helm',
  '7_16': 'Black Dragon Helm', '7_17': 'Dark Phoenix Helm', '7_18': 'Grand Soul Helm', '7_21': 'Great Dragon Helm',
  '7_22': 'Dark Soul Helm', '7_29': 'Dragon Knight Helm', '7_30': 'Venom Mist Helm',
  '8_0': 'Bronze Armor', '8_1': 'Dragon Armor', '8_2': 'Pad Armor', '8_3': 'Legendary Armor', '8_4': 'Bone Armor',
  '8_16': 'Black Dragon Armor', '8_17': 'Dark Phoenix Armor', '8_18': 'Grand Soul Armor', '8_21': 'Great Dragon Armor',
  '8_22': 'Dark Soul Armor', '8_29': 'Dragon Knight Armor', '8_30': 'Venom Mist Armor',
  '9_0': 'Bronze Pants', '9_1': 'Dragon Pants', '9_2': 'Pad Pants', '9_3': 'Legendary Pants', '9_4': 'Bone Pants',
  '9_16': 'Black Dragon Pants', '9_17': 'Dark Phoenix Pants', '9_18': 'Grand Soul Pants', '9_21': 'Great Dragon Pants',
  '9_22': 'Dark Soul Pants', '9_29': 'Dragon Knight Pants', '9_30': 'Venom Mist Pants',
  '10_0': 'Bronze Gloves', '10_1': 'Dragon Gloves', '10_2': 'Pad Gloves', '10_3': 'Legendary Gloves', '10_4': 'Bone Gloves',
  '10_16': 'Black Dragon Gloves', '10_17': 'Dark Phoenix Gloves', '10_18': 'Grand Soul Gloves', '10_21': 'Great Dragon Gloves',
  '10_22': 'Dark Soul Gloves', '10_29': 'Dragon Knight Gloves', '10_30': 'Venom Mist Gloves',
  '11_0': 'Bronze Boots', '11_1': 'Dragon Boots', '11_2': 'Pad Boots', '11_3': 'Legendary Boots', '11_4': 'Bone Boots',
  '11_16': 'Black Dragon Boots', '11_17': 'Dark Phoenix Boots', '11_18': 'Grand Soul Boots', '11_21': 'Great Dragon Boots',
  '11_22': 'Dark Soul Boots', '11_29': 'Dragon Knight Boots', '11_30': 'Venom Mist Boots',
  '12_0': 'Wings of Fairy', '12_1': 'Wings of Heaven', '12_2': 'Wings of Satan', '12_3': 'Wings of Spirits',
  '12_4': 'Wings of Soul', '12_5': 'Wings of Dragon', '12_6': 'Wings of Darkness',
  '12_36': 'Wings of Storm', '12_37': 'Wings of Eternal', '12_38': 'Wings of Illusion',
  '12_39': 'Wings of Ruin', '12_40': 'Cape of Emperor', '12_41': 'Wings of Dimension',
  '13_0': 'Guardian Angel', '13_1': 'Imp', '13_2': 'Horn of Uniria', '13_3': 'Horn of Dinorant',
  '13_4': 'Dark Horse', '13_5': 'Dark Raven', '13_37': 'Horn of Fenrir', '13_64': 'Demon', '13_65': 'Spirit of Guardian',
  '13_8': 'Ring of Ice', '13_9': 'Ring of Poison', '13_12': 'Pendant of Lightning', '13_13': 'Pendant of Fire',
  '13_20': 'Wizards Ring', '13_21': 'Ring of Fire', '13_22': 'Ring of Earth', '13_23': 'Ring of Wind',
  '13_24': 'Ring of Magic', '13_25': 'Pendant of Ice', '13_26': 'Pendant of Wind', '13_27': 'Pendant of Water',
  '13_28': 'Pendant of Ability',
  '14_13': 'Jewel of Bless', '14_14': 'Jewel of Soul', '14_15': 'Jewel of Chaos', '14_16': 'Jewel of Life',
  '14_22': 'Jewel of Creation', '14_41': 'Gemstone', '14_42': 'Jewel of Harmony',
  '14_43': 'Lower Refining Stone', '14_44': 'Higher Refining Stone',
  '15_0': 'Scroll of Poison', '15_1': 'Scroll of Meteorite', '15_2': 'Scroll of Lightning', '15_3': 'Scroll of Fire Ball',
  '15_4': 'Scroll of Flame', '15_5': 'Scroll of Teleport', '15_6': 'Scroll of Ice', '15_7': 'Scroll of Twister',
  '15_8': 'Scroll of Evil Spirit', '15_9': 'Scroll of Hellfire', '15_10': 'Scroll of Power Wave', '15_11': 'Scroll of Aqua Beam',
  '15_12': 'Scroll of Cometfall', '15_13': 'Scroll of Inferno', '15_14': 'Scroll of Decay', '15_15': 'Scroll of Ice Storm', '15_16': 'Scroll of Nova'
};

try {
  const catPath = path.join(__dirname, 'data', 'itemCatalog.json');
  if (fs.existsSync(catPath)) {
    const loaded = JSON.parse(fs.readFileSync(catPath, 'utf8'));
    SERVER_ITEM_NAMES = Object.assign({}, SERVER_ITEM_NAMES, loaded);
  }
} catch (_) {}

function decodeItemBasic(hex32) {
  if (!hex32 || hex32.length < 32 || /^F{32}$/i.test(hex32) || /^0{32}$/.test(hex32)) return null;
  const byte0Hex = parseInt(hex32.substring(0, 2), 16);
  if (byte0Hex === 0xFF) return null; // 0xFF en primer byte es slot vacío en MU Online
  const bytes = [];
  for (let i = 0; i < 32; i += 2) bytes.push(parseInt(hex32.substring(i, i + 2), 16));
  const byte0 = bytes[0];
  const byte1 = bytes[1];
  const byte7 = bytes[7];
  const byte9 = bytes[9];
  const group = (byte9 >> 4) & 0x0F;
  const index = byte0 | ((byte7 & 0x80) ? 0x100 : 0);
  const level = (byte1 >> 3) & 0x0F;
  const serial = ((bytes[3] << 24) | (bytes[4] << 16) | (bytes[5] << 8) | bytes[6]) >>> 0;
  const isExc = (byte7 & 0x3F) > 0;
  const name = SERVER_ITEM_NAMES[`${group}_${index}`] || `Item (${group}, ${index})`;
  return { group, index, level, serial, isExc, name, hex: hex32 };
}

function getItemDimensions(group, index) {
  if (group <= 5) {
    if (group === 0 && (index === 0 || index === 1)) return { w: 1, h: 2 };
    if (group === 4 && (index === 7 || index === 15)) return { w: 1, h: 2 };
    if (group === 0 && (index === 17 || index === 18 || index === 31)) return { w: 2, h: 4 };
    if (group === 3) return { w: 2, h: 4 };
    if (group === 2 && index === 13) return { w: 2, h: 4 };
    return { w: 2, h: 3 };
  }
  if (group === 6) return { w: 2, h: (index <= 5 ? 2 : 3) };
  if (group === 7) return { w: 2, h: 2 };
  if (group === 8) return { w: 2, h: (index <= 5 ? 2 : 3) };
  if (group === 9) return { w: 2, h: 2 };
  if (group === 10) return { w: 2, h: 2 };
  if (group === 11) return { w: 2, h: 2 };
  if (group === 12) {
    if (index <= 6 || (index >= 36 && index <= 43)) return { w: 3, h: 2 };
    return { w: 1, h: 1 };
  }
  if (group === 13) {
    if (index === 4 || index === 5 || index === 37) return { w: 2, h: 3 };
    if (index === 2 || index === 3) return { w: 1, h: 2 };
    return { w: 1, h: 1 };
  }
  if (group === 14) {
    if (index >= 17 && index <= 19) return { w: 1, h: 2 };
    if (index >= 23 && index <= 26) return { w: 1, h: 2 };
    return { w: 1, h: 1 };
  }
  if (group === 15) return { w: 1, h: 2 };
  return { w: 1, h: 1 };
}

// 1. Inyectar Ítem en Baúl (Item Maker Injector)
app.post('/api/tools/inject-item', async (req, res) => {
  try {
    const { accountId, itemHex, slot, warehouseIndex = 0, config } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'Cuenta (AccountID) requerida' });
    if (!itemHex || typeof itemHex !== 'string' || !/^[0-9A-Fa-f]{32}$/.test(itemHex.trim())) {
      return res.status(400).json({ success: false, error: 'Hex de ítem inválido (debe tener exactamente 32 caracteres hexadecimales)' });
    }
    let cleanItemHex = itemHex.trim().toUpperCase();
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const parsedTarget = decodeItemBasic(cleanItemHex);
    if (parsedTarget && parsedTarget.group < 14) {
      const freshSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
      const sHex = freshSerial.toString(16).padStart(8, '0').toUpperCase();
      cleanItemHex = cleanItemHex.substring(0, 6) + sHex + cleanItemHex.substring(14);
    }

    const wareIdx = parseInt(warehouseIndex, 10) || 0;

    const result = await executeSql(config, async (pool) => {
      let currentHex = '';
      if (wareIdx === 0) {
        const checkRes = await pool.request()
          .input('Acc', sql.VarChar(10), accountId.trim())
          .query('SELECT Items FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;');

        if (checkRes.recordset.length === 0) {
          currentHex = 'F'.repeat(3840);
          await pool.request()
            .input('Acc', sql.VarChar(10), accountId.trim())
            .query(`
              INSERT INTO warehouse (AccountID, Items, Money, EndUseDate)
              VALUES (@Acc, CONVERT(varbinary(1920), REPLICATE('FF', 1920), 2), 0, GETDATE());
            `);
        } else {
          const rawBuf = checkRes.recordset[0].Items;
          if (rawBuf && Buffer.isBuffer(rawBuf)) {
            currentHex = rawBuf.toString('hex').toUpperCase();
          } else if (typeof rawBuf === 'string') {
            currentHex = rawBuf.replace(/^0x/i, '').toUpperCase();
          }
        }
      } else {
        // Soporte ExtWarehouse
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExtWarehouse')
          BEGIN
            CREATE TABLE [dbo].[ExtWarehouse](
              [AccountID] [varchar](10) NOT NULL,
              [Number] [int] NOT NULL DEFAULT 0,
              [Items] [varbinary](1920) NULL,
              [Money] [int] NULL DEFAULT 0,
              CONSTRAINT [PK_ExtWarehouse] PRIMARY KEY CLUSTERED ([AccountID] ASC, [Number] ASC)
            );
          END
        `);
        const checkExt = await pool.request()
          .input('Acc', sql.VarChar(10), accountId.trim())
          .input('Num', sql.Int, wareIdx)
          .query('SELECT Items FROM ExtWarehouse WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;');

        if (checkExt.recordset.length === 0) {
          currentHex = 'F'.repeat(3840);
          await pool.request()
            .input('Acc', sql.VarChar(10), accountId.trim())
            .input('Num', sql.Int, wareIdx)
            .query(`
              INSERT INTO ExtWarehouse (AccountID, Number, Items, Money)
              VALUES (@Acc, @Num, CONVERT(varbinary(1920), REPLICATE('FF', 1920), 2), 0);
            `);
        } else {
          const rawBuf = checkExt.recordset[0].Items;
          if (rawBuf && Buffer.isBuffer(rawBuf)) {
            currentHex = rawBuf.toString('hex').toUpperCase();
          } else if (typeof rawBuf === 'string') {
            currentHex = rawBuf.replace(/^0x/i, '').toUpperCase();
          }
        }
      }

      const totalSlots = Math.max(120, Math.floor(currentHex.length / 32));
      const targetHexLength = totalSlots * 32;
      if (currentHex.length < targetHexLength) {
        currentHex = currentHex.padEnd(targetHexLength, 'F');
      }

      // Algoritmo de asignación 2D sin colisión para baúl 8x15 (120 slots por sección)
      const targetDims = parsedTarget ? getItemDimensions(parsedTarget.group, parsedTarget.index) : { w: 1, h: 1 };

      // Mapear todas las casillas ocupadas por ítems existentes en 2D
      const occupiedSlots = new Set();
      for (let s = 0; s < totalSlots; s++) {
        const chunk = currentHex.substring(s * 32, (s + 1) * 32);
        const item = decodeItemBasic(chunk);
        if (item) {
          const isExp = s >= 120;
          const baseOffset = isExp ? 120 : 0;
          const rel = s - baseOffset;
          const baseCol = rel % 8;
          const baseRow = Math.floor(rel / 8);
          const dims = getItemDimensions(item.group, item.index);
          for (let r = 0; r < dims.h; r++) {
            for (let c = 0; c < dims.w; c++) {
              if (baseCol + c < 8 && baseRow + r < 15) {
                occupiedSlots.add(baseOffset + (baseRow + r) * 8 + (baseCol + c));
              }
            }
          }
        }
      }

      let targetSlot = -1;
      if (slot !== undefined && slot !== null && slot >= 0 && slot < totalSlots) {
        targetSlot = slot;
      } else {
        // Buscar primer slot donde quepa targetDims (w x h) sin solapar
        for (let s = 0; s < totalSlots; s++) {
          const isExp = s >= 120;
          const baseOffset = isExp ? 120 : 0;
          const rel = s - baseOffset;
          const col = rel % 8;
          const row = Math.floor(rel / 8);
          if (col + targetDims.w <= 8 && row + targetDims.h <= 15) {
            let canFit = true;
            for (let r = 0; r < targetDims.h; r++) {
              for (let c = 0; c < targetDims.w; c++) {
                const checkS = baseOffset + (row + r) * 8 + (col + c);
                if (occupiedSlots.has(checkS)) {
                  canFit = false;
                  break;
                }
              }
              if (!canFit) break;
            }
            if (canFit) {
              targetSlot = s;
              break;
            }
          }
        }
      }

      if (targetSlot === -1) {
        throw new Error(`El baúl ${wareIdx === 0 ? 'principal' : 'extendido #' + wareIdx} está completamente lleno (${totalSlots} slots ocupados).`);
      }

      const newHex = currentHex.substring(0, targetSlot * 32) + cleanItemHex + currentHex.substring((targetSlot + 1) * 32);
      const newBuffer = Buffer.from(newHex, 'hex');
      const expectedByteLength = targetHexLength / 2;
      if (newBuffer.length !== expectedByteLength) {
        throw new Error(`Buffer de baúl resultante inválido (${newBuffer.length} bytes). Requerido ${expectedByteLength} bytes.`);
      }

      if (wareIdx === 0) {
        await pool.request()
          .input('Acc', sql.VarChar(10), accountId.trim())
          .input('ItemsHex', sql.VarChar, newHex)
          .query('UPDATE warehouse SET Items = CONVERT(VARBINARY(MAX), @ItemsHex, 2) WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;');
      } else {
        await pool.request()
          .input('Acc', sql.VarChar(10), accountId.trim())
          .input('Num', sql.Int, wareIdx)
          .input('ItemsHex', sql.VarChar, newHex)
          .query('UPDATE ExtWarehouse SET Items = CONVERT(VARBINARY(MAX), @ItemsHex, 2) WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;');
      }

      return { slot: targetSlot, wareIdx };
    });

    const targetDesc = wareIdx === 0 ? 'baúl principal' : `baúl extendido [ExtWarehouse] #${wareIdx}`;
    res.json({ success: true, slot: result.slot, message: `Ítem inyectado en slot ${result.slot} del ${targetDesc} de '${accountId}'.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Buscador Global de Ítems (warehouse, ExtWarehouse & Character)
app.post('/api/tools/search-items', async (req, res) => {
  try {
    const { query, searchType = 'all', config } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Término de búsqueda requerido' });
    }
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const rawTrimmed = query.trim();
    const cleanHex = rawTrimmed.replace(/^0x/i, '').toUpperCase();
    const qLower = rawTrimmed.toLowerCase();

    // Comprobar si es número decimal estricto (ej. "442643")
    const isStrictDecimal = /^\d+$/.test(rawTrimmed);
    const qDecimalNum = isStrictDecimal ? parseInt(rawTrimmed, 10) : -1;

    // Comprobar si es hexadecimal
    const isPureHex = /^[0-9A-F]+$/.test(cleanHex);
    const is32Hex = isPureHex && cleanHex.length === 32;
    const isPartialHex = isPureHex && cleanHex.length >= 4;
    const qHexSerial = (isPureHex && cleanHex.length <= 8) ? parseInt(cleanHex, 16) : -1;

    // Si es un hex completo de 32 caracteres, decodificar el serial y el ítem para búsqueda exhaustiva
    let targetHexSerial = -1;
    let targetHexGroup = -1;
    let targetHexIndex = -1;
    if (is32Hex) {
      const decodedTarget = decodeItemBasic(cleanHex);
      if (decodedTarget) {
        targetHexSerial = decodedTarget.serial;
        targetHexGroup = decodedTarget.group;
        targetHexIndex = decodedTarget.index;
      }
    }

    const matches = await executeSql(config, async (pool) => {
      const results = [];

      const checkMatch = (chunk, locInfo, accId, charName) => {
        if (/^F{32}$/i.test(chunk)) return;
        const parsed = decodeItemBasic(chunk);
        if (!parsed) return;

        const chunkUpper = chunk.toUpperCase();
        const hexExactMatch = is32Hex && (chunkUpper === cleanHex);
        const hexContainsMatch = isPartialHex && chunkUpper.includes(cleanHex);
        const serialMatch = 
          (qDecimalNum > 0 && parsed.serial === qDecimalNum) ||
          (qHexSerial > 0 && parsed.serial === qHexSerial) ||
          (targetHexSerial > 0 && parsed.serial === targetHexSerial);
        const itemTypeMatch = (targetHexGroup >= 0 && parsed.group === targetHexGroup && parsed.index === targetHexIndex);
        const nameMatch = parsed.name.toLowerCase().includes(qLower);
        const accountMatch = (accId && accId.toLowerCase().includes(qLower));
        const charMatch = (charName && charName.toLowerCase().includes(qLower));

        if (hexExactMatch || hexContainsMatch || serialMatch || (is32Hex && itemTypeMatch) || nameMatch || accountMatch || charMatch) {
          results.push({
            ...locInfo,
            accountId: accId,
            charName: charName || null,
            name: parsed.name,
            level: parsed.level,
            serial: parsed.serial,
            serialHex: parsed.serial.toString(16).toUpperCase().padStart(8, '0'),
            isExc: parsed.isExc,
            hex: chunkUpper,
          });
        }
      };

      // 1. Warehouse (Baúl 0)
      if (searchType === 'all' || searchType === 'warehouse') {
        const whQuery = await pool.request().query('SELECT AccountID, Items FROM warehouse WHERE Items IS NOT NULL;');
        for (const row of whQuery.recordset) {
          const buf = row.Items;
          if (!buf || !Buffer.isBuffer(buf)) continue;
          const hex = buf.toString('hex').toUpperCase();
          const totalSlots = Math.min(Math.floor(hex.length / 32), 120);
          for (let s = 0; s < totalSlots; s++) {
            checkMatch(hex.substring(s * 32, (s + 1) * 32), {
              location: 'Baúl #0',
              slot: s,
            }, row.AccountID, null);
          }
        }

        // 2. ExtWarehouse (Baúles 1, 2, 3...)
        try {
          const extCheck = await pool.request().query("SELECT 1 FROM sys.tables WHERE name = 'ExtWarehouse';");
          if (extCheck.recordset && extCheck.recordset.length > 0) {
            const extWh = await pool.request().query('SELECT AccountID, Number, Items FROM ExtWarehouse WHERE Items IS NOT NULL;');
            for (const row of extWh.recordset) {
              const buf = row.Items;
              if (!buf || !Buffer.isBuffer(buf)) continue;
              const hex = buf.toString('hex').toUpperCase();
              const totalSlots = Math.min(Math.floor(hex.length / 32), 120);
              for (let s = 0; s < totalSlots; s++) {
                checkMatch(hex.substring(s * 32, (s + 1) * 32), {
                  location: `Baúl #${row.Number || 1}`,
                  slot: s,
                }, row.AccountID, null);
              }
            }
          }
        } catch (e) {
          console.warn('Search in ExtWarehouse warning:', e.message);
        }
      }

      // 3. Character.Inventory (Equipo, Inventario, Mochilas, Store)
      if (searchType === 'all' || searchType === 'inventory') {
        const charQuery = await pool.request().query('SELECT AccountID, Name, Inventory FROM Character WHERE Inventory IS NOT NULL;');
        for (const row of charQuery.recordset) {
          const buf = row.Inventory;
          if (!buf || !Buffer.isBuffer(buf)) continue;
          const hex = buf.toString('hex').toUpperCase();
          const totalSlots = Math.floor(hex.length / 32);
          for (let s = 0; s < totalSlots; s++) {
            let slotLabel = `Slot ${s}`;
            if (s >= 0 && s <= 11) slotLabel = `Equipo #${s}`;
            else if (s >= 12 && s <= 75) slotLabel = `Inventario #${s - 12 + 1}`;
            else if (s >= 76 && s <= 107) slotLabel = `Tienda Personal #${s - 76 + 1}`;
            else if (s >= 108 && s <= 139) slotLabel = `Mochila 1 #${s - 108 + 1}`;
            else if (s >= 140 && s <= 171) slotLabel = `Mochila 2 #${s - 140 + 1}`;

            checkMatch(hex.substring(s * 32, (s + 1) * 32), {
              location: `Personaje: ${row.Name} [${slotLabel}]`,
              slot: s,
            }, row.AccountID, row.Name);
          }
        }
      }

      return results;
    });

    res.json({ success: true, count: matches.length, items: matches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Escáner de Dupeos (Anti-Dupe Tracker Optimizado con NOLOCK, Mutex y Caché)
let isDupeScanning = false;
let dupeScanCache = null;
let dupeScanCacheTime = 0;

app.post('/api/tools/scan-dupes', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const forceFresh = req.body?.forceFresh === true;
    const now = Date.now();

    // Caché de 60 segundos si no se solicita refresco forzado
    if (!forceFresh && dupeScanCache && (now - dupeScanCacheTime < 60000)) {
      return res.json({
        success: true,
        fromCache: true,
        cachedSecondsAgo: Math.round((now - dupeScanCacheTime) / 1000),
        count: dupeScanCache.count,
        dupes: dupeScanCache.dupes,
      });
    }

    // Semáforo (Mutex): evitar escaneos pesados concurrentes en SQL Server
    if (isDupeScanning) {
      if (dupeScanCache) {
        return res.json({
          success: true,
          fromCache: true,
          isBusyRefresing: true,
          count: dupeScanCache.count,
          dupes: dupeScanCache.dupes,
          message: 'Hay un escaneo en curso por otro administrador. Se muestran los últimos datos registrados.',
        });
      }
      return res.status(429).json({
        success: false,
        busy: true,
        message: 'Ya hay un escaneo de dupeos en curso ejecutado por otro administrador. Por favor aguarda unos momentos.',
      });
    }

    isDupeScanning = true;

    const dupes = await executeSql(req.body.config, async (pool) => {
      const serialMap = new Map();

      const indexItem = (chunk, locInfo) => {
        if (!chunk || chunk.length < 32) return;
        // En MU Online: 0xFF en primer byte, o todos F, o todos 0 representan slot vacío
        if (/^F{32}$/i.test(chunk) || /^0{32}$/.test(chunk)) return;
        const byte0 = parseInt(chunk.substring(0, 2), 16);
        if (byte0 === 0xFF) return; // Slot vacío

        const parsed = decodeItemBasic(chunk);
        if (!parsed) return;

        // 1. Excluir ítems no serializados de MU Online (Joyería básica/consumibles, pergaminos, flechas, etc.)
        if (parsed.group === 14 || parsed.group === 15) return;
        if (parsed.group === 4 && (parsed.index === 7 || parsed.index === 15)) return;
        if (parsed.group === 13 && (parsed.index === 14 || parsed.index === 15 || (parsed.index >= 29 && parsed.index <= 31))) return;

        // 2. Excluir seriales nulos, inválidos, ceros o comunes de NPC shop (<= 100 o FFFFFFFF)
        if (!parsed.serial || parsed.serial <= 100 || parsed.serial === 0xFFFFFFFF) return;

        // 3. Agrupar por Ítem + Serial (un ítem clonado real tiene el mismo serial Y es el mismo ítem)
        const itemKey = `${parsed.serial}_${parsed.group}_${parsed.index}`;
        if (!serialMap.has(itemKey)) {
          serialMap.set(itemKey, []);
        }
        serialMap.get(itemKey).push({
          ...locInfo,
          group: parsed.group,
          index: parsed.index,
          name: parsed.name,
          level: parsed.level,
          serial: parsed.serial,
          serialHex: parsed.serial.toString(16).toUpperCase().padStart(8, '0'),
          isExc: parsed.isExc,
          hex: chunk,
        });
      };

      // 1. Warehouse (Baúl 0) con WITH (NOLOCK) para no bloquear ni generar lag al juego
      const whQuery = await pool.request().query('SELECT AccountID, Items FROM warehouse WITH (NOLOCK) WHERE Items IS NOT NULL;');
      for (const row of whQuery.recordset) {
        const buf = row.Items;
        if (!buf || !Buffer.isBuffer(buf)) continue;
        const hex = buf.toString('hex').toUpperCase();
        const totalSlots = Math.min(Math.floor(hex.length / 32), 120);
        for (let s = 0; s < totalSlots; s++) {
          indexItem(hex.substring(s * 32, (s + 1) * 32), {
            location: 'Baúl #0',
            accountId: row.AccountID,
            slot: s,
          });
        }
      }

      // 2. ExtWarehouse (Baúles 1, 2, 3... con WITH (NOLOCK))
      try {
        const extCheck = await pool.request().query("SELECT 1 FROM sys.tables WITH (NOLOCK) WHERE name = 'ExtWarehouse';");
        if (extCheck.recordset && extCheck.recordset.length > 0) {
          const extWhQuery = await pool.request().query('SELECT AccountID, Number, Items FROM ExtWarehouse WITH (NOLOCK) WHERE Items IS NOT NULL AND Number > 0;');
          for (const row of extWhQuery.recordset) {
            const buf = row.Items;
            if (!buf || !Buffer.isBuffer(buf)) continue;
            const hex = buf.toString('hex').toUpperCase();
            const totalSlots = Math.min(Math.floor(hex.length / 32), 120);
            for (let s = 0; s < totalSlots; s++) {
              indexItem(hex.substring(s * 32, (s + 1) * 32), {
                location: `Baúl #${row.Number || 1}`,
                accountId: row.AccountID,
                slot: s,
              });
            }
          }
        }
      } catch (e) {
        console.warn('Dupe scan in ExtWarehouse warning:', e.message);
      }

      // 3. Character.Inventory (con WITH (NOLOCK) y clampeado a 172 slots Season 6)
      const charQuery = await pool.request().query('SELECT AccountID, Name, Inventory FROM Character WITH (NOLOCK) WHERE Inventory IS NOT NULL;');
      for (const row of charQuery.recordset) {
        const buf = row.Inventory;
        if (!buf || !Buffer.isBuffer(buf)) continue;
        const hex = buf.toString('hex').toUpperCase();
        const totalSlots = Math.min(Math.floor(hex.length / 32), 172);
        for (let s = 0; s < totalSlots; s++) {
          let slotLabel = `Slot ${s}`;
          if (s >= 0 && s <= 11) slotLabel = `Equipo #${s}`;
          else if (s >= 12 && s <= 75) slotLabel = `Inventario #${s - 12 + 1}`;
          else if (s >= 76 && s <= 107) slotLabel = `Tienda Personal #${s - 76 + 1}`;
          else if (s >= 108 && s <= 139) slotLabel = `Mochila 1 #${s - 108 + 1}`;
          else if (s >= 140 && s <= 171) slotLabel = `Mochila 2 #${s - 140 + 1}`;

          indexItem(hex.substring(s * 32, (s + 1) * 32), {
            location: `Personaje: ${row.Name} [${slotLabel}]`,
            accountId: row.AccountID,
            charName: row.Name,
            slot: s,
          });
        }
      }

      const duplicateGroups = [];
      for (const [itemKey, items] of serialMap.entries()) {
        if (items.length > 1) {
          const uniqueSlots = new Set(items.map(i => `${i.accountId}_${i.location}_${i.slot}`));
          if (uniqueSlots.size > 1) {
            const first = items[0];
            duplicateGroups.push({
              serial: first.serial,
              serialHex: first.serialHex,
              itemName: first.name,
              count: items.length,
              items,
            });
          }
        }
      }

      duplicateGroups.sort((a, b) => b.count - a.count);
      return duplicateGroups;
    });

    dupeScanCache = { count: dupes.length, dupes };
    dupeScanCacheTime = Date.now();
    res.json({ success: true, count: dupes.length, dupes });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    isDupeScanning = false;
  }
});

// =========================================================================
// SISTEMA DE CANDADOS SUAVES EN MEMORIA (SOFT-LOCK MULTI-ADMIN)
// =========================================================================
// Mantiene en RAM de Node.js qué personaje o cuenta está siendo editado
// por un administrador, con caducidad automática a los 120 segundos.
const activeEditorLocks = new Map();

function cleanupExpiredLocks() {
  const now = Date.now();
  for (const [target, info] of activeEditorLocks.entries()) {
    if (now > info.expiresAt) {
      activeEditorLocks.delete(target);
    }
  }
}

// Adquirir o renovar un candado suave
app.post('/api/editor/lock', (req, res) => {
  try {
    cleanupExpiredLocks();
    const { target, adminName, deviceHwid } = req.body || {};
    if (!target) return res.status(400).json({ success: false, error: 'target requerido (ej: Character:Conan)' });

    const cleanTarget = target.trim();
    const cleanAdmin = (adminName || 'Otro Administrador').trim();
    const cleanDevice = (deviceHwid || '').trim();
    const now = Date.now();

    const existing = activeEditorLocks.get(cleanTarget);
    if (existing && existing.deviceHwid && cleanDevice && existing.deviceHwid !== cleanDevice && now < existing.expiresAt) {
      const remainingSec = Math.max(1, Math.round((existing.expiresAt - now) / 1000));
      const elapsedSec = Math.max(0, Math.round((now - existing.acquiredAt) / 1000));
      return res.json({
        success: true,
        locked: true,
        holder: existing.adminName,
        elapsedSec,
        remainingSec,
        message: `${cleanTarget} está siendo editado por ${existing.adminName} (hace ${elapsedSec}s).`,
      });
    }

    // Adquirir o extender candado por 120 segundos
    const lockInfo = {
      target: cleanTarget,
      adminName: cleanAdmin,
      deviceHwid: cleanDevice,
      acquiredAt: existing ? existing.acquiredAt : now,
      expiresAt: now + 120000,
    };
    activeEditorLocks.set(cleanTarget, lockInfo);

    res.json({
      success: true,
      locked: false,
      expiresInSec: 120,
      lockInfo,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Liberar candado suave al salir de la pantalla
app.post('/api/editor/unlock', (req, res) => {
  try {
    const { target, deviceHwid } = req.body || {};
    if (!target) return res.status(400).json({ success: false, error: 'target requerido' });

    const cleanTarget = target.trim();
    const cleanDevice = (deviceHwid || '').trim();
    const existing = activeEditorLocks.get(cleanTarget);

    if (existing) {
      if (!cleanDevice || existing.deviceHwid === cleanDevice) {
        activeEditorLocks.delete(cleanTarget);
      }
    }

    res.json({ success: true, message: 'Candado liberado.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Consultar estado de candado de un objetivo
app.get('/api/editor/status', (req, res) => {
  try {
    cleanupExpiredLocks();
    const target = (req.query.target || '').trim();
    if (!target) return res.status(400).json({ success: false, error: 'target requerido' });

    const existing = activeEditorLocks.get(target);
    const now = Date.now();
    if (existing && now < existing.expiresAt) {
      const remainingSec = Math.max(1, Math.round((existing.expiresAt - now) / 1000));
      const elapsedSec = Math.max(0, Math.round((now - existing.acquiredAt) / 1000));
      return res.json({
        success: true,
        locked: true,
        holder: existing.adminName,
        elapsedSec,
        remainingSec,
      });
    }

    res.json({ success: true, locked: false });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Rankings en Vivo
app.post('/api/tools/rankings', async (req, res) => {
  try {
    const { type = 'resets', config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const rankings = await executeSql(config, async (pool) => {
      // 1. Detectar tablas disponibles
      const tablesRes = await pool.request().query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME IN ('Character', 'MEMB_STAT', 'Guild');
      `);
      const tables = new Set((tablesRes.recordset || []).map(r => r.TABLE_NAME.toUpperCase()));

      if (type === 'guilds') {
        if (!tables.has('GUILD')) return [];
        const guildColsRes = await pool.request().query(`
          SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Guild');
        `);
        const guildCols = new Set((guildColsRes.recordset || []).map(r => r.name.toLowerCase()));
        const nameCol = guildCols.has('g_name') ? 'G_Name' : (guildCols.has('name') ? 'Name' : "'' AS G_Name");
        const masterCol = guildCols.has('g_master') ? 'G_Master' : (guildCols.has('master') ? 'Master' : "'' AS G_Master");
        const scoreCol = guildCols.has('g_score') ? 'ISNULL(G_Score, 0)' : (guildCols.has('score') ? 'ISNULL(Score, 0)' : '0');
        const countCol = guildCols.has('g_count') ? 'ISNULL(G_Count, 0)' : (guildCols.has('count') ? 'ISNULL(Count, 0)' : '0');

        const gQuery = `
          SELECT TOP 20 
            ${nameCol} AS G_Name, 
            ${masterCol} AS G_Master, 
            ${scoreCol} AS G_Score, 
            ${countCol} AS G_Count
          FROM Guild
          ORDER BY ${scoreCol} DESC, ${countCol} DESC;
        `;
        const result = await pool.request().query(gQuery);
        return result.recordset;
      }

      if (!tables.has('CHARACTER')) return [];

      // 2. Detectar columnas disponibles en Character
      const colsRes = await pool.request().query(`
        SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');
      `);
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));

      let resetExpr = '0';
      if (charCols.has('resetcount')) resetExpr = 'ISNULL(c.ResetCount, 0)';
      else if (charCols.has('resets')) resetExpr = 'ISNULL(c.Resets, 0)';

      let mresetExpr = '0';
      if (charCols.has('masterresetcount')) mresetExpr = 'ISNULL(c.MasterResetCount, 0)';
      else if (charCols.has('mresetcount')) mresetExpr = 'ISNULL(c.MResetCount, 0)';

      const hasMembStat = tables.has('MEMB_STAT');

      if (type === 'resets' || type === 'mresets') {
        const orderExpr = type === 'mresets'
          ? (mresetExpr !== '0' ? `${mresetExpr} DESC, ${resetExpr} DESC, c.cLevel DESC` : `${resetExpr} DESC, c.cLevel DESC`)
          : `${resetExpr} DESC, c.cLevel DESC`;

        const query = `
          SELECT TOP 20 
            c.Name, 
            c.Class, 
            c.cLevel, 
            ${resetExpr} AS ResetCount,
            ${mresetExpr} AS MasterResetCount,
            ${hasMembStat ? 'ISNULL(s.ConnectStat, 0)' : '0'} AS ConnectStat,
            c.AccountID
          FROM Character c
          ${hasMembStat ? 'LEFT JOIN MEMB_STAT s ON c.AccountID = s.memb___id' : ''}
          ORDER BY ${orderExpr};
        `;
        const result = await pool.request().query(query);
        return result.recordset;
      }

      if (type === 'pk') {
        const pkCountExpr = charCols.has('pkcount') ? 'ISNULL(c.PkCount, 0)' : '0';
        const pkLevelExpr = charCols.has('pklevel') ? 'ISNULL(c.PkLevel, 3)' : '3';
        const pkTimeExpr = charCols.has('pktime') ? 'ISNULL(c.PkTime, 0)' : '0';

        const query = `
          SELECT TOP 20 
            c.Name, 
            c.Class, 
            c.cLevel, 
            ${pkCountExpr} AS PkCount,
            ${pkLevelExpr} AS PkLevel,
            ${pkTimeExpr} AS PkTime,
            c.AccountID
          FROM Character c
          WHERE ${pkCountExpr} > 0 OR ${pkLevelExpr} > 3
          ORDER BY ${pkCountExpr} DESC, ${pkLevelExpr} DESC;
        `;
        const result = await pool.request().query(query);
        return result.recordset;
      }

      return [];
    });

    res.json({ success: true, type, rankings: rankings || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Limpieza de PK (PK Clear 1-Clic)
app.post('/api/tools/pk-clear', async (req, res) => {
  try {
    const { charName, config } = req.body;
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      await pool.request()
        .input('Name', sql.VarChar(10), charName.trim())
        .query('UPDATE Character SET PkLevel = 3, PkCount = 0, PkTime = 0 WHERE Name = @Name;');
    });

    res.json({ success: true, message: `Estado asesino (PK) limpiado para '${charName}'.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Rescate de Personaje a Lorencia (Dinámico y Seguro)
app.post('/api/tools/rescue-char', async (req, res) => {
  try {
    const { charName, config } = req.body;
    if (!charName) return res.status(400).json({ success: false, error: 'Nombre de personaje requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      const colsRes = await pool.request().query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');");
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));
      const hasMapPosX = charCols.has('mapposx');
      const hasMapX = charCols.has('mapx');
      const hasMapDir = charCols.has('mapdir');

      let updateParts = ['MapNumber = 0'];
      if (hasMapPosX) updateParts.push('MapPosX = 125');
      if (hasMapX) updateParts.push('MapX = 125');
      if (charCols.has('mapposy')) updateParts.push('MapPosY = 125');
      if (charCols.has('mapy')) updateParts.push('MapY = 125');
      if (hasMapDir) updateParts.push('MapDir = 0');

      await pool.request()
        .input('Name', sql.VarChar(10), charName.trim())
        .query(`
          DECLARE @Acc VARCHAR(10);
          SELECT TOP 1 @Acc = AccountID FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;

          UPDATE Character 
          SET ${updateParts.join(', ')} 
          WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;

          -- Desconectar sesión activa para que el GameServer no sobrescriba las coordenadas
          IF @Acc IS NOT NULL
          BEGIN
            UPDATE MEMB_STAT SET ConnectStat = 0 WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
            IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
              UPDATE AccountCharacter SET GameIDC = NULL WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;
          END
        `);
    });

    res.json({ success: true, message: `'${charName}' rescatado y enviado a Lorencia (125, 125).` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Limpiar Hex Corrupto / Vaciar Inventario o Baúl (H18)
app.post('/api/tools/clean-hex', async (req, res) => {
  try {
    const { targetType, targetId, config } = req.body;
    if (!targetType || !targetId) {
      return res.status(400).json({ success: false, error: 'Tipo (warehouse/inventory) y destino requeridos' });
    }
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    let backupHex = '';

    await executeSql(config, async (pool) => {
      // H14: Verificar que el jugador/cuenta no esté conectado
      if (targetType === 'warehouse') {
        const connCheck = await pool.request()
          .input('Acc', sql.VarChar(10), targetId.trim())
          .query(`
            IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'MEMB_STAT')
              SELECT ConnectStat FROM MEMB_STAT WHERE memb___id = @Acc;
            ELSE
              SELECT 0 AS ConnectStat;
          `);
        if (connCheck.recordset && connCheck.recordset[0] && connCheck.recordset[0].ConnectStat === 1) {
          throw new Error('La cuenta está conectada en el juego. Debe desconectarse antes de vaciar el baúl.');
        }

        const currentRes = await pool.request()
          .input('Acc', sql.VarChar(10), targetId.trim())
          .query('SELECT CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex FROM warehouse WHERE AccountID = @Acc;');
        if (currentRes.recordset && currentRes.recordset[0]) {
          backupHex = currentRes.recordset[0].ItemsHex || '';
        }

        const cleanBuf = Buffer.alloc(1920, 0xFF);
        await pool.request()
          .input('Acc', sql.VarChar(10), targetId.trim())
          .input('CleanItems', sql.VarBinary(1920), cleanBuf)
          .query('UPDATE warehouse SET Items = @CleanItems WHERE AccountID = @Acc;');
      } else {
        const charRes = await pool.request()
          .input('Name', sql.VarChar(10), targetId.trim())
          .query(`
            SELECT c.AccountID, DATALENGTH(c.Inventory) AS InvLen, CONVERT(VARCHAR(MAX), c.Inventory, 2) AS InvHex,
                   ISNULL(m.ConnectStat, 0) AS ConnectStat
            FROM Character c
            LEFT JOIN MEMB_STAT m ON c.AccountID = m.memb___id
            WHERE c.Name = @Name;
          `);
        
        if (charRes.recordset.length === 0) {
          throw new Error(`Personaje '${targetId}' no encontrado.`);
        }

        if (charRes.recordset[0].ConnectStat === 1) {
          throw new Error('El personaje o su cuenta está en línea. Debe salir del juego antes de vaciar el inventario.');
        }

        backupHex = charRes.recordset[0].InvHex || '';
        const invLen = charRes.recordset[0].InvLen || 3776;
        const cleanBuf = Buffer.alloc(invLen, 0xFF);

        await pool.request()
          .input('Name', sql.VarChar(10), targetId.trim())
          .input('CleanInv', sql.VarBinary(invLen), cleanBuf)
          .query('UPDATE Character SET Inventory = @CleanInv WHERE Name = @Name;');
      }
    });

    const clientIp = getClientIp(req);
    addAuditLog('CLEAN_HEX', targetId, clientIp, `Vaciado total de ${targetType} para ${targetId}. Backup length: ${backupHex.length}`);

    res.json({
      success: true,
      backupHex,
      message: `Vaciado completado a 0xFF para ${targetType === 'warehouse' ? 'Baúl' : 'Inventario'} de '${targetId}'. Se guardó copia previa de respaldo.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint de Migración de Esquema explícita (H17)
app.post('/api/admin/migrate-schema', async (req, res) => {
  try {
    const { config } = req.body || {};
    const key = req.headers['x-admin-key'];
    if (!isValidAdminKey(key)) {
      return res.status(401).json({ success: false, error: 'No autorizado. Se requiere X-Admin-Key válida.' });
    }
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      await pool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'ExtWarehouse')
        BEGIN
          CREATE TABLE [dbo].[ExtWarehouse](
            [AccountID] [varchar](10) NOT NULL,
            [Number] [int] NOT NULL DEFAULT 0,
            [Items] [varbinary](1920) NULL,
            [Money] [int] NULL DEFAULT 0,
            CONSTRAINT [PK_ExtWarehouse] PRIMARY KEY CLUSTERED ([AccountID] ASC, [Number] ASC)
          );
        END

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND name = 'WarehouseCount')
        BEGIN
          ALTER TABLE MEMB_INFO ADD WarehouseCount INT NOT NULL DEFAULT 1;
        END

        IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND name = 'ExtWarehouse')
        BEGIN
          ALTER TABLE AccountCharacter ADD ExtWarehouse TINYINT NOT NULL DEFAULT 0;
        END
      `);
    });

    res.json({ success: true, message: 'Esquema migrado exitosamente (ExtWarehouse y MEMB_INFO.WarehouseCount creados o verificados).' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Backup de Emergencia SQL Server
app.post('/api/tools/db-backup', async (req, res) => {
  try {
    const { dbName = 'MuOnline', config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const safeDb = (dbName || 'MuOnline').replace(/[^a-zA-Z0-9_]/g, '');
    const backupFileName = `${safeDb}_Backup_${Date.now()}.bak`;

    const result = await executeSql(config, async (pool) => {
      const backupPath = `C:\\${backupFileName}`;
      await pool.request().query(`
        BACKUP DATABASE [${safeDb}] 
        TO DISK = '${backupPath}' 
        WITH NOFORMAT, NOINIT, NAME = '${safeDb}-Emergency-Backup', SKIP, NOREWIND, NOUNLOAD, STATS = 10;
      `);
      return { backupPath };
    });

    res.json({ success: true, message: `Backup generado exitosamente en: ${result.backupPath}`, backupPath: result.backupPath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Capabilities / Contrato Común Versionado (H21)
function getCapabilities(serviceName) {
  return {
    success: true,
    service: serviceName,
    version: '1.1.2',
    build: 16,
    capabilities: {
      accounts: true,
      characters: true,
      inventory: true,
      warehouse: true,
      extWarehouse: true,
      updateProgress: true,
      updateQuest: true,
      cleanHex: true,
      injectItem: true,
      unlockSlots: true,
      concurrencyProtection: true,
      safeHexPatching: true,
      schemaMigration: true
    }
  };
}


// =========================================================================
// MÓDULOS DE ADMINISTRACIÓN AVANZADA - 14 MÓDULOS (MU MANAGER PRO OFICIAL)
// =========================================================================

const SCHEDULES_FILE = path.join(__dirname, 'data', 'eventSchedules.json');

function loadEventSchedules() {
  try {
    if (fs.existsSync(SCHEDULES_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULES_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveEventSchedules(schedules) {
  try {
    const dir = path.dirname(SCHEDULES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SCHEDULES_FILE, JSON.stringify(schedules, null, 2), 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

// 0.1 ACREDITAR GCOINS A CUENTA
app.post('/api/accounts/add-gcoins', async (req, res) => {
  try {
    const { accountId, amount, config } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId requerido' });
    const addAmt = parseInt(amount, 10) || 0;
    if (addAmt <= 0) return res.status(400).json({ success: false, error: 'Cantidad inválida' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    let newBal = 0;
    await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('Acc', sql.VarChar(10), accountId.trim())
        .input('Amt', sql.Int, addAmt)
        .query(`
          IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CashShopData')
          BEGIN
            IF EXISTS (SELECT 1 FROM CashShopData WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc)
            BEGIN
              UPDATE CashShopData SET WCoinC = ISNULL(WCoinC, 0) + @Amt WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
              SELECT WCoinC FROM CashShopData WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
            END
            ELSE
            BEGIN
              INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint) VALUES (@Acc, @Amt, 0, 0);
              SELECT @Amt AS WCoinC;
            END
          END
          ELSE
          BEGIN
            SELECT @Amt AS WCoinC;
          END
        `);
      newBal = (r.recordset && r.recordset[0] && r.recordset[0].WCoinC) || addAmt;
    });

    res.json({ success: true, message: `${addAmt} GCoins acreditados a '${accountId}'.`, newBalance: newBal });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 1. GESTIÓN INTEGRAL DE GUILDS / CLANES (100% NATIVO EN SQL SERVER)
app.post('/api/guilds', async (req, res) => {
  try {
    const { config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const guilds = await executeSql(config, async (pool) => {
      const check = await pool.request().query("SELECT OBJECT_ID('Guild', 'U') AS HasGuild, OBJECT_ID('GuildMember', 'U') AS HasMember;");
      const hasGuild = check.recordset && check.recordset[0] && check.recordset[0].HasGuild;
      if (!hasGuild) return [];

      const r = await pool.request().query(`
        SELECT 
          LTRIM(RTRIM(G_Name)) AS name,
          LTRIM(RTRIM(G_Name)) AS G_Name,
          LTRIM(RTRIM(G_Master)) AS master,
          LTRIM(RTRIM(G_Master)) AS G_Master,
          ISNULL(G_Score, 0) AS score,
          ISNULL(G_Score, 0) AS G_Score,
          ISNULL(G_Notice, '') AS notice,
          ISNULL(G_Notice, '') AS G_Notice,
          (SELECT COUNT(*) FROM GuildMember WHERE LTRIM(RTRIM(G_Name)) = LTRIM(RTRIM(Guild.G_Name)) OR G_Name = Guild.G_Name) AS memberCount
        FROM Guild
        ORDER BY score DESC, memberCount DESC;
      `);
      return r.recordset || [];
    });

    res.json({ success: true, guilds: guilds || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/guilds/members', async (req, res) => {
  try {
    const { guildName, config } = req.body;
    if (!guildName) return res.status(400).json({ success: false, error: 'guildName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const members = await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('GName', sql.VarChar(10), guildName.trim())
        .query(`
          SELECT 
            LTRIM(RTRIM(gm.Name)) AS name,
            LTRIM(RTRIM(gm.Name)) AS Name,
            ISNULL(gm.G_Status, 0) AS status,
            ISNULL(gm.G_Status, 0) AS G_Status,
            ISNULL(c.cLevel, 1) AS level,
            ISNULL(c.cLevel, 1) AS cLevel,
            ISNULL(c.Class, 0) AS class,
            ISNULL(c.Class, 0) AS Class,
            ISNULL(c.ResetCount, 0) AS resets
          FROM GuildMember gm
          LEFT JOIN Character c ON (LTRIM(RTRIM(gm.Name)) = LTRIM(RTRIM(c.Name)) OR gm.Name = c.Name)
          WHERE LTRIM(RTRIM(gm.G_Name)) = LTRIM(RTRIM(@GName)) OR gm.G_Name = @GName
          ORDER BY gm.G_Status DESC, level DESC;
        `);
      return r.recordset || [];
    });

    res.json({ success: true, members: members || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/guilds/delete', async (req, res) => {
  try {
    const { guildName, config } = req.body;
    if (!guildName) return res.status(400).json({ success: false, error: 'guildName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      await pool.request()
        .input('GName', sql.VarChar(10), guildName.trim())
        .query(`
          DELETE FROM GuildMember WHERE LTRIM(RTRIM(G_Name)) = LTRIM(RTRIM(@GName)) OR G_Name = @GName;
          DELETE FROM Guild WHERE LTRIM(RTRIM(G_Name)) = LTRIM(RTRIM(@GName)) OR G_Name = @GName;
        `);
    });

    res.json({ success: true, message: `Clan '${guildName}' eliminado de la base de datos con éxito.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. CONTROL Y LIMPIEZA DE ASESINOS / PK (100% NATIVO EN SQL SERVER)
app.post('/api/pk/list', async (req, res) => {
  try {
    const { config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const pks = await executeSql(config, async (pool) => {
      const r = await pool.request().query(`
        SELECT TOP 50
          LTRIM(RTRIM(Name)) AS charName,
          LTRIM(RTRIM(AccountID)) AS accountId,
          ISNULL(Class, 0) AS class,
          ISNULL(cLevel, 1) AS level,
          ISNULL(PkLevel, 3) AS pkLevel,
          ISNULL(PkCount, 0) AS pkCount,
          ISNULL(PkTime, 0) AS pkTime
        FROM Character
        WHERE PkLevel > 3 OR PkCount > 0
        ORDER BY PkCount DESC, PkLevel DESC;
      `);
      return r.recordset || [];
    });

    res.json({ success: true, pks: pks || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/pk/clear', async (req, res) => {
  try {
    const { charName, config, all = false } = req.body;
    if (!all && !charName) return res.status(400).json({ success: false, error: 'charName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      if (all) {
        await pool.request().query(`
          UPDATE Character 
          SET PkLevel = 3, PkCount = 0, PkTime = 0 
          WHERE PkLevel > 3 OR PkCount > 0;
        `);
      } else {
        await pool.request()
          .input('Name', sql.VarChar(10), charName.trim())
          .query(`
            UPDATE Character 
            SET PkLevel = 3, PkCount = 0, PkTime = 0 
            WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;
          `);
      }
    });

    res.json({
      success: true,
      message: all ? 'Todos los asesinos (PK) han sido limpiados y perdonados.' : `Estado de asesino (PK) limpiado para '${charName}'.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. JUGADORES ONLINE EN VIVO (CONECTADOS)
app.post('/api/players/online', async (req, res) => {
  try {
    const { config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const players = await executeSql(config, async (pool) => {
      // 1. Detectar tabla MEMB_STAT (MuOnline o Me_MuOnline)
      const statTableCheck = await pool.request().query(`
        SELECT 
          CASE 
            WHEN OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL THEN 'MEMB_STAT'
            WHEN OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') IS NOT NULL THEN 'Me_MuOnline.dbo.MEMB_STAT'
            WHEN OBJECT_ID('MuOnline.dbo.MEMB_STAT', 'U') IS NOT NULL THEN 'MuOnline.dbo.MEMB_STAT'
            ELSE NULL 
          END AS StatTable,
          CASE
            WHEN OBJECT_ID('AccountCharacter', 'U') IS NOT NULL THEN 'AccountCharacter'
            WHEN OBJECT_ID('Me_MuOnline.dbo.AccountCharacter', 'U') IS NOT NULL THEN 'Me_MuOnline.dbo.AccountCharacter'
            WHEN OBJECT_ID('MuOnline.dbo.AccountCharacter', 'U') IS NOT NULL THEN 'MuOnline.dbo.AccountCharacter'
            ELSE NULL
          END AS AccCharTable;
      `);

      const statTable = (statTableCheck.recordset && statTableCheck.recordset[0] && statTableCheck.recordset[0].StatTable) || 'MEMB_STAT';
      const accCharTable = (statTableCheck.recordset && statTableCheck.recordset[0] && statTableCheck.recordset[0].AccCharTable) || null;

      // 2. Detectar columnas de coordenadas y stats en Character
      const colsRes = await pool.request().query("SELECT name FROM sys.columns WHERE object_id = OBJECT_ID('Character');");
      const charCols = new Set((colsRes.recordset || []).map(r => r.name.toLowerCase()));
      const xCol = charCols.has('mapposx') ? 'c.MapPosX' : (charCols.has('mapx') ? 'c.MapX' : '125');
      const yCol = charCols.has('mapposy') ? 'c.MapPosY' : (charCols.has('mapy') ? 'c.MapY' : '125');
      const resetCol = charCols.has('resetcount') ? 'ISNULL(c.ResetCount, 0)' : (charCols.has('resets') ? 'ISNULL(c.Resets, 0)' : '0');
      const moneyCol = charCols.has('money') ? 'ISNULL(c.Money, 0)' : '0';
      const ctlCol = charCols.has('ctlcode') ? 'ISNULL(c.CtlCode, 0)' : '0';
      const pkCol = charCols.has('pkcount') ? 'ISNULL(c.PkCount, 0)' : '0';
      const strCol = charCols.has('strength') ? 'ISNULL(c.Strength, 0)' : '0';
      const agiCol = charCols.has('dexterity') ? 'ISNULL(c.Dexterity, 0)' : '0';
      const vitCol = charCols.has('vitality') ? 'ISNULL(c.Vitality, 0)' : '0';
      const eneCol = charCols.has('energy') ? 'ISNULL(c.Energy, 0)' : '0';
      const cmdCol = charCols.has('leadership') ? 'ISNULL(c.Leadership, 0)' : '0';

      let query = '';
      if (accCharTable) {
        query = `
          SELECT DISTINCT
            ISNULL(c.Name, ISNULL(NULLIF(LTRIM(RTRIM(ac.GameIDC)), ''), s.memb___id)) AS charName,
            s.memb___id AS accountId,
            ISNULL(c.Class, 0) AS class,
            ISNULL(c.cLevel, 1) AS level,
            ISNULL(s.ServerName, 'GameServer') AS serverName,
            ISNULL(s.IP, '127.0.0.1') AS ip,
            ISNULL(c.MapNumber, 0) AS mapNumber,
            ISNULL(${xCol}, 125) AS mapX,
            ISNULL(${yCol}, 125) AS mapY,
            ISNULL(CONVERT(VARCHAR(19), s.ConnectTM, 120), CONVERT(VARCHAR(19), GETDATE(), 120)) AS connectTime,
            ${resetCol} AS resets,
            ${moneyCol} AS money,
            ${ctlCol} AS ctlCode,
            ${pkCol} AS pkCount,
            ${strCol} AS strength,
            ${agiCol} AS dexterity,
            ${vitCol} AS vitality,
            ${eneCol} AS energy,
            ${cmdCol} AS leadership
          FROM ${statTable} s
          LEFT JOIN ${accCharTable} ac ON (LTRIM(RTRIM(s.memb___id)) = LTRIM(RTRIM(ac.Id)) OR s.memb___id = ac.Id)
          OUTER APPLY (
            SELECT TOP 1 *
            FROM Character c
            WHERE (
              (ac.GameIDC IS NOT NULL AND LEN(LTRIM(RTRIM(ac.GameIDC))) > 0 AND (LTRIM(RTRIM(c.Name)) = LTRIM(RTRIM(ac.GameIDC)) OR c.Name = ac.GameIDC))
              OR
              ((ac.GameIDC IS NULL OR LEN(LTRIM(RTRIM(ac.GameIDC))) = 0) AND (LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(s.memb___id)) OR c.AccountID = s.memb___id))
            )
            ORDER BY 
              CASE WHEN ac.GameIDC IS NOT NULL AND (LTRIM(RTRIM(c.Name)) = LTRIM(RTRIM(ac.GameIDC)) OR c.Name = ac.GameIDC) THEN 0 ELSE 1 END,
              c.cLevel DESC
          ) c
          WHERE s.ConnectStat = 1 OR s.ConnectStat = '1';
        `;
      } else {
        query = `
          SELECT DISTINCT
            ISNULL(c.Name, s.memb___id) AS charName,
            s.memb___id AS accountId,
            ISNULL(c.Class, 0) AS class,
            ISNULL(c.cLevel, 1) AS level,
            ISNULL(s.ServerName, 'GameServer') AS serverName,
            ISNULL(s.IP, '127.0.0.1') AS ip,
            ISNULL(c.MapNumber, 0) AS mapNumber,
            ISNULL(${xCol}, 125) AS mapX,
            ISNULL(${yCol}, 125) AS mapY,
            ISNULL(CONVERT(VARCHAR(19), s.ConnectTM, 120), CONVERT(VARCHAR(19), GETDATE(), 120)) AS connectTime,
            ${resetCol} AS resets,
            ${moneyCol} AS money,
            ${ctlCol} AS ctlCode,
            ${pkCol} AS pkCount,
            ${strCol} AS strength,
            ${agiCol} AS dexterity,
            ${vitCol} AS vitality,
            ${eneCol} AS energy,
            ${cmdCol} AS leadership
          FROM ${statTable} s
          OUTER APPLY (
            SELECT TOP 1 *
            FROM Character c
            WHERE (LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(s.memb___id)) OR c.AccountID = s.memb___id)
            ORDER BY c.cLevel DESC
          ) c
          WHERE s.ConnectStat = 1 OR s.ConnectStat = '1';
        `;
      }

      const r = await pool.request().query(query);
      return r.recordset || [];
    });

    res.json({ success: true, players: players || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// 6. DESCONEXIÓN FORZADA DE JUGADOR (KICK)
app.post('/api/players/kick', async (req, res) => {
  try {
    const { charName, config } = req.body;
    if (!charName) return res.status(400).json({ success: false, error: 'charName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    await executeSql(config, async (pool) => {
      await pool.request()
        .input('Name', sql.VarChar(10), charName.trim())
        .query(`
          DECLARE @Acc VARCHAR(10);
          SELECT TOP 1 @Acc = AccountID FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;
          IF @Acc IS NOT NULL
          BEGIN
            UPDATE MEMB_STAT SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE()
            WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;

            IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
              UPDATE AccountCharacter SET GameIDC = NULL WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;
          END
        `);
    });

    res.json({ success: true, message: `Jugador '${charName}' desconectado del servidor (ConnectStat = 0).` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. STARTER KIT: ENTREGA TOTALMENTE CONFIGURABLE EN BAÚL
app.post('/api/kit/deliver', async (req, res) => {
  try {
    const { accountId, kitHexItems = [], zen, gcoins, wCoinP, goblinPoints, ruud, warehouseIndex = 0, config } = req.body;
    if (!accountId) return res.status(400).json({ success: false, error: 'accountId requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const cleanAcc = accountId.trim();
    const wareIdx = parseInt(warehouseIndex, 10) || 0;
    let delivered = 0;
    let failed = 0;

    await executeSql(config, async (pool) => {
      // 1. Obtener o inicializar Warehouse (Principal o Extendido)
      let currentHex = '';
      let currentMoney = 0;

      if (wareIdx === 0) {
        const whRes = await pool.request()
          .input('Acc', sql.VarChar(10), cleanAcc)
          .query('SELECT AccountID, Money, CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;');

        if (whRes.recordset && whRes.recordset[0] && whRes.recordset[0].ItemsHex) {
          currentHex = whRes.recordset[0].ItemsHex.toUpperCase();
          currentMoney = whRes.recordset[0].Money || 0;
        } else {
          currentHex = 'F'.repeat(3840);
        }
      } else {
        // Auto-crear ExtWarehouse si no existe
        await pool.request().query(`
          IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExtWarehouse')
          BEGIN
            CREATE TABLE [dbo].[ExtWarehouse](
              [AccountID] [varchar](10) NOT NULL,
              [Number] [int] NOT NULL DEFAULT 0,
              [Items] [varbinary](1920) NULL,
              [Money] [int] NULL DEFAULT 0,
              CONSTRAINT [PK_ExtWarehouse] PRIMARY KEY CLUSTERED ([AccountID] ASC, [Number] ASC)
            );
          END
        `);
        const extRes = await pool.request()
          .input('Acc', sql.VarChar(10), cleanAcc)
          .input('Num', sql.Int, wareIdx)
          .query('SELECT AccountID, Money, CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex FROM ExtWarehouse WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;');

        if (extRes.recordset && extRes.recordset[0] && extRes.recordset[0].ItemsHex) {
          currentHex = extRes.recordset[0].ItemsHex.toUpperCase();
          currentMoney = extRes.recordset[0].Money || 0;
        } else {
          currentHex = 'F'.repeat(3840);
        }
      }

      if (currentHex.length < 3840) {
        currentHex = currentHex.padEnd(3840, 'F');
      }

      // 2. Inyectar ítems en slots vacíos
      for (const rawHex of kitHexItems) {
        if (!rawHex || rawHex.length < 32) {
          failed++;
          continue;
        }
        let itemHex = rawHex.trim().toUpperCase().substring(0, 32);

        // Generar serial único para ítems de equipamiento
        const freshSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
        const sHex = freshSerial.toString(16).padStart(8, '0').toUpperCase();
        itemHex = itemHex.substring(0, 6) + sHex + itemHex.substring(14);

        let placed = false;
        for (let s = 0; s < 120; s++) {
          const slotHex = currentHex.substring(s * 32, (s + 1) * 32);
          if (/^F{32}$/i.test(slotHex) || slotHex.startsWith('FF') || /^0{32}$/.test(slotHex)) {
            currentHex = currentHex.substring(0, s * 32) + itemHex + currentHex.substring((s + 1) * 32);
            delivered++;
            placed = true;
            break;
          }
        }
        if (!placed) failed++;
      }

      // 3. Sumar Zen si se especificó
      const addZen = Math.max(0, parseInt(zen, 10) || 0);
      const newMoney = Math.min(2000000000, currentMoney + addZen);

      // 4. Guardar en warehouse o ExtWarehouse
      if (wareIdx === 0) {
        await pool.request()
          .input('Acc', sql.VarChar(10), cleanAcc)
          .input('Hex', sql.VarChar, currentHex)
          .input('Money', sql.Int, newMoney)
          .query(`
            IF EXISTS (SELECT 1 FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc)
            BEGIN
              UPDATE warehouse SET Items = CONVERT(VARBINARY(MAX), @Hex, 2), Money = @Money
              WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
            END
            ELSE
            BEGIN
              INSERT INTO warehouse (AccountID, Items, Money, EndUseDate, DbVersion, pw)
              VALUES (@Acc, CONVERT(VARBINARY(MAX), @Hex, 2), @Money, DATEADD(year, 1, GETDATE()), 3, 0);
            END
          `);
      } else {
        await pool.request()
          .input('Acc', sql.VarChar(10), cleanAcc)
          .input('Num', sql.Int, wareIdx)
          .input('Hex', sql.VarChar, currentHex)
          .input('Money', sql.Int, newMoney)
          .query(`
            IF EXISTS (SELECT 1 FROM ExtWarehouse WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num)
            BEGIN
              UPDATE ExtWarehouse SET Items = CONVERT(VARBINARY(MAX), @Hex, 2), Money = @Money
              WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;
            END
            ELSE
            BEGIN
              INSERT INTO ExtWarehouse (AccountID, Number, Items, Money)
              VALUES (@Acc, @Num, CONVERT(VARBINARY(MAX), @Hex, 2), @Money);
            END
          `);
      }

      // 5. Sumar Coins en CashShopData (WCoinC, WCoinP, GoblinPoint)
      const addGCoins = Math.max(0, parseInt(gcoins, 10) || 0);
      const addWCoinP = Math.max(0, parseInt(wCoinP, 10) || 0);
      const addGP = Math.max(0, parseInt(goblinPoints, 10) || 0);
      if (addGCoins > 0 || addWCoinP > 0 || addGP > 0) {
        await pool.request()
          .input('Acc', sql.VarChar(10), cleanAcc)
          .input('Coins', sql.Int, addGCoins)
          .input('CoinP', sql.Int, addWCoinP)
          .input('GP', sql.Int, addGP)
          .query(`
            IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CashShopData')
            BEGIN
              IF EXISTS (SELECT 1 FROM CashShopData WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc)
                UPDATE CashShopData SET 
                  WCoinC = ISNULL(WCoinC, 0) + @Coins, 
                  WCoinP = ISNULL(WCoinP, 0) + @CoinP, 
                  GoblinPoint = ISNULL(GoblinPoint, 0) + @GP 
                WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
              ELSE
                INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint) VALUES (@Acc, @Coins, @CoinP, @GP);
            END
          `);
      }

      // 6. Sumar Ruud si se especificó
      const addRuud = Math.max(0, parseInt(ruud, 10) || 0);
      if (addRuud > 0) {
        await pool.request()
          .input('Acc', sql.VarChar(10), cleanAcc)
          .input('Ruud', sql.Int, addRuud)
          .query(`
            -- A. Character
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr')))
            BEGIN
              DECLARE @sqlCharKitRuud NVARCHAR(MAX) = (
                SELECT TOP 1 'UPDATE Character SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;'
                FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr'))
              );
              IF @sqlCharKitRuud IS NOT NULL
                EXEC sp_executesql @sqlCharKitRuud, N'@RuudVal INT, @Acc VARCHAR(10)', @RuudVal = @Ruud, @Acc = @Acc;
            END

            -- B. AccountCharacter (MSPro)
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney')))
            BEGIN
              DECLARE @sqlAcKitRuud NVARCHAR(MAX) = (
                SELECT TOP 1 'UPDATE AccountCharacter SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;'
                FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney'))
              );
              IF @sqlAcKitRuud IS NOT NULL
                EXEC sp_executesql @sqlAcKitRuud, N'@RuudVal INT, @Acc VARCHAR(10)', @RuudVal = @Ruud, @Acc = @Acc;
            END

            -- C. MEMB_INFO
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney')))
            BEGIN
              DECLARE @sqlMembKitRuud NVARCHAR(MAX) = (
                SELECT TOP 1 'UPDATE MEMB_INFO SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;'
                FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney'))
              );
              IF @sqlMembKitRuud IS NOT NULL
                EXEC sp_executesql @sqlMembKitRuud, N'@RuudVal INT, @Acc VARCHAR(10)', @RuudVal = @Ruud, @Acc = @Acc;
            END

            -- D. CashShopData
            IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr')))
            BEGIN
              DECLARE @sqlCsKitRuud NVARCHAR(MAX) = (
                SELECT TOP 1 'UPDATE CashShopData SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;'
                FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr'))
              );
              IF @sqlCsKitRuud IS NOT NULL
                EXEC sp_executesql @sqlCsKitRuud, N'@RuudVal INT, @Acc VARCHAR(10)', @RuudVal = @Ruud, @Acc = @Acc;
            END
          `);
      }
    });

    const targetDesc = wareIdx === 0 ? 'Baúl Principal' : `Baúl Extendido [ExtWarehouse] #${wareIdx}`;
    res.json({
      success: true,
      delivered,
      failed,
      message: `Starter Kit entregado a '${cleanAcc}': ${delivered} ítems colocados en ${targetDesc}.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. PREMIOS MASIVOS ONLINE TOTALMENTE CONFIGURABLES
app.post('/api/prizes/deliver', async (req, res) => {
  try {
    const { prizes = [], config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    if (!Array.isArray(prizes) || prizes.length === 0) {
      return res.status(400).json({ success: false, error: 'Arreglo de premios requerido' });
    }

    const results = [];

    await executeSql(config, async (pool) => {
      for (const p of prizes) {
        const target = (p.accountId || p.charName || '').trim();
        if (!target) continue;

        try {
          // Resolver AccountID real si se envió nombre de personaje
          let realAcc = target;
          const accLookup = await pool.request()
            .input('Target', sql.VarChar(10), target)
            .query(`
              IF EXISTS (SELECT 1 FROM MEMB_INFO WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Target)) OR memb___id = @Target)
                SELECT @Target AS AccountID;
              ELSE
                SELECT TOP 1 AccountID FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Target)) OR Name = @Target;
            `);
          if (accLookup.recordset && accLookup.recordset[0] && accLookup.recordset[0].AccountID) {
            realAcc = accLookup.recordset[0].AccountID.trim();
          }

          // 1. Entregar Zen
          const zenNum = Math.max(0, parseInt(p.zen, 10) || 0);
          if (zenNum > 0) {
            await pool.request()
              .input('Acc', sql.VarChar(10), realAcc)
              .input('Zen', sql.Int, zenNum)
              .input('Target', sql.VarChar(10), target)
              .query(`
                IF EXISTS (SELECT 1 FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Target)))
                BEGIN
                  UPDATE Character 
                  SET Money = CASE WHEN Money + @Zen > 2000000000 THEN 2000000000 ELSE Money + @Zen END
                  WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Target));
                END
                ELSE IF EXISTS (SELECT 1 FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)))
                BEGIN
                  UPDATE warehouse 
                  SET Money = CASE WHEN Money + @Zen > 2000000000 THEN 2000000000 ELSE Money + @Zen END
                  WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc));
                END
              `);
          }

          // 2. Entregar Coins (WCoinC, WCoinP, GoblinPoint)
          const gcoinsNum = Math.max(0, parseInt(p.gcoins, 10) || 0);
          const wcoinPNum = Math.max(0, parseInt(p.wCoinP, 10) || 0);
          const gpNum = Math.max(0, parseInt(p.goblinPoints, 10) || 0);

          if (gcoinsNum > 0 || wcoinPNum > 0 || gpNum > 0) {
            await pool.request()
              .input('Acc', sql.VarChar(10), realAcc)
              .input('WC', sql.Int, gcoinsNum)
              .input('WP', sql.Int, wcoinPNum)
              .input('GP', sql.Int, gpNum)
              .query(`
                IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'CashShopData')
                BEGIN
                  IF EXISTS (SELECT 1 FROM CashShopData WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc)
                  BEGIN
                    UPDATE CashShopData 
                    SET WCoinC = ISNULL(WCoinC, 0) + @WC,
                        WCoinP = ISNULL(WCoinP, 0) + @WP,
                        GoblinPoint = ISNULL(GoblinPoint, 0) + @GP
                    WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
                  END
                  ELSE
                  BEGIN
                    INSERT INTO CashShopData (AccountID, WCoinC, WCoinP, GoblinPoint) VALUES (@Acc, @WC, @WP, @GP);
                  END
                END
              `);
          }

          // 3. Entregar Ruud
          const ruudNum = Math.max(0, parseInt(p.ruud, 10) || 0);
          if (ruudNum > 0) {
            await pool.request()
              .input('Acc', sql.VarChar(10), realAcc)
              .input('Target', sql.VarChar(10), target)
              .input('Ruud', sql.Int, ruudNum)
              .query(`
                -- A. Character
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr')))
                BEGIN
                  DECLARE @sqlCharPrizeRuud NVARCHAR(MAX) = (
                    SELECT TOP 1 
                      'IF EXISTS (SELECT 1 FROM Character WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@TargetVal))) ' +
                      '  UPDATE Character SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@TargetVal)); ' +
                      'ELSE ' +
                      '  UPDATE Character SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@AccVal)) OR AccountID = @AccVal;'
                    FROM sys.columns WHERE object_id = OBJECT_ID('Character') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney', 'ruud_money', 'ruudpoint', 'wcoinr'))
                  );
                  IF @sqlCharPrizeRuud IS NOT NULL
                    EXEC sp_executesql @sqlCharPrizeRuud, N'@RuudVal INT, @TargetVal VARCHAR(10), @AccVal VARCHAR(10)', @RuudVal = @Ruud, @TargetVal = @Target, @AccVal = @Acc;
                END

                -- B. AccountCharacter (MSPro)
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney')))
                BEGIN
                  DECLARE @sqlAcPrizeRuud NVARCHAR(MAX) = (
                    SELECT TOP 1 'UPDATE AccountCharacter SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@AccVal)) OR Id = @AccVal;'
                    FROM sys.columns WHERE object_id = OBJECT_ID('AccountCharacter') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('extruud', 'ruud', 'ruudtoken', 'ruudmoney'))
                  );
                  IF @sqlAcPrizeRuud IS NOT NULL
                    EXEC sp_executesql @sqlAcPrizeRuud, N'@RuudVal INT, @AccVal VARCHAR(10)', @RuudVal = @Ruud, @AccVal = @Acc;
                END

                -- C. MEMB_INFO
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney')))
                BEGIN
                  DECLARE @sqlMembPrizeRuud NVARCHAR(MAX) = (
                    SELECT TOP 1 'UPDATE MEMB_INFO SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@AccVal)) OR memb___id = @AccVal;'
                    FROM sys.columns WHERE object_id = OBJECT_ID('MEMB_INFO') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudtoken', 'ruudmoney'))
                  );
                  IF @sqlMembPrizeRuud IS NOT NULL
                    EXEC sp_executesql @sqlMembPrizeRuud, N'@RuudVal INT, @AccVal VARCHAR(10)', @RuudVal = @Ruud, @AccVal = @Acc;
                END

                -- D. CashShopData
                IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr')))
                BEGIN
                  DECLARE @sqlCsPrizeRuud NVARCHAR(MAX) = (
                    SELECT TOP 1 'UPDATE CashShopData SET ' + QUOTENAME(name) + ' = ISNULL(' + QUOTENAME(name) + ', 0) + @RuudVal WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@AccVal)) OR AccountID = @AccVal;'
                    FROM sys.columns WHERE object_id = OBJECT_ID('CashShopData') AND (LOWER(name) LIKE '%ruud%' OR LOWER(name) IN ('ruud', 'ruudpoint', 'ruudpoints', 'ruudtoken', 'wcoinr', 'coinr'))
                  );
                  IF @sqlCsPrizeRuud IS NOT NULL
                    EXEC sp_executesql @sqlCsPrizeRuud, N'@RuudVal INT, @AccVal VARCHAR(10)', @RuudVal = @Ruud, @AccVal = @Acc;
                END
              `);
          }

          // 4. Entregar Ítems en el Baúl (warehouse o ExtWarehouse)
          const items = Array.isArray(p.itemHexList) ? p.itemHexList : [];
          const wareIdx = parseInt(p.warehouseIndex, 10) || 0;
          if (items.length > 0) {
            let currentHex = '';
            if (wareIdx === 0) {
              const whRes = await pool.request()
                .input('Acc', sql.VarChar(10), realAcc)
                .query('SELECT CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;');

              if (whRes.recordset && whRes.recordset[0] && whRes.recordset[0].ItemsHex) {
                currentHex = whRes.recordset[0].ItemsHex.toUpperCase();
              } else {
                currentHex = 'F'.repeat(3840);
              }
            } else {
              // ExtWarehouse
              await pool.request().query(`
                IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'ExtWarehouse')
                BEGIN
                  CREATE TABLE [dbo].[ExtWarehouse](
                    [AccountID] [varchar](10) NOT NULL,
                    [Number] [int] NOT NULL DEFAULT 0,
                    [Items] [varbinary](1920) NULL,
                    [Money] [int] NULL DEFAULT 0,
                    CONSTRAINT [PK_ExtWarehouse] PRIMARY KEY CLUSTERED ([AccountID] ASC, [Number] ASC)
                  );
                END
              `);
              const extRes = await pool.request()
                .input('Acc', sql.VarChar(10), realAcc)
                .input('Num', sql.Int, wareIdx)
                .query('SELECT CONVERT(VARCHAR(MAX), Items, 2) AS ItemsHex FROM ExtWarehouse WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;');

              if (extRes.recordset && extRes.recordset[0] && extRes.recordset[0].ItemsHex) {
                currentHex = extRes.recordset[0].ItemsHex.toUpperCase();
              } else {
                currentHex = 'F'.repeat(3840);
              }
            }

            if (currentHex.length < 3840) currentHex = currentHex.padEnd(3840, 'F');

            let addedCount = 0;
            for (const itemHex of items) {
              let cleanHex = itemHex.trim().toUpperCase().substring(0, 32);
              const freshSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
              const sHex = freshSerial.toString(16).padStart(8, '0').toUpperCase();
              cleanHex = cleanHex.substring(0, 6) + sHex + cleanHex.substring(14);

              for (let s = 0; s < 120; s++) {
                const chunk = currentHex.substring(s * 32, (s + 1) * 32);
                if (/^F{32}$/i.test(chunk) || chunk.startsWith('FF') || /^0{32}$/.test(chunk)) {
                  currentHex = currentHex.substring(0, s * 32) + cleanHex + currentHex.substring((s + 1) * 32);
                  addedCount++;
                  break;
                }
              }
            }

            if (wareIdx === 0) {
              await pool.request()
                .input('Acc', sql.VarChar(10), realAcc)
                .input('Hex', sql.VarChar, currentHex)
                .query(`
                  IF EXISTS (SELECT 1 FROM warehouse WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc)
                    UPDATE warehouse SET Items = CONVERT(VARBINARY(MAX), @Hex, 2) WHERE LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc;
                  ELSE
                    INSERT INTO warehouse (AccountID, Items, Money, EndUseDate, DbVersion, pw)
                    VALUES (@Acc, CONVERT(VARBINARY(MAX), @Hex, 2), 0, DATEADD(year, 1, GETDATE()), 3, 0);
                `);
            } else {
              await pool.request()
                .input('Acc', sql.VarChar(10), realAcc)
                .input('Num', sql.Int, wareIdx)
                .input('Hex', sql.VarChar, currentHex)
                .query(`
                  IF EXISTS (SELECT 1 FROM ExtWarehouse WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num)
                    UPDATE ExtWarehouse SET Items = CONVERT(VARBINARY(MAX), @Hex, 2) WHERE (LTRIM(RTRIM(AccountID)) = LTRIM(RTRIM(@Acc)) OR AccountID = @Acc) AND Number = @Num;
                  ELSE
                    INSERT INTO ExtWarehouse (AccountID, Number, Items, Money)
                    VALUES (@Acc, @Num, CONVERT(VARBINARY(MAX), @Hex, 2), 0);
                `);
            }
          }

          results.push({ accountId: target, ok: true });
        } catch (itemErr) {
          results.push({ accountId: target, ok: false, error: itemErr.message });
        }
      }
    });

    res.json({ success: true, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. PERDON DE ASESINOS PK (GM LEVEL & LIST)
app.post('/api/gm/list', async (req, res) => {
  try {
    const { config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const gms = await executeSql(config, async (pool) => {
      const r = await pool.request().query(`
        SELECT Name AS charName, AccountID AS accountId, Class AS class, cLevel AS level, ISNULL(CtlCode, 0) AS ctlCode
        FROM Character
        WHERE ISNULL(CtlCode, 0) > 0;
      `);
      return (r.recordset || []).map(row => ({
        charName: row.charName,
        accountId: row.accountId,
        class: row.class,
        level: row.level,
        gmLevel: row.ctlCode === 32 ? 3 : (row.ctlCode >= 8 ? 2 : (row.ctlCode >= 1 ? 1 : 0)),
        ctlCode: row.ctlCode
      }));
    });

    res.json({ success: true, gms: gms || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/gm/set-level', async (req, res) => {
  try {
    const { charName, gmLevel = 0, config } = req.body;
    if (!charName) return res.status(400).json({ success: false, error: 'charName requerido' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const levelNum = parseInt(gmLevel, 10) || 0;
    let ctlCode = 0;
    if (levelNum === 3) ctlCode = 32;
    else if (levelNum === 2) ctlCode = 8;
    else if (levelNum === 1) ctlCode = 1;

    await executeSql(config, async (pool) => {
      await pool.request()
        .input('Name', sql.VarChar(10), charName.trim())
        .input('Ctl', sql.TinyInt, ctlCode)
        .query('UPDATE Character SET CtlCode = @Ctl WHERE LTRIM(RTRIM(Name)) = LTRIM(RTRIM(@Name)) OR Name = @Name;');
    });

    res.json({
      success: true,
      message: levelNum === 0
        ? `Permisos GM revocados para '${charName}' (CtlCode = 0).`
        : `Rango GM asignado a '${charName}': Nivel ${levelNum} (CtlCode = ${ctlCode}).`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11. ESCÁNER DE ABUSO Y LÍMITE DE IP
app.post('/api/ip/scan-abuse', async (req, res) => {
  try {
    const { maxPerIp = 3, config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const limit = Math.max(1, parseInt(maxPerIp, 10) || 3);

    const abusers = await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('Limit', sql.Int, limit)
        .query(`
          SELECT IP, COUNT(DISTINCT memb___id) AS accCount
          FROM MEMB_STAT
          WHERE ConnectStat = 1 AND IP IS NOT NULL AND LEN(IP) > 0
          GROUP BY IP
          HAVING COUNT(DISTINCT memb___id) > @Limit;
        `);
      const list = [];
      for (const row of (r.recordset || [])) {
        const accsRes = await pool.request()
          .input('IP', sql.VarChar, row.IP)
          .query('SELECT DISTINCT memb___id FROM MEMB_STAT WHERE ConnectStat = 1 AND IP = @IP;');
        list.push({
          ip: row.IP,
          count: row.accCount,
          accounts: (accsRes.recordset || []).map(a => a.memb___id.trim())
        });
      }
      return list;
    });

    res.json({ success: true, abusers: abusers || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11.0 DESCONECTAR POR IP
app.post('/api/ip/disconnect-by-ip', async (req, res) => {
  try {
    const { ip, config } = req.body;
    if (!ip) return res.status(400).json({ success: false, error: 'IP requerida' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    let disconnected = 0;
    await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('IP', sql.VarChar, ip.trim())
        .query(`
          UPDATE MEMB_STAT 
          SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE()
          WHERE ConnectStat = 1 AND IP = @IP;
          SELECT @@ROWCOUNT AS Disconnected;
        `);
      disconnected = (r.recordset && r.recordset[0] && r.recordset[0].Disconnected) || 0;
    });

    res.json({ success: true, disconnected, message: `Desconectadas ${disconnected} cuentas en IP ${ip}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 11.1 APLICAR LÍMITE DE CUENTAS POR IP (DETECTAR Y/O DESCONECTAR EXCEDENTES)
app.post('/api/ip/enforce-limit', async (req, res) => {
  try {
    const { maxPerIp = 3, action = 'DISCONNECT', config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const limit = Math.max(1, parseInt(maxPerIp, 10) || 3);
    const shouldDisconnect = action === 'DISCONNECT';

    const result = await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('Limit', sql.Int, limit)
        .query(`
          SELECT LTRIM(RTRIM(IP)) AS IP, COUNT(DISTINCT memb___id) AS accCount
          FROM MEMB_STAT
          WHERE ConnectStat = 1 AND IP IS NOT NULL AND LEN(LTRIM(RTRIM(IP))) > 0
          GROUP BY LTRIM(RTRIM(IP))
          HAVING COUNT(DISTINCT memb___id) > @Limit;
        `);

      const violations = [];
      const disconnected = [];

      for (const row of (r.recordset || [])) {
        const targetIp = row.IP;
        const accsRes = await pool.request()
          .input('IP', sql.VarChar, targetIp)
          .query(`
            SELECT DISTINCT memb___id, ConnectTM 
            FROM MEMB_STAT 
            WHERE ConnectStat = 1 AND LTRIM(RTRIM(IP)) = LTRIM(RTRIM(@IP))
            ORDER BY ConnectTM ASC;
          `);
        
        const allAccs = (accsRes.recordset || []).map(a => a.memb___id.trim());
        violations.push({ ip: targetIp, count: allAccs.length, accounts: allAccs });

        if (shouldDisconnect && allAccs.length > limit) {
          const excessAccs = allAccs.slice(limit);
          for (const acc of excessAccs) {
            await pool.request()
              .input('Acc', sql.VarChar, acc)
              .query(`
                UPDATE MEMB_STAT 
                SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE()
                WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;

                IF OBJECT_ID('Me_MuOnline.dbo.MEMB_STAT', 'U') IS NOT NULL
                  UPDATE Me_MuOnline.dbo.MEMB_STAT 
                  SET ConnectStat = 0, ServerName = NULL, DisConnectTM = GETDATE()
                  WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;

                IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
                  UPDATE AccountCharacter SET GameIDC = NULL WHERE LTRIM(RTRIM(Id)) = LTRIM(RTRIM(@Acc)) OR Id = @Acc;

                IF OBJECT_ID('WZ_DISCONNECT_MEMB', 'P') IS NOT NULL
                  EXEC WZ_DISCONNECT_MEMB @Acc;
              `);
            disconnected.push({ account: acc, ip: targetIp });
          }
        }
      }

      return { violations, disconnected };
    });

    const msg = shouldDisconnect
      ? `Chequeo completado: ${result.disconnected.length} cuenta(s) excedentes desconectadas de ${result.violations.length} IP(s).`
      : `Chequeo completado: Se detectaron ${result.violations.length} IP(s) excediendo el límite de ${limit} cuentas.`;

    res.json({
      success: true,
      message: msg,
      violationsCount: result.violations.length,
      violations: result.violations,
      disconnectedCount: result.disconnected.length,
      disconnected: result.disconnected,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/ip/ban-by-ip', async (req, res) => {
  try {
    const { ip, config } = req.body;
    if (!ip) return res.status(400).json({ success: false, error: 'IP requerida' });
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    let banned = 0;
    await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('IP', sql.VarChar, ip.trim())
        .query(`
          UPDATE MEMB_INFO 
          SET bloc_code = 1 
          WHERE memb___id IN (SELECT DISTINCT memb___id FROM MEMB_STAT WHERE IP = @IP);
          UPDATE MEMB_STAT 
          SET ConnectStat = 0 
          WHERE IP = @IP;
          SELECT @@ROWCOUNT AS Banned;
        `);
      banned = (r.recordset && r.recordset[0] && r.recordset[0].Banned) || 0;
    });

    res.json({ success: true, banned, message: `Baneadas ${banned} cuentas asociadas a la IP ${ip}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/active-bans', async (req, res) => {
  try {
    const { config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const bans = await executeSql(config, async (pool) => {
      const membCheck = await pool.request().query(`
        SELECT 
          CASE 
            WHEN OBJECT_ID('MEMB_INFO', 'U') IS NOT NULL THEN 'MEMB_INFO'
            WHEN OBJECT_ID('Me_MuOnline.dbo.MEMB_INFO', 'U') IS NOT NULL THEN 'Me_MuOnline.dbo.MEMB_INFO'
            WHEN OBJECT_ID('MuOnline.dbo.MEMB_INFO', 'U') IS NOT NULL THEN 'MuOnline.dbo.MEMB_INFO'
            ELSE 'MEMB_INFO'
          END AS MembTable;
      `);
      const membTable = (membCheck.recordset && membCheck.recordset[0] && membCheck.recordset[0].MembTable) || 'MEMB_INFO';

      const r = await pool.request().query(`
        SELECT 
          'account' AS type,
          LTRIM(RTRIM(memb___id)) AS accountId,
          NULL AS charName,
          0 AS class,
          0 AS level,
          'Cuenta Bloqueada (bloc_code = 1)' AS reason,
          NULL AS bannedAt
        FROM ${membTable}
        WHERE bloc_code = 1 OR bloc_code = '1'

        UNION ALL

        SELECT 
          'character' AS type,
          LTRIM(RTRIM(AccountID)) AS accountId,
          LTRIM(RTRIM(Name)) AS charName,
          ISNULL(Class, 0) AS class,
          ISNULL(cLevel, 1) AS level,
          'Personaje Baneado (CtlCode = 1)' AS reason,
          NULL AS bannedAt
        FROM Character
        WHERE CtlCode = 1
        
        ORDER BY accountId ASC, charName ASC;
      `);
      return r.recordset || [];
    });

    res.json({ success: true, bans: bans || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/accounts/ip-history', async (req, res) => {
  try {
    const { accountId, config } = req.body;
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });

    const history = await executeSql(config, async (pool) => {
      const r = await pool.request()
        .input('Acc', sql.VarChar(10), (accountId || '').trim())
        .query(`
          SELECT IP AS ip, CONVERT(VARCHAR(19), ConnectTM, 120) AS date, '' AS charName
          FROM MEMB_STAT
          WHERE LTRIM(RTRIM(memb___id)) = LTRIM(RTRIM(@Acc)) OR memb___id = @Acc;
        `);
      return r.recordset || [];
    });

    res.json({ success: true, history: history || [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});



app.get(['/api/capabilities', '/capabilities'], (req, res) => res.json(getCapabilities('gateway')));
app.post(['/api/capabilities', '/capabilities'], (req, res) => res.json(getCapabilities('gateway')));

// ==========================================
// TELEMETRÍA, GEOLOCALIZACIÓN Y CONTROL DE DISPOSITIVOS
// ==========================================

const COUNTRY_MAP = {
  AR: 'Argentina', BR: 'Brasil', MX: 'México', CL: 'Chile', CO: 'Colombia',
  PE: 'Perú', UY: 'Uruguay', PY: 'Paraguay', BO: 'Bolivia', EC: 'Ecuador',
  VE: 'Venezuela', ES: 'España', US: 'Estados Unidos', CA: 'Canadá',
  CR: 'Costa Rica', PA: 'Panamá', GT: 'Guatemala', HN: 'Honduras',
  SV: 'El Salvador', NI: 'Nicaragua', DO: 'Rep. Dominicana', CU: 'Cuba',
  PR: 'Puerto Rico', IT: 'Italia', FR: 'Francia', DE: 'Alemania',
  GB: 'Reino Unido', PT: 'Portugal', RU: 'Rusia', CN: 'China', JP: 'Japón'
};

function getCountryFlag(countryCode) {
  if (!countryCode || typeof countryCode !== 'string' || countryCode.length !== 2) return '🌐';
  const code = countryCode.toUpperCase();
  const c1 = code.charCodeAt(0) - 65 + 0x1F1E6;
  const c2 = code.charCodeAt(1) - 65 + 0x1F1E6;
  try {
    return String.fromCodePoint(c1, c2);
  } catch (_) {
    return '🌐';
  }
}

function getCountryName(countryCode) {
  if (!countryCode || typeof countryCode !== 'string') return 'Desconocido';
  const code = countryCode.toUpperCase().trim();
  return COUNTRY_MAP[code] || code;
}

function formatTimeRemaining(expiresAt, isLifetime, nowMs = Date.now()) {
  if (isLifetime || !expiresAt) return '♾️ Vitalicia';
  const diffMs = new Date(expiresAt).getTime() - nowMs;
  if (diffMs <= 0) return 'Expirado';
  const totalMin = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMin / 1440);
  const hours = Math.floor((totalMin % 1440) / 60);
  const mins = totalMin % 60;
  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${mins} min`;
}

function extractGeoFromReq(req) {
  const countryCode = (req.headers['x-vercel-ip-country'] || req.headers['cf-ipcountry'] || '').toUpperCase().trim();
  let city = req.headers['x-vercel-ip-city'] || '';
  try {
    city = decodeURIComponent(city).trim();
  } catch (_) {}
  const region = (req.headers['x-vercel-ip-country-region'] || '').trim();
  const flag = getCountryFlag(countryCode);
  const countryName = getCountryName(countryCode);
  return { countryCode, countryName, city, region, flag };
}

function isTestDevice(dev) {
  if (!dev) return false;
  if (typeof dev.isTest === 'boolean') return dev.isTest;
  const h = String(dev.hwid || '').toUpperCase();
  if (h.startsWith('TEST') || h.startsWith('POLL-') || h.startsWith('DEV-') || h.startsWith('SIM-') || h.includes('UUID-12345')) {
    return true;
  }
  const m = String(dev.deviceModel || '').toLowerCase();
  if (m.includes('emulator') || m.includes('sdk_gphone') || m.includes('google_sdk')) {
    return true;
  }
  return false;
}

// Ping silencioso del APK
app.post('/api/telemetry/ping', (req, res) => {
  const { hwid, mode, appVersion, platform, licenseKey, userEmail, username, isEmulator, deviceModel, deviceBrand } = req.body;
  if (!hwid) return res.status(400).json({ error: 'HWID missing' });

  const settings = loadSettings();
  const devices = loadDevices();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'Desconocida';
  const now = new Date().toISOString();
  const geo = extractGeoFromReq(req);

  let sessionInvalidated = false;
  let sessionInvalidatedReason = '';

  // [H04-B FIX] Solo asociar identidad (email/username) si hay sesión autenticada válida.
  // El tracking de HWID y licencia se permite siempre; la creación de usuarios requiere token.
  const _telAuthHeader = req.headers['authorization'] || req.headers['x-session-token'] || '';
  const _telToken = _telAuthHeader.replace(/^Bearer\s+/i, '').trim();
  const _telAdminKey = req.headers['x-admin-key'] || '';
  const canAssociateIdentity = (_telToken && !!verifySessionToken(_telToken)) || isValidAdminKey(_telAdminKey);

  const tombstones = loadTombstones();
  const isRevokedByAdmin = !!(tombstones[hwid] && typeof tombstones[hwid] === 'object' && tombstones[hwid].blocked !== false);

  // [H04-B FIX] Asociar identidad de usuario SOLO si hay sesión autenticada válida.
  // Un ping sin token solo actualiza estado del dispositivo; no crea ni modifica users.json.
  if (userEmail && typeof userEmail === 'string' && userEmail.trim().length > 0) {
    const cleanEmail = userEmail.trim().toLowerCase();
    const isUserDeleted = !!(tombstones.deletedUsers && tombstones.deletedUsers[cleanEmail]);
    if (isUserDeleted) {
      // La invalidación de sesión se permite siempre (protección del administrador)
      sessionInvalidated = true;
      sessionInvalidatedReason = 'Esta cuenta ha sido eliminada por el administrador.';
    } else if (canAssociateIdentity) {
      // Solo crear/actualizar entrada en users.json si el ping lleva token JWT o admin-key válido
      const users = loadUsers();
      let userObj = users.find(u => u.email.toLowerCase() === cleanEmail || (u.username && u.username.toLowerCase() === cleanEmail));
      if (!userObj) {
        userObj = {
          id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
          email: cleanEmail,
          username: (username && String(username).trim()) || cleanEmail.split('@')[0],
          role: 'USER',
          status: 'ACTIVE',
          createdAt: now,
          lastLogin: now,
          lastSeen: now,
          hwid: hwid || '',
          activeHwid: hwid || '',
          activeSessionAt: now
        };
        users.push(userObj);
        addAuditLog('USER_AUTO_ATTACH', hwid, clientIp, `Usuario conectado en APK (sesión verificada): ${cleanEmail}`);
      } else {
        userObj.lastSeen = now;
        userObj.activeHwid = hwid;
        userObj.hwid = hwid;
        if (username && !userObj.username) userObj.username = String(username).trim();

        if (userObj.status === 'BLOCKED') {
          sessionInvalidated = true;
          sessionInvalidatedReason = 'Tu cuenta ha sido bloqueada por el administrador.';
        }
      }
      saveUsers(users);
    }
  }

  // Si el celular físico fue eliminado o revocado por el administrador, devolver revocación permanente y NO reinsertar
  if (isRevokedByAdmin) {
    return res.json({
      success: true,
      hwid,
      mode: 'DEMO',
      licenseKey: '',
      forceWipeKey: true,
      blocked: true,
      reason: 'Dispositivo excluido del registro por el administrador.',
      sessionInvalidated,
      sessionInvalidatedReason,
      authoritativeMode: 'DEMO',
      isLifetime: false,
      serverTime: now
    });
  }

  const isAutoBlocked = settings.whitelistOnly;
  let effectiveLicenseKey = (licenseKey || '').trim().toUpperCase();
  const isKeyRevoked = !!(effectiveLicenseKey && tombstones.revokedKeys && tombstones.revokedKeys[effectiveLicenseKey]);
  // Verificación server-side: la clave es válida si coincide con la guardada en devices[hwid], o es matemáticamente válida para este HWID, y no está revocada
  const storedKey = devices[hwid]
    ? ((devices[hwid].licenseKey || devices[hwid].generatedKey || '').trim().toUpperCase())
    : '';
  const isKeyMathematicallyValid = effectiveLicenseKey ? verifyKey(hwid, effectiveLicenseKey) : false;
  let hasValidKey = !isKeyRevoked && effectiveLicenseKey.length > 0 && (
    isKeyMathematicallyValid || (storedKey.length > 0 && effectiveLicenseKey === storedKey)
  );

  // Evaluación autoritativa anti-falsos positivos de emulador en el Servidor
  const cleanBrand = String(deviceBrand || (devices[hwid] && devices[hwid].deviceBrand) || '').toLowerCase().trim();
  const cleanModel = String(deviceModel || (devices[hwid] && devices[hwid].deviceModel) || '').toLowerCase().trim();

  const isExplicitEmulatorModel = (
    cleanModel.includes('google_sdk') ||
    cleanModel.includes('sdk_gphone') ||
    cleanModel.includes('emulator') ||
    cleanModel.includes('android sdk') ||
    cleanModel.includes('vbox') ||
    cleanModel.includes('genymotion') ||
    cleanModel.includes('bluestacks') ||
    cleanModel.includes('ldplayer') ||
    cleanModel.includes('nox') ||
    cleanModel.includes('ttvm') ||
    cleanModel.includes('microvirt') ||
    cleanBrand.includes('nox') ||
    cleanBrand.includes('bluestacks') ||
    cleanBrand.includes('ldplayer') ||
    cleanBrand.includes('microvirt') ||
    cleanBrand.includes('bignox')
  );

  const isTrustedPhysicalPhoneOem = [
    'samsung', 'honor', 'huawei', 'xiaomi', 'redmi', 'poco',
    'motorola', 'moto', 'oppo', 'vivo', 'realme', 'oneplus',
    'sony', 'lg', 'asus', 'tcl', 'zte', 'nokia', 'tecno', 'infinix', 'google', 'apple'
  ].some(oem => cleanBrand.includes(oem));

  let authoritativeIsEmulator = false;
  if (isExplicitEmulatorModel) {
    authoritativeIsEmulator = true;
  } else if (isTrustedPhysicalPhoneOem) {
    authoritativeIsEmulator = false;
  } else {
    authoritativeIsEmulator = isEmulator !== undefined ? !!isEmulator : false;
  }

  if (!devices[hwid]) {
    const demoDurationHours = Number(settings.demoDurationHours) || 72;
    const demoExpires = new Date(Date.now() + demoDurationHours * 3600 * 1000).toISOString();
    const canBePro = hasValidKey && !isRevokedByAdmin && !isKeyRevoked;

    devices[hwid] = {
      hwid,
      mode: canBePro ? 'PRO' : 'DEMO',
      licenseKey: canBePro ? effectiveLicenseKey : '',
      firstSeen: now,
      lastSeen: now,
      totalPings: 1,
      ip: clientIp,
      platform: platform || 'Android',
      appVersion: appVersion || '1.0.0',
      blocked: isAutoBlocked,
      blockReason: isAutoBlocked ? 'Dispositivo nuevo en espera de aprobación del administrador.' : '',
      note: '',
      currentUser: userEmail || '',
      expiresAt: canBePro ? null : demoExpires,
      isEmulator: authoritativeIsEmulator,
      deviceModel: deviceModel || '',
      deviceBrand: deviceBrand || '',
      demoExtendedHours: 0,
      isTest: isTestDevice({ hwid, deviceModel }),
      forceDemo: isRevokedByAdmin || isKeyRevoked,
      countryCode: geo.countryCode || '',
      country: geo.countryName || 'Desconocido',
      city: geo.city || '',
      flag: geo.flag || '🌐'
    };
    addAuditLog('NEW_DEVICE', hwid, clientIp, `Nuevo celular registrado (${platform || 'Android'} v${appVersion || '1.0.0'}, ${devices[hwid].isEmulator ? 'EMULADOR' : 'FÍSICO'}: ${deviceBrand || ''} ${deviceModel || ''}) - ${geo.flag} ${geo.countryName}`);
  } else {
    const isExplicitAct = !!req.body.isExplicitActivation;
    if (isRevokedByAdmin) {
      // Dispositivo revocado por el panel: forzar DEMO permanente
      devices[hwid].mode = 'DEMO';
      devices[hwid].licenseKey = '';
      devices[hwid].generatedKey = '';
      devices[hwid].forceDemo = true;
    } else if (devices[hwid].forceDemo || isKeyRevoked) {
      // forceDemo tiene prioridad absoluta sobre cualquier activación explícita del cliente.
      // Si el admin degradó a DEMO o la clave está revocada, NUNCA se puede auto-activar PRO.
      devices[hwid].mode = 'DEMO';
      devices[hwid].forceDemo = true;
      devices[hwid].licenseKey = '';
      devices[hwid].generatedKey = '';
    } else if (hasValidKey && !isKeyRevoked) {
      // Clave válida y no revocada: activar o mantener PRO
      devices[hwid].mode = 'PRO';
      devices[hwid].forceDemo = false;
      devices[hwid].licenseKey = effectiveLicenseKey;
      devices[hwid].generatedKey = effectiveLicenseKey;
      devices[hwid].blocked = false;
      if (isExplicitAct) {
        addAuditLog('KEY_ACTIVATED', hwid, clientIp, `Licencia PRO activada explícitamente desde el celular.`);
      }
    } else if (devices[hwid].mode === 'DEMO') {
      // Modo DEMO sin forceDemo: mantener en DEMO normalmente
      devices[hwid].mode = 'DEMO';
    } else if (devices[hwid].mode === 'PRO') {
      // Dispositivo autorizado en PRO por el panel
      if (isKeyRevoked) {
        devices[hwid].mode = 'DEMO';
        devices[hwid].forceDemo = true;
        devices[hwid].licenseKey = '';
        devices[hwid].generatedKey = '';
      } else if (!devices[hwid].licenseKey && hasValidKey) {
        devices[hwid].licenseKey = effectiveLicenseKey;
      }
    }
    devices[hwid].lastSeen = now;
    devices[hwid].totalPings = (devices[hwid].totalPings || 0) + 1;
    devices[hwid].ip = clientIp;
    devices[hwid].appVersion = appVersion || devices[hwid].appVersion;
    if (userEmail) devices[hwid].currentUser = userEmail;
    if (!devices[hwid].isEmulatorManual) {
      devices[hwid].isEmulator = authoritativeIsEmulator;
    }
    if (deviceModel) devices[hwid].deviceModel = deviceModel;
    if (deviceBrand) devices[hwid].deviceBrand = deviceBrand;
    if (geo.countryCode) {
      devices[hwid].countryCode = geo.countryCode;
      devices[hwid].country = geo.countryName;
      devices[hwid].city = geo.city;
      devices[hwid].flag = geo.flag;
    }
    if (devices[hwid].isTest === undefined) {
      devices[hwid].isTest = isTestDevice(devices[hwid]);
    }

    // Verificar si expiró PRO o DEMO
    if (devices[hwid].expiresAt && new Date(devices[hwid].expiresAt) < new Date()) {
      if (devices[hwid].mode === 'PRO') {
        devices[hwid].mode = 'DEMO';
        devices[hwid].forceDemo = true;
        devices[hwid].licenseKey = '';
        devices[hwid].blockReason = 'Tu licencia PRO por tiempo ha vencido. Contacta a soporte para renovar.';
        addAuditLog('PRO_EXPIRED', hwid, clientIp, 'Licencia PRO por tiempo vencida. Celular degradado a DEMO.');
      } else if (!devices[hwid].blocked) {
        devices[hwid].blocked = true;
        devices[hwid].blockReason = 'Período de prueba finalizado. Adquiere una licencia PRO.';
        addAuditLog('EXPIRED', hwid, clientIp, 'Período de prueba vencido. Celular bloqueado automáticamente.');
      }
    }
  }

  const saved = saveDevices(devices);
  if (!saved) {
    console.warn('Notice: saveDevices handled via in-memory serverless cache');
  }

  const currentVer = appVersion || '1.0.0';
  let targetVer = (settings.latestVersion || '1.7.5').replace(/^v/i, '').trim();
  let hasUpdate = false;
  let isForced = !!(settings.forceUpdate || isOlderThanMin(currentVer, settings.minRequiredVersion || '1.5.8'));
  let isRollback = false;
  let isBeta = false;
  let targetChangelog = settings.updateChangelog || '';
  let releaseChannel = 'STABLE';
  let betaStatus = 'NONE';

  // 1. Rollback de Emergencia Activo (Máxima Prioridad)
  if (settings.rollback && settings.rollback.active) {
    const rbVer = (settings.rollback.targetVersion || '1.1.8').replace(/^v/i, '').trim();
    targetVer = rbVer;
    if (isNewerVersion(currentVer, rbVer) || (currentVer !== rbVer && isNewerVersion(currentVer, '1.0.0'))) {
      hasUpdate = true;
      isRollback = true;
      isForced = settings.rollback.forceRollback !== false;
      targetChangelog = `🚨 ROLLBACK DE EMERGENCIA ACTIVADO:\n${settings.rollback.reason || 'Restaurando versión estable anterior por incidentes de estabilidad.'}`;
    }
  } else {
    // 2. Comprobar si el dispositivo es participante del Canal Beta
    const isApprovedBeta = (settings.beta?.approvedHwids || []).includes(hwid);
    const betaReq = (settings.beta?.requests || []).find(r => r.hwid === hwid);
    if (isApprovedBeta) {
      releaseChannel = 'BETA';
      betaStatus = 'APPROVED';
      const bVer = (settings.beta?.latestBetaVersion || settings.latestVersion || '1.7.5').replace(/^v/i, '').trim();
      if (isNewerVersion(bVer, currentVer)) {
        targetVer = bVer;
        hasUpdate = true;
        isBeta = true;
        targetChangelog = settings.beta?.betaChangelog || '• Versión Beta de prueba para evaluadores certificados.';
      }
    } else if (betaReq && betaReq.status === 'PENDING') {
      betaStatus = 'PENDING';
    } else if (betaReq && betaReq.status === 'REJECTED') {
      betaStatus = 'REJECTED';
    }

    // 3. Si no es rollback ni beta update, evaluar canal oficial STABLE
    if (!hasUpdate && !isRollback) {
      hasUpdate = !!(settings.latestApkUrl && isNewerVersion(targetVer, currentVer));
    }
  }

  // Construir URL dinámico con nombre versionado exacto y bust de caché permanente
  const baseHost = req.headers.host || 'mumanagerpro-gateway.onrender.com';
  const protocol = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const dynamicApkUrl = (isRollback && settings.rollback?.targetApkUrl)
    ? settings.rollback.targetApkUrl
    : (settings.latestApkUrl || 'https://raw.githubusercontent.com/ToolForg3/MuManagerPro-App/main/MuManagerPro.apk');

  const updateInfo = {
    hasUpdate,
    isRollback,
    isBeta,
    currentVersion: currentVer,
    latestVersion: targetVer,
    minRequiredVersion: settings.minRequiredVersion || '1.5.8',
    apkUrl: dynamicApkUrl,
    changelog: targetChangelog,
    forceUpdate: hasUpdate && isForced
  };

  const broadcast = settings.broadcast || {
    active: !!settings.broadcastAnnouncement,
    id: 'ann_legacy',
    title: 'Aviso del Administrador',
    message: settings.broadcastAnnouncement || '',
    type: 'INFO',
    displayMode: 'BANNER'
  };

  // Si hay mantenimiento global activo
  if (settings.globalMaintenance) {
    return res.json({
      success: true,
      blocked: true,
      reason: settings.maintenanceMessage || 'Servidor en mantenimiento programado.',
      mode: 'BLOCKED',
      announcement: settings.broadcastAnnouncement || '',
      broadcast,
      updateInfo,
      releaseChannel,
      betaStatus,
      serverTime: now,
    });
  }

  // Aviso obligatorio de actualización para versiones anteriores sin bloquear el dispositivo
  const isObsoleteVersion = isOlderThanMin(currentVer, settings.minRequiredVersion || '1.5.8');
  if (isObsoleteVersion) {
    updateInfo.hasUpdate = true;
    updateInfo.forceUpdate = true;
    updateInfo.latestVersion = (settings.latestVersion || '1.7.5').replace(/^v/i, '').trim();

    // Si estaba previamente bloqueado por la regla de versión obsoleta, restaurarlo para permitir la actualización fluida
    if (devices[hwid].blocked && devices[hwid].blockReason && devices[hwid].blockReason.includes('Versión obsoleta')) {
      devices[hwid].blocked = false;
      devices[hwid].blockReason = '';
      saveDevices(devices);
    }

    addAuditLog('UPDATE_PROMPT', hwid, clientIp, `Modal de actualización obligatoria presentado a APK v${currentVer} (disponible v${updateInfo.latestVersion})`);

    const devMode = devices[hwid].mode || 'DEMO';
    const isForcedDemo = !!(devices[hwid].forceDemo || isRevokedByAdmin || isKeyRevoked);
    const shouldWipeKey = isForcedDemo || (effectiveLicenseKey.length > 0 && !hasValidKey);

    return res.json({
      success: true,
      blocked: false,
      reason: '',
      mode: devMode,
      authoritativeMode: devMode,
      forceWipeKey: shouldWipeKey,
      forceDemo: isForcedDemo,
      licenseKey: (devMode === 'PRO' && !isForcedDemo) ? (devices[hwid].licenseKey || devices[hwid].generatedKey || '') : '',
      announcement: settings.broadcastAnnouncement || '',
      broadcast,
      updateInfo,
      releaseChannel,
      betaStatus,
      expiresAt: devices[hwid].expiresAt || null,
      isLifetime: devMode === 'PRO' && !devices[hwid].expiresAt,
      daysRemaining: devices[hwid].expiresAt ? Math.max(0, Math.ceil((new Date(devices[hwid].expiresAt).getTime() - Date.now()) / 86400000)) : null,
      serverTime: now,
      // MEJORA 1: TTL de licencia — el APK fuerza DEMO si no confirma con el servidor en 48h
      licenseValidUntil: devMode === 'PRO' && !isForcedDemo
        ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
        : null,
      sessionInvalidated: false,
      forceLogout: false,
      isEmulator: !!devices[hwid].isEmulator,
      deviceModel: devices[hwid].deviceModel || '',
      deviceBrand: devices[hwid].deviceBrand || '',
      demoRemainingHours: devices[hwid].expiresAt ? Math.max(0, Math.round((new Date(devices[hwid].expiresAt).getTime() - Date.now()) / 3600000)) : null,
    });
  }

  const devMode = devices[hwid].mode || 'DEMO';
  const isForcedDemo = !!(devices[hwid].forceDemo || isRevokedByAdmin || isKeyRevoked);
  const shouldWipeKey = isForcedDemo || (effectiveLicenseKey.length > 0 && !hasValidKey);

  // L07 Hardening: Do not return plaintext licenseKey to anonymous unverified callers
  const incomingKey = String(licenseKey || '').trim();
  const callerProvidedMatchingKey = incomingKey && incomingKey === (devices[hwid].licenseKey || devices[hwid].generatedKey);
  const pingSig = req.headers['x-req-signature'];
  const pingTs = req.headers['x-req-timestamp'];
  const pingNonce = req.headers['x-req-nonce'];
  let isCallerSigned = false;
  if (pingSig && pingTs && pingNonce) {
    const bodyStr = req.rawBody !== undefined ? req.rawBody : (req.body ? JSON.stringify(req.body) : '');
    const bodyHash = sha256(bodyStr).substring(0, 16);
    const expectedSig = sha256(`${hwid}:${pingTs}:${pingNonce}:${bodyHash}:${MASTER_SECURITY_SALT}`).toUpperCase();
    if (pingSig.toUpperCase() === expectedSig) {
      isCallerSigned = true;
    }
  }

  const effectiveKey = (devMode === 'PRO' && !isForcedDemo && (callerProvidedMatchingKey || isCallerSigned))
    ? (devices[hwid].licenseKey || devices[hwid].generatedKey || '')
    : '';

  res.json({
    success: true,
    blocked: !!devices[hwid].blocked,
    reason: sessionInvalidated ? sessionInvalidatedReason : (devices[hwid].blockReason || ''),
    mode: devMode,
    authoritativeMode: devMode,
    forceWipeKey: shouldWipeKey,
    forceDemo: isForcedDemo,
    licenseKey: effectiveKey,
    announcement: settings.broadcastAnnouncement || '',
    broadcast,
    updateInfo,
    releaseChannel,
    betaStatus,
    expiresAt: devices[hwid].expiresAt || null,
    isLifetime: devMode === 'PRO' && !devices[hwid].expiresAt,
    daysRemaining: devices[hwid].expiresAt ? Math.max(0, Math.ceil((new Date(devices[hwid].expiresAt).getTime() - Date.now()) / 86400000)) : null,
    serverTime: now,
    // MEJORA 1: TTL de licencia — el APK fuerza DEMO si no confirma con el servidor en 48h
    licenseValidUntil: devMode === 'PRO' && !isForcedDemo
      ? new Date(Date.now() + 48 * 3600 * 1000).toISOString()
      : null,
    sessionInvalidated,
    forceLogout: sessionInvalidated,
    isEmulator: !!devices[hwid].isEmulator,
    deviceModel: devices[hwid].deviceModel || '',
    deviceBrand: devices[hwid].deviceBrand || '',
    demoRemainingHours: devices[hwid].expiresAt ? Math.max(0, Math.round((new Date(devices[hwid].expiresAt).getTime() - Date.now()) / 3600000)) : null,
  });
});

// Comprobar si un celular está bloqueado
app.get('/api/telemetry/check/:hwid', (req, res) => {
  const { hwid } = req.params;
  const settings = loadSettings();
  if (settings.globalMaintenance) {
    return res.json({ registered: true, blocked: true, mode: 'BLOCKED', reason: settings.maintenanceMessage });
  }
  const devices = loadDevices();
  const dev = devices[hwid];
  if (!dev) return res.json({ registered: false, blocked: false, mode: 'DEMO' });
  res.json({
    registered: true,
    blocked: !!dev.blocked,
    reason: dev.blockReason || '',
    mode: dev.mode,
    expiresAt: dev.expiresAt || null,
    lastSeen: dev.lastSeen
  });
});

// Reporte de Tamper / Alteración APK con Notificación Inmediata
app.post('/api/telemetry/report-tamper', (req, res) => {
  const { hwid, reason, details } = req.body || {};
  const clientIp = getClientIp(req);
  const msg = reason || details || 'Intento de deodexing, desensamblado, Frida o evasión de seguridad.';
  
  const adminKey = req.headers['x-admin-key'];
  const isAdmin = isValidAdminKey(adminKey);

  const timestamp = req.headers['x-req-timestamp'];
  const nonce = req.headers['x-req-nonce'];
  const signature = req.headers['x-req-signature'];
  let isCryptoVerified = false;
  if (hwid && timestamp && nonce && signature) {
    const bodyStr = req.rawBody !== undefined ? req.rawBody : (req.body ? JSON.stringify(req.body) : '');
    const bodyHash = sha256(bodyStr).substring(0, 16);
    const expectedSig = sha256(`${hwid}:${timestamp}:${nonce}:${bodyHash}:${MASTER_SECURITY_SALT}`).toUpperCase();
    if (signature.toUpperCase() === expectedSig) {
      isCryptoVerified = true;
    }
  }

  const shouldBlock = isAdmin || isCryptoVerified;

  if (hwid && shouldBlock) {
    const devices = loadDevices();
    if (devices[hwid]) {
      devices[hwid].blocked = true;
      devices[hwid].forceDemo = true;
      devices[hwid].mode = 'DEMO';
      devices[hwid].licenseKey = '';
      devices[hwid].blockReason = `Alerta Tamper: ${msg}`;
      saveDevices(devices);
    }
  }

  addAuditLog('TAMPER_ALERT', hwid || 'DESCONOCIDO', clientIp, `Alerta de seguridad: ${msg}${shouldBlock ? '' : ' (No autenticado - bloqueo omitido)'}`, 'CRITICAL');
  addSecurityLog('TAMPER_ALERT', hwid || 'DESCONOCIDO', clientIp, `Violación de integridad / Intento de Crack: ${msg}`, { details, reason, unverified: !shouldBlock }, req);
  sendWhatsAppAlert('tamper', 'VIOLACIÓN DE INTEGRIDAD / TAMPER', msg, hwid, clientIp);
  res.json({ success: true, blocked: shouldBlock });
});

// ==========================================
// AUTENTICACIÓN Y REGISTRO DE USUARIOS
// ==========================================

const emailVerificationStore = new Map(); // cleanEmail -> { code, expiresAt, attempts, createdAt }

// Wrapper seguro para despacho de correo con timeout estricto anti-bloqueo serverless
async function sendEmailDirect(to, subject, html) {
  try {
    const emailPromise = sendEmailNotification({
      to,
      subject,
      html,
      text: (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    });
    const timeoutPromise = new Promise((resolve) =>
      setTimeout(() => resolve({ success: false, timeout: true }), 3500)
    );
    const res = await Promise.race([emailPromise, timeoutPromise]);
    return !!(res && res.success);
  } catch (err) {
    console.warn('[Email] Fallo controlado en sendEmailDirect:', err.message);
    return false;
  }
}

app.post('/api/auth/register', authRateLimitMiddleware, async (req, res) => {
  try {
    const { email, password, username, hwid } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Correo y contraseña requeridos.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPass = String(password).trim();
    const cleanUser = String(username || cleanEmail.split('@')[0]).trim();

    if (cleanUser.length < 3) {
      return res.status(400).json({ success: false, error: 'El nombre de usuario debe tener al menos 3 caracteres.' });
    }

    if (cleanPass.length < 4) {
      return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 4 caracteres.' });
    }

    const users = loadUsers();
    let existingUser = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (existingUser && existingUser.status === 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Este correo ya se encuentra registrado y activo.' });
    }

    const existingUsername = users.find(u => u.username && u.username.toLowerCase() === cleanUser.toLowerCase() && u.email.toLowerCase() !== cleanEmail);
    if (existingUsername) {
      return res.status(400).json({ success: false, error: 'Este nombre de usuario ya está registrado por otra cuenta. Por favor elige otro.' });
    }

    // Generar código numérico seguro de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos

    if (!existingUser) {
      const newUser = {
        id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
        email: cleanEmail,
        username: cleanUser,
        passwordHash: hashPassword(cleanPass),
        role: 'USER',
        hwid: hwid || '',
        activeHwid: hwid || '',
        status: 'PENDING_VERIFICATION',
        verificationCode: code,
        verificationExpiresAt: expiresAt,
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
    } else {
      // Si ya existía pero estaba en PENDING_VERIFICATION, actualizamos contraseña y nuevo código
      existingUser.username = cleanUser;
      existingUser.passwordHash = hashPassword(cleanPass);
      existingUser.status = 'PENDING_VERIFICATION';
      existingUser.verificationCode = code;
      existingUser.verificationExpiresAt = expiresAt;
      if (hwid) existingUser.hwid = hwid;
    }
    saveUsers(users);

    // Limpiar de tombstones si el correo había sido eliminado previamente
    const tombstones = loadTombstones();
    if (tombstones.deletedUsers && tombstones.deletedUsers[cleanEmail]) {
      delete tombstones.deletedUsers[cleanEmail];
      saveTombstones(tombstones);
    }

    emailVerificationStore.set(cleanEmail, {
      code,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    });

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    // Plantilla HTML corporativa para correo de activación
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background: #0D0D0D; color: #FFF; padding: 24px; border-radius: 8px; max-width: 500px; margin: 0 auto; border: 1px solid #FF5722;">
        <h2 style="color: #FF5722; margin-top: 0;">🐉 Mu Manager PRO</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #CCC;">
          Hola <strong>${cleanUser}</strong>, gracias por registrarte. Usa el siguiente código de activación de un solo uso para verificar tu cuenta:
        </p>
        <div style="background: #1A1A1A; border: 2px dashed #FF5722; padding: 18px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #FF5722;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #888;">
          Este código expira en 15 minutos. Si tú no solicitaste este registro, puedes ignorar este correo.
        </p>
      </div>
    `;

    // Intentar envío de correo SMTP / API con timeout protegido
    const emailSent = await sendEmailDirect(cleanEmail, 'Código de Activación - Mu Manager PRO', emailHtml);

    addAuditLog('REGISTER_INIT', hwid, clientIp, `Registro iniciado: ${cleanUser} (${cleanEmail})`);

    if (!emailSent) {
      const isDev = process.env.NODE_ENV !== 'production';
      console.log(`[SMTP NOTICE] Código de activación para ${cleanEmail}: [ ${code} ]`);
      return res.json({
        success: true,
        pendingSmtp: true,
        devCode: code,
        message: 'Código de activación generado. Revisa tu correo o utiliza el código de verificación en pantalla.'
      });
    }

    res.json({
      success: true,
      message: 'Hemos enviado un código de activación de 6 dígitos a tu correo electrónico.'
    });
  } catch (err) {
    console.error('[Register Error]', err);
    res.status(500).json({ success: false, error: 'Error interno en el servidor de registro: ' + (err.message || 'Desconocido') });
  }
});

// Verificar código de activación de registro
app.post('/api/auth/verify-registration', (req, res) => {
  try {
    const { email, code, hwid } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Correo y código requeridos.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
    }

    let entry = emailVerificationStore.get(cleanEmail);
    let validCode = entry ? entry.code : user.verificationCode;
    let expiresAt = entry ? entry.expiresAt : user.verificationExpiresAt;

    if (!validCode) {
      if (user.status === 'ACTIVE') {
        const token = generateSessionToken(cleanEmail, user.role || 'USER', hwid);
        return res.json({
          success: true,
          token,
          user: { email: user.email, username: user.username },
          message: 'Tu cuenta ya se encuentra verificada y activa.'
        });
      }
      return res.status(400).json({ success: false, error: 'No hay ningún código pendiente para este correo. Solicita uno nuevo.' });
    }

    if (expiresAt && Date.now() > expiresAt) {
      emailVerificationStore.delete(cleanEmail);
      user.verificationCode = undefined;
      user.verificationExpiresAt = undefined;
      saveUsers(users);
      return res.status(400).json({ success: false, error: 'El código de activación ha expirado. Por favor solicita uno nuevo.' });
    }

    if (String(validCode).trim() !== cleanCode) {
      if (entry) entry.attempts = (entry.attempts || 0) + 1;
      return res.status(400).json({ success: false, error: 'Código incorrecto. Por favor verifica los 6 dígitos.' });
    }

    // Código correcto: activar usuario
    emailVerificationStore.delete(cleanEmail);
    user.status = 'ACTIVE';
    user.verificationCode = undefined;
    user.verificationExpiresAt = undefined;
    user.emailVerifiedAt = new Date().toISOString();
    if (hwid) {
      user.hwid = hwid;
      user.activeHwid = hwid;
    }
    saveUsers(users);

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    addAuditLog('REGISTER_CONFIRMED', hwid, clientIp, `Cuenta activada: ${user.username} (${cleanEmail})`);

    const token = generateSessionToken(cleanEmail, user.role || 'USER', hwid);
    res.json({
      success: true,
      token,
      user: { email: user.email, username: user.username },
      message: '¡Cuenta verificada y activada exitosamente!'
    });
  } catch (err) {
    console.error('[Verify Fatal Error]', err);
    res.status(500).json({ success: false, error: 'Error al verificar registro: ' + err.message });
  }
});

// Reenviar código de activación
app.post('/api/auth/resend-verification', async (req, res) => {
  try {
    const { email, hwid } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'Correo requerido.' });

    const cleanEmail = String(email).trim().toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no registrado.' });
    }

    if (user.status === 'ACTIVE') {
      return res.status(400).json({ success: false, error: 'Esta cuenta ya se encuentra activa. Puedes iniciar sesión directamente.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;

    user.verificationCode = code;
    user.verificationExpiresAt = expiresAt;
    saveUsers(users);

    emailVerificationStore.set(cleanEmail, {
      code,
      expiresAt,
      attempts: 0,
      createdAt: new Date().toISOString()
    });

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; background: #0D0D0D; color: #FFF; padding: 24px; border-radius: 8px; max-width: 500px; margin: 0 auto; border: 1px solid #FF5722;">
        <h2 style="color: #FF5722; margin-top: 0;">🐉 Mu Manager PRO</h2>
        <p style="font-size: 15px; line-height: 1.5; color: #CCC;">
          Tu nuevo código de activación es:
        </p>
        <div style="background: #1A1A1A; border: 2px dashed #FF5722; padding: 18px; text-align: center; border-radius: 6px; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #FF5722;">${code}</span>
        </div>
        <p style="font-size: 13px; color: #888;">
          Válido por 15 minutos.
        </p>
      </div>
    `;

    const emailSent = await sendEmailDirect(cleanEmail, 'Nuevo Código de Activación - Mu Manager PRO', emailHtml);
    if (!emailSent) {
      const isDev = process.env.NODE_ENV !== 'production';
      console.log(`[SMTP NOTICE] Código de reenvío para ${cleanEmail}: [ ${code} ]`);
      return res.json({
        success: true,
        pendingSmtp: true,
        devCode: code,
        message: 'Nuevo código de activación generado. Revisa tu correo o utiliza el código en pantalla.'
      });
    }

    res.json({ success: true, message: 'Nuevo código de activación enviado a tu correo.' });
  } catch (err) {
    console.error('[Resend Error]', err);
    res.status(500).json({ success: false, error: 'Error al reenviar código: ' + err.message });
  }
});

const failedLogins = new Map();

app.post('/api/auth/login', authRateLimitMiddleware, (req, res) => {
  const { email, username, password, hwid } = req.body;
  const rawIdentifier = username || email;
  if (!rawIdentifier || !password) {
    return res.status(400).json({ success: false, error: 'Usuario y contraseña requeridos.' });
  }

  const cleanIdentifier = String(rawIdentifier).trim().toLowerCase();
  const cleanPass = String(password).trim();
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Acceso administrativo directo con clave maestra configurada
  if (isValidAdminKey(cleanPass)) {
    failedLogins.delete(clientIp);
    addAuditLog('ADMIN_LOGIN', hwid, clientIp, `Acceso Admin: ${cleanIdentifier}`);
    const token = generateSessionToken(cleanIdentifier, 'ADMIN', hwid);
    return res.json({
      success: true,
      role: 'ADMIN',
      token,
      user: { email: cleanIdentifier, username: cleanIdentifier.split('@')[0] }
    });
  }

  const users = loadUsers();
  const user = users.find(u => (u.username && u.username.toLowerCase() === cleanIdentifier) || (u.email && u.email.toLowerCase() === cleanIdentifier));

  if (!user) {
    const attempts = (failedLogins.get(clientIp) || 0) + 1;
    failedLogins.set(clientIp, attempts);
    if (attempts >= 3) {
      sendWhatsAppAlert('bruteForce', 'ATAQUE DE FUERZA BRUTA EN LOGIN', `${attempts} intentos fallidos con usuario inexistente: ${cleanIdentifier}`, hwid, clientIp);
    }
    return res.status(401).json({ success: false, error: 'Usuario o correo no encontrado.' });
  }

  if (user.status === 'BLOCKED') {
    return res.status(403).json({ success: false, error: 'Tu cuenta ha sido bloqueada por el administrador.' });
  }

  if (user.status === 'PENDING_VERIFICATION') {
    return res.status(403).json({
      success: false,
      error: 'PENDING_VERIFICATION',
      requiresVerification: true,
      email: user.email,
      message: 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada o solicita un nuevo código.'
    });
  }

  const authResult = verifyPassword(cleanPass, user.passwordHash);
  if (!authResult.valid) {
    const attempts = (failedLogins.get(clientIp) || 0) + 1;
    failedLogins.set(clientIp, attempts);
    if (attempts >= 3) {
      sendWhatsAppAlert('bruteForce', 'ATAQUE DE FUERZA BRUTA EN LOGIN', `${attempts} intentos de contraseña incorrecta para: ${cleanEmail}`, hwid, clientIp);
    }
    return res.status(401).json({ success: false, error: 'Contraseña incorrecta.' });
  }

  // Actualización transparente de hash legado SHA-256 a PBKDF2 (H05)
  if (authResult.needsUpgrade) {
    user.passwordHash = hashPassword(cleanPass);
  }

  failedLogins.delete(clientIp);
  user.lastLogin = new Date().toISOString();
  if (hwid) {
    user.hwid = hwid;
    user.activeHwid = hwid;
    user.activeSessionAt = new Date().toISOString();
  }
  saveUsers(users);

  const token = generateSessionToken(user.email, user.role || 'USER', hwid);
  addAuditLog('USER_LOGIN', hwid, clientIp, `Inicio de sesión: ${user.email}`);

  res.json({
    success: true,
    role: user.role || 'USER',
    token,
    user: { email: user.email, username: user.username }
  });
});

// ==========================================
// SISTEMA DE RECUPERACIÓN DE CONTRASEÑA & EMAIL
// ==========================================

const passwordResetStore = new Map(); // email -> { code, expiresAt, attempts }

function sendSmtpEmail({ host, port, secure, user, pass, from, to, subject, html, text }) {
  return new Promise((resolve, reject) => {
    const isSecure = secure === true || port === 465;
    const socket = isSecure
      ? tls.connect(port || 465, host, { rejectUnauthorized: false })
      : net.connect(port || 587, host);

    let stage = 'CONNECT';
    let buffer = '';

    socket.setEncoding('utf8');
    socket.setTimeout(4000);

    const sendCmd = (cmd) => {
      socket.write(cmd + '\r\n');
    };

    socket.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\r\n');
      const lastLine = lines[lines.length - 2] || '';
      const code = parseInt(lastLine.substring(0, 3), 10);

      if (lastLine.charAt(3) === '-') return; // Multi-line response

      buffer = '';

      if (stage === 'CONNECT' && (code === 220)) {
        stage = 'EHLO';
        sendCmd(`EHLO ${host}`);
      } else if (stage === 'EHLO' && code === 250) {
        if (user && pass) {
          stage = 'AUTH_LOGIN';
          sendCmd('AUTH LOGIN');
        } else {
          stage = 'MAIL_FROM';
          sendCmd(`MAIL FROM:<${from}>`);
        }
      } else if (stage === 'AUTH_LOGIN' && code === 334) {
        stage = 'AUTH_USER';
        sendCmd(Buffer.from(user).toString('base64'));
      } else if (stage === 'AUTH_USER' && code === 334) {
        stage = 'AUTH_PASS';
        sendCmd(Buffer.from(pass).toString('base64'));
      } else if (stage === 'AUTH_PASS' && code === 235) {
        stage = 'MAIL_FROM';
        sendCmd(`MAIL FROM:<${from}>`);
      } else if (stage === 'MAIL_FROM' && code === 250) {
        stage = 'RCPT_TO';
        sendCmd(`RCPT TO:<${to}>`);
      } else if (stage === 'RCPT_TO' && code === 250) {
        stage = 'DATA';
        sendCmd('DATA');
      } else if (stage === 'DATA' && code === 354) {
        stage = 'BODY';
        const rawMessage = [
          `From: "Mu Manager PRO" <${from}>`,
          `To: <${to}>`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          html || text,
          '.',
        ].join('\r\n');
        sendCmd(rawMessage);
      } else if (stage === 'BODY' && code === 250) {
        stage = 'QUIT';
        sendCmd('QUIT');
        socket.end();
        resolve({ success: true, message: 'Correo enviado exitosamente vía SMTP.' });
      } else if (code >= 400) {
        socket.destroy();
        reject(new Error(`Error SMTP (${code}): ${lastLine}`));
      }
    });

    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('Tiempo de espera agotado al conectar al servidor SMTP.'));
    });

    socket.on('error', (err) => {
      reject(err);
    });
  });
}

async function sendEmailNotification({ to, subject, html, text }) {
  const settings = loadSettings();
  const emailCfg = settings.email || {};
  let sentVia = null;

  // 1. Si está configurado Resend API
  if (emailCfg.resendApiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${emailCfg.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: emailCfg.from || 'soporte@mumanagerpro.com',
          to,
          subject,
          html: html || text
        })
      });
      if (res.ok) sentVia = 'Resend API';
    } catch (e) {
      console.warn('[Email] Error sending via Resend:', e.message);
    }
  }

  // 2. Si está configurado SMTP
  if (!sentVia && emailCfg.smtp && emailCfg.smtp.host) {
    try {
      await sendSmtpEmail({
        host: emailCfg.smtp.host,
        port: parseInt(emailCfg.smtp.port, 10) || 465,
        secure: emailCfg.smtp.secure !== false,
        user: (process.env.SMTP_USER && process.env.SMTP_USER.trim()) || emailCfg.smtp.user,
        pass: (process.env.SMTP_PASS && process.env.SMTP_PASS.trim()) || emailCfg.smtp.pass,
        from: emailCfg.from || (process.env.SMTP_USER && process.env.SMTP_USER.trim()) || emailCfg.smtp.user,
        to,
        subject,
        html,
        text
      });
      sentVia = `SMTP (${emailCfg.smtp.host})`;
    } catch (e) {
      console.warn('[Email] Error sending via SMTP:', e.message);
    }
  }

  return { success: !!sentVia, sentVia };
}

// Solicitar código OTP para recuperación de contraseña
app.post('/api/auth/forgot-password/request', authRateLimitMiddleware, async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ success: false, error: 'Correo electrónico requerido.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: 'No se encontró ninguna cuenta registrada con este correo electrónico.'
    });
  }

  // Generar código numérico seguro de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutos

  passwordResetStore.set(cleanEmail, {
    code,
    expiresAt,
    attempts: 0,
    createdAt: new Date().toISOString()
  });

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  // Plantilla HTML elegante para el correo
  const emailHtml = `
    <div style="font-family: Arial, sans-serif; background: #0D0D0D; color: #FFF; padding: 24px; border-radius: 8px; max-width: 500px; margin: 0 auto; border: 1px solid #FF5722;">
      <h2 style="color: #FF5722; margin-top: 0;">🐉 Mu Manager PRO</h2>
      <p style="font-size: 15px; color: #DDD;">Hola <strong>${user.username || cleanEmail}</strong>,</p>
      <p style="font-size: 14px; color: #AAA;">Has solicitado restablecer la contraseña de tu cuenta en Mu Manager PRO. Utiliza el siguiente código de verificación de 6 dígitos:</p>
      <div style="background: rgba(255, 87, 34, 0.15); border: 2px dashed #FF5722; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #00E676; font-family: monospace;">${code}</span>
      </div>
      <p style="font-size: 12px; color: #888;">⏱️ Este código expira en <strong>15 minutos</strong>. Si tú no solicitaste este cambio, puedes ignorar este correo de forma segura.</p>
      <hr style="border: 0; border-top: 1px solid #333; margin: 20px 0;" />
      <p style="font-size: 11px; color: #666; text-align: center;">Mu Manager PRO • Sistema de Control y Seguridad</p>
    </div>
  `;

  // Intento de envío por Email (SMTP / API)
  const emailResult = await sendEmailNotification({
    to: cleanEmail,
    subject: '🔑 Código de Recuperación de Contraseña — Mu Manager PRO',
    html: emailHtml,
    text: `Tu código de recuperación para Mu Manager PRO es: ${code} (Expira en 15 minutos).`
  });

  // Respaldo de Entrega Inmediata: Log de auditoría + Alerta WhatsApp si está activo
  addAuditLog(
    'PASSWORD_RESET_OTP',
    user.hwid || 'N/A',
    clientIp,
    `Código de recuperación generado para ${cleanEmail}: [ ${code} ] (Envío: ${emailResult.sentVia || 'Pendiente SMTP - Ver en Panel/WhatsApp'})`
  );

  sendWhatsAppAlert(
    'security',
    'CÓDIGO DE RECUPERACIÓN DE CONTRASEÑA',
    `Usuario: ${cleanEmail}\nCódigo OTP: ${code}\nExpira en 15 minutos.`,
    user.hwid || 'N/A',
    clientIp
  );

  res.json({
    success: true,
    message: emailResult.success
      ? `Código enviado exitosamente a tu correo (${cleanEmail}).`
      : `Código generado. Si aún no configuraste SMTP, puedes ver el código en el Log de Auditoría del Panel Administrativo o en WhatsApp.`,
    emailSent: emailResult.success,
    pendingSmtp: !emailResult.success,
    devCode: (!emailResult.success && process.env.NODE_ENV !== 'production') ? code : undefined,
    deliveryMethod: emailResult.sentVia || 'PANEL_AUDIT_LOG'
  });
});

// Verificar código OTP antes de cambiar contraseña
app.post('/api/auth/forgot-password/verify-code', (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Correo y código requeridos.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();
  const record = passwordResetStore.get(cleanEmail);

  if (!record) {
    return res.status(400).json({
      success: false,
      error: 'No hay ninguna solicitud de recuperación pendiente para este correo. Solicita un nuevo código.'
    });
  }

  if (Date.now() > record.expiresAt) {
    passwordResetStore.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      error: 'El código ha expirado (validez: 15 minutos). Solicita uno nuevo.'
    });
  }

  record.attempts = (record.attempts || 0) + 1;
  if (record.attempts > 5) {
    passwordResetStore.delete(cleanEmail);
    return res.status(400).json({
      success: false,
      error: 'Demasiados intentos fallidos. Por seguridad, debes solicitar un nuevo código.'
    });
  }

  if (record.code !== cleanCode) {
    return res.status(400).json({
      success: false,
      error: `Código incorrecto. Te quedan ${5 - record.attempts} intentos.`
    });
  }

  res.json({
    success: true,
    message: 'Código verificado correctamente.'
  });
});

// Restablecer contraseña con código verificado
app.post('/api/auth/forgot-password/reset', (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ success: false, error: 'Todos los campos son requeridos.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(code).trim();
  const cleanPass = String(newPassword).trim();

  if (cleanPass.length < 8) {
    return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres.' });
  }

  const record = passwordResetStore.get(cleanEmail);
  if (!record || record.code !== cleanCode || Date.now() > record.expiresAt) {
    return res.status(400).json({
      success: false,
      error: 'Código de recuperación inválido o expirado. Solicita un nuevo código.'
    });
  }

  const users = loadUsers();
  const user = users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
  }

  user.passwordHash = hashPassword(cleanPass);
  user.updatedAt = new Date().toISOString();
  saveUsers(users);

  passwordResetStore.delete(cleanEmail);

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  addAuditLog('USER_PW_RECOVERED', user.hwid || 'RECOVERY', clientIp, `Contraseña recuperada exitosamente por el usuario: ${cleanEmail}`);

  res.json({
    success: true,
    message: '¡Tu contraseña ha sido restablecida exitosamente! Ya puedes iniciar sesión con tu nueva contraseña.'
  });
});

// Listar usuarios registrados para el panel web
app.get('/api/admin/users', (req, res) => {
  const users = loadUsers();
  const nowMs = Date.now();
  const safeList = users.map(u => {
    const lastSeenMs = u.lastSeen ? new Date(u.lastSeen).getTime() : 0;
    const isOnline = (nowMs - lastSeenMs) < 180000; // 3 minutos
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role || 'USER',
      hwid: u.hwid || '',
      status: u.status || 'ACTIVE',
      createdAt: u.createdAt,
      lastLogin: u.lastLogin,
      lastSeen: u.lastSeen || null,
      isOnline
    };
  });
  res.json(safeList);
});

// Estado del almacenamiento del servidor (Cloud vs Local) con comprobación viva
app.get('/api/admin/storage/status', async (req, res) => {
  const devices = loadDevices();
  const tombstones = loadTombstones();
  let livePingOk = false;
  let livePingError = null;

  if (CLOUD_STORAGE.enabled) {
    try {
      const pingResult = await CLOUD_STORAGE.exec('PING');
      if (pingResult === 'PONG' || pingResult !== null) {
        livePingOk = true;
      } else {
        livePingError = 'La base de datos Cloud no respondió a la consulta de prueba';
      }
    } catch (err) {
      livePingError = err.message;
    }
  }

  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    success: true,
    cloudStorageEnabled: CLOUD_STORAGE.enabled,
    provider: CLOUD_STORAGE.provider,
    livePingOk,
    livePingError,
    deviceCount: Object.keys(devices).length,
    tombstoneCount: Object.keys(tombstones).length
  });
});

// Purgar dispositivos inactivos o de prueba
app.post('/api/admin/devices/purge-inactive', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado' });
  }

  const { days = 7, purgeTests = false } = req.body;
  const numDays = Math.max(1, parseInt(days, 10) || 7);
  const cutoffTime = Date.now() - (numDays * 86400 * 1000);

  const devices = loadDevices();
  const tombstones = loadTombstones();
  const purgedHwids = [];

  for (const [hwid, dev] of Object.entries(devices)) {
    const isTest = purgeTests && (hwid.startsWith('TEST') || dev.isTest);
    const lastSeenTime = dev.lastSeen ? new Date(dev.lastSeen).getTime() : 0;
    const isInactive = lastSeenTime > 0 && lastSeenTime < cutoffTime;

    if (isTest || isInactive) {
      delete devices[hwid];
      purgedHwids.push(hwid);
    }
  }

  if (purgedHwids.length > 0) {
    saveDevices(devices);
    addAuditLog('PURGE_INACTIVE', 'ADMIN', getClientIp(req), `Purga ejecutada: ${purgedHwids.length} registros limpiados (${purgedHwids.join(', ')})`);
  }

  res.json({
    success: true,
    purgedCount: purgedHwids.length,
    purgedHwids,
    message: `Se purgaron ${purgedHwids.length} dispositivos inactivos (+${numDays} días) con éxito.`
  });
});

// Exportar backup completo en JSON para persistencia y sincronización
app.get('/api/admin/backup/export', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ error: 'Acceso no autorizado' });
  }

  const users = loadUsers();
  const devices = loadDevices();
  const settings = loadSettings();
  const tombstones = loadTombstones();
  res.json({
    version: '1.5.3',
    timestamp: new Date().toISOString(),
    cloudStorageEnabled: CLOUD_STORAGE.enabled,
    provider: CLOUD_STORAGE.provider,
    totalDevices: Object.keys(devices).length,
    totalUsers: users.length,
    users,
    devices,
    settings,
    tombstones
  });
});

// Importar / restaurar backup completo
app.post('/api/admin/backup/import', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado' });
  }

  const payload = req.body.backupData || req.body;
  const { users, devices, settings, tombstones } = payload;
  let devCount = 0;
  let usrCount = 0;

  if (devices && typeof devices === 'object') {
    saveDevices(devices);
    devCount = Object.keys(devices).length;
  }
  if (Array.isArray(users)) {
    saveUsers(users);
    usrCount = users.length;
  }
  if (settings && typeof settings === 'object') {
    saveSettings(settings);
  }
  if (tombstones && typeof tombstones === 'object') {
    saveTombstones(tombstones);
  }

  addAuditLog('BACKUP_RESTORE', 'PANEL', getClientIp(req), `Copia de seguridad restaurada: ${devCount} dispositivos, ${usrCount} usuarios.`);
  res.json({ success: true, message: `Respaldo restaurado con éxito: ${devCount} celulares y ${usrCount} usuarios actualizados.` });
});

// Reinicio Limpio de Base de Datos (Zero Ghost / Fresh Start) con respaldo preventivo
app.post('/api/admin/database/reset-clean', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado' });
  }

  const { confirmation } = req.body || {};
  if (confirmation !== 'RESET_CLEAN_DATABASE') {
    return res.status(400).json({
      success: false,
      error: 'Se requiere confirmación exacta: "RESET_CLEAN_DATABASE"'
    });
  }

  try {
    // 1. Crear respaldo preventivo automático
    const currentDevices = loadDevices();
    const currentUsers = loadUsers();
    const currentSettings = loadSettings();
    const currentTombstones = loadTombstones();
    const currentLogs = [...auditLogs];

    const backupData = {
      version: '1.5.3',
      exportedAt: new Date().toISOString(),
      reason: 'Pre-Reset Clean Database Backup',
      devices: currentDevices,
      users: currentUsers,
      settings: currentSettings,
      tombstones: currentTombstones,
      auditLogs: currentLogs
    };

    const backupFileName = `pre-reset-backup-${Date.now()}.json`;
    const backupFilePath = path.join(BASE_DATA_DIR, backupFileName);
    safeAtomicWriteJson(backupFilePath, backupData);

    // 2. Reiniciar dispositivos a limpio {}
    inMemoryFallback[DATA_FILE] = {};
    safeAtomicWriteJson(DATA_FILE, {});
    const seedDev = path.join(__dirname, 'data', 'devices.json');
    if (fs.existsSync(seedDev)) safeAtomicWriteJson(seedDev, {});

    // 3. Reiniciar tombstones a limpio {}
    inMemoryFallback[TOMBSTONES_FILE] = {};
    safeAtomicWriteJson(TOMBSTONES_FILE, {});
    const seedTom = path.join(__dirname, 'data', 'tombstones.json');
    if (fs.existsSync(seedTom)) safeAtomicWriteJson(seedTom, {});

    // 4. Reiniciar usuarios conservando únicamente la cuenta admin
    const cleanAdmin = [
      {
        id: 'usr_admin_default',
        email: 'admin_test@muonline.com',
        username: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        hwid: ''
      }
    ];
    inMemoryFallback[USERS_FILE] = cleanAdmin;
    safeAtomicWriteJson(USERS_FILE, cleanAdmin);
    const seedUsr = path.join(__dirname, 'data', 'users.json');
    if (fs.existsSync(seedUsr)) safeAtomicWriteJson(seedUsr, cleanAdmin);

    // 5. Reiniciar solicitudes PRO
    inMemoryFallback[PRO_REQUESTS_FILE] = [];
    safeAtomicWriteJson(PRO_REQUESTS_FILE, []);

    // 6. Sincronizar con almacenamiento en la nube si está habilitado
    if (CLOUD_STORAGE.enabled) {
      await Promise.all([
        CLOUD_STORAGE.set('mumanager:devices', {}),
        CLOUD_STORAGE.set('mumanager:users', cleanAdmin),
        CLOUD_STORAGE.set('mumanager:tombstones', {}),
        CLOUD_STORAGE.set('mumanager:proRequests', [])
      ]);
    }

    addAuditLog('CLEAN_DATABASE_RESET', 'ADMIN', getClientIp(req), `Base de datos reiniciada a cero (Zero Ghost). Respaldo preventivo: ${backupFileName}`);

    res.json({
      success: true,
      message: 'Base de datos reiniciada exitosamente desde cero. Se creó un respaldo automático preventivo.',
      backupFile: backupFileName
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Crear cuenta de usuario desde el panel
app.post('/api/admin/user/create', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado. Clave de administrador requerida.' });
  }

  const { email, password, username, role, status } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email y contraseña requeridos' });
  }
  const cleanEmail = String(email).trim().toLowerCase();
  const cleanPass = String(password).trim();
  if (cleanPass.length < 8) {
    return res.status(400).json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' });
  }
  const users = loadUsers();
  if (users.some(u => u.email.toLowerCase() === cleanEmail)) {
    return res.status(409).json({ success: false, error: 'Ya existe una cuenta con este correo electrónico' });
  }

  // Si estaba registrado como eliminado, remover el tombstone para permitir su re-creación
  const tombstones = loadTombstones();
  if (tombstones.deletedUsers && tombstones.deletedUsers[cleanEmail]) {
    delete tombstones.deletedUsers[cleanEmail];
    saveTombstones(tombstones);
  }

  const newUser = {
    id: 'usr_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    email: cleanEmail,
    passwordHash: hashPassword(cleanPass),
    username: (username && String(username).trim()) || cleanEmail.split('@')[0],
    role: role === 'ADMIN' ? 'ADMIN' : 'USER',
    status: status === 'BLOCKED' ? 'BLOCKED' : 'ACTIVE',
    createdAt: new Date().toISOString(),
    lastLogin: null,
    hwid: ''
  };
  users.push(newUser);
  saveUsers(users);
  addAuditLog('USER_CREATED_BY_ADMIN', 'PANEL', req.socket.remoteAddress || '127.0.0.1', `Cuenta creada por admin: ${cleanEmail} (${newUser.role})`);
  res.json({ success: true, message: 'Usuario creado exitosamente.', user: { id: newUser.id, email: newUser.email, username: newUser.username, role: newUser.role, status: newUser.status } });
});

// Modificar contraseña de usuario desde el panel
app.post('/api/admin/user/reset-password', (req, res) => {
  const { id, email, newPassword } = req.body;
  if (!newPassword || String(newPassword).trim().length < 8) {
    return res.status(400).json({ success: false, error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }
  const users = loadUsers();
  const user = users.find(u => (id && u.id === id) || (email && u.email.toLowerCase() === String(email).toLowerCase()));
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  user.passwordHash = hashPassword(String(newPassword).trim());
  saveUsers(users);
  addAuditLog('USER_PW_RESET', user.hwid || 'PANEL', req.socket.remoteAddress || '127.0.0.1', `Contraseña cambiada por admin: ${user.email}`);
  res.json({ success: true, message: 'Contraseña actualizada exitosamente.' });
});

// Cambiar rol de usuario desde el panel
app.post('/api/admin/user/change-role', (req, res) => {
  const { id, email, role } = req.body;
  const users = loadUsers();
  const user = users.find(u => (id && u.id === id) || (email && u.email.toLowerCase() === String(email).toLowerCase()));
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  user.role = role === 'ADMIN' ? 'ADMIN' : 'USER';
  saveUsers(users);
  addAuditLog('USER_ROLE_CHANGED', user.hwid || 'PANEL', req.socket.remoteAddress || '127.0.0.1', `Rol de ${user.email} cambiado a ${user.role}`);
  res.json({ success: true, role: user.role, message: `Rol actualizado a ${user.role}` });
});

// Bloquear / Desbloquear usuario desde el panel
app.post('/api/admin/user/toggle-block', (req, res) => {
  const { id, email } = req.body;
  const users = loadUsers();
  const user = users.find(u => (id && u.id === id) || (email && u.email.toLowerCase() === String(email).toLowerCase()));
  if (!user) return res.status(404).json({ success: false, error: 'Usuario no encontrado' });

  user.status = user.status === 'BLOCKED' ? 'ACTIVE' : 'BLOCKED';
  saveUsers(users);

  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  addAuditLog(user.status === 'BLOCKED' ? 'USER_BLOCKED' : 'USER_UNBLOCKED', user.hwid, clientIp, `Usuario ${user.status}: ${user.email}`);

  res.json({ success: true, status: user.status, email: user.email });
});

// Eliminar usuario desde el panel con registro de revocación (Tombstone)
app.post('/api/admin/user/delete', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado. Clave de administrador requerida.' });
  }

  const { id, email } = req.body;
  if (!id && !email) {
    return res.status(400).json({ success: false, error: 'ID o Email de usuario requerido para eliminar.' });
  }

  let users = loadUsers();
  const cleanEmail = email ? String(email).trim().toLowerCase() : '';
  const cleanId = id ? String(id).trim() : '';

  const targetUser = users.find(u => 
    (cleanId && u.id === cleanId) || 
    (cleanEmail && (u.email || '').toLowerCase() === cleanEmail)
  );

  if (!targetUser) {
    // Si ya no está en la lista activa, comprobar si ya figuraba como tombstoned
    const tombstones = loadTombstones();
    if (tombstones.deletedUsers && ((cleanEmail && tombstones.deletedUsers[cleanEmail]) || (cleanId && tombstones.deletedUsers[cleanId.toLowerCase()]))) {
      return res.json({ success: true, message: 'El usuario ya se encontraba eliminado.', email: cleanEmail || cleanId });
    }
    return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
  }

  const targetEmail = (targetUser.email || cleanEmail).toLowerCase();
  const targetId = targetUser.id || cleanId;

  // Registrar en Tombstones para evitar resurrección permanente
  const tombstones = loadTombstones();
  tombstones.deletedUsers = tombstones.deletedUsers || {};
  const tombstoneRecord = {
    deletedAt: new Date().toISOString(),
    id: targetId,
    hwid: targetUser.hwid || '',
    username: targetUser.username || '',
    deletedBy: 'ADMIN_PANEL'
  };
  if (targetEmail) tombstones.deletedUsers[targetEmail] = tombstoneRecord;
  if (targetId) tombstones.deletedUsers[targetId.toLowerCase()] = tombstoneRecord;
  saveTombstones(tombstones);

  // Filtrar estrictamente por ID y por Email para evitar cualquier residuo
  users = users.filter(u => 
    u.id !== targetId && 
    (!targetEmail || (u.email || '').toLowerCase() !== targetEmail)
  );
  saveUsers(users);

  addAuditLog('USER_DELETED', targetUser.hwid || 'PANEL', getClientIp(req), `Cuenta de usuario eliminada permanentemente: ${targetEmail || targetId}`);
  res.json({ success: true, message: 'Usuario eliminado con éxito.', email: targetEmail, id: targetId });
});

// Actualizar información completa de usuario desde el panel (modal y menú contextual)
app.post('/api/admin/user/update', (req, res) => {
  const { id, email, newEmail, username, password, role, status, hwid, notes } = req.body;
  if (!id && !email) {
    return res.status(400).json({ success: false, error: 'ID o Email del usuario requerido.' });
  }

  const users = loadUsers();
  const user = users.find(u => (id && u.id === id) || (email && u.email.toLowerCase() === String(email).trim().toLowerCase()));
  if (!user) {
    return res.status(404).json({ success: false, error: 'Usuario no encontrado.' });
  }

  // Si se solicita cambio de correo, verificar que no esté en uso por otra cuenta
  if (newEmail && String(newEmail).trim().toLowerCase() !== user.email.toLowerCase()) {
    const cleanNewEmail = String(newEmail).trim().toLowerCase();
    if (users.some(u => u.id !== user.id && u.email.toLowerCase() === cleanNewEmail)) {
      return res.status(409).json({ success: false, error: 'El nuevo correo ya está en uso por otra cuenta.' });
    }
    user.email = cleanNewEmail;
  }

  if (username !== undefined) {
    user.username = String(username).trim() || user.email.split('@')[0];
  }

  if (role && (role === 'ADMIN' || role === 'USER')) {
    user.role = role;
  }

  if (status && (status === 'ACTIVE' || status === 'BLOCKED')) {
    user.status = status;
  }

  if (hwid !== undefined) {
    user.hwid = String(hwid).trim();
  }

  if (notes !== undefined) {
    user.notes = String(notes).trim();
  }

  if (password && String(password).trim().length >= 4) {
    user.passwordHash = hashPassword(String(password).trim());
  }

  user.updatedAt = new Date().toISOString();

  saveUsers(users);
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  addAuditLog('USER_UPDATED_BY_ADMIN', user.hwid || 'PANEL', clientIp, `Cuenta actualizada por admin: ${user.email} (Rol: ${user.role}, Estado: ${user.status})`);

  res.json({
    success: true,
    message: 'Cuenta actualizada exitosamente.',
    user: {
      id: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
      status: user.status,
      hwid: user.hwid,
      notes: user.notes,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLogin: user.lastLogin,
      lastSeen: user.lastSeen
    }
  });
});

// Publicar / Actualizar Anuncio Global (Broadcast)
app.post('/api/admin/broadcast', (req, res) => {
  const { active, title, message, type, displayMode } = req.body;
  const settings = loadSettings();
  settings.broadcast = {
    active: !!active,
    id: 'ann_' + Date.now(),
    title: title || '',
    message: message || '',
    type: ['INFO', 'WARNING', 'URGENT', 'PROMO'].includes(type) ? type : 'INFO',
    displayMode: ['MODAL', 'BANNER'].includes(displayMode) ? displayMode : 'BANNER',
    updatedAt: new Date().toISOString()
  };
  settings.broadcastAnnouncement = settings.broadcast.active ? `${settings.broadcast.title}: ${settings.broadcast.message}` : '';
  saveSettings(settings);
  addAuditLog('BROADCAST_UPDATED', 'ALL_DEVICES', req.socket.remoteAddress || '127.0.0.1', `Aviso global ${settings.broadcast.active ? 'ACTIVADO' : 'DESACTIVADO'}: "${settings.broadcast.title}"`);
  res.json({ success: true, broadcast: settings.broadcast });
});

// Configuración de Versiones y Enlace de APK (In-App Auto-Updater)
app.post('/api/admin/app-version', (req, res) => {
  const { latestVersion, minRequiredVersion, latestApkUrl, updateChangelog, forceUpdate } = req.body;
  const settings = loadSettings();
  if (latestVersion) settings.latestVersion = String(latestVersion).trim();
  if (minRequiredVersion) settings.minRequiredVersion = String(minRequiredVersion).trim();
  if (latestApkUrl !== undefined) settings.latestApkUrl = String(latestApkUrl).trim();
  if (updateChangelog !== undefined) settings.updateChangelog = String(updateChangelog).trim();
  if (forceUpdate !== undefined) settings.forceUpdate = !!forceUpdate;

  saveSettings(settings);
  addAuditLog('VERSION_UPDATED', 'ALL_DEVICES', req.socket.remoteAddress || '127.0.0.1', `Nueva versión configurada: v${settings.latestVersion} (Forzada: ${settings.forceUpdate})`);
  res.json({
    success: true,
    latestVersion: settings.latestVersion,
    minRequiredVersion: settings.minRequiredVersion,
    latestApkUrl: settings.latestApkUrl,
    updateChangelog: settings.updateChangelog,
    forceUpdate: settings.forceUpdate
  });
});

// Registro de Solicitud de Acceso al Canal Beta (Desde APK)
app.post('/api/beta/request', (req, res) => {
  const { hwid, email, reason } = req.body;
  if (!hwid) return res.status(400).json({ success: false, message: 'HWID requerido' });
  const settings = loadSettings();
  if (!settings.beta) {
    settings.beta = {
      enabled: true,
      latestBetaVersion: '1.1.9',
      betaChangelog: '• Canal Beta: Pruebas de nuevas funciones y optimizaciones.',
      approvedHwids: [],
      requests: []
    };
  }
  const requests = settings.beta.requests || [];
  const existing = requests.find(r => r.hwid === hwid);
  const now = new Date().toISOString();
  if (existing) {
    existing.email = email || existing.email;
    existing.reason = reason || existing.reason;
    existing.updatedAt = now;
  } else {
    requests.push({
      hwid,
      email: email || '',
      reason: reason || 'Solicitud desde APK',
      status: 'PENDING',
      requestedAt: now
    });
  }
  settings.beta.requests = requests;
  saveSettings(settings);
  addAuditLog('BETA_REQUEST', hwid, req.socket.remoteAddress || '127.0.0.1', `Solicitud de acceso Beta de ${email || hwid}`);
  res.json({
    success: true,
    status: existing ? existing.status : 'PENDING',
    message: 'Solicitud de acceso al Canal Beta registrada. El administrador la revisará a la brevedad.'
  });
});

// Listar solicitudes de acceso al Canal Beta (Admin)
app.get('/api/admin/beta-requests', (req, res) => {
  const settings = loadSettings();
  const beta = settings.beta || { enabled: true, approvedHwids: [], requests: [] };
  res.json({
    success: true,
    enabled: !!beta.enabled,
    latestBetaVersion: beta.latestBetaVersion || '',
    approvedHwids: beta.approvedHwids || [],
    requests: beta.requests || []
  });
});

// Aprobar o rechazar acceso al Canal Beta (Admin)
app.post('/api/admin/beta-approve', (req, res) => {
  const { hwid, approve } = req.body;
  if (!hwid) return res.status(400).json({ success: false, message: 'HWID requerido' });
  const settings = loadSettings();
  if (!settings.beta) settings.beta = { enabled: true, approvedHwids: [], requests: [] };
  if (!Array.isArray(settings.beta.approvedHwids)) settings.beta.approvedHwids = [];
  if (!Array.isArray(settings.beta.requests)) settings.beta.requests = [];

  const reqItem = settings.beta.requests.find(r => r.hwid === hwid);
  if (approve) {
    if (!settings.beta.approvedHwids.includes(hwid)) {
      settings.beta.approvedHwids.push(hwid);
    }
    if (reqItem) reqItem.status = 'APPROVED';
  } else {
    settings.beta.approvedHwids = settings.beta.approvedHwids.filter(h => h !== hwid);
    if (reqItem) reqItem.status = 'REJECTED';
  }
  saveSettings(settings);
  addAuditLog('BETA_STATUS_CHANGE', hwid, req.socket.remoteAddress || '127.0.0.1', `Acceso Beta ${approve ? 'APROBADO' : 'REVOCADO'} para ${hwid}`);
  res.json({ success: true, approved: !!approve, status: approve ? 'APPROVED' : 'REJECTED' });
});

// Activar o desactivar Rollback de Emergencia (Admin)
app.post('/api/admin/rollback/trigger', (req, res) => {
  const { active, targetVersion, reason, targetApkUrl, forceRollback } = req.body;
  const settings = loadSettings();
  settings.rollback = {
    active: !!active,
    targetVersion: targetVersion ? String(targetVersion).trim() : (settings.rollback?.targetVersion || '1.1.7'),
    targetApkUrl: targetApkUrl !== undefined ? String(targetApkUrl).trim() : (settings.rollback?.targetApkUrl || ''),
    reason: reason ? String(reason).trim() : (settings.rollback?.reason || 'Rollback preventivo de emergencia'),
    forceRollback: forceRollback !== undefined ? !!forceRollback : true,
    triggeredAt: active ? new Date().toISOString() : null
  };
  saveSettings(settings);
  addAuditLog('ROLLBACK_ACTION', 'ALL_DEVICES', req.socket.remoteAddress || '127.0.0.1', `Rollback de emergencia ${settings.rollback.active ? 'ACTIVADO hacia v' + settings.rollback.targetVersion : 'DESACTIVADO'}`);
  res.json({ success: true, rollback: settings.rollback });
});

// Descargar Copia de Seguridad JSON
app.get('/api/admin/backup', (req, res) => {
  const users = loadUsers();
  const devices = loadDevices();
  const settings = loadSettings();
  const tombstones = loadTombstones();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=mumanager-backup-${new Date().toISOString().slice(0, 10)}.json`);
  res.json({
    version: '1.5.3',
    exportedAt: new Date().toISOString(),
    cloudStorageEnabled: CLOUD_STORAGE.enabled,
    provider: CLOUD_STORAGE.provider,
    totalUsers: users.length,
    totalDevices: Object.keys(devices).length,
    users,
    devices,
    settings,
    tombstones
  });
});

// Cambiar Clave Maestra del Panel de Control (Admin)
app.post('/api/admin/change-key', (req, res) => {
  const { newKey } = req.body || {};
  if (!newKey || typeof newKey !== 'string' || newKey.trim().length < 8) {
    return res.status(400).json({ success: false, error: 'La nueva clave debe tener al menos 8 caracteres.' });
  }
  const cleanKey = newKey.trim();
  const settings = loadSettings();
  settings.adminKey = cleanKey;
  saveSettings(settings);
  addAuditLog('ADMIN_KEY_CHANGED', 'N/A', getClientIp(req), 'Clave de acceso al panel actualizada por el administrador.');

  let note = '';
  if (process.env.ADMIN_KEY) {
    note = ' (Nota: Tu entorno Vercel/Cloud tiene configurada la variable ADMIN_KEY. Ambas claves serán válidas temporalmente; actualízala también en Vercel para cambios permanentes).';
  }
  return res.json({
    success: true,
    message: `Clave maestra del panel actualizada correctamente.${note}`,
    hasEnvAdminKey: !!process.env.ADMIN_KEY
  });
});

// Limpiar Registro de Auditoría
app.post('/api/admin/logs/clear', (req, res) => {
  auditLogs.length = 0;
  addAuditLog('LOGS_CLEARED', 'PANEL', req.socket.remoteAddress || '127.0.0.1', 'Registro de auditoría limpiado por el administrador');
  res.json({ success: true, message: 'Logs limpiados con éxito.' });
});

// Listar dispositivos para el panel web (con actualización de expirados y presencia online)
app.get('/api/admin/devices', (req, res) => {
  const devices = loadDevices();
  let modified = false;
  const now = new Date();
  const nowMs = Date.now();
  const list = Object.values(devices).map(dev => {
    // Verificar si expiró PRO o DEMO
    if (dev.expiresAt && new Date(dev.expiresAt) < now) {
      if (dev.mode === 'PRO') {
        dev.mode = 'DEMO';
        dev.forceDemo = true;
        dev.licenseKey = '';
        dev.blockReason = 'Licencia PRO por tiempo finalizada. Contacta a soporte para renovar.';
        modified = true;
      } else if (!dev.blocked) {
        dev.blocked = true;
        dev.blockReason = 'Período de prueba finalizado.';
        modified = true;
      }
    }
    const lastSeenMs = dev.lastSeen ? new Date(dev.lastSeen).getTime() : 0;
    const isOnline = (nowMs - lastSeenMs) < 60000;
    const isTest = isTestDevice(dev);
    const countryCode = dev.countryCode || '';
    const flag = dev.flag || (countryCode ? getCountryFlag(countryCode) : '🌐');
    const country = dev.country || (countryCode ? getCountryName(countryCode) : 'Desconocido');
    const isLifetime = dev.mode === 'PRO' && !dev.expiresAt;
    const diffMs = dev.expiresAt ? (new Date(dev.expiresAt).getTime() - nowMs) : null;
    const daysRemaining = diffMs !== null ? Math.max(0, Math.ceil(diffMs / 86400000)) : null;
    const hoursRemaining = diffMs !== null ? Math.max(0, Math.round(diffMs / 3600000)) : null;
    const minutesRemaining = diffMs !== null ? Math.max(0, Math.round(diffMs / 60000)) : null;
    const timeRemainingFormatted = formatTimeRemaining(dev.expiresAt, isLifetime, nowMs);

    return {
      ...dev,
      isOnline,
      isTest,
      isLifetime,
      daysRemaining,
      hoursRemaining,
      minutesRemaining,
      timeRemainingFormatted,
      flag,
      country,
      city: dev.city || ''
    };
  });

  // Ordenamiento determinista multinivel (En línea primero, luego más reciente, luego HWID)
  list.sort((a, b) => {
    if (a.isOnline !== b.isOnline) {
      return (b.isOnline ? 1 : 0) - (a.isOnline ? 1 : 0);
    }
    const timeA = Date.parse(a.lastSeen) || 0;
    const timeB = Date.parse(b.lastSeen) || 0;
    if (timeB !== timeA) {
      return timeB - timeA;
    }
    return String(a.hwid || '').localeCompare(String(b.hwid || ''));
  });

  if (modified) saveDevices(devices);
  res.json(list);
});

// Marcar/Desmarcar dispositivo como prueba vs cliente
app.post('/api/admin/device/toggle-test', (req, res) => {
  const { hwid, isTest } = req.body || {};
  if (!hwid) return res.status(400).json({ success: false, error: 'HWID requerido' });
  const devices = loadDevices();
  if (!devices[hwid]) return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
  
  devices[hwid].isTest = isTest !== undefined ? !!isTest : !isTestDevice(devices[hwid]);
  saveDevices(devices);
  addAuditLog('DEVICE_TEST_TOGGLE', hwid, getClientIp(req), `Dispositivo clasificado como: ${devices[hwid].isTest ? 'TEST/PRUEBA' : 'CLIENTE REAL'}`);
  res.json({ success: true, hwid, isTest: devices[hwid].isTest });
});

// Purgar todos los dispositivos clasificados como prueba
app.post('/api/admin/devices/purge-tests', (req, res) => {
  const devices = loadDevices();
  let deletedCount = 0;
  for (const hwid of Object.keys(devices)) {
    if (isTestDevice(devices[hwid])) {
      delete devices[hwid];
      deletedCount++;
    }
  }
  if (deletedCount > 0) {
    saveDevices(devices);
    addAuditLog('PURGE_TESTS', 'PANEL', getClientIp(req), `Purgados ${deletedCount} dispositivos de prueba.`);
  }
  res.json({ success: true, deletedCount, message: `Se purgaron ${deletedCount} dispositivos de prueba con éxito.` });
});

// Bloquear / Desbloquear celular con motivo y auditoría
app.post('/api/admin/device/toggle-block', (req, res) => {
  const { hwid, blocked, reason } = req.body;
  const devices = loadDevices();
  if (!devices[hwid]) return res.status(404).json({ error: 'Dispositivo no encontrado' });

  devices[hwid].blocked = !!blocked;
  if (devices[hwid].blocked) {
    devices[hwid].blockReason = reason || 'Acceso suspendido temporalmente por el administrador.';
    addAuditLog('BLOCK', hwid, devices[hwid].ip, `Celular BLOQUEADO: ${devices[hwid].blockReason}`);
    sendWhatsAppAlert('deviceBlocked', 'CELULAR BLOQUEADO (KILL-SWITCH)', `Dispositivo ${hwid} bloqueado. Motivo: ${devices[hwid].blockReason}`, hwid, devices[hwid].ip);
  } else {
    devices[hwid].blockReason = '';
    addAuditLog('UNBLOCK', hwid, devices[hwid].ip, 'Celular DESBLOQUEADO.');
    sendWhatsAppAlert('deviceBlocked', 'CELULAR DESBLOQUEADO', `Dispositivo ${hwid} reactivado por el administrador.`, hwid, devices[hwid].ip);
  }
  saveDevices(devices);
  res.json({ success: true, blocked: devices[hwid].blocked, reason: devices[hwid].blockReason, hwid });
});

// Asignar o extender expiración de prueba o licencia PRO (en minutos, horas o días)
app.post('/api/admin/device/set-expiration', (req, res) => {
  const { hwid, minutes, hours, days, isLifetime, unblock } = req.body;
  if (!hwid) return res.status(400).json({ success: false, error: 'HWID requerido' });
  const devices = loadDevices();
  if (!devices[hwid]) return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });

  if (req.body.expiresAt !== undefined) {
    if (req.body.expiresAt === null) {
      devices[hwid].expiresAt = null;
      devices[hwid].isLifetime = true;
    } else {
      const parsedDate = new Date(req.body.expiresAt);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ success: false, error: 'Fecha expiresAt inválida' });
      }
      devices[hwid].expiresAt = parsedDate.toISOString();
      devices[hwid].isLifetime = false;
    }
  } else if (isLifetime === true || hours === 0 || hours === '0' || days === 0 || days === '0' || minutes === 0 || minutes === '0') {
    devices[hwid].expiresAt = null; // Vitalicio / Permanente
    devices[hwid].isLifetime = true;
    addAuditLog('EXPIRATION_SET', hwid, devices[hwid].ip, 'Vigencia de licencia fijada como VITALICIA / PERMANENTE.');
  } else {
    let addMs = 0;
    let label = '';
    if (minutes !== undefined) {
      const numMin = parseFloat(minutes);
      if (!Number.isFinite(numMin) || numMin <= 0) {
        return res.status(400).json({ success: false, error: 'Número de minutos inválido. Debe ser un número positivo.' });
      }
      addMs = numMin * 60 * 1000;
      label = `${numMin} minutos`;
    } else if (days !== undefined) {
      const numDays = parseFloat(days);
      if (!Number.isFinite(numDays) || numDays <= 0) {
        return res.status(400).json({ success: false, error: 'Número de días inválido. Debe ser un número positivo.' });
      }
      addMs = numDays * 86400 * 1000;
      label = `${numDays} días`;
    } else if (hours !== undefined) {
      const numHours = parseFloat(hours);
      if (!Number.isFinite(numHours) || numHours <= 0) {
        return res.status(400).json({ success: false, error: 'Número de horas inválido. Debe ser un número positivo.' });
      }
      addMs = numHours * 3600 * 1000;
      label = `${numHours} horas`;
    } else {
      return res.status(400).json({ success: false, error: 'Debe especificar minutos, horas, días o isLifetime.' });
    }
    
    const expDate = new Date(Date.now() + addMs);
    devices[hwid].expiresAt = expDate.toISOString();
    devices[hwid].isLifetime = false;
    addAuditLog('EXPIRATION_SET', hwid, devices[hwid].ip, `Vigencia configurada por ${label} (Vence: ${expDate.toLocaleString()})`);
  }

  if (unblock) {
    devices[hwid].blocked = false;
    devices[hwid].blockReason = '';
  }

  saveDevices(devices);
  res.json({ success: true, hwid, expiresAt: devices[hwid].expiresAt, isLifetime: !devices[hwid].expiresAt });
});

// Actualizar nota o nombre de cliente
app.post('/api/admin/device/update-note', (req, res) => {
  const { hwid, note } = req.body;
  const devices = loadDevices();
  if (!devices[hwid]) return res.status(404).json({ error: 'Dispositivo no encontrado' });

  devices[hwid].note = (note || '').trim();
  saveDevices(devices);
  addAuditLog('NOTE_UPDATE', hwid, devices[hwid].ip, `Nota de cliente actualizada: "${devices[hwid].note}"`);
  res.json({ success: true, hwid, note: devices[hwid].note });
});

// Eliminar dispositivo del registro para limpieza (sin bloquear el celular)
app.post('/api/admin/device/delete', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado. Clave de administrador requerida.' });
  }

  const { hwid } = req.body;
  if (!hwid) return res.status(400).json({ success: false, error: 'HWID requerido' });
  const cleanHwid = String(hwid).trim().toUpperCase();
  const devices = loadDevices();
  const targetKey = Object.keys(devices).find(h => h.toUpperCase() === cleanHwid) || hwid;

  if (!devices[targetKey]) {
    // Si ya no está en devices, limpiar cualquier tombstone residual
    const tombstones = loadTombstones();
    if (tombstones[cleanHwid] || tombstones[hwid]) {
      delete tombstones[cleanHwid];
      delete tombstones[hwid];
      saveTombstones(tombstones);
      return res.json({ success: true, hwid: cleanHwid, message: 'El registro residual fue limpiado con éxito (sin bloqueo).' });
    }
    return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
  }

  // Limpiar de la lista de dispositivos activos
  delete devices[targetKey];
  if (devices[cleanHwid]) delete devices[cleanHwid];
  saveDevices(devices);

  // Limpiar cualquier tombstone previo si existía, garantizando que el celular NO quede bloqueado
  const tombstones = loadTombstones();
  let tombstonesChanged = false;
  if (tombstones[cleanHwid]) {
    delete tombstones[cleanHwid];
    tombstonesChanged = true;
  }
  if (tombstones[hwid]) {
    delete tombstones[hwid];
    tombstonesChanged = true;
  }
  if (tombstones[targetKey]) {
    delete tombstones[targetKey];
    tombstonesChanged = true;
  }
  if (tombstonesChanged) {
    saveTombstones(tombstones);
  }

  addAuditLog('DEVICE_CLEARED', cleanHwid, 'N/A', 'Registro de dispositivo eliminado para limpieza (sin bloqueo).');
  res.json({ success: true, hwid: cleanHwid, message: 'Registro de celular limpiado exitosamente. El dispositivo no ha sido bloqueado.' });
});

// Eliminar un registro específico de la lista de exclusión (Tombstones) sin bloquear el celular
app.post('/api/admin/tombstone/delete', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado. Clave de administrador requerida.' });
  }

  const { hwid } = req.body;
  if (!hwid) return res.status(400).json({ success: false, error: 'HWID requerido' });
  const cleanHwid = String(hwid).trim().toUpperCase();
  const tombstones = loadTombstones();

  delete tombstones[cleanHwid];
  delete tombstones[hwid];
  saveTombstones(tombstones);

  addAuditLog('TOMBSTONE_DELETED', cleanHwid, getClientIp(req), `Registro de exclusión eliminado: ${cleanHwid} (sin bloqueo).`);
  res.json({ success: true, hwid: cleanHwid, message: 'Registro de exclusión eliminado con éxito. El celular no está bloqueado.' });
});

// Vaciar todo el historial de dispositivos excluidos (Tombstones)
app.post('/api/admin/tombstones/clear-all', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado. Clave de administrador requerida.' });
  }

  const tombstones = loadTombstones();
  let clearedCount = 0;
  for (const key of Object.keys(tombstones)) {
    if (key !== 'revokedKeys' && key !== 'deletedUsers' && !key.startsWith('_')) {
      delete tombstones[key];
      clearedCount++;
    }
  }
  saveTombstones(tombstones);

  addAuditLog('TOMBSTONES_CLEARED_ALL', 'ADMIN', getClientIp(req), `Historial de exclusión vaciado: ${clearedCount} registros eliminados.`);
  res.json({ success: true, clearedCount, message: `Se limpiaron ${clearedCount} registros del historial de exclusión con éxito.` });
});

// Restaurar dispositivo excluido / remover de la lista negra de tombstones
app.post('/api/admin/device/unexclude', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'Acceso no autorizado' });
  }

  const { hwid } = req.body;
  if (!hwid) return res.status(400).json({ success: false, error: 'HWID requerido' });
  const cleanHwid = String(hwid).trim().toUpperCase();
  const tombstones = loadTombstones();
  if (!tombstones[cleanHwid] && !tombstones[hwid]) {
    return res.status(404).json({ success: false, error: 'Dispositivo no encontrado en la lista de exclusión' });
  }

  delete tombstones[cleanHwid];
  delete tombstones[hwid];
  saveTombstones(tombstones);
  addAuditLog('DEVICE_UNEXCLUDED', cleanHwid, getClientIp(req), 'Dispositivo restaurado de la lista de exclusión.');
  res.json({ success: true, hwid: cleanHwid, message: 'Dispositivo restaurado con éxito. Ahora podrá volver a conectarse.' });
});

// Módulo de Licencias Emitidas & Dispositivos Excluidos
app.get('/api/admin/licenses', (req, res) => {
  const devices = loadDevices();
  const tombstones = loadTombstones();
  const now = Date.now();

  const activeLicenses = [];
  Object.values(devices).forEach(dev => {
    const key = dev.licenseKey || dev.generatedKey;
    const isRevokedKey = !!(key && tombstones.revokedKeys && tombstones.revokedKeys[key]);
    // Excluir también si el HWID está directamente en tombstones (dispositivo eliminado/degradado)
    const isHwidTombstoned = !!(dev.hwid && tombstones[dev.hwid] && 
      typeof tombstones[dev.hwid] === 'object' &&
      dev.hwid !== 'deletedUsers' && dev.hwid !== 'revokedKeys');
    // Solo listar si está en modo PRO activo, su clave no fue revocada, y su HWID no está en tombstones
    if (dev.mode === 'PRO' && key && !isRevokedKey && !isHwidTombstoned) {
      const isLifetime = dev.mode === 'PRO' && !dev.expiresAt;
      const isExpired = dev.expiresAt && new Date(dev.expiresAt).getTime() < now;
      const diffMs = dev.expiresAt ? (new Date(dev.expiresAt).getTime() - now) : null;
      const daysRemaining = diffMs !== null ? Math.max(0, Math.ceil(diffMs / 86400000)) : null;
      const hoursRemaining = diffMs !== null ? Math.max(0, Math.round(diffMs / 3600000)) : null;
      const minutesRemaining = diffMs !== null ? Math.max(0, Math.round(diffMs / 60000)) : null;
      const timeRemainingFormatted = formatTimeRemaining(dev.expiresAt, isLifetime, now);

      activeLicenses.push({
        hwid: dev.hwid,
        mode: dev.mode,
        licenseKey: key,
        isLifetime,
        isExpired,
        expiresAt: dev.expiresAt || null,
        daysRemaining,
        hoursRemaining,
        minutesRemaining,
        timeRemainingFormatted,
        currentUser: dev.currentUser || 'N/A',
        deviceBrand: dev.deviceBrand || '',
        deviceModel: dev.deviceModel || dev.platform || '',
        note: dev.note || '',
        lastSeen: dev.lastSeen || '',
        isOnline: dev.lastSeen ? (now - new Date(dev.lastSeen).getTime()) < 180000 : false
      });
    }
  });

  // Dispositivos Excluidos (Tombstones)
  const excludedDevices = [];
  for (const [hwid, data] of Object.entries(tombstones)) {
    if (hwid === 'deletedUsers' || hwid === 'revokedKeys' || hwid.startsWith('_')) continue;
    excludedDevices.push({
      hwid,
      deletedAt: data.deletedAt || 'N/A',
      revokedKey: data.revokedKey || 'N/A',
      previousUser: data.previousUser || 'N/A',
      previousModel: data.previousModel || 'N/A',
      reason: data.reason || 'Eliminado del panel por el administrador'
    });
  }

  // Claves Revocadas (Lista Negra de Licencias)
  const revokedKeysList = [];
  if (tombstones.revokedKeys && typeof tombstones.revokedKeys === 'object') {
    for (const [key, rData] of Object.entries(tombstones.revokedKeys)) {
      revokedKeysList.push({
        licenseKey: key,
        revokedAt: rData.revokedAt || 'N/A',
        hwid: rData.hwid || 'N/A',
        reason: rData.reason || 'Revocada'
      });
    }
  }

  // Cuentas eliminadas
  const deletedUsers = [];
  if (tombstones.deletedUsers && typeof tombstones.deletedUsers === 'object') {
    for (const [email, uData] of Object.entries(tombstones.deletedUsers)) {
      deletedUsers.push({
        email,
        deletedAt: uData.deletedAt || 'N/A',
        id: uData.id || 'N/A',
        hwid: uData.hwid || 'N/A'
      });
    }
  }

  // Ordenar licencias activas: PRO primero, luego por más recientes
  activeLicenses.sort((a, b) => {
    if (a.mode === 'PRO' && b.mode !== 'PRO') return -1;
    if (b.mode === 'PRO' && a.mode !== 'PRO') return 1;
    return (Date.parse(b.lastSeen) || 0) - (Date.parse(a.lastSeen) || 0);
  });

  res.json({
    success: true,
    summary: {
      totalLicenses: activeLicenses.length,
      activeProCount: activeLicenses.filter(l => l.mode === 'PRO' && !l.isExpired).length,
      lifetimeCount: activeLicenses.filter(l => l.isLifetime).length,
      daysCount: activeLicenses.filter(l => l.mode === 'PRO' && !l.isLifetime && !l.isExpired).length,
      expiredCount: activeLicenses.filter(l => l.isExpired).length,
      excludedCount: excludedDevices.length + revokedKeysList.length,
      revokedKeysCount: revokedKeysList.length,
      deletedUsersCount: deletedUsers.length
    },
    licenses: activeLicenses,
    excludedDevices,
    revokedKeys: revokedKeysList,
    deletedUsers
  });
});

// Eliminar y revocar permanentemente una licencia emitida
app.post('/api/admin/license/delete', (req, res) => {
  const { hwid, licenseKey } = req.body || {};
  if (!hwid && !licenseKey) {
    return res.status(400).json({ success: false, error: 'HWID o licenseKey requerido' });
  }

  const tombstones = loadTombstones();
  if (!tombstones.revokedKeys) tombstones.revokedKeys = {};

  const devices = loadDevices();
  const targetHwid = hwid || Object.keys(devices).find(h => devices[h].licenseKey === licenseKey || devices[h].generatedKey === licenseKey);
  const targetKey = licenseKey || (targetHwid && devices[targetHwid] && (devices[targetHwid].licenseKey || devices[targetHwid].generatedKey));

  if (targetKey) {
    tombstones.revokedKeys[targetKey] = {
      revokedAt: new Date().toISOString(),
      hwid: targetHwid || 'N/A',
      reason: 'Licencia eliminada e invalidada permanentemente por administrador'
    };
    saveTombstones(tombstones);
  }

  if (targetHwid && devices[targetHwid]) {
    devices[targetHwid].mode = 'DEMO';
    devices[targetHwid].forceDemo = true;
    devices[targetHwid].licenseKey = '';
    devices[targetHwid].generatedKey = '';
    devices[targetHwid].expiresAt = null;
    devices[targetHwid].isLifetime = false;
    saveDevices(devices);
  }

  addAuditLog('LICENSE_DELETED', targetHwid || 'N/A', getClientIp(req), `Licencia revocada y eliminada permanentemente: ${targetKey || 'N/A'}`);
  res.json({ success: true, hwid: targetHwid, licenseKey: targetKey, message: 'Licencia eliminada y revocada permanentemente.' });
});

// Generar clave PRO para un HWID desde el dashboard web
app.post('/api/admin/device/generate-key', (req, res) => {
  const { hwid, plan, durationType, days } = req.body;
  if (!hwid) return res.status(400).json({ error: 'HWID requerido' });
  const key = generateKey(hwid, plan || 'PRO');

  // Limpiar de tombstones y claves revocadas si el administrador genera clave explícitamente
  const tombstones = loadTombstones();
  let modifiedTomb = false;
  if (tombstones[hwid]) {
    delete tombstones[hwid];
    modifiedTomb = true;
  }
  if (tombstones.revokedKeys && tombstones.revokedKeys[key]) {
    delete tombstones.revokedKeys[key];
    modifiedTomb = true;
  }
  if (modifiedTomb) {
    saveTombstones(tombstones);
  }

  const devices = loadDevices();
  if (devices[hwid]) {
    devices[hwid].generatedKey = key;
    devices[hwid].mode = plan || 'PRO';
    devices[hwid].forceDemo = false;
    const numDays = parseInt(days, 10);
    if (durationType === 'DAYS' && numDays > 0) {
      devices[hwid].expiresAt = new Date(Date.now() + numDays * 86400 * 1000).toISOString();
      devices[hwid].isLifetime = false;
    } else {
      devices[hwid].expiresAt = null;
      devices[hwid].isLifetime = true;
    }
    devices[hwid].blocked = false;
    devices[hwid].blockReason = '';
    saveDevices(devices);
  }

  const vigenciaStr = (devices[hwid] && devices[hwid].expiresAt)
    ? `por ${days} días (Vence: ${new Date(devices[hwid].expiresAt).toLocaleDateString()})`
    : 'VITALICIO';

  addAuditLog('KEYGEN', hwid, req.socket.remoteAddress || '127.0.0.1', `Clave ${plan || 'PRO'} generada (${vigenciaStr})`);
  res.json({
    success: true,
    hwid,
    key,
    plan: plan || 'PRO',
    expiresAt: (devices[hwid] && devices[hwid].expiresAt) || null,
    isLifetime: devices[hwid] ? !devices[hwid].expiresAt : (durationType !== 'DAYS')
  });
});

// Activar o degradar plan PRO/DEMO con opciones de vigencia y exclusión
app.post('/api/admin/device/toggle-plan', (req, res) => {
  const { hwid, plan, durationType, days, hours, minutes, excludeDevice, excludeReason } = req.body;
  if (!hwid) return res.status(400).json({ error: 'HWID requerido' });
  const targetPlan = (plan === 'PRO') ? 'PRO' : 'DEMO';

  const devices = loadDevices();
  if (!devices[hwid]) return res.status(404).json({ error: 'Dispositivo no encontrado' });

  // Exclusión / Bloqueo explícito solicitado por el administrador
  if (excludeDevice) {
    const tombstones = loadTombstones();
    const oldKey = devices[hwid].licenseKey || devices[hwid].generatedKey;
    if (!tombstones.revokedKeys) tombstones.revokedKeys = {};
    if (oldKey) {
      tombstones.revokedKeys[oldKey] = {
        revokedAt: new Date().toISOString(),
        hwid,
        reason: 'Licencia revocada por exclusión de dispositivo'
      };
    }
    tombstones[hwid] = {
      deletedAt: new Date().toISOString(),
      revokedKey: oldKey || '',
      previousModel: devices[hwid].deviceModel || devices[hwid].platform || 'N/A',
      previousUser: devices[hwid].currentUser || 'N/A',
      reason: excludeReason || 'Dispositivo excluido del registro por el administrador'
    };
    saveTombstones(tombstones);

    devices[hwid].blocked = true;
    devices[hwid].blockReason = excludeReason || 'Dispositivo excluido del registro por el administrador.';
    devices[hwid].mode = 'DEMO';
    devices[hwid].forceDemo = true;
    devices[hwid].licenseKey = '';
    devices[hwid].generatedKey = '';
    saveDevices(devices);

    addAuditLog('DEVICE_EXCLUDED', hwid, req.socket.remoteAddress || '127.0.0.1', 'Dispositivo excluido y bloqueado en tombstones');
    return res.json({
      success: true,
      hwid,
      blocked: true,
      mode: 'DEMO',
      message: 'Dispositivo bloqueado y añadido a lista de exclusión'
    });
  }

  devices[hwid].mode = targetPlan;
  if (targetPlan === 'PRO') {
    devices[hwid].forceDemo = false;
    devices[hwid].blocked = false;
    devices[hwid].blockReason = '';
    // Siempre generar clave nueva y única en cada emisión
    const key = generateKey(hwid, 'PRO');
    devices[hwid].generatedKey = key;
    devices[hwid].licenseKey = key;

    // Limpiar de tombstones y claves revocadas si el administrador lo activa explícitamente
    const tombstones = loadTombstones();
    let modifiedTomb = false;
    if (tombstones[hwid]) {
      delete tombstones[hwid];
      modifiedTomb = true;
    }
    if (tombstones.revokedKeys && tombstones.revokedKeys[key]) {
      delete tombstones.revokedKeys[key];
      modifiedTomb = true;
    }
    if (modifiedTomb) {
      saveTombstones(tombstones);
    }

    // Configurar vigencia: Minutos, Horas, Días o Vitalicio
    const numDays = parseFloat(days) || 0;
    const numHours = parseFloat(hours) || 0;
    const numMin = parseFloat(minutes) || 0;
    const totalMs = (numMin * 60 + numHours * 3600 + numDays * 86400) * 1000;

    if (durationType !== 'LIFETIME' && totalMs > 0) {
      devices[hwid].expiresAt = new Date(Date.now() + totalMs).toISOString();
      devices[hwid].isLifetime = false;
    } else {
      devices[hwid].expiresAt = null;
      devices[hwid].isLifetime = true;
    }

    devices[hwid].blocked = false;
    devices[hwid].blockReason = '';
  } else {
    // DEGRADAR A DEMO: ¡JAMÁS bloquear automáticamente en tombstones[hwid]!
    devices[hwid].mode = 'DEMO';
    devices[hwid].forceDemo = true;
    devices[hwid].blocked = false;
    devices[hwid].blockReason = '';
    const oldKey = devices[hwid].licenseKey || devices[hwid].generatedKey;
    devices[hwid].licenseKey = '';
    devices[hwid].generatedKey = '';
    devices[hwid].isLifetime = false;

    // Revocar únicamente la clave anterior en revokedKeys (sin bloquear el HWID)
    const tombstones = loadTombstones();
    let modifiedTomb = false;
    if (!tombstones.revokedKeys) {
      tombstones.revokedKeys = {};
      modifiedTomb = true;
    }
    if (oldKey) {
      tombstones.revokedKeys[oldKey] = {
        revokedAt: new Date().toISOString(),
        hwid,
        reason: 'Licencia revocada por administrador al quitar PRO'
      };
      modifiedTomb = true;
    }
    // Asegurar que NO esté en tombstones[hwid] para que el teléfono pueda seguir en DEMO sin bloqueo
    if (tombstones[hwid]) {
      delete tombstones[hwid];
      modifiedTomb = true;
    }
    if (modifiedTomb) {
      saveTombstones(tombstones);
    }

    // Configurar tiempo de DEMO
    const numDays = parseFloat(days) || 0;
    const numHours = parseFloat(hours) || 0;
    const numMin = parseFloat(minutes) || 0;
    const totalMs = (numMin * 60 + numHours * 3600 + numDays * 86400) * 1000;

    if (durationType === 'LIFETIME') {
      devices[hwid].expiresAt = null; // DEMO ilimitado
    } else if (totalMs > 0) {
      devices[hwid].expiresAt = new Date(Date.now() + totalMs).toISOString();
    } else {
      const settings = loadSettings();
      const defHours = Number(settings.demoDurationHours) || 72;
      devices[hwid].expiresAt = new Date(Date.now() + defHours * 3600 * 1000).toISOString();
    }
  }

  saveDevices(devices);
  const vigenciaLog = devices[hwid].expiresAt
    ? `(Vence: ${new Date(devices[hwid].expiresAt).toLocaleString()})`
    : 'VITALICIO / INDEFINIDO';
  addAuditLog('PLAN_TOGGLE', hwid, req.socket.remoteAddress || '127.0.0.1', `Plan cambiado autoritativamente a ${targetPlan} ${vigenciaLog}`);
  res.json({
    success: true,
    hwid,
    mode: targetPlan,
    forceDemo: !!devices[hwid].forceDemo,
    blocked: !!devices[hwid].blocked,
    licenseKey: devices[hwid].licenseKey || '',
    expiresAt: devices[hwid].expiresAt || null,
    isLifetime: !devices[hwid].expiresAt
  });
});

// Endpoint de Alertas de Seguridad en Vivo para el Panel
app.get('/api/admin/security-alerts', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const logs = loadSecurityLogs();
  const unreadAlerts = logs.filter(l => !l.read && (l.severity === 'CRITICAL' || l.severity === 'HIGH'));
  const criticalList = logs.filter(l => l.severity === 'CRITICAL');

  res.json({
    success: true,
    totalLogs: logs.length,
    unreadCount: unreadAlerts.length,
    criticalCount: criticalList.length,
    latestAlert: unreadAlerts[0] || criticalList[0] || null,
    alerts: logs.slice(0, 50)
  });
});

// Descartar/marcar como leídas las alertas de seguridad
app.post('/api/admin/security-alerts/dismiss', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const logs = loadSecurityLogs();
  logs.forEach(l => { l.read = true; });
  saveSecurityLogs(logs);
  res.json({ success: true, message: 'Alertas marcadas como revisadas' });
});

// Kill-Switch de Emergencia Instantáneo para un Dispositivo
app.post('/api/admin/device/emergency-lock', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const { hwid, reason } = req.body;
  if (!hwid) return res.status(400).json({ error: 'HWID requerido' });

  const devices = loadDevices();
  if (!devices[hwid]) return res.status(404).json({ error: 'Dispositivo no encontrado' });

  devices[hwid].blocked = true;
  devices[hwid].forceDemo = true;
  devices[hwid].mode = 'DEMO';
  devices[hwid].licenseKey = '';
  devices[hwid].blockReason = reason || 'Acceso revocado de emergencia por sospecha de hackeo/crack.';

  saveDevices(devices);
  addAuditLog('EMERGENCY_LOCK', hwid, getClientIp(req), `Kill-switch de emergencia ejecutado: ${devices[hwid].blockReason}`, 'BLOCKED');
  addSecurityLog('EMERGENCY_LOCK', hwid, getClientIp(req), `Kill-switch ejecutado por el administrador: ${devices[hwid].blockReason}`, { reason }, req);

  res.json({ success: true, hwid, blocked: true, message: 'Dispositivo bloqueado y revocado en tiempo real.' });
});

// 1. Extender tiempo DEMO desde el panel (en minutos u horas)
app.post('/api/admin/device/extend-demo', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  const { hwid, hours, minutes } = req.body;
  if (!hwid) return res.status(400).json({ success: false, error: 'HWID requerido' });

  let addMs = 0;
  let label = '';

  if (minutes !== undefined) {
    const numMin = parseFloat(minutes);
    if (!Number.isFinite(numMin) || numMin <= 0) {
      return res.status(400).json({ success: false, error: 'Minutos a extender inválidos. Debe ser un número positivo.' });
    }
    addMs = numMin * 60 * 1000;
    label = `${numMin} min`;
  } else if (hours !== undefined) {
    const hoursToAdd = parseFloat(hours);
    if (!Number.isFinite(hoursToAdd) || hoursToAdd <= 0) {
      return res.status(400).json({ success: false, error: 'Horas a extender inválidas. Debe ser un número positivo.' });
    }
    addMs = hoursToAdd * 3600 * 1000;
    label = `${hoursToAdd}h`;
  } else {
    return res.status(400).json({ success: false, error: 'Debe especificar minutes u hours a extender.' });
  }

  const devices = loadDevices();
  if (!devices[hwid]) return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });

  const currentExpires = devices[hwid].expiresAt ? new Date(devices[hwid].expiresAt).getTime() : Date.now();
  const baseTime = Math.max(Date.now(), currentExpires);
  const newExpires = new Date(baseTime + addMs).toISOString();

  devices[hwid].expiresAt = newExpires;
  const hoursFraction = addMs / 3600000;
  devices[hwid].demoExtendedHours = (devices[hwid].demoExtendedHours || 0) + hoursFraction;
  if (devices[hwid].blocked && devices[hwid].blockReason?.includes('Período de prueba')) {
    devices[hwid].blocked = false;
    devices[hwid].blockReason = '';
  }
  saveDevices(devices);

  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  addAuditLog('EXTEND_DEMO', hwid, clientIp, `Tiempo DEMO extendido +${label} para ${hwid}. Vence: ${newExpires}`);

  res.json({
    success: true,
    expiresAt: newExpires,
    message: `Tiempo DEMO extendido +${label} exitosamente.`
  });
});

// 2. Forzar Cierre de Sesión / Desvincular Cuenta de Celular
app.post('/api/admin/device/invalidate-session', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  const { hwid, email } = req.body;
  const users = loadUsers();
  let found = false;

  users.forEach(u => {
    if ((email && u.email.toLowerCase() === String(email).toLowerCase()) || (hwid && u.activeHwid === hwid)) {
      u.activeHwid = null;
      u.activeSessionAt = null;
      found = true;
    }
  });

  if (found) saveUsers(users);

  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  addAuditLog('SESSION_INVALIDATED', hwid || 'N/A', clientIp, `Sesión forzosamente cerrada por Admin para ${email || hwid}`);

  res.json({ success: true, message: 'Sesión invalidada. El usuario será desconectado de inmediato.' });
});

// 3. Solicitud de Licencia PRO desde la APK por el Cliente
app.post('/api/license/request-pro', async (req, res) => {
  const { name, phone, email, serverName, notes, hwid } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ success: false, error: 'Nombre y teléfono requeridos.' });
  }

  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const requests = loadProRequests();
  const newReq = {
    id: 'req_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
    name: String(name).trim(),
    phone: String(phone).trim(),
    email: (email || '').trim(),
    serverName: (serverName || '').trim(),
    notes: (notes || '').trim(),
    hwid: (hwid || '').trim(),
    ip: clientIp,
    status: 'PENDING',
    createdAt: new Date().toISOString()
  };

  requests.unshift(newReq);
  saveProRequests(requests);

  addAuditLog('PRO_REQUEST', hwid, clientIp, `Nueva solicitud PRO: ${newReq.name} (${newReq.phone})`);

  // Notificar al WhatsApp del Administrador inmediatamente
  sendWhatsAppAlert(
    'tamper',
    '⭐ NUEVA SOLICITUD DE LICENCIA PRO ⭐',
    `Cliente: ${newReq.name}\nWhatsApp: ${newReq.phone}\nEmail: ${newReq.email || 'N/A'}\nServidor: ${newReq.serverName || 'N/A'}\nHWID: ${newReq.hwid}\nNotas: ${newReq.notes || 'Sin notas adicionales'}`,
    hwid || 'N/A',
    clientIp
  ).catch(() => {});

  res.json({
    success: true,
    message: 'Solicitud enviada exitosamente. Nuestro equipo se pondrá en contacto contigo a la brevedad.'
  });
});

// 4. Listar Solicitudes PRO para el Panel Web
app.get('/api/admin/pro-requests', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  const requests = loadProRequests();
  res.json(requests);
});

// 5. Acción sobre Solicitud PRO (Contactar / Aprobar / Descartar)
app.post('/api/admin/pro-request/action', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  const { id, action } = req.body;
  const requests = loadProRequests();
  const target = requests.find(r => r.id === id);
  if (!target) return res.status(404).json({ success: false, error: 'Solicitud no encontrada' });

  let generatedKey = null;

  if (action === 'approve') {
    target.status = 'APPROVED';
    if (target.hwid) {
      const devices = loadDevices();
      const dev = devices[target.hwid] || {
        hwid: target.hwid,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        totalPings: 1,
        ip: target.ip || '127.0.0.1',
        platform: 'Android',
        appVersion: '1.2.1',
        blocked: false,
        note: `${target.name} (${target.phone})`,
        currentUser: target.email || ''
      };
      generatedKey = generateKey(target.hwid, 'PRO');
      dev.mode = 'PRO';
      dev.generatedKey = generatedKey;
      dev.licenseKey = generatedKey;
      dev.expiresAt = null;
      devices[target.hwid] = dev;
      saveDevices(devices);
    }
  } else if (action === 'contacted') {
    target.status = 'CONTACTED';
  } else if (action === 'dismiss') {
    target.status = 'DISMISSED';
  }

  saveProRequests(requests);
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  addAuditLog('PRO_REQUEST_ACTION', target.hwid, clientIp, `Solicitud PRO de ${target.name} marcada como: ${target.status}`);

  res.json({ success: true, status: target.status, generatedKey });
});

// 6. Reporte de Fallos, Errores y Manipulaciones (Crash Telemetry & Tamper)
app.post('/api/telemetry/crash', (req, res) => {
  const { hwid, message, stack, context, isEmulator, appVersion } = req.body;
  const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

  addSecurityLog('CRASH_OR_TAMPER', hwid, clientIp, message || 'Error no especificado en APK', {
    stack,
    context,
    isEmulator: !!isEmulator,
    appVersion: appVersion || '1.2.1'
  });

  // Alerta si es intento de hack / tamper
  if (context && (context.includes('TAMPER') || context.includes('ROOT') || context.includes('FRIDA') || context.includes('DEBUGGER'))) {
    sendWhatsAppAlert(
      'tamper',
      '🚨 INTENTO DE TAMPER / MANIPULACIÓN DETECTADO 🚨',
      `Dispositivo: ${hwid}\nDetalle: ${message}\nContexto: ${context}`,
      hwid,
      clientIp
    ).catch(() => {});
  }

  res.json({ success: true, received: true });
});

// 7. Listar Logs de Seguridad y Bugs para el Panel Web
app.get('/api/admin/security-logs', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  const logs = loadSecurityLogs();
  res.json(logs);
});

// 8. Limpiar Logs de Seguridad
app.post('/api/admin/security-logs/clear', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  saveSecurityLogs([]);
  res.json({ success: true, message: 'Logs de seguridad limpiados exitosamente.' });
});

// Obtener Ajustes Globales (Sanitización de privacidad para WhatsApp y claves)
app.get('/api/admin/settings', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const isAuth = isValidAdminKey(adminKey);
  const raw = loadSettings();
  const settings = JSON.parse(JSON.stringify(raw));

  // Nunca exponer la clave maestra de administración
  delete settings.adminKey;

  // Sanitización de Privacidad: Si no está plenamente autenticado, no exponer número de teléfono ni credenciales
  if (!isAuth) {
    if (settings.whatsapp) {
      settings.whatsapp = {
        enabled: !!settings.whatsapp.enabled,
        provider: settings.whatsapp.provider || 'callmebot',
        phone: settings.whatsapp.phone ? settings.whatsapp.phone.replace(/(\d{4})\d+(\d{2})/, '$1******$2') : '',
        apiKey: '',
        webhookUrl: '',
        events: settings.whatsapp.events || {}
      };
    }
  }

  res.json(settings);
});

// Guardar Ajustes Globales (Kill-Switch Maestro, Anuncio, Whitelist)
app.post('/api/admin/settings', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }
  const current = loadSettings();
  const demoDurationHours = req.body.demoDurationHours !== undefined ? parseFloat(req.body.demoDurationHours) : current.demoDurationHours;
  const updated = {
    ...current,
    globalMaintenance: req.body.globalMaintenance !== undefined ? !!req.body.globalMaintenance : current.globalMaintenance,
    maintenanceMessage: req.body.maintenanceMessage !== undefined ? String(req.body.maintenanceMessage) : current.maintenanceMessage,
    broadcastAnnouncement: req.body.broadcastAnnouncement !== undefined ? String(req.body.broadcastAnnouncement) : current.broadcastAnnouncement,
    whitelistOnly: req.body.whitelistOnly !== undefined ? !!req.body.whitelistOnly : current.whitelistOnly,
    demoDurationHours: Number.isFinite(demoDurationHours) && demoDurationHours > 0 ? demoDurationHours : (current.demoDurationHours || 72),
  };
  saveSettings(updated);
  addAuditLog(
    'SETTINGS_CHANGE',
    'ADMIN',
    req.socket.remoteAddress || '127.0.0.1',
    `Ajustes globales actualizados. Mantenimiento: ${updated.globalMaintenance ? 'ACTIVO' : 'INACTIVO'}`
  );
  const safe = { ...updated };
  delete safe.adminKey;
  res.json({ success: true, settings: safe });
});

// Obtener Configuración de WhatsApp (Sanitizado si no está autenticado)
app.get('/api/admin/whatsapp', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const isAuth = isValidAdminKey(adminKey);
  const settings = loadSettings();
  const wa = JSON.parse(JSON.stringify(settings.whatsapp || DEFAULT_SETTINGS.whatsapp));
  if (!isAuth) {
    wa.phone = wa.phone ? wa.phone.replace(/(\d{4})\d+(\d{2})/, '$1******$2') : '';
    wa.apiKey = '';
    wa.webhookUrl = '';
  }
  res.json(wa);
});

// Guardar Configuración de WhatsApp
app.post('/api/admin/whatsapp/settings', (req, res) => {
  const { enabled, phone, apiKey, provider, webhookUrl, events } = req.body;
  const settings = loadSettings();
  settings.whatsapp = {
    enabled: enabled !== undefined ? !!enabled : true,
    phone: (phone !== undefined ? phone : (process.env.ADMIN_PHONE || '')).trim(),
    apiKey: (apiKey !== undefined ? apiKey : '').trim(),
    provider: provider === 'webhook' ? 'webhook' : 'callmebot',
    webhookUrl: (webhookUrl !== undefined ? webhookUrl : '').trim(),
    events: {
      tamper: events && events.tamper !== undefined ? !!events.tamper : true,
      sqlExploit: events && events.sqlExploit !== undefined ? !!events.sqlExploit : true,
      bruteForce: events && events.bruteForce !== undefined ? !!events.bruteForce : true,
      deviceBlocked: events && events.deviceBlocked !== undefined ? !!events.deviceBlocked : true
    }
  };
  saveSettings(settings);
  addAuditLog('WHATSAPP_CONFIG', 'ADMIN', req.socket.remoteAddress || '127.0.0.1', `Ajustes WhatsApp guardados.`);
  res.json({ success: true, whatsapp: settings.whatsapp });
});

// Enviar Alerta de Prueba a WhatsApp
app.post('/api/admin/whatsapp/test', async (req, res) => {
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  const result = await sendWhatsAppAlert(
    'tamper',
    'PRUEBA DE SEGURIDAD WHATSAPP',
    'Esta es una alerta de prueba generada desde el Panel de Administración de Mu Manager PRO.',
    'TEST-DEVICE-CEL',
    clientIp
  );
  addAuditLog('WHATSAPP_TEST', 'ADMIN', clientIp, `Prueba de alerta WhatsApp ejecutada: ${result.success ? 'EXITOSA' : (result.error || result.reason || 'Completado')}`);
  res.json(result);
});

// Obtener Configuración de Correo / SMTP
app.get('/api/admin/email', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  const settings = loadSettings();
  const emailCfg = JSON.parse(JSON.stringify(settings.email || {}));
  if (emailCfg.smtp && emailCfg.smtp.pass && !isValidAdminKey(adminKey)) {
    emailCfg.smtp.pass = '********';
  }
  if (emailCfg.resendApiKey && !isValidAdminKey(adminKey)) {
    emailCfg.resendApiKey = 're_********';
  }
  res.json(emailCfg);
});

// Guardar Configuración de Correo / SMTP
app.post('/api/admin/email/settings', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  const { smtp, resendApiKey, from } = req.body;
  const settings = loadSettings();

  settings.email = {
    from: (from || 'soporte@mumanagerpro.com').trim(),
    resendApiKey: (resendApiKey || '').trim(),
    smtp: {
      host: smtp && smtp.host ? String(smtp.host).trim() : '',
      port: smtp && smtp.port ? parseInt(smtp.port, 10) : 465,
      secure: smtp && smtp.secure !== undefined ? !!smtp.secure : true,
      user: smtp && smtp.user ? String(smtp.user).trim() : '',
      pass: smtp && smtp.pass ? String(smtp.pass).trim() : (process.env.SMTP_PASS || settings.email?.smtp?.pass || '')
    }
  };

  saveSettings(settings);
  addAuditLog('EMAIL_CONFIG', 'ADMIN', req.socket.remoteAddress || '127.0.0.1', 'Ajustes de correo/SMTP actualizados.');
  res.json({ success: true, email: settings.email });
});

// Enviar correo de prueba
app.post('/api/admin/email/test', async (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  const { to } = req.body;
  if (!to) {
    return res.status(400).json({ success: false, error: 'Correo de destino requerido.' });
  }

  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  const testHtml = `
    <div style="font-family: Arial, sans-serif; background: #0D0D0D; color: #FFF; padding: 20px; border-radius: 8px; border: 1px solid #00E676;">
      <h2 style="color: #00E676;">✅ Prueba de Correo Exitosa</h2>
      <p>Este es un correo de prueba enviado desde el Panel de Administración de <strong>Mu Manager PRO</strong>.</p>
      <p style="color: #AAA; font-size: 12px;">Fecha y hora: ${new Date().toLocaleString()}</p>
    </div>
  `;

  try {
    const result = await sendEmailNotification({
      to,
      subject: '✅ Prueba de Correo — Mu Manager PRO',
      html: testHtml,
      text: 'Prueba de correo exitosa desde Mu Manager PRO.'
    });

    addAuditLog('EMAIL_TEST', 'ADMIN', clientIp, `Prueba de correo a ${to}: ${result.success ? 'EXITOSA vía ' + result.sentVia : 'FALLIDA'}`);
    res.json(result);
  } catch (err) {
    addAuditLog('EMAIL_TEST', 'ADMIN', clientIp, `Error en prueba de correo a ${to}: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Test SQL interactivo desde la nube
app.post('/api/admin/test-sql', async (req, res) => {
  const start = Date.now();
  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'Módulo mssql no instalado en el servidor.' });
    const config = getDbConfig(req.body);
    const result = await executeSql(req.body, async (pool) => {
      return await pool.request().query('SELECT @@VERSION AS version, DB_NAME() AS db;');
    });
    const latency = Date.now() - start;
    const ver = result.recordset[0].version.split('\n')[0].trim();
    addAuditLog('SQL_TEST', 'ADMIN', clientIp, `Prueba SQL exitosa contra ${config.server}:${config.port} (${latency}ms)`);
    res.json({
      success: true,
      latencyMs: latency,
      version: ver,
      database: result.recordset[0].db,
    });
  } catch (err) {
    const latency = Date.now() - start;
    addAuditLog('SQL_TEST', 'ADMIN', clientIp, `Fallo prueba SQL contra ${req.body.host}:${req.body.port} - ${err.message}`, 'ERROR');
    res.json({
      success: false,
      latencyMs: latency,
      error: err.message,
    });
  }
});

// Logs de auditoría
app.get('/api/admin/logs', (req, res) => {
  res.json(auditLogs);
});

// Ruta Raíz: Portal Oficial
app.get('/', (req, res) => {
  const indexFile = path.join(websiteDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    return res.sendFile(indexFile);
  }
  res.send('<h1>Mu Manager PRO Gateway Activo</h1>');
});

// Dashboard Web de Monitoreo y Administración (Ruta Privada con Login Maestro)
app.get('/admin', (req, res) => {
  const htmlPath = path.join(__dirname, 'adminDashboard.html');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (fs.existsSync(htmlPath)) {
    res.sendFile(htmlPath);
  } else {
    res.send('<h1>Mu Manager PRO Bridge Server Activo</h1><p>Panel adminDashboard.html no encontrado.</p>');
  }
});

// ========================================================
// CATÁLOGO VISUAL & EXTRACTOR TRANSPARENTE DE ÍTEMS DE MU ONLINE
// ========================================================
const itemImageCache = new Map();

async function extractCleanItemPng(buffer) {
  if (!Jimp) return buffer;
  try {
    const img = await Jimp.read(buffer);
    const w = img.bitmap.width;
    const h = img.bitmap.height;

    // Discard outer margins (watermark text at top Y<21, bottom margin, outer borders)
    const isBg = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (y < 21 || y > h - 16 || x < 15 || x > w - 15) {
          isBg[idx] = 1;
          continue;
        }

        const pIdx = idx * 4;
        const r = img.bitmap.data[pIdx];
        const g = img.bitmap.data[pIdx + 1];
        const b = img.bitmap.data[pIdx + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        // Dark background of in-game inventory cells
        if (max < 44 || lum < 36) {
          isBg[idx] = 1;
          continue;
        }

        // Brown / grey grid border lines (low saturation, brownish)
        const isGridLine = (
          r > 36 && r < 130 &&
          g > 30 && g < 120 &&
          b > 24 && b < 110 &&
          diff < 18 &&
          r >= g && g >= b
        );
        if (isGridLine) {
          isBg[idx] = 1;
          continue;
        }
      }
    }

    // Connected component extraction to isolate item and discard noise
    const visited = new Uint8Array(w * h);
    const components = [];

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        if (!isBg[idx] && !visited[idx]) {
          const queue = [idx];
          visited[idx] = 1;
          const pixels = [];

          while (queue.length > 0) {
            const curr = queue.pop();
            pixels.push(curr);
            const cx = curr % w;
            const cy = Math.floor(curr / w);

            for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                const nidx = ny * w + nx;
                if (!isBg[nidx] && !visited[nidx]) {
                  visited[nidx] = 1;
                  queue.push(nidx);
                }
              }
            }
          }

          if (pixels.length >= 18) {
            components.push(pixels);
          }
        }
      }
    }

    if (components.length === 0) {
      // Return empty 1x1 transparent PNG instead of black box
      const blank = new Jimp(1, 1, 0x00000000);
      return await blank.getBufferAsync(Jimp.MIME_PNG);
    }

    const allItemPixels = components.flat();
    let minX = w, maxX = 0, minY = h, maxY = 0;

    for (const idx of allItemPixels) {
      const x = idx % w;
      const y = Math.floor(idx / w);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    const cw = maxX - minX + 1;
    const ch = maxY - minY + 1;
    const out = new Jimp(cw, ch, 0x00000000);

    for (const idx of allItemPixels) {
      const x = idx % w;
      const y = Math.floor(idx / w);
      const sIdx = idx * 4;
      const dIdx = ((y - minY) * cw + (x - minX)) * 4;
      out.bitmap.data[dIdx] = img.bitmap.data[sIdx];
      out.bitmap.data[dIdx + 1] = img.bitmap.data[sIdx + 1];
      out.bitmap.data[dIdx + 2] = img.bitmap.data[sIdx + 2];
      out.bitmap.data[dIdx + 3] = 255;
    }

    out.contrast(0.05);
    return await out.getBufferAsync(Jimp.MIME_PNG);
  } catch (err) {
    console.warn('Error extracting clean PNG:', err.message);
    const blank = new Jimp(1, 1, 0x00000000);
    return await blank.getBufferAsync(Jimp.MIME_PNG);
  }
}

// Canonical Aliases to guarantee 100% hits without 404 or missing visuals
const ITEM_GRAPHIC_ALIASES = {
  'Wings of Fairy': 'Wings of Elf',
  'Wings of Spirits': 'Wings of Spirit',
  'Wings of Darkness': 'Darkness Wings',
  'Cape of Lord': 'Cape of the Lord',
  'Wings of Eternal': 'Eternal Wings',
  'Wings of Illusion': 'Wing of Illusion',
  'Wings of Dimension': 'Wing of Dimension',
  'Wings of Ruin': 'Wings of Ruin',
  'Cloak of Warrior': 'Cape of the Lord',
  'Lighting Sword': 'Lightning Sword',
  'Sylpid Ray Helm': 'Sylphid Ray Helm',
  'Sylpid Ray Armor': 'Sylphid Ray Armor',
  'Sylpid Ray Pants': 'Sylphid Ray Pants',
  'Sylpid Ray Gloves': 'Sylphid Ray Gloves',
  'Sylpid Ray Boots': 'Sylphid Ray Boots',
  'Storm Jahad Helm': 'Sunlight Helm',
  'Storm Jahad Armor': 'Sunlight Armor',
  'Storm Jahad Pants': 'Sunlight Pants',
  'Storm Jahad Gloves': 'Sunlight Gloves',
  'Storm Jahad Boots': 'Sunlight Boots',
  'Resurrection Staff': 'Staff of Resurrection',
  'Destruction Staff': 'Staff of Destruction',
  'Kundun Staff': 'Staff of Kundun',
  'Platina Wing Staff': 'Platina Staff',
  'Lord Scepter': 'Great Lord Scepter',
  'Solay Scepter': 'Shining Scepter',
  'Spike Shield': 'Spiked Shield',
  'Iron Defender': 'Iron Defender Shield',
  'Grand Soul Shield': 'Grand Soul Shield',
  'Dragon Blade': 'Knight Blade',
  'Assassin Blade': 'Gladius',
  'Salamander Blade': 'Dark Breaker',
};

// Servir texturas oficiales locales por (grupo, index) de alto rendimiento
app.get('/api/items/texture/:group/:index.jpg', (req, res) => {
  const group = parseInt(req.params.group, 10);
  const index = parseInt(req.params.index, 10);
  if (isNaN(group) || isNaN(index)) {
    return res.status(400).send('Invalid item group or index');
  }

  const texturePath = path.join(__dirname, 'public', 'items', String(group), `${index}.jpg`);
  if (fs.existsSync(texturePath)) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(texturePath);
  }

  return res.status(404).send('Texture not found');
});

// Servir iconos oficiales de habilidades (skills) de alto rendimiento
app.get('/api/skills/image/:id', (req, res) => {
  const skillId = parseInt(req.params.id, 10);
  if (isNaN(skillId) || skillId < 0) {
    return res.status(400).send('Invalid skill ID');
  }

  const skillPathPng = path.join(__dirname, 'public', 'skills', `skill_${skillId}.png`);
  const skillPathId = path.join(__dirname, 'public', 'skills', `${skillId}.png`);

  const chosenPath = fs.existsSync(skillPathPng) ? skillPathPng : (fs.existsSync(skillPathId) ? skillPathId : null);
  if (chosenPath) {
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(chosenPath);
  }

  return res.status(404).send('Skill icon not found');
});

app.get('/api/items/image/:name', (req, res) => {
  const rawName = req.params.name;
  if (!rawName) return res.status(400).send('Item name required');
  let cleanName = decodeURIComponent(rawName).replace(/\.(png|jpg|jpeg)$/i, '').trim();

  // Apply canonical alias if needed
  if (ITEM_GRAPHIC_ALIASES[cleanName]) {
    cleanName = ITEM_GRAPHIC_ALIASES[cleanName];
  }
  
  if (itemImageCache.has(cleanName)) {
    const cached = itemImageCache.get(cleanName);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.send(cached);
  }

  const targetUrl = `https://muonlinefanz.com/tools/items/data/graphics/${encodeURIComponent(cleanName)}.jpg`;
  const parsedUrl = new URL(targetUrl);

  const reqOptions = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
    }
  };

  https.get(reqOptions, (proxyRes) => {
    const contentType = proxyRes.headers['content-type'] || '';
    if (proxyRes.statusCode !== 200 || !contentType.includes('image')) {
      return res.status(404).send('Image not found');
    }

    const chunks = [];
    proxyRes.on('data', chunk => chunks.push(chunk));
    proxyRes.on('end', async () => {
      const rawBuffer = Buffer.concat(chunks);
      let finalBuffer = rawBuffer;

      try {
        finalBuffer = await extractCleanItemPng(rawBuffer);
      } catch (e) {
        console.warn('Could not extract clean PNG for:', cleanName);
      }

      if (itemImageCache.size < 2000) {
        itemImageCache.set(cleanName, finalBuffer);
      }
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.send(finalBuffer);
    });
  }).on('error', (err) => {
    res.status(502).send('Error fetching item image: ' + err.message);
  });
});

// Endpoint para alternar manualmente entre EMULADOR y CELULAR FÍSICO
app.post('/api/admin/device/toggle-emulator', (req, res) => {
  const adminKey = req.headers['x-admin-key'];
  if (!isValidAdminKey(adminKey)) {
    return res.status(401).json({ success: false, error: 'NO_AUTORIZADO' });
  }
  const { hwid, isEmulator } = req.body || {};
  if (!hwid) return res.status(400).json({ success: false, error: 'HWID_REQUERIDO' });

  const devices = loadDevices();
  if (!devices[hwid]) {
    return res.status(404).json({ success: false, error: 'DISPOSITIVO_NO_ENCONTRADO' });
  }

  devices[hwid].isEmulator = !!isEmulator;
  devices[hwid].isEmulatorManual = true;
  if (isEmulator && (!devices[hwid].deviceModel || devices[hwid].deviceModel.includes('Físico'))) {
    devices[hwid].deviceModel = 'Emulador PC';
  }
  saveDevices(devices);

  res.json({ success: true, hwid, isEmulator: !!isEmulator, message: 'Entorno actualizado correctamente' });
});




// =========================================================================
// ENDPOINTS DE PROCEDIMIENTOS ALMACENADOS DETERMINISTAS (0% FALSOS POSITIVOS)
// =========================================================================

// 1. Reparar Registros Huérfanos
app.post('/api/tools/fix-orphans', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const result = await executeSql(req.body.config, async (pool) => {
      return await pool.request().query(`
        IF OBJECT_ID('dbo.sp_MuManager_FixOrphans', 'P') IS NOT NULL
        BEGIN
          EXEC dbo.sp_MuManager_FixOrphans;
        END
        ELSE
        BEGIN
          DECLARE @OrphanCharsCount INT = 0;
          DECLARE @BrokenSlotsCount INT = 0;
          DECLARE @DanglingGuildMembersCount INT = 0;

          BEGIN TRY
            BEGIN TRANSACTION;

            SELECT c.Name, c.AccountID 
            INTO #OrphanCharacters
            FROM Character c WITH (NOLOCK)
            LEFT JOIN MEMB_INFO m WITH (NOLOCK) ON LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(m.memb___id))
            WHERE m.memb___id IS NULL;
            SET @OrphanCharsCount = @@ROWCOUNT;

            IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL
            BEGIN
              UPDATE ac
              SET GameID1 = CASE WHEN c1.Name IS NULL THEN NULL ELSE ac.GameID1 END,
                  GameID2 = CASE WHEN c2.Name IS NULL THEN NULL ELSE ac.GameID2 END,
                  GameID3 = CASE WHEN c3.Name IS NULL THEN NULL ELSE ac.GameID3 END,
                  GameID4 = CASE WHEN c4.Name IS NULL THEN NULL ELSE ac.GameID4 END,
                  GameID5 = CASE WHEN c5.Name IS NULL THEN NULL ELSE ac.GameID5 END
              FROM AccountCharacter ac
              LEFT JOIN Character c1 WITH (NOLOCK) ON ac.GameID1 = c1.Name AND ac.Id = c1.AccountID
              LEFT JOIN Character c2 WITH (NOLOCK) ON ac.GameID2 = c2.Name AND ac.Id = c2.AccountID
              LEFT JOIN Character c3 WITH (NOLOCK) ON ac.GameID3 = c3.Name AND ac.Id = c3.AccountID
              LEFT JOIN Character c4 WITH (NOLOCK) ON ac.GameID4 = c4.Name AND ac.Id = c4.AccountID
              LEFT JOIN Character c5 WITH (NOLOCK) ON ac.GameID5 = c5.Name AND ac.Id = c5.AccountID
              WHERE (ac.GameID1 IS NOT NULL AND c1.Name IS NULL)
                 OR (ac.GameID2 IS NOT NULL AND c2.Name IS NULL)
                 OR (ac.GameID3 IS NOT NULL AND c3.Name IS NULL)
                 OR (ac.GameID4 IS NOT NULL AND c4.Name IS NULL)
                 OR (ac.GameID5 IS NOT NULL AND c5.Name IS NULL);
              SET @BrokenSlotsCount = @@ROWCOUNT;
            END

            IF OBJECT_ID('GuildMember', 'U') IS NOT NULL
            BEGIN
              DELETE gm
              FROM GuildMember gm
              LEFT JOIN Character c WITH (NOLOCK) ON gm.Name = c.Name
              WHERE c.Name IS NULL;
              SET @DanglingGuildMembersCount = @@ROWCOUNT;
            END

            COMMIT TRANSACTION;

            SELECT 
              1 AS Success,
              @OrphanCharsCount AS OrphanCharsFound,
              @BrokenSlotsCount AS AccountSlotsCleaned,
              @DanglingGuildMembersCount AS DanglingGuildMembersRemoved;

            DROP TABLE #OrphanCharacters;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH
        END
      `);
    });

    const data = result.recordset && result.recordset[0] ? result.recordset[0] : {};
    res.json({
      success: true,
      result: data,
      message: `Huérfanos reparados: ${data.OrphanCharsFound || 0} pjs sin cuenta detectados, ${data.AccountSlotsCleaned || 0} slots corregidos, ${data.DanglingGuildMembersRemoved || 0} registros de guild eliminados.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Rescatar Coordenadas Inválidas
app.post('/api/tools/rescue-coords', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const result = await executeSql(req.body.config, async (pool) => {
      return await pool.request().query(`
        IF OBJECT_ID('dbo.sp_MuManager_RescueInvalidCoords', 'P') IS NOT NULL
        BEGIN
          EXEC dbo.sp_MuManager_RescueInvalidCoords;
        END
        ELSE
        BEGIN
          DECLARE @RescuedCount INT = 0;
          BEGIN TRY
            BEGIN TRANSACTION;

            UPDATE c
            SET MapNumber = 0, MapPosX = 125, MapPosY = 125
            FROM Character c
            LEFT JOIN MEMB_STAT ms WITH (NOLOCK) ON LTRIM(RTRIM(c.AccountID)) = LTRIM(RTRIM(ms.memb___id))
            WHERE (ISNULL(ms.ConnectStat, 0) = 0)
              AND (
                   c.MapPosX < 0 OR c.MapPosX > 255 OR
                   c.MapPosY < 0 OR c.MapPosY > 255 OR
                   c.MapNumber < 0 OR c.MapNumber > 100
              );

            SET @RescuedCount = @@ROWCOUNT;
            COMMIT TRANSACTION;

            SELECT 1 AS Success, @RescuedCount AS RescuedCount;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH
        END
      `);
    });

    const count = result.recordset && result.recordset[0] ? result.recordset[0].RescuedCount : 0;
    res.json({
      success: true,
      result: { count },
      message: `${count} personajes con coordenadas o mapa fuera de rango fueron normalizados a Lorencia (125, 125).`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Corregir Desbordamientos de Enteros (Zen y Puntos)
app.post('/api/tools/fix-overflows', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const result = await executeSql(req.body.config, async (pool) => {
      return await pool.request().query(`
        IF OBJECT_ID('dbo.sp_MuManager_FixIntegerOverflows', 'P') IS NOT NULL
        BEGIN
          EXEC dbo.sp_MuManager_FixIntegerOverflows;
        END
        ELSE
        BEGIN
          DECLARE @CharsUpdated INT = 0;
          DECLARE @VaultsUpdated INT = 0;

          BEGIN TRY
            BEGIN TRANSACTION;

            UPDATE Character
            SET Money = CASE 
                            WHEN Money < 0 THEN 0 
                            WHEN Money > 2000000000 THEN 2000000000 
                            ELSE Money 
                        END,
                LevelUpPoint = CASE WHEN LevelUpPoint < 0 THEN 0 ELSE LevelUpPoint END,
                ResetCount = CASE WHEN ResetCount < 0 THEN 0 ELSE ResetCount END
            WHERE Money < 0 OR Money > 2000000000 OR LevelUpPoint < 0 OR ResetCount < 0;

            SET @CharsUpdated = @@ROWCOUNT;

            IF OBJECT_ID('warehouse', 'U') IS NOT NULL
            BEGIN
              UPDATE warehouse
              SET Money = CASE 
                              WHEN Money < 0 THEN 0 
                              WHEN Money > 2000000000 THEN 2000000000 
                              ELSE Money 
                          END
              WHERE Money < 0 OR Money > 2000000000;

              SET @VaultsUpdated = @@ROWCOUNT;
            END

            COMMIT TRANSACTION;

            SELECT 1 AS Success, @CharsUpdated AS CharsFixed, @VaultsUpdated AS VaultsFixed;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH
        END
      `);
    });

    const data = result.recordset && result.recordset[0] ? result.recordset[0] : {};
    res.json({
      success: true,
      result: data,
      message: `Desbordamientos corregidos: ${data.CharsFixed || 0} personajes y ${data.VaultsFixed || 0} baúles normalizados dentro de los límites de 32-bit.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Limpiar Conexiones Fantasma
app.post('/api/tools/clean-ghosts', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const result = await executeSql(req.body.config, async (pool) => {
      return await pool.request().query(`
        IF OBJECT_ID('dbo.sp_MuManager_CleanGhostConnections', 'P') IS NOT NULL
        BEGIN
          EXEC dbo.sp_MuManager_CleanGhostConnections;
        END
        ELSE
        BEGIN
          DECLARE @GhostsCleaned INT = 0;
          BEGIN TRY
            BEGIN TRANSACTION;

            IF OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
            BEGIN
              UPDATE MEMB_STAT
              SET ConnectStat = 0
              WHERE ConnectStat = 1
                AND (
                     (DisConnectTM IS NOT NULL AND DisConnectTM > ConnectTM)
                     OR (ConnectTM IS NOT NULL AND DATEDIFF(HOUR, ConnectTM, GETDATE()) > 24)
                );
              SET @GhostsCleaned = @@ROWCOUNT;
            END

            IF OBJECT_ID('AccountCharacter', 'U') IS NOT NULL AND OBJECT_ID('MEMB_STAT', 'U') IS NOT NULL
            BEGIN
              UPDATE ac
              SET GameIDC = NULL
              FROM AccountCharacter ac
              INNER JOIN MEMB_STAT ms WITH (NOLOCK) ON LTRIM(RTRIM(ac.Id)) = LTRIM(RTRIM(ms.memb___id))
              WHERE ms.ConnectStat = 0 AND ac.GameIDC IS NOT NULL;
            END

            COMMIT TRANSACTION;

            SELECT 1 AS Success, @GhostsCleaned AS GhostsCleaned;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH
        END
      `);
    });

    const count = result.recordset && result.recordset[0] ? result.recordset[0].GhostsCleaned : 0;
    res.json({
      success: true,
      result: { count },
      message: `${count} sesiones zombi restablecidas a ConnectStat = 0 y ranuras GameIDC liberadas.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Escanear Nombres con Caracteres Ilegales
app.post('/api/tools/scan-illegal-names', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const result = await executeSql(req.body.config, async (pool) => {
      return await pool.request().query(`
        IF OBJECT_ID('dbo.sp_MuManager_ScanIllegalNames', 'P') IS NOT NULL
        BEGIN
          EXEC dbo.sp_MuManager_ScanIllegalNames;
        END
        ELSE
        BEGIN
          SELECT 
            c.Name,
            c.AccountID,
            c.cLevel,
            c.Class,
            CASE 
                WHEN c.Name LIKE '% ' OR c.Name LIKE ' %' THEN 'Espacio en blanco inicial o final'
                WHEN c.Name LIKE '%' + CHAR(9) + '%' THEN 'Carácter de tabulación [TAB]'
                WHEN c.Name LIKE '%' + CHAR(10) + '%' OR c.Name LIKE '%' + CHAR(13) + '%' THEN 'Salto de línea [CR/LF]'
                ELSE 'Carácter no imprimible (ASCII < 32)'
            END AS IssueDescription
          FROM Character c WITH (NOLOCK)
          WHERE c.Name LIKE '% ' 
             OR c.Name LIKE ' %'
             OR c.Name LIKE '%' + CHAR(9) + '%'
             OR c.Name LIKE '%' + CHAR(10) + '%'
             OR c.Name LIKE '%' + CHAR(13) + '%'
             OR c.Name LIKE '%' + CHAR(0) + '%';
        END
      `);
    });

    const list = result.recordset || [];
    res.json({
      success: true,
      characters: list,
      message: list.length === 0 ? 'No se detectaron personajes con caracteres ilegales.' : `Se encontraron ${list.length} personajes con nombres irregulares.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Normalizar Estados PK
app.post('/api/tools/fix-pk-status', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const result = await executeSql(req.body.config, async (pool) => {
      return await pool.request().query(`
        IF OBJECT_ID('dbo.sp_MuManager_FixPkStatus', 'P') IS NOT NULL
        BEGIN
          EXEC dbo.sp_MuManager_FixPkStatus;
        END
        ELSE
        BEGIN
          DECLARE @FixedCount INT = 0;
          BEGIN TRY
            BEGIN TRANSACTION;

            UPDATE Character
            SET PkLevel = CASE WHEN PkLevel < 1 OR PkLevel > 6 THEN 3 ELSE PkLevel END,
                PkTime = CASE WHEN PkTime < 0 THEN 0 ELSE PkTime END,
                PkCount = CASE WHEN PkCount < 0 THEN 0 ELSE PkCount END
            WHERE (PkLevel < 1 OR PkLevel > 6) OR PkTime < 0 OR PkCount < 0;

            SET @FixedCount = @@ROWCOUNT;
            COMMIT TRANSACTION;

            SELECT 1 AS Success, @FixedCount AS FixedCount;
          END TRY
          BEGIN CATCH
            IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
            THROW;
          END CATCH
        END
      `);
    });

    const count = result.recordset && result.recordset[0] ? result.recordset[0].FixedCount : 0;
    res.json({
      success: true,
      result: { count },
      message: `${count} personajes con estados PK corruptos o PkTime negativo normalizados a Ciudadano.`
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Instalar Procedimientos y Triggers en SQL Server
app.post('/api/tools/install-procedures', async (req, res) => {
  try {
    if (!sql) return res.status(500).json({ success: false, error: 'mssql not installed' });
    const sqlPath = path.join(__dirname, '..', 'sql', 'MuManager_Procedures.sql');
    let sqlScript = '';
    if (fs.existsSync(sqlPath)) {
      sqlScript = fs.readFileSync(sqlPath, 'utf8');
    }

    if (!sqlScript) {
      return res.status(404).json({ success: false, error: 'No se encontró el archivo sql/MuManager_Procedures.sql en el servidor.' });
    }

    // Dividir en lotes GO para ejecución nativa en SQL Server
    const batches = sqlScript
      .split(/^\s*GO\s*$/im)
      .map(b => b.trim())
      .filter(b => b.length > 0 && !b.toLowerCase().startsWith('use '));

    await executeSql(req.body.config, async (pool) => {
      for (const batch of batches) {
        await pool.request().query(batch);
      }
    });

    res.json({
      success: true,
      message: 'Todos los procedimientos almacenados, triggers y tabla de auditoría instalados exitosamente en SQL Server.'
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =========================================================================
// PROTECCIÓN ANTI-HTML: CATCH-ALL 404 Y MANEJADOR GLOBAL DE ERRORES PARA /api/*
// =========================================================================
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint no encontrado en la pasarela: ${req.method} ${req.path}`,
    endpoint: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('[Gateway Error]', err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno del servidor Gateway'
  });
});

if (!process.env.VERCEL) {
  const server1 = app.listen(PORT, '0.0.0.0', () => {
    console.log('====================================================');
    console.log('  MU MANAGER PRO - PUENTE SQL SERVER Y TELEMETRÍA');
    console.log('====================================================');
    console.log(`  Servidor escuchando en: http://0.0.0.0:${PORT}`);
    console.log(`  Panel de Monitoreo Web : http://localhost:${PORT}/admin`);
    console.log('====================================================');
  });
  server1.on('error', (err) => console.log(`  Nota puerto ${PORT}: ${err.message}`));

  if (PORT !== 30001) {
    try {
      const server2 = app.listen(30001, '0.0.0.0', () => {
        console.log('  [OK] Puerto secundario 30001 también activo.');
      });
      server2.on('error', () => {});
    } catch (e) {}
  }
}

module.exports = app;
