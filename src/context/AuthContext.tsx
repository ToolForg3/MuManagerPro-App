import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { GothicAlert as Alert } from '../components/common/GothicAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService, sha256 } from '../services/security/securityService';
import { SqlClient } from '../services/database/sqlClient';
import { LicenseService } from '../services/security/licenseService';
import { SecureStorage } from '../services/security/secureStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string;
  userName: string;
  rememberEmail: boolean;
  rememberUser: boolean;
  isLoading: boolean;
  isDemoSession: boolean;
  demoRemainingSeconds: number;
  isDemoExpired: boolean;
  clearDemoExpiredNotice: () => void;
  login: (usernameOrEmail: string, pass: string, remember: boolean) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string }>;
  loginWithToken: (token: string, userData: { email: string; username: string }) => Promise<{ success: boolean; error?: string }>;
  loginDemo: () => Promise<{ success: boolean; error?: string }>;
  register: (email: string, pass: string, username?: string) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string; message?: string; pendingSmtp?: boolean; devCode?: string }>;
  verifyRegistration: (email: string, code: string) => Promise<{ success: boolean; token?: string; error?: string; message?: string }>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; message?: string; error?: string; pendingSmtp?: boolean; devCode?: string }>;
  logout: () => Promise<void>;
  logoutDemo: () => Promise<void>;
  savedEmail: string;
  savedUsername: string;
}

