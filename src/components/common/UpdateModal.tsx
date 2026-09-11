import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { AppUpdateInfo } from '../../services/database/sqlClient';
import { RemoteConfigService } from '../../services/security/remoteConfigService';

interface UpdateModalProps {
  visible: boolean;
  updateInfo: AppUpdateInfo | null;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ visible, updateInfo }) => {
  if (!visible || !updateInfo) return null;

  const handleDownload = async () => {
    if (updateInfo.apkUrl) {
      try {
        await Linking.openURL(updateInfo.apkUrl);
      } catch (e) {
        console.warn('Could not open APK URL', e);
      }
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

          <TouchableOpacity
            style={[styles.downloadButton, isRollback && { backgroundColor: THEME.colors.brasa }]}
            activeOpacity={0.8}
            onPress={handleDownload}
          >
            <Text style={[styles.downloadButtonText, isRollback && { color: '#EDE4D3' }]}>
              {isRollback ? 'Reinstalar Versión Anterior (Rollback)' : isBeta ? 'Instalar Versión Beta' : 'Descargar e Instalar Ahora'}
            </Text>
          </TouchableOpacity>

          {!updateInfo.forceUpdate && !isRollback && (
            <TouchableOpacity style={styles.laterButton} activeOpacity={0.7} onPress={handleDismiss}>
              <Text style={styles.laterButtonText}>Recordarme más tarde</Text>
            </TouchableOpacity>
          )}
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
});
