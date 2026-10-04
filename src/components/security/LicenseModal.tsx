import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
  Image,
  ImageBackground,
  Platform,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { GothicAlert as Alert } from '../common/GothicAlert';
import { MuIcon } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';
import { Panel, MuCornerOrnaments } from '../ui';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { LicenseService, LicenseStatus } from '../../services/security/licenseService';
import { RemoteConfigService, RemoteConfigState } from '../../services/security/remoteConfigService';
import { SecurityService } from '../../services/security/securityService';
import { SqlClient } from '../../services/database/sqlClient';
import { APP_VERSION, DISCORD_URL, TELEGRAM_URL } from '../../constants/appVersion';
import { useLanguage } from '../../context/LanguageContext';

interface LicenseModalProps {
  visible: boolean;
  onClose: () => void;
  initialSection?: 'license' | 'updates';
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ visible, onClose }) => {
  const { t } = useLanguage();
  const [status, setStatus] = useState<LicenseStatus>(LicenseService.getStatus());
  const [inputKey, setInputKey] = useState('');
  const [loading, setLoading] = useState(false);

  // Modo de Solicitud de Licencia PRO vs Ingreso de Clave (Stitch 08)
  const [modeTab, setModeTab] = useState<'key' | 'request'>('key');
  const [reqName, setReqName] = useState('');
  const [reqPhone, setReqPhone] = useState('');
  const [reqEmail, setReqEmail] = useState('');
  const [reqServer, setReqServer] = useState('');
  const [reqNotes, setReqNotes] = useState('');
  const [sendingReq, setSendingReq] = useState(false);

  // Estado de Actualizaciones de Sistema (Stitch 08)
  const [remoteConfig, setRemoteConfig] = useState<RemoteConfigState>(RemoteConfigService.getState());
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const unsubLicense = LicenseService.subscribe(setStatus);
    const unsubConfig = RemoteConfigService.subscribe(setRemoteConfig);

    // Refresco en tiempo real al abrir el modal para validar estado autoritativo con el servidor
    SecurityService.getDeviceHwid().then((deviceHwid) => {
      if (deviceHwid) {
        const cur = LicenseService.getStatus();
        SqlClient.sendTelemetryPing(deviceHwid, cur.plan || 'DEMO', cur.licenseKey)
          .then((res) => {
            RemoteConfigService.handleTelemetryPingResult(res);
            LicenseService.handleTelemetryResponse(res, deviceHwid);
          })
          .catch(() => {});
      }
    }).catch(() => {});

    return () => {
      unsubLicense();
      unsubConfig();
    };
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
        `El código de tu celular:\n\n${status.hwid}\n\nHa sido copiado al portapapeles. Pégalo en tu conversación de soporte con nuestro equipo.`
      );
    }
  };

  const handleOpenDiscord = () => {
    Linking.openURL(DISCORD_URL).catch(() => {
      Alert.alert('Discord', `Comunidad oficial de soporte: ${DISCORD_URL}`);
    });
  };

  const handleOpenTelegram = () => {
    Linking.openURL(TELEGRAM_URL).catch(() => {
      Alert.alert('Telegram', `Canal oficial de soporte: ${TELEGRAM_URL}`);
    });
  };

  const handleSendProRequest = async (isDirect: boolean = false) => {
    setSendingReq(true);
    try {
      const cleanPhone = isDirect ? 'Sin número (Contacto vía Email/Discord/Telegram)' : (reqPhone.trim() || 'Sin número');
      const cleanEmail = reqEmail.trim() || undefined;
      const res = await SqlClient.sendProRequest({
        name: isDirect ? 'Usuario App' : (reqName.trim() || 'Administrador'),
        phone: cleanPhone,
        email: cleanEmail,
        serverName: isDirect ? undefined : (reqServer.trim() || undefined),
        notes: isDirect ? 'Solicitud directa (1 Clic) desde modal de licencia.' : (reqNotes.trim() || undefined),
      });

      if (res.success) {
        Alert.alert(
          '⚡ Solicitud Enviada al Panel',
          `Tu solicitud de Licencia PRO fue enviada con éxito directamente al panel de control del administrador.\n\n[DISPOSITIVO]: ${status.hwid || 'Registrado'}\n[CONTACTO]: ${cleanEmail || cleanPhone}\n\nEl administrador revisará tu solicitud para activar tu Licencia PRO. También puedes contactar al soporte por nuestros canales oficiales de Discord o Telegram.`,
          [{ text: 'Entendido' }]
        );
        setReqNotes('');
      } else if (res.alreadyRequested) {
        Alert.alert(
          'Solicitud Registrada',
          res.message || `Este dispositivo (${status.hwid || 'HWID'}) ya tiene una solicitud registrada en el panel de control. El administrador ya tiene tus datos y se pondrá en contacto contigo.`,
          [{ text: 'Entendido' }]
        );
      } else {
        Alert.alert('Aviso', res.message || 'No se pudo registrar la solicitud en este momento.');
      }
    } finally {
      setSendingReq(false);
    }
  };

  // Acciones de Actualización (Stitch 08)
  const updateInfo = remoteConfig.updateInfo;
  const isRollback = !!updateInfo?.isRollback;
  const isBeta = remoteConfig.releaseChannel === 'BETA' || !!updateInfo?.isBeta;
  const latestVersion = updateInfo?.latestVersion || APP_VERSION;
  const hasUpdate = !!updateInfo?.hasUpdate;
  const forceUpdate = !!updateInfo?.forceUpdate;
  const changelogContent = updateInfo?.changelog || '• Mejoras de rendimiento en consultas SQL.\n• Sistema de diseño gótico Season 6 NewUI perfeccionado.\n• Corrección de estabilidad en conexiones de red.';

  const handleDownload = async (customUrl?: string) => {
    setDownloadError(null);
    const url = customUrl || updateInfo?.apkUrl;
    if (!url || !url.trim()) {
      setDownloadError('No se encontró una dirección de descarga válida.');
      return;
    }
    try {
      setDownloadStarted(true);
      await Linking.openURL(url.trim());
    } catch (e: any) {
      console.warn('Could not open APK URL', e);
      setDownloadError('No se pudo abrir el enlace automáticamente. Puedes reintentar o copiar el enlace directo.');
    }
  };

  const handleCopyUpdateLink = async () => {
    const url = updateInfo?.apkUrl;
    if (url && url.trim()) {
      await Clipboard.setStringAsync(url.trim());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
      Alert.alert('Enlace Copiado', 'El enlace de descarga del APK ha sido copiado al portapapeles.');
    } else {
      Alert.alert('Aviso', 'No hay enlace de descarga disponible en este momento.');
    }
  };

  const handleDismissUpdate = () => {
    RemoteConfigService.dismissUpdate();
    onClose();
  };

  const isPro = status.plan === 'PRO';
  const licenseBadgeText = isPro
    ? status.isLifetime || !status.expiresAt
      ? t('licenseProLifetime')
      : status.timeRemainingFormatted
        ? t('licenseProTrial').replace('{time}', status.timeRemainingFormatted)
        : t('licenseProStandard').replace('{days}', status.daysRemaining !== undefined && status.daysRemaining > 0 ? `${status.daysRemaining}D` : `${status.hoursRemaining || 24}H`)
    : t('licenseDemoLifetime');

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={styles.windowWrapper}>
          {/* Decorative Window Header Gothic Frame (Stitch 08) */}
          <View style={styles.headerContainer}>
            <Image
              source={STITCH_ASSETS.decorations.headerGothicWindow}
              style={styles.headerGothicWindow}
              resizeMode="contain"
            />
            {/* Área de pulsación transparente sobre el icono de cerrar (X) nativo en la textura Stitch */}
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Cerrar ventana"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />

            {/* Header Title Section */}
            <Text style={styles.windowTitle}>
              {t('modalTitle_licenseAndUpdates')}
            </Text>
          </View>

          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            {/* ======================================================== */}
            {/* PANEL 1: GESTIÓN DE LICENCIA                             */}
            {/* ======================================================== */}
            <Panel variant="box" style={styles.sectionPanel}>
              <MuCornerOrnaments size={12} />

              {/* Section Header with Diamonds & Ornamental Divider */}
              <View style={styles.sectionHeaderRow}>
                <View style={styles.diamond} />
                <Text style={styles.sectionTitle}>{t('licenseManageTitle')}</Text>
                <View style={styles.diamond} />
              </View>
              <View style={styles.goldDivider} />

              {/* License Status Display */}
              <View style={styles.statusDisplayRow}>
                <Text style={styles.statusTitleLabel}>{t('licenseStatusTitle')}</Text>
                <View style={[styles.statusPill, isPro ? styles.statusPillPro : styles.statusPillDemo]}>
                  <Text style={[styles.statusPillText, isPro ? styles.statusPillTextPro : styles.statusPillTextDemo]}>
                    {licenseBadgeText}
                  </Text>
                </View>
              </View>

              {/* Identificador del Dispositivo (HWID) */}
              <View style={styles.fieldBlock}>
                <View style={styles.fieldLabelRow}>
                  <MuIcon name="lock" size={13} color="#9AA0A6" />
                  <Text style={styles.fieldLabel}>{t('deviceIdTitle')}</Text>
                </View>
                <View style={styles.texturedInputContainer}>
                  <Text style={styles.hwidText} selectable={true}>
                    {status.hwid || 'CEL-2026-9B4F-881A'}
                  </Text>
                </View>

                {/* Botón Táctil Copiar HWID (min 48px) */}
                <TouchableOpacity
                  style={{ width: '100%', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}
                  onPress={handleCopyHwid}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel={t('btnCopyHwid')}
                >
                  <ImageBackground
                    source={STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.bigBtnWrap}
                    resizeMode="stretch"
                  >
                    <Text style={styles.bigBtnTextGold}>{t('btnCopyHwid')}</Text>
                  </ImageBackground>
                </TouchableOpacity>
              </View>

              {/* Soporte Técnico Oficial */}
              <View style={[styles.fieldBlock, styles.supportBlock]}>
                <Text style={styles.fieldLabel}>{t('officialSupport')}</Text>
                <View style={styles.dualButtonRow}>
                  <TouchableOpacity
                    style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                    onPress={handleOpenDiscord}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Servidor Discord"
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.halfBtnWrap}
                      resizeMode="stretch"
                    >
                      <MuIcon name={"discord" as any} size={15} color="#5865F2" style={{ marginRight: 6 }} />
                      <Text style={styles.mediumBtnTextWhite}>DISCORD</Text>
                    </ImageBackground>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                    onPress={handleOpenTelegram}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Canal Telegram"
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.halfBtnWrap}
                      resizeMode="stretch"
                    >
                      <MuIcon name={"send" as any} size={15} color="#5B8DEF" style={{ marginRight: 6 }} />
                      <Text style={styles.mediumBtnTextWhite}>TELEGRAM</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Mode Native Tabs (TENGO UNA CLAVE vs SOLICITAR PRO / SOLICITUD DIRECTA) */}
              <View style={styles.tabsRow}>
                <TouchableOpacity
                  style={styles.tabItem}
                  onPress={() => setModeTab('key')}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: modeTab === 'key' }}
                >
                  <ImageBackground
                    source={modeTab === 'key' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.tabImgBg}
                    resizeMode="stretch"
                  >
                    <Text style={[styles.tabText, modeTab === 'key' ? styles.tabTextActive : styles.tabTextInactive]}>
                      {t('tabHaveKey')}
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.tabItem}
                  onPress={() => setModeTab('request')}
                  activeOpacity={0.8}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: modeTab === 'request' }}
                >
                  <ImageBackground
                    source={modeTab === 'request' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.tabImgBg}
                    resizeMode="stretch"
                  >
                    <Text style={[styles.tabText, modeTab === 'request' ? styles.tabTextActive : styles.tabTextInactive]}>
                      {t('tabRequestPro')}
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
              </View>

              {/* Contenido según pestaña seleccionada */}
              {modeTab === 'key' ? (
                <View style={styles.activationFormContainer}>
                  <Text style={styles.fieldLabel}>{t('activationKeyLabel')}</Text>
                  <View style={styles.texturedInputContainer}>
                    <TextInput
                      style={styles.keyTextInput}
                      placeholder="MUMANAGER-PRO-XXXX-XXXX-XXXX"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={inputKey}
                      onChangeText={setInputKey}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
                  </View>

                  {/* Botones de Acción */}
                  <TouchableOpacity
                    style={{ width: '100%', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}
                    onPress={handleActivate}
                    disabled={loading}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('btnActivateLicense')}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeActive}
                      style={styles.bigBtnWrap}
                      resizeMode="stretch"
                    >
                      <Text style={styles.bigBtnTextGold}>
                        {loading ? t('btnVerifying') : t('btnActivateLicense')}
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ width: '100%', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}
                    onPress={handleResetToDemo}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('btnBackToDemo')}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.secondaryBtnWrap}
                      resizeMode="stretch"
                    >
                      <Text style={styles.bigBtnTextSilver}>{t('btnBackToDemo')}</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.activationFormContainer}>
                  {/* Botón 1-Clic Directo */}
                  <TouchableOpacity
                    style={{ width: '100%', borderRadius: 2, overflow: 'hidden', marginBottom: 12 }}
                    onPress={() => handleSendProRequest(true)}
                    disabled={sendingReq}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('btnSendDirectRequest')}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeActive}
                      style={styles.bigBtnWrap}
                      resizeMode="stretch"
                    >
                      <Text style={styles.bigBtnTextGold}>
                        {sendingReq ? t('btnSending') : t('btnSendDirectRequest')}
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14 }}>
                    <View style={{ flex: 1, height: 1, backgroundColor: THEME.colors.borde }} />
                    <Text style={{ marginHorizontal: 8, fontSize: 10, color: THEME.colors.textoSecundarioLuminoso, fontWeight: '700' }}>
                      {t('orCustomizeData')}
                    </Text>
                    <View style={{ flex: 1, height: 1, backgroundColor: THEME.colors.borde }} />
                  </View>

                  <Text style={styles.fieldLabel}>{t('yourNameOptional')}</Text>
                  <View style={styles.texturedInputContainer}>
                    <TextInput
                      style={styles.formTextInput}
                      placeholder="Ej: Carlos Silva (Admin Mu)"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqName}
                      onChangeText={setReqName}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>{t('yourPhoneOptional')}</Text>
                  <View style={styles.texturedInputContainer}>
                    <TextInput
                      style={styles.formTextInput}
                      placeholder="Ej: +54 9 11 2345-6789"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqPhone}
                      onChangeText={setReqPhone}
                      keyboardType="phone-pad"
                    />
                  </View>

                  <Text style={styles.fieldLabel}>{t('yourEmailOptional')}</Text>
                  <View style={styles.texturedInputContainer}>
                    <TextInput
                      style={styles.formTextInput}
                      placeholder="Ej: admin@servidormu.com"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqEmail}
                      onChangeText={setReqEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>

                  <Text style={styles.fieldLabel}>{t('serverNameOptional')}</Text>
                  <View style={styles.texturedInputContainer}>
                    <TextInput
                      style={styles.formTextInput}
                      placeholder="Ej: Mu Colombia Season 6"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqServer}
                      onChangeText={setReqServer}
                    />
                  </View>

                  <Text style={styles.fieldLabel}>{t('messageNotes')}</Text>
                  <View style={[styles.texturedInputContainer, { minHeight: 65 }]}>
                    <TextInput
                      style={[styles.formTextInput, { minHeight: 55, textAlignVertical: 'top' }]}
                      placeholder="¿Deseas plan mensual, anual o permanente?"
                      placeholderTextColor={THEME.colors.textMuted}
                      value={reqNotes}
                      onChangeText={setReqNotes}
                      multiline={true}
                    />
                  </View>

                  <TouchableOpacity
                    style={{ width: '100%', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}
                    onPress={() => handleSendProRequest(false)}
                    disabled={sendingReq}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('btnSendCustomRequest')}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.secondaryBtnWrap}
                      resizeMode="stretch"
                    >
                      <Text style={styles.bigBtnTextSilver}>
                        {sendingReq ? t('btnSending') : t('btnSendCustomRequest')}
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              )}
            </Panel>

            {/* ======================================================== */}
            {/* PANEL 2: ACTUALIZACIONES DEL SISTEMA                     */}
            {/* ======================================================== */}
            <Panel variant="box" style={[styles.sectionPanel, { marginTop: 12 }]}>
              <MuCornerOrnaments size={12} />

              {/* Section Header with Cog & Ornamental Divider */}
              <View style={styles.sectionHeaderRow}>
                <MuIcon name="tools" size={16} color="#EFD28D" />
                <Text style={styles.sectionTitle}>{t('sysUpdatesTitle')}</Text>
                <MuIcon name="tools" size={16} color="#EFD28D" />
              </View>
              <View style={styles.goldDivider} />

              {/* Version Compare Panel */}
              <View style={styles.versionCompareBox}>
                <View style={styles.versionCol}>
                  <Text style={styles.versionColLabel}>{t('updateInstalledLabel')}</Text>
                  <Text style={styles.versionColValCurrent}>v{APP_VERSION}</Text>
                </View>
                <View style={styles.versionColDivider} />
                <View style={styles.versionCol}>
                  <Text style={styles.versionColLabelGold}>{t('updateLatestLabel')}</Text>
                  <Text style={styles.versionColValLatest}>v{latestVersion}</Text>
                </View>
              </View>

              {/* Notas de Versión */}
              <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{t('versionNotes')}</Text>
                <View style={styles.changelogBox}>
                  <ScrollView style={styles.changelogScroll} nestedScrollEnabled={true}>
                    <Text style={styles.changelogText}>{changelogContent}</Text>
                  </ScrollView>
                </View>
              </View>

              {/* Bloque de Variantes y Acciones */}
              <View style={styles.variantsBlock}>
                {/* Variante Recomendada (Normal) */}
                <View style={styles.variantGroup}>
                  <Text style={styles.variantGroupTitleGold}>{t('recommendedVariant')}</Text>
                  <View style={styles.dualButtonRow}>
                    <TouchableOpacity
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => handleDownload()}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Descargar e Instalar Normal"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeActive}
                        style={styles.halfBtnGoldWrap}
                        resizeMode="stretch"
                      >
                        <Text style={styles.mediumBtnTextGoldSmall}>{t('btnDownloadAndInstall')}</Text>
                      </ImageBackground>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={handleDismissUpdate}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Recordarme más tarde"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.halfBtnWrap}
                        resizeMode="stretch"
                      >
                        <Text style={styles.mediumBtnTextWhiteSmall}>{t('btnRemindLaterUpper')}</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Variante Experimental (Beta) */}
                <View style={styles.variantGroup}>
                  <Text style={styles.variantGroupTitleMuted}>{t('experimentalBetaVariant')}</Text>
                  <TouchableOpacity
                    style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => handleDownload(updateInfo?.apkUrl)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Descargar Beta"
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.secondaryBtnWrap}
                      resizeMode="stretch"
                    >
                      <Text style={styles.bigBtnTextSilver}>{t('btnDownloadBeta')}</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>

                {/* Actualización Obligatoria (Crimson Button 1:1) */}
                {forceUpdate && (
                  <View style={styles.variantGroup}>
                    <Text style={styles.variantGroupTitleCrimson}>{t('forcedUpdateVariant')}</Text>
                    <TouchableOpacity
                      style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => handleDownload()}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Descargar e Instalar Obligatoria"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.big}
                        style={styles.crimsonBtnWrap}
                        resizeMode="stretch"
                      >
                        <Text style={styles.crimsonBtnText}>{t('btnDownloadAndInstall')}</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                )}

                {isRollback && (
                  <View style={styles.variantGroup}>
                    <Text style={styles.variantGroupTitleMuted}>{t('systemRollbackVariant')}</Text>
                    <TouchableOpacity
                      style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => handleDownload()}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Revertir a versión previa"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.secondaryBtnWrap}
                        resizeMode="stretch"
                      >
                        <Text style={styles.bigBtnTextSilver}>{t('btnRevertPrevious')}</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Estado de Fallo en Descarga (Visible ante error o enlace de descarga) */}
              {!!downloadError && (
                <View style={styles.downloadFailureBox}>
                  <View style={styles.failureTitleRow}>
                    <MuIcon name="alert-triangle" size={14} color="#FFB4AB" />
                    <Text style={styles.failureTitleText}>{t('downloadFailureTitle')}</Text>
                  </View>
                  <Text style={styles.failureMessageText}>{downloadError}</Text>
                  <View style={styles.dualButtonRow}>
                    <TouchableOpacity
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => handleDownload()}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Reintentar Descarga"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeActive}
                        style={styles.halfBtnGoldWrap}
                        resizeMode="stretch"
                      >
                        <Text style={styles.mediumBtnTextGold}>{t('btnRetryUpper')}</Text>
                      </ImageBackground>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={handleCopyUpdateLink}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Copiar Enlace Directo"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.halfBtnWrap}
                        resizeMode="stretch"
                      >
                        <Text style={styles.mediumBtnTextWhite}>
                          {copiedLink ? t('linkCopiedUpper') : t('btnCopyLinkUpper')}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </Panel>

            {/* Decorative Gothic Bottom Footer Frame (Stitch 08) */}
            <View style={styles.footerContainer}>
              <Image
                source={STITCH_ASSETS.decorations.gothicBottomFooter}
                style={styles.footerGothicWindow}
                resizeMode="stretch"
              />
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
    backgroundColor: 'rgba(0,0,0,0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  windowWrapper: {
    width: '100%',
    maxWidth: 410,
    height: '88%',
    maxHeight: '92%',
    backgroundColor: '#131413',
    borderWidth: 1,
    borderColor: '#3C352A',
    borderRadius: THEME.shapes.radioEsquina,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 20,
    flexDirection: 'column',
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 6,
    paddingHorizontal: 8,
    backgroundColor: '#0E1012',
    borderBottomWidth: 1,
    borderBottomColor: '#2E2920',
    position: 'relative',
    flexShrink: 0,
  },
  headerGothicWindow: {
    width: '100%',
    height: 48,
  },
  closeBtn: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  closeBtnImg: {
    width: 24,
    height: 24,
  },
  windowTitle: {
    fontSize: 13,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#EFD28D',
    letterSpacing: 1.2,
    textAlign: 'center',
    textTransform: 'uppercase',
    marginTop: 4,
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  cardScroll: {
    flex: 1,
    width: '100%',
  },
  cardScrollContent: {
    padding: 12,
    paddingBottom: 60,
    flexGrow: 1,
  },
  sectionPanel: {
    position: 'relative',
    backgroundColor: 'rgba(18, 20, 22, 0.95)',
    borderWidth: 1,
    borderColor: '#3C352A',
    borderRadius: 2,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  diamond: {
    width: 6,
    height: 6,
    backgroundColor: '#EFD28D',
    borderWidth: 1,
    borderColor: '#3F311C',
    transform: [{ rotate: '45deg' }],
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#EFD28D',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  goldDivider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(196, 154, 69, 0.4)',
    marginVertical: 8,
  },
  statusDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E1012',
    borderWidth: 1,
    borderColor: '#2E2920',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  statusTitleLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DCDFE3',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
  },
  statusPillPro: {
    backgroundColor: '#14231B',
    borderColor: '#059669',
  },
  statusPillDemo: {
    backgroundColor: '#26160F',
    borderColor: '#E2703A',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: THEME.typography.fontMono,
    letterSpacing: 0.5,
  },
  statusPillTextPro: {
    color: '#34D399',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  statusPillTextDemo: {
    color: '#FFA87D',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fieldBlock: {
    marginBottom: 12,
  },
  supportBlock: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#292E35',
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadowSubtle,
  },
  texturedInputContainer: {
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderColor: '#3A352A',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: 8,
  },
  hwidText: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 12.5,
    fontWeight: '700',
    color: '#EFD28D',
    textShadowColor: '#000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  keyTextInput: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 12.5,
    color: '#EFD28D',
    padding: 0,
    margin: 0,
  },
  formTextInput: {
    fontSize: 12,
    color: '#E4E2E0',
    padding: 0,
    margin: 0,
  },
  bigBtnWrap: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryBtnWrap: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnImgBg: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  tabImgBg: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  bigBtnTextGold: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#FEDF99',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textAlign: 'center',
    ...THEME.effects.textShadowHigh,
  },
  bigBtnTextSilver: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    color: '#C5C8CD',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
  },
  dualButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  halfBtnWrap: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  halfBtnGoldWrap: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  mediumBtnTextWhite: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  mediumBtnTextGold: {
    fontSize: 11.5,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#FEDF99',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
    ...THEME.effects.textShadowHigh,
  },
  mediumBtnTextGoldSmall: {
    fontSize: 10,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#FEDF99',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textAlign: 'center',
    ...THEME.effects.textShadowHigh,
  },
  mediumBtnTextWhiteSmall: {
    fontSize: 10,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    color: '#F3F4F6',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    textAlign: 'center',
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#292E35',
    marginBottom: 10,
  },
  tabItem: {
    flex: 1,
    minHeight: 48,
  },
  tabText: {
    fontSize: 11,
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tabTextActive: {
    fontWeight: '900',
    color: '#FEDF99',
    ...THEME.effects.textShadowHigh,
  },
  tabTextInactive: {
    fontWeight: '700',
    color: '#CDC6B9',
    ...THEME.effects.textShadowSubtle,
  },
  activationFormContainer: {
    gap: 4,
  },
  versionCompareBox: {
    flexDirection: 'row',
    backgroundColor: '#0E1012',
    borderWidth: 1,
    borderColor: '#2E2920',
    padding: 10,
    marginBottom: 10,
  },
  versionCol: {
    flex: 1,
    alignItems: 'center',
  },
  versionColDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#272B31',
  },
  versionColLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    ...THEME.effects.textShadowSubtle,
  },
  versionColLabelGold: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FEDF99',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
    ...THEME.effects.textShadowSubtle,
  },
  versionColValCurrent: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  versionColValLatest: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '800',
    color: '#FEDF99',
  },
  changelogBox: {
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderColor: '#3A352A',
    borderRadius: 2,
    padding: 10,
    maxHeight: 110,
  },
  changelogScroll: {
    maxHeight: 90,
  },
  changelogText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    lineHeight: 17,
  },
  variantsBlock: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#292E35',
    gap: 10,
  },
  variantGroup: {
    gap: 4,
  },
  variantGroupTitleGold: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FEDF99',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadowSubtle,
  },
  variantGroupTitleMuted: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadowSubtle,
  },
  variantGroupTitleCrimson: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFB4AB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  crimsonBtnWrap: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  crimsonBtnText: {
    fontSize: 12,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  downloadFailureBox: {
    backgroundColor: '#1A0E10',
    borderWidth: 1,
    borderColor: '#6B2525',
    padding: 10,
    marginTop: 10,
    borderRadius: 2,
    gap: 4,
  },
  failureTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  failureTitleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB4AB',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  failureMessageText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11.5,
    color: '#FCA5A5',
    lineHeight: 15,
    marginBottom: 6,
  },
  footerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  footerGothicWindow: {
    width: '100%',
    height: 38,
  },
});
