import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../../constants/theme';
import { APP_VERSION } from '../../constants/appVersion';

export const TERMS_STORAGE_KEY = '@mumanager_terms_accepted_version';

interface TermsAndConditionsModalProps {
  visible: boolean;
  onClose: () => void;
  onAccept?: () => void;
  isOnboarding?: boolean;
}

export const TermsAndConditionsModal: React.FC<TermsAndConditionsModalProps> = ({
  visible,
  onClose,
  onAccept,
  isOnboarding = false,
}) => {
  const [hasScrolledToEnd, setHasScrolledToEnd] = React.useState(!isOnboarding);
  const scrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    if (visible && isOnboarding) {
      setHasScrolledToEnd(false);
    }
  }, [visible, isOnboarding]);

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 28) {
      setHasScrolledToEnd(true);
    }
  };

  const handleScrollToBottom = () => {
    scrollRef.current?.scrollToEnd({ animated: true });
    setHasScrolledToEnd(true);
  };

  const handleAccept = async () => {
    try {
      await AsyncStorage.setItem(TERMS_STORAGE_KEY, APP_VERSION);
    } catch {
      // Ignorar fallos no críticos de persistencia local
    }
    if (onAccept) {
      onAccept();
    } else {
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={isOnboarding ? () => {} : onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.cardContainer}>
          {/* Remaches góticos superiores */}
          <View style={styles.rivetRow}>
            <View style={styles.rivet} />
            <View style={styles.rivet} />
          </View>

          {/* Cabecera Medieval */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <MaterialCommunityIcons
                name="shield-crown"
                size={24}
                color={THEME.colors.oroClaro}
              />
              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle}>Términos y Condiciones</Text>
                <Text style={styles.headerSubtitle}>
                  Mu Manager PRO • v{APP_VERSION} Oficial
                </Text>
              </View>
            </View>

            {!isOnboarding && (
              <TouchableOpacity
                onPress={onClose}
                style={styles.closeBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={20}
                  color={THEME.colors.textoSecundario}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Badge informativo Season 6 */}
          <View style={styles.badgeBanner}>
            <MaterialCommunityIcons
              name="certificate-outline"
              size={16}
              color={THEME.colors.jade}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.badgeBannerText}>
              Acuerdo de Licencia de Usuario y Política de Seguridad T-SQL
            </Text>
          </View>

          {/* Contenido Desplazable de Artículos */}
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
            scrollEventThrottle={16}
            onScroll={handleScroll}
          >
            {/* Artículo 1 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons
                  name="shield-account-variant-outline"
                  size={18}
                  color={THEME.colors.oroClaro}
                />
                <Text style={styles.sectionNumber}>1.</Text>
                <Text style={styles.sectionTitle}>Ámbito de Uso Administrativo</Text>
              </View>
              <Text style={styles.sectionBody}>
                Mu Manager PRO está destinado exclusivamente para la gestión, mantenimiento,
                auditoría y administración técnica de servidores de juegos MU Online (Season 6
                Louis, MSPro y derivados) bajo la titularidad o autorización expresa del operador.
                El uso para fines no autorizados, manipulación ilícita o intrusión en infraestructuras
                ajenas queda estrictamente desautorizado.
              </Text>
            </View>

            {/* Artículo 2 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons
                  name="key-chain"
                  size={18}
                  color={THEME.colors.oroClaro}
                />
                <Text style={styles.sectionNumber}>2.</Text>
                <Text style={styles.sectionTitle}>Licenciamiento y Propiedad</Text>
              </View>
              <Text style={styles.sectionBody}>
                El software y su arquitectura de puente son propiedad intelectual de ToolForg3.
                Cada clave de activación PRO emitida es personal, intransferible y queda vinculada
                criptográficamente al identificador de hardware (HWID) del dispositivo. Queda prohibida
                la redistribución no autorizada, descompilación, ingeniería inversa o elusión de las
                capas de protección criptográfica del aplicativo.
              </Text>
            </View>

            {/* Artículo 3 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons
                  name="database-lock"
                  size={18}
                  color={THEME.colors.oroClaro}
                />
                <Text style={styles.sectionNumber}>3.</Text>
                <Text style={styles.sectionTitle}>Conexión SQL Server y Responsabilidad</Text>
              </View>
              <Text style={styles.sectionBody}>
                Las conexiones a Microsoft SQL Server se efectúan en forma directa y encriptada
                hacia el conector o servidor configurado por el usuario. El administrador asume la
                responsabilidad íntegra sobre la custodia de sus credenciales (usuario 'sa' o delegado),
                las operaciones transaccionales ejecutadas en la base de datos y el mantenimiento regular
                de copias de respaldo (Backups de MuOnline y Me_MuOnline).
              </Text>
            </View>

            {/* Artículo 4 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={18}
                  color={THEME.colors.jade}
                />
                <Text style={styles.sectionNumber}>4.</Text>
                <Text style={styles.sectionTitle}>Privacidad, Telemetría y Cero Retención</Text>
              </View>
              <Text style={styles.sectionBody}>
                Mu Manager PRO garantiza el principio de cero retención de datos privados de tus
                jugadores: no recopila, almacena ni comparte con terceros contraseñas, inventarios ni
                registros de tu comunidad. La telemetría se limita estrictamente a pings de diagnóstico
                del estado de la licencia PRO, versión instalada y mitigación de amenazas de alteración
                en tiempo de ejecución.
              </Text>
            </View>

            {/* Artículo 5 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MaterialCommunityIcons
                  name="handshake-outline"
                  size={18}
                  color={THEME.colors.oroClaro}
                />
                <Text style={styles.sectionNumber}>5.</Text>
                <Text style={styles.sectionTitle}>Aceptación y Continuidad</Text>
              </View>
              <Text style={styles.sectionBody}>
                El uso del aplicativo implica la comprensión y conformidad absoluta con estos
                términos. Si en algún momento no estás de acuerdo con alguna de las cláusulas,
                debes suspender el uso de la aplicación y eliminarla de tu dispositivo.
              </Text>
            </View>

            {/* Distintivo de Fin de Lectura */}
            <View style={styles.documentEndBadge}>
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={16}
                color={THEME.colors.jade}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.documentEndText}>
                Has revisado la totalidad de los Términos y Condiciones Oficiales
              </Text>
            </View>
          </ScrollView>

          {/* Barra de Remaches Inferior */}
          <View style={styles.rivetRowBottom}>
            <View style={styles.rivet} />
            <View style={styles.rivet} />
          </View>

          {/* Acciones de Pie */}
          <View style={styles.footerActions}>
            {isOnboarding ? (
              <View style={styles.onboardingActionsCol}>
                {!hasScrolledToEnd ? (
                  <TouchableOpacity
                    style={styles.scrollDownIndicatorBtn}
                    onPress={handleScrollToBottom}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="chevron-double-down"
                      size={18}
                      color={THEME.colors.oroClaro}
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.scrollDownIndicatorText}>
                      Desliza hasta el final para aceptar
                    </Text>
                    <MaterialCommunityIcons
                      name="chevron-double-down"
                      size={18}
                      color={THEME.colors.oroClaro}
                      style={{ marginLeft: 6 }}
                    />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.primaryAcceptBtn}
                    onPress={handleAccept}
                    activeOpacity={0.8}
                  >
                    <MaterialCommunityIcons
                      name="shield-check"
                      size={20}
                      color="#100D0B"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.primaryAcceptBtnText}>
                      Aceptar y Continuar
                    </Text>
                  </TouchableOpacity>
                )}
                <Text style={styles.footerHelpText}>
                  {hasScrolledToEnd
                    ? 'Al continuar, declaras ser administrador autorizado del servidor.'
                    : 'Desplaza el documento para revisar todas las cláusulas.'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.secondaryCloseBtn}
                onPress={handleAccept}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name="check-bold"
                  size={18}
                  color={THEME.colors.oroClaro}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.secondaryCloseBtnText}>
                  Entendido y Aceptado
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const windowHeight = Dimensions.get('window').height;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(10, 8, 7, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 520,
    height: Math.min(640, windowHeight * 0.82),
    backgroundColor: THEME.colors.fondo,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: THEME.colors.borde,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'hidden',
  },
  rivetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  rivetRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 4,
  },
  rivet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: THEME.colors.oro,
    borderWidth: 1,
    borderColor: '#0A0807',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTextCol: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#E8C86A',
    letterSpacing: 0.4,
    ...THEME.effects.textShadow,
  },
  headerSubtitle: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(63, 207, 142, 0.25)',
  },
  badgeBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.texto,
    flex: 1,
  },
  scrollView: {
    flex: 1,
    backgroundColor: THEME.colors.superficieFin,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  sectionBox: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 12,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 6,
  },
  sectionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.oroClaro,
    ...THEME.effects.textShadow,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.oroClaro,
    flex: 1,
    ...THEME.effects.textShadow,
  },
  sectionBody: {
    fontSize: 13,
    lineHeight: 19,
    color: THEME.colors.textoSecundarioLuminoso,
    ...THEME.effects.textShadowSubtle,
  },
  footerActions: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
    backgroundColor: THEME.colors.fondo,
  },
  onboardingActionsCol: {
    width: '100%',
    alignItems: 'center',
  },
  documentEndBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(63, 207, 142, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(63, 207, 142, 0.3)',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 6,
    marginBottom: 10,
  },
  documentEndText: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.jade,
    textAlign: 'center',
  },
  scrollDownIndicatorBtn: {
    width: '100%',
    backgroundColor: 'rgba(232, 200, 106, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.oroClaro,
    paddingVertical: 12,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollDownIndicatorText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.3,
    ...THEME.effects.textShadowSubtle,
  },
  primaryAcceptBtn: {
    width: '100%',
    backgroundColor: THEME.colors.oroClaro,
    paddingVertical: 13,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryAcceptBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#100D0B',
    letterSpacing: 0.3,
  },
  footerHelpText: {
    fontSize: 11,
    color: THEME.colors.textoSecundarioLuminoso,
    textAlign: 'center',
    marginTop: 8,
    ...THEME.effects.textShadowSubtle,
  },
  secondaryCloseBtn: {
    width: '100%',
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.bordeBrillante,
    paddingVertical: 11,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryCloseBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.colors.oroClaro,
    ...THEME.effects.textShadowSubtle,
  },
});
