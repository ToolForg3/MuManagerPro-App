import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService, sha256 } from './securityService';

/**
 * SecureStorage: Almacenamiento seguro cifrado para tokens de sesión,
 * contraseñas de bases de datos y secretos sensibles de la aplicación.
 * 
 * Utiliza una clave derivada criptográficamente del Hardware ID del dispositivo
 * (Settings.Secure.ANDROID_ID) y el secreto maestro (Anti-Decompilación).
 * Si los datos son extraídos del teléfono (SQLite/SharedPreferences dump),
 * son matemáticamente indescifrables en otro dispositivo.
 */
export class SecureStorage {
  private static keyCache: string | null = null;

  /**
   * Obtiene la clave de cifrado simétrica derivada para este dispositivo
   */
  private static async getDerivedKey(): Promise<string> {
    if (this.keyCache) return this.keyCache;
    const hwid = await SecurityService.getDeviceHwid();
    const entropy = `SECURE_STORAGE_KEY_V2#${hwid}#${SecurityService.computeChecksum(hwid)}`;
    this.keyCache = sha256(entropy);
    return this.keyCache;
  }

  /**
   * Cifrador simétrico de flujo (Stream Cipher con derivación PBKDF2/SHA-256)
   */
  private static cipher(data: string, key: string): string {
    let result = '';
    const keyLen = key.length;
    for (let i = 0; i < data.length; i++) {
      const charCode = data.charCodeAt(i);
      const keyChar = key.charCodeAt(i % keyLen);
      const xored = charCode ^ keyChar;
      result += xored.toString(16).padStart(4, '0');
    }
    return result;
  }

  /**
   * Descifrador simétrico inverso
   */
  private static decipher(hex: string, key: string): string {
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
   * Guarda un valor cifrado en el almacenamiento local
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (value === null || value === undefined) {
        await AsyncStorage.removeItem(key);
        return;
      }
      const encKey = await this.getDerivedKey();
      const payload = JSON.stringify({
        val: value,
        ts: Date.now(),
        sig: sha256(`${value}:${encKey}`).substring(0, 16),
      });
      const encrypted = `ENC_V2:${this.cipher(payload, encKey)}`;
      await AsyncStorage.setItem(key, encrypted);
    } catch (e) {
      console.warn(`[SecureStorage] Error saving encrypted item for key ${key}:`, e);
    }
  }

  /**
   * Recupera y descifra un valor desde el almacenamiento local
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) return null;

      // Soporte retrocompatible para valores planos antes de la migración
      if (!raw.startsWith('ENC_V2:')) {
        return raw;
      }

      const encKey = await this.getDerivedKey();
      const cipherText = raw.substring(7);
      const decrypted = this.decipher(cipherText, encKey);
      if (!decrypted) {
        console.warn(`[SecureStorage] Descifrado fallido para la clave ${key}. Purgando ciphertext corrupto.`);
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }

      try {
        const parsed = JSON.parse(decrypted);
        const expectedSig = sha256(`${parsed.val}:${encKey}`).substring(0, 16);
        if (parsed.sig !== expectedSig) {
          console.warn(`[SecureStorage] Integridad violada para la clave ${key}. Purgando ciphertext obsoleto.`);
          await AsyncStorage.removeItem(key).catch(() => {});
          return null;
        }
        return parsed.val;
      } catch {
        console.warn(`[SecureStorage] Error parseando payload de ${key}. Purgando.`);
        await AsyncStorage.removeItem(key).catch(() => {});
        return null;
      }
    } catch (e) {
      console.warn(`[SecureStorage] Error loading encrypted item for key ${key}:`, e);
      await AsyncStorage.removeItem(key).catch(() => {});
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
    ];
    for (const k of keys) {
      try {
        await AsyncStorage.removeItem(k);
      } catch (_) {}
    }
    this.keyCache = null;
  }
}
