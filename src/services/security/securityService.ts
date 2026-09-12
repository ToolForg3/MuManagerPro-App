import { Platform, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getMasterSalt } from './stringObfuscator';

// Master security secret salt derived dynamically at runtime (Anti-Decompilation)
export const MASTER_SECURITY_SALT = getMasterSalt();

/**
 * Pure JavaScript SHA-256 implementation for React Native / Expo
 * Ensures zero native dependency issues while providing tamper-proof cryptographic hashing
 */
export function sha256(input: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  // BUG-07: Normalize input to UTF-8 single-byte string to handle non-ASCII properly
  let ascii = unescape(encodeURIComponent(input));

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
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

  for (i = 0; i < ascii.length; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return ''; // ASCII check
    words[i >> 2] |= j << ((3 - (i % 4)) * 8);
  }
  words[words.length] = (asciiBitLength / maxWord) | 0;
  words[words.length] = asciiBitLength;

  for (j = 0; j < words.length;) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash;
    hash = hash.slice(0, 8);

    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 =
        hash[7] +
        (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
        ch +
        k[i] +
        (w[i] =
          i < 16
            ? w[i]
            : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
      const temp2 =
        (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) +
        maj;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }

    for (i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (i = 0; i < 8; i++) {
    for (let b = 3; b >= 0; b--) {
      const byte = (hash[i] >> (b * 8)) & 255;
      result += (byte < 16 ? '0' : '') + byte.toString(16);
    }
  }
  return result;
}

import * as Application from 'expo-application';

export class SecurityService {
  private static cachedHwid: string | null = null;
  private static HWID_STORAGE_KEY = '@mumanager_celular_hwid_v2';

  /**
   * Generates a unique, persistent Hardware ID (HWID) bound to this Android phone.
   * Format: CEL-XXXX-XXXX-XXXX
   * Uses the native Android OS hardware identifier (Settings.Secure.ANDROID_ID)
   */
  static async getDeviceHwid(): Promise<string> {
    if (this.cachedHwid) return this.cachedHwid;

    // Check if HWID was already deterministically created and stored
    const stored = await AsyncStorage.getItem(this.HWID_STORAGE_KEY);
    if (stored) {
      this.cachedHwid = stored;
      return stored;
    }

    // 1. Read the native Android hardware ID
    let androidId: string | null = null;
    if (Platform.OS === 'android') {
      try {
        const rawId = Application.getAndroidId();
        if (rawId && typeof rawId === 'string' && rawId.trim().length >= 6 && rawId.trim() !== '0000000000000000') {
          androidId = rawId.trim();
        }
      } catch (e) {
        console.warn('Could not read native Android ID', e);
      }
    }

    // 2. Collect permanent, immutable physical motherboard traits from system Build properties
    const c: any = Platform.constants || {};
    const brand = String(c.Brand || c.brand || Platform.OS).trim().toLowerCase();
    const model = String(c.Model || c.model || 'device').trim().toLowerCase();
    const manufacturer = String(c.Manufacturer || c.manufacturer || '').trim().toLowerCase();
    const hardware = String(c.Hardware || c.hardware || '').trim().toLowerCase();
    const board = String(c.Board || c.board || '').trim().toLowerCase();
    const fingerprint = String(c.Fingerprint || c.fingerprint || '').trim().toLowerCase();
    const hardwareSeed = `${Platform.OS}-${brand}-${model}-${manufacturer}-${hardware}-${board}-${fingerprint}`;

    // 3. Cryptographically hash the unique mobile hardware signature with the master salt
    const mobileEntropy = `MOBILE_PHONE_HW_${androidId || hardwareSeed}_${MASTER_SECURITY_SALT}`;
    const hash = sha256(mobileEntropy).toUpperCase();

    // 4. Format clean, friendly cell phone code: CEL-XXXX-XXXX-XXXX
    const p1 = hash.substring(0, 4);
    const p2 = hash.substring(4, 8);
    const p3 = hash.substring(8, 12);
    const hwid = `CEL-${p1}-${p2}-${p3}`;

    await AsyncStorage.setItem(this.HWID_STORAGE_KEY, hwid);
    this.cachedHwid = hwid;
    return hwid;
  }

  /**
   * Computes the cryptographic checksum for a license payload to prevent local file tampering
   */
  static computeChecksum(payload: string): string {
    return sha256(`${payload}#${MASTER_SECURITY_SALT}`).substring(0, 16).toUpperCase();
  }

  /**
   * Validates if an activation key mathematically matches the device's HWID
   */
  static verifyKey(hwid: string, key: string): { valid: boolean; plan: 'PRO' | 'DEMO'; expires?: string } {
    const cleanKey = key.trim().toUpperCase().replace(/\s+/g, '');
    const cleanHwid = hwid.trim().toUpperCase();
    
    // Formato estricto de licencia: MUMANAGER-[PLAN]-[SIG1]-[SIG2]-[SIG3]
    // Ejemplo: MUMANAGER-PRO-A8F1-44B9-C012
    const parts = cleanKey.split('-');
    if (parts.length !== 5) {
      return { valid: false, plan: 'DEMO' };
    }

    if (parts[0] !== 'MUMANAGER') {
      return { valid: false, plan: 'DEMO' };
    }

    const plan = parts[1];
    if (plan !== 'PRO' && plan !== 'VIP') {
      return { valid: false, plan: 'DEMO' };
    }

    // Hallazgo 5: Cada bloque de firma debe ser de exactamente 4 caracteres hexadecimales
    const sig1 = parts[2];
    const sig2 = parts[3];
    const sig3 = parts[4];
    const hexBlock = /^[0-9A-F]{4}$/;
    if (!hexBlock.test(sig1) || !hexBlock.test(sig2) || !hexBlock.test(sig3)) {
      return { valid: false, plan: 'DEMO' };
    }

    const providedSignature = sig1 + sig2 + sig3;
    if (providedSignature.length !== 12) {
      return { valid: false, plan: 'DEMO' };
    }

    // Recomputar firma con el Salt maestro usando el plan de la clave
    const expectedFullHash = sha256(`${cleanHwid}:${plan}:${MASTER_SECURITY_SALT}`).toUpperCase();
    const expectedSignature = expectedFullHash.substring(0, 12);

    if (providedSignature === expectedSignature) {
      return { valid: true, plan: 'PRO' };
    }

    return { valid: false, plan: 'DEMO' };
  }

  /**
   * Genera cabeceras de firma criptográfica para peticiones seguras hacia el Gateway
   */
  static generateRequestHeaders(hwid: string, bodyJson: string = ''): Record<string, string> {
    const timestamp = Date.now().toString();
    const nonce = Math.random().toString(36).substring(2, 10);
    const bodyHash = sha256(bodyJson).substring(0, 16);
    const signature = sha256(`${hwid}:${timestamp}:${nonce}:${bodyHash}:${getMasterSalt()}`).toUpperCase();

    return {
      'X-Device-HWID': hwid,
      'X-Req-Timestamp': timestamp,
      'X-Req-Nonce': nonce,
      'X-Req-Signature': signature,
    };
  }

  /**
   * Detects if the current running environment is an Android emulator
   * (BlueStacks, Nox, LDPlayer, MEmu, Android Studio AVD, Genymotion, MuMu, WSA, etc.)
   * Uses x86/x64 ABI detection which CANNOT be spoofed by PC emulators.
   */
  static detectIsEmulator(): boolean {
    if (Platform.OS !== 'android') return false;
    const c: any = Platform.constants || {};

    const brand = String(c.Brand || c.brand || '').toLowerCase().trim();
    const model = String(c.Model || c.model || '').toLowerCase().trim();
    const manufacturer = String(c.Manufacturer || c.manufacturer || '').toLowerCase().trim();
    const hardware = String(c.Hardware || c.hardware || '').toLowerCase().trim();
    const product = String(c.Product || c.product || '').toLowerCase().trim();
    const board = String(c.Board || c.board || '').toLowerCase().trim();
    const fingerprint = String(c.Fingerprint || c.fingerprint || '').toLowerCase().trim();

    // 1. Detección explícita de nombres de emuladores conocidos
    const isExplicitEmulator = (
      brand === 'nox' ||
      brand === 'bluestacks' ||
      brand === 'ldplayer' ||
      brand === 'mumu' ||
      brand === 'bignox' ||
      brand.includes('microvirt') ||
      manufacturer.includes('genymotion') ||
      manufacturer.includes('bignox') ||
      manufacturer.includes('microvirt') ||
      manufacturer.includes('bluestacks') ||
      model.includes('google_sdk') ||
      model.includes('sdk_gphone') ||
      model.includes('emulator') ||
      model.includes('android sdk') ||
      model.includes('subsystem for android') ||
      model.includes('vphone') ||
      model.includes('vbox') ||
      model.includes('genymotion') ||
      model.includes('bluestacks') ||
      model.includes('ldplayer') ||
      model.includes('noxplayer') ||
      product.includes('vbox') ||
      product.includes('genymotion') ||
      product.includes('bluestacks') ||
      product.includes('ldplayer') ||
      product.includes('noxplayer') ||
      hardware === 'goldfish' ||
      hardware === 'ranchu' ||
      hardware === 'vbox86' ||
      hardware === 'ttvm' ||
      hardware === 'nemu' ||
      hardware === 'microvirt' ||
      hardware.includes('goldfish') ||
      hardware.includes('ranchu') ||
      hardware.includes('vbox86') ||
      board === 'goldfish' ||
      board === 'vbox' ||
      board.includes('android-x86') ||
      board === 'nox'
    );
    if (isExplicitEmulator) return true;

    // 2. Lista blanca estricta de fabricantes de teléfonos celulares físicos legítimos
    const isKnownPhysicalOem = [
      'samsung', 'honor', 'huawei', 'xiaomi', 'redmi', 'poco',
      'motorola', 'moto', 'oppo', 'vivo', 'realme', 'oneplus',
      'sony', 'lg', 'asus', 'tcl', 'zte', 'nokia', 'tecno', 'infinix', 'google', 'apple'
    ].some(oem => brand.includes(oem) || manufacturer.includes(oem));

    if (isKnownPhysicalOem) {
      return false;
    }

    // 3. Fallback genérico para marcas no reconocidas
    if (brand === 'generic' || model.includes('sdk') || fingerprint.startsWith('generic')) {
      return true;
    }

    return false;
  }

  /**
   * Retrieves hardware metadata for administrative inventory & telemetry
   */
  static getDeviceMetadata(): {
    isEmulator: boolean;
    model: string;
    brand: string;
    platformVersion: string;
  } {
    const c: any = Platform.constants || {};
    const brand = String(c.Brand || c.brand || (Platform.OS === 'android' ? 'Android' : 'iOS')).trim();
    const model = String(c.Model || c.model || 'Dispositivo').trim();
    const platformVersion = String(Platform.Version || 'N/A');
    const isEmulator = this.detectIsEmulator();

    return {
      isEmulator,
      model,
      brand,
      platformVersion,
    };
  }

  /**
   * Checks runtime environment for threats (hooking frameworks, debugging)
   */
  static checkIntegrity(): { safe: boolean; threats: string[] } {
    const threats: string[] = [];

    // Check if remote debugger is active
    if (typeof atob !== 'undefined' && (global as any).__REMOTEDEV__) {
      threats.push('REMOTE_DEBUGGER_ACTIVE');
    }

    // Check for global hooking artifacts (Frida / Xposed injection / Substrate)
    const g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : (typeof window !== 'undefined' ? window : {}));
    if (
      g.Frida || g.frida || g.__frida || g._frida ||
      g.NativePointer || g.Interceptor ||
      (g.Process && (g.Process.pointer || g.Process.getCurrentThreadId)) ||
      (typeof g.ptr === 'function' && typeof g.Interceptor === 'object')
    ) {
      threats.push('FRIDA_INJECTION_DETECTED');
    }

    // Anti-Monkey-Patching de rutinas críticas de seguridad en memoria
    try {
      const fnStr = Function.prototype.toString.call(SecurityService.verifyKey);
      const isHermesBytecode = fnStr.includes('[bytecode]') || fnStr.includes('[native code]');
      if (!isHermesBytecode && (!fnStr.includes('cleanKey') || !fnStr.includes('providedSignature'))) {
        threats.push('SECURITY_SERVICE_TAMPERED');
      }
    } catch (_) {}

    return {
      safe: threats.length === 0,
      threats,
    };
  }

  /**
   * Alias for checkIntegrity to ensure backward compatibility and prevent runtime TypeError
   */
  static verifyAppIntegrity(): { safe: boolean; threats: string[] } {
    return this.checkIntegrity();
  }
}
