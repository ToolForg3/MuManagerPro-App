import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Linking,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  KeyboardAvoidingView,
  ImageBackground,
} from 'react-native';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { MuButton } from '../ui/MuButton';
import { MuCornerOrnaments } from '../ui/MuCornerOrnaments';
import { SecurityService } from '../../services/security/securityService';
import { SqlClient } from '../../services/database/sqlClient';
import { FeedbackService, FeedbackModalOptions } from '../../services/feedback/feedbackService';
import { useLanguage } from '../../context/LanguageContext';

interface CategoryOption {
  key: string;
  label: string;
}

export const FeedbackModal: React.FC = () => {
  const { t } = useLanguage();
  const [options, setOptions] = useState<FeedbackModalOptions | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<string>('general');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hwid, setHwid] = useState<string>('');

  const CATEGORIES: CategoryOption[] = React.useMemo(() => [
    { key: 'general', label: t('categoryGeneral') },
    { key: 'feature', label: t('categoryFeature') },
    { key: 'bug', label: t('categoryBug') },
    { key: 'server', label: t('categoryServer') },
  ], [t]);

  const RATING_DESCRIPTIONS: Record<number, string> = React.useMemo(() => ({
    1: t('feedbackRating1'),
    2: t('feedbackRating2'),
    3: t('feedbackRating3'),
    4: t('feedbackRating4'),
    5: t('feedbackRating5'),
  }), [t]);

  useEffect(() => {
    const unsub = FeedbackService.subscribe((opts) => {
      setOptions(opts);
      if (opts) {
        setRating(opts.initialRating || 5);
        setMessage('');
        setCategory('general');
        setSubmitted(false);
        setErrorMsg(null);
      }
    });

    SecurityService.getDeviceHwid().then((h) => {
      if (h) setHwid(h);
    }).catch(() => {});

    return () => unsub();
  }, []);

  if (!options) return null;

  const handleClose = () => {
    FeedbackService.hide();
  };

  const handleSelectStar = (val: number) => {
    setRating(val);
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const source = options.source || 'apk_inapp_modal';
      const res = await SqlClient.sendFeedback({
        rating,
        category,
        message: message.trim(),
        name: 'Administrador Móvil',
        contact: '',
        hwid,
        source,
      });

      if (res.success) {
        setSubmitted(true);
        setTimeout(() => {
          handleClose();
        }, 2200);
      } else {
        setErrorMsg(res.error || t('feedbackErrSend'));
      }
    } catch (e: any) {
      setErrorMsg(e.message || t('feedbackErrConn'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWeb = () => {
    const sourceParam = options.source || 'apk_modal_link';
    const url = `https://mumanager.pro/#feedback?source=${encodeURIComponent(sourceParam)}&hwid=${encodeURIComponent(hwid)}`;
    Linking.openURL(url).catch(() => {});
    handleClose();
  };

  return (
    <Modal
      transparent
      visible={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoid}
          >
            <View style={styles.dialogCard}>
              <MuCornerOrnaments size={16} />

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
              >
                {/* Cabecera Gótica */}
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>
                    {options.title || t('rateExpTitle')}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {options.subtitle || t('rateExpSub')}
                  </Text>
                </View>

                {submitted ? (
                  /* Vista de Éxito */
                  <View style={styles.successContainer}>
                    <Text style={styles.successIcon}>⚔️</Text>
                    <Text style={styles.successTitle}>{t('feedbackThankYou')}</Text>
                    <Text style={styles.successDesc}>
                      {t('feedbackThankYouDesc').replace('{rating}', String(rating))}
                    </Text>
                    <MuButton
                      titulo={t('ok').toUpperCase()}
                      onPress={handleClose}
                      variante="primary"
                      altura={40}
                      style={{ marginTop: 16, width: '100%' }}
                    />
                  </View>
                ) : (
                  /* Formulario Interactivo */
                  <View style={styles.body}>
                    {/* 1. Selector de 5 Estrellas */}
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isActive = starVal <= rating;
                        return (
                          <TouchableOpacity
                            key={starVal}
                            onPress={() => handleSelectStar(starVal)}
                            activeOpacity={0.7}
                            style={styles.starTouchable}
                            accessibilityLabel={`${starVal} estrellas`}
                          >
                            <Text
                              style={[
                                styles.starText,
                                isActive ? styles.starTextActive : styles.starTextInactive,
                              ]}
                            >
                              ★
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Etiqueta de la Calificación */}
                    <Text style={styles.ratingLabelText}>
                      {RATING_DESCRIPTIONS[rating] || `${rating}/5`}
                    </Text>

                    {/* 2. Selector de Categorías (Chips con texturas nativas MU) */}
                    <View style={styles.chipsContainer}>
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat.key;
                        return (
                          <TouchableOpacity
                            key={cat.key}
                            onPress={() => setCategory(cat.key)}
                            activeOpacity={0.8}
                            style={styles.chipTouchable}
                          >
                            <ImageBackground
                              source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                              resizeMode="stretch"
                              style={styles.chipBg}
                            >
                              <Text
                                style={[
                                  styles.chipText,
                                  isSelected && styles.chipTextSelected,
                                ]}
                              >
                                {cat.label}
                              </Text>
                            </ImageBackground>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* 3. Mensaje Opcional */}
                    <View style={styles.inputWrapper}>
                      <TextInput
                        style={styles.textInput}
                        placeholder={t('feedbackInputPlaceholder')}
                        placeholderTextColor="#78736B"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        numberOfLines={3}
                        maxLength={1000}
                      />
                    </View>

                    {errorMsg && (
                      <Text style={styles.errorText}>
                        ⚠️ {errorMsg}
                      </Text>
                    )}

                    {/* 4. Botones de Acción */}
                    <View style={styles.actionsContainer}>
                      <MuButton
                        titulo={loading ? t('btnSending') : t('btnSubmitFeedback')}
                        onPress={handleSubmit}
                        variante="primary"
                        cargando={loading}
                        altura={42}
                        style={{ width: '100%', marginBottom: 8 }}
                      />

                      <View style={styles.secondaryActionsRow}>
                        <TouchableOpacity
                          onPress={handleOpenWeb}
                          style={styles.linkTouchable}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.webLinkText}>{t('viewOnWeb')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleClose}
                          style={styles.dismissTouchable}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.dismissText}>{t('btnFeedbackLater')}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardAvoid: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: '#131413',
    borderWidth: 1,
    borderColor: '#3E392F',
    borderTopColor: '#5E5646',
    borderLeftColor: '#5E5646',
    borderBottomColor: '#201E1A',
    borderRightColor: '#201E1A',
    borderRadius: 3,
    position: 'relative',
    overflow: 'hidden',
    ...Platform.select({
      android: { elevation: 12 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.6,
        shadowRadius: 10,
      },
    }),
  },
  scrollContent: {
    padding: 18,
    flexGrow: 0,
  },
  header: {
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(94, 86, 70, 0.35)',
    paddingBottom: 10,
  },
  headerTitle: {
    color: '#FEDF99',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle || 'serif',
    textAlign: 'center',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  headerSubtitle: {
    color: '#CDC6B9',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 15,
    fontFamily: THEME.typography.fontBody || 'sans-serif',
  },
  body: {
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginVertical: 4,
  },
  starTouchable: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2,
    overflow: 'hidden',
  },
  starText: {
    fontSize: 34,
    lineHeight: 38,
  },
  starTextActive: {
    color: '#FEDF99',
    textShadowColor: 'rgba(239, 210, 141, 0.7)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  starTextInactive: {
    color: '#42413C',
  },
  ratingLabelText: {
    color: '#EFD28D',
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontMono || 'monospace',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
    width: '100%',
  },
  chipTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    height: 32,
    marginBottom: 4,
  },
  chipBg: {
    height: 32,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    color: '#A8A296',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: THEME.typography.fontBody || 'sans-serif',
  },
  chipTextSelected: {
    color: '#FEDF99',
    fontWeight: '900',
    ...THEME.effects.textShadowHigh,
  },
  inputWrapper: {
    width: '100%',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderColor: '#3E392F',
    borderTopColor: '#201E1A',
    borderLeftColor: '#201E1A',
    borderBottomColor: '#5E5646',
    borderRightColor: '#5E5646',
    borderRadius: 2,
    color: '#E4E2E0',
    fontSize: 12,
    padding: 10,
    minHeight: 65,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#E74C3C',
    fontSize: 11,
    marginBottom: 8,
    textAlign: 'center',
  },
  actionsContainer: {
    width: '100%',
    marginTop: 4,
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  linkTouchable: {
    paddingVertical: 6,
  },
  webLinkText: {
    color: '#EFD28D',
    fontSize: 11,
    textDecorationLine: 'underline',
  },
  dismissTouchable: {
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  dismissText: {
    color: '#8A857A',
    fontSize: 11,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  successIcon: {
    fontSize: 42,
    marginBottom: 8,
  },
  successTitle: {
    color: '#FEDF99',
    fontSize: 16,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle || 'serif',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  successDesc: {
    color: '#CDC6B9',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
    paddingHorizontal: 12,
  },
});
