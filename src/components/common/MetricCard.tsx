import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

interface MetricCardProps {
  label: string;
  value: number | string;
  iconName: keyof typeof MaterialCommunityIcons.glyphMap;
  iconColor: string;
  iconBgColor?: string;
  suffix?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  iconName,
  iconColor,
  iconBgColor,
  suffix,
}) => {
  return (
    <View style={styles.card}>
      {/* Corner rivets */}
      <View style={[styles.rivet, styles.rivetTL]} />
      <View style={[styles.rivet, styles.rivetTR]} />
      <View style={[styles.rivet, styles.rivetBL]} />
      <View style={[styles.rivet, styles.rivetBR]} />

      <View style={styles.content}>
        <View style={styles.labelRow}>
          <Text style={styles.runeSymbol}>◆</Text>
          <Text style={styles.label} numberOfLines={1}>{label}</Text>
        </View>
        <View style={styles.valueRow}>
          <Text style={[styles.value, { color: iconColor === '#FFD700' ? '#FFE066' : '#FFFFFF' }]}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </Text>
          {suffix && <Text style={styles.suffix}>{suffix}</Text>}
        </View>
      </View>

      {/* Forged Gem Socket */}
      <View style={[styles.iconSocket, { borderColor: iconColor, shadowColor: iconColor }]}>
        <View style={[styles.iconInnerGlow, { backgroundColor: iconBgColor || `${iconColor}22` }]}>
          <MaterialCommunityIcons name={iconName} size={22} color={iconColor} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 84,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  rivet: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#B58F3C',
    opacity: 0.85,
  },
  rivetTL: { top: 3, left: 3 },
  rivetTR: { top: 3, right: 3 },
  rivetBL: { bottom: 3, left: 3 },
  rivetBR: { bottom: 3, right: 3 },
  content: {
    flex: 1,
    marginRight: 8,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  runeSymbol: {
    color: THEME.colors.oro,
    fontSize: 7,
  },
  label: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.texto,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  suffix: {
    fontSize: 11,
    color: THEME.colors.oro,
    marginLeft: 5,
    fontWeight: '800',
  },
  iconSocket: {
    width: 42,
    height: 42,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  iconInnerGlow: {
    width: 34,
    height: 34,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
