import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { GothicAlert as Alert } from '../common/GothicAlert';
import { MuIcon } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';
import { useDatabase } from '../../context/DatabaseContext';
import { Panel } from '../ui/Panel';
import { MuButton } from '../ui/MuButton';

interface DebugPanelModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DebugPanelModal: React.FC<DebugPanelModalProps> = ({ visible, onClose }) => {
  const { logs, clearLogs, isConnected, latency, config, connect } = useDatabase();

  const maskHost = (host?: string) => {
    if (!host) return '-';
    const ipMatch = host.match(/^(\d{1,3}\.\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (ipMatch) return `${ipMatch[1]}.***.***`;
    if (host === 'localhost' || host === '127.0.0.1') return 'local-instance';
    if (host.length > 8) return host.substring(0, 4) + '***' + host.substring(host.length - 3);
    return '***';
  };

  const sanitizeQueryForExport = (q: string) => {
    return q
      .replace(/'[^']*'/g, "'[REDACTED]'")
      .replace(/= [0-9]+/g, "= [ID]")
      .replace(/SET .*/i, 'SET [REDACTED_MUTATION]');
  };

  const handleShareLogs = () => {
    if (logs.length === 0) {
      Alert.alert('Diagnóstico', 'No hay registros de diagnóstico para exportar.');
      return;
    }

    const hostMasked = maskHost(config?.host);
    const text = logs
      .map((l) => `[${l.timestamp}] (${l.durationMs}ms) ${l.success ? 'OK' : 'ERR'}\n${sanitizeQueryForExport(l.query)}\n`)
      .join('\n---\n');

    Alert.alert(
      'Exportar Diagnóstico Anonimizado',
      `Se exportarán ${logs.length} eventos de rendimiento y latencia con identificadores y consultas anonimizadas (Host: ${hostMasked}).\n\n¿Deseas continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Exportar',
          onPress: () => {
            Share.share({
              message: `=== REPORTE DE RENDIMIENTO & DIAGNÓSTICO ===\nHost: ${hostMasked}\nPing: ${latency}ms\n\n${text}`,
              title: 'Diagnóstico de Red - Mu Manager PRO'
            });
          }
        }
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Panel style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MuIcon name="tools" size={20} />
              <Text style={styles.title}>Diagnóstico y Rendimiento de Red</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MuIcon name="close" size={20} />
            </TouchableOpacity>
          </View>

          {/* Connection Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Host:</Text>
              <Text style={styles.statusValue}>{maskHost(config?.host)}:{config?.port || '-'}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>DB:</Text>
              <Text style={styles.statusValue}>{config?.database || '-'}</Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Ping:</Text>
              <Text style={[styles.statusValue, { color: THEME.colors.accentGreenBright }]}>
                {latency}ms
              </Text>
            </View>
          </View>

          {/* Logs List */}
          <ScrollView style={styles.logsContainer} showsVerticalScrollIndicator={false}>
            {logs.length === 0 ? (
              <View style={styles.emptyState}>
                <MuIcon name="check" size={38} />
                <Text style={styles.emptyText}>No hay consultas ejecutadas todavía.</Text>
              </View>
            ) : (
              logs.map((log) => (
                <View
                  key={log.id}
                  style={[
                    styles.logCard,
                    log.success ? styles.logCardSuccess : styles.logCardError,
                  ]}
                >
                  <View style={styles.logHeader}>
                    <View style={styles.logTimeRow}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: log.success ? THEME.colors.accentGreenBright : THEME.colors.dangerRed },
                        ]}
                      />
                      <Text style={styles.logTime}>{log.timestamp}</Text>
                      <Text style={styles.logDuration}>({log.durationMs} ms)</Text>
                    </View>
                    {log.rowCount !== undefined && (
                       <Text style={styles.rowCountText}>{log.rowCount} filas</Text>
                    )}
                  </View>

                  <Text style={styles.queryText} selectable={true}>
                    {log.query}
                  </Text>

                  {log.error && (
                    <Text style={styles.errorText}>Error: {log.error}</Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            <MuButton
              titulo="Limpiar"
              icono="delete"
              variante="danger"
              onPress={clearLogs}
              compacto
              altura={38}
              style={{ flex: 1 }}
            />

            <MuButton
              titulo="Exportar"
              icono="save"
              variante="secondary"
              onPress={handleShareLogs}
              compacto
              altura={38}
              style={{ flex: 1 }}
            />

            <MuButton
              titulo="Test Query"
              icono="refresh"
              variante="primary"
              onPress={connect}
              compacto
              altura={38}
              style={{ flex: 1 }}
            />
          </View>
        </Panel>
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
    maxHeight: '90%',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#4C463A',
    backgroundColor: '#1B1C1B',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: THEME.typography.weightBold,
    color: '#E0C380',
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadow,
  },
  closeBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#0D0E0D',
    borderBottomWidth: 1,
    borderBottomColor: '#4C463A',
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    ...THEME.effects.textShadowSubtle,
  },
  statusValue: {
    fontSize: 11.5,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.textPrimary,
    ...THEME.effects.textShadowSubtle,
  },
  logsContainer: {
    padding: THEME.spacing.md,
    maxHeight: 450,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    color: THEME.colors.textMuted,
    fontSize: 13,
  },
  logCard: {
    backgroundColor: '#0D0E0D',
    borderRadius: 2,
    borderWidth: 1,
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  logCardSuccess: {
    borderColor: '#4C463A',
  },
  logCardError: {
    borderColor: THEME.colors.dangerRed,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3, /* círculo funcional (width/2): indicador de status */
  },
  logTime: {
    fontSize: 10,
    color: THEME.colors.textSecondary,
    fontFamily: THEME.typography.fontMono,
  },
  logDuration: {
    fontSize: 10,
    color: THEME.colors.textMuted,
  },
  rowCountText: {
    fontSize: 10,
    color: THEME.colors.accentGreenBright,
  },
  queryText: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 11,
    color: '#E4E2E0',
    lineHeight: 16,
  },
  errorText: {
    marginTop: 4,
    color: THEME.colors.dangerRed,
    fontSize: 11,
  },
  footer: {
    flexDirection: 'row',
    padding: THEME.spacing.md,
    backgroundColor: '#1B1C1B',
    borderTopWidth: 1,
    borderTopColor: '#4C463A',
    gap: 8,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#292A29',
    borderWidth: 1,
    borderColor: '#4C463A',
    paddingVertical: 10,
    borderRadius: 2,
    minHeight: 44,
    gap: 6,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0C380',
    borderWidth: 1,
    borderColor: '#EFD28D',
    paddingVertical: 10,
    borderRadius: 2,
    minHeight: 44,
    gap: 6,
  },
  btnText: {
    color: '#E4E2E0',
    fontWeight: THEME.typography.weightBold,
    fontSize: 12,
  },
  btnTextPrimary: {
    color: '#0D0E0D',
    fontWeight: '800',
    fontSize: 12,
  },
});
