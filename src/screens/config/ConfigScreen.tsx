import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Modal,
  ActivityIndicator,
  Linking,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MuIcon } from '../../components/ui/MuIcon';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { Header } from '../../components/common/Header';
import { BotonOro, BotonPiedra, BotonBrasa, MuButton } from '../../components/ui';
import { Panel } from '../../components/ui/Panel';
import { MuCornerOrnaments } from '../../components/ui/MuCornerOrnaments';
import { MuSideMoldings } from '../../components/ui/MuSideMoldings';
import { DebugPanelModal } from '../../components/debug/DebugPanelModal';
import { useNavigation } from '@react-navigation/native';
import { useDatabase } from '../../context/DatabaseContext';
import { useLanguage, LANGUAGES, LanguageCode } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { SqlClient } from '../../services/database/sqlClient';
import { LicenseService, LicenseStatus } from '../../services/security/licenseService';
import { LicenseModal } from '../../components/security/LicenseModal';
import { RemoteConfigService, RemoteConfigState } from '../../services/security/remoteConfigService';
import { UpdateModal } from '../../components/common/UpdateModal';
import { SecurityService } from '../../services/security/securityService';
import { APP_VERSION, APP_BUILD, APP_DISPLAY_VERSION, TELEGRAM_URL, DISCORD_URL } from '../../constants/appVersion';
import { ServerProfile } from '../../types/admin';
import { logAdminAction } from '../../services/adminLog';
import { TermsAndConditionsModal } from '../../components/legal/TermsAndConditionsModal';
const maskHost = (h?: string): string => {
  if (!h) return '';
  const ipMatch = h.match(/^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/);
  if (ipMatch) return `${ipMatch[1]}.***.***`;
  if (h === 'localhost' || h === '127.0.0.1') return h;
  if (h.length > 8) return h.substring(0, 4) + '***' + h.substring(h.length - 3);
  return '***';
};

const maskUser = (u?: string): string => {
  if (!u) return '';
  if (u.length <= 1) return `${u}***`;
  return `${u[0]}***${u[u.length - 1]}`;
};

