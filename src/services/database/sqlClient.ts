import AsyncStorage from '@react-native-async-storage/async-storage';
import { SqlServerConfig, DashboardMetrics, SqlLogEntry } from '../../types/database';
import { CharacterSummary, CharacterDetail, AccountSummary, AccountUpdateData } from '../../types/character';
import { OnlinePlayer, BanEntry, GmEntry, GmLevel, ItemKitEntry, GuildEntry, GuildMemberEntry, PkPlayerEntry, JewelAuditParams, JewelAuditResult, JewelPurgeParams, JewelPurgeResult } from '../../types/admin';
import { MuItemParser } from '../parser/muItemParser';
import { SQL_QUERIES } from './sqlQueries';
import { SecurityService } from '../security/securityService';
import { SecureStorage } from '../security/secureStorage';
import { LicenseService } from '../security/licenseService';
import { APP_VERSION, APP_BUILD } from '../../constants/appVersion';
export interface AppUpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  minRequiredVersion: string;
  apkUrl: string;
  changelog: string;
  forceUpdate: boolean;
  isRollback?: boolean;
  isBeta?: boolean;
}

export interface BroadcastNoticeInfo {
  active: boolean;
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'URGENT' | 'PROMO';
  displayMode: 'MODAL' | 'BANNER';
  updatedAt?: string;
}

export interface TelemetryPingResult {
  success: boolean;
  blocked: boolean;
  mode: string;
  plan?: string;
  reason?: string;
  message?: string;
  broadcastNotice?: BroadcastNoticeInfo | null;
  serverTime?: string;
  serverVersion?: string;
  isBanned?: boolean;
  expiresAt?: string;
  licenseKey?: string;
  sessionInvalidated?: boolean;
  sessionInvalidatedReason?: string;
  releaseChannel?: 'STABLE' | 'BETA';
  betaStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  forceLogout?: boolean;
  forceWipe?: boolean;
  authoritativeMode?: string;
  forceWipeKey?: boolean;
  forceDemo?: boolean;
  isEmulator?: boolean;
  demoRemainingHours?: number;
  isLifetime?: boolean;
  daysRemaining?: number;
  updateInfo?: AppUpdateInfo | null;
  broadcast?: BroadcastNoticeInfo | null;
  registeredUser?: {
    email: string;
    username: string;
    role: string;
  } | null;
  connectionError?: boolean;
}

const CONFIG_STORAGE_KEY = '@mumanager_sql_config';

export class SqlClient {
  public static readonly DEFAULT_CLOUD_GATEWAY = 'https://mumanagerpro.vercel.app';
  private static config: SqlServerConfig = {
    host: 'localhost',
    port: 1433,
    user: 'sa',
    password: '',
    database: 'MuOnline',
    encrypt: false,
    bridgeUrl: SqlClient.DEFAULT_CLOUD_GATEWAY,
    useBridge: true,
    emulatorType: 'Louis',
  };

  private static isConnected: boolean = false;
  private static logs: SqlLogEntry[] = [];
  private static activeUserEmail: string = '';
  private static sessionToken: string = '';

  static setActiveUser(email: string) {
    this.activeUserEmail = (email || '').trim();
  }

  static getActiveUser(): string {
    return this.activeUserEmail;
  }

  static setSessionToken(token: string) {
    this.sessionToken = (token || '').trim();
    if (this.sessionToken) {
      SecureStorage.setItem('@mumanager_session_token', this.sessionToken).catch(() => {});
    } else {
      SecureStorage.removeItem('@mumanager_session_token').catch(() => {});
    }
  }

  static async getSessionToken(): Promise<string> {
    if (this.sessionToken) return this.sessionToken;
    try {
      const stored = await SecureStorage.getItem('@mumanager_session_token');
      if (stored && stored.trim()) {
        this.sessionToken = stored.trim();
      }
    } catch {}
    return this.sessionToken;
  }

  static async getStoredAdminKey(): Promise<string> {
    try {
      const key = await SecureStorage.getItem('@mumanager_admin_key');
      return (key && key.trim()) ? key.trim() : '';
    } catch {
      return '';
    }
  }

  static async setStoredAdminKey(key: string): Promise<void> {
    try {
      await SecureStorage.setItem('@mumanager_admin_key', (key || '').trim());
    } catch (e) {
      console.warn('Could not save admin key', e);
    }
  }

  static getDefaultConfig(): SqlServerConfig {
    return {
      host: '127.0.0.1',
      port: 1433,
      user: 'sa',
      password: '',
      database: 'MuOnline',
      encrypt: false,
      bridgeUrl: SqlClient.DEFAULT_CLOUD_GATEWAY,
      useBridge: true,
      emulatorType: 'MSPro',
    };
  }

  static async loadSavedConfig(): Promise<SqlServerConfig> {
    try {
      const saved = await SecureStorage.getItem(CONFIG_STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            if (parsed.bridgeUrl && (parsed.bridgeUrl.includes('onrender.com') || parsed.bridgeUrl.includes('localhost') || parsed.bridgeUrl.includes('127.0.0.1'))) {
              parsed.bridgeUrl = this.DEFAULT_CLOUD_GATEWAY;
            }
            if (parsed.useBridge === undefined) {
              parsed.useBridge = true;
            }
            this.config = { ...this.config, ...parsed };
          }
        } catch {
          console.warn('[SqlClient] Configuración JSON corrupta. Purgando.');
          await SecureStorage.removeItem(CONFIG_STORAGE_KEY).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('Could not load saved SQL config', e);
    }
    return this.config;
  }

  static async saveConfig(newConfig: SqlServerConfig): Promise<void> {
    this.config = { ...newConfig };
    try {
      await SecureStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (e) {
      console.warn('Could not save SQL config', e);
    }
  }

  /**
   * Purgado profundo de emergencia: elimina tokens de sesión, credenciales cacheadas,
   * perfiles de servidor y restablece la configuración SQL al estado inicial limpio.
   * Resuelve problemas de reconexión tras actualizaciones de APK sin requerir reinstalación.
   */
  static async resetAllConnectionState(): Promise<void> {
    this.sessionToken = '';
    this.activeUserEmail = '';
    this.isConnected = false;
    this.logs = [];
    this.config = this.getDefaultConfig();

    try {
      await SecureStorage.purgeAllKnownSecrets();
    } catch (e) {
      console.warn('[SqlClient] Error purging secure storage:', e);
    }
    try {
      await SecureStorage.removeItem(CONFIG_STORAGE_KEY);
      await SecureStorage.removeItem('@mumanager_session_token');
      await SecureStorage.removeItem('@mumanager_admin_key');
      await SecureStorage.removeItem('@mumanager_server_profiles');
    } catch (_) {}
  }

  static getConfig(): SqlServerConfig {
    return { ...this.config };
  }

  static getIsConnected(): boolean {
    return this.isConnected;
  }

  static setIsConnected(connected: boolean): void {
    this.isConnected = connected;
  }

  static getLogs(): SqlLogEntry[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
  }

  private static logQuery(query: string, durationMs: number, success: boolean, rowCount?: number, error?: string) {
    const entry: SqlLogEntry = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      query,
      durationMs,
      success,
      rowCount,
      error,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 50) {
      this.logs.pop();
    }
  }

