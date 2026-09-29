import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  Image,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../../../components/common/GothicAlert';
import { MuIcon } from '../../../components/ui/MuIcon';
import { THEME } from '../../../constants/theme';
import { STITCH_ASSETS } from '../../../constants/stitchAssets';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { AutocompleteInput } from '../../../components/common/AutocompleteInput';
import { ItemImage } from '../../../components/common/ItemImage';
import { Panel, MuButton } from '../../../components/ui';
import { MuCornerOrnaments } from '../../../components/ui/MuCornerOrnaments';
import { SqlClient } from '../../../services/database/sqlClient';
import { JewelAuditResult, JewelPurgeResult } from '../../../types/admin';
import { DEFAULT_ITEM_CATALOG } from '../../../services/parser/itemDatabase';
import { JEWEL_ASSET_IMAGES, getJewelImageByGroupIndex } from '../../../constants/jewelAssets';

interface JewelsTabProps {
  fixesCharSuggestions?: string[];
  fixesAccountSuggestions?: string[];
  catalogSuggestions?: string[];
}

export const JewelsTab: React.FC<JewelsTabProps> = ({
  fixesCharSuggestions = [],
  fixesAccountSuggestions = [],
  catalogSuggestions = [],
}) => {
  const JEWEL_PRESETS = useMemo(() => [
    { id: 'all_jewels', label: 'Todas las Joyas', icon: 'diamond-stone', color: '#E0C380' },
    { id: 'bless', label: 'Bless', group: 14, index: 13, icon: 'diamond', color: '#3FCF8E' },
    { id: 'soul', label: 'Soul', group: 14, index: 14, icon: 'diamond', color: '#5B8DEF' },
    { id: 'chaos', label: 'Chaos', group: 12, index: 15, icon: 'fire', color: '#E2703A' },
    { id: 'life', label: 'Life', group: 14, index: 16, icon: 'heart', color: '#E0C380' },
    { id: 'creation', label: 'Creation', group: 14, index: 22, icon: 'leaf', color: '#3FCF8E' },
    { id: 'harmony', label: 'Harmony', group: 14, index: 42, icon: 'star', color: '#EFD28D' },
    { id: 'guardian', label: 'Guardian', group: 14, index: 31, icon: 'shield', color: '#CDC6B9' },
    { id: 'gemstone', label: 'Gemstone', group: 14, index: 41, icon: 'gift', color: '#5B8DEF' },
    { id: 'custom_jewels', label: 'Joyas Custom', icon: 'crown', color: '#E0C380' },
    { id: 'all_items', label: 'Cualquier Ítem', icon: 'cube-outline', color: '#CDC6B9' },
  ], []);

  const [jewelScope, setJewelScope] = useState<'all' | 'character' | 'account'>('all');
  const [jewelTargetName, setJewelTargetName] = useState<string>('');
  const [jewelFilterType, setJewelFilterType] = useState<string>('all_jewels');
  const [jewelSpecificName, setJewelSpecificName] = useState<string>('');
  const [jewelIncInventory, setJewelIncInventory] = useState<boolean>(true);
  const [jewelIncWarehouse, setJewelIncWarehouse] = useState<boolean>(true);
  const [jewelIncExtWarehouse, setJewelIncExtWarehouse] = useState<boolean>(true);
  const [jewelProtectEquipment, setJewelProtectEquipment] = useState<boolean>(true);
  const [jewelSkipOnline, setJewelSkipOnline] = useState<boolean>(true);

  const [jewelActionMode, setJewelActionMode] = useState<'audit' | 'purge_all' | 'cap_target' | 'cap_server'>('audit');
  const [jewelCapAmount, setJewelCapAmount] = useState<string>('50');
  const [jewelCountBy, setJewelCountBy] = useState<'slots' | 'units'>('units');

  const [isAuditingJewels, setIsAuditingJewels] = useState<boolean>(false);
  const [isPurgingJewels, setIsPurgingJewels] = useState<boolean>(false);
  const [jewelAuditResult, setJewelAuditResult] = useState<JewelAuditResult | null>(null);
  const [jewelPurgeResult, setJewelPurgeResult] = useState<JewelPurgeResult | null>(null);

  const [showJewelConfirmModal, setShowJewelConfirmModal] = useState<boolean>(false);
  const [jewelConfirmText, setJewelConfirmText] = useState<string>('');

  const getSelectedJewelFilterParams = () => {
    let itemFilter: 'all_jewels' | 'custom_jewels' | 'specific' | 'all_items' = 'all_jewels';
    let specificGroup: number | undefined;
    let specificIndex: number | undefined;

    if (jewelFilterType === 'all_jewels') {
      itemFilter = 'all_jewels';
    } else if (jewelFilterType === 'custom_jewels') {
      itemFilter = 'custom_jewels';
    } else if (jewelFilterType === 'all_items') {
      itemFilter = 'all_items';
    } else {
      itemFilter = 'specific';
      const preset = JEWEL_PRESETS.find((p) => p.id === jewelFilterType);
      if (preset && preset.group !== undefined && preset.index !== undefined) {
        specificGroup = preset.group;
        specificIndex = preset.index;
      } else if (jewelSpecificName.trim()) {
        const found = DEFAULT_ITEM_CATALOG.find(
          (i) => i.name.toLowerCase() === jewelSpecificName.trim().toLowerCase()
        );
        if (found) {
          specificGroup = found.group;
          specificIndex = found.index;
        }
      }
    }
    return { itemFilter, specificGroup, specificIndex };
  };

  const handleAuditJewels = async () => {
    if (jewelScope !== 'all' && !jewelTargetName.trim()) {
      Alert.alert('Campo Requerido', `Por favor especifica el ${jewelScope === 'character' ? 'personaje' : 'usuario/cuenta'} para auditar.`);
      return;
    }
    const { itemFilter, specificGroup, specificIndex } = getSelectedJewelFilterParams();
    try {
      setIsAuditingJewels(true);
      const res = await SqlClient.auditJewels({
        targetScope: jewelScope,
        targetName: jewelTargetName.trim(),
        itemFilter,
        specificGroup,
        specificIndex,
        includeInventory: jewelIncInventory,
        includeWarehouse: jewelIncWarehouse,
        includeExtWarehouse: jewelIncExtWarehouse,
        protectEquipment: jewelProtectEquipment,
      });
      if (res.success) {
        setJewelAuditResult(res);
        setJewelPurgeResult(null);
        if (res.totalSlots === 0) {
          Alert.alert('Auditoría', 'No se encontraron joyas o ítems que coincidan con los filtros especificados.');
        }
      } else {
        Alert.alert('Error', res.message || 'No se pudo completar la auditoría');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsAuditingJewels(false);
    }
  };

  const handleExecutePurgeAction = async (isDryRunParam: boolean) => {
    if (jewelScope !== 'all' && !jewelTargetName.trim()) {
      Alert.alert('Campo Requerido', `Por favor especifica el ${jewelScope === 'character' ? 'personaje' : 'usuario/cuenta'}.`);
      return;
    }

    const { itemFilter, specificGroup, specificIndex } = getSelectedJewelFilterParams();
    const action = jewelActionMode === 'cap_target' ? 'cap_per_target' : jewelActionMode === 'cap_server' ? 'cap_server_wide' : 'purge_all';
    const maxAmount = parseInt(jewelCapAmount, 10) || 0;

    try {
      setIsPurgingJewels(true);
      const res = await SqlClient.purgeJewels({
        targetScope: jewelScope,
        targetName: jewelTargetName.trim(),
        itemFilter,
        specificGroup,
        specificIndex,
        action,
        maxAmount,
        countBy: jewelCountBy,
        includeInventory: jewelIncInventory,
        includeWarehouse: jewelIncWarehouse,
        includeExtWarehouse: jewelIncExtWarehouse,
        protectEquipment: jewelProtectEquipment,
        skipOnline: jewelSkipOnline,
        dryRun: isDryRunParam,
      });

      if (res.success) {
        setJewelPurgeResult(res);
        setShowJewelConfirmModal(false);
        setJewelConfirmText('');
        if (!isDryRunParam) {
          handleAuditJewels();
        }
        Alert.alert(
          isDryRunParam ? 'Simulación Completada' : 'Depuración Exitosa',
          res.message + (res.skippedOnlineCount > 0 ? `\n\n[SEGURIDAD] Se protegieron ${res.skippedOnlineCount} cuentas conectadas al juego.` : '')
        );
      } else {
        Alert.alert('Error', res.message || 'Error al procesar depuración');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsPurgingJewels(false);
    }
  };

  return (
    <ErrorBoundary tabName="Joyas">
      <View style={styles.tabContent}>
        {/* Tarjeta de Configuración de Filtros */}
        <Panel tipo="gold" conEsquineros={true} style={[styles.card, { zIndex: 10 }]}>
          <View style={styles.cardHeader}>
            <MuIcon name="diamond-stone" size={24} color={THEME.colors.oroClaro} />
            <Text style={styles.cardTitle}>
              Gestor & Depurador de Joyas
            </Text>
          </View>
          <Text style={styles.cardDesc}>
            Audita la economía de joyas o depura excedentes en inventarios y baúles con máxima seguridad SQL.
          </Text>

          {/* 1. Selector de Ámbito */}
          <Text style={[styles.label, { marginTop: 10 }]}>1. Ámbito de Búsqueda:</Text>
          <View style={styles.pillsRow}>
            {(['all', 'character', 'account'] as const).map((sc) => {
              const isScActive = jewelScope === sc;
              return (
                <TouchableOpacity
                  key={`jewel_scope_${sc}`}
                  style={{ borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setJewelScope(sc)}
                >
                  <ImageBackground
                    source={isScActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={[styles.filterPillText, isScActive ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }]}>
                      {sc === 'all' ? '[TODO] Servidor Completo' : sc === 'character' ? '[PJ] Por Personaje' : '[CUENTA] Por Cuenta'}
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Input de Personaje / Cuenta si no es 'all' */}
          {jewelScope !== 'all' && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>
                {jewelScope === 'character' ? 'Nombre del Personaje:' : 'Usuario / AccountID:'}
              </Text>
              <AutocompleteInput
                value={jewelTargetName}
                onChangeText={setJewelTargetName}
                suggestions={jewelScope === 'character' ? fixesCharSuggestions : fixesAccountSuggestions}
                placeholder={jewelScope === 'character' ? 'Ej: PETERETE' : 'Ej: cris'}
                icon={jewelScope === 'character' ? 'account' : 'account-box'}
                maxSuggestions={5}
                autoCapitalize="none"
              />
            </View>
          )}

          {/* 2. Selector de Ubicaciones */}
          <Text style={[styles.label, { marginTop: 14 }]}>2. Ubicaciones a Incluir:</Text>
          <View style={styles.wrapRow}>
            <TouchableOpacity
              style={{ borderRadius: 2, overflow: 'hidden' }}
              onPress={() => setJewelIncInventory(!jewelIncInventory)}
            >
              <ImageBackground
                source={jewelIncInventory ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}
                resizeMode="stretch"
              >
                <MuIcon
                  name={jewelIncInventory ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={16}
                  color={jewelIncInventory ? '#FEDF99' : THEME.colors.textoSecundario}
                />
                <Text style={[styles.filterPillText, jewelIncInventory ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }, { marginLeft: 4 }]}>
                  Inventarios
                </Text>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ borderRadius: 2, overflow: 'hidden' }}
              onPress={() => setJewelIncWarehouse(!jewelIncWarehouse)}
            >
              <ImageBackground
                source={jewelIncWarehouse ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}
                resizeMode="stretch"
              >
                <MuIcon
                  name={jewelIncWarehouse ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={16}
                  color={jewelIncWarehouse ? '#FEDF99' : THEME.colors.textoSecundario}
                />
                <Text style={[styles.filterPillText, jewelIncWarehouse ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }, { marginLeft: 4 }]}>
                  Baúl Principal (0)
                </Text>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ borderRadius: 2, overflow: 'hidden' }}
              onPress={() => setJewelIncExtWarehouse(!jewelIncExtWarehouse)}
            >
              <ImageBackground
                source={jewelIncExtWarehouse ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}
                resizeMode="stretch"
              >
                <MuIcon
                  name={jewelIncExtWarehouse ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={16}
                  color={jewelIncExtWarehouse ? '#FEDF99' : THEME.colors.textoSecundario}
                />
                <Text style={[styles.filterPillText, jewelIncExtWarehouse ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }, { marginLeft: 4 }]}>
                  Baúles Ext (1..N)
                </Text>
              </ImageBackground>
            </TouchableOpacity>
          </View>

          {/* 3. Selección de Joya / Ítem */}
          <Text style={[styles.label, { marginTop: 14 }]}>3. Joya o Ítem Objetivo:</Text>
          <View style={styles.wrapRow}>
            {JEWEL_PRESETS.map((preset) => {
              const isSelected = jewelFilterType === preset.id;
              const jewelImg = preset.group !== undefined && preset.index !== undefined
                ? getJewelImageByGroupIndex(preset.group, preset.index)
                : null;
              return (
                <TouchableOpacity
                  key={`preset_${preset.id}`}
                  style={{ borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setJewelFilterType(preset.id)}
                >
                  <ImageBackground
                    source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6 }}
                    resizeMode="stretch"
                  >
                    {jewelImg ? (
                      <Image source={jewelImg} style={{ width: 16, height: 16, marginRight: 6 }} resizeMode="contain" />
                    ) : (
                      <MuIcon name={preset.icon as any} size={15} color={isSelected ? '#FEDF99' : preset.color} style={{ marginRight: 4 }} />
                    )}
                    <Text style={[styles.filterPillText, isSelected ? { color: '#FEDF99', fontWeight: 'bold' } : { color: preset.color }]}>
                      {preset.label}
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Si se selecciona 'Cualquier Ítem' */}
          {jewelFilterType === 'all_items' && (
            <View style={{ marginTop: 10 }}>
              <Text style={styles.label}>Buscar Ítem Específico por Nombre (Opcional):</Text>
              <AutocompleteInput
                value={jewelSpecificName}
                onChangeText={setJewelSpecificName}
                suggestions={catalogSuggestions}
                placeholder="Ej: Scroll of Blood Castle o dejar vacío para todo"
                icon="magnify"
                maxSuggestions={5}
              />
            </View>
          )}

          {/* 4. Protecciones de Seguridad */}
          <Text style={[styles.label, { marginTop: 14 }]}>4. Protecciones de Seguridad SQL:</Text>
          <View style={{ gap: 8, marginTop: 4 }}>
            <TouchableOpacity
              style={[styles.shieldCheckRow, jewelProtectEquipment && styles.shieldCheckRowActive]}
              onPress={() => setJewelProtectEquipment(!jewelProtectEquipment)}
            >
              <MuIcon
                name={jewelProtectEquipment ? 'shield-check' : 'shield-alert-outline'}
                size={20}
                color={jewelProtectEquipment ? THEME.colors.jade : THEME.colors.brasa}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.shieldCheckTitle, jewelProtectEquipment && { color: THEME.colors.jade }]}>
                  Proteger Equipamiento Puesto (Slots 0 al 11)
                </Text>
                <Text style={styles.shieldCheckDesc}>
                  Evita tocar armas, alas, pendientes o armaduras puestas en el cuerpo del personaje.
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.shieldCheckRow, jewelSkipOnline && styles.shieldCheckRowActive]}
              onPress={() => setJewelSkipOnline(!jewelSkipOnline)}
            >
              <MuIcon
                name={jewelSkipOnline ? 'account-lock' : 'account-alert'}
                size={20}
                color={jewelSkipOnline ? THEME.colors.jade : THEME.colors.brasa}
              />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.shieldCheckTitle, jewelSkipOnline && { color: THEME.colors.jade }]}>
                  Omitir Cuentas Conectadas al Juego (Anti-Rollback RAM)
                </Text>
                <Text style={styles.shieldCheckDesc}>
                  Las cuentas online son protegidas para que el GameServer no sobreescriba datos de la RAM.
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* 5. Selector de Acción: Auditoría o Depuración */}
          <Text style={[styles.label, { marginTop: 16 }]}>5. Operación a Ejecutar:</Text>
          <View style={styles.pillsRow}>
            {[
              { id: 'audit', label: '[AUDITAR] Solo Auditar' },
              { id: 'cap_target', label: '[TOPE] Por PJ / Baúl' },
              { id: 'cap_server', label: '[TOPE] Servidor' },
              { id: 'purge_all', label: '[DEPURAR] Depurar Todo' },
            ].map((act) => {
              const isActActive = jewelActionMode === act.id;
              return (
                <TouchableOpacity
                  key={`jewel_act_${act.id}`}
                  style={{ borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setJewelActionMode(act.id as any)}
                >
                  <ImageBackground
                    source={isActActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={[styles.filterPillText, isActActive ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }]}>
                      {act.label}
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Campos adicionales para capping */}
          {(jewelActionMode === 'cap_target' || jewelActionMode === 'cap_server') && (
            <View style={styles.capSettingsBox}>
              <Text style={styles.label}>
                {jewelActionMode === 'cap_server'
                  ? 'Tope Máximo Global en Todo el Servidor:'
                  : 'Tope Máximo a Dejar por Personaje / Baúl:'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginTop: 4 }}>
                <TextInput
                  style={[styles.textInput, { width: 100, textAlign: 'center', fontWeight: 'bold' }]}
                  keyboardType="numeric"
                  value={jewelCapAmount}
                  onChangeText={setJewelCapAmount}
                  placeholder="50"
                  placeholderTextColor={THEME.colors.textMuted}
                />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['5', '20', '50', '100'] as const).map((presetAmt) => {
                    const isAmtActive = jewelCapAmount === presetAmt;
                    return (
                      <TouchableOpacity
                        key={`amt_p_${presetAmt}`}
                        style={{ borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setJewelCapAmount(presetAmt)}
                      >
                        <ImageBackground
                          source={isAmtActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{ paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={[styles.filterPillText, isAmtActive ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }]}>
                            {presetAmt}
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 10 }]}>Contar por:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setJewelCountBy('units')}
                >
                  <ImageBackground
                    source={jewelCountBy === 'units' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={[styles.filterPillText, jewelCountBy === 'units' ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }]}>
                      Unidades Reales (Desempaqueta Bundles x10, x20, x30)
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setJewelCountBy('slots')}
                >
                  <ImageBackground
                    source={jewelCountBy === 'slots' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={[styles.filterPillText, jewelCountBy === 'slots' ? { color: '#FEDF99', fontWeight: 'bold' } : { color: THEME.colors.textoSecundarioLuminoso }]}>
                      Slots Físicos (1 slot = 1 unidad)
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Botones de Ejecución */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
            <View style={{ flex: 1 }}>
              <MuButton
                titulo="Auditar / Censar"
                icono="chart-bar"
                variante="primary"
                onPress={handleAuditJewels}
                cargando={isAuditingJewels}
                disabled={isAuditingJewels}
                altura={44}
              />
            </View>

            {jewelActionMode !== 'audit' && (
              <View style={{ flex: 1 }}>
                <MuButton
                  titulo="Simular (Test)"
                  icono="test-tube"
                  variante="secondary"
                  onPress={() => handleExecutePurgeAction(true)}
                  cargando={isPurgingJewels}
                  disabled={isPurgingJewels}
                  altura={44}
                />
              </View>
            )}

            {jewelActionMode !== 'audit' && (
              <View style={{ flex: 1.2 }}>
                <MuButton
                  titulo={jewelActionMode === 'purge_all' ? 'Depurar Todo' : 'Aplicar Tope'}
                  icono="fire"
                  variante="danger"
                  onPress={() => setShowJewelConfirmModal(true)}
                  disabled={isPurgingJewels}
                  altura={44}
                />
              </View>
            )}
          </View>
        </Panel>

        {/* Resultados de la Auditoría */}
        {jewelAuditResult && (
          <Panel tipo="gold" conEsquineros={true} style={styles.resultsCard}>
            <Text style={styles.cardTitle}>Resultados del Censo de Joyas / Ítems</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeLabel}>Stock Total Encontrado:</Text>
              <Text style={styles.totalBadgeValue}>
                {jewelAuditResult.totalUnits.toLocaleString()} unidades
              </Text>
              <Text style={styles.totalBadgeSub}>
                ({jewelAuditResult.totalSlots} slots)
              </Text>
            </View>

            {/* Desglose por tipo */}
            {jewelAuditResult.summaryByType.length > 0 ? (
              <View style={{ marginTop: 12 }}>
                <Text style={styles.label}>Desglose por Tipo de Joya:</Text>
                <View style={styles.wrapRow}>
                  {jewelAuditResult.summaryByType.map((tItem) => {
                    const jewelImg = tItem.group !== undefined && tItem.index !== undefined
                      ? getJewelImageByGroupIndex(tItem.group, tItem.index)
                      : null;
                    return (
                      <View key={`sum_${tItem.id}`} style={styles.typeItemPill}>
                        {jewelImg ? (
                          <Image source={jewelImg} style={{ width: 22, height: 22 }} resizeMode="contain" />
                        ) : (
                          <ItemImage itemName={tItem.name} size={22} fallbackIcon={tItem.icon} fallbackColor={THEME.colors.oroClaro} />
                        )}
                        <View style={{ marginLeft: 6 }}>
                          <Text style={styles.typeItemName}>{tItem.name}:</Text>
                          <Text style={styles.typeItemCount}>
                            {tItem.totalUnits.toLocaleString()} u. ({tItem.totalSlots} slots)
                          </Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

            {/* Top Propietarios */}
            {jewelAuditResult.owners.length > 0 && (
              <View style={{ marginTop: 14 }}>
                <Text style={styles.label}>
                  Distribución por Jugadores / Baúles ({jewelAuditResult.owners.length}):
                </Text>
                {jewelAuditResult.owners.slice(0, 15).map((ow, oIdx) => (
                  <View key={`owner_${ow.ownerKey}_${oIdx}`} style={styles.ownerRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.ownerName}>
                        {ow.charName ? `PJ: ${ow.charName}` : `Cuenta: ${ow.accountId}`}
                      </Text>
                      <Text style={styles.ownerSub}>
                        {ow.location} • Cuenta: {ow.accountId} {ow.isOnline && '• 🟢 ONLINE'}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.ownerUnits}>{ow.unitsCount.toLocaleString()} unidades</Text>
                      <Text style={styles.ownerSlots}>({ow.slotsCount} slots)</Text>
                    </View>
                  </View>
                ))}
                {jewelAuditResult.owners.length > 15 && (
                  <Text style={styles.moreOwnersText}>
                    ... y {jewelAuditResult.owners.length - 15} ubicaciones más.
                  </Text>
                )}
              </View>
            )}
          </Panel>
        )}

        {/* Modal de Confirmación de Purga SQL */}
        <Modal
          visible={showJewelConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowJewelConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Panel tipo="gold" conEsquineros={true} style={[styles.modalContent, { maxWidth: 420, maxHeight: '90%' }]}>
              <ScrollView nestedScrollEnabled>
                <View style={styles.modalHeader}>
                  <MuIcon name="alert-octagon" size={26} color={THEME.colors.brasa} />
                  <Text style={styles.modalTitle}>
                    Confirmar Depuración SQL
                  </Text>
                </View>

                <Text style={styles.modalWarningText}>
                  Estás a punto de modificar directamente la base de datos SQL Server.
                </Text>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryTitle}>Resumen de Operación:</Text>
                  <Text style={styles.summaryText}>
                    • Acción: {jewelActionMode === 'purge_all' ? 'Vaciar / Eliminar 100%' : jewelActionMode === 'cap_server' ? `Dejar hasta ${jewelCapAmount} en todo el server` : `Dejar hasta ${jewelCapAmount} por PJ/Baúl`}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Ámbito: {jewelScope === 'all' ? 'Todo el Servidor' : jewelScope === 'character' ? `Personaje '${jewelTargetName}'` : `Cuenta '${jewelTargetName}'`}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Joya: {JEWEL_PRESETS.find(p => p.id === jewelFilterType)?.label || jewelFilterType}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Equipo equipado: {jewelProtectEquipment ? '🛡️ Protegido' : '⚠️ No protegido'}
                  </Text>
                  <Text style={styles.summaryText}>
                    • Cuentas Online: {jewelSkipOnline ? '🛡️ Omitidas (Protegidas)' : '⚠️ Incluidas'}
                  </Text>
                </View>

                <Text style={styles.confirmPromptText}>
                  Para proceder, escribe <Text style={{ color: THEME.colors.oroClaro, fontWeight: 'bold' }}>DEPURAR</Text> en el recuadro inferior:
                </Text>

                <TextInput
                  style={styles.confirmInput}
                  value={jewelConfirmText}
                  onChangeText={setJewelConfirmText}
                  placeholder="Escribe DEPURAR para confirmar"
                  placeholderTextColor={THEME.colors.textMuted}
                  autoCapitalize="characters"
                />

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <View style={{ flex: 1 }}>
                    <MuButton
                      titulo="Cancelar"
                      variante="secondary"
                      onPress={() => {
                        setShowJewelConfirmModal(false);
                        setJewelConfirmText('');
                      }}
                      altura={44}
                    />
                  </View>

                  <View style={{ flex: 1.4 }}>
                    <MuButton
                      titulo="Confirmar Purga"
                      icono="fire"
                      variante="danger"
                      onPress={() => handleExecutePurgeAction(false)}
                      cargando={isPurgingJewels}
                      disabled={jewelConfirmText.trim().toUpperCase() !== 'DEPURAR' || isPurgingJewels}
                      altura={44}
                    />
                  </View>
                </View>
              </ScrollView>
            </Panel>
          </View>
        </Modal>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    marginLeft: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  cardDesc: {
    fontSize: 12.5,
    fontWeight: '500',
    color: THEME.colors.textoSecundarioLuminoso,
    marginBottom: 12,
    lineHeight: 18,
    ...THEME.effects.textShadowSubtle,
  },
  label: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.texto,
    marginBottom: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  filterPillActive: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  filterPillText: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  filterPillTextActive: {
    color: '#EFD28D',
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  shieldCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#111211',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#3A3C38',
    borderLeftColor: '#3A3C38',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  shieldCheckRowActive: {
    borderTopColor: '#3FCF8E',
    borderLeftColor: '#3FCF8E',
    borderRightColor: '#1E5A3E',
    borderBottomColor: '#1E5A3E',
    backgroundColor: 'rgba(63, 207, 142, 0.08)',
  },
  shieldCheckTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.texto,
  },
  shieldCheckDesc: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    marginTop: 2,
  },
  capSettingsBox: {
    backgroundColor: '#0F100F',
    padding: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#3A3C38',
    borderLeftColor: '#3A3C38',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    borderRadius: 2,
    color: THEME.colors.texto,
    fontSize: 13,
    paddingHorizontal: 10,
    height: 40,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    borderRadius: 2,
    minHeight: 48,
    height: 48,
  },
  searchBtnText: {
    color: '#EFD28D',
    fontSize: 13,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  scanDupesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#221515',
    borderWidth: 1,
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
    borderRadius: 2,
    minHeight: 48,
    height: 48,
  },
  scanDupesBtnText: {
    color: '#E2703A',
    fontSize: 13,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#26221A',
    borderWidth: 1.5,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    borderRadius: 2,
    minHeight: 48,
    height: 48,
  },
  purgeBtnText: {
    color: '#EFD28D',
    fontSize: 13,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  resultsCard: {
    marginBottom: 12,
  },
  totalBadge: {
    alignItems: 'center',
    backgroundColor: '#090A09',
    padding: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    marginVertical: 10,
  },
  totalBadgeLabel: {
    fontSize: 12,
    color: THEME.colors.textoSecundario,
  },
  totalBadgeValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.oroClaro,
    marginTop: 2,
  },
  totalBadgeSub: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginTop: 1,
  },
  typeItemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#111211',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#3A3C38',
    borderLeftColor: '#3A3C38',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  typeItemName: {
    fontSize: 11,
    color: THEME.colors.texto,
    fontWeight: '600',
  },
  typeItemCount: {
    fontSize: 11,
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
  },
  typeItemSlots: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
  },
  ownerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  ownerName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.texto,
  },
  ownerSub: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    marginTop: 2,
  },
  ownerUnits: {
    fontSize: 12,
    fontWeight: 'bold',
    color: THEME.colors.oroClaro,
  },
  ownerSlots: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
  },
  moreOwnersText: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.brasa,
    marginLeft: 8,
  },
  modalWarningText: {
    color: THEME.colors.texto,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  summaryBox: {
    backgroundColor: '#090A09',
    padding: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#4A463F',
    borderBottomColor: '#4A463F',
    marginBottom: 12,
  },
  summaryTitle: {
    color: THEME.colors.oroClaro,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 2,
  },
  confirmPromptText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginBottom: 14,
  },
  confirmInput: {
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    borderRadius: 2,
    color: THEME.colors.texto,
    height: 44,
    paddingHorizontal: 10,
    marginBottom: 16,
    fontSize: 13,
  },
});
