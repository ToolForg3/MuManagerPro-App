import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Platform,
  StatusBar,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { ClassAvatar } from '../../components/common/ClassAvatar';
import { CharacterSummary } from '../../types/character';
import { SqlClient } from '../../services/database/sqlClient';
import { getMuClassInfo, MU_BASE_RACES, MU_MAPS } from '../../constants/muConstants';
import { useLanguage } from '../../context/LanguageContext';
import { AutocompleteInput } from '../../components/common/AutocompleteInput';

export const CharacterListScreen = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [filteredChars, setFilteredChars] = useState<CharacterSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Modal de Crear Personaje
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createAccount, setCreateAccount] = useState('');
  const [createName, setCreateName] = useState('');
  const [selectedRaceIndex, setSelectedRaceIndex] = useState<number>(0);
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [createLevel, setCreateLevel] = useState('1');
  const [createResets, setCreateResets] = useState('0');
  const [createPoints, setCreatePoints] = useState('0');
  const [createZen, setCreateZen] = useState('1000000');
  const [isCreatingChar, setIsCreatingChar] = useState(false);
  const [deletingCharName, setDeletingCharName] = useState<string | null>(null);

  const charSuggestions = useMemo(() =>
    [...characters.map(c => c.Name), ...[...new Set(characters.map(c => c.AccountID))]]
  , [characters]);

  const applyFilter = (
    query: string,
    accFilter: string | null = accountFilter,
    sourceList: CharacterSummary[] = characters
  ) => {
    let result = sourceList;

    if (accFilter && accFilter.trim()) {
      const cleanAcc = accFilter.toLowerCase().trim();
      result = result.filter(c => (c.AccountID || '').trim().toLowerCase() === cleanAcc);
    }

    if (query.trim()) {
      const q = query.toLowerCase().trim();
      result = result.filter(
        (c) =>
          (c.Name || '').trim().toLowerCase().includes(q) ||
          (c.AccountID || '').trim().toLowerCase().includes(q)
      );
    }

    setFilteredChars(result);
  };

  const fetchCharacters = async (accOverride?: string | null, silent: boolean = false) => {
    if (!silent) {
      setLoading(true);
    }
    setErrorMessage(null);
    const activeAcc = accOverride !== undefined ? accOverride : accountFilter;
    try {
      const list = await SqlClient.getCharacterList();
      setCharacters(list);
      applyFilter(searchQuery, activeAcc, list);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al conectar con SQL Server');
      setCharacters([]);
      setFilteredChars([]);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Recargar al enfocar pantalla y sincronizar silenciosamente en segundo plano cada 15s
  useFocusEffect(
    useCallback(() => {
      const paramAcc = route.params?.filterAccount;
      const target = paramAcc !== undefined ? paramAcc : accountFilter;
      if (paramAcc !== undefined && paramAcc !== accountFilter) {
        setAccountFilter(paramAcc);
      }
      fetchCharacters(target);

      const interval = setInterval(() => {
        fetchCharacters(target, true);
      }, 15000);

      return () => clearInterval(interval);
    }, [route.params?.filterAccount])
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    applyFilter(text, accountFilter);
  };

  const clearAccountFilter = () => {
    setAccountFilter(null);
    applyFilter(searchQuery, null);
  };

  const openCreateModal = (presetAccount?: string) => {
    const acc = presetAccount || accountFilter || '';
    setCreateAccount(acc);
    setCreateName('');
    setSelectedRaceIndex(0);
    setSelectedTier(1);
    setCreateLevel('1');
    setCreateResets('0');
    setCreatePoints('0');
    setCreateZen('1000000');
    setCreateModalVisible(true);
  };

  const handleCreateCharacter = async () => {
    const cleanAcc = createAccount.trim();
    const cleanCharName = createName.trim();

    if (!cleanAcc) {
      Alert.alert('Campo requerido', 'Debes especificar la cuenta (AccountID).');
      return;
    }
    if (!cleanCharName) {
      Alert.alert('Campo requerido', 'Debes ingresar un nombre para el personaje.');
      return;
    }
    if (cleanCharName.length < 3 || cleanCharName.length > 10) {
      Alert.alert('Nombre inválido', 'El nombre debe tener entre 3 y 10 caracteres.');
      return;
    }

    const currentRace = MU_BASE_RACES[selectedRaceIndex] || MU_BASE_RACES[0];
    const targetTierObj = currentRace.tiers.find(t => t.tier === selectedTier) || currentRace.tiers[0];
    const classId = targetTierObj.classId;

    setIsCreatingChar(true);
    try {
      const res = await SqlClient.createCharacter(
        cleanAcc,
        cleanCharName,
        classId,
        parseInt(createLevel, 10) || 1,
        parseInt(createResets, 10) || 0,
        parseInt(createPoints, 10) || 0,
        parseInt(createZen, 10) || 0
      );

      if (res.success) {
        Alert.alert('¡Personaje Creado!', res.message);
        setCreateModalVisible(false);
        await fetchCharacters(cleanAcc);
        if (!accountFilter) {
          setAccountFilter(cleanAcc);
        }
      } else {
        Alert.alert('Error al crear', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo crear el personaje en SQL Server.');
    } finally {
      setIsCreatingChar(false);
    }
  };

  const promptDeleteCharacter = (char: CharacterSummary) => {
    Alert.alert(
      'Eliminar Personaje',
      `¿Estás seguro de que deseas eliminar permanentemente a "${char.Name}" (${char.AccountID})?\n\nEsta acción borrará el personaje de la base de datos, limpiará su slot en la cuenta y eliminará sus ítems, misiones y habilidades.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => performDeleteCharacter(char.Name, char.AccountID, false),
        },
      ]
    );
  };

  const performDeleteCharacter = async (charName: string, accountId?: string, forceOnline: boolean = false) => {
    setDeletingCharName(charName);
    try {
      const res = await SqlClient.deleteCharacter(charName, accountId, forceOnline);
      if (!res.success) {
        if (res.message && res.message.includes('ONLINE_WARNING')) {
          Alert.alert(
            '⚠️ Personaje Conectado',
            `El personaje "${charName}" o su cuenta se encuentra actualmente ONLINE en el servidor de juego.\n\nEliminarlo mientras juega puede causar desincronización en la memoria del GameServer.\n\n¿Deseas forzar la eliminación de todos modos?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Forzar Eliminación',
                style: 'destructive',
                onPress: () => performDeleteCharacter(charName, accountId, true),
              },
            ]
          );
        } else {
          Alert.alert('Error', res.message || 'No se pudo eliminar el personaje.');
        }
        return;
      }

      Alert.alert('Éxito', `El personaje "${charName}" ha sido eliminado correctamente.`);
      fetchCharacters(accountFilter, false);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error inesperado al eliminar el personaje.');
    } finally {
      setDeletingCharName(null);
    }
  };

  const formatZen = (zen: number): string => {
    if (zen >= 1000000000) return `${(zen / 1000000000).toFixed(1)}B`;
    if (zen >= 1000000) return `${(zen / 1000000).toFixed(1)}M`;
    if (zen >= 1000) return `${(zen / 1000).toFixed(0)}K`;
    return zen.toString();
  };

  const currentRace = MU_BASE_RACES[selectedRaceIndex] || MU_BASE_RACES[0];

  const renderCharacterCard = ({ item }: { item: CharacterSummary }) => {
    const classInfo = getMuClassInfo(item.Class);
    const isOnline = item.ConnectStat === 1;
    const isGm = item.CtlCode !== undefined && (item.CtlCode >= 8 || item.CtlCode === 32);
    const isBanned = item.CtlCode === 1;
    const mapName = MU_MAPS[item.MapNumber ?? 0] || `Mapa ${item.MapNumber ?? 0}`;
    const pkLvl = item.PkLevel ?? 3;

    let pkLabel = 'Ciudadano';
    let pkColor = '#4CAF50';
    let pkIcon = 'shield-check';
    if (pkLvl <= 2) {
      pkLabel = 'Héroe';
      pkColor = '#00B0FF';
      pkIcon = 'star-circle';
    } else if (pkLvl === 4) {
      pkLabel = 'Phono';
      pkColor = '#FFB300';
      pkIcon = 'alert-circle';
    } else if (pkLvl >= 5) {
      pkLabel = `PK ${item.PkCount ? `(${item.PkCount})` : ''}`;
      pkColor = '#FF5252';
      pkIcon = 'sword-cross';
    }

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => navigation.navigate('CharacterEdit', { characterName: item.Name })}
      >
        <View style={styles.cardTopRow}>
          <View style={styles.avatarContainer}>
            <ClassAvatar classId={item.Class} size={46} />
            <View style={[styles.charOnlineDot, { backgroundColor: isOnline ? THEME.colors.jade : '#555555' }]} />
          </View>

          <View style={styles.nameClassCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.charName} numberOfLines={1}>{item.Name}</Text>
              {isGm && (
                <View style={styles.gmTagBadge}>
                  <Text style={styles.gmTagText}>GM</Text>
                </View>
              )}
              {isBanned && (
                <View style={styles.banTagBadge}>
                  <Text style={styles.banTagText}>BAN</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.charClass}>{classInfo.name}</Text>
              <Text style={{ color: isOnline ? THEME.colors.jade : '#666', fontSize: 10, fontWeight: '700' }}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <View style={styles.levelResetsCol}>
            <Text style={styles.levelText}>Lv {item.cLevel}</Text>
            <Text style={styles.resetsText}>
              {item.ResetCount || 0}R{item.MasterResetCount ? ` · ${item.MasterResetCount}MR` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.cardDeleteBtn}
            onPress={() => promptDeleteCharacter(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            disabled={deletingCharName === item.Name}
            accessibilityLabel={`Eliminar personaje ${item.Name}`}
          >
            {deletingCharName === item.Name ? (
              <ActivityIndicator size="small" color="#FF5252" />
            ) : (
              <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF5252" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.cardBottomRow}>
          {/* Cuenta */}
          <View style={styles.accountPill}>
            <MaterialCommunityIcons name="account" size={14} color="#29B6F6" />
            <Text style={styles.accountPillText} numberOfLines={1}>{item.AccountID}</Text>
          </View>

          {/* Ubicación Mapa */}
          <View style={styles.locationPill}>
            <MaterialCommunityIcons name="map-marker-outline" size={14} color="#FF9800" />
            <Text style={styles.locationPillText} numberOfLines={1}>
              {mapName} ({item.MapPosX ?? 125}, {item.MapPosY ?? 125})
            </Text>
          </View>

          {/* PK Status */}
          <View style={[styles.pkPill, { borderColor: `${pkColor}40`, backgroundColor: `${pkColor}15` }]}>
            <MaterialCommunityIcons name={pkIcon as any} size={13} color={pkColor} />
            <Text style={[styles.pkPillText, { color: pkColor }]}>{pkLabel}</Text>
          </View>

          {/* Guild / Clan */}
          {!!item.GuildName && (
            <View style={styles.guildPill}>
              <MaterialCommunityIcons name="shield-crown-outline" size={13} color="#E040FB" />
              <Text style={styles.guildPillText} numberOfLines={1}>{item.GuildName}</Text>
            </View>
          )}

          {/* Zen */}
          <View style={styles.zenPill}>
            <MaterialCommunityIcons name="sack" size={14} color="#FFD700" />
            <Text style={styles.zenPillText}>{formatZen(item.Money || 0)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: topInset + 10 }]}>
      {/* Header Principal con Botón de Crear Personaje (+) */}
      <View style={styles.headerRow}>
        <Text style={styles.mainTitle}>{t('tabPJs') || 'Personajes'}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterBadgeText}>{filteredChars.length}</Text>
          </View>
          <TouchableOpacity
            style={styles.floatingAddBtn}
            onPress={() => openCreateModal(accountFilter || undefined)}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#070A0F" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de Búsqueda con Autocomplete */}
      <AutocompleteInput
        value={searchQuery}
        onChangeText={handleSearchChange}
        suggestions={charSuggestions}
        placeholder="Buscar personaje o cuenta..."
        icon="magnify"
        clearable={true}
        containerStyle={{ marginBottom: 14 }}
      />

      {/* Indicador de filtro por cuenta */}
      {accountFilter && (
        <View style={styles.activeFilterBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <MaterialCommunityIcons name="filter" size={16} color="#29B6F6" />
            <Text style={styles.activeFilterText} numberOfLines={1}>
              Filtrando cuenta: <Text style={{ fontWeight: 'bold' }}>{accountFilter}</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={clearAccountFilter} style={styles.clearFilterBtn}>
            <MaterialCommunityIcons name="close" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Error Banner si no hay conexión real */}
      {errorMessage && (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF5252" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.errorTitle}>Sin conexión a SQL Server</Text>
            <Text style={styles.errorSub}>{errorMessage}</Text>
          </View>
          <TouchableOpacity onPress={() => fetchCharacters()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Listado de Personajes */}
      <FlatList
        data={filteredChars}
        keyExtractor={(item) => item.Name}
        renderItem={renderCharacterCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: 32 + insets.bottom }]}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={() => fetchCharacters()}
            tintColor={THEME.colors.primaryOrange}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <MaterialCommunityIcons
                  name={accountFilter ? "account-question" : "sword-cross"}
                  size={42}
                  color={accountFilter ? "#FF9800" : "#666"}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {accountFilter
                  ? `Cuenta: ${accountFilter}`
                  : 'Sin Personajes Registrados'}
              </Text>
              <Text style={styles.emptyText}>
                {accountFilter
                  ? `Esta cuenta no posee personajes creados en el servidor.`
                  : 'No se encontraron personajes en la base de datos de SQL Server.'}
              </Text>

              {/* Botón destacado para crear personaje en esta cuenta */}
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => openCreateModal(accountFilter || undefined)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="plus-circle" size={18} color="#0D0D0D" />
                <Text style={styles.emptyActionBtnText}>
                  {accountFilter
                    ? `Crear Personaje en [${accountFilter}]`
                    : 'Crear Nuevo Personaje'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      {/* ======================================================== */}
      {/* MODAL: CREAR NUEVO PERSONAJE (SEASON 6 LOUIS) */}
      {/* ======================================================== */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
              {/* Header Modal */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.modalHeaderIconWrap}>
                    <MaterialCommunityIcons name="shield-account" size={20} color="#FFD700" />
                  </View>
                  <View>
                    <Text style={styles.modalHeaderTitle}>Nuevo Personaje</Text>
                    <Text style={styles.modalHeaderSub}>Season 6 Louis Update 40/50</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setCreateModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <MaterialCommunityIcons name="close" size={22} color="#8E9AA8" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled={true}
                contentContainerStyle={{ paddingBottom: Math.max(20, insets.bottom + 10) }}
              >
                {/* Campo Cuenta con Autocomplete */}
                <View style={styles.fieldGroup}>
                  <AutocompleteInput
                    value={createAccount}
                    onChangeText={setCreateAccount}
                    suggestions={[...new Set(characters.map((c) => c.AccountID))]}
                    placeholder="AccountID..."
                    icon="account"
                    label="Cuenta (AccountID)"
                    clearable={true}
                  />
                </View>

                {/* Campo Nombre de Personaje */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Nombre del Personaje (Name)</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={styles.textInput}
                      value={createName}
                      onChangeText={setCreateName}
                      autoCapitalize="none"
                      maxLength={10}
                      placeholder="Ej: DarkHero (3-10 chars)"
                      placeholderTextColor="#5C6B7E"
                    />
                  </View>
                  <Text style={styles.fieldHelp}>* Debe ser único en el servidor (máx. 10 letras/números).</Text>
                </View>

                {/* Selector de Raza Base */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Clase Base (Raza)</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.raceScroll}>
                    {MU_BASE_RACES.map((race, idx) => {
                      const isSelected = selectedRaceIndex === idx;
                      return (
                        <TouchableOpacity
                          key={race.code}
                          style={[
                            styles.raceChip,
                            isSelected && { borderColor: race.accentColor, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                          ]}
                          onPress={() => {
                            setSelectedRaceIndex(idx);
                            setSelectedTier(1);
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons
                            name={race.avatarIcon as any}
                            size={22}
                            color={isSelected ? race.accentColor : '#5C6B7E'}
                          />
                          <Text style={[styles.raceChipText, isSelected && { color: race.accentColor, fontWeight: 'bold' }]}>
                            {race.code}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Selector de Evolución (Tier 1, 2, 3) */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Evolución de Clase ({currentRace.name})</Text>
                  <View style={styles.tierRow}>
                    {currentRace.tiers.map((t) => {
                      const isTierSelected = selectedTier === t.tier;
                      return (
                        <TouchableOpacity
                          key={t.classId}
                          style={[
                            styles.tierBtn,
                            isTierSelected && { borderColor: currentRace.accentColor, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                          ]}
                          onPress={() => setSelectedTier(t.tier)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.tierBtnName, isTierSelected && { color: currentRace.accentColor, fontWeight: 'bold' }]}>
                            {t.name}
                          </Text>
                          <Text style={styles.tierBtnSub}>Tier {t.tier}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Nivel y Resets */}
                <View style={styles.rowFields}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Nivel Inicial</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={createLevel}
                        onChangeText={setCreateLevel}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor="#5C6B7E"
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Resets Iniciales</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={createResets}
                        onChangeText={setCreateResets}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#5C6B7E"
                      />
                    </View>
                  </View>
                </View>

                {/* Zen y Puntos */}
                <View style={styles.rowFields}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Zen</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={createZen}
                        onChangeText={setCreateZen}
                        keyboardType="numeric"
                        placeholder="1000000"
                        placeholderTextColor="#5C6B7E"
                      />
                    </View>
                  </View>

                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Puntos (Stats)</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={createPoints}
                        onChangeText={setCreatePoints}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#5C6B7E"
                      />
                    </View>
                  </View>
                </View>

                {/* Botón Crear Personaje */}
                <TouchableOpacity
                  style={styles.submitCreateBtn}
                  onPress={handleCreateCharacter}
                  disabled={isCreatingChar}
                  activeOpacity={0.8}
                >
                  {isCreatingChar ? (
                    <ActivityIndicator size="small" color="#070A0F" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="sword" size={20} color="#070A0F" />
                      <Text style={styles.submitCreateBtnText}>Crear Personaje en SQL Server</Text>
                    </>
                  )}
                </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oro,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  counterBadge: {
    backgroundColor: THEME.colors.casillaFondo,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  counterBadgeText: {
    color: THEME.colors.oro,
    fontSize: 13,
    fontWeight: 'bold',
  },
  floatingAddBtn: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: THEME.colors.oro,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFE866',
    elevation: 4,
    shadowColor: THEME.colors.oro,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: 6,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.texto,
    fontSize: 14,
  },
  searchIcon: {
    marginLeft: 8,
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(91, 141, 239, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(91, 141, 239, 0.3)',
    marginBottom: 14,
  },
  activeFilterText: {
    color: THEME.colors.arcano,
    fontSize: 12,
  },
  clearFilterBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 6,
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#2B2521',
    borderRadius: 6,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 6,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  charOnlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#2B2521',
  },
  gmTagBadge: {
    backgroundColor: THEME.colors.oro,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  gmTagText: {
    color: '#191512',
    fontSize: 9,
    fontWeight: 'bold',
  },
  banTagBadge: {
    backgroundColor: THEME.colors.brasa,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  banTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  nameClassCol: {
    flex: 1,
  },
  charName: {
    color: THEME.colors.oro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.3,
  },
  charClass: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
  },
  levelResetsCol: {
    alignItems: 'flex-end',
  },
  levelText: {
    color: THEME.colors.texto,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  resetsText: {
    color: THEME.colors.arcano,
    fontSize: 12,
    fontWeight: 'bold',
  },
  cardDeleteBtn: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.casillaFondo,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  accountPillText: {
    color: THEME.colors.arcano,
    fontSize: 11,
    fontWeight: '600',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.casillaFondo,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  locationPillText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  pkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  pkPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  guildPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.casillaFondo,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  guildPillText: {
    color: '#EA80FC',
    fontSize: 11,
    fontWeight: '600',
  },
  zenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: THEME.colors.casillaFondo,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  zenPillText: {
    color: THEME.colors.jade,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 6,
    backgroundColor: 'rgba(232, 200, 106, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 106, 0.3)',
  },
  emptyTitle: {
    color: THEME.colors.oro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 6,
  },
  emptyText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.oro,
    paddingHorizontal: 18,
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 6,
  },
  emptyActionBtnText: {
    color: '#191512',
    fontFamily: THEME.typography.fontTitle,
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 112, 58, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(226, 112, 58, 0.3)',
    padding: 12,
    marginBottom: 14,
  },
  errorTitle: {
    color: THEME.colors.brasa,
    fontSize: 12,
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
    borderRadius: 6,
  },
  retryText: {
    color: THEME.colors.brasa,
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4, 6, 10, 0.88)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#2B2521',
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  modalHeaderIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 106, 0.4)',
  },
  modalHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oro,
  },
  modalHeaderSub: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
  },
  modalCloseBtn: {
    padding: 4,
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: THEME.colors.textoSecundario,
    marginBottom: 6,
  },
  fieldHelp: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    marginTop: 4,
  },
  inputBox: {
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  textInput: {
    color: THEME.colors.texto,
    fontSize: 13,
  },
  raceScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  raceChip: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minWidth: 54,
  },
  raceChipText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 4,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
  },
  tierBtnName: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
  },
  tierBtnSub: {
    color: THEME.colors.textoSecundario,
    fontSize: 9,
    marginTop: 2,
  },
  rowFields: {
    flexDirection: 'row',
    gap: 10,
  },
  submitCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: THEME.colors.oro,
    paddingVertical: 14,
    minHeight: 56,
    borderRadius: 6,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#FFE866',
  },
  submitCreateBtnText: {
    color: '#191512',
    fontFamily: THEME.typography.fontTitle,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