  public static getBridgeUrl(): string {
    let url = (this.config.bridgeUrl || '').trim();
    if (!url || url.includes('127.0.0.1') || url.includes('localhost') || url.includes('onrender.com')) {
      url = this.DEFAULT_CLOUD_GATEWAY;
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    if (url.endsWith('/')) {
      url = url.slice(0, -1);
    }
    return url;
  }

  /**
   * Ejecuta peticiones cifradas y firmadas criptográficamente hacia el conector / Gateway
   */
    /**
   * Parsea de manera segura respuestas HTTP evitando "JSON Parse error: Unexpected character: <"
   * cuando el servidor o pasarela responde con HTML (404, 500, 502, página de Render en reposo, etc.)
   */
  private static async safeJson(response: any): Promise<any> {
    try {
      if (!response) return { success: false, error: 'Sin respuesta del servidor' };
      const text = typeof response.text === 'function' ? await response.text() : '';
      if (!text || text.trim().length === 0) {
        return { success: response.ok, error: response.ok ? undefined : `Respuesta vacía (HTTP ${response.status || 'desconocido'})` };
      }
      const trimmed = text.trim();
      if (trimmed.startsWith('<') || trimmed.startsWith('<!DOCTYPE') || trimmed.toLowerCase().startsWith('<html')) {
        const preMatch = trimmed.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
        const titleMatch = trimmed.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const errMsg = preMatch ? preMatch[1].trim() : (titleMatch ? titleMatch[1].trim() : `Error HTTP ${response.status || '500'}`);
        return {
          success: false,
          error: `Servidor: ${errMsg}`,
          htmlError: true,
          status: response.status,
        };
      }
      return JSON.parse(trimmed);
    } catch (e: any) {
      return {
        success: false,
        error: `Error de datos del servidor: ${e.message || 'Respuesta inválida'}`,
        status: response ? response.status : undefined,
      };
    }
  }

  private static async sendSecureRequest(
    endpoint: string,
    bodyPayload: any,
    timeoutMs: number = 10000
  ): Promise<Response> {
    const hwid = await SecurityService.getDeviceHwid();
    const effectiveAdminKey = await this.getStoredAdminKey();
    const sessionToken = await this.getSessionToken();
    const bodyStr = JSON.stringify(bodyPayload);
    const secHeaders = SecurityService.generateRequestHeaders(hwid, bodyStr);

    const bridgeUrl = this.getBridgeUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-App-Version': APP_VERSION,
        ...secHeaders,
        ...(effectiveAdminKey ? { 'X-Admin-Key': effectiveAdminKey } : {}),
        ...(sessionToken ? {
          'Authorization': `Bearer ${sessionToken}`,
          'X-Session-Token': sessionToken,
        } : {}),
      };

      const response = await fetch(`${bridgeUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Si el servidor responde 403 (Kill-Switch activado remotamente)
      if (response.status === 403) {
        try {
          const errData = await this.safeJson(response.clone());
          if (errData.blocked) {
            LicenseService.checkKillSwitch().catch(() => {});
          }
        } catch {}
      }

      return response;
    } catch (e) {
      clearTimeout(timeoutId);
      throw e;
    }
  }

  /**
   * 1. Test real de conexión contra SQL Server a través del Gateway o conector
   */
  static async testConnection(): Promise<{ success: boolean; message: string; latency: number }> {
    const startTime = Date.now();

    try {
      const response = await this.sendSecureRequest('/api/test-connection', { config: this.config }, 10000);
      const duration = Date.now() - startTime;
      const data = await this.safeJson(response);

      if (!response.ok || !data.success) {
        this.isConnected = false;
        const err = data.error || data.message || `Error HTTP ${response.status}`;
        this.logQuery('TEST_CONNECTION', duration, false, 0, err);
        return {
          success: false,
          message: `Fallo de conexión: ${err}`,
          latency: duration,
        };
      }

      this.isConnected = true;
      this.logQuery('TEST_CONNECTION', duration, true, 1);
      return {
        success: true,
        message: data.message || `Conectado a ${this.config.host}:${this.config.port} (${duration}ms)`,
        latency: duration,
      };
    } catch (err: any) {
      const duration = Date.now() - startTime;
      this.isConnected = false;
      const errorMsg = err.name === 'AbortError'
        ? 'Tiempo de espera agotado (Timeout 10s). Verifique IP y puerto del servidor.'
        : `No se pudo contactar el servidor: ${err.message}`;
      this.logQuery('TEST_CONNECTION', duration, false, 0, errorMsg);
      return {
        success: false,
        message: errorMsg,
        latency: duration,
      };
    }
  }

  /**
   * 2. Métricas Reales del Dashboard (Cuentas, Personajes, Conectados, VIPs)
   */
  static async getDashboardMetrics(): Promise<DashboardMetrics> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest('/api/dashboard', { config: this.config });

      if (!res.ok) {
        const errorJson = await this.safeJson(res);
        throw new Error(errorJson.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.isConnected = true;
      this.logQuery(SQL_QUERIES.DASHBOARD_SUMMARY, duration, true, 1);

      return {
        Cuentas: Number(json.Cuentas || 0),
        Personajes: Number(json.Personajes || 0),
        Online: Number(json.Online || 0),
        VIP: Number(json.VIP || 0),
        Guilds: Number(json.Guilds || 0),
        hostIp: this.config.host,
        connected: true,
        accountType: 'Premium',
      };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.isConnected = false;
      this.logQuery(SQL_QUERIES.DASHBOARD_SUMMARY, duration, false, 0, e.message);
      throw new Error(`Error al leer métricas del servidor SQL: ${e.message}`);
    }
  }

  /**
   * 3. Lista Real de Personajes
   */
  static async getCharacterList(): Promise<CharacterSummary[]> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest('/api/characters', { config: this.config });

      if (!res.ok) {
        const errorJson = await this.safeJson(res);
        throw new Error(errorJson.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const list = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.isConnected = true;
      this.logQuery(SQL_QUERIES.CHARACTER_LIST, duration, true, list.length);
      return list;
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(SQL_QUERIES.CHARACTER_LIST, duration, false, 0, e.message);
      throw new Error(`Error al cargar personajes: ${e.message}`);
    }
  }

  /**
   * 4. Cargar Datos Completos de un Personaje Real
   */
  static async getCharacterDetail(charName: string): Promise<CharacterDetail | null> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest(`/api/character/${encodeURIComponent(charName)}`, { config: this.config });

      if (!res.ok) {
        if (res.status === 404) return null;
        const errorJson = await this.safeJson(res);
        throw new Error(errorJson.error || `HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.logQuery(`SELECT_CHARACTER_${charName}`, duration, true, 1);

      return {
        Name: data.Name,
        AccountID: data.AccountID,
        Class: Number(data.Class),
        cLevel: Number(data.cLevel),
        LevelUpPoint: Number(data.LevelUpPoint),
        MasterLevel: Number(data.MasterLevel || 0),
        MasterPoint: Number(data.MasterPoint || 0),
        Strength: Number(data.Strength),
        Dexterity: Number(data.Dexterity),
        Vitality: Number(data.Vitality),
        Energy: Number(data.Energy),
        Leadership: Number(data.Leadership || 0),
        Money: Number(data.Money),
        FruitPoint: Number(data.FruitPoint || 0),
        Inventory: data.InventoryHex || '',
        MagicList: data.MagicListHex || '',
        ResetCount: Number(data.ResetCount || 0),
        MasterResetCount: Number(data.MasterResetCount || 0),
        MapNumber: Number(data.MapNumber || 0),
        MapPosX: Number(data.MapPosX || 125),
        MapPosY: Number(data.MapPosY || 125),
        PkCount: Number(data.PkCount || 0),
        PkLevel: Number(data.PkLevel || 3),
        PkTime: Number(data.PkTime || 0),
        QuestHex: data.QuestHex || '',
        CtlCode: Number(data.CtlCode || 0),
        ConnectStat: data.ConnectStat !== undefined ? Number(data.ConnectStat) : undefined,
      };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`SELECT_CHARACTER_${charName}`, duration, false, 0, e.message);
      throw new Error(`Error al cargar datos de ${charName}: ${e.message}`);
    }
  }

  /**
   * 5. Actualizar Estadísticas del Personaje en Base de Datos Real
   */
  static async updateCharacterStats(
    charName: string,
    params: {
      STR: number;
      AGI: number;
      VIT: number;
      ENE: number;
      CMD: number;
      Zen: number;
      Points: number;
      Level?: number;
      MasterLevel?: number;
      MasterPoint?: number;
      FruitPoint?: number;
      CtlCode?: number;
      Ruud?: number;
    }
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest(
        '/api/character/update-stats',
        { charName, params, config: this.config },
        10000
      );
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar stats');
      }

      this.logQuery(`UPDATE_STATS_${charName}`, duration, true, 1);
      return { success: true, message: 'Estadísticas guardadas con éxito en SQL Server.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_STATS_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 6. Actualizar Inventario Hexadecimal Real en SQL Server
   */
  static async updateCharacterInventory(
    charName: string,
    inventoryHex: string,
    forceOnline: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest(
        '/api/character/update-inventory',
        { charName, inventoryHex, forceOnline, config: this.config },
        10000
      );
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar inventario');
      }

      this.logQuery(`UPDATE_INVENTORY_${charName}`, duration, true, 1);
      return { success: true, message: 'Inventario guardado en SQL Server.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_INVENTORY_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 6.1. Actualizar Habilidades (MagicList) del Personaje en SQL Server
   */
  static async updateCharacterSkills(
    charName: string,
    magicListHex: string
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest(
        '/api/character/update-skills',
        { charName: charName.trim(), magicListHex, config: this.config },
        10000
      );
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar habilidades');
      }

      this.logQuery(`UPDATE_SKILLS_${charName}`, duration, true, 1);
      return { success: true, message: data.message || 'Habilidades guardadas exitosamente en SQL Server.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_SKILLS_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 6.5. Actualizar Ubicación y Mapa del Personaje
   */
  static async updateCharacterLocation(
    charName: string,
    map: number,
    x: number,
    y: number
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest(
        '/api/character/update-location',
        { charName, map, x, y, config: this.config },
        10000
      );
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar ubicación');
      }

      this.logQuery(`UPDATE_LOCATION_${charName}`, duration, true, 1);
      return { success: true, message: data.message || 'Ubicación actualizada con éxito en SQL Server.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_LOCATION_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 6.6. Desbloquear Mochilas Extendidas y Tienda Personal (Louis S6)
   */
  static async unlockCharacterExtensions(charName: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest(
        '/api/character/unlock-extensions',
        { charName: charName.trim(), config: this.config },
        10000
      );
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al desbloquear mochilas');
      }

      this.logQuery(`UNLOCK_EXT_${charName}`, duration, true, 1);
      return { success: true, message: data.message || 'Mochilas extendidas y Tienda Personal desbloqueadas correctamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UNLOCK_EXT_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 6.7. Actualizar Progreso del Personaje (Resets, M.Resets, MasterLevel, PK)
   */
  static async updateCharacterProgress(
    charName: string,
    progressData: {
      resets?: number;
      masterResets?: number;
      masterLevel?: number;
      masterPoints?: number;
      pkLevel?: number;
      pkCount?: number;
      pkTime?: number;
    }
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest(
        '/api/character/update-progress',
        { charName: charName.trim(), ...progressData, config: this.config },
        10000
      );
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar progreso del personaje');
      }

      this.logQuery(`UPDATE_PROGRESS_${charName}`, duration, true, 1);
      return { success: true, message: data.message || 'Progreso del personaje guardado exitosamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_PROGRESS_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 6.8. Actualizar Misiones, Quests y Evolución de Clase
   */
  static async updateCharacterQuest(
    charName: string,
    questData: {
      classId?: number;
      marlonCombo?: boolean;
      marlonPoints?: boolean;
      thirdClassComplete?: boolean;
      questHex?: string;
    }
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest(
        '/api/character/update-quest',
        { charName: charName.trim(), ...questData, config: this.config },
        10000
      );
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al actualizar misiones del personaje');
      }

      this.logQuery(`UPDATE_QUEST_${charName}`, duration, true, 1);
      return { success: true, message: data.message || 'Misiones y clase actualizadas exitosamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_QUEST_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 7. Cuentas Reales de la tabla MEMB_INFO
   */
  static async getRecentAccounts(): Promise<AccountSummary[]> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest('/api/accounts', { config: this.config });

      if (!res.ok) {
        const errorJson = await this.safeJson(res);
        throw new Error(errorJson.error || `HTTP ${res.status}`);
      }

      const list = await this.safeJson(res);
      const mapped = (Array.isArray(list) ? list : []).map((acc: any) => ({
        ...acc,
        online: !!(acc.online || acc.ConnectStat === 1 || acc.ConnectStat === '1'),
      }));
      const duration = Date.now() - startTime;
      this.logQuery(SQL_QUERIES.RECENT_ACCOUNTS, duration, true, mapped.length);
      return mapped;
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(SQL_QUERIES.RECENT_ACCOUNTS, duration, false, 0, e.message);
      throw new Error(`Error al leer cuentas de MEMB_INFO: ${e.message}`);
    }
  }

  /**
   * 8. Registrar Nueva Cuenta en MEMB_INFO
   */
  static async createAccount(
    username: string,
    password: string,
    email?: string,
    accountLevel: number = 0
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest('/api/account/create', { username, password, email, accountLevel, config: this.config });
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear cuenta');
      }

      this.logQuery(`CREATE_ACCOUNT_${username}`, duration, true, 1);
      return { success: true, message: data.message };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`CREATE_ACCOUNT_${username}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 8b. Registrar Nuevo Personaje en una Cuenta (Season 6)
   */
  static async createCharacter(
    accountId: string,
    name: string,
    classId: number,
    level: number = 1,
    resets: number = 0,
    points: number = 0,
    zen: number = 0
  ): Promise<{ success: boolean; message: string; character?: CharacterSummary }> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest('/api/character/create', {
        accountId,
        name,
        classId,
        level,
        resets,
        points,
        zen,
        config: this.config,
      });
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al crear el personaje');
      }

      this.logQuery(`CREATE_CHARACTER_${name}`, duration, true, 1);
      return { success: true, message: data.message, character: data.character };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`CREATE_CHARACTER_${name}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 8b. Eliminar Personaje Canónicamente (Louis & MSPro)
   */
  static async deleteCharacter(
    charName: string,
    accountId?: string,
    forceOnline: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/character/delete', {
        charName: charName.trim(),
        accountId: accountId ? accountId.trim() : undefined,
        forceOnline,
        config: this.config,
      }, 15000);

      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar el personaje');
      }

      this.logQuery(`DELETE_CHARACTER_${charName}`, duration, true, 1);
      return { success: true, message: data.message || 'Personaje eliminado exitosamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`DELETE_CHARACTER_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 9. Bloquear / Desbloquear Cuenta de Jugador (Ban / Unban)
   */
  static async toggleBlockAccount(
    username: string,
    block: boolean
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();

    try {
      const res = await this.sendSecureRequest('/api/account/toggle-block', { username, block, config: this.config });
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al modificar estado de cuenta');
      }

      this.logQuery(`TOGGLE_BLOCK_${username}`, duration, true, 1);
      return { success: true, message: data.message };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`TOGGLE_BLOCK_${username}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 9a. Eliminar Cuenta Completa y sus Datos (Louis & MSPro)
   */
  static async deleteAccount(
    username: string,
    forceOnline: boolean = false
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/account/delete', {
        username: username.trim(),
        forceOnline,
        config: this.config,
      }, 20000);

      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al eliminar la cuenta');
      }

      this.logQuery(`DELETE_ACCOUNT_${username}`, duration, true, 1);
      return { success: true, message: data.message || 'Cuenta eliminada exitosamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`DELETE_ACCOUNT_${username}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 9b. Actualizar Información Completa de Cuenta (Password, VIP, Monedas, etc.)
   */
  static async updateAccount(data: AccountUpdateData): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/account/update', {
        ...data,
        config: this.config,
      });
      const result = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al actualizar cuenta');
      }

      this.logQuery(`UPDATE_ACCOUNT_${data.username}`, duration, true, 1);
      return { success: true, message: result.message || 'Cuenta actualizada exitosamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_ACCOUNT_${data.username}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 9c. Desconectar Cuenta Trabada (ConnectStat = 0 en MEMB_STAT)
   */
  static async disconnectAccount(username?: string, charName?: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/account/disconnect', {
        username: (username || '').trim(),
        charName: (charName || '').trim(),
        config: this.config,
      });
      const result = await this.safeJson(res);
      const duration = Date.now() - startTime;

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Error al desconectar cuenta');
      }

      this.logQuery(`DISCONNECT_ACCOUNT_${username || charName}`, duration, true, 1);
      return { success: true, message: result.message || 'Cuenta desconectada exitosamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`DISCONNECT_ACCOUNT_${username || charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 9d. Verificar en tiempo real si una cuenta está conectada en el juego (ConnectStat = 1 en MEMB_STAT)
   */
  static async isAccountConnected(username: string, charName?: string): Promise<boolean> {
    try {
      const res = await this.sendSecureRequest('/api/account/status', {
        username: (username || '').trim(),
        charName: (charName || '').trim(),
        config: this.config,
      }, 5000);
      if (!res.ok) return false;
      const data = await this.safeJson(res);
      return !!data.connected;
    } catch {
      return false;
    }
  }

  /**
   * 9e. Adquirir o renovar candado suave en memoria para evitar colisiones multi-admin
   */
  static async acquireEditorLock(target: string, adminName?: string): Promise<{
    success: boolean;
    locked: boolean;
    holder?: string;
    elapsedSec?: number;
    remainingSec?: number;
    message?: string;
  }> {
    try {
      const hwid = await SecurityService.getDeviceHwid();
      const user = adminName || this.getActiveUser() || 'Admin';
      const res = await this.sendSecureRequest('/api/editor/lock', {
        target: target.trim(),
        adminName: user,
        deviceHwid: hwid,
      }, 4000);
      if (!res.ok) return { success: false, locked: false };
      return await this.safeJson(res);
    } catch {
      return { success: false, locked: false };
    }
  }

  /**
   * 9f. Liberar candado suave en memoria al cerrar la pantalla
   */
  static async releaseEditorLock(target: string): Promise<boolean> {
    try {
      const hwid = await SecurityService.getDeviceHwid();
      const res = await this.sendSecureRequest('/api/editor/unlock', {
        target: target.trim(),
        deviceHwid: hwid,
      }, 4000);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * 9g. Consultar estado del candado suave
   */
  static async getEditorLockStatus(target: string): Promise<{
    locked: boolean;
    holder?: string;
    elapsedSec?: number;
    remainingSec?: number;
  }> {
    try {
      const bridgeUrl = this.getBridgeUrl();
      const res = await fetch(`${bridgeUrl}/api/editor/status?target=${encodeURIComponent(target.trim())}`);
      if (!res.ok) return { locked: false };
      const data = await this.safeJson(res);
      return {
        locked: !!data.locked,
        holder: data.holder,
        elapsedSec: data.elapsedSec,
        remainingSec: data.remainingSec,
      };
    } catch {
      return { locked: false };
    }
  }

  /**
   * 7b. Obtener Personajes de una Cuenta específica (MEMB_INFO -> Character)
   */
  static async getCharactersByAccount(accountId: string): Promise<CharacterSummary[]> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/characters', {
        accountId: accountId.trim(),
        config: this.config,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.logQuery(`CHARACTERS_BY_ACCOUNT_${accountId}`, duration, true, list.length);
      return list;
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`CHARACTERS_BY_ACCOUNT_${accountId}`, duration, false, 0, e.message);
      return [];
    }
  }

  /**
   * 7c. Obtener Baúl de una Cuenta (Warehouse Louis S6 Up40)
   * warehouseIndex: 0 = Principal (warehouse), >0 = Extendido (ExtWarehouse)
   */
  static async getAccountWarehouse(accountId: string, warehouseIndex: number = 0): Promise<any> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/warehouse', {
        accountId: accountId.trim(),
        warehouseIndex,
        config: this.config,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.logQuery(`WAREHOUSE_${accountId}_IDX${warehouseIndex}`, duration, true, 1);
      return data.warehouse || null;
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`WAREHOUSE_${accountId}_IDX${warehouseIndex}`, duration, false, 0, e.message);
      return null;
    }
  }

  /**
   * 7d. Guardar Ítems y Zen en Baúl (warehouse / ExtWarehouse)
   */
  static async saveAccountWarehouse(
    accountId: string,
    warehouseIndex: number = 0,
    itemsHex: string,
    money: number = 0
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/warehouse/save', {
        accountId: accountId.trim(),
        warehouseIndex,
        itemsHex,
        money,
        config: this.config,
      });

      if (!res.ok) {
        const errJson = await this.safeJson(res);
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.logQuery(`SAVE_WAREHOUSE_${accountId}_IDX${warehouseIndex}`, duration, true, 1);
      return { success: true, message: data.message || 'Baúl guardado exitosamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`SAVE_WAREHOUSE_${accountId}_IDX${warehouseIndex}`, duration, false, 0, e.message);
      return { success: false, message: e.message || 'Error al guardar baúl' };
    }
  }

  /**
   * 7e. Desbloquear / Actualizar número de Baúles Adicionales (MEMB_INFO.WarehouseCount)
   */
  static async updateWarehouseCount(
    accountId: string,
    count: number
  ): Promise<{ success: boolean; warehouseCount: number; message?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/warehouse/update-count', {
        accountId: accountId.trim(),
        count,
        config: this.config,
      });

      if (!res.ok) {
        const errJson = await this.safeJson(res);
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_WAREHOUSE_COUNT_${accountId}`, duration, true, 1);
      return { success: true, warehouseCount: data.warehouseCount || count };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`UPDATE_WAREHOUSE_COUNT_${accountId}`, duration, false, 0, e.message);
      return { success: false, warehouseCount: 1, message: e.message };
    }
  }

  /**
   * 7f. Activar / Configurar Expansión de Baúl Season 6 (AccountCharacter.ExtWarehouse = 0 o 1)
   */
  static async setVaultExpansion(
    accountId: string,
    level: number = 1
  ): Promise<{ success: boolean; extWarehouseLevel: number; message?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/warehouse/set-expansion', {
        accountId: accountId.trim(),
        level,
        config: this.config,
      });

      if (!res.ok) {
        const errJson = await this.safeJson(res);
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      this.logQuery(`SET_VAULT_EXPANSION_${accountId}`, duration, true, 1);
      return { success: true, extWarehouseLevel: data.extWarehouseLevel ?? level, message: data.message };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`SET_VAULT_EXPANSION_${accountId}`, duration, false, 0, e.message);
      return { success: false, extWarehouseLevel: 0, message: e.message };
    }
  }

  /**
   * 10. Telemetría y Kill-Switch en Vivo: Reportar y verificar celular, emulador y usuario
   */
  static async sendTelemetryPing(
    hwid: string,
    mode: 'DEMO' | 'PRO',
    licenseKey?: string,
    userEmail?: string,
    username?: string,
    isExplicitActivation?: boolean
  ): Promise<TelemetryPingResult> {
    try {
      const emailToSend = (userEmail || this.activeUserEmail || '').trim();
      const meta = SecurityService.getDeviceMetadata();
      const res = await this.sendSecureRequest('/api/telemetry/ping', {
        hwid,
        mode,
        licenseKey: licenseKey || '',
        appVersion: APP_VERSION,
        platform: 'Android',
        userEmail: emailToSend,
        username: username || '',
        isEmulator: meta.isEmulator,
        deviceModel: meta.model,
        deviceBrand: meta.brand,
        isExplicitActivation: !!isExplicitActivation,
      }, 7000);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await this.safeJson(res);

      let effectiveUpdateInfo = data.updateInfo;
      // DUAL VERIFICATION RESILIENTE:
      // Si el servidor de pasarela (Vercel) responde pero no reporta actualización (por caché o desfase),
      // verificar SIEMPRE de forma cruzada contra el CDN de GitHub (version.json oficial)
      if (!effectiveUpdateInfo || !effectiveUpdateInfo.hasUpdate) {
        try {
          const githubUpdate = await SqlClient.fetchGitHubUpdateFallback();
          if (githubUpdate && githubUpdate.hasUpdate) {
            effectiveUpdateInfo = githubUpdate;
          }
        } catch {}
      }

      return {
        success: true,
        blocked: !!data.blocked,
        mode: data.mode || mode,
        authoritativeMode: data.authoritativeMode || data.mode,
        forceWipeKey: !!data.forceWipeKey,
        forceDemo: !!data.forceDemo,
        releaseChannel: data.releaseChannel || 'STABLE',
        betaStatus: data.betaStatus || 'NONE',
        licenseKey: data.licenseKey || '',
        reason: data.reason,
        expiresAt: data.expiresAt,
        updateInfo: effectiveUpdateInfo,
        broadcast: data.broadcast,
        sessionInvalidated: !!data.sessionInvalidated,
        forceLogout: !!data.forceLogout,
        forceWipe: !!data.forceWipe || !!data.forceWipeKey,
        isEmulator: data.isEmulator !== undefined ? !!data.isEmulator : meta.isEmulator,
        demoRemainingHours: data.demoRemainingHours,
      };
    } catch (e) {
      // Fallback resiliente a GitHub CDN: Si Render o la pasarela están caídos/suspendidos,
      // verificar inmediatamente si existe una versión más reciente publicada en GitHub
      const fallbackUpdate = await SqlClient.fetchGitHubUpdateFallback();
      return {
        success: false,
        blocked: false,
        mode,
        updateInfo: fallbackUpdate,
        connectionError: true,
      };
    }
  }

  /**
   * Reporta eventos de alteración, inyección de Frida o manipulación de seguridad al Gateway
   */
  static async reportTamper(hwid: string, reason: string, details?: any): Promise<boolean> {
    try {
      const res = await this.sendSecureRequest('/api/telemetry/report-tamper', {
        hwid,
        reason,
        details: details || {},
      }, 5000);
      return res.ok;
    } catch {
      return false;
    }
  }

  /**
   * Fallback directo a GitHub CDN para comprobación de versiones
   * Permite que el APK reciba actualizaciones sin depender del estado o ancho de banda de Render
   */
  static async fetchGitHubUpdateFallback(): Promise<AppUpdateInfo | null> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6000);

      // 1. Intentar primero con la API REST de GitHub (Accept: application/vnd.github.raw)
      // Esta llamada obtiene el blob directo del commit actual SIN retraso por caché Fastly CDN (0 segundos de espera)
      let res = await fetch('https://api.github.com/repos/ToolForg3/MuManagerPro-App/contents/version.json', {
        headers: {
          'User-Agent': 'MuManagerPro-App',
          'Accept': 'application/vnd.github.raw',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      }).catch(() => null as any);

      // 2. Si la API de GitHub está rate-limited o inaccesible, recurrir a raw.githubusercontent.com
      if (!res || !res.ok) {
        res = await fetch(`https://raw.githubusercontent.com/ToolForg3/MuManagerPro-App/main/version.json?_t=${Date.now()}`, {
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        }).catch(() => null as any);
      }

      clearTimeout(timer);
      if (!res || !res.ok) return null;
      const data = await res.json();
      if (!data || !data.version) return null;

      const remoteVer = String(data.version).replace(/^v/i, '').trim();
      const localVer = APP_VERSION.replace(/^v/i, '').trim();
      const remoteBuild = parseInt(String(data.build || 0), 10);
      const localBuild = parseInt(String(APP_BUILD || 0), 10);

      const parseVer = (v: string): number[] => {
        const parts = v.split('.').map(n => parseInt(n, 10) || 0);
        while (parts.length < 3) parts.push(0);
        return parts;
      };

      const [r1, r2, r3] = parseVer(remoteVer);
      const [l1, l2, l3] = parseVer(localVer);
      const isNewer =
        r1 > l1 ||
        (r1 === l1 && r2 > l2) ||
        (r1 === l1 && r2 === l2 && r3 > l3) ||
        (r1 === l1 && r2 === l2 && r3 === l3 && remoteBuild > localBuild);

      return {
        hasUpdate: isNewer,
        currentVersion: APP_VERSION,
        latestVersion: remoteVer,
        minRequiredVersion: data.minRequiredVersion || '1.0.0',
        apkUrl: data.downloadUrl || 'https://github.com/ToolForg3/MuManagerPro-App/releases/download/latest/MuManagerPro.apk',
        changelog: data.changelog || '• Nueva versión disponible en el canal oficial.',
        forceUpdate: !!data.forceUpdate,
      };
    } catch {
      return null;
    }
  }

  /**
   * Enviar Solicitud de Licencia PRO desde el APK con datos de contacto
   */
  static async sendProRequest(data: {
    name: string;
    phone: string;
    email?: string;
    serverName?: string;
    notes?: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const hwid = await SecurityService.getDeviceHwid();
      const meta = SecurityService.getDeviceMetadata();
      const res = await this.sendSecureRequest('/api/license/request-pro', {
        hwid,
        name: data.name.trim(),
        phone: data.phone.trim(),
        email: (data.email || this.activeUserEmail || '').trim(),
        serverName: (data.serverName || '').trim(),
        notes: (data.notes || '').trim(),
        isEmulator: meta.isEmulator,
        deviceModel: meta.model,
        deviceBrand: meta.brand,
        appVersion: APP_VERSION,
      }, 10000);

      const json = await this.safeJson(res);
      return {
        success: !!json.success,
        message: json.message || (json.success ? 'Solicitud enviada exitosamente.' : 'Error al enviar solicitud.'),
      };
    } catch (e: any) {
      return {
        success: false,
        message: e.message || 'Error de conexión al enviar la solicitud.',
      };
    }
  }

  /**
   * Monitoreo de Bugs y Crashes no controlados
   */
  static async reportCrash(errorInfo: {
    message: string;
    stack?: string;
    context?: string;
  }): Promise<void> {
    try {
      const hwid = await SecurityService.getDeviceHwid();
      const meta = SecurityService.getDeviceMetadata();
      await this.sendSecureRequest('/api/telemetry/crash', {
        hwid,
        error: errorInfo.message,
        stack: errorInfo.stack || 'No stack',
        context: errorInfo.context || 'General',
        isEmulator: meta.isEmulator,
        deviceModel: meta.model,
        appVersion: APP_VERSION,
        userEmail: this.activeUserEmail || '',
        timestamp: new Date().toISOString(),
      }, 5000).catch(() => {});
    } catch (_) {}
  }

  /**
   * 11. Solicitar acceso al Canal Beta de pruebas
   */
  static async requestBetaAccess(
    email?: string,
    reason?: string
  ): Promise<{ success: boolean; betaStatus: string; message: string }> {
    try {
      const hwid = await SecurityService.getDeviceHwid();
      const res = await this.sendSecureRequest('/api/beta/request', {
        hwid,
        email: (email || this.activeUserEmail || '').trim(),
        reason: reason || 'Solicitud desde pantalla de Configuración del APK',
      }, 10000);

      const data = await this.safeJson(res);
      return {
        success: !!data.success,
        betaStatus: data.betaStatus || 'PENDING',
        message: data.message || 'Solicitud enviada al administrador.',
      };
    } catch (e: any) {
      return {
        success: false,
        betaStatus: 'NONE',
        message: e.message || 'Error al enviar solicitud al Canal Beta.',
      };
    }
  }

  /**
   * 12. Verificar estado de bloqueo remoto de este dispositivo
   */
  static async checkDeviceStatus(hwid: string): Promise<{ blocked: boolean; reason?: string; expiresAt?: string }> {
    try {
      const res = await this.sendTelemetryPing(hwid, 'DEMO');
      return {
        blocked: res.blocked,
        reason: res.reason,
        expiresAt: res.expiresAt,
      };
    } catch {
      return { blocked: false };
    }
  }

  // ==========================================
  // SUPER-HERRAMIENTAS (LOUIS S6)
  // ==========================================

  /**
   * 12. Inyectar Ítem en Baúl (Item Maker)
   */
  static async injectWarehouseItem(
    accountId: string,
    itemHex: string,
    slot?: number,
    warehouseIndex: number = 0
  ): Promise<{ success: boolean; slot?: number; message?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/inject-item', {
        accountId,
        itemHex,
        slot,
        warehouseIndex,
        config: this.config,
      }, 12000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery(`INJECT_ITEM_${accountId}`, duration, true, 1);
      return { success: true, slot: data.slot, message: data.message };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`INJECT_ITEM_${accountId}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 13. Buscador Global de Ítems
   */
  static async searchItems(
    query: string,
    searchType: 'all' | 'warehouse' | 'inventory' = 'all'
  ): Promise<{ success: boolean; count: number; items: any[]; message?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/search-items', {
        query,
        searchType,
        config: this.config,
      }, 15000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery(`SEARCH_ITEMS_${query}`, duration, true, data.count || 0);
      return { success: true, count: data.count || 0, items: data.items || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`SEARCH_ITEMS_${query}`, duration, false, 0, e.message);
      return { success: false, count: 0, items: [], message: e.message };
    }
  }

  /**
   * 14. Escáner de Dupeos (Anti-Dupe Tracker)
   */
  static async scanDupes(forceFresh: boolean = false): Promise<{
    success: boolean;
    count: number;
    dupes: any[];
    fromCache?: boolean;
    cachedSecondsAgo?: number;
    busy?: boolean;
    message?: string;
  }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/scan-dupes', {
        forceFresh,
        config: this.config,
      }, 20000);

      const data = await this.safeJson(res);
      if (res.status === 429 || data.busy) {
        return { success: false, busy: true, count: 0, dupes: [], message: data.message || 'Escaneo en curso por otro administrador.' };
      }
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery('SCAN_DUPES', duration, true, data.count || 0);
      return {
        success: true,
        count: data.count || 0,
        dupes: data.dupes || [],
        fromCache: !!data.fromCache,
        cachedSecondsAgo: data.cachedSecondsAgo,
        message: data.message,
      };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('SCAN_DUPES', duration, false, 0, e.message);
      return { success: false, count: 0, dupes: [], message: e.message };
    }
  }

  /**
   * 14.1 Auditoría de Joyas e Ítems del Servidor
   */
  static async auditJewels(params: JewelAuditParams): Promise<JewelAuditResult> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/audit-jewels', {
        ...params,
        config: this.config,
      }, 25000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery('AUDIT_JEWELS', duration, true, data.totalSlots || 0);
      return {
        success: true,
        totalSlots: data.totalSlots || 0,
        totalUnits: data.totalUnits || 0,
        summaryByType: data.summaryByType || [],
        owners: data.owners || [],
        onlineAccountsSkipped: data.onlineAccountsSkipped || 0,
        message: data.message,
      };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('AUDIT_JEWELS', duration, false, 0, e.message);
      return {
        success: false,
        totalSlots: 0,
        totalUnits: 0,
        summaryByType: [],
        owners: [],
        message: e.message,
      };
    }
  }

  /**
   * 14.2 Depuración y Capping de Joyas e Ítems del Servidor
   */
  static async purgeJewels(params: JewelPurgeParams): Promise<JewelPurgeResult> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/purge-jewels', {
        ...params,
        config: this.config,
      }, 35000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery('PURGE_JEWELS', duration, true, data.slotsDeleted || 0);
      return {
        success: true,
        dryRun: !!data.dryRun,
        totalFoundSlots: data.totalFoundSlots || 0,
        totalFoundUnits: data.totalFoundUnits || 0,
        slotsDeleted: data.slotsDeleted || 0,
        unitsDeleted: data.unitsDeleted || 0,
        slotsKept: data.slotsKept || 0,
        unitsKept: data.unitsKept || 0,
        affectedAccounts: data.affectedAccounts || 0,
        affectedCharacters: data.affectedCharacters || 0,
        affectedWarehouses: data.affectedWarehouses || 0,
        skippedOnlineCount: data.skippedOnlineCount || 0,
        skippedOnlineList: data.skippedOnlineList || [],
        message: data.message || 'Operación completada con éxito.',
      };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('PURGE_JEWELS', duration, false, 0, e.message);
      return {
        success: false,
        dryRun: !!params.dryRun,
        totalFoundSlots: 0,
        totalFoundUnits: 0,
        slotsDeleted: 0,
        unitsDeleted: 0,
        slotsKept: 0,
        unitsKept: 0,
        affectedAccounts: 0,
        affectedCharacters: 0,
        affectedWarehouses: 0,
        skippedOnlineCount: 0,
        message: e.message,
      };
    }
  }

  /**
   * 15. Rankings en Vivo
   */
  static async getRankings(
    type: 'resets' | 'mresets' | 'pk' | 'guilds' = 'resets'
  ): Promise<{ success: boolean; rankings: any[]; message?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/rankings', {
        type,
        config: this.config,
      }, 12000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery(`RANKINGS_${type}`, duration, true, (data.rankings || []).length);
      return { success: true, rankings: data.rankings || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`RANKINGS_${type}`, duration, false, 0, e.message);
      return { success: false, rankings: [], message: e.message };
    }
  }

  /**
   * 16. Limpieza PK (1-Clic)
   */
  static async clearPk(charName?: string, all?: boolean): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/pk/clear', {
        charName,
        all: all || !charName,
        config: this.config,
      }, 10000);

      const data = await this.safeJson(res);
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al limpiar PK');

      const duration = Date.now() - startTime;
      this.logQuery(charName ? `PK_CLEAR_${charName}` : 'PK_CLEAR_ALL', duration, true, 1);
      return { success: true, message: data.message || 'Estado PK restablecido exitosamente' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(charName ? `PK_CLEAR_${charName}` : 'PK_CLEAR_ALL', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 17. Rescate a Lorencia (1-Clic)
   */
  static async rescueCharacter(charName: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/rescue-char', {
        charName,
        config: this.config,
      }, 10000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery(`RESCUE_CHAR_${charName}`, duration, true, 1);
      return { success: true, message: data.message };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`RESCUE_CHAR_${charName}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 18. Limpiar Hex Corrupto (1-Clic)
   */
  static async cleanCorruptHex(
    targetType: 'warehouse' | 'inventory',
    targetId: string
  ): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/clean-hex', {
        targetType,
        targetId,
        config: this.config,
      }, 12000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery(`CLEAN_HEX_${targetType}_${targetId}`, duration, true, 1);
      return { success: true, message: data.message };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery(`CLEAN_HEX_${targetType}_${targetId}`, duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 19. Backup de Emergencia SQL Server
   */
  static async backupDatabase(dbName?: string): Promise<{ success: boolean; backupPath?: string; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/db-backup', {
        dbName,
        config: this.config,
      }, 30000);

      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);

      const duration = Date.now() - startTime;
      this.logQuery('DB_BACKUP', duration, true, 1);
      return { success: true, backupPath: data.backupPath, message: data.message };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('DB_BACKUP', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 20. Reparar Registros Huérfanos (sp_MuManager_FixOrphans)
   */
  static async fixOrphans(): Promise<{ success: boolean; data?: any; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/fix-orphans', { config: this.config }, 15000);
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const duration = Date.now() - startTime;
      this.logQuery('FIX_ORPHANS', duration, true, 1);
      return { success: true, data: data.result, message: data.message || 'Huérfanos reparados correctamente.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('FIX_ORPHANS', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 21. Rescatar Coordenadas Inválidas / Fuera de Rango (sp_MuManager_RescueInvalidCoords)
   */
  static async rescueInvalidCoords(): Promise<{ success: boolean; data?: any; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/rescue-coords', { config: this.config }, 15000);
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const duration = Date.now() - startTime;
      this.logQuery('RESCUE_COORDS', duration, true, 1);
      return { success: true, data: data.result, message: data.message || 'Coordenadas normalizadas a Lorencia.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('RESCUE_COORDS', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 22. Corregir Desbordamientos de Zen y Puntos (sp_MuManager_FixIntegerOverflows)
   */
  static async fixIntegerOverflows(): Promise<{ success: boolean; data?: any; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/fix-overflows', { config: this.config }, 15000);
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const duration = Date.now() - startTime;
      this.logQuery('FIX_OVERFLOWS', duration, true, 1);
      return { success: true, data: data.result, message: data.message || 'Desbordamientos de Zen y puntos corregidos.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('FIX_OVERFLOWS', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 23. Limpiar Conexiones Fantasma / Zombis (sp_MuManager_CleanGhostConnections)
   */
  static async cleanGhostConnections(): Promise<{ success: boolean; data?: any; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/clean-ghosts', { config: this.config }, 15000);
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const duration = Date.now() - startTime;
      this.logQuery('CLEAN_GHOSTS', duration, true, 1);
      return { success: true, data: data.result, message: data.message || 'Conexiones zombi limpiadas.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('CLEAN_GHOSTS', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 24. Escanear Nombres con Caracteres Ilegales (sp_MuManager_ScanIllegalNames)
   */
  static async scanIllegalNames(): Promise<{ success: boolean; characters: any[]; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/scan-illegal-names', { config: this.config }, 15000);
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const duration = Date.now() - startTime;
      this.logQuery('SCAN_ILLEGAL_NAMES', duration, true, (data.characters || []).length);
      return { success: true, characters: data.characters || [], message: data.message || 'Escaneo completado.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('SCAN_ILLEGAL_NAMES', duration, false, 0, e.message);
      return { success: false, characters: [], message: e.message };
    }
  }

  /**
   * 25. Normalizar Estados PK Inválidos (sp_MuManager_FixPkStatus)
   */
  static async fixPkStatus(): Promise<{ success: boolean; data?: any; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/fix-pk-status', { config: this.config }, 15000);
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const duration = Date.now() - startTime;
      this.logQuery('FIX_PK_STATUS', duration, true, 1);
      return { success: true, data: data.result, message: data.message || 'Estados PK normalizados.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('FIX_PK_STATUS', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  /**
   * 26. Instalar o Actualizar Procedimientos y Triggers en SQL Server
   */
  static async installStoredProcedures(): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/tools/install-procedures', { config: this.config }, 30000);
      const data = await this.safeJson(res);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      const duration = Date.now() - startTime;
      this.logQuery('INSTALL_PROCEDURES', duration, true, 1);
      return { success: true, message: data.message || 'Procedimientos y triggers instalados exitosamente en SQL Server.' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('INSTALL_PROCEDURES', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  // =========================================================================
  // MÓDULOS DE ADMINISTRACIÓN AVANZADA (PASO 3)
  // =========================================================================

  // 1. LÍMITE POR IP
  static async scanIpAbuse(maxPerIp: number): Promise<{ success: boolean; abusers: { ip: string; count: number; accounts: string[] }[]; message?: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/ip/scan-abuse', { maxPerIp, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al escanear abusos de IP');
      this.logQuery('SCAN_IP_ABUSE', duration, true, (data.abusers || []).length);
      return { success: true, message: data.message || 'OK', abusers: data.abusers || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('SCAN_IP_ABUSE', duration, false, 0, e.message);
      return { success: false, message: e.message, abusers: [] };
    }
  }

  static async banAccountsByIp(ip: string): Promise<{ success: boolean; message: string; banned: number }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/ip/ban-by-ip', { ip, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al banear por IP');
      this.logQuery('BAN_BY_IP', duration, true, data.banned || 0);
      return { success: true, message: data.message || 'Cuentas baneadas exitosamente', banned: data.banned || 0 };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('BAN_BY_IP', duration, false, 0, e.message);
      return { success: false, message: e.message, banned: 0 };
    }
  }

  static async disconnectByIp(ip: string): Promise<{ success: boolean; message: string; disconnected: number }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/ip/disconnect-by-ip', { ip, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al desconectar por IP');
      this.logQuery('DISCONNECT_BY_IP', duration, true, data.disconnected || 0);
      return { success: true, message: data.message || 'Cuentas desconectadas', disconnected: data.disconnected || 0 };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('DISCONNECT_BY_IP', duration, false, 0, e.message);
      return { success: false, message: e.message, disconnected: 0 };
    }
  }

  static async enforceIpLimit(maxPerIp: number, action: 'LOG' | 'DISCONNECT' = 'DISCONNECT'): Promise<{
    success: boolean;
    message: string;
    violationsCount: number;
    disconnectedCount: number;
    violations: any[];
    disconnected: any[];
  }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/ip/enforce-limit', { maxPerIp, action, config: this.config }, 15000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al aplicar límite de IP');
      this.logQuery('ENFORCE_IP_LIMIT', duration, true, data.disconnectedCount || 0);
      return {
        success: true,
        message: data.message || 'Límite de IP aplicado con éxito',
        violationsCount: data.violationsCount || 0,
        disconnectedCount: data.disconnectedCount || 0,
        violations: data.violations || [],
        disconnected: data.disconnected || [],
      };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('ENFORCE_IP_LIMIT', duration, false, 0, e.message);
      return {
        success: false,
        message: e.message,
        violationsCount: 0,
        disconnectedCount: 0,
        violations: [],
        disconnected: [],
      };
    }
  }

  // 2. KIT & PREMIOS
  static async deliverStarterKit(
    accountId: string,
    kitHexItems: string[],
    bonus?: { zen?: number; gcoins?: number; wCoinP?: number; goblinPoints?: number; ruud?: number },
    warehouseIndex: number = 0
  ): Promise<{ success: boolean; delivered: number; failed: number; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/kit/deliver', {
        accountId,
        kitHexItems,
        zen: bonus?.zen,
        gcoins: bonus?.gcoins,
        wCoinP: bonus?.wCoinP,
        goblinPoints: bonus?.goblinPoints,
        ruud: bonus?.ruud,
        warehouseIndex,
        config: this.config
      }, 15000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al entregar kit de inicio');
      this.logQuery('DELIVER_STARTER_KIT', duration, true, data.delivered || 0);
      return { success: true, message: data.message || 'Kit entregado correctamente', delivered: data.delivered || 0, failed: data.failed || 0 };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('DELIVER_STARTER_KIT', duration, false, 0, e.message);
      return { success: false, message: e.message, delivered: 0, failed: kitHexItems.length };
    }
  }

  static async getOnlinePlayers(): Promise<{ success: boolean; players: OnlinePlayer[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/players/online', { config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al obtener jugadores conectados');
      this.logQuery('GET_ONLINE_PLAYERS', duration, true, (data.players || []).length);
      return { success: true, players: data.players || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('GET_ONLINE_PLAYERS', duration, false, 0, e.message);
      return { success: false, players: [] };
    }
  }

  static async deliverPrizeToPlayers(prizes: {
    accountId: string;
    itemHexList: string[];
    zen?: number;
    gcoins?: number;
    wCoinP?: number;
    goblinPoints?: number;
    ruud?: number;
    warehouseIndex?: number;
  }[]): Promise<{ success: boolean; results: { accountId: string; ok: boolean; error?: string }[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/prizes/deliver', { prizes, config: this.config }, 20000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al entregar premios masivos');
      this.logQuery('DELIVER_PRIZES_BATCH', duration, true, (data.results || []).length);
      return { success: true, results: data.results || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('DELIVER_PRIZES_BATCH', duration, false, 0, e.message);
      return { success: false, results: [] };
    }
  }

  static async addGCoinsToAccount(accountId: string, amount: number): Promise<{ success: boolean; message: string; newBalance?: number }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/accounts/add-gcoins', { accountId, amount, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al acreditar GCoins');
      this.logQuery('ADD_GCOINS', duration, true, 1);
      return { success: true, message: data.message || 'GCoins acreditados', newBalance: data.newBalance };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('ADD_GCOINS', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async addZenToCharacter(charName: string, amount: number): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/character/add-zen', { charName, amount, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al transferir Zen');
      this.logQuery('ADD_ZEN_CHARACTER', duration, true, 1);
      return { success: true, message: data.message || 'Zen añadido correctamente' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('ADD_ZEN_CHARACTER', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  // 3. GESTIÓN INTEGRAL DE GUILDS / CLANES (100% NATIVO EN SQL SERVER)
  static async getGuilds(): Promise<{ success: boolean; guilds: GuildEntry[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/guilds', { config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al obtener clanes');
      this.logQuery('GET_GUILDS', duration, true, (data.guilds || []).length);
      return { success: true, guilds: data.guilds || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('GET_GUILDS', duration, false, 0, e.message);
      return { success: false, guilds: [] };
    }
  }

  static async getGuildMembers(guildName: string): Promise<{ success: boolean; members: GuildMemberEntry[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/guilds/members', { guildName, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al obtener miembros del clan');
      this.logQuery('GET_GUILD_MEMBERS', duration, true, (data.members || []).length);
      return { success: true, members: data.members || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('GET_GUILD_MEMBERS', duration, false, 0, e.message);
      return { success: false, members: [] };
    }
  }

  static async deleteGuild(guildName: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/guilds/delete', { guildName, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al eliminar clan');
      this.logQuery('DELETE_GUILD', duration, true, 1);
      return { success: true, message: data.message || `Clan '${guildName}' eliminado correctamente` };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('DELETE_GUILD', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  // 4. CONTROL Y LIMPIEZA DE ASESINOS / PK (100% NATIVO EN SQL SERVER)
  static async getPkList(): Promise<{ success: boolean; pks: PkPlayerEntry[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/pk/list', { config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al obtener lista de asesinos');
      this.logQuery('GET_PK_LIST', duration, true, (data.pks || []).length);
      return { success: true, pks: data.pks || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('GET_PK_LIST', duration, false, 0, e.message);
      return { success: false, pks: [] };
    }
  }


  // 5. GESTIÓN DE JUGADORES
  static async kickPlayer(charName: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/players/kick', { charName, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al desconectar jugador');
      this.logQuery('KICK_PLAYER', duration, true, 1);
      return { success: true, message: data.message || 'Jugador desconectado del servidor' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('KICK_PLAYER', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async getIpHistory(accountId: string): Promise<{ success: boolean; history: { ip: string; date: string; charName: string }[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/accounts/ip-history', { accountId, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al obtener historial de IPs');
      this.logQuery('GET_IP_HISTORY', duration, true, (data.history || []).length);
      return { success: true, history: data.history || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('GET_IP_HISTORY', duration, false, 0, e.message);
      return { success: false, history: [] };
    }
  }

  static async muteAccount(accountId: string, minutes: number): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/accounts/mute', { accountId, minutes, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al silenciar cuenta');
      this.logQuery('MUTE_ACCOUNT', duration, true, 1);
      return { success: true, message: data.message || `Cuenta silenciada por ${minutes} minutos` };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('MUTE_ACCOUNT', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async banAccountWithReason(accountId: string, reason: string, expiresAt?: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/accounts/ban', { accountId, reason, expiresAt, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al banear cuenta');
      this.logQuery('BAN_ACCOUNT_REASON', duration, true, 1);
      return { success: true, message: data.message || 'Cuenta baneada correctamente' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('BAN_ACCOUNT_REASON', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async getActiveBans(): Promise<{ success: boolean; bans: BanEntry[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/accounts/active-bans', { config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al obtener baneos activos');
      this.logQuery('GET_ACTIVE_BANS', duration, true, (data.bans || []).length);
      return { success: true, bans: data.bans || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('GET_ACTIVE_BANS', duration, false, 0, e.message);
      return { success: false, bans: [] };
    }
  }

  static async unbanAccount(accountId: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/accounts/unban', { accountId, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al desbanear cuenta');
      this.logQuery('UNBAN_ACCOUNT', duration, true, 1);
      return { success: true, message: data.message || 'Cuenta desbaneada exitosamente' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('UNBAN_ACCOUNT', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async banCharacter(charName: string, reason?: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/character/ban', { charName, reason, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al banear personaje');
      this.logQuery('BAN_CHARACTER', duration, true, 1);
      return { success: true, message: data.message || `Personaje '${charName}' baneado exitosamente (CtlCode = 1)` };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('BAN_CHARACTER', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async unbanCharacter(charName: string): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/character/unban', { charName, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al desbanear personaje');
      this.logQuery('UNBAN_CHARACTER', duration, true, 1);
      return { success: true, message: data.message || `Personaje '${charName}' desbaneado exitosamente (CtlCode = 0)` };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('UNBAN_CHARACTER', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  // 6. GM MANAGEMENT
  static async getGmList(): Promise<{ success: boolean; gms: GmEntry[] }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/gm/list', { config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al obtener lista de GMs');
      this.logQuery('GET_GM_LIST', duration, true, (data.gms || []).length);
      return { success: true, gms: data.gms || [] };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('GET_GM_LIST', duration, false, 0, e.message);
      return { success: false, gms: [] };
    }
  }

  static async setGmLevel(charName: string, accountId: string, gmLevel: GmLevel): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/gm/set-level', { charName, accountId, gmLevel, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al configurar nivel de GM');
      this.logQuery('SET_GM_LEVEL', duration, true, 1);
      return { success: true, message: data.message || 'Nivel de GM actualizado con éxito' };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('SET_GM_LEVEL', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async removeGm(charName: string, accountId: string = ''): Promise<{ success: boolean; message: string }> {
    return this.setGmLevel(charName, accountId, 0);
  }



  // --- MÉTODOS DE CONVENIENCIA Y COMPATIBILIDAD ---
  static async deliverKitToWarehouse(
    accountId: string,
    kitEntries: ItemKitEntry[],
    bonus?: { zen?: number; gcoins?: number; wCoinP?: number; goblinPoints?: number; ruud?: number },
    warehouseIndex: number = 0
  ): Promise<{ success: boolean; message: string }> {
    const hexList = kitEntries.map(e => MuItemParser.createItemHex({
      group: e.itemDef.group,
      index: e.itemDef.index,
      level: e.level,
      option: e.option,
      skill: e.skill,
      luck: e.luck,
      durability: 255,
      excellentFlags: e.excFlags,
      ancientOption: 0,
      option380: e.option380,
      sockets: e.enableSockets ? e.sockets : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
    }));
    return this.deliverStarterKit(accountId, hexList, bonus, warehouseIndex);
  }

  static async batchDeliverPrize(
    charNames: string[],
    prize: {
      zen?: number;
      gcoins?: number;
      wCoinP?: number;
      goblinPoints?: number;
      ruud?: number;
      itemHex?: string;
      itemHexList?: string[];
      warehouseIndex?: number;
    }
  ): Promise<{ success: boolean; message: string }> {
    const hexItems = prize.itemHexList && prize.itemHexList.length > 0
      ? prize.itemHexList
      : (prize.itemHex ? [prize.itemHex] : []);
    const prizesPayload = charNames.map(name => ({
      accountId: name,
      charName: name,
      itemHexList: hexItems,
      zen: prize.zen,
      gcoins: prize.gcoins,
      wCoinP: prize.wCoinP,
      goblinPoints: prize.goblinPoints,
      ruud: prize.ruud,
      warehouseIndex: prize.warehouseIndex || 0,
    }));
    const res = await this.deliverPrizeToPlayers(prizesPayload);
    return { success: res.success, message: `Premios entregados a ${charNames.length} jugadores.` };
  }

  static async teleportCharacter(charName: string, map: number, x: number, y: number): Promise<{ success: boolean; message: string }> {
    const startTime = Date.now();
    try {
      const res = await this.sendSecureRequest('/api/character/teleport', { charName, map, x, y, config: this.config }, 10000);
      const data = await this.safeJson(res);
      const duration = Date.now() - startTime;
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al teletransportar');
      this.logQuery('TELEPORT_CHAR', duration, true, 1);
      return { success: true, message: data.message || `Teletransportado a mapa ${map} (${x}, ${y})` };
    } catch (e: any) {
      const duration = Date.now() - startTime;
      this.logQuery('TELEPORT_CHAR', duration, false, 0, e.message);
      return { success: false, message: e.message };
    }
  }

  static async getBannedAccounts(): Promise<{ success: boolean; bans: BanEntry[] }> {
    return this.getActiveBans();
  }

  static async banAccount(accountId: string, reason: string): Promise<{ success: boolean; message: string }> {
    return this.banAccountWithReason(accountId, reason);
  }

  static async getAccountsByIpLimit(maxPerIp: number): Promise<{ success: boolean; offending: { ip: string; count: number; accounts: string[] }[] }> {
    const res = await this.scanIpAbuse(maxPerIp);
    return { success: res.success, offending: res.abusers || [] };
  }

  static async disconnectExceededIpAccounts(maxPerIp: number): Promise<{ success: boolean; disconnected: number; message: string }> {
    const res = await this.scanIpAbuse(maxPerIp);
    let disconnected = 0;
    if (res.success && res.abusers) {
      for (const ab of res.abusers) {
        const dcRes = await this.disconnectByIp(ab.ip);
        if (dcRes.success) disconnected += dcRes.disconnected;
      }
    }
    return { success: true, disconnected, message: `Desconectadas ${disconnected} cuentas excedentes.` };
  }
}
