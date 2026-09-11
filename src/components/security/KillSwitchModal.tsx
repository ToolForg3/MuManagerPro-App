import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  BackHandler,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { THEME } from '../../constants/theme';

interface KillSwitchModalProps {
  visible: boolean;
  hwid: string;
  reason?: string;
}

export const KillSwitchModal: React.FC<KillSwitchModalProps> = ({
  visible,
  hwid,
  reason,
}) => {
  // Bloquear de manera estricta el botón "Atrás" de Android
  useEffect(() => {
    if (!visible) return;
    const backAction = () => true; // Impide retroceder o salir de la pantalla
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible]);

  const handleCopyHwid = async () => {
    await Clipboard.setStringAsync(hwid);
    Alert.alert('¡Copiado!', 'El ID de tu dispositivo ha sido copiado al portapapeles.');
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}} // No permitir cierre con gesto de Android
    >
      <View style={styles.container}>
        <View style={styles.shieldCircle}>
          <MaterialCommunityIcons name="shield-alert-outline" size={64} color="#FF3D00" />
        </View>

        <Text style={styles.title}>ACCESO DESACTIVADO</Text>
        <Text style={styles.subtitle}>
          {reason || 'El periodo de prueba ha finalizado o tu acceso ha sido pausado por el administrador.'}
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>CÓDIGO ÚNICO DE ESTE CELULAR (HWID):</Text>
          <View style={styles.hwidBox}>
            <Text style={styles.hwidText} selectable>
              {hwid || 'IDENTIFICANDO DISPOSITIVO...'}
            </Text>
          </View>

          <TouchableOpacity style={styles.copyButton} onPress={handleCopyHwid} activeOpacity={0.8}>
            <MaterialCommunityIcons name="content-copy" size={20} color="#FFFFFF" />
            <Text style={styles.copyButtonText}>Copiar Código de Dispositivo</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <MaterialCommunityIcons name="information-outline" size={20} color="#FF9800" />
          <Text style={styles.infoText}>
            Para habilitar este dispositivo o adquirir una licencia oficial permanente de Mu Manager PRO, contacta al desarrollador y envíale tu código.
          </Text>
        </View>

        <Text style={styles.footerBrand}>MU MANAGER PRO • SISTEMA DE PROTECCIÓN ACTIVO</Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191512',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  shieldCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderWidth: 2,
    borderColor: '#E2703A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#E8C86A',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 14,
    color: '#EDE4D3',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 30,
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    padding: 20,
    marginBottom: 20,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B58F3C',
    letterSpacing: 0.5,
    marginBottom: 10,
    textAlign: 'center',
  },
  hwidBox: {
    backgroundColor: '#100D0B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  hwidText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3FCF8E',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#B58F3C',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8C86A',
    gap: 8,
    minHeight: 48,
  },
  copyButtonText: {
    color: '#100D0B',
    fontSize: 14,
    fontWeight: '800',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1A1613',
    borderWidth: 1,
    borderColor: '#6B5533',
    borderRadius: 6,
    padding: 14,
    gap: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#9C9182',
    lineHeight: 18,
  },
  footerBrand: {
    fontSize: 10,
    color: '#7A5E22',
    letterSpacing: 1,
    fontWeight: '700',
  },
});
