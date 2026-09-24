import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService, sha256 } from './securityService';

/**
 * SecureStorage: Almacenamiento local cifrado y autenticado para tokens de sesión,
 * contraseñas de bases de datos y credenciales sensibles de la aplicación.
 * 
 * Implementa cifrado simétrico autenticado (ENC_V3) con derivación iterativa KDF
 * y verificación de integridad Encrypt-then-MAC (HMAC-SHA256).
 * Incluye migración transparente de registros anteriores (ENC_V2 y texto plano).
 */
export class SecureStorage {
  private static keyCache: { encKey: string; macKey: string } | null = null;

  /**
   * Obtiene las claves de cifrado y autenticación derivadas para este dispositivo
   */
  private static async getDerivedKeys(): Promise<{ encKey: string; macKey: string }> {
    if (this.keyCache) return this.keyCache;
    const hwid = await SecurityService.getDeviceHwid();
    let k = sha256(`SECURE_STORAGE_KDF_SALT_2026#${hwid}`);
    for (let i = 0; i < 500; i++) {
      k = sha256(`${k}#${i}#${hwid}`);
    }
    const encKey = sha256(`ENC#${k}`);
    const macKey = sha256(`MAC#${k}`);
    this.keyCache = { encKey, macKey };
    return this.keyCache;
  }

  /**
   * HMAC-SHA256 para verificación de integridad criptográfica
   */
  private static hmac(key: string, message: string): string {
    let k = key;
    if (k.length > 64) k = sha256(k);
    while (k.length < 64) k += '0';
    let oKeyPad = '';
    let iKeyPad = '';
    for (let i = 0; i < 64; i += 2) {
      const b = parseInt(k.substring(i, i + 2), 16) || 0;
      oKeyPad += ((b ^ 0x5c) < 16 ? '0' : '') + (b ^ 0x5c).toString(16);
      iKeyPad += ((b ^ 0x36) < 16 ? '0' : '') + (b ^ 0x36).toString(16);
    }
    const inner = sha256(iKeyPad + message);
    return sha256(oKeyPad + inner);
  }

  /**
   * Cifrado simétrico de flujo con keystream por bloques SHA-256
   */
  private static encryptPayload(data: string, encKey: string, iv: string): string {
    const utf8 = unescape(encodeURIComponent(data));
    let cipherHex = '';
    let blockIdx = 0;
    let currentKeystream = sha256(`${encKey}:${iv}:${blockIdx}`);
    let ksOffset = 0;
    for (let i = 0; i < utf8.length; i++) {
      if (ksOffset >= currentKeystream.length) {
        blockIdx++;
        currentKeystream = sha256(`${encKey}:${iv}:${blockIdx}`);
        ksOffset = 0;
      }
      const byte = utf8.charCodeAt(i);
      const ksByte = parseInt(currentKeystream.substring(ksOffset, ksOffset + 2), 16) || 0;
      ksOffset += 2;
      const xored = byte ^ ksByte;
      cipherHex += (xored < 16 ? '0' : '') + xored.toString(16);
    }
    return cipherHex;
  }

  /**
   * Descifrado simétrico de flujo inverso
   */
  private static decryptPayload(cipherHex: string, encKey: string, iv: string): string {
    let utf8 = '';
    let blockIdx = 0;
    let currentKeystream = sha256(`${encKey}:${iv}:${blockIdx}`);
    let ksOffset = 0;
    for (let i = 0; i < cipherHex.length; i += 2) {
      if (ksOffset >= currentKeystream.length) {
        blockIdx++;
        currentKeystream = sha256(`${encKey}:${iv}:${blockIdx}`);
        ksOffset = 0;
      }
      const byte = parseInt(cipherHex.substring(i, i + 2), 16) || 0;
      const ksByte = parseInt(currentKeystream.substring(ksOffset, ksOffset + 2), 16) || 0;
      ksOffset += 2;
      utf8 += String.fromCharCode(byte ^ ksByte);
    }
    try {
      return decodeURIComponent(escape(utf8));
    } catch {
      return utf8;
    }
  }

