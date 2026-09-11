import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

interface CustomButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'orange' | 'green' | 'dark' | 'danger' | 'outline' | 'gold' | 'neonBlue';
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
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
  const getBackgroundColor = () => {
    if (disabled) return '#1A1613';
    switch (variant) {
      case 'gold':
        return '#B58F3C';
      case 'neonBlue':
        return '#253B5E';
      case 'orange':
        return '#E2703A';
      case 'green':
        return '#1C3D2B';
      case 'danger':
        return '#4D1D16';
      case 'dark':
        return '#2B2521';
      case 'outline':
        return 'transparent';
      default:
        return '#B58F3C';
    }
  };

  const getBorderColor = () => {
    if (disabled) return '#3A2E22';
    switch (variant) {
      case 'gold':
        return '#E8C86A';
      case 'neonBlue':
        return '#5B8DEF';
      case 'orange':
        return '#E2703A';
      case 'green':
        return '#3FCF8E';
      case 'danger':
        return '#E2703A';
      case 'dark':
        return '#6B5533';
      case 'outline':
        return '#6B5533';
      default:
        return '#6B5533';
    }
  };

  const getTextColor = () => {
    if (disabled) return THEME.colors.textoSecundario;
    if (variant === 'gold') return '#191512';
    if (variant === 'neonBlue') return '#5B8DEF';
    if (variant === 'green') return '#3FCF8E';
    if (variant === 'outline') return THEME.colors.oro;
    return '#EDE4D3';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 12, minHeight: 44 };
      case 'lg':
        return { paddingVertical: 15, paddingHorizontal: 24, minHeight: 56 };
      default:
        return { paddingVertical: 11, paddingHorizontal: 16, minHeight: 44 };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'sm':
        return 12;
      case 'lg':
        return 15;
      default:
        return 13;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        getPadding(),
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          borderWidth: 1,
        },
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" size="small" />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <MaterialCommunityIcons
              name={icon}
              size={getFontSize() + 4}
              color={getTextColor()}
              style={styles.icon}
            />
          )}
          <Text
            style={[
              styles.text,
              { color: getTextColor(), fontSize: getFontSize() },
              textStyle,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
