import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { MuIcon, MuIconName } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';

interface MetricCardProps {
  label: string;
  value: number | string;
  iconName: MuIconName;
  iconColor: string;
  iconBgColor?: string;
  suffix?: string;
}

const stoneBackAsset = require('../../../assets/ui/mu_stone_back.png');

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  iconName,
  iconColor,
  iconBgColor,
  suffix,
}) => {
  return (
    <View style={styles.cardOuter}>
      <ImageBackground
        source={stoneBackAsset}
        style={styles.cardBackground}
        resizeMode="repeat"
        imageStyle={styles.stoneImage}
      >
        {/* Remaches de hierro forjado Stitch Ironforge en las esquinas */}
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
            <Text style={[styles.value, { color: iconColor === '#FFD700' ? '#EFD28D' : '#E4E2E0' }]}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </Text>
            {suffix && <Text style={styles.suffix}>{suffix}</Text>}
          </View>
        </View>

        {/* Socket de Gema Forjada con Bisel */}
        <View style={[styles.iconSocket, { borderColor: iconColor, shadowColor: iconColor }]}>
          <View style={[styles.iconInnerGlow, { backgroundColor: iconBgColor || `${iconColor}22` }]}>
            <MuIcon name={iconName} size={22} />
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: 2,
    borderTopColor: '#4C463A',
    borderLeftColor: '#4C463A',
    borderRightColor: '#0D0E0D',
    borderBottomColor: '#0D0E0D',
    borderWidth: 1,
    backgroundColor: '#1F201F',
    overflow: 'hidden',
    minHeight: 84,
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  cardBackground: {
    width: '100%',
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1F201F',
  },
  stoneImage: {
    opacity: 0.45,
  },
  rivet: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0C380',
    opacity: 0.85,
  },
  rivetTL: { top: 4, left: 4 },
  rivetTR: { top: 4, right: 4 },
  rivetBL: { bottom: 4, left: 4 },
  rivetBR: { bottom: 4, right: 4 },
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
    color: '#E0C380',
    fontSize: 8,
  },
  label: {
    fontSize: 11,
    color: '#CDC6B9',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: '#E4E2E0',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 3,
  },
  suffix: {
    fontSize: 11,
    color: '#E0C380',
    marginLeft: 5,
    fontWeight: '800',
  },
  iconSocket: {
    width: 44,
    height: 44,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    backgroundColor: 'rgba(13, 14, 13, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  iconInnerGlow: {
    width: 36,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
