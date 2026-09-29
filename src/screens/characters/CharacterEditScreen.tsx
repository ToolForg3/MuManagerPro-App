import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  StatusBar,
  Switch,
  Image,
  ImageBackground,
  Modal,
  FlatList,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MuIcon } from '../../components/ui/MuIcon';
import { useRoute, useNavigation } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { BotonOro } from '../../components/ui/BotonOro';
import { MuButton } from '../../components/ui/MuButton';
import { Panel } from '../../components/ui/Panel';
import { MuCornerOrnaments } from '../../components/ui/MuCornerOrnaments';
import { MuSideMoldings } from '../../components/ui/MuSideMoldings';
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
  const [levelModalVisible, setLevelModalVisible] = useState(false);
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
  const [hasUnsavedInventory, setHasUnsavedInventory] = useState(false);
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
  const [isDeletingChar, setIsDeletingChar] = useState(false);
  const [isCharacterOnline, setIsCharacterOnline] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);

  const checkLiveOnlineStatus = useCallback(async (silent: boolean = false) => {
    const acc = (character?.AccountID || '').trim();
    if (!acc && !charName) return;
    if (!silent) setIsCheckingStatus(true);
    try {
      const online = await SqlClient.isAccountConnected(acc, charName);
      setIsCharacterOnline(online);
      if (character && character.ConnectStat !== (online ? 1 : 0)) {
        setCharacter(prev => prev ? { ...prev, ConnectStat: online ? 1 : 0 } : prev);
      }
    } catch (err) {
      console.warn('Error checking live status:', err);
    } finally {
      if (!silent) setIsCheckingStatus(false);
    }
  }, [character, charName]);

  // Sondeo liviano del estado de conexión cada 4 segundos (sin recargar inventario ni inputs)
  useEffect(() => {
    if (!charName) return;
    const interval = setInterval(() => {
      checkLiveOnlineStatus(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [charName, checkLiveOnlineStatus]);
  const [editorLockWarning, setEditorLockWarning] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (charName) {
      loadCharacter();
      // Adquirir candado suave multi-admin para este personaje
      SqlClient.acquireEditorLock(`Character:${charName}`).then((res) => {
        if (isMounted && res && res.locked && res.holder) {
          setEditorLockWarning(`[AVISO] ${charName} está siendo editado por ${res.holder} hace ${res.elapsedSec || 0}s`);
        }
      }).catch(() => {});
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
      if (charName) {
        SqlClient.releaseEditorLock(`Character:${charName}`).catch(() => {});
      }
    };
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
        setIsCharacterOnline(data.ConnectStat === 1);
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
        if (data.Inventory) {
          if (!silent) {
            const items = MuItemParser.parseInventory(data.Inventory);
            setParsedItems(items);
            setHasUnsavedInventory(false);
          } else {
            setParsedItems((currentItems) => {
              const hasModifications = hasUnsavedInventory || currentItems.some(i => i.isModified);
              if (hasModifications || modalVisible || pickerVisible || actionModalVisible || saving) {
                // Proteger cambios locales no guardados: NO sobreescribir con SQL en refresco silencioso
                return currentItems;
              }
              return MuItemParser.parseInventory(data.Inventory);
            });
          }
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

  const promptDeleteCurrentCharacter = () => {
    if (!charName) return;
    Alert.alert(
      'Eliminar Personaje',
      `¿Estás seguro de que deseas eliminar permanentemente a "${charName}"?\n\nEsta acción borrará al personaje de la base de datos, limpiará su slot en la cuenta "${character?.AccountID || ''}" y eliminará su inventario, misiones y habilidades.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => performDeleteCurrentCharacter(false),
        },
      ]
    );
  };

  const performDeleteCurrentCharacter = async (forceOnline: boolean = false) => {
    if (!charName) return;
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Eliminación de Personajes',
        () => setLicenseModalVisible(true),
        'La eliminación de personajes en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
    setIsDeletingChar(true);
    try {
      const res = await SqlClient.deleteCharacter(charName, character?.AccountID, forceOnline);
      if (!res.success) {
        if (res.message && res.message.includes('ONLINE_WARNING')) {
          Alert.alert(
            '[AVISO] Personaje Conectado',
            `El personaje "${charName}" o su cuenta se encuentra actualmente ONLINE en el servidor de juego.\n\nEliminarlo mientras juega puede causar desincronización en la memoria del GameServer.\n\n¿Deseas forzar la eliminación de todos modos?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Forzar Eliminación',
                style: 'destructive',
                onPress: () => performDeleteCurrentCharacter(true),
              },
            ]
          );
        } else {
          Alert.alert('Error', res.message || 'No se pudo eliminar el personaje.');
        }
        return;
      }

      Alert.alert('Éxito', `El personaje "${charName}" ha sido eliminado correctamente.`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error inesperado al eliminar el personaje.');
    } finally {
      setIsDeletingChar(false);
    }
  };

  // Auto-refresco en vivo del inventario y estado del personaje (cada 15 segundos)
  useEffect(() => {
    if (!charName || activeTab !== 'Inventario') return;

    const timer = setInterval(() => {
      const hasUnsaved = hasUnsavedInventory || parsedItems.some(i => i.isModified);
      if (!hasUnsaved && !modalVisible && !pickerVisible && !actionModalVisible && !saving && !isRefreshing) {
        loadCharacter(true);
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [charName, activeTab, modalVisible, pickerVisible, actionModalVisible, saving, isRefreshing, hasUnsavedInventory, parsedItems]);

  const [movingLocation, setMovingLocation] = useState(false);

  /**
   * Helper para verificar si la cuenta del personaje está en línea.
   * Si está conectada, muestra alerta ofreciendo "Desconectar y Continuar".
   * Si está desconectada, ejecuta la acción de guardado directamente.
   */
  const executeWithOnlineCheck = useCallback(async (
    actionName: string,
    actionFn: (forceOnline?: boolean) => Promise<void>
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
          'Desconexión Requerida para Guardar',
          `El personaje "${charName}" ${accountId ? `(Cuenta: "${accountId}")` : ''} está actualmente CONECTADO en el servidor de juego.\n\n[SEGURIDAD]: Mientras el personaje esté dentro del juego, el GameServer controla los datos en la memoria RAM del GameServer y SOBREESCRIBIRÁ tus modificaciones tan pronto como el jugador camine, cambie de mapa o desconecte.\n\nPara guardar cambios en ${actionName.toLowerCase()}, el jugador debe salir a la pantalla de selección de personajes ("Cambiar de Personaje") o cerrar el juego.\n\n[NOTA]: Tus modificaciones permanecen intactas en la pantalla; no se perderán. Presiona "${actionName}" nuevamente en cuanto el jugador haya salido.`,
          [
            {
              text: 'Esperar a que salga',
              style: 'cancel',
            },
            {
              text: 'Liberar Traba SQL',
              onPress: async () => {
                setSaving(true);
                try {
                  const discRes = await SqlClient.disconnectAccount(accountId, charName);
                  if (discRes.success) {
                    if (character) {
                      setCharacter({ ...character, ConnectStat: 0 });
                    }
                    // Si el jugador ya había cerrado el juego y era una traba zombi, guardar inmediatamente
                    await actionFn(true);
                  } else {
                    Alert.alert('Aviso', discRes.message || 'No se pudo actualizar el estado en SQL.');
                  }
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Error al guardar tras liberar traba SQL.');
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

    await actionFn(false);
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
      const origLevel = character?.cLevel ?? 0;
      const origRuud = character?.Ruud !== undefined ? character.Ruud : 0;
      const origMLevel = character?.MasterLevel ?? 0;
      const origMPoints = character?.MasterPoint ?? 0;
      const origFruit = character?.FruitPoint ?? 0;

      if (numLevel !== origLevel) {
        LicenseService.alertProRequired(
          'Modificación de Nivel',
          () => setLicenseModalVisible(true),
          'En versión DEMO la modificación de Nivel está restringida. Para editar o asignar el nivel de personajes se requiere una Licencia PRO activa.'
        );
        return;
      }

      if (numRuud !== origRuud) {
        LicenseService.alertProRequired(
          'Modificación de Ruud',
          () => setLicenseModalVisible(true),
          'En versión DEMO la modificación de Ruud está restringida. Para editar y asignar Ruud se requiere una Licencia PRO activa.'
        );
        return;
      }

      if (numMLevel !== origMLevel || numMPoints !== origMPoints) {
        LicenseService.alertProRequired(
          'Master Level y Puntos',
          () => setLicenseModalVisible(true),
          'En versión DEMO la edición de Master Level y Master Points está restringida. Para modificar estos valores se requiere una Licencia PRO activa.'
        );
        return;
      }

      if (numFruit !== origFruit) {
        LicenseService.alertProRequired(
          'Puntos de Fruta',
          () => setLicenseModalVisible(true),
          'En versión DEMO la edición de Puntos de Fruta está restringida. Para modificar puntos de fruta se requiere una Licencia PRO activa.'
        );
        return;
      }

      if (numStr > 1000 || numAgi > 1000 || numVit > 1000 || numEne > 1000 || numCmd > 1000 || numLvlPoints > 1000) {
        LicenseService.alertProRequired(
          'Límite de Estadísticas',
          () => setLicenseModalVisible(true),
          'En versión DEMO las estadísticas y puntos están limitados a un máximo de 1000 puntos por atributo. Para asignar más puntos se requiere una Licencia PRO activa.'
        );
        return;
      }
      if (numZen > 10000000) {
        LicenseService.alertProRequired(
          'Límite de Zen',
          () => setLicenseModalVisible(true),
          'En versión DEMO el Zen máximo permitido es 10,000,000. Para asignar más Zen se requiere una Licencia PRO activa.'
        );
        return;
      }
    }

    setSaving(true);
    try {
      const isDemo = LicenseService.isDemo();
      const statsPayload = isDemo
        ? {
            STR: numStr,
            AGI: numAgi,
            VIT: numVit,
            ENE: numEne,
            CMD: numCmd,
            Zen: numZen,
            Points: numLvlPoints,
            CtlCode: isGm ? 32 : (isBanned ? 1 : 0),
          }
        : {
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
          };

      const res = await SqlClient.updateCharacterStats(charName, statsPayload);
      if (res.success) {
        setCharacter({
          ...character,
          Strength: numStr,
          Dexterity: numAgi,
          Vitality: numVit,
          Energy: numEne,
          Leadership: numCmd,
          Money: numZen,
          LevelUpPoint: numLvlPoints,
          CtlCode: isGm ? 32 : (isBanned ? 1 : 0),
          ...(isDemo ? {} : {
            Ruud: numRuud,
            cLevel: numLevel,
            MasterLevel: numMLevel,
            MasterPoint: numMPoints,
            FruitPoint: numFruit,
          }),
        });
        Alert.alert('Éxito', res.message);
      } else {
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Modificación de Estadísticas', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error', res.message);
        }
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
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Guardado de Ubicación',
        () => setLicenseModalVisible(true),
        'El traslado y cambio de ubicación de personajes con SQL Server requiere una Licencia PRO activa.'
      );
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Guardado de Ubicación', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error', res.message);
        }
      }
    } finally {
      setMovingLocation(false);
    }
  }, [character, loadError, mapNumber, mapX, mapY, charName]);

  const handleSaveLocation = useCallback((customMap?: number, customX?: number, customY?: number) => {
    executeWithOnlineCheck('Guardar Ubicación', () => doSaveLocation(customMap, customX, customY));
  }, [executeWithOnlineCheck, doSaveLocation]);

  const handleMoveToLorencia = () => handleSaveLocation(0, 125, 125);

  const doSaveInventory = async (forceOnline: boolean = false) => {
    // Hallazgo 8: Impedir guardado si el personaje no está cargado
    if (!character || loadError) {
      Alert.alert('Error', 'No es posible guardar el inventario: el personaje no se cargó correctamente.');
      return;
    }

    // Security check: Demo restriction for saving inventory
    if (!LicenseService.canSaveInventory()) {
      LicenseService.alertProRequired(
        'Guardado de Inventario',
        () => setLicenseModalVisible(true),
        'El guardado y sincronización de inventarios (108 slots) con SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }

    setSaving(true);
    try {
      const targetSlots = INVENTORY_CONSTANTS.TOTAL_SEASON6_SLOTS;
      const newHex = MuItemParser.rebuildInventoryHex(parsedItems, targetSlots, character?.Inventory);
      const res = await SqlClient.updateCharacterInventory(charName, newHex, forceOnline);
      if (res.success) {
        // Hallazgo 7: Actualizar la referencia original del inventario para futuras operaciones
        setParsedItems(prev => prev.map(item => ({ ...item, isModified: false })));
        setHasUnsavedInventory(false);
        setCharacter({ ...character, Inventory: newHex, ConnectStat: forceOnline ? 0 : character.ConnectStat });
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
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Desbloqueo de Mochilas',
        () => setLicenseModalVisible(true),
        'El desbloqueo de mochilas extendidas y Tienda Personal con SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
    setUnlockingExt(true);
    try {
      const res = await SqlClient.unlockCharacterExtensions(charName);
      if (res.success) {
        Alert.alert('Mochilas y Tienda Personal', res.message);
      } else {
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Desbloqueo de Mochilas', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error', res.message);
        }
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
            setHasUnsavedInventory(true);
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
    setHasUnsavedInventory(true);

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
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Progreso del Personaje',
        () => setLicenseModalVisible(true),
        'La modificación de resets, nivel master y estado PK en SQL Server requiere una Licencia PRO activa.'
      );
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
      const numLevel = Math.max(1, Math.min(400, parseInt(level, 10) || 1));

      const res = await SqlClient.updateCharacterProgress(charName, {
        resets: numResets,
        masterResets: numMResets,
        masterLevel: numMLevel,
        masterPoints: numMPoints,
        pkLevel,
        pkCount: numPkCount,
        pkTime: numPkTime,
        level: numLevel,
      });

      if (res.success) {
        setCharacter({
          ...character,
          cLevel: numLevel,
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Progreso del Personaje', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error', res.message);
        }
      }
    } finally {
      setSavingProgress(false);
    }
  }, [character, loadError, level, resets, mResets, mLevel, mPoints, pkCount, pkTime, pkLevel, charName]);

  const handleSaveProgress = useCallback(() => {
    executeWithOnlineCheck('Guardar Progreso', doSaveProgress);
  }, [executeWithOnlineCheck, doSaveProgress]);

  const doSaveQuest = async () => {
    if (!character || loadError) {
      Alert.alert('Error', 'No se pueden guardar misiones: el personaje no se cargó correctamente.');
      return;
    }
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Evolución de Clase y Misiones',
        () => setLicenseModalVisible(true),
        'La modificación de quests y evolución de clase en SQL Server requiere una Licencia PRO activa.'
      );
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Evolución de Clase y Misiones', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error', res.message);
        }
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
    setHasUnsavedInventory(true);
  };

  const handleItemDelete = (slotIdx: number) => {
    setParsedItems(parsedItems.filter((i) => i.slot !== slotIdx));
    setHasUnsavedInventory(true);
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
    setHasUnsavedInventory(true);
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
    setHasUnsavedInventory(true);
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
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Guardado de Habilidades',
        () => setLicenseModalVisible(true),
        'El guardado y sincronización de habilidades con SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Guardado de Habilidades', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error', res.message || 'No se pudieron guardar las habilidades.');
        }
      }
    } catch (err: any) {
      if (LicenseService.isLicenseError(err)) {
        LicenseService.alertProRequired('Guardado de Habilidades', () => setLicenseModalVisible(true), err.message);
      } else {
        Alert.alert('Error de conexión', err.message || 'Fallo al comunicarse con SQL Server.');
      }
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
        <MuIcon name="alert-circle-outline" size={48} color={THEME.colors.dangerRed} />
        <Text style={[styles.loadingText, { color: THEME.colors.dangerRed, marginTop: 12, textAlign: 'center' }]}>
          {loadError}
        </Text>
        <BotonOro
          titulo="Reintentar Carga"
          onPress={loadCharacter}
          altura={48}
          style={{ marginTop: 20, paddingHorizontal: 24 }}
        />
      </View>
    );
  }

  const classInfo = getMuClassInfo(character?.Class || 0);

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={styles.container}
      imageStyle={{ opacity: 0.50 }}
      resizeMode="repeat"
    >
      {/* Header Gótico Táctico NewUI (Stitch 03/16R) */}
      <View style={[styles.stitchHeaderBar, { paddingTop: topInset + 4 }]}>
        <View style={styles.stitchHeaderContent}>
          {/* Botón Volver NewUI Season 6 */}
          <TouchableOpacity
            style={styles.stitchBackBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            accessibilityLabel="Volver a lista de personajes"
          >
            <MuIcon name="arrow-left" size={16} color={THEME.colors.oroClaro} />
            <Text style={styles.stitchBackBtnText}>VOLVER</Text>
          </TouchableOpacity>

          {/* Avatar de Clase MU */}
          <View style={styles.stitchHeaderAvatarWrap}>
            <ClassAvatar classId={character?.Class || 0} size={34} />
          </View>

          {/* Avatar y Datos del Personaje */}
          <View style={styles.stitchHeaderCenter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.stitchHeaderName} numberOfLines={1}>
                {character?.Name}
              </Text>
              <View
                style={[
                  styles.stitchHeaderStatusBadge,
                  isCharacterOnline ? styles.stitchHeaderStatusOnline : styles.stitchHeaderStatusOffline,
                ]}
              >
                <Text
                  style={[
                    styles.stitchHeaderStatusBadgeText,
                    { color: isCharacterOnline ? THEME.colors.brasa : THEME.colors.jade },
                  ]}
                >
                  {isCharacterOnline ? 'ONLINE' : 'OFFLINE'}
                </Text>
              </View>
              {/* Badge PK con sprite Stitch */}
              <View style={styles.stitchHeaderPkBadge}>
                <Image
                  source={STITCH_ASSETS.sprites.pkEmblem}
                  style={styles.stitchHeaderPkIcon}
                  resizeMode="contain"
                />
                <Text style={styles.stitchHeaderPkText}>PK {pkCount || '0'}</Text>
              </View>
            </View>
            <Text style={styles.stitchHeaderSubtitle} numberOfLines={1}>
              {classInfo.name} • Lv {level} ({(character?.ResetCount ?? 0)}R)
            </Text>
          </View>

          {/* Botones SYNC y BORRAR */}
          <View style={styles.stitchHeaderRightActions}>
            <MuButton
              titulo="SYNC"
              icono="refresh"
              variante="primary"
              compacto={true}
              altura={36}
              onPress={() => loadCharacter(true)}
              disabled={isRefreshing}
              cargando={isRefreshing}
              accessibilityLabel="Sincronizar Datos"
            />
            <MuButton
              titulo="BORRAR"
              icono="close"
              variante="danger"
              compacto={true}
              altura={36}
              onPress={promptDeleteCurrentCharacter}
              disabled={isDeletingChar}
              cargando={isDeletingChar}
              accessibilityLabel="Eliminar Personaje"
            />
          </View>
        </View>
      </View>

      {/* Indicador de Estado de Conexión en Vivo (Online / Offline) */}
      <TouchableOpacity
        style={[
          styles.connectionStatusBanner,
          isCharacterOnline ? styles.connectionStatusOnline : styles.connectionStatusOffline
        ]}
        activeOpacity={0.7}
        onPress={() => checkLiveOnlineStatus(false)}
      >
        <View
          style={[
            styles.statusDot,
            { backgroundColor: isCharacterOnline ? '#FF5252' : THEME.colors.jade }
          ]}
        />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusBannerTitle, { color: isCharacterOnline ? '#FF7043' : THEME.colors.jade }]}>
            {isCharacterOnline ? '[ONLINE] PERSONAJE EN JUEGO (EN LÍNEA)' : '[OFFLINE] DESCONECTADO • SEGURO'}
          </Text>
          <Text style={styles.statusBannerSubtitle}>
            {isCharacterOnline
              ? 'El jugador está conectado. Pídele salir a "Cambiar de Personaje" para guardar. Toca para re-verificar.'
              : 'El jugador está fuera del servidor. Puedes guardar cambios con total tranquilidad.'}
          </Text>
        </View>
        {isCheckingStatus ? (
          <ActivityIndicator size="small" color={isCharacterOnline ? '#FF7043' : THEME.colors.jade} />
        ) : (
          <MuIcon
            name={isCharacterOnline ? 'alert-circle-outline' : 'shield-check'}
            size={20}
            color={isCharacterOnline ? '#FF7043' : THEME.colors.jade}
          />
        )}
      </TouchableOpacity>

      {/* Banner de Aviso de Soft-Lock Colaborativo Multi-Admin */}
      {editorLockWarning ? (
        <View style={styles.lockWarningBanner}>
          <MuIcon name="shield-alert" size={18} color="#FFD54F" />
          <Text style={styles.lockWarningText}>{editorLockWarning}</Text>
          <TouchableOpacity onPress={() => setEditorLockWarning(null)}>
            <MuIcon name="close" size={16} color="#FFE082" />
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Barra de Sub-Navegación Táctica NewUI (Stitch 03/16R) */}
      <View style={styles.stitchSubNavWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stitchSubNavScroll}
        >
          {(['Stats', 'Progreso', 'Skills', 'Inventario', 'Ubicacion', 'Quest'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={styles.stitchSubNavBtnTouchable}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: isActive }}
              >
                <ImageBackground
                  source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                  style={styles.stitchSubNavBtnBg}
                  resizeMode="stretch"
                  imageStyle={{ borderRadius: 2 }}
                >
                  <Text
                    style={[
                      styles.stitchSubNavBtnText,
                      isActive && styles.stitchSubNavBtnTextActive,
                    ]}
                  >
                    {tab.toUpperCase()}
                  </Text>
                </ImageBackground>
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
              {/* Sección 1: MÉTRICAS CLAVE (Stitch 03) */}
              <View style={styles.stitchStatsSectionCard}>
                <MuCornerOrnaments size={12} />
                <View style={styles.stitchSectionHeader}>
                  <View style={styles.stitchSectionHeaderLeft}>
                    <Text style={styles.stitchGoldDiamond}>◆</Text>
                    <Text style={styles.stitchSectionTitle}>MÉTRICAS CLAVE</Text>
                  </View>
                  <Text style={styles.stitchSectionSubtag}>[Character]</Text>
                </View>
                <View style={styles.stitchGoldDividerLine} />

                {/* Cuadrícula de Métricas */}
                <View style={styles.stitchMetricsGrid}>
                  <TouchableOpacity
                    style={styles.stitchMetricBox}
                    onPress={() => setLevelModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.stitchMetricLabel}>LEVEL</Text>
                    <Text style={styles.stitchMetricValue}>{level}</Text>
                  </TouchableOpacity>

                  <View style={[styles.stitchMetricBox, styles.stitchMetricBoxHighlight]}>
                    <Text style={[styles.stitchMetricLabel, { color: THEME.colors.oroClaro }]}>POINT</Text>
                    <Text style={[styles.stitchMetricValue, { color: THEME.colors.oroClaro }]}>{lvlPoints}</Text>
                  </View>

                  <View style={styles.stitchMetricBox}>
                    <Text style={styles.stitchMetricLabel}>RESET</Text>
                    <Text style={styles.stitchMetricValue}>{resets}</Text>
                  </View>

                  <View style={styles.stitchMetricBox}>
                    <Text style={styles.stitchMetricLabel}>GRAN RESET</Text>
                    <Text style={styles.stitchMetricValue}>{mResets}</Text>
                  </View>

                  <View style={[styles.stitchMetricBox, { flex: 2 }]}>
                    <Text style={styles.stitchMetricLabel}>MASTER LEVEL</Text>
                    <Text style={styles.stitchMetricValue}>{mLevel}</Text>
                  </View>
                </View>

                {/* Botón Rápido +5000 Puntos Disponibles */}
                <MuButton
                  titulo="+5000 PUNTOS DISPONIBLES"
                  icono="plus-circle"
                  variante="primary"
                  altura={42}
                  onPress={() => handleQuickAddPoints(5000)}
                  accessibilityLabel="Agregar 5000 puntos libres"
                  style={{ marginTop: 10 }}
                />
              </View>

              {/* Sección 2: ATRIBUTOS BASE (Stitch 03) */}
              <View style={styles.stitchStatsSectionCard}>
                <MuCornerOrnaments size={12} />
                <View style={styles.stitchSectionHeader}>
                  <View style={styles.stitchSectionHeaderLeft}>
                    <Text style={styles.stitchGoldDiamond}>◆</Text>
                    <Text style={styles.stitchSectionTitle}>ATRIBUTOS BASE</Text>
                  </View>
                  <Text style={styles.stitchSectionSubtag}>[Stats]</Text>
                </View>
                <View style={styles.stitchGoldDividerLine} />

                {/* STR / Fuerza */}
                <View style={styles.stitchStatRowWrap}>
                  <View style={styles.stitchStatRecessedBox}>
                    <View style={styles.stitchStatInfoCol}>
                      <Text style={styles.stitchStatTag}>STR / FUERZA</Text>
                      <TextInput
                        style={styles.stitchStatInput}
                        value={str}
                        onChangeText={setStr}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.stitchPlus1000BtnTouchable}
                      onPress={() => handleQuickAddStat('str', 1000)}
                      activeOpacity={0.8}
                      accessibilityLabel="Agregar 1000 de Fuerza"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.stitchPlus1000BtnBg}
                        resizeMode="stretch"
                        imageStyle={{ borderRadius: 2 }}
                      >
                        <Text style={styles.stitchPlus1000Text}>+1000</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.stitchSubStatsBox}>
                    <Text style={styles.stitchSubStatCyan}>
                      Daño (índice): {minDmg}~{maxDmg} ({maxTotalDmg})
                    </Text>
                    <Text style={styles.stitchSubStatCyan}>
                      Índice de ataque: {attackRate}
                    </Text>
                  </View>
                </View>

                {/* AGI / Agilidad */}
                <View style={styles.stitchStatRowWrap}>
                  <View style={styles.stitchStatRecessedBox}>
                    <View style={styles.stitchStatInfoCol}>
                      <Text style={styles.stitchStatTag}>AGI / AGILIDAD</Text>
                      <TextInput
                        style={styles.stitchStatInput}
                        value={agi}
                        onChangeText={setAgi}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.stitchPlus1000BtnTouchable}
                      onPress={() => handleQuickAddStat('agi', 1000)}
                      activeOpacity={0.8}
                      accessibilityLabel="Agregar 1000 de Agilidad"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.stitchPlus1000BtnBg}
                        resizeMode="stretch"
                        imageStyle={{ borderRadius: 2 }}
                      >
                        <Text style={styles.stitchPlus1000Text}>+1000</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.stitchSubStatsBox}>
                    <Text style={styles.stitchSubStatWhite}>
                      Defensa: {defense} ({maxDefense}) • Vel. Ataque: {attackSpeed}
                    </Text>
                    <Text style={styles.stitchSubStatWhite}>
                      Índice de defensa: {defenseRate}
                    </Text>
                  </View>
                </View>

                {/* RES / Vitalidad */}
                <View style={styles.stitchStatRowWrap}>
                  <View style={styles.stitchStatRecessedBox}>
                    <View style={styles.stitchStatInfoCol}>
                      <Text style={styles.stitchStatTag}>RES / VITALIDAD</Text>
                      <TextInput
                        style={styles.stitchStatInput}
                        value={vit}
                        onChangeText={setVit}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.stitchPlus1000BtnTouchable}
                      onPress={() => handleQuickAddStat('vit', 1000)}
                      activeOpacity={0.8}
                      accessibilityLabel="Agregar 1000 de Vitalidad"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.stitchPlus1000BtnBg}
                        resizeMode="stretch"
                        imageStyle={{ borderRadius: 2 }}
                      >
                        <Text style={styles.stitchPlus1000Text}>+1000</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.stitchSubStatsBox}>
                    <Text style={styles.stitchSubStatWhite}>
                      HP Máximo: {maxHp} / {maxHp}
                    </Text>
                  </View>
                </View>

                {/* ENE / Energía */}
                <View style={styles.stitchStatRowWrap}>
                  <View style={styles.stitchStatRecessedBox}>
                    <View style={styles.stitchStatInfoCol}>
                      <Text style={styles.stitchStatTag}>ENE / ENERGÍA</Text>
                      <TextInput
                        style={styles.stitchStatInput}
                        value={ene}
                        onChangeText={setEne}
                        keyboardType="numeric"
                        maxLength={5}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.stitchPlus1000BtnTouchable}
                      onPress={() => handleQuickAddStat('ene', 1000)}
                      activeOpacity={0.8}
                      accessibilityLabel="Agregar 1000 de Energía"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.stitchPlus1000BtnBg}
                        resizeMode="stretch"
                        imageStyle={{ borderRadius: 2 }}
                      >
                        <Text style={styles.stitchPlus1000Text}>+1000</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.stitchSubStatsBox}>
                    <Text style={styles.stitchSubStatWhite}>
                      Mana: {maxMana} / {maxMana} • Daño Habilidad: {skillDmg}%
                    </Text>
                  </View>
                </View>

                {/* CMD / Comando (Dark Lord) */}
                {isDarkLord && (
                  <View style={styles.stitchStatRowWrap}>
                    <View style={styles.stitchStatRecessedBox}>
                      <View style={styles.stitchStatInfoCol}>
                        <Text style={styles.stitchStatTag}>CMD / COMANDO</Text>
                        <TextInput
                          style={styles.stitchStatInput}
                          value={cmd}
                          onChangeText={setCmd}
                          keyboardType="numeric"
                          maxLength={5}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.stitchPlus1000BtnTouchable}
                        onPress={() => handleQuickAddStat('cmd', 1000)}
                        activeOpacity={0.8}
                        accessibilityLabel="Agregar 1000 de Comando"
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.tabs.tabModeInactive}
                          style={styles.stitchPlus1000BtnBg}
                          resizeMode="stretch"
                          imageStyle={{ borderRadius: 2 }}
                        >
                          <Text style={styles.stitchPlus1000Text}>+1000</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.stitchSubStatsBox}>
                      <Text style={styles.stitchSubStatWhite}>
                        Fuerza Caballo / Cuervo: +{Math.floor(numCmd / 10)}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Sección 3: MONEDAS / DIVISAS (Stitch 03) */}
              <View style={styles.stitchStatsSectionCard}>
                <MuCornerOrnaments size={12} />
                <View style={styles.stitchSectionHeader}>
                  <View style={styles.stitchSectionHeaderLeft}>
                    <MuIcon name="cash-multiple" size={14} color={THEME.colors.oroClaro} containerStyle={{ marginRight: 6 }} />
                    <Text style={styles.stitchSectionTitle}>MONEDAS / DIVISAS</Text>
                  </View>
                </View>
                <View style={styles.stitchGoldDividerLine} />
                <View style={styles.stitchCurrenciesGrid}>
                  <View style={styles.stitchCurrencyBox}>
                    <Text style={styles.stitchCurrencyLabel}>ZEN</Text>
                    <TextInput
                      style={styles.stitchCurrencyInput}
                      value={zen}
                      onChangeText={setZen}
                      keyboardType="numeric"
                    />
                  </View>
                  <View style={styles.stitchCurrencyBox}>
                    <Text style={[styles.stitchCurrencyLabel, { color: THEME.colors.arcano }]}>RUUD</Text>
                    <TextInput
                      style={[styles.stitchCurrencyInput, { color: THEME.colors.arcano }]}
                      value={ruud}
                      onChangeText={setRuud}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </View>

              {/* Sección 4: ATAJOS CLÁSICOS MU (Stitch 03) */}
              <View style={styles.stitchShortcutsCard}>
                <Text style={styles.stitchShortcutsLabel}>ATAJOS CLÁSICOS MU:</Text>
                <View style={styles.stitchShortcutsRow}>
                  <TouchableOpacity
                    style={styles.stitchShortcutKeyBtn}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.8}
                    accessibilityLabel="Atajo X Cash Shop"
                  >
                    <Image
                      source={STITCH_ASSETS.sprites.cashShop}
                      style={styles.stitchShortcutSpriteImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.stitchShortcutKeySub}>[X] SHOP</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stitchShortcutKeyBtn}
                    onPress={() => setActiveTab('Stats')}
                    activeOpacity={0.8}
                    accessibilityLabel="Atajo C Personaje"
                  >
                    <Image
                      source={STITCH_ASSETS.sprites.knightHelm}
                      style={styles.stitchShortcutSpriteImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.stitchShortcutKeySub}>[C] CHAR</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stitchShortcutKeyBtn}
                    onPress={() => setActiveTab('Skills')}
                    activeOpacity={0.8}
                    accessibilityLabel="Atajo P Party"
                  >
                    <Image
                      source={STITCH_ASSETS.sprites.party}
                      style={styles.stitchShortcutSpriteImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.stitchShortcutKeySub}>[P] PARTY</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stitchShortcutKeyBtn}
                    onPress={() => setActiveTab('Ubicacion')}
                    activeOpacity={0.8}
                    accessibilityLabel="Atajo M Move Map"
                  >
                    <Image
                      source={STITCH_ASSETS.sprites.warp}
                      style={styles.stitchShortcutSpriteImg}
                      resizeMode="contain"
                    />
                    <Text style={styles.stitchShortcutKeySub}>[M] MOVE</Text>
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
                      style={styles.subTabPillTouchable}
                      onPress={() => setActiveInvSubTab(sub.key as InventorySubTab)}
                      activeOpacity={0.8}
                    >
                      <ImageBackground
                        source={isCurrent ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.subTabPillBg}
                        resizeMode="stretch"
                        imageStyle={{ borderRadius: 2 }}
                      >
                        <MuIcon
                          name={sub.icon as any}
                          size={14}
                          color={isCurrent ? '#EFD28D' : THEME.colors.textoSecundarioLuminoso}
                        />
                        <Text style={[styles.subTabText, isCurrent && styles.subTabTextActive]}>
                          {sub.label}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}

                {/* Botón Manual de Sincronización Rápida con el Juego */}
                <TouchableOpacity
                  style={styles.subTabPillTouchable}
                  onPress={() => loadCharacter(true)}
                  disabled={isRefreshing}
                  activeOpacity={0.8}
                >
                  <ImageBackground
                    source={STITCH_ASSETS.tabs.tabModeInactive}
                    style={styles.subTabPillBg}
                    resizeMode="stretch"
                    imageStyle={{ borderRadius: 2 }}
                  >
                    <MuIcon
                      name="sync"
                      size={14}
                      color="#EFD28D"
                    />
                    <Text style={[styles.subTabText, { color: '#EFD28D', fontWeight: '700' }]}>
                      {isRefreshing ? 'Sincronizando...' : 'Refrescar'}
                    </Text>
                  </ImageBackground>
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
                  <View style={{ flexDirection: 'row', backgroundColor: '#111211', borderRadius: 2, padding: 2, borderWidth: 1, borderTopColor: '#141514', borderLeftColor: '#141514', borderRightColor: '#4A463F', borderBottomColor: '#4A463F' }}>
                    <TouchableOpacity
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 2,
                        backgroundColor: invGridMode === '32' ? '#26221A' : 'transparent',
                        borderWidth: invGridMode === '32' ? 1 : 0,
                        borderTopColor: '#EFD28D',
                        borderLeftColor: '#EFD28D',
                        borderRightColor: '#5C4A22',
                        borderBottomColor: '#5C4A22',
                      }}
                      onPress={() => setInvGridMode('32')}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: invGridMode === '32' ? '#EFD28D' : THEME.colors.textSecondary }}>32 Oficial</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 2,
                        backgroundColor: invGridMode === '64' ? '#26221A' : 'transparent',
                        borderWidth: invGridMode === '64' ? 1 : 0,
                        borderTopColor: '#EFD28D',
                        borderLeftColor: '#EFD28D',
                        borderRightColor: '#5C4A22',
                        borderBottomColor: '#5C4A22',
                      }}
                      onPress={() => setInvGridMode('64')}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '800', color: invGridMode === '64' ? '#EFD28D' : THEME.colors.textSecondary }}>64 Exp.</Text>
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
                    <MuButton
                      titulo={unlockingExt ? 'Desbloqueando...' : 'Desbloquear en Juego'}
                      icono="lock-open-variant-outline"
                      variante="primary"
                      compacto
                      altura={32}
                      onPress={handleUnlockExtensions}
                      disabled={unlockingExt}
                    />
                  </View>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 10, marginTop: 3 }}>
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
                    <MuButton
                      titulo={unlockingExt ? 'Desbloqueando...' : 'Desbloquear en Juego'}
                      icono="lock-open-variant-outline"
                      variante="primary"
                      compacto
                      altura={32}
                      onPress={handleUnlockExtensions}
                      disabled={unlockingExt}
                    />
                  </View>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 10, marginTop: 3 }}>
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
                    <MuButton
                      titulo="Liberar Candado"
                      icono="lock-open-outline"
                      variante="primary"
                      compacto
                      altura={32}
                      onPress={handleUnlockExtensions}
                      disabled={unlockingExt}
                    />
                    <MuButton
                      titulo="Vaciar Store"
                      icono="trash-can-outline"
                      variante="danger"
                      compacto
                      altura={32}
                      onPress={handleClearStore}
                    />
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
            <Panel style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.cardTitle}>RESETS Y MASTER LEVEL</Text>
                <MuButton
                  titulo="PK CLEAR"
                  icono="broom"
                  variante="success"
                  compacto
                  altura={32}
                  onPress={handleQuickPkClear}
                />
              </View>

              {/* Nivel Base (cLevel) */}
              <View style={[styles.fieldCol, { marginBottom: 12 }]}>
                <Text style={styles.fieldLabel}>Nivel Base (cLevel: 1 - 400)</Text>
                <View style={styles.inputStepperRow}>
                  <TextInput
                    style={[styles.fieldInput, { flex: 1, color: THEME.colors.oroClaro }]}
                    value={level}
                    onChangeText={(txt) => {
                      const num = parseInt(txt.replace(/[^0-9]/g, ''), 10);
                      if (isNaN(num)) setLevel('');
                      else setLevel(String(Math.max(1, Math.min(400, num))));
                    }}
                    keyboardType="numeric"
                  />
                  <TouchableOpacity
                    style={styles.stepperSmallBtnTouchable}
                    onPress={() => setLevel(String(Math.max(1, (parseInt(level, 10) || 1) - 1)))}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={styles.stepperSmallBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={styles.stepperText}>-</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.stepperSmallBtnTouchable}
                    onPress={() => setLevel(String(Math.min(400, (parseInt(level, 10) || 1) + 1)))}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={styles.stepperSmallBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={styles.stepperText}>+</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
                <View style={styles.quickStepRow}>
                  <TouchableOpacity
                    style={styles.quickStepBtnTouchable}
                    onPress={() => setLevel('1')}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.quickStepBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={styles.quickStepText}>Nv 1</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStepBtnTouchable}
                    onPress={() => setLevel('220')}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.quickStepBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={styles.quickStepText}>Nv 220</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStepBtnTouchable}
                    onPress={() => setLevel('380')}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.quickStepBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={styles.quickStepText}>Nv 380</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickStepBtnTouchable}
                    onPress={() => setLevel('400')}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeActive}
                      style={styles.quickStepBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={[styles.quickStepText, { color: THEME.colors.oroClaro }]}>Nv 400 (MAX)</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
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
                      style={styles.stepperSmallBtnTouchable}
                      onPress={() => setResets(String(Math.max(0, (parseInt(resets, 10) || 0) - 1)))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={styles.stepperSmallBtnBg}
                        resizeMode="stretch"
                      >
                        <Text style={styles.stepperText}>-</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperSmallBtnTouchable}
                      onPress={() => setResets(String((parseInt(resets, 10) || 0) + 1))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={styles.stepperSmallBtnBg}
                        resizeMode="stretch"
                      >
                        <Text style={styles.stepperText}>+</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.quickStepRow}>
                    <TouchableOpacity
                      style={styles.quickStepBtnTouchable}
                      onPress={() => setResets(String((parseInt(resets, 10) || 0) + 10))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.quickStepBtnBg}
                        resizeMode="stretch"
                      >
                        <Text style={styles.quickStepText}>+10</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.quickStepBtnTouchable}
                      onPress={() => setResets(String((parseInt(resets, 10) || 0) + 100))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.quickStepBtnBg}
                        resizeMode="stretch"
                      >
                        <Text style={styles.quickStepText}>+100</Text>
                      </ImageBackground>
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
                      style={styles.stepperSmallBtnTouchable}
                      onPress={() => setMResets(String(Math.max(0, (parseInt(mResets, 10) || 0) - 1)))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={styles.stepperSmallBtnBg}
                        resizeMode="stretch"
                      >
                        <Text style={styles.stepperText}>-</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.stepperSmallBtnTouchable}
                      onPress={() => setMResets(String((parseInt(mResets, 10) || 0) + 1))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={styles.stepperSmallBtnBg}
                        resizeMode="stretch"
                      >
                        <Text style={styles.stepperText}>+</Text>
                      </ImageBackground>
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
                  { level: 1, label: 'Héroe 2', color: THEME.colors.arcano, bg: 'rgba(91, 141, 239, 0.2)' },
                  { level: 2, label: 'Héroe 1', color: THEME.colors.arcano, bg: 'rgba(91, 141, 239, 0.2)' },
                  { level: 3, label: 'Común (3)', color: THEME.colors.oroClaro, bg: 'rgba(232, 200, 106, 0.2)' },
                  { level: 4, label: 'Warning (4)', color: THEME.colors.brasa, bg: 'rgba(226, 112, 58, 0.2)' },
                  { level: 5, label: 'Asesino (5)', color: '#FF7043', bg: 'rgba(255, 112, 67, 0.2)' },
                  { level: 6, label: 'Phono (6)', color: '#FF5252', bg: 'rgba(255, 82, 82, 0.25)' },
                ].map((pk) => {
                  const isSelected = pkLevel === pk.level;
                  return (
                    <TouchableOpacity
                      key={pk.level}
                      style={styles.pkPillTouchable}
                      onPress={() => setPkLevel(pk.level)}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.pkPillBg}
                        resizeMode="stretch"
                      >
                        <Text
                          style={[
                            styles.pkPillText,
                            isSelected && { color: pk.color, fontWeight: 'bold' }
                          ]}
                        >
                          {pk.label}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
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

              {/* Zona de Peligro: Eliminar Personaje */}
              <View style={styles.dangerZoneCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <MuIcon name="alert-octagon-outline" size={20} color="#FF5252" />
                  <Text style={styles.dangerZoneTitle}>Zona de Peligro</Text>
                </View>
                <Text style={styles.dangerZoneDesc}>
                  Eliminar permanentemente a "{charName}". Esta operación borrará stats, inventario, habilidades y desvinculará el slot de la cuenta "{character?.AccountID || ''}".
                </Text>
                <TouchableOpacity
                  style={styles.dangerDeleteBtnWrap}
                  onPress={promptDeleteCurrentCharacter}
                  disabled={isDeletingChar}
                  activeOpacity={0.8}
                  accessibilityLabel="Eliminar Personaje de SQL"
                >
                  {isDeletingChar ? (
                    <ActivityIndicator size="small" color="#FFD0D0" />
                  ) : (
                    <>
                      <MuIcon name="trash-can" size={18} color="#FF6B6B" />
                      <Text style={styles.dangerDeleteBtnText}>Eliminar Personaje de SQL</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </Panel>
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
            <Panel style={styles.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.cardTitle}>HABILIDADES (MAGICLIST)</Text>
                  <Text style={{ fontSize: 13, color: THEME.colors.textMuted, marginTop: 2 }}>
                    Ranuras: <Text style={{ color: THEME.colors.primaryOrange, fontWeight: 'bold' }}>{skills.length} / 60</Text> ocupadas
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <MuButton
                    titulo="Agregar"
                    icono="plus-circle-outline"
                    variante="primary"
                    compacto
                    altura={34}
                    onPress={() => {
                      setSkillSearchQuery('');
                      setSkillRaceFilter('ALL');
                      setAddSkillModalVisible(true);
                    }}
                  />
                  {skills.length > 0 && (
                    <MuButton
                      titulo="Vaciar"
                      icono="trash-can-outline"
                      variante="danger"
                      compacto
                      altura={34}
                      onPress={handleClearAllSkills}
                    />
                  )}
                </View>
              </View>
            </Panel>

            {/* Card 2: Envío Rápido por Raza */}
            <Panel style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <MuIcon name="flash" size={20} color={THEME.colors.primaryOrange} />
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
                      <MuIcon name={charPreset.icon as any} size={22} color="#FFF" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.quickRaceMainTitle}>
                        Cargar Skills Recomendadas de {charPreset.label}
                      </Text>
                      <Text style={styles.quickRaceMainSub}>
                        {charPreset.skillIds.length} habilidades nativas completas
                      </Text>
                    </View>
                    <MuIcon name="arrow-right-bold-circle" size={24} color={charPreset.color} />
                  </TouchableOpacity>
                );
              })()}

              {/* Selector de modo de envío (Reemplazar vs Agregar) */}
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10, paddingHorizontal: 4 }}>
                <Text style={{ fontSize: 12, color: THEME.colors.textSecondary, fontWeight: '600' }}>
                  Modo de envío:
                </Text>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.quickModeBtnTouchable}
                    onPress={() => setQuickSendMode('replace')}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={quickSendMode === 'replace' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.quickModeBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={[styles.quickModeBtnText, quickSendMode === 'replace' && styles.quickModeBtnTextActive]}>
                        Reemplazar
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickModeBtnTouchable}
                    onPress={() => setQuickSendMode('merge')}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={quickSendMode === 'merge' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.quickModeBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={[styles.quickModeBtnText, quickSendMode === 'merge' && styles.quickModeBtnTextActive]}>
                        Agregar (+)
                      </Text>
                    </ImageBackground>
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
                      style={styles.raceChipBtnTouchable}
                      onPress={() => handleQuickSendSkills(key)}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.raceChipBtnBg}
                        resizeMode="stretch"
                      >
                        <MuIcon name={p.icon as any} size={14} color={p.color} />
                        <Text style={styles.raceChipText}>{p.code}</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Panel>

            {/* Card 3: Lista de Habilidades Actuales */}
            <Panel style={styles.card}>
              <Text style={styles.cardTitle}>HABILIDADES ACTIVAS ({skills.length})</Text>

              {skills.length === 0 ? (
                <View style={styles.emptySkillsContainer}>
                  <MuIcon name="book-open-blank-variant" size={44} color={THEME.colors.textMuted} />
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
                        <MuIcon name="trash-can-outline" size={18} color="#FF5252" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </Panel>
          </View>
        )}

        {/* ================= TAB 4: UBICACION ================= */}
        {activeTab === 'Ubicacion' && (
          <View style={styles.tabContent}>
            <Panel style={styles.card}>
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
                    style={styles.teleportBtnTouchable}
                    onPress={() => handleSaveLocation(tp.map, tp.x, tp.y)}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.teleportBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={styles.teleportBtnText}>{tp.name}</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </View>
            </Panel>
          </View>
        )}

        {/* ================= TAB 5: QUEST ================= */}
        {activeTab === 'Quest' && (
          <View style={styles.tabContent}>
            <Panel style={styles.card}>
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
                                style={{ width: 22, height: 22, borderRadius: 11 /* círculo funcional: clip de portrait de raza */ }}
                                resizeMode="cover"
                              />
                            ) : (
                              <MuIcon
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
                              <MuIcon name="check" size={14} color={race.accentColor} />
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
                            <View style={{ width: 34, height: 34, borderRadius: 17 /* círculo funcional: clip de portrait de evolución */, overflow: 'hidden', borderWidth: 1.5, borderColor: isSelected ? THEME.colors.primaryOrange : THEME.colors.border }}>
                              <Image
                                source={racePortrait}
                                style={{ width: 34, height: 34 }}
                                resizeMode="cover"
                              />
                            </View>
                          ) : (
                            <MuIcon
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
                            <MuIcon name="check-circle" size={20} color={THEME.colors.primaryOrange} />
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
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Completar Todas"
                    icono="star-shooting"
                    variante="success"
                    altura={42}
                    onPress={handleCompleteAllQuests}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Reiniciar"
                    icono="restart"
                    variante="danger"
                    altura={42}
                    onPress={handleResetAllQuests}
                  />
                </View>
              </View>
            </Panel>
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
                <MuIcon name="close" size={22} color="#FFF" />
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
                ].map((f) => {
                  const isActive = skillRaceFilter === f.key;
                  return (
                    <TouchableOpacity
                      key={f.key}
                      style={styles.skillFilterChipTouchable}
                      onPress={() => setSkillRaceFilter(f.key)}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={styles.skillFilterChipBg}
                        resizeMode="stretch"
                      >
                        <Text
                          style={[
                            styles.skillFilterChipText,
                            isActive && styles.skillFilterChipTextActive,
                          ]}
                        >
                          {f.label}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Lista de habilidades filtradas */}
            <FlatList
              data={filteredCatalogSkills}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
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
                    <MuButton
                      titulo={alreadyAdded ? 'Añadida' : '+ Añadir'}
                      variante={alreadyAdded ? 'secondary' : 'primary'}
                      compacto
                      altura={32}
                      disabled={alreadyAdded}
                      onPress={() => !alreadyAdded && handleAddIndividualSkill(item)}
                    />
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

      {/* Modal de Edición Rápida de Nivel Base (cLevel) */}
      <Modal
        visible={levelModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLevelModalVisible(false)}
      >
        <View style={styles.levelModalOverlay}>
          <View style={styles.levelModalContent}>
            {/* Header */}
            <View style={styles.levelModalHeader}>
              <View>
                <Text style={styles.levelModalTitle}>EDITAR NIVEL BASE (cLevel)</Text>
                <Text style={styles.levelModalSubtitle}>
                  Personaje: <Text style={{ color: THEME.colors.oroClaro, fontWeight: 'bold' }}>{character?.Name || charName}</Text> • Rango: 1 - 400
                </Text>
              </View>
              <TouchableOpacity
                style={styles.levelModalCloseBtn}
                onPress={() => setLevelModalVisible(false)}
                activeOpacity={0.7}
              >
                <MuIcon name="close" size={20} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            {/* Presets Rápidos */}
            <View style={styles.levelModalQuickRow}>
              {[
                { val: '1', label: 'Nv 1' },
                { val: '220', label: 'Nv 220' },
                { val: '380', label: 'Nv 380' },
                { val: '400', label: 'Nv 400 (MAX)' },
              ].map((p) => {
                const isActive = level === p.val;
                return (
                  <TouchableOpacity
                    key={p.val}
                    style={styles.levelModalQuickBtnTouchable}
                    onPress={() => setLevel(p.val)}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                      style={styles.levelModalQuickBtnBg}
                      resizeMode="stretch"
                    >
                      <Text style={[styles.levelModalQuickText, isActive && styles.levelModalQuickTextActive]}>
                        {p.label}
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Stepper e Input Centrado */}
            <View style={styles.levelModalStepperRow}>
              <TouchableOpacity
                style={styles.levelModalStepBtnTouchable}
                onPress={() => setLevel(String(Math.max(1, (parseInt(level, 10) || 1) - 10)))}
                activeOpacity={0.7}
              >
                <ImageBackground
                  source={STITCH_ASSETS.buttons.small}
                  style={styles.levelModalStepBtnBg}
                  resizeMode="stretch"
                >
                  <Text style={styles.levelModalStepBtnText}>-10</Text>
                </ImageBackground>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.levelModalStepBtnTouchable}
                onPress={() => setLevel(String(Math.max(1, (parseInt(level, 10) || 1) - 1)))}
                activeOpacity={0.7}
              >
                <ImageBackground
                  source={STITCH_ASSETS.buttons.small}
                  style={styles.levelModalStepBtnBg}
                  resizeMode="stretch"
                >
                  <Text style={styles.levelModalStepBtnText}>-1</Text>
                </ImageBackground>
              </TouchableOpacity>

              <TextInput
                style={styles.levelModalInput}
                value={level}
                onChangeText={(txt) => {
                  const num = parseInt(txt.replace(/[^0-9]/g, ''), 10);
                  if (isNaN(num)) setLevel('');
                  else setLevel(String(Math.max(1, Math.min(400, num))));
                }}
                keyboardType="numeric"
                selectTextOnFocus
                maxLength={3}
              />

              <TouchableOpacity
                style={styles.levelModalStepBtnTouchable}
                onPress={() => setLevel(String(Math.min(400, (parseInt(level, 10) || 1) + 1)))}
                activeOpacity={0.7}
              >
                <ImageBackground
                  source={STITCH_ASSETS.buttons.small}
                  style={styles.levelModalStepBtnBg}
                  resizeMode="stretch"
                >
                  <Text style={styles.levelModalStepBtnText}>+1</Text>
                </ImageBackground>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.levelModalStepBtnTouchable}
                onPress={() => setLevel(String(Math.min(400, (parseInt(level, 10) || 1) + 10)))}
                activeOpacity={0.7}
              >
                <ImageBackground
                  source={STITCH_ASSETS.buttons.small}
                  style={styles.levelModalStepBtnBg}
                  resizeMode="stretch"
                >
                  <Text style={styles.levelModalStepBtnText}>+10</Text>
                </ImageBackground>
              </TouchableOpacity>
            </View>

            {/* Nota informativa Season 6 */}
            <Text style={styles.levelModalDesc}>
              El nivel base determina las fórmulas de ataque, defensa, evolución de clase y requerimientos de equipo (cLevel oficial: 1 a 400).
            </Text>

            {/* Acciones */}
            <View style={styles.levelModalFooterRow}>
              <MuButton
                titulo="Cerrar"
                variante="secondary"
                altura={42}
                onPress={() => setLevelModalVisible(false)}
              />
              <MuButton
                titulo="Guardar Nivel en SQL"
                icono="content-save"
                variante="primary"
                altura={42}
                disabled={savingProgress}
                onPress={() => {
                  setLevelModalVisible(false);
                  handleSaveProgress();
                }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* License Activation Modal */}
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
    backgroundColor: THEME.colors.background,
  },
  /* ================= STITCH 03/16R ESTILOS PERSONAJE ================= */
  stitchHeaderBar: {
    backgroundColor: '#131413',
    borderBottomWidth: 1,
    borderBottomColor: '#343534',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  stitchHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stitchBackBtn: {
    minHeight: 36,
    paddingHorizontal: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    backgroundColor: '#292A29',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  stitchBackBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
  },
  stitchHeaderAvatarWrap: {
    width: 38,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#E0C380',
    borderBottomColor: '#5C4A22',
    borderRightColor: '#5C4A22',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stitchHeaderPkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2A1314',
    borderWidth: 1,
    borderColor: '#93000A',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
    gap: 3,
  },
  stitchHeaderPkIcon: {
    width: 12,
    height: 12,
  },
  stitchHeaderPkText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFB4AB',
    fontFamily: THEME.typography.fontTitle,
  },
  stitchHeaderCenter: {
    flex: 1,
  },
  stitchHeaderName: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.5,
    ...THEME.effects.textShadow,
  },
  stitchHeaderStatusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
  },
  stitchHeaderStatusOnline: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderColor: THEME.colors.brasa,
  },
  stitchHeaderStatusOffline: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderColor: THEME.colors.jade,
  },
  stitchHeaderStatusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  stitchHeaderSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    color: THEME.colors.textoSecundarioLuminoso,
    marginTop: 2,
  },
  stitchHeaderRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stitchSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 2,
    backgroundColor: '#1F201F',
    borderWidth: 1,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#E0C380',
    borderBottomColor: '#5C4A22',
    borderRightColor: '#5C4A22',
  },
  stitchSyncBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
  },
  stitchDeleteCharBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 10,
    borderRadius: 2,
    backgroundColor: '#2A1314',
    borderWidth: 1,
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderBottomColor: '#5A1A1A',
    borderRightColor: '#5A1A1A',
  },
  stitchDeleteCharBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFB4AB',
  },
  stitchSubNavWrapper: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0D0E0D',
    borderBottomWidth: 1,
    borderBottomColor: '#2A2B2A',
  },
  stitchSubNavScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stitchSubNavBtnTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 44,
  },
  stitchSubNavBtnBg: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stitchSubNavBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.5,
    ...THEME.effects.textShadowSubtle,
  },
  stitchSubNavBtnTextActive: {
    color: '#EFD28D',
    fontWeight: '900',
    ...THEME.effects.textShadow,
  },
  stitchStatsSectionCard: {
    position: 'relative',
    backgroundColor: '#171817',
    borderRadius: 2,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#161716',
    borderRightColor: '#161716',
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  stitchSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stitchSectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stitchGoldDiamond: {
    fontSize: 12,
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
  },
  stitchSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.5,
  },
  stitchSectionSubtag: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textMuted,
  },
  stitchGoldDividerLine: {
    height: 1.5,
    backgroundColor: 'rgba(232, 200, 106, 0.4)',
    marginBottom: 10,
  },
  stitchMetricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  stitchMetricBox: {
    flex: 1,
    minWidth: 70,
    backgroundColor: '#090A09',
    borderRadius: 2,
    borderTopColor: '#161715',
    borderLeftColor: '#161715',
    borderBottomColor: '#3A3C38',
    borderRightColor: '#3A3C38',
    borderWidth: 1,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stitchMetricBoxHighlight: {
    borderTopColor: '#EFD28D',
    borderLeftColor: '#C4A65E',
    borderBottomColor: '#5C4A22',
    borderRightColor: '#5C4A22',
    borderWidth: 1.2,
  },
  stitchMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
  },
  stitchMetricValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#E4E2E0',
    marginTop: 2,
  },
  stitchQuickPointsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 2,
    backgroundColor: '#1E1F1E',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#C4A65E',
    borderBottomColor: '#5C4A22',
    borderRightColor: '#5C4A22',
    borderWidth: 1,
    shadowColor: '#EFD28D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  stitchQuickPointsSub: {
    fontSize: 9,
    fontWeight: '700',
    color: THEME.colors.textMuted,
  },
  stitchQuickPointsText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.5,
  },
  stitchQuickPointsArrow: {
    fontSize: 12,
    color: THEME.colors.oroClaro,
  },
  stitchStatRowWrap: {
    marginBottom: 10,
  },
  stitchStatRecessedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#090A09',
    borderRadius: 2,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderBottomColor: '#3A3C38',
    borderRightColor: '#3A3C38',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 4,
    height: 48,
  },
  stitchStatInfoCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stitchStatTag: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textoSecundario,
    width: 105,
  },
  stitchStatInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  stitchPlus1000Btn: {
    width: 68,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#252625',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#161716',
    borderRightColor: '#161716',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 2,
  },
  stitchPlus1000Bg: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stitchPlus1000Text: {
    fontSize: 12,
    fontWeight: '800',
    color: '#EFD28D',
    fontFamily: THEME.typography.fontTitle,
  },
  stitchSubStatsBox: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  stitchSubStatCyan: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.arcano,
  },
  stitchSubStatWhite: {
    fontSize: 10,
    fontWeight: '600',
    color: THEME.colors.textoSecundarioLuminoso,
  },
  stitchCurrenciesGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  stitchCurrencyBox: {
    flex: 1,
    backgroundColor: '#090A09',
    borderRadius: 2,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderBottomColor: '#3A3C38',
    borderRightColor: '#3A3C38',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.7,
    shadowRadius: 2,
  },
  stitchCurrencyLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
  },
  stitchCurrencyInput: {
    fontSize: 14,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
    paddingVertical: 4,
  },
  stitchShortcutsCard: {
    backgroundColor: '#161715',
    borderRadius: 2,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#161716',
    borderRightColor: '#161716',
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  stitchShortcutsLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    marginBottom: 6,
  },
  stitchShortcutsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  stitchShortcutKeyBtn: {
    flex: 1,
    minHeight: 50,
    borderRadius: 2,
    backgroundColor: '#1C1D1C',
    borderTopColor: '#4A4840',
    borderLeftColor: '#4A4840',
    borderBottomColor: '#121312',
    borderRightColor: '#121312',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
  },
  stitchShortcutKeyLetter: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
  },
  stitchShortcutKeySub: {
    fontSize: 8,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    textTransform: 'uppercase',
    marginTop: 2,
  },
  stitchShortcutSpriteImg: {
    width: 24,
    height: 24,
  },
  /* ================= FIN STITCH PERSONAJE ================= */
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
    borderRadius: 2,
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteHeaderBtn: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#2A1314',
    borderWidth: 1,
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerZoneCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: 2,
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(244, 67, 54, 0.35)',
  },
  dangerZoneTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF5252',
    fontFamily: THEME.typography.fontTitle,
  },
  dangerZoneDesc: {
    fontSize: 12,
    color: THEME.colors.textoSecundario,
    lineHeight: 18,
    marginBottom: 12,
  },
  dangerDeleteBtnWrap: {
    width: '100%',
    minHeight: 44,
    backgroundColor: '#2A1616',
    borderWidth: 1,
    borderColor: '#7A2E28',
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dangerDeleteBtnBg: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dangerDeleteOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(148, 57, 57, 0.45)',
    borderRadius: 2,
  },
  dangerDeleteBtnText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: THEME.typography.fontTitle,
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
    minHeight: 48,
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
    marginBottom: THEME.spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: THEME.spacing.md,
    ...THEME.effects.textShadow,
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
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    marginBottom: 4,
    fontWeight: '700',
    letterSpacing: 0.4,
    ...THEME.effects.textShadowSubtle,
  },
  fieldStaticVal: {
    fontSize: 14,
    color: THEME.colors.texto,
    fontWeight: '800',
    backgroundColor: '#090A09',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
  },
  fieldInput: {
    backgroundColor: '#090A09',
    color: THEME.colors.texto,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '800',
    minHeight: 40,
  },
  zenContainer: {
    marginTop: 4,
  },
  rankBadge: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 2,
    alignItems: 'center',
    borderWidth: 1,
  },
  rankGm: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  rankPlayer: {
    backgroundColor: '#1A1B1A',
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  rankBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.texto,
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
    paddingRight: 24,
  },
  subTabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    borderRadius: 2,
    gap: 5,
    backgroundColor: '#1A1B1A',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  subTabPillActive: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  subTabText: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    fontWeight: '700',
  },
  subTabTextActive: {
    color: '#EFD28D',
    fontWeight: '900',
    ...THEME.effects.textShadow,
  },
  gridWrapper: {
    alignItems: 'center',
  },
  gridHeaderTitle: {
    fontSize: 11,
    color: THEME.colors.oroClaro,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
  },
  questRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  questTitle: {
    fontSize: 13,
    fontWeight: THEME.typography.weightBold,
    color: THEME.colors.texto,
  },
  questStatus: {
    fontSize: 11,
    color: THEME.colors.jade,
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
    backgroundColor: '#15241C',
    borderWidth: 1,
    borderTopColor: '#3FCF8E',
    borderLeftColor: '#3FCF8E',
    borderRightColor: '#1E5A3E',
    borderBottomColor: '#1E5A3E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
  },
  quickPkBtnText: {
    color: THEME.colors.jade,
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
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    color: THEME.colors.oroClaro,
    fontSize: 16,
    fontWeight: THEME.typography.weightBold,
  },
  quickStepRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 4,
  },
  quickStepBtn: {
    backgroundColor: '#1A1B1A',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 2,
  },
  quickStepText: {
    color: THEME.colors.textoSecundario,
    fontSize: 10,
    fontWeight: THEME.typography.weightBold,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borde,
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
    borderRadius: 2,
    backgroundColor: '#1A1B1A',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  pkPillText: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
  },
  fieldSubtitle: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    marginBottom: 8,
  },
  raceScrollContainer: {
    paddingVertical: 4,
    paddingRight: 24,
    gap: 8,
  },
  raceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1B1A',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    gap: 6,
  },
  raceChipActive: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  raceChipText: {
    color: THEME.colors.textoSecundario,
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
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderRadius: 2,
    padding: 10,
  },
  classTierCardActive: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
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
    borderRadius: 2,
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
    backgroundColor: '#1B1C1B',
    borderColor: '#E0C380',
    borderWidth: 1.5,
    borderRadius: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 10,
    width: '100%',
    maxWidth: 380,
  },
  movingBannerTitle: {
    color: '#E0C380',
    fontSize: 12,
    fontWeight: '800',
  },
  movingBannerSubtitle: {
    color: THEME.colors.texto,
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
    borderRadius: 2,
    minHeight: 36,
    justifyContent: 'center',
  },
  movingBannerCancelText: {
    color: '#E2703A',
    fontSize: 11,
    fontWeight: '800',
  },
  // Skills Tab Styles
  skillHeaderBtnWrap: {
    height: 38,
    minWidth: 80,
    borderRadius: 2,
    backgroundColor: '#252625',
    borderWidth: 1,
    borderColor: '#4C463A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  skillHeaderBtnVaciar: {
    backgroundColor: '#2A1616',
    borderColor: '#7A2E28',
  },
  skillHeaderBtnBg: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    gap: 4,
  },
  skillHeaderBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
  },
  quickRaceMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F201F',
    borderWidth: 1.5,
    borderColor: '#4C463A',
    borderRadius: 2,
    padding: 12,
    gap: 12,
    minHeight: 48,
  },
  quickRaceIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19, // círculo funcional (width/2): contenedor circular de ícono de raza
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
    borderRadius: 2,
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
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 2,
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
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#3A3C38',
    borderLeftColor: '#3A3C38',
    borderRightColor: '#121312',
    borderBottomColor: '#121312',
    borderRadius: 2,
    padding: 10,
  },
  skillIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 2,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
    backgroundColor: '#171817',
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    maxHeight: '90%',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
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
    borderBottomColor: '#4C463A',
  },
  skillPickerModalTitle: {
    color: '#E0C380',
    fontSize: 16,
    fontWeight: '800',
  },
  skillPickerCloseBtn: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillSearchInput: {
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    borderRadius: 2,
    color: '#FFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginHorizontal: 16,
    marginTop: 12,
    minHeight: 44,
  },
  skillFilterRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  skillFilterChip: {
    backgroundColor: '#1B1C1B',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    minHeight: 44,
    justifyContent: 'center',
  },
  skillFilterChipActive: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  skillFilterChipText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  skillFilterChipTextActive: {
    color: '#EFD28D',
    fontWeight: '800',
    ...THEME.effects.textShadow,
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
    borderRadius: 2,
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
    borderRadius: 2,
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
  muCharWindowOuter: {
    backgroundColor: THEME.colors.fondoRadialTop,
    borderWidth: 1.5,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.85,
    shadowRadius: 10,
  },
  muCharWindow: {
    backgroundColor: THEME.colors.superficie,
    padding: 12,
  },
  muCharHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 54,
    marginBottom: 8,
  },
  muCharFooterImage: {
    width: '100%',
    height: 24,
  },
  muCharName: {
    fontSize: 17,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.8,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  muCharClass: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.brasa,
    marginTop: 2,
  },
  muLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3C38',
    marginBottom: 10,
  },
  muLevelText: {
    fontSize: 11,
    color: THEME.colors.textoSecundario,
    fontWeight: '800',
    lineHeight: 18,
  },
  muYellowVal: {
    color: THEME.colors.oroClaro,
    fontWeight: '900',
  },
  muStonePlusBtn: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#292A29',
    borderWidth: 1.5,
    borderColor: '#E0C380',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  muStonePlusText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#E4E2E0',
    marginTop: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
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
    height: 38,
    borderRadius: 2,
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    paddingHorizontal: 12,
  },
  muStatLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.8,
  },
  muStatInput: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.texto,
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
    color: THEME.colors.arcano,
    letterSpacing: 0.3,
  },
  muWhiteSubText: {
    fontSize: 10,
    fontWeight: '700',
    color: THEME.colors.textoSecundario,
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
    backgroundColor: '#090A09',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    paddingHorizontal: 8,
    height: 38,
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
    borderTopColor: '#3A3C38',
  },
  muFooterBtn: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muFooterBtnGoldText: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
  },
  muFooterBtnSave: {
    flex: 1,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#26221A',
    borderWidth: 1.5,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  muFooterBtnSaveText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#EFD28D',
    letterSpacing: 0.6,
    ...THEME.effects.textShadow,
  },
  muSkillBarContainer: {
    backgroundColor: '#171817',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    padding: 10,
    marginBottom: 12,
  },
  muSkillBarTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  muSkillBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  muSkillSlotFrame: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#4C463A',
    borderBottomColor: '#4C463A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  muSkillSlotSelected: {
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
    elevation: 6,
  },
  muSkillSlotEmpty: {
    width: '100%',
    height: '100%',
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muSkillSlotEmptyInner: {
    width: 14,
    height: 14,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#3A3C38',
    borderBottomColor: '#3A3C38',
  },
  muInvZenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 10,
    gap: 10,
  },
  muInvZenBox: {
    flex: 1,
    backgroundColor: '#090A09',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
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
  lockWarningBanner: {
    backgroundColor: '#262010',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    borderWidth: 1,
    borderRadius: 2,
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lockWarningText: {
    flex: 1,
    color: '#FFE082',
    fontSize: 11,
    fontWeight: '600',
  },
  connectionStatusBanner: {
    marginHorizontal: 12,
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  connectionStatusOnline: {
    backgroundColor: '#2A1314',
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
  },
  connectionStatusOffline: {
    backgroundColor: '#15241C',
    borderTopColor: '#3FCF8E',
    borderLeftColor: '#3FCF8E',
    borderRightColor: '#1E5A3E',
    borderBottomColor: '#1E5A3E',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5, /* círculo funcional (width/2): indicador de estado de conexión */
  },
  statusBannerTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  statusBannerSubtitle: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
    marginTop: 1,
  },
  headerStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    gap: 4,
  },
  headerStatusPillOnline: {
    backgroundColor: 'rgba(255, 82, 82, 0.15)',
    borderColor: '#FF5252',
  },
  headerStatusPillOffline: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderColor: THEME.colors.jade,
  },
  headerStatusPillText: {
    fontSize: 9,
    fontWeight: '800',
  },
  muLevelBadgeBtn: {
    backgroundColor: 'rgba(232, 200, 106, 0.12)',
    borderColor: THEME.colors.bordeBrillante,
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  muYellowValUnderline: {
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  levelModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  levelModalContent: {
    backgroundColor: '#171817',
    borderWidth: 1.5,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderRadius: 2,
    width: '100%',
    maxWidth: 420,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  levelModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3A3C38',
    marginBottom: 16,
  },
  levelModalTitle: {
    color: THEME.colors.oroClaro,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  levelModalSubtitle: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 2,
  },
  levelModalCloseBtn: {
    padding: 4,
  },
  levelModalQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 6,
  },
  levelModalQuickBtn: {
    flex: 1,
    backgroundColor: '#1A1B1A',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderRadius: 2,
    paddingVertical: 8,
    alignItems: 'center',
  },
  levelModalQuickBtnActive: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  levelModalQuickText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  levelModalQuickTextActive: {
    color: '#EFD28D',
    fontWeight: '800',
    ...THEME.effects.textShadow,
  },
  levelModalStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 12,
  },
  levelModalStepBtn: {
    backgroundColor: '#1E1F1E',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelModalStepBtnText: {
    color: THEME.colors.texto,
    fontSize: 13,
    fontWeight: '700',
  },
  levelModalInput: {
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    borderRadius: 2,
    color: THEME.colors.oroClaro,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    width: 90,
    height: 48,
  },
  levelModalDesc: {
    color: THEME.colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: 'center',
    marginBottom: 18,
  },
  levelModalFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  levelModalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    backgroundColor: '#1A1B1A',
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  levelModalCancelText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  levelModalSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#26221A',
    borderWidth: 1.5,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 2,
    gap: 6,
    minHeight: 44,
  },
  levelModalSaveText: {
    color: '#EFD28D',
    fontSize: 13,
    fontWeight: '800',
    ...THEME.effects.textShadow,
  },
  subTabPillTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 36,
    marginHorizontal: 3,
  },
  subTabPillBg: {
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stitchPlus1000BtnTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    width: 68,
    height: 38,
  },
  stitchPlus1000BtnBg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperSmallBtnTouchable: {
    width: 34,
    height: 36,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stepperSmallBtnBg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStepBtnTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 28,
  },
  quickStepBtnBg: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pkPillTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  pkPillBg: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickModeBtnTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 32,
  },
  quickModeBtnBg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  raceChipBtnTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 30,
  },
  raceChipBtnBg: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
  },
  teleportBtnTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 34,
  },
  teleportBtnBg: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teleportBtnText: {
    color: '#E4E2E0',
    fontSize: 12,
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
  },
  skillFilterChipTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 30,
    marginRight: 6,
  },
  skillFilterChipBg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelModalQuickBtnTouchable: {
    flex: 1,
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 34,
  },
  levelModalQuickBtnBg: {
    width: '100%',
    height: '100%',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelModalStepBtnTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minWidth: 44,
    minHeight: 44,
  },
  levelModalStepBtnBg: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
