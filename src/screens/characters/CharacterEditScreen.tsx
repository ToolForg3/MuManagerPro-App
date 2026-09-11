import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  Switch,
  Image,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { CustomButton } from '../../components/common/CustomButton';
import { BotonOro } from '../../components/ui/BotonOro';
import { ClassAvatar, CLASS_PORTRAITS } from '../../components/common/ClassAvatar';
import { PaperdollView } from '../../components/paperdoll/PaperdollView';
import { InventoryGrid } from '../../components/inventory/InventoryGrid';
import { ItemModal } from '../../components/inventory/ItemModal';
import { ItemActionModal } from '../../components/inventory/ItemActionModal';
import { EquipmentPickerModal } from '../../components/inventory/EquipmentPickerModal';
import { CharacterDetail } from '../../types/character';
import { ParsedItem } from '../../types/item';
import { ItemDefinition } from '../../services/parser/itemDatabase';
import { SqlClient } from '../../services/database/sqlClient';
import { MuItemParser } from '../../services/parser/muItemParser';
import { MuSkillParser, ParsedSkill } from '../../services/parser/muSkillParser';
import {
  MU_SKILLS,
  MuSkillDefinition,
  RACE_SKILL_PRESETS,
  getRaceCodeByClassId,
  getAllSkills,
  getSkillById,
} from '../../constants/muSkills';
import { getMuClassInfo, getBaseRaceByClass, MU_CLASSES, MU_BASE_RACES, MU_MAPS, INVENTORY_CONSTANTS, PaperdollSlotDefinition } from '../../constants/muConstants';
import { useLanguage } from '../../context/LanguageContext';
import { LicenseService } from '../../services/security/licenseService';
import { LicenseModal } from '../../components/security/LicenseModal';
import { SkillImage } from '../../components/common/SkillImage';

type TabType = 'Stats' | 'Progreso' | 'Skills' | 'Inventario' | 'Ubicacion' | 'Quest';
type InventorySubTab = 'equip' | 'main' | 'ext1' | 'ext2' | 'store';

