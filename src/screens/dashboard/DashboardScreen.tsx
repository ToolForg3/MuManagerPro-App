import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { MaterialCommunityIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { Panel, TituloSeccion, BotonOro, BotonPiedra } from '../../components/ui';
import { MetricCard } from '../../components/common/MetricCard';
import { Header } from '../../components/common/Header';
import { useDatabase } from '../../context/DatabaseContext';
import { useLanguage } from '../../context/LanguageContext';
import { AccountSummary } from '../../types/character';
import { SqlClient } from '../../services/database/sqlClient';
import { WatermarkBanner } from '../../components/security/WatermarkBanner';
import { LicenseModal } from '../../components/security/LicenseModal';
import { getAdminLog, clearAdminLog, AdminLogEntry } from '../../services/adminLog';

export const DashboardScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const { metrics, isConnected, config, refreshMetrics } = useDatabase();
  const [refreshing, setRefreshing] = useState(false);
  const [recentAccounts, setRecentAccounts] = useState<AccountSummary[]>([]);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [adminLogs, setAdminLogs] = useState<AdminLogEntry[]>([]);
  const [logsModalVisible, setLogsModalVisible] = useState(false);
  const [allAdminLogs, setAllAdminLogs] = useState<AdminLogEntry[]>([]);
  const [logsSearchQuery, setLogsSearchQuery] = useState('');

  const handleOpenAllLogs = async () => {
    const logs = await getAdminLog();
    setAllAdminLogs(logs);
    setLogsModalVisible(true);
  };

  const handleClearLogs = () => {
    Alert.alert(
      'Limpiar Auditoría',
      '¿Estás seguro de que deseas vaciar todos los registros de acciones administrativas?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar Todo',
          style: 'destructive',
          onPress: async () => {
            await clearAdminLog();
            setAllAdminLogs([]);
            setAdminLogs([]);
          },
        },
      ]
    );
  };

  const loadData = async () => {
    try {
      await refreshMetrics().catch((err) => console.warn('Dashboard metrics refresh notice:', err));
    } catch (_) {}

    try {
      const accounts = await SqlClient.getRecentAccounts();
      setRecentAccounts(accounts || []);
    } catch (e) {
      console.warn('Dashboard accounts fetch notice:', e);
      setRecentAccounts([]);
    }

    try {
      const logs = await getAdminLog();
      setAdminLogs((logs || []).slice(0, 5));
    } catch (_) {}
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 12000);
      return () => clearInterval(interval);
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getPlanBadge = (level: number) => {
    switch (level) {
      case 3:
        return { label: 'Oro', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' };
      case 2:
        return { label: 'Plata', color: '#B0BEC5', bg: 'rgba(176, 190, 197, 0.15)' };
      case 1:
        return { label: 'Bronce', color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)' };
      default:
        return { label: 'Free', color: THEME.colors.textoSecundario, bg: 'rgba(200, 190, 175, 0.15)' };
    }
  };

  return (
    <View style={styles.container}>
      <Header
        title="Mu Manager PRO"
        subtitle="Panel de Control Principal"
        showConnectionBadge={true}
        rightAction={{
          icon: 'refresh',
          onPress: onRefresh,
        }}
      />

      <WatermarkBanner onPressActivate={() => setLicenseModalVisible(true)} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={THEME.colors.primaryOrange}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Imagen de castillo oscura difuminada arriba (30% opacidad, degradado hacia el fondo) */}
        <View style={styles.castleBackdrop}>
          <FontAwesome5 name="fort-awesome" size={130} color={THEME.colors.oro} style={styles.castleIcon} />
        </View>

        {/* Tarjeta de estado del servidor con punto verde Jade */}
        <Panel style={styles.hostBanner}>
          <View style={styles.hostLeft}>
            {/* Punto verde de conexión con resplandor Jade */}
            <View style={[styles.jewelSocket, isConnected ? styles.jewelSocketConnected : styles.jewelSocketDisconnected]}>
              <View style={[styles.jewelCore, isConnected ? styles.jewelCoreConnected : styles.jewelCoreDisconnected]} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={styles.hostHeaderLine}>
                <Text style={styles.realmLabel}>REINO DE LORENCIA</Text>
                <Text style={styles.realmSep}>•</Text>
                <Text style={[styles.hostStatusText, isConnected ? styles.statusOnline : styles.statusOffline]}>
                  {isConnected ? 'ONLINE' : 'DESCONECTADO'}
                </Text>
              </View>
              <Text style={styles.hostSubText} numberOfLines={1}>
                HOST: <Text style={styles.hostHighlight}>{config?.host || '127.0.0.1'}</Text> │ BASE: <Text style={styles.hostHighlight}>{config?.database || 'MuOnline'}</Text>
              </Text>
            </View>
          </View>

          <View style={styles.planBadgeContainer}>
            <Feather name="award" size={15} color={THEME.colors.oroClaro} />
            <Text style={styles.planBadgeText}>{isConnected ? (metrics?.accountType || 'VIP PRO') : 'OFFLINE'}</Text>
          </View>
        </Panel>

        {/* Encabezado: Estado General del Reino */}
        <TituloSeccion titulo="Estado General del Reino" />

        {/* 4 Tarjetas de Estadísticas en 2 Columnas (con números grandes en negrita) */}
        <View style={styles.metricsGrid}>
          {/* Cuentas Totales */}
          <TouchableOpacity
            style={styles.metricCol}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Cuentas')}
          >
            <Panel style={styles.kpiPanel}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>CUENTAS TOTALES</Text>
                <Feather name="users" size={18} color={THEME.colors.oro} />
              </View>
              <Text style={styles.kpiValueBold}>{metrics?.Cuentas || 0}</Text>
            </Panel>
          </TouchableOpacity>

          {/* Personajes Totales */}
          <TouchableOpacity
            style={styles.metricCol}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('PJs')}
          >
            <Panel style={styles.kpiPanel}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>PERSONAJES</Text>
                <Feather name="shield" size={18} color={THEME.colors.oro} />
              </View>
              <Text style={styles.kpiValueBold}>{metrics?.Personajes || 0}</Text>
            </Panel>
          </TouchableOpacity>

          {/* Usuarios Online (Semáforo en Jade) */}
          <TouchableOpacity
            style={styles.metricCol}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Mas', { initialTab: 'players', playerSubTab: 'online' })}
          >
            <Panel style={styles.kpiPanel}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>ONLINE</Text>
                <Feather name="activity" size={18} color={THEME.colors.jade} />
              </View>
              <Text style={[styles.kpiValueBold, { color: THEME.colors.jade }]}>{metrics?.Online || 0}</Text>
            </Panel>
          </TouchableOpacity>

          {/* Cuentas VIP Activas (Estrella en Oro) */}
          <TouchableOpacity
            style={styles.metricCol}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Cuentas', { filter: 'vip' })}
          >
            <Panel style={styles.kpiPanel}>
              <View style={styles.kpiHeaderRow}>
                <Text style={styles.kpiLabel}>VIP ACTIVAS</Text>
                <Feather name="award" size={18} color={THEME.colors.oroClaro} />
              </View>
              <Text style={[styles.kpiValueBold, { color: THEME.colors.oroClaro }]}>{metrics?.VIP || 0}</Text>
            </Panel>
          </TouchableOpacity>
        </View>

        {/* Clanes / Guilds (5to KPI elegante a lo ancho) */}
        <TouchableOpacity
          activeOpacity={0.75}
          onPress={() => navigation.navigate('Mas', { initialTab: 'guilds' })}
          style={{ marginBottom: 8 }}
        >
          <Panel style={styles.guildPanel}>
            <View style={styles.kpiHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Feather name="flag" size={18} color={THEME.colors.arcano} />
                <Text style={styles.kpiLabel}>CLANES / GUILDS REGISTRADAS</Text>
              </View>
              <Text style={[styles.kpiValueBold, { fontSize: 20, color: THEME.colors.arcano }]}>{metrics?.Guilds || 0}</Text>
            </View>
          </Panel>
        </TouchableOpacity>

        {/* Acciones de Comando */}
        <TituloSeccion titulo="Acciones de Comando" />
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Cuentas', { openCreateModal: true })}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="user-plus" size={20} color={THEME.colors.oroClaro} style={styles.actionIcon} />
              <Text style={styles.actionText}>{t('actionNewAccount')}</Text>
              <Text style={styles.actionSubText}>REGISTRO</Text>
            </Panel>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Cuentas', { focusSearch: true })}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="search" size={20} color={THEME.colors.oroClaro} style={styles.actionIcon} />
              <Text style={styles.actionText}>{t('actionSearchAccount')}</Text>
              <Text style={styles.actionSubText}>PADRÓN</Text>
            </Panel>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('PJs')}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="shield" size={20} color={THEME.colors.oroClaro} style={styles.actionIcon} />
              <Text style={styles.actionText}>{t('actionViewCharacters')}</Text>
              <Text style={styles.actionSubText}>HÉROES</Text>
            </Panel>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Config')}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="settings" size={20} color={THEME.colors.oroClaro} style={styles.actionIcon} />
              <Text style={styles.actionText}>{t('actionSettings')}</Text>
              <Text style={styles.actionSubText}>SISTEMA</Text>
            </Panel>
          </TouchableOpacity>
        </View>

        {/* Comandos Imperiales Admin */}
        <TituloSeccion titulo="Comandos Imperiales Admin" />
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Mas', { initialTab: 'prizes' })}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="gift" size={20} color={THEME.colors.brasa} style={styles.actionIcon} />
              <Text style={styles.actionText}>Premios</Text>
              <Text style={styles.actionSubText}>EVENTOS</Text>
            </Panel>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Mas', { initialTab: 'guilds' })}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="flag" size={20} color={THEME.colors.brasa} style={styles.actionIcon} />
              <Text style={styles.actionText}>Clanes</Text>
              <Text style={styles.actionSubText}>GUILDS</Text>
            </Panel>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Mas', { initialTab: 'kit' })}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="package" size={20} color={THEME.colors.brasa} style={styles.actionIcon} />
              <Text style={styles.actionText}>Starter Kit</Text>
              <Text style={styles.actionSubText}>PAQUETES</Text>
            </Panel>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCardWrap}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Mas', { initialTab: 'players', playerSubTab: 'gm' })}
          >
            <Panel sinRemaches style={styles.actionCard}>
              <Feather name="award" size={20} color={THEME.colors.oroClaro} style={styles.actionIcon} />
              <Text style={styles.actionText}>Staff GM</Text>
              <Text style={styles.actionSubText}>MASTERS</Text>
            </Panel>
          </TouchableOpacity>
        </View>

        {/* Recent Accounts Section */}
        <TituloSeccion titulo="Padrón de Ciudadanos Recientes" />

        <Panel style={styles.accountsListCard}>
          {recentAccounts.map((acc, index) => {
            const badge = getPlanBadge(acc.AccountLevel);
            return (
              <TouchableOpacity
                key={acc.memb___id || index}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Cuentas', { searchAccount: acc.memb___id })}
                style={[
                  styles.accountRow,
                  index < recentAccounts.length - 1 && styles.accountRowBorder,
                ]}
              >
                <View style={styles.accountLeft}>
                  <View style={styles.accAvatar}>
                    <MaterialCommunityIcons name="shield-account" size={18} color={THEME.colors.oroClaro} />
                  </View>
                  <View>
                    <Text style={styles.accountIdText}>{acc.memb___id}</Text>
                    <View style={styles.accStatusRow}>
                      <View style={[styles.accStatusDot, { backgroundColor: acc.online ? THEME.colors.jade : THEME.colors.textoSecundario }]} />
                      <Text style={[styles.accStatusText, acc.online ? { color: THEME.colors.jade } : { color: THEME.colors.textoSecundario }]}>
                        {acc.online ? 'CIUDADANO EN LÍNEA' : 'DESCONECTADO'}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.planBadge, { backgroundColor: badge.bg, borderColor: badge.color }]}>
                  <Text style={[styles.planText, { color: badge.color }]}>{badge.label.toUpperCase()}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </Panel>

        {/* Recent Admin Logs Section */}
        <View style={styles.sectionHeaderRow}>
          <TituloSeccion titulo="CRÓNICA DE ACCIONES ADMIN" />
          <TouchableOpacity
            style={styles.seeAllBtn}
            activeOpacity={0.75}
            onPress={handleOpenAllLogs}
          >
            <Text style={styles.seeAllText}>HISTORIAL ➔</Text>
          </TouchableOpacity>
        </View>

        <Panel style={styles.logsCard}>
          {adminLogs.length === 0 ? (
            <View style={styles.emptyLogsWrap}>
              <MaterialCommunityIcons name="shield-check-outline" size={28} color={THEME.colors.textoSecundario} />
              <Text style={styles.emptyLogsText}>Sin registros de administración recientes</Text>
            </View>
          ) : (
            adminLogs.map((log, index) => (
              <View
                key={`${log.timestamp}-${index}`}
                style={[
                  styles.logRow,
                  index < adminLogs.length - 1 && styles.accountRowBorder,
                ]}
              >
                <View style={[styles.logStatusDot, { backgroundColor: THEME.colors.oroClaro }]} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={styles.logActionText}>{log.action}</Text>
                    <Text style={styles.logTimeText}>
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  {log.detail ? (
                    <Text style={styles.logDetailText} numberOfLines={1}>
                      {log.detail}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Panel>
      </ScrollView>


      {/* Modal Completo de Auditoría y Acciones Admin */}
      <Modal
        visible={logsModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setLogsModalVisible(false)}
      >
        <View style={styles.logsModalContainer}>
          <View style={styles.logsModalHeader}>
            <TouchableOpacity onPress={() => setLogsModalVisible(false)} style={styles.logsBackBtn}>
              <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.logsModalTitle}>Auditoría y Acciones Admin</Text>
              <Text style={styles.logsModalSub}>Historial completo de operaciones</Text>
            </View>
            {allAdminLogs.length > 0 && (
              <TouchableOpacity onPress={handleClearLogs} style={styles.logsClearBtn}>
                <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF5252" />
              </TouchableOpacity>
            )}
          </View>

          {/* Buscador de acciones */}
          <View style={styles.logsSearchBox}>
            <MaterialCommunityIcons name="magnify" size={20} color={THEME.colors.textoSecundario} />
            <TextInput
              style={styles.logsSearchInput}
              placeholder="Buscar por acción o detalle..."
              placeholderTextColor={THEME.colors.textMuted}
              value={logsSearchQuery}
              onChangeText={setLogsSearchQuery}
            />
            {logsSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setLogsSearchQuery('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14, paddingBottom: 40 }}>
            {(() => {
              const filtered = allAdminLogs.filter((log) => {
                if (!logsSearchQuery.trim()) return true;
                const q = logsSearchQuery.toLowerCase().trim();
                return (
                  log.action.toLowerCase().includes(q) ||
                  (log.detail && log.detail.toLowerCase().includes(q))
                );
              });

              if (filtered.length === 0) {
                return (
                  <View style={styles.emptyLogsWrapModal}>
                    <MaterialCommunityIcons name="shield-check-outline" size={48} color={THEME.colors.textMuted} />
                    <Text style={styles.emptyLogsTextModal}>
                      {allAdminLogs.length === 0
                        ? 'Sin registros administrativos guardados'
                        : 'No se encontraron acciones coincidentes'}
                    </Text>
                  </View>
                );
              }

              return filtered.map((log, index) => {
                const isDanger = /BAN|DC|DISCONNECT|DELETE|KILL|MUTE|EXCEDENTES/i.test(log.action);
                const isWarning = /INJECT|EDIT|UPDATE|TELEPORT|SET/i.test(log.action);
                const dotColor = isDanger ? '#FF5252' : isWarning ? '#FFB300' : '#4CAF50';

                return (
                  <View key={`full_log_${log.timestamp}_${index}`} style={styles.fullLogRow}>
                    <View style={[styles.logStatusDot, { backgroundColor: dotColor, marginTop: 4 }]} />
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.fullLogActionText}>{log.action}</Text>
                        <Text style={styles.fullLogTimeText}>
                          {new Date(log.timestamp).toLocaleString()}
                        </Text>
                      </View>
                      {log.detail ? (
                        <Text style={styles.fullLogDetailText}>{log.detail}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              });
            })()}
          </ScrollView>
        </View>
      </Modal>

      <LicenseModal
        visible={licenseModalVisible}
        onClose={() => setLicenseModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
  },
  castleBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.25,
    overflow: 'hidden',
    zIndex: 0,
  },
  castleIcon: {
    opacity: 0.3,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    padding: THEME.shapes.espaciadoBase,
    paddingBottom: 40,
  },
  hostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 14,
  },
  hostLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  jewelSocket: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  jewelSocketConnected: {
    borderColor: THEME.colors.jade,
  },
  jewelSocketDisconnected: {
    borderColor: THEME.colors.brasa,
  },
  jewelCore: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  jewelCoreConnected: {
    backgroundColor: THEME.colors.jade,
    shadowColor: THEME.colors.jade,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 4,
  },
  jewelCoreDisconnected: {
    backgroundColor: THEME.colors.brasa,
  },
  hostHeaderLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  realmLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: THEME.typography.trackingWide,
    textTransform: 'uppercase',
  },
  realmSep: {
    color: THEME.colors.borde,
    fontSize: 10,
  },
  hostStatusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  statusOnline: {
    color: THEME.colors.jade,
  },
  statusOffline: {
    color: THEME.colors.brasa,
  },
  hostSubText: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    marginTop: 3,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  hostHighlight: {
    color: THEME.colors.oroClaro,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(181, 143, 60, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    gap: 6,
  },
  planBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  metricCol: {
    width: '50%',
    padding: 4,
  },
  kpiPanel: {
    padding: 12,
    minHeight: 74,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textoSecundario,
    letterSpacing: 0.5,
  },
  kpiValueBold: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.texto,
    marginTop: 6,
  },
  guildPanel: {
    padding: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 12,
  },
  actionCardWrap: {
    flex: 1,
  },
  actionCard: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78,
    backgroundColor: THEME.colors.casillaFondo,
    borderColor: THEME.colors.borde,
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
  },
  actionIcon: {
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.texto,
    textAlign: 'center',
  },
  actionSubText: {
    fontSize: 9,
    color: THEME.colors.textoSecundario,
    marginTop: 2,
    textAlign: 'center',
  },

  sectionHeaderRow: {
    marginVertical: THEME.shapes.espaciadoBase,
    alignItems: 'center',
  },
  seeAllBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignSelf: 'center',
    marginTop: 6,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.oroClaro,
    letterSpacing: 1,
  },
  accountsListCard: {
    marginVertical: THEME.shapes.espaciadoBase,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  accountRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  accountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accAvatar: {
    width: 34,
    height: 34,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  accountIdText: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.4,
  },
  accStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  accStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  accStatusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    borderWidth: 1,
  },
  planText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  logsCard: {
    marginVertical: THEME.shapes.espaciadoBase,
  },
  emptyLogsWrap: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyLogsText: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  logStatusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  logActionText: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.4,
  },
  logTimeText: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    fontWeight: '700',
  },
  logDetailText: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginTop: 2,
    fontWeight: '600',
  },
  logsModalContainer: {
    flex: 1,
    backgroundColor: THEME.colors.background,
    paddingTop: Platform.OS === 'android' ? 36 : 48,
  },
  logsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
    gap: 12,
  },
  logsBackBtn: {
    padding: 6,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsModalTitle: {
    color: '#E8C86A',
    fontSize: 17,
    fontWeight: 'bold',
  },
  logsModalSub: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 1,
  },
  logsClearBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderWidth: 1,
    borderColor: '#E2703A',
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsModalList: {
    padding: 16,
  },
  logsSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#100D0B',
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 40,
    marginHorizontal: 16,
    marginBottom: 8,
    borderColor: THEME.colors.border,
    gap: 8,
  },
  logsSearchInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 13,
  },
  emptyLogsWrapModal: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    gap: 12,
  },
  emptyLogsTextModal: {
    color: THEME.colors.textoSecundario,
    fontSize: 14,
  },
  fullLogRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1A1613',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  fullLogActionText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  fullLogTimeText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
  },
  fullLogDetailText: {
    color: THEME.colors.texto,
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
});
