import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  Modal,
  ActivityIndicator,
  Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { Header } from '../../components/common/Header';
import { CustomButton } from '../../components/common/CustomButton';
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
import { APP_VERSION, APP_BUILD, APP_DISPLAY_VERSION } from '../../constants/appVersion';
import { ServerProfile } from '../../types/admin';
import { logAdminAction } from '../../services/adminLog';

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
  const secretTapCountRef = useRef(0);
  const secretTapTimerRef = useRef<any>(null);

  useEffect(() => {
    const unsubLicense = LicenseService.subscribe(setLicenseStatus);
    const unsubRemote = RemoteConfigService.subscribe(setRemoteConfig);
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
  const [encrypt, setEncrypt] = useState(config?.encrypt ?? false);
  const [emulator, setEmulator] = useState<'MSPro' | 'Louis'>(config?.emulatorType === 'Louis' ? 'Louis' : 'MSPro');
  const [bridgeUrl, setBridgeUrl] = useState(
    (config?.bridgeUrl && !config.bridgeUrl.includes('onrender.com')) ? config.bridgeUrl : SqlClient.DEFAULT_CLOUD_GATEWAY
  );
  const [debugVisible, setDebugVisible] = useState(false);

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

  const handleSecretTap = () => {
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

      await AsyncStorage.setItem('@mumanager_admin_key', key);
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
      const res = await SqlClient.sendTelemetryPing(hwid, plan);
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
                  const ping = await SqlClient.sendTelemetryPing(hwid, licenseStatus.plan || 'DEMO');
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
    <View style={styles.container}>
      <Header
        title={t('configTitle')}
        subtitle="Ajustes de SQL Server y Emulador"
        showConnectionBadge={true}
        rightAction={{
          icon: 'console',
          onPress: () => setDebugVisible(true),
        }}
      />

      {/* Selector de Secciones Temáticas */}
      <View style={styles.sectionTabRow}>
        <TouchableOpacity
          style={[styles.sectionTabBtn, activeSection === 'server' && styles.sectionTabBtnActive]}
          onPress={() => setActiveSection('server')}
        >
          <MaterialCommunityIcons
            name="server-network"
            size={16}
            color={activeSection === 'server' ? THEME.colors.oro : THEME.colors.textoSecundario}
          />
          <Text style={[styles.sectionTabText, activeSection === 'server' && styles.sectionTabTextActive]}>
            Servidor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionTabBtn, activeSection === 'security' && styles.sectionTabBtnActive]}
          onPress={() => setActiveSection('security')}
        >
          <MaterialCommunityIcons
            name="shield-lock"
            size={16}
            color={activeSection === 'security' ? THEME.colors.oro : THEME.colors.textoSecundario}
          />
          <Text style={[styles.sectionTabText, activeSection === 'security' && styles.sectionTabTextActive]}>
            Seguridad
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.sectionTabBtn, activeSection === 'system' && styles.sectionTabBtnActive]}
          onPress={() => setActiveSection('system')}
        >
          <MaterialCommunityIcons
            name="cog"
            size={16}
            color={activeSection === 'system' ? THEME.colors.oro : THEME.colors.textoSecundario}
          />
          <Text style={[styles.sectionTabText, activeSection === 'system' && styles.sectionTabTextActive]}>
            Sistema
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ========================================================================= */}
        {/* SECCIÓN 1: SERVIDOR & SQL                                                 */}
        {/* ========================================================================= */}
        {activeSection === 'server' && (
          <>
            {/* Real SQL Session Card */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Sesión SQL Server</Text>
              <View style={styles.profileRow}>
                <View style={[styles.profileAvatar, { backgroundColor: isConnected ? 'rgba(46, 125, 50, 0.15)' : 'rgba(211, 47, 47, 0.15)' }]}>
                  <MaterialCommunityIcons
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
            </View>

            {/* Emulator Selector Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('emulatorSection')}</Text>
              <View style={styles.emuRow}>
                <TouchableOpacity
                  style={[styles.emuBtn, emulator === 'MSPro' && styles.emuBtnActive]}
                  onPress={() => setEmulator('MSPro')}
                >
                  <MaterialCommunityIcons
                    name="shield-check"
                    size={20}
                    color={emulator === 'MSPro' ? THEME.colors.primaryOrange : THEME.colors.textMuted}
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={[styles.emuTitle, emulator === 'MSPro' && styles.emuTextActive]}>
                      MSPro
                    </Text>
                    <Text style={styles.emuSub}>MSPro Season 6 Emulator</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.emuBtn, emulator === 'Louis' && styles.emuBtnActive]}
                  onPress={() => setEmulator('Louis')}
                >
                  <MaterialCommunityIcons
                    name="code-braces"
                    size={20}
                    color={emulator === 'Louis' ? THEME.colors.primaryOrange : THEME.colors.textMuted}
                  />
                  <View style={{ marginLeft: 8 }}>
                    <Text style={[styles.emuTitle, emulator === 'Louis' && styles.emuTextActive]}>
                      Louis
                    </Text>
                    <Text style={styles.emuSub}>Louis MU Emulator</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* SQL Server Connection Form */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('sqlSection')}</Text>

              {/* Host IP with quick buttons */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t('serverIp')}</Text>
                <TextInput
                  style={styles.input}
                  value={host}
                  onChangeText={handleHostChange}
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
                        style={styles.quickIpBtn}
                        onPress={() => handleHostChange(ip)}
                      >
                        <Text style={styles.quickIpText}>{ip}</Text>
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
                    placeholder="sa"
                    placeholderTextColor={THEME.colors.textMuted}
                    autoCapitalize="none"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                  <Text style={styles.label}>{t('sqlPassword')}</Text>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor={THEME.colors.textMuted}
                    secureTextEntry={true}
                  />
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
                <CustomButton
                  title={isConnecting ? 'Conectando...' : t('btnConnect')}
                  onPress={handleConnect}
                  variant="orange"
                  loading={isConnecting}
                  icon="database-check"
                  size="md"
                  style={{ flex: 2 }}
                />
                <CustomButton
                  title="Limpiar"
                  onPress={handleClearConfig}
                  variant="dark"
                  icon="eraser"
                  size="md"
                  style={{ flex: 1, marginLeft: 8 }}
                />
              </View>
            </View>

            {/* PASO 5: Perfiles de Servidor (Multi-Server) */}
            <View style={styles.card}>
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
                  <MaterialCommunityIcons name="server-network-off" size={24} color={THEME.colors.textMuted} />
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
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.profileLoadBtn}
                        onPress={() => handleLoadProfile(p)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="cloud-upload-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.profileLoadBtnText}>Cargar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.profileDeleteBtn}
                        onPress={() => handleDeleteProfile(p.id, p.name)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={16} color={THEME.colors.dangerRed} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={[styles.addProfileBtn, serverProfiles.length >= 5 && { opacity: 0.5 }]}
                onPress={() => {
                  if (serverProfiles.length >= 5) {
                    Alert.alert('Límite alcanzado', 'Solo puedes guardar hasta 5 perfiles.');
                    return;
                  }
                  setNewProfileName(`Servidor ${serverProfiles.length + 1}`);
                  setSaveProfileModalVisible(true);
                }}
                disabled={serverProfiles.length >= 5}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="content-save" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.addProfileBtnText}>Guardar Configuración Actual como Perfil</Text>
              </TouchableOpacity>
            </View>

            {/* Network and Firewall Reminder Card */}
            <View style={styles.networkNoticeCard}>
              <MaterialCommunityIcons name="shield-alert-outline" size={24} color={THEME.colors.primaryOrange} />
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
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>SEGURIDAD DE ACCESO (PIN)</Text>
                <View style={[styles.versionPill, { backgroundColor: hasPinConfigured ? 'rgba(46, 125, 50, 0.2)' : 'rgba(255, 87, 34, 0.15)' }]}>
                  <Text style={[styles.versionPillText, { color: hasPinConfigured ? THEME.colors.accentGreenBright : THEME.colors.primaryOrange }]}>
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
                    <TouchableOpacity
                      style={styles.pinChangeBtn}
                      onPress={() => {
                        setNewPinInput('');
                        setConfirmPinInput('');
                        setPinModalVisible(true);
                      }}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="lock-reset" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.pinChangeBtnText}>Cambiar PIN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pinDisableBtn}
                      onPress={handleDisablePin}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="lock-open-variant-outline" size={16} color={THEME.colors.dangerRed} style={{ marginRight: 6 }} />
                      <Text style={styles.pinDisableBtnText}>Desactivar</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.pinEnableBtn}
                    onPress={() => {
                      setNewPinInput('');
                      setConfirmPinInput('');
                      setPinModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons name="shield-lock-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.pinEnableBtnText}>Activar Bloqueo por PIN (4 Dígitos)</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* PASO 6: Control de Límite de Cuentas por IP */}
            <View style={styles.card}>
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
                        style={styles.stepperBtn}
                        onPress={() => {
                          const cur = parseInt(ipLimitMax, 10) || 3;
                          if (cur > 1) handleSaveIpLimit(true, String(cur - 1), ipLimitAction);
                        }}
                      >
                        <MaterialCommunityIcons name="minus" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={styles.stepperValue}>{ipLimitMax}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => {
                          const cur = parseInt(ipLimitMax, 10) || 3;
                          if (cur < 20) handleSaveIpLimit(true, String(cur + 1), ipLimitAction);
                        }}
                      >
                        <MaterialCommunityIcons name="plus" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.ipLimitLabel, { marginTop: 12, marginBottom: 8 }]}>Acción en Exceso:</Text>
                  <View style={styles.ipLimitActionRow}>
                    <TouchableOpacity
                      style={[styles.ipActionBtn, ipLimitAction === 'LOG' && styles.ipActionBtnActive]}
                      onPress={() => handleSaveIpLimit(true, ipLimitMax, 'LOG')}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={16}
                        color={ipLimitAction === 'LOG' ? '#FFFFFF' : THEME.colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.ipActionBtnText, ipLimitAction === 'LOG' && styles.ipActionBtnTextActive]}>
                        Solo Registrar (Log)
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.ipActionBtn, ipLimitAction === 'DISCONNECT' && styles.ipActionBtnDanger]}
                      onPress={() => handleSaveIpLimit(true, ipLimitMax, 'DISCONNECT')}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons
                        name="account-off"
                        size={16}
                        color={ipLimitAction === 'DISCONNECT' ? '#FFFFFF' : THEME.colors.textMuted}
                        style={{ marginRight: 6 }}
                      />
                      <Text style={[styles.ipActionBtnText, ipLimitAction === 'DISCONNECT' && styles.ipActionBtnTextActive]}>
                        Desconectar Excedentes
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Botón de Ejecución Inmediata */}
                  <TouchableOpacity
                    style={{
                      backgroundColor: ipLimitAction === 'DISCONNECT' ? '#D32F2F' : THEME.colors.primaryOrange,
                      marginTop: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 11,
                      paddingHorizontal: 12,
                      borderRadius: 8,
                      gap: 8,
                    }}
                    onPress={() => handleRunIpLimitNow()}
                    disabled={checkingIpLimit}
                    activeOpacity={0.8}
                  >
                    {checkingIpLimit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name={ipLimitAction === 'DISCONNECT' ? 'shield-account' : 'shield-search'}
                          size={18}
                          color="#FFFFFF"
                        />
                        <Text style={{ color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 }}>
                          {ipLimitAction === 'DISCONNECT'
                            ? 'Chequear y Desconectar Excedentes Ahora'
                            : 'Escanear y Reportar IPs Excedidas Ahora'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* License & Activation Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>LICENCIA Y SEGURIDAD</Text>
              <View style={styles.licenseRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.licenseBadgeRow}>
                    <Text style={styles.licenseTitle}>Estado:</Text>
                    <View style={[styles.licensePill, licenseStatus.plan === 'PRO' ? styles.pillPro : styles.pillDemo]}>
                      <Text style={[styles.licensePillText, licenseStatus.plan === 'PRO' ? styles.pillTextPro : styles.pillTextDemo]}>
                        {licenseStatus.plan === 'PRO'
                          ? (licenseStatus.isLifetime || !licenseStatus.expiresAt ? 'PRO VITALICIA' : `PRO (${licenseStatus.daysRemaining !== undefined ? `${licenseStatus.daysRemaining}d` : 'ACTIVA'})`)
                          : 'MODO DEMO'}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity activeOpacity={0.7} onPress={handleSecretTap}>
                    <Text style={styles.hwidSmall} numberOfLines={1}>
                      HWID: {licenseStatus.hwid}
                    </Text>
                  </TouchableOpacity>
                </View>
                <CustomButton
                  title={licenseStatus.plan === 'PRO' ? 'Ver Licencia' : 'Activar PRO'}
                  onPress={() => setLicenseModalVisible(true)}
                  variant={licenseStatus.plan === 'PRO' ? 'outline' : 'orange'}
                  size="sm"
                />
              </View>
            </View>
          </>
        )}

        {/* ========================================================================= */}
        {/* SECCIÓN 3: SISTEMA & SOPORTE                                              */}
        {/* ========================================================================= */}
        {activeSection === 'system' && (
          <>
            {/* Actualizaciones y Versión del Sistema */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>ACTUALIZACIONES Y SISTEMA</Text>
                <View style={styles.versionPill}>
                  <Text style={styles.versionPillText}>v{APP_VERSION} Oficial</Text>
                </View>
              </View>

              <View style={styles.updateCardBody}>
                <View style={styles.updateRow}>
                  <View style={[styles.updateIconBox, { backgroundColor: remoteConfig.updateInfo?.hasUpdate ? 'rgba(255, 87, 34, 0.15)' : 'rgba(46, 125, 50, 0.15)' }]}>
                    <MaterialCommunityIcons
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
                  <TouchableOpacity
                    style={styles.checkUpdateBtn}
                    onPress={handleCheckUpdatesManually}
                    disabled={isCheckingUpdate}
                    activeOpacity={0.8}
                  >
                    {isCheckingUpdate ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="sync" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.checkUpdateBtnText}>Buscar Actualizaciones</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {remoteConfig.updateInfo?.hasUpdate && (
                    <TouchableOpacity
                      style={styles.downloadUpdateBtn}
                      onPress={() => setUpdateModalManualVisible(true)}
                      activeOpacity={0.8}
                    >
                      <MaterialCommunityIcons name="download" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.downloadUpdateBtnText}>Instalar v{remoteConfig.updateInfo.latestVersion}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Programa Beta y Canal de Despliegue */}
            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionTitle}>CANAL DE ACTUALIZACIÓN (BETA)</Text>
                <View style={[styles.versionPill, { backgroundColor: remoteConfig.releaseChannel === 'BETA' ? 'rgba(156, 39, 176, 0.2)' : 'rgba(33, 150, 243, 0.15)' }]}>
                  <Text style={[styles.versionPillText, { color: remoteConfig.releaseChannel === 'BETA' ? '#CE93D8' : '#64B5F6' }]}>
                    {remoteConfig.releaseChannel === 'BETA' ? 'Canal Beta' : 'Canal Estable'}
                  </Text>
                </View>
              </View>

              <View style={styles.updateCardBody}>
                <View style={styles.updateRow}>
                  <View style={[styles.updateIconBox, { backgroundColor: remoteConfig.releaseChannel === 'BETA' ? 'rgba(156, 39, 176, 0.15)' : 'rgba(255, 255, 255, 0.05)' }]}>
                    <MaterialCommunityIcons
                      name={remoteConfig.releaseChannel === 'BETA' ? "flask-round-bottom" : "shield-check"}
                      size={24}
                      color={remoteConfig.releaseChannel === 'BETA' ? '#BA68C8' : THEME.colors.textSecondary}
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
                  <TouchableOpacity
                    style={[
                      styles.checkUpdateBtn,
                      {
                        marginTop: 12,
                        backgroundColor: remoteConfig.betaStatus === 'PENDING' ? 'rgba(255, 255, 255, 0.08)' : '#6A1B9A',
                        borderColor: remoteConfig.betaStatus === 'PENDING' ? THEME.colors.border : '#8E24AA',
                        borderWidth: 1,
                      }
                    ]}
                    onPress={handleToggleBeta}
                    disabled={requestingBeta || remoteConfig.betaStatus === 'PENDING'}
                    activeOpacity={0.8}
                  >
                    {requestingBeta ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name={remoteConfig.betaStatus === 'PENDING' ? "clock-outline" : "flask-outline"}
                          size={16}
                          color="#FFFFFF"
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.checkUpdateBtnText}>
                          {remoteConfig.betaStatus === 'PENDING' ? 'En Espera de Aprobación' : 'Solicitar Acceso al Canal Beta'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Language Selector Section */}
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t('languageSection')}</Text>
              <View style={styles.langRow}>
                {LANGUAGES.map((l) => {
                  const active = l.code === language;
                  return (
                    <TouchableOpacity
                      key={l.code}
                      style={[styles.langBtn, active && styles.langBtnActive]}
                      onPress={() => setLanguage(l.code)}
                    >
                      <Text style={styles.flagText}>{l.flag}</Text>
                      <Text style={[styles.langBtnText, active && styles.langBtnTextActive]}>
                        {l.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* User Account & Session Section */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="account-circle" size={24} color={THEME.colors.primaryOrange} />
                  <Text style={styles.sectionTitle}>Cuenta de Usuario</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(0, 230, 118, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0, 230, 118, 0.3)' }}>
                  <Text style={{ color: '#00E676', fontSize: 10, fontWeight: '700' }}>SESIÓN ACTIVA</Text>
                </View>
              </View>

              <View style={{ backgroundColor: '#111114', padding: 12, borderRadius: 8, marginBottom: 14, borderWidth: 1, borderColor: THEME.colors.border }}>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginBottom: 2 }}>Usuario Conectado</Text>
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>{userEmail || 'Usuario'}</Text>
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(255, 82, 82, 0.12)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 82, 82, 0.3)',
                  borderRadius: 8,
                  paddingVertical: 12,
                  paddingHorizontal: 16,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
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
              >
                <MaterialCommunityIcons name="logout" size={20} color="#FF5252" />
                <Text style={{ color: '#FF5252', fontSize: 14, fontWeight: '700' }}>Cerrar Sesión</Text>
              </TouchableOpacity>
            </View>

            {/* Debug Panel Shortcut Banner */}
            <TouchableOpacity style={styles.debugBanner} onPress={() => setDebugVisible(true)}>
              <View style={styles.debugLeft}>
                <MaterialCommunityIcons name="console-network" size={24} color={THEME.colors.primaryOrange} />
                <View>
                  <Text style={styles.debugTitle}>{t('debugPanel')}</Text>
                  <Text style={styles.debugSubtitle}>Ver logs, latencia y consultas SQL en crudo</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color={THEME.colors.textSecondary} />
            </TouchableOpacity>

            {/* Canales Oficiales y Soporte ToolForg3 */}
            <View style={styles.brandingFooterConfig}>
              <View style={styles.officialChannelsRow}>
                <TouchableOpacity
                  style={styles.telegramButtonConfig}
                  activeOpacity={0.8}
                  onPress={() => Linking.openURL('https://t.me/ToolForg3').catch(() => Alert.alert('Telegram', 'Canal oficial: https://t.me/ToolForg3'))}
                >
                  <MaterialCommunityIcons name={"send" as any} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.telegramButtonTextConfig}>Telegram ToolForg3</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.whatsappButtonConfig}
                  activeOpacity={0.8}
                  onPress={() => {
                    const hwidCode = licenseStatus.hwid || 'N/A';
                    const text = `Hola Soporte ToolForg3! Me comunico desde MuManager PRO (v${APP_VERSION}).\n\nHWID: ${hwidCode}`;
                    const url = `https://wa.me/5521971217376?text=${encodeURIComponent(text)}`;
                    Linking.openURL(url).catch(() => Alert.alert('WhatsApp', 'Soporte oficial: +55 21 97121-7376'));
                  }}
                >
                  <MaterialCommunityIcons name={"whatsapp" as any} size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.whatsappButtonTextConfig}>WhatsApp Soporte</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleSecretTap}
                style={styles.versionFooterBox}
              >
                <View style={styles.producedByBadge}>
                  <MaterialCommunityIcons name="code-tags" size={14} color="#E8C86A" style={{ marginRight: 5 }} />
                  <Text style={styles.producedByBadgeText}>PRODUCIDO POR TOOLFORG3</Text>
                </View>
                <Text style={styles.brandingFooterVersionText}>
                  Mu Manager PRO v{APP_VERSION} • Build {APP_BUILD} Oficial
                </Text>
                <View style={styles.liveStatusRow}>
                  <View style={styles.liveStatusDot} />
                  <Text style={styles.versionSubFooterText}>
                    Gateway Vercel en Línea • Season 6 Update 40
                  </Text>
                </View>
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
                <MaterialCommunityIcons name="server-plus" size={24} color={THEME.colors.primaryOrange} />
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
              <TouchableOpacity
                style={styles.adminModalBtnCancel}
                onPress={() => setSaveProfileModalVisible(false)}
              >
                <Text style={styles.adminModalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminModalBtnSubmit}
                onPress={handleSaveProfile}
              >
                <Text style={styles.adminModalBtnSubmitText}>Guardar</Text>
              </TouchableOpacity>
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
                <MaterialCommunityIcons name="shield-key" size={24} color={THEME.colors.primaryOrange} />
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
              <TouchableOpacity
                style={styles.adminModalBtnCancel}
                onPress={() => setPinModalVisible(false)}
              >
                <Text style={styles.adminModalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminModalBtnSubmit}
                onPress={handleSavePin}
              >
                <Text style={styles.adminModalBtnSubmitText}>Guardar PIN</Text>
              </TouchableOpacity>
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
                <MaterialCommunityIcons name="shield-lock" size={26} color={THEME.colors.primaryOrange} />
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
              <TouchableOpacity
                style={styles.adminModalBtnCancel}
                onPress={() => {
                  setAdminAuthModalVisible(false);
                  setAdminKeyInput('');
                }}
              >
                <Text style={styles.adminModalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminModalBtnSubmit}
                onPress={handleAdminAuthSubmit}
                disabled={verifyingAdminKey}
              >
                {verifyingAdminKey ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.adminModalBtnSubmitText}>Acceder</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
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
    backgroundColor: '#100D0B',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    gap: 6,
  },
  sectionTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    borderWidth: 1.5,
    borderColor: '#6B5533',
    gap: 4,
  },
  sectionTabBtnActive: {
    backgroundColor: 'rgba(181, 143, 60, 0.2)',
    borderColor: THEME.colors.oro,
  },
  sectionTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textoSecundario,
  },
  sectionTabTextActive: {
    color: THEME.colors.oro,
    fontWeight: '900',
  },
  card: {
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
    marginBottom: 12,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oro,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    textShadowColor: 'rgba(232, 200, 106, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
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
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minHeight: 44,
    gap: 6,
  },
  langBtnActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.oro,
  },
  flagText: {
    fontSize: 18,
  },
  langBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textoSecundario,
  },
  langBtnTextActive: {
    color: THEME.colors.oro,
    fontWeight: '900',
  },
  debugBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2B2521',
    borderRadius: 6,
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
    color: THEME.colors.oro,
    letterSpacing: 0.5,
  },
  debugSubtitle: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginTop: 2,
  },
  emuRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emuBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 10,
    minHeight: 44,
  },
  emuBtnActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.oro,
  },
  emuTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.texto,
  },
  emuTextActive: {
    color: THEME.colors.oro,
  },
  emuSub: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    marginTop: 2,
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
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    fontWeight: '700',
    minHeight: 44,
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
    backgroundColor: THEME.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginRight: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  quickIpText: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
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
    borderRadius: 22,
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
    fontSize: 12,
    color: THEME.colors.textSecondary,
    fontWeight: THEME.typography.weightMedium,
  },
  licensePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: THEME.borderRadius.round,
  },
  pillDemo: {
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
  },
  pillPro: {
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
  },
  licensePillText: {
    fontSize: 10,
    fontWeight: THEME.typography.weightBold,
  },
  pillTextDemo: {
    color: THEME.colors.primaryOrange,
  },
  pillTextPro: {
    color: THEME.colors.accentGreenBright,
  },
  hwidSmall: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 10,
    color: THEME.colors.textMuted,
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
    borderRadius: 6,
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
    borderRadius: 20,
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
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
    backgroundColor: THEME.colors.primaryOrange,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminModalBtnSubmitText: {
    fontSize: 13,
    color: '#FFFFFF',
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
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderRadius: THEME.borderRadius.round,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.4)',
  },
  versionPillText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: THEME.colors.accentGreenBright,
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
    borderRadius: 22,
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
    backgroundColor: THEME.colors.primaryOrange,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  downloadUpdateBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  settingDescText: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: THEME.spacing.sm,
    lineHeight: 18,
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
    borderRadius: 4,
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
    backgroundColor: THEME.colors.primaryOrange,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: THEME.borderRadius.sm,
    gap: 4,
  },
  profileLoadBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  profileDeleteBtn: {
    padding: 6,
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderRadius: THEME.borderRadius.sm,
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
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
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
    backgroundColor: THEME.colors.primaryOrange,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
  },
  pinChangeBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pinDisableBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.3)',
    borderRadius: THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
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
    backgroundColor: THEME.colors.primaryOrange,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 11,
  },
  pinEnableBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    backgroundColor: THEME.colors.background,
    borderRadius: THEME.borderRadius.sm,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  stepperBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: THEME.borderRadius.sm,
    backgroundColor: THEME.colors.background,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  ipActionBtnActive: {
    borderColor: THEME.colors.primaryOrange,
    backgroundColor: 'rgba(255, 87, 34, 0.15)',
  },
  ipActionBtnDanger: {
    borderColor: THEME.colors.dangerRed,
    backgroundColor: 'rgba(244, 67, 54, 0.18)',
  },
  ipActionBtnText: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    fontWeight: 'bold',
  },
  ipActionBtnTextActive: {
    color: '#FFFFFF',
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
  telegramButtonConfig: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0088CC',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#29B6F6',
    minHeight: 46,
    shadowColor: '#0088CC',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  telegramButtonTextConfig: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  whatsappButtonConfig: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E7E34',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: '#3FCF8E',
    minHeight: 46,
    shadowColor: '#1E7E34',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  whatsappButtonTextConfig: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  versionFooterBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: THEME.borderRadius.md,
    backgroundColor: '#1E1A16',
    borderWidth: 1.2,
    borderColor: '#4A3B2C',
    width: '100%',
  },
  producedByBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 200, 106, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 4,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 106, 0.35)',
  },
  producedByBadgeText: {
    color: '#E8C86A',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  brandingFooterVersionText: {
    color: '#EDE4D3',
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
    borderRadius: 3.5,
    backgroundColor: '#3FCF8E',
  },
  versionSubFooterText: {
    color: '#9C9182',
    fontSize: 11,
    fontWeight: '500',
  },
});