const AUTH_STORAGE_KEY = '@mumanager_auth_session';
const SAVED_EMAIL_KEY = '@mumanager_saved_email';
const SAVED_USERNAME_KEY = '@mumanager_saved_username';
const DEMO_SESSION_KEY = '@mumanager_demo_session';
const DEMO_START_TIME_KEY = '@mumanager_demo_start_time';
export const QUICK_DEMO_CONSUMED_KEY_PREFIX = '@mumanager_quick_demo_consumed_';
export const DEMO_DURATION_SECONDS = 600; // 10 minutos exactos

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userEmail: '',
  userName: '',
  rememberEmail: true,
  rememberUser: true,
  isLoading: true,
  isDemoSession: false,
  demoRemainingSeconds: DEMO_DURATION_SECONDS,
  isDemoExpired: false,
  clearDemoExpiredNotice: () => {},
  login: async () => ({ success: false }),
  loginWithToken: async () => ({ success: false }),
  loginDemo: async () => ({ success: false }),
  register: async () => ({ success: false }),
  verifyRegistration: async () => ({ success: false }),
  resendVerificationCode: async () => ({ success: false }),
  logout: async () => {},
  logoutDemo: async () => {},
  savedEmail: '',
  savedUsername: '',
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [rememberEmail, setRememberEmail] = useState<boolean>(true);
  const [rememberUser, setRememberUser] = useState<boolean>(true);
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [savedUsername, setSavedUsername] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoSession, setIsDemoSession] = useState<boolean>(false);
  const [demoRemainingSeconds, setDemoRemainingSeconds] = useState<number>(DEMO_DURATION_SECONDS);
  const [isDemoExpired, setIsDemoExpired] = useState<boolean>(false);

  const clearDemoExpiredNotice = () => setIsDemoExpired(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        // Purgar de forma preventiva cualquier contraseña residual en texto plano de versiones anteriores
        AsyncStorage.removeItem('@mumanager_auth_password').catch(() => {});

        const authEmail = await AsyncStorage.getItem('@mumanager_auth_email');
        const authUser = await AsyncStorage.getItem('@mumanager_auth_username');
        const savedEmailVal = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
        const savedUserVal = await AsyncStorage.getItem(SAVED_USERNAME_KEY);
        const storedEmail = (authEmail || savedEmailVal || '').trim();
        const storedUser = (authUser || savedUserVal || storedEmail.split('@')[0] || '').trim();
        const session = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        let token = await SqlClient.getSessionToken();
        if (savedUserVal) {
          setSavedUsername(savedUserVal);
        } else if (storedUser) {
          setSavedUsername(storedUser);
        }
        if (savedEmailVal) {
          setSavedEmail(savedEmailVal);
        } else if (storedEmail) {
          setSavedEmail(storedEmail);
        }
        const isDemo = await AsyncStorage.getItem(DEMO_SESSION_KEY);
        if (session === 'active') {
          if (isDemo === 'true') {
            if (LicenseService.isPro()) {
              setIsDemoSession(false);
              setIsDemoExpired(false);
              await AsyncStorage.removeItem(DEMO_SESSION_KEY);
              await AsyncStorage.removeItem(DEMO_START_TIME_KEY);
              setUserEmail(storedEmail || 'demo@muonline.local');
              setUserName(storedUser || 'Demo');
              SqlClient.setActiveUser(storedUser || storedEmail || 'Demo');
              setIsAuthenticated(true);
              return;
            }
            const startStr = await AsyncStorage.getItem(DEMO_START_TIME_KEY);
            const startTime = startStr ? parseInt(startStr, 10) : 0;
            const elapsed = Date.now() - startTime;
            const maxDurationMs = DEMO_DURATION_SECONDS * 1000;
            if (elapsed >= maxDurationMs) {
              // Sesión demo de 10 minutos expirada
              const hwid = await SecurityService.getDeviceHwid().catch(() => '');
              if (hwid) {
                await AsyncStorage.setItem(`${QUICK_DEMO_CONSUMED_KEY_PREFIX}${hwid}`, 'true');
                const bridgeUrl = SqlClient.getBridgeUrl();
                fetch(`${bridgeUrl}/api/auth/demo-quick-consumed`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ hwid }),
                }).catch(() => {});
              }
              await logoutDemo();
              setIsDemoExpired(true);
              return;
            }
            setIsDemoSession(true);
            setDemoRemainingSeconds(Math.max(0, Math.ceil((maxDurationMs - elapsed) / 1000)));
            setUserEmail('demo@muonline.local');
            setUserName('Demo');
            SqlClient.setActiveUser('Demo');
            setIsAuthenticated(true);
            return;
          }

          if (storedEmail || storedUser) {
            // Validar token contra la pasarela antes de asumir sesión activa
            let isValidSession = false;
            if (token) {
              try {
                const bridgeUrl = SqlClient.getBridgeUrl();
                const hwid = await SecurityService.getDeviceHwid();
                const valRes = await fetch(`${bridgeUrl}/api/auth/validate-session`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'X-Device-Hwid': hwid,
                  },
                  body: JSON.stringify({ token, hwid }),
                });
                if (valRes.ok) {
                  const valData = await valRes.json();
                  if (valData && valData.success && valData.valid) {
                    isValidSession = true;
                  }
                } else if (valRes.status === 401 || valRes.status === 403) {
                  // Token rechazado o expirado
                  console.log('[AuthContext] Token rechazado por el servidor:', valRes.status);
                  isValidSession = false;
                }
              } catch (netErr) {
                // Si la red no responde, permitir continuar en modo offline si hay credencial guardada
                isValidSession = true;
              }
            }

            if (!isValidSession && token) {
              // El token fue rechazado por el servidor (ej: tras actualizar el APK o reiniciar servidor)
              await SqlClient.setSessionToken('');
              await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
              setIsAuthenticated(false);
              setIsDemoSession(false);
              return;
            }

            setIsDemoSession(false);
            setUserEmail(storedEmail);
            setUserName(storedUser);
            SqlClient.setActiveUser(storedUser || storedEmail);
            setIsAuthenticated(true);
            SecurityService.getDeviceHwid().then(hwid => {
              const currentLicense = LicenseService.getStatus();
              SqlClient.sendTelemetryPing(
                hwid,
                currentLicense.plan || 'DEMO',
                currentLicense.licenseKey,
                storedEmail,
                storedUser || storedEmail.split('@')[0]
              ).catch(() => {});
            }).catch(() => {});
          } else {
            setIsAuthenticated(false);
            setIsDemoSession(false);
          }
        } else {
          setIsAuthenticated(false);
          setIsDemoSession(false);
        }
      } catch (e) {
        console.warn('Auth restore error', e);
        setIsAuthenticated(false);
        setIsDemoSession(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();

    LicenseService.onSessionInvalidated((reason) => {
      const msg = reason || 'Tu sesión ha finalizado. Por favor inicia sesión nuevamente.';
      Alert.alert(
        'Sesión Finalizada',
        msg,
        [{ text: 'Entendido' }]
      );
      logout();
    });
    const unsubLicense = LicenseService.subscribe((status) => {
      if (status.isActivated && status.plan === 'PRO' && !status.isBlocked) {
        setIsDemoSession(false);
        setIsDemoExpired(false);
        AsyncStorage.removeItem(DEMO_SESSION_KEY).catch(() => {});
        AsyncStorage.removeItem(DEMO_START_TIME_KEY).catch(() => {});
      }
    });

    return () => {
      unsubLicense();
    };
  }, []);

  // Temporizador regresivo de 10 minutos para la sesión de Modo Demo
  useEffect(() => {
    let interval: any = null;
    if (isAuthenticated && isDemoSession) {
      if (LicenseService.isPro()) {
        setIsDemoSession(false);
        setIsDemoExpired(false);
        AsyncStorage.removeItem(DEMO_SESSION_KEY).catch(() => {});
        AsyncStorage.removeItem(DEMO_START_TIME_KEY).catch(() => {});
        return;
      }

      interval = setInterval(async () => {
        if (LicenseService.isPro()) {
          if (interval) clearInterval(interval);
          setIsDemoSession(false);
          setIsDemoExpired(false);
          AsyncStorage.removeItem(DEMO_SESSION_KEY).catch(() => {});
          AsyncStorage.removeItem(DEMO_START_TIME_KEY).catch(() => {});
          return;
        }

        const startStr = await AsyncStorage.getItem(DEMO_START_TIME_KEY);
        const startTime = startStr ? parseInt(startStr, 10) : Date.now();
        const elapsed = Date.now() - startTime;
        const maxDurationMs = DEMO_DURATION_SECONDS * 1000;
        const remaining = Math.max(0, Math.ceil((maxDurationMs - elapsed) / 1000));
        setDemoRemainingSeconds(remaining);

        if (elapsed >= maxDurationMs) {
          if (interval) clearInterval(interval);
          const hwid = await SecurityService.getDeviceHwid().catch(() => '');
          if (hwid) {
            await AsyncStorage.setItem(`${QUICK_DEMO_CONSUMED_KEY_PREFIX}${hwid}`, 'true');
            const bridgeUrl = SqlClient.getBridgeUrl();
            fetch(`${bridgeUrl}/api/auth/demo-quick-consumed`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ hwid }),
            }).catch(() => {});
          }
          await logoutDemo();
          setIsDemoExpired(true);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, isDemoSession]);

  const login = async (
    usernameOrEmail: string,
    pass: string,
    remember: boolean
  ): Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string }> => {
    if (!usernameOrEmail || !pass) return { success: false, error: 'Usuario y contraseña requeridos.' };

    const cleanPass = pass.trim();
    const cleanUser = usernameOrEmail.trim();

    // 1. Intentar autenticación remota para obtener token oficial
    let remoteSuccess = false;
    let remoteToken = '';
    let resolvedUser = cleanUser;
    let resolvedEmail = cleanUser.includes('@') ? cleanUser : '';

    try {
      const bridgeUrl = SqlClient.getBridgeUrl();
      const hwid = await SecurityService.getDeviceHwid();
      const res = await fetch(`${bridgeUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleanUser,
          email: cleanUser,
          password: cleanPass,
          hwid,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        remoteSuccess = true;
        if (data.token) {
          remoteToken = data.token;
          SqlClient.setSessionToken(data.token);
        }
        if (data.user) {
          resolvedUser = data.user.username || cleanUser;
          resolvedEmail = data.user.email || resolvedEmail;
        }
      } else if (data.error === 'PENDING_VERIFICATION' || data.requiresVerification) {
        return {
          success: false,
          requiresVerification: true,
          email: data.email,
          error: data.message || 'Tu cuenta está pendiente de verificación.',
        };
      } else if (!res.ok) {
        return {
          success: false,
          error: data.message || data.error || 'Usuario o contraseña incorrectos.',
        };
      }
    } catch (e) {
      console.warn('Remote login error, checking local password', e);
    }

    // 2. Contraseña configurada localmente para este usuario específico (modo offline legítimo con hash cifrado)
    const storedHash = await SecureStorage.getItem('@mumanager_auth_pwhash');
    const storedEmail = await AsyncStorage.getItem('@mumanager_auth_email');
    const storedUsername = await AsyncStorage.getItem('@mumanager_auth_username');
    const cleanLower = cleanUser.toLowerCase();
    const isConfiguredKey = storedHash && (storedEmail || storedUsername)
      ? (
          (storedUsername && sha256(cleanPass + ':' + storedUsername.toLowerCase()) === storedHash && (
            cleanLower === storedUsername.toLowerCase() ||
            (storedEmail && cleanLower === storedEmail.toLowerCase())
          )) ||
          (storedEmail && sha256(cleanPass + ':' + storedEmail.toLowerCase()) === storedHash && (
            cleanLower === storedUsername?.toLowerCase() ||
            cleanLower === storedEmail.toLowerCase()
          ))
        )
      : false;

    if (!remoteSuccess && isConfiguredKey) {
      resolvedUser = storedUsername || resolvedUser;
      resolvedEmail = storedEmail || resolvedEmail;
    }

    if (remoteSuccess || isConfiguredKey) {
      setIsAuthenticated(true);
      setUserName(resolvedUser);
      setUserEmail(resolvedEmail || resolvedUser);
      SqlClient.setActiveUser(resolvedUser);
      setRememberUser(remember);
      setRememberEmail(remember);
      setIsDemoSession(false);
      setIsDemoExpired(false);
      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'active');
        await AsyncStorage.removeItem('@mumanager_auth_password'); // Eliminar residuo texto plano
        await AsyncStorage.removeItem(DEMO_SESSION_KEY);
        await AsyncStorage.removeItem(DEMO_START_TIME_KEY);
        await SecureStorage.setItem('@mumanager_auth_pwhash', sha256(cleanPass + ':' + resolvedUser.toLowerCase()));
        await AsyncStorage.setItem('@mumanager_auth_username', resolvedUser);
        if (resolvedEmail) await AsyncStorage.setItem('@mumanager_auth_email', resolvedEmail);
        if (remember) {
          await AsyncStorage.setItem(SAVED_USERNAME_KEY, resolvedUser);
          if (resolvedEmail) await AsyncStorage.setItem(SAVED_EMAIL_KEY, resolvedEmail);
        } else {
          await AsyncStorage.removeItem(SAVED_USERNAME_KEY);
          await AsyncStorage.removeItem(SAVED_EMAIL_KEY);
        }
        const hwid = await SecurityService.getDeviceHwid();
        const currentLicense = LicenseService.getStatus();
        SqlClient.sendTelemetryPing(
          hwid,
          currentLicense.plan || 'DEMO',
          currentLicense.licenseKey,
          resolvedEmail || `${resolvedUser}@muonline.local`,
          resolvedUser
        ).catch(() => {});
      } catch (e) {
        console.warn('Error saving session', e);
      }
      return { success: true };
    }

    return { success: false, error: 'Usuario o contraseña incorrectos.' };
  };

  const loginWithToken = async (
    token: string,
    userData: { email: string; username: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const cleanUser = String(userData.username || userData.email.split('@')[0] || 'Usuario').trim();
      const cleanEmail = String(userData.email || '').trim().toLowerCase();

      SqlClient.setSessionToken(token);
      setIsAuthenticated(true);
      setUserName(cleanUser);
      setUserEmail(cleanEmail || `${cleanUser}@muonline.local`);
      SqlClient.setActiveUser(cleanUser);
      setIsDemoSession(false);
      setIsDemoExpired(false);

      await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'active');
      await AsyncStorage.removeItem('@mumanager_auth_password');
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      await AsyncStorage.removeItem(DEMO_START_TIME_KEY);
      await SecureStorage.setItem('@mumanager_session_token', token);
      await AsyncStorage.setItem('@mumanager_auth_username', cleanUser);
      if (cleanEmail) await AsyncStorage.setItem('@mumanager_auth_email', cleanEmail);
      await AsyncStorage.setItem(SAVED_USERNAME_KEY, cleanUser);
      if (cleanEmail) await AsyncStorage.setItem(SAVED_EMAIL_KEY, cleanEmail);

      const hwid = await SecurityService.getDeviceHwid();
      const currentLicense = LicenseService.getStatus();
      SqlClient.sendTelemetryPing(
        hwid,
        currentLicense.plan || 'DEMO',
        currentLicense.licenseKey,
        cleanEmail,
        cleanUser
      ).catch(() => {});

      return { success: true };
    } catch (e: any) {
      console.warn('[loginWithToken Error]', e);
      return { success: false, error: e.message || 'Error al iniciar sesión con token' };
    }
  };

  const loginDemo = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const isDevicePro = LicenseService.isPro();
      const hwid = await SecurityService.getDeviceHwid();
      const localConsumed = await AsyncStorage.getItem(`${QUICK_DEMO_CONSUMED_KEY_PREFIX}${hwid}`);
      if (localConsumed === 'true' && !isDevicePro) {
        return {
          success: false,
          error: 'El tiempo de acceso rápido de 10 minutos para este dispositivo ya ha sido utilizado. Crea tu cuenta para disfrutar de 72 horas de prueba.',
        };
      }

      const bridgeUrl = SqlClient.getBridgeUrl();
      const meta = SecurityService.getDeviceMetadata();
      let token = '';
      try {
        const res = await fetch(`${bridgeUrl}/api/auth/demo-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hwid,
            deviceModel: meta.model,
            deviceBrand: meta.brand,
            isEmulator: meta.isEmulator,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success && data.token) {
          token = data.token;
          SqlClient.setSessionToken(data.token);
        } else if (!res.ok || !data.success) {
          if (!isDevicePro && (res.status === 403 || data.error === 'QUICK_DEMO_EXPIRED')) {
            await AsyncStorage.setItem(`${QUICK_DEMO_CONSUMED_KEY_PREFIX}${hwid}`, 'true');
            return {
              success: false,
              error: data.message || 'El tiempo de prueba rápida de 10 minutos para este dispositivo ha finalizado. Por favor regístrate y crea tu cuenta para disfrutar de 72 horas de prueba completa.',
            };
          }
          if (!isDevicePro) {
            return {
              success: false,
              error: data.message || data.error || 'No se pudo iniciar la sesión demo.',
            };
          }
        }
      } catch (e) {
        console.warn('Remote demo login error, checking local fallback', e);
      }

      if (!token) {
        token = `LOCAL_DEMO_${hwid}_${Date.now()}`;
        SqlClient.setSessionToken(token);
      }

      setIsAuthenticated(true);
      setRememberUser(false);
      setRememberEmail(false);

      if (isDevicePro) {
        setUserName('PRO User');
        setUserEmail('pro@muonline.local');
        SqlClient.setActiveUser('PRO User');
        setIsDemoSession(false);
        setIsDemoExpired(false);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'active');
        await AsyncStorage.removeItem(DEMO_SESSION_KEY);
        await AsyncStorage.removeItem(DEMO_START_TIME_KEY);
      } else {
        setUserName('Demo');
        setUserEmail('demo@muonline.local');
        SqlClient.setActiveUser('Demo');
        setIsDemoSession(true);
        setDemoRemainingSeconds(DEMO_DURATION_SECONDS);
        setIsDemoExpired(false);
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'active');
        await AsyncStorage.setItem(DEMO_SESSION_KEY, 'true');
        await AsyncStorage.setItem(DEMO_START_TIME_KEY, Date.now().toString());
      }

      const currentLicense = LicenseService.getStatus();
      SqlClient.sendTelemetryPing(
        hwid,
        currentLicense.plan || (isDevicePro ? 'PRO' : 'DEMO'),
        currentLicense.licenseKey,
        isDevicePro ? 'pro@muonline.local' : 'demo@muonline.local',
        isDevicePro ? 'PRO User' : 'Demo'
      ).catch(() => {});

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Error al iniciar sesión demo.' };
    }
  };

  const register = async (
    email: string,
    pass: string,
    username?: string
  ): Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string; message?: string; pendingSmtp?: boolean; devCode?: string }> => {
    if (!email || !pass) return { success: false, error: 'Email y contraseña requeridos.' };
    const cleanEmail = email.trim();
    const cleanPass = pass.trim();

    try {
      const bridgeUrl = SqlClient.getBridgeUrl();
      const hwid = await SecurityService.getDeviceHwid();
      const res = await fetch(`${bridgeUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: cleanPass,
          username: username?.trim(),
          hwid,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          requiresVerification: data.requiresVerification !== false,
          email: cleanEmail,
          message: data.message,
          pendingSmtp: data.pendingSmtp,
          devCode: data.devCode,
        };
      } else {
        return { success: false, error: data.error || 'Error al registrar cuenta' };
      }
    } catch (e: any) {
      return { success: false, error: 'No se pudo conectar con el servidor de registro.' };
    }
  };

  const verifyRegistration = async (
    email: string,
    code: string
  ): Promise<{ success: boolean; token?: string; error?: string; message?: string }> => {
    const cleanEmail = email.trim();
    const cleanCode = code.trim();
    if (!cleanEmail || !cleanCode) {
      return { success: false, error: 'Correo y código de verificación requeridos.' };
    }

    try {
      const bridgeUrl = SqlClient.getBridgeUrl();
      const hwid = await SecurityService.getDeviceHwid();
      const res = await fetch(`${bridgeUrl}/api/auth/verify-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code: cleanCode, hwid }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (data.token) {
          SqlClient.setSessionToken(data.token);
        }
        const resolvedVerifiedEmail = (data.user && data.user.email) ? data.user.email : cleanEmail;
        const resolvedVerifiedUsername = (data.user && data.user.username) ? data.user.username : (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail);
        setIsAuthenticated(true);
        setUserEmail(resolvedVerifiedEmail);
        setUserName(resolvedVerifiedUsername);
        SqlClient.setActiveUser(resolvedVerifiedUsername);
        try {
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'active');
          await AsyncStorage.setItem('@mumanager_auth_email', resolvedVerifiedEmail);
          await AsyncStorage.setItem('@mumanager_auth_username', resolvedVerifiedUsername);
          await AsyncStorage.setItem(SAVED_EMAIL_KEY, resolvedVerifiedEmail);
          await AsyncStorage.setItem(SAVED_USERNAME_KEY, resolvedVerifiedUsername);
          const currentLicense = LicenseService.getStatus();
          SqlClient.sendTelemetryPing(
            hwid,
            currentLicense.plan || 'DEMO',
            currentLicense.licenseKey,
            resolvedVerifiedEmail,
            resolvedVerifiedUsername
          ).catch(() => {});
        } catch (e) {
          console.warn('Error saving verified session', e);
        }
        return { success: true, token: data.token, message: data.message };
      } else {
        return { success: false, error: data.error || 'Código incorrecto o expirado.' };
      }
    } catch (e: any) {
      return { success: false, error: 'Error de red al verificar el código.' };
    }
  };

  const resendVerificationCode = async (
    email: string
  ): Promise<{ success: boolean; message?: string; error?: string; pendingSmtp?: boolean; devCode?: string }> => {
    const cleanEmail = email.trim();
    if (!cleanEmail) return { success: false, error: 'Correo requerido.' };

    try {
      const bridgeUrl = SqlClient.getBridgeUrl();
      const hwid = await SecurityService.getDeviceHwid();
      const res = await fetch(`${bridgeUrl}/api/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, hwid }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message, pendingSmtp: data.pendingSmtp, devCode: data.devCode };
      } else {
        return { success: false, error: data.error || 'No se pudo reenviar el código.' };
      }
    } catch (e: any) {
      return { success: false, error: 'Error de conexión al reenviar código.' };
    }
  };

  const logout = async () => {
    setIsAuthenticated(false);
    setUserEmail('');
    setUserName('');
    setIsDemoSession(false);
    setDemoRemainingSeconds(DEMO_DURATION_SECONDS);
    SqlClient.setActiveUser('');
    SqlClient.setSessionToken('');
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem('@mumanager_auth_password');
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      await AsyncStorage.removeItem(DEMO_START_TIME_KEY);
      await SecureStorage.removeItem('@mumanager_session_token');
      await SecureStorage.removeItem('@mumanager_auth_pwhash');
    } catch (e) {
      console.warn('Error on logout', e);
    }
  };

  const logoutDemo = async () => {
    setIsAuthenticated(false);
    setIsDemoSession(false);
    setDemoRemainingSeconds(DEMO_DURATION_SECONDS);
    SqlClient.setActiveUser('');
    SqlClient.setSessionToken('');
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await AsyncStorage.removeItem(DEMO_SESSION_KEY);
      await AsyncStorage.removeItem(DEMO_START_TIME_KEY);
      await SecureStorage.removeItem('@mumanager_session_token');
      // Preservar credenciales locales del usuario registrado si existían
      const savedEmailVal = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
      const savedUserVal = await AsyncStorage.getItem(SAVED_USERNAME_KEY);
      const authEmail = await AsyncStorage.getItem('@mumanager_auth_email');
      const authUser = await AsyncStorage.getItem('@mumanager_auth_username');
      const restoredUser = savedUserVal || authUser || '';
      const restoredEmail = savedEmailVal || authEmail || '';
      setUserEmail(restoredEmail);
      setUserName(restoredUser);
    } catch (e) {
      console.warn('Error on logoutDemo', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        userEmail,
        userName,
        rememberEmail,
        rememberUser,
        isLoading,
        isDemoSession,
        demoRemainingSeconds,
        isDemoExpired,
        clearDemoExpiredNotice,
        login,
        loginWithToken,
        loginDemo,
        register,
        verifyRegistration,
        resendVerificationCode,
        logout,
        logoutDemo,
        savedEmail,
        savedUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
