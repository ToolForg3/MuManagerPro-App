import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { MuIcon } from '../ui/MuIcon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { APP_VERSION } from '../../constants/appVersion';
import { Panel } from '../ui/Panel';
import { MuCornerOrnaments } from '../ui/MuCornerOrnaments';

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
        <Panel variant="box" style={styles.cardContainer}>
          <MuCornerOrnaments size={12} />
          {/* Cabecera Medieval */}
          <View style={styles.header}>
            <View style={styles.headerTitleGroup}>
              <MuIcon
                name="crown"
                size={24}
              />
              <View style={styles.headerTextCol}>
                <Text style={styles.headerTitle}>Términos y Condiciones</Text>
                <Text style={styles.headerSubtitle}>
                  Mu Manager PRO • v{APP_VERSION}
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
                <MuIcon
                  name="close"
                  size={20}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Badge informativo Season 6 */}
          <View style={styles.badgeBanner}>
            <MuIcon
              name="check"
              size={16}
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
                <MuIcon
                  name="user"
                  size={18}
                />
                <Text style={styles.sectionNumber}>1.</Text>
                <Text style={styles.sectionTitle}>Ámbito de Uso Administrativo</Text>
              </View>
              <Text style={styles.sectionBody}>
                Mu Manager PRO está destinado exclusivamente para la gestión, mantenimiento,
                auditoría y administración técnica de servidores de juegos MU Online (Season 6
                Louis, MSPro y derivados) bajo la titularidad o autorización expresa del operador.
                El software opera como un cliente de base de datos relacional T-SQL y NO incluye, no aloja ni
                distribuye binarios del juego (Main.exe) ni archivos de servidor (GameServer.exe).
                El uso para fines no autorizados, manipulación ilícita o intrusión en infraestructuras
                ajenas queda estrictamente desautorizado.
              </Text>
            </View>

            {/* Artículo 2 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MuIcon
                  name="lock"
                  size={18}
                />
                <Text style={styles.sectionNumber}>2.</Text>
                <Text style={styles.sectionTitle}>Licenciamiento y Propiedad</Text>
              </View>
              <Text style={styles.sectionBody}>
                El software y su arquitectura de puente son propiedad intelectual de ToolForg3.
                Cada clave de activación PRO emitida es personal, intransferible y queda vinculada
                criptográficamente al identificador de hardware (HWID) del dispositivo. Al tratarse
                de bienes digitales activados de forma inmediata por HWID, se extingue el derecho de desistimiento
                (ventas finales sin reembolso). Queda prohibida la redistribución no autorizada, descompilación,
                ingeniería inversa o elusión de las capas de protección criptográfica del aplicativo.
                ToolForg3 se reserva la revocación unilateral (Kill-Switch) ante piratería o manipulación.
              </Text>
            </View>

            {/* Artículo 3 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MuIcon
                  name="tools"
                  size={18}
                />
                <Text style={styles.sectionNumber}>3.</Text>
                <Text style={styles.sectionTitle}>Conexión SQL Server y Responsabilidad</Text>
              </View>
              <Text style={styles.sectionBody}>
                Las conexiones a Microsoft SQL Server se efectúan en forma directa y encriptada
                hacia el conector o servidor configurado por el usuario. El administrador asume la
                responsabilidad íntegra sobre la custodia de sus credenciales (usuario 'sa' o delegado),
                las operaciones transaccionales ejecutadas en la base de datos y el mantenimiento regular
                de copias de respaldo (Backups de MuOnline y Me_MuOnline). El operador reconoce que es el
                único y exclusivo responsable de salvaguardar copias de seguridad íntegras antes de editar.
              </Text>
            </View>

            {/* Artículo 4 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MuIcon
                  name="check"
                  size={18}
                />
                <Text style={styles.sectionNumber}>4.</Text>
                <Text style={styles.sectionTitle}>Privacidad, Telemetría y Cero Retención</Text>
              </View>
              <Text style={styles.sectionBody}>
                Mu Manager PRO garantiza el principio de cero retención de datos privados de tus
                jugadores: no recopila, almacena ni comparte con terceros contraseñas, inventarios ni
                registros de tu comunidad. Las contraseñas SQL locales se resguardan cifradas en tu
                dispositivo mediante SecureStorage (AES-256-CBC). La telemetría se limita estrictamente a pings
                de diagnóstico del estado de la licencia PRO, versión instalada y mitigación de amenazas de
                alteración en tiempo de ejecución. Ejerce derechos ARCO en mumanagerpro@gmail.com.
              </Text>
            </View>

            {/* Artículo 5 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MuIcon
                  name="community"
                  size={18}
                />
                <Text style={styles.sectionNumber}>5.</Text>
                <Text style={styles.sectionTitle}>Aceptación y Continuidad</Text>
              </View>
              <Text style={styles.sectionBody}>
                El uso del aplicativo implica la comprensión y conformidad absoluta con estos
                términos. Las partes renuncian expresamente a acciones colectivas (Class Action Waiver),
                acordando resolver controversias de forma individual y mediante mediación previa de buena fe.
                Si en algún momento no estás de acuerdo con alguna de las cláusulas, debes suspender el uso
                de la aplicación y eliminarla de tu dispositivo.
              </Text>
            </View>

            {/* Artículo 6 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MuIcon
                  name="shield"
                  size={18}
                />
                <Text style={styles.sectionNumber}>6.</Text>
                <Text style={styles.sectionTitle}>Deslinde de Marcas y Propiedad Intelectual</Text>
              </View>
              <Text style={styles.sectionBody}>
                "MU" y "MU Online" son marcas comerciales registradas de Webzen Inc. Mu Manager PRO y
                ToolForg3 no poseen afiliación, patrocinio ni asociación con Webzen Inc. La mención de
                razas, mapas y temporadas se ampara bajo la doctrina de Uso Nominativo Legítimo (Nominative
                Fair Use) para identificar compatibilidad técnica con esquemas de bases de datos.
              </Text>
            </View>

            {/* Artículo 7 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MuIcon
                  name="tune"
                  size={18}
                />
                <Text style={styles.sectionNumber}>7.</Text>
                <Text style={styles.sectionTitle}>Exclusión de Garantías y Límite de Daños</Text>
              </View>
              <Text style={styles.sectionBody}>
                El software se entrega "TAL CUAL" ("AS IS") y "SEGÚN DISPONIBILIDAD", sin garantías explícitas
                o implícitas de infalibilidad. ToolForg3 no responderá por lucro cesante, caída de servidores,
                corrupción de datos o reclamos de terceros. La responsabilidad máxima acumulada se limita al
                monto efectivamente pagado por la licencia en los últimos 30 días o $0.00 USD en modo demo.
              </Text>
            </View>

            {/* Artículo 8 */}
            <View style={styles.sectionBox}>
              <View style={styles.sectionHeaderRow}>
                <MuIcon
                  name="storage"
                  size={18}
                />
                <Text style={styles.sectionNumber}>8.</Text>
                <Text style={styles.sectionTitle}>Obligación de Backups y Política DMCA</Text>
              </View>
              <Text style={styles.sectionBody}>
                El operador asume el 100% de la responsabilidad sobre sus respaldos de base de datos. En
                cumplimiento con 17 U.S.C. § 512 (DMCA), cualquier aviso formal de derechos de autor debe
                dirigirse a nuestro Agente Designado en mumanagerpro@gmail.com con los requisitos de ley.
              </Text>
            </View>

            {/* Distintivo de Fin de Lectura */}
            <View style={styles.documentEndBadge}>
              <MuIcon
                name="check"
                size={16}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.documentEndText}>
                Has revisado la totalidad de los Términos y Condiciones Oficiales
              </Text>
            </View>
          </ScrollView>

          {/* Acciones de Pie */}
          <View style={styles.footerActions}>
            {isOnboarding ? (
              <View style={styles.onboardingActionsCol}>
                {!hasScrolledToEnd ? (
                  <TouchableOpacity
                    style={{ width: '100%', borderRadius: 2, overflow: 'hidden' }}
                    onPress={handleScrollToBottom}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Deslizar hasta el final para aceptar"
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.scrollDownIndicatorBtn}
                      resizeMode="stretch"
                    >
                      <MuIcon
                        name="arrow-down"
                        size={18}
                        color="#E0C380"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.scrollDownIndicatorText}>
                        Desliza hasta el final para aceptar
                      </Text>
                      <MuIcon
                        name="arrow-down"
                        size={18}
                        color="#E0C380"
                        style={{ marginLeft: 6 }}
                      />
                    </ImageBackground>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={{ width: '100%', borderRadius: 2, overflow: 'hidden', minHeight: 48 }}
                    onPress={handleAccept}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="Aceptar y Continuar"
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeActive}
                      style={styles.primaryAcceptBtn}
                      resizeMode="stretch"
                    >
                      <MuIcon
                        name="check"
                        size={18}
                        color="#FEDF99"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={styles.primaryAcceptBtnText}>
                        ACEPTAR Y CONTINUAR
                      </Text>
                    </ImageBackground>
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
                style={{ width: '100%', borderRadius: 2, overflow: 'hidden', minHeight: 48 }}
                onPress={handleAccept}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Entendido y Aceptado"
              >
                <ImageBackground
                  source={STITCH_ASSETS.tabs.tabModeActive}
                  style={styles.secondaryCloseBtn}
                  resizeMode="stretch"
                >
                  <MuIcon
                    name="check"
                    size={18}
                    color="#FEDF99"
                    style={{ marginRight: 6 }}
                  />
                  <Text style={styles.secondaryCloseBtnText}>
                    ENTENDIDO Y ACEPTADO
                  </Text>
                </ImageBackground>
              </TouchableOpacity>
            )}
          </View>
        </Panel>
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'hidden',
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
    color: '#E0C380',
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
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
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
    backgroundColor: 'transparent',
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  sectionBox: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
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
    backgroundColor: 'transparent',
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
    borderRadius: THEME.shapes.radioEsquina,
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
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollDownIndicatorText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#E0C380',
    letterSpacing: 0.3,
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadowSubtle,
  },
  primaryAcceptBtn: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryAcceptBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FEDF99',
    letterSpacing: 0.6,
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadowHigh,
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
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  secondaryCloseBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FEDF99',
    letterSpacing: 0.6,
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadowHigh,
  },
});
