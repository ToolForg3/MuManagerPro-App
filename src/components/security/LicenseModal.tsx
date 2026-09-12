import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { CustomButton } from '../common/CustomButton';
import { LicenseService, LicenseStatus } from '../../services/security/licenseService';
import { SqlClient } from '../../services/database/sqlClient';
import * as Clipboard from 'expo-clipboard';

interface LicenseModalProps {
  visible: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ visible, onClose }) => {
  const [status, setStatus] = useState<LicenseStatus>(LicenseService.getStatus());
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Formulario de Solicitud de Licencia PRO
  const [modeTab, setModeTab] = useState<'request' | 'key'>('request');
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqServer, setReqServer] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [sendingReq, setSendingReq] = useState(false);

  useEffect(() => {
    return LicenseService.subscribe(setStatus);
  }, []);

  const handleActivate = async () => {
    if (!inputKey.trim()) {
      Alert.alert('Atención', 'Por favor ingresa tu clave de activación.');
      return;
    }
    setLoading(true);
    try {
      const result = await LicenseService.activateWithKey(inputKey);
      if (result.success) {
        Alert.alert('¡Felicitaciones!', result.message);
        setInputKey('');
        onClose();
      } else {
        Alert.alert('Clave Inválida', result.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetToDemo = async () => {
    await LicenseService.resetToDemo();
    Alert.alert('Restablecido', 'La aplicación ha vuelto al modo DEMO de prueba.');
  };

  const handleCopyHwid = async () => {
    if (status.hwid) {
      await Clipboard.setStringAsync(status.hwid);
      Alert.alert(
        '¡Código Copiado!',
        `El código de tu celular:\n\n${status.hwid}\n\nHa sido copiado al portapapeles. Pégalo en tu conversación de WhatsApp con el equipo de soporte.`
      );
    }
  };

  const handleOpenWhatsApp = () => {
    const hwidCode = status.hwid || 'N/A';
    const text = `Hola equipo MuManager PRO! Me gustaría adquirir mi Licencia PRO para mi celular.\n\nID de Dispositivo: ${hwidCode}`;
    const url = `https://wa.me/5521971217376?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp automáticamente. Puedes escribir al número oficial: +55 21 97121-7376.');
    });
  };

  const handleOpenTelegram = () => {
    Linking.openURL('https://t.me/mumanagerpro').catch(() => {
      Alert.alert('Telegram', 'Canal oficial de soporte: @mumanagerpro');
    });
  };

  const handleSendProRequest = async () => {
    if (!reqName.trim() || !reqPhone.trim()) {
      Alert.alert(
        'Campos Requeridos',
        'Por favor completa al menos tu Nombre y tu Teléfono/WhatsApp para que nuestro equipo pueda contactarte.'
      );
      return;
    }

    setSendingReq(true);
    try {
      const res = await SqlClient.sendProRequest({
        name: reqName,
        phone: reqPhone,
        email: reqEmail,
        serverName: reqServer,
        notes: reqNotes,
      });

      if (res.success) {
        Alert.alert(
          '¡Solicitud Recibida!',
          `Hemos registrado tu solicitud comercial y el ID de tu celular (${status.hwid || 'Registrado'}).\n\nNuestro equipo revisará tu mensaje y se pondrá en contacto contigo a la brevedad por WhatsApp.`,
          [{ text: 'Entendido' }]
        );
        setReqNotes('');
      } else {
        Alert.alert('Aviso', res.message || 'No se pudo registrar la solicitud en este momento.');
      }
    } finally {
      setSendingReq(false);
    }
  };

  const isPro = status.plan === 'PRO';

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons
                name={isPro ? 'shield-check' : 'shield-alert'}
                size={24}
                color={isPro ? THEME.colors.accentGreenBright : THEME.colors.primaryOrange}
              />
              <Text style={styles.title}>
                {isPro ? 'Licencia PRO Activada' : 'Activación de Licencia PRO'}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Status Card */}
            <View style={[styles.statusCard, isPro ? styles.statusCardPro : styles.statusCardDemo]}>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Estado Actual:</Text>
                <View style={[styles.pill, isPro ? styles.pillPro : styles.pillDemo]}>
                  <Text style={[styles.pillText, isPro ? styles.pillTextPro : styles.pillTextDemo]}>
                    {isPro ? 'VERSIÓN PRO (DESBLOQUEADA)' : 'MODO DEMO (LIMITADO)'}
                  </Text>
                </View>
              </View>

              <Text style={styles.statusDesc}>
                {isPro
                  ? 'Tienes acceso total: guardado y sincronización en SQL Server, edición de 108 slots de inventario, baúl ilimitado y stats sin restricciones.'
                  : 'En modo demo puedes explorar la interfaz y ver personajes, pero el guardado en SQL Server y stats mayores a 500 requieren Licencia PRO activa.'}
              </Text>
            </View>

            {/* Código de Hardware (HWID) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. ID EXCLUSIVO DE TU DISPOSITIVO</Text>
              <Text style={styles.sectionHelp}>
                El sistema asocia criptográficamente tu licencia a este identificador de celular:
              </Text>

              <View style={styles.hwidBox}>
                <Text style={styles.hwidText} selectable={true}>
                  {status.hwid || 'CEL-CARGANDO-ID'}
                </Text>
                <TouchableOpacity style={styles.copyBtn} onPress={handleCopyHwid}>
                  <MaterialCommunityIcons name="content-copy" size={16} color="#FFFFFF" />
                  <Text style={styles.copyBtnText}>Copiar</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Canales de Contacto Directo */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. CONTACTO DIRECTO CON EL EQUIPO</Text>
              <Text style={styles.sectionHelp}>
                Comunícate directamente con nuestro equipo de soporte para activación inmediata o consultas:
              </Text>

              <View style={styles.contactButtonsRow}>
                <TouchableOpacity style={styles.btnWhatsApp} onPress={handleOpenWhatsApp} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="whatsapp" size={20} color="#FFFFFF" />
                  <Text style={styles.btnContactText}>WhatsApp Soporte</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.btnTelegram} onPress={handleOpenTelegram} activeOpacity={0.8}>
                  <MaterialCommunityIcons name="send" size={18} color="#FFFFFF" />
                  <Text style={styles.btnContactText}>Canal Telegram</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Selector de Pestaña: Solicitar vs Ingresar Clave */}
            {!isPro ? (
              <View style={styles.section}>
                <View style={styles.tabSwitchContainer}>
                  <TouchableOpacity
                    style={[styles.tabSwitchBtn, modeTab === 'request' && styles.tabSwitchBtnActive]}
                    onPress={() => setModeTab('request')}
                  >
                    <MaterialCommunityIcons
                      name="email-send-outline"
                      size={16}
                      color={modeTab === 'request' ? '#FF5722' : THEME.colors.textSecondary}
                    />
                    <Text style={[styles.tabSwitchText, modeTab === 'request' && styles.tabSwitchTextActive]}>
                      Solicitar PRO
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.tabSwitchBtn, modeTab === 'key' && styles.tabSwitchBtnActive]}
                    onPress={() => setModeTab('key')}
                  >
                    <MaterialCommunityIcons
                      name="key-outline"
                      size={16}
                      color={modeTab === 'key' ? '#FF5722' : THEME.colors.textSecondary}
                    />
                    <Text style={[styles.tabSwitchText, modeTab === 'key' && styles.tabSwitchTextActive]}>
                      Tengo una Clave
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Formulario de Solicitud de Licencia PRO */}
                {modeTab === 'request' ? (
                  <View style={styles.formContainer}>
                    <Text style={styles.formInstructions}>
                      Completa tus datos de contacto para que nuestro equipo te envíe tu clave de activación oficial:
                    </Text>

                    <Text style={styles.inputLabel}>Tu Nombre / Alias *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: Carlos Silva (Admin Mu)"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqName}
                      onChangeText={setReqName}
                    />

                    <Text style={styles.inputLabel}>Número de WhatsApp / Teléfono *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: +54 9 11 2345-6789"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqPhone}
                      onChangeText={setReqPhone}
                      keyboardType="phone-pad"
                    />

                    <Text style={styles.inputLabel}>Correo Electrónico o Discord (Opcional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: admin@servidormu.com"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqEmail}
                      onChangeText={setReqEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />

                    <Text style={styles.inputLabel}>Nombre de tu Servidor MU (Opcional)</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Ej: Mu Colombia Season 6"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqServer}
                      onChangeText={setReqServer}
                    />

                    <Text style={styles.inputLabel}>Mensaje / Consulta Adicional</Text>
                    <TextInput
                      style={[styles.textInput, { height: 65, textAlignVertical: 'top' }]}
                      placeholder="¿Deseas plan mensual, anual o permanente?"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqNotes}
                      onChangeText={setReqNotes}
                      multiline={true}
                    />

                    <CustomButton
                      title={sendingReq ? 'Enviando...' : 'ENVIAR SOLICITUD AL EQUIPO'}
                      onPress={handleSendProRequest}
                      variant="orange"
                      loading={sendingReq}
                      icon="send"
                      size="lg"
                      style={{ marginTop: 14 }}
                    />
                  </View>
                ) : (
                  /* Ingreso manual de clave */
                  <View style={styles.keyContainer}>
                    <Text style={styles.sectionHelp}>
                      Pega aquí la clave entregada por el equipo (ej: MUMANAGER-PRO-XXXX-XXXX-XXXX):
                    </Text>

                    <TextInput
                      style={styles.keyInput}
                      placeholder="MUMANAGER-PRO-XXXX-XXXX-XXXX"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={inputKey}
                      onChangeText={setInputKey}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />

                    <CustomButton
                      title={loading ? 'Verificando...' : 'ACTIVAR LICENCIA PRO'}
                      onPress={handleActivate}
                      variant="orange"
                      loading={loading}
                      icon="key-variant"
                      size="lg"
                      style={{ marginTop: 14 }}
                    />
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.activatedBox}>
                <MaterialCommunityIcons name="check-decagram" size={38} color={THEME.colors.accentGreenBright} />
                <Text style={styles.activatedTitle}>¡Aplicación Registrada en Modo PRO!</Text>
                <Text style={styles.activatedSub}>
                  Clave: {status.licenseKey || 'MUMANAGER-PRO-ACTIVATED'}
                </Text>

                <View style={[
                  styles.vigenciaBadge,
                  status.isLifetime || !status.expiresAt ? styles.vigenciaLifetime : styles.vigenciaDays
                ]}>
                  <MaterialCommunityIcons
                    name={status.isLifetime || !status.expiresAt ? 'infinity' : 'calendar-clock'}
                    size={16}
                    color={status.isLifetime || !status.expiresAt ? THEME.colors.jade : '#FFB74D'}
                  />
                  <Text style={[
                    styles.vigenciaText,
                    { color: status.isLifetime || !status.expiresAt ? THEME.colors.jade : '#FFB74D' }
                  ]}>
                    {status.isLifetime || !status.expiresAt
                      ? 'Licencia Vitalicia (Acceso Permanente)'
                      : `Vigencia: Vence el ${new Date(status.expiresAt).toLocaleDateString()}${status.daysRemaining !== undefined ? ` (${status.daysRemaining} días)` : ''}`}
                  </Text>
                </View>

                <TouchableOpacity style={styles.resetBtn} onPress={handleResetToDemo}>
                  <Text style={styles.resetBtnText}>Desactivar y volver a DEMO</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Anti-crack notice */}
            <View style={styles.securityFooter}>
              <MaterialCommunityIcons name="lock" size={14} color={THEME.colors.textMuted} />
              <Text style={styles.securityText}>
                Firma criptográfica SHA-256 ligada a hardware. Control centralizado contra copias no autorizadas.
              </Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    padding: THEME.spacing.md,
  },
  container: {
    maxHeight: '92%',
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6B5533',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    borderBottomWidth: 1.5,
    borderBottomColor: '#6B5533',
    backgroundColor: '#1E1A16',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
    color: '#E8C86A',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.8,
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    padding: THEME.spacing.md,
  },
  statusCard: {
    padding: THEME.spacing.md,
    borderRadius: 6,
    borderWidth: 1.2,
    marginBottom: THEME.spacing.md,
  },
  statusCardDemo: {
    backgroundColor: 'rgba(226, 112, 58, 0.1)',
    borderColor: '#E2703A',
  },
  statusCardPro: {
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    borderColor: '#3FCF8E',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  statusLabel: {
    fontSize: 12,
    color: '#9C9182',
    fontWeight: THEME.typography.weightMedium,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  pillDemo: {
    backgroundColor: 'rgba(226, 112, 58, 0.2)',
    borderColor: '#E2703A',
  },
  pillPro: {
    backgroundColor: 'rgba(63, 207, 142, 0.2)',
    borderColor: '#3FCF8E',
  },
  pillText: {
    fontSize: 10,
    fontWeight: THEME.typography.weightBold,
  },
  pillTextDemo: {
    color: '#E2703A',
  },
  pillTextPro: {
    color: '#3FCF8E',
  },
  statusDesc: {
    fontSize: 11,
    color: '#9C9182',
    lineHeight: 16,
    marginTop: 4,
  },
  section: {
    backgroundColor: '#231D19',
    padding: THEME.spacing.md,
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: '#6B5533',
    marginBottom: THEME.spacing.md,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: THEME.typography.weightBold,
    color: '#E8C86A',
    letterSpacing: 1,
    fontFamily: THEME.typography.fontTitle,
    marginBottom: 4,
  },
  sectionHelp: {
    fontSize: 11,
    color: '#9C9182',
    lineHeight: 16,
    marginBottom: 10,
  },
  hwidBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#100D0B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  hwidText: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 13,
    fontWeight: THEME.typography.weightBold,
    color: '#E8C86A',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B2521',
    borderWidth: 1,
    borderColor: '#6B5533',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
  },
  copyBtnText: {
    fontSize: 11,
    color: '#EDE4D3',
    fontWeight: THEME.typography.weightMedium,
  },
  contactButtonsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  btnWhatsApp: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E7E34',
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3FCF8E',
    gap: 6,
  },
  btnTelegram: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0088CC',
    paddingVertical: 10,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#5B8DEF',
    gap: 6,
  },
  btnContactText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  tabSwitchContainer: {
    flexDirection: 'row',
    backgroundColor: '#100D0B',
    borderRadius: 6,
    padding: 3,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minHeight: 40,
    borderRadius: 6,
    gap: 6,
  },
  tabSwitchBtnActive: {
    backgroundColor: '#2B2521',
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9C9182',
  },
  tabSwitchTextActive: {
    color: '#E8C86A',
    fontWeight: '700',
  },
  formContainer: {
    gap: 6,
  },
  formInstructions: {
    fontSize: 11,
    color: '#9C9182',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EDE4D3',
    marginTop: 6,
    marginBottom: 3,
  },
  textInput: {
    backgroundColor: '#100D0B',
    borderWidth: 1,
    borderColor: '#6B5533',
    borderRadius: 6,
    color: '#EDE4D3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    fontSize: 12,
  },
  keyContainer: {
    marginTop: 4,
  },
  keyInput: {
    backgroundColor: '#100D0B',
    borderWidth: 1,
    borderColor: '#6B5533',
    borderRadius: 6,
    color: '#EDE4D3',
    fontFamily: THEME.typography.fontMono,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    fontSize: 13,
  },
  activatedBox: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  activatedTitle: {
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
    color: '#E8C86A',
    fontFamily: THEME.typography.fontTitle,
  },
  activatedSub: {
    fontSize: 11,
    color: '#9C9182',
    fontFamily: THEME.typography.fontMono,
  },
  vigenciaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 6,
  },
  vigenciaLifetime: {
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    borderColor: '#3FCF8E',
  },
  vigenciaDays: {
    backgroundColor: 'rgba(232, 200, 106, 0.12)',
    borderColor: '#B58F3C',
  },
  vigenciaText: {
    fontSize: 12,
    fontWeight: '700',
  },
  resetBtn: {
    marginTop: 10,
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 11,
    color: '#E2703A',
    textDecorationLine: 'underline',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  securityText: {
    fontSize: 10,
    color: '#9C9182',
    textAlign: 'center',
  },
});
