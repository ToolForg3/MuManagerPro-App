import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  BackHandler,
  Linking,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../common/GothicAlert';
import { MuIcon } from '../ui/MuIcon';
import * as Clipboard from 'expo-clipboard';
import { THEME } from '../../constants/theme';
import { Panel } from '../ui';
import { STITCH_ASSETS } from '../../constants/stitchAssets';

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
    const text = `Hola Soporte ToolForg3! Mi dispositivo está bloqueado en MuManager PRO.\n\n[HWID]: ${hwidCode}\n[MOTIVO]: ${reasonText}\n\nSolicito asistencia o adquisición de licencia oficial.`;
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
            <MuIcon name="shield-alert" size={54} />
          </View>

          <Text style={styles.title}>ACCESO DESACTIVADO</Text>
          <Text style={styles.subtitle}>
            {reason || 'El periodo de prueba ha finalizado o tu acceso ha sido pausado por el administrador.'}
          </Text>

          {/* Tarjeta de Código HWID */}
          <Panel style={styles.card}>
            <Text style={styles.cardLabel}>CÓDIGO ÚNICO DE ESTE CELULAR (HWID):</Text>
            <View style={styles.hwidBox}>
              <Text style={styles.hwidText} selectable>
                {hwid || 'IDENTIFICANDO DISPOSITIVO...'}
              </Text>
            </View>

            <TouchableOpacity
              style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
              onPress={handleCopyHwid}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={STITCH_ASSETS.tabs.tabModeActive}
                style={styles.copyButton}
                resizeMode="stretch"
              >
                <MuIcon name="save" size={18} color="#0D0E0D" />
                <Text style={styles.copyButtonText}>Copiar Código de Dispositivo</Text>
              </ImageBackground>
            </TouchableOpacity>
          </Panel>

          {/* Botones de Comunicación con Soporte Oficial */}
          <Panel style={styles.supportCard}>
            <Text style={styles.supportCardTitle}>COMUNICARSE CON SOPORTE OFICIAL</Text>
            <Text style={styles.supportCardSubtitle}>
              Contacta a nuestro equipo para desbloqueo, verificación o renovación de licencia:
            </Text>

            <View style={styles.supportButtonsCol}>
              <TouchableOpacity
                style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                onPress={handleOpenWhatsApp}
                activeOpacity={0.85}
              >
                <ImageBackground
                  source={STITCH_ASSETS.tabs.tabModeInactive}
                  style={styles.btnSupport}
                  resizeMode="stretch"
                >
                  <MuIcon name="community" size={24} color="#3FCF8E" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.btnSupportMainText}>WhatsApp Soporte Oficial</Text>
                    <Text style={styles.btnSupportSubText}>Atención inmediata para activación y desbloqueo</Text>
                  </View>
                  <MuIcon name="arrow-right" size={18} color="#E0C380" />
                </ImageBackground>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                onPress={handleOpenTelegram}
                activeOpacity={0.85}
              >
                <ImageBackground
                  source={STITCH_ASSETS.tabs.tabModeInactive}
                  style={styles.btnSupport}
                  resizeMode="stretch"
                >
                  <MuIcon name="community" size={22} color="#5B8DEF" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.btnSupportMainText}>Telegram ToolForg3</Text>
                    <Text style={styles.btnSupportSubText}>Canal oficial de soporte y novedades</Text>
                  </View>
                  <MuIcon name="arrow-right" size={18} color="#E0C380" />
                </ImageBackground>
              </TouchableOpacity>
            </View>
          </Panel>

          <View style={styles.infoBox}>
            <MuIcon name="tools" size={20} />
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
    backgroundColor: THEME.colors.fondo,
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
    borderRadius: 45, // círculo funcional (width/2): ícono de escudo de seguridad
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
    color: '#E0C380',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.texto,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
    paddingHorizontal: 12,
    ...THEME.effects.textShadowSubtle,
  },
  card: {
    width: '100%',
    padding: 16,
    marginBottom: 16,
  },
  cardLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#E0C380',
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
  },
  hwidBox: {
    backgroundColor: '#0D0E0D',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
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
    ...THEME.effects.textShadowSubtle,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
    minHeight: 44,
  },
  copyButtonText: {
    color: '#0D0E0D',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
  },
  supportCard: {
    width: '100%',
    padding: 16,
    marginBottom: 16,
  },
  supportCardTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#E0C380',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 4,
    ...THEME.effects.textShadow,
  },
  supportCardSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
    ...THEME.effects.textShadowSubtle,
  },
  supportButtonsCol: {
    gap: 10,
  },
  btnSupport: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
    minHeight: 52,
  },
  btnSupportMainText: {
    color: '#E0C380',
    fontSize: 13,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.3,
    ...THEME.effects.textShadowSubtle,
  },
  btnSupportSubText: {
    color: '#CDC6B9',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1B1C1B',
    borderWidth: 1,
    borderColor: '#4C463A',
    borderRadius: 2,
    padding: 12,
    gap: 10,
    alignItems: 'center',
    marginBottom: 20,
    width: '100%',
  },
  infoText: {
    flex: 1,
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    lineHeight: 16,
    ...THEME.effects.textShadowSubtle,
  },
  footerBrand: {
    fontSize: 10.5,
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 1,
    fontWeight: '700',
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
  },
});
