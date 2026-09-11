import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { LanguageProvider } from './src/context/LanguageContext';
import { AuthProvider } from './src/context/AuthContext';
import { DatabaseProvider } from './src/context/DatabaseContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { THEME } from './src/constants/theme';

import { LicenseService, LicenseStatus } from './src/services/security/licenseService';
import { KillSwitchModal } from './src/components/security/KillSwitchModal';
import { RemoteConfigService, RemoteConfigState } from './src/services/security/remoteConfigService';
import { UpdateModal } from './src/components/common/UpdateModal';
import { BroadcastNotice } from './src/components/common/BroadcastNotice';

import { AppState } from 'react-native';
import { SecurityService } from './src/services/security/securityService';
import { SqlClient } from './src/services/database/sqlClient';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { PinScreen, PIN_STORAGE_KEY } from './src/screens/auth/PinScreen';

const appNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: THEME.colors.primaryOrange,
    background: THEME.colors.background,
    card: THEME.colors.card,
    text: THEME.colors.textPrimary,
    border: THEME.colors.border,
  },
};

export default function App() {
  const [licenseStatus, setLicenseStatus] = React.useState<LicenseStatus>(LicenseService.getStatus());
  const [remoteConfig, setRemoteConfig] = React.useState<RemoteConfigState>(RemoteConfigService.getState());
  const [hasPinConfigured, setHasPinConfigured] = React.useState<boolean>(false);
  const [isPinVerified, setIsPinVerified] = React.useState<boolean>(true);

  React.useEffect(() => {
    AsyncStorage.getItem(PIN_STORAGE_KEY).then((hash) => {
      if (hash && hash.trim().length > 0) {
        setHasPinConfigured(true);
        setIsPinVerified(false);
      } else {
        setHasPinConfigured(false);
        setIsPinVerified(true);
      }
    }).catch(() => {
      setIsPinVerified(true);
    });
  }, []);

  React.useEffect(() => {
    RemoteConfigService.initialize().then(() => {
      setRemoteConfig(RemoteConfigService.getState());
    });
    const unsubRemote = RemoteConfigService.subscribe(setRemoteConfig);
    LicenseService.initialize().then(setLicenseStatus);
    const unsubLicense = LicenseService.subscribe(setLicenseStatus);

    const checkUpdates = async () => {
      try {
        const hwid = await SecurityService.getDeviceHwid();

        // Anti-tamper & Anti-Frida runtime check
        const integrity = SecurityService.checkIntegrity();
        if (!integrity.safe) {
          SqlClient.reportTamper(
            hwid,
            `Amenaza de alteración detectada: ${integrity.threats.join(', ')}`,
            { threats: integrity.threats }
          ).catch(() => {});
          LicenseService.resetToDemo().catch(() => {});
        }

        const currentLicense = LicenseService.getStatus();
        const res = await SqlClient.sendTelemetryPing(hwid, currentLicense.plan || 'DEMO', currentLicense.licenseKey);
        RemoteConfigService.handleTelemetryPingResult(res);
        LicenseService.handleTelemetryResponse(res, hwid);
      } catch {}
    };

    // Immediate sync on launch
    checkUpdates();
    const startTimer = setTimeout(checkUpdates, 2000);

    // Periodic check every 35 seconds
    const interval = setInterval(checkUpdates, 35000);

    // Check whenever app becomes active
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        checkUpdates();
      }
    });

    return () => {
      unsubRemote();
      unsubLicense();
      clearTimeout(startTimer);
      clearInterval(interval);
      appStateSub.remove();
    };
  }, []);

  if (hasPinConfigured && !isPinVerified) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor="#0D0D0D" />
        <PinScreen onSuccess={() => setIsPinVerified(true)} />
        <UpdateModal
          visible={remoteConfig.isUpdateVisible}
          updateInfo={remoteConfig.updateInfo}
        />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0D0D0D" />
      <LanguageProvider>
        <AuthProvider>
          <DatabaseProvider>
            <NavigationContainer theme={appNavigationTheme}>
              <AppNavigator />
            </NavigationContainer>
            <KillSwitchModal
              visible={!!licenseStatus.isBlocked}
              hwid={licenseStatus.hwid}
              reason={licenseStatus.blockReason}
            />
            <UpdateModal
              visible={remoteConfig.isUpdateVisible}
              updateInfo={remoteConfig.updateInfo}
            />
            <BroadcastNotice
              visible={remoteConfig.isBroadcastVisible}
              broadcast={remoteConfig.broadcast}
            />
          </DatabaseProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
