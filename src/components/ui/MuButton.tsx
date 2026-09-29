import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  ImageBackground,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { MuIcon, MuIconName } from './MuIcon';

export type MuButtonVariant = 'primary' | 'secondary' | 'danger' | 'success';

export interface MuButtonProps {
  titulo: string;
  onPress: () => void;
  variante?: MuButtonVariant;
  icono?: MuIconName | string;
  iconoFamily?: 'feather' | 'material' | 'mu';
  disabled?: boolean;
  cargando?: boolean;
  altura?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  compacto?: boolean;
  accessibilityLabel?: string;
}

const btnBigAsset = require('../../../assets/ui/stitch_assets/btn_big.png');
const btnMediumAsset = require('../../../assets/ui/stitch_assets/btn_medium.png');
const btnSmallAsset = require('../../../assets/ui/stitch_assets/btn_small.png');

export const MuButton: React.FC<MuButtonProps> = ({
  titulo,
  onPress,
  variante = 'primary',
  icono,
  iconoFamily,
  disabled = false,
  cargando = false,
  altura = 44,
  style,
  textStyle,
  compacto = false,
  accessibilityLabel,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const isDis = disabled || cargando;

  const label = accessibilityLabel || (cargando ? `Cargando, ${titulo}` : titulo);

  const getButtonAsset = () => {
    if (compacto) return btnSmallAsset;
    if (altura <= 42) return btnMediumAsset;
    return btnBigAsset;
  };

  const getVariantStyles = () => {
    if (isDis) {
      return {
        backgroundColor: 'rgba(10, 10, 10, 0.65)',
        borderWidth: 0,
      };
    }
    switch (variante) {
      case 'danger':
        return {
          backgroundColor: isPressed ? 'rgba(70, 20, 20, 0.40)' : 'rgba(42, 22, 22, 0.15)',
          borderWidth: 0,
        };
      case 'success':
        return {
          backgroundColor: isPressed ? 'rgba(12, 35, 20, 0.40)' : 'rgba(20, 40, 30, 0.15)',
          borderWidth: 0,
        };
      case 'secondary':
        return {
          backgroundColor: isPressed ? 'rgba(30, 30, 30, 0.40)' : 'transparent',
          borderWidth: 0,
        };
      case 'primary':
      default:
        return {
          backgroundColor: isPressed ? 'rgba(60, 45, 15, 0.35)' : 'transparent',
          borderWidth: 0,
        };
    }
  };

  const getTextColor = () => {
    if (isDis) return '#8A8072';
    switch (variante) {
      case 'danger':
        return '#FFDAD6';
      case 'success':
        return '#5DF5B0';
      case 'secondary':
        return '#E4E2E0';
      case 'primary':
      default:
        return '#EFD28D';
    }
  };

  const getIconColor = () => {
    if (isDis) return '#8A8072';
    switch (variante) {
      case 'danger':
        return '#FFA87D';
      case 'success':
        return '#5DF5B0';
      case 'secondary':
        return '#CDC6B9';
      case 'primary':
      default:
        return '#EFD28D';
    }
  };

  const textColor = getTextColor();
  const iconColor = getIconColor();

  const renderIcon = () => {
    if (!icono) return null;
    return (
      <View style={styles.iconWrap}>
        <MuIcon
          name={icono}
          size={compacto ? 14 : 16}
          color={iconColor}
        />
      </View>
    );
  };

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: isDis, busy: !!cargando }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={() => setIsPressed(true)}
      onPressOut={() => setIsPressed(false)}
      disabled={isDis}
      activeOpacity={0.88}
      style={[
        styles.touchable,
        {
          minHeight: altura,
          transform: [{ scale: isPressed ? 0.985 : 1 }],
          opacity: isDis ? 0.6 : 1,
        },
        style,
      ]}
    >
      <ImageBackground
        source={getButtonAsset()}
        resizeMode="stretch"
        style={[
          styles.buttonFrame,
          { height: altura },
          getVariantStyles(),
        ]}
        imageStyle={{
          borderRadius: 2,
          opacity: isDis ? 0.35 : (isPressed ? 0.75 : 0.95),
        }}
      >
        {/* Fila de Contenido Centrada */}
        <View style={[styles.contentRow, compacto && styles.contentRowCompact]}>
          {cargando ? (
            <ActivityIndicator color={iconColor} size="small" />
          ) : (
            <>
              {renderIcon()}
              {titulo ? (
                <Text
                  numberOfLines={2}
                  style={[
                    styles.label,
                    { color: textColor },
                    isDis && styles.labelDisabled,
                    textStyle,
                  ]}
                >
                  {titulo.toUpperCase()}
                </Text>
              ) : null}
            </>
          )}
        </View>
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  touchable: {
    justifyContent: 'center',
    alignItems: 'stretch',
  },
  buttonFrame: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.75,
    shadowRadius: 3,
    elevation: 4,
  },
  contentRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    zIndex: 2,
  },
  contentRowCompact: {
    paddingHorizontal: 6,
  },
  iconWrap: {
    marginRight: 6,
  },
  label: {
    fontFamily: THEME.typography.fontTitle,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  labelDisabled: {
    opacity: 0.75,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
});
