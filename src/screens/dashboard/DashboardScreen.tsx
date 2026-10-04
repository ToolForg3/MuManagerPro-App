import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
  Image,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import { MuIcon } from '../../components/ui/MuIcon';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { Panel, TituloSeccion, BotonOro, BotonPiedra, MuButton, MuHeaderBanner, MuSideMoldings } from '../../components/ui';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { MetricCard } from '../../components/common/MetricCard';
import { Header } from '../../components/common/Header';
import { useDatabase } from '../../context/DatabaseContext';
import { useLanguage } from '../../context/LanguageContext';
import { AccountSummary } from '../../types/character';
import { SqlClient } from '../../services/database/sqlClient';
import { WatermarkBanner } from '../../components/security/WatermarkBanner';
import { LicenseModal } from '../../components/security/LicenseModal';
import { getAdminLog, clearAdminLog, AdminLogEntry } from '../../services/adminLog';
import { maskHost } from '../../services/maskUtils';

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

  const isFetchingRef = useRef(false);

  const loadData = async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
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
    } finally {
      isFetchingRef.current = false;
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      const interval = setInterval(() => {
        loadData();
      }, 30000);
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
        return { label: t('planGold'), color: '#FFD700', bg: 'rgba(255, 215, 0, 0.15)' };
      case 2:
        return { label: t('planSilver'), color: '#B0BEC5', bg: 'rgba(176, 190, 197, 0.15)' };
      case 1:
        return { label: t('planBronze'), color: '#CD7F32', bg: 'rgba(205, 127, 50, 0.15)' };
      default:
        return { label: t('planFree'), color: THEME.colors.textoSecundario, bg: 'rgba(200, 190, 175, 0.15)' };
    }
  };

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={styles.container}
      imageStyle={{ opacity: 0.50 }}
      resizeMode="repeat"
    >
      <Header
        title="Mu Manager PRO"
        subtitle={t('dashboardSubtitle')}
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
        {/* PANEL DE CONEXIÓN */}
        <Panel tipo="box" conEsquineros conDivisor style={styles.hostBanner}>
          <View style={styles.boxHeaderRow}>
            <View style={styles.rowAlign}>
              <View style={[styles.jewelDot, isConnected ? styles.jewelDotOnline : styles.jewelDotOffline]} />
              <Text style={styles.boxHeaderTitle}>{t('connectionPanelTitle')}</Text>
            </View>
            <Text style={[styles.boxHeaderStatus, isConnected ? styles.textJade : styles.textBrasa]}>
              {isConnected ? t('online').toUpperCase() : t('disconnected')}
            </Text>
          </View>

          <View style={styles.connectionGrid}>
            <View style={styles.connectionCell}>
              <Text style={styles.cellLabel}>{t('cellHost')}</Text>
              <Text style={styles.cellValueGold} numberOfLines={1}>
                {config?.host ? maskHost(config.host) : '127.0.0.1'}
              </Text>
            </View>
            <View style={styles.connectionCell}>
              <Text style={styles.cellLabel}>{t('cellDatabase')}</Text>
              <Text style={styles.cellValueGold} numberOfLines={1}>
                {config?.database || 'MuOnline'}
              </Text>
            </View>
            <View style={styles.connectionCell}>
              <Text style={styles.cellLabel}>{t('cellConnection')}</Text>
              <Text style={[styles.cellValue, isConnected ? styles.textJade : styles.textBrasa]} numberOfLines={1}>
                {isConnected ? t('online').toUpperCase() : t('offline').toUpperCase()}
              </Text>
            </View>
            <View style={styles.connectionCell}>
              <Text style={styles.cellLabel}>{t('cellAccountType')}</Text>
              <Text style={styles.cellValueGold} numberOfLines={1}>
                {isConnected ? (metrics?.accountType || 'VIP PRO') : t('offline').toUpperCase()}
              </Text>
            </View>
          </View>
        </Panel>

        {/* ESTADO GENERAL DEL REINO */}
        <Panel tipo="box" conEsquineros style={styles.realmPanel}>
          <View style={styles.boxHeaderRow}>
            <View style={styles.rowAlign}>
              <MuIcon name="sword-cross" size={14} color={THEME.colors.oroClaro} containerStyle={{ marginRight: 4 }} />
              <Text style={styles.boxHeaderTitle}>{t('realmStatusTitle')}</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            {/* Cuentas Totales */}
            <TouchableOpacity
              style={styles.metricCol}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Jugadores', { subTab: 'cuentas' })}
            >
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>{t('metricAccounts').toUpperCase()}</Text>
                <Text style={styles.kpiValueGold}>{metrics?.Cuentas || 0}</Text>
              </View>
            </TouchableOpacity>

            {/* Personajes */}
            <TouchableOpacity
              style={styles.metricCol}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Jugadores', { subTab: 'personajes' })}
            >
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>{t('metricCharacters').toUpperCase()}</Text>
                <Text style={styles.kpiValueGold}>{metrics?.Personajes || 0}</Text>
              </View>
            </TouchableOpacity>

            {/* Online */}
            <TouchableOpacity
              style={styles.metricCol}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Jugadores', { subTab: 'online' })}
            >
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>{t('metricOnline').toUpperCase()}</Text>
                <Text style={[styles.kpiValueGold, styles.textJade]}>{metrics?.Online || 0}</Text>
              </View>
            </TouchableOpacity>

            {/* VIP Activas */}
            <TouchableOpacity
              style={styles.metricCol}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Jugadores', { subTab: 'cuentas', filter: 'vip' })}
            >
              <View style={styles.kpiBox}>
                <Text style={styles.kpiLabel}>{t('metricVip').toUpperCase()}</Text>
                <Text style={styles.kpiValueGold}>{metrics?.VIP || 0}</Text>
              </View>
            </TouchableOpacity>

            {/* Clanes / Guilds (Ancho Completo) */}
            <TouchableOpacity
              style={styles.metricColFull}
              activeOpacity={0.75}
              onPress={() => navigation.navigate('Jugadores', { subTab: 'clanes' })}
            >
              <View style={styles.kpiBoxFull}>
                <Text style={styles.kpiLabel}>{t('metricGuilds').toUpperCase()}</Text>
                <Text style={styles.kpiValueGold}>{metrics?.Guilds || 0}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Panel>

        {/* ACCIONES DE COMANDO */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.rowAlign}>
            <MuIcon name="flash" size={14} color={THEME.colors.oroClaro} containerStyle={{ marginRight: 4 }} />
            <Text style={styles.sectionTitleText}>{t('commandActionsTitle')}</Text>
          </View>
          <Text style={styles.sectionSubTitleText}>{t('commandActionsSubtitle')}</Text>
        </View>
        <Image
          source={STITCH_ASSETS.decorations.goldDividerLine}
          style={styles.sectionGoldDivider}
          resizeMode="stretch"
        />

        <View style={styles.commandsGrid}>
          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => setLicenseModalVisible(true)}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="shield-lock" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdSecurity')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdSecuritySub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Jugadores', { subTab: 'cuentas', focusSearch: true })}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="account-search" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdSearchAccount')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdSearchAccountSub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Jugadores', { subTab: 'personajes' })}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="account-group" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdViewCharacters')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdViewCharactersSub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Ajustes')}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="cog" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdSettings')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdSettingsSub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* COMANDOS IMPERIALES ADMIN */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.rowAlign}>
            <MuIcon name="crown" size={14} color={THEME.colors.oroClaro} containerStyle={{ marginRight: 4 }} />
            <Text style={styles.sectionTitleText}>{t('imperialCommandsTitle')}</Text>
          </View>
          <Text style={styles.sectionSubTitleText}>{t('imperialCommandsSubtitle')}</Text>
        </View>
        <Image
          source={STITCH_ASSETS.decorations.goldDividerLine}
          style={styles.sectionGoldDivider}
          resizeMode="stretch"
        />

        <View style={styles.commandsGrid}>
          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Objetos', { initialTab: 'prizes' })}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="treasure-chest" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdPrizes')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdPrizesSub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Jugadores', { subTab: 'clanes' })}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="sword-cross" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdGuilds')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdGuildsSub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Objetos', { initialTab: 'kit' })}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="package-variant-closed" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdStarterKit')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdStarterKitSub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ width: '48.5%', borderRadius: 2, overflow: 'hidden' }}
            activeOpacity={0.75}
            onPress={() => navigation.navigate('Jugadores', { subTab: 'gm' })}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.commandButtonCard}
              resizeMode="stretch"
            >
              <View style={styles.commandIconWrap}>
                <MuIcon name="shield-crown" size={22} color={THEME.colors.oroClaro} />
              </View>
              <View style={styles.commandTextWrap}>
                <Text style={styles.commandTitle} numberOfLines={1}>{t('cmdStaffGm')}</Text>
                <Text style={styles.commandSub} numberOfLines={1}>{t('cmdStaffGmSub')}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        </View>

        {/* PADRÓN DE CIUDADANOS RECIENTES */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.rowAlign}>
            <MuIcon name="book-open-page-variant" size={14} color={THEME.colors.oroClaro} containerStyle={{ marginRight: 4 }} />
            <Text style={styles.sectionTitleText}>{t('recentAccounts').toUpperCase()}</Text>
          </View>
          <Text style={styles.sectionSubTitleText}>REGISTROS</Text>
        </View>
        <Image
          source={STITCH_ASSETS.decorations.goldDividerLine}
          style={styles.sectionGoldDivider}
          resizeMode="stretch"
        />

        <Panel tipo="box" conEsquineros style={styles.accountsListCard}>
          {recentAccounts.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateText}>{t('noRecentAccounts')}</Text>
              <View style={styles.emptyStateCols}>
                <Text style={styles.colHeaderGold}>{t('accId')}</Text>
                <Text style={styles.colHeaderMuted}>{t('status')}</Text>
                <Text style={styles.colHeaderMuted}>{t('accCreatedDate')}</Text>
              </View>
            </View>
          ) : (
            recentAccounts.map((acc, index) => {
              const badge = getPlanBadge(acc.AccountLevel);
              return (
                <TouchableOpacity
                  key={acc.memb___id || index}
                  activeOpacity={0.7}
                  onPress={() => navigation.navigate('Jugadores', { subTab: 'cuentas', searchAccount: acc.memb___id })}
                  style={[
                    styles.accountRow,
                    index < recentAccounts.length - 1 && styles.accountRowBorder,
                  ]}
                >
                  <View style={styles.accountLeft}>
                    <View style={styles.accAvatar}>
                      <MuIcon
                        name={String(acc.bloc_code) === '1' ? 'lock' : 'account'}
                        size={18}
                        color={String(acc.bloc_code) === '1' ? THEME.colors.brasa : THEME.colors.oroClaro}
                      />
                    </View>
                    <View>
                      <Text style={styles.accountIdText}>{acc.memb___id}</Text>
                      <View style={styles.accStatusRow}>
                        <View style={[styles.accStatusDot, { backgroundColor: acc.online ? THEME.colors.jade : THEME.colors.textoSecundario }]} />
                        <Text style={[styles.accStatusText, acc.online ? styles.textJade : styles.textMuted]}>
                          {acc.online ? t('online').toUpperCase() : t('offline').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.planBadge, { backgroundColor: badge.bg, borderColor: badge.color }]}>
                    <Text style={[styles.planText, { color: badge.color }]}>{badge.label.toUpperCase()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </Panel>

        {/* CRÓNICA DE ACCIONES ADMIN */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.rowAlign}>
            <MuIcon name="shield-check" size={14} color={THEME.colors.oroClaro} containerStyle={{ marginRight: 4 }} />
            <Text style={styles.sectionTitleText}>{t('cmdAuditLogsSub')}</Text>
          </View>
          <Text style={styles.sectionSubTitleText}>AUDIT</Text>
        </View>
        <Image
          source={STITCH_ASSETS.decorations.goldDividerLine}
          style={styles.sectionGoldDivider}
          resizeMode="stretch"
        />

        <Panel tipo="box" conEsquineros style={styles.logsCard}>
          {adminLogs.length === 0 ? (
            <View style={styles.emptyStateBox}>
              <Text style={styles.emptyStateText}>{t('auditLogsSub')}</Text>
              <View style={styles.emptyStateCols}>
                <Text style={styles.colHeaderGold}>{t('actions')}</Text>
                <Text style={styles.colHeaderMuted}>{t('rankPlayer')}</Text>
                <Text style={styles.colHeaderMuted}>{t('pkTimeLabel')}</Text>
              </View>
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

          <MuButton
            titulo={t('view') + ' ' + t('all') + ' ' + t('details')}
            icono="history"
            variante="primary"
            altura={44}
            onPress={handleOpenAllLogs}
            accessibilityLabel={t('view') + ' ' + t('all')}
            style={{ marginTop: 8 }}
          />
        </Panel>

        {/* Faldón Ornamental Gótico MU */}
        <Image
          source={STITCH_ASSETS.decorations.gothicFooterBanner}
          style={styles.windowFooterOrnament}
          resizeMode="stretch"
        />
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
            <TouchableOpacity
              onPress={() => setLogsModalVisible(false)}
              style={{ borderRadius: 2, overflow: 'hidden' }}
            >
              <ImageBackground
                source={STITCH_ASSETS.buttons.small}
                style={styles.logsBackBtn}
                resizeMode="stretch"
              >
                <MuIcon name="arrow-left" size={20} color="#FFF" />
              </ImageBackground>
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.logsModalTitle}>Auditoría y Acciones Admin</Text>
              <Text style={styles.logsModalSub}>Historial completo de operaciones</Text>
            </View>
            {allAdminLogs.length > 0 && (
              <TouchableOpacity
                onPress={handleClearLogs}
                style={{ borderRadius: 2, overflow: 'hidden' }}
              >
                <ImageBackground
                  source={STITCH_ASSETS.buttons.small}
                  style={styles.logsClearBtn}
                  resizeMode="stretch"
                >
                  <MuIcon name="trash-can-outline" size={18} color={THEME.colors.brasa} />
                </ImageBackground>
              </TouchableOpacity>
            )}
          </View>

          {/* Buscador de acciones */}
          <View style={styles.logsSearchBox}>
            <MuIcon name="magnify" size={20} color={THEME.colors.textoSecundario} />
            <TextInput
              style={styles.logsSearchInput}
              placeholder="Buscar por acción o detalle..."
              placeholderTextColor={THEME.colors.textMuted}
              value={logsSearchQuery}
              onChangeText={setLogsSearchQuery}
            />
            {logsSearchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setLogsSearchQuery('')}>
                <MuIcon name="close-circle" size={18} color={THEME.colors.textoSecundario} />
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
                    <MuIcon name="shield-check-outline" size={48} color={THEME.colors.textMuted} />
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
                const dotColor = isDanger ? THEME.colors.brasa : isWarning ? THEME.colors.amber : THEME.colors.jade;

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
    </ImageBackground>
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
    paddingBottom: 120,
  },
  hostBanner: {
    marginBottom: 12,
    padding: 10,
  },
  boxHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  rowAlign: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  jewelDot: {
    width: 8,
    height: 8,
    borderRadius: 4, /* círculo funcional (width/2) */
    backgroundColor: THEME.colors.textoSecundario,
  },
  jewelDotOnline: {
    backgroundColor: THEME.colors.jade,
    shadowColor: THEME.colors.jade,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 5,
    elevation: 3,
  },
  jewelDotOffline: {
    backgroundColor: THEME.colors.brasa,
  },
  boxHeaderTitle: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FEDF99',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  boxHeaderIcon: {
    color: '#FEDF99',
    fontSize: 12,
  },
  boxHeaderStatus: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.5,
  },
  connectionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    gap: 6,
  },
  connectionCell: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#0C0D0C',
    borderWidth: 1,
    borderColor: '#4C463A',
    borderRadius: 2,
    padding: 8,
  },
  cellLabel: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    ...THEME.effects.textShadowSubtle,
  },
  cellValueGold: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FEDF99',
    marginTop: 2,
    ...THEME.effects.textShadow,
  },
  cellValue: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 12.5,
    fontWeight: '800',
    marginTop: 2,
    ...THEME.effects.textShadow,
  },
  realmPanel: {
    marginBottom: 12,
    padding: 10,
  },
  kpiBox: {
    backgroundColor: '#181918',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#28251E',
    borderRightColor: '#28251E',
    borderWidth: 1,
    borderRadius: 2,
    padding: 8,
    minHeight: 52,
    justifyContent: 'space-between',
  },
  kpiBoxFull: {
    backgroundColor: '#181918',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#28251E',
    borderRightColor: '#28251E',
    borderWidth: 1,
    borderRadius: 2,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 46,
  },
  metricColFull: {
    width: '100%',
    padding: 4,
  },
  kpiValueGold: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 20,
    fontWeight: '900',
    color: '#FEDF99',
    marginTop: 2,
    ...THEME.effects.textShadow,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 4,
    marginTop: 10,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  sectionHeaderIcon: {
    color: '#FEDF99',
    fontSize: 12,
    marginRight: 4,
  },
  sectionTitleText: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 13,
    fontWeight: '800',
    color: '#FEDF99',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  sectionSubTitleText: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 10,
    fontWeight: '800',
    color: '#E4E2E0',
    letterSpacing: 0.6,
    ...THEME.effects.textShadowSubtle,
  },
  commandsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  commandButtonCard: {
    width: '100%',
    height: 56,
    paddingHorizontal: 8,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  commandIconWrap: {
    width: 34,
    height: 34,
    backgroundColor: '#0A0B0A',
    borderTopColor: '#1A1C1A',
    borderLeftColor: '#1A1C1A',
    borderBottomColor: '#3A3C38',
    borderRightColor: '#3A3C38',
    borderWidth: 1,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  commandSpriteIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  commandTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  commandTitle: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12.5,
    fontWeight: '800',
    color: '#FEDF99',
    letterSpacing: 0.4,
    ...THEME.effects.textShadow,
  },
  commandSub: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 10,
    fontWeight: '700',
    color: '#E4E2E0',
    letterSpacing: 0.6,
    marginTop: 1,
    ...THEME.effects.textShadowSubtle,
  },
  emptyStateBox: {
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 6,
  },
  emptyStateText: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 11,
    color: THEME.colors.textoSecundarioLuminoso,
    textAlign: 'center',
  },
  emptyStateCols: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
    paddingTop: 6,
    marginTop: 4,
  },
  colHeaderGold: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.colors.oroClaro,
  },
  colHeaderMuted: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 9.5,
    fontWeight: '600',
    color: THEME.colors.textoSecundarioLuminoso,
  },
  textJade: {
    color: THEME.colors.jade,
  },
  textBrasa: {
    color: THEME.colors.brasa,
  },
  textMuted: {
    color: THEME.colors.textoSecundarioLuminoso,
  },
  windowFooterOrnament: {
    width: '100%',
    height: 36,
    marginTop: 6,
    marginBottom: 16,
  },
  viewAllLogsBtn: {
    width: '100%',
    height: 44,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#1F201F',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#28251E',
    borderRightColor: '#28251E',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  viewAllLogsBtnText: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12,
    fontWeight: '700',
    color: '#EFD28D',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    ...THEME.effects.textShadow,
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
    borderRadius: 12, // círculo funcional (width/2): socket de joya circular
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
    borderRadius: 6, /* círculo funcional (width/2) */
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
    ...THEME.effects.textShadow,
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
    fontSize: 10.5,
    color: THEME.colors.textoSecundarioLuminoso,
    marginTop: 3,
    fontWeight: '600',
    letterSpacing: 0.3,
    ...THEME.effects.textShadowSubtle,
  },
  hostHighlight: {
    color: THEME.colors.oroClaro,
  },
  planBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 195, 128, 0.15)',
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
    minHeight: 74,
    justifyContent: 'center',
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.6,
    ...THEME.effects.textShadowSubtle,
  },
  kpiValueBold: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.colors.texto,
    marginTop: 6,
    ...THEME.effects.textShadow,
  },
  guildPanel: {
    minHeight: 52,
    justifyContent: 'center',
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
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 78,
  },
  actionIcon: {
    marginBottom: 6,
  },
  actionText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: THEME.colors.texto,
    textAlign: 'center',
    ...THEME.effects.textShadow,
  },
  actionSubText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.8,
    marginTop: 3,
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
  },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
    marginTop: 14,
    marginBottom: 4,
  },
  sectionGoldDivider: {
    width: '100%',
    height: 4,
    marginBottom: 10,
    opacity: 0.85,
  },
  seeAllBtn: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
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
    backgroundColor: THEME.colors.deepForge,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  accAvatarImg: {
    width: 22,
    height: 22,
  },
  accountIdText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#FEDF99',
    letterSpacing: 0.5,
    ...THEME.effects.textShadow,
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
    borderRadius: 3, /* círculo funcional (width/2) */
  },
  accStatusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  planBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
  },
  planText: {
    fontSize: 10.5,
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
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '700',
    letterSpacing: 0.4,
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
    borderRadius: 3.5, /* círculo funcional (width/2) */
  },
  logActionText: {
    fontSize: 12.5,
    fontWeight: '900',
    color: '#FEDF99',
    letterSpacing: 0.4,
    ...THEME.effects.textShadow,
  },
  logTimeText: {
    fontSize: 10.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '700',
  },
  logDetailText: {
    fontSize: 11.5,
    color: '#E4E2E0',
    marginTop: 2,
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
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
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsModalTitle: {
    color: '#E0C380',
    fontSize: 17,
    fontWeight: 'bold',
  },
  logsModalSub: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 1,
  },
  logsClearBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logsModalList: {
    padding: 16,
  },
  logsSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
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
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
