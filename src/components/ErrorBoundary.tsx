import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../constants/theme';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
  tabName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
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
    });
  };

  render() {
    if (this.state.hasError) {
      const title = this.props.fallbackTitle || (this.props.tabName ? `Módulo ${this.props.tabName} Protegido` : 'Protección del Sistema Activa');
      const errorMsg = this.state.error?.message || 'Se detectó una excepción no controlada en este módulo.';

      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <MaterialCommunityIcons name="shield-alert-outline" size={42} color="#FF6B6B" style={{ marginBottom: 12 }} />
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.desc}>
              La aplicación evitó un cierre forzado. Puedes reintentar cargar este módulo de forma segura.
            </Text>
            <View style={styles.errorBox}>
              <Text style={styles.errorText} numberOfLines={3}>
                {errorMsg}
              </Text>
            </View>
            <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
              <MaterialCommunityIcons name="refresh" size={18} color="#FFF" style={{ marginRight: 6 }} />
              <Text style={styles.btnText}>Reintentar Módulo</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  card: {
    width: '100%',
    backgroundColor: '#2B2521',
    borderColor: '#E2703A',
    borderWidth: 1,
    borderRadius: 6,
    padding: 18,
    alignItems: 'center',
  },
  title: {
    color: '#E8C86A',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 6,
    textAlign: 'center',
  },
  desc: {
    color: THEME.colors.texto,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 17,
  },
  errorBox: {
    width: '100%',
    backgroundColor: '#100D0B',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    marginBottom: 16,
  },
  errorText: {
    color: '#E2703A',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B58F3C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8C86A',
    minHeight: 44,
    justifyContent: 'center',
  },
  btnText: {
    color: '#100D0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
