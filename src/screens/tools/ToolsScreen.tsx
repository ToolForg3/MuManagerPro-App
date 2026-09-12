import { ErrorBoundary } from '../../components/ErrorBoundary';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { THEME } from '../../constants/theme';
import { Panel, BotonBrasa, Chip, TituloSeccion, BotonPiedra } from '../../components/ui';
import { Header } from '../../components/common/Header';
import { MuFileParser } from '../../services/parser/fileParser';
import { ItemDatabase, DEFAULT_ITEM_CATALOG, ItemDefinition } from '../../services/parser/itemDatabase';
import { MuItemParser } from '../../services/parser/muItemParser';
import { SqlClient } from '../../services/database/sqlClient';
import { ItemImage } from '../../components/common/ItemImage';
import { useLanguage } from '../../context/LanguageContext';
import { ITEM_CATEGORIES } from '../accounts/AccountsScreen';
import {
  EXCELLENT_OPTIONS_WEAPON,
  EXCELLENT_OPTIONS_ARMOR,
  getMuClassInfo,
  MU_MAPS,
} from '../../constants/muConstants';
import {
  isItemAncientEligible,
  getAvailableAncientOptionsForItem,
  decodeAncientByte,
  encodeAncientByte,
  resolveAncientItemName,
} from '../../constants/ancientCatalog';
import {
  decodeSocketByte,
  encodeSocketByte,
  QUICK_SOCKET_OPTIONS,
  getQuickSocketOptions,
  SEED_SPHERE_LEVELS,
} from '../../constants/socketCatalog';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  ItemKitEntry,
  OnlinePlayer,
  BanEntry,
  GmEntry,
  GmLevel,
  GuildEntry,
  GuildMemberEntry,
  PkPlayerEntry,
} from '../../types/admin';
import { AccountSummary, CharacterSummary } from '../../types/character';
import { logAdminAction } from '../../services/adminLog';
import { AutocompleteInput } from '../../components/common/AutocompleteInput';

export type ToolTab = 'maker' | 'antidupe' | 'rankings' | 'fixes' | 'parsers' | 'kit' | 'prizes' | 'players' | 'guilds' | 'pk';
const ALL_TABS: ToolTab[] = ['maker', 'antidupe', 'rankings', 'fixes', 'parsers', 'kit', 'prizes', 'players', 'guilds', 'pk'];

// =========================================================================
// 1. QUICK SETS CATALOG & INTERFACES DEFINITION
// =========================================================================
import {
  QuickSetPiece,
  QuickSetDef,
  QUICK_SETS_CATALOG,
  MakerCategoryDef,
  MAKER_CATEGORIES,
} from '../../constants/quickSetsCatalog';
export { QuickSetPiece, QuickSetDef, QUICK_SETS_CATALOG, MakerCategoryDef, MAKER_CATEGORIES };


