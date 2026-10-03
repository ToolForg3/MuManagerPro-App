import { Linking } from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import { SecurityService } from './securityService';
import { SecureStorage } from './secureStorage';
import { SqlClient, TelemetryPingResult } from '../database/sqlClient';
import { RemoteConfigService } from './remoteConfigService';
import { FeedbackService } from '../feedback/feedbackService';

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
  hoursRemaining?: number;
  timeRemainingFormatted?: string;
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
  private static lastNotifiedTrialExpiresAt: string | null = null;
  private static lastProcessedRevision: number = 0;
  private static lastProcessedUpdatedAt: number = 0;
  private static lastServerId: string = '';
  private static lastProcessedHwid: string = '';
  private static storagePromiseQueue: Promise<void> = Promise.resolve();

  private static queueStorageOperation(op: () => Promise<void>): Promise<void> {
    this.storagePromiseQueue = this.storagePromiseQueue
      .then(op)
      .catch((err) => {
        console.warn('[LicenseService] Error in storage queue:', err);
      });
    return this.storagePromiseQueue;
  }

  static onSessionInvalidated(cb: (reason?: string) => void) {
    this.sessionInvalidatedCallback = cb;
  }

  static triggerSessionInvalidated(reason?: string) {
    if (this.sessionInvalidatedCallback) {
      this.sessionInvalidatedCallback(reason || 'Tu sesión ha sido finalizada.');
    }
  }

  /**
   * Initializes the license manager on app boot and pings telemetry
   */
  static async initialize(): Promise<LicenseStatus> {
    const hwid = await SecurityService.getDeviceHwid();
    this.currentStatus.hwid = hwid;

    try {
      const savedNotified = await SecureStorage.getItem('@mumanager_notified_trial_expires_at');
      if (savedNotified) {
        this.lastNotifiedTrialExpiresAt = savedNotified;
      }
    } catch (_) {}

    try {
      const raw = await SecureStorage.getItem(LICENSE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Verify anti-tamper checksum
        if (parsed.hwid === hwid && parsed.plan === 'PRO') {
          // Si la licencia local ya venció por fecha, limpiar almacenamiento y pasar a DEMO de inmediato
          if (parsed.expiresAt && new Date(parsed.expiresAt).getTime() <= Date.now()) {
            console.log('[LicenseService] Licencia local expirada por fecha en inicio, pasando a DEMO');
            await SecureStorage.removeItem(LICENSE_STORAGE_KEY);
          } else {
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
                isLifetime: !!parsed.isLifetime && !parsed.expiresAt,
                expiresAt: parsed.expiresAt,
                daysRemaining: parsed.daysRemaining,
                licenseValidUntil: parsed.licenseValidUntil,
              };
              if (typeof parsed.authRevision === 'number') {
                this.lastProcessedRevision = parsed.authRevision;
              }
              if (typeof parsed.authUpdatedAt === 'number') {
                this.lastProcessedUpdatedAt = parsed.authUpdatedAt;
              }
              this.notifyListeners();
              this.reportTelemetry(hwid, 'PRO', parsed.licenseKey);
              return this.currentStatus;
            }
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

    const incomingRev = typeof res.authRevision === 'number' ? res.authRevision : 0;
    const incomingUpdatedAt = typeof res.authUpdatedAt === 'number' ? res.authUpdatedAt : 0;
    const incomingServerId = res.serverId || '';

    // Si cambió de HWID (cambio de dispositivo), resetear la revisión local
    if (this.lastProcessedHwid && currentHwid && this.lastProcessedHwid !== currentHwid) {
      this.lastProcessedRevision = 0;
      this.lastProcessedUpdatedAt = 0;
    }
    this.lastProcessedHwid = currentHwid;

    // Órdenes autoritativas explícitas del administrador: bloqueo explícito o purga de clave
    const isExplicitAdminCommand = (
      res.blocked === true ||
      res.forceWipeKey === true
    );

    // Control de orden: Solo descartar si la revisión es menor Y la fecha NO es más reciente.
    // Una respuesta rutinaria (sea DEMO o PRO) con revisión inferior a la ya procesada
    // es un descarte obvio (ej: contenedor frío de Vercel desfasado).
    if (!isExplicitAdminCommand && (incomingRev > 0 || this.lastProcessedRevision > 0)) {
      if (incomingRev < this.lastProcessedRevision && incomingUpdatedAt <= this.lastProcessedUpdatedAt) {
        console.warn(`[LicenseService] Descartando respuesta de telemetría obsoleta o desfasada (rev ${incomingRev} < ${this.lastProcessedRevision})`);
        return;
      }
    }

    if (incomingRev > 0) {
      this.lastProcessedRevision = Math.max(this.lastProcessedRevision, incomingRev);
    }
    if (incomingUpdatedAt > 0) {
      this.lastProcessedUpdatedAt = Math.max(this.lastProcessedUpdatedAt, incomingUpdatedAt);
    }
    if (incomingServerId) {
      this.lastServerId = incomingServerId;
    }

    // Concurrencia de Sesión o Desvinculación desde el Panel de Control
    if ((res.sessionInvalidated || (res as any).forceLogout) && this.sessionInvalidatedCallback) {
      const reasonMsg = res.reason || (res as any).sessionInvalidatedReason || 'Tu cuenta ha sido desvinculada o tu sesión ha finalizado.';
      this.sessionInvalidatedCallback(reasonMsg);
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
        this.queueStorageOperation(async () => {
          await SecureStorage.removeItem(LICENSE_STORAGE_KEY);
        });
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

    // Verificar expiración de licencia PRO por tiempo (al expirar, regresa a DEMO vitalicio sin bloqueo)
    if (res.mode === 'PRO' && (res as any).expiresAt) {
      const expiryTime = new Date((res as any).expiresAt).getTime();
      if (Date.now() > expiryTime) {
        this.currentStatus.isExpired = false;
        this.currentStatus.isBlocked = !!res.blocked;
        this.currentStatus.blockReason = res.blocked
          ? ((res as any).reason || 'Dispositivo bloqueado por el administrador.')
          : undefined;
        this.currentStatus.isActivated = false;
        this.currentStatus.plan = 'DEMO';
        this.currentStatus.licenseKey = undefined;
        this.currentStatus.isLifetime = false;
        this.currentStatus.daysRemaining = undefined;
        this.currentStatus.hoursRemaining = undefined;
        this.currentStatus.timeRemainingFormatted = undefined;
        this.currentStatus.expiresAt = undefined;
        this.queueStorageOperation(async () => {
          await SecureStorage.removeItem(LICENSE_STORAGE_KEY);
        });
        this.notifyListeners();
        if (wasPro && !res.blocked) {
          Alert.alert(
            'Prueba PRO Finalizada',
            'Tu prueba PRO de 24 horas ha finalizado. Tu cuenta continúa activa en Modo DEMO permanente con sus funciones básicas.',
            [{ text: 'Entendido' }]
          );
        }
        return;
      }
    }

    // Sincronización Remota 1-Clic: Activar o Quitar PRO sin escribir claves
    if (res.mode === 'PRO') {
      const key = res.licenseKey || this.currentStatus.licenseKey || '';
      const isLifetime = !!res.isLifetime && !res.expiresAt;
      const daysRemaining = res.daysRemaining;
      const hoursRemaining = res.hoursRemaining;
      const timeRemainingFormatted = res.timeRemainingFormatted;
      const expiresAt = res.expiresAt || undefined;

      this.currentStatus.isActivated = true;
      this.currentStatus.plan = 'PRO';
      this.currentStatus.isBlocked = false;
      this.currentStatus.isExpired = false;
      this.currentStatus.isLifetime = isLifetime;
      this.currentStatus.daysRemaining = daysRemaining;
      this.currentStatus.hoursRemaining = hoursRemaining;
      this.currentStatus.timeRemainingFormatted = timeRemainingFormatted;
      this.currentStatus.expiresAt = expiresAt;

      if (key) {
        this.currentStatus.licenseKey = key;
      }
      if (currentHwid) {
        const checksum = SecurityService.computeChecksum(`${currentHwid}:${key}:PRO`);
        const revToSave = incomingRev || this.lastProcessedRevision;
        const updatedToSave = incomingUpdatedAt || this.lastProcessedUpdatedAt;
        this.queueStorageOperation(async () => {
          await SecureStorage.setItem(
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
              hoursRemaining,
              timeRemainingFormatted,
              // MEJORA 1: guardar TTL del servidor para enforcement offline
              licenseValidUntil: (res as any).licenseValidUntil || null,
              authRevision: revToSave,
              authUpdatedAt: updatedToSave,
            })
          );
        });
      }
      this.notifyListeners();

      // Notificación al APK cuando la licencia es asignada (DEMO -> PRO o primer inicio de cuenta con PRO Trial)
      const isTrial = !!(
        (res as any).isProTrial ||
        (res as any).authAction?.startsWith('PRO_TRIAL') ||
        (!isLifetime && expiresAt && ((res as any).proTrialStartedAt || (res as any).authAction?.includes('TRIAL')))
      );
      let duracionTxt = 'Vitalicia (Permanente)';
      if (!isLifetime && expiresAt) {
        const expD = new Date(expiresAt);
        const fechaStr = expD.toLocaleDateString() + ' ' + expD.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (timeRemainingFormatted) {
          duracionTxt = `${timeRemainingFormatted} (Vence: ${fechaStr})`;
        } else if (hoursRemaining !== undefined && hoursRemaining > 0) {
          duracionTxt = `${hoursRemaining} horas (Vence: ${fechaStr})`;
        } else {
          duracionTxt = `${daysRemaining !== undefined && daysRemaining > 0 ? `${daysRemaining} días ` : ''}(Vence: ${fechaStr})`;
        }
      } else if ((res as any).durationText) {
        duracionTxt = (res as any).durationText;
      }

      if (isTrial) {
        // Mostrar alerta si esta prueba aún no ha sido notificada al usuario en este dispositivo
        const trialKey = expiresAt || 'trial_active';
        if (this.lastNotifiedTrialExpiresAt !== trialKey) {
          this.lastNotifiedTrialExpiresAt = trialKey;
          SecureStorage.setItem('@mumanager_notified_trial_expires_at', trialKey).catch(() => {});
          Alert.alert(
            '🎉 ¡Bienvenido a MU Manager PRO!',
            `Se ha activado tu prueba PRO gratuita por 24 horas para este dispositivo.\n\n⏳ Tiempo disponible: ${duracionTxt}\n\nTienes acceso completo a todas las herramientas avanzadas, edición de personajes, baúl y diagnósticos SQL.`,
            [{ text: '¡Comenzar a Usar!' }]
          );
        }
      } else if (!wasPro) {
        Alert.alert(
          '🎉 ¡Licencia PRO Activada!',
          `El administrador ha asignado tu licencia PRO para este dispositivo.\n\n⏳ Tiempo activado: ${duracionTxt}\n\nTienes acceso completo a todas las funciones avanzadas.`,
          [{ text: '¡Excelente!' }]
        );
      }
    } else if (res.mode === 'DEMO' || res.forceWipeKey || ((res as any).authoritativeMode === 'DEMO')) {
      // Si el dispositivo ya era PRO, verificar que la degradación a DEMO sea autoritativa
      // (ej: forceDemo explícito del admin, bloqueo, wipe o revisión igual/mayor).
      // Jamás degradar a DEMO por un ping rutinario desfasado si la licencia local está activa.
      const isAuthorizedDowngrade = !wasPro || res.forceDemo === true || res.forceWipeKey === true || incomingRev >= this.lastProcessedRevision;
      if (!isAuthorizedDowngrade) {
        console.warn('[LicenseService] Ignorando degradación a DEMO no autoritativa de respuesta desfasada');
        return;
      }

      // Modo DEMO es vitalicio: limpiar credenciales PRO si las hubiera y asegurar DEMO permanente
      this.currentStatus.isActivated = false;
      this.currentStatus.plan = 'DEMO';
      this.currentStatus.licenseKey = undefined;
      this.currentStatus.isLifetime = false;
      this.currentStatus.isExpired = false;
      this.currentStatus.daysRemaining = undefined;
      this.currentStatus.hoursRemaining = undefined;
      this.currentStatus.timeRemainingFormatted = undefined;
      this.currentStatus.expiresAt = undefined;
      this.queueStorageOperation(async () => {
        await SecureStorage.removeItem(LICENSE_STORAGE_KEY);
      });
      if (wasPro) {
        this.notifyListeners();
        // Notificación al APK cuando la prueba concluye o la licencia es revocada (PRO -> DEMO)
        Alert.alert(
          'Período PRO Finalizado',
          'Tu período de prueba PRO ha concluido. Tu dispositivo continúa activo en Modo DEMO permanente para lectura y auditoría SQL.\n\n¿Qué te pareció la aplicación? Tu opinión nos ayuda directamente a mejorar.',
          [
            {
              text: '⭐ Calificar Experiencia',
              onPress: () => {
                FeedbackService.show({
                  source: 'pro_trial_expired',
                  title: '⭐ CALIFICAR PRUEBA PRO',
                  subtitle: 'Tu período de 24 horas concluyó. Cuéntanos qué tal fue tu experiencia con las herramientas PRO.',
                });
              },
            },
            {
              text: 'Continuar en DEMO',
              style: 'cancel',
            },
          ]
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

    await this.queueStorageOperation(async () => {
      await SecureStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify(statusData));
    });
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
    await this.queueStorageOperation(async () => {
      await SecureStorage.removeItem(LICENSE_STORAGE_KEY);
    });
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
    return this.isPro() ? 65535 : 1000;
  }

  static maxAllowedZen(): number {
    return this.isPro() ? 2000000000 : 10000000;
  }

  /**
   * Verifica si un error recibido corresponde a una restricción de licencia o modo DEMO
   */
  static isLicenseError(errOrMsg: any): boolean {
    if (!errOrMsg) return false;
    const str = typeof errOrMsg === 'string' ? errOrMsg : (errOrMsg.message || errOrMsg.error || '');
    return (
      str.includes('LICENCIA') ||
      str.includes('Licencia PRO') ||
      str.includes('FUNCION_RESTRINGIDA_PRO') ||
      str.includes('DISPOSITIVO_REQUERIDO')
    );
  }

  /**
   * Muestra el diálogo estándar de función bloqueada en modo DEMO
   * con título "Función Bloqueada en DEMO", mensaje detallado y botón "Activar PRO"
   */
  static alertProRequired(featureName: string, onActivatePro?: () => void, customMsg?: string): void {
    Alert.alert(
      'Función Bloqueada en DEMO',
      customMsg || `${featureName} requiere una Licencia PRO activa para sincronizar con SQL Server.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        ...(onActivatePro
          ? [{ text: 'Activar PRO', onPress: onActivatePro }]
          : [{ text: 'OK' }]),
      ]
    );
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
