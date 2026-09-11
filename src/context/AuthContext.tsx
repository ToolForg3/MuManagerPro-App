import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SecurityService } from '../services/security/securityService';
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
  login: (usernameOrEmail: string, pass: string, remember: boolean) => Promise<{ success: boolean; requiresVerification?: boolean; error?: string }>;
  register: (email: string, pass: string, username?: string) => Promise<{ success: boolean; requiresVerification?: boolean; email?: string; error?: string; message?: string; pendingSmtp?: boolean; devCode?: string }>;
  verifyRegistration: (email: string, code: string) => Promise<{ success: boolean; token?: string; error?: string; message?: string }>;
  resendVerificationCode: (email: string) => Promise<{ success: boolean; message?: string; error?: string; pendingSmtp?: boolean; devCode?: string }>;
  logout: () => Promise<void>;
  savedEmail: string;
  savedUsername: string;
}

const AUTH_STORAGE_KEY = '@mumanager_auth_session';
const SAVED_EMAIL_KEY = '@mumanager_saved_email';
const SAVED_USERNAME_KEY = '@mumanager_saved_username';

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  userEmail: '',
  userName: '',
  rememberEmail: true,
  rememberUser: true,
  isLoading: true,
  login: async () => ({ success: false }),
  register: async () => ({ success: false }),
  verifyRegistration: async () => ({ success: false }),
  resendVerificationCode: async () => ({ success: false }),
  logout: async () => {},
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

  useEffect(() => {
    const checkSession = async () => {
      try {
        const authEmail = await AsyncStorage.getItem('@mumanager_auth_email');
        const authUser = await AsyncStorage.getItem('@mumanager_auth_username');
        const savedEmailVal = await AsyncStorage.getItem(SAVED_EMAIL_KEY);
        const savedUserVal = await AsyncStorage.getItem(SAVED_USERNAME_KEY);
        const storedEmail = (authEmail || savedEmailVal || '').trim();
        const storedUser = (authUser || savedUserVal || storedEmail.split('@')[0] || '').trim();
        const storedPass = await AsyncStorage.getItem('@mumanager_auth_password');
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
        if (session === 'active' && storedEmail) {
          if (storedPass) {
            try {
              const bridgeUrl = SqlClient.getBridgeUrl();
              const hwid = await SecurityService.getDeviceHwid();
              const res = await fetch(`${bridgeUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: storedEmail, password: storedPass, hwid }),
              });
              const data = await res.json();
              if (res.ok && data.success && data.token) {
                SqlClient.setSessionToken(data.token);
                token = data.token;
              }
            } catch {}
          }
          if (!token) {
            const hwid = await SecurityService.getDeviceHwid();
            token = `LOCAL_DEV_${hwid}_${Date.now()}`;
            SqlClient.setSessionToken(token);
          }
          setUserEmail(storedEmail);
          SqlClient.setActiveUser(storedEmail);
          setIsAuthenticated(true);
          SecurityService.getDeviceHwid().then(hwid => {
            const currentLicense = LicenseService.getStatus();
            SqlClient.sendTelemetryPing(
              hwid,
              currentLicense.plan || 'DEMO',
              currentLicense.licenseKey,
              storedEmail,
              storedEmail.split('@')[0]
            ).catch(() => {});
          }).catch(() => {});
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.warn('Auth restore error', e);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    checkSession();

    LicenseService.onSessionInvalidated((reason) => {
      const msg = reason || 'Tu sesión ha sido finalizada por el administrador.';
      const isAccountAction = !reason || 
        reason.toLowerCase().includes('bloqueada') || 
        reason.toLowerCase().includes('suspendida') || 
        reason.toLowerCase().includes('eliminada') || 
        reason.toLowerCase().includes('revocada') ||
        reason.toLowerCase().includes('cerrada');
      if (isAccountAction) {
        Alert.alert(
          'Sesión Finalizada',
          msg,
          [{ text: 'Entendido' }]
        );
        logout();
      }
    });
  }, []);

  const login = async (
    usernameOrEmail: string,
    pass: string,
    remember: boolean
  ): Promise<{ success: boolean; requiresVerification?: boolean; error?: string }> => {
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
          error: data.message || 'Tu cuenta está pendiente de verificación.',
        };
      } else if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Usuario o contraseña incorrectos.',
        };
      }
    } catch (e) {
      console.warn('Remote login error, checking local password', e);
    }

    // 2. Contraseña configurada localmente para este usuario específico (modo offline legítimo)
    const storedPass = await AsyncStorage.getItem('@mumanager_auth_password');
    const storedEmail = await AsyncStorage.getItem('@mumanager_auth_email');
    const storedUsername = await AsyncStorage.getItem('@mumanager_auth_username');
    const isConfiguredKey = storedPass && (storedEmail || storedUsername)
      ? cleanPass === storedPass && (
          (storedUsername && cleanUser.toLowerCase() === storedUsername.toLowerCase()) ||
          (storedEmail && cleanUser.toLowerCase() === storedEmail.toLowerCase())
        )
      : false;

    if (remoteSuccess || isConfiguredKey) {
      if (!remoteToken) {
        const existingToken = await SqlClient.getSessionToken();
        if (!existingToken) {
          const hwid = await SecurityService.getDeviceHwid();
          SqlClient.setSessionToken(`LOCAL_DEV_${hwid}_${Date.now()}`);
        }
      }
      setIsAuthenticated(true);
      setUserName(resolvedUser);
      setUserEmail(resolvedEmail || resolvedUser);
      SqlClient.setActiveUser(resolvedUser);
      setRememberUser(remember);
      setRememberEmail(remember);
      try {
        await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'active');
        await AsyncStorage.setItem('@mumanager_auth_password', cleanPass);
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
        setIsAuthenticated(true);
        setUserEmail(cleanEmail);
        SqlClient.setActiveUser(cleanEmail);
        try {
          await AsyncStorage.setItem(AUTH_STORAGE_KEY, 'active');
          await AsyncStorage.setItem('@mumanager_auth_email', cleanEmail);
          await AsyncStorage.setItem(SAVED_EMAIL_KEY, cleanEmail);
          const currentLicense = LicenseService.getStatus();
          SqlClient.sendTelemetryPing(
            hwid,
            currentLicense.plan || 'DEMO',
            currentLicense.licenseKey,
            cleanEmail,
            cleanEmail.split('@')[0]
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
    SqlClient.setActiveUser('');
    SqlClient.setSessionToken('');
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      await SecureStorage.removeItem('@mumanager_session_token');
    } catch (e) {
      console.warn('Error on logout', e);
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
        login,
        register,
        verifyRegistration,
        resendVerificationCode,
        logout,
        savedEmail,
        savedUsername,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
