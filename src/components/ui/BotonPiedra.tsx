import React from 'react';
import { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MuButton } from './MuButton';
import { MuIconName } from './MuIcon';

export interface BotonPiedraProps {
  titulo: string;
  onPress: () => void;
  icono?: MuIconName;
  disabled?: boolean;
  cargando?: boolean;
  altura?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const BotonPiedra: React.FC<BotonPiedraProps> = ({
  titulo,
  onPress,
  icono,
  disabled = false,
  cargando = false,
  altura = 48,
  style,
  textStyle,
}) => {
  return (
    <MuButton
      titulo={titulo}
      onPress={onPress}
      variante="secondary"
      icono={icono}
      iconoFamily="feather"
      disabled={disabled}
      cargando={cargando}
      altura={altura}
      style={style}
      textStyle={textStyle}
    />
  );
};
