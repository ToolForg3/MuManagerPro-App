import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  Alert as RNAlert,
  BackHandler,
  Pressable,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';

export type GothicAlertType = 'info' | 'success' | 'warning' | 'error' | 'confirm';

export interface GothicAlertButton {
  text: string;
  onPress?: () => void | Promise<void>;
  style?: 'default' | 'cancel' | 'destructive';
  variant?: 'gold' | 'brasa' | 'stone' | 'jade';
  accessibilityLabel?: string;
}

export interface GothicAlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  type?: GothicAlertType;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  subtitle?: string;
  badge?: string;
}

export interface GothicAlertData {
  id: string;
  title: string;
  message?: string;
  buttons: GothicAlertButton[];
  options: GothicAlertOptions;
  type: GothicAlertType;
  createdAt: number;
}

/**
 * Singleton Manager para gestionar la cola de alertas y permitir su invocación
 * imperativa desde cualquier pantalla, componente o servicio del sistema.
 */
class GothicAlertManager {
  private queue: GothicAlertData[] = [];
  private currentAlert: GothicAlertData | null = null;
  private listeners = new Set<(alert: GothicAlertData | null) => void>();
  private activeCallbackExecuted = false;

  public subscribe(listener: (alert: GothicAlertData | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentAlert);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentAlert);
      } catch (err) {
        console.error('[GothicAlertManager] Error notifying listener:', err);
      }
    });
  }

  /**
   * Infiere inteligentemente el tipo de alerta según título, mensaje y estilos de botones.
   */
  private inferType(
    title: string,
    message?: string,
    buttons?: GothicAlertButton[],
    explicitType?: GothicAlertType
  ): GothicAlertType {
    if (explicitType) return explicitType;

    const t = (title || '').toLowerCase();
    const m = (message || '').toLowerCase();

    // Comprobar si hay botón destructivo
    if (buttons && buttons.some((b) => b.style === 'destructive')) {
      return 'error';
    }

    // Comprobar palabras clave de error
    if (
      t.includes('error') ||
      t.includes('falló') ||
      t.includes('fallo') ||
      t.includes('bloquead') ||
      t.includes('peligro') ||
      t.includes('rechazad') ||
      t.includes('revocad') ||
      t.includes('expirad') ||
      t.includes('vencid')
    ) {
      return 'error';
    }

    // Comprobar palabras clave de éxito
    if (
      t.includes('éxito') ||
      t.includes('exito') ||
      t.includes('activad') ||
      t.includes('guardad') ||
      t.includes('correct') ||
      t.includes('actualizad') ||
      t.includes('restablecid') ||
      t.includes('completad') ||
      t.includes('¡excelente') ||
      t.includes('🎉')
    ) {
      return 'success';
    }

    // Comprobar palabras clave de advertencia
    if (
      t.includes('advertencia') ||
      t.includes('aviso') ||
      t.includes('atención') ||
      t.includes('atencion') ||
      t.includes('cuidado') ||
      t.includes('requerid') ||
      t.includes('inválid') ||
      t.includes('invalid') ||
      t.includes('consumid')
    ) {
      return 'warning';
    }

    // Comprobar confirmación
    if (
      (buttons && buttons.length > 1 && buttons.some((b) => b.style === 'cancel')) ||
      t.includes('confirm') ||
      t.includes('¿') ||
      t.includes('desea')
    ) {
      return 'confirm';
    }

    return 'info';
  }

  /**
   * Dispara una alerta oficial Season 6. Firma compatible 100% con Alert.alert de React Native.
   */
  public alert(
    title: string,
    message?: string,
    buttons?: GothicAlertButton[],
    options?: GothicAlertOptions,
    typeOverride?: GothicAlertType
  ): void {
    const normalizedButtons: GothicAlertButton[] =
      buttons && buttons.length > 0
        ? buttons
        : [{ text: 'Entendido', style: 'default' }];

    const opts = options || {};
    const alertType = this.inferType(title, message, normalizedButtons, opts.type || typeOverride);

    const alertItem: GothicAlertData = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: title || 'Aviso del Sistema',
      message: message || '',
      buttons: normalizedButtons,
      options: opts,
      type: alertType,
      createdAt: Date.now(),
    };

    if (this.currentAlert === null) {
      this.currentAlert = alertItem;
      this.activeCallbackExecuted = false;
      this.notify();
    } else {
      // Cola para avisos consecutivos (previene superposiciones y pérdidas de eventos)
      this.queue.push(alertItem);
    }
  }

  /**
   * Cierra la alerta actual y procesa la siguiente en cola si existe.
   */
  public dismissCurrent(button?: GothicAlertButton): void {
    if (this.activeCallbackExecuted) return;
    this.activeCallbackExecuted = true;

    const current = this.currentAlert;
    const callback = button?.onPress;

    this.currentAlert = null;
    this.notify();

    if (callback) {
      try {
        callback();
      } catch (err) {
        console.error('[GothicAlertManager] Error executing button onPress callback:', err);
      }
    } else if (!button && current?.options?.onDismiss) {
      try {
        current.options.onDismiss();
      } catch (err) {
        console.error('[GothicAlertManager] Error executing onDismiss callback:', err);
      }
    }

    // Avanzar la cola si hay avisos pendientes
    if (this.queue.length > 0) {
      setTimeout(() => {
        const next = this.queue.shift() || null;
        this.currentAlert = next;
        this.activeCallbackExecuted = false;
        this.notify();
      }, 120);
    }
  }

  public dismiss(): void {
    if (this.currentAlert) {
      const cancelBtn = this.currentAlert.buttons.find((b) => b.style === 'cancel');
      this.dismissCurrent(cancelBtn);
    }
  }

  public getCurrentAlert(): GothicAlertData | null {
    return this.currentAlert;
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public clearQueue(): void {
    this.queue = [];
  }
}

