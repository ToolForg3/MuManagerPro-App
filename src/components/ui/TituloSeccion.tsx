import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, Image } from 'react-native';
import { THEME } from '../../constants/theme';

export interface TituloSeccionProps {
  titulo: string;
  subtitulo?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  subtextStyle?: StyleProp<TextStyle>;
}

const goldDividerAsset = require('../../../assets/ui/mu_gold_divider.png');

export const TituloSeccion: React.FC<TituloSeccionProps> = ({
  titulo,
  subtitulo,
  style,
  textStyle,
  subtextStyle,
}) => {
  return (
    <View style={[styles.wrapper, style]}>
      <View style={styles.container}>
        <View style={styles.dividerWing} />
        <Text style={[styles.titulo, textStyle]}>{titulo.toUpperCase()}</Text>
        <View style={styles.dividerWing} />
      </View>
      {subtitulo ? (
        <Text style={[styles.subtitulo, subtextStyle]}>{subtitulo}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  dividerWing: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(224, 195, 128, 0.45)',
    maxWidth: 90,
  },
  titulo: {
    color: '#E4E2E0',
    fontFamily: THEME.typography.fontTitle,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1.2,
    marginHorizontal: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  subtitulo: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
