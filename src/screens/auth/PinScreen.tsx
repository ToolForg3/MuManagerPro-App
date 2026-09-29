import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../../constants/theme';
import { SecurityService } from '../../services/security/securityService';
import {
  MuIcon,
  MuSideMoldings,
  MuHeaderBanner,
  MuCornerOrnaments,
  Panel,
} from '../../components/ui';
import { STITCH_ASSETS } from '../../constants/stitchAssets';

interface PinScreenProps {
  onSuccess: () => void;
}

export const PIN_STORAGE_KEY = '@mumanager_pin_hash';
const MAX_ATTEMPTS = 3;
const LOCKOUT_SECONDS = 30;

export const PinScreen: React.FC<PinScreenProps> = ({ onSuccess }) => {
  const [pin, setPin] = useState<string>('');
  const [attempts, setAttempts] = useState<number>(0);
  const [lockoutTimer, setLockoutTimer] = useState<number>(0);

  // Contador regresivo de bloqueo
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (lockoutTimer > 0) {
      timer = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [lockoutTimer]);

  // Al completar 4 dígitos, verificar PIN
  useEffect(() => {
    if (pin.length === 4) {
      verifyPin(pin);
    }
  }, [pin]);

  const verifyPin = async (inputPin: string) => {
    try {
      const storedHash = await AsyncStorage.getItem(PIN_STORAGE_KEY);
      if (!storedHash) {
        // Si no hay PIN configurado, dar acceso directamente
        onSuccess();
        return;
      }

      const inputHash = SecurityService.computeChecksum(inputPin);
      if (inputHash === storedHash) {
        setPin('');
        setAttempts(0);
        onSuccess();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);
        setPin('');

        if (nextAttempts >= MAX_ATTEMPTS) {
          setLockoutTimer(LOCKOUT_SECONDS);
          Alert.alert(
            'Acceso Bloqueado',
            `Has superado los ${MAX_ATTEMPTS} intentos permitidos. Por seguridad, el acceso está bloqueado por ${LOCKOUT_SECONDS} segundos.`
          );
        } else {
          Alert.alert(
            'PIN Incorrecto',
            `El código ingresado no coincide. Intentos restantes: ${MAX_ATTEMPTS - nextAttempts}`
          );
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error al validar PIN de seguridad');
      setPin('');
    }
  };

  const handleKeyPress = (digit: string) => {
    if (lockoutTimer > 0 || pin.length >= 4) return;
    setPin((prev) => prev + digit);
  };

  const handleDelete = () => {
    if (lockoutTimer > 0 || pin.length === 0) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={styles.container}
      imageStyle={styles.bgStoneImage}
      resizeMode="repeat"
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Cabecera Clásica Season 6 */}
        <MuHeaderBanner
          titulo="MU MANAGER PRO"
          subtitulo="PIN Y TÉRMINOS"
        />

      {/* Panel de Seguridad NewUI */}
      <Panel variant="box" style={styles.pinPanel}>
        <MuCornerOrnaments size={12} />

        <View style={styles.header}>
          <View style={styles.padlockIconBox}>
            <Image
              source={STITCH_ASSETS.sprites.security}
              style={styles.padlockImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.title}>PIN DE SEGURIDAD</Text>
          <Text style={styles.subtitle}>
            {lockoutTimer > 0
              ? `Bloqueado temporalmente (${lockoutTimer}s)`
              : 'Introduce el código maestro de 4 cifras'}
          </Text>
        </View>

        {/* Indicadores de 4 círculos dorados NewUI */}
        <View style={styles.dotsContainer}>
          {[0, 1, 2, 3].map((index) => {
            const filled = pin.length > index;
            return (
              <View
                key={index}
                style={[
                  styles.dotOuter,
                  filled && styles.dotOuterFilled,
                  lockoutTimer > 0 && styles.dotOuterLocked,
                ]}
              >
                <View
                  style={[
                    styles.dotInner,
                    filled && styles.dotInnerFilled,
                    lockoutTimer > 0 && styles.dotInnerLocked,
                  ]}
                />
              </View>
            );
          })}
        </View>

        {/* Notificaciones de seguridad dinámica */}
        <View style={styles.securityBox}>
          {lockoutTimer > 0 ? (
            <View style={styles.warningLocked}>
              <Text style={styles.warningLockedText}>
                Restricción temporal activa: [bloqueo: {lockoutTimer}s]
              </Text>
            </View>
          ) : (
            <View style={styles.warningNotice}>
              <Text style={styles.warningNoticeText}>
                Bloqueo tras {MAX_ATTEMPTS} intentos fallidos · Intento {attempts}/{MAX_ATTEMPTS}
              </Text>
            </View>
          )}
        </View>

        {/* Teclado visual numérico NewUI */}
        <View style={styles.keypad}>
          {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
            <View key={rIdx} style={styles.keyRow}>
              {row.map((digit) => (
                <TouchableOpacity
                  key={digit}
                  style={[{ flex: 1, marginHorizontal: 4, borderRadius: 2, overflow: 'hidden' }, lockoutTimer > 0 && styles.keyButtonDisabled]}
                  disabled={lockoutTimer > 0}
                  onPress={() => handleKeyPress(digit)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Dígito ${digit}`}
                >
                  <ImageBackground
                    source={STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.keyButtonWrap}
                    resizeMode="stretch"
                  >
                    <Text style={[styles.keyText, lockoutTimer > 0 && styles.keyTextDisabled]}>
                      {digit}
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Fila inferior: slot decorativo, 0, borrar */}
          <View style={styles.keyRow}>
            <View style={{ flex: 1, marginHorizontal: 4, borderRadius: 2, overflow: 'hidden' }}>
              <ImageBackground
                source={STITCH_ASSETS.items.slotBox}
                style={styles.keyButtonEmpty}
                resizeMode="stretch"
              >
                <Text style={{ color: '#D2B674', fontSize: 16 }}>◆</Text>
              </ImageBackground>
            </View>
            <TouchableOpacity
              style={[{ flex: 1, marginHorizontal: 4, borderRadius: 2, overflow: 'hidden' }, lockoutTimer > 0 && styles.keyButtonDisabled]}
              disabled={lockoutTimer > 0}
              onPress={() => handleKeyPress('0')}
              activeOpacity={0.7}
              accessibilityLabel="Dígito 0"
            >
              <ImageBackground
                source={STITCH_ASSETS.tabs.tabModeInactive}
                style={styles.keyButtonWrap}
                resizeMode="stretch"
              >
                <Text style={[styles.keyText, lockoutTimer > 0 && styles.keyTextDisabled]}>
                  0
                </Text>
              </ImageBackground>
            </TouchableOpacity>
            <TouchableOpacity
              style={[{ flex: 1, marginHorizontal: 4, borderRadius: 2, overflow: 'hidden' }, lockoutTimer > 0 && styles.keyButtonDisabled]}
              disabled={lockoutTimer > 0}
              onPress={handleDelete}
              activeOpacity={0.7}
              accessibilityLabel="Borrar dígito"
            >
              <ImageBackground
                source={STITCH_ASSETS.buttons.small}
                style={[styles.keyButtonWrap, styles.keyButtonDelete]}
                resizeMode="stretch"
              >
                <Text style={styles.deleteText}>BORRAR</Text>
              </ImageBackground>
            </TouchableOpacity>
          </View>
        </View>
      </Panel>

      {/* Zócalo Inferior Gótico NewUI */}
      <Image
        source={STITCH_ASSETS.decorations.gothicBottomFooter}
        style={{ width: '100%', maxWidth: 390, height: 42, alignSelf: 'center', marginTop: 12 }}
        resizeMode="stretch"
      />
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 16,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  bgStoneImage: {
    opacity: 0.50,
  },
  pinPanel: {
    width: '100%',
    maxWidth: 390,
    alignSelf: 'center',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  padlockIconBox: {
    width: 44,
    height: 44,
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderColor: 'rgba(210, 182, 116, 0.7)',
    borderRadius: THEME.shapes.radioEsquina,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  padlockImg: {
    width: 28,
    height: 28,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oroClaro,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  subtitle: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginVertical: 12,
  },
  dotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14 /* círculo funcional (width/2): indicador exterior pin */,
    backgroundColor: '#0C0D0C',
    borderWidth: 1.5,
    borderColor: '#383D38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOuterFilled: {
    borderColor: '#8C7138',
    shadowColor: '#EFD28D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  dotOuterLocked: {
    borderColor: THEME.colors.brasa,
  },
  dotInner: {
    width: 10,
    height: 10,
    borderRadius: 5 /* círculo funcional (width/2): núcleo indicador pin */,
    backgroundColor: '#161716',
  },
  dotInnerFilled: {
    backgroundColor: '#EFD28D',
    shadowColor: '#EFD28D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3,
  },
  dotInnerLocked: {
    backgroundColor: THEME.colors.brasa,
  },
  securityBox: {
    width: '100%',
    marginBottom: 14,
  },
  warningNotice: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#141514',
    borderWidth: 1,
    borderColor: '#323632',
    borderRadius: THEME.shapes.radioEsquina,
    alignItems: 'center',
  },
  warningNoticeText: {
    fontSize: 11,
    color: THEME.colors.oroClaro,
    fontWeight: '500',
  },
  warningLocked: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#1A0E0E',
    borderWidth: 1,
    borderColor: '#4D1F1F',
    borderRadius: THEME.shapes.radioEsquina,
    alignItems: 'center',
  },
  warningLockedText: {
    fontSize: 11,
    color: '#FFB4AB',
    fontWeight: '600',
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  keyButtonWrap: {
    minHeight: 48,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyButtonDelete: {
    paddingHorizontal: 4,
  },
  deleteText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#FF6B6B',
    fontFamily: THEME.typography.fontTitle,
  },
  keyButtonEmpty: {
    minHeight: 48,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  keyButtonDisabled: {
    opacity: 0.4,
    borderColor: THEME.colors.borde,
  },
  keyText: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.texto,
    ...THEME.effects.textShadow,
  },
  keyTextDisabled: {
    color: THEME.colors.textMuted,
  },
});
