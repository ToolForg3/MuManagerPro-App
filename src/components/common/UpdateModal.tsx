import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { AppUpdateInfo } from '../../services/database/sqlClient';
import { RemoteConfigService } from '../../services/security/remoteConfigService';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: AppUpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ visible, updateInfo }) => {
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
        setDownloadError('No se encontró una dirección de descarga válida.');
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
        setDownloadError('No se pudo abrir el enlace automáticamente. Puedes reintentar o copiar el enlace directo.');
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
        <View style={[styles.card, isRollback && { borderColor: THEME.colors.brasa }]}>
          {/* Top Rivets */}
          <View style={styles.topRivetRow}>
            <View style={styles.rivetDot} />
            <View style={styles.rivetDot} />
          </View>

          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.iconContainer, isRollback && { backgroundColor: 'rgba(226, 112, 58, 0.15)', borderColor: THEME.colors.brasa }, isBeta && { backgroundColor: 'rgba(91, 141, 239, 0.15)', borderColor: THEME.colors.arcano }]}>
              <MaterialCommunityIcons
                name={isRollback ? 'alert-octagon' : isBeta ? 'flask-outline' : 'shield-crown'}
                size={36}
                color={isRollback ? THEME.colors.brasa : isBeta ? THEME.colors.arcano : THEME.colors.oro}
              />
            </View>

            <Text style={[styles.title, isRollback && { color: THEME.colors.brasa }]}>
              {isRollback ? 'Directiva de Rollback' : isBeta ? 'Nueva Versión Beta Disponible' : 'Actualización Disponible'}
            </Text>
            <Text style={[styles.versionBadge, isRollback && { backgroundColor: 'rgba(226,112,58,0.2)', color: THEME.colors.brasa, borderColor: THEME.colors.brasa }, isBeta && { backgroundColor: 'rgba(91,141,239,0.2)', color: THEME.colors.arcano, borderColor: THEME.colors.arcano }]}>
              {isRollback ? `Restaurar a v${updateInfo.latestVersion}` : isBeta ? `Canal Beta • v${updateInfo.latestVersion}` : `Versión v${updateInfo.latestVersion}`}
            </Text>

            {isRollback ? (
              <View style={[styles.forcedBanner, { borderColor: THEME.colors.brasa, backgroundColor: 'rgba(226, 112, 58, 0.12)' }]}>
                <Text style={[styles.forcedText, { color: THEME.colors.brasa }]}>ROLLBACK PREVENTIVO OBLIGATORIO</Text>
                <Text style={styles.forcedSub}>
                  Se ha detectado una incidencia en la versión actual (v{updateInfo.currentVersion}). Se ordena reinstalar la versión certificada anterior para proteger la base de datos y tus cuentas.
                </Text>
              </View>
            ) : updateInfo.forceUpdate ? (
              <View style={styles.forcedBanner}>
                <Text style={styles.forcedText}>Actualización Obligatoria</Text>
                <Text style={styles.forcedSub}>Debes instalar esta versión para seguir utilizando Mu Manager PRO.</Text>
              </View>
            ) : (
              <Text style={styles.subtitle}>
                {isBeta ? 'Hay una nueva compilación de pruebas disponible en el Canal Beta.' : 'Hay una versión más reciente con nuevas mejoras y correcciones.'}
              </Text>
            )}

            {!!updateInfo.changelog && (
              <View style={styles.changelogBox}>
                <Text style={styles.changelogTitle}>{isRollback ? 'Motivo del Rollback:' : 'Novedades de esta versión:'}</Text>
                <ScrollView style={styles.changelogScroll} nestedScrollEnabled>
                  <Text style={styles.changelogText}>{updateInfo.changelog}</Text>
                </ScrollView>
              </View>
            )}

            {/* Banner de error visible si la descarga o apertura de URL falla */}
            {!!downloadError && (
              <View style={styles.errorBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#FF5252" style={{ marginRight: 6 }} />
                  <Text style={styles.errorBoxTitle}>Error al iniciar descarga</Text>
                </View>
                <Text style={styles.errorBoxMsg}>{downloadError}</Text>
                <View style={styles.errorActionsRow}>
                  <TouchableOpacity
                    style={styles.retryActionBtn}
                    onPress={handleDownload}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Reintentar descarga"
                  >
                    <MaterialCommunityIcons name="reload" size={16} color={THEME.colors.texto} style={{ marginRight: 4 }} />
                    <Text style={styles.retryActionText}>Reintentar</Text>
                  </TouchableOpacity>
                  {!!updateInfo.apkUrl && (
                    <TouchableOpacity
                      style={styles.copyActionBtn}
                      onPress={handleCopyLink}
                      activeOpacity={0.8}
                      accessibilityRole="button"
                      accessibilityLabel="Copiar enlace de descarga"
                    >
                      <MaterialCommunityIcons
                        name={copied ? 'check' : 'content-copy'}
                        size={16}
                        color={copied ? THEME.colors.jade : THEME.colors.oroClaro}
                        style={{ marginRight: 4 }}
                      />
                      <Text style={[styles.copyActionText, copied && { color: THEME.colors.jade }]}>
                        {copied ? '¡Copiado!' : 'Copiar Enlace'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Banner instructivo cuando se inicia la descarga del APK */}
            {downloadStarted && (
              <View style={styles.instructionBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialCommunityIcons name="information" size={18} color={THEME.colors.oroClaro} style={{ marginRight: 6 }} />
                  <Text style={styles.instructionTitle}>Pasos para Completar la Instalación</Text>
                </View>
                <Text style={styles.instructionMsg}>
                  La descarga se ha iniciado en tu navegador. Para que la actualización tome efecto:
                </Text>
                <Text style={styles.instructionStep}>1. Desliza la barra superior de Android o entra a tu app "Descargas".</Text>
                <Text style={styles.instructionStep}>2. Toca "MuManagerPro.apk" y selecciona "Actualizar" o "Instalar".</Text>
                <Text style={styles.instructionStep}>3. Abre la app al terminar para ingresar a la nueva versión v{updateInfo.latestVersion}.</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.downloadButton, isRollback && { backgroundColor: THEME.colors.brasa }]}
              activeOpacity={0.8}
              onPress={handleDownload}
              accessibilityRole="button"
              accessibilityLabel={isRollback ? 'Reinstalar Versión Anterior' : 'Descargar e Instalar Ahora'}
            >
              <Text style={[styles.downloadButtonText, isRollback && { color: THEME.colors.texto }]}>
                {isRollback ? 'Reinstalar Versión Anterior (Rollback)' : isBeta ? 'Instalar Versión Beta' : 'Descargar e Instalar Ahora'}
              </Text>
            </TouchableOpacity>

            {!updateInfo.forceUpdate && !isRollback && (
              <TouchableOpacity
                style={styles.laterButton}
                activeOpacity={0.7}
                onPress={handleDismiss}
                accessibilityRole="button"
                accessibilityLabel="Recordarme más tarde"
              >
                <Text style={styles.laterButtonText}>Recordarme más tarde</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
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
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    borderRadius: 2.5,
    backgroundColor: '#B58F3C',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 6,
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.oro,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oro,
    marginBottom: 6,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  versionBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.jade,
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.jade,
    marginBottom: 14,
  },
  subtitle: {
    fontSize: 13,
    color: THEME.colors.textoSecundario,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
  },
  forcedBanner: {
    backgroundColor: 'rgba(226, 112, 58, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.brasa,
    borderRadius: 6,
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
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    textAlign: 'center',
  },
  changelogBox: {
    width: '100%',
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: 6,
    padding: 12,
    marginBottom: 18,
  },
  changelogTitle: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oro,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  changelogScroll: {
    maxHeight: 110,
  },
  changelogText: {
    fontSize: 12,
    color: THEME.colors.texto,
    lineHeight: 18,
  },
  downloadButton: {
    width: '100%',
    backgroundColor: THEME.colors.oro,
    minHeight: 56,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  downloadButtonText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
    color: '#191512',
    textTransform: 'uppercase',
  },
  laterButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    minHeight: 44,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    backgroundColor: '#2B2521',
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    fontSize: 12,
    color: THEME.colors.textoSecundario,
    fontWeight: '700',
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
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  errorBoxTitle: {
    color: '#FF5252',
    fontWeight: '700',
    fontSize: 13,
  },
  errorBoxMsg: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  retryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A2E22',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  retryActionText: {
    color: THEME.colors.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  copyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A2E22',
    borderWidth: 1,
    borderColor: THEME.colors.oro,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  copyActionText: {
    color: THEME.colors.oroClaro,
    fontSize: 12,
    fontWeight: '700',
  },
  instructionBox: {
    width: '100%',
    backgroundColor: 'rgba(232, 200, 106, 0.1)',
    borderWidth: 1,
    borderColor: THEME.colors.oroClaro,
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
  },
  instructionTitle: {
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  instructionMsg: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
  },
  instructionStep: {
    color: THEME.colors.texto,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 3,
  },
});
