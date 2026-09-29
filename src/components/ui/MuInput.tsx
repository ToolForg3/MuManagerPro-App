import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
  TouchableOpacity,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { MuIcon, MuIconName } from './MuIcon';

import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { ImageBackground } from 'react-native';

export interface MuInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: MuIconName | string;
  rightIcon?: MuIconName | string;
  onRightIconPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  height?: number;
}

export const MuInput: React.FC<MuInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  height = 48,
  placeholderTextColor = '#CDC6B9',
  ...rest
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label.toUpperCase()}</Text> : null}
      <ImageBackground
        source={STITCH_ASSETS.items.inputBox}
        style={[
          styles.inputContainer,
          { height: Math.max(height, 48) },
          isFocused && styles.inputFocused,
          Boolean(error) && styles.inputError,
        ]}
        imageStyle={styles.inputBgImage}
        resizeMode="stretch"
      >
        {leftIcon ? (
          <View style={styles.iconWrap}>
            <MuIcon name={leftIcon as any} size={18} color={isFocused ? THEME.colors.oroClaro : '#CDC6B9'} />
          </View>
        ) : null}

        <TextInput
          style={[styles.input, inputStyle]}
          placeholderTextColor={placeholderTextColor}
          onFocus={(e) => {
            setIsFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            rest.onBlur?.(e);
          }}
          {...rest}
        />

        {rightIcon ? (
          <TouchableOpacity
            style={styles.iconWrapTouch}
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MuIcon name={rightIcon as any} size={18} color={isFocused ? THEME.colors.oroClaro : '#CDC6B9'} />
          </TouchableOpacity>
        ) : null}
      </ImageBackground>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    marginVertical: 4,
  },
  label: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderColor: '#4C463A',
    borderRadius: 2,
    overflow: 'hidden',
    paddingHorizontal: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
    elevation: 2,
  },
  inputBgImage: {
    opacity: 0.85,
  },
  inputFocused: {
    borderColor: THEME.colors.oroClaro,
    shadowColor: THEME.colors.oroClaro,
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  inputError: {
    borderColor: THEME.colors.brasa,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    minWidth: 28,
  },
  iconWrapTouch: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    minWidth: 44,
    minHeight: 44,
  },
  input: {
    flex: 1,
    color: '#E4E2E0',
    fontFamily: THEME.typography.fontBody,
    fontSize: 13,
    paddingVertical: 8,
    minHeight: 44,
  },
  errorText: {
    color: THEME.colors.brasa,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 3,
    marginLeft: 2,
  },
});