// Instancia única exportada
export const gothicAlertManager = new GothicAlertManager();

/**
 * API Global GothicAlert y helper de conveniencia para sustituir `Alert.alert`
 */
export const GothicAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: GothicAlertButton[],
    options?: GothicAlertOptions,
    typeOverride?: GothicAlertType
  ) => {
    gothicAlertManager.alert(title, message, buttons, options, typeOverride);
  },

  success: (title: string, message?: string, buttons?: GothicAlertButton[], options?: GothicAlertOptions) => {
    gothicAlertManager.alert(title, message, buttons, options, 'success');
  },

  error: (title: string, message?: string, buttons?: GothicAlertButton[], options?: GothicAlertOptions) => {
    gothicAlertManager.alert(title, message, buttons, options, 'error');
  },

  warning: (title: string, message?: string, buttons?: GothicAlertButton[], options?: GothicAlertOptions) => {
    gothicAlertManager.alert(title, message, buttons, options, 'warning');
  },

  info: (title: string, message?: string, buttons?: GothicAlertButton[], options?: GothicAlertOptions) => {
    gothicAlertManager.alert(title, message, buttons, options, 'info');
  },

  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmText: string = 'Confirmar',
    cancelText: string = 'Cancelar'
  ) => {
    gothicAlertManager.alert(
      title,
      message,
      [
        { text: cancelText, style: 'cancel', onPress: onCancel },
        { text: confirmText, style: 'default', onPress: onConfirm },
      ],
      undefined,
      'confirm'
    );
  },

  dismiss: () => {
    gothicAlertManager.dismiss();
  },

  /**
   * Instala interceptor global como red de seguridad para llamadas de librerías o código heredado
   */
  installGlobal: () => {
    try {
      (RNAlert as any).alert = GothicAlert.alert;
    } catch (_) {}
  },
};

/**
 * Configuración visual por variante oficial Season 6 (Piedra y Oro)
 */
const VARIANT_CONFIG: Record<
  GothicAlertType,
  {
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    color: string;
    badgeText: string;
    borderColor: string;
    glowBg: string;
  }
> = {
  success: {
    icon: 'shield-check',
    color: THEME.colors.jade,
    badgeText: 'ÉXITO',
    borderColor: 'rgba(63, 207, 142, 0.7)',
    glowBg: 'rgba(63, 207, 142, 0.12)',
  },
  error: {
    icon: 'shield-alert',
    color: THEME.colors.brasa,
    badgeText: 'ATENCIÓN / ERROR',
    borderColor: 'rgba(226, 112, 58, 0.8)',
    glowBg: 'rgba(226, 112, 58, 0.14)',
  },
  warning: {
    icon: 'alert-decagram',
    color: THEME.colors.oroClaro,
    badgeText: 'ADVERTENCIA',
    borderColor: 'rgba(232, 200, 106, 0.8)',
    glowBg: 'rgba(232, 200, 106, 0.12)',
  },
  confirm: {
    icon: 'shield-sword',
    color: THEME.colors.oroClaro,
    badgeText: 'CONFIRMACIÓN',
    borderColor: THEME.colors.bordeBrillante,
    glowBg: 'rgba(232, 200, 106, 0.10)',
  },
  info: {
    icon: 'shield-crown',
    color: THEME.colors.oroClaro,
    badgeText: 'INFORMACIÓN',
    borderColor: THEME.colors.borde,
    glowBg: 'rgba(232, 200, 106, 0.08)',
  },
};

