import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { SecurityService } from '../../services/security/securityService';

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
    <View style={styles.container}>
      {/* Encabezado */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons
            name={lockoutTimer > 0 ? 'lock-alert' : 'shield-crown'}
            size={44}
            color={lockoutTimer > 0 ? THEME.colors.brasa : THEME.colors.oro}
          />
        </View>
        <Text style={styles.title}>MU MANAGER PRO</Text>
        <Text style={styles.subtitle}>
          {lockoutTimer > 0
            ? `Bloqueado temporalmente (${lockoutTimer}s)`
            : 'Ingresa tu PIN de seguridad de 4 dígitos'}
        </Text>
      </View>

      {/* Indicadores de 4 círculos */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3].map((index) => {
          const filled = pin.length > index;
          return (
            <View
              key={index}
              style={[
                styles.dot,
                filled && styles.dotFilled,
                lockoutTimer > 0 && styles.dotLocked,
              ]}
            />
          );
        })}
      </View>

      {/* Teclado visual numérico */}
      <View style={styles.keypad}>
        {[['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']].map((row, rIdx) => (
          <View key={rIdx} style={styles.keyRow}>
            {row.map((digit) => (
              <TouchableOpacity
                key={digit}
                style={[styles.keyButton, lockoutTimer > 0 && styles.keyButtonDisabled]}
                disabled={lockoutTimer > 0}
                onPress={() => handleKeyPress(digit)}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, lockoutTimer > 0 && styles.keyTextDisabled]}>
                  {digit}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Fila inferior: espacio, 0, borrar */}
        <View style={styles.keyRow}>
          <View style={styles.keyButtonEmpty} />
          <TouchableOpacity
            style={[styles.keyButton, lockoutTimer > 0 && styles.keyButtonDisabled]}
            disabled={lockoutTimer > 0}
            onPress={() => handleKeyPress('0')}
            activeOpacity={0.7}
          >
            <Text style={[styles.keyText, lockoutTimer > 0 && styles.keyTextDisabled]}>
              0
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.keyButton, lockoutTimer > 0 && styles.keyButtonDisabled]}
            disabled={lockoutTimer > 0}
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons
              name="backspace-outline"
              size={24}
              color={lockoutTimer > 0 ? '#555' : THEME.colors.oro}
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
    justifyContent: 'space-between',
    paddingVertical: THEME.spacing.xl,
    paddingHorizontal: THEME.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginTop: THEME.spacing.xl,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 6,
    backgroundColor: '#2B2521',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: THEME.spacing.md,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oro,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textoSecundario,
    marginTop: THEME.spacing.xs,
    textAlign: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginVertical: THEME.spacing.lg,
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: THEME.colors.borde,
    backgroundColor: THEME.colors.casillaFondo,
  },
  dotFilled: {
    backgroundColor: THEME.colors.oro,
    borderColor: '#FFE866',
  },
  dotLocked: {
    borderColor: THEME.colors.brasa,
  },
  keypad: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    marginBottom: THEME.spacing.lg,
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  keyButton: {
    width: 72,
    height: 72,
    borderRadius: 6,
    backgroundColor: '#2B2521',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  keyButtonDisabled: {
    opacity: 0.4,
    borderColor: '#3A2E22',
  },
  keyButtonEmpty: {
    width: 72,
    height: 72,
  },
  keyText: {
    fontSize: 26,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.texto,
  },
  keyTextDisabled: {
    color: '#666',
  },
});
