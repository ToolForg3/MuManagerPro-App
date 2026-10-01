import React from 'react';
import { TouchableOpacity, Text, StyleSheet, StyleProp, ViewStyle, TextStyle, ImageBackground } from 'react-native';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';

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
        styles.chipTouch,
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <ImageBackground
        source={activo ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
        style={[
          styles.chip,
          activo ? styles.chipActivo : styles.chipInactivo,
        ]}
        resizeMode="stretch"
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
      </ImageBackground>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chipTouch: {
    marginRight: 8,
    borderRadius: 2,
    overflow: 'hidden',
  },
  chip: {
    minHeight: 38,
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  chipActivo: {
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 5,
    elevation: 3,
  },
  chipInactivo: {},
  texto: {
    fontSize: 12,
    fontWeight: THEME.typography.weightSemiBold,
  },
  textoActivo: {
    color: '#FEDF99',
    fontWeight: '900',
    ...THEME.effects.textShadowHigh,
  },
  textoInactivo: {
    color: '#CDC6B9',
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
  },
});

