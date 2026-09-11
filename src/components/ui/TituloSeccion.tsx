import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { THEME } from '../../constants/theme';

export interface TituloSeccionProps {
  titulo: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const TituloSeccion: React.FC<TituloSeccionProps> = ({
  titulo,
  style,
  textStyle,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.linea} />
      <Text style={[styles.titulo, textStyle]}>{titulo.toUpperCase()}</Text>
      <View style={styles.linea} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
    paddingHorizontal: 8,
  },
  linea: {
    flex: 1,
    height: 1,
    backgroundColor: THEME.colors.borde,
  },
  titulo: {
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    fontWeight: THEME.typography.weightBold,
    fontSize: 13,
    letterSpacing: THEME.typography.trackingWide,
    marginHorizontal: 12,
  },
});
