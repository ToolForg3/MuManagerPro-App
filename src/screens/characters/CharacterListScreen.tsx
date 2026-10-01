import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  KeyboardAvoidingView,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MuIcon } from '../../components/ui/MuIcon';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { Panel, MuCornerOrnaments, MuButton } from '../../components/ui';
import { ClassAvatar } from '../../components/common/ClassAvatar';
import { CharacterSummary } from '../../types/character';
import { SqlClient } from '../../services/database/sqlClient';
import { getMuClassInfo, MU_BASE_RACES, MU_MAPS } from '../../constants/muConstants';
import { useLanguage } from '../../context/LanguageContext';
import { AutocompleteInput } from '../../components/common/AutocompleteInput';
import { LicenseService } from '../../services/security/licenseService';
import { LicenseModal } from '../../components/security/LicenseModal';

export interface CharacterListScreenProps {
  hideTopPadding?: boolean;
  route?: any;
  navigation?: any;
}

export const CharacterListScreen: React.FC<CharacterListScreenProps> = (props) => {
  const insets = useSafeAreaInsets();
  const topInset = props?.hideTopPadding
    ? 0
    : Math.max(
        insets.top,
        Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
      );
  const { t } = useLanguage();
  const navHook = useNavigation<any>();
  const routeHook = useRoute<any>();
  const navigation = props?.navigation || navHook;
  const route = props?.route || routeHook;

  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [accountFilter, setAccountFilter] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);

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

    return result;
  };

  // Derivación coherente y reactiva de los personajes visibles
  const filteredChars = useMemo(() => {
    return applyFilter(searchQuery, accountFilter, characters);
  }, [characters, accountFilter, searchQuery]);

  const isFetchingRef = useRef(false);

  const fetchCharacters = async (accOverride?: string | null, silent: boolean = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (!silent) {
      setLoading(true);
    }
    setErrorMessage(null);
    try {
      const list = await SqlClient.getCharacterList();
      setCharacters(list);
    } catch (e: any) {
      setErrorMessage(e.message || 'Error al conectar con SQL Server');
      setCharacters([]);
    } finally {
      isFetchingRef.current = false;
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Recargar al enfocar pantalla y sincronizar silenciosamente en segundo plano cada 15s
  useFocusEffect(
    useCallback(() => {
      const paramAcc = route.params?.filterAccount;
      if (paramAcc !== undefined) {
        setAccountFilter(paramAcc);
      }
      fetchCharacters(undefined, false);

      const interval = setInterval(() => {
        fetchCharacters(undefined, true);
      }, 15000);

      return () => clearInterval(interval);
    }, [route.params?.filterAccount])
  );

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
  };

  const clearAccountFilter = () => {
    setAccountFilter(null);
    navigation.setParams({ filterAccount: undefined });
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

    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Creación de Personajes',
        () => setLicenseModalVisible(true),
        'La creación de nuevos personajes en SQL Server requiere una Licencia PRO activa.'
      );
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Creación de Personajes', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error al crear', res.message);
        }
      }
    } catch (e: any) {
      if (LicenseService.isLicenseError(e)) {
        LicenseService.alertProRequired('Creación de Personajes', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message || 'No se pudo crear el personaje en SQL Server.');
      }
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
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Eliminación de Personajes',
        () => setLicenseModalVisible(true),
        'La eliminación de personajes en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
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
          if (LicenseService.isLicenseError(res.message)) {
            LicenseService.alertProRequired('Eliminación de Personajes', () => setLicenseModalVisible(true), res.message);
          } else {
            Alert.alert('Error', res.message || 'No se pudo eliminar el personaje.');
          }
        }
        return;
      }

      Alert.alert('Éxito', `El personaje "${charName}" ha sido eliminado correctamente.`);
      fetchCharacters(accountFilter, false);
    } catch (e: any) {
      if (LicenseService.isLicenseError(e)) {
        LicenseService.alertProRequired('Eliminación de Personajes', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message || 'Error inesperado al eliminar el personaje.');
      }
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
    let pkColor = THEME.colors.jade;
    let pkIcon = 'shield-check';
    if (pkLvl <= 2) {
      pkLabel = 'Héroe';
      pkColor = THEME.colors.arcano;
      pkIcon = 'star-circle';
    } else if (pkLvl === 4) {
      pkLabel = 'Phono';
      pkColor = THEME.colors.oroClaro;
      pkIcon = 'alert-circle';
    } else if (pkLvl >= 5) {
      pkLabel = `PK ${item.PkCount ? `(${item.PkCount})` : ''}`;
      pkColor = THEME.colors.brasa;
      pkIcon = 'sword-cross';
    }

    return (
      <View style={[styles.stitchCharCard, isBanned && styles.stitchCharCardBanned]}>
        <MuCornerOrnaments size={12} />

        {/* Fila Superior: Avatar + Nombre + Nivel/Resets + Eliminar */}
        <View style={styles.stitchCardTopRow}>
          <View style={styles.stitchAvatarContainer}>
            <ClassAvatar classId={item.Class} size={44} />
            <View
              style={[
                styles.stitchCharOnlineDot,
                { backgroundColor: isOnline ? THEME.colors.jade : THEME.colors.textMuted },
              ]}
            />
          </View>

          <View style={styles.stitchNameClassCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {(() => {
                const q = searchQuery.trim().toLowerCase();
                const text = item.Name || '';
                const idx = q ? text.toLowerCase().indexOf(q) : -1;
                if (idx !== -1 && q) {
                  return (
                    <Text style={styles.stitchCharName} numberOfLines={1}>
                      {text.slice(0, idx)}
                      <Text style={styles.stitchSearchHighlight}>{text.slice(idx, idx + q.length)}</Text>
                      {text.slice(idx + q.length)}
                    </Text>
                  );
                }
                return (
                  <Text style={styles.stitchCharName} numberOfLines={1}>
                    {text}
                  </Text>
                );
              })()}
              {isGm && (
                <View style={styles.stitchGmTagBadge}>
                  <Text style={styles.stitchGmTagText}>GM</Text>
                </View>
              )}
              {isBanned && (
                <View style={styles.stitchBanTagBadge}>
                  <Text style={styles.stitchBanTagText}>BAN</Text>
                </View>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <Text style={styles.stitchCharClass}>{classInfo.name}</Text>
              <Text
                style={{
                  color: isOnline ? THEME.colors.jade : THEME.colors.textMuted,
                  fontSize: 10,
                  fontWeight: '700',
                }}
              >
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </Text>
            </View>
          </View>

          <View style={styles.stitchLevelResetsCol}>
            <Text style={styles.stitchLevelText}>Lv {item.cLevel}</Text>
            <Text style={styles.stitchResetsText}>
              {item.ResetCount || 0}R{item.MasterResetCount ? ` · ${item.MasterResetCount}MR` : ''}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.stitchCardDeleteBtn}
            onPress={() => promptDeleteCharacter(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
            disabled={deletingCharName === item.Name}
            accessibilityLabel={`Eliminar personaje ${item.Name}`}
          >
            {deletingCharName === item.Name ? (
              <ActivityIndicator size="small" color={THEME.colors.brasa} />
            ) : (
              <MuIcon name="trash" size={17} color={THEME.colors.brasa} />
            )}
          </TouchableOpacity>
        </View>

        {/* Cuadrícula de Datos de Estado */}
        <View style={styles.stitchCardBottomGrid}>
          {/* Cuenta */}
          <View style={styles.stitchPill}>
            <MuIcon name="account" size={13} color={THEME.colors.arcano} />
            <Text style={styles.stitchPillText} numberOfLines={1}>{item.AccountID}</Text>
          </View>

          {/* Ubicación Mapa */}
          <View style={styles.stitchPill}>
            <MuIcon name="location" size={13} color={THEME.colors.amber} />
            <Text style={styles.stitchPillText} numberOfLines={1}>
              {mapName} ({item.MapPosX ?? 125}, {item.MapPosY ?? 125})
            </Text>
          </View>

          {/* PK Status */}
          <View style={[styles.stitchPill, { borderColor: `${pkColor}40`, backgroundColor: `${pkColor}15` }]}>
            <MuIcon name={pkIcon as any} size={12} color={pkColor} />
            <Text style={[styles.stitchPillText, { color: pkColor }]}>{pkLabel}</Text>
          </View>

          {/* Guild / Clan */}
          {!!item.GuildName && (
            <View style={styles.stitchPill}>
              <MuIcon name="guild" size={12} color={THEME.colors.oroClaro} />
              <Text style={styles.stitchPillText} numberOfLines={1}>{item.GuildName}</Text>
            </View>
          )}

          {/* Zen */}
          <View style={styles.stitchPill}>
            <MuIcon name="zen" size={13} color={THEME.colors.oroClaro} />
            <Text style={styles.stitchPillText}>{formatZen(item.Money || 0)}</Text>
          </View>
        </View>

        {/* Botón Táctil para Ver Detalle / Stats con texturas nativas MU */}
        <MuButton
          titulo="VER STATS Y GESTIONAR"
          icono="edit"
          variante="primary"
          altura={40}
          onPress={() => navigation.navigate('CharacterEdit', { characterName: item.Name })}
          accessibilityLabel={`Gestionar stats de ${item.Name}`}
          style={{ marginTop: 8 }}
        />
      </View>
    );
  };

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={[styles.container, { paddingTop: props?.hideTopPadding ? 4 : (topInset + 6) }]}
      imageStyle={{ opacity: 0.50 }}
      resizeMode="repeat"
    >
      {/* Buscador y Botón Táctil Nuevo PJ (Stitch Ironforge) */}
      <View style={styles.stitchSearchRow}>
        <View style={styles.stitchSearchBox}>
          <MuIcon name="search" size={18} color={THEME.colors.textMuted} />
          <TextInput
            value={searchQuery}
            onChangeText={handleSearchChange}
            placeholder="Buscar personaje o cuenta..."
            placeholderTextColor={THEME.colors.textMuted}
            style={styles.stitchSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleSearchChange('')} style={styles.stitchClearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MuIcon name="close" size={14} color={THEME.colors.textoSecundarioLuminoso} />
            </TouchableOpacity>
          )}
        </View>
        <MuButton
          titulo="NUEVO PJ"
          icono="plus"
          variante="primary"
          compacto={true}
          altura={48}
          onPress={() => openCreateModal(accountFilter || undefined)}
          accessibilityLabel="Crear Nuevo Personaje"
        />
      </View>

      {/* Indicador de filtro por cuenta */}
      {accountFilter && (
        <View style={styles.activeFilterBanner}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
            <MuIcon name="search" size={16} color={THEME.colors.arcano} />
            <Text style={styles.activeFilterText} numberOfLines={1}>
              Filtrando cuenta: <Text style={{ fontWeight: 'bold' }}>{accountFilter}</Text>
            </Text>
          </View>
          <TouchableOpacity onPress={clearAccountFilter} style={styles.clearFilterBtn}>
            <MuIcon name="close" size={16} color={THEME.colors.texto} />
          </TouchableOpacity>
        </View>
      )}

      {/* Subtítulo de Tabla Character con Esquineros Metálicos NewUI */}
      <View style={styles.stitchTableHeaderBanner}>
        <MuCornerOrnaments size={10} />
        <View style={styles.stitchTableHeaderLeft}>
          <MuIcon name="character" size={16} color={THEME.colors.oroClaro} />
          <Text style={styles.stitchTableHeaderTitle}>TABLA DE PERSONAJES (Character)</Text>
        </View>
        <View style={styles.stitchTableHeaderCountBadge}>
          <Text style={styles.stitchTableHeaderCountText}>Total: {filteredChars.length}</Text>
        </View>
      </View>

      {/* Error Banner si no hay conexión real */}
      {errorMessage && (
        <View style={styles.errorCard}>
          <MuIcon name="close" size={20} color={THEME.colors.brasa} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.errorTitle}>Sin conexión a SQL Server</Text>
            <Text style={styles.errorSub}>{errorMessage}</Text>
          </View>
          {errorMessage.includes('NO_AUTORIZADO') || errorMessage.includes('Sesión') || errorMessage.includes('sesión') ? (
            <MuButton
              titulo="Iniciar Sesión"
              variante="primary"
              compacto={true}
              altura={34}
              onPress={() => LicenseService.triggerSessionInvalidated('Tu sesión requiere reautenticación.')}
            />
          ) : (
            <MuButton
              titulo="Reintentar"
              variante="secondary"
              compacto={true}
              altura={34}
              onPress={() => fetchCharacters()}
            />
          )}
        </View>
      )}

      {/* Listado de Personajes */}
      <FlatList
        data={filteredChars}
        keyExtractor={(item) => item.Name}
        renderItem={renderCharacterCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
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
                <MuIcon
                  name={accountFilter ? "account-question" : "sword-cross"}
                  size={42}
                  color={accountFilter ? "#FF9800" : THEME.colors.textoSecundario}
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
              <MuButton
                titulo={accountFilter ? `Crear Personaje en [${accountFilter}]` : 'Crear Nuevo Personaje'}
                icono="plus-circle"
                variante="primary"
                altura={44}
                onPress={() => openCreateModal(accountFilter || undefined)}
              />
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
          <Panel style={[styles.modalCard, { maxHeight: '90%' }]}>
              {/* Header Modal */}
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.modalHeaderIconWrap}>
                    <MuIcon name="shield-account" size={20} color="#FFD700" />
                  </View>
                  <View>
                    <Text style={styles.modalHeaderTitle}>Nuevo Personaje</Text>
                    <Text style={styles.modalHeaderSub}>Creación Universal de Personaje</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setCreateModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <MuIcon name="close" size={22} color="#8E9AA8" />
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
                      placeholderTextColor={THEME.colors.textMuted}
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
                          onPress={() => {
                            setSelectedRaceIndex(idx);
                            setSelectedTier(1);
                          }}
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                            style={[
                              styles.raceChip,
                              isSelected && { borderColor: race.accentColor },
                            ]}
                            resizeMode="stretch"
                          >
                            <MuIcon
                              name={race.avatarIcon as any}
                              size={20}
                              color={isSelected ? race.accentColor : THEME.colors.textoSecundarioLuminoso}
                            />
                            <Text style={[styles.raceChipText, isSelected && { color: '#EFD28D', fontWeight: 'bold' }]}>
                              {race.code}
                            </Text>
                          </ImageBackground>
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
                          style={{ flex: 1 }}
                          onPress={() => setSelectedTier(t.tier)}
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={isTierSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                            style={[
                              styles.tierBtn,
                              isTierSelected && { borderColor: currentRace.accentColor },
                            ]}
                            resizeMode="stretch"
                          >
                            <Text style={[styles.tierBtnName, isTierSelected && { color: '#EFD28D', fontWeight: 'bold' }]}>
                              {t.name}
                            </Text>
                            <Text style={[styles.tierBtnSub, isTierSelected && { color: '#EFD28D' }]}>Tier {t.tier}</Text>
                          </ImageBackground>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Nivel y Resets */}
                <View style={styles.rowFields}>
                  <View style={[styles.fieldGroup, { flex: 1 }]}>
                    <Text style={styles.fieldLabel}>Nivel Inicial (1 - 400)</Text>
                    <View style={styles.inputBox}>
                      <TextInput
                        style={styles.textInput}
                        value={createLevel}
                        onChangeText={setCreateLevel}
                        keyboardType="numeric"
                        placeholder="1"
                        placeholderTextColor={THEME.colors.textMuted}
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
                        placeholderTextColor={THEME.colors.textMuted}
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
                        placeholderTextColor={THEME.colors.textMuted}
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
                        placeholderTextColor={THEME.colors.textMuted}
                      />
                    </View>
                  </View>
                </View>

                {/* Botón Crear Personaje (Stitch Texture) */}
                <MuButton
                  titulo="Crear Personaje en SQL Server"
                  icono="sword"
                  variante="primary"
                  altura={48}
                  disabled={isCreatingChar}
                  cargando={isCreatingChar}
                  onPress={handleCreateCharacter}
                  accessibilityLabel="Crear Personaje en SQL Server"
                  style={{ marginTop: 14 }}
                />
            </ScrollView>
          </Panel>
        </KeyboardAvoidingView>
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(91, 141, 239, 0.3)',
    marginBottom: 14,
  },
  /* ================= STITCH 02/03 ESTILOS PERSONAJES ================= */
  stitchSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stitchSearchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C0D0C',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    paddingHorizontal: 10,
    minHeight: 48,
  },
  stitchSearchInput: {
    flex: 1,
    color: '#E4E2E0',
    fontSize: 12,
    fontWeight: '500',
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  stitchClearBtn: {
    padding: 4,
  },
  stitchAddCharBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: 2,
    backgroundColor: '#252625',
    borderWidth: 1,
    borderColor: '#E0C380',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stitchAddCharBtnText: {
    color: '#EFD28D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: THEME.typography.fontTitle,
  },
  stitchTableHeaderBanner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111211',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#2D2E2D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  stitchTableHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stitchTableHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E4E2E0',
    letterSpacing: 0.5,
  },
  stitchTableHeaderCountBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(224, 195, 128, 0.4)',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stitchTableHeaderCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
  },
  stitchCharCard: {
    position: 'relative',
    backgroundColor: '#1F201F',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  stitchCharCardBanned: {
    borderColor: THEME.colors.brasa,
    backgroundColor: 'rgba(226, 112, 58, 0.08)',
  },
  stitchCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stitchAvatarContainer: {
    position: 'relative',
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#0D0E0D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 106, 0.4)',
  },
  stitchCharOnlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5, /* círculo funcional (width/2): indicador online */
    borderWidth: 1.5,
    borderColor: '#0D0E0D',
  },
  stitchNameClassCol: {
    flex: 1,
  },
  stitchCharName: {
    color: THEME.colors.oroClaro,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.3,
    ...THEME.effects.textShadow,
  },
  stitchSearchHighlight: {
    color: '#7AF5BA',
    fontWeight: '900',
    textDecorationLine: 'underline',
    ...THEME.effects.textShadowHigh,
  },
  stitchGmTagBadge: {
    backgroundColor: THEME.colors.oroClaro,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
  },
  stitchGmTagText: {
    color: THEME.colors.textoOscuro,
    fontSize: 9,
    fontWeight: '900',
  },
  stitchBanTagBadge: {
    backgroundColor: THEME.colors.brasa,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
  },
  stitchBanTagText: {
    color: '#E4E2E0',
    fontSize: 9,
    fontWeight: '900',
  },
  stitchCharClass: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  stitchLevelResetsCol: {
    alignItems: 'flex-end',
  },
  stitchLevelText: {
    color: THEME.colors.oroClaro,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  stitchResetsText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 1,
  },
  stitchCardDeleteBtn: {
    padding: 6,
    borderRadius: 2,
    backgroundColor: 'rgba(226, 112, 58, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(226, 112, 58, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stitchCardBottomGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#2B2C2B',
  },
  stitchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0E0F0E',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#2B2C2B',
  },
  stitchPillText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 10,
    fontWeight: '600',
  },
  stitchManageCharBtn: {
    width: '100%',
    height: 40,
    borderRadius: 2,
    backgroundColor: '#252625',
    borderWidth: 1,
    borderColor: '#E0C380',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  stitchManageCharBtnText: {
    color: '#EFD28D',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
  },
  /* ================= FIN STITCH PERSONAJES ================= */
  activeFilterText: {
    color: THEME.colors.arcano,
    fontSize: 12,
  },
  clearFilterBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    padding: 4,
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  card: {
    padding: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 46,
    height: 46,
    borderRadius: 2,
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
    borderRadius: 6, /* círculo funcional (width/2): indicador de presencia online */
    borderWidth: 2,
    borderColor: '#1F201F',
  },
  gmTagBadge: {
    backgroundColor: THEME.colors.oro,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
  },
  gmTagText: {
    color: THEME.colors.textoOscuro,
    fontSize: 9,
    fontWeight: 'bold',
  },
  banTagBadge: {
    backgroundColor: THEME.colors.brasa,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 2,
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
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
    letterSpacing: 0.3,
    ...THEME.effects.textShadow,
  },
  charClass: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  guildPillText: {
    color: THEME.colors.oroClaro,
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
    borderRadius: 2,
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
    backgroundColor: '#1F201F',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 2,
    backgroundColor: 'rgba(224, 195, 128, 0.1)',
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
    borderRadius: THEME.shapes.radioEsquina,
  },
  emptyActionBtnText: {
    color: THEME.colors.textoOscuro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 13,
    fontWeight: 'bold',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 112, 58, 0.1)',
    borderRadius: 2,
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
    borderRadius: 2,
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
    padding: 16,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 2,
    minWidth: 58,
    overflow: 'hidden',
  },
  raceChipText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11,
    marginTop: 4,
    ...THEME.effects.textShadowSubtle,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tierBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 2,
    alignItems: 'center',
    overflow: 'hidden',
  },
  tierBtnName: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11,
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
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
    width: '100%',
    height: 48,
    borderRadius: 2,
    backgroundColor: '#252625',
    borderWidth: 1,
    borderColor: '#E0C380',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  submitCreateBtnText: {
    color: '#EFD28D',
    fontFamily: THEME.typography.fontTitle,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
