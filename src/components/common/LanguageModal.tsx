import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useLanguage, LANGUAGES, LanguageCode } from '../../context/LanguageContext';

interface LanguageModalProps {
  floating?: boolean;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ floating = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { language, setLanguage, currentFlag } = useLanguage();

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.triggerBtn, floating && styles.floatingTrigger]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.flagText}>{currentFlag}</Text>
        <Text style={styles.langCode}>{language.toUpperCase()}</Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={THEME.colors.textSecondary} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Idioma</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {LANGUAGES.map((lang) => {
              const isSelected = lang.code === language;
              return (
                <TouchableOpacity
                  key={lang.code}
                  style={[styles.langOption, isSelected && styles.langOptionSelected]}
                  onPress={() => handleSelect(lang.code)}
                >
                  <Text style={styles.optionFlag}>{lang.flag}</Text>
                  <View style={styles.optionInfo}>
                    <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                      {lang.name}
                    </Text>
                    <Text style={styles.optionCountry}>{lang.country}</Text>
                  </View>
                  {isSelected && (
                    <MaterialCommunityIcons name="check-circle" size={20} color={THEME.colors.oro} />
                  )}
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B2521',
    borderWidth: 1,
    borderColor: '#6B5533',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 36,
    gap: 6,
  },
  floatingTrigger: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
  },
  flagText: {
    fontSize: 16,
  },
  langCode: {
    fontSize: 12,
    fontWeight: THEME.typography.weightBold,
    color: '#EDE4D3',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.lg,
  },
  modalContent: {
    width: '100%',
    maxWidth: 320,
    maxHeight: '90%',
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6B5533',
    padding: THEME.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#6B5533',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
    color: '#E8C86A',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.8,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginVertical: 4,
    minHeight: 44,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langOptionSelected: {
    backgroundColor: 'rgba(232, 200, 106, 0.12)',
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  optionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: THEME.typography.weightMedium,
    color: '#EDE4D3',
  },
  optionNameSelected: {
    color: '#E8C86A',
    fontWeight: THEME.typography.weightBold,
  },
  optionCountry: {
    fontSize: 12,
    color: '#9C9182',
  },
});
