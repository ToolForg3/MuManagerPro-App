import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { THEME } from '../../constants/theme';

export interface ChipProps {
  etiqueta: string;
  activo: boolean;
  onPress: () => void;
  icono?: React.ReactNode;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const Chip: React.FC<ChipProps> = ({
  etiqueta,
  activo,
  onPress,
  icono,
  children,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        activo ? styles.chipActivo : styles.chipInactivo,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {icono}
      {children}
      <Text
        style={[
          styles.texto,
          activo ? styles.textoActivo : styles.textoInactivo,
          icono ? { marginLeft: 6 } : undefined,
          textStyle,
        ]}
      >
        {etiqueta}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    minHeight: 40,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipActivo: {
    backgroundColor: 'rgba(232, 200, 106, 0.20)',
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1.5,
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  chipInactivo: {
    backgroundColor: '#1E1915',
    borderColor: 'rgba(107, 85, 51, 0.55)',
  },
  texto: {
    fontSize: 12,
    fontWeight: THEME.typography.weightSemiBold,
  },
  textoActivo: {
    color: THEME.colors.oroClaro,
    fontWeight: '700',
    ...THEME.effects.textShadow,
  },
  textoInactivo: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
});
