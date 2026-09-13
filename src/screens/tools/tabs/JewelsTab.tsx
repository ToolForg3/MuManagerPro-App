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
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { AutocompleteInput } from '../../../components/common/AutocompleteInput';
import { ItemImage } from '../../../components/common/ItemImage';
import { SqlClient } from '../../../services/database/sqlClient';
import { JewelAuditResult, JewelPurgeResult } from '../../../types/admin';
import { DEFAULT_ITEM_CATALOG } from '../../../services/parser/itemDatabase';

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
    { id: 'all_jewels', label: 'Todas las Joyas', icon: 'diamond-stone', color: '#E8C86A' },
    { id: 'bless', label: 'Bless', group: 14, index: 13, icon: 'diamond', color: '#3FCF8E' },
    { id: 'soul', label: 'Soul', group: 14, index: 14, icon: 'diamond', color: '#5B8DEF' },
    { id: 'chaos', label: 'Chaos', group: 12, index: 15, icon: 'fire', color: '#E2703A' },
    { id: 'life', label: 'Life', group: 14, index: 16, icon: 'heart', color: '#E8C86A' },
    { id: 'creation', label: 'Creation', group: 14, index: 22, icon: 'leaf', color: '#3FCF8E' },
    { id: 'harmony', label: 'Harmony', group: 14, index: 42, icon: 'star', color: '#F0D27A' },
    { id: 'guardian', label: 'Guardian', group: 14, index: 31, icon: 'shield', color: '#C8BEAF' },
    { id: 'gemstone', label: 'Gemstone', group: 14, index: 41, icon: 'gift', color: '#5B8DEF' },
    { id: 'custom_jewels', label: 'Joyas Custom', icon: 'crown', color: '#E8C86A' },
    { id: 'all_items', label: 'Cualquier Ítem', icon: 'cube-outline', color: '#C8BEAF' },
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
          res.message + (res.skippedOnlineCount > 0 ? `\n\n🛡️ Se protegieron ${res.skippedOnlineCount} cuentas conectadas al juego.` : '')
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
        <View style={[styles.card, { zIndex: 10 }]}>
          <View style={styles.cardHeader}>
            <MaterialCommunityIcons name="diamond-stone" size={24} color={THEME.colors.oroClaro} />
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
            {(['all', 'character', 'account'] as const).map((sc) => (
              <TouchableOpacity
                key={`jewel_scope_${sc}`}
                style={[styles.filterPill, jewelScope === sc && styles.filterPillActive]}
                onPress={() => setJewelScope(sc)}
              >
                <Text style={[styles.filterPillText, jewelScope === sc && styles.filterPillTextActive]}>
                  {sc === 'all' ? '🌐 Todo el Servidor' : sc === 'character' ? '👤 Por Personaje' : '📁 Por Cuenta'}
                </Text>
              </TouchableOpacity>
            ))}
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
              style={[styles.filterPill, jewelIncInventory && styles.filterPillActive]}
              onPress={() => setJewelIncInventory(!jewelIncInventory)}
            >
              <MaterialCommunityIcons
                name={jewelIncInventory ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={16}
                color={jewelIncInventory ? '#100D0B' : THEME.colors.textoSecundario}
              />
              <Text style={[styles.filterPillText, jewelIncInventory && styles.filterPillTextActive, { marginLeft: 4 }]}>
                Inventarios
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, jewelIncWarehouse && styles.filterPillActive]}
              onPress={() => setJewelIncWarehouse(!jewelIncWarehouse)}
            >
              <MaterialCommunityIcons
                name={jewelIncWarehouse ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={16}
                color={jewelIncWarehouse ? '#100D0B' : THEME.colors.textoSecundario}
              />
              <Text style={[styles.filterPillText, jewelIncWarehouse && styles.filterPillTextActive, { marginLeft: 4 }]}>
                Baúl Principal (0)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, jewelIncExtWarehouse && styles.filterPillActive]}
              onPress={() => setJewelIncExtWarehouse(!jewelIncExtWarehouse)}
            >
              <MaterialCommunityIcons
                name={jewelIncExtWarehouse ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={16}
                color={jewelIncExtWarehouse ? '#100D0B' : THEME.colors.textoSecundario}
              />
              <Text style={[styles.filterPillText, jewelIncExtWarehouse && styles.filterPillTextActive, { marginLeft: 4 }]}>
                Baúles Ext (1..N)
              </Text>
            </TouchableOpacity>
          </View>

          {/* 3. Selección de Joya / Ítem */}
          <Text style={[styles.label, { marginTop: 14 }]}>3. Joya o Ítem Objetivo:</Text>
          <View style={styles.wrapRow}>
            {JEWEL_PRESETS.map((preset) => {
              const isSelected = jewelFilterType === preset.id;
              return (
                <TouchableOpacity
                  key={`preset_${preset.id}`}
                  style={[
                    styles.filterPill,
                    isSelected && styles.filterPillActive,
                    { borderColor: isSelected ? preset.color : THEME.colors.borde },
                  ]}
                  onPress={() => setJewelFilterType(preset.id)}
                >
                  <MaterialCommunityIcons name={preset.icon as any} size={15} color={preset.color} style={{ marginRight: 4 }} />
                  <Text style={[styles.filterPillText, isSelected && { color: preset.color, fontWeight: 'bold' }]}>
                    {preset.label}
                  </Text>
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
              <MaterialCommunityIcons
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
              <MaterialCommunityIcons
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
              { id: 'audit', label: '📊 Solo Auditar' },
              { id: 'cap_target', label: '📉 Tope por PJ / Baúl' },
              { id: 'cap_server', label: '🌐 Tope Servidor' },
              { id: 'purge_all', label: '🔥 Depurar Todo' },
            ].map((act) => (
              <TouchableOpacity
                key={`jewel_act_${act.id}`}
                style={[styles.filterPill, jewelActionMode === act.id && styles.filterPillActive]}
                onPress={() => setJewelActionMode(act.id as any)}
              >
                <Text style={[styles.filterPillText, jewelActionMode === act.id && styles.filterPillTextActive]}>
                  {act.label}
                </Text>
              </TouchableOpacity>
            ))}
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
                  {(['5', '20', '50', '100'] as const).map((presetAmt) => (
                    <TouchableOpacity
                      key={`amt_p_${presetAmt}`}
                      style={[styles.filterPill, jewelCapAmount === presetAmt && styles.filterPillActive]}
                      onPress={() => setJewelCapAmount(presetAmt)}
                    >
                      <Text style={[styles.filterPillText, jewelCapAmount === presetAmt && styles.filterPillTextActive]}>
                        {presetAmt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <Text style={[styles.label, { marginTop: 10 }]}>Contar por:</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.filterPill, jewelCountBy === 'units' && styles.filterPillActive]}
                  onPress={() => setJewelCountBy('units')}
                >
                  <Text style={[styles.filterPillText, jewelCountBy === 'units' && styles.filterPillTextActive]}>
                    Unidades Reales (Desempaqueta Bundles x10, x20, x30)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterPill, jewelCountBy === 'slots' && styles.filterPillActive]}
                  onPress={() => setJewelCountBy('slots')}
                >
                  <Text style={[styles.filterPillText, jewelCountBy === 'slots' && styles.filterPillTextActive]}>
                    Slots Físicos (1 slot = 1 unidad)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Botones de Ejecución */}
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
            <TouchableOpacity
              style={[styles.searchBtn, { flex: 1 }]}
              onPress={handleAuditJewels}
              disabled={isAuditingJewels}
            >
              {isAuditingJewels ? (
                <ActivityIndicator color={THEME.colors.oroClaro} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="chart-bar" size={18} color={THEME.colors.oroClaro} />
                  <Text style={styles.searchBtnText}>Auditar / Censar</Text>
                </>
              )}
            </TouchableOpacity>

            {jewelActionMode !== 'audit' && (
              <TouchableOpacity
                style={[styles.scanDupesBtn, { flex: 1 }]}
                onPress={() => handleExecutePurgeAction(true)}
                disabled={isPurgingJewels}
              >
                {isPurgingJewels ? (
                  <ActivityIndicator color={THEME.colors.brasa} size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="test-tube" size={18} color={THEME.colors.brasa} />
                    <Text style={styles.scanDupesBtnText}>Simular (Test)</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {jewelActionMode !== 'audit' && (
              <TouchableOpacity
                style={[styles.purgeBtn, { flex: 1.2 }]}
                onPress={() => setShowJewelConfirmModal(true)}
                disabled={isPurgingJewels}
              >
                <MaterialCommunityIcons name="fire" size={18} color="#100D0B" />
                <Text style={styles.purgeBtnText}>
                  {jewelActionMode === 'purge_all' ? 'Depurar Todo' : 'Aplicar Tope'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Resultados de la Auditoría */}
        {jewelAuditResult && (
          <View style={styles.resultsCard}>
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
                  {jewelAuditResult.summaryByType.map((tItem) => (
                    <View key={`sum_${tItem.id}`} style={styles.typeItemPill}>
                      <ItemImage itemName={tItem.name} size={22} fallbackIcon={tItem.icon} fallbackColor={THEME.colors.oroClaro} />
                      <View style={{ marginLeft: 6 }}>
                        <Text style={styles.typeItemName}>{tItem.name}:</Text>
                        <Text style={styles.typeItemCount}>
                          {tItem.totalUnits.toLocaleString()} u. ({tItem.totalSlots} slots)
                        </Text>
                      </View>
                    </View>
                  ))}
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
          </View>
        )}

        {/* Modal de Confirmación de Purga SQL */}
        <Modal
          visible={showJewelConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowJewelConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { maxWidth: 420, maxHeight: '90%' }]}>
              <ScrollView nestedScrollEnabled>
                <View style={styles.modalHeader}>
                  <MaterialCommunityIcons name="alert-octagon" size={26} color={THEME.colors.brasa} />
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

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[styles.filterPill, { flex: 1, justifyContent: 'center', alignItems: 'center', height: 44 }]}
                    onPress={() => {
                      setShowJewelConfirmModal(false);
                      setJewelConfirmText('');
                    }}
                  >
                    <Text style={styles.filterPillText}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.scanDupesBtn,
                      { flex: 1.4, opacity: jewelConfirmText.trim().toUpperCase() === 'DEPURAR' ? 1 : 0.5 }
                    ]}
                    onPress={() => handleExecutePurgeAction(false)}
                    disabled={jewelConfirmText.trim().toUpperCase() !== 'DEPURAR' || isPurgingJewels}
                  >
                    {isPurgingJewels ? (
                      <ActivityIndicator color={THEME.colors.brasa} size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <MaterialCommunityIcons name="fire" size={18} color={THEME.colors.brasa} style={{ marginRight: 4 }} />
                        <Text style={styles.scanDupesBtnText}>Confirmar Purga</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.texto,
    marginLeft: 8,
  },
  cardDesc: {
    fontSize: 12,
    color: THEME.colors.textoSecundario,
    marginBottom: 12,
    lineHeight: 17,
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
    borderRadius: 6,
    backgroundColor: '#191512',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  filterPillActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.2)',
    borderColor: THEME.colors.oroClaro,
  },
  filterPillText: {
    fontSize: 12,
    color: THEME.colors.textoSecundario,
  },
  filterPillTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
  },
  shieldCheckRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#191512',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  shieldCheckRowActive: {
    borderColor: 'rgba(63, 207, 142, 0.4)',
    backgroundColor: 'rgba(63, 207, 142, 0.05)',
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
    backgroundColor: '#191512',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: '#100D0B',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: 6,
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
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
  },
  searchBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 13,
    fontWeight: 'bold',
  },
  scanDupesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.brasa,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
  },
  scanDupesBtnText: {
    color: THEME.colors.brasa,
    fontSize: 13,
    fontWeight: 'bold',
  },
  purgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.oroClaro,
    borderRadius: 6,
    paddingVertical: 10,
  },
  purgeBtnText: {
    color: '#100D0B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  resultsCard: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
    marginBottom: 12,
  },
  totalBadge: {
    alignItems: 'center',
    backgroundColor: '#191512',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    backgroundColor: '#191512',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    borderBottomColor: '#241E1A',
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
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    backgroundColor: '#191512',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    backgroundColor: '#100D0B',
    borderColor: THEME.colors.borde,
    borderWidth: 1,
    borderRadius: 6,
    color: THEME.colors.texto,
    height: 42,
    paddingHorizontal: 10,
    marginBottom: 16,
    fontSize: 13,
  },
});
