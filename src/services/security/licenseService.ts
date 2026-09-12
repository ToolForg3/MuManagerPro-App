import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService } from './securityService';
import { SqlClient, TelemetryPingResult } from '../database/sqlClient';
import { RemoteConfigService } from './remoteConfigService';

export interface LicenseStatus {
  isActivated: boolean;
  plan: 'DEMO' | 'PRO';
  hwid: string;
  licenseKey?: string;
  activatedAt?: string;
  deviceChecksum: string;
  isBlocked?: boolean;
  blockReason?: string;
  expiresAt?: string;
  isExpired?: boolean;
  isLifetime?: boolean;
  daysRemaining?: number;
  // MEJORA 1: TTL de licencia — si el servidor no confirma PRO en 48h, se fuerza DEMO
  licenseValidUntil?: string;
}

const LICENSE_STORAGE_KEY = '@mumanager_license_data_v1';

export class LicenseService {
  private static currentStatus: LicenseStatus = {
    isActivated: false,
    plan: 'DEMO',
    hwid: '',
    deviceChecksum: '',
    isBlocked: false,
    blockReason: '',
  };

  private static listeners: Array<(status: LicenseStatus) => void> = [];
  private static sessionInvalidatedCallback: ((reason?: string) => void) | null = null;

  static onSessionInvalidated(cb: (reason?: string) => void) {
    this.sessionInvalidatedCallback = cb;
  }

  /**
   * Initializes the license manager on app boot and pings telemetry
   */
  static async initialize(): Promise<LicenseStatus> {
    const hwid = await SecurityService.getDeviceHwid();
    this.currentStatus.hwid = hwid;

    try {
      const raw = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Verify anti-tamper checksum
        if (parsed.hwid === hwid && parsed.plan === 'PRO') {
          // Blindaje anti-pérdida de licencia:
          // Si el dispositivo tiene una clave matemáticamente válida o es PRO, no destruir la licencia local
          const isMathematicallyValid = parsed.licenseKey && SecurityService.verifyKey(hwid, parsed.licenseKey).valid;
          if (parsed.licenseValidUntil && !isMathematicallyValid && !parsed.isLifetime) {
            const validUntil = new Date(parsed.licenseValidUntil).getTime();
            if (Date.now() > validUntil) {
              console.warn('[LicenseService] Licencia temporal expirada — pasando a verificación con servidor');
            }
          }

          const expectedChecksum = SecurityService.computeChecksum(
            `${parsed.hwid}:${parsed.licenseKey || ''}:PRO`
          );
          const legacyChecksum = SecurityService.computeChecksum(
            `${parsed.hwid}:${parsed.licenseKey || ''}:${parsed.plan}`
          );

          if (
            parsed.deviceChecksum === expectedChecksum ||
            parsed.deviceChecksum === legacyChecksum ||
            (parsed.licenseKey && SecurityService.verifyKey(hwid, parsed.licenseKey).valid)
          ) {
            this.currentStatus = {
              isActivated: true,
              plan: 'PRO',
              hwid,
              licenseKey: parsed.licenseKey || '',
              activatedAt: parsed.activatedAt,
              deviceChecksum: parsed.deviceChecksum || expectedChecksum,
              isBlocked: false,
              isLifetime: parsed.isLifetime !== undefined ? parsed.isLifetime : !parsed.expiresAt,
              expiresAt: parsed.expiresAt,
              daysRemaining: parsed.daysRemaining,
              licenseValidUntil: parsed.licenseValidUntil,
            };
            this.notifyListeners();
            this.reportTelemetry(hwid, 'PRO', parsed.licenseKey);
            return this.currentStatus;
          }
        }
      }
    } catch (e) {
      console.warn('Error reading license, defaulting to DEMO', e);
    }

