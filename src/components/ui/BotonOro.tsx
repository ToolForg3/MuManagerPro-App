import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

export interface BotonOroProps {
  titulo: string;
  onPress: () => void;
  icono?: keyof typeof Feather.glyphMap;
  disabled?: boolean;
  cargando?: boolean;
  altura?: number;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export const BotonOro: React.FC<BotonOroProps> = ({
  titulo,
  onPress,
  icono,
  disabled = false,
  cargando = false,
  altura = THEME.shapes.alturaBotonPrincipal,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.boton,
        { height: altura },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || cargando}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        {cargando ? (
          <ActivityIndicator color={THEME.colors.textoOscuro} size="small" />
        ) : (
          <>
            {icono && (
              <Feather
                name={icono}
                size={18}
                color={THEME.colors.textoOscuro}
                style={styles.icon}
              />
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
    backgroundColor: THEME.colors.oro,
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 5,
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
    color: THEME.colors.textoOscuro,
    fontFamily: THEME.typography.fontTitle,
    fontWeight: THEME.typography.weightBold,
    fontSize: 14,
    letterSpacing: THEME.typography.trackingWide,
  },
});
