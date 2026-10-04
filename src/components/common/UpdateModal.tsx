import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MuIcon } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { AppUpdateInfo } from '../../services/database/sqlClient';
import { RemoteConfigService } from '../../services/security/remoteConfigService';
import { Panel } from '../ui/Panel';
import { MuCornerOrnaments } from '../ui/MuCornerOrnaments';
import { MuButton } from '../ui/MuButton';
import { useLanguage } from '../../context/LanguageContext';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: AppUpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ visible, updateInfo }) => {
  const { t } = useLanguage();
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  if (!visible || !updateInfo) return null;

  const handleDownload = async () => {
    if (typeof setDownloadError === 'function') {
      setDownloadError(null);
    }
    const url = updateInfo?.apkUrl;
    if (!url || !url.trim()) {
      if (typeof setDownloadError === 'function') {
        setDownloadError(typeof t === 'function' ? t('downloadErrorNoUrl') : 'No se encontró una dirección de descarga válida.');
      }
      return;
    }
    try {
      if (typeof setDownloadStarted === 'function') {
        setDownloadStarted(true);
      }
      await Linking.openURL(url.trim());
    } catch (e: any) {
      console.warn('Could not open APK URL', e);
      if (typeof setDownloadError === 'function') {
        setDownloadError(typeof t === 'function' ? t('downloadErrorOpen') : 'No se pudo abrir el enlace automáticamente. Puedes reintentar o copiar el enlace directo.');
      }
    }
  };

  const handleCopyLink = async () => {
    const url = updateInfo?.apkUrl;
    if (url && url.trim()) {
      await Clipboard.setStringAsync(url.trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleDismiss = () => {
    RemoteConfigService.dismissUpdate();
  };

  const isRollback = !!updateInfo.isRollback;
  const isBeta = !!updateInfo.isBeta;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.overlay}>
        <Panel variant="box" style={[styles.card, isRollback && { borderColor: THEME.colors.brasa }]}>
          <MuCornerOrnaments size={12} />
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.iconContainer, isRollback && { backgroundColor: 'rgba(226, 112, 58, 0.15)', borderColor: THEME.colors.brasa }, isBeta && { backgroundColor: 'rgba(91, 141, 239, 0.15)', borderColor: THEME.colors.arcano }]}>
              <Image
                source={isRollback ? STITCH_ASSETS.sprites.security : STITCH_ASSETS.sprites.options}
                style={{ width: 38, height: 38 }}
                resizeMode="contain"
              />
            </View>

            <Text style={[styles.title, isRollback && { color: THEME.colors.brasa }]}>
              {isRollback ? t('rollbackTitle') : isBeta ? t('betaTitle') : t('updateTitle')}
            </Text>

            {/* Version Compare Panel (Stitch 08) */}
            <View style={styles.versionCompareRow}>
              <View style={styles.versionCompareCol}>
                <Text style={styles.versionCompareLabel}>{t('updateInstalledLabel')}</Text>
                <Text style={styles.versionCompareValCurrent}>v{updateInfo.currentVersion}</Text>
              </View>
              <View style={styles.versionCompareDivider} />
              <View style={styles.versionCompareCol}>
                <Text style={styles.versionCompareLabel}>{t('updateLatestLabel')}</Text>
                <Text style={styles.versionCompareValLatest}>v{updateInfo.latestVersion}</Text>
              </View>
            </View>

            {isRollback ? (
              <View style={[styles.forcedBanner, { borderColor: THEME.colors.brasa, backgroundColor: 'rgba(226, 112, 58, 0.12)' }]}>
                <Text style={[styles.forcedText, { color: THEME.colors.brasa }]}>{t('rollbackBannerTitle')}</Text>
                <Text style={styles.forcedSub}>
                  {t('rollbackBannerDesc', { version: updateInfo.currentVersion })}
                </Text>
              </View>
            ) : updateInfo.forceUpdate ? (
              <View style={styles.forcedBanner}>
                <Text style={styles.forcedText}>{t('forcedUpdateTitle')}</Text>
                <Text style={styles.forcedSub}>{t('forcedUpdateDesc')}</Text>
              </View>
            ) : (
              <Text style={styles.subtitle}>
                {isBeta ? t('updateBetaSubtitle') : t('updateSubtitle')}
              </Text>
            )}

            {!!updateInfo.changelog && (
              <View style={styles.changelogBox}>
                <Text style={styles.changelogTitle}>{isRollback ? t('rollbackReason') : t('updateChangelogTitle')}</Text>
                <ScrollView style={styles.changelogScroll} nestedScrollEnabled>
                  <Text style={styles.changelogText}>{updateInfo.changelog}</Text>
                </ScrollView>
              </View>
            )}

            {/* Banner de error visible si la descarga o apertura de URL falla */}
            {!!downloadError && (
              <View style={styles.errorBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MuIcon name="shield-alert" size={18} style={{ marginRight: 6 }} />
                  <Text style={styles.errorBoxTitle}>{t('updateErrorTitle')}</Text>
                </View>
                <Text style={styles.errorBoxMsg}>{downloadError}</Text>
                <View style={styles.errorActionsRow}>
                  <TouchableOpacity
                    style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                    onPress={handleDownload}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel={t('btnRetry')}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.retryActionBtn}
                      resizeMode="stretch"
                    >
                      <MuIcon name="refresh" size={16} color="#E0C380" style={{ marginRight: 4 }} />
                      <Text style={styles.retryActionText}>{t('btnRetry')}</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  {!!updateInfo.apkUrl && (
                    <TouchableOpacity
                      style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                      onPress={handleCopyLink}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel={t('btnCopyLink')}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.copyActionBtn}
                        resizeMode="stretch"
                      >
                        <MuIcon
                          name={copied ? 'check' : 'save'}
                          size={16}
                          color={copied ? THEME.colors.jade : '#E0C380'}
                          style={{ marginRight: 4 }}
                        />
                        <Text style={[styles.copyActionText, copied && { color: THEME.colors.jade }]}>
                          {copied ? t('linkCopied') : t('btnCopyLink')}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Banner instructivo cuando se inicia la descarga del APK */}
            {downloadStarted && (
              <View style={styles.instructionBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MuIcon name="tools" size={18} style={{ marginRight: 6 }} />
                  <Text style={styles.instructionTitle}>{t('instructionTitle')}</Text>
                </View>
                <Text style={styles.instructionMsg}>
                  {t('instructionMsg')}
                </Text>
                <Text style={styles.instructionStep}>{t('instructionStep1')}</Text>
                <Text style={styles.instructionStep}>{t('instructionStep2')}</Text>
                <Text style={styles.instructionStep}>{t('instructionStep3', { version: updateInfo.latestVersion })}</Text>
              </View>
            )}

            <MuButton
              titulo={
                isRollback
                  ? t('btnReinstallPrevious')
                  : isBeta
                  ? t('btnInstallBeta')
                  : t('btnDownloadNow')
              }
              icono="download"
              variante={updateInfo.forceUpdate || isRollback ? 'danger' : 'primary'}
              altura={48}
              onPress={handleDownload}
              style={{ width: '100%', marginBottom: 10 }}
              accessibilityLabel={isRollback ? t('btnReinstallPrevious') : t('btnDownloadNow')}
            />

            {!updateInfo.forceUpdate && !isRollback && (
              <MuButton
                titulo={t('btnRemindLater')}
                variante="secondary"
                altura={44}
                onPress={handleDismiss}
                style={{ width: '100%', marginTop: 2 }}
                accessibilityLabel={t('btnRemindLater')}
              />
            )}

            {/* Faldón decorativo gótico que cubre todo el espacio del borde */}
            <Image
              source={STITCH_ASSETS.decorations.gothicBottomFooter}
              style={styles.gothicBottomFooter}
              resizeMode="stretch"
            />
          </ScrollView>
        </Panel>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    padding: 24,
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  topRivetRow: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rivetDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5, /* círculo funcional (width/2) */
    backgroundColor: '#E0C380',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 2,
    backgroundColor: 'rgba(224, 195, 128, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.oroClaro,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oroClaro,
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  versionCompareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E1012',
    borderWidth: 1,
    borderColor: '#3D372E',
    borderRadius: THEME.shapes.radioEsquina,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
    width: '100%',
  },
  versionCompareCol: {
    flex: 1,
    alignItems: 'center',
  },
  versionCompareDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#3D372E',
  },
  versionCompareLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.8,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  versionCompareValCurrent: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#DCDFE3',
  },
  versionCompareValLatest: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: THEME.colors.oroClaro,
  },
  versionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.jade,
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.jade,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textoSecundarioLuminoso,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    ...THEME.effects.textShadowSubtle,
  },
  forcedBanner: {
    backgroundColor: 'rgba(226, 112, 58, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.brasa,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 10,
    marginBottom: 14,
    width: '100%',
    alignItems: 'center',
  },
  forcedText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.brasa,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  forcedSub: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
  },
  changelogBox: {
    width: '100%',
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 12,
    marginBottom: 18,
  },
  changelogTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oroClaro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
    ...THEME.effects.textShadow,
  },
  changelogScroll: {
    maxHeight: 110,
  },
  changelogText: {
    fontSize: 12,
    color: THEME.colors.texto,
    lineHeight: 18,
    ...THEME.effects.textShadowSubtle,
  },
  crimsonButtonWrap: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  crimsonButtonText: {
    fontSize: 12.5,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#FFFFFF',
    letterSpacing: 1,
    textTransform: 'uppercase',
    textShadowColor: '#000000',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  downloadButtonWrap: {
    width: '100%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  downloadButtonText: {
    fontSize: 13,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: '#0D0E0D',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  laterButtonWrap: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  laterButtonText: {
    fontSize: 12,
    color: '#C5C8CD',
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadowSubtle,
  },
  cardScroll: {
    width: '100%',
  },
  cardScrollContent: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  errorBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    borderWidth: 1,
    borderColor: '#FF5252',
    borderRadius: THEME.shapes.radioEsquina,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxTitle: {
    color: '#FF5252',
    fontWeight: '700',
    fontSize: 13,
  },
  errorBoxMsg: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
    ...THEME.effects.textShadowSubtle,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  retryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  retryActionText: {
    color: '#E0C380',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadowSubtle,
  },
  copyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  copyActionText: {
    color: '#E0C380',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadowSubtle,
  },
  instructionBox: {
    width: '100%',
    backgroundColor: 'rgba(224, 195, 128, 0.1)',
    borderWidth: 1,
    borderColor: THEME.colors.oroClaro,
    borderRadius: 2,
    padding: 12,
    marginBottom: 14,
  },
  instructionTitle: {
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  instructionMsg: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
    ...THEME.effects.textShadowSubtle,
  },
  instructionStep: {
    color: THEME.colors.texto,
    fontSize: 11.5,
    lineHeight: 16,
    marginBottom: 3,
    ...THEME.effects.textShadowSubtle,
  },
  gothicBottomFooter: {
    width: '100%',
    height: 24,
    marginTop: 14,
  },
});
