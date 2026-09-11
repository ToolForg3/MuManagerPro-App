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
    backgroundColor: 'rgba(181, 143, 60, 0.22)',
    borderColor: THEME.colors.oroClaro,
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  chipInactivo: {
    backgroundColor: THEME.colors.casillaFondo,
    borderColor: THEME.colors.borde,
  },
  texto: {
    fontSize: 12,
    fontWeight: THEME.typography.weightSemiBold,
  },
  textoActivo: {
    color: THEME.colors.oroClaro,
  },
  textoInactivo: {
    color: THEME.colors.textoSecundario,
  },
});