export const ConfigScreen = () => {
  const navigation = useNavigation<any>();
  const { t, language, setLanguage } = useLanguage();
  const { config, updateConfig, connect, isConnecting, isConnected, resetDatabaseState } = useDatabase();
  const { userEmail, logout } = useAuth();
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>(LicenseService.getStatus());
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [activeSection, setActiveSection] = useState<'server' | 'security' | 'system'>('server');

  // Update checking state
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfigState>(RemoteConfigService.getState());
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [updateModalManualVisible, setUpdateModalManualVisible] = useState(false);
  const [requestingBeta, setRequestingBeta] = useState(false);

  // Secret Admin Access state (Option B)
  const [adminAuthModalVisible, setAdminAuthModalVisible] = useState(false);
  const [adminKeyInput, setAdminKeyInput] = useState('');
  const [verifyingAdminKey, setVerifyingAdminKey] = useState(false);
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false);
  const secretTapCountRef = useRef(0);
  const secretTapTimerRef = useRef<any>(null);

  // User Password Change State
  const [changePwModalVisible, setChangePwModalVisible] = useState(false);
  const [currentPwInput, setCurrentPwInput] = useState('');
  const [newPwInput, setNewPwInput] = useState('');
  const [confirmPwInput, setConfirmPwInput] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);

  // Terms Modal State
  const [termsModalVisible, setTermsModalVisible] = useState(false);

  useEffect(() => {
    const unsubLicense = LicenseService.subscribe(setLicenseStatus);
    const unsubRemote = RemoteConfigService.subscribe(setRemoteConfig);
    SqlClient.getStoredAdminKey().then((key) => {
      if (key && key.trim().length > 0) {
        setIsAdminUnlocked(true);
      }
    }).catch(() => {});
    return () => {
      unsubLicense();
      unsubRemote();
    };
  }, []);

  const [host, setHost] = useState(config?.host || '');
  const [port, setPort] = useState(String(config?.port || 1433));
  const [database, setDatabase] = useState(config?.database || 'MuOnline');
  const [user, setUser] = useState(config?.user || 'sa');
  const [password, setPassword] = useState(config?.password || '');
  const [showSqlPassword, setShowSqlPassword] = useState(false);
  const [encrypt, setEncrypt] = useState(config?.encrypt ?? false);
  const [emulator, setEmulator] = useState<'MSPro' | 'Louis'>(config?.emulatorType === 'Louis' ? 'Louis' : 'MSPro');
  const [bridgeUrl, setBridgeUrl] = useState(
    (config?.bridgeUrl && !config.bridgeUrl.includes('onrender.com')) ? config.bridgeUrl : SqlClient.DEFAULT_CLOUD_GATEWAY
  );
  const [debugVisible, setDebugVisible] = useState(false);
  const [showHwid, setShowHwid] = useState(false);

  // --- PASO 4: PIN Security State ---
  const [hasPinConfigured, setHasPinConfigured] = useState(false);
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // --- PASO 5: Server Profiles State ---
  const [serverProfiles, setServerProfiles] = useState<ServerProfile[]>([]);
  const [saveProfileModalVisible, setSaveProfileModalVisible] = useState(false);
  const [newProfileName, setNewProfileName] = useState('');

  // --- PASO 6: IP Limit State ---
  const [ipLimitEnabled, setIpLimitEnabled] = useState(false);
  const [ipLimitMax, setIpLimitMax] = useState('3');
  const [ipLimitAction, setIpLimitAction] = useState<'LOG' | 'DISCONNECT'>('LOG');

  useEffect(() => {
    loadServerProfiles();
    checkPinStatus();
    loadIpLimitConfig();
  }, []);

  useEffect(() => {
    if (config?.host && !host) setHost(config.host);
    if (config?.port && (!port || port === '1433')) setPort(String(config.port));
    if (config?.database && (!database || database === 'MuOnline')) setDatabase(config.database);
    if (config?.user && (!user || user === 'sa')) setUser(config.user);
    if (config?.password && !password) setPassword(config.password);
  }, [config]);

  const loadServerProfiles = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mumanager_server_profiles');
      if (stored) {
        setServerProfiles(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Error cargando perfiles:', e);
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = newProfileName.trim();
    if (!trimmed) {
      Alert.alert('Nombre requerido', 'Ingresa un nombre descriptivo para el perfil.');
      return;
    }
    if (serverProfiles.length >= 5) {
      Alert.alert('Límite alcanzado', 'Puedes guardar un máximo de 5 perfiles.');
      return;
    }

    const newProf: ServerProfile = {
      id: Date.now().toString(),
      name: trimmed,
      host,
      port: parseInt(port, 10) || 1433,
      database,
      user,
      password,
      isActive: false,
      encrypt,
      emulatorType: emulator,
      bridgeUrl,
      updatedAt: Date.now(),
    };

    const updated = [...serverProfiles, newProf];
    await AsyncStorage.setItem('@mumanager_server_profiles', JSON.stringify(updated));
    setServerProfiles(updated);
    setSaveProfileModalVisible(false);
    setNewProfileName('');
    await logAdminAction('PERFIL_CREADO', `Guardado perfil "${trimmed}" (${host})`);
    Alert.alert('Perfil Guardado', `El perfil "${trimmed}" se ha guardado correctamente.`);
  };

  const handleLoadProfile = (profile: ServerProfile) => {
    Alert.alert(
      'Cargar Perfil',
      `¿Deseas aplicar los parámetros del perfil "${profile.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar',
          onPress: async () => {
            setHost(profile.host);
            setPort(String(profile.port));
            setDatabase(profile.database);
            setUser(profile.user);
            setPassword(profile.password);
            setEncrypt(profile.encrypt ?? true);
            const loadedEmu = (profile.emulatorType === 'Louis' ? 'Louis' : 'MSPro');
            setEmulator(loadedEmu);
            if (profile.bridgeUrl) setBridgeUrl(profile.bridgeUrl);

            await updateConfig({
              host: profile.host,
              port: profile.port,
              database: profile.database,
              user: profile.user,
              password: profile.password,
              encrypt: profile.encrypt ?? true,
              emulatorType: loadedEmu,
              useBridge: true,
              bridgeUrl: profile.bridgeUrl || SqlClient.DEFAULT_CLOUD_GATEWAY,
            });

            await logAdminAction('PERFIL_CARGADO', `Cargado perfil "${profile.name}" (${profile.host})`);
            Alert.alert('Perfil Cargado', `Configuración actualizada a "${profile.name}". Presiona Conectar si deseas iniciar la sesión.`);
          },
        },
      ]
    );
  };

  const handleDeleteProfile = (profileId: string, name: string) => {
    Alert.alert(
      'Eliminar Perfil',
      `¿Seguro que deseas eliminar el perfil "${name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const updated = serverProfiles.filter((p) => p.id !== profileId);
            await AsyncStorage.setItem('@mumanager_server_profiles', JSON.stringify(updated));
            setServerProfiles(updated);
            await logAdminAction('PERFIL_ELIMINADO', `Eliminado perfil "${name}"`);
          },
        },
      ]
    );
  };

  const checkPinStatus = async () => {
    try {
      const pinHash = await AsyncStorage.getItem('@mumanager_pin_hash');
      setHasPinConfigured(!!pinHash);
    } catch (e) {
      console.error('Error comprobando PIN:', e);
    }
  };

  const handleSavePin = async () => {
    if (!/^\d{4}$/.test(newPinInput)) {
      Alert.alert('PIN Inválido', 'El PIN debe ser de exactamente 4 dígitos numéricos.');
      return;
    }
    if (newPinInput !== confirmPinInput) {
      Alert.alert('Error', 'Los PINs ingresados no coinciden.');
      return;
    }
    const hash = SecurityService.computeChecksum(newPinInput);
    await AsyncStorage.setItem('@mumanager_pin_hash', hash);
    setHasPinConfigured(true);
    setPinModalVisible(false);
    setNewPinInput('');
    setConfirmPinInput('');
    await logAdminAction('SEGURIDAD_PIN', 'PIN de 4 dígitos activado/actualizado');
    Alert.alert('Seguridad Activada', 'El bloqueo por PIN de 4 dígitos ha sido configurado.');
  };

  const handleDisablePin = () => {
    Alert.alert(
      'Desactivar PIN',
      '¿Deseas quitar la protección por PIN al iniciar la app?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('@mumanager_pin_hash');
            setHasPinConfigured(false);
            await logAdminAction('SEGURIDAD_PIN', 'PIN de 4 dígitos desactivado');
            Alert.alert('PIN Desactivado', 'La app ya no solicitará PIN al iniciar.');
          },
        },
      ]
    );
  };

  const loadIpLimitConfig = async () => {
    try {
      const raw = await AsyncStorage.getItem('@mumanager_ip_limit');
      if (raw) {
        const parsed = JSON.parse(raw);
        setIpLimitEnabled(!!parsed.enabled);
        setIpLimitMax(String(parsed.maxPerIp || 3));
        setIpLimitAction(parsed.action || 'LOG');
      }
    } catch (e) {
      console.error('Error cargando límite IP:', e);
    }
  };

  const [checkingIpLimit, setCheckingIpLimit] = useState<boolean>(false);

  const handleRunIpLimitNow = async (customMax?: number, customAction?: 'LOG' | 'DISCONNECT') => {
    const num = customMax || parseInt(ipLimitMax, 10) || 3;
    const act = customAction || ipLimitAction;
    try {
      setCheckingIpLimit(true);
      const res = await SqlClient.enforceIpLimit(num, act);
      if (res.success) {
        if (act === 'DISCONNECT') {
          if (res.disconnectedCount > 0) {
            const accList = (res.disconnected || []).map((d: any) => `• ${d.account} (${d.ip})`).join('\n');
            Alert.alert(
              'Cuentas Desconectadas',
              `Se detectaron ${res.violationsCount} IP(s) con más de ${num} cuentas.\n\nSe desconectaron ${res.disconnectedCount} cuenta(s) excedentes:\n\n${accList}`
            );
          } else if (res.violationsCount > 0) {
            Alert.alert(
              'IPs Excedidas',
              `Se detectaron ${res.violationsCount} IP(s) con más de ${num} cuentas, pero no hubo cuentas adicionales que desconectar.`
            );
          } else {
            Alert.alert('Todo en Orden', `No hay ninguna IP que supere el límite de ${num} cuentas simultáneas.`);
          }
        } else {
          if (res.violationsCount > 0) {
            const ipList = (res.violations || []).map((v: any) => `• IP ${v.ip}: ${v.count} cuentas (${(v.accounts || []).join(', ')})`).join('\n');
            Alert.alert(
              'Reporte de IPs Excedidas',
              `Se detectaron ${res.violationsCount} IP(s) que superan el límite de ${num} cuentas:\n\n${ipList}`
            );
          } else {
            Alert.alert('Todo en Orden', `No hay ninguna IP que supere el límite de ${num} cuentas.`);
          }
        }
      } else {
        Alert.alert('Error al verificar IPs', res.message || 'No se pudo contactar con la base de datos');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setCheckingIpLimit(false);
    }
  };

  const handleSaveIpLimit = async (enabled: boolean, maxVal: string, act: 'LOG' | 'DISCONNECT') => {
    const num = parseInt(maxVal, 10) || 3;
    const cfg = { enabled, maxPerIp: Math.max(1, Math.min(20, num)), action: act };
    await AsyncStorage.setItem('@mumanager_ip_limit', JSON.stringify(cfg));
    setIpLimitEnabled(cfg.enabled);
    setIpLimitMax(String(cfg.maxPerIp));
    setIpLimitAction(cfg.action);
    await logAdminAction('CONFIG_LIMITE_IP', `Estado: ${cfg.enabled ? 'Activo' : 'Inactivo'}, Max: ${cfg.maxPerIp}, Acción: ${cfg.action}`);
    if (enabled && act === 'DISCONNECT') {
      handleRunIpLimitNow(cfg.maxPerIp, 'DISCONNECT');
    }
  };

  const quickIps = ['localhost', '127.0.0.1', '192.168.1.100', '192.168.0.150'];

  const handleHostChange = (newHost: string) => {
    setHost(newHost);
  };

  const handleConnect = async () => {
    const cleanHost = host.trim() || '127.0.0.1';
    let activeBridge = (bridgeUrl || '').trim() || SqlClient.DEFAULT_CLOUD_GATEWAY;
    if (activeBridge.includes('onrender.com')) activeBridge = SqlClient.DEFAULT_CLOUD_GATEWAY;

    await updateConfig({
      host: cleanHost,
      port: parseInt(port, 10) || 1433,
      database,
      user,
      password,
      encrypt,
      emulatorType: emulator,
      useBridge: true,
      bridgeUrl: activeBridge,
    });

    const res = await connect();
    if (res.success) {
      Alert.alert('Conexión Exitosa', res.message);
    } else {
      Alert.alert('Error de Conexión', res.message);
    }
  };

  const handleClearConfig = () => {
    Alert.alert(
      'Limpiar Configuración y Caché Profunda',
      '¿Deseas purgar toda la configuración SQL, tokens de sesión y caché local? Esto restablecerá la conexión a su estado inicial limpio sin necesidad de reinstalar la aplicación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar Todo',
          style: 'destructive',
          onPress: async () => {
            try {
              const defaults = SqlClient.getDefaultConfig();
              setHost(defaults.host);
              setPort(String(defaults.port));
              setDatabase(defaults.database);
              setUser(defaults.user);
              setPassword('');
              setEncrypt(defaults.encrypt);
              setEmulator(defaults.emulatorType as 'MSPro' | 'Louis');
              setBridgeUrl(defaults.bridgeUrl || SqlClient.DEFAULT_CLOUD_GATEWAY);

              // Purgado profundo en memoria, SecureStorage y AsyncStorage
              await resetDatabaseState();

              Alert.alert(
                'Caché y Conexión Limpiados',
                'Se han restablecido los valores por defecto y se han purgado todos los tokens y sesiones temporales. Ya puedes ingresar tus credenciales y conectar.'
              );
            } catch (err: any) {
              Alert.alert('Aviso', 'Configuración restablecida: ' + (err?.message || 'Limpieza completada'));
            }
          },
        },
      ]
    );
  };

  const handleChangePassword = async () => {
    const cleanCurrent = currentPwInput.trim();
    const cleanNew = newPwInput.trim();
    const cleanConfirm = confirmPwInput.trim();

    if (!cleanCurrent) {
      Alert.alert('Campo Requerido', 'Por favor ingresa tu contraseña actual.');
      return;
    }
    if (!cleanNew) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la nueva contraseña.');
      return;
    }
    if (cleanNew.length < 6) {
      Alert.alert('Contraseña Débil', 'La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      Alert.alert('No Coinciden', 'La nueva contraseña y su confirmación no coinciden.');
      return;
    }
    if (cleanCurrent === cleanNew) {
      Alert.alert('Sin Cambios', 'La nueva contraseña no puede ser idéntica a la contraseña actual.');
      return;
    }

    setIsChangingPw(true);
    try {
      const bridgeUrl = SqlClient.getBridgeUrl();
      const token = await SqlClient.getSessionToken();
      const res = await fetch(`${bridgeUrl}/api/auth/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Token': token || '',
        },
        body: JSON.stringify({
          email: userEmail,
          currentPassword: cleanCurrent,
          newPassword: cleanNew,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await AsyncStorage.removeItem('@mumanager_auth_password');
        Alert.alert('¡Éxito!', 'Tu contraseña ha sido actualizada correctamente.');
        setChangePwModalVisible(false);
        setCurrentPwInput('');
        setNewPwInput('');
        setConfirmPwInput('');
      } else {
        Alert.alert('Error al Actualizar', data.error || 'No se pudo actualizar la contraseña.');
      }
    } catch (e: any) {
      Alert.alert('Error de Red', e.message || 'No se pudo conectar con el servidor.');
    } finally {
      setIsChangingPw(false);
    }
  };

  const handleSecretTap = () => {
    setShowHwid(prev => !prev);
    secretTapCountRef.current += 1;
    if (secretTapTimerRef.current) {
      clearTimeout(secretTapTimerRef.current);
    }

    if (secretTapCountRef.current >= 7) {
      secretTapCountRef.current = 0;
      setAdminKeyInput('');
      setAdminAuthModalVisible(true);
    } else {
      secretTapTimerRef.current = setTimeout(() => {
        secretTapCountRef.current = 0;
      }, 3000);
    }
  };

  const handleAdminAuthSubmit = async () => {
    const key = adminKeyInput.trim();
    if (!key) {
      Alert.alert('Atención', 'Ingresa la clave maestra.');
      return;
    }

    setVerifyingAdminKey(true);
    try {
      const bridgeUrl = SqlClient.getBridgeUrl();

      const res = await fetch(`${bridgeUrl}/api/admin/devices`, {
        headers: {
          'X-Admin-Key': key,
        },
      });

      if (res.status === 401) {
        Alert.alert('Acceso Denegado', 'Clave maestra de administrador incorrecta.');
        return;
      }

      if (!res.ok) {
        throw new Error(`Error del servidor (${res.status})`);
      }

      await SqlClient.setStoredAdminKey(key);
      await AsyncStorage.removeItem('@mumanager_admin_key').catch(() => {});
      setIsAdminUnlocked(true);
      setAdminAuthModalVisible(false);
      setAdminKeyInput('');
      navigation.navigate('AppManager');
    } catch (e: any) {
      Alert.alert('Error de Verificación', e.message || 'No se pudo verificar la clave.');
    } finally {
      setVerifyingAdminKey(false);
    }
  };

  const handleCheckUpdatesManually = async () => {
    setIsCheckingUpdate(true);
    try {
      const hwid = licenseStatus.hwid || (await SecurityService.getDeviceHwid());
      const plan = licenseStatus.plan || 'DEMO';
      const key = licenseStatus.licenseKey || undefined;
      const res = await SqlClient.sendTelemetryPing(hwid, plan, key);
      RemoteConfigService.handleTelemetryPingResult(res);

      if (res.updateInfo && res.updateInfo.hasUpdate) {
        setUpdateModalManualVisible(true);
      } else if (!res.success && !res.updateInfo) {
        Alert.alert(
          'Error de Conexión',
          'No se pudo establecer conexión con la pasarela de control ni con el CDN de GitHub. Verifica tu conexión a Internet o el estado del servidor.'
        );
      } else {
        Alert.alert(
          'Sistema al Día',
          `Tu aplicación ya cuenta con la versión oficial más reciente (v${APP_VERSION}). No hay nuevas actualizaciones pendientes por el momento.`
        );
      }
    } catch (e: any) {
      Alert.alert(
        'Error de Conexión',
        'No se pudo conectar con el servidor de actualizaciones. Revisa tu conexión a Internet.'
      );
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleToggleBeta = async () => {
    if (remoteConfig.releaseChannel === 'BETA' || remoteConfig.betaStatus === 'APPROVED') {
      Alert.alert(
        'Canal Beta Activo',
        'Tu dispositivo ya está habilitado en el Canal Beta. Recibirás automáticamente las compilaciones de prueba anticipadas.'
      );
      return;
    }

    if (remoteConfig.betaStatus === 'PENDING') {
      Alert.alert(
        'Solicitud en Revisión',
        'Tu solicitud de acceso al Canal Beta ya fue enviada y se encuentra pendiente de aprobación por el administrador.'
      );
      return;
    }

    Alert.alert(
      'Programa Beta (Acceso Anticipado)',
      'Las versiones del Canal Beta contienen nuevas funciones experimentales antes del lanzamiento público oficial.\n\n¿Deseas solicitar acceso para este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Solicitar Acceso',
          onPress: async () => {
            setRequestingBeta(true);
            try {
              const res = await SqlClient.requestBetaAccess(
                userEmail,
                'Solicitud voluntaria de acceso anticipado desde APK'
              );
              if (res.success) {
                Alert.alert('Solicitud Enviada', res.message);
                RemoteConfigService.setLocalBetaStatus('PENDING');
                try {
                  const hwid = licenseStatus.hwid || (await SecurityService.getDeviceHwid());
                  const ping = await SqlClient.sendTelemetryPing(hwid, licenseStatus.plan || 'DEMO', licenseStatus.licenseKey || undefined);
                  RemoteConfigService.handleTelemetryPingResult(ping);
                } catch {}
              } else {
                Alert.alert('Aviso', res.message);
              }
            } catch (err: any) {
              Alert.alert('Error', err.message || 'No se pudo registrar la solicitud Beta.');
            } finally {
              setRequestingBeta(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={styles.container}
      imageStyle={{ opacity: 0.50 }}
      resizeMode="repeat"
    >
      <Header
        title="MU MANAGER PRO"
        subtitle="SEASON 6 • PANEL AJUSTES"
        showConnectionBadge={true}
        rightAction={isAdminUnlocked ? {
          icon: 'console',
          onPress: () => setDebugVisible(true),
        } : undefined}
      />

      {/* Selector de Secciones Temáticas con Texturas Nativas MU Season 6 */}
      <View style={styles.sectionTabRow}>
        {[
          { id: 'server', label: 'SERVIDOR', icon: 'server-network' },
          { id: 'security', label: 'SEGURIDAD', icon: 'shield-lock' },
          { id: 'system', label: 'SISTEMA', icon: 'cog' },
        ].map((tab) => {
          const isSel = activeSection === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.sectionTabTouch}
              onPress={() => setActiveSection(tab.id as any)}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={isSel ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={[styles.sectionTabBtn, isSel && styles.sectionTabBtnActive]}
                resizeMode="stretch"
              >
                <MuIcon
                  name={tab.icon as any}
                  size={16}
                  color={isSel ? '#EFD28D' : '#CDC6B9'}
                />
                <Text style={[styles.sectionTabText, isSel && styles.sectionTabTextActive]}>
                  {tab.label}
                </Text>
              </ImageBackground>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* BANNER IMAGEN DECORATIVA AMBIENTAL STITCH 15R */}
        <View style={styles.heroBanner}>
          <View style={styles.heroBannerHeader}>
            <View style={styles.goldDiamond} />
            <Text style={styles.heroBannerTitle}>CONFIGURACIÓN GENERAL</Text>
          </View>
          <Text style={styles.heroBannerSubtitle}>
            Panel de enlace central, licencias y protección de nodo
          </Text>
        </View>

        {/* ========================================================================= */}
        {/* SECCIÓN 1: SERVIDOR & SQL                                                 */}
        {/* ========================================================================= */}
        {activeSection === 'server' && (
          <>
            {/* Real SQL Session Card */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <Text style={styles.sectionTitle}>Sesión SQL Server</Text>
              <View style={styles.profileRow}>
                <View style={[styles.profileAvatar, { backgroundColor: isConnected ? 'rgba(46, 125, 50, 0.15)' : 'rgba(211, 47, 47, 0.15)' }]}>
                  <MuIcon
                    name={isConnected ? "database-check" : "database-off"}
                    size={28}
                    color={isConnected ? THEME.colors.accentGreenBright : THEME.colors.dangerRed}
                  />
                </View>
                <View style={styles.profileInfo}>
                  <Text style={styles.profileEmail}>
                    {isConnected ? `${config.user || 'sa'} @ ${config.database || 'MuOnline'}` : 'Sin Conexión Activa'}
                  </Text>
                  <Text style={styles.profileRole}>
                    {isConnected ? `Host: ${config.host}:${config.port} (TDS 1433)` : 'Configura la IP y presiona Conectar'}
                  </Text>
                </View>
              </View>
            </Panel>

            {/* Emulator Selector Section */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <Text style={styles.sectionTitle}>{t('emulatorSection')}</Text>
              <View style={styles.emuRow}>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setEmulator('MSPro')}
                  activeOpacity={0.8}
                >
                  <ImageBackground
                    source={emulator === 'MSPro' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.emuBtn}
                    resizeMode="stretch"
                  >
                    <MuIcon
                      name="shield-check"
                      size={20}
                      color={emulator === 'MSPro' ? '#FEDF99' : THEME.colors.primaryOrange}
                    />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={[styles.emuTitle, emulator === 'MSPro' && styles.emuTextActive]}>
                        MSPro
                      </Text>
                      <Text style={[styles.emuSub, emulator === 'MSPro' && styles.emuSubActive]}>MSPro Season 6 Emulator</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setEmulator('Louis')}
                  activeOpacity={0.8}
                >
                  <ImageBackground
                    source={emulator === 'Louis' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.emuBtn}
                    resizeMode="stretch"
                  >
                    <MuIcon
                      name="code-braces"
                      size={20}
                      color={emulator === 'Louis' ? '#FEDF99' : THEME.colors.primaryOrange}
                    />
                    <View style={{ marginLeft: 8, flex: 1 }}>
                      <Text style={[styles.emuTitle, emulator === 'Louis' && styles.emuTextActive]}>
                        Louis
                      </Text>
                      <Text style={[styles.emuSub, emulator === 'Louis' && styles.emuSubActive]}>Louis MU Emulator</Text>
                    </View>
                  </ImageBackground>
                </TouchableOpacity>
              </View>
            </Panel>

            {/* SQL Server Connection Form */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <Text style={styles.sectionTitle}>{t('sqlSection')}</Text>

              {/* Host IP with quick buttons */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('serverIp')}</Text>
                <TextInput
                  style={styles.input}
                  value={host}
                  onChangeText={handleHostChange}
                  editable={true}
                  placeholder="IP de tu VPS o servidor"
                  placeholderTextColor={THEME.colors.textMuted}
                  autoCapitalize="none"
                />
                {/* Quick shortcuts */}
                <View style={styles.quickIpRow}>
                  <Text style={styles.quickIpLabel}>{t('quickIp')}:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {quickIps.map((ip) => (
                      <TouchableOpacity
                        key={ip}
                        style={{ borderRadius: 2, overflow: 'hidden', marginRight: 6 }}
                        onPress={() => handleHostChange(ip)}
                        activeOpacity={0.8}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.tabs.tabModeInactive}
                          style={styles.quickIpBtn}
                          resizeMode="stretch"
                        >
                          <Text style={styles.quickIpText}>{ip}</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Port and Database Name */}
              <View style={styles.row2}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t('serverPort')}</Text>
                  <TextInput
                    style={styles.input}
                    value={port}
                    onChangeText={setPort}
                    placeholder="1433"
                    placeholderTextColor={THEME.colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 2, marginLeft: 12 }]}>
                  <Text style={styles.label}>{t('databaseName')}</Text>
                  <TextInput
                    style={styles.input}
                    value={database}
                    onChangeText={setDatabase}
                    placeholder="MuOnline"
                    placeholderTextColor={THEME.colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              {/* User and Password */}
              <View style={styles.row2}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.label}>{t('sqlUser')}</Text>
                  <TextInput
                    style={styles.input}
                    value={user}
                    onChangeText={setUser}
                    editable={true}
                    placeholder="sa"
                    placeholderTextColor={THEME.colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>{t('sqlPassword')}</Text>
                  <View style={{ position: 'relative', justifyContent: 'center' }}>
                    <TextInput
                      style={[styles.input, { paddingRight: 36 }]}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={THEME.colors.textMuted}
                      secureTextEntry={!showSqlPassword}
                    />
                    <TouchableOpacity
                      onPress={() => setShowSqlPassword(!showSqlPassword)}
                      style={{ position: 'absolute', right: 8, padding: 4 }}
                      accessibilityLabel="Mostrar u ocultar contraseña SQL"
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <MuIcon
                        name={showSqlPassword ? 'eye-off' : 'eye'}
                        size={18}
                        color={THEME.colors.textoSecundario}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* SSL Switch */}
              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>{t('sslSwitch')}</Text>
                  <Text style={styles.switchDesc}>Cifra paquetes de datos TDS en tránsito</Text>
                </View>
                <Switch
                  value={encrypt}
                  onValueChange={setEncrypt}
                  trackColor={{ false: '#333333', true: THEME.colors.primaryOrange }}
                />
              </View>

              {/* Connect & Clear Action Buttons */}
              <View style={styles.buttonsRow}>
                <BotonOro
                  titulo={isConnecting ? 'Conectando...' : t('btnConnect')}
                  onPress={handleConnect}
                  cargando={isConnecting}
                  altura={48}
                  style={{ flex: 2 }}
                />
                <BotonPiedra
                  titulo="Limpiar"
                  onPress={handleClearConfig}
                  altura={48}
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </Panel>

            {/* PASO 5: Perfiles de Servidor (Multi-Server) */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>PERFILES DE SERVIDOR (MAX 5)</Text>
                <View style={styles.versionPill}>
                  <Text style={styles.versionPillText}>{serverProfiles.length} / 5 Guardados</Text>
                </View>
              </View>
              <Text style={styles.settingDescText}>
                Guarda diferentes conexiones (Test, Producción, VPS) y cámbialas al instante sin reescribir credenciales.
              </Text>

              {serverProfiles.length === 0 ? (
                <View style={styles.emptyProfilesBox}>
                  <MuIcon name="server-network-off" size={24} color={THEME.colors.textMuted} />
                  <Text style={styles.emptyProfilesText}>No tienes perfiles guardados aún.</Text>
                </View>
              ) : (
                serverProfiles.map((p) => (
                  <View key={p.id} style={styles.profileItemRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.profileItemTitle}>{p.name}</Text>
                        <View style={styles.profileItemBadge}>
                          <Text style={styles.profileItemBadgeText}>{p.emulatorType === 'Louis' ? 'Louis' : 'MSPro'}</Text>
                        </View>
                      </View>
                      <Text style={styles.profileItemSub} numberOfLines={1}>
                        {p.host}:{p.port} • DB: {p.database} ({p.user})
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                      <MuButton
                        titulo="Cargar"
                        onPress={() => handleLoadProfile(p)}
                        icono="cloud-upload-outline"
                        altura={34}
                        compacto
                        variante="primary"
                        style={{ minWidth: 80 }}
                      />
                      <TouchableOpacity
                        style={{ borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => handleDeleteProfile(p.id, p.name)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={styles.profileDeleteBtn}
                          resizeMode="stretch"
                        >
                          <MuIcon name="trash-can-outline" size={16} color={THEME.colors.dangerRed} />
                        </ImageBackground>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <BotonPiedra
                titulo="Guardar Configuración Actual como Perfil"
                icono="content-save"
                onPress={() => {
                  if (serverProfiles.length >= 5) {
                    Alert.alert('Límite alcanzado', 'Solo puedes guardar hasta 5 perfiles.');
                    return;
                  }
                  setNewProfileName(`Servidor ${serverProfiles.length + 1}`);
                  setSaveProfileModalVisible(true);
                }}
                disabled={serverProfiles.length >= 5}
                altura={44}
                style={{ marginTop: 8 }}
              />
            </Panel>

            {/* Network and Firewall Reminder Card */}
            <View style={styles.networkNoticeCard}>
              <MuIcon name="shield-alert-outline" size={24} color={THEME.colors.primaryOrange} />
              <View style={styles.networkNoticeContent}>
                <Text style={styles.networkNoticeTitle}>{t('networkNoticeTitle')}</Text>
                <Text style={styles.networkNoticeDesc}>{t('networkNoticeDesc')}</Text>
              </View>
            </View>
          </>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 2: SEGURIDAD & CONTROL                                            */}
        {/* ========================================================================= */}
        {activeSection === 'security' && (
          <>
            {/* PASO 4: Seguridad de Acceso (PIN 4 Dígitos) */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>SEGURIDAD DE ACCESO (PIN)</Text>
                <View style={[
                  styles.versionPill,
                  hasPinConfigured ? styles.pinPillActive : styles.pinPillInactive
                ]}>
                  <Text style={[
                    styles.versionPillText,
                    hasPinConfigured ? styles.pinPillTextActive : styles.pinPillTextInactive
                  ]}>
                    {hasPinConfigured ? 'PROTEGIDO CON PIN' : 'SIN PIN'}
                  </Text>
                </View>
              </View>
              <Text style={styles.settingDescText}>
                Solicita un PIN numérico de 4 dígitos cada vez que se abra la aplicación para evitar accesos no autorizados a la base de datos.
              </Text>

              <View style={styles.pinActionRow}>
                {hasPinConfigured ? (
                  <>
                    <BotonOro
                      titulo="Cambiar PIN"
                      icono="lock-reset"
                      onPress={() => {
                        setNewPinInput('');
                        setConfirmPinInput('');
                        setPinModalVisible(true);
                      }}
                      altura={44}
                      style={{ flex: 1 }}
                    />
                    <BotonBrasa
                      titulo="Desactivar"
                      icono="lock-open-variant-outline"
                      onPress={handleDisablePin}
                      altura={44}
                      style={{ minWidth: 110 }}
                    />
                  </>
                ) : (
                  <BotonOro
                    titulo="Activar Bloqueo por PIN (4 Dígitos)"
                    icono="shield-lock-outline"
                    onPress={() => {
                      setNewPinInput('');
                      setConfirmPinInput('');
                      setPinModalVisible(true);
                    }}
                    altura={46}
                    style={{ flex: 1 }}
                  />
                )}
              </View>
            </Panel>

            {/* PASO 6: Control de Límite de Cuentas por IP */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>CONTROL DE LÍMITE DE IP</Text>
                <Switch
                  value={ipLimitEnabled}
                  onValueChange={(val) => handleSaveIpLimit(val, ipLimitMax, ipLimitAction)}
                  trackColor={{ false: '#333333', true: THEME.colors.primaryOrange }}
                />
              </View>
              <Text style={styles.settingDescText}>
                Detecta o desconecta jugadores que excedan el límite de clientes simultáneos desde la misma dirección IP.
              </Text>

              {ipLimitEnabled && (
                <View style={styles.ipLimitOptionsBox}>
                  <View style={styles.ipLimitStepperRow}>
                    <Text style={styles.ipLimitLabel}>Cuentas Máximas por IP:</Text>
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={{ borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => {
                          const cur = parseInt(ipLimitMax, 10) || 3;
                          if (cur > 1) handleSaveIpLimit(true, String(cur - 1), ipLimitAction);
                        }}
                        activeOpacity={0.8}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={styles.stepperBtn}
                          resizeMode="stretch"
                        >
                          <MuIcon name="minus" size={16} color="#CDC6B9" />
                        </ImageBackground>
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{ipLimitMax}</Text>
                      <TouchableOpacity
                        style={{ borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => {
                          const cur = parseInt(ipLimitMax, 10) || 3;
                          if (cur < 20) handleSaveIpLimit(true, String(cur + 1), ipLimitAction);
                        }}
                        activeOpacity={0.8}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={styles.stepperBtn}
                          resizeMode="stretch"
                        >
                          <MuIcon name="plus" size={16} color="#CDC6B9" />
                        </ImageBackground>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.ipLimitLabel, { marginTop: 12, marginBottom: 8 }]}>Acción en Exceso:</Text>
                  <View style={styles.ipLimitActionRow}>
                    <TouchableOpacity
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => handleSaveIpLimit(true, ipLimitMax, 'LOG')}
                      activeOpacity={0.8}
                    >
                      <ImageBackground
                        source={ipLimitAction === 'LOG' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.ipActionBtn}
                        resizeMode="stretch"
                      >
                        <MuIcon
                          name="file-document-outline"
                          size={16}
                          color={ipLimitAction === 'LOG' ? '#FEDF99' : THEME.colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.ipActionBtnText, ipLimitAction === 'LOG' && styles.ipActionBtnTextActive]}>
                          Solo Registrar (Log)
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => handleSaveIpLimit(true, ipLimitMax, 'DISCONNECT')}
                      activeOpacity={0.8}
                    >
                      <ImageBackground
                        source={ipLimitAction === 'DISCONNECT' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.ipActionBtn}
                        resizeMode="stretch"
                      >
                        <MuIcon
                          name="account-off"
                          size={16}
                          color={ipLimitAction === 'DISCONNECT' ? '#FEDF99' : THEME.colors.textMuted}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={[styles.ipActionBtnText, ipLimitAction === 'DISCONNECT' && styles.ipActionBtnTextActive]}>
                          Desconectar Excedentes
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>

                  {/* Botón de Ejecución Inmediata */}
                  <MuButton
                    titulo={
                      ipLimitAction === 'DISCONNECT'
                        ? 'Chequear y Desconectar Excedentes Ahora'
                        : 'Escanear y Reportar IPs Excedidas Ahora'
                    }
                    icono={ipLimitAction === 'DISCONNECT' ? 'shield-account' : 'shield-search'}
                    onPress={() => handleRunIpLimitNow()}
                    variante={ipLimitAction === 'DISCONNECT' ? 'danger' : 'primary'}
                    disabled={checkingIpLimit}
                    cargando={checkingIpLimit}
                    altura={46}
                    style={{ marginTop: 14 }}
                  />
                </View>
              )}
            </Panel>

            {/* License & Activation Section */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <Text style={styles.sectionTitle}>LICENCIA Y SEGURIDAD</Text>
              <View style={styles.licenseRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.licenseBadgeRow}>
                    <Text style={styles.licenseTitle}>Estado:</Text>
                    <View style={[styles.licensePill, licenseStatus.plan === 'PRO' ? styles.pillPro : styles.pillDemo]}>
                      <Text style={[styles.licensePillText, licenseStatus.plan === 'PRO' ? styles.pillTextPro : styles.pillTextDemo]}>
                        {licenseStatus.plan === 'PRO'
                          ? (licenseStatus.isLifetime || !licenseStatus.expiresAt
                              ? 'PRO VITALICIA'
                              : (licenseStatus.hoursRemaining !== undefined && licenseStatus.hoursRemaining < 24
                                  ? `PRO (${licenseStatus.hoursRemaining}h)`
                                  : (licenseStatus.daysRemaining !== undefined
                                      ? `PRO (${licenseStatus.daysRemaining}d)`
                                      : 'PRO ACTIVA')))
                          : 'MODO DEMO'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleSecretTap}>
                    <Text style={styles.hwidSmall} numberOfLines={1}>
                      HWID: {showHwid ? (licenseStatus.hwid || 'N/A') : `CEL-••••-••••-${(licenseStatus.hwid || '').slice(-4) || '••••'} (Toca para ver)`}
                    </Text>
                  </TouchableOpacity>
                </View>
                <BotonOro
                  titulo={licenseStatus.plan === 'PRO' ? 'Ver Licencia' : 'Activar PRO'}
                  onPress={() => setLicenseModalVisible(true)}
                  altura={40}
                  style={{ minWidth: 120 }}
                />
              </View>
            </Panel>
          </>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 3: SISTEMA & SOPORTE                                              */}
        {/* ========================================================================= */}
        {activeSection === 'system' && (
          <>
            {/* Actualizaciones y Versión del Sistema */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>ACTUALIZACIONES Y SISTEMA</Text>
                <View style={styles.versionPill}>
                  <Text style={styles.versionPillText}>v{APP_VERSION} (TEST)</Text>
                </View>
              </View>

              <View style={styles.updateCardBody}>
                <View style={styles.updateRow}>
                  <View style={[styles.updateIconBox, { backgroundColor: remoteConfig.updateInfo?.hasUpdate ? 'rgba(255, 87, 34, 0.15)' : 'rgba(46, 125, 50, 0.15)' }]}>
                    <MuIcon
                      name={remoteConfig.updateInfo?.hasUpdate ? "cloud-download" : "check-decagram"}
                      size={24}
                      color={remoteConfig.updateInfo?.hasUpdate ? THEME.colors.primaryOrange : THEME.colors.accentGreenBright}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.updateStatusTitle}>
                      {remoteConfig.updateInfo?.hasUpdate
                        ? `¡Actualización v${remoteConfig.updateInfo.latestVersion} disponible!`
                        : 'Mu Manager PRO está actualizado'}
                    </Text>
                    <Text style={styles.updateStatusSub}>
                      {remoteConfig.updateInfo?.hasUpdate
                        ? 'Hay una versión más reciente con nuevas mejoras críticas.'
                        : `Versión instalada: ${APP_DISPLAY_VERSION}`}
                    </Text>
                  </View>
                </View>

                <View style={styles.updateButtonsRow}>
                  <BotonPiedra
                    titulo="Buscar Actualizaciones"
                    icono="sync"
                    onPress={handleCheckUpdatesManually}
                    disabled={isCheckingUpdate}
                    cargando={isCheckingUpdate}
                    altura={44}
                    style={{ flex: 1 }}
                  />

                  {remoteConfig.updateInfo?.hasUpdate && (
                    <BotonOro
                      titulo={`Instalar v${remoteConfig.updateInfo.latestVersion}`}
                      icono="download"
                      onPress={() => setUpdateModalManualVisible(true)}
                      altura={44}
                      style={{ flex: 1 }}
                    />
                  )}
                </View>
              </View>
            </Panel>

            {/* Programa Beta y Canal de Despliegue */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>CANAL DE ACTUALIZACIÓN (BETA)</Text>
                <View style={[styles.versionPill, { backgroundColor: remoteConfig.releaseChannel === 'BETA' ? 'rgba(232, 200, 106, 0.2)' : 'rgba(91, 141, 239, 0.15)' }]}>
                  <Text style={[styles.versionPillText, { color: remoteConfig.releaseChannel === 'BETA' ? THEME.colors.oroClaro : THEME.colors.arcano }]}>
                    {remoteConfig.releaseChannel === 'BETA' ? 'Canal Beta' : 'Canal Estable'}
                  </Text>
                </View>
              </View>

              <View style={styles.updateCardBody}>
                <View style={styles.updateRow}>
                  <View style={[styles.updateIconBox, { backgroundColor: remoteConfig.releaseChannel === 'BETA' ? 'rgba(232, 200, 106, 0.15)' : 'rgba(255, 255, 255, 0.05)' }]}>
                    <MuIcon
                      name={remoteConfig.releaseChannel === 'BETA' ? "flask-round-bottom" : "shield-check"}
                      size={24}
                      color={remoteConfig.releaseChannel === 'BETA' ? THEME.colors.oroClaro : THEME.colors.textSecondary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.updateStatusTitle}>
                      {remoteConfig.releaseChannel === 'BETA'
                        ? 'Evaluador Beta Certificado'
                        : remoteConfig.betaStatus === 'PENDING'
                        ? 'Solicitud Beta en Revisión'
                        : 'Canal Oficial Estable'}
                    </Text>
                    <Text style={styles.updateStatusSub}>
                      {remoteConfig.releaseChannel === 'BETA'
                        ? 'Tienes acceso anticipado prioritario a compilaciones de prueba antes del público general.'
                        : remoteConfig.betaStatus === 'PENDING'
                        ? 'Tu dispositivo está registrado en la lista de espera del administrador para el próximo lote.'
                        : 'Recibes únicamente versiones estables certificadas y auditadas para producción.'}
                    </Text>
                  </View>
                </View>

                {remoteConfig.releaseChannel !== 'BETA' && (
                  <MuButton
                    titulo={remoteConfig.betaStatus === 'PENDING' ? 'En Espera de Aprobación' : 'Solicitar Acceso al Canal Beta'}
                    icono={remoteConfig.betaStatus === 'PENDING' ? 'clock-outline' : 'flask-outline'}
                    onPress={handleToggleBeta}
                    disabled={requestingBeta || remoteConfig.betaStatus === 'PENDING'}
                    cargando={requestingBeta}
                    variante={remoteConfig.betaStatus === 'PENDING' ? 'secondary' : 'primary'}
                    altura={44}
                    style={{ marginTop: 12, width: '100%' }}
                  />
                )}
              </View>
            </Panel>

            {/* Language Selector Section */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <Text style={styles.sectionTitle}>{t('languageSection')}</Text>
              <View style={styles.langRow}>
                {LANGUAGES.map((l) => {
                  const active = l.code === language;
                  return (
                    <TouchableOpacity
                      key={l.code}
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setLanguage(l.code)}
                      activeOpacity={0.8}
                    >
                      <ImageBackground
                        source={active ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.langBtn}
                        resizeMode="stretch"
                      >
                        <Text style={styles.flagText}>{l.flag}</Text>
                        <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>
                          {l.name}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Panel>

            {/* User Account & Session Section */}
            <Panel variant="box" style={styles.card}>
              <MuCornerOrnaments size={12} />
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MuIcon name="account-circle" size={24} color={THEME.colors.primaryOrange} />
                  <Text style={styles.sectionTitle}>Cuenta de Usuario</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(63, 207, 142, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: 'rgba(63, 207, 142, 0.3)' }}>
                  <Text style={{ color: THEME.colors.jade, fontSize: 10, fontWeight: '700' }}>SESIÓN ACTIVA</Text>
                </View>
              </View>

              <View style={{ backgroundColor: THEME.colors.deepForge, padding: 12, borderRadius: 2, marginBottom: 14, borderWidth: 1, borderColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Usuario Conectado</Text>
                <Text style={{ color: THEME.colors.texto, fontSize: 14, fontWeight: '700' }}>{userEmail || 'Usuario'}</Text>
              </View>

              {/* Botón Cambiar Contraseña */}
              <BotonOro
                titulo="Cambiar Mi Contraseña"
                icono="lock-reset"
                onPress={() => setChangePwModalVisible(true)}
                altura={44}
                style={{ marginBottom: 10 }}
              />

              {/* Botón Ver Términos y Condiciones */}
              <BotonPiedra
                titulo="Ver Términos y Condiciones"
                icono="file-document-outline"
                onPress={() => setTermsModalVisible(true)}
                altura={44}
                style={{ marginBottom: 12 }}
              />

              <BotonBrasa
                titulo="Cerrar Sesión"
                icono="logout"
                onPress={() => {
                  Alert.alert(
                    'Cerrar Sesión',
                    '¿Estás seguro de que deseas cerrar tu sesión en este celular?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      {
                        text: 'Cerrar Sesión',
                        style: 'destructive',
                        onPress: async () => {
                          await logout();
                        }
                      }
                    ]
                  );
                }}
                altura={44}
              />
            </Panel>

            {/* Debug Panel Shortcut Banner (Solo visible cuando la administración está desbloqueada) */}
            {isAdminUnlocked && (
              <TouchableOpacity style={styles.debugBanner} onPress={() => setDebugVisible(true)}>
                <View style={styles.debugLeft}>
                  <MuIcon name="console-network" size={24} color={THEME.colors.primaryOrange} />
                  <View>
                    <Text style={styles.debugTitle}>{t('debugPanel')}</Text>
                    <Text style={styles.debugSubtitle}>Diagnóstico de red, latencia y telemetría operativa</Text>
                  </View>
                </View>
                <MuIcon name="chevron-right" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            )}

            {/* Canales Oficiales y Soporte ToolForg3 */}
            <View style={styles.brandingFooterConfig}>
              <View style={styles.officialChannelsRow}>
                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(DISCORD_URL).catch(() => Alert.alert('Discord', `Servidor oficial: ${DISCORD_URL}`))}
                >
                  <ImageBackground
                    source={STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.channelButtonConfig}
                    resizeMode="stretch"
                  >
                    <MuIcon name={"discord" as any} size={16} color="#5865F2" style={{ marginRight: 6 }} />
                    <Text style={styles.channelButtonTextConfig}>Discord Oficial</Text>
                  </ImageBackground>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL(TELEGRAM_URL).catch(() => Alert.alert('Telegram', `Canal oficial: ${TELEGRAM_URL}`))}
                >
                  <ImageBackground
                    source={STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.channelButtonConfig}
                    resizeMode="stretch"
                  >
                    <MuIcon name={"send" as any} size={16} color="#5B8DEF" style={{ marginRight: 6 }} />
                    <Text style={styles.channelButtonTextConfig}>Telegram Canal</Text>
                  </ImageBackground>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                activeOpacity={0.8}
                onPress={() => {
                  Alert.alert(
                    'Soporte por WhatsApp',
                    '¿Deseas incluir el identificador de tu dispositivo (HWID) en el mensaje para agilizar la atención?',
                    [
                      {
                        text: 'No incluir',
                        onPress: () => {
                          const text = `Hola Soporte ToolForg3! Me comunico desde MuManager PRO (v${APP_VERSION}).`;
                          const url = `https://wa.me/5521971217376?text=${encodeURIComponent(text)}`;
                          Linking.openURL(url).catch(() => Alert.alert('WhatsApp', 'Soporte oficial: +55 21 97121-7376'));
                        }
                      },
                      {
                        text: 'Incluir HWID',
                        onPress: () => {
                          const hwidCode = licenseStatus.hwid || 'N/A';
                          const text = `Hola Soporte ToolForg3! Me comunico desde MuManager PRO (v${APP_VERSION}).\n\nHWID: ${hwidCode}`;
                          const url = `https://wa.me/5521971217376?text=${encodeURIComponent(text)}`;
                          Linking.openURL(url).catch(() => Alert.alert('WhatsApp', 'Soporte oficial: +55 21 97121-7376'));
                        }
                      }
                    ]
                  );
                }}
              >
                <ImageBackground
                  source={STITCH_ASSETS.tabs.tabModeInactive}
                  style={styles.whatsappButtonConfig}
                  resizeMode="stretch"
                >
                  <MuIcon name={"whatsapp" as any} size={16} color="#3FCF8E" style={{ marginRight: 6 }} />
                  <Text style={styles.whatsappButtonTextConfig}>WhatsApp Soporte Técnico</Text>
                </ImageBackground>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSecretTap}
                style={styles.versionFooterBox}
              >
                <View style={styles.producedByBadge}>
                  <MuIcon name="code-tags" size={14} color="#E0C380" style={{ marginRight: 5 }} />
                  <Text style={styles.producedByBadgeText}>PRODUCIDO POR TOOLFORG3</Text>
                </View>
                <Text style={styles.brandingFooterVersionText}>
                  Mu Manager PRO v{APP_VERSION} • Build {APP_BUILD}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Guardar Perfil */}
      <Modal visible={saveProfileModalVisible} transparent animationType="fade">
        <View style={styles.adminModalOverlay}>
          <View style={styles.adminModalContent}>
            <View style={styles.adminModalHeader}>
              <View style={styles.adminModalIconWrap}>
                <MuIcon name="server-plus" size={24} color={THEME.colors.primaryOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminModalTitle}>Guardar Perfil</Text>
                <Text style={styles.adminModalSubtitle}>Conexión Actual ({host}:{port})</Text>
              </View>
            </View>
            <Text style={styles.adminModalDesc}>
              Asigna un nombre para identificar este servidor en tu lista rápida:
            </Text>
            <TextInput
              style={styles.adminModalInput}
              placeholder="Ej: Servidor VPS Producción"
              placeholderTextColor={THEME.colors.textMuted}
              value={newProfileName}
              onChangeText={setNewProfileName}
              maxLength={30}
              autoFocus
            />
            <View style={styles.adminModalButtons}>
              <BotonPiedra
                titulo="Cancelar"
                onPress={() => setSaveProfileModalVisible(false)}
                altura={38}
                style={{ minWidth: 90 }}
              />
              <BotonOro
                titulo="Guardar"
                onPress={handleSaveProfile}
                altura={38}
                style={{ minWidth: 90 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Configurar PIN */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.adminModalOverlay}>
          <View style={styles.adminModalContent}>
            <View style={styles.adminModalHeader}>
              <View style={styles.adminModalIconWrap}>
                <MuIcon name="shield-key" size={24} color={THEME.colors.primaryOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminModalTitle}>Establecer PIN</Text>
                <Text style={styles.adminModalSubtitle}>Bloqueo de Seguridad (4 dígitos)</Text>
              </View>
            </View>
            <Text style={styles.adminModalDesc}>
              Ingresa el nuevo código PIN numérico de 4 dígitos:
            </Text>
            <TextInput
              style={styles.adminModalInput}
              placeholder="Nuevo PIN (4 dígitos)"
              placeholderTextColor={THEME.colors.textMuted}
              value={newPinInput}
              onChangeText={(v) => setNewPinInput(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
            />
            <TextInput
              style={styles.adminModalInput}
              placeholder="Confirmar PIN (4 dígitos)"
              placeholderTextColor={THEME.colors.textMuted}
              value={confirmPinInput}
              onChangeText={(v) => setConfirmPinInput(v.replace(/\D/g, '').slice(0, 4))}
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
            />
            <View style={styles.adminModalButtons}>
              <BotonPiedra
                titulo="Cancelar"
                onPress={() => setPinModalVisible(false)}
                altura={38}
                style={{ minWidth: 90 }}
              />
              <BotonOro
                titulo="Guardar PIN"
                onPress={handleSavePin}
                altura={38}
                style={{ minWidth: 100 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Debug Panel Modal */}
      <DebugPanelModal visible={debugVisible} onClose={() => setDebugVisible(false)} />

      {/* License Modal */}
      <LicenseModal visible={licenseModalVisible} onClose={() => setLicenseModalVisible(false)} />

      {/* Manual Update Modal */}
      <UpdateModal
        visible={updateModalManualVisible}
        updateInfo={remoteConfig.updateInfo}
      />

      {/* Secret Admin Master Key Modal (Option B) */}
      <Modal visible={adminAuthModalVisible} transparent animationType="fade">
        <View style={styles.adminModalOverlay}>
          <View style={styles.adminModalContent}>
            <View style={styles.adminModalHeader}>
              <View style={styles.adminModalIconWrap}>
                <MuIcon name="shield-lock" size={26} color={THEME.colors.primaryOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminModalTitle}>Acceso Administrador</Text>
                <Text style={styles.adminModalSubtitle}>Consola de Control de Celulares</Text>
              </View>
            </View>
            <Text style={styles.adminModalDesc}>
              Ingresa la clave maestra del servidor para acceder a la gestión y telemetría de dispositivos:
            </Text>
            <TextInput
              style={styles.adminModalInput}
              placeholder="Clave Maestra de Administrador"
              placeholderTextColor={THEME.colors.textMuted}
              value={adminKeyInput}
              onChangeText={setAdminKeyInput}
              secureTextEntry
              autoCapitalize="none"
              autoFocus
            />
            <View style={styles.adminModalButtons}>
              <BotonPiedra
                titulo="Cancelar"
                onPress={() => {
                  setAdminAuthModalVisible(false);
                  setAdminKeyInput('');
                }}
                altura={38}
                style={{ minWidth: 90 }}
              />
              <BotonOro
                titulo="Acceder"
                onPress={handleAdminAuthSubmit}
                disabled={verifyingAdminKey}
                cargando={verifyingAdminKey}
                altura={38}
                style={{ minWidth: 90 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cambiar Contraseña del Usuario */}
      <Modal visible={changePwModalVisible} transparent animationType="fade" onRequestClose={() => setChangePwModalVisible(false)}>
        <View style={styles.adminModalOverlay}>
          <View style={styles.adminModalContent}>
            <View style={styles.adminModalHeader}>
              <View style={styles.adminModalIconWrap}>
                <MuIcon name="lock-reset" size={24} color={THEME.colors.primaryOrange} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.adminModalTitle}>Cambiar Contraseña</Text>
                <Text style={styles.adminModalSubtitle}>{userEmail || 'Cuenta de Administrador'}</Text>
              </View>
              <TouchableOpacity onPress={() => setChangePwModalVisible(false)} style={{ padding: 4 }}>
                <MuIcon name="close" size={20} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            <Text style={styles.adminModalDesc}>
              Ingresa tu contraseña actual y define una nueva clave de acceso de al menos 8 caracteres:
            </Text>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: THEME.colors.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: '700' }}>Contraseña Actual</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.casillaFondo, borderWidth: 1, borderColor: THEME.colors.borde, borderRadius: 2, paddingHorizontal: 10 }}>
                <TextInput
                  style={{ flex: 1, color: THEME.colors.texto, paddingVertical: 8, fontSize: 14 }}
                  placeholder="Tu contraseña actual"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={currentPwInput}
                  onChangeText={setCurrentPwInput}
                  secureTextEntry={!showCurrentPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowCurrentPw(!showCurrentPw)} style={{ padding: 6 }}>
                  <MuIcon name={showCurrentPw ? "eye-off" : "eye"} size={18} color={THEME.colors.textoSecundario} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: THEME.colors.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: '700' }}>Nueva Contraseña (mínimo 8 caracteres)</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.casillaFondo, borderWidth: 1, borderColor: THEME.colors.borde, borderRadius: 2, paddingHorizontal: 10 }}>
                <TextInput
                  style={{ flex: 1, color: THEME.colors.texto, paddingVertical: 8, fontSize: 14 }}
                  placeholder="Nueva contraseña"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={newPwInput}
                  onChangeText={setNewPwInput}
                  secureTextEntry={!showNewPw}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowNewPw(!showNewPw)} style={{ padding: 6 }}>
                  <MuIcon name={showNewPw ? "eye-off" : "eye"} size={18} color={THEME.colors.textoSecundario} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 11, color: THEME.colors.textMuted, marginBottom: 4, textTransform: 'uppercase', fontWeight: '700' }}>Confirmar Nueva Contraseña</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.colors.casillaFondo, borderWidth: 1, borderColor: THEME.colors.borde, borderRadius: 2, paddingHorizontal: 10 }}>
                <TextInput
                  style={{ flex: 1, color: THEME.colors.texto, paddingVertical: 8, fontSize: 14 }}
                  placeholder="Repite la nueva contraseña"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={confirmPwInput}
                  onChangeText={setConfirmPwInput}
                  secureTextEntry={!showNewPw}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.adminModalButtons}>
              <BotonPiedra
                titulo="Cancelar"
                onPress={() => {
                  setChangePwModalVisible(false);
                  setCurrentPwInput('');
                  setNewPwInput('');
                  setConfirmPwInput('');
                }}
                altura={38}
                style={{ minWidth: 90 }}
              />
              <BotonOro
                titulo="Guardar"
                onPress={handleChangePassword}
                disabled={isChangingPw}
                cargando={isChangingPw}
                altura={38}
                style={{ minWidth: 90 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Términos y Condiciones */}
      <TermsAndConditionsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 120,
  },
  sectionTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  sectionTabTouch: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
  },
  sectionTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: 4,
    borderRadius: 2,
    gap: 6,
  },
  sectionTabBtnActive: {
    shadowColor: '#EFD28D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  sectionTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#CDC6B9',
    ...THEME.effects.textShadowSubtle,
  },
  sectionTabTextActive: {
    color: '#EFD28D',
    fontWeight: '900',
    ...THEME.effects.textShadow,
  },
  heroBanner: {
    width: '100%',
    backgroundColor: THEME.colors.deepForge,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 12,
    marginBottom: 12,
  },
  heroBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  goldDiamond: {
    width: 8,
    height: 8,
    backgroundColor: '#EFD28D',
    transform: [{ rotate: '45deg' }],
  },
  heroBannerTitle: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 13,
    fontWeight: '700',
    color: '#EFD28D',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroBannerSubtitle: {
    fontFamily: THEME.typography.fontBody,
    fontSize: 11,
    color: '#BBB4A8',
    marginTop: 2,
  },
  card: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oroClaro,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    ...THEME.effects.textShadow,
  },
  langRow: {
    flexDirection: 'row',
    gap: 8,
  },
  langBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    minHeight: 44,
    gap: 6,
  },
  flagText: {
    fontSize: 18,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#CDC6B9',
    ...THEME.effects.textShadowSubtle,
  },
  langBtnTextActive: {
    color: '#FEDF99',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  debugBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
    marginBottom: 12,
    minHeight: 44,
  },
  debugLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oroClaro,
    letterSpacing: 0.5,
    ...THEME.effects.textShadow,
  },
  debugSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  emuRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 52,
  },
  emuTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E0C380',
    ...THEME.effects.textShadowSubtle,
  },
  emuTextActive: {
    color: '#FEDF99',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  emuSub: {
    fontSize: 10,
    color: '#A89E8C',
    marginTop: 2,
  },
  emuSubActive: {
    color: '#E0C380',
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  inputGroup: {
    marginBottom: 10,
  },
  label: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginBottom: 4,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: THEME.colors.casillaFondo,
    color: THEME.colors.texto,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    minHeight: 48,
  },
  quickIpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  quickIpLabel: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  quickIpBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIpText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#CDC6B9',
    ...THEME.effects.textShadowSubtle,
  },
  row2: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    marginTop: 4,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.textPrimary,
  },
  switchDesc: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  networkNoticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(255, 87, 34, 0.08)',
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.3)',
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    gap: 12,
  },
  networkNoticeContent: {
    flex: 1,
  },
  networkNoticeTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.primaryOrange,
    marginBottom: 2,
  },
  networkNoticeDesc: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    lineHeight: 16,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: THEME.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.textPrimary,
  },
  profileRole: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  licenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  licenseBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  licenseTitle: {
    fontSize: 12.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  licensePill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
  },
  pillDemo: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderColor: 'rgba(226, 112, 58, 0.65)',
  },
  pillPro: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderColor: 'rgba(63, 207, 142, 0.65)',
  },
  licensePillText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  pillTextDemo: {
    color: '#FFA87D',
    ...THEME.effects.textShadowSubtle,
  },
  pillTextPro: {
    color: '#5DF5B0',
    ...THEME.effects.textShadowSubtle,
  },
  hwidSmall: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 11,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  versionFooter: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: THEME.spacing.sm,
    marginBottom: THEME.spacing.lg,
  },
  versionFooterText: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 11,
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  adminModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  adminModalContent: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: THEME.colors.surface,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(255, 87, 34, 0.4)',
    padding: THEME.spacing.lg,
  },
  adminModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: THEME.spacing.sm,
  },
  adminModalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 2,
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminModalTitle: {
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.textPrimary,
  },
  adminModalSubtitle: {
    fontSize: 11,
    color: THEME.colors.primaryOrange,
    fontWeight: 'bold',
  },
  adminModalDesc: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginVertical: THEME.spacing.sm,
  },
  adminModalInput: {
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: THEME.colors.textPrimary,
    fontSize: 14,
    fontFamily: THEME.typography.fontMono,
    marginBottom: THEME.spacing.md,
  },
  adminModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  adminModalBtnCancel: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  adminModalBtnCancelText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    fontWeight: 'bold',
  },
  adminModalBtnSubmit: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: THEME.colors.oroClaro,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminModalBtnSubmitText: {
    fontSize: 13,
    color: THEME.colors.textoOscuro,
    fontWeight: 'bold',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  versionPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(63, 207, 142, 0.65)',
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#5DF5B0',
    ...THEME.effects.textShadowSubtle,
  },
  pinPillActive: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderColor: 'rgba(63, 207, 142, 0.65)',
  },
  pinPillInactive: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderColor: 'rgba(226, 112, 58, 0.65)',
  },
  pinPillTextActive: {
    color: '#5DF5B0',
    ...THEME.effects.textShadowSubtle,
  },
  pinPillTextInactive: {
    color: '#FFA87D',
    ...THEME.effects.textShadowSubtle,
  },
  updateCardBody: {
    marginTop: 4,
  },
  updateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  updateIconBox: {
    width: 44,
    height: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateStatusTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  updateStatusSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  updateButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  checkUpdateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  checkUpdateBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  downloadUpdateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.oroClaro,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  downloadUpdateBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textoOscuro,
  },
  settingDescText: {
    fontSize: 12.5,
    fontWeight: '500',
    color: THEME.colors.textoSecundarioLuminoso,
    marginBottom: THEME.spacing.sm,
    lineHeight: 18,
    ...THEME.effects.textShadowSubtle,
  },
  emptyProfilesBox: {
    padding: THEME.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    marginVertical: THEME.spacing.xs,
    gap: 6,
  },
  emptyProfilesText: {
    fontSize: 12,
    color: THEME.colors.textMuted,
  },
  profileItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.surface,
    padding: 10,
    borderRadius: THEME.borderRadius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  profileItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  profileItemBadge: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
  },
  profileItemBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: THEME.colors.primaryOrange,
  },
  profileItemSub: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginTop: 2,
    fontFamily: THEME.typography.fontMono,
  },
  profileLoadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.oroClaro,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.shapes.radioEsquina,
    gap: 4,
  },
  profileLoadBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.textoOscuro,
  },
  profileDeleteBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.shapes.radioEsquina,
    minHeight: 48,
    marginTop: 6,
  },
  addProfileBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  pinActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  pinChangeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.oroClaro,
    borderRadius: THEME.shapes.radioEsquina,
    minHeight: 48,
  },
  pinChangeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.textoOscuro,
  },
  pinDisableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 14,
    minHeight: 48,
  },
  pinDisableBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.dangerRed,
  },
  pinEnableBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.oroClaro,
    borderRadius: THEME.shapes.radioEsquina,
    minHeight: 48,
  },
  pinEnableBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: THEME.colors.textoOscuro,
  },
  ipLimitOptionsBox: {
    backgroundColor: THEME.colors.surface,
    padding: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 8,
  },
  ipLimitStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ipLimitLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  stepperBtn: {
    width: 34,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.primaryOrange,
    fontFamily: THEME.typography.fontMono,
  },
  ipLimitActionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  ipActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    minHeight: 40,
  },
  ipActionBtnText: {
    fontSize: 11,
    color: '#CDC6B9',
    fontWeight: 'bold',
    ...THEME.effects.textShadowSubtle,
  },
  ipActionBtnTextActive: {
    color: '#FEDF99',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowRadius: 2,
    textShadowOffset: { width: 0, height: 1 },
  },
  brandingFooterConfig: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 40,
    gap: 12,
  },
  officialChannelsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  channelButtonConfig: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    minHeight: 46,
    height: 46,
  },
  channelButtonTextConfig: {
    color: '#CDC6B9',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.3,
    ...THEME.effects.textShadowSubtle,
  },
  whatsappButtonConfig: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    minHeight: 46,
    height: 46,
  },
  whatsappButtonTextConfig: {
    color: '#CDC6B9',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.3,
    ...THEME.effects.textShadowSubtle,
  },
  versionFooterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 2,
    backgroundColor: '#1B1C1B',
    borderWidth: 1.2,
    borderColor: '#4C463A',
    width: '100%',
  },
  producedByBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 195, 128, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(224, 195, 128, 0.35)',
  },
  producedByBadgeText: {
    color: '#E0C380',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  brandingFooterVersionText: {
    color: THEME.colors.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  liveStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  liveStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5, /* círculo funcional (width/2) */
    backgroundColor: '#3FCF8E',
  },
  versionSubFooterText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '500',
  },
  maskedLockBtn: {
    position: 'absolute',
    right: 4,
    top: 2,
    bottom: 2,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
