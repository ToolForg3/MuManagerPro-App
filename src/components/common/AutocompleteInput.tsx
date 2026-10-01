import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { MuIcon } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';

export interface AutocompleteInputProps {
  value: string;
  onChangeText: (text: string) => void;
  suggestions: string[];
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  maxSuggestions?: number; // default: 6
  onSuggestionPress?: (value: string) => void;
  icon?: string; // nombre de MaterialCommunityIcons
  disabled?: boolean;
  clearable?: boolean; // default: true — muestra X para limpiar
  label?: string; // texto encima del campo
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  testID?: string;
}

export const AutocompleteInput: React.FC<AutocompleteInputProps> = ({
  value,
  onChangeText,
  suggestions,
  placeholder,
  containerStyle,
  inputStyle,
  maxSuggestions = 6,
  onSuggestionPress,
  icon,
  disabled = false,
  clearable = true,
  label,
  autoCapitalize = 'none',
  testID,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  const filteredSuggestions = useMemo(() => {
    if (!suggestions || suggestions.length === 0) return [];
    if (!value || value.trim().length < 1) {
      // Mostrar sugerencias disponibles / recientes al hacer clic aunque el campo esté vacío
      return suggestions
        .filter((s) => s && s.trim().length > 0)
        .slice(0, maxSuggestions ?? 6);
    }
    const lower = value.toLowerCase().trim();
    return suggestions
      .filter((s) => s && s.toLowerCase().includes(lower))
      .slice(0, maxSuggestions ?? 6);
  }, [value, suggestions, maxSuggestions]);

  const renderHighlightedText = (text: string, query: string) => {
    const lower = text.toLowerCase();
    const q = query.toLowerCase().trim();
    const idx = lower.indexOf(q);
    if (idx === -1 || !q) return <Text style={styles.suggestionText}>{text}</Text>;
    return (
      <Text style={styles.suggestionText}>
        {text.slice(0, idx)}
        <Text style={styles.highlight}>{text.slice(idx, idx + q.length)}</Text>
        {text.slice(idx + q.length)}
      </Text>
    );
  };

  const isPressingSuggestionRef = React.useRef(false);

  return (
    <View
      style={[
        styles.container,
        isFocused && filteredSuggestions.length > 0 ? { zIndex: 99999, elevation: 99 } : { zIndex: 1, elevation: 0 },
        containerStyle,
      ]}
      testID={testID}
    >
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {icon && (
          <MuIcon
            name={icon as any}
            size={18}
            style={styles.inputIcon}
          />
        )}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : undefined, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.colors.textMuted}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setTimeout(() => {
              if (!isPressingSuggestionRef.current) {
                setIsFocused(false);
              }
            }, 350);
          }}
          autoCapitalize={autoCapitalize ?? 'none'}
          autoCorrect={false}
          editable={!disabled}
        />
        {clearable && value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChangeText('');
              setIsFocused(false);
            }}
            style={styles.clearButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MuIcon name="close" size={16} />
          </TouchableOpacity>
        )}
      </View>
      {isFocused && filteredSuggestions.length > 0 && (
        <View
          style={styles.dropdown}
          onTouchStart={() => {
            isPressingSuggestionRef.current = true;
          }}
        >
          {value.trim().length > 0 && (
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>
                {filteredSuggestions.length} {filteredSuggestions.length === 1 ? 'coincidencia encontrada' : 'coincidencias encontradas'}
              </Text>
            </View>
          )}
          <ScrollView
            keyboardShouldPersistTaps="always"
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 200 }}
          >
            {filteredSuggestions.map((item, index) => (
              <TouchableOpacity
                key={`${item}_${index}`}
                style={[
                  styles.suggestionItem,
                  index < filteredSuggestions.length - 1 && styles.suggestionBorder,
                ]}
                delayPressIn={0}
                onPressIn={() => {
                  isPressingSuggestionRef.current = true;
                }}
                onPress={() => {
                  isPressingSuggestionRef.current = true;
                  onChangeText(item);
                  onSuggestionPress?.(item);
                  setIsFocused(false);
                  setTimeout(() => {
                    isPressingSuggestionRef.current = false;
                  }, 150);
                }}
                activeOpacity={0.7}
              >
                {renderHighlightedText(item, value)}
                <MuIcon name="arrow-right" size={14} color="#EFD28D" />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 10,
  },
  label: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    marginBottom: 4,
    fontWeight: 'bold',
    ...THEME.effects.textShadowSubtle,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: THEME.colors.textPrimary,
  },
  inputWithIcon: {
    paddingLeft: 36,
  },
  inputIcon: {
    position: 'absolute',
    left: 10,
    zIndex: 1,
  },
  clearButton: {
    paddingHorizontal: 10,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 99999,
    backgroundColor: '#181918',
    borderWidth: 1.5,
    borderColor: '#C4A65E',
    borderRadius: 2,
    marginTop: 3,
    overflow: 'hidden',
    elevation: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  dropdownHeader: {
    backgroundColor: '#252624',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#4A3C1E',
  },
  dropdownHeaderText: {
    fontSize: 10,
    color: '#FEDF99',
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#181918',
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#2C2B28',
  },
  suggestionText: {
    fontSize: 13,
    color: '#E4E2E0',
    flex: 1,
    ...THEME.effects.textShadowSubtle,
  },
  highlight: {
    color: '#7AF5BA',
    fontWeight: '900',
    textDecorationLine: 'underline',
    ...THEME.effects.textShadowHigh,
  },
});
