import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
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
        <MaterialCommunityIcons name="alert-octagon" size={18} color="#FFFFFF" />
        <Text style={styles.blockedText}>
          DISPOSITIVO BLOQUEADO • Toque para Soporte
        </Text>
        <MaterialCommunityIcons name="chevron-right" size={16} color="#FF6B6B" />
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
            <MaterialCommunityIcons name="shield-lock-outline" size={16} color="#FFD700" />
          </View>
          <View>
            <Text style={styles.text}>MODO DEMO (SIN LICENCIA)</Text>
            <Text style={styles.subText}>Acceso restringido • Ingrese clave de licencia PRO</Text>
          </View>
        </View>
        <View style={styles.badge}>
          <MaterialCommunityIcons name="lightning-bolt" size={12} color="#0D0E12" />
          <Text style={styles.badgeText}>ACTIVAR PRO</Text>
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
    borderRadius: 4,
    backgroundColor: '#1C1507',
    borderWidth: 1,
    borderColor: '#665220',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#E8C86A',
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
    backgroundColor: '#E8C86A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1.5,
    borderTopColor: '#FFF2A8',
    borderLeftColor: '#FFF2A8',
    borderBottomColor: '#8A7338',
    borderRightColor: '#8A7338',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#100D0B',
    letterSpacing: 0.5,
  },
});
