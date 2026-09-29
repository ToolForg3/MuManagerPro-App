import React from 'react';
import { StyleProp, ViewStyle, TextStyle } from 'react-native';
import { MuButton } from './MuButton';
import { MuIconName } from './MuIcon';

export interface BotonBrasaProps {
  titulo: string;
  onPress: () => void;
  icono?: MuIconName;
  disabled?: boolean;
  deshabilitado?: boolean;
  cargando?: boolean;
  altura?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const BotonBrasa: React.FC<BotonBrasaProps> = ({
  titulo,
  onPress,
  icono,
  disabled = false,
  deshabilitado = false,
  cargando = false,
  altura = 48,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || deshabilitado;
  const iconStr = typeof icono === 'string' ? icono : undefined;

  return (
    <MuButton
      titulo={titulo}
      onPress={onPress}
      variante="danger"
      icono={iconStr}
      iconoFamily="feather"
      disabled={isDisabled}
      cargando={cargando}
      altura={altura}
      style={style}
      textStyle={textStyle}
    />
  );
};
