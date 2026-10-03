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
} from 'react-native';
import { THEME } from '../../constants/theme';
import { MuButton } from '../ui/MuButton';
import { MuCornerOrnaments } from '../ui/MuCornerOrnaments';
import { SecurityService } from '../../services/security/securityService';
import { SqlClient } from '../../services/database/sqlClient';
import { FeedbackService, FeedbackModalOptions } from '../../services/feedback/feedbackService';

interface CategoryOption {
  key: string;
  label: string;
}

const CATEGORIES: CategoryOption[] = [
  { key: 'general', label: '⭐ Experiencia' },
  { key: 'feature', label: '💡 Sugerencia' },
  { key: 'bug', label: '🐛 Detalle' },
  { key: 'server', label: '🎮 Servidor' },
];

const RATING_DESCRIPTIONS: Record<number, string> = {
  1: 'Muy Insatisfecho (1/5)',
  2: 'Requiere Mejoras (2/5)',
  3: 'Aceptable (3/5)',
  4: 'Muy Bueno (4/5)',
  5: '¡Excelente! (5/5)',
};

export const FeedbackModal: React.FC = () => {
  const [options, setOptions] = useState<FeedbackModalOptions | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [category, setCategory] = useState<string>('general');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [hwid, setHwid] = useState<string>('');

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
        setErrorMsg(res.error || 'No se pudo enviar la calificación.');
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Error de conexión.');
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
          <View style={styles.dialogCard}>
            <MuCornerOrnaments size={16} />

            {/* Cabecera Gótica */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                {options.title || '⭐ CALIFICAR EXPERIENCIA'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {options.subtitle || 'Tu opinión forja las próximas herramientas de Mu Manager PRO.'}
              </Text>
            </View>

            {submitted ? (
              /* Vista de Éxito */
              <View style={styles.successContainer}>
                <Text style={styles.successIcon}>⚔️</Text>
                <Text style={styles.successTitle}>¡Muchas Gracias!</Text>
                <Text style={styles.successDesc}>
                  Tu calificación de {rating} estrellas ha sido enviada con éxito al equipo de desarrollo.
                </Text>
                <MuButton
                  titulo="ACEPTAR"
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

                {/* 2. Selector de Categorías (Chips) */}
                <View style={styles.chipsContainer}>
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.key;
                    return (
                      <TouchableOpacity
                        key={cat.key}
                        onPress={() => setCategory(cat.key)}
                        activeOpacity={0.8}
                        style={[
                          styles.chipButton,
                          isSelected && styles.chipButtonSelected,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {cat.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* 3. Mensaje Opcional */}
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.textInput}
                    placeholder="¿Qué te pareció la herramienta? ¿Alguna sugerencia? (Opcional)"
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
                    titulo={loading ? 'ENVIANDO...' : 'ENVIAR OPINIÓN'}
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
                      <Text style={styles.webLinkText}>🌐 Ver en mumanager.pro</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleClose}
                      style={styles.dismissTouchable}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dismissText}>Más tarde</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
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
  dialogCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#131413',
    borderWidth: 1,
    borderColor: '#3E392F',
    borderTopColor: '#5E5646',
    borderLeftColor: '#5E5646',
    borderBottomColor: '#201E1A',
    borderRightColor: '#201E1A',
    borderRadius: 3,
    padding: 18,
    position: 'relative',
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
  chipButton: {
    height: 32,
    paddingHorizontal: 10,
    backgroundColor: '#1A1C1A',
    borderWidth: 1,
    borderColor: '#38342B',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipButtonSelected: {
    backgroundColor: 'rgba(239, 210, 141, 0.18)',
    borderColor: '#EFD28D',
  },
  chipText: {
    color: '#A8A296',
    fontSize: 11,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: '#FEDF99',
    fontWeight: '800',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
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
