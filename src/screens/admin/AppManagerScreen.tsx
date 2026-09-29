import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ImageBackground,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MuIcon } from '../../components/ui/MuIcon';
import * as Clipboard from 'expo-clipboard';
import { useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { Panel, MuCornerOrnaments, MuSideMoldings, MuHeaderBanner, MuButton } from '../../components/ui';
import { SqlClient } from '../../services/database/sqlClient';

interface DeviceItem {
  hwid: string;
  mode: 'DEMO' | 'PRO';
  licenseKey?: string;
  firstSeen: string;
  lastSeen: string;
  totalPings: number;
  ip: string;
  platform?: string;
  appVersion?: string;
  blocked?: boolean;
}

const ADMIN_KEY_STORAGE = '@mumanager_admin_key';
const DEFAULT_ADMIN_KEY = '';

export const AppManagerScreen = () => {
  const navigation = useNavigation<any>();
  const [devices, setDevices] = useState<DeviceItem[]>([]);
  const [filtered, setFiltered] = useState<DeviceItem[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string>(DEFAULT_ADMIN_KEY);
  const [showKeyModal, setShowKeyModal] = useState<boolean>(false);
  const [tempKeyInput, setTempKeyInput] = useState<string>('');

  const fetchDevices = async (keyOverride?: string) => {
    setLoading(true);
    setErrorMessage(null);
    const keyToUse = (keyOverride !== undefined ? keyOverride : adminKey).trim();
    if (!keyToUse) {
      setLoading(false);
      setErrorMessage('Se requiere la clave maestra de administrador.');
      setShowKeyModal(true);
      return;
    }
    try {
      const bridgeUrl = SqlClient.getBridgeUrl();

      const res = await fetch(`${bridgeUrl}/api/admin/devices`, {
        headers: {
          'X-Admin-Key': keyToUse,
        },
      });

      if (res.status === 401) {
        setErrorMessage('Acceso Denegado (401). Clave maestra X-Admin-Key incorrecta.');
        setDevices([]);
        setFiltered([]);
        setShowKeyModal(true);
        return;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data: DeviceItem[] = await res.json();
      setDevices(data);
      applyFilter(search, data);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al conectar con el servidor de telemetría.');
      setDevices([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initKey = async () => {
      try {
        const stored = await SqlClient.getStoredAdminKey();
        const activeKey = stored ? stored.trim() : '';
        await AsyncStorage.removeItem(ADMIN_KEY_STORAGE).catch(() => {});
        setAdminKey(activeKey);
        if (activeKey) {
          fetchDevices(activeKey);
        } else {
          setShowKeyModal(true);
        }
      } catch {
        setShowKeyModal(true);
      }
    };
    initKey();
  }, []);

  const applyFilter = (q: string, list = devices) => {
    if (!q.trim()) {
      setFiltered(list);
      return;
    }
    const clean = q.toLowerCase();
    setFiltered(
      list.filter(
        (d) =>
          d.hwid.toLowerCase().includes(clean) ||
          (d.ip && d.ip.includes(clean)) ||
          d.mode.toLowerCase().includes(clean)
      )
    );
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    applyFilter(text);
  };

  const handleGenerateKey = async (hwid: string) => {
    try {
      const bridgeUrl = SqlClient.getBridgeUrl();

      const res = await fetch(`${bridgeUrl}/api/admin/device/generate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Key': adminKey,
        },
        body: JSON.stringify({ hwid, plan: 'PRO' }),
      });

      if (res.status === 401) {
        Alert.alert('Acceso Denegado', 'Clave de administración incorrecta (401).');
        setShowKeyModal(true);
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Fallo al generar clave');

      await Clipboard.setStringAsync(data.key);
      Alert.alert(
        '¡Clave PRO Generada!',
        `Clave para ${hwid}:\n\n${data.key}\n\n(Copiada automáticamente al portapapeles. Pégala en WhatsApp o Discord a tu cliente).`,
        [{ text: 'Aceptar' }]
      );
      await fetchDevices();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  };

  const handleToggleBlock = async (hwid: string, currentlyBlocked: boolean) => {
    const action = currentlyBlocked ? 'desbloquear' : 'bloquear';
    Alert.alert(
      'Confirmar Acción',
      `¿Deseas ${action} el celular "${hwid}"? ${
        !currentlyBlocked
          ? 'El usuario no podrá usar la app ni en versión PRO ni en DEMO.'
          : 'Se restaurará el acceso.'
      }`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: currentlyBlocked ? 'Desbloquear' : 'Bloquear',
          style: currentlyBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const bridgeUrl = SqlClient.getBridgeUrl();

              const res = await fetch(`${bridgeUrl}/api/admin/device/toggle-block`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Admin-Key': adminKey,
                },
                body: JSON.stringify({ hwid }),
              });

              if (res.status === 401) {
                Alert.alert('Acceso Denegado', 'Clave de administración incorrecta (401).');
                setShowKeyModal(true);
                return;
              }

              const data = await res.json();
              if (!res.ok || !data.success) throw new Error(data.error || 'Fallo al modificar estado');
              Alert.alert('Resultado', `Dispositivo ${data.blocked ? 'bloqueado' : 'desbloqueado'} con éxito.`);
              await fetchDevices();
            } catch (e: any) {
              Alert.alert('Error', e.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Cerrar Consola Admin',
      '¿Deseas cerrar la consola y bloquear el acceso en este dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar y Bloquear',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(ADMIN_KEY_STORAGE);
            setAdminKey('');
            navigation.goBack();
          },
        },
      ]
    );
  };

  const demoCount = devices.filter((d) => d.mode === 'DEMO' && !d.blocked).length;
  const proCount = devices.filter((d) => d.mode === 'PRO' && !d.blocked).length;
  const blockedCount = devices.filter((d) => d.blocked).length;

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={styles.container}
      imageStyle={{ opacity: 0.50 }}
      resizeMode="repeat"
    >
      <MuHeaderBanner
        titulo="MU MANAGER PRO"
        subtitulo="CONTROL DE LICENCIAS Y TELEMETRÍA"
        onBack={() => navigation.goBack()}
        rightAction={{
          icon: 'refresh',
          onPress: () => fetchDevices(),
        }}
      />

      {/* 4 KPI Metrics */}
      <View style={styles.kpiRow}>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: THEME.colors.primaryOrange }]}>{devices.length}</Text>
          <Text style={styles.kpiLabel}>Total Celulares</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: '#FFB300' }]}>{demoCount}</Text>
          <Text style={styles.kpiLabel}>En DEMO</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: THEME.colors.accentGreenBright }]}>{proCount}</Text>
          <Text style={styles.kpiLabel}>En PRO</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={[styles.kpiValue, { color: THEME.colors.brasa }]}>{blockedCount}</Text>
          <Text style={styles.kpiLabel}>Bloqueados</Text>
        </View>
      </View>

      {/* Search Input & Admin Key Button */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <MuIcon name="magnify" size={20} color={THEME.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por HWID, IP o modo..."
            placeholderTextColor={THEME.colors.textMuted}
            value={search}
            onChangeText={handleSearch}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity
          style={{ width: 48, height: 48, borderRadius: 2, overflow: 'hidden' }}
          onPress={() => {
            setTempKeyInput(adminKey);
            setShowKeyModal(true);
          }}
          activeOpacity={0.7}
        >
          <ImageBackground
            source={STITCH_ASSETS.buttons.small}
            style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}
            resizeMode="stretch"
          >
            <MuIcon name="shield-key" size={20} color={THEME.colors.primaryOrange} />
          </ImageBackground>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ width: 48, height: 48, borderRadius: 2, overflow: 'hidden' }}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <ImageBackground
            source={STITCH_ASSETS.buttons.small}
            style={{ width: 48, height: 48, justifyContent: 'center', alignItems: 'center' }}
            resizeMode="stretch"
          >
            <MuIcon name="lock-reset" size={20} color={THEME.colors.dangerRed} />
          </ImageBackground>
        </TouchableOpacity>
      </View>

      {/* Error Card */}
      {errorMessage && (
        <View style={styles.errorCard}>
          <MuIcon name="alert-circle-outline" size={20} color={THEME.colors.brasa} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.errorTitle}>Servidor de Telemetría no responde</Text>
            <Text style={styles.errorSub}>{errorMessage}</Text>
          </View>
          <TouchableOpacity
            onPress={() => fetchDevices()}
            style={{ borderRadius: 2, overflow: 'hidden' }}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={{ paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
              resizeMode="stretch"
            >
              <Text style={[styles.retryText, { color: '#E2703A' }]}>Reintentar</Text>
            </ImageBackground>
          </TouchableOpacity>
        </View>
      )}

      {/* Devices List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.hwid}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchDevices()}
            tintColor={THEME.colors.primaryOrange}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MuIcon name="cellphone-wireless" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyText}>
                {errorMessage
                  ? 'No se pudieron consultar los celulares.'
                  : 'Aún no hay celulares detectados. Abre la app en cualquier celular para verlo aparecer aquí.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const isBlocked = !!item.blocked;
          const isPro = item.mode === 'PRO';

          return (
            <Panel variant="box" style={[styles.deviceCard, isBlocked && styles.cardBlocked]}>
              <MuCornerOrnaments size={10} />
              <View style={styles.cardTop}>
                <View style={styles.deviceInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MuIcon
                      name={isBlocked ? 'cellphone-lock' : 'cellphone'}
                      size={20}
                      color={isBlocked ? THEME.colors.brasa : isPro ? THEME.colors.jade : THEME.colors.amber}
                    />
                    <Text style={styles.hwidText}>{item.hwid}</Text>
                  </View>
                  <Text style={styles.metaText}>
                    IP: {item.ip || 'Desconocida'} • Visto: {new Date(item.lastSeen).toLocaleTimeString()} ({item.totalPings || 1} accesos)
                  </Text>
                </View>

                {/* Status Badge */}
                <View
                  style={[
                    styles.modeBadge,
                    isBlocked
                      ? styles.badgeBlocked
                      : isPro
                      ? styles.badgePro
                      : styles.badgeDemo,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeBadgeText,
                      isBlocked
                        ? { color: THEME.colors.brasa }
                        : isPro
                        ? { color: THEME.colors.jade }
                        : { color: THEME.colors.amber },
                    ]}
                  >
                    {isBlocked ? 'BLOQUEADO' : item.mode}
                  </Text>
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.cardBottom}>
                <View style={{ flex: 1.2 }}>
                  <MuButton
                    titulo="Generar Clave PRO"
                    icono="key-plus"
                    variante="primary"
                    onPress={() => handleGenerateKey(item.hwid)}
                    compacto={true}
                    altura={36}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo={isBlocked ? 'Desbloquear' : 'Bloquear'}
                    icono={isBlocked ? 'shield-check' : 'shield-remove'}
                    variante={isBlocked ? 'success' : 'danger'}
                    onPress={() => handleToggleBlock(item.hwid, isBlocked)}
                    compacto={true}
                    altura={36}
                  />
                </View>
              </View>
            </Panel>
          );
        }}
      />

      <Modal visible={showKeyModal} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <Panel variant="box" style={styles.modalContent}>
            <MuCornerOrnaments size={12} />
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
              <View style={styles.modalHeader}>
                <MuIcon name="shield-key" size={24} color={THEME.colors.primaryOrange} />
                <Text style={styles.modalTitle}>Clave Maestra de Pasarela</Text>
              </View>
              <Text style={styles.modalDesc}>
                Ingresa la clave (X-Admin-Key) para autenticar las operaciones administrativas contra la pasarela cloud:
              </Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Introduce tu clave maestra..."
                placeholderTextColor={THEME.colors.textMuted}
                value={tempKeyInput}
                onChangeText={setTempKeyInput}
                secureTextEntry
                autoCapitalize="none"
              />
              <View style={styles.modalButtons}>
                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Cancelar"
                    variante="secondary"
                    onPress={() => {
                      setShowKeyModal(false);
                      if (!adminKey) {
                        navigation.goBack();
                      }
                    }}
                    altura={44}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Guardar"
                    variante="primary"
                    onPress={async () => {
                      const newKey = tempKeyInput.trim();
                      if (!newKey) {
                        Alert.alert('Error', 'La clave no puede estar vacía');
                        return;
                      }
                      setAdminKey(newKey);
                      await SqlClient.setStoredAdminKey(newKey);
                      await AsyncStorage.removeItem(ADMIN_KEY_STORAGE).catch(() => {});
                      setShowKeyModal(false);
                      fetchDevices(newKey);
                    }}
                    altura={44}
                  />
                </View>
              </View>
            </ScrollView>
          </Panel>
        </KeyboardAvoidingView>
      </Modal>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    gap: 8,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: THEME.colors.card,
    borderRadius: THEME.borderRadius.md,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
  },
  kpiLabel: {
    fontSize: 9,
    color: THEME.colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    paddingHorizontal: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    height: 48,
  },
  keyBtn: {
    width: 48,
    height: 48,
    backgroundColor: '#292A29',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.texto,
    marginLeft: 8,
    fontSize: 13,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 112, 58, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(226, 112, 58, 0.3)',
    marginHorizontal: THEME.spacing.md,
    marginTop: THEME.spacing.sm,
    padding: 12,
    borderRadius: 2,
  },
  errorTitle: {
    color: THEME.colors.brasa,
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorSub: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: 'rgba(226, 112, 58, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 2,
  },
  retryText: {
    color: THEME.colors.brasa,
    fontSize: 11,
    fontWeight: 'bold',
  },
  list: {
    padding: THEME.spacing.md,
    paddingBottom: 120,
  },
  deviceCard: {
    marginBottom: 10,
  },
  cardBlocked: {
    borderColor: 'rgba(226, 112, 58, 0.6)',
    backgroundColor: 'rgba(226, 112, 58, 0.08)',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deviceInfo: {
    flex: 1,
    marginRight: 8,
  },
  hwidText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontMono,
    color: THEME.colors.texto,
  },
  metaText: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginTop: 4,
  },
  modeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
  },
  badgeDemo: {
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    borderColor: THEME.colors.oro,
  },
  badgePro: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderColor: THEME.colors.jade,
  },
  badgeBlocked: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderColor: THEME.colors.brasa,
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
  },
  cardBottom: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
    paddingTop: 10,
  },
  actionBtnKey: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.oro,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: THEME.shapes.radioEsquina,
  },
  actionBtnKeyText: {
    color: THEME.colors.textoOscuro,
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBtnBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 48,
    borderRadius: 2,
    borderWidth: 1,
  },
  btnBlockInactive: {
    backgroundColor: 'rgba(226, 112, 58, 0.12)',
    borderColor: THEME.colors.brasa,
  },
  btnBlockActive: {
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    borderColor: THEME.colors.jade,
  },
  actionBtnBlockText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oroClaro,
    ...THEME.effects.textShadow,
  },
  modalDesc: {
    fontSize: 13,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    marginBottom: 16,
    lineHeight: 18,
    ...THEME.effects.textShadowSubtle,
  },
  modalInput: {
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: 2,
    color: THEME.colors.texto,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 48,
    marginBottom: 20,
    fontFamily: THEME.typography.fontMono,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtnCancel: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  modalBtnCancelText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
  modalBtnSave: {
    backgroundColor: THEME.colors.oroClaro,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: THEME.shapes.radioEsquina,
  },
  modalBtnSaveText: {
    color: THEME.colors.textoOscuro,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
