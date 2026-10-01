import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { THEME } from '../constants/theme';
import { STITCH_ASSETS } from '../constants/stitchAssets';
import { MuCornerOrnaments } from './ui/MuCornerOrnaments';
import { MuButton } from './ui/MuButton';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  onGoHome?: () => void;
  tabName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      copied: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary] Caught error in ${this.props.tabName || 'Component'}:`, error, errorInfo);
  }

  handleReset = () => {
    if (this.props.onReset) {
      try {
        this.props.onReset();
      } catch (e) {
        console.error('[ErrorBoundary] onReset error:', e);
      }
    }
    this.setState({
      hasError: false,
      error: null,
      copied: false,
    });
  };

  handleCopyError = async (errCode: string, safeMsg: string) => {
    const errorDetails = `[MU MANAGER PRO - ERROR EN LA APLICACIÓN]\nCódigo: ${errCode}\nMódulo: ${this.props.tabName || 'General'}\nDetalle: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || safeMsg}\nStack: ${this.state.error?.stack || 'No disponible'}`;
    await Clipboard.setStringAsync(errorDetails);
    this.setState({ copied: true });
    setTimeout(() => {
      this.setState({ copied: false });
    }, 2500);
  };

  handleGoHome = () => {
    if (this.props.onGoHome) {
      this.props.onGoHome();
    } else {
      this.handleReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || 'ERROR EN LA APLICACIÓN';
      const errCode = 'ERR_UI_' + Math.abs(
        (this.state.error?.message || 'GENERIC')
          .split('')
          .reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) | 0, 0)
      ).toString(16).toUpperCase();
      const safeMsg = this.props.fallbackMessage || 'La pantalla no pudo renderizarse correctamente.';

      return (
        <View style={styles.container}>
          {/* Contenedor Gótico Stitch 12 */}
          <View style={styles.panelBox}>
            <MuCornerOrnaments size={12} />

            {/* Cabecera de Estado con Icono Canónico de Alerta */}
            <View style={styles.headerRow}>
              <Image
                source={STITCH_ASSETS.sprites.security}
                style={styles.headerIcon}
                resizeMode="contain"
              />
              <Text style={styles.headerTitle}>{title}</Text>
              <Image
                source={STITCH_ASSETS.sprites.security}
                style={styles.headerIcon}
                resizeMode="contain"
              />
            </View>

            <Text style={styles.headerSubtitle}>
              La pantalla no pudo renderizarse correctamente
            </Text>

            {/* Cuadro de Registro Técnico Dinámico */}
            <View style={styles.technicalBox}>
              <Text style={styles.errorHighlightText} numberOfLines={2}>
                [{this.state.error?.name || 'Error'}] : [{this.state.error?.message || safeMsg}]
              </Text>
              <Text style={styles.trackingCodeText}>
                Código de auditoría: [{errCode}] · Módulo: [{this.props.tabName || 'General'}]
              </Text>
            </View>

            {/* Separador Ornamental Dorado NewUI */}
            <Image
              source={STITCH_ASSETS.decorations.goldDividerLine}
              style={styles.dividerImg}
              resizeMode="stretch"
            />

            {/* Acciones de Error con Botones Texturizados NewUI */}
            <View style={styles.actionButtonsCol}>
              <MuButton
                titulo="Reiniciar Pantalla"
                onPress={this.handleReset}
                variante="primary"
                altura={48}
              />
              <MuButton
                titulo={this.state.copied ? '✓ Registro Copiado' : 'Copiar Registro de Error'}
                onPress={() => this.handleCopyError(errCode, safeMsg)}
                variante="secondary"
                altura={48}
              />
              <MuButton
                titulo="Volver al Inicio"
                onPress={this.handleGoHome}
                variante="secondary"
                altura={48}
              />
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#131413',
    minHeight: 340,
  },
  panelBox: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#171817',
    borderWidth: 1,
    borderColor: '#383938',
    borderRadius: 2,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 8,
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 6,
  },
  headerIcon: {
    width: 18,
    height: 18,
    tintColor: '#E2703A',
  },
  headerTitle: {
    color: '#E06868',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: THEME.typography.fontTitle,
    textAlign: 'center',
    ...THEME.effects.textShadow,
  },
  headerSubtitle: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11.5,
    textAlign: 'center',
    marginBottom: 14,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  technicalBox: {
    width: '100%',
    backgroundColor: '#0D0E0D',
    padding: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    marginBottom: 14,
  },
  errorHighlightText: {
    color: '#FFB4AB',
    fontSize: 11.5,
    fontFamily: 'monospace',
    fontWeight: '700',
    lineHeight: 16,
  },
  trackingCodeText: {
    fontSize: 10.5,
    color: THEME.colors.textoSecundario,
    marginTop: 6,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  dividerImg: {
    width: '80%',
    height: 3,
    marginBottom: 14,
    opacity: 0.85,
  },
  actionButtonsCol: {
    width: '100%',
    gap: 8,
  },
  actionTextSilver: {
    color: '#E4E2E0',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.6,
    ...THEME.effects.textShadow,
  },
});
