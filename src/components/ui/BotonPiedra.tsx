import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, StyleProp, ViewStyle, TextStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

export interface BotonPiedraProps {
  titulo: string;
  onPress: () => void;
  icono?: keyof typeof Feather.glyphMap;
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
  altura = THEME.shapes.alturaMinima,
  style,
  textStyle,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.boton,
        { minHeight: altura },
        disabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || cargando}
      activeOpacity={0.75}
    >
      <View style={styles.content}>
        {cargando ? (
          <ActivityIndicator color={THEME.colors.texto} size="small" />
        ) : (
          <>
            {icono && (
              <Feather
                name={icono}
                size={16}
                color={THEME.colors.oroClaro}
                style={styles.icon}
              />
            )}
            <Text style={[styles.texto, textStyle]}>{titulo}</Text>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  boton: {
    backgroundColor: THEME.colors.superficieFin,
    borderColor: THEME.colors.borde,
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
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
    marginRight: 6,
  },
  texto: {
    color: THEME.colors.texto,
    fontSize: 13,
    fontWeight: THEME.typography.weightSemiBold,
  },
});
