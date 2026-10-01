import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { MuIcon } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { LicenseService, LicenseStatus } from '../../services/security/licenseService';

interface WatermarkBannerProps {
  onPressActivate: () => void;
}

export const WatermarkBanner: React.FC<WatermarkBannerProps> = ({ onPressActivate }) => {
  const [status, setStatus] = useState<LicenseStatus>(LicenseService.getStatus());

  useEffect(() => {
    return LicenseService.subscribe(setStatus);
  }, []);

  if (status.isBlocked) {
    return (
      <TouchableOpacity style={styles.blockedBanner} onPress={onPressActivate} activeOpacity={0.85}>
        <MuIcon name="shield-alert" size={18} />
        <Text style={styles.blockedText}>
          DISPOSITIVO BLOQUEADO • Toque para Soporte
        </Text>
        <MuIcon name="arrow-right" size={16} />
      </TouchableOpacity>
    );
  }

  if (status.plan === 'PRO') {
    return null;
  }

  return (
    <TouchableOpacity style={styles.banner} onPress={onPressActivate} activeOpacity={0.85}>
      <View style={styles.content}>
        <View style={styles.left}>
          <View style={styles.crestWrap}>
            <MuIcon name="lock" size={16} />
          </View>
          <View>
            <Text style={styles.text}>MODO DEMO (SIN LICENCIA)</Text>
            <Text style={styles.subText}>Acceso restringido • Ingrese clave de licencia PRO</Text>
          </View>
        </View>
        <View style={{ borderRadius: 2, overflow: 'hidden' }}>
          <ImageBackground
            source={STITCH_ASSETS.tabs.tabModeActive}
            style={styles.badge}
            resizeMode="stretch"
          >
            <MuIcon name="crown" size={12} color="#FEDF99" />
            <Text style={styles.badgeText}>ACTIVAR PRO</Text>
          </ImageBackground>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#0F0C05',
    borderBottomWidth: 1.5,
    borderBottomColor: '#3A2E0E',
    borderTopWidth: 1,
    borderTopColor: '#5C4A1D',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  blockedBanner: {
    backgroundColor: '#380B0B',
    borderBottomWidth: 2,
    borderBottomColor: '#FF3B30',
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  blockedText: {
    color: '#FF6B6B',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadowSubtle,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  crestWrap: {
    width: 28,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#1B1C1B',
    borderWidth: 1,
    borderColor: '#4C463A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#E0C380',
    letterSpacing: 0.5,
    ...THEME.effects.textShadow,
  },
  subText: {
    fontSize: 10,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    marginTop: 1,
    ...THEME.effects.textShadowSubtle,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#FEDF99',
    letterSpacing: 0.5,
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadowHigh,
  },
});
