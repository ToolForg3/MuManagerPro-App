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
import { MaterialCommunityIcons } from '@expo/vector-icons';
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
          <MaterialCommunityIcons
            name={icon as any}
            size={18}
            color={THEME.colors.textMuted}
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
            <MaterialCommunityIcons name="close-circle" size={16} color={THEME.colors.textMuted} />
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
                <MaterialCommunityIcons name="chevron-right" size={14} color="#555" />
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
    color: THEME.colors.textSecondary,
    marginBottom: 4,
    fontWeight: 'bold',
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
    zIndex: 999,
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.md,
    marginTop: 2,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  suggestionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  suggestionText: {
    fontSize: 13,
    color: THEME.colors.textPrimary,
    flex: 1,
  },
  highlight: {
    color: THEME.colors.primaryOrange,
    fontWeight: 'bold',
  },
});
