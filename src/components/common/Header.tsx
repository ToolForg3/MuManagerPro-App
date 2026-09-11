import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useDatabase } from '../../context/DatabaseContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showConnectionBadge?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showConnectionBadge = true,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { isConnected, config } = useDatabase();
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );

  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }]}>
      {/* Top Iron Rivets */}
      <View style={styles.topRivetRow}>
        <View style={styles.rivetDot} />
        <View style={styles.rivetDot} />
      </View>

      <View style={styles.mainRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {showBack && onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
              <MaterialCommunityIcons name="arrow-left-bold" size={20} color="#FFD700" />
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="shield-crown" size={18} color={THEME.colors.oro} />
              <Text style={styles.title} numberOfLines={1}>{title}</Text>
            </View>
            {subtitle && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <MaterialCommunityIcons name="sword" size={11} color={THEME.colors.oro} />
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.rightContainer}>
          {showConnectionBadge && (
            <View style={[styles.badge, isConnected ? styles.badgeConnected : styles.badgeDisconnected]}>
              <View style={[styles.jewelOrb, isConnected ? styles.jewelOrbConnected : styles.jewelOrbDisconnected]}>
                <View style={styles.jewelGlance} />
              </View>
              <Text style={styles.badgeText} numberOfLines={1}>
                {isConnected ? (config.host || 'MU REALM') : 'SIN CONEXIÓN'}
              </Text>
            </View>
          )}

          {rightAction && (
            <TouchableOpacity style={styles.actionBtn} onPress={rightAction.onPress} activeOpacity={0.7}>
              <MaterialCommunityIcons name={rightAction.icon} size={20} color="#FFD700" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Gold filigree bottom trim */}
      <View style={styles.goldBottomTrim} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: THEME.colors.fondo,
    borderBottomWidth: 1.5,
    borderBottomColor: THEME.colors.borde,
    position: 'relative',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 5,
  },
  topRivetRow: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  rivetDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#B58F3C',
    borderWidth: 0.5,
    borderColor: '#6B5533',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oro,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(232, 200, 106, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    maxWidth: 145,
    backgroundColor: THEME.colors.casillaFondo,
  },
  badgeConnected: {
    borderColor: THEME.colors.jade,
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
  },
  badgeDisconnected: {
    borderColor: THEME.colors.brasa,
    backgroundColor: 'rgba(226, 112, 58, 0.12)',
  },
  jewelOrb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  jewelOrbConnected: {
    backgroundColor: THEME.colors.jade,
    borderColor: '#7AF5BA',
    shadowColor: THEME.colors.jade,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  jewelOrbDisconnected: {
    backgroundColor: THEME.colors.brasa,
    borderColor: '#FFA270',
    shadowColor: THEME.colors.brasa,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  jewelGlance: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  badgeText: {
    fontSize: 10,
    color: THEME.colors.texto,
    fontWeight: '800',
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#2B2521',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#2B2521',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldBottomTrim: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: THEME.colors.borde,
  },
});