export const ToolsScreen = () => {
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [activeTab, setActiveTab] = useState<ToolTab>('maker');
  const [playerSubTab, setPlayerSubTab] = useState<'online' | 'bans' | 'gm'>('online');

  useEffect(() => {
    if (route.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    }
    if (route.params?.playerSubTab) {
      setPlayerSubTab(route.params.playerSubTab);
    }
  }, [route.params]);
  const tabScrollRef = useRef<ScrollView>(null);
  const [showScrollHint, setShowScrollHint] = useState<boolean>(true);

  // Suggestions for autocomplete
  const [makerAccountSuggestions, setMakerAccountSuggestions] = useState<string[]>([]);
  const [fixesAccountSuggestions, setFixesAccountSuggestions] = useState<string[]>([]);
  const [fixesCharSuggestions, setFixesCharSuggestions] = useState<string[]>([]);
  const [kitAccountSuggestions, setKitAccountSuggestions] = useState<string[]>([]);
  const [prizeSearchText, setPrizeSearchText] = useState<string>('');

  const catalogSuggestions = useMemo(() => {
    return Array.from(new Set(DEFAULT_ITEM_CATALOG.map((i) => i.name)));
  }, []);

  useEffect(() => {
    // Scroll auto on tab switch
    const tabIndex = ALL_TABS.indexOf(activeTab);
    if (tabIndex >= 0) {
      tabScrollRef.current?.scrollTo({ x: tabIndex * 85, animated: true });
    }
  }, [activeTab]);

  useEffect(() => {
    // Asegurar que las herramientas cuenten con la clave de administración activa
    SqlClient.getStoredAdminKey().catch(() => {});

    // Cargar sugerencias para autocompletado en segundo plano
    const loadSuggestions = async () => {
      try {
        const [accs, chars] = await Promise.all([
          SqlClient.getRecentAccounts().catch(() => [] as AccountSummary[]),
          SqlClient.getCharacterList().catch(() => [] as CharacterSummary[]),
        ]);
        if (Array.isArray(accs) && accs.length > 0) {
          const accNames = accs.map((a) => a.memb___id).filter(Boolean);
          setMakerAccountSuggestions(accNames);
          setFixesAccountSuggestions(accNames);
          setKitAccountSuggestions(accNames);
        }
        if (Array.isArray(chars) && chars.length > 0) {
          const charNames = chars.map((c) => c.Name).filter(Boolean);
          setFixesCharSuggestions(charNames);
          setMakerAccountSuggestions((prev) => {
            if (prev.length > 0) return prev;
            return [...new Set(chars.map((c) => c.AccountID).filter(Boolean))];
          });
          setFixesAccountSuggestions((prev) => {
            if (prev.length > 0) return prev;
            return [...new Set(chars.map((c) => c.AccountID).filter(Boolean))];
          });
          setKitAccountSuggestions((prev) => {
            if (prev.length > 0) return prev;
            return [...new Set(chars.map((c) => c.AccountID).filter(Boolean))];
          });
        }
      } catch (e) {
        console.warn('Error cargando sugerencias en ToolsScreen:', e);
      }
    };
    loadSuggestions();
  }, []);

  // ==========================================
  // TAB 1: ITEM MAKER & INJECTOR STATE
  // ==========================================
  const [makerAccount, setMakerAccount] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [selectedItemDef, setSelectedItemDef] = useState<ItemDefinition>(
    DEFAULT_ITEM_CATALOG.find((i) => i.group === 0) || DEFAULT_ITEM_CATALOG[0]
  );
  const [makerLevel, setMakerLevel] = useState<number>(15);
  const [makerOption, setMakerOption] = useState<number>(7); // 7 * 4 = +28
  const [makerSkill, setMakerSkill] = useState<boolean>(true);
  const [makerLuck, setMakerLuck] = useState<boolean>(true);
  const [makerExcFlags, setMakerExcFlags] = useState<number>(0); // 0 = Normal por defecto
  const [selectedMakerCatId, setSelectedMakerCatId] = useState<string>('swords');
  const [itemSearchText, setItemSearchText] = useState<string>('');
  const [maker380, setMaker380] = useState<boolean>(true);
  const [enableSockets, setEnableSockets] = useState<boolean>(false);
  const [makerSockets, setMakerSockets] = useState<number[]>([0xFE, 0xFE, 0xFE, 0xFE, 0xFE]);
  const [makerSocketLevels, setMakerSocketLevels] = useState<number[]>([1, 1, 1, 1, 1]);
  const [makerAncient, setMakerAncient] = useState<number>(0);
  const [quickSetModalVisible, setQuickSetModalVisible] = useState<boolean>(false);
  const [selectedQuickSet, setSelectedQuickSet] = useState<QuickSetDef>(QUICK_SETS_CATALOG[0]);
  const [quickSetCategoryFilter, setQuickSetCategoryFilter] = useState<'ALL' | 'DW' | 'DK' | 'FE' | 'MG' | 'DL' | 'ACC'>('ALL');
  const [quickLevel, setQuickLevel] = useState<number>(15);
  const [quickOption, setQuickOption] = useState<number>(7);
  const [quickLuck, setQuickLuck] = useState<boolean>(true);
  const [quickSkill, setQuickSkill] = useState<boolean>(true);
  const [quickFullExc, setQuickFullExc] = useState<boolean>(true);
  const [quick380, setQuick380] = useState<boolean>(true);
  const [quickAncientTier, setQuickAncientTier] = useState<number>(0);
  const [quickHarmonyType, setQuickHarmonyType] = useState<number>(0);
  const [quickHarmonyLevel, setQuickHarmonyLevel] = useState<number>(13);
  const [makerQuantity, setMakerQuantity] = useState<number>(1);
  const [injectingQuickSet, setInjectingQuickSet] = useState<boolean>(false);
  const [injecting, setInjecting] = useState<boolean>(false);

  // Opciones Ancient válidas para el set seleccionado en Edición Rápida (filtrado contextual oficial)
  const quickSetAncientOptions = useMemo(() => {
    if (!selectedQuickSet || !selectedQuickSet.pieces) return [];
    const optMap = new Map<number, { tier: number; name: string }>();
    for (const piece of selectedQuickSet.pieces) {
      const opts = getAvailableAncientOptionsForItem(piece.group, piece.index);
      for (const opt of opts) {
        if (!optMap.has(opt.tier)) {
          optMap.set(opt.tier, { tier: opt.tier, name: opt.name });
        }
      }
    }
    return Array.from(optMap.values());
  }, [selectedQuickSet]);
  const [makerWarehouseIndex, setMakerWarehouseIndex] = useState<number>(0);
  const [generatedHex, setGeneratedHex] = useState<string>('');

  // Sockets available options
  const SOCKET_OPTIONS = QUICK_SOCKET_OPTIONS;

  // Recalculate Hex whenever attributes change
  useEffect(() => {
    if (!selectedItemDef) return;
    const hex = MuItemParser.createItemHex({
      group: selectedItemDef.group,
      index: selectedItemDef.index,
      level: makerLevel,
      option: makerOption,
      skill: makerSkill,
      luck: makerLuck,
      durability: 255,
      excellentFlags: makerExcFlags,
      ancientOption: makerAncient,
      option380: maker380,
      sockets: enableSockets ? makerSockets : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
    });
    setGeneratedHex(hex);
  }, [selectedItemDef, makerLevel, makerOption, makerSkill, makerLuck, makerExcFlags, maker380, enableSockets, makerSockets, makerAncient]);

  
  const itemSearchSuggestions = useMemo(() => {
    if (!itemSearchText || itemSearchText.trim().length < 2) return [];
    const q = itemSearchText.toLowerCase().trim();
    const matches = DEFAULT_ITEM_CATALOG.filter((i) => i.name.toLowerCase().includes(q));
    return Array.from(new Set(matches.map((i) => i.name))).slice(0, 8);
  }, [itemSearchText]);

  const handleSelectItemByName = (name: string) => {
    const found =
      DEFAULT_ITEM_CATALOG.find((i) => i.name.toLowerCase() === name.toLowerCase()) ||
      DEFAULT_ITEM_CATALOG.find((i) => i.name.toLowerCase().includes(name.toLowerCase()));
    if (found) {
      setSelectedItemDef(found);
      const cat = MAKER_CATEGORIES.find((c) => c.filter(found));
      if (cat) {
        setSelectedMakerCatId(cat.id);
        setSelectedCategory(found.group);
      }
      setItemSearchText(found.name);
      if (found.group === 13 && found.index === 37) {
        const fenFlags = (found as any).defaultExc !== undefined ? (found as any).defaultExc : 0;
        setMakerExcFlags(fenFlags);
      }
    }
  };

  const handleSelectMakerCategory = (catId: string) => {
    setSelectedMakerCatId(catId);
    const catDef = MAKER_CATEGORIES.find((c) => c.id === catId);
    if (catDef) {
      const itemsInCat = DEFAULT_ITEM_CATALOG.filter(catDef.filter);
      if (itemsInCat.length > 0) {
        const first = itemsInCat[0];
        setSelectedItemDef(first);
        setSelectedCategory(first.group);
        if (first.group === 13 && first.index === 37) {
          const fenFlags = (first as any).defaultExc !== undefined ? (first as any).defaultExc : 0;
          setMakerExcFlags(fenFlags);
        }
      }
    }
  };


  const toggleExcOption = (bit: number) => {
    setMakerExcFlags((prev) => prev ^ bit);
  };

  const handleSetFullExc = () => {
    setMakerExcFlags(63);
  };

  const handleClearExc = () => {
    setMakerExcFlags(0);
  };

  
  const handleInjectQuickSet = async () => {
    if (!makerAccount || makerAccount.trim().length === 0) {
      Alert.alert('Atención', 'Por favor ingresa la cuenta (AccountID) de destino antes de inyectar el set.');
      return;
    }

    try {
      setInjectingQuickSet(true);
      const acc = makerAccount.trim();
      const pieces = selectedQuickSet.pieces;
      let injectedCount = 0;
      for (const p of pieces) {
        let pieceAncient = 0;
        if (selectedQuickSet.cat === 'ACC') {
          pieceAncient = selectedQuickSet.defaultAncient || 5;
        } else if (quickAncientTier > 0) {
          const reqTier = quickAncientTier === 5 ? 1 : 2;
          const pOpts = getAvailableAncientOptionsForItem(p.group, p.index);
          const match = pOpts.find((o) => o.tier === reqTier);
          if (match) {
            pieceAncient = quickAncientTier;
          }
        }

        const isWeapon = p.group <= 5;
        let pHarmonyType = 0;
        if (quickHarmonyType > 0) {
          if (isWeapon) {
            if (quickHarmonyType === 10 || quickHarmonyType === 6 || quickHarmonyType === 5 || quickHarmonyType === 9) {
              pHarmonyType = quickHarmonyType;
            } else {
              pHarmonyType = 10; // SD Ignore por defecto para armas
            }
          } else {
            if (quickHarmonyType === 10 || quickHarmonyType === 6) {
              pHarmonyType = 7; // Damage Reduction por defecto para armaduras
            } else {
              pHarmonyType = quickHarmonyType;
            }
          }
        }

        const freshSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
        const pieceHex = MuItemParser.createItemHex({
          group: p.group,
          index: p.index,
          level: quickLevel,
          option: quickOption,
          skill: quickSkill,
          luck: quickLuck,
          durability: 255,
          serial: freshSerial,
          excellentFlags: quickFullExc ? 63 : 0,
          ancientOption: pieceAncient,
          option380: quick380,
          harmonyType: pHarmonyType,
          harmonyLevel: pHarmonyType > 0 ? quickHarmonyLevel : 0,
          sockets: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
        });

        const res = await SqlClient.injectWarehouseItem(acc, pieceHex, undefined, makerWarehouseIndex);
        if (res.success) {
          injectedCount++;
        }
      }

      setQuickSetModalVisible(false);
      Alert.alert(
        '¡Set Completo Inyectado!',
        `Se inyectaron ${injectedCount} de ${pieces.length} piezas del '${selectedQuickSet.name}' en el ${makerWarehouseIndex === 0 ? 'Baúl Principal' : 'Baúl #' + makerWarehouseIndex} de '${acc}' sin solapamientos.`
      );
    } catch (e: any) {
      Alert.alert('Error al inyectar set', e.message);
    } finally {
      setInjectingQuickSet(false);
    }
  };

  const handleCopyHex = async () => {
    await Clipboard.setStringAsync(generatedHex);
    Alert.alert('Copiado', 'Cadena hexadecimal de 16 bytes copiada al portapapeles.');
  };

  const handleInjectItem = async () => {
    if (!makerAccount || makerAccount.trim().length === 0) {
      Alert.alert('Atención', 'Por favor ingresa la cuenta (AccountID) de destino.');
      return;
    }

    try {
      setInjecting(true);
      const qty = Math.max(1, Math.min(20, makerQuantity || 1));
      let successCount = 0;
      let lastSlot = 0;

      for (let q = 0; q < qty; q++) {
        // Generar serial único de 32 bits para cada copia
        const freshSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
        const freshHex = MuItemParser.createItemHex({
          group: selectedItemDef.group,
          index: selectedItemDef.index,
          level: makerLevel,
          option: makerOption,
          skill: makerSkill,
          luck: makerLuck,
          durability: 255,
          serial: freshSerial,
          excellentFlags: makerExcFlags,
          ancientOption: makerAncient,
          option380: maker380,
          sockets: enableSockets ? makerSockets : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
        });
        setGeneratedHex(freshHex);

        const res = await SqlClient.injectWarehouseItem(makerAccount.trim(), freshHex, undefined, makerWarehouseIndex);
        if (res.success) {
          successCount++;
          lastSlot = res.slot ?? 0;
        } else {
          if (successCount === 0) {
            Alert.alert('Error', res.message || 'No se pudo inyectar el ítem.');
          }
          break;
        }
      }

      if (successCount > 0) {
        Alert.alert(
          'Inyección Exitosa',
          qty === 1
            ? `El ítem '${selectedItemDef.name}' ha sido inyectado con éxito en el slot ${lastSlot} del ${makerWarehouseIndex === 0 ? 'Baúl Principal' : 'Baúl #' + makerWarehouseIndex} de '${makerAccount.trim()}'.`
            : `Se inyectaron con éxito ${successCount} de ${qty} copias de '${selectedItemDef.name}' en el ${makerWarehouseIndex === 0 ? 'Baúl Principal' : 'Baúl #' + makerWarehouseIndex} de '${makerAccount.trim()}'.`
        );
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setInjecting(false);
    }
  };

  // ==========================================
  // TAB 2: ANTI-DUPE & GLOBAL SEARCH STATE
  // ==========================================
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchFilter, setSearchFilter] = useState<'all' | 'warehouse' | 'inventory'>('all');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isScanningDupes, setIsScanningDupes] = useState<boolean>(false);
  const [dupesResults, setDupesResults] = useState<any[]>([]);
  const [hasScannedDupes, setHasScannedDupes] = useState<boolean>(false);

  const handleSearchItems = async () => {
    if (!searchQuery || searchQuery.trim().length === 0) {
      Alert.alert('Atención', 'Ingresa un nombre de ítem o número de serial.');
      return;
    }
    try {
      setIsSearching(true);
      setHasScannedDupes(false);
      const res = await SqlClient.searchItems(searchQuery.trim(), searchFilter);
      if (res.success) {
        setSearchResults(res.items);
        if (res.items.length === 0) {
          Alert.alert('Búsqueda', 'No se encontraron ítems que coincidan con la búsqueda.');
        }
      } else {
        Alert.alert('Error', res.message || 'Error al buscar ítems');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleScanDupes = async (forceFreshParam?: boolean | any) => {
    const forceFresh = forceFreshParam === true;
    try {
      setIsScanningDupes(true);
      setSearchResults([]);
      const res = await SqlClient.scanDupes(forceFresh);
      if (res.success) {
        setDupesResults(res.dupes);
        setHasScannedDupes(true);
        if (res.fromCache) {
          Alert.alert(
            res.dupes.length === 0 ? 'Servidor Limpio (Caché)' : 'Alerta de Dupeo (Caché)',
            (res.dupes.length === 0
              ? 'No se detectó ningún serial clonado o duplicado en el servidor.'
              : `Se encontraron ${res.dupes.length} grupos de seriales duplicados en el servidor.`) +
              `\n\n(Datos obtenidos de caché reciente de hace ${res.cachedSecondsAgo || 0} segundos).`,
            [
              { text: 'Aceptar' },
              { text: 'Forzar Re-Escaneo', onPress: () => handleScanDupes(true) }
            ]
          );
        } else if (res.dupes.length === 0) {
          Alert.alert('Servidor Limpio', 'No se detectó ningún serial clonado o duplicado.');
        } else {
          Alert.alert(
            'Alerta de Dupeo',
            `Se encontraron ${res.dupes.length} grupos de seriales duplicados en el servidor.`
          );
        }
      } else if (res.busy) {
        Alert.alert('Escaneo en Curso', res.message || 'Ya hay un escaneo de dupeos en curso por otro administrador. Por favor aguarda unos momentos.');
      } else {
        Alert.alert('Error', res.message || 'Error al escanear dupeos');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsScanningDupes(false);
    }
  };

  // ==========================================
  // TAB 3: LIVE RANKINGS STATE
  // ==========================================
  const [rankType, setRankType] = useState<'resets' | 'mresets' | 'pk' | 'guilds'>('resets');
  const [rankingsList, setRankingsList] = useState<any[]>([]);
  const [loadingRankings, setLoadingRankings] = useState<boolean>(false);
  const [cleaningPkChar, setCleaningPkChar] = useState<string | null>(null);

  const loadRankings = async (typeToLoad = rankType) => {
    try {
      setLoadingRankings(true);
      const res = await SqlClient.getRankings(typeToLoad);
      if (res.success) {
        setRankingsList(res.rankings);
      } else {
        Alert.alert('Error', res.message || 'Error al cargar rankings');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoadingRankings(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'rankings') {
      loadRankings(rankType);
    }
  }, [activeTab, rankType]);

  const handleClearPk = (charName: string) => {
    Alert.alert(
      'Limpiar Asesino (PK Clear)',
      `¿Deseas restablecer el estado PK del personaje '${charName}' a Común (Nivel 3, Kills: 0)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              setCleaningPkChar(charName);
              const res = await SqlClient.clearPk(charName);
              if (res.success) {
                Alert.alert('Éxito', res.message);
                loadRankings('pk');
              } else {
                Alert.alert('Error', res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setCleaningPkChar(null);
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // TAB 4: ONE-CLICK MAINTENANCE FIXES STATE
  // ==========================================
  const [unstickUser, setUnstickUser] = useState<string>('');
  const [rescueCharName, setRescueCharName] = useState<string>('');
  const [customTeleportMap, setCustomTeleportMap] = useState<number>(0);
  const [customTeleportX, setCustomTeleportX] = useState<string>('125');
  const [customTeleportY, setCustomTeleportY] = useState<string>('125');
  const [cleanHexTarget, setCleanHexTarget] = useState<string>('');
  const [cleanHexType, setCleanHexType] = useState<'warehouse' | 'inventory'>('warehouse');
  const [backupDbName, setBackupDbName] = useState<string>('MuOnline');
  const [fixingAction, setFixingAction] = useState<string | null>(null);

  const handleCustomTeleport = async () => {
    const name = rescueCharName.trim();
    if (!name) {
      Alert.alert('Atención', 'Ingresa el nombre del personaje arriba primero.');
      return;
    }
    const x = parseInt(customTeleportX, 10);
    const y = parseInt(customTeleportY, 10);
    if (isNaN(x) || x < 0 || x > 255 || isNaN(y) || y < 0 || y > 255) {
      Alert.alert('Coordenadas Inválidas', 'Las coordenadas X e Y deben ser números válidos entre 0 y 255.');
      return;
    }
    try {
      setFixingAction('custom_teleport');
      const res = await SqlClient.teleportCharacter(name, customTeleportMap, x, y);
      if (res.success) {
        const mapName = MU_MAPS[customTeleportMap] || `Mapa ${customTeleportMap}`;
        await logAdminAction('PJ_TELEPORTADO_CUSTOM', `${name} movido a ${mapName} (${x}, ${y})`);
        Alert.alert('Teletransporte Exitoso', res.message);
      } else {
        Alert.alert('Error al Mover Personaje', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFixingAction(null);
    }
  };

  const handleUnstick = async () => {
    if (!unstickUser.trim()) {
      Alert.alert('Atención', 'Ingresa el usuario de la cuenta.');
      return;
    }
    try {
      setFixingAction('unstick');
      const res = await SqlClient.disconnectAccount(unstickUser.trim());
      if (res.success) {
        Alert.alert('Cuenta Destrabada', `La cuenta '${unstickUser.trim()}' fue liberada (ConnectStat = 0).`);
        setUnstickUser('');
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFixingAction(null);
    }
  };

  const handleRescue = async () => {
    if (!rescueCharName.trim()) {
      Alert.alert('Atención', 'Ingresa el nombre del personaje.');
      return;
    }
    try {
      setFixingAction('rescue');
      const res = await SqlClient.rescueCharacter(rescueCharName.trim());
      if (res.success) {
        Alert.alert('Personaje Rescatado', res.message);
        setRescueCharName('');
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFixingAction(null);
    }
  };

  const handleCleanHex = () => {
    if (!cleanHexTarget.trim()) {
      Alert.alert('Atención', `Ingresa el ${cleanHexType === 'warehouse' ? 'usuario de la cuenta' : 'nombre del personaje'}.`);
      return;
    }

    const targetLabel = cleanHexType === 'warehouse' ? 'Baúl de la Cuenta' : 'Inventario del Personaje';
    Alert.alert(
      'ADVERTENCIA: VACIADO DESTRUCTIVO (0xFF)',
      `Esta acción ELIMINARÁ TODOS LOS ÍTEMS en el ${targetLabel} de '${cleanHexTarget.trim()}' rellenándolo con 0xFF (vacío total).\n\nEl jugador debe encontrarse DESCONECTADO del servidor para evitar desincronizaciones.\n\n¿Estás totalmente seguro de ejecutar el vaciado completo?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Vaciar Todo (0xFF)',
          style: 'destructive',
          onPress: async () => {
            try {
              setFixingAction('cleanHex');
              const res = await SqlClient.cleanCorruptHex(cleanHexType, cleanHexTarget.trim());
              if (res.success) {
                Alert.alert('Vaciado Completado', res.message);
                setCleanHexTarget('');
              } else {
                Alert.alert('Error', res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFixingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleBackup = async () => {
    try {
      setFixingAction('backup');
      const res = await SqlClient.backupDatabase(backupDbName.trim());
      if (res.success) {
        Alert.alert('Backup Exitoso', res.message);
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFixingAction(null);
    }
  };

  // --- PROCEDIMIENTOS ALMACENADOS DETERMINISTAS (0% FALSOS POSITIVOS) ---
  const [illegalNamesResults, setIllegalNamesResults] = useState<any[]>([]);

  const handleFixOrphans = async () => {
    Alert.alert(
      'Reparar Registros Huérfanos',
      '¿Deseas escanear y reparar ranuras de AccountCharacter y GuildMember huérfanos sin alterar datos de personajes legítimos?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Reparar',
          onPress: async () => {
            try {
              setFixingAction('fixOrphans');
              const res = await SqlClient.fixOrphans();
              if (res.success) {
                await logAdminAction('FIX_ORPHANS', res.message || 'Huérfanos reparados');
                Alert.alert('Éxito', res.message || 'Huérfanos reparados correctamente.');
              } else {
                Alert.alert('Error', (res as any).error || res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFixingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleRescueCoords = async () => {
    Alert.alert(
      'Rescate Masivo de Coordenadas',
      'Normalizará personajes fuera de rango (<0 o >255) o mapas inexistentes a Lorencia (125, 125). Solo afecta a jugadores desconectados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Normalizar',
          onPress: async () => {
            try {
              setFixingAction('rescueCoords');
              const res = await SqlClient.rescueInvalidCoords();
              if (res.success) {
                await logAdminAction('RESCUE_COORDS', res.message || 'Coordenadas rescatadas');
                Alert.alert('Éxito', res.message || 'Coordenadas normalizadas.');
              } else {
                Alert.alert('Error', (res as any).error || res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFixingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleFixOverflows = async () => {
    Alert.alert(
      'Corregir Desbordamientos de Enteros',
      'Limitará el Zen en Character y warehouse al tope de 2,000,000,000 y evitará valores negativos en Zen, LevelUpPoints y Resets.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Corregir',
          onPress: async () => {
            try {
              setFixingAction('fixOverflows');
              const res = await SqlClient.fixIntegerOverflows();
              if (res.success) {
                await logAdminAction('FIX_OVERFLOWS', res.message || 'Desbordamientos corregidos');
                Alert.alert('Éxito', res.message || 'Desbordamientos corregidos.');
              } else {
                Alert.alert('Error', (res as any).error || res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFixingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleCleanGhosts = async () => {
    Alert.alert(
      'Purgar Conexiones Fantasma',
      'Restablecerá ConnectStat = 0 en sesiones desconectadas o con más de 24 horas continuas y liberará ranuras GameIDC zombis.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Purgar',
          onPress: async () => {
            try {
              setFixingAction('cleanGhosts');
              const res = await SqlClient.cleanGhostConnections();
              if (res.success) {
                await logAdminAction('CLEAN_GHOSTS', res.message || 'Fantasmas purgados');
                Alert.alert('Éxito', res.message || 'Conexiones fantasma purgadas.');
              } else {
                Alert.alert('Error', (res as any).error || res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFixingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleScanIllegalNames = async () => {
    try {
      setFixingAction('scanIllegalNames');
      const res = await SqlClient.scanIllegalNames();
      if (res.success) {
        setIllegalNamesResults(res.characters || []);
        Alert.alert('Escaneo Completado', res.message || `Encontrados ${(res.characters || []).length} nombres con irregularidades.`);
      } else {
        Alert.alert('Error', (res as any).error || res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setFixingAction(null);
    }
  };

  const handleFixPkStatus = async () => {
    Alert.alert(
      'Corregir Estados PK Corruptos',
      'Normalizará personajes con PkLevel inválido (< 1 o > 6), PkTime negativo o PkCount negativo a Ciudadano (PkLevel = 3).',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Normalizar',
          onPress: async () => {
            try {
              setFixingAction('fixPkStatus');
              const res = await SqlClient.fixPkStatus();
              if (res.success) {
                await logAdminAction('FIX_PK_STATUS', res.message || 'PK corruptos corregidos');
                Alert.alert('Éxito', res.message || 'Estados PK normalizados.');
              } else {
                Alert.alert('Error', (res as any).error || res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFixingAction(null);
            }
          },
        },
      ]
    );
  };

  const handleInstallStoredProcedures = async () => {
    Alert.alert(
      'Instalar Procedimientos y Triggers',
      'Se compilarán todos los procedimientos almacenados idempotentes (CREATE OR ALTER), el trigger de auditoría de personajes y la tabla MuManager_AuditLog en SQL Server.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Instalar en SQL',
          onPress: async () => {
            try {
              setFixingAction('installProcedures');
              const res = await SqlClient.installStoredProcedures();
              if (res.success) {
                await logAdminAction('INSTALL_SQL_PROCEDURES', 'Procedimientos y triggers instalados');
                Alert.alert('Éxito', res.message || 'Procedimientos instalados con éxito.');
              } else {
                Alert.alert('Error', (res as any).error || res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setFixingAction(null);
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // TAB 5: PARSERS STATE
  // ==========================================
  const [itemsCount, setItemsCount] = useState<number>(ItemDatabase.getCount());
  const [loadingFile, setLoadingFile] = useState<string | null>(null);

  const handlePickAndParseFile = async (
    fileType: 'item' | '380' | 'socket' | 'set'
  ) => {
    try {
      setLoadingFile(fileType);
      const res = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const file = res.assets[0];
        let content = '';

        if (Platform.OS === 'web') {
          Alert.alert('Info', 'Carga en navegador no soportada.');
          return;
        } else {
          content = await FileSystem.readAsStringAsync(file.uri);
        }

        let result;
        if (fileType === 'item') {
          result = MuFileParser.parseItemTxt(content);
          setItemsCount(ItemDatabase.getCount());
        } else if (fileType === '380') {
          result = MuFileParser.parse380ItemType(content);
        } else if (fileType === 'socket') {
          result = MuFileParser.parseSocketItemType(content);
        } else {
          result = MuFileParser.parseSetItemType(content);
        }

        if (result.success) {
          Alert.alert('Éxito', result.message);
        } else {
          Alert.alert('Atención', result.message);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', `Error al leer archivo: ${e.message}`);
    } finally {
      setLoadingFile(null);
    }
  };

  const handleResetDefaults = () => {
    ItemDatabase.initialize();
    setItemsCount(ItemDatabase.getCount());
    Alert.alert('Restaurado', 'Se ha restablecido el catálogo estándar de MU Online Season 6.');
  };

  // ==========================================
  // TAB: STARTER KIT STATE & LOGIC (100% CONFIGURABLE)
  // ==========================================
  const [kitTargetAccount, setKitTargetAccount] = useState<string>('');
  const [kitList, setKitList] = useState<ItemKitEntry[]>([]);
  const [deliveringKit, setDeliveringKit] = useState<boolean>(false);
  const [kitIncludeZen, setKitIncludeZen] = useState<boolean>(true);
  const [kitIncludeGCoins, setKitIncludeGCoins] = useState<boolean>(true);
  const [kitIncludeWCoinP, setKitIncludeWCoinP] = useState<boolean>(true);
  const [kitIncludeGoblinPoints, setKitIncludeGoblinPoints] = useState<boolean>(true);
  const [kitIncludeRuud, setKitIncludeRuud] = useState<boolean>(true);
  const [kitWCoinP, setKitWCoinP] = useState<string>('200');
  const [kitRuud, setKitRuud] = useState<string>('1000');
  const [kitWarehouseIndex, setKitWarehouseIndex] = useState<number>(0);
  const [kitIncludeItems, setKitIncludeItems] = useState<boolean>(true);
  const [kitZen, setKitZen] = useState<string>('10000000');
  const [kitGCoins, setKitGCoins] = useState<string>('500');
  const [kitGoblinPoints, setKitGoblinPoints] = useState<string>('100');
  // --- SISTEMA AVANZADO DE PRESETS 100% CONFIGURABLES (STARTER KIT) ---
  interface KitPresetItem {
    id: string;
    name: string;
    badgeColor: string;
    icon: string;
    isCustom?: boolean;
    zen: string;
    includeZen: boolean;
    gcoins: string;
    includeGCoins: boolean;
    wCoinP: string;
    includeWCoinP: boolean;
    goblinPoints: string;
    includeGoblinPoints: boolean;
    ruud: string;
    includeRuud: boolean;
    includeItems: boolean;
    items: ItemKitEntry[];
  }

  const getInitialKitPresets = (): KitPresetItem[] => {
    const defaultSword = DEFAULT_ITEM_CATALOG.find((i) => i.group === 0 && i.index === 0) || DEFAULT_ITEM_CATALOG[0];
    const defaultShield = DEFAULT_ITEM_CATALOG.find((i) => i.group === 6 && i.index === 0) || DEFAULT_ITEM_CATALOG[0];
    const defaultWings = DEFAULT_ITEM_CATALOG.find((i) => i.group === 12 && i.index === 0) || DEFAULT_ITEM_CATALOG[0];

    return [
      {
        id: 'beginner',
        name: 'Principiante +7',
        badgeColor: '#1E88E5',
        icon: 'star-circle',
        zen: '10000000',
        includeZen: true,
        gcoins: '500',
        includeGCoins: true,
        wCoinP: '100',
        includeWCoinP: true,
        goblinPoints: '50',
        includeGoblinPoints: true,
        ruud: '1000',
        includeRuud: true,
        includeItems: true,
        items: [
          { id: '1', itemDef: defaultSword, level: 7, option: 4, skill: true, luck: true, excFlags: 0, option380: false, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
          { id: '2', itemDef: defaultShield, level: 7, option: 4, skill: true, luck: true, excFlags: 0, option380: false, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
          { id: '3', itemDef: defaultWings, level: 7, option: 4, skill: true, luck: true, excFlags: 0, option380: false, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
        ]
      },
      {
        id: 'pvp',
        name: 'PvP +13 Exc',
        badgeColor: '#B58F3C',
        icon: 'sword-cross',
        zen: '50000000',
        includeZen: true,
        gcoins: '2500',
        includeGCoins: true,
        wCoinP: '500',
        includeWCoinP: true,
        goblinPoints: '250',
        includeGoblinPoints: true,
        ruud: '2500',
        includeRuud: true,
        includeItems: true,
        items: [
          { id: '1', itemDef: defaultSword, level: 13, option: 7, skill: true, luck: true, excFlags: 63, option380: true, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
          { id: '2', itemDef: defaultWings, level: 13, option: 7, skill: true, luck: true, excFlags: 63, option380: true, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
        ]
      },
      {
        id: 'full15',
        name: 'Full +15',
        badgeColor: '#E2703A',
        icon: 'fire',
        zen: '100000000',
        includeZen: true,
        gcoins: '5000',
        includeGCoins: true,
        wCoinP: '1000',
        includeWCoinP: true,
        goblinPoints: '500',
        includeGoblinPoints: true,
        ruud: '5000',
        includeRuud: true,
        includeItems: true,
        items: [
          { id: '1', itemDef: defaultSword, level: 15, option: 7, skill: true, luck: true, excFlags: 63, option380: true, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
          { id: '2', itemDef: defaultShield, level: 15, option: 7, skill: true, luck: true, excFlags: 63, option380: true, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
          { id: '3', itemDef: defaultWings, level: 15, option: 7, skill: true, luck: true, excFlags: 63, option380: true, enableSockets: false, sockets: [0xFF,0xFF,0xFF,0xFF,0xFF], quantity: 1 },
        ]
      }
    ];
  };

  const [kitPresets, setKitPresets] = useState<KitPresetItem[]>(getInitialKitPresets());
  const [activeKitPresetId, setActiveKitPresetId] = useState<string>('beginner');
  const [activeKitPresetName, setActiveKitPresetName] = useState<string>('Principiante +7');
  const [newKitPresetName, setNewKitPresetName] = useState<string>('');
  const [showSaveKitInput, setShowSaveKitInput] = useState<boolean>(false);

  const loadCustomKitPresets = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mumanager_kit_presets_v4');
      if (stored) {
        setKitPresets(JSON.parse(stored));
      } else {
        const initial = getInitialKitPresets();
        setKitPresets(initial);
        await AsyncStorage.setItem('@mumanager_kit_presets_v4', JSON.stringify(initial));
      }
    } catch (e) {
      console.error('Error cargando presets de kits:', e);
    }
  };

  const handleApplyPresetKit = (presetId: string) => {
    const found = kitPresets.find(p => p.id === presetId);
    if (found) {
      setActiveKitPresetId(found.id);
      setActiveKitPresetName(found.name);
      setKitZen(found.zen || '0');
      setKitIncludeZen(found.includeZen !== false);
      setKitGCoins(found.gcoins || '0');
      setKitIncludeGCoins(found.includeGCoins !== false);
      setKitWCoinP(found.wCoinP || '0');
      setKitIncludeWCoinP(found.includeWCoinP !== false);
      setKitGoblinPoints(found.goblinPoints || '0');
      setKitIncludeGoblinPoints(found.includeGoblinPoints !== false);
      setKitRuud(found.ruud || '0');
      setKitIncludeRuud(found.includeRuud !== false);
      setKitIncludeItems(found.includeItems !== false);
      setKitList([...(found.items || [])]);
      Alert.alert('Preset Cargado', `Preset '${found.name}' cargado en el formulario.`);
    }
  };

  const handleSaveCurrentToActiveKitPreset = async () => {
    const currentId = activeKitPresetId || 'beginner';
    const trimmedName = activeKitPresetName.trim() || 'Starter Kit';
    const updated = kitPresets.map(p => {
      if (p.id === currentId) {
        return {
          ...p,
          name: trimmedName,
          zen: kitZen,
          includeZen: kitIncludeZen,
          gcoins: kitGCoins,
          includeGCoins: kitIncludeGCoins,
          wCoinP: kitWCoinP,
          includeWCoinP: kitIncludeWCoinP,
          goblinPoints: kitGoblinPoints,
          includeGoblinPoints: kitIncludeGoblinPoints,
          ruud: kitRuud,
          includeRuud: kitIncludeRuud,
          includeItems: kitIncludeItems,
          items: [...kitList],
        };
      }
      return p;
    });
    setKitPresets(updated);
    await AsyncStorage.setItem('@mumanager_kit_presets_v4', JSON.stringify(updated));
    Alert.alert(
      '¡Preset Modificado Exitosamente!',
      `Se han guardado los cambios en el botón '${activeKitPresetName}'.\n\nAhora este botón entregará:\n• Zen: ${kitIncludeZen ? kitZen : 'Desactivado'}\n• WCoinC: ${kitIncludeGCoins ? kitGCoins : 'Desactivado'}\n• WCoinP: ${kitIncludeWCoinP ? kitWCoinP : 'Desactivado'}\n• GP: ${kitIncludeGoblinPoints ? kitGoblinPoints : 'Desactivado'}\n• Ruud: ${kitIncludeRuud ? kitRuud : 'Desactivado'}\n• Ítems: ${kitIncludeItems ? kitList.length : 0}`
    );
  };

  const handleCreateNewKitPreset = async () => {
    const name = newKitPresetName.trim();
    if (!name) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para el preset.');
      return;
    }
    const newPreset: KitPresetItem = {
      id: 'custom_' + Date.now(),
      name,
      badgeColor: '#00B0FF',
      icon: 'star-outline',
      isCustom: true,
      zen: kitZen,
      includeZen: kitIncludeZen,
      gcoins: kitGCoins,
      includeGCoins: kitIncludeGCoins,
      wCoinP: kitWCoinP,
      includeWCoinP: kitIncludeWCoinP,
      goblinPoints: kitGoblinPoints,
      includeGoblinPoints: kitIncludeGoblinPoints,
      ruud: kitRuud,
      includeRuud: kitIncludeRuud,
      includeItems: kitIncludeItems,
      items: [...kitList],
    };
    const updated = [...kitPresets, newPreset];
    setKitPresets(updated);
    setActiveKitPresetId(newPreset.id);
    setActiveKitPresetName(newPreset.name);
    setNewKitPresetName('');
    setShowSaveKitInput(false);
    await AsyncStorage.setItem('@mumanager_kit_presets_v4', JSON.stringify(updated));
    Alert.alert('Nuevo Botón Creado', `El botón '${name}' fue añadido a tus presets de Starter Kit.`);
  };

  const handleDeleteCustomKitPreset = async (id: string) => {
    const updated = kitPresets.filter(p => p.id !== id);
    setKitPresets(updated);
    await AsyncStorage.setItem('@mumanager_kit_presets_v4', JSON.stringify(updated));
    if (activeKitPresetId === id && updated.length > 0) {
      handleApplyPresetKit(updated[0].id);
    }
  };

  const handleResetKitPresets = async () => {
    Alert.alert(
      'Restaurar Presets de Kit',
      '¿Deseas restablecer todos los botones de Starter Kit a sus valores originales de fábrica?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            const defaults = getInitialKitPresets();
            setKitPresets(defaults);
            await AsyncStorage.setItem('@mumanager_kit_presets_v4', JSON.stringify(defaults));
            handleApplyPresetKit(defaults[0].id);
            Alert.alert('Restaurado', 'Presets restablecidos a valores de fábrica.');
          }
        }
      ]
    );
  };

  const handleAddMakerItemToKit = () => {
    if (!selectedItemDef) return;
    const newEntry: ItemKitEntry = {
      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 4),
      itemDef: selectedItemDef,
      level: makerLevel,
      option: makerOption,
      skill: makerSkill,
      luck: makerLuck,
      excFlags: makerExcFlags,
      option380: maker380,
      enableSockets: enableSockets,
      sockets: [...makerSockets],
      quantity: 1,
    };
    setKitList((prev) => [...prev, newEntry]);
    Alert.alert('Agregado', `${selectedItemDef.name} +${makerLevel} agregado al Kit.`);
  };

  // (handleApplyPresetKit ahora gestionado dinámicamente arriba)

  const handleDeliverKit = async () => {
    const acc = kitTargetAccount.trim();
    if (!acc) {
      Alert.alert('Cuenta Requerida', 'Por favor ingresa el AccountID de destino.');
      return;
    }

    const zenVal = kitIncludeZen ? (parseInt(kitZen, 10) || 0) : 0;
    const gcoinsVal = kitIncludeGCoins ? (parseInt(kitGCoins, 10) || 0) : 0;
    const wcoinPVal = kitIncludeWCoinP ? (parseInt(kitWCoinP, 10) || 0) : 0;
    const gpVal = kitIncludeGoblinPoints ? (parseInt(kitGoblinPoints, 10) || 0) : 0;
    const ruudVal = kitIncludeRuud ? (parseInt(kitRuud, 10) || 0) : 0;
    const itemsToDeliver = kitIncludeItems ? kitList : [];

    if (!kitIncludeZen && !kitIncludeGCoins && !kitIncludeWCoinP && !kitIncludeGoblinPoints && !kitIncludeRuud && !kitIncludeItems) {
      Alert.alert('Ninguna Opción Marcada', 'Debes marcar al menos una casilla (Zen, Monedas o Ítems) para entregar.');
      return;
    }
    if (kitIncludeItems && kitList.length === 0 && !zenVal && !gcoinsVal && !wcoinPVal && !gpVal && !ruudVal) {
      Alert.alert('Kit Vacío', 'Configura ítems o monedas en las casillas marcadas antes de entregarlo.');
      return;
    }

    const doDeliverKit = async () => {
      try {
        setDeliveringKit(true);
        const bonus = {
          zen: zenVal,
          gcoins: gcoinsVal,
          wCoinP: wcoinPVal,
          goblinPoints: gpVal,
          ruud: ruudVal,
        };
        const res = await SqlClient.deliverKitToWarehouse(acc, itemsToDeliver, bonus, kitWarehouseIndex);
        if (res.success) {
          const parts: string[] = [];
          if (kitIncludeItems && itemsToDeliver.length > 0) parts.push(`${itemsToDeliver.length} ítems`);
          if (zenVal > 0) parts.push(`${zenVal.toLocaleString()} Zen`);
          if (gcoinsVal > 0) parts.push(`${gcoinsVal} WCoinC`);
          if (wcoinPVal > 0) parts.push(`${wcoinPVal} WCoinP`);
          if (gpVal > 0) parts.push(`${gpVal} GP`);
          if (ruudVal > 0) parts.push(`${ruudVal} Ruud`);
          const targetDesc = kitWarehouseIndex === 0 ? 'Baúl Principal' : `Baúl #${kitWarehouseIndex}`;
          await logAdminAction('KIT_ENTREGADO', `Entregado a '${acc}' en ${targetDesc}: ${parts.join(', ') || 'Kit'}`);
          Alert.alert('¡Kit Entregado!', `Se entregó exitosamente el Starter Kit a '${acc}' en ${targetDesc}.\n\nContenido entregado:\n${parts.map(p => '• ' + p).join('\n')}`);
        } else {
          Alert.alert('Error al Entregar Kit', res.message);
        }
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setDeliveringKit(false);
      }
    };

    // Verificación si la cuenta está online para evitar sobreescritura del baúl
    let isOnline = false;
    try {
      isOnline = await SqlClient.isAccountConnected(acc);
    } catch (_) {}

    if (isOnline) {
      Alert.alert(
        'Jugador en Línea en el Juego',
        'El jugador está CONECTADO al juego. Para evitar que el GameServer sobreescriba los datos en memoria al salir, debe desconectarse. ¿Deseas desconectarlo automáticamente y proceder?\n\n⚠️ AVISO TÉCNICO: Desde la conexión SQL directa no es posible cerrar el cliente de juego (la sesión activa vive en la memoria RAM del GameServer).',
        [
          { text: 'Esperar a que salga', style: 'cancel' },
          {
            text: 'Liberar Traba SQL',
            onPress: async () => {
              setDeliveringKit(true);
              try {
                await SqlClient.disconnectAccount(acc);
                await new Promise((r) => setTimeout(r, 1000));
                await doDeliverKit();
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Error al actualizar estado en SQL');
              } finally {
                setDeliveringKit(false);
              }
            },
          },
        ]
      );
      return;
    }

    await doDeliverKit();
  };

  // ==========================================
  // TAB: PREMIOS ONLINE STATE & LOGIC (100% CONFIGURABLE)
  // ==========================================
  const [prizeOnlinePlayers, setPrizeOnlinePlayers] = useState<OnlinePlayer[]>([]);
  const [loadingPrizePlayers, setLoadingPrizePlayers] = useState<boolean>(false);
  const [prizeClassFilter, setPrizeClassFilter] = useState<number | 'ALL'>('ALL');
  const [selectedPlayerNames, setSelectedPlayerNames] = useState<string[]>([]);
  const [prizeTargetMode, setPrizeTargetMode] = useState<'selected' | 'all' | 'specific'>('selected');
  const [prizeSpecificTarget, setPrizeSpecificTarget] = useState<string>('');
  const [prizeManualCharInput, setPrizeManualCharInput] = useState<string>('');
  const [prizeIncludeZen, setPrizeIncludeZen] = useState<boolean>(true);
  const [prizeIncludeGCoins, setPrizeIncludeGCoins] = useState<boolean>(true);
  const [prizeIncludeWCoinP, setPrizeIncludeWCoinP] = useState<boolean>(true);
  const [prizeIncludeGoblinPoints, setPrizeIncludeGoblinPoints] = useState<boolean>(false);
  const [prizeIncludeRuud, setPrizeIncludeRuud] = useState<boolean>(true);
  const [prizeRuud, setPrizeRuud] = useState<string>('500');
  const [prizeWarehouseIndex, setPrizeWarehouseIndex] = useState<number>(0);
  const [prizeZen, setPrizeZen] = useState<string>('5000000');
  const [prizeGCoins, setPrizeGCoins] = useState<string>('100');
  const [prizeWCoinP, setPrizeWCoinP] = useState<string>('0');
  const [prizeGoblinPoints, setPrizeGoblinPoints] = useState<string>('50');
  const [prizeIncludeHex, setPrizeIncludeHex] = useState<boolean>(false);
  const [deliveringPrize, setDeliveringPrize] = useState<boolean>(false);
  const [prizeHistory, setPrizeHistory] = useState<{ id: string; date: string; count: number; detail: string }[]>([]);
  interface PrizePresetItem {
  id: string;
  name: string;
  badgeColor?: string;
  icon?: string;
  isCustom?: boolean;
  zen: string;
  includeZen: boolean;
  gcoins: string;
  includeGCoins: boolean;
  wCoinP: string;
  includeWCoinP: boolean;
  goblinPoints: string;
  includeGoblinPoints: boolean;
  ruud: string;
  includeRuud: boolean;
  includeHex: boolean;
}

const getInitialPrizePresets = (): PrizePresetItem[] => [
  {
    id: 'custom_premio_1',
    name: 'Premio Personalizado',
    badgeColor: '#FFD700',
    icon: 'trophy',
    isCustom: true,
    zen: '10000000',
    includeZen: true,
    gcoins: '200',
    includeGCoins: true,
    wCoinP: '50',
    includeWCoinP: true,
    goblinPoints: '50',
    includeGoblinPoints: true,
    ruud: '300',
    includeRuud: true,
    includeHex: false,
  },
];

  const [prizePresets, setPrizePresets] = useState<PrizePresetItem[]>(getInitialPrizePresets());
  const [activePrizePresetId, setActivePrizePresetId] = useState<string>('bc');
  const [activePrizePresetName, setActivePrizePresetName] = useState<string>('Blood Castle');
  const [newPrizePresetName, setNewPrizePresetName] = useState<string>('');
  const [showSavePrizeInput, setShowSavePrizeInput] = useState<boolean>(false);

  const loadPrizePlayers = async (isBackground: boolean = false) => {
    try {
      if (!isBackground) setLoadingPrizePlayers(true);
      const res = await SqlClient.getOnlinePlayers();
      if (res.success && Array.isArray(res.players)) {
        setPrizeOnlinePlayers(res.players);
      } else if (!isBackground) {
        setPrizeOnlinePlayers([]);
      }
    } catch (e: any) {
      console.error('Error cargando jugadores online para premios:', e);
    } finally {
      if (!isBackground) setLoadingPrizePlayers(false);
    }
  };

  const loadPrizeHistory = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mumanager_prize_history');
      if (stored) setPrizeHistory(JSON.parse(stored));
    } catch (e) {
      console.error('Error cargando historial de premios:', e);
    }
  };

  const loadCustomPrizePresets = async () => {
    try {
      const stored = await AsyncStorage.getItem('@mumanager_prize_presets_v5');
      if (stored) {
        setPrizePresets(JSON.parse(stored));
      } else {
        const initial = getInitialPrizePresets();
        setPrizePresets(initial);
        await AsyncStorage.setItem('@mumanager_prize_presets_v5', JSON.stringify(initial));
      }
    } catch (e) {
      console.error('Error cargando presets de premios:', e);
    }
  };

  const handleApplyPrizePreset = (presetId: string) => {
    const found = prizePresets.find(p => p.id === presetId);
    if (found) {
      setActivePrizePresetId(found.id);
      setActivePrizePresetName(found.name);
      setPrizeZen(found.zen || '0');
      setPrizeIncludeZen(found.includeZen !== false);
      setPrizeGCoins(found.gcoins || '0');
      setPrizeIncludeGCoins(found.includeGCoins !== false);
      setPrizeWCoinP(found.wCoinP || '0');
      setPrizeIncludeWCoinP(found.includeWCoinP !== false);
      setPrizeGoblinPoints(found.goblinPoints || '0');
      setPrizeIncludeGoblinPoints(found.includeGoblinPoints !== false);
      setPrizeRuud(found.ruud || '0');
      setPrizeIncludeRuud(found.includeRuud !== false);
      setPrizeIncludeHex(found.includeHex === true);
      Alert.alert('Preset Cargado', 'Preset ' + found.name + ' cargado en el formulario.');
    }
  };

  const handleSaveCurrentToActivePrizePreset = async () => {
    const currentId = activePrizePresetId || 'bc';
    const trimmedName = activePrizePresetName.trim() || 'Premio';
    const updated = prizePresets.map(p => {
      if (p.id === currentId) {
        return {
          ...p,
          name: trimmedName,
          zen: prizeZen,
          includeZen: prizeIncludeZen,
          gcoins: prizeGCoins,
          includeGCoins: prizeIncludeGCoins,
          wCoinP: prizeWCoinP,
          includeWCoinP: prizeIncludeWCoinP,
          goblinPoints: prizeGoblinPoints,
          includeGoblinPoints: prizeIncludeGoblinPoints,
          ruud: prizeRuud,
          includeRuud: prizeIncludeRuud,
          includeHex: prizeIncludeHex,
        };
      }
      return p;
    });
    setPrizePresets(updated);
    setActivePrizePresetName(trimmedName);
    await AsyncStorage.setItem('@mumanager_prize_presets_v5', JSON.stringify(updated));
    Alert.alert(
      '¡Preset Modificado Exitosamente!',
      'Se han guardado los cambios en el botón \'' + trimmedName + '\'.\n\nAhora este botón entregará:\n• Zen: ' + (prizeIncludeZen ? prizeZen : 'Desactivado') + '\n• WCoinC: ' + (prizeIncludeGCoins ? prizeGCoins : 'Desactivado') + '\n• WCoinP: ' + (prizeIncludeWCoinP ? prizeWCoinP : 'Desactivado') + '\n• GP: ' + (prizeIncludeGoblinPoints ? prizeGoblinPoints : 'Desactivado') + '\n• Ruud: ' + (prizeIncludeRuud ? prizeRuud : 'Desactivado') + '\n• Ítem Maker: ' + (prizeIncludeHex ? 'Activado' : 'Desactivado')
    );
  };

  const handleCreateNewPrizePreset = async () => {
    const name = newPrizePresetName.trim();
    if (!name) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para el botón de premio.');
      return;
    }
    const newPreset: PrizePresetItem = {
      id: 'prize_custom_' + Date.now(),
      name,
      badgeColor: '#00B0FF',
      icon: 'star-outline',
      isCustom: true,
      zen: prizeZen,
      includeZen: prizeIncludeZen,
      gcoins: prizeGCoins,
      includeGCoins: prizeIncludeGCoins,
      wCoinP: prizeWCoinP,
      includeWCoinP: prizeIncludeWCoinP,
      goblinPoints: prizeGoblinPoints,
      includeGoblinPoints: prizeIncludeGoblinPoints,
      ruud: prizeRuud,
      includeRuud: prizeIncludeRuud,
      includeHex: prizeIncludeHex,
    };
    const updated = [...prizePresets, newPreset];
    setPrizePresets(updated);
    setActivePrizePresetId(newPreset.id);
    setActivePrizePresetName(newPreset.name);
    setNewPrizePresetName('');
    setShowSavePrizeInput(false);
    await AsyncStorage.setItem('@mumanager_prize_presets_v5', JSON.stringify(updated));
    Alert.alert('Nuevo Botón Creado', 'El botón de premio \'' + name + '\' fue guardado con éxito.');
  };

  const handleDeleteCustomPrizePreset = async (id: string) => {
    const updated = prizePresets.filter(p => p.id !== id);
    setPrizePresets(updated);
    await AsyncStorage.setItem('@mumanager_prize_presets_v5', JSON.stringify(updated));
    if (activePrizePresetId === id && updated.length > 0) {
      handleApplyPrizePreset(updated[0].id);
    }
  };

  const handleResetPrizePresets = async () => {
    Alert.alert(
      'Restaurar Presets de Premios',
      '¿Deseas restablecer todos los botones de premios a sus valores originales de fábrica?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Restaurar',
          style: 'destructive',
          onPress: async () => {
            const defaults = getInitialPrizePresets();
            setPrizePresets(defaults);
            await AsyncStorage.setItem('@mumanager_prize_presets_v5', JSON.stringify(defaults));
            handleApplyPrizePreset(defaults[0].id);
            Alert.alert('Restaurado', 'Presets de premios restablecidos a valores de fábrica.');
          }
        }
      ]
    );
  };

  const handleAddManualPlayerToPrizes = () => {
    const name = prizeManualCharInput.trim();
    if (!name) return;
    if (!selectedPlayerNames.includes(name)) {
      setSelectedPlayerNames(prev => [...prev, name]);
      Alert.alert('Jugador Añadido', `'${name}' añadido a la lista de entrega.`);
    } else {
      Alert.alert('Ya en Lista', `'${name}' ya está seleccionado.`);
    }
    setPrizeManualCharInput('');
  };

  const handleToggleSelectPlayer = (name: string) => {
    setSelectedPlayerNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleSelectAllPlayers = (filtered: OnlinePlayer[]) => {
    const allNames = filtered.map((p) => p.charName);
    setSelectedPlayerNames(allNames);
  };

  const handleDeselectAllPlayers = () => {
    setSelectedPlayerNames([]);
  };

  const handleDeliverBatchPrizes = async () => {
    let targets: string[] = [];

    if (prizeTargetMode === 'all') {
      targets = prizeOnlinePlayers.map(p => p.charName);
      if (targets.length === 0) {
        Alert.alert('Sin Conectados', 'No hay jugadores online conectados en este momento.');
        return;
      }
    } else if (prizeTargetMode === 'specific') {
      const single = prizeSpecificTarget.trim();
      if (!single) {
        Alert.alert('Destino Requerido', 'Ingresa el nombre del personaje o cuenta destinataria.');
        return;
      }
      targets = [single];
    } else {
      targets = selectedPlayerNames;
      if (targets.length === 0) {
        Alert.alert('Sin Selección', 'Selecciona al menos un jugador online o ingresa uno manualmente.');
        return;
      }
    }

    const zenNum = prizeIncludeZen ? (parseInt(prizeZen, 10) || 0) : 0;
    const gcoinsNum = prizeIncludeGCoins ? (parseInt(prizeGCoins, 10) || 0) : 0;
    const wcoinPNum = prizeIncludeWCoinP ? (parseInt(prizeWCoinP, 10) || 0) : 0;
    const gpNum = prizeIncludeGoblinPoints ? (parseInt(prizeGoblinPoints, 10) || 0) : 0;
    const ruudNum = prizeIncludeRuud ? (parseInt(prizeRuud, 10) || 0) : 0;
    const includeItem = prizeIncludeHex;

    if (!prizeIncludeZen && !prizeIncludeGCoins && !prizeIncludeWCoinP && !prizeIncludeGoblinPoints && !prizeIncludeRuud && !includeItem) {
      Alert.alert('Ninguna Recompensa Marcada', 'Debes marcar al menos una casilla (Zen, Monedas o Ítem) para entregar.');
      return;
    }

    const descTargets = targets.length === 1 ? `'${targets[0]}'` : `${targets.length} jugadores`;

    Alert.alert(
      'Confirmar Entrega de Premios',
      `¿Deseas entregar el premio configurado a ${descTargets}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Entregar Premios',
          onPress: async () => {
            try {
              setDeliveringPrize(true);
              const prizePayload = {
                zen: zenNum > 0 ? zenNum : undefined,
                gcoins: gcoinsNum > 0 ? gcoinsNum : undefined,
                wCoinP: wcoinPNum > 0 ? wcoinPNum : undefined,
                goblinPoints: gpNum > 0 ? gpNum : undefined,
                ruud: ruudNum > 0 ? ruudNum : undefined,
                itemHex: prizeIncludeHex ? generatedHex : undefined,
                warehouseIndex: prizeWarehouseIndex,
              };
              const res = await SqlClient.batchDeliverPrize(targets, prizePayload);
              if (res.success) {
                const parts = [];
                if (zenNum) parts.push(`${zenNum.toLocaleString()} Zen`);
                if (gcoinsNum) parts.push(`${gcoinsNum} WCoinC`);
                if (wcoinPNum) parts.push(`${wcoinPNum} WCoinP`);
                if (gpNum) parts.push(`${gpNum} GP`);
                if (ruudNum) parts.push(`${ruudNum} Ruud`);
                if (prizeIncludeHex) parts.push(`+ Ítem en ${prizeWarehouseIndex === 0 ? 'Baúl Principal' : 'Baúl #' + prizeWarehouseIndex}`);
                const detail = parts.join(' • ') || 'Premio';

                const newHistEntry = {
                  id: Date.now().toString(),
                  date: new Date().toLocaleTimeString(),
                  count: targets.length,
                  detail,
                };
                const updatedHist = [newHistEntry, ...prizeHistory.slice(0, 19)];
                await AsyncStorage.setItem('@mumanager_prize_history', JSON.stringify(updatedHist));
                setPrizeHistory(updatedHist);
                await logAdminAction('PREMIO_ENTREGADO', `Entregado a ${targets.length} jugadores (${detail})`);
                Alert.alert('¡Premios Entregados!', `Se entregaron los premios exitosamente a ${descTargets}.`);
                if (prizeTargetMode === 'selected') setSelectedPlayerNames([]);
              } else {
                Alert.alert('Error', res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setDeliveringPrize(false);
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // TAB: GESTIÓN DE CLANES (GUILDS) STATE & LOGIC (100% SQL)
  // ==========================================
  const [guildsList, setGuildsList] = useState<GuildEntry[]>([]);
  const [loadingGuilds, setLoadingGuilds] = useState<boolean>(false);
  const [guildSearch, setGuildSearch] = useState<string>('');
  const [selectedGuild, setSelectedGuild] = useState<GuildEntry | null>(null);
  const [guildMembers, setGuildMembers] = useState<GuildMemberEntry[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [guildModalVisible, setGuildModalVisible] = useState<boolean>(false);

  const getGuildRole = (status: number) => {
    if (status === 128) return { label: 'Líder / Master', color: '#FFD700' };
    if (status === 64) return { label: 'Asistente', color: '#00E676' };
    if (status === 32) return { label: 'Battle Master', color: '#FF5722' };
    return { label: 'Miembro', color: '#90CAF9' };
  };

  const loadGuilds = async () => {
    try {
      setLoadingGuilds(true);
      const res = await SqlClient.getGuilds();
      if (res.success) {
        setGuildsList(res.guilds || []);
      }
    } catch (e) {
      console.error('Error cargando clanes:', e);
    } finally {
      setLoadingGuilds(false);
    }
  };

  const handleOpenGuildMembers = async (g: GuildEntry) => {
    setSelectedGuild(g);
    setGuildModalVisible(true);
    const targetName = (g.G_Name || g.name || '').trim();
    try {
      setLoadingMembers(true);
      const res = await SqlClient.getGuildMembers(targetName);
      if (res.success) {
        setGuildMembers(res.members || []);
      } else {
        setGuildMembers([]);
      }
    } catch (e) {
      console.error('Error cargando miembros del clan:', e);
      setGuildMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleDeleteGuild = (guildName: string) => {
    Alert.alert(
      'Disolver Clan',
      `¿Estás seguro de que deseas eliminar y disolver permanentemente el clan "${guildName}"? Esta acción se ejecutará directamente en la base de datos SQL.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Disolver Clan',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await SqlClient.deleteGuild(guildName);
              if (res.success) {
                await logAdminAction('CLAN_DISUELTO', `Clan disuelto: ${guildName}`);
                Alert.alert('Clan Disuelto', res.message || `El clan ${guildName} ha sido eliminado.`);
                setGuildModalVisible(false);
                loadGuilds();
              } else {
                Alert.alert('Error', res.message || 'No se pudo disolver el clan.');
              }
            } catch (err: any) {
              Alert.alert('Error SQL', err?.message || 'Fallo de conexión.');
            }
          },
        },
      ]
    );
  };

  // ==========================================
  // TAB: CONTROL DE ASESINOS (PK) STATE & LOGIC (100% SQL)
  // ==========================================
  const [pkList, setPkList] = useState<PkPlayerEntry[]>([]);
  const [loadingPk, setLoadingPk] = useState<boolean>(false);
  const [pkSearch, setPkSearch] = useState<string>('');

  const getPkBadge = (level: number) => {
    switch (level) {
      case 6:
        return { label: 'Phonomania (Asesino Lv2)', color: '#E2703A', bg: 'rgba(226, 112, 58, 0.2)' };
      case 5:
        return { label: 'Asesino Lv1', color: '#E8C86A', bg: 'rgba(232, 200, 106, 0.2)' };
      case 4:
        return { label: 'Advertencia PK', color: '#B58F3C', bg: 'rgba(181, 143, 60, 0.2)' };
      default:
        return { label: 'PK Leve', color: '#9C9182', bg: 'rgba(156, 145, 130, 0.2)' };
    }
  };

  const loadPkList = async () => {
    try {
      setLoadingPk(true);
      const res = await SqlClient.getPkList();
      if (res.success) {
        setPkList(res.pks || []);
      }
    } catch (e) {
      console.error('Error cargando asesinos PK:', e);
    } finally {
      setLoadingPk(false);
    }
  };

  const handleClearPkTab = (characterName?: string) => {
    const isAll = !characterName;
    const title = isAll ? 'Limpiar Todos los PK' : `Limpiar PK de ${characterName}`;
    const message = isAll
      ? '¿Deseas resetear el estado PK de TODOS los asesinos del servidor a Ciudadano Común (PkLevel 3)?'
      : `¿Deseas perdonar el estado asesino de ${characterName} y restaurarlo a Ciudadano Común?`;

    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar PK',
        onPress: async () => {
          try {
            const res = await SqlClient.clearPk(characterName, isAll);
            if (res.success) {
              await logAdminAction(
                isAll ? 'PK_CLEAR_ALL' : 'PK_CLEAR_CHAR',
                isAll ? 'Limpieza masiva de PK en el servidor' : `PK limpiado para ${characterName}`
              );
              Alert.alert('PK Limpiado', res.message || 'Estado PK restablecido exitosamente.');
              loadPkList();
            } else {
              Alert.alert('Error', res.message || 'No se pudo limpiar el PK.');
            }
          } catch (err: any) {
            Alert.alert('Error SQL', err?.message || 'Fallo de conexión.');
          }
        },
      },
    ]);
  };

  // ==========================================
  // TAB: JUGADORES, BANS Y GM STATE & LOGIC
  // ==========================================
// playerSubTab moved to top
  const [playersList, setPlayersList] = useState<OnlinePlayer[]>([]);
  const [loadingPlayersList, setLoadingPlayersList] = useState<boolean>(false);
  const [playersSearch, setPlayersSearch] = useState<string>('');
  const [bansList, setBansList] = useState<BanEntry[]>([]);
  const [loadingBansList, setLoadingBansList] = useState<boolean>(false);
  const [gmsList, setGmsList] = useState<GmEntry[]>([]);
  const [loadingGmsList, setLoadingGmsList] = useState<boolean>(false);

  // GM Modal
  const [gmModalVisible, setGmModalVisible] = useState<boolean>(false);
  const [gmCharNameInput, setGmCharNameInput] = useState<string>('');
  const [gmAccountInput, setGmAccountInput] = useState<string>('');
  const [selectedGmLevel, setSelectedGmLevel] = useState<GmLevel>(2);
  const [savingGmLevel, setSavingGmLevel] = useState<boolean>(false);

  // Manual Ban Modal
  const [banModalVisible, setBanModalVisible] = useState<boolean>(false);
  const [banAccountInput, setBanAccountInput] = useState<string>('');
  const [banReasonInput, setBanReasonInput] = useState<string>('');
  const [savingBan, setSavingBan] = useState<boolean>(false);

  // Modal para detalle y acciones rápidas de jugador online
  const [selectedPlayerModal, setSelectedPlayerModal] = useState<OnlinePlayer | null>(null);

  // Modal Banear Únicamente Personaje
  const [charBanModalVisible, setCharBanModalVisible] = useState<boolean>(false);
  const [banCharNameInput, setBanCharNameInput] = useState<string>('');
  const [banCharReasonInput, setBanCharReasonInput] = useState<string>('');
  const [savingCharBan, setSavingCharBan] = useState<boolean>(false);

  // Filtro y búsqueda en pestaña Bans
  const [bansFilter, setBansFilter] = useState<'all' | 'characters' | 'accounts'>('all');
  const [bansSearch, setBansSearch] = useState<string>('');

  const loadOnlinePlayers = async (isBackground: boolean = false) => {
    try {
      if (!isBackground) {
        setLoadingPlayersList(true);
      }
      // Auto-enforce IP limit in background if enabled and set to DISCONNECT
      try {
        const raw = await AsyncStorage.getItem('@mumanager_ip_limit');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.enabled && parsed.action === 'DISCONNECT') {
            await SqlClient.enforceIpLimit(parsed.maxPerIp || 3, 'DISCONNECT');
          }
        }
      } catch (_) {}

      const res = await SqlClient.getOnlinePlayers();
      if (res.success) {
        setPlayersList(res.players);
      }
    } catch (e) {
      console.error('Error cargando online players:', e);
    } finally {
      if (!isBackground) {
        setLoadingPlayersList(false);
      }
    }
  };

  const handleTeleportPlayerCity = async (charName: string, cityName: string, map: number, x: number, y: number) => {
    try {
      const res = await SqlClient.teleportCharacter(charName, map, x, y);
      if (res.success) {
        await logAdminAction('PJ_TELEPORTADO', `${charName} teletransportado a ${cityName} (${x}, ${y})`);
        Alert.alert('Personaje Movido', `'${charName}' ha sido movido a ${cityName} (${x}, ${y}). La sesión en el servidor fue actualizada.`);
        loadOnlinePlayers();
      } else {
        Alert.alert('Error al Mover Personaje', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleClearPkForPlayer = async (charName: string) => {
    try {
      const res = await SqlClient.clearPk(charName, false);
      if (res.success) {
        await logAdminAction('PK_CLEAR_CHAR', `PK limpiado para ${charName} desde panel rápido`);
        Alert.alert('PK Limpiado', res.message || `Estado PK de '${charName}' restaurado a Ciudadano Común.`);
        loadOnlinePlayers();
      } else {
        Alert.alert('Error al Limpiar PK', res.message);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleDisconnectPlayer = (acc: string) => {
    Alert.alert('Desconectar Cuenta', `¿Deseas desconectar forzosamente la cuenta '${acc}'?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desconectar',
        style: 'destructive',
        onPress: async () => {
          const res = await SqlClient.disconnectAccount(acc);
          if (res.success) {
            await logAdminAction('JUGADOR_DESCONECTADO', `Cuenta ${acc} desconectada`);
            Alert.alert('Éxito', res.message);
            loadOnlinePlayers();
          } else {
            Alert.alert('Error', res.message);
          }
        },
      },
    ]);
  };

  const handleTeleportLorencia = async (charName: string) => {
    const res = await SqlClient.teleportCharacter(charName, 0, 125, 125);
    if (res.success) {
      await logAdminAction('PJ_TELEPORTADO', `${charName} teletransportado a Lorencia (125,125)`);
      Alert.alert('Teleportado', res.message);
    } else {
      Alert.alert('Error', res.message);
    }
  };

  const loadBans = async () => {
    try {
      setLoadingBansList(true);
      const res = await SqlClient.getBannedAccounts();
      if (res.success) {
        setBansList(res.bans);
      }
    } catch (e) {
      console.error('Error cargando baneados:', e);
    } finally {
      setLoadingBansList(false);
    }
  };

  const handleUnbanAccount = (acc: string) => {
    Alert.alert('Desbanear Cuenta', `¿Deseas levantar el bloqueo a la cuenta '${acc}'?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbanear',
        onPress: async () => {
          const res = await SqlClient.unbanAccount(acc);
          if (res.success) {
            await logAdminAction('CUENTA_DESBANEADA', `Cuenta ${acc} desbaneada`);
            Alert.alert('Éxito', res.message);
            loadBans();
          } else {
            Alert.alert('Error', res.message);
          }
        },
      },
    ]);
  };

  const handleSaveBanSubmit = async () => {
    const acc = banAccountInput.trim();
    if (!acc) {
      Alert.alert('Cuenta requerida', 'Ingresa el nombre de la cuenta a banear.');
      return;
    }
    try {
      setSavingBan(true);
      const res = await SqlClient.banAccount(acc, banReasonInput.trim() || 'Bloqueo administrativo');
      if (res.success) {
        await SqlClient.disconnectAccount(acc);
        await logAdminAction('CUENTA_BANEADA', `Cuenta ${acc}: ${banReasonInput}`);
        Alert.alert('Cuenta Bloqueada y Desconectada', res.message);
        setBanModalVisible(false);
        setBanAccountInput('');
        setBanReasonInput('');
        loadBans();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingBan(false);
    }
  };

  const handleUnbanCharacter = (charName: string) => {
    Alert.alert('Desbanear Personaje', `¿Deseas reactivar el personaje '${charName}' (CtlCode = 0)?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Desbanear',
        onPress: async () => {
          const res = await SqlClient.unbanCharacter(charName);
          if (res.success) {
            await logAdminAction('PERSONAJE_DESBANEADO', `Personaje ${charName} desbaneado`);
            Alert.alert('Éxito', res.message);
            loadBans();
          } else {
            Alert.alert('Error', res.message);
          }
        },
      },
    ]);
  };

  const handleSaveCharBanSubmit = async () => {
    const name = banCharNameInput.trim();
    if (!name) {
      Alert.alert('Personaje requerido', 'Ingresa el nombre del personaje a banear.');
      return;
    }
    try {
      setSavingCharBan(true);
      const res = await SqlClient.banCharacter(name, banCharReasonInput.trim() || 'Bloqueo administrativo de personaje');
      if (res.success) {
        await SqlClient.disconnectAccount(undefined, name);
        await logAdminAction('PERSONAJE_BANEADO', `Personaje ${name}: ${banCharReasonInput}`);
        Alert.alert('Personaje Baneado y Desconectado', res.message);
        setCharBanModalVisible(false);
        setBanCharNameInput('');
        setBanCharReasonInput('');
        if (selectedPlayerModal?.charName === name) {
          setSelectedPlayerModal(null);
        }
        loadBans();
        loadOnlinePlayers();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingCharBan(false);
    }
  };

  const loadGms = async () => {
    try {
      setLoadingGmsList(true);
      const res = await SqlClient.getGmList();
      if (res.success) {
        setGmsList(res.gms);
      }
    } catch (e) {
      console.error('Error cargando GMs:', e);
    } finally {
      setLoadingGmsList(false);
    }
  };

  const handleSaveGmLevelSubmit = async () => {
    const char = gmCharNameInput.trim();
    if (!char) {
      Alert.alert('Personaje requerido', 'Ingresa el nombre del personaje.');
      return;
    }
    try {
      setSavingGmLevel(true);
      const res = await SqlClient.setGmLevel(char, gmAccountInput.trim(), selectedGmLevel);
      if (res.success) {
        const levelNames = ['Normal (0)', 'Helper (1)', 'Game Master (2)', 'Administrador (3)'];
        await logAdminAction('NIVEL_GM_CAMBIADO', `${char} asignado a ${levelNames[selectedGmLevel]}`);
        Alert.alert('Rango Actualizado', res.message);
        setGmModalVisible(false);
        setGmCharNameInput('');
        setGmAccountInput('');
        loadGms();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setSavingGmLevel(false);
    }
  };

  const handleRemoveGm = (charName: string, accountId?: string) => {
    Alert.alert(
      'Revocar Rango GM',
      `¿Deseas quitar todos los privilegios de GM al personaje '${charName}'?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Revocar',
          style: 'destructive',
          onPress: async () => {
            const res = await SqlClient.removeGm(charName, accountId || '');
            if (res.success) {
              await logAdminAction('GM_REVOCADO', `Privilegios GM revocados a ${charName}`);
              Alert.alert('Éxito', res.message);
              loadGms();
            } else {
              Alert.alert('Error', res.message);
            }
          },
        },
      ]
    );
  };



  // ==========================================
  // FIXES ADDITIONS STATE & LOGIC
  // ==========================================
  const [ipAbuseMaxLimit, setIpAbuseMaxLimit] = useState<string>('3');
  const [ipAbuseResults, setIpAbuseResults] = useState<{ ip: string; count: number; accounts: string[] }[]>([]);
  const [isScanningIpAbuse, setIsScanningIpAbuse] = useState<boolean>(false);
  const [isDisconnectingIps, setIsDisconnectingIps] = useState<boolean>(false);

  const handleScanIpAbuse = async () => {
    try {
      setIsScanningIpAbuse(true);
      const limit = parseInt(ipAbuseMaxLimit, 10) || 3;
      const res = await SqlClient.getAccountsByIpLimit(limit);
      if (res.success) {
        setIpAbuseResults(res.offending);
        if (res.offending.length === 0) {
          Alert.alert('Control de IP Limpio', `Ninguna IP tiene más de ${limit} cuentas conectadas.`);
        } else {
          Alert.alert('Abuso Detectado', `Se detectaron ${res.offending.length} direcciones IP superando el límite.`);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsScanningIpAbuse(false);
    }
  };

  const handleDisconnectIpAbusers = () => {
    const limit = parseInt(ipAbuseMaxLimit, 10) || 3;
    Alert.alert(
      'Desconectar Cuentas Excedentes',
      `¿Deseas desconectar todas las cuentas que superen ${limit} conexiones por IP?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desconectar',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDisconnectingIps(true);
              const res = await SqlClient.disconnectExceededIpAccounts(limit);
              if (res.success) {
                await logAdminAction('IP_EXCEDENTES_DC', `Desconectadas ${res.disconnected} cuentas`);
                Alert.alert('Éxito', res.message);
                handleScanIpAbuse();
              } else {
                Alert.alert('Error', res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message);
            } finally {
              setIsDisconnectingIps(false);
            }
          },
        },
      ]
    );
  };


  // Tab auto-loader
  useEffect(() => {
    if (activeTab === 'prizes') {
      loadPrizePlayers(false);
      loadPrizeHistory();
      loadCustomPrizePresets();
      const prizeInterval = setInterval(() => {
        loadPrizePlayers(true);
      }, 5000);
      return () => clearInterval(prizeInterval);
    } else if (activeTab === 'kit') {
      loadCustomKitPresets();
    } else if (activeTab === 'guilds') {
      loadGuilds();
    } else if (activeTab === 'pk') {
      loadPkList();
    } else if (activeTab === 'players') {
      if (playerSubTab === 'online') {
        loadOnlinePlayers(false);
        const interval = setInterval(() => {
          loadOnlinePlayers(true);
        }, 5000);
        return () => clearInterval(interval);
      }
      if (playerSubTab === 'bans') loadBans();
      if (playerSubTab === 'gm') loadGms();
    }
  }, [activeTab, playerSubTab]);

  const isWeapon = selectedItemDef?.category === 'weapon';
  const excOptions = isWeapon ? EXCELLENT_OPTIONS_WEAPON : EXCELLENT_OPTIONS_ARMOR;

  return (
    <ErrorBoundary tabName="Pantalla de Herramientas">
      <View style={styles.container}>
      <Header
        title={t('toolsTitle')}
        subtitle="Pack Completo de Super-Herramientas"
        showConnectionBadge={true}
      />

      {/* Modern Segmented Navigation Bar */}
      <View style={[styles.tabBarContainer, { position: 'relative' }]}>
        <ScrollView
          ref={tabScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={16}
          onScroll={(e) => {
            const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
            const isNearEnd = contentOffset.x + layoutMeasurement.width >= contentSize.width - 20;
            if (isNearEnd && showScrollHint) {
              setShowScrollHint(false);
            } else if (!isNearEnd && !showScrollHint) {
              setShowScrollHint(true);
            }
          }}
          contentContainerStyle={styles.tabBarScroll}
        >
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'maker' && styles.tabButtonActive]}
            onPress={() => setActiveTab('maker')}
          >
            <MaterialCommunityIcons
              name="cube-send"
              size={18}
              color={activeTab === 'maker' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'maker' && styles.tabButtonTextActive]}>
              Item Maker
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'antidupe' && styles.tabButtonActive]}
            onPress={() => setActiveTab('antidupe')}
          >
            <MaterialCommunityIcons
              name="shield-search"
              size={18}
              color={activeTab === 'antidupe' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'antidupe' && styles.tabButtonTextActive]}>
              Anti-Dupe
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'rankings' && styles.tabButtonActive]}
            onPress={() => setActiveTab('rankings')}
          >
            <MaterialCommunityIcons
              name="trophy"
              size={18}
              color={activeTab === 'rankings' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'rankings' && styles.tabButtonTextActive]}>
              Rankings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'fixes' && styles.tabButtonActive]}
            onPress={() => setActiveTab('fixes')}
          >
            <MaterialCommunityIcons
              name="wrench"
              size={18}
              color={activeTab === 'fixes' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'fixes' && styles.tabButtonTextActive]}>
              Fixes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'parsers' && styles.tabButtonActive]}
            onPress={() => setActiveTab('parsers')}
          >
            <MaterialCommunityIcons
              name="file-cog-outline"
              size={18}
              color={activeTab === 'parsers' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'parsers' && styles.tabButtonTextActive]}>
              Parsers
            </Text>
          </TouchableOpacity>

          {/* Visual Divider between Original 5 and New 4 Tabs */}
          <View style={{ width: 1, height: 24, backgroundColor: '#6B5533', alignSelf: 'center', marginHorizontal: 4 }} />

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'kit' && styles.tabButtonActive]}
            onPress={() => setActiveTab('kit')}
          >
            <MaterialCommunityIcons
              name="package-variant-closed"
              size={18}
              color={activeTab === 'kit' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'kit' && styles.tabButtonTextActive]}>
              Starter Kit
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'prizes' && styles.tabButtonActive]}
            onPress={() => setActiveTab('prizes')}
          >
            <MaterialCommunityIcons
              name="gift-outline"
              size={18}
              color={activeTab === 'prizes' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'prizes' && styles.tabButtonTextActive]}>
              Premios
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'players' && styles.tabButtonActive]}
            onPress={() => setActiveTab('players')}
          >
            <MaterialCommunityIcons
              name="account-group"
              size={18}
              color={activeTab === 'players' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'players' && styles.tabButtonTextActive]}>
              Jugadores & GM
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'guilds' && styles.tabButtonActive]}
            onPress={() => setActiveTab('guilds')}
          >
            <MaterialCommunityIcons
              name="shield-account"
              size={18}
              color={activeTab === 'guilds' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'guilds' && styles.tabButtonTextActive]}>
              Clanes
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'pk' && styles.tabButtonActive]}
            onPress={() => setActiveTab('pk')}
          >
            <MaterialCommunityIcons
              name="skull"
              size={18}
              color={activeTab === 'pk' ? '#E8C86A' : '#9C9182'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'pk' && styles.tabButtonTextActive]}>
              PK / Asesinos
            </Text>
          </TouchableOpacity>
        </ScrollView>
        {showScrollHint && activeTab !== 'pk' && (
          <View style={styles.scrollHintOverlay} pointerEvents="none">
            <MaterialCommunityIcons name="chevron-right" size={20} color="#E8C86A" />
          </View>
        )}
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* ========================================================================= */}
        {/* TAB 1: ITEM MAKER & INJECTOR                                              */}
        {/* ========================================================================= */}
        {activeTab === 'maker' && (
          <ErrorBoundary tabName="Item Maker">

          <View style={styles.tabContent}>
            {/* Botón Rápido: Inyectar Set Completo */}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#FF6D00', marginTop: 0, marginBottom: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, height: 46 }]}
              onPress={() => setQuickSetModalVisible(true)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="lightning-bolt" size={22} color="#FFF" />
              <Text style={[styles.actionBtnText, { fontSize: 14, fontWeight: 'bold' }]}>
                INYECTAR SET COMPLETO (EDICIÓN RÁPIDA)
              </Text>
            </TouchableOpacity>
            {/* Header / Target Account Input */}
            <View style={[styles.card, { zIndex: 10 }]}>
              <Text style={styles.cardTitle}>Destino de Inyección</Text>
              <Text style={styles.cardDesc}>
                Ingresa la cuenta donde se inyectará el ítem en su primer slot libre del Baúl:
              </Text>
              <AutocompleteInput
                value={makerAccount}
                onChangeText={setMakerAccount}
                suggestions={makerAccountSuggestions}
                placeholder="Cuenta (AccountID, ej: admin)"
                icon="account"
                autoCapitalize="none"
                maxSuggestions={6}
              />
              <View style={{ marginTop: 12 }}>
                <Text style={{ color: '#AAA', fontSize: 12, marginBottom: 6, fontWeight: '700' }}>
                  Baúl de Destino:
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { idx: 0, label: 'Baúl Principal' },
                      { idx: 1, label: 'Bóveda Expandida' },
                      { idx: 2, label: 'Baúl #2' },
                      { idx: 3, label: 'Baúl #3' },
                      { idx: 4, label: 'Baúl #4' },
                      { idx: 5, label: 'Baúl #5' },
                    ].map((v) => (
                      <TouchableOpacity
                        key={'maker_ware_' + v.idx}
                        style={[
                          styles.filterPill,
                          makerWarehouseIndex === v.idx && styles.filterPillActive,
                        ]}
                        onPress={() => setMakerWarehouseIndex(v.idx)}
                      >
                        <Text style={[styles.filterPillText, makerWarehouseIndex === v.idx && styles.filterPillTextActive]}>
                          {v.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            </View>

            {/* Buscador Rápido de Ítems */}
            <View style={[styles.card, { zIndex: 30, marginBottom: 10 }]}>
              <Text style={styles.cardTitle}>Buscar Ítem por Nombre</Text>
              <Text style={styles.cardDesc}>
                Escribe cualquier nombre (ej: Fenrir, Dragon, Hades, Pad, Wing, Seed...) y tócalo para seleccionarlo al instante:
              </Text>
              <AutocompleteInput
                value={itemSearchText}
                onChangeText={setItemSearchText}
                suggestions={itemSearchSuggestions}
                onSuggestionPress={handleSelectItemByName}
                placeholder="Buscar ítem (ej: Fenrir, Dragon, Wing, Seed, Bless...)"
                icon="magnify"
                autoCapitalize="none"
                maxSuggestions={8}
              />
            </View>

            {/* Categorías Reorganizadas y Limpias con Chip */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Categoría del Ítem</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {MAKER_CATEGORIES.map((cat) => {
                    const isSel = selectedMakerCatId === cat.id;
                    return (
                      <Chip
                        key={'cat_maker_' + cat.id}
                        etiqueta={cat.name.split('/')[0].trim()}
                        activo={isSel}
                        onPress={() => handleSelectMakerCategory(cat.id)}
                        icono={
                          <MaterialCommunityIcons
                            name={cat.icon as any}
                            size={16}
                            color={isSel ? '#191512' : THEME.colors.oroClaro}
                          />
                        }
                      />
                    );
                  })}
                </View>
              </ScrollView>

              {/* Items in Current Selected Category con Chip */}
              <Text style={[styles.cardTitle, { marginTop: 12 }]}>Seleccionar Ítem</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(() => {
                    const curCat = MAKER_CATEGORIES.find((c) => c.id === selectedMakerCatId) || MAKER_CATEGORIES[0];
                    const items = DEFAULT_ITEM_CATALOG.filter(curCat.filter);
                    return items.map((item) => {
                      const isItemSel = selectedItemDef.group === item.group && selectedItemDef.index === item.index && (selectedItemDef.name === item.name);
                      return (
                        <Chip
                          key={`item_${item.group}_${item.index}_${item.name}`}
                          etiqueta={item.name}
                          activo={isItemSel}
                          onPress={() => {
                            setSelectedItemDef(item);
                            setItemSearchText(item.name);
                            if (item.group === 13 && item.index === 37) {
                              const fenFlags = (item as any).defaultExc !== undefined ? (item as any).defaultExc : 0;
                              setMakerExcFlags(fenFlags);
                            }
                          }}
                          icono={
                            <ItemImage
                              itemName={item.name}
                              size={20}
                              fallbackIcon={item.icon as any}
                              fallbackColor={isItemSel ? '#191512' : THEME.colors.oroClaro}
                            />
                          }
                        />
                      );
                    });
                  })()}
                </View>
              </ScrollView>
            </View>

            {/* Item Live Preview & 32-Hex Display dentro de un Panel */}
            <Panel style={styles.previewCard}>
              <View style={styles.previewHeader}>
                <ItemImage
                  itemName={selectedItemDef.name}
                  size={54}
                  fallbackIcon={selectedItemDef.icon as any}
                  fallbackColor={THEME.colors.oroClaro}
                />
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text style={styles.previewName}>
                    {selectedItemDef.name} +{makerLevel}
                  </Text>
                  <Text style={styles.previewSub}>
                    Grupo: {selectedItemDef.group} | Index: {selectedItemDef.index} | Tamaño: {selectedItemDef.width}×{selectedItemDef.height}
                  </Text>
                  <Text style={styles.previewStats}>
                    Opción: +{makerOption * 4} • {makerLuck ? 'Luck • ' : ''}{makerSkill ? 'Skill • ' : ''}
                    {maker380 ? <Text style={{ color: THEME.colors.arcano }}>PvP 380 • </Text> : null}
                    {makerAncient > 0 ? <Text style={{ color: THEME.colors.itemAncient }}>Ancient</Text> : null}
                  </Text>
                </View>
              </View>

              <View style={styles.hexBox}>
                <Text style={styles.hexLabel}>Cadena Hexadecimal (16 Bytes / 32 Caracteres):</Text>
                <View style={styles.hexRow}>
                  <Text style={styles.hexText} selectable>{generatedHex}</Text>
                  <TouchableOpacity style={styles.copyBtn} onPress={handleCopyHex} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="content-copy" size={20} color={THEME.colors.oroClaro} />
                  </TouchableOpacity>
                </View>
              </View>
            </Panel>

            
            {/* Selector Compacto de Color de Fenrir (Rojo, Negro, Azul, Dorado) */}
            {selectedItemDef.group === 13 && selectedItemDef.index === 37 && (
              <View style={[styles.card, { borderColor: '#EAB308', borderWidth: 1, backgroundColor: '#141208', padding: 10 }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#FACC15' }}>COLOR DE FENRIR</Text>
                  <Text style={{ fontSize: 10, color: '#A1A1AA' }}>
                    {makerExcFlags === 4 ? 'Dorado (Golden)' : makerExcFlags === 2 ? 'Azul (Protección)' : makerExcFlags === 1 ? 'Negro (Destrucción)' : 'Rojo (Normal)'}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { label: 'Rojo', flags: 0, color: '#EF4444', subType: 'red' },
                    { label: 'Negro', flags: 1, color: '#A1A1AA', subType: 'black' },
                    { label: 'Azul', flags: 2, color: '#3B82F6', subType: 'blue' },
                    { label: 'Dorado', flags: 4, color: '#EAB308', subType: 'gold' },
                  ].map((fen) => {
                    const isSelected = makerExcFlags === fen.flags;
                    return (
                      <TouchableOpacity
                        key={'maker_fen_' + fen.flags}
                        onPress={() => {
                          setMakerExcFlags(fen.flags);
                          const match = DEFAULT_ITEM_CATALOG.find(
                            (i) => i.group === 13 && i.index === 37 && (i as any).subType === fen.subType
                          );
                          if (match) {
                            setSelectedItemDef(match);
                            setItemSearchText(match.name);
                          }
                        }}
                        style={{
                          flex: 1,
                          paddingVertical: 7,
                          paddingHorizontal: 4,
                          borderRadius: 6,
                          borderWidth: 1.5,
                          borderColor: isSelected ? fen.color : '#333338',
                          backgroundColor: isSelected ? `${fen.color}25` : '#1C1C22',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: isSelected ? fen.color : '#DDD' }}>
                          {fen.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Ancient Option Selector (Item Maker) */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.cardTitle}>Opción Ancient (Sets Acc)</Text>
                {makerAncient > 0 && (
                  <Text style={{ fontSize: 11, color: '#00E5FF', fontWeight: 'bold' }}>
                    (+{decodeAncientByte(makerAncient).staminaBonus} Stamina)
                  </Text>
                )}
              </View>

              {!isItemAncientEligible(selectedItemDef.group, selectedItemDef.index) ? (
                <Text style={{ color: '#888', fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
                  Esta pieza ({selectedItemDef.name}) no posee set Ancient oficial en Season 6.
                </Text>
              ) : (
                <View style={{ marginTop: 6 }}>
                  <Text style={styles.cardDesc}>Sets Ancient oficiales correspondientes a esta pieza:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginTop: 6 }}>
                    {/* Normal */}
                    <TouchableOpacity
                      style={[
                        styles.ancientBtn,
                        makerAncient === 0 && { borderColor: '#888', backgroundColor: 'rgba(255,255,255,0.1)' },
                      ]}
                      onPress={() => setMakerAncient(0)}
                    >
                      <Text style={[styles.ancientBtnText, makerAncient === 0 && { color: '#FFF', fontWeight: 'bold' }]}>
                        Normal (Sin Ancient)
                      </Text>
                    </TouchableOpacity>

                    {/* Piece-specific options */}
                    {getAvailableAncientOptionsForItem(selectedItemDef.group, selectedItemDef.index).map((anc) => {
                      const currentDecoded = decodeAncientByte(makerAncient);
                      const isSel = currentDecoded.tier === anc.tier && makerAncient > 0;
                      return (
                        <TouchableOpacity
                          key={'maker_anc_' + anc.tier + '_' + anc.setId}
                          style={[
                            styles.ancientBtn,
                            isSel && { borderColor: '#00E5FF', backgroundColor: 'rgba(0,229,255,0.15)' },
                          ]}
                          onPress={() => {
                            const curStam = currentDecoded.staminaBonus === 10 ? 10 : 5;
                            setMakerAncient(encodeAncientByte(anc.tier, curStam));
                          }}
                        >
                          <Text style={[styles.ancientBtnText, isSel && { color: '#00E5FF', fontWeight: 'bold' }]}>
                            {anc.name} (Tier {anc.tier})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Stamina Bonus */}
                  {makerAncient > 0 && (
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                      {[5, 10].map((bonus) => {
                        const currentDecoded = decodeAncientByte(makerAncient);
                        const isSelBonus = currentDecoded.staminaBonus === bonus;
                        return (
                          <TouchableOpacity
                            key={'maker_stam_' + bonus}
                            style={[
                              {
                                flex: 1,
                                paddingVertical: 5,
                                alignItems: 'center',
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: isSelBonus ? '#00E5FF' : '#444',
                                backgroundColor: isSelBonus ? 'rgba(0,229,255,0.2)' : 'transparent',
                              },
                            ]}
                            onPress={() => {
                              setMakerAncient(encodeAncientByte(currentDecoded.tier || 1, bonus));
                            }}
                          >
                            <Text style={{ fontSize: 11, color: isSelBonus ? '#00E5FF' : '#AAA', fontWeight: isSelBonus ? 'bold' : 'normal' }}>
                              +{bonus} Stamina ({bonus === 5 ? 'Standard' : 'Max'})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Attributes Controls */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Nivel y Opción</Text>
              {/* Level row */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Nivel (+0 .. +15):</Text>
                <View style={styles.counterWrap}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setMakerLevel((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>+{makerLevel}</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setMakerLevel((prev) => Math.min(15, prev + 1))}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: '#E65100', width: 44 }]}
                    onPress={() => setMakerLevel(15)}
                  >
                    <Text style={styles.counterBtnText}>MAX</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Option row */}
              <View style={styles.controlRow}>
                <Text style={styles.controlLabel}>Opción (+0 .. +28):</Text>
                <View style={styles.counterWrap}>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setMakerOption((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={styles.counterBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.counterValue}>+{makerOption * 4}</Text>
                  <TouchableOpacity
                    style={styles.counterBtn}
                    onPress={() => setMakerOption((prev) => Math.min(7, prev + 1))}
                  >
                    <Text style={styles.counterBtnText}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: '#E65100', width: 44 }]}
                    onPress={() => setMakerOption(7)}
                  >
                    <Text style={styles.counterBtnText}>MAX</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Switches */}
              <View style={styles.switchRow}>
                <Text style={styles.controlLabel}>Suerte (Luck + Crítico):</Text>
                <Switch
                  value={makerLuck}
                  onValueChange={setMakerLuck}
                  thumbColor={makerLuck ? '#FF9800' : '#888'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.controlLabel}>Habilidad (Skill):</Text>
                <Switch
                  value={makerSkill}
                  onValueChange={setMakerSkill}
                  thumbColor={makerSkill ? '#FF9800' : '#888'}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.controlLabel}>Opción 380 PvP:</Text>
                <Switch
                  value={maker380}
                  onValueChange={setMaker380}
                  thumbColor={maker380 ? '#FF9800' : '#888'}
                />
              </View>
            </View>

            {/* Excellent Options con soporte nativo de Ítems Normales */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.cardTitle, { marginBottom: 0 }]}>Opciones Excelentes</Text>
                  <View style={{
                    backgroundColor: makerExcFlags === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 230, 118, 0.15)',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 6,
                    borderWidth: 1,
                    borderColor: makerExcFlags === 0 ? '#555' : '#00E676',
                  }}>
                    <Text style={{
                      fontSize: 10,
                      fontWeight: 'bold',
                      color: makerExcFlags === 0 ? '#AAA' : '#00E676'
                    }}>
                      {makerExcFlags === 0 ? 'ÍTEM NORMAL' : 'EXCELENTE'}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={[styles.excQuickBtn, makerExcFlags === 0 && { borderColor: '#888', backgroundColor: '#33333E' }]}
                    onPress={handleClearExc}
                  >
                    <Text style={[styles.excQuickBtnText, makerExcFlags === 0 && { color: '#FFF' }]}>Normal (Sin Exc)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.excQuickBtn} onPress={handleSetFullExc}>
                    <Text style={styles.excQuickBtnText}>Full Exc</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                {makerExcFlags === 0
                  ? 'El ítem está configurado como Normal. Puedes agregarle Nivel, Opción (+28), Suerte (Luck), Habilidad (Skill) o PvP 380 arriba. Al marcar cualquier opción abajo se convertirá en Excelente.'
                  : 'Has activado opciones excelentes para este ítem. Desmárcalas o presiona "Normal (Sin Exc)" para volver a ítem normal.'}
              </Text>

              <View style={styles.excGrid}>
                {excOptions.map((opt) => {
                  const isActive = (makerExcFlags & opt.bit) !== 0;
                  return (
                    <TouchableOpacity
                      key={`exc_${opt.bit}`}
                      style={[styles.excChip, isActive && styles.excChipActive]}
                      onPress={() => toggleExcOption(opt.bit)}
                    >
                      <MaterialCommunityIcons
                        name={isActive ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={18}
                        color={isActive ? '#00E676' : '#666'}
                      />
                      <Text style={[styles.excChipText, isActive && styles.excChipTextActive]}>
                        {opt.short}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sockets Section */}
            <View style={styles.card}>
              <View style={styles.switchRow}>
                <Text style={styles.cardTitle}>Ranuras de Sockets (1 al 5)</Text>
                <Switch
                  value={enableSockets}
                  onValueChange={setEnableSockets}
                  trackColor={{ false: '#332B24', true: '#6B5533' }}
                  thumbColor={enableSockets ? '#E8C86A' : '#8C7B6B'}
                />
              </View>

              {enableSockets && (
                <View style={{ marginTop: 10, gap: 10 }}>
                  {[0, 1, 2, 3, 4].map((sIdx) => {
                    const currentVal = makerSockets[sIdx] ?? 0xFF;
                    const sockInfo = decodeSocketByte(currentVal);
                    const currentLvl = sockInfo.hasSeed ? sockInfo.level : (makerSocketLevels[sIdx] || 1);
                    const currentOptions = getQuickSocketOptions(currentLvl);

                    return (
                      <View key={`socket_${sIdx}`} style={{ gap: 6, backgroundColor: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#332B24' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#E8C86A', fontSize: 11, fontWeight: '700' }}>Slot #{sIdx + 1}:</Text>
                          <Text style={{ color: '#E8C86A', fontSize: 11, fontWeight: '700' }}>
                            {sockInfo.hasSeed ? sockInfo.fullDescription : sockInfo.label}
                          </Text>
                        </View>

                        {/* Selector de Nivel / Tipo de Seed Sphere (Lv.1 a Lv.5) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#8C7B6B', fontWeight: '600' }}>Esfera:</Text>
                          {SEED_SPHERE_LEVELS.map((sl) => {
                            const isLvlActive = currentLvl === sl.level;
                            return (
                              <TouchableOpacity
                                key={`tools_lvl_${sIdx}_${sl.level}`}
                                style={{
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  backgroundColor: isLvlActive ? '#E8C86A' : '#1E1A16',
                                  borderWidth: 1,
                                  borderColor: isLvlActive ? '#E8C86A' : '#3E342B',
                                }}
                                onPress={() => {
                                  const updatedLevels = [...makerSocketLevels];
                                  updatedLevels[sIdx] = sl.level;
                                  setMakerSocketLevels(updatedLevels);

                                  if (sockInfo.hasSeed && sockInfo.optionId >= 0) {
                                    const newByte = encodeSocketByte(sockInfo.optionId, sl.level);
                                    const updated = [...makerSockets];
                                    updated[sIdx] = newByte;
                                    setMakerSockets(updated);
                                  }
                                }}
                              >
                                <Text style={{
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                  color: isLvlActive ? '#120F0D' : '#C5B5A5',
                                }}>
                                  {sl.badge}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {currentOptions.map((so) => (
                              <TouchableOpacity
                                key={`s_${sIdx}_${so.val}`}
                                style={[
                                  styles.socketOptionBtn,
                                  currentVal === so.val && styles.socketOptionBtnActive,
                                ]}
                                onPress={() => {
                                  const newSockets = [...makerSockets];
                                  newSockets[sIdx] = so.val;
                                  setMakerSockets(newSockets);
                                  if (so.optionId >= 0) {
                                    const updatedLevels = [...makerSocketLevels];
                                    updatedLevels[sIdx] = currentLvl;
                                    setMakerSocketLevels(updatedLevels);
                                  }
                                }}
                              >
                                <Text
                                  style={[
                                    styles.socketOptionText,
                                    currentVal === so.val && styles.socketOptionTextActive,
                                  ]}
                                >
                                  {so.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </ScrollView>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Cantidad de Ítems a Generar */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.cardTitle}>Cantidad a Inyectar</Text>
                  <Text style={styles.cardDesc}>Número de copias independientes a inyectar en el baúl:</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMakerQuantity((prev) => Math.max(1, prev - 1))}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#00E5FF', fontSize: 16, fontWeight: 'bold', minWidth: 28, textAlign: 'center' }}>
                    x{makerQuantity}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setMakerQuantity((prev) => Math.min(20, prev + 1))}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
                {[1, 5, 10, 20].map((q) => (
                  <TouchableOpacity
                    key={`maker_qty_chip_${q}`}
                    style={[
                      styles.filterPill,
                      makerQuantity === q && styles.filterPillActive,
                      { flex: 1, alignItems: 'center', paddingVertical: 6 },
                    ]}
                    onPress={() => setMakerQuantity(q)}
                  >
                    <Text style={[styles.filterPillText, makerQuantity === q && styles.filterPillTextActive]}>
                      x{q}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Big Injection Button */}
            {/* Botón de Inyección en Brasa 56dp */}
            <BotonBrasa
              titulo={
                injecting
                  ? 'INYECTANDO...'
                  : !makerAccount.trim()
                  ? 'INGRESA UNA CUENTA PARA ACTIVAR'
                  : makerQuantity > 1
                  ? `INYECTAR ${makerQuantity}x ${selectedItemDef.name.toUpperCase()} EN EL BAÚL`
                  : 'INYECTAR EN EL BAÚL'
              }
              onPress={handleInjectItem}
              deshabilitado={injecting || !makerAccount.trim()}
              cargando={injecting}
              altura={56}
              icono={<MaterialCommunityIcons name={!makerAccount.trim() ? "lock-outline" : "lightning-bolt"} size={22} color="#FFFFFF" />}
              style={{ marginTop: 14, marginBottom: 20 }}
            />
          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ANTI-DUPE & GLOBAL SEARCH                                          */}
        {/* ========================================================================= */}
        {activeTab === 'antidupe' && (
          <ErrorBoundary tabName="Anti-Dupe">

          <View style={styles.tabContent}>
            {/* Search & Dupe Controls */}
            <View style={[styles.card, { zIndex: 10 }]}>
              <Text style={styles.cardTitle}>Buscador Global de Ítems</Text>
              <Text style={styles.cardDesc}>
                Busca cualquier ítem por nombre o número de serial en baúles e inventarios de todo el servidor:
              </Text>
              <AutocompleteInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                suggestions={catalogSuggestions}
                placeholder="Ej: Bone Blade o 12345678"
                icon="magnify"
                maxSuggestions={6}
              />

              {/* Filter Pills */}
              <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10 }}>
                {(['all', 'warehouse', 'inventory'] as const).map((mode) => (
                  <TouchableOpacity
                    key={`search_mode_${mode}`}
                    style={[
                      styles.filterPill,
                      searchFilter === mode && styles.filterPillActive,
                    ]}
                    onPress={() => setSearchFilter(mode)}
                  >
                    <Text style={[styles.filterPillText, searchFilter === mode && styles.filterPillTextActive]}>
                      {mode === 'all' ? 'Todos' : mode === 'warehouse' ? 'Solo Baúles' : 'Solo Inventarios'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.searchBtn, { flex: 1 }]}
                  onPress={handleSearchItems}
                  disabled={isSearching}
                >
                  {isSearching ? (
                    <ActivityIndicator color="#E8C86A" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="magnify" size={18} color="#E8C86A" />
                      <Text style={styles.searchBtnText}>Buscar</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.scanDupesBtn, { flex: 1 }]}
                  onPress={() => handleScanDupes(false)}
                  disabled={isScanningDupes}
                >
                  {isScanningDupes ? (
                    <ActivityIndicator color="#E2703A" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="alert-octagon" size={18} color="#E2703A" />
                      <Text style={styles.scanDupesBtnText}>Escanear Dupeos</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Dupe Scanner Results Banner */}
            {hasScannedDupes && (
              <View style={[styles.dupeBanner, dupesResults.length > 0 ? styles.dupeBannerRed : styles.dupeBannerGreen]}>
                <MaterialCommunityIcons
                  name={dupesResults.length > 0 ? 'alert' : 'check-circle'}
                  size={26}
                  color={dupesResults.length > 0 ? '#E2703A' : '#3FCF8E'}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.dupeBannerTitle}>
                    {dupesResults.length > 0
                      ? `¡ATENCIÓN! Se detectaron ${dupesResults.length} ítems clonados`
                      : '¡Servidor Limpio! No hay ítems duplicados'}
                  </Text>
                  <Text style={styles.dupeBannerSub}>
                    {dupesResults.length > 0
                      ? 'Revisa la lista a continuación para auditar las cuentas involucradas.'
                      : 'Todos los seriales registrados en baúles e inventarios son únicos.'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => handleScanDupes(true)}
                  disabled={isScanningDupes}
                  style={{ padding: 6, justifyContent: 'center', alignItems: 'center' }}
                  accessibilityLabel="Forzar Re-Escaneo"
                >
                  <MaterialCommunityIcons name="refresh" size={22} color={dupesResults.length > 0 ? '#E2703A' : '#3FCF8E'} />
                </TouchableOpacity>
              </View>
            )}

            {/* Dupe Results List */}
            {hasScannedDupes && dupesResults.map((dupe, dIdx) => (
              <View key={`dupe_grp_${dupe.serial}_${dIdx}`} style={styles.dupeGroupCard}>
                <View style={styles.dupeGroupHeader}>
                  <MaterialCommunityIcons name="content-copy" size={20} color="#E2703A" />
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={styles.dupeSerialText}>
                      Serial: {dupe.serial} (0x{dupe.serialHex})
                    </Text>
                    <Text style={styles.dupeCountText}>
                      {dupe.count} copias detectadas
                    </Text>
                  </View>
                </View>

                {dupe.items.map((it: any, iIdx: number) => (
                  <View key={`dupe_it_${iIdx}`} style={styles.dupeItemRow}>
                    <ItemImage itemName={it.name} size={30} fallbackColor="#FF9800" />
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.dupeItemName}>{it.name} +{it.level}</Text>
                      <Text style={styles.dupeItemLoc}>
                        {it.location?.startsWith('Baúl') || it.location?.startsWith('Personaje')
                          ? `${it.location} • Cuenta: ${it.accountId}`
                          : it.location === 'Warehouse'
                          ? `Baúl: ${it.accountId} (Slot ${it.slot})`
                          : `PJ: ${it.charName} [${it.accountId}] (Slot ${it.slot})`}
                      </Text>
                      {it.hex && (
                        <TouchableOpacity
                          onPress={async () => {
                            await Clipboard.setStringAsync(it.hex);
                            Alert.alert('Copiado', `Hex de ${it.name} copiado.`);
                          }}
                        >
                          <Text style={{ color: '#00E676', fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2 }}>
                            HEX: {it.hex}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {it.isExc && <Text style={styles.excBadge}>EXC</Text>}
                  </View>
                ))}
              </View>
            ))}

            {/* Standard Search Results List */}
            {!hasScannedDupes && searchResults.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Resultados ({searchResults.length}):</Text>
                {searchResults.map((it, idx) => (
                  <View key={`search_res_${idx}`} style={styles.dupeItemRow}>
                    <ItemImage itemName={it.name} size={32} fallbackColor="#FF9800" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.dupeItemName}>{it.name} +{it.level}</Text>
                      <Text style={styles.dupeItemLoc}>
                        {it.location?.startsWith('Baúl') || it.location?.startsWith('Personaje')
                          ? `${it.location} • Cuenta: ${it.accountId}`
                          : it.location === 'Warehouse'
                          ? `Baúl: ${it.accountId} (Slot ${it.slot})`
                          : `PJ: ${it.charName} [${it.accountId}] (Slot ${it.slot})`}
                      </Text>
                      <Text style={{ color: '#888', fontSize: 10 }}>
                        Serial: {it.serial} (0x{it.serialHex})
                      </Text>
                      {it.hex && (
                        <TouchableOpacity
                          onPress={async () => {
                            await Clipboard.setStringAsync(it.hex);
                            Alert.alert('Copiado', `Hex de ${it.name} copiado.`);
                          }}
                        >
                          <Text style={{ color: '#00E676', fontSize: 9, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', marginTop: 2 }}>
                            HEX: {it.hex}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                    {it.isExc && <Text style={styles.excBadge}>EXC</Text>}
                  </View>
                ))}
              </View>
            )}


          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: LIVE RANKINGS & PK CLEAR                                           */}
        {/* ========================================================================= */}
        {activeTab === 'rankings' && (
          <ErrorBoundary tabName="Rankings">

          <View style={styles.tabContent}>
            {/* Sub-Tabs */}
            <View style={styles.rankPillsContainer}>
              {[
                { id: 'resets', label: 'Top Resets', icon: 'refresh' },
                { id: 'mresets', label: 'Master Resets', icon: 'star' },
                { id: 'pk', label: 'Top Asesinos (PK)', icon: 'skull' },
                { id: 'guilds', label: 'Top Guilds', icon: 'shield-account' },
              ].map((sub) => (
                <TouchableOpacity
                  key={`rank_tab_${sub.id}`}
                  style={[
                    styles.rankPill,
                    rankType === sub.id && styles.rankPillActive,
                  ]}
                  onPress={() => setRankType(sub.id as any)}
                >
                  <MaterialCommunityIcons
                    name={sub.icon as any}
                    size={16}
                    color={rankType === sub.id ? '#FFF' : '#888'}
                  />
                  <Text
                    style={[
                      styles.rankPillText,
                      rankType === sub.id && styles.rankPillTextActive,
                    ]}
                  >
                    {sub.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Refresh button */}
            <TouchableOpacity
              style={styles.refreshRankBtn}
              onPress={() => loadRankings(rankType)}
              disabled={loadingRankings}
            >
              <MaterialCommunityIcons name="reload" size={16} color="#FF9800" />
              <Text style={styles.refreshRankBtnText}>Actualizar Ranking</Text>
            </TouchableOpacity>

            {loadingRankings ? (
              <ActivityIndicator size="large" color="#FF9800" style={{ marginTop: 24 }} />
            ) : (
              <View style={{ gap: 8 }}>
                {rankingsList.map((entry, index) => {
                  const rankPos = index + 1;
                  const medalColor =
                    rankPos === 1 ? '#FFD700' : rankPos === 2 ? '#C0C0C0' : rankPos === 3 ? '#CD7F32' : '#555';

                  if (rankType === 'guilds') {
                    return (
                      <View key={`guild_${entry.G_Name}_${index}`} style={styles.rankCard}>
                        <View style={[styles.rankMedal, { backgroundColor: medalColor }]}>
                          <Text style={styles.rankMedalText}>{rankPos}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={styles.rankName}>{entry.G_Name}</Text>
                          <Text style={styles.rankSub}>
                            Master: {entry.G_Master} • Miembros: {entry.G_Count}
                          </Text>
                        </View>
                        <View style={styles.rankScoreWrap}>
                          <Text style={styles.rankScoreVal}>{entry.G_Score}</Text>
                          <Text style={styles.rankScoreLabel}>Puntos</Text>
                        </View>
                      </View>
                    );
                  }

                  const classInfo = getMuClassInfo(entry.Class);
                  const isPkTab = rankType === 'pk';

                  return (
                    <View key={`rank_char_${entry.Name}_${index}`} style={styles.rankCard}>
                      <View style={[styles.rankMedal, { backgroundColor: medalColor }]}>
                        <Text style={styles.rankMedalText}>{rankPos}</Text>
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.rankName}>{entry.Name}</Text>
                          {entry.ConnectStat === 1 && (
                            <View style={styles.onlineDot} />
                          )}
                        </View>
                        <Text style={styles.rankSub}>
                          {classInfo.name} • Lv. {entry.cLevel}
                        </Text>
                        {isPkTab && (
                          <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: 'bold', marginTop: 2 }}>
                            Kills: {entry.PkCount} (Nivel PK: {entry.PkLevel})
                          </Text>
                        )}
                      </View>

                      {!isPkTab ? (
                        <View style={styles.rankScoreWrap}>
                          <Text style={styles.rankScoreVal}>
                            {rankType === 'mresets' ? entry.MasterResetCount : entry.ResetCount}
                          </Text>
                          <Text style={styles.rankScoreLabel}>
                            {rankType === 'mresets' ? 'M. Resets' : 'Resets'}
                          </Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={styles.pkClearBtn}
                          onPress={() => handleClearPk(entry.Name)}
                          disabled={cleaningPkChar === entry.Name}
                        >
                          {cleaningPkChar === entry.Name ? (
                            <ActivityIndicator color="#FFF" size="small" />
                          ) : (
                            <>
                              <MaterialCommunityIcons name="broom" size={16} color="#FFF" />
                              <Text style={styles.pkClearBtnText}>PK Clear</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ONE-CLICK MAINTENANCE FIXES                                        */}
        {/* ========================================================================= */}
        {activeTab === 'fixes' && (
          <ErrorBoundary tabName="Fixes y Reparación">

          <View style={styles.tabContent}>
            {/* Fix 1: Unstick Account */}
            <View style={[styles.card, { zIndex: 30 }]}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="lock-open-variant" size={24} color="#00E676" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>1. Destrabar Cuenta o Personaje</Text>
                  <Text style={styles.cardDesc}>
                    Desconecta sesión (ConnectStat = 0), libera GameIDC en AccountCharacter y rescata si estaba atrapado en eventos:
                  </Text>
                </View>
              </View>
              <AutocompleteInput
                value={unstickUser}
                onChangeText={setUnstickUser}
                suggestions={[...fixesAccountSuggestions, ...fixesCharSuggestions]}
                placeholder="Usuario (memb___id) o Nombre de Personaje"
                icon="account-lock-open"
                autoCapitalize="none"
                maxSuggestions={5}
              />
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#265431', borderColor: '#3FCF8E', borderWidth: 1, marginTop: 10 }]}
                onPress={handleUnstick}
                disabled={fixingAction === 'unstick'}
              >
                {fixingAction === 'unstick' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="check-decagram" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Destrabar Cuenta y Liberar GameIDC</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 2: Teleport / Rescue Character */}
            <View style={[styles.card, { zIndex: 20 }]}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="crosshairs-gps" size={24} color="#E8C86A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>2. Mover / Rescatar Personaje</Text>
                  <Text style={styles.cardDesc}>
                    Teletransporta de inmediato a zonas seguras de ciudades principales o coordenadas personalizadas:
                  </Text>
                </View>
              </View>
              <AutocompleteInput
                value={rescueCharName}
                onChangeText={setRescueCharName}
                suggestions={fixesCharSuggestions}
                placeholder="Nombre del Personaje (ej: LorenciaBK)"
                icon="account-circle"
                maxSuggestions={5}
              />

              {/* Quick Teleport City Buttons (Iconos Claros y Legibles) */}
              <Text style={{ color: '#E8C86A', fontSize: 11, fontWeight: 'bold', marginTop: 8, marginBottom: 6 }}>
                DESTINOS RÁPIDOS 1-CLIC:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {[
                  { name: 'Lorencia', map: 0, x: 125, y: 125, icon: 'castle', color: '#E8C86A' },
                  { name: 'Devias', map: 2, x: 220, y: 220, icon: 'snowflake', color: '#5B8DEF' },
                  { name: 'Noria', map: 3, x: 175, y: 110, icon: 'forest', color: '#3FCF8E' },
                  { name: 'Elbeland', map: 51, x: 50, y: 220, icon: 'tree', color: '#BA68C8' },
                  { name: 'Stadium', map: 6, x: 60, y: 60, icon: 'stadium', color: '#E2703A' },
                  { name: 'Losttower', map: 4, x: 208, y: 75, icon: 'fire', color: '#E2703A' },
                  { name: 'Atlans', map: 7, x: 24, y: 35, icon: 'water', color: '#5B8DEF' },
                  { name: 'Tarkan', map: 8, x: 187, y: 58, icon: 'weather-dust', color: '#E8C86A' },
                  { name: 'Icarus', map: 10, x: 15, y: 13, icon: 'weather-windy', color: '#5B8DEF' },
                ].map((dest) => (
                  <TouchableOpacity
                    key={`tele_fix_${dest.name}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#100D0B',
                      borderWidth: 1,
                      borderColor: '#6B5533',
                      borderRadius: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 7,
                      gap: 6,
                    }}
                    onPress={async () => {
                      const name = rescueCharName.trim();
                      if (!name) {
                        Alert.alert('Atención', 'Ingresa el nombre del personaje arriba primero.');
                        return;
                      }
                      try {
                        setFixingAction('rescue');
                        const res = await SqlClient.teleportCharacter(name, dest.map, dest.x, dest.y);
                        if (res.success) {
                          await logAdminAction('PJ_TELEPORTADO', `${name} movido a ${dest.name} (${dest.x}, ${dest.y})`);
                          Alert.alert('Personaje Movido', res.message);
                        } else {
                          Alert.alert('Error al Mover Personaje', res.message);
                        }
                      } catch (e: any) {
                        Alert.alert('Error', e.message);
                      } finally {
                        setFixingAction(null);
                      }
                    }}
                  >
                    <MaterialCommunityIcons name={dest.icon as any} size={18} color={dest.color} />
                    <View>
                      <Text style={{ color: '#EDE4D3', fontSize: 12, fontWeight: 'bold' }}>{dest.name}</Text>
                      <Text style={{ color: '#9C9182', fontSize: 9 }}>{dest.x}, {dest.y}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Teletransporte Personalizado (Cualquier Mapa + Coordenadas X/Y) */}
              <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#6B5533' }}>
                <Text style={{ color: '#E8C86A', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                  TELETRANSPORTE PERSONALIZADO (MAPA Y COORDENADAS):
                </Text>

                <Text style={{ color: '#9C9182', fontSize: 10, marginBottom: 4 }}>Selecciona el Mapa Destino:</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 6, paddingVertical: 2, marginBottom: 10 }}
                >
                  {[
                    { id: 0, name: 'Lorencia' },
                    { id: 1, name: 'Dungeon' },
                    { id: 2, name: 'Devias' },
                    { id: 3, name: 'Noria' },
                    { id: 4, name: 'LostTower' },
                    { id: 6, name: 'Arena/Stadium' },
                    { id: 7, name: 'Atlans' },
                    { id: 8, name: 'Tarkan' },
                    { id: 10, name: 'Icarus' },
                    { id: 30, name: 'Valley of Loren' },
                    { id: 31, name: 'Land of Trials' },
                    { id: 33, name: 'Aida' },
                    { id: 34, name: 'Crywolf' },
                    { id: 41, name: 'Barracks' },
                    { id: 42, name: 'Refuge' },
                    { id: 51, name: 'Elbeland' },
                    { id: 56, name: 'Swamp of Peace' },
                    { id: 57, name: 'Raklion' },
                    { id: 63, name: 'Vulcanus' },
                    { id: 69, name: 'Loren Market' },
                    { id: 79, name: 'Karutan 1' },
                    { id: 80, name: 'Karutan 2' },
                  ].map((m) => {
                    const isSelected = customTeleportMap === m.id;
                    return (
                      <TouchableOpacity
                        key={`custom_map_${m.id}`}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 6,
                          backgroundColor: isSelected ? 'rgba(181, 143, 60, 0.25)' : '#100D0B',
                          borderWidth: 1,
                          borderColor: isSelected ? '#E8C86A' : '#6B5533',
                        }}
                        onPress={() => setCustomTeleportMap(m.id)}
                      >
                        <Text style={{ color: isSelected ? '#E8C86A' : '#EDE4D3', fontSize: 11, fontWeight: isSelected ? 'bold' : 'normal' }}>
                          [{m.id}] {m.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#9C9182', fontSize: 10, marginBottom: 4 }}>Coordenada X (0-255):</Text>
                    <TextInput
                      style={{
                        backgroundColor: '#100D0B',
                        borderWidth: 1,
                        borderColor: '#6B5533',
                        borderRadius: 6,
                        color: '#EDE4D3',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        fontSize: 13,
                        textAlign: 'center',
                      }}
                      value={customTeleportX}
                      onChangeText={setCustomTeleportX}
                      keyboardType="numeric"
                      placeholder="125"
                      placeholderTextColor="#666"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#9C9182', fontSize: 10, marginBottom: 4 }}>Coordenada Y (0-255):</Text>
                    <TextInput
                      style={{
                        backgroundColor: '#100D0B',
                        borderWidth: 1,
                        borderColor: '#6B5533',
                        borderRadius: 6,
                        color: '#EDE4D3',
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        fontSize: 13,
                        textAlign: 'center',
                      }}
                      value={customTeleportY}
                      onChangeText={setCustomTeleportY}
                      keyboardType="numeric"
                      placeholder="125"
                      placeholderTextColor="#666"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: '#7A5E22', borderColor: '#B58F3C', borderWidth: 1, marginTop: 2, marginBottom: 6 }]}
                  onPress={handleCustomTeleport}
                  disabled={fixingAction === 'custom_teleport'}
                >
                  {fixingAction === 'custom_teleport' ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#FFF" />
                      <Text style={styles.actionBtnText}>
                        Mover a {MU_MAPS[customTeleportMap] || `Mapa ${customTeleportMap}`} ({customTeleportX}, {customTeleportY})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#241E1A', borderColor: '#B58F3C', borderWidth: 1.5, marginTop: 6 }]}
                onPress={handleRescue}
                disabled={fixingAction === 'rescue'}
              >
                {fixingAction === 'rescue' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="map-marker-path" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Rescatar a Lorencia Centro (125, 125)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 3: Clean Corrupt Hex */}
            <View style={[styles.card, { zIndex: 10 }]}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="broom" size={24} color="#E2703A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>3. Vaciado Completo de Inventario / Baúl</Text>
                  <Text style={styles.cardDesc}>
                    ADVERTENCIA: Vacía todos los slots rellenándolos con 0xFF. Se guardará copia de respaldo en logs. Requiere jugador desconectado:
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    cleanHexType === 'warehouse' && styles.filterPillActive,
                  ]}
                  onPress={() => setCleanHexType('warehouse')}
                >
                  <Text style={[styles.filterPillText, cleanHexType === 'warehouse' && styles.filterPillTextActive]}>
                    Baúl de Cuenta
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterPill,
                    cleanHexType === 'inventory' && styles.filterPillActive,
                  ]}
                  onPress={() => setCleanHexType('inventory')}
                >
                  <Text style={[styles.filterPillText, cleanHexType === 'inventory' && styles.filterPillTextActive]}>
                    Inventario de PJ
                  </Text>
                </TouchableOpacity>
              </View>
              <AutocompleteInput
                value={cleanHexTarget}
                onChangeText={setCleanHexTarget}
                suggestions={cleanHexType === 'warehouse' ? fixesAccountSuggestions : fixesCharSuggestions}
                placeholder={cleanHexType === 'warehouse' ? 'Cuenta (AccountID)' : 'Nombre del Personaje'}
                icon="form-textbox"
                autoCapitalize="none"
                maxSuggestions={5}
              />
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#8C2B1D', borderColor: '#E2703A', borderWidth: 1, marginTop: 10 }]}
                onPress={handleCleanHex}
                disabled={fixingAction === 'cleanHex'}
              >
                {fixingAction === 'cleanHex' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="alert-octagon" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Vaciar Completamente</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 4: Emergency Database Backup */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="database-arrow-down" size={24} color="#5B8DEF" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>4. Backup de Emergencia SQL</Text>
                  <Text style={styles.cardDesc}>
                    Ejecuta un backup completo nativo de la base de datos SQL Server antes de aplicar cambios:
                  </Text>
                </View>
              </View>
              <View style={styles.inputWrap}>
                <MaterialCommunityIcons name="database" size={20} color="#6B5533" />
                <TextInput
                  style={styles.textInput}
                  placeholder="Base de datos (Default: MuOnline)"
                  placeholderTextColor="#666"
                  value={backupDbName}
                  onChangeText={setBackupDbName}
                />
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#223B63', borderColor: '#5B8DEF', borderWidth: 1, marginTop: 8 }]}
                onPress={handleBackup}
                disabled={fixingAction === 'backup'}
              >
                {fixingAction === 'backup' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Generar Copia de Seguridad .BAK</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 5: Control y Escáner de Abuso de IP */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="ip-network-outline" size={24} color="#3FCF8E" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>5. Detección de Multicuentas por IP</Text>
                  <Text style={styles.cardDesc}>
                    Escanea las conexiones activas en GameServer e identifica IPs que superen el límite configurado:
                  </Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 }}>
                <Text style={{ color: '#9C9182', fontSize: 12 }}>Límite Máximo:</Text>
                <TextInput
                  style={[styles.textInput, { maxWidth: 60, height: 36, textAlign: 'center', backgroundColor: '#100D0B', borderRadius: 6, borderWidth: 1, borderColor: '#6B5533', color: '#EDE4D3' }]}
                  value={ipAbuseMaxLimit}
                  onChangeText={setIpAbuseMaxLimit}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={[styles.actionBtn, { flex: 1, backgroundColor: '#265431', borderColor: '#3FCF8E', borderWidth: 1, marginTop: 0 }]}
                  onPress={handleScanIpAbuse}
                  disabled={isScanningIpAbuse}
                >
                  {isScanningIpAbuse ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="magnify" size={16} color="#FFF" />
                      <Text style={styles.actionBtnText}>Escanear IPs</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {ipAbuseResults.length > 0 && (
                <View style={{ marginTop: 8 }}>
                  <Text style={{ color: '#E8C86A', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                    IPs en Exceso ({ipAbuseResults.length}):
                  </Text>
                  {ipAbuseResults.map((item, idx) => (
                    <View key={`ip_abuse_${idx}`} style={[styles.dupeItemRow, { backgroundColor: '#100D0B', borderWidth: 1, borderColor: '#6B5533', padding: 8, borderRadius: 6, marginBottom: 4 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#EDE4D3', fontWeight: 'bold', fontSize: 12 }}>
                          {item.ip} ({item.count} conexiones)
                        </Text>
                        <Text style={{ color: '#9C9182', fontSize: 10, marginTop: 2 }}>
                          Cuentas: {item.accounts.join(', ')}
                        </Text>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#8C2B1D', borderColor: '#E2703A', borderWidth: 1, marginTop: 8 }]}
                    onPress={handleDisconnectIpAbusers}
                    disabled={isDisconnectingIps}
                  >
                    {isDisconnectingIps ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="account-off" size={16} color="#FFF" />
                        <Text style={styles.actionBtnText}>Desconectar Cuentas Excedentes</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Fix 6: Reparar Huérfanos */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="account-search-outline" size={24} color="#E8C86A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>6. Reparar Registros Huérfanos (sp_MuManager_FixOrphans)</Text>
                  <Text style={styles.cardDesc}>
                    Detecta personajes sin cuenta padre en MEMB_INFO, limpia ranuras corruptas en AccountCharacter y elimina registros desvinculados en GuildMember.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#241E1A', borderColor: '#6B5533', borderWidth: 1, marginTop: 10 }]}
                onPress={handleFixOrphans}
                disabled={fixingAction === 'fixOrphans'}
              >
                {fixingAction === 'fixOrphans' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="broom" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Escanear y Reparar Huérfanos</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 7: Rescate Masivo de Coordenadas */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="map-marker-distance" size={24} color="#3FCF8E" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>7. Rescate Masivo de Coordenadas (sp_MuManager_RescueInvalidCoords)</Text>
                  <Text style={styles.cardDesc}>
                    Devuelve a Lorencia (125, 125) a todos los personajes con coordenadas o mapas fuera de rango (&lt;0 o &gt;255). Solo actúa en personajes desconectados.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#225B54', borderColor: '#3FCF8E', borderWidth: 1, marginTop: 10 }]}
                onPress={handleRescueCoords}
                disabled={fixingAction === 'rescueCoords'}
              >
                {fixingAction === 'rescueCoords' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="crosshairs-gps" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Normalizar Coordenadas a Lorencia</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 8: Fix Integer Overflows */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="cash-multiple" size={24} color="#E8C86A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>8. Desbordamientos de Enteros 32-bit (sp_MuManager_FixIntegerOverflows)</Text>
                  <Text style={styles.cardDesc}>
                    Limita el Zen de personajes y baúles a 2,000,000,000 y corrige valores negativos producidos por integer overflow en Zen, Puntos y Resets.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#7A5E22', borderColor: '#B58F3C', borderWidth: 1, marginTop: 10 }]}
                onPress={handleFixOverflows}
                disabled={fixingAction === 'fixOverflows'}
              >
                {fixingAction === 'fixOverflows' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="numeric" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Normalizar Zen y Puntos (Cap 2.000.000.000)</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 9: Limpiar Conexiones Fantasma */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="ghost" size={24} color="#9C9182" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>9. Purgar Conexiones Fantasma (sp_MuManager_CleanGhostConnections)</Text>
                  <Text style={styles.cardDesc}>
                    Restablece ConnectStat = 0 en cuentas desconectadas de forma abrupta o con más de 24 horas y libera ranuras GameIDC zombis.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2B2521', borderColor: '#6B5533', borderWidth: 1.5, marginTop: 10 }]}
                onPress={handleCleanGhosts}
                disabled={fixingAction === 'cleanGhosts'}
              >
                {fixingAction === 'cleanGhosts' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="ghost-off" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Purgar Sesiones Fantasma</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 10: Escaneo de Nombres Ilegales */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="account-alert-outline" size={24} color="#E2703A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>10. Escanear Nombres Ilegales (sp_MuManager_ScanIllegalNames)</Text>
                  <Text style={styles.cardDesc}>
                    Audita la tabla Character buscando nombres con espacios al inicio/final, tabulaciones, saltos de línea o caracteres ASCII no imprimibles.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#7A2424', borderColor: '#E2703A', borderWidth: 1, marginTop: 10 }]}
                onPress={handleScanIllegalNames}
                disabled={fixingAction === 'scanIllegalNames'}
              >
                {fixingAction === 'scanIllegalNames' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="text-search" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Escanear Nombres Irregulares</Text>
                  </>
                )}
              </TouchableOpacity>

              {illegalNamesResults.length > 0 && (
                <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#6B5533' }}>
                  <Text style={{ color: '#E8C86A', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                    Personajes Detectados ({illegalNamesResults.length}):
                  </Text>
                  {illegalNamesResults.map((pj, pIdx) => (
                    <View key={`illegal_pj_${pIdx}`} style={[styles.dupeItemRow, { backgroundColor: '#100D0B', borderWidth: 1, borderColor: '#6B5533', padding: 8, borderRadius: 6, marginBottom: 4 }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#EDE4D3', fontWeight: 'bold', fontSize: 12 }}>
                          "{pj.Name}" (Cuenta: {pj.AccountID})
                        </Text>
                        <Text style={{ color: '#E2703A', fontSize: 10, marginTop: 2 }}>
                          Motivo: {pj.IssueDescription}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Fix 11: Normalizar Estados PK */}
            <View style={styles.card}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="sword-cross" size={24} color="#E8C86A" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle}>11. Normalizar Estados PK (sp_MuManager_FixPkStatus)</Text>
                  <Text style={styles.cardDesc}>
                    Normaliza personajes con PkLevel inválido (&lt; 1 o &gt; 6) o tiempos/conteo PK negativos restableciéndolos a Ciudadano común (PkLevel = 3).
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#704217', borderColor: '#B58F3C', borderWidth: 1, marginTop: 10 }]}
                onPress={handleFixPkStatus}
                disabled={fixingAction === 'fixPkStatus'}
              >
                {fixingAction === 'fixPkStatus' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="scale-balance" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Normalizar Estados PK Corruptos</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Fix 12: Instalar Procedimientos y Triggers en SQL Server */}
            <View style={[styles.card, { borderColor: '#3FCF8E', borderWidth: 1.5 }]}>
              <View style={styles.fixHeader}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#3FCF8E" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.cardTitle, { color: '#3FCF8E' }]}>12. Instalar Stored Procedures & Triggers</Text>
                  <Text style={styles.cardDesc}>
                    Compila en SQL Server todos los procedimientos almacenados, el trigger de auditoría trg_MuManager_CharacterAudit y la tabla MuManager_AuditLog.
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#265431', borderColor: '#3FCF8E', borderWidth: 1, marginTop: 10 }]}
                onPress={handleInstallStoredProcedures}
                disabled={fixingAction === 'installProcedures'}
              >
                {fixingAction === 'installProcedures' ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="database-sync" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Instalar Procedimientos en SQL Server</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: PARSERS (TXT FILE UPLOADS)                                         */}
        {/* ========================================================================= */}
        {activeTab === 'parsers' && (
          <ErrorBoundary tabName="Parsers de Logs">

          <View style={styles.tabContent}>
            {/* Memory status card */}
            <View style={styles.statsCard}>
              <View style={styles.statsIconWrap}>
                <MaterialCommunityIcons name="database" size={28} color={THEME.colors.primaryOrange} />
              </View>
              <View style={styles.statsInfo}>
                <Text style={styles.statsNumber}>{itemsCount}</Text>
                <Text style={styles.statsLabel}>{t('itemsLoadedCount')}</Text>
              </View>
            </View>

            {/* Configure Items Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{t('configureItems')}</Text>
              <Text style={styles.sectionDesc}>
                Carga los archivos .txt de la carpeta Data/Item de tu servidor de MU Online para sincronizar nombres, tamaños y atributos exactos:
              </Text>

              {/* Item.txt */}
              <TouchableOpacity
                style={styles.fileButton}
                onPress={() => handlePickAndParseFile('item')}
              >
                <View style={styles.fileBtnLeft}>
                  <MaterialCommunityIcons name="file-document-outline" size={24} color={THEME.colors.primaryOrange} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileTitle}>Item.txt</Text>
                    <Text style={styles.fileSub}>Base de datos principal de armas, armaduras y joyas</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>

              {/* 380ItemType.txt */}
              <TouchableOpacity
                style={styles.fileButton}
                onPress={() => handlePickAndParseFile('380')}
              >
                <View style={styles.fileBtnLeft}>
                  <MaterialCommunityIcons name="numeric-3-circle-outline" size={24} color={THEME.colors.item380} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileTitle}>380ItemType.txt</Text>
                    <Text style={styles.fileSub}>Opciones adicionales de nivel 380 (PvP)</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>

              {/* SocketItemType.txt */}
              <TouchableOpacity
                style={styles.fileButton}
                onPress={() => handlePickAndParseFile('socket')}
              >
                <View style={styles.fileBtnLeft}>
                  <MaterialCommunityIcons name="hexagon-multiple-outline" size={24} color={THEME.colors.itemSocket} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileTitle}>SocketItemType.txt</Text>
                    <Text style={styles.fileSub}>Ítems con ranuras para Seeds y Spheres</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>

              {/* SetItemType.txt */}
              <TouchableOpacity
                style={styles.fileButton}
                onPress={() => handlePickAndParseFile('set')}
              >
                <View style={styles.fileBtnLeft}>
                  <MaterialCommunityIcons name="shield-star-outline" size={24} color={THEME.colors.itemAncient} />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileTitle}>SetItemType.txt</Text>
                    <Text style={styles.fileSub}>Ítems Ancient y sets de temporada</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textSecondary} />
              </TouchableOpacity>

              {/* Reset to defaults button */}
              <TouchableOpacity
                style={styles.resetButton}
                onPress={handleResetDefaults}
              >
                <MaterialCommunityIcons name="refresh" size={20} color={THEME.colors.textSecondary} />
                <Text style={styles.resetButtonText}>Restaurar Catálogo Predeterminado</Text>
              </TouchableOpacity>
            </View>
          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: STARTER KIT GENERATOR & INJECTOR                                   */}
        {/* ========================================================================= */}
                {activeTab === 'kit' && (
          <ErrorBoundary tabName="Starter Kit">

          <View style={styles.tabContent}>
            {/* Target Account Input */}
            <View style={[styles.card, { zIndex: 10 }]}>
              <Text style={styles.cardTitle}>Destino del Starter Kit</Text>
              <Text style={styles.cardDesc}>
                Ingresa el AccountID donde se inyectarán los ítems en su Baúl y las monedas:
              </Text>
              <AutocompleteInput
                value={kitTargetAccount}
                onChangeText={setKitTargetAccount}
                suggestions={kitAccountSuggestions}
                placeholder="Cuenta (AccountID, ej: newplayer)"
                icon="account"
                autoCapitalize="none"
                maxSuggestions={6}
              />
            </View>

            {/* Presets Card: Botones Configurables y Modificables */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Botones de Presets de Kit</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => setShowSaveKitInput(!showSaveKitInput)}
                >
                  <MaterialCommunityIcons name={showSaveKitInput ? 'close' : 'plus-circle'} size={15} color={THEME.colors.primaryOrange} />
                  <Text style={{ color: THEME.colors.primaryOrange, fontSize: 12, fontWeight: 'bold' }}>
                    {showSaveKitInput ? 'Cancelar' : 'Nuevo Botón'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardDesc}>
                Toca un botón para cargar su configuración. Modifica monedas o ítems y guarda los cambios en ese botón con 1 clic:
              </Text>

              {showSaveKitInput && (
                <View style={styles.newPresetContainer}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                    Guardar Configuración Actual como Nuevo Botón:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={newKitPresetName}
                      onChangeText={setNewKitPresetName}
                      placeholder="Nombre del Botón (ej: Kit VIP Oro)"
                      placeholderTextColor="#666"
                    />
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#2E7D32', width: 90, marginTop: 0 }]}
                      onPress={handleCreateNewKitPreset}
                    >
                      <Text style={styles.actionBtnText}>Crear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Botones de Presets */}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4, marginBottom: 10 }}>
                {kitPresets.map((p) => {
                  const isActive = activeKitPresetId === p.id;
                  return (
                    <TouchableOpacity
                      key={'preset_btn_' + p.id}
                      style={[
                        styles.presetPill,
                        { borderColor: p.badgeColor || THEME.colors.primaryOrange },
                        isActive && { backgroundColor: (p.badgeColor || THEME.colors.primaryOrange) + '33', borderWidth: 2 }
                      ]}
                      onPress={() => handleApplyPresetKit(p.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={(p.icon || 'star-circle') as any}
                        size={16}
                        color={p.badgeColor || THEME.colors.primaryOrange}
                      />
                      <Text style={[styles.presetPillText, isActive && { fontWeight: 'bold', color: '#FFF' }]}>
                        {p.name}
                      </Text>
                      {isActive && (
                        <MaterialCommunityIcons name="check-circle" size={14} color="#00E676" style={{ marginLeft: 2 }} />
                      )}
                      <TouchableOpacity
                          onPress={() => {
                            Alert.alert('Eliminar Botón de Kit', `¿Deseas eliminar el botón '${p.name}'?`, [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteCustomKitPreset(p.id) },
                            ]);
                          }}
                          style={{ marginLeft: 4 }}
                        >
                          <MaterialCommunityIcons name="close-circle" size={14} color="#FF5252" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Barra para Modificar y Guardar en el Botón Activo */}
              <View style={styles.presetModifyBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.presetModifyLabel}>Botón Seleccionado:</Text>
                  <TextInput
                    style={[styles.textInput, { height: 38, fontSize: 13, fontWeight: '700', color: '#EDE4D3', paddingHorizontal: 8, paddingVertical: 2, marginTop: 4, backgroundColor: '#100D0B', borderColor: '#6B5533', borderWidth: 1, borderRadius: 6 }]}
                    value={activeKitPresetName}
                    onChangeText={setActiveKitPresetName}
                    placeholder="Nombre del Botón de Kit..."
                    placeholderTextColor="#777"
                  />
                </View>
                <TouchableOpacity
                  style={styles.savePresetBtn}
                  onPress={handleSaveCurrentToActiveKitPreset}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="content-save-edit" size={16} color="#FFF" />
                  <Text style={styles.savePresetBtnText}>Guardar en este Botón</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                <TouchableOpacity onPress={handleResetKitPresets}>
                  <Text style={{ color: '#888', fontSize: 11, textDecorationLine: 'underline' }}>
                    Restablecer botones de kit a valores de fábrica
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2E7D32', marginTop: 12 }]}
                onPress={handleAddMakerItemToKit}
              >
                <MaterialCommunityIcons name="plus-box" size={18} color="#FFF" />
                <Text style={styles.actionBtnText}>Agregar Ítem Actual del Maker al Kit</Text>
              </TouchableOpacity>
            </View>

            {/* Monedas y Puntos Separados por Tarjetas Individuales */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monedas y Puntos Incluidos</Text>
              <Text style={styles.cardDesc}>
                Marca cada casilla individualmente para incluir solo las monedas que desees:
              </Text>

              {/* 1. ZEN */}
              <View style={[styles.currencyCard, kitIncludeZen && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setKitIncludeZen(!kitIncludeZen)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={kitIncludeZen ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={kitIncludeZen ? '#FFD700' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#FFD70022', borderColor: '#FFD700' }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={15} color="#FFD700" />
                    <Text style={[styles.currencyBadgeText, { color: '#FFD700' }]}>Zen</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: kitIncludeZen ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {kitIncludeZen ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {kitIncludeZen && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={kitZen}
                      onChangeText={setKitZen}
                      keyboardType="numeric"
                      placeholder="Cantidad de Zen..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['1000000', '5000000', '10000000', '50000000', '100000000'].map((val) => (
                        <TouchableOpacity
                          key={'kit_zen_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setKitZen(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>
                            {parseInt(val, 10) >= 1000000 ? (parseInt(val, 10) / 1000000) + 'M' : val}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 2. WCOINC / WCOINS */}
              <View style={[styles.currencyCard, kitIncludeGCoins && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setKitIncludeGCoins(!kitIncludeGCoins)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={kitIncludeGCoins ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={kitIncludeGCoins ? '#00E5FF' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#00E5FF22', borderColor: '#00E5FF' }]}>
                    <MaterialCommunityIcons name="hand-coin" size={15} color="#00E5FF" />
                    <Text style={[styles.currencyBadgeText, { color: '#00E5FF' }]}>WCoinC (WCoins / GCoins)</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: kitIncludeGCoins ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {kitIncludeGCoins ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {kitIncludeGCoins && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={kitGCoins}
                      onChangeText={setKitGCoins}
                      keyboardType="numeric"
                      placeholder="Cantidad de WCoinC / GCoins..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['50', '100', '250', '500', '1000'].map((val) => (
                        <TouchableOpacity
                          key={'kit_wcoinc_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setKitGCoins(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 3. WCOINP */}
              <View style={[styles.currencyCard, kitIncludeWCoinP && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setKitIncludeWCoinP(!kitIncludeWCoinP)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={kitIncludeWCoinP ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={kitIncludeWCoinP ? '#B0BEC5' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#B0BEC522', borderColor: '#B0BEC5' }]}>
                    <MaterialCommunityIcons name="circle-multiple" size={15} color="#B0BEC5" />
                    <Text style={[styles.currencyBadgeText, { color: '#B0BEC5' }]}>WCoinP</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: kitIncludeWCoinP ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {kitIncludeWCoinP ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {kitIncludeWCoinP && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={kitWCoinP}
                      onChangeText={setKitWCoinP}
                      keyboardType="numeric"
                      placeholder="Cantidad de WCoinP..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['25', '50', '100', '200', '500'].map((val) => (
                        <TouchableOpacity
                          key={'kit_wcoinp_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setKitWCoinP(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 4. GOBLIN POINTS */}
              <View style={[styles.currencyCard, kitIncludeGoblinPoints && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setKitIncludeGoblinPoints(!kitIncludeGoblinPoints)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={kitIncludeGoblinPoints ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={kitIncludeGoblinPoints ? '#00E676' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#00E67622', borderColor: '#00E676' }]}>
                    <MaterialCommunityIcons name="hexagon-multiple" size={15} color="#00E676" />
                    <Text style={[styles.currencyBadgeText, { color: '#00E676' }]}>Goblin Points (GP)</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: kitIncludeGoblinPoints ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {kitIncludeGoblinPoints ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {kitIncludeGoblinPoints && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={kitGoblinPoints}
                      onChangeText={setKitGoblinPoints}
                      keyboardType="numeric"
                      placeholder="Cantidad de Goblin Points..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['25', '50', '100', '250', '500'].map((val) => (
                        <TouchableOpacity
                          key={'kit_gp_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setKitGoblinPoints(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 5. RUUD */}
              <View style={[styles.currencyCard, kitIncludeRuud && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setKitIncludeRuud(!kitIncludeRuud)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={kitIncludeRuud ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={kitIncludeRuud ? '#E040FB' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#E040FB22', borderColor: '#E040FB' }]}>
                    <MaterialCommunityIcons name="diamond-stone" size={15} color="#E040FB" />
                    <Text style={[styles.currencyBadgeText, { color: '#E040FB' }]}>Ruud</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: kitIncludeRuud ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {kitIncludeRuud ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {kitIncludeRuud && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={kitRuud}
                      onChangeText={setKitRuud}
                      keyboardType="numeric"
                      placeholder="Cantidad de Ruud..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['100', '250', '500', '1000', '2500'].map((val) => (
                        <TouchableOpacity
                          key={'kit_ruud_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setKitRuud(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </View>

            {/* Current Kit Items List */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                  onPress={() => setKitIncludeItems(!kitIncludeItems)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={kitIncludeItems ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={kitIncludeItems ? THEME.colors.primaryOrange : '#666'}
                  />
                  <Text style={[styles.cardTitle, { marginLeft: 8, marginBottom: 0, color: kitIncludeItems ? '#FFF' : '#888' }]}>
                    Incluir Ítems en el Baúl ({kitList.length})
                  </Text>
                </TouchableOpacity>
                {kitList.length > 0 && kitIncludeItems && (
                  <TouchableOpacity onPress={() => setKitList([])}>
                    <Text style={{ color: '#FF5252', fontSize: 12, fontWeight: 'bold' }}>Vaciar Kit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!kitIncludeItems && (
                <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#888', fontSize: 12, fontStyle: 'italic' }}>
                    Ítems desactivados: solo se entregarán las monedas marcadas arriba.
                  </Text>
                </View>
              )}

              {kitList.length === 0 ? (
                <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginVertical: 14 }}>
                  No hay ítems en la lista. Puedes cargar un preset o agregar ítems desde el Maker.
                </Text>
              ) : (
                kitList.map((entry, idx) => (
                  <View key={'kit_item_' + (entry.id || idx)} style={styles.dupeItemRow}>
                    <ItemImage itemName={entry.itemDef.name} size={32} fallbackColor="#FF9800" />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.dupeItemName}>
                        {entry.itemDef.name} +{entry.level}
                      </Text>
                      <Text style={styles.dupeItemLoc}>
                        {entry.skill ? 'Skill ' : ''}{entry.luck ? 'Luck ' : ''}{entry.option ? '+' + (entry.option * 4) + ' ' : ''}
                        {entry.excFlags ? 'Exc ' : ''}{entry.option380 ? '380 ' : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setKitList((prev) => prev.filter((_, i) => i !== idx))}
                      style={{ padding: 6 }}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF5252" />
                    </TouchableOpacity>
                  </View>
                ))
              )}

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: THEME.colors.primaryOrange, marginTop: 12 }]}
                onPress={handleDeliverKit}
                disabled={deliveringKit || (!kitIncludeItems && !kitIncludeZen && !kitIncludeGCoins && !kitIncludeWCoinP && !kitIncludeGoblinPoints && !kitIncludeRuud)}
              >
                {deliveringKit ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cube-send" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Entregar Starter Kit al Baúl</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 7: PREMIOS A JUGADORES ONLINE                                         */}
        {/* ========================================================================= */}
                {activeTab === 'prizes' && (
          <ErrorBoundary tabName="Premios a Jugadores">

          <View style={styles.tabContent}>
            {/* Presets Card: Botones Configurables y Modificables */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.cardTitle}>Botones de Presets de Premios</Text>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  onPress={() => setShowSavePrizeInput(!showSavePrizeInput)}
                >
                  <MaterialCommunityIcons name={showSavePrizeInput ? 'close' : 'plus-circle'} size={15} color={THEME.colors.primaryOrange} />
                  <Text style={{ color: THEME.colors.primaryOrange, fontSize: 12, fontWeight: 'bold' }}>
                    {showSavePrizeInput ? 'Cancelar' : 'Nuevo Botón'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.cardDesc}>
                Toca un botón para cargar sus recompensas. Modifica las monedas o ítems y guarda los cambios en ese botón con 1 clic:
              </Text>

              {showSavePrizeInput && (
                <View style={styles.newPresetContainer}>
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold', marginBottom: 6 }}>
                    Guardar Configuración Actual como Nuevo Botón de Premio:
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[styles.textInput, { flex: 1 }]}
                      value={newPrizePresetName}
                      onChangeText={setNewPrizePresetName}
                      placeholder="Nombre del Botón (ej: Premio Guild War)"
                      placeholderTextColor="#666"
                    />
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#2E7D32', width: 90, marginTop: 0 }]}
                      onPress={handleCreateNewPrizePreset}
                    >
                      <Text style={styles.actionBtnText}>Crear</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Botones de Presets */}
              <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4, marginBottom: 10 }}>
                {prizePresets.map((p) => {
                  const isActive = activePrizePresetId === p.id;
                  return (
                    <TouchableOpacity
                      key={'prize_preset_btn_' + p.id}
                      style={[
                        styles.presetPill,
                        { borderColor: p.badgeColor || THEME.colors.primaryOrange },
                        isActive && { backgroundColor: (p.badgeColor || THEME.colors.primaryOrange) + '33', borderWidth: 2 }
                      ]}
                      onPress={() => handleApplyPrizePreset(p.id)}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons
                        name={(p.icon || 'trophy') as any}
                        size={16}
                        color={p.badgeColor || THEME.colors.primaryOrange}
                      />
                      <Text style={[styles.presetPillText, isActive && { fontWeight: 'bold', color: '#FFF' }]}>
                        {p.name}
                      </Text>
                      {isActive && (
                        <MaterialCommunityIcons name="check-circle" size={14} color="#00E676" style={{ marginLeft: 2 }} />
                      )}
                      <TouchableOpacity
                          onPress={() => {
                            Alert.alert('Eliminar Botón de Premio', `¿Deseas eliminar el botón '${p.name}'?`, [
                              { text: 'Cancelar', style: 'cancel' },
                              { text: 'Eliminar', style: 'destructive', onPress: () => handleDeleteCustomPrizePreset(p.id) },
                            ]);
                          }}
                          style={{ marginLeft: 4 }}
                        >
                          <MaterialCommunityIcons name="close-circle" size={14} color="#FF5252" />
                        </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Barra para Modificar y Guardar en el Botón Activo */}
              <View style={[styles.presetModifyBar, { alignItems: 'center' }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="pencil-outline" size={13} color={THEME.colors.primaryOrange} />
                    <Text style={styles.presetModifyLabel}>Nombre del Botón:</Text>
                  </View>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        height: 38,
                        fontSize: 13,
                        fontWeight: '700',
                        color: '#FFF',
                        paddingHorizontal: 8,
                        paddingVertical: 2,
                        marginTop: 4,
                        backgroundColor: '#100D0B',
                        borderColor: '#6B5533',
                        borderWidth: 1,
                        borderRadius: 6,
                      },
                    ]}
                    value={activePrizePresetName}
                    onChangeText={setActivePrizePresetName}
                    placeholder="Ej: Blood Castle, Torneo PvP..."
                    placeholderTextColor="#777"
                  />
                </View>
                <TouchableOpacity
                  style={[styles.savePresetBtn, { height: 42, alignSelf: 'flex-end' }]}
                  onPress={handleSaveCurrentToActivePrizePreset}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="content-save-edit" size={16} color="#FFF" />
                  <Text style={styles.savePresetBtnText}>Guardar</Text>
                </TouchableOpacity>
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 6 }}>
                <TouchableOpacity onPress={handleResetPrizePresets}>
                  <Text style={{ color: '#888', fontSize: 11, textDecorationLine: 'underline' }}>
                    Restablecer botones de premios a valores de fábrica
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Monedas y Puntos Separados por Tarjetas Individuales */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Monedas y Puntos a Entregar</Text>
              <Text style={styles.cardDesc}>
                Marca cada casilla individualmente para entregar solo las recompensas deseadas:
              </Text>

              {/* 1. ZEN */}
              <View style={[styles.currencyCard, prizeIncludeZen && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setPrizeIncludeZen(!prizeIncludeZen)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={prizeIncludeZen ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={prizeIncludeZen ? '#FFD700' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#FFD70022', borderColor: '#FFD700' }]}>
                    <MaterialCommunityIcons name="cash-multiple" size={15} color="#FFD700" />
                    <Text style={[styles.currencyBadgeText, { color: '#FFD700' }]}>Zen por Jugador</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: prizeIncludeZen ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {prizeIncludeZen ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {prizeIncludeZen && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={prizeZen}
                      onChangeText={setPrizeZen}
                      keyboardType="numeric"
                      placeholder="Cantidad de Zen por jugador..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['1000000', '5000000', '10000000', '25000000', '50000000'].map((val) => (
                        <TouchableOpacity
                          key={'prize_zen_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setPrizeZen(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>
                            {parseInt(val, 10) >= 1000000 ? (parseInt(val, 10) / 1000000) + 'M' : val}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 2. WCOINC / WCOINS */}
              <View style={[styles.currencyCard, prizeIncludeGCoins && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setPrizeIncludeGCoins(!prizeIncludeGCoins)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={prizeIncludeGCoins ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={prizeIncludeGCoins ? '#00E5FF' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#00E5FF22', borderColor: '#00E5FF' }]}>
                    <MaterialCommunityIcons name="hand-coin" size={15} color="#00E5FF" />
                    <Text style={[styles.currencyBadgeText, { color: '#00E5FF' }]}>WCoinC (WCoins / GCoins)</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: prizeIncludeGCoins ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {prizeIncludeGCoins ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {prizeIncludeGCoins && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={prizeGCoins}
                      onChangeText={setPrizeGCoins}
                      keyboardType="numeric"
                      placeholder="Cantidad de WCoins..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['50', '100', '300', '500', '1000'].map((val) => (
                        <TouchableOpacity
                          key={'prize_wcoinc_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setPrizeGCoins(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 3. WCOINP */}
              <View style={[styles.currencyCard, prizeIncludeWCoinP && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setPrizeIncludeWCoinP(!prizeIncludeWCoinP)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={prizeIncludeWCoinP ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={prizeIncludeWCoinP ? '#B0BEC5' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#B0BEC522', borderColor: '#B0BEC5' }]}>
                    <MaterialCommunityIcons name="circle-multiple" size={15} color="#B0BEC5" />
                    <Text style={[styles.currencyBadgeText, { color: '#B0BEC5' }]}>WCoinP</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: prizeIncludeWCoinP ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {prizeIncludeWCoinP ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {prizeIncludeWCoinP && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={prizeWCoinP}
                      onChangeText={setPrizeWCoinP}
                      keyboardType="numeric"
                      placeholder="Cantidad de WCoinP..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['25', '50', '100', '200', '500'].map((val) => (
                        <TouchableOpacity
                          key={'prize_wcoinp_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setPrizeWCoinP(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 4. GOBLIN POINTS */}
              <View style={[styles.currencyCard, prizeIncludeGoblinPoints && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setPrizeIncludeGoblinPoints(!prizeIncludeGoblinPoints)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={prizeIncludeGoblinPoints ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={prizeIncludeGoblinPoints ? '#00E676' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#00E67622', borderColor: '#00E676' }]}>
                    <MaterialCommunityIcons name="hexagon-multiple" size={15} color="#00E676" />
                    <Text style={[styles.currencyBadgeText, { color: '#00E676' }]}>Goblin Points (GP)</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: prizeIncludeGoblinPoints ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {prizeIncludeGoblinPoints ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {prizeIncludeGoblinPoints && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={prizeGoblinPoints}
                      onChangeText={setPrizeGoblinPoints}
                      keyboardType="numeric"
                      placeholder="Cantidad de Goblin Points..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['25', '50', '100', '250', '500'].map((val) => (
                        <TouchableOpacity
                          key={'prize_gp_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setPrizeGoblinPoints(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* 5. RUUD */}
              <View style={[styles.currencyCard, prizeIncludeRuud && styles.currencyCardActive]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setPrizeIncludeRuud(!prizeIncludeRuud)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={prizeIncludeRuud ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={prizeIncludeRuud ? '#E040FB' : '#666'}
                  />
                  <View style={[styles.currencyBadge, { backgroundColor: '#E040FB22', borderColor: '#E040FB' }]}>
                    <MaterialCommunityIcons name="diamond-stone" size={15} color="#E040FB" />
                    <Text style={[styles.currencyBadgeText, { color: '#E040FB' }]}>Ruud</Text>
                  </View>
                  <Text style={{ flex: 1, textAlign: 'right', fontSize: 11, color: prizeIncludeRuud ? '#00E676' : '#666', fontWeight: 'bold' }}>
                    {prizeIncludeRuud ? 'ACTIVADO' : 'DESACTIVADO'}
                  </Text>
                </TouchableOpacity>
                {prizeIncludeRuud && (
                  <View style={styles.currencyCardBody}>
                    <TextInput
                      style={styles.currencyInput}
                      value={prizeRuud}
                      onChangeText={setPrizeRuud}
                      keyboardType="numeric"
                      placeholder="Cantidad de Ruud..."
                      placeholderTextColor="#666"
                    />
                    <View style={styles.currencyQuickRow}>
                      {['100', '250', '500', '1000', '2500'].map((val) => (
                        <TouchableOpacity
                          key={'prize_ruud_q_' + val}
                          style={styles.currencyQuickBtn}
                          onPress={() => setPrizeRuud(val)}
                        >
                          <Text style={styles.currencyQuickBtnText}>{val}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Checkbox Maker Item */}
              <View style={[styles.currencyCard, prizeIncludeHex && styles.currencyCardActive, { marginTop: 4 }]}>
                <TouchableOpacity
                  style={styles.currencyCardHeader}
                  onPress={() => setPrizeIncludeHex(!prizeIncludeHex)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={prizeIncludeHex ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={22}
                    color={prizeIncludeHex ? THEME.colors.primaryOrange : '#666'}
                  />
                  <View style={{ marginLeft: 8, flex: 1 }}>
                    <Text style={{ color: prizeIncludeHex ? '#FFF' : '#888', fontWeight: 'bold', fontSize: 13 }}>
                      Incluir Ítem del Maker al Baúl
                    </Text>
                    <Text style={{ color: '#888', fontSize: 11 }}>
                      {selectedItemDef ? selectedItemDef.name + ' +' + makerLevel : 'Inyecta el ítem configurado en el Maker'}
                    </Text>
                  </View>
                </TouchableOpacity>
                {prizeIncludeHex && (
                  <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#2C2C3A' }}>
                    <Text style={{ color: '#AAA', fontSize: 11, marginBottom: 6, fontWeight: '700' }}>
                      Baúl Destino del Ítem:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        {[
                          { idx: 0, label: 'Baúl Principal' },
                          { idx: 1, label: 'Baúl #1' },
                          { idx: 2, label: 'Baúl #2' },
                          { idx: 3, label: 'Baúl #3' },
                          { idx: 4, label: 'Baúl #4' },
                          { idx: 5, label: 'Baúl #5' },
                        ].map((v) => (
                          <TouchableOpacity
                            key={'prize_ware_' + v.idx}
                            style={[
                              styles.filterPill,
                              prizeWarehouseIndex === v.idx && styles.filterPillActive,
                            ]}
                            onPress={() => setPrizeWarehouseIndex(v.idx)}
                          >
                            <Text style={[styles.filterPillText, prizeWarehouseIndex === v.idx && styles.filterPillTextActive]}>
                              {v.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </ScrollView>
                  </View>
                )}
              </View>
            </View>

            {/* Online Players Selection Card */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.cardTitle}>
                    Jugadores Online ({prizeOnlinePlayers.length})
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B5E20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50', marginRight: 4 }} />
                    <Text style={{ fontSize: 10, color: '#A5D6A7', fontWeight: 'bold' }}>En Vivo (5s)</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={() => loadPrizePlayers(false)} disabled={loadingPrizePlayers}>
                  <MaterialCommunityIcons name="reload" size={18} color={THEME.colors.primaryOrange} />
                </TouchableOpacity>
              </View>

              {/* Class Filter pills */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 0, label: 'DW' },
                    { id: 16, label: 'DK' },
                    { id: 32, label: 'ELF' },
                    { id: 48, label: 'MG' },
                    { id: 64, label: 'DL' },
                    { id: 80, label: 'SUM' },
                    { id: 96, label: 'RF' },
                  ].map((cf) => (
                    <TouchableOpacity
                      key={'prize_filter_' + cf.id}
                      style={[
                        styles.filterPill,
                        prizeClassFilter === cf.id && styles.filterPillActive,
                      ]}
                      onPress={() => setPrizeClassFilter(cf.id as any)}
                    >
                      <Text style={[styles.filterPillText, prizeClassFilter === cf.id && styles.filterPillTextActive]}>
                        {cf.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Autocomplete Player Search */}
              <View style={{ zIndex: 10, marginBottom: 10 }}>
                <AutocompleteInput
                  value={prizeSearchText}
                  onChangeText={setPrizeSearchText}
                  suggestions={prizeOnlinePlayers.map((p) => p.charName)}
                  placeholder="Filtrar por personaje o cuenta..."
                  icon="account-search"
                  maxSuggestions={6}
                />
              </View>

              {/* Selection helper buttons */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <TouchableOpacity
                  style={[styles.filterPill, { backgroundColor: '#FF9800' }]}
                  onPress={() => handleSelectAllPlayers(prizeOnlinePlayers)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.filterPillTextActive, { color: '#000000', fontWeight: '800' }]}>
                    Seleccionar Todos ({prizeOnlinePlayers.length})
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterPill, { backgroundColor: '#2A2A32' }]}
                  onPress={() => {
                    const filtered = prizeOnlinePlayers
                      .filter((p) => prizeClassFilter === 'ALL' || (p.class & ~7) === prizeClassFilter)
                      .filter((p) => {
                        if (!prizeSearchText.trim()) return true;
                        const q = prizeSearchText.toLowerCase().trim();
                        return p.charName.toLowerCase().includes(q) || (p.accountId && p.accountId.toLowerCase().includes(q));
                      });
                    handleSelectAllPlayers(filtered);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterPillTextActive}>Seleccionar Visibles</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterPill, { backgroundColor: '#2A2A32' }]}
                  onPress={handleDeselectAllPlayers}
                  activeOpacity={0.7}
                >
                  <Text style={styles.filterPillTextActive}>Deseleccionar ({selectedPlayerNames.length})</Text>
                </TouchableOpacity>
              </View>

              {loadingPrizePlayers ? (
                <ActivityIndicator color={THEME.colors.primaryOrange} style={{ marginVertical: 20 }} />
              ) : prizeOnlinePlayers.length === 0 ? (
                <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginVertical: 14 }}>
                  No hay jugadores online conectados en este momento.
                </Text>
              ) : (
                <View style={{ gap: 6, maxHeight: 260 }}>
                  <ScrollView nestedScrollEnabled>
                    {prizeOnlinePlayers
                      .filter((p) => prizeClassFilter === 'ALL' || (p.class & ~7) === prizeClassFilter)
                      .filter((p) => {
                        if (!prizeSearchText.trim()) return true;
                        const q = prizeSearchText.toLowerCase().trim();
                        return p.charName.toLowerCase().includes(q) || (p.accountId && p.accountId.toLowerCase().includes(q));
                      })
                      .map((p) => {
                        const isSelected = selectedPlayerNames.includes(p.charName);
                        const classInfo = getMuClassInfo(p.class);
                        return (
                          <TouchableOpacity
                            key={'prize_player_' + p.charName}
                            style={[
                              styles.dupeItemRow,
                              { backgroundColor: isSelected ? 'rgba(181, 143, 60, 0.2)' : '#100D0B', borderWidth: 1, borderColor: isSelected ? THEME.colors.oro : '#6B5533' },
                            ]}
                            onPress={() => handleToggleSelectPlayer(p.charName)}
                          >
                            <MaterialCommunityIcons
                              name={isSelected ? 'checkbox-marked' : 'checkbox-blank-outline'}
                              size={20}
                              color={isSelected ? THEME.colors.primaryOrange : '#888'}
                            />
                            <View style={{ flex: 1, marginLeft: 10 }}>
                              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>
                                {p.charName} (Lv.{p.level})
                              </Text>
                              <Text style={{ color: '#888', fontSize: 11 }}>
                                {classInfo.name} • Cuenta: {p.accountId}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </ScrollView>
                </View>
              )}

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#2E7D32', marginTop: 12 }]}
                onPress={handleDeliverBatchPrizes}
                disabled={deliveringPrize || selectedPlayerNames.length === 0}
              >
                {deliveringPrize ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="gift" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>
                      Entregar Premio a {selectedPlayerNames.length} Jugadores
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* History Card */}
            {prizeHistory.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Historial de Entregas</Text>
                {prizeHistory.slice(0, 5).map((h) => (
                  <View key={'hist_' + h.id} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2C2C35' }}>
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: 'bold' }}>
                      {h.count} Jugadores • {h.date}
                    </Text>
                    <Text style={{ color: THEME.colors.primaryOrange, fontSize: 11 }}>{h.detail}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB: GESTIÓN DE CLANES / GUILDS (100% SQL)                                */}
        {/* ========================================================================= */}
        {activeTab === 'guilds' && (
          <ErrorBoundary tabName="Gestión de Clanes">

          <View style={styles.tabContent}>
            {/* Header info & actions */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View>
                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                  Clanes Registrados ({guildsList.length})
                </Text>
                <Text style={{ color: '#888', fontSize: 11 }}>
                  Gestión directa en tabla Guild & GuildMember (SQL Server)
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.filterPill, { backgroundColor: 'rgba(255, 107, 0, 0.2)', borderColor: THEME.colors.primaryOrange, borderWidth: 1 }]}
                onPress={loadGuilds}
              >
                <MaterialCommunityIcons name="refresh" size={16} color={THEME.colors.primaryOrange} />
                <Text style={[styles.filterPillText, { color: THEME.colors.primaryOrange }]}>Actualizar</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.inputWrap, { marginBottom: 12 }]}>
              <MaterialCommunityIcons name="magnify" size={20} color="#888" />
              <TextInput
                style={styles.textInput}
                placeholder="Buscar clan por nombre o Guild Master..."
                placeholderTextColor="#666"
                value={guildSearch}
                onChangeText={setGuildSearch}
              />
              {guildSearch.length > 0 && (
                <TouchableOpacity onPress={() => setGuildSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {loadingGuilds ? (
              <ActivityIndicator color={THEME.colors.primaryOrange} style={{ marginVertical: 30 }} />
            ) : guildsList.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <MaterialCommunityIcons name="shield-off-outline" size={48} color="#666" />
                <Text style={{ color: '#888', fontSize: 13, marginTop: 10 }}>
                  No se encontraron clanes registrados en el servidor.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {guildsList
                  .filter((g) => {
                    const gName = (g.G_Name || g.name || '').toLowerCase();
                    const gMaster = (g.G_Master || g.master || '').toLowerCase();
                    const q = (guildSearch || '').toLowerCase();
                    return gName.includes(q) || gMaster.includes(q);
                  })
                  .map((g, gIdx) => {
                    const gName = (g.G_Name || g.name || 'Clan').trim();
                    const gMaster = (g.G_Master || g.master || 'Sin Master').trim();
                    const gScore = g.G_Score !== undefined ? g.G_Score : (g.score || 0);
                    const gNotice = g.G_Notice || g.notice || '';
                    const memberCount = g.memberCount !== undefined ? g.memberCount : 0;
                    return (
                      <View key={`guild_${gName}_${gIdx}`} style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <MaterialCommunityIcons name="shield-crown" size={22} color="#FFD700" />
                              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 16 }}>{gName}</Text>
                            </View>
                            <Text style={{ color: THEME.colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                              Master: <Text style={{ color: THEME.colors.primaryOrange, fontWeight: 'bold' }}>{gMaster}</Text>
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                              <Text style={{ color: '#90CAF9', fontSize: 12 }}>
                                Miembros: <Text style={{ fontWeight: 'bold' }}>{memberCount}</Text>
                              </Text>
                              <Text style={{ color: '#00E676', fontSize: 12 }}>
                                Score: <Text style={{ fontWeight: 'bold' }}>{gScore}</Text>
                              </Text>
                            </View>
                            {gNotice ? (
                              <Text style={{ color: '#888', fontSize: 11, fontStyle: 'italic', marginTop: 4 }} numberOfLines={1}>
                                "{gNotice}"
                              </Text>
                            ) : null}
                          </View>

                          <View style={{ gap: 6, alignItems: 'flex-end' }}>
                            <TouchableOpacity
                              style={[styles.filterPill, { backgroundColor: '#241E1A', borderColor: '#E8C86A', borderWidth: 1 }]}
                              onPress={() => handleOpenGuildMembers(g)}
                            >
                              <MaterialCommunityIcons name="account-group" size={15} color="#E8C86A" />
                              <Text style={[styles.filterPillTextActive, { color: '#E8C86A' }]}>Miembros</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.filterPill, { backgroundColor: '#241E1A', borderColor: '#E2703A', borderWidth: 1 }]}
                              onPress={() => handleDeleteGuild(gName)}
                            >
                              <MaterialCommunityIcons name="trash-can-outline" size={15} color="#E2703A" />
                              <Text style={[styles.filterPillTextActive, { color: '#E2703A' }]}>Disolver</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB: CONTROL DE ASESINOS (PK) (100% SQL)                                  */}
        {/* ========================================================================= */}
        {activeTab === 'pk' && (
          <ErrorBoundary tabName="Limpieza de PK">

          <View style={styles.tabContent}>
            {/* Action Banner */}
            <View style={[styles.card, { backgroundColor: '#241E1A', borderColor: '#6B5533' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="skull" size={24} color="#E2703A" />
                  <Text style={{ color: '#E8C86A', fontSize: 15, fontWeight: 'bold' }}>
                    Asesinos Activos ({pkList.length})
                  </Text>
                </View>
                <TouchableOpacity
                  style={[styles.filterPill, { backgroundColor: '#191512', borderColor: '#6B5533', borderWidth: 1 }]}
                  onPress={loadPkList}
                >
                  <MaterialCommunityIcons name="refresh" size={16} color="#E8C86A" />
                  <Text style={[styles.filterPillText, { color: '#E8C86A' }]}>Actualizar</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ color: '#9C9182', fontSize: 12, marginBottom: 12 }}>
                Limpia el estado PK de personajes individuales o ejecuta un perdón masivo para todo el servidor restableciendo PkLevel a 3 (Común).
              </Text>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#241E1A', borderColor: '#E2703A', borderWidth: 1 }]}
                onPress={() => handleClearPkTab()}
                disabled={pkList.length === 0}
              >
                <MaterialCommunityIcons name="sword-cross" size={18} color="#E2703A" />
                <Text style={[styles.actionBtnText, { color: '#E2703A' }]}>Limpiar Todos los Asesinos (Server)</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={[styles.inputWrap, { marginVertical: 12 }]}>
              <MaterialCommunityIcons name="magnify" size={20} color="#888" />
              <TextInput
                style={styles.textInput}
                placeholder="Buscar por PJ o Cuenta..."
                placeholderTextColor="#666"
                value={pkSearch}
                onChangeText={setPkSearch}
              />
              {pkSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPkSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color="#888" />
                </TouchableOpacity>
              )}
            </View>

            {loadingPk ? (
              <ActivityIndicator color={THEME.colors.primaryOrange} style={{ marginVertical: 30 }} />
            ) : pkList.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 30 }}>
                <MaterialCommunityIcons name="shield-check" size={48} color="#3FCF8E" />
                <Text style={{ color: '#3FCF8E', fontSize: 14, fontWeight: 'bold', marginTop: 10 }}>
                  ¡Servidor Libre de Asesinos!
                </Text>
                <Text style={{ color: '#9C9182', fontSize: 12, marginTop: 4 }}>
                  No hay personajes con PkLevel mayor a 3 o muertes pendientes.
                </Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {pkList
                  .filter(
                    (p) =>
                      p.Name.toLowerCase().includes(pkSearch.toLowerCase()) ||
                      p.AccountID.toLowerCase().includes(pkSearch.toLowerCase())
                  )
                  .map((p) => {
                    const badge = getPkBadge(p.PkLevel);
                    const classInfo = getMuClassInfo(p.Class);
                    return (
                      <View key={`pk_${p.Name}`} style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 15 }}>{p.Name}</Text>
                              <View style={{ backgroundColor: badge.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                <Text style={{ color: badge.color, fontSize: 10, fontWeight: 'bold' }}>{badge.label}</Text>
                              </View>
                            </View>
                            <Text style={{ color: THEME.colors.textSecondary, fontSize: 11, marginTop: 3 }}>
                              Cuenta: {p.AccountID} • {classInfo.name} • Lv {p.cLevel}
                            </Text>
                            <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                              <Text style={{ color: '#E2703A', fontSize: 11 }}>
                                Asesinatos: <Text style={{ fontWeight: 'bold' }}>{p.PkCount}</Text>
                              </Text>
                              <Text style={{ color: '#888', fontSize: 11 }}>
                                Tiempo PK: {p.PkTime}s
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[styles.filterPill, { backgroundColor: '#241E1A', borderColor: '#3FCF8E', borderWidth: 1 }]}
                            onPress={() => handleClearPkTab(p.Name || p.charName)}
                          >
                            <MaterialCommunityIcons name="check-circle-outline" size={16} color="#3FCF8E" />
                            <Text style={[styles.filterPillTextActive, { color: '#3FCF8E' }]}>Limpiar PK</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
              </View>
            )}
          </View>
          </ErrorBoundary>
        )}

        {/* ========================================================================= */}
        {/* TAB 9: GESTIÓN DE JUGADORES, BANS Y STAFF GM                              */}
        {/* ========================================================================= */}
        {activeTab === 'players' && (
          <ErrorBoundary tabName="Staff GM y Jugadores">

          <View style={styles.tabContent}>
            {/* Sub-tabs */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <TouchableOpacity
                style={[styles.filterPill, playerSubTab === 'online' && styles.filterPillActive, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setPlayerSubTab('online')}
              >
                <MaterialCommunityIcons name="account-multiple" size={16} color={playerSubTab === 'online' ? '#FFF' : '#888'} />
                <Text style={[styles.filterPillText, playerSubTab === 'online' && styles.filterPillTextActive]}>
                  Online
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, playerSubTab === 'bans' && styles.filterPillActive, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setPlayerSubTab('bans')}
              >
                <MaterialCommunityIcons name="gavel" size={16} color={playerSubTab === 'bans' ? '#FFF' : '#888'} />
                <Text style={[styles.filterPillText, playerSubTab === 'bans' && styles.filterPillTextActive]}>
                  Baneados
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterPill, playerSubTab === 'gm' && styles.filterPillActive, { flex: 1, justifyContent: 'center' }]}
                onPress={() => setPlayerSubTab('gm')}
              >
                <MaterialCommunityIcons name="shield-crown" size={16} color={playerSubTab === 'gm' ? '#FFF' : '#888'} />
                <Text style={[styles.filterPillText, playerSubTab === 'gm' && styles.filterPillTextActive]}>
                  Staff GM
                </Text>
              </TouchableOpacity>
            </View>

            {/* SUBTAB 1: ONLINE (Formato idéntico a referencia: Índice, Nombre, Cuenta, Nivel, Mapa, Servidor, IP) */}
            {playerSubTab === 'online' && (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                    Jugadores Conectados ({playersList.length})
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#064E3B', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, borderWidth: 1, borderColor: '#059669' }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' }} />
                    <Text style={{ fontSize: 11, color: '#34D399', fontWeight: 'bold' }}>Auto-sync (5s)</Text>
                  </View>
                </View>

                <View style={{ zIndex: 10 }}>
                  <AutocompleteInput
                    value={playersSearch}
                    onChangeText={setPlayersSearch}
                    suggestions={Array.from(new Set([...playersList.map((p) => p.charName), ...playersList.map((p) => p.accountId)]))}
                    placeholder="Buscar por PJ o Cuenta..."
                    icon="magnify"
                    maxSuggestions={6}
                  />
                </View>

                {loadingPlayersList ? (
                  <ActivityIndicator color={THEME.colors.primaryOrange} style={{ marginVertical: 20 }} />
                ) : playersList.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <MaterialCommunityIcons name="account-off" size={40} color="#666" />
                    <Text style={{ color: '#888', fontSize: 13, marginTop: 8 }}>
                      No hay jugadores online conectados en este momento.
                    </Text>
                  </View>
                ) : (
                  playersList
                    .filter((p) =>
                      p.charName.toLowerCase().includes(playersSearch.toLowerCase()) ||
                      p.accountId.toLowerCase().includes(playersSearch.toLowerCase())
                    )
                    .map((p, index) => {
                      const classInfo = getMuClassInfo(p.class);
                      const mapId = p.mapNumber ?? p.map ?? 0;
                      const mapName = MU_MAPS[mapId] || `Mapa ${mapId}`;
                      const posX = p.mapX ?? 125;
                      const posY = p.mapY ?? 125;
                      const serverLabel = p.serverName || 'GameServer';
                      const ipLabel = p.ip || '127.0.0.1';

                      return (
                        <TouchableOpacity
                          key={`player_item_${p.charName}_${index}`}
                          style={styles.onlinePlayerCard}
                          activeOpacity={0.75}
                          onPress={() => setSelectedPlayerModal(p)}
                        >
                          {/* Circular Index Badge */}
                          <View style={styles.onlinePlayerIndexBadge}>
                            <Text style={styles.onlinePlayerIndexText}>{index + 1}</Text>
                          </View>

                          {/* Main Player Info */}
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            {/* Row 1: Nombre, Cuenta, Nivel, Badges */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                              <Text style={styles.onlinePlayerName}>{p.charName}</Text>
                              <View style={styles.onlinePlayerAccountPill}>
                                <Text style={styles.onlinePlayerAccountText}>{p.accountId}</Text>
                              </View>
                              <View style={styles.onlinePlayerLevelBadge}>
                                <Text style={styles.onlinePlayerLevelText}>Lv.{p.level}</Text>
                              </View>
                              {p.ctlCode === 1 && (
                                <View style={[styles.onlinePlayerLevelBadge, { backgroundColor: '#8C2B1D' }]}>
                                  <Text style={styles.onlinePlayerLevelText}>BANEADO</Text>
                                </View>
                              )}
                              {p.ctlCode === 32 && (
                                <View style={[styles.onlinePlayerLevelBadge, { backgroundColor: '#FF8F00' }]}>
                                  <Text style={styles.onlinePlayerLevelText}>GM</Text>
                                </View>
                              )}
                            </View>

                            {/* Row 2: Pills (Ubicación, Servidor, IP) */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                              <View style={styles.onlinePlayerPill}>
                                <MaterialCommunityIcons name="map-marker" size={12} color="#4FC3F7" />
                                <Text style={styles.onlinePlayerPillText}>{mapName} ({posX},{posY})</Text>
                              </View>
                              <View style={styles.onlinePlayerPill}>
                                <MaterialCommunityIcons name="server" size={12} color="#81C784" />
                                <Text style={styles.onlinePlayerPillText}>{serverLabel}</Text>
                              </View>
                              <View style={styles.onlinePlayerPill}>
                                <MaterialCommunityIcons name="ip-network" size={12} color="#FFB74D" />
                                <Text style={styles.onlinePlayerPillText}>{ipLabel}</Text>
                              </View>
                            </View>
                          </View>

                          {/* Chevron indicador táctil */}
                          <MaterialCommunityIcons name="chevron-right" size={20} color="#777" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                      );
                    })
                )}
              </View>
            )}

            {/* SUBTAB 2: BANS (Cuentas y Personajes con CtlCode = 1) */}
            {playerSubTab === 'bans' && (
              <View style={{ gap: 10 }}>
                {/* Botones de Acción: Banear Personaje vs Bloquear Cuenta */}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderColor: '#E8C86A', borderWidth: 1 }]}
                    onPress={() => setCharBanModalVisible(true)}
                  >
                    <MaterialCommunityIcons name="account-cancel" size={16} color="#E8C86A" />
                    <Text style={[styles.actionBtnText, { fontSize: 12, color: '#E8C86A' }]}>Banear Personaje</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderColor: '#E2703A', borderWidth: 1 }]}
                    onPress={() => setBanModalVisible(true)}
                  >
                    <MaterialCommunityIcons name="shield-lock" size={16} color="#E2703A" />
                    <Text style={[styles.actionBtnText, { fontSize: 12, color: '#E2703A' }]}>Bloquear Cuenta</Text>
                  </TouchableOpacity>
                </View>

                {/* Filtros de Pestaña */}
                <View style={{ flexDirection: 'row', gap: 6, marginVertical: 4 }}>
                  <TouchableOpacity
                    style={[styles.filterPill, bansFilter === 'all' && styles.filterPillActive, { flex: 1, justifyContent: 'center' }]}
                    onPress={() => setBansFilter('all')}
                  >
                    <Text style={[styles.filterPillText, bansFilter === 'all' && styles.filterPillTextActive]}>
                      Todos ({bansList.length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterPill, bansFilter === 'characters' && styles.filterPillActive, { flex: 1, justifyContent: 'center' }]}
                    onPress={() => setBansFilter('characters')}
                  >
                    <Text style={[styles.filterPillText, bansFilter === 'characters' && styles.filterPillTextActive]}>
                      Personajes ({bansList.filter(b => b.type === 'character' || !!b.charName).length})
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.filterPill, bansFilter === 'accounts' && styles.filterPillActive, { flex: 1, justifyContent: 'center' }]}
                    onPress={() => setBansFilter('accounts')}
                  >
                    <Text style={[styles.filterPillText, bansFilter === 'accounts' && styles.filterPillTextActive]}>
                      Cuentas ({bansList.filter(b => b.type === 'account' && !b.charName).length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Buscador de Baneados */}
                <View style={styles.inputWrap}>
                  <MaterialCommunityIcons name="magnify" size={18} color="#9C9182" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Buscar baneado por cuenta, PJ o motivo..."
                    placeholderTextColor="#666"
                    value={bansSearch}
                    onChangeText={setBansSearch}
                  />
                  {bansSearch ? (
                    <TouchableOpacity onPress={() => setBansSearch('')}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#9C9182" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {loadingBansList ? (
                  <ActivityIndicator color={THEME.colors.primaryOrange} style={{ marginVertical: 20 }} />
                ) : (
                  (() => {
                    const filteredBans = bansList.filter((b) => {
                      if (bansFilter === 'characters' && b.type !== 'character' && !b.charName) return false;
                      if (bansFilter === 'accounts' && (b.type === 'character' || !!b.charName)) return false;
                      if (!bansSearch.trim()) return true;
                      const s = bansSearch.toLowerCase();
                      return (
                        (b.accountId && b.accountId.toLowerCase().includes(s)) ||
                        (b.charName && b.charName.toLowerCase().includes(s)) ||
                        (b.reason && b.reason.toLowerCase().includes(s))
                      );
                    });

                    if (filteredBans.length === 0) {
                      return (
                        <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginVertical: 20 }}>
                          No se encontraron registros de bloqueos.
                        </Text>
                      );
                    }

                    return filteredBans.map((b, idx) => {
                      const isCharacterBan = b.type === 'character' || !!b.charName;
                      const classInfo = b.class !== undefined ? getMuClassInfo(b.class) : null;

                      return (
                        <View key={`ban_item_${b.accountId}_${b.charName || ''}_${idx}`} style={styles.card}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={{ flex: 1, marginRight: 8 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                <View style={[
                                  styles.onlinePlayerLevelBadge,
                                  { backgroundColor: isCharacterBan ? '#4A3525' : '#4A1510', borderColor: isCharacterBan ? '#E8C86A' : '#E2703A', borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2 }
                                ]}>
                                  <Text style={[styles.onlinePlayerLevelText, { fontSize: 9, color: isCharacterBan ? '#E8C86A' : '#E2703A' }]}>
                                    {isCharacterBan ? 'PERSONAJE BANEADO' : 'CUENTA BLOQUEADA'}
                                  </Text>
                                </View>
                                <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                                  {isCharacterBan ? b.charName : b.accountId}
                                </Text>
                                {isCharacterBan && b.level ? (
                                  <Text style={{ color: '#FFB74D', fontSize: 11 }}>Lv.{b.level}</Text>
                                ) : null}
                              </View>

                              <Text style={{ color: '#888', fontSize: 11, marginTop: 4 }}>
                                {isCharacterBan ? `Cuenta: ${b.accountId} • ` : ''}
                                {classInfo ? `${classInfo.name} • ` : ''}
                                {b.reason || 'Bloqueo administrativo'}
                              </Text>
                            </View>

                            {/* Botón de Desbaneo según tipo */}
                            <TouchableOpacity
                              style={[styles.filterPill, { backgroundColor: '#241E1A', borderColor: '#3FCF8E', borderWidth: 1 }]}
                              onPress={() => {
                                if (isCharacterBan && b.charName) {
                                  handleUnbanCharacter(b.charName);
                                } else {
                                  handleUnbanAccount(b.accountId);
                                }
                              }}
                            >
                              <MaterialCommunityIcons name="lock-open" size={14} color="#3FCF8E" />
                              <Text style={[styles.filterPillTextActive, { color: '#3FCF8E' }]}>Desbanear</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    });
                  })()
                )}
              </View>
            )}

            {/* SUBTAB 3: STAFF GM */}
            {playerSubTab === 'gm' && (
              <View style={{ gap: 10 }}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: THEME.colors.primaryOrange }]}
                  onPress={() => setGmModalVisible(true)}
                >
                  <MaterialCommunityIcons name="shield-plus" size={18} color="#FFF" />
                  <Text style={styles.actionBtnText}>Asignar / Cambiar Nivel GM</Text>
                </TouchableOpacity>

                {loadingGmsList ? (
                  <ActivityIndicator color={THEME.colors.primaryOrange} style={{ marginVertical: 20 }} />
                ) : gmsList.length === 0 ? (
                  <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginVertical: 20 }}>
                    No se encontraron personajes con rango CtlCode GM en Character.
                  </Text>
                ) : (
                  gmsList.map((gm) => {
                    const levelBadge =
                      gm.gmLevel === 3 ? { text: 'Admin (3)', color: '#FFD700' } :
                      gm.gmLevel === 2 ? { text: 'Game Master (2)', color: THEME.colors.primaryOrange } :
                      gm.gmLevel === 1 ? { text: 'Helper (1)', color: '#00B0FF' } :
                      { text: 'Normal (0)', color: '#888' };

                    return (
                      <View key={`gm_${gm.charName}`} style={styles.card}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 14 }}>
                                {gm.charName}
                              </Text>
                              <View style={[styles.filterPill, { backgroundColor: 'rgba(255, 255, 255, 0.1)' }]}>
                                <Text style={{ color: levelBadge.color, fontSize: 10, fontWeight: 'bold' }}>
                                  {levelBadge.text}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ color: '#888', fontSize: 11, marginTop: 2 }}>
                              Cuenta: {gm.accountId}
                            </Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            <TouchableOpacity
                              style={[styles.filterPill, { backgroundColor: '#241E1A', borderColor: '#E8C86A', borderWidth: 1 }]}
                              onPress={() => {
                                setGmCharNameInput(gm.charName);
                                setGmAccountInput(gm.accountId);
                                setSelectedGmLevel(gm.gmLevel);
                                setGmModalVisible(true);
                              }}
                            >
                              <MaterialCommunityIcons name="pencil" size={14} color="#E8C86A" />
                              <Text style={[styles.filterPillTextActive, { color: '#E8C86A' }]}>Editar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.filterPill, { backgroundColor: '#241E1A', borderColor: '#E2703A', borderWidth: 1 }]}
                              onPress={() => handleRemoveGm(gm.charName, gm.accountId)}
                            >
                              <MaterialCommunityIcons name="shield-off" size={14} color="#E2703A" />
                              <Text style={[styles.filterPillTextActive, { color: '#E2703A' }]}>Quitar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            )}
          </View>
          </ErrorBoundary>
        )}
      </ScrollView>

      {/* Modal Miembros del Clan */}
      <Modal visible={guildModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', maxWidth: 400 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="shield-crown" size={24} color="#E8C86A" />
                <View>
                  <Text style={styles.modalTitle}>Clan: {selectedGuild?.G_Name || selectedGuild?.name || 'Clan'}</Text>
                  <Text style={{ color: '#9C9182', fontSize: 11 }}>
                    Master: {selectedGuild?.G_Master || selectedGuild?.master || 'Sin Master'} • Score: {selectedGuild?.G_Score ?? selectedGuild?.score ?? 0}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setGuildModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {loadingMembers ? (
              <ActivityIndicator color={THEME.colors.primaryOrange} style={{ marginVertical: 30 }} />
            ) : guildMembers.length === 0 ? (
              <Text style={{ color: '#888', textAlign: 'center', marginVertical: 20 }}>
                No se encontraron miembros registrados en este clan.
              </Text>
            ) : (
              <ScrollView style={{ flexShrink: 1, maxHeight: 380 }} showsVerticalScrollIndicator={true}>
                <View style={{ gap: 8 }}>
                  {guildMembers.map((m, mIdx) => {
                    const role = getGuildRole(m.G_Status ?? m.status ?? 0);
                    const classInfo = getMuClassInfo(m.Class ?? m.class ?? 0);
                    return (
                      <View
                        key={`gm_${m.Name}`}
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#191512',
                          padding: 10,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#3D312A',
                        }}
                      >
                        <View>
                          <Text style={{ color: '#FFF', fontWeight: 'bold', fontSize: 13 }}>{m.Name}</Text>
                          <Text style={{ color: '#9C9182', fontSize: 11 }}>
                            {classInfo.name} • Lv {m.cLevel ?? '?'}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                          <Text style={{ color: role.color, fontSize: 11, fontWeight: 'bold' }}>{role.label}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderColor: '#E2703A', borderWidth: 1 }]}
                onPress={() => {
                  if (selectedGuild) handleDeleteGuild(selectedGuild.G_Name);
                }}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#E2703A" />
                <Text style={[styles.actionBtnText, { color: '#E2703A' }]}>Disolver Clan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#191512', borderColor: '#6B5533', borderWidth: 1 }]}
                onPress={() => setGuildModalVisible(false)}
              >
                <Text style={[styles.actionBtnText, { color: '#E8C86A' }]}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Edición Rápida: Inyectar Set Completo */}
      <Modal visible={quickSetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%', maxWidth: 440 }]}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="lightning-bolt" size={24} color="#E2703A" />
                <Text style={[styles.modalTitle, { marginBottom: 0, color: '#E8C86A' }]}>
                  Edición Rápida: Set Completo
                </Text>
              </View>
              <TouchableOpacity onPress={() => setQuickSetModalVisible(false)} style={{ padding: 4 }}>
                <MaterialCommunityIcons name="close" size={24} color="#AAA" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Target Account Notice with Autocomplete and Quick Chips */}
              <View style={{ backgroundColor: '#191512', padding: 10, borderRadius: 6, marginBottom: 12, borderWidth: 1, borderColor: makerAccount.trim() ? '#3FCF8E' : '#E2703A', zIndex: 100 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: '#9C9182', fontSize: 11, fontWeight: 'bold' }}>CUENTA DE DESTINO (OBLIGATORIO):</Text>
                  <View style={{ backgroundColor: '#241E1A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#3D312A' }}>
                    <Text style={{ color: '#E8C86A', fontSize: 11, fontWeight: 'bold' }}>
                      {makerWarehouseIndex === 0 ? 'Baúl Principal' : makerWarehouseIndex === 1 ? 'Bóveda Expandida' : `Baúl #${makerWarehouseIndex}`}
                    </Text>
                  </View>
                </View>
                <AutocompleteInput
                  value={makerAccount}
                  onChangeText={setMakerAccount}
                  suggestions={makerAccountSuggestions}
                  placeholder="Escribe o selecciona la cuenta..."
                  icon="account"
                  autoCapitalize="none"
                  maxSuggestions={6}
                  clearable={true}
                  onSuggestionPress={(acc) => setMakerAccount(acc)}
                />
                {makerAccountSuggestions.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={{ color: '#666', fontSize: 10, marginBottom: 4, fontWeight: 'bold' }}>CUENTAS RECIENTES (1 TOQUE):</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {makerAccountSuggestions.slice(0, 8).map((acc) => {
                        const isMatch = makerAccount.trim().toLowerCase() === acc.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={`quick_acc_chip_${acc}`}
                            style={{
                              backgroundColor: isMatch ? '#E2703A' : '#191512',
                              paddingHorizontal: 8,
                              paddingVertical: 4,
                              borderRadius: 6,
                              borderWidth: 1,
                              borderColor: isMatch ? '#E8C86A' : '#3D312A',
                            }}
                            onPress={() => setMakerAccount(acc)}
                          >
                            <Text style={{ color: isMatch ? '#FFF' : '#AAA', fontSize: 11, fontWeight: '600' }}>
                              {acc}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
                {!makerAccount.trim() && (
                  <Text style={{ color: '#FF5252', fontSize: 10, marginTop: 4 }}>
                    Selecciona o ingresa una cuenta para habilitar el botón de inyección.
                  </Text>
                )}
              </View>

              {/* Class Filter Tabs */}
              <Text style={styles.label}>1. Filtra por Clase de Personaje:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'DW', label: 'Mago' },
                    { id: 'DK', label: 'Guerrero' },
                    { id: 'FE', label: 'Elfa' },
                    { id: 'MG', label: 'Magocaballero' },
                    { id: 'DL', label: 'Dark Lord' },
                    { id: 'ACC', label: 'Ancient' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={`qsf_${f.id}`}
                      style={[
                        styles.filterPill,
                        quickSetCategoryFilter === f.id && styles.filterPillActive,
                      ]}
                      onPress={() => setQuickSetCategoryFilter(f.id as any)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          quickSetCategoryFilter === f.id && styles.filterPillTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Sets List Horizontal */}
              <Text style={styles.label}>2. Elige el Set deseado:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {QUICK_SETS_CATALOG
                    .filter((s) => quickSetCategoryFilter === 'ALL' || s.cat === quickSetCategoryFilter)
                    .map((set) => {
                      const isSelected = selectedQuickSet.id === set.id;
                      return (
                        <TouchableOpacity
                          key={`qs_${set.id}`}
                          style={[
                            styles.itemCard,
                            isSelected && styles.itemCardSelected,
                            { minWidth: 120, padding: 10, alignItems: 'center' },
                          ]}
                          onPress={() => setSelectedQuickSet(set)}
                        >
                          <MaterialCommunityIcons
                            name="shield-outline"
                            size={24}
                            color={isSelected ? THEME.colors.primaryOrange : '#888'}
                          />
                          <Text
                            style={[
                              styles.itemName,
                              isSelected && styles.itemNameSelected,
                              { fontSize: 12, textAlign: 'center', marginTop: 4 },
                            ]}
                          >
                            {set.name}
                          </Text>
                          <Text style={{ color: '#777', fontSize: 10, marginTop: 2 }}>{set.catLabel}</Text>
                          <Text style={{ color: '#4CAF50', fontSize: 9, marginTop: 2, fontWeight: 'bold' }}>
                            {set.pieces.length} piezas
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </ScrollView>

              {/* Set Pieces Preview */}
              <Text style={styles.label}>3. Piezas incluidas en {selectedQuickSet.name}:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {selectedQuickSet.pieces.map((p, idx) => (
                  <View
                    key={`piece_${idx}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#191512',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#3D312A',
                    }}
                  >
                    <MaterialCommunityIcons name="check-circle" size={12} color="#3FCF8E" />
                    <Text style={{ color: '#EDE4D3', fontSize: 11 }}>{p.name}</Text>
                  </View>
                ))}
              </View>

              {/* Options Configuration */}
              <Text style={styles.label}>4. Opciones de las Piezas:</Text>
              
              {/* Level Stepper */}
              <View style={[styles.optionRow, { justifyContent: 'space-between', marginBottom: 8 }]}>
                <Text style={{ color: '#DDD', fontSize: 13 }}>Nivel:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuickLevel((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#FFD54F', fontSize: 15, fontWeight: 'bold', minWidth: 36, textAlign: 'center' }}>
                    +{quickLevel}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuickLevel((prev) => Math.min(15, prev + 1))}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Option Stepper */}
              <View style={[styles.optionRow, { justifyContent: 'space-between', marginBottom: 8 }]}>
                <Text style={{ color: '#DDD', fontSize: 13 }}>Opción Adicional:</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuickOption((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>-</Text>
                  </TouchableOpacity>
                  <Text style={{ color: '#81C784', fontSize: 15, fontWeight: 'bold', minWidth: 36, textAlign: 'center' }}>
                    +{quickOption * 4}
                  </Text>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => setQuickOption((prev) => Math.min(7, prev + 1))}
                  >
                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Toggles: Luck, Skill, Full Exc, 380 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={[styles.switchOption, quickLuck && styles.switchOptionActive]}
                  onPress={() => setQuickLuck(!quickLuck)}
                >
                  <Text style={[styles.switchText, quickLuck && styles.switchTextActive]}>Luck</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.switchOption, quickSkill && styles.switchOptionActive]}
                  onPress={() => setQuickSkill(!quickSkill)}
                >
                  <Text style={[styles.switchText, quickSkill && styles.switchTextActive]}>Skill</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.switchOption, quickFullExc && styles.switchOptionActive]}
                  onPress={() => setQuickFullExc(!quickFullExc)}
                >
                  <Text style={[styles.switchText, quickFullExc && styles.switchTextActive]}>Full Excelente</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.switchOption, quick380 && styles.switchOptionActive]}
                  onPress={() => setQuick380(!quick380)}
                >
                  <Text style={[styles.switchText, quick380 && styles.switchTextActive]}>Opción 380</Text>
                </TouchableOpacity>
              </View>

              {/* Ancient Tier for Normal Sets */}
              {selectedQuickSet.cat !== 'ACC' && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ color: '#AAA', fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                    OPCIÓN ANCIENT:
                  </Text>
                  {quickSetAncientOptions.length === 0 ? (
                    <View style={{ backgroundColor: '#1A1613', padding: 8, borderRadius: 6, borderWidth: 1, borderColor: '#6B5533' }}>
                      <Text style={{ color: '#888', fontSize: 11, fontStyle: 'italic' }}>
                        Este set no posee versiones Ancient en Season 6. Solo se inyectará en versión Normal / Excelente.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <TouchableOpacity
                        style={[
                          styles.filterPill,
                          quickAncientTier === 0 && styles.filterPillActive,
                        ]}
                        onPress={() => setQuickAncientTier(0)}
                      >
                        <Text style={[styles.filterPillText, quickAncientTier === 0 && styles.filterPillTextActive]}>
                          Normal (Sin Ancient)
                        </Text>
                      </TouchableOpacity>
                      {quickSetAncientOptions.map((anc) => {
                        const val = anc.tier === 1 ? 5 : 10;
                        const isSelected = quickAncientTier === val;
                        return (
                          <TouchableOpacity
                            key={`q_anc_${anc.tier}`}
                            style={[
                              styles.filterPill,
                              isSelected && { backgroundColor: '#B58F3C', borderColor: '#E8C86A' },
                            ]}
                            onPress={() => setQuickAncientTier(val)}
                          >
                            <Text style={[styles.filterPillText, isSelected && { color: '#100D0B', fontWeight: 'bold' }]}>
                              {anc.name} (T{anc.tier})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* Opción Jewel of Harmony */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={styles.label}>5. Opción Jewel of Harmony:</Text>
                  {quickHarmonyType > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: '#FFD54F', fontSize: 12, fontWeight: 'bold' }}>Nivel +{quickHarmonyLevel}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setQuickHarmonyLevel((prev) => Math.max(0, prev - 1))}
                      >
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setQuickHarmonyLevel((prev) => Math.min(13, prev + 1))}
                      >
                        <Text style={{ color: '#FFF', fontSize: 14, fontWeight: 'bold' }}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.stepperBtn, { backgroundColor: '#B58F3C', paddingHorizontal: 6 }]}
                        onPress={() => setQuickHarmonyLevel(13)}
                      >
                        <Text style={{ color: '#100D0B', fontSize: 10, fontWeight: 'bold' }}>MAX</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {[
                      { id: 0, label: 'Sin Harmony' },
                      { id: 7, label: 'Dmg Reduc (+7%)' },
                      { id: 1, label: 'Defensa (+25)' },
                      { id: 3, label: 'Max HP (+30)' },
                      { id: 8, label: 'SD Ratio (+5%)' },
                      { id: 10, label: 'SD Ignore (+15%)' },
                      { id: 6, label: 'Crit Dmg (+30)' },
                    ].map((h) => {
                      const isSel = quickHarmonyType === h.id;
                      return (
                        <TouchableOpacity
                          key={`q_harm_${h.id}`}
                          style={[
                            styles.filterPill,
                            isSel && { backgroundColor: '#FF6D00', borderColor: '#FF6D00' },
                          ]}
                          onPress={() => {
                            setQuickHarmonyType(h.id);
                            if (h.id > 0 && quickHarmonyLevel === 0) setQuickHarmonyLevel(13);
                          }}
                        >
                          <Text style={[styles.filterPillText, isSel && { color: '#FFF', fontWeight: 'bold' }]}>
                            {h.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Action Button */}
              {(() => {
                const canInject = !!makerAccount.trim() && !injectingQuickSet;
                return (
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      {
                        backgroundColor: canInject ? '#E2703A' : '#191512',
                        marginTop: 10,
                        marginBottom: 20,
                        height: 48,
                        justifyContent: 'center',
                        alignItems: 'center',
                        opacity: canInject ? 1 : 0.6,
                        borderWidth: 1,
                        borderColor: canInject ? '#E8C86A' : '#3D312A',
                      },
                    ]}
                    onPress={handleInjectQuickSet}
                    disabled={!canInject}
                  >
                    {injectingQuickSet ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <MaterialCommunityIcons
                          name={canInject ? "lightning-bolt" : "lock-outline"}
                          size={22}
                          color={canInject ? "#FFF" : "#888"}
                        />
                        <Text style={[styles.actionBtnText, { fontSize: 13, fontWeight: 'bold', color: canInject ? '#FFF' : '#888' }]}>
                          {canInject
                            ? `INYECTAR ${selectedQuickSet.name.toUpperCase()} (${selectedQuickSet.pieces.length} PIEZAS)`
                            : 'INGRESA CUENTA DE DESTINO PARA ACTIVAR'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Modal Nivel GM */}
      <Modal visible={gmModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={styles.modalTitle}>Asignar Rango GM</Text>
            <Text style={styles.label}>Nombre del Personaje:</Text>
            <View style={{ zIndex: 10 }}>
              <AutocompleteInput
                value={gmCharNameInput}
                onChangeText={setGmCharNameInput}
                suggestions={fixesCharSuggestions}
                placeholder="Nombre exacto del PJ"
                icon="account"
                maxSuggestions={5}
              />
            </View>
            <Text style={[styles.label, { marginTop: 10 }]}>Rango Administrativo:</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginVertical: 8 }}>
              {([0, 1, 2, 3] as const).map((lvl) => (
                <TouchableOpacity
                  key={`gm_level_opt_${lvl}`}
                  style={[
                    styles.filterPill,
                    selectedGmLevel === lvl && styles.filterPillActive,
                    { flex: 1, justifyContent: 'center' },
                  ]}
                  onPress={() => setSelectedGmLevel(lvl)}
                >
                  <Text style={[styles.filterPillText, selectedGmLevel === lvl && styles.filterPillTextActive]}>
                    {lvl === 0 ? 'Normal' : lvl === 1 ? 'Helper' : lvl === 2 ? 'GM' : 'Admin'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#191512', borderColor: '#6B5533', borderWidth: 1 }]}
                onPress={() => setGmModalVisible(false)}
              >
                <Text style={[styles.actionBtnText, { color: '#E8C86A' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderColor: '#E8C86A', borderWidth: 1 }]}
                onPress={handleSaveGmLevelSubmit}
                disabled={savingGmLevel}
              >
                {savingGmLevel ? (
                  <ActivityIndicator color="#E8C86A" />
                ) : (
                  <Text style={[styles.actionBtnText, { color: '#E8C86A' }]}>Aplicar Rango</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Detalle de Jugador Online con Acciones Rápidas */}
      <Modal visible={selectedPlayerModal !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 420, maxHeight: '90%' }]}>
            {selectedPlayerModal && (() => {
              const classInfo = getMuClassInfo(selectedPlayerModal.class);
              const mapId = selectedPlayerModal.mapNumber ?? selectedPlayerModal.map ?? 0;
              const mapName = MU_MAPS[mapId] || `Mapa ${mapId}`;
              const posX = selectedPlayerModal.mapX ?? 125;
              const posY = selectedPlayerModal.mapY ?? 125;

              return (
                <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 28 }}>
                  {/* Encabezado del Personaje */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#3A2E22', paddingBottom: 10, marginBottom: 12 }}>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.modalTitle, { marginBottom: 0, color: '#E8C86A' }]}>{selectedPlayerModal.charName}</Text>
                        <View style={[styles.onlinePlayerLevelBadge, { backgroundColor: '#B58F3C' }]}>
                          <Text style={[styles.onlinePlayerLevelText, { color: '#100D0B' }]}>Lv.{selectedPlayerModal.level}</Text>
                        </View>
                      </View>
                      <Text style={{ color: classInfo.accentColor || '#E8C86A', fontSize: 12, marginTop: 2, fontWeight: '600' }}>
                        {classInfo.name}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedPlayerModal(null)} style={{ padding: 4 }}>
                      <MaterialCommunityIcons name="close" size={22} color="#9C9182" />
                    </TouchableOpacity>
                  </View>

                  {/* Tarjetas de Información Detallada */}
                  <View style={{ backgroundColor: '#14100D', borderRadius: 6, borderWidth: 1, borderColor: '#3A2E22', padding: 12, gap: 6, marginBottom: 14 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#9C9182', fontSize: 12 }}>Cuenta Asociada:</Text>
                      <Text style={{ color: '#EDE4D3', fontSize: 12, fontWeight: 'bold' }}>{selectedPlayerModal.accountId}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#9C9182', fontSize: 12 }}>Ubicación en Vivo:</Text>
                      <Text style={{ color: '#5B8DEF', fontSize: 12, fontWeight: '600' }}>{mapName} ({posX}, {posY})</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#9C9182', fontSize: 12 }}>Servidor / GameServer:</Text>
                      <Text style={{ color: '#3FCF8E', fontSize: 12, fontWeight: '600' }}>{selectedPlayerModal.serverName || 'GameServer'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#9C9182', fontSize: 12 }}>Dirección IP:</Text>
                      <Text style={{ color: '#E8C86A', fontSize: 12, fontWeight: 'bold' }}>{selectedPlayerModal.ip || '127.0.0.1'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ color: '#9C9182', fontSize: 12 }}>Hora de Conexión:</Text>
                      <Text style={{ color: '#EDE4D3', fontSize: 11 }}>{selectedPlayerModal.connectTime || 'En línea'}</Text>
                    </View>
                    {selectedPlayerModal.resets !== undefined && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#9C9182', fontSize: 12 }}>Resets Acumulados:</Text>
                        <Text style={{ color: '#E8C86A', fontSize: 12, fontWeight: 'bold' }}>{selectedPlayerModal.resets}</Text>
                      </View>
                    )}
                    {selectedPlayerModal.money !== undefined && selectedPlayerModal.money > 0 && (
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ color: '#9C9182', fontSize: 12 }}>Zen en Inventario:</Text>
                        <Text style={{ color: '#3FCF8E', fontSize: 12, fontWeight: 'bold' }}>{selectedPlayerModal.money.toLocaleString()} Zen</Text>
                      </View>
                    )}
                  </View>

                  {/* ACCIONES DIRECTAS SIN SALIR DEL MODAL */}

                  {/* 1. TELETRANSPORTE RÁPIDO A CIUDADES */}
                  <Text style={[styles.label, { color: '#E8C86A', marginTop: 4, marginBottom: 6 }]}>
                    Teletransporte Rápido:
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                    {[
                      { name: 'Lorencia', map: 0, x: 125, y: 125, icon: 'castle', color: '#E8C86A' },
                      { name: 'Devias', map: 2, x: 220, y: 220, icon: 'snowflake', color: '#5B8DEF' },
                      { name: 'Noria', map: 3, x: 175, y: 110, icon: 'forest', color: '#3FCF8E' },
                      { name: 'Elbeland', map: 51, x: 50, y: 220, icon: 'tree', color: '#E8C86A' },
                      { name: 'Stadium', map: 6, x: 60, y: 60, icon: 'stadium', color: '#E2703A' },
                      { name: 'Losttower', map: 4, x: 208, y: 75, icon: 'fire', color: '#E2703A' },
                      { name: 'Atlans', map: 7, x: 24, y: 35, icon: 'water', color: '#5B8DEF' },
                    ].map((c) => (
                      <TouchableOpacity
                        key={'p_tele_' + c.name}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: '#241E1A',
                          borderWidth: 1,
                          borderColor: '#6B5533',
                          borderRadius: 6,
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          gap: 4,
                        }}
                        onPress={() => handleTeleportPlayerCity(selectedPlayerModal.charName, c.name, c.map, c.x, c.y)}
                      >
                        <MaterialCommunityIcons name={c.icon as any} size={14} color={c.color} />
                        <Text style={{ color: '#EDE4D3', fontSize: 11, fontWeight: 'bold' }}>{c.name}</Text>
                        <Text style={{ color: '#9C9182', fontSize: 9 }}>({c.x},{c.y})</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* 2. FUNCIONES DE GESTIÓN Y LIMPIEZA */}
                  <Text style={[styles.label, { color: '#E8C86A', marginBottom: 6 }]}>Funciones Rápidas:</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    {/* Limpiar PK */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderWidth: 1, borderColor: '#5B8DEF', marginTop: 0, paddingVertical: 8 }]}
                      onPress={() => handleClearPkForPlayer(selectedPlayerModal.charName)}
                    >
                      <MaterialCommunityIcons name="sword-cross" size={16} color="#5B8DEF" />
                      <Text style={[styles.actionBtnText, { fontSize: 11, color: '#EDE4D3' }]}>Limpiar PK</Text>
                    </TouchableOpacity>

                    {/* Asignar Rango GM */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderWidth: 1, borderColor: '#B58F3C', marginTop: 0, paddingVertical: 8 }]}
                      onPress={() => {
                        setGmCharNameInput(selectedPlayerModal.charName);
                        setSelectedPlayerModal(null);
                        setGmModalVisible(true);
                      }}
                    >
                      <MaterialCommunityIcons name="crown" size={16} color="#E8C86A" />
                      <Text style={[styles.actionBtnText, { fontSize: 11, color: '#E8C86A' }]}>Rango GM</Text>
                    </TouchableOpacity>

                    {/* Desconectar (DC) */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { flex: 1, backgroundColor: '#E2703A', marginTop: 0, paddingVertical: 8 }]}
                      onPress={() => {
                        handleDisconnectPlayer(selectedPlayerModal.accountId);
                        setSelectedPlayerModal(null);
                      }}
                    >
                      <MaterialCommunityIcons name="account-off" size={16} color="#FFF" />
                      <Text style={[styles.actionBtnText, { fontSize: 11 }]}>Desconectar</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 3. ATRIBUTOS & ACCESO DIRECTO A MÓDULOS */}
                  <Text style={[styles.label, { color: '#E8C86A', marginBottom: 6 }]}>Enviar a Otros Módulos:</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#241E1A',
                        borderWidth: 1,
                        borderColor: '#6B5533',
                        borderRadius: 6,
                        paddingVertical: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                      onPress={() => {
                        const acc = selectedPlayerModal.accountId;
                        setSelectedPlayerModal(null);
                        setMakerAccount(acc);
                        setActiveTab('maker');
                      }}
                    >
                      <MaterialCommunityIcons name="anvil" size={16} color="#E8C86A" />
                      <Text style={{ color: '#EDE4D3', fontSize: 10, fontWeight: 'bold' }}>Item Maker</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#241E1A',
                        borderWidth: 1,
                        borderColor: '#6B5533',
                        borderRadius: 6,
                        paddingVertical: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                      onPress={() => {
                        const acc = selectedPlayerModal.accountId;
                        setSelectedPlayerModal(null);
                        setKitTargetAccount(acc);
                        setActiveTab('kit');
                      }}
                    >
                      <MaterialCommunityIcons name="gift-outline" size={16} color="#3FCF8E" />
                      <Text style={{ color: '#EDE4D3', fontSize: 10, fontWeight: 'bold' }}>Starter Kit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        backgroundColor: '#241E1A',
                        borderWidth: 1,
                        borderColor: '#6B5533',
                        borderRadius: 6,
                        paddingVertical: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 2,
                      }}
                      onPress={() => {
                        const name = selectedPlayerModal.charName;
                        setSelectedPlayerModal(null);
                        setRescueCharName(name);
                        setActiveTab('fixes');
                      }}
                    >
                      <MaterialCommunityIcons name="wrench-outline" size={16} color="#5B8DEF" />
                      <Text style={{ color: '#EDE4D3', fontSize: 10, fontWeight: 'bold' }}>Desatascar</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 4. BLOQUEOS ADMINISTRATIVOS Y EDICIÓN COMPLETA */}
                  <Text style={[styles.label, { color: '#E8C86A', marginBottom: 6 }]}>Bloqueos y Edición:</Text>
                  <View style={{ gap: 8 }}>
                    {/* Banear Solo Personaje */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#241E1A', borderWidth: 1, borderColor: '#E2703A', marginTop: 0 }]}
                      onPress={() => {
                        Alert.alert(
                          'Banear Solo Este Personaje',
                          `¿Estás seguro de banear ÚNICAMENTE al personaje '${selectedPlayerModal.charName}' ?\n\nLa cuenta seguirá activa para sus otros personajes.`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Confirmar Ban Personaje',
                              style: 'destructive',
                              onPress: async () => {
                                const res = await SqlClient.banCharacter(selectedPlayerModal.charName, 'Bloqueo administrativo de personaje');
                                if (res.success) {
                                  await SqlClient.disconnectAccount(selectedPlayerModal.accountId, selectedPlayerModal.charName);
                                  await logAdminAction('PERSONAJE_BANEADO', `Personaje ${selectedPlayerModal.charName} baneado con CtlCode=1`);
                                  Alert.alert('Éxito', res.message);
                                  setSelectedPlayerModal(null);
                                  loadOnlinePlayers();
                                  loadBans();
                                } else {
                                  Alert.alert('Error', res.message);
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <MaterialCommunityIcons name="account-cancel" size={16} color="#E2703A" />
                      <Text style={[styles.actionBtnText, { color: '#EDE4D3' }]}>Banear Solo Este Personaje</Text>
                    </TouchableOpacity>

                    {/* Banear Cuenta Completa */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#E2703A', marginTop: 0 }]}
                      onPress={() => {
                        Alert.alert(
                          'Banear Cuenta Completa',
                          `¿Estás seguro de bloquear COMPLETAMENTE la cuenta '${selectedPlayerModal.accountId}'?`,
                          [
                            { text: 'Cancelar', style: 'cancel' },
                            {
                              text: 'Confirmar Ban Cuenta',
                              style: 'destructive',
                              onPress: async () => {
                                const res = await SqlClient.banAccount(selectedPlayerModal.accountId, 'Bloqueo administrativo general');
                                if (res.success) {
                                  await SqlClient.disconnectAccount(selectedPlayerModal.accountId, selectedPlayerModal.charName);
                                  await logAdminAction('CUENTA_BANEADA', `Cuenta ${selectedPlayerModal.accountId} bloqueada`);
                                  Alert.alert('Éxito', res.message);
                                  setSelectedPlayerModal(null);
                                  loadOnlinePlayers();
                                  loadBans();
                                } else {
                                  Alert.alert('Error', res.message);
                                }
                              },
                            },
                          ]
                        );
                      }}
                    >
                      <MaterialCommunityIcons name="shield-lock" size={16} color="#FFF" />
                      <Text style={styles.actionBtnText}>Bloquear Cuenta Completa</Text>
                    </TouchableOpacity>

                    {/* Abrir en Editor de Personajes */}
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: '#B58F3C', borderWidth: 1, borderColor: '#E8C86A', marginTop: 2 }]}
                      onPress={() => {
                        const targetChar = selectedPlayerModal.charName;
                        setSelectedPlayerModal(null);
                        navigation.navigate('CharacterEdit', { characterName: targetChar });
                      }}
                    >
                      <MaterialCommunityIcons name="square-edit-outline" size={16} color="#100D0B" />
                      <Text style={[styles.actionBtnText, { color: '#100D0B' }]}>Abrir en Editor de Personajes</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal Banear Únicamente Personaje */}
      <Modal visible={charBanModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={[styles.modalTitle, { color: '#E8C86A' }]}>Banear Personaje</Text>
            <Text style={styles.label}>Nombre del Personaje:</Text>
            <View style={{ zIndex: 10 }}>
              <AutocompleteInput
                value={banCharNameInput}
                onChangeText={setBanCharNameInput}
                suggestions={Array.from(new Set([...playersList.map((p) => p.charName), ...fixesCharSuggestions]))}
                placeholder="Nombre del Personaje..."
                icon="account-outline"
                autoCapitalize="none"
                maxSuggestions={5}
              />
            </View>
            <Text style={[styles.label, { marginTop: 10 }]}>Motivo del Baneo:</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: '#14100D', borderColor: '#6B5533', color: '#EDE4D3' }]}
              value={banCharReasonInput}
              onChangeText={setBanCharReasonInput}
              placeholder="Ej: Infracción de reglas de personaje"
              placeholderTextColor="#777"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderWidth: 1, borderColor: '#6B5533' }]}
                onPress={() => setCharBanModalVisible(false)}
              >
                <Text style={styles.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#E2703A' }]}
                onPress={handleSaveCharBanSubmit}
                disabled={savingCharBan}
              >
                {savingCharBan ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnText}>Banear Personaje</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Bloquear Cuenta */}
      <Modal visible={banModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '90%' }]}>
            <Text style={[styles.modalTitle, { color: '#E2703A' }]}>Bloquear Cuenta</Text>
            <Text style={styles.label}>AccountID a Bloquear:</Text>
            <View style={{ zIndex: 10 }}>
              <AutocompleteInput
                value={banAccountInput}
                onChangeText={setBanAccountInput}
                suggestions={fixesAccountSuggestions}
                placeholder="AccountID"
                icon="account"
                autoCapitalize="none"
                maxSuggestions={5}
              />
            </View>
            <Text style={[styles.label, { marginTop: 10 }]}>Motivo del Bloqueo:</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: '#14100D', borderColor: '#6B5533', color: '#EDE4D3' }]}
              value={banReasonInput}
              onChangeText={setBanReasonInput}
              placeholder="Ej: Uso de programas ilegales"
              placeholderTextColor="#777"
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#241E1A', borderWidth: 1, borderColor: '#6B5533' }]}
                onPress={() => setBanModalVisible(false)}
              >
                <Text style={styles.actionBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1, backgroundColor: '#E2703A' }]}
                onPress={handleSaveBanSubmit}
                disabled={savingBan}
              >
                {savingBan ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.actionBtnText}>Confirmar Ban</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#191512',
  },
  tabBarContainer: {
    backgroundColor: '#191512',
    borderBottomWidth: 1,
    borderBottomColor: '#6B5533',
  },
  tabBarScroll: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  scrollHintOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 24,
    backgroundColor: 'rgba(25, 21, 18, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    borderWidth: 1.5,
    borderColor: '#6B5533',
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(181, 143, 60, 0.2)',
    borderWidth: 1.5,
    borderColor: '#E8C86A',
  },
  tabButtonText: {
    color: '#9C9182',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  tabButtonTextActive: {
    color: '#E8C86A',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 14,
    paddingBottom: 120,
  },
  tabContent: {
    gap: 12,
  },
  card: {
    backgroundColor: '#241E1A',
    borderRadius: 6,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#6B5533',
    elevation: 3,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E8C86A',
    marginBottom: 4,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontSize: 11,
    color: '#9C9182',
    marginBottom: 10,
    lineHeight: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#100D0B',
    borderRadius: 6,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#6B5533',
    height: 44,
  },
  textInput: {
    flex: 1,
    marginLeft: 8,
    color: '#FFF',
    fontSize: 13,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    borderWidth: 1.5,
    borderColor: '#6B5533',
    gap: 5,
  },
  catPillActive: {
    backgroundColor: 'rgba(181, 143, 60, 0.2)',
    borderWidth: 1.5,
    borderColor: '#E8C86A',
  },
  catPillText: {
    fontSize: 11,
    color: '#9C9182',
    fontWeight: '700',
  },
  catPillTextActive: {
    color: '#E8C86A',
    fontWeight: '900',
  },
  itemPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#181820',
    borderWidth: 1,
    borderColor: '#2A2A35',
    gap: 6,
  },
  itemPillActive: {
    borderColor: '#FF9800',
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
  },
  itemPillText: {
    fontSize: 12,
    color: '#CCC',
    maxWidth: 120,
  },
  itemPillTextActive: {
    color: '#FF9800',
    fontWeight: 'bold',
  },
  previewCard: {
    marginVertical: THEME.shapes.espaciadoBase,
    padding: 14,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewName: {
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  previewSub: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginTop: 2,
  },
  previewStats: {
    fontSize: 12,
    color: THEME.colors.jade,
    marginTop: 4,
    fontWeight: '700',
  },
  hexBox: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
  },
  hexLabel: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  hexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.shapes.radioEsquina,
    gap: 8,
  },
  hexText: {
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.oroClaro,
    letterSpacing: 1,
  },
  copyBtn: {
    width: 44,
    height: 44,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
  },
  controlLabel: {
    fontSize: 12,
    color: '#DDD',
  },
  counterWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterBtn: {
    backgroundColor: '#333',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  counterValue: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    minWidth: 34,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  excQuickBtn: {
    backgroundColor: '#262630',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#444',
  },
  excQuickBtnText: {
    color: '#FF9800',
    fontSize: 10,
    fontWeight: 'bold',
  },
  excGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  excChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#14141A',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2C2C38',
    gap: 6,
    width: '48%',
  },
  excChipActive: {
    borderColor: '#00E676',
    backgroundColor: 'rgba(0, 230, 118, 0.1)',
  },
  excChipText: {
    fontSize: 11,
    color: '#888',
    flex: 1,
  },
  excChipTextActive: {
    color: '#3FCF8E',
    fontWeight: '700',
  },
  socketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socketLabel: {
    fontSize: 11,
    color: '#E8C86A',
    fontWeight: '700',
    width: 60,
  },
  socketOptionBtn: {
    backgroundColor: '#1E1A16',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  socketOptionBtnActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.2)',
    borderColor: '#E8C86A',
  },
  socketOptionText: {
    fontSize: 10,
    color: '#9C9182',
    fontWeight: '600',
  },
  socketOptionTextActive: {
    color: '#E8C86A',
    fontWeight: '800',
  },
  injectBtn: {
    backgroundColor: '#241E1A',
    borderWidth: 1.2,
    borderColor: '#3FCF8E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 6,
    minHeight: 44,
    gap: 8,
    marginTop: 4,
  },
  injectBtnText: {
    color: '#3FCF8E',
    fontSize: 15,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
  },
  filterPillActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    borderColor: THEME.colors.primaryOrange,
  },
  filterPillText: {
    fontSize: 11,
    color: '#888',
  },
  filterPillTextActive: {
    color: THEME.colors.primaryOrange,
    fontWeight: 'bold',
  },
  searchBtn: {
    backgroundColor: '#241E1A',
    borderColor: '#E8C86A',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    minHeight: 44,
    gap: 6,
  },
  searchBtnText: {
    color: '#E8C86A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  scanDupesBtn: {
    backgroundColor: '#241E1A',
    borderColor: '#E2703A',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    minHeight: 44,
    gap: 6,
  },
  scanDupesBtnText: {
    color: '#E2703A',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dupeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  dupeBannerRed: {
    backgroundColor: 'rgba(226, 112, 58, 0.12)',
    borderColor: '#E2703A',
  },
  dupeBannerGreen: {
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    borderColor: '#3FCF8E',
  },
  dupeBannerTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFF',
  },
  dupeBannerSub: {
    fontSize: 11,
    color: '#CCC',
    marginTop: 2,
  },
  dupeGroupCard: {
    backgroundColor: '#241E1A',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  dupeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  dupeSerialText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
  dupeCountText: {
    fontSize: 11,
    color: '#FF5252',
  },
  dupeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#282835',
  },
  dupeItemName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  dupeItemLoc: {
    fontSize: 10,
    color: '#AAA',
    marginTop: 1,
  },
  excBadge: {
    backgroundColor: '#00C853',
    color: '#FFF',
    fontSize: 9,
    fontWeight: 'bold',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 3,
  },
  rankPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 5,
    borderWidth: 1,
    borderColor: '#333',
  },
  rankPillActive: {
    backgroundColor: THEME.colors.primaryOrange,
    borderColor: THEME.colors.primaryOrange,
  },
  rankPillText: {
    color: '#888',
    fontSize: 11,
    fontWeight: '600',
  },
  rankPillTextActive: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  refreshRankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    backgroundColor: '#100D0B',
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  refreshRankBtnText: {
    color: '#E8C86A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  rankMedal: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankMedalText: {
    color: '#000',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rankName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  rankSub: {
    color: '#888',
    fontSize: 10,
    marginTop: 1,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00E676',
  },
  rankScoreWrap: {
    alignItems: 'flex-end',
  },
  rankScoreVal: {
    color: '#FF9800',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankScoreLabel: {
    color: '#888',
    fontSize: 9,
  },
  pkClearBtn: {
    backgroundColor: '#241E1A',
    borderColor: '#E2703A',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    gap: 4,
    minHeight: 44,
  },
  pkClearBtnText: {
    color: '#E2703A',
    fontSize: 11,
    fontWeight: 'bold',
  },
  fixHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    gap: 6,
    marginTop: 8,
    minHeight: 44,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.card,
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 16,
  },
  statsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  statsInfo: {
    flex: 1,
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
  },
  statsLabel: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  section: {
    backgroundColor: THEME.colors.card,
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
    marginBottom: 6,
  },
  sectionDesc: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.background,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginBottom: 10,
    minHeight: 44,
  },
  fileBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  fileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: THEME.colors.textPrimary,
  },
  fileSub: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
    marginTop: 2,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    marginTop: 6,
    gap: 8,
    minHeight: 44,
  },
  resetButtonText: {
    fontSize: 13,
    color: THEME.colors.textSecondary,
  },
  label: {
    fontSize: 12,
    color: THEME.colors.textSecondary,
    marginBottom: 4,
    fontWeight: 'bold',
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
    maxWidth: 380,
    maxHeight: '90%',
    backgroundColor: '#241E1A',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    padding: 18,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.textPrimary,
    marginBottom: 12,
  },
  onlinePlayerCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  onlinePlayerIndexBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1A1613',
    borderWidth: 1,
    borderColor: '#B58F3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlinePlayerIndexText: {
    color: '#B58F3C',
    fontSize: 12,
    fontWeight: 'bold',
  },
  onlinePlayerName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  onlinePlayerAccountPill: {
    backgroundColor: '#1A1613',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  onlinePlayerAccountText: {
    color: '#A0A0B0',
    fontSize: 11,
    fontWeight: '600',
  },
  onlinePlayerLevelBadge: {
    backgroundColor: '#E65100',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  onlinePlayerLevelText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  onlinePlayerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1613',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
    gap: 4,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  onlinePlayerPillText: {
    color: '#CCCCCC',
    fontSize: 10,
  },
  currencyCard: {
    backgroundColor: THEME.colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 12,
    marginBottom: 10,
  },
  currencyCardActive: {
    borderColor: '#B58F3C',
    backgroundColor: '#352D27',
  },
  currencyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  currencyBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  currencyCardBody: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#3E352B',
  },
  currencyInput: {
    backgroundColor: '#100D0B',
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    fontWeight: '600',
    minHeight: 44,
  },
  currencyQuickRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginTop: 8,
  },
  currencyQuickBtn: {
    backgroundColor: '#1A1613',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 36,
    justifyContent: 'center',
  },
  currencyQuickBtnText: {
    color: '#DDD',
    fontSize: 10,
    fontWeight: '700',
  },
  presetPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1A1613',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    minHeight: 38,
  },
  presetPillText: {
    color: '#DDD',
    fontSize: 12,
    fontWeight: '600',
  },
  presetModifyBar: {
    backgroundColor: THEME.colors.card,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  presetModifyLabel: {
    color: '#888',
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  presetModifyName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  savePresetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E65100',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
  },
  savePresetBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  newPresetContainer: {
    backgroundColor: THEME.colors.card,
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  ancientBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#1A1613',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  ancientBtnText: {
    fontSize: 12,
    color: '#AAA',
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#1A1613',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  switchOption: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    backgroundColor: '#1A1613',
    minHeight: 38,
    justifyContent: 'center',
  },
  switchOptionActive: {
    borderColor: '#B58F3C',
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
  },
  switchText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  },
  switchTextActive: {
    color: '#E8C86A',
    fontWeight: 'bold',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCard: {
    backgroundColor: THEME.colors.card,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 6,
    padding: 10,
    minHeight: 44,
  },
  itemCardSelected: {
    borderColor: '#B58F3C',
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
  },
  itemName: {
    color: '#DDD',
    fontSize: 12,
    fontWeight: '600',
  },
  itemNameSelected: {
    color: '#E8C86A',
    fontWeight: 'bold',
  },
});