/**
 * Componente contenedor visual de alertas góticas. Se monta a nivel raíz en App.tsx.
 */
export const GothicAlertContainer: React.FC = () => {
  const [alert, setAlert] = useState<GothicAlertData | null>(null);

  useEffect(() => {
    const unsubscribe = gothicAlertManager.subscribe(setAlert);
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!alert) return;

    // Manejar botón Atrás en Android
    const onBackPress = () => {
      const cancelable = alert.options?.cancelable;
      const hasCancelBtn = alert.buttons.some((b) => b.style === 'cancel');

      if (cancelable || hasCancelBtn) {
        const cancelBtn = alert.buttons.find((b) => b.style === 'cancel');
        gothicAlertManager.dismissCurrent(cancelBtn);
        return true;
      }
      // Si no es cancelable, consume el evento y no cierra
      return true;
    };

    const backSub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backSub.remove();
  }, [alert]);

  if (!alert) return null;

  const config = VARIANT_CONFIG[alert.type] || VARIANT_CONFIG.info;
  const iconName = alert.options.icon || config.icon;
  const badgeText = alert.options.badge || config.badgeText;
  const subtitle = alert.options.subtitle;

  const handleBackdropPress = () => {
    const cancelable = alert.options?.cancelable;
    const hasCancelBtn = alert.buttons.some((b) => b.style === 'cancel');

    if (cancelable || hasCancelBtn) {
      const cancelBtn = alert.buttons.find((b) => b.style === 'cancel');
      gothicAlertManager.dismissCurrent(cancelBtn);
    }
  };

  const handleButtonPress = (btn: GothicAlertButton) => {
    gothicAlertManager.dismissCurrent(btn);
  };

  // Determinar disposición de botones (horizontal para 2 botones cortos, vertical si son 3+ o largos)
  const isTwoButtons = alert.buttons.length === 2;
  const areButtonsShort =
    isTwoButtons &&
    alert.buttons.every((b) => (b.text || '').length <= 15);
  const layoutHorizontal = isTwoButtons && areButtonsShort;

  return (
    <Modal
      transparent={true}
      visible={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleBackdropPress}
    >
      <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
        <Pressable
          style={[styles.cardContainer, { borderColor: config.borderColor }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Remaches góticos superiores */}
          <View style={styles.rivetRow}>
            <View style={styles.rivet} />
            <View style={styles.rivet} />
          </View>

          {/* Cabecera gótica Season 6 */}
          <View style={[styles.header, { backgroundColor: config.glowBg }]}>
            <View style={[styles.iconBox, { borderColor: config.color }]}>
              <MaterialCommunityIcons name={iconName} size={26} color={config.color} />
            </View>
            <View style={styles.headerTextCol}>
              <View style={styles.badgeRow}>
                <Text style={[styles.badgeText, { color: config.color }]}>
                  {badgeText}
                </Text>
              </View>
              <Text
                style={styles.headerTitle}
                numberOfLines={3}
                ellipsizeMode="tail"
                accessibilityRole="header"
              >
                {alert.title}
              </Text>
              {subtitle ? (
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              ) : null}
            </View>
          </View>

          {/* Divisor ornamental de piedra */}
          <View style={styles.ornamentalDivider} />

          {/* Cuerpo desplazable con ScrollView anidado */}
          <View style={styles.bodyWrapper}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              {alert.message ? (
                <Text
                  style={styles.messageText}
                  selectable={true}
                  accessibilityLabel={alert.message}
                >
                  {alert.message}
                </Text>
              ) : null}
            </ScrollView>
          </View>

          {/* Contenedor de Botones Accesibles (minHeight: 44, alto contraste) */}
          <View
            style={[
              styles.buttonContainer,
              layoutHorizontal ? styles.buttonRow : styles.buttonCol,
            ]}
          >
            {alert.buttons.map((btn, index) => {
              const isCancel = btn.style === 'cancel';
              const isDestructive = btn.style === 'destructive';
              const isPrimary = !isCancel && !isDestructive && (btn.variant === 'gold' || index === 0);

              let btnStyle = styles.btnSecondary;
              let btnTextStyle = styles.btnTextSecondary;

              if (btn.variant === 'jade') {
                btnStyle = styles.btnJade;
                btnTextStyle = styles.btnTextDark;
              } else if (isDestructive || btn.variant === 'brasa') {
                btnStyle = styles.btnDestructive;
                btnTextStyle = styles.btnTextDark;
              } else if (isPrimary || btn.variant === 'gold') {
                btnStyle = styles.btnPrimary;
                btnTextStyle = styles.btnTextDark;
              } else if (isCancel) {
                btnStyle = styles.btnCancel;
                btnTextStyle = styles.btnTextCancel;
              }

              return (
                <TouchableOpacity
                  key={`btn_${index}_${btn.text}`}
                  style={[styles.btnBase, btnStyle, layoutHorizontal && styles.btnFlex]}
                  onPress={() => handleButtonPress(btn)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={btn.accessibilityLabel || btn.text}
                >
                  <Text
                    style={[styles.btnTextBase, btnTextStyle]}
                    numberOfLines={2}
                    ellipsizeMode="tail"
                  >
                    {btn.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Remaches góticos inferiores */}
          <View style={styles.rivetRowBottom}>
            <View style={styles.rivet} />
            <View style={styles.rivet} />
          </View>
        </Pressable>
      </Pressable>
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
    paddingVertical: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    backgroundColor: THEME.colors.superficie, // #2B2521
    borderRadius: 6,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.7,
    shadowRadius: 12,
    elevation: 16,
    overflow: 'hidden',
  },
  rivetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
    backgroundColor: THEME.colors.fondo,
  },
  rivetRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingBottom: 6,
    paddingTop: 2,
    backgroundColor: THEME.colors.fondo,
  },
  rivet: {
    width: 6,
    height: 6,
    borderRadius: 3, /* círculo funcional (width/2): remache gótico */
    backgroundColor: THEME.colors.oro,
    borderWidth: 1,
    borderColor: '#0A0807',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22, /* círculo funcional (width/2): avatar de icono del aviso */
    backgroundColor: THEME.colors.fondo,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTextCol: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: '700',
    color: THEME.colors.texto, // #FAF6EE (14.02:1 AAA)
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundario, // #C8BEAF
    marginTop: 2,
  },
  ornamentalDivider: {
    height: 1,
    backgroundColor: THEME.colors.borde,
  },
  bodyWrapper: {
    maxHeight: Math.min(360, windowHeight * 0.55),
    backgroundColor: THEME.colors.fondo, // #191512
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 21,
    color: THEME.colors.textoSecundario, // #C8BEAF (8.23:1 AAA)
    letterSpacing: 0.2,
  },
  buttonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: THEME.colors.superficie, // #2B2521
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  buttonCol: {
    flexDirection: 'column',
    gap: 8,
  },
  btnBase: {
    minHeight: 44, // WCAG AAA Touch Target
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnFlex: {
    flex: 1,
  },
  btnPrimary: {
    backgroundColor: THEME.colors.oroClaro, // #E8C86A
    borderWidth: 1,
    borderColor: THEME.colors.oro,
    shadowColor: THEME.colors.oro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  btnDestructive: {
    backgroundColor: THEME.colors.brasa, // #E2703A
    borderWidth: 1,
    borderColor: '#B84514',
    shadowColor: THEME.colors.brasa,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  btnJade: {
    backgroundColor: THEME.colors.jade, // #3FCF8E
    borderWidth: 1,
    borderColor: '#2DA873',
    shadowColor: THEME.colors.jade,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 2,
  },
  btnSecondary: {
    backgroundColor: THEME.colors.fondo, // #191512
    borderWidth: 1,
    borderColor: THEME.colors.bordeBrillante, // #A8894D
  },
  btnCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: THEME.colors.borde, // #6B5533
  },
  btnTextBase: {
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  btnTextDark: {
    color: THEME.colors.textoOscuro, // #100D0B (WCAG AAA >= 7:1 en oro y jade; 6.10:1 en brasa)
    fontSize: 14.5,
  },
  btnTextSecondary: {
    color: THEME.colors.oroClaro, // #E8C86A
    fontSize: 14,
  },
  btnTextCancel: {
    color: THEME.colors.textoSecundario, // #C8BEAF
    fontSize: 14,
  },
});
