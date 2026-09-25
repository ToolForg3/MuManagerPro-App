import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  Modal,
  ActivityIndicator,
  AppState,
  AppStateStatus,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import { MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../constants/theme';
import { Panel, BotonOro, BotonPiedra, TituloSeccion } from '../../components/ui';
import { CustomButton } from '../../components/common/CustomButton';
import { LanguageModal } from '../../components/common/LanguageModal';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { APP_VERSION } from '../../constants/appVersion';
import { SqlClient } from '../../services/database/sqlClient';
import { SecurityService } from '../../services/security/securityService';
import { TermsAndConditionsModal } from '../../components/legal/TermsAndConditionsModal';
import * as Clipboard from 'expo-clipboard';

export const LoginScreen = () => {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const {
    login,
    loginWithToken,
    loginDemo,
    register,
    verifyRegistration,
    resendVerificationCode,
    savedEmail,
    savedUsername,
    isDemoExpired,
    clearDemoExpiredNotice,
  } = useAuth();

  const [googleLoading, setGoogleLoading] = useState(false);
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  // PRO Request Modal State
  const [proModalVisible, setProModalVisible] = useState(false);
  const [proName, setProName] = useState('');
  const [proPhone, setProPhone] = useState('');
  const [proEmail, setProEmail] = useState('');
  const [proServer, setProServer] = useState('');
  const [proNotes, setProNotes] = useState('');
  const [proHwid, setProHwid] = useState('');
  const [proLoading, setProLoading] = useState(false);

  useEffect(() => {
    SecurityService.getDeviceHwid().then(id => setProHwid(id)).catch(() => {});
  }, []);

  const openProModal = () => {
    const defaultEmail = email.trim() || (savedEmail?.includes('@') ? savedEmail : (username.includes('@') ? username : ''));
    if (defaultEmail && !proEmail) {
      setProEmail(defaultEmail);
    }
    setProModalVisible(true);
  };

  useEffect(() => {
    if (isDemoExpired) {
      setIsRegisterMode(true);
      Alert.alert(
        'Tiempo de Demo Finalizado',
        'Tu acceso rápido de 10 minutos para este dispositivo ha finalizado.\n\nCrea tu cuenta para disfrutar de 72 horas completas de prueba gratuita o envía una solicitud para probar el Plan PRO.',
        [
          {
            text: '⭐ Solicitar Prueba PRO',
            onPress: () => {
              clearDemoExpiredNotice();
              openProModal();
            },
          },
          {
            text: 'Crear Cuenta (72h Demo)',
            onPress: () => clearDemoExpiredNotice(),
          },
        ]
      );
    }
  }, [isDemoExpired]);
  const [username, setUsername] = useState(savedUsername || (savedEmail && !savedEmail.includes('@') ? savedEmail : ''));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  // Registration Email Verification OTP Modal State
  const [verifyModalVisible, setVerifyModalVisible] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Password Recovery OTP State
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCode, setForgotCode] = useState('');
  const [forgotNewPass, setForgotNewPass] = useState('');
  const [forgotConfirmPass, setForgotConfirmPass] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSecure, setForgotSecure] = useState(true);
  const [termsModalVisible, setTermsModalVisible] = useState(false);
  const [isEditingVerifyEmail, setIsEditingVerifyEmail] = useState(false);

  // Paste 6-digit OTP code from clipboard with 1 tap
  const handlePasteVerifyCode = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        const clean = text.trim().replace(/\D/g, '').slice(0, 6);
        if (clean) setVerifyCode(clean);
      }
    } catch (_) {}
  };

  const handlePasteForgotCode = async () => {
    try {
      const text = await Clipboard.getStringAsync();
      if (text) {
        const clean = text.trim().replace(/\D/g, '').slice(0, 6);
        if (clean) setForgotCode(clean);
      }
    } catch (_) {}
  };

  // Deep linking listener for mumanager://activate and mumanager://reset-password
  useEffect(() => {
    const handleIncomingDeepLink = (rawUrl: string | null) => {
      if (!rawUrl) return;
      try {
        const qIdx = rawUrl.indexOf('?');
        const params: Record<string, string> = {};
        if (qIdx !== -1) {
          const queryString = rawUrl.substring(qIdx + 1);
          queryString.split('&').forEach(part => {
            const [k, v] = part.split('=');
            if (k) params[decodeURIComponent(k.trim())] = decodeURIComponent((v || '').trim());
          });
        }

        if (rawUrl.includes('activate')) {
          if (params.status === 'success') {
            setVerifyModalVisible(false);
            setIsRegisterMode(false);
            setVerifyCode('');
            setIsEditingVerifyEmail(false);
            if (params.email) {
              const cleanMail = params.email.trim();
              setEmail(cleanMail);
              setUsername(cleanMail.includes('@') ? cleanMail.split('@')[0] : cleanMail);
            }
            Alert.alert(
              '¡Cuenta Activada!',
              'Tu cuenta ha sido verificada y activada exitosamente vía web. Ya puedes iniciar sesión con tu usuario o correo y contraseña.'
            );
          } else {
            const targetMail = params.email || '';
            const targetCode = params.code || '';
            if (targetMail) {
              setVerifyEmail(targetMail);
              setIsEditingVerifyEmail(false);
            }
            if (targetCode) setVerifyCode(targetCode);
            setVerifyModalVisible(true);
          }
        } else if (rawUrl.includes('reset-password')) {
          const targetMail = params.email || '';
          const targetCode = params.code || '';
          if (targetMail) setForgotEmail(targetMail);
          if (targetCode) setForgotCode(targetCode);
          setForgotStep(2);
          setForgotModalVisible(true);
        } else if (rawUrl.includes('oauth-callback')) {
          const targetToken = params.token || '';
          const targetEmail = params.email || '';
          const targetUsername = params.username || '';
          if (targetToken) {
            loginWithToken(targetToken, { email: targetEmail, username: targetUsername }).then((res) => {
              if (res.success) {
                Alert.alert(
                  '¡Sesión Iniciada con Google!',
                  `Bienvenido ${targetUsername || targetEmail}. Tu identidad ha sido verificada con éxito.`
                );
              } else {
                Alert.alert('Error de Autenticación', res.error || 'No se pudo iniciar sesión con Google.');
              }
            });
          }
        }
      } catch (err) {
        console.warn('[DeepLink Handler Error]', err);
      }
    };

    Linking.getInitialURL().then(handleIncomingDeepLink).catch(() => {});
    const sub = Linking.addEventListener('url', (e) => handleIncomingDeepLink(e.url));
    return () => sub.remove();
  }, []);

  // Escuchar cuando el usuario regresa a la app desde el navegador para auto-cerrar la verificación
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' && verifyModalVisible && verifyEmail.trim()) {
        try {
          const bridgeUrl = SqlClient.getBridgeUrl();
          const target = encodeURIComponent(verifyEmail.trim().toLowerCase());
          const resp = await fetch(`${bridgeUrl}/api/auth/check-status?email=${target}`);
          if (resp.ok) {
            const data = await resp.json();
            if (data && data.success && data.active) {
              setVerifyModalVisible(false);
              setIsRegisterMode(false);
              setVerifyCode('');
              setIsEditingVerifyEmail(false);
              const activeMail = data.email || verifyEmail.trim();
              setEmail(activeMail);
              setUsername(data.username || (activeMail.includes('@') ? activeMail.split('@')[0] : activeMail));
              Alert.alert(
                '¡Cuenta Activada!',
                'Tu cuenta ha sido confirmada y activada con éxito vía web. Ya puedes ingresar al sistema.'
              );
            }
          }
        } catch (_) {}
      }
    };

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [verifyModalVisible, verifyEmail]);

  const handleVerifyRegistration = async () => {
    const cleanMail = verifyEmail.trim();
    const cleanCode = verifyCode.trim();
    if (!cleanMail) {
      Alert.alert('Correo o Usuario Requerido', 'Por favor ingresa tu correo registrado o nombre de usuario para activar la cuenta.');
      return;
    }
    if (!cleanCode || cleanCode.length < 6) {
      Alert.alert('Código Requerido', 'Ingresa el código numérico de 6 dígitos recibido por correo.');
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await verifyRegistration(cleanMail, cleanCode);
      if (res.success) {
        setVerifyModalVisible(false);
        setVerifyCode('');
        setIsEditingVerifyEmail(false);
        Alert.alert(
          '¡Cuenta Activada!',
          res.message || 'Tu cuenta ha sido verificada y activada con éxito. Ya puedes acceder al sistema.'
        );
      } else {
        Alert.alert('Error de Activación', res.error || 'Código incorrecto o expirado.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo verificar el código.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const cleanMail = verifyEmail.trim();
    if (!cleanMail) {
      Alert.alert('Correo o Usuario Requerido', 'Por favor ingresa tu correo registrado para reenviar el código.');
      return;
    }
    setResendLoading(true);
    try {
      const res = await resendVerificationCode(cleanMail);
      if (res.success) {
        if (res.devCode) {
          setVerifyCode(res.devCode);
          Alert.alert(
            'Nuevo Código de Activación',
            `Nuevo código generado: [ ${res.devCode} ]\n\n(Aviso: Servidor SMTP pendiente de configuración. Se ha colocado el código automáticamente).`
          );
        } else {
          Alert.alert('Código Reenviado', res.message || 'Hemos reenviado un nuevo código de activación a tu correo.');
        }
      } else {
        Alert.alert('Aviso', res.error || 'No se pudo reenviar el código.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error de red al reenviar el código.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleRequestResetCode = async () => {
    const cleanMail = forgotEmail.trim();
    if (!cleanMail) {
      Alert.alert('Correo Requerido', 'Por favor ingresa tu correo electrónico registrado.');
      return;
    }
    setForgotLoading(true);
    try {
      const bridgeUrl = SqlClient.getBridgeUrl();
      const res = await fetch(`${bridgeUrl}/api/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanMail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.devCode) {
          setForgotCode(data.devCode);
          Alert.alert(
            'Código de Recuperación',
            `Código generado: [ ${data.devCode} ]\n\n(Aviso: Servidor SMTP pendiente de configuración en el Panel. Se ha colocado el código automáticamente en el campo para que puedas continuar con la prueba sin demoras).`
          );
        } else {
          Alert.alert(
            'Código Generado',
            data.message || 'Se ha generado tu código de seguridad de 6 dígitos. Revisa tu correo electrónico, panel de auditoría o WhatsApp.'
          );
        }
        setForgotStep(2);
      } else {
        Alert.alert('Aviso', data.error || 'No se pudo generar el código de recuperación.');
      }
    } catch (e: any) {
      Alert.alert('Error de Red', 'No se pudo conectar con el servidor: ' + e.message);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    const cleanCode = forgotCode.trim();
    const cleanPass = forgotNewPass.trim();
    const cleanConfirm = forgotConfirmPass.trim();
    const cleanMail = forgotEmail.trim().toLowerCase();

    if (!cleanCode) {
      Alert.alert('Código Requerido', 'Por favor ingresa el código de 6 dígitos.');
      return;
    }
    if (!cleanPass) {
      Alert.alert('Contraseña Requerida', 'Por favor ingresa tu nueva contraseña.');
      return;
    }
    if (cleanPass.length < 8) {
      Alert.alert('Contraseña Débil', 'La nueva contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (cleanPass !== cleanConfirm) {
      Alert.alert('No Coinciden', 'Las contraseñas ingresadas no coinciden.');
      return;
    }

    setForgotLoading(true);
    try {
      const bridgeUrl = SqlClient.getBridgeUrl();
      const payload = {
        email: cleanMail,
        code: cleanCode,
        newPassword: cleanPass,
      };

      let res = await fetch(`${bridgeUrl}/api/auth/forgot-password/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Fallback a /confirm en caso de servidores antiguos
      if (res.status === 404) {
        res = await fetch(`${bridgeUrl}/api/auth/forgot-password/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (res.ok && data.success) {
        Alert.alert(
          'Contraseña Restablecida',
          'Tu contraseña ha sido actualizada con éxito. Ya puedes iniciar sesión con tu nueva contraseña.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: () => {
                setForgotModalVisible(false);
                setIsRegisterMode(false);
                setEmail(cleanMail);
                setUsername(cleanMail.includes('@') ? cleanMail.split('@')[0] : cleanMail);
                setPassword(cleanPass);
                setForgotStep(1);
                setForgotCode('');
                setForgotNewPass('');
                setForgotConfirmPass('');
              },
            },
          ]
        );
      } else {
        Alert.alert('Error al Restablecer', data.error || 'Código incorrecto o expirado.');
      }
    } catch (e: any) {
      Alert.alert('Error de Red', 'No se pudo restablecer la contraseña: ' + e.message);
    } finally {
      setForgotLoading(false);
    }
  };

  useEffect(() => {
    if (savedUsername && !username) {
      setUsername(savedUsername);
    } else if (savedEmail && !username) {
      setUsername(savedEmail.includes('@') ? savedEmail.split('@')[0] : savedEmail);
    }
  }, [savedUsername, savedEmail]);

  const handleSubmit = async () => {
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (isRegisterMode) {
      const cleanEmail = email.trim();
      const cleanConfirm = confirmPassword.trim();

      if (!cleanUser) {
        Alert.alert('Nombre de usuario requerido', 'Por favor ingresa un nombre de usuario para tu cuenta.');
        return;
      }
      if (cleanUser.length < 3) {
        Alert.alert('Usuario inválido', 'El nombre de usuario debe tener al menos 3 caracteres.');
        return;
      }
      if (!cleanEmail) {
        Alert.alert('Correo requerido', 'El correo electrónico es obligatorio para verificar y recuperar tu cuenta.');
        return;
      }
      if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
        Alert.alert('Correo inválido', 'Por favor ingresa un correo electrónico válido.');
        return;
      }
      if (!cleanPass) {
        Alert.alert('Contraseña requerida', 'Por favor ingresa una contraseña.');
        return;
      }
      if (cleanPass.length < 8) {
        Alert.alert('Contraseña débil', 'La contraseña debe tener al menos 8 caracteres.');
        return;
      }
      if (cleanPass !== cleanConfirm) {
        Alert.alert('Error', 'Las contraseñas no coinciden.');
        return;
      }

      setLoading(true);
      try {
        const regRes = await register(cleanEmail, cleanPass, cleanUser);
        if (regRes.success) {
          setVerifyEmail(cleanEmail);
          setIsEditingVerifyEmail(false);
          setVerifyCode(regRes.devCode || '');
          setVerifyModalVisible(true);
          if (regRes.devCode) {
            Alert.alert(
              'Código de Activación',
              `Código generado: [ ${regRes.devCode} ]\n\n(Aviso: Servidor SMTP pendiente de configuración en el Panel. Se ha colocado el código automáticamente para activar la cuenta de inmediato).`
            );
          } else {
            Alert.alert(
              'Código Enviado',
              regRes.message || `Hemos enviado un código de activación de 6 dígitos a tu correo: ${cleanEmail}. Ingrésalo a continuación para activar tu cuenta.`
            );
          }
        } else {
          Alert.alert('Error de Registro', regRes.error || 'No se pudo crear la cuenta.');
        }
      } catch (e: any) {
        Alert.alert('Error', e.message || 'Error al procesar el registro.');
      } finally {
        setLoading(false);
      }
    } else {
      if (!cleanUser || !cleanPass) {
        Alert.alert('Datos requeridos', 'Por favor ingresa tu usuario o correo y contraseña.');
        return;
      }

      setLoading(true);
      try {
        const loginRes = await login(cleanUser, cleanPass, remember);
        if (!loginRes.success) {
          if (loginRes.requiresVerification) {
            Alert.alert(
              'Verificación Requerida',
              loginRes.error || 'Debes verificar tu correo para activar tu cuenta de usuario.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Verificar Ahora',
                  onPress: () => {
                    const targetEmail = loginRes.email || (cleanUser.includes('@') ? cleanUser : '');
                    setVerifyEmail(targetEmail);
                    setIsEditingVerifyEmail(!targetEmail);
                    setVerifyCode('');
                    setVerifyModalVisible(true);
                  },
                },
              ]
            );
          } else if (
            loginRes.error?.includes('concluido') || 
            loginRes.error?.includes('finalizado') || 
            loginRes.error?.includes('LICENCIA_EXPIRADA') ||
            loginRes.error?.includes('tiempo extra')
          ) {
            Alert.alert(
              'Período de Licencia Finalizado',
              loginRes.error,
              [
                {
                  text: '⭐ Solicitar PRO / Extra Demo',
                  onPress: () => openProModal(),
                },
                { text: 'Entendido', style: 'cancel' }
              ]
            );
          } else {
            Alert.alert('Acceso Denegado', loginRes.error || 'Usuario o contraseña incorrectos.');
          }
        }
      } catch (e: any) {
        Alert.alert('Error', e.message || 'No se pudo iniciar sesión.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const hwid = await SecurityService.getDeviceHwid().catch(() => '');
      const bridgeUrl = SqlClient.getBridgeUrl();
      const authUrl = `${bridgeUrl}/api/auth/oauth/google?hwid=${encodeURIComponent(hwid)}`;
      const supported = await Linking.canOpenURL(authUrl);
      if (supported) {
        await Linking.openURL(authUrl);
      } else {
        await Linking.openURL(`https://mumanagerpro.vercel.app/api/auth/oauth/google?hwid=${encodeURIComponent(hwid)}`);
      }
    } catch (err: any) {
      Alert.alert('Error con Google', 'No se pudo abrir el inicio de sesión con Google: ' + (err.message || 'Desconocido'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const promptDemoAccess = () => {
    Alert.alert(
      'Acceso Rápido Demo (10 Minutos)',
      'Este modo te permite explorar la aplicación de forma inmediata durante 10 minutos sin necesidad de registrarte.\n\nUna vez culminados los 10 minutos, podrás crear tu cuenta registrada para adquirir 72 horas completas de demo gratuita o solicitar el Plan PRO.',
      [
        {
          text: '⚡ Iniciar Demo (10 min)',
          onPress: () => executeDemoLogin(),
        },
        {
          text: 'Crear Cuenta (72h Demo)',
          onPress: () => setIsRegisterMode(true),
        },
        {
          text: '⭐ Solicitar PRO',
          onPress: () => openProModal(),
        },
        {
          text: 'Cancelar',
          style: 'cancel',
        },
      ]
    );
  };

  const handleDemoAccess = () => {
    promptDemoAccess();
  };

  const executeDemoLogin = async () => {
    setLoadingDemo(true);
    try {
      const res = await loginDemo();
      if (!res.success && res.error) {
        Alert.alert(
          'Acceso Rápido Consumido',
          res.error,
          [
            {
              text: '⭐ Solicitar Prueba PRO',
              onPress: () => openProModal(),
            },
            {
              text: 'Crear Cuenta (72h)',
              onPress: () => setIsRegisterMode(true),
            },
            { text: 'Cancelar', style: 'cancel' },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo iniciar sesión en modo prueba.');
    } finally {
      setLoadingDemo(false);
    }
  };

  const handleSendProRequest = async () => {
    const cleanName = proName.trim() || username.trim() || 'Administrador';
    const cleanPhone = proPhone.trim() || 'Sin número';

    setProLoading(true);
    try {
      const res = await SqlClient.sendProRequest({
        name: cleanName,
        phone: cleanPhone,
        email: proEmail.trim() || undefined,
        serverName: proServer.trim() || undefined,
        notes: proNotes.trim() || undefined,
      });

      if (res.success) {
        Alert.alert(
          '✅ Solicitud Enviada al Panel',
          `Tu solicitud de prueba para el Plan PRO fue enviada con éxito directamente al panel de control del administrador.\n\n📱 Dispositivo: ${proHwid || 'Registrado'}\n💬 Contacto: ${cleanPhone !== 'Sin número' ? cleanPhone : (proEmail.trim() || 'Registrado en sistema')}\n\nEl administrador revisará tu solicitud para activar tu período de prueba PRO.`,
          [
            {
              text: 'Entendido',
              onPress: () => {
                setProModalVisible(false);
                setProNotes('');
              },
            },
          ]
        );
      } else if (res.alreadyRequested) {
        Alert.alert(
          '⚠️ Solicitud Previa Registrada',
          res.message || `Este dispositivo (${proHwid || 'HWID'}) ya tiene una solicitud previa registrada en el panel de control. El administrador ya tiene tus datos y se pondrá en contacto contigo.`,
          [
            {
              text: 'Entendido',
              onPress: () => setProModalVisible(false),
            }
          ]
        );
      } else {
        Alert.alert('Aviso', res.message || 'No se pudo registrar la solicitud en este momento.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error de conexión al enviar la solicitud.');
    } finally {
      setProLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <LanguageModal floating={true} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(32, insets.top + 16),
            paddingBottom: Math.max(24, insets.bottom + 16),
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand Header Mu Online: Escudo dorado con corona y título Cinzel */}
        <View style={styles.brandContainer}>
          <View style={styles.logoCircle}>
            <FontAwesome5 name="shield-alt" size={38} color={THEME.colors.oroClaro} />
            <FontAwesome5 name="crown" size={18} color={THEME.colors.oroClaro} style={styles.crownIcon} />
          </View>
          <Text style={styles.brandTitle}>MU ONLINE</Text>
          <Text style={styles.brandSubtitle}>DATABASE MANAGER PRO</Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>SEASON 6 LOUIS UPDATE 40/50</Text>
          </View>
        </View>

        {/* Login / Register Form Panel */}
        <Panel style={styles.card}>
          <TituloSeccion
            titulo={isRegisterMode ? 'Crear Nueva Cuenta' : 'Autenticación de Cuenta'}
            style={{ marginVertical: 8 }}
          />

          {/* Username Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {isRegisterMode ? 'Nombre de Usuario (Para Iniciar Sesión)' : 'Usuario o Correo Electrónico'}
            </Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="user"
                size={18}
                color={THEME.colors.oro}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={isRegisterMode ? 'Ej: admin_mu' : 'Ingresa tu usuario o correo'}
                placeholderTextColor={THEME.colors.textoSecundario}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Email Input (Register Mode Only) */}
          {isRegisterMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Correo Electrónico (Para Validación y Recuperación)</Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="mail"
                  size={18}
                  color={THEME.colors.arcano}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor={THEME.colors.textoSecundario}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>
          )}

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t('password') || 'Contraseña'}</Text>
            <View style={styles.inputWrapper}>
              <Feather
                name="lock"
                size={18}
                color={THEME.colors.oro}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={THEME.colors.textoSecundario}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
              />
              <TouchableOpacity
                onPress={() => setSecureText(!secureText)}
                style={styles.eyeBtn}
              >
                <Feather
                  name={secureText ? 'eye-off' : 'eye'}
                  size={18}
                  color={THEME.colors.textoSecundario}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input (Register Mode Only) */}
          {isRegisterMode && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirmar Contraseña</Text>
              <View style={styles.inputWrapper}>
                <Feather
                  name="check-circle"
                  size={18}
                  color={THEME.colors.oro}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={THEME.colors.textoSecundario}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={secureConfirmText}
                />
                <TouchableOpacity
                  onPress={() => setSecureConfirmText(!secureConfirmText)}
                  style={styles.eyeBtn}
                >
                  <Feather
                    name={secureConfirmText ? 'eye-off' : 'eye'}
                    size={18}
                    color={THEME.colors.textoSecundario}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Remember Username & Forgot Password (Login Mode Only) */}
          {!isRegisterMode && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 }}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                onPress={() => setRemember(!remember)}
                activeOpacity={0.8}
              >
                <Feather
                  name={remember ? 'check-square' : 'square'}
                  size={18}
                  color={remember ? THEME.colors.oroClaro : THEME.colors.textoSecundario}
                />
                <Text style={styles.checkboxLabel}>{t('rememberUsername') || 'Recordar usuario'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setForgotEmail(email.trim() || (savedEmail?.includes('@') ? savedEmail : ''));
                  setForgotStep(1);
                  setForgotCode('');
                  setForgotNewPass('');
                  setForgotConfirmPass('');
                  setForgotModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={{ color: THEME.colors.arcano, fontSize: 12, fontWeight: '700' }}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Submit Button (Botón Oro de 56 dp) */}
          <BotonOro
            titulo={isRegisterMode ? 'Crear mi Cuenta' : (t('signIn') || 'Iniciar Sesión')}
            onPress={handleSubmit}
            cargando={loading}
            icono={isRegisterMode ? 'user-plus' : 'log-in'}
            altura={56}
            style={styles.submitBtn}
          />

          {/* Botón Iniciar Sesión con Google OAuth */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={googleLoading}
            activeOpacity={0.8}
            accessibilityLabel="Continuar con Google"
          >
            {googleLoading ? (
              <ActivityIndicator size="small" color={THEME.colors.oroClaro} />
            ) : (
              <>
                <FontAwesome5 name="google" size={16} color={THEME.colors.oroClaro} style={{ marginRight: 10 }} />
                <Text style={styles.googleBtnText}>Continuar con Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Acceso Rápido Modo Prueba (Botón Piedra de 44 dp) */}
          {!isRegisterMode && (
            <BotonPiedra
              titulo="Acceso Rápido (Demo 10 min)"
              onPress={handleDemoAccess}
              cargando={loadingDemo}
              icono="zap"
              altura={44}
              style={{ marginTop: 12 }}
            />
          )}

          {/* Botón Solicitar Prueba PRO */}
          <TouchableOpacity
            style={styles.proRequestBtn}
            onPress={openProModal}
            activeOpacity={0.8}
          >
            <FontAwesome5 name="crown" size={13} color={THEME.colors.oroClaro} style={{ marginRight: 8 }} />
            <Text style={styles.proRequestBtnText}>⭐ Solicitar Prueba del Plan PRO</Text>
          </TouchableOpacity>

          {/* Toggle Register / Login Mode */}
          <TouchableOpacity
            style={styles.toggleModeBtn}
            onPress={() => {
              setIsRegisterMode(!isRegisterMode);
              setPassword('');
              setConfirmPassword('');
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.toggleModeText}>
              {isRegisterMode ? (
                <>¿Ya tienes cuenta? <Text style={styles.toggleModeHighlight}>Inicia Sesión</Text></>
              ) : (
                <>¿No tienes cuenta? <Text style={styles.toggleModeHighlight}>Regístrate aquí</Text></>
              )}
            </Text>
          </TouchableOpacity>

          {/* Terms Link */}
          <View style={styles.linksContainer}>
            <TouchableOpacity onPress={() => setTermsModalVisible(true)} activeOpacity={0.7}>
              <Text style={styles.linkMuted}>{t('terms') || 'Términos y condiciones de uso'}</Text>
            </TouchableOpacity>
          </View>
        </Panel>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <MaterialCommunityIcons name="shield-check" size={16} color={THEME.colors.jade} />
          <Text style={styles.securityText}>Conexión cifrada TLS / TDS puerto 1433 TCP</Text>
        </View>

        {/* Telegram ToolForg3 & Produced by ToolForg3 */}
        <View style={styles.brandingSection}>
          <TouchableOpacity
            style={styles.telegramButton}
            onPress={() => Linking.openURL('https://t.me/ToolForg3').catch(() => Alert.alert('Telegram', 'Canal oficial: https://t.me/ToolForg3'))}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name={"send" as any} size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.telegramButtonText}>Telegram ToolForg3</Text>
          </TouchableOpacity>
          <Text style={styles.producedByText}>Producido por ToolForg3 • v{APP_VERSION}</Text>
        </View>
      </ScrollView>

      {/* Password Recovery Modal with OTP */}
      <Modal
        visible={forgotModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setForgotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="lock-reset" size={24} color={THEME.colors.primaryOrange} />
                <Text style={styles.modalTitle}>Recuperar Contraseña</Text>
              </View>
              <TouchableOpacity
                onPress={() => setForgotModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal de recuperación"
              >
                <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {forgotStep === 1 ? (
                <View>
                  <Text style={{ color: THEME.colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 16 }}>
                    Ingresa tu correo electrónico registrado o nombre de usuario. Te enviaremos un código de seguridad de 6 dígitos para restablecer tu contraseña.
                  </Text>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Correo Electrónico o Usuario</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="email-outline" size={20} color={THEME.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="tu@correo.com o tu_usuario"
                        placeholderTextColor={THEME.colors.textMuted}
                        value={forgotEmail}
                        onChangeText={setForgotEmail}
                        autoCapitalize="none"
                      />
                    </View>
                  </View>

                  <CustomButton
                    title="Enviar Código de Verificación"
                    onPress={handleRequestResetCode}
                    variant="orange"
                    loading={forgotLoading}
                    icon="email-send-outline"
                    size="md"
                    style={{ marginTop: 8 }}
                  />
                </View>
              ) : (
                <View>
                  <Text style={{ color: THEME.colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
                    Ingresa el código OTP de 6 dígitos que enviamos a tu correo y tu nueva contraseña.
                  </Text>

                  {/* Locked / Read-Only Recovery Email Badge */}
                  <View style={styles.lockedEmailBadge}>
                    <MaterialCommunityIcons name="lock" size={18} color={THEME.colors.primaryOrange} />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontSize: 10, color: THEME.colors.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                        Cuenta a recuperar (bloqueada)
                      </Text>
                      <Text style={{ fontSize: 14, color: '#FFF', fontWeight: '700' }} numberOfLines={1}>
                        {forgotEmail}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setForgotStep(1)} style={styles.changeEmailBtn}>
                      <Text style={{ fontSize: 11, color: THEME.colors.textSecondary }}>Cambiar</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.label}>Código de Seguridad (6 dígitos)</Text>
                      <TouchableOpacity
                        onPress={handlePasteForgotCode}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                        accessibilityLabel="Pegar código de seguridad desde portapapeles"
                      >
                        <MaterialCommunityIcons name="content-paste" size={14} color={THEME.colors.primaryOrange} />
                        <Text style={{ color: THEME.colors.primaryOrange, fontSize: 11, fontWeight: '700' }}>Pegar</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="numeric" size={20} color={THEME.colors.primaryOrange} style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, { letterSpacing: 4, fontWeight: '800', fontSize: 16 }]}
                        placeholder="123456"
                        placeholderTextColor={THEME.colors.textMuted}
                        value={forgotCode}
                        onChangeText={setForgotCode}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nueva Contraseña</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="lock-outline" size={20} color={THEME.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={THEME.colors.textMuted}
                        value={forgotNewPass}
                        onChangeText={setForgotNewPass}
                        secureTextEntry={forgotSecure}
                      />
                      <TouchableOpacity onPress={() => setForgotSecure(!forgotSecure)} style={styles.eyeBtn}>
                        <MaterialCommunityIcons name={forgotSecure ? 'eye-off-outline' : 'eye-outline'} size={20} color={THEME.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirmar Nueva Contraseña</Text>
                    <View style={styles.inputWrapper}>
                      <MaterialCommunityIcons name="lock-check-outline" size={20} color={THEME.colors.textSecondary} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor={THEME.colors.textMuted}
                        value={forgotConfirmPass}
                        onChangeText={setForgotConfirmPass}
                        secureTextEntry={forgotSecure}
                      />
                    </View>
                  </View>

                  <CustomButton
                    title="Restablecer Contraseña"
                    onPress={handleConfirmResetPassword}
                    variant="orange"
                    loading={forgotLoading}
                    icon="check-circle-outline"
                    size="md"
                    style={{ marginTop: 8 }}
                  />

                  <TouchableOpacity
                    style={{ alignItems: 'center', marginTop: 12 }}
                    onPress={() => setForgotStep(1)}
                  >
                    <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>← Volver a ingresar correo</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Registration Verification Modal */}
      <Modal
        visible={verifyModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVerifyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="email-check-outline" size={24} color={THEME.colors.primaryOrange} />
                <Text style={styles.modalTitle}>Verificar Cuenta</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVerifyModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal de verificación"
              >
                <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={{ color: THEME.colors.textSecondary, fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
                Hemos enviado un código numérico de 6 dígitos a tu correo. Ingrésalo a continuación para activar tu cuenta e iniciar sesión.
              </Text>

              {!isEditingVerifyEmail && verifyEmail ? (
                <View style={styles.lockedEmailBadge}>
                  <MaterialCommunityIcons name="email-check" size={18} color={THEME.colors.primaryOrange} />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 10, color: THEME.colors.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                      Cuenta / Correo a verificar
                    </Text>
                    <Text style={{ fontSize: 14, color: '#FFF', fontWeight: '700' }} numberOfLines={1}>
                      {verifyEmail}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsEditingVerifyEmail(true)}
                    style={styles.changeEmailBtn}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={{ fontSize: 11, color: THEME.colors.textSecondary }}>Cambiar</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Correo o Nombre de Usuario</Text>
                  <View style={styles.inputWrapper}>
                    <MaterialCommunityIcons name="email-outline" size={20} color={THEME.colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="tu@correo.com o tu_usuario"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={verifyEmail}
                      onChangeText={setVerifyEmail}
                      autoCapitalize="none"
                    />
                    {verifyEmail.trim().length > 0 ? (
                      <TouchableOpacity
                        onPress={() => setIsEditingVerifyEmail(false)}
                        style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                      >
                        <Text style={{ color: THEME.colors.primaryOrange, fontSize: 12, fontWeight: '700' }}>OK</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              )}

              <View style={styles.inputGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.label}>Código de Activación (6 dígitos)</Text>
                  <TouchableOpacity
                    onPress={handlePasteVerifyCode}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 6 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Pegar código de activación desde portapapeles"
                  >
                    <MaterialCommunityIcons name="content-paste" size={14} color={THEME.colors.primaryOrange} />
                    <Text style={{ color: THEME.colors.primaryOrange, fontSize: 11, fontWeight: '700' }}>Pegar</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="numeric" size={20} color={THEME.colors.primaryOrange} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { letterSpacing: 4, fontWeight: '800', fontSize: 16 }]}
                    placeholder="123456"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={verifyCode}
                    onChangeText={setVerifyCode}
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                </View>
              </View>

              <CustomButton
                title="Activar mi Cuenta"
                onPress={handleVerifyRegistration}
                variant="orange"
                loading={verifyLoading}
                icon="check-decagram"
                size="md"
                style={{ marginTop: 8 }}
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <TouchableOpacity
                  onPress={handleResendVerification}
                  disabled={resendLoading}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={{ color: THEME.colors.primaryOrange, fontSize: 12, fontWeight: '600' }}>
                    {resendLoading ? 'Reenviando...' : 'Reenviar Código'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setVerifyModalVisible(false)}
                  style={{ paddingVertical: 6 }}
                >
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 12 }}>
                    Cerrar
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Professional Terms and Conditions Modal */}
      <TermsAndConditionsModal
        visible={termsModalVisible}
        onClose={() => setTermsModalVisible(false)}
      />

      {/* Modal: Solicitar Prueba del Plan PRO */}
      <Modal
        visible={proModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setProModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <FontAwesome5 name="crown" size={18} color={THEME.colors.oroClaro} />
                <Text style={styles.modalTitle}>Solicitar Prueba PRO</Text>
              </View>
              <TouchableOpacity
                onPress={() => setProModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Cerrar modal de solicitud PRO"
              >
                <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={{ color: THEME.colors.textoSecundario, fontSize: 12, lineHeight: 18, marginBottom: 12 }}>
                Esta solicitud se enviará directamente al Panel de Control del Administrador con el identificador único de tu dispositivo para gestionar tu prueba del Plan PRO.
              </Text>

              {/* HWID Device Badge */}
              <View style={styles.lockedEmailBadge}>
                <MaterialCommunityIcons name="cellphone-key" size={20} color={THEME.colors.oroClaro} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={{ fontSize: 10, color: THEME.colors.textMuted, textTransform: 'uppercase', fontWeight: '700' }}>
                    ID de este Celular (HWID)
                  </Text>
                  <Text style={{ fontSize: 12, color: THEME.colors.texto, fontWeight: '700' }} numberOfLines={1}>
                    {proHwid || 'Detectando ID...'}
                  </Text>
                </View>
              </View>

              {/* Nombre / Administrador */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre o Apodo</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="user" size={18} color={THEME.colors.oro} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Administrador Luis"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={proName}
                    onChangeText={setProName}
                  />
                </View>
              </View>

              {/* Teléfono / WhatsApp */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Teléfono / WhatsApp (Opcional)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="whatsapp" size={20} color={THEME.colors.jade} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="+54 9 11 1234-5678"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={proPhone}
                    onChangeText={setProPhone}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              {/* Correo Electrónico */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Correo Electrónico (Opcional)</Text>
                <View style={styles.inputWrapper}>
                  <Feather name="mail" size={18} color={THEME.colors.arcano} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="admin@tuservidor.com"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={proEmail}
                    onChangeText={setProEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              {/* Nombre del Servidor */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nombre de tu Servidor MU (Opcional)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialCommunityIcons name="server" size={18} color={THEME.colors.oro} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ej: Mu Argentina S6"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={proServer}
                    onChangeText={setProServer}
                  />
                </View>
              </View>

              {/* Notas adicionales */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Mensaje o Consulta (Opcional)</Text>
                <View style={[styles.inputWrapper, { minHeight: 64, alignItems: 'flex-start' }]}>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    placeholder="Versión de Season o consultas adicionales..."
                    placeholderTextColor={THEME.colors.textMuted}
                    value={proNotes}
                    onChangeText={setProNotes}
                    multiline={true}
                  />
                </View>
              </View>

              {/* Enviar Solicitud Button */}
              <BotonOro
                titulo="Enviar Solicitud al Panel"
                onPress={handleSendProRequest}
                cargando={proLoading}
                icono="check-circle"
                altura={48}
                style={{ marginTop: 8 }}
              />

              <TouchableOpacity
                style={{ alignItems: 'center', marginTop: 12, paddingVertical: 6 }}
                onPress={() => setProModalVisible(false)}
              >
                <Text style={{ color: THEME.colors.textoSecundario, fontSize: 12 }}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  crownIcon: {
    position: 'absolute',
    top: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: THEME.typography.trackingWide,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  brandSubtitle: {
    fontSize: 11,
    color: THEME.colors.textoSecundarioLuminoso,
    marginTop: 4,
    letterSpacing: 1.5,
    fontWeight: '700',
    textTransform: 'uppercase',
    ...THEME.effects.textShadowSubtle,
  },
  versionBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  versionText: {
    fontSize: 10,
    color: THEME.colors.oro,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  card: {
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 11,
    color: THEME.colors.textoSecundarioLuminoso,
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    ...THEME.effects.textShadowSubtle,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 12,
    minHeight: THEME.shapes.alturaMinima,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: THEME.colors.texto,
    paddingVertical: 10,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 10,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 12,
    color: THEME.colors.textoSecundario,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 8,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    marginTop: 12,
  },
  googleBtnText: {
    color: THEME.colors.texto,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  toggleModeBtn: {
    marginTop: 16,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleModeText: {
    fontSize: 13,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    ...THEME.effects.textShadowSubtle,
  },
  toggleModeHighlight: {
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
  },
  linksContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  linkOrange: {
    fontSize: 12,
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
  },
  dotSeparator: {
    color: THEME.colors.borde,
  },
  linkMuted: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 6,
  },
  securityText: {
    fontSize: 11,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
  },
  brandingSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 18,
    marginBottom: 24,
    gap: 8,
  },
  telegramButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  telegramButtonText: {
    color: THEME.colors.arcano,
    fontWeight: 'bold',
    fontSize: 12,
  },
  producedByText: {
    fontSize: 11,
    color: THEME.colors.oro,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 7, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7,
    shadowRadius: 16,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
  },
  lockedEmailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(181, 143, 60, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 12,
    marginBottom: 16,
  },
  changeEmailBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  proRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(232, 200, 106, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 106, 0.35)',
    borderRadius: THEME.shapes.radioEsquina,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  proRequestBtnText: {
    color: THEME.colors.oroClaro,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