  /**
   * Descifrado de respaldo para formato anterior ENC_V2 (migración transparente)
   */
  private static decipherLegacyV2(hex: string, key: string): string {
    let result = '';
    const keyLen = key.length;
    for (let i = 0; i < hex.length; i += 4) {
      const chunk = hex.substring(i, i + 4);
      const xored = parseInt(chunk, 16);
      if (isNaN(xored)) return '';
      const keyChar = key.charCodeAt((i / 4) % keyLen);
      result += String.fromCharCode(xored ^ keyChar);
    }
    return result;
  }

  /**
   * Guarda un valor cifrado y autenticado en el almacenamiento local
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (value === null || value === undefined) {
        await AsyncStorage.removeItem(key);
        return;
      }
      const { encKey, macKey } = await this.getDerivedKeys();
      const iv = Math.random().toString(16).substring(2, 10) + Date.now().toString(16);
      const cipherHex = this.encryptPayload(value, encKey, iv);
      const mac = this.hmac(macKey, `${iv}:${cipherHex}`);
      const encrypted = `ENC_V3:${iv}:${mac}:${cipherHex}`;
      await AsyncStorage.setItem(key, encrypted);
    } catch (e) {
      console.warn(`[SecureStorage] Error saving encrypted item for key ${key}:`, e);
    }
  }

  /**
   * Recupera y descifra un valor desde el almacenamiento local con migración automática a ENC_V3
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      // 1. Formato actual autenticado ENC_V3
      if (raw.startsWith('ENC_V3:')) {
        const parts = raw.split(':');
        if (parts.length === 4) {
          const iv = parts[1];
          const providedMac = parts[2];
          const cipherHex = parts[3];
          const { encKey, macKey } = await this.getDerivedKeys();
          const expectedMac = this.hmac(macKey, `${iv}:${cipherHex}`);
          if (providedMac !== expectedMac) {
            console.warn(`[SecureStorage] Integridad violada para la clave ${key}. Purgando.`);
            await AsyncStorage.removeItem(key).catch(() => {});
            return null;
          }
          return this.decryptPayload(cipherHex, encKey, iv);
        }
      }

      // 2. Migración transparente desde ENC_V2
      if (raw.startsWith('ENC_V2:')) {
        const hwid = await SecurityService.getDeviceHwid();
        const legacyEntropy = `SECURE_STORAGE_KEY_V2#${hwid}#${SecurityService.computeChecksum(hwid)}`;
        const legacyKey = sha256(legacyEntropy);
        const cipherText = raw.substring(7);
        const decrypted = this.decipherLegacyV2(cipherText, legacyKey);
        if (decrypted) {
          try {
            const parsed = JSON.parse(decrypted);
            if (parsed && typeof parsed.val === 'string') {
              // Migrar inmediatamente a ENC_V3
              await this.setItem(key, parsed.val);
              return parsed.val;
            }
          } catch (_) {}
        }
      }

      // 3. Migración transparente desde texto plano previo
      if (!raw.startsWith('ENC_')) {
        // Migrar inmediatamente a ENC_V3 para eliminar almacenamiento en texto plano
        await this.setItem(key, raw);
        return raw;
      }

      return null;
    } catch (e) {
      console.warn(`[SecureStorage] Error loading encrypted item for key ${key}:`, e);
      return null;
    }
  }

  /**
   * Elimina un valor seguro del almacenamiento
   */
  static async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn(`[SecureStorage] Error removing item for key ${key}:`, e);
    }
  }

  /**
   * Purgado de emergencia completo de secretos y caché de sesión local
   */
  static async purgeAllKnownSecrets(): Promise<void> {
    const keys = [
      '@mumanager_sql_config',
      '@mumanager_session_token',
      '@mumanager_admin_key',
      '@mumanager_server_profiles',
      '@mumanager_auth_password',
      '@mumanager_auth_pwhash',
    ];
    for (const k of keys) {
      try {
        await AsyncStorage.removeItem(k);
      } catch (_) {}
    }
    this.keyCache = null;
  }
}
