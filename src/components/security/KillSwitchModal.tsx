import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  BackHandler,
  Alert,
  Linking,
  ScrollView,
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
    await Clipboard.setStringAsync(hwid || '');
    Alert.alert('¡Copiado!', 'El ID de tu dispositivo ha sido copiado al portapapeles.');
  };

  const handleOpenWhatsApp = () => {
    const hwidCode = hwid || 'N/A';
    const reasonText = reason || 'Acceso restringido';
    const text = `Hola Soporte ToolForg3! Mi dispositivo está bloqueado en MuManager PRO.\n\n📱 HWID: ${hwidCode}\n⚠️ Motivo: ${reasonText}\n\nSolicito asistencia o adquisición de licencia oficial.`;
    const url = `https://wa.me/5521971217376?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp automáticamente. Puedes escribir al número oficial: +55 21 97121-7376.');
    });
  };

  const handleOpenTelegram = () => {
    Linking.openURL('https://t.me/ToolForg3').catch(() => {
      Alert.alert('Telegram', 'Canal oficial de soporte: https://t.me/ToolForg3');
    });
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
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.shieldCircle}>
            <MaterialCommunityIcons name="shield-alert-outline" size={54} color="#FF3D00" />
          </View>

          <Text style={styles.title}>ACCESO DESACTIVADO</Text>
          <Text style={styles.subtitle}>
            {reason || 'El periodo de prueba ha finalizado o tu acceso ha sido pausado por el administrador.'}
          </Text>

          {/* Tarjeta de Código HWID */}
          <View style={styles.card}>
            <Text style={styles.cardLabel}>CÓDIGO ÚNICO DE ESTE CELULAR (HWID):</Text>
            <View style={styles.hwidBox}>
              <Text style={styles.hwidText} selectable>
                {hwid || 'IDENTIFICANDO DISPOSITIVO...'}
              </Text>
            </View>

            <TouchableOpacity style={styles.copyButton} onPress={handleCopyHwid} activeOpacity={0.8}>
              <MaterialCommunityIcons name="content-copy" size={18} color="#100D0B" />
              <Text style={styles.copyButtonText}>Copiar Código de Dispositivo</Text>
            </TouchableOpacity>
          </View>

          {/* Botones de Comunicación con Soporte Oficial */}
          <View style={styles.supportCard}>
            <Text style={styles.supportCardTitle}>COMUNICARSE CON SOPORTE OFICIAL</Text>
            <Text style={styles.supportCardSubtitle}>
              Contacta a nuestro equipo para desbloqueo, verificación o renovación de licencia:
            </Text>

            <View style={styles.supportButtonsCol}>
              <TouchableOpacity
                style={styles.btnWhatsApp}
                onPress={handleOpenWhatsApp}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="whatsapp" size={24} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.btnSupportMainText}>WhatsApp Soporte Oficial</Text>
                  <Text style={styles.btnSupportSubText}>Atención inmediata para activación y desbloqueo</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.btnTelegram}
                onPress={handleOpenTelegram}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="send" size={22} color="#FFFFFF" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.btnSupportMainText}>Telegram ToolForg3</Text>
                  <Text style={styles.btnSupportSubText}>Canal oficial de soporte y novedades</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.infoBox}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#FF9800" />
            <Text style={styles.infoText}>
              Para habilitar este dispositivo o adquirir una licencia oficial permanente de Mu Manager PRO, contacta al desarrollador y envíale tu código.
            </Text>
          </View>

          <Text style={styles.footerBrand}>MU MANAGER PRO • SISTEMA DE PROTECCIÓN ACTIVO</Text>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191512',
  },
  scrollContent: {
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderWidth: 2,
    borderColor: '#E2703A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#E8C86A',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.texto,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B58F3C',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  hwidBox: {
    backgroundColor: '#100D0B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  hwidText: {
    fontSize: 15,
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
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8C86A',
    gap: 8,
    minHeight: 44,
  },
  copyButtonText: {
    color: '#100D0B',
    fontSize: 13,
    fontWeight: '800',
  },
  supportCard: {
    width: '100%',
    backgroundColor: '#231D19',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6B5533',
    padding: 16,
    marginBottom: 16,
  },
  supportCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8C86A',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
  },
  supportCardSubtitle: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  supportButtonsCol: {
    gap: 10,
  },
  btnWhatsApp: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E7E34',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: '#3FCF8E',
    gap: 12,
    minHeight: 52,
  },
  btnTelegram: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0088CC',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: '#5B8DEF',
    gap: 12,
    minHeight: 52,
  },
  btnSupportMainText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  btnSupportSubText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1A1613',
    borderWidth: 1,
    borderColor: '#6B5533',
    borderRadius: 6,
    padding: 12,
    gap: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    lineHeight: 16,
  },
  footerBrand: {
    fontSize: 10,
    color: '#7A5E22',
    letterSpacing: 1,
    fontWeight: '700',
    textAlign: 'center',
  },
});
