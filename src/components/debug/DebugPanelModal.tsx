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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { useDatabase } from '../../context/DatabaseContext';

interface DebugPanelModalProps {
  visible: boolean;
  onClose: () => void;
}

export const DebugPanelModal: React.FC<DebugPanelModalProps> = ({ visible, onClose }) => {
  const { logs, clearLogs, isConnected, latency, config, connect } = useDatabase();

  const handleShareLogs = () => {
    const text = logs
      .map((l) => `[${l.timestamp}] (${l.durationMs}ms) ${l.success ? 'OK' : 'ERR'}\n${l.query}\n`)
      .join('\n---\n');
    Share.share({ message: text, title: 'SQL Server Logs - Mu Manager PRO' });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <MaterialCommunityIcons name="console" size={22} color={THEME.colors.primaryOrange} />
              <Text style={styles.title}>Panel de Debug & Logs SQL</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Connection Status Bar */}
          <View style={styles.statusBar}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Host:</Text>
              <Text style={styles.statusValue}>{config?.host || '-'}:{config?.port || '-'}</Text>
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
                <MaterialCommunityIcons name="database-check" size={40} color={THEME.colors.textMuted} />
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
            <TouchableOpacity style={styles.actionBtnSecondary} onPress={clearLogs}>
              <MaterialCommunityIcons name="delete-outline" size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>Limpiar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnSecondary} onPress={handleShareLogs}>
              <MaterialCommunityIcons name="share-variant" size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>Exportar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnPrimary} onPress={connect}>
              <MaterialCommunityIcons name="refresh" size={18} color="#FFFFFF" />
              <Text style={styles.btnText}>Test Query</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: THEME.colors.borderHighlight,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    backgroundColor: THEME.colors.surface,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#121212',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusLabel: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  statusValue: {
    fontSize: 11,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.textPrimary,
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
    backgroundColor: '#0F0F0F',
    borderRadius: THEME.borderRadius.md,
    borderWidth: 1,
    padding: THEME.spacing.sm,
    marginBottom: THEME.spacing.sm,
  },
  logCardSuccess: {
    borderColor: '#263238',
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
    borderRadius: 3,
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
    color: '#ECEFF1',
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
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.border,
    gap: 8,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A2A2A',
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.primaryOrange,
    paddingVertical: 10,
    borderRadius: THEME.borderRadius.md,
    gap: 6,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: THEME.typography.weightBold,
    fontSize: 12,
  },
});
