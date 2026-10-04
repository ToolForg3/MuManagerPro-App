import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { MuIcon } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { useLanguage, LANGUAGES, LanguageCode } from '../../context/LanguageContext';
import { Panel } from '../ui/Panel';

interface LanguageModalProps {
  floating?: boolean;
}

export const LanguageModal: React.FC<LanguageModalProps> = ({ floating = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { language, setLanguage, currentFlag, t } = useLanguage();

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setModalVisible(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[floating ? styles.floatingTrigger : { borderRadius: 2, overflow: 'hidden' }]}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={t('changeLanguage') || 'Cambiar idioma'}
      >
        <ImageBackground
          source={STITCH_ASSETS.tabs.tabModeInactive}
          style={styles.triggerBtn}
          resizeMode="stretch"
        >
          <Text style={styles.flagText}>{currentFlag}</Text>
          <Text style={styles.langCode}>{language.toUpperCase()}</Text>
          <MuIcon name="chevron-down" size={14} color="#E0C380" />
        </ImageBackground>
      </TouchableOpacity>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Panel style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectLanguage') || 'Seleccionar Idioma'}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('cancel') || 'Cerrar'}
              >
                <MuIcon name="close" size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.scrollList} nestedScrollEnabled={true} showsVerticalScrollIndicator={false}>
              {LANGUAGES.map((lang) => {
                const isSelected = lang.code === language;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={{ borderRadius: 2, overflow: 'hidden', marginVertical: 3 }}
                    onPress={() => handleSelect(lang.code)}
                    accessibilityRole="button"
                    accessibilityLabel={`${lang.name}, ${lang.country}`}
                    accessibilityState={{ selected: isSelected }}
                    activeOpacity={0.8}
                  >
                    <ImageBackground
                      source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.langOption}
                      resizeMode="stretch"
                    >
                      <Text style={styles.optionFlag}>{lang.flag}</Text>
                      <View style={styles.optionInfo}>
                        <Text style={[styles.optionName, isSelected && styles.optionNameSelected]}>
                          {lang.name}
                        </Text>
                        <Text style={[styles.optionCountry, isSelected && styles.optionCountrySelected]}>
                          {lang.country}
                        </Text>
                      </View>
                      {isSelected && (
                        <MuIcon name="check" size={18} color="#FEDF99" />
                      )}
                    </ImageBackground>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Panel>
        </Pressable>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 44,
    gap: 6,
  },
  floatingTrigger: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 99,
    borderRadius: 2,
    overflow: 'hidden',
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
    color: '#E0C380',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.5,
    ...THEME.effects.textShadowSubtle,
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
    padding: THEME.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    paddingBottom: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#4C463A',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
    color: '#E0C380',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.8,
    ...THEME.effects.textShadow,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  optionFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.textoSecundarioLuminoso,
    ...THEME.effects.textShadowSubtle,
  },
  optionNameSelected: {
    color: '#FEDF99',
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  optionCountry: {
    fontSize: 11.5,
    fontWeight: '600',
    color: THEME.colors.textoSecundario,
  },
  optionCountrySelected: {
    color: '#FEDF99',
    fontWeight: '800',
    ...THEME.effects.textShadowSubtle,
  },
  scrollList: {
    maxHeight: 380,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
