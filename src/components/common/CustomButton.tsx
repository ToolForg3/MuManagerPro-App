import React from 'react';
import { ViewStyle, TextStyle } from 'react-native';
import { MuButton, MuButtonVariant } from '../ui/MuButton';
import { MuIconName } from '../ui/MuIcon';

export interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'orange' | 'green' | 'dark' | 'danger' | 'outline' | 'gold' | 'neonBlue';
  icon?: MuIconName;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  size?: 'sm' | 'md' | 'lg';
}

export const CustomButton: React.FC<CustomButtonProps> = ({
  title,
  onPress,
  variant = 'orange',
  icon,
  loading = false,
  disabled = false,
  style,
  textStyle,
  size = 'md',
}) => {
  let muVariant: MuButtonVariant = 'primary';
  if (variant === 'orange' || variant === 'danger') {
    muVariant = 'danger';
  } else if (variant === 'green') {
    muVariant = 'success';
  } else {
    muVariant = 'primary';
  }

  const getVisualHeight = () => {
    switch (size) {
      case 'sm':
        return 40;
      case 'lg':
        return 56;
      default:
        return 48;
    }
  };

  return (
    <MuButton
      titulo={title}
      onPress={onPress}
      variante={muVariant}
      icono={icon}
      iconoFamily="material"
      disabled={disabled}
      cargando={loading}
      altura={getVisualHeight()}
      style={style}
      textStyle={textStyle}
      compacto={size === 'sm'}
    />
  );
};