export const CharacterEditScreen = () => {
  const { t } = useLanguage();
  const route = useRoute<any>();
  const navigation = useNavigation();
  const charName = route.params?.characterName || '';

  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );
  const bottomInset = Math.max(32, insets.bottom + 20);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState(false);
  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('Stats');
  const [activeInvSubTab, setActiveInvSubTab] = useState<InventorySubTab>('equip');

  // Stats editable states
  const [str, setStr] = useState('0');
  const [agi, setAgi] = useState('0');
  const [vit, setVit] = useState('0');
  const [ene, setEne] = useState('0');
  const [cmd, setCmd] = useState('0');
  const [zen, setZen] = useState('0');
  const [ruud, setRuud] = useState('0');
  const [level, setLevel] = useState('400');
  const [lvlPoints, setLvlPoints] = useState('0');
  const [mLevel, setMLevel] = useState('0');
  const [mPoints, setMPoints] = useState('0');
  const [fruitPoints, setFruitPoints] = useState('0');
  const [isGm, setIsGm] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  // Progreso editable states
  const [resets, setResets] = useState('0');
  const [mResets, setMResets] = useState('0');
  const [pkLevel, setPkLevel] = useState(3);
  const [pkCount, setPkCount] = useState('0');
  const [pkTime, setPkTime] = useState('0');
  const [savingProgress, setSavingProgress] = useState(false);

  // Location editable states
  const [mapNumber, setMapNumber] = useState('0');
  const [mapX, setMapX] = useState('125');
  const [mapY, setMapY] = useState('125');

  // Quest & Evolution editable states
  const [selectedClass, setSelectedClass] = useState<number>(0);
  const [marlonCombo, setMarlonCombo] = useState(true);
  const [marlonPoints, setMarlonPoints] = useState(true);
  const [thirdClassComplete, setThirdClassComplete] = useState(true);
  const [savingQuest, setSavingQuest] = useState(false);

  // Inventory parsed items & Equipment Picker
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [modalItem, setModalItem] = useState<ParsedItem | null>(null);
  const [modalSlot, setModalSlot] = useState<number>(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionItem, setActionItem] = useState<ParsedItem | null>(null);
  const [actionSlot, setActionSlot] = useState<number>(0);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [pickerSlot, setPickerSlot] = useState<number>(0);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [invGridMode, setInvGridMode] = useState<'32' | '64'>('64');
  const [unlockingExt, setUnlockingExt] = useState(false);
  const [movingInvItem, setMovingInvItem] = useState<{ item: ParsedItem; slot: number } | null>(null);

  // Skills states & Quick send by race
  const [skills, setSkills] = useState<ParsedSkill[]>([]);
  const [savingSkills, setSavingSkills] = useState(false);
  const [addSkillModalVisible, setAddSkillModalVisible] = useState(false);
  const [skillSearchQuery, setSkillSearchQuery] = useState('');
  const [skillRaceFilter, setSkillRaceFilter] = useState<string>('ALL');
  const [quickSendMode, setQuickSendMode] = useState<'replace' | 'merge'>('replace');
  const [selectedSkillIdx, setSelectedSkillIdx] = useState<number | null>(0);

  const handleQuickAddStat = (statType: 'str' | 'agi' | 'vit' | 'ene' | 'cmd', amount: number = 1000) => {
    if (statType === 'str') setStr(prev => String(Math.min(65535, (parseInt(prev, 10) || 0) + amount)));
    if (statType === 'agi') setAgi(prev => String(Math.min(65535, (parseInt(prev, 10) || 0) + amount)));
    if (statType === 'vit') setVit(prev => String(Math.min(65535, (parseInt(prev, 10) || 0) + amount)));
    if (statType === 'ene') setEne(prev => String(Math.min(65535, (parseInt(prev, 10) || 0) + amount)));
    if (statType === 'cmd') setCmd(prev => String(Math.min(65535, (parseInt(cmd, 10) || 0) + amount)));
  };

  const handleQuickAddPoints = (amount: number = 5000) => {
    setLvlPoints(prev => String((parseInt(prev, 10) || 0) + amount));
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (charName) {
      loadCharacter();
    } else {
      setLoading(false);
    }
  }, [charName]);

  const loadCharacter = async (silent: boolean = false) => {
    if (!charName) return;
    if (silent) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const data = await SqlClient.getCharacterDetail(charName);
      if (data && data.Name) {
        setCharacter(data);
        if (!silent) {
          setStr(String(data.Strength));
          setAgi(String(data.Dexterity));
          setVit(String(data.Vitality));
          setEne(String(data.Energy));
          setCmd(String(data.Leadership || 0));
          setZen(String(data.Money));
          setRuud(String(data.Ruud !== undefined ? data.Ruud : 0));
          setLevel(String(data.cLevel));
          setLvlPoints(String(data.LevelUpPoint));
          setMLevel(String(data.MasterLevel || 0));
          setMPoints(String(data.MasterPoint || 0));
          setFruitPoints(String(data.FruitPoint || 0));
          setIsGm(data.CtlCode === 32);
          setIsBanned(data.CtlCode === 1);

          // Progreso & PK
          setResets(String(data.ResetCount || 0));
          setMResets(String(data.MasterResetCount || 0));
          setPkLevel(data.PkLevel !== undefined ? data.PkLevel : 3);
          setPkCount(String(data.PkCount || 0));
          setPkTime(String(data.PkTime || 0));

          // Location
          setMapNumber(String(data.MapNumber !== undefined ? data.MapNumber : 0));
          setMapX(String(data.MapPosX !== undefined ? data.MapPosX : 125));
          setMapY(String(data.MapPosY !== undefined ? data.MapPosY : 125));

          // Quest & Class
          setSelectedClass(Number(data.Class));
          const classInfo = getMuClassInfo(Number(data.Class));
          setThirdClassComplete(classInfo.tier === 3);
          setMarlonCombo(classInfo.tier >= 2 || (!!data.QuestHex && data.QuestHex.includes('AA')));
          setMarlonPoints(classInfo.tier >= 2 || (!!data.QuestHex && data.QuestHex.includes('AA')));
        }

        // Parse Inventory Hex
        if (data.Inventory && (!silent || (!modalVisible && !pickerVisible && !actionModalVisible && !saving))) {
          const items = MuItemParser.parseInventory(data.Inventory);
          setParsedItems(items);
        }

        // Parse Skills Hex (MagicList)
        if (data.MagicList !== undefined && (!silent || !savingSkills)) {
          const charSkills = MuSkillParser.parseMagicListHex(data.MagicList);
          setSkills(charSkills);
        }
      } else if (!silent) {
        setLoadError(`No se pudo cargar el personaje "${charName}".`);
      }
    } catch (e: any) {
      console.warn('Error loading char', e);
      if (!silent) {
        setLoadError(e.message || 'Error de conexión al cargar datos del personaje.');
      }
    } finally {
      if (silent) {
        setIsRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  // Auto-refresco en vivo del inventario y estado del personaje (cada 3.5 segundos)
  useEffect(() => {
    if (!charName || activeTab !== 'Inventario') return;

    const timer = setInterval(() => {
      if (!modalVisible && !pickerVisible && !actionModalVisible && !saving && !isRefreshing) {
        loadCharacter(true);
      }
    }, 3500);

    return () => clearInterval(timer);
  }, [charName, activeTab, modalVisible, pickerVisible, actionModalVisible, saving, isRefreshing]);

  const [movingLocation, setMovingLocation] = useState(false);

  /**
   * Helper para verificar si la cuenta del personaje está en línea.
   * Si está conectada, muestra alerta ofreciendo "Desconectar y Continuar".
   * Si está desconectada, ejecuta la acción de guardado directamente.
   */
  const executeWithOnlineCheck = useCallback(async (
    actionName: string,
    actionFn: () => Promise<void>
  ) => {
    const accountId = (character?.AccountID || '').trim();

    try {
      // 1. Consultar estado en línea usando tanto AccountID como charName en tiempo real
      let isOnline = false;
      try {
        isOnline = await SqlClient.isAccountConnected(accountId, charName);
      } catch (err) {
        console.warn('Error en isAccountConnected:', err);
      }

      // 2. Si la consulta remota no detectó pero el personaje cargó inicialmente con ConnectStat === 1
      if (!isOnline && character && character.ConnectStat === 1) {
        isOnline = true;
      }

      if (isOnline) {
        Alert.alert(
          'Personaje Conectado al Juego',
          `El personaje "${charName}" ${accountId ? `(Cuenta: "${accountId}")` : ''} está actualmente en línea en el juego.\n\nPara que los cambios se guarden con éxito en SQL Server y el GameServer no los sobrescriba en memoria, debes desconectarlo.\n\n¿Deseas desconectarlo ahora y proceder con ${actionName.toLowerCase()}?`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Desconectar y Guardar',
              style: 'destructive',
              onPress: async () => {
                setSaving(true);
                try {
                  const discRes = await SqlClient.disconnectAccount(accountId, charName);
                  if (discRes.success) {
                    if (character) {
                      setCharacter({ ...character, ConnectStat: 0 });
                    }
                    await new Promise((r) => setTimeout(r, 1000));
                    await actionFn();
                  } else {
                    Alert.alert(
                      'Aviso de Desconexión',
                      `No se pudo forzar la desconexión: ${discRes.message}\n\n¿Deseas intentar guardar de todas formas?`,
                      [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Guardar de Todos Modos', onPress: () => actionFn() },
                      ]
                    );
                  }
                } finally {
                  setSaving(false);
                }
              },
            },
          ]
        );
        return;
      }
    } catch (err) {
      console.warn('Error al verificar ConnectStat:', err);
    }

    await actionFn();
  }, [character, charName]);

  const doSaveStats = useCallback(async () => {
    // Hallazgo 8: Impedir guardado si hubo error de carga o no hay personaje
    if (!character || loadError) {
      Alert.alert('Error', 'No se pueden guardar estadísticas porque no se cargó el personaje correctamente.');
      return;
    }

    const numStr = parseInt(str, 10) || 0;
    const numAgi = parseInt(agi, 10) || 0;
    const numVit = parseInt(vit, 10) || 0;
    const numEne = parseInt(ene, 10) || 0;
    const numCmd = parseInt(cmd, 10) || 0;
    const numZen = parseInt(zen, 10) || 0;
    const numRuud = parseInt(ruud, 10) || 0;
    const numLevel = parseInt(level, 10) || 400;
    const numLvlPoints = parseInt(lvlPoints, 10) || 0;
    const numMLevel = parseInt(mLevel, 10) || 0;
    const numMPoints = parseInt(mPoints, 10) || 0;
    const numFruit = parseInt(fruitPoints, 10) || 0;

    // Security check: Demo restriction
    if (LicenseService.isDemo()) {
      if (numStr > 500 || numAgi > 500 || numVit > 500 || numEne > 500) {
        Alert.alert(
          'Límite de Modo DEMO',
          'En versión DEMO las estadísticas están limitadas a un máximo de 500 puntos por atributo. ¿Deseas activar la versión PRO sin límites?',
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Activar PRO', onPress: () => setLicenseModalVisible(true) },
          ]
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await SqlClient.updateCharacterStats(charName, {
        STR: numStr,
        AGI: numAgi,
        VIT: numVit,
        ENE: numEne,
        CMD: numCmd,
        Zen: numZen,
        Ruud: numRuud,
        Points: numLvlPoints,
        Level: numLevel,
        MasterLevel: numMLevel,
        MasterPoint: numMPoints,
        FruitPoint: numFruit,
        CtlCode: isGm ? 32 : (isBanned ? 1 : 0), // Preservar CtlCode real: 32 = GM, 1 = Baneado, 0 = Normal
      });
      if (res.success) {
        setCharacter({
          ...character,
          Strength: numStr,
          Dexterity: numAgi,
          Vitality: numVit,
          Energy: numEne,
          Leadership: numCmd,
          Money: numZen,
          Ruud: numRuud,
          cLevel: numLevel,
          LevelUpPoint: numLvlPoints,
          MasterLevel: numMLevel,
          MasterPoint: numMPoints,
          FruitPoint: numFruit,
          CtlCode: isGm ? 32 : (isBanned ? 1 : 0),
        });
        Alert.alert('Éxito', res.message);
      } else {
        Alert.alert('Error', res.message);
      }
    } finally {
      setSaving(false);
    }
  }, [character, loadError, str, agi, vit, ene, cmd, zen, level, lvlPoints, mLevel, mPoints, fruitPoints, isGm, isBanned, charName]);

  const handleSaveStats = useCallback(() => {
    executeWithOnlineCheck('Guardar Estadísticas', doSaveStats);
  }, [executeWithOnlineCheck, doSaveStats]);

  const doSaveLocation = useCallback(async (customMap?: number, customX?: number, customY?: number) => {
    if (!character || loadError) {
      Alert.alert('Error', 'No se puede actualizar la ubicación: el personaje no se cargó correctamente.');
      return;
    }
    setMovingLocation(true);
    try {
      const targetMap = customMap !== undefined ? customMap : (parseInt(mapNumber, 10) || 0);
      const targetX = customX !== undefined ? customX : (parseInt(mapX, 10) || 125);
      const targetY = customY !== undefined ? customY : (parseInt(mapY, 10) || 125);

      const res = await SqlClient.updateCharacterLocation(charName, targetMap, targetX, targetY);
      if (res.success) {
        setMapNumber(String(targetMap));
        setMapX(String(targetX));
        setMapY(String(targetY));
        setCharacter({ ...character, MapNumber: targetMap, MapPosX: targetX, MapPosY: targetY });
        Alert.alert('Ubicación Guardada', res.message);
      } else {
        Alert.alert('Error', res.message);
      }
    } finally {
      setMovingLocation(false);
    }
  }, [character, loadError, mapNumber, mapX, mapY, charName]);

  const handleSaveLocation = useCallback((customMap?: number, customX?: number, customY?: number) => {
    executeWithOnlineCheck('Guardar Ubicación', () => doSaveLocation(customMap, customX, customY));
  }, [executeWithOnlineCheck, doSaveLocation]);

  const handleMoveToLorencia = () => handleSaveLocation(0, 125, 125);

  const doSaveInventory = async () => {
    // Hallazgo 8: Impedir guardado si el personaje no está cargado
    if (!character || loadError) {
      Alert.alert('Error', 'No es posible guardar el inventario: el personaje no se cargó correctamente.');
      return;
    }

    // Security check: Demo restriction for saving inventory
    if (!LicenseService.canSaveInventory()) {
      Alert.alert(
        'Función Bloqueada en DEMO',
        'El guardado y sincronización de inventarios (108 slots) con SQL Server requiere una Licencia PRO activa. ¿Deseas ingresar tu clave de activación?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Activar PRO', onPress: () => setLicenseModalVisible(true) },
        ]
      );
      return;
    }

    setSaving(true);
    try {
      const targetSlots = INVENTORY_CONSTANTS.TOTAL_SEASON6_SLOTS;
      const newHex = MuItemParser.rebuildInventoryHex(parsedItems, targetSlots, character?.Inventory);
      const res = await SqlClient.updateCharacterInventory(charName, newHex);
      if (res.success) {
        // Hallazgo 7: Actualizar la referencia original del inventario para futuras operaciones
        setCharacter({ ...character, Inventory: newHex });
        Alert.alert('Inventario', 'Los cambios en el inventario fueron guardados exitosamente.');
      } else {
        Alert.alert('Error', res.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInventory = () => {
    executeWithOnlineCheck('Guardar Inventario', doSaveInventory);
  };

  const doUnlockExtensions = async () => {
    if (!charName) return;
    setUnlockingExt(true);
    try {
      const res = await SqlClient.unlockCharacterExtensions(charName);
      if (res.success) {
        Alert.alert('Mochilas y Tienda Personal', res.message);
      } else {
        Alert.alert('Error', res.message);
      }
    } finally {
      setUnlockingExt(false);
    }
  };

  const handleUnlockExtensions = () => {
    executeWithOnlineCheck('Desbloquear Mochilas y Tienda', doUnlockExtensions);
  };

  const handleClearStore = () => {
    Alert.alert(
      'Vaciar Tienda Personal',
      '¿Deseas vaciar todos los ítems de la Tienda Personal (Store)? Esta acción liberará los 32 cuadros en este personaje.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Vaciar Store',
          style: 'destructive',
          onPress: () => {
            const storeStart = INVENTORY_CONSTANTS.STORE_INVENTORY_START;
            const storeEnd = storeStart + INVENTORY_CONSTANTS.STORE_INVENTORY_SLOTS;
            setParsedItems(prev => prev.filter(i => i.slot < storeStart || i.slot >= storeEnd));
            Alert.alert(
              'Tienda Personal Vaciada',
              'Los 32 slots de la Tienda Personal han sido vaciados en la vista. Presiona "Guardar Inventario" para aplicar los cambios a SQL Server.'
            );
          },
        },
      ]
    );
  };

  // Auxiliares de detección de huella y colisión para secciones de inventario (8 columnas)
  const getInventorySectionBounds = (slot: number) => {
    if (slot >= 12 && slot <= 75) {
      const maxRows = invGridMode === '32' ? 4 : 8;
      return { start: 12, rows: maxRows, cols: 8, maxSlot: 12 + maxRows * 8 };
    }
    if (slot >= INVENTORY_CONSTANTS.EXT1_INVENTORY_START && slot < INVENTORY_CONSTANTS.EXT1_INVENTORY_START + 32) {
      return { start: INVENTORY_CONSTANTS.EXT1_INVENTORY_START, rows: 4, cols: 8, maxSlot: INVENTORY_CONSTANTS.EXT1_INVENTORY_START + 32 };
    }
    if (slot >= INVENTORY_CONSTANTS.EXT2_INVENTORY_START && slot < INVENTORY_CONSTANTS.EXT2_INVENTORY_START + 32) {
      return { start: INVENTORY_CONSTANTS.EXT2_INVENTORY_START, rows: 4, cols: 8, maxSlot: INVENTORY_CONSTANTS.EXT2_INVENTORY_START + 32 };
    }
    if (slot >= INVENTORY_CONSTANTS.STORE_INVENTORY_START && slot < INVENTORY_CONSTANTS.STORE_INVENTORY_START + 32) {
      return { start: INVENTORY_CONSTANTS.STORE_INVENTORY_START, rows: 4, cols: 8, maxSlot: INVENTORY_CONSTANTS.STORE_INVENTORY_START + 32 };
    }
    return null;
  };

  const canPlaceItemInInventory = (
    targetSlot: number,
    w: number,
    h: number,
    items: ParsedItem[],
    excludeSlot?: number
  ): boolean => {
    const section = getInventorySectionBounds(targetSlot);
    if (!section) return false;

    const relSlot = targetSlot - section.start;
    const col = relSlot % section.cols;
    const row = Math.floor(relSlot / section.cols);

    if (col + w > section.cols || row + h > section.rows) {
      return false;
    }

    const occupied = new Set<number>();
    items.forEach(it => {
      if (excludeSlot !== undefined && it.slot === excludeSlot) return;
      if (it.slot < section.start || it.slot >= section.maxSlot) return;

      const itRel = it.slot - section.start;
      const itCol = itRel % section.cols;
      const itRow = Math.floor(itRel / section.cols);
      const itW = Math.max(1, it.width || 1);
      const itH = Math.max(1, it.height || 1);

      for (let r = 0; r < itH; r++) {
        for (let c = 0; c < itW; c++) {
          occupied.add((itRow + r) * section.cols + (itCol + c));
        }
      }
    });

    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const checkRel = (row + r) * section.cols + (col + c);
        if (occupied.has(checkRel)) {
          return false;
        }
      }
    }
    return true;
  };

  const handleSlotPress = async (slotDefOrIndex: PaperdollSlotDefinition | number, item?: ParsedItem) => {
    const slotIdx = typeof slotDefOrIndex === 'number' ? slotDefOrIndex : slotDefOrIndex.slot;

    // Modo de Mover Ítem Activo
    if (movingInvItem) {
      if (item && item.slot === movingInvItem.slot) {
        setMovingInvItem(null);
        return;
      }
      if (item) {
        Alert.alert(
          'Casilla Ocupada',
          `No puedes mover el ítem sobre "${item.name}". Selecciona un cuadro libre (+) o cancela.`,
          [
            { text: 'Entendido' },
            { text: 'Cancelar Mover', style: 'cancel', onPress: () => setMovingInvItem(null) }
          ]
        );
        return;
      }

      const moveW = Math.max(1, movingInvItem.item.width || 1);
      const moveH = Math.max(1, movingInvItem.item.height || 1);

      if (slotIdx >= 12) {
        if (!canPlaceItemInInventory(slotIdx, moveW, moveH, parsedItems, movingInvItem.slot)) {
          Alert.alert(
            'Espacio Insuficiente',
            `El ítem "${movingInvItem.item.name}" (${moveW}x${moveH}) no cabe en esa posición porque colisiona con otros ítems o se sale de los límites.`
          );
          return;
        }
      }

      const itemToMove = movingInvItem.item;
      const movedItem: ParsedItem = { ...itemToMove, slot: slotIdx, isModified: true };
      const updated = [
        ...parsedItems.filter((i) => i.slot !== movingInvItem.slot && i.slot !== slotIdx),
        movedItem,
      ];
      setParsedItems(updated);
      setMovingInvItem(null);

      // Auto-sincronizar con SQL Server si tiene licencia PRO
      if (LicenseService.canSaveInventory() && charName) {
        try {
          const targetSlots = INVENTORY_CONSTANTS.TOTAL_SEASON6_SLOTS;
          const newHex = MuItemParser.rebuildInventoryHex(updated, targetSlots, character?.Inventory);
          const res = await SqlClient.updateCharacterInventory(charName, newHex);
          if (res && res.success) {
            setCharacter((prev: any) => prev ? { ...prev, Inventory: newHex } : prev);
            Alert.alert(
              'Ítem Reubicado',
              `"${movedItem.name}" se movió al slot #${slotIdx} y fue guardado en SQL Server.`
            );
            return;
          }
        } catch (err: any) {
          console.warn('Auto-save moved inventory item error:', err);
        }
      }

      Alert.alert(
        'Ítem Reubicado',
        `"${movedItem.name}" se movió al slot #${slotIdx}. Presiona "Guardar Inventario" para sincronizar con SQL Server.`
      );
      return;
    }

    if (item) {
      setActionSlot(slotIdx);
      setActionItem(item);
      setActionModalVisible(true);
    } else {
      // Slot vacío: abrir selector de equipamiento e ítems
      setPickerSlot(slotIdx);
      setPickerVisible(true);
    }
  };

  const handlePickerSelectItem = (itemDef: ItemDefinition, slotIdx: number) => {
    const hex = MuItemParser.createItemHex({
      group: itemDef.group,
      index: itemDef.index,
      level: 0,
      option: 0,
      skill: itemDef.category === 'weapon',
      luck: true,
      durability: 255,
      excellentFlags: 0,
      ancientOption: 0,
    });

    const newItem: ParsedItem = {
      slot: slotIdx,
      hex,
      group: itemDef.group,
      index: itemDef.index,
      id: itemDef.id,
      name: itemDef.name,
      level: 0,
      skill: itemDef.category === 'weapon',
      luck: true,
      option: 0,
      durability: 255,
      serial: Math.floor(Math.random() * 999999),
      excellentFlags: 0,
      ancientOption: 0,
      option380: false,
      harmonyType: 0,
      harmonyLevel: 0,
      sockets: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
      width: itemDef.width,
      height: itemDef.height,
      isExcellent: false,
      isAncient: false,
      category: itemDef.category,
      spriteKey: itemDef.icon,
      isModified: true,
    };
    const updated = [...parsedItems.filter((i) => i.slot !== slotIdx), newItem];
    setParsedItems(updated);

    // Abrir automáticamente el editor para este nuevo ítem
    setTimeout(() => {
      setModalSlot(slotIdx);
      setModalItem(newItem);
      setModalVisible(true);
    }, 150);
  };

  const doSaveProgress = useCallback(async () => {
    if (!character || loadError) {
      Alert.alert('Error', 'No se puede guardar el progreso: el personaje no se cargó correctamente.');
      return;
    }
    setSavingProgress(true);
    try {
      const numResets = parseInt(resets, 10) || 0;
      const numMResets = parseInt(mResets, 10) || 0;
      const numMLevel = parseInt(mLevel, 10) || 0;
      const numMPoints = parseInt(mPoints, 10) || 0;
      const numPkCount = parseInt(pkCount, 10) || 0;
      const numPkTime = parseInt(pkTime, 10) || 0;

      const res = await SqlClient.updateCharacterProgress(charName, {
        resets: numResets,
        masterResets: numMResets,
        masterLevel: numMLevel,
        masterPoints: numMPoints,
        pkLevel,
        pkCount: numPkCount,
        pkTime: numPkTime,
      });

      if (res.success) {
        setCharacter({
          ...character,
          ResetCount: numResets,
          MasterResetCount: numMResets,
          MasterLevel: numMLevel,
          MasterPoint: numMPoints,
          PkLevel: pkLevel,
          PkCount: numPkCount,
          PkTime: numPkTime,
        });
        Alert.alert('Progreso Guardado', res.message);
      } else {
        Alert.alert('Error', res.message);
      }
    } finally {
      setSavingProgress(false);
    }
  }, [character, loadError, resets, mResets, mLevel, mPoints, pkCount, pkTime, pkLevel, charName]);

  const handleSaveProgress = useCallback(() => {
    executeWithOnlineCheck('Guardar Progreso', doSaveProgress);
  }, [executeWithOnlineCheck, doSaveProgress]);

  const doSaveQuest = async () => {
    if (!character || loadError) {
      Alert.alert('Error', 'No se pueden guardar misiones: el personaje no se cargó correctamente.');
      return;
    }
    setSavingQuest(true);
    try {
      const res = await SqlClient.updateCharacterQuest(charName, {
        classId: selectedClass,
        marlonCombo,
        marlonPoints,
        thirdClassComplete,
      });

      if (res.success) {
        setCharacter({
          ...character,
          Class: selectedClass,
        });
        Alert.alert('Misiones Guardadas', res.message);
      } else {
        Alert.alert('Error', res.message);
      }
    } finally {
      setSavingQuest(false);
    }
  };

  const handleSaveQuest = () => {
    executeWithOnlineCheck('Guardar Misiones', doSaveQuest);
  };

  const handleCompleteAllQuests = () => {
    // Preservar estrictamente la raza actual del personaje (selectedClass o character.Class)
    const charClass = selectedClass !== undefined && selectedClass !== null ? selectedClass : (character?.Class ?? 0);
    const race = getBaseRaceByClass(charClass);
    const tier3 = race.tiers.find((t) => t.tier === 3) || race.tiers[race.tiers.length - 1];

    setSelectedClass(tier3.classId);
    setThirdClassComplete(true);

    // Marlon combo solo aplica a Dark Knight
    setMarlonCombo(race.code === 'DK');
    // Marlon puntos solo aplica a DK, DW, FE, SU (MG, DL, RF no tienen Marlon)
    setMarlonPoints(['DK', 'DW', 'FE', 'SU'].includes(race.code));

    Alert.alert(
      'Misiones Completadas',
      `Se han activado las misiones correspondientes y seleccionado 3ra Clase (${tier3.name} - ${race.name}). Presiona "Guardar Raza, Misiones y Clase" para persistir en SQL Server.`
    );
  };

  const handleResetAllQuests = () => {
    const charClass = selectedClass !== undefined && selectedClass !== null ? selectedClass : (character?.Class ?? 0);
    const race = getBaseRaceByClass(charClass);
    const tier1 = race.tiers.find((t) => t.tier === 1) || race.tiers[0];

    setSelectedClass(tier1.classId);
    setThirdClassComplete(false);
    setMarlonCombo(false);
    setMarlonPoints(false);

    Alert.alert(
      'Misiones Reiniciadas',
      `Se han reiniciado las misiones y seleccionado 1ra Clase (${tier1.name} - ${race.name}). Presiona "Guardar Raza, Misiones y Clase" para persistir en SQL Server.`
    );
  };

  const handleQuickPkClear = () => {
    setPkLevel(3);
    setPkCount('0');
    setPkTime('0');
    Alert.alert('PK Limpiado', 'Estado PK cambiado a Común (3) con 0 asesinatos. Presiona "Guardar Progreso" para aplicar en SQL Server.');
  };

  const handleOpenItemEditor = (itemToEdit: ParsedItem, slotIdx: number) => {
    setActionModalVisible(false);
    setTimeout(() => {
      setModalSlot(slotIdx);
      setModalItem(itemToEdit);
      setModalVisible(true);
    }, 150);
  };

  const handleItemSave = (updated: ParsedItem) => {
    const targetSlot = (modalSlot !== undefined && modalSlot !== null) ? modalSlot : updated.slot;
    const withModified: ParsedItem = { ...updated, slot: targetSlot, isModified: true };
    const newItems = parsedItems.filter((i) => i.slot !== targetSlot && i.slot !== updated.slot);
    newItems.push(withModified);
    setParsedItems(newItems);
  };

  const handleItemDelete = (slotIdx: number) => {
    setParsedItems(parsedItems.filter((i) => i.slot !== slotIdx));
    Alert.alert('Eliminado', `El ítem en el slot #${slotIdx} ha sido removido.`);
  };

  const handleQuickMaxItem = (item: ParsedItem, slotIndex: number) => {
    const isW = item.category === 'weapon' || (item.group !== undefined && item.group <= 5);
    const updated: ParsedItem = {
      ...item,
      level: 15,
      option: 7,
      luck: true,
      skill: isW ? true : item.skill,
      option380: true,
      excellentFlags: 63,
      isExcellent: true,
      durability: 255,
      isModified: true,
    };
    const nextItems = [...parsedItems.filter((i) => i.slot !== slotIndex), updated];
    setParsedItems(nextItems);
    Alert.alert('Full Exc +15 Aplicado', `"${updated.name}" ahora es +15 +28 Full Exc. Presiona "Guardar Inventario" para sincronizar.`);
  };

  const handleDuplicateItem = (item: ParsedItem, slotIndex: number) => {
    const occupiedSlots = new Set(parsedItems.map((i) => i.slot));
    let targetSlot = -1;
    for (let s = 12; s < 76; s++) {
      if (!occupiedSlots.has(s)) {
        targetSlot = s;
        break;
      }
    }
    if (targetSlot === -1) {
      Alert.alert('Inventario Lleno', 'No hay slots libres en el inventario para duplicar el ítem.');
      return;
    }
    const duplicated: ParsedItem = {
      ...item,
      slot: targetSlot,
      serial: Math.floor(Math.random() * 0x7FFFFFFF) + 100000,
      isModified: true,
    };
    setParsedItems([...parsedItems, duplicated]);
    Alert.alert('Ítem Duplicado', `"${duplicated.name}" duplicado al slot #${targetSlot}. Presiona "Guardar Inventario" para sincronizar.`);
  };

  // ================= SKILLS HANDLERS =================
  const handleQuickSendSkills = (raceCode: string, mode: 'replace' | 'merge' = quickSendMode) => {
    const preset = RACE_SKILL_PRESETS[raceCode];
    if (!preset) return;

    const newSkillList: ParsedSkill[] = mode === 'replace' ? [] : [...skills];
    const existingIds = new Set(newSkillList.map((s) => s.id));

    let addedCount = 0;
    for (const skillId of preset.skillIds) {
      if (!existingIds.has(skillId)) {
        const def = getSkillById(skillId);
        if (def) {
          newSkillList.push({
            slotIndex: newSkillList.length,
            id: skillId,
            level: 0,
            name: def.name,
            nameEs: def.nameEs,
            category: def.category,
            icon: def.icon,
            races: def.races,
            description: def.description,
          });
          existingIds.add(skillId);
          addedCount++;
        }
      }
    }

    setSkills(newSkillList);
    Alert.alert(
      'Skills Cargadas',
      `Se ${mode === 'replace' ? 'establecieron' : 'agregaron'} ${mode === 'replace' ? newSkillList.length : addedCount} habilidades para ${preset.label}.\n\nPresiona "Guardar Skills" para aplicarlas a SQL Server.`,
      [
        { text: 'OK' },
        {
          text: 'Guardar Ahora',
          onPress: () => handleSaveSkills(newSkillList),
        },
      ]
    );
  };

  const handleRemoveSkill = (skillId: number) => {
    setSkills((prev) => prev.filter((s) => s.id !== skillId));
  };

  const handleAddIndividualSkill = (def: MuSkillDefinition) => {
    if (skills.some((s) => s.id === def.id)) {
      Alert.alert('Habilidad ya equipada', `El personaje ya tiene aprendida la habilidad "${def.nameEs}".`);
      return;
    }
    if (skills.length >= 60) {
      Alert.alert('Límite alcanzado', 'El personaje ya tiene las 60 ranuras de habilidades completas.');
      return;
    }
    const newSkill: ParsedSkill = {
      slotIndex: skills.length,
      id: def.id,
      level: 0,
      name: def.name,
      nameEs: def.nameEs,
      category: def.category,
      icon: def.icon,
      races: def.races,
      description: def.description,
    };
    setSkills((prev) => [...prev, newSkill]);
    setAddSkillModalVisible(false);
  };

  const handleClearAllSkills = () => {
    Alert.alert(
      'Vaciar todas las Skills',
      `¿Estás seguro de que deseas eliminar todas las habilidades de ${charName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sí, Vaciar',
          style: 'destructive',
          onPress: () => setSkills([]),
        },
      ]
    );
  };

  const handleSaveSkills = async (skillsToSave: ParsedSkill[] = skills) => {
    if (!charName) return;
    setSavingSkills(true);
    try {
      const hex = MuSkillParser.encodeMagicListHex(skillsToSave);
      const res = await SqlClient.updateCharacterSkills(charName, hex);
      if (res.success) {
        Alert.alert('Éxito', res.message || 'Habilidades guardadas correctamente en SQL Server.');
        if (character) {
          setCharacter({ ...character, MagicList: hex });
        }
      } else {
        Alert.alert('Error', res.message || 'No se pudieron guardar las habilidades.');
      }
    } catch (err: any) {
      Alert.alert('Error de conexión', err.message || 'Fallo al comunicarse con SQL Server.');
    } finally {
      setSavingSkills(false);
    }
  };

  const filteredCatalogSkills = getAllSkills().filter((skill) => {
    if (skillSearchQuery.trim().length > 0) {
      const q = skillSearchQuery.toLowerCase().trim();
      const matchName = skill.name.toLowerCase().includes(q);
      const matchEs = skill.nameEs.toLowerCase().includes(q);
      const matchId = String(skill.id).includes(q);
      if (!matchName && !matchEs && !matchId) return false;
    }
    if (skillRaceFilter !== 'ALL') {
      if (!skill.races.includes(skillRaceFilter)) return false;
    }
    return true;
  });

  const isSavingAny = saving || savingProgress || savingSkills || savingQuest;

  const handleSaveCurrentTab = () => {
    switch (activeTab) {
      case 'Stats':
        handleSaveStats();
        break;
      case 'Progreso':
        handleSaveProgress();
        break;
      case 'Skills':
        handleSaveSkills();
        break;
      case 'Inventario':
        handleSaveInventory();
        break;
      case 'Ubicacion':
        handleSaveLocation();
        break;
      case 'Quest':
        handleSaveQuest();
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.colors.primaryOrange} />
        <Text style={styles.loadingText}>Cargando datos del personaje...</Text>
      </View>
    );
  }

  // Hallazgo 8: Si ocurrió error al cargar el personaje, mostrar estado de error con reintento
  if (loadError) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialCommunityIcons name="alert-circle-outline" size={48} color={THEME.colors.dangerRed} />
        <Text style={[styles.loadingText, { color: THEME.colors.dangerRed, marginTop: 12, textAlign: 'center' }]}>
          {loadError}
        </Text>
        <CustomButton
          title="Reintentar Carga"
          onPress={loadCharacter}
          variant="orange"
          style={{ marginTop: 20, paddingHorizontal: 24 }}
        />
      </View>
    );
  }

  const classInfo = getMuClassInfo(character?.Class || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 6 }]}>
        <View style={styles.headerLeft}>
          <ClassAvatar classId={character?.Class || 0} size={42} showBadge={false} />
          <View style={styles.headerTextCol}>
            <Text style={styles.headerName}>{character?.Name}</Text>
            <Text style={styles.headerClass}>
              {classInfo.name} • Lv {level} ({(character?.ResetCount ?? 0)}R)
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            style={[styles.closeBtn, isRefreshing && { backgroundColor: 'rgba(255, 152, 0, 0.2)' }]}
            onPress={() => loadCharacter(true)}
            disabled={isRefreshing}
            activeOpacity={0.7}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={THEME.colors.primaryOrange} />
            ) : (
              <MaterialCommunityIcons name="refresh" size={22} color={THEME.colors.textPrimary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="close" size={24} color={THEME.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tabs Navigation Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {(['Stats', 'Progreso', 'Skills', 'Inventario', 'Ubicacion', 'Quest'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tabItem, isActive && styles.tabItemActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: bottomInset + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ================= TAB 1: STATS ================= */}
        {/* ================= TAB 1: STATS (VENTANA DE PERSONAJE MU ONLINE) ================= */}
        {activeTab === 'Stats' && (() => {
          const numStr = parseInt(str, 10) || 0;
          const numAgi = parseInt(agi, 10) || 0;
          const numVit = parseInt(vit, 10) || 0;
          const numEne = parseInt(ene, 10) || 0;
          const numCmd = parseInt(cmd, 10) || 0;
          const numLvl = parseInt(level, 10) || 400;

          const minDmg = Math.floor(numStr / 6.4);
          const maxDmg = Math.floor(numStr / 3.35);
          const maxTotalDmg = Math.floor(numStr * 1.85);
          const attackRate = Math.floor(numLvl * 5 + numAgi * 1.5 + numStr / 4);
          const defense = Math.floor(numAgi / 2.2);
          const maxDefense = Math.floor(defense * 1.57);
          const attackSpeed = Math.max(10, Math.floor(numAgi / 14.6));
          const defenseRate = Math.floor(numAgi / 1.84);
          const maxHp = Math.floor(numVit * 3.8 + numLvl * 2 + 110);
          const maxMana = Math.floor(numEne * 1.5 + numLvl + 50);
          const skillDmg = Math.floor(200 + numEne / 10);
          const isDarkLord = selectedClass === 64 || selectedClass === 66 || (classInfo && classInfo.name.toLowerCase().includes('lord'));

          return (
            <View style={styles.tabContent}>
              {/* Ventana de Personaje con Marco Clásico de Granito y Borde Dorado */}
              <View style={styles.muCharWindow}>
                {/* Header: Nombre y Clase */}
                <View style={styles.muCharHeader}>
                  <Text style={styles.muCharName}>{character?.Name || 'PETERETE'}</Text>
                  <Text style={styles.muCharClass}>({classInfo.name})</Text>
                </View>

                {/* Resumen: Nivel, Puntos, Resets */}
                <View style={styles.muLevelRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.muLevelText}>
                      Level: <Text style={styles.muYellowVal}>{level}</Text>    Point: <Text style={styles.muYellowVal}>{lvlPoints}</Text>    Reset: <Text style={styles.muYellowVal}>{resets}</Text>
                    </Text>
                    <Text style={styles.muLevelText}>
                      GranReset: <Text style={styles.muYellowVal}>{mResets}</Text>
                    </Text>
                    <Text style={styles.muLevelText}>
                      MasterLevel: <Text style={styles.muYellowVal}>{mLevel}</Text>
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.muStonePlusBtn}
                    onPress={() => handleQuickAddPoints(5000)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.muStonePlusText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* ================= BARRA STR ================= */}
                <View style={styles.muStatSection}>
                  <View style={styles.muCapsuleRow}>
                    <View style={styles.muCapsuleBar}>
                      <Text style={styles.muStatLabel}>STR</Text>
                      <TextInput
                        style={styles.muStatInput}
                        value={str}
                        onChangeText={setStr}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.muStonePlusBtn}
                      onPress={() => handleQuickAddStat('str', 1000)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.muStonePlusText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.muSubStats}>
                    <Text style={styles.muCyanSubText}>
                      Dano(indice): {minDmg}~{maxDmg} ({maxTotalDmg})
                    </Text>
                    <Text style={styles.muCyanSubText}>
                      Indice de ataque: {attackRate}
                    </Text>
                  </View>
                </View>

                {/* ================= BARRA AGI ================= */}
                <View style={styles.muStatSection}>
                  <View style={styles.muCapsuleRow}>
                    <View style={styles.muCapsuleBar}>
                      <Text style={styles.muStatLabel}>AGI</Text>
                      <TextInput
                        style={styles.muStatInput}
                        value={agi}
                        onChangeText={setAgi}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.muStonePlusBtn}
                      onPress={() => handleQuickAddStat('agi', 1000)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.muStonePlusText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.muSubStats}>
                    <Text style={styles.muWhiteSubText}>
                      Defensa (indice): {defense} ({maxDefense})
                    </Text>
                    <Text style={styles.muWhiteSubText}>
                      Velocidad de ataque: {attackSpeed}
                    </Text>
                    <Text style={styles.muWhiteSubText}>
                      Indice de defensa: {defenseRate}
                    </Text>
                  </View>
                </View>

                {/* ================= BARRA RES / VIT ================= */}
                <View style={styles.muStatSection}>
                  <View style={styles.muCapsuleRow}>
                    <View style={styles.muCapsuleBar}>
                      <Text style={styles.muStatLabel}>RES</Text>
                      <TextInput
                        style={styles.muStatInput}
                        value={vit}
                        onChangeText={setVit}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.muStonePlusBtn}
                      onPress={() => handleQuickAddStat('vit', 1000)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.muStonePlusText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.muSubStats}>
                    <Text style={styles.muWhiteSubText}>
                      HP: {maxHp} / {maxHp}
                    </Text>
                  </View>
                </View>

                {/* ================= BARRA ENE ================= */}
                <View style={styles.muStatSection}>
                  <View style={styles.muCapsuleRow}>
                    <View style={styles.muCapsuleBar}>
                      <Text style={styles.muStatLabel}>ENE</Text>
                      <TextInput
                        style={styles.muStatInput}
                        value={ene}
                        onChangeText={setEne}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.muStonePlusBtn}
                      onPress={() => handleQuickAddStat('ene', 1000)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.muStonePlusText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.muSubStats}>
                    <Text style={styles.muWhiteSubText}>
                      Mana: {maxMana} / {maxMana}
                    </Text>
                    <Text style={styles.muWhiteSubText}>
                      Dano a la habilidad: {skillDmg}%
                    </Text>
                  </View>
                </View>

                {/* ================= BARRA CMD (DARK LORD) ================= */}
                {isDarkLord && (
                  <View style={styles.muStatSection}>
                    <View style={styles.muCapsuleRow}>
                      <View style={styles.muCapsuleBar}>
                        <Text style={styles.muStatLabel}>CMD</Text>
                        <TextInput
                          style={styles.muStatInput}
                          value={cmd}
                          onChangeText={setCmd}
                          keyboardType="numeric"
                          maxLength={5}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.muStonePlusBtn}
                        onPress={() => handleQuickAddStat('cmd', 1000)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.muStonePlusText}>+</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.muSubStats}>
                      <Text style={styles.muWhiteSubText}>
                        Fuerza Caballo/Cuervo: +{Math.floor(numCmd / 10)}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Zen & Ruud Row */}
                <View style={styles.muZenRowWrap}>
                  <View style={styles.muZenCol}>
                    <Text style={styles.muZenTag}>ZEN</Text>
                    <TextInput
                      style={styles.muZenValField}
                      value={zen}
                      onChangeText={setZen}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.muZenCol}>
                    <Text style={[styles.muZenTag, { color: '#00E5FF' }]}>RUUD</Text>
                    <TextInput
                      style={[styles.muZenValField, { color: '#00E5FF' }]}
                      value={ruud}
                      onChangeText={setRuud}
                      keyboardType="numeric"
                    />
                  </View>
                </View>

                {/* Botones Inferiores Clásicos de MU Online [ X ] [ C ] [ P ] [ M ] */}
                <View style={styles.muFooterActionsRow}>
                  <TouchableOpacity
                    style={styles.muFooterBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.muFooterBtnGoldText}>X</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.muFooterBtn}
                    onPress={() => setActiveTab('Quest')}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="script-text-outline" size={20} color="#FFD700" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.muFooterBtn}
                    onPress={() => setActiveTab('Skills')}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="feather" size={20} color="#FFD700" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.muFooterBtn}
                    onPress={() => setActiveTab('Progreso')}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.muFooterBtnGoldText, { fontWeight: '900', fontSize: 16 }]}>M</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}

        {/* ================= TAB 2: INVENTARIO ================= */}
        {activeTab === 'Inventario' && (
          <View style={styles.tabContent}>
            {/* Sub-Inventory Navigation Pills */}
            <View style={styles.subTabsWrapper}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subTabsScroll}
              >
                {[
                  { key: 'equip', label: t('equipTab'), icon: 'sword-cross' },
                  { key: 'main', label: 'Main', icon: 'grid' },
                  { key: 'ext1', label: 'Ext 1 (Mochila)', icon: 'bag-personal-outline' },
                  { key: 'ext2', label: 'Ext 2 (Mochila)', icon: 'bag-personal-outline' },
                  { key: 'store', label: t('storeInventory'), icon: 'storefront' },
                ].map((sub) => {
                  const isCurrent = activeInvSubTab === sub.key;
                  return (
                    <TouchableOpacity
                      key={sub.key}
                      style={[styles.subTabPill, isCurrent && styles.subTabPillActive]}
                      onPress={() => setActiveInvSubTab(sub.key as InventorySubTab)}
                    >
                      <MaterialCommunityIcons
                        name={sub.icon as any}
                        size={14}
                        color={isCurrent ? '#FFFFFF' : THEME.colors.textSecondary}
                      />
                      <Text style={[styles.subTabText, isCurrent && styles.subTabTextActive]}>
                        {sub.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Botón Manual de Sincronización Rápida con el Juego */}
                <TouchableOpacity
                  style={[styles.subTabPill, { backgroundColor: '#1A237E', borderColor: '#3F51B5' }]}
                  onPress={() => loadCharacter(true)}
                  disabled={isRefreshing}
                >
                  <MaterialCommunityIcons
                    name="sync"
                    size={14}
                    color="#8C9EFF"
                  />
                  <Text style={[styles.subTabText, { color: '#8C9EFF', fontWeight: '700' }]}>
                    {isRefreshing ? 'Sincronizando...' : 'Refrescar'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>

            {/* Banner de Mover Ítem Activo */}
            {movingInvItem && (
              <View style={{ alignItems: 'center', marginVertical: 8, paddingHorizontal: 12 }}>
                <View style={styles.movingBanner}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.movingBannerTitle}>
                      Moviendo: {movingInvItem.item.name} ({movingInvItem.item.width || 1}x{movingInvItem.item.height || 1})
                    </Text>
                    <Text style={styles.movingBannerSubtitle}>
                      Toca cualquier cuadro libre (+) para reubicarlo
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.movingBannerCancelBtn}
                    onPress={() => setMovingInvItem(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.movingBannerCancelText}>✕ Cancelar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Sub-Tab 1: Classic Paperdoll View */}
            {activeInvSubTab === 'equip' && (
              <PaperdollView
                items={parsedItems}
                onSlotPress={handleSlotPress}
              />
            )}

            {/* Sub-Tab 2: Main Inventory Grid (32 Cuadros Oficiales o 64 Expandido) */}
            {activeInvSubTab === 'main' && (
              <View style={styles.gridWrapper}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, width: '100%', paddingHorizontal: 4 }}>
                  <Text style={[styles.gridHeaderTitle, { marginBottom: 0 }]}>
                    {invGridMode === '32' ? 'INVENTARIO PRINCIPAL (32 CUADROS)' : 'INVENTARIO PRINCIPAL (64 CUADROS)'}
                  </Text>
                  <View style={{ flexDirection: 'row', backgroundColor: THEME.colors.card, borderRadius: 8, padding: 2, borderWidth: 1, borderColor: THEME.colors.border }}>
                    <TouchableOpacity
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 6,
                        backgroundColor: invGridMode === '32' ? THEME.colors.primaryOrange : 'transparent',
                      }}
                      onPress={() => setInvGridMode('32')}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: invGridMode === '32' ? '#FFF' : THEME.colors.textSecondary }}>32 Oficial</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 6,
                        backgroundColor: invGridMode === '64' ? THEME.colors.primaryOrange : 'transparent',
                      }}
                      onPress={() => setInvGridMode('64')}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: invGridMode === '64' ? '#FFF' : THEME.colors.textSecondary }}>64 Exp.</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <InventoryGrid
                  startSlot={12}
                  rows={invGridMode === '32' ? 4 : 8}
                  cols={8}
                  items={parsedItems}
                  onSlotPress={handleSlotPress}
                  movingSlot={movingInvItem?.slot}
                />
              </View>
            )}

            {/* Sub-Tab 3: Extended 1 (Slots 76 to 107, 4x8 = 32 Cuadros - Season 6 Louis) */}
            {activeInvSubTab === 'ext1' && (
              <View style={styles.gridWrapper}>
                <View style={{ marginBottom: 10, width: '100%', paddingHorizontal: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.gridHeaderTitle, { marginBottom: 0 }]}>
                      EXTENSIÓN 1 DE INVENTARIO (MOCHILA 1 - 32 CUADROS)
                    </Text>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#332200', borderColor: '#FF9800', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, gap: 4 }}
                      onPress={handleUnlockExtensions}
                      disabled={unlockingExt}
                    >
                      <MaterialCommunityIcons name="lock-open-variant-outline" size={14} color="#FF9800" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF9800' }}>
                        {unlockingExt ? 'Desbloqueando...' : 'Desbloquear en Juego'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#888', fontSize: 10, marginTop: 3 }}>
                    Abierta en el cliente del juego con la tecla [K] o el botón de inventario expandido.
                  </Text>
                </View>
                <InventoryGrid
                  startSlot={INVENTORY_CONSTANTS.EXT1_INVENTORY_START}
                  rows={4}
                  cols={8}
                  items={parsedItems}
                  onSlotPress={handleSlotPress}
                  movingSlot={movingInvItem?.slot}
                />
              </View>
            )}

            {/* Sub-Tab 4: Extended 2 (Slots 108 to 139, 4x8 = 32 Cuadros - Season 6 Louis) */}
            {activeInvSubTab === 'ext2' && (
              <View style={styles.gridWrapper}>
                <View style={{ marginBottom: 10, width: '100%', paddingHorizontal: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.gridHeaderTitle, { marginBottom: 0 }]}>
                      EXTENSIÓN 2 DE INVENTARIO (MOCHILA 2 - 32 CUADROS)
                    </Text>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#332200', borderColor: '#FF9800', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, gap: 4 }}
                      onPress={handleUnlockExtensions}
                      disabled={unlockingExt}
                    >
                      <MaterialCommunityIcons name="lock-open-variant-outline" size={14} color="#FF9800" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF9800' }}>
                        {unlockingExt ? 'Desbloqueando...' : 'Desbloquear en Juego'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: '#888', fontSize: 10, marginTop: 3 }}>
                    Abierta en el cliente del juego con la tecla [K] o el botón de inventario expandido.
                  </Text>
                </View>
                <InventoryGrid
                  startSlot={INVENTORY_CONSTANTS.EXT2_INVENTORY_START}
                  rows={4}
                  cols={8}
                  items={parsedItems}
                  onSlotPress={handleSlotPress}
                  movingSlot={movingInvItem?.slot}
                />
              </View>
            )}

            {/* Sub-Tab 5: Personal Store (Slots 140 to 171, 4x8 = 32 Cuadros - Season 6 Louis) */}
            {activeInvSubTab === 'store' && (
              <View style={styles.gridWrapper}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, width: '100%', paddingHorizontal: 4 }}>
                  <Text style={[styles.gridHeaderTitle, { marginBottom: 0 }]}>
                    PERSONAL STORE (TIENDA PERSONAL)
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#332200', borderColor: '#FF9800', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, gap: 4 }}
                      onPress={handleUnlockExtensions}
                      disabled={unlockingExt}
                    >
                      <MaterialCommunityIcons name="lock-open-outline" size={14} color="#FF9800" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF9800' }}>Liberar Candado</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#330000', borderColor: '#FF5252', borderWidth: 1, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, gap: 4 }}
                      onPress={handleClearStore}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color="#FF5252" />
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF5252' }}>Vaciar Store</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <InventoryGrid
                  startSlot={INVENTORY_CONSTANTS.STORE_INVENTORY_START}
                  rows={4}
                  cols={8}
                  items={parsedItems}
                  onSlotPress={handleSlotPress}
                  movingSlot={movingInvItem?.slot}
                />
              </View>
            )}

            {/* Barra Inferior de Zen Oficial de MU Online (Captura Inventario) */}
            <View style={styles.muInvZenRow}>
              <Text style={styles.muZenTag}>ZEN</Text>
              <View style={styles.muInvZenBox}>
                <Text style={styles.muInvZenVal}>{Number(zen || 0).toLocaleString()}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={styles.muFooterBtn}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                >
                  <Text style={styles.muFooterBtnGoldText}>X</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 3: PROGRESO ================= */}
        {activeTab === 'Progreso' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardTitle}>RESETS Y MASTER LEVEL</Text>
                <TouchableOpacity
                  style={styles.quickPkBtn}
                  onPress={handleQuickPkClear}
                >
                  <MaterialCommunityIcons name="broom" size={14} color={THEME.colors.accentGreenBright} />
                  <Text style={styles.quickPkBtnText}>PK CLEAR</Text>
                </TouchableOpacity>
              </View>

              {/* Resets & M. Resets */}
              <View style={styles.grid2}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Resets Actuales</Text>
                  <View style={styles.inputStepperRow}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1, color: THEME.colors.primaryOrange }]}
                      value={resets}
                      onChangeText={setResets}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.stepperSmallBtn}
                      onPress={() => setResets(String(Math.max(0, (parseInt(resets, 10) || 0) - 1)))}
                    >
                      <Text style={styles.stepperText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperSmallBtn}
                      onPress={() => setResets(String((parseInt(resets, 10) || 0) + 1))}
                    >
                      <Text style={styles.stepperText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quickStepRow}>
                    <TouchableOpacity style={styles.quickStepBtn} onPress={() => setResets(String((parseInt(resets, 10) || 0) + 10))}>
                      <Text style={styles.quickStepText}>+10</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickStepBtn} onPress={() => setResets(String((parseInt(resets, 10) || 0) + 100))}>
                      <Text style={styles.quickStepText}>+100</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Master Resets (M.R)</Text>
                  <View style={styles.inputStepperRow}>
                    <TextInput
                      style={[styles.fieldInput, { flex: 1, color: THEME.colors.accentBlue }]}
                      value={mResets}
                      onChangeText={setMResets}
                      keyboardType="numeric"
                    />
                    <TouchableOpacity
                      style={styles.stepperSmallBtn}
                      onPress={() => setMResets(String(Math.max(0, (parseInt(mResets, 10) || 0) - 1)))}
                    >
                      <Text style={styles.stepperText}>-</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperSmallBtn}
                      onPress={() => setMResets(String((parseInt(mResets, 10) || 0) + 1))}
                    >
                      <Text style={styles.stepperText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Master Level & Master Points */}
              <View style={styles.grid2}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Master Level (0-400)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={mLevel}
                    onChangeText={setMLevel}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Puntos Master (Skill Points)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={mPoints}
                    onChangeText={setMPoints}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.divider} />

              {/* Estado PK */}
              <Text style={[styles.cardTitle, { marginTop: 4 }]}>ESTADO Y ASESINATOS (PK)</Text>
              <Text style={styles.fieldLabel}>Nivel de PK / Estado:</Text>
              <View style={styles.pkPillRow}>
                {[
                  { level: 1, label: 'Héroe 2', color: '#1E88E5' },
                  { level: 2, label: 'Héroe 1', color: '#42A5F5' },
                  { level: 3, label: 'Común (3)', color: '#EEEEEE' },
                  { level: 4, label: 'Warning (4)', color: '#FFA726' },
                  { level: 5, label: 'Asesino (5)', color: '#E53935' },
                  { level: 6, label: 'Phono (6)', color: '#B71C1C' },
                ].map((pk) => (
                  <TouchableOpacity
                    key={pk.level}
                    style={[
                      styles.pkPill,
                      pkLevel === pk.level && { backgroundColor: pk.color, borderColor: pk.color }
                    ]}
                    onPress={() => setPkLevel(pk.level)}
                  >
                    <Text
                      style={[
                        styles.pkPillText,
                        pkLevel === pk.level && { color: pk.level === 3 ? '#000' : '#FFF', fontWeight: 'bold' }
                      ]}
                    >
                      {pk.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.grid2}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Asesinatos (PK Count)</Text>
                  <TextInput
                    style={[styles.fieldInput, { color: pkLevel >= 4 ? THEME.colors.dangerRed : THEME.colors.textPrimary }]}
                    value={pkCount}
                    onChangeText={setPkCount}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Tiempo PK (Segundos)</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={pkTime}
                    onChangeText={setPkTime}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 3: SKILLS ================= */}
        {activeTab === 'Skills' && (
          <View style={styles.tabContent}>
            {/* Barra de Skills Oficial de MU Online Season 6 (Captura de Referencia) */}
            <View style={styles.muSkillBarContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.muSkillBarTitle}>BARRA DE ACCESO RÁPIDO</Text>
                <Text style={{ fontSize: 10, color: '#C5A059', fontWeight: '800' }}>
                  {skills.length > 0 ? `${skills.length} HABILIDADES ACTIVAS` : 'VACÍA'}
                </Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.muSkillBarScroll}
              >
                {Array.from({ length: 10 }).map((_, idx) => {
                  const equippedSkill = skills[idx];
                  const isSelected = selectedSkillIdx === idx;
                  return (
                    <TouchableOpacity
                      key={`skill_slot_${idx}`}
                      style={[styles.muSkillSlotFrame, isSelected && styles.muSkillSlotSelected]}
                      onPress={() => setSelectedSkillIdx(isSelected ? null : idx)}
                      activeOpacity={0.8}
                    >
                      {equippedSkill ? (
                        <SkillImage skillId={equippedSkill.id} size={36} isSelected={isSelected} showBorder={false} />
                      ) : (
                        <View style={styles.muSkillSlotEmpty}>
                          <View style={styles.muSkillSlotEmptyInner} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Card 1: Resumen y Guardar */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.cardTitle}>HABILIDADES (MAGICLIST)</Text>
                  <Text style={{ fontSize: 13, color: THEME.colors.textMuted, marginTop: 2 }}>
                    Ranuras: <Text style={{ color: THEME.colors.primaryOrange, fontWeight: 'bold' }}>{skills.length} / 60</Text> ocupadas
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.skillHeaderBtnAdd}
                    onPress={() => {
                      setSkillSearchQuery('');
                      setSkillRaceFilter('ALL');
                      setAddSkillModalVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#FFF" />
                    <Text style={styles.skillHeaderBtnText}>Agregar</Text>
                  </TouchableOpacity>
                  {skills.length > 0 && (
                    <TouchableOpacity
                      style={styles.skillHeaderBtnClear}
                      onPress={handleClearAllSkills}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={16} color="#FF5252" />
                      <Text style={[styles.skillHeaderBtnText, { color: '#FF5252' }]}>Vaciar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Card 2: Envío Rápido por Raza */}
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <MaterialCommunityIcons name="flash" size={20} color={THEME.colors.primaryOrange} />
                <Text style={styles.cardTitle}>ENVÍO RÁPIDO DE SKILLS POR RAZA</Text>
              </View>
              <Text style={{ fontSize: 12, color: THEME.colors.textMuted, marginBottom: 12 }}>
                Equipa el repertorio completo oficial de habilidades de cualquier raza con un solo toque.
              </Text>

              {/* Botón de la raza actual destacada */}
              {(() => {
                const charRaceCode = getRaceCodeByClassId(selectedClass);
                const charPreset = RACE_SKILL_PRESETS[charRaceCode];
                if (!charPreset) return null;
                return (
                  <TouchableOpacity
                    style={[styles.quickRaceMainBtn, { borderColor: charPreset.color }]}
                    onPress={() => handleQuickSendSkills(charRaceCode)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.quickRaceIconCircle, { backgroundColor: charPreset.color }]}>
                      <MaterialCommunityIcons name={charPreset.icon as any} size={22} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quickRaceMainTitle}>
                        Cargar Skills Recomendadas de {charPreset.label}
                      </Text>
                      <Text style={styles.quickRaceMainSub}>
                        {charPreset.skillIds.length} habilidades nativas completas
                      </Text>
                    </View>
                    <MaterialCommunityIcons name="arrow-right-bold-circle" size={24} color={charPreset.color} />
                  </TouchableOpacity>
                );
              })()}

              {/* Selector de modo de envío (Reemplazar vs Agregar) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 12, color: THEME.colors.textSecondary, fontWeight: '600' }}>
                  Modo de envío:
                </Text>
                <View style={{ flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 8, padding: 3, gap: 4 }}>
                  <TouchableOpacity
                    style={[styles.quickModeBtn, quickSendMode === 'replace' && styles.quickModeBtnActive]}
                    onPress={() => setQuickSendMode('replace')}
                  >
                    <Text style={[styles.quickModeBtnText, quickSendMode === 'replace' && styles.quickModeBtnTextActive]}>
                      Reemplazar
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickModeBtn, quickSendMode === 'merge' && styles.quickModeBtnActive]}
                    onPress={() => setQuickSendMode('merge')}
                  >
                    <Text style={[styles.quickModeBtnText, quickSendMode === 'merge' && styles.quickModeBtnTextActive]}>
                      Agregar (+)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Fila de botones rápidos de todas las 7 razas */}
              <Text style={[styles.fieldLabel, { marginTop: 4, marginBottom: 8 }]}>Seleccionar otra raza:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(RACE_SKILL_PRESETS).map((key) => {
                  const p = RACE_SKILL_PRESETS[key];
                  return (
                    <TouchableOpacity
                      key={key}
                      style={[styles.raceChipBtn, { borderColor: p.color }]}
                      onPress={() => handleQuickSendSkills(key)}
                    >
                      <MaterialCommunityIcons name={p.icon as any} size={14} color={p.color} />
                      <Text style={[styles.raceChipText, { color: p.color }]}>{p.code}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Card 3: Lista de Habilidades Actuales */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>HABILIDADES ACTIVAS ({skills.length})</Text>

              {skills.length === 0 ? (
                <View style={styles.emptySkillsContainer}>
                  <MaterialCommunityIcons name="book-open-blank-variant" size={44} color={THEME.colors.textMuted} />
                  <Text style={styles.emptySkillsText}>
                    Este personaje no tiene ninguna habilidad aprendida.
                  </Text>
                  <Text style={styles.emptySkillsSubText}>
                    Usa el botón de Envío Rápido arriba o pulsa "+ Agregar" para añadir habilidades individuales.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 8, marginTop: 8 }}>
                  {skills.map((skill, idx) => (
                    <View key={`${skill.id}-${idx}`} style={styles.skillCardRow}>
                      <SkillImage skillId={skill.id} size={36} showBorder={true} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={styles.skillNameText}>{skill.nameEs || skill.name}</Text>
                          <View style={styles.skillCategoryBadge}>
                            <Text style={styles.skillCategoryBadgeText}>{skill.category}</Text>
                          </View>
                        </View>
                        <Text style={styles.skillSubText}>
                          ID: {skill.id} • {skill.name} {skill.level > 0 ? `• Nivel ${skill.level}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.skillDeleteBtn}
                        onPress={() => handleRemoveSkill(skill.id)}
                        activeOpacity={0.7}
                      >
                        <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* ================= TAB 4: UBICACION ================= */}
        {activeTab === 'Ubicacion' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>COORDENADAS Y MAPA</Text>
              <View style={styles.fieldCol}>
                <Text style={styles.fieldLabel}>Mapa Actual:</Text>
                <Text style={[styles.fieldStaticVal, { color: THEME.colors.accentBlue }]}>
                  {MU_MAPS[parseInt(mapNumber, 10) || 0] || 'Mapa Personalizado'} (ID: {mapNumber})
                </Text>
              </View>

              <View style={[styles.grid2, { gap: 8 }]}>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>ID Mapa:</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={mapNumber}
                    onChangeText={setMapNumber}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Coord X:</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={mapX}
                    onChangeText={setMapX}
                    keyboardType="numeric"
                    placeholder="125"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>
                <View style={styles.fieldCol}>
                  <Text style={styles.fieldLabel}>Coord Y:</Text>
                  <TextInput
                    style={styles.fieldInput}
                    value={mapY}
                    onChangeText={setMapY}
                    keyboardType="numeric"
                    placeholder="125"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={[styles.fieldLabel, { marginTop: 4, marginBottom: 8 }]}>Teletransporte Rápido:</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {[
                  { name: 'Lorencia Bar', map: 0, x: 125, y: 125 },
                  { name: 'Noria', map: 3, x: 175, y: 110 },
                  { name: 'Devias', map: 2, x: 220, y: 25 },
                  { name: 'Elbeland', map: 51, x: 50, y: 225 },
                  { name: 'Lost Tower 1', map: 4, x: 208, y: 78 },
                  { name: 'Arena', map: 6, x: 60, y: 115 },
                ].map((tp) => (
                  <TouchableOpacity
                    key={tp.name}
                    style={{
                      backgroundColor: THEME.colors.surface,
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: THEME.colors.border,
                    }}
                    onPress={() => handleSaveLocation(tp.map, tp.x, tp.y)}
                  >
                    <Text style={{ color: THEME.colors.textPrimary, fontSize: 12 }}>{tp.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ================= TAB 5: QUEST ================= */}
        {activeTab === 'Quest' && (
          <View style={styles.tabContent}>
            <View style={styles.card}>
              {/* 1. Selector de Raza Base */}
              <Text style={styles.cardTitle}>RAZA DEL PERSONAJE</Text>
              <Text style={styles.fieldSubtitle}>Selecciona la raza base del personaje (Louis Emulator Season 6):</Text>

              {(() => {
                const currentInfo = getMuClassInfo(selectedClass);
                const currentRace = getBaseRaceByClass(selectedClass);

                return (
                  <View style={{ marginBottom: 12 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.raceScrollContainer}>
                      {MU_BASE_RACES.map((race) => {
                        const isCurrentRace = currentRace.baseClass === race.baseClass;
                        const portrait = CLASS_PORTRAITS[race.baseClass];
                        return (
                          <TouchableOpacity
                            key={race.baseClass}
                            style={[
                              styles.raceChip,
                              isCurrentRace && [styles.raceChipActive, { borderColor: race.accentColor }],
                            ]}
                            onPress={() => {
                              const targetTier = currentInfo.tier;
                              const matchedTier = race.tiers.find((t) => t.tier === targetTier) || race.tiers[race.tiers.length - 1];
                              setSelectedClass(matchedTier.classId);
                              if (matchedTier.tier === 3) {
                                setThirdClassComplete(true);
                              } else {
                                setThirdClassComplete(false);
                              }
                              if (matchedTier.tier >= 2) {
                                setMarlonCombo(true);
                                setMarlonPoints(true);
                              } else {
                                setMarlonCombo(false);
                                setMarlonPoints(false);
                              }
                            }}
                          >
                            {portrait ? (
                              <Image
                                source={portrait}
                                style={{ width: 22, height: 22, borderRadius: 11 }}
                                resizeMode="cover"
                              />
                            ) : (
                              <MaterialCommunityIcons
                                name={race.avatarIcon as any}
                                size={18}
                                color={isCurrentRace ? race.accentColor : THEME.colors.textMuted}
                              />
                            )}
                            <Text
                              style={[
                                styles.raceChipText,
                                isCurrentRace && [styles.raceChipTextActive, { color: race.accentColor }],
                              ]}
                            >
                              {race.name}
                            </Text>
                            {isCurrentRace && (
                              <MaterialCommunityIcons name="check" size={14} color={race.accentColor} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                );
              })()}

              <View style={styles.divider} />

              {/* 2. Selector de Rango / Evolución dentro de la Raza */}
              <Text style={[styles.cardTitle, { marginTop: 6 }]}>EVOLUCIÓN DE CLASE</Text>
              <Text style={styles.fieldSubtitle}>Selecciona el rango o evolución de la raza seleccionada:</Text>

              {(() => {
                const currentInfo = getMuClassInfo(selectedClass);
                const currentRace = getBaseRaceByClass(selectedClass);
                const racePortrait = CLASS_PORTRAITS[currentRace.baseClass];

                return (
                  <View style={styles.classTierContainer}>
                    {currentRace.tiers.map((t) => {
                      const isSelected = selectedClass === t.classId || (currentInfo.baseClass === currentRace.baseClass && currentInfo.tier === t.tier);
                      return (
                        <TouchableOpacity
                          key={t.classId}
                          style={[styles.classTierCard, isSelected && styles.classTierCardActive]}
                          onPress={() => {
                            setSelectedClass(t.classId);
                            if (t.tier === 3) {
                              setThirdClassComplete(true);
                              setMarlonCombo(true);
                              setMarlonPoints(true);
                            } else if (t.tier === 2) {
                              setThirdClassComplete(false);
                              setMarlonCombo(true);
                              setMarlonPoints(true);
                            } else {
                              setThirdClassComplete(false);
                              setMarlonCombo(false);
                              setMarlonPoints(false);
                            }
                          }}
                        >
                          {racePortrait ? (
                            <View style={{ width: 34, height: 34, borderRadius: 17, overflow: 'hidden', borderWidth: 1.5, borderColor: isSelected ? THEME.colors.primaryOrange : THEME.colors.border }}>
                              <Image
                                source={racePortrait}
                                style={{ width: 34, height: 34 }}
                                resizeMode="cover"
                              />
                            </View>
                          ) : (
                            <MaterialCommunityIcons
                              name={t.icon as any}
                              size={24}
                              color={isSelected ? THEME.colors.primaryOrange : THEME.colors.textMuted}
                            />
                          )}
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.classTierName, isSelected && { color: THEME.colors.primaryOrange }]}>
                              {t.name}
                            </Text>
                            <Text style={styles.classTierSub}>{t.subtitle}</Text>
                          </View>
                          {isSelected && (
                            <MaterialCommunityIcons name="check-circle" size={20} color={THEME.colors.primaryOrange} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                );
              })()}

              <View style={styles.divider} />

              <Text style={[styles.cardTitle, { marginTop: 6 }]}>MISIONES DEL JUEGO</Text>

              {/* Marlon Combo */}
              <View style={styles.questEditRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questTitle}>Marlon Quest - Combo Skill</Text>
                  <Text style={styles.questSubtitle}>Habilita el combo de habilidades (DK / BK / BM)</Text>
                </View>
                <Switch
                  value={marlonCombo}
                  onValueChange={setMarlonCombo}
                  trackColor={{ false: '#333', true: THEME.colors.primaryOrange }}
                  thumbColor="#FFF"
                />
              </View>

              {/* Marlon Points */}
              <View style={styles.questEditRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questTitle}>Marlon Quest - 6 Puntos por Nivel</Text>
                  <Text style={styles.questSubtitle}>Desbloquea 6 puntos por nivel a partir del nivel 220</Text>
                </View>
                <Switch
                  value={marlonPoints}
                  onValueChange={setMarlonPoints}
                  trackColor={{ false: '#333', true: THEME.colors.primaryOrange }}
                  thumbColor="#FFF"
                />
              </View>

              {/* 3rd Class Devin */}
              <View style={styles.questEditRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.questTitle}>Misión 3ra Clase (Apostle Devin)</Text>
                  <Text style={styles.questSubtitle}>Desbloquea evolución Master y Árbol de Poderes (MasterSkillTree)</Text>
                </View>
                <Switch
                  value={thirdClassComplete}
                  onValueChange={(val) => {
                    setThirdClassComplete(val);
                    const race = getBaseRaceByClass(selectedClass);
                    if (val) {
                      const t3 = race.tiers.find((t) => t.tier === 3) || race.tiers[race.tiers.length - 1];
                      setSelectedClass(t3.classId);
                    } else {
                      const t1 = race.tiers.find((t) => t.tier === 1) || race.tiers[0];
                      setSelectedClass(t1.classId);
                    }
                  }}
                  trackColor={{ false: '#333', true: THEME.colors.primaryOrange }}
                  thumbColor="#FFF"
                />
              </View>

              {/* Quick Actions 1-clic */}
              <View style={styles.quickQuestActionRow}>
                <TouchableOpacity
                  style={[styles.quickQuestBtn, { backgroundColor: 'rgba(76, 175, 80, 0.15)', borderColor: '#4CAF50' }]}
                  onPress={handleCompleteAllQuests}
                >
                  <MaterialCommunityIcons name="star-shooting" size={16} color="#4CAF50" />
                  <Text style={[styles.quickQuestText, { color: '#4CAF50' }]}>Completar Todas (3ra Clase)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.quickQuestBtn, { backgroundColor: 'rgba(244, 67, 54, 0.15)', borderColor: '#F44336' }]}
                  onPress={handleResetAllQuests}
                >
                  <MaterialCommunityIcons name="restart" size={16} color="#F44336" />
                  <Text style={[styles.quickQuestText, { color: '#F44336' }]}>Reiniciar (1ra Clase)</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Botón Sticky Fijo Inferior Guardar Cambios */}
      <View style={[styles.stickyBottomBar, { paddingBottom: Math.max(14, insets.bottom + 4) }]}>
        <BotonOro
          titulo={isSavingAny ? (t('saving') || 'GUARDANDO...') : 'GUARDAR CAMBIOS'}
          onPress={handleSaveCurrentTab}
          cargando={isSavingAny}
          altura={56}
        />
      </View>

      {/* Selector de Ítems y Equipamiento para Slots Vacíos */}
      <EquipmentPickerModal
        visible={pickerVisible}
        slotIndex={pickerSlot}
        onClose={() => setPickerVisible(false)}
        onSelectItem={handlePickerSelectItem}
      />

      {/* Modal de Inspección Rápida y Acciones (Captura 5) */}
      <ItemActionModal
        visible={actionModalVisible}
        item={actionItem}
        slotIndex={actionSlot}
        onClose={() => setActionModalVisible(false)}
        onEdit={handleOpenItemEditor}
        onDelete={handleItemDelete}
        onMove={(item, slot) => setMovingInvItem({ item, slot })}
        onQuickMax={handleQuickMaxItem}
        onDuplicate={handleDuplicateItem}
      />

      {/* Item Inspection & Edit Modal */}
      <ItemModal
        visible={modalVisible}
        item={modalItem}
        slotIndex={modalSlot}
        initialEditing={true}
        onClose={() => setModalVisible(false)}
        onSave={handleItemSave}
        onDelete={handleItemDelete}
      />

      {/* Modal de Catálogo para Agregar Habilidad Individual */}
      <Modal
        visible={addSkillModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddSkillModalVisible(false)}
      >
        <View style={styles.skillPickerModalOverlay}>
          <View style={styles.skillPickerModalContent}>
            {/* Cabecera */}
            <View style={styles.skillPickerModalHeader}>
              <View>
                <Text style={styles.skillPickerModalTitle}>Catálogo de Habilidades S6</Text>
                <Text style={{ color: THEME.colors.textMuted, fontSize: 11, marginTop: 2 }}>
                  Toca "+ Añadir" para equipar la habilidad al personaje
                </Text>
              </View>
              <TouchableOpacity
                style={styles.skillPickerCloseBtn}
                onPress={() => setAddSkillModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Buscador en vivo */}
            <TextInput
              style={styles.skillSearchInput}
              placeholder="Buscar habilidad por nombre o ID..."
              placeholderTextColor={THEME.colors.textMuted}
              value={skillSearchQuery}
              onChangeText={setSkillSearchQuery}
              clearButtonMode="while-editing"
            />

            {/* Filtros por Raza */}
            <View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.skillFilterRow}
              >
                {[
                  { key: 'ALL', label: 'Todas' },
                  { key: 'DK', label: 'Dark Knight' },
                  { key: 'DW', label: 'Dark Wizard' },
                  { key: 'FE', label: 'Fairy Elf' },
                  { key: 'MG', label: 'Magic Gladiator' },
                  { key: 'DL', label: 'Dark Lord' },
                  { key: 'SU', label: 'Summoner' },
                  { key: 'RF', label: 'Rage Fighter' },
                  { key: 'COMMON', label: 'Comunes' },
                ].map((f) => (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.skillFilterChip,
                      skillRaceFilter === f.key && styles.skillFilterChipActive,
                    ]}
                    onPress={() => setSkillRaceFilter(f.key)}
                  >
                    <Text
                      style={[
                        styles.skillFilterChipText,
                        skillRaceFilter === f.key && styles.skillFilterChipTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Lista de habilidades filtradas */}
            <FlatList
              data={filteredCatalogSkills}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const alreadyAdded = skills.some((s) => s.id === item.id);
                return (
                  <View
                    style={[
                      styles.skillCatalogItem,
                      alreadyAdded && styles.skillCatalogItemAdded,
                    ]}
                  >
                    <SkillImage skillId={item.id} size={36} showBorder={true} containerStyle={{ marginRight: 10 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.skillCatalogItemName}>
                        {item.nameEs || item.name}
                      </Text>
                      <Text style={styles.skillCatalogItemSub}>
                        ID: {item.id} • {item.name} • {item.category}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.skillCatalogItemBtn,
                        alreadyAdded && styles.skillCatalogItemBtnDisabled,
                      ]}
                      onPress={() => !alreadyAdded && handleAddIndividualSkill(item)}
                      disabled={alreadyAdded}
                    >
                      <Text
                        style={[
                          styles.skillCatalogItemBtnText,
                          alreadyAdded && { color: THEME.colors.textMuted },
                        ]}
                      >
                        {alreadyAdded ? 'Añadida' : '+ Añadir'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              }}
              ListEmptyComponent={
                <View style={{ padding: 24, alignItems: 'center' }}>
                  <Text style={{ color: THEME.colors.textMuted, fontSize: 13 }}>
                    No se encontraron habilidades con ese filtro.
                  </Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      {/* License Activation Modal */}
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
    backgroundColor: THEME.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#070A0F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#A0ADC2',
    fontSize: 14,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.superficie,
    paddingHorizontal: THEME.spacing.md,
    paddingVertical: THEME.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  headerTextCol: {
    flex: 1,
  },
  headerName: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  headerClass: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.brasa,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBarWrapper: {
    backgroundColor: THEME.colors.superficie,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    minWidth: '100%',
    justifyContent: 'space-around',
  },
  tabItem: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: THEME.colors.oroClaro,
  },
  tabText: {
    fontSize: 12,
    color: THEME.colors.textoSecundario,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: '900',
  },
  stickyBottomBar: {
    backgroundColor: 'rgba(25, 21, 18, 0.96)',
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
    paddingHorizontal: THEME.shapes.espaciadoBase,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 10,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#0F1522',
    borderRadius: 8,
    borderWidth: 1.2,
    borderColor: '#1E2B3E',
    padding: THEME.spacing.md,
    marginBottom: THEME.spacing.md,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: THEME.spacing.md,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: THEME.spacing.sm,
  },
  fieldCol: {
    flex: 1,
    marginBottom: THEME.spacing.xs,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#A0B0C8',
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  fieldStaticVal: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '800',
    backgroundColor: '#090D14',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#1D283A',
  },
  fieldInput: {
    backgroundColor: '#090D14',
    color: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#24344B',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '800',
  },
  zenContainer: {
    marginTop: 4,
  },
  rankBadge: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
  },
  rankGm: {
    backgroundColor: 'rgba(255, 143, 0, 0.15)',
    borderColor: '#FFA000',
  },
  rankPlayer: {
    backgroundColor: '#090D14',
    borderColor: '#1E2A3C',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  bottomBtn: {
    marginVertical: THEME.spacing.md,
  },
  subTabsWrapper: {
    marginBottom: THEME.spacing.md,
  },
  subTabsScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 2,
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 5,
    backgroundColor: '#0B0F17',
    borderWidth: 1,
    borderColor: '#1E2A3C',
  },
  subTabPillActive: {
    backgroundColor: '#C8960C',
    borderColor: '#FFD700',
  },
  subTabText: {
    fontSize: 11,
    color: '#8293AB',
    fontWeight: '700',
  },
  subTabTextActive: {
    color: '#070A0F',
    fontWeight: '900',
  },
  gridWrapper: {
    alignItems: 'center',
  },
  gridHeaderTitle: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.textPrimary,
  },
  questStatus: {
    fontSize: 11,
    color: THEME.colors.accentGreenBright,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.md,
  },
  quickPkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1,
    borderColor: THEME.colors.accentGreenBright,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  quickPkBtnText: {
    color: THEME.colors.accentGreenBright,
    fontSize: 10,
    fontWeight: THEME.typography.weightBold,
  },
  inputStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperSmallBtn: {
    width: 32,
    height: 36,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
  },
  quickStepRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  quickStepBtn: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  quickStepText: {
    color: THEME.colors.textSecondary,
    fontSize: 10,
    fontWeight: THEME.typography.weightBold,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.border,
    marginVertical: 12,
  },
  pkPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  pkPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
  },
  pkPillText: {
    fontSize: 11,
    color: THEME.colors.textSecondary,
  },
  fieldSubtitle: {
    fontSize: 11,
    color: THEME.colors.textMuted,
    marginBottom: 8,
  },
  raceScrollContainer: {
    paddingVertical: 4,
    gap: 8,
  },
  raceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  raceChipActive: {
    backgroundColor: 'rgba(255, 107, 0, 0.12)',
    borderColor: THEME.colors.primaryOrange,
  },
  raceChipText: {
    color: THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: THEME.typography.weightMedium,
  },
  raceChipTextActive: {
    fontWeight: THEME.typography.weightBold,
  },
  classTierContainer: {
    gap: 8,
    marginVertical: 6,
  },
  classTierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    borderColor: THEME.colors.border,
    borderRadius: THEME.borderRadius.sm,
    padding: 10,
  },
  classTierCardActive: {
    borderColor: THEME.colors.primaryOrange,
    backgroundColor: 'rgba(255, 107, 0, 0.08)',
  },
  classTierName: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: THEME.typography.weightBold,
  },
  classTierSub: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  questEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.border,
  },
  questSubtitle: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  quickQuestActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  quickQuestBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  quickQuestText: {
    fontSize: 11,
    fontWeight: THEME.typography.weightBold,
  },
  movingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1613',
    borderColor: '#B58F3C',
    borderWidth: 1.5,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    width: '100%',
    maxWidth: 380,
  },
  movingBannerTitle: {
    color: '#E8C86A',
    fontSize: 12,
    fontWeight: '800',
  },
  movingBannerSubtitle: {
    color: '#EDE4D3',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  movingBannerCancelBtn: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderColor: '#E2703A',
    borderWidth: 1,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  movingBannerCancelText: {
    color: '#E2703A',
    fontSize: 11,
    fontWeight: '800',
  },
  // Skills Tab Styles
  skillHeaderBtnAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#B58F3C',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
    minHeight: 44,
  },
  skillHeaderBtnClear: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderColor: '#E2703A',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
    minHeight: 44,
  },
  skillHeaderBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  quickRaceMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B2521',
    borderWidth: 1.5,
    borderColor: '#6B5533',
    borderRadius: 6,
    padding: 12,
    gap: 12,
    minHeight: 48,
  },
  quickRaceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRaceMainTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  quickRaceMainSub: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  quickModeBtn: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  quickModeBtnActive: {
    backgroundColor: THEME.colors.primaryOrange,
  },
  quickModeBtnText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  quickModeBtnTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  raceChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 6,
  },
  emptySkillsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptySkillsText: {
    color: THEME.colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySkillsSubText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 300,
  },
  skillCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.surface,
    borderColor: THEME.colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  skillIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillNameText: {
    color: THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  skillCategoryBadge: {
    backgroundColor: '#262626',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  skillCategoryBadgeText: {
    color: THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  skillSubText: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  skillDeleteBtn: {
    padding: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 82, 82, 0.3)',
  },
  // Modal Picker Styles
  skillPickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  skillPickerModalContent: {
    backgroundColor: '#191512',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    maxHeight: '90%',
    paddingBottom: 24,
  },
  skillPickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3D312A',
  },
  skillPickerModalTitle: {
    color: '#E8C86A',
    fontSize: 16,
    fontWeight: '800',
  },
  skillPickerCloseBtn: {
    padding: 4,
  },
  skillSearchInput: {
    backgroundColor: '#14110E',
    borderColor: '#4A3B2C',
    borderWidth: 1,
    borderRadius: 6,
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 12,
  },
  skillFilterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  skillFilterChip: {
    backgroundColor: '#1A1613',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    minHeight: 36,
    justifyContent: 'center',
  },
  skillFilterChipActive: {
    backgroundColor: '#B58F3C',
    borderColor: '#E8C86A',
  },
  skillFilterChipText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  skillFilterChipTextActive: {
    color: '#FFF',
    fontWeight: '800',
  },
  skillCatalogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  skillCatalogItemAdded: {
    opacity: 0.5,
  },
  skillCatalogItemLeft: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#242424',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  skillCatalogItemName: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  skillCatalogItemSub: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  skillCatalogItemBtn: {
    backgroundColor: THEME.colors.primaryOrange,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  skillCatalogItemBtnDisabled: {
    backgroundColor: '#2C2C2C',
  },
  skillCatalogItemBtnText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },

  // ==========================================
  // ESTILOS CLÁSICOS MU ONLINE SEASON 6 (CAPTURAS)
  // ==========================================
  muCharWindow: {
    backgroundColor: '#070A0F',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#C5A059',
    padding: 12,
    marginBottom: 16,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  muCharHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#263345',
    marginBottom: 10,
  },
  muCharName: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  muCharClass: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFD700',
    marginTop: 2,
  },
  muLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1A2333',
    marginBottom: 10,
  },
  muLevelText: {
    fontSize: 11,
    color: '#FFD700',
    fontWeight: '800',
    lineHeight: 18,
  },
  muYellowVal: {
    color: '#FFE066',
    fontWeight: '900',
  },
  muStonePlusBtn: {
    width: 30,
    height: 30,
    borderRadius: 2,
    backgroundColor: '#161D29',
    borderWidth: 1.5,
    borderTopColor: '#53647C',
    borderLeftColor: '#53647C',
    borderBottomColor: '#05080E',
    borderRightColor: '#05080E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muStonePlusText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFD700',
    marginTop: -2,
  },
  muStatSection: {
    marginBottom: 10,
  },
  muCapsuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  muCapsuleBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 36,
    borderRadius: 3,
    backgroundColor: '#04060A',
    borderWidth: 1.5,
    borderTopColor: '#45556D',
    borderLeftColor: '#45556D',
    borderBottomColor: '#030508',
    borderRightColor: '#030508',
    paddingHorizontal: 12,
  },
  muStatLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 0.8,
  },
  muStatInput: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFD700',
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: 0,
  },
  muSubStats: {
    marginTop: 3,
    paddingLeft: 4,
    gap: 1,
  },
  muCyanSubText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00D2FF',
    letterSpacing: 0.3,
  },
  muWhiteSubText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#E0E8F5',
    letterSpacing: 0.3,
  },
  muZenRowWrap: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
    marginBottom: 12,
  },
  muZenCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#04060A',
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#C5A059',
    paddingHorizontal: 8,
    height: 36,
  },
  muZenTag: {
    fontSize: 12,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    marginRight: 8,
    letterSpacing: 1,
  },
  muZenValField: {
    flex: 1,
    fontSize: 16,
    fontWeight: '900',
    color: THEME.colors.jade,
    paddingVertical: 0,
  },
  muFooterActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#263345',
  },
  muFooterBtn: {
    width: 38,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#121824',
    borderWidth: 1.5,
    borderColor: '#C5A059',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muFooterBtnGoldText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFD700',
  },
  muFooterBtnSave: {
    flex: 1,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#FFD700',
    borderWidth: 1.5,
    borderColor: '#FFF2A8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  muFooterBtnSaveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.6,
  },
  muSkillBarContainer: {
    backgroundColor: '#070A0F',
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#C5A059',
    padding: 10,
    marginBottom: 12,
  },
  muSkillBarTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFD700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  muSkillBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muSkillSlotFrame: {
    width: 42,
    height: 42,
    borderRadius: 2,
    backgroundColor: '#090C12',
    borderWidth: 1.5,
    borderTopColor: '#45556D',
    borderLeftColor: '#45556D',
    borderBottomColor: '#030508',
    borderRightColor: '#030508',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  muSkillSlotSelected: {
    borderColor: '#FFC107',
    borderTopColor: '#FFE082',
    borderLeftColor: '#FFE082',
    borderBottomColor: '#FF8F00',
    borderRightColor: '#FF8F00',
    shadowColor: '#FFC107',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 6,
  },
  muSkillSlotEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: '#040609',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muSkillSlotEmptyInner: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderColor: '#18202B',
  },
  muInvZenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  muInvZenBox: {
    flex: 1,
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  muInvZenVal: {
    fontSize: 20,
    fontWeight: '900',
    color: THEME.colors.jade,
    letterSpacing: 1,
  },
});
