import React from 'react';
import { TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { THEME } from '../../constants/theme';

export interface SlotItemProps {
  children?: React.ReactNode;
  seleccionado?: boolean;
  onPress?: () => void;
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  borderColor?: string;
  backgroundColor?: string;
}

export const SlotItem: React.FC<SlotItemProps> = ({
  children,
  seleccionado = false,
  onPress,
  width = 44,
  height = 44,
  style,
  borderColor,
  backgroundColor,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.slot,
        {
          width,
          height,
          borderColor: borderColor || (seleccionado ? THEME.colors.oroClaro : THEME.colors.borde),
          backgroundColor: backgroundColor || THEME.colors.casillaFondo,
        },
        seleccionado && styles.seleccionado,
        style,
      ]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  slot: {
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  seleccionado: {
    borderColor: THEME.colors.oroClaro,
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.85,
    shadowRadius: 8,
    elevation: 6,
  },
});
