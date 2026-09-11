import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

export interface BotonBrasaProps {
  titulo: string;
  onPress: () => void;
  icono?: keyof typeof Feather.glyphMap | React.ReactNode;
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
  altura = THEME.shapes.alturaBotonPrincipal,
  style,
  textStyle,
}) => {
  const isDisabled = disabled || deshabilitado;

  return (
    <TouchableOpacity
      style={[
        styles.boton,
        { minHeight: altura },
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled || cargando}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {cargando ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <>
            {icono && (
              typeof icono === 'string' ? (
                <Feather
                  name={icono as any}
                  size={18}
                  color="#FFFFFF"
                  style={styles.icon}
                />
              ) : (
                <View style={styles.icon}>{icono}</View>
              )
            )}
            <Text style={[styles.texto, textStyle]}>{titulo.toUpperCase()}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  boton: {
    backgroundColor: THEME.colors.brasa,
    borderColor: '#FF884D',
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: THEME.colors.brasa,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  texto: {
    color: '#FFFFFF',
    fontFamily: THEME.typography.fontTitle,
    fontWeight: THEME.typography.weightBold,
    fontSize: 14,
    letterSpacing: THEME.typography.trackingWide,
  },
});