    // Default to DEMO
    this.currentStatus = {
      isActivated: false,
      plan: 'DEMO',
      hwid,
      deviceChecksum: '',
      isBlocked: false,
    };
    this.notifyListeners();
    this.reportTelemetry(hwid, 'DEMO');
    return this.currentStatus;
  }

  static handleTelemetryResponse(res: TelemetryPingResult, hwid?: string) {
    if (!res || res.success !== true) return;
    const currentHwid = hwid || this.currentStatus.hwid;
    const wasPro = this.currentStatus.isActivated && this.currentStatus.plan === 'PRO';
    const wasBlocked = !!this.currentStatus.isBlocked;

    // Concurrencia de Sesión: Si la cuenta fue abierta en otro celular
    if (res.sessionInvalidated && this.sessionInvalidatedCallback) {
      this.sessionInvalidatedCallback(res.reason || 'Tu cuenta ha iniciado sesión en otro celular.');
    }

    if (res.blocked) {
      this.currentStatus.isBlocked = true;
      this.currentStatus.blockReason = (res as any).reason || 'Acceso revocado por el administrador.';
      if (res.forceWipeKey || res.forceDemo) {
        this.currentStatus.isActivated = false;
        this.currentStatus.plan = 'DEMO';
        this.currentStatus.licenseKey = undefined;
        this.currentStatus.isLifetime = false;
        this.currentStatus.daysRemaining = 0;
        AsyncStorage.removeItem(LICENSE_STORAGE_KEY).catch(() => {});
      }
      this.notifyListeners();
      if (!wasBlocked) {
        Alert.alert(
          'Acceso Bloqueado',
          this.currentStatus.blockReason || 'Este dispositivo ha sido bloqueado por el administrador.',
          [{ text: 'Entendido' }]
        );
      }
      return;
    }

    // Limpiar bloqueo si fue desmarcado por el administrador
    if (this.currentStatus.isBlocked) {
      this.currentStatus.isBlocked = false;
      this.currentStatus.blockReason = undefined;
      this.notifyListeners();
    }

    // Verificar expiración de período de prueba o licencia PRO
    if ((res as any).expiresAt) {
      const expiryTime = new Date((res as any).expiresAt).getTime();
      if (Date.now() > expiryTime) {
        const wasExpiredAlready = !!this.currentStatus.isExpired;
        this.currentStatus.isBlocked = true;
        this.currentStatus.isExpired = true;
        this.currentStatus.blockReason = res.mode === 'PRO'
          ? 'Tu licencia PRO por tiempo ha vencido. Contacta a soporte para renovar.'
          : 'El período de prueba para este celular ha expirado.';
        if (res.mode === 'PRO') {
          this.currentStatus.isActivated = false;
          this.currentStatus.plan = 'DEMO';
          this.currentStatus.licenseKey = undefined;
          this.currentStatus.isLifetime = false;
          this.currentStatus.daysRemaining = 0;
          AsyncStorage.removeItem(LICENSE_STORAGE_KEY).catch(() => {});
        }
        this.notifyListeners();
        if (!wasExpiredAlready) {
          Alert.alert(
            'Vigencia Expirada',
            this.currentStatus.blockReason,
            [{ text: 'Entendido' }]
          );
        }
        return;
      }
    }

    // Sincronización Remota 1-Clic: Activar o Quitar PRO sin escribir claves
    if (res.mode === 'PRO') {
      const key = res.licenseKey || this.currentStatus.licenseKey || '';
      const isLifetime = (res as any).isLifetime !== undefined ? (res as any).isLifetime : !res.expiresAt;
      const daysRemaining = (res as any).daysRemaining;
      const expiresAt = res.expiresAt || undefined;

      this.currentStatus.isActivated = true;
      this.currentStatus.plan = 'PRO';
      this.currentStatus.isBlocked = false;
      this.currentStatus.isLifetime = isLifetime;
      this.currentStatus.daysRemaining = daysRemaining;
      this.currentStatus.expiresAt = expiresAt;

      if (key) {
        this.currentStatus.licenseKey = key;
      }
      if (currentHwid) {
        const checksum = SecurityService.computeChecksum(`${currentHwid}:${key}:PRO`);
        AsyncStorage.setItem(
          LICENSE_STORAGE_KEY,
          JSON.stringify({
            licenseKey: key,
            plan: 'PRO',
            serverActivated: true,
            activatedAt: new Date().toISOString(),
            hwid: currentHwid,
            deviceChecksum: checksum,
            isLifetime,
            expiresAt,
            daysRemaining,
            // MEJORA 1: guardar TTL del servidor para enforcement offline
            licenseValidUntil: (res as any).licenseValidUntil || null,
          })
        ).catch(() => {});
      }
      this.notifyListeners();

      // Notificación al APK cuando la licencia es asignada (DEMO -> PRO)
      if (!wasPro) {
        Alert.alert(
          '¡Licencia PRO Activada!',
          'El administrador ha asignado tu licencia PRO para este dispositivo. Ya tienes acceso completo a todas las funciones.',
          [{ text: '¡Excelente!' }]
        );
      }
    } else if (res.forceWipeKey || ((res as any).authoritativeMode === 'DEMO' && res.forceDemo)) {
      // Solo revocar si hay una orden estricta de borrado administrativo
      this.currentStatus.isActivated = false;
      this.currentStatus.plan = 'DEMO';
      this.currentStatus.licenseKey = undefined;
      this.currentStatus.isLifetime = false;
      this.currentStatus.daysRemaining = undefined;
      this.currentStatus.expiresAt = undefined;
      AsyncStorage.removeItem(LICENSE_STORAGE_KEY).catch(() => {});
      if (wasPro) {
        this.notifyListeners();
        // Notificación al APK cuando la licencia es revocada (PRO -> DEMO)
        Alert.alert(
          'Licencia PRO Revocada',
          'Tu dispositivo ha sido regresado al Modo DEMO por el administrador.',
          [{ text: 'Entendido' }]
        );
      }
    }
  }

  private static reportTelemetry(hwid: string, plan: 'DEMO' | 'PRO', licenseKey?: string) {
    SqlClient.sendTelemetryPing(hwid, plan, licenseKey)
      .then((res) => {
        RemoteConfigService.handleTelemetryPingResult(res);
        this.handleTelemetryResponse(res, hwid);
      })
      .catch(() => {});
  }

  /**
   * Consulta explícita del Kill-Switch remoto antes de operaciones críticas
   */
  static async checkKillSwitch(): Promise<boolean> {
    const hwid = this.currentStatus.hwid || (await SecurityService.getDeviceHwid());
    try {
      const res = await SqlClient.sendTelemetryPing(hwid, this.currentStatus.plan, this.currentStatus.licenseKey);
      RemoteConfigService.handleTelemetryPingResult(res);
      this.handleTelemetryResponse(res, hwid);
      return !!this.currentStatus.isBlocked;
    } catch {
      return false;
    }
  }

  static getStatus(): LicenseStatus {
    return { ...this.currentStatus };
  }

  static isDemo(): boolean {
    return !this.currentStatus.isActivated || this.currentStatus.plan === 'DEMO';
  }

  static isPro(): boolean {
    return this.currentStatus.isActivated && this.currentStatus.plan === 'PRO' && !this.currentStatus.isBlocked;
  }

  static isBlocked(): boolean {
    return !!this.currentStatus.isBlocked;
  }

  /**
   * Attempts to activate the APK with an activation key provided by the seller
   */
  static async activateWithKey(key: string): Promise<{ success: boolean; message: string }> {
    const hwid = await SecurityService.getDeviceHwid();
    const result = SecurityService.verifyKey(hwid, key);

    if (!result.valid) {
      return {
        success: false,
        message: 'Clave de activación inválida o no corresponde al ID de este dispositivo.',
      };
    }

    const checksum = SecurityService.computeChecksum(`${hwid}:${key}:PRO`);
    const statusData: LicenseStatus = {
      isActivated: true,
      plan: 'PRO',
      hwid,
      licenseKey: key,
      activatedAt: new Date().toISOString(),
      deviceChecksum: checksum,
      isBlocked: false,
    };

    await AsyncStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(statusData));
    this.currentStatus = statusData;
    this.notifyListeners();

    // Report activation to central telemetry server with explicit flag
    SqlClient.sendTelemetryPing(hwid, 'PRO', key, undefined, undefined, true).catch(() => {});

    return {
      success: true,
      message: '¡Mu Manager PRO activado exitosamente en versión PRO!',
    };
  }

  /**
   * Resets license back to DEMO mode
   */
  static async resetToDemo(): Promise<void> {
    await AsyncStorage.removeItem(LICENSE_STORAGE_KEY);
    const hwid = await SecurityService.getDeviceHwid();
    this.currentStatus = {
      isActivated: false,
      plan: 'DEMO',
      hwid,
      deviceChecksum: '',
      isBlocked: false,
    };
    this.notifyListeners();
    this.reportTelemetry(hwid, 'DEMO');
  }

  // Restrictions Enforcement
  static canSaveInventory(): boolean {
    return this.isPro();
  }

  static maxAllowedStat(): number {
    return this.isPro() ? 65535 : 500;
  }

  static maxAllowedZen(): number {
    return this.isPro() ? 2000000000 : 10000000;
  }

  static subscribe(fn: (status: LicenseStatus) => void): () => void {
    this.listeners.push(fn);
    fn(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private static notifyListeners() {
    this.listeners.forEach((fn) => fn(this.getStatus()));
  }
}
