import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Switch,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { INTERFACE_ASSETS } from '../../constants/equipAssets';
import { AccountSummary, AccountUpdateData, CharacterSummary } from '../../types/character';
import { SqlClient } from '../../services/database/sqlClient';
import { useLanguage } from '../../context/LanguageContext';
import { ClassAvatar } from '../../components/common/ClassAvatar';
import {
  getMuClassInfo,
  EXCELLENT_OPTIONS_WEAPON,
  EXCELLENT_OPTIONS_ARMOR,
  HARMONY_OPTIONS_WEAPON,
  HARMONY_OPTIONS_ARMOR,
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
import { InventoryGrid } from '../../components/inventory/InventoryGrid';
import { ItemModal } from '../../components/inventory/ItemModal';
import { ItemActionModal } from '../../components/inventory/ItemActionModal';
import { EquipmentPickerModal } from '../../components/inventory/EquipmentPickerModal';
import { ItemImage } from '../../components/common/ItemImage';
import { MuItemParser } from '../../services/parser/muItemParser';
import { ParsedItem } from '../../types/item';
import { LicenseService } from '../../services/security/licenseService';
import { DEFAULT_ITEM_CATALOG, ItemDefinition } from '../../services/parser/itemDatabase';
import { AutocompleteInput } from '../../components/common/AutocompleteInput';
import { MAKER_CATEGORIES } from '../../constants/makerCategories';
import { QuickSetDef, QUICK_SETS_CATALOG } from '../../constants/quickSetsCatalog';
import { Panel, Pestanas, TituloSeccion, BotonPiedra } from '../../components/ui';

export const ITEM_CATEGORIES = [
  { group: 0, name: 'Swords / Claws', icon: 'sword' },
  { group: 1, name: 'Axes', icon: 'axe' },
  { group: 2, name: 'Maces / Scepters', icon: 'hammer' },
  { group: 3, name: 'Spears', icon: 'spear' },
  { group: 4, name: 'Bows / Crossbows', icon: 'bow-arrow' },
  { group: 5, name: 'Staffs / Books', icon: 'magic-staff' },
  { group: 6, name: 'Shields', icon: 'shield' },
  { group: 7, name: 'Helms', icon: 'hard-hat' },
  { group: 8, name: 'Armors', icon: 'tshirt-crew' },
  { group: 9, name: 'Pants / Pantalones', icon: 'run-fast' },
  { group: 10, name: 'Gloves', icon: 'hand-back-right' },
  { group: 11, name: 'Boots', icon: 'shoe-formal' },
  { group: 12, name: 'Wings / Orbs', icon: 'feather' },
  { group: 13, name: 'Pets / Rings / Pendants', icon: 'ring' },
  { group: 14, name: 'Jewels / Consumables', icon: 'diamond-stone' },
  { group: 15, name: 'Scrolls / Others', icon: 'book-open-page-variant' },
];

export const AccountsScreen = () => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );
  const { t } = useLanguage();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [filtered, setFiltered] = useState<AccountSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State para Registro de Cuenta (Botón +)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLevel, setNewLevel] = useState<number>(0);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (route.params?.openCreateModal) {
      setCreateModalVisible(true);
    }
    if (route.params?.searchAccount) {
      setSearch(route.params.searchAccount);
    }
    if (route.params?.filter === 'vip' && accounts.length > 0) {
      const vipOnly = accounts.filter((a) => (a.AccountLevel || 0) > 0);
      setFiltered(vipOnly);
    }
  }, [route.params, accounts]);

  // Modal Detalle y Edición de Cuenta
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);
  const [accountDetailVisible, setAccountDetailVisible] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editVipLevel, setEditVipLevel] = useState<number>(0);
  const [addVipDaysInput, setAddVipDaysInput] = useState<string>('');
  const [editWarehouseCount, setEditWarehouseCount] = useState<string>('1');
  const [editCoinC, setEditCoinC] = useState<string>('0');
  const [editCoinP, setEditCoinP] = useState<string>('0');
  const [editGoblinPoint, setEditGoblinPoint] = useState<string>('0');
  const [editRuud, setEditRuud] = useState<string>('0');
  const [savingAccount, setSavingAccount] = useState<boolean>(false);
  const [disconnectingAccount, setDisconnectingAccount] = useState<boolean>(false);
  const [deletingAccount, setDeletingAccount] = useState<boolean>(false);
  const [accountChars, setAccountChars] = useState<CharacterSummary[]>([]);
  const [loadingAccountChars, setLoadingAccountChars] = useState<boolean>(false);

  // Modal Warehouse (Baúl)
  const [warehouseModalVisible, setWarehouseModalVisible] = useState(false);
  const [warehouseData, setWarehouseData] = useState<any>(null);
  const [warehouseAccount, setWarehouseAccount] = useState<string>('');
  const [loadingWarehouse, setLoadingWarehouse] = useState(false);
  const [activeVaultIndex, setActiveVaultIndex] = useState<number>(0);
  const [warehouseCount, setWarehouseCount] = useState<number>(1);
  const [warehouseItems, setWarehouseItems] = useState<ParsedItem[]>([]);
  const [vaultMoney, setVaultMoney] = useState<number>(0);
  const [vaultExtLevel, setVaultExtLevel] = useState<number>(0);
  const [savingWarehouse, setSavingWarehouse] = useState<boolean>(false);
  const [unlockingVaults, setUnlockingVaults] = useState<boolean>(false);
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockCountInput, setUnlockCountInput] = useState<string>('20');
  const [warehouseLockWarning, setWarehouseLockWarning] = useState<string | null>(null);

  // Vista y Pestañas del Warehouse (Capturas 1 a 5)
  const [warehouseViewTab, setWarehouseViewTab] = useState<'items' | 'warehouse' | 'vault_ext'>('warehouse');
  const [vaultSubTab, setVaultSubTab] = useState<'main' | 'ext'>('main');
  const [premiumModalVisible, setPremiumModalVisible] = useState<boolean>(false);
  const [catalogCategory, setCatalogCategory] = useState<string>('swords');
  const [catalogSearch, setCatalogSearch] = useState<string>('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState<boolean>(false);

  // Item Action Modal (Captura 5) & Item Editor Modal for Warehouse
  const [actionVaultModalVisible, setActionVaultModalVisible] = useState<boolean>(false);
  const [actionVaultItem, setActionVaultItem] = useState<ParsedItem | null>(null);
  const [actionVaultSlot, setActionVaultSlot] = useState<number>(0);
  const [vaultItemModalVisible, setVaultItemModalVisible] = useState<boolean>(false);
  const [selectedVaultItem, setSelectedVaultItem] = useState<ParsedItem | null>(null);
  const [selectedVaultSlot, setSelectedVaultSlot] = useState<number>(0);
  const [vaultPickerVisible, setVaultPickerVisible] = useState<boolean>(false);
  const [vaultPickerSlot, setVaultPickerSlot] = useState<number>(0);
  const [movingVaultItem, setMovingVaultItem] = useState<{ item: ParsedItem; slot: number } | null>(null);

  const vaultTabs = useMemo(() => {
    const count = Math.min(Math.max(warehouseCount + 1, activeVaultIndex + 1, 1), 25);
    return Array.from({ length: count }).map((_, idx) => ({
      id: String(idx),
      titulo: `Bault ${idx}`,
    }));
  }, [warehouseCount, activeVaultIndex]);

  // Estados Completos para el Item Maker del Baúl (Warehouse Editor Unificado)
  const [selectedVaultMakerDef, setSelectedVaultMakerDef] = useState<ItemDefinition>(DEFAULT_ITEM_CATALOG[0]);
  const [vaultMakerLevel, setVaultMakerLevel] = useState<number>(15);
  const [vaultMakerOption, setVaultMakerOption] = useState<number>(7);
  const [vaultMakerDurability, setVaultMakerDurability] = useState<number>(255);
  const [vaultMakerLuck, setVaultMakerLuck] = useState<boolean>(true);
  const [vaultMakerSkill, setVaultMakerSkill] = useState<boolean>(true);
  const [vaultMaker380, setVaultMaker380] = useState<boolean>(true);
  const [vaultMakerExcFlags, setVaultMakerExcFlags] = useState<number>(63);
  const [vaultMakerAncient, setVaultMakerAncient] = useState<number>(0);
  const [vaultMakerHarmonyType, setVaultMakerHarmonyType] = useState<number>(0);
  const [vaultMakerHarmonyLevel, setVaultMakerHarmonyLevel] = useState<number>(0);
  const [vaultMakerQuantity, setVaultMakerQuantity] = useState<number>(1);
  const [vaultMakerSockets, setVaultMakerSockets] = useState<number[]>([0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
  const [vaultMakerSocketLevels, setVaultMakerSocketLevels] = useState<number[]>([1, 1, 1, 1, 1]);
  const [vaultMakerEnableSockets, setVaultMakerEnableSockets] = useState<boolean>(false);

  // Quick Sets Modal para Warehouse
  const [showQuickSetsVaultModal, setShowQuickSetsVaultModal] = useState<boolean>(false);
  const [selectedVaultQuickSet, setSelectedVaultQuickSet] = useState<QuickSetDef>(QUICK_SETS_CATALOG[0]);
  const [quickSetVaultCategoryFilter, setQuickSetVaultCategoryFilter] = useState<'ALL' | 'DW' | 'DK' | 'FE' | 'MG' | 'DL' | 'ACC'>('ALL');
  const [quickSetVaultLevel, setQuickSetVaultLevel] = useState<number>(15);
  const [quickSetVaultOption, setQuickSetVaultOption] = useState<number>(7);
  const [quickSetVaultLuck, setQuickSetVaultLuck] = useState<boolean>(true);
  const [quickSetVaultSkill, setQuickSetVaultSkill] = useState<boolean>(true);
  const [quickSetVaultFullExc, setQuickSetVaultFullExc] = useState<boolean>(true);
  const [quickSetVault380, setQuickSetVault380] = useState<boolean>(true);
  const [quickSetVaultAncientTier, setQuickSetVaultAncientTier] = useState<number>(0);
  const [quickSetVaultHarmonyType, setQuickSetVaultHarmonyType] = useState<number>(0);
  const [quickSetVaultHarmonyLevel, setQuickSetVaultHarmonyLevel] = useState<number>(13);
  const [injectingQuickSetToVault, setInjectingQuickSetToVault] = useState<boolean>(false);

  // Opciones Ancient válidas para el set seleccionado (filtrado contextual oficial)
  const vaultSetAncientOptions = useMemo(() => {
    if (!selectedVaultQuickSet || !selectedVaultQuickSet.pieces) return [];
    const optMap = new Map<number, { tier: number; name: string }>();
    for (const piece of selectedVaultQuickSet.pieces) {
      const opts = getAvailableAncientOptionsForItem(piece.group, piece.index);
      for (const opt of opts) {
        if (!optMap.has(opt.tier)) {
          optMap.set(opt.tier, { tier: opt.tier, name: opt.name });
        }
      }
    }
    return Array.from(optMap.values());
  }, [selectedVaultQuickSet]);



  const fetchAccounts = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await SqlClient.getRecentAccounts();
      setAccounts(data);
      applyFilter(search, data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al conectar con SQL Server');
      setAccounts([]);
      setFiltered([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAccounts();
      const interval = setInterval(() => {
        fetchAccounts();
      }, 15000);
      return () => clearInterval(interval);
    }, [search])
  );

  const applyFilter = (q: string, list = accounts) => {
    if (!q.trim()) {
      setFiltered(list);
      return;
    }
    const lower = q.toLowerCase();
    const filteredList = list.filter((a) =>
      a.memb___id.toLowerCase().includes(lower) ||
      (a.mail_addr && a.mail_addr.toLowerCase().includes(lower)) ||
      (a.memb_name && a.memb_name.toLowerCase().includes(lower))
    );
    setFiltered(filteredList);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    applyFilter(text);
  };

  const handleCreateAccount = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      Alert.alert('Campos requeridos', 'Debes ingresar usuario y contraseña.');
      return;
    }

    setIsCreating(true);
    try {
      const result = await SqlClient.createAccount(
        newUsername.trim(),
        newPassword.trim(),
        newEmail.trim() || undefined,
        newLevel
      );

      if (result.success) {
        Alert.alert('¡Cuenta Creada!', result.message);
        setCreateModalVisible(false);
        setNewUsername('');
        setNewPassword('');
        setNewEmail('');
        setNewLevel(0);
        await fetchAccounts();
      } else {
        Alert.alert('Error SQL', result.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleBlock = async (account: AccountSummary) => {
    const isCurrentlyBlocked = String(account.bloc_code) === '1';
    const actionText = isCurrentlyBlocked ? 'desbloquear' : 'bloquear / banear';

    Alert.alert(
      'Confirmar Acción',
      `¿Deseas ${actionText} la cuenta "${account.memb___id}" en el servidor MU?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: isCurrentlyBlocked ? 'Desbloquear' : 'Bloquear',
          style: isCurrentlyBlocked ? 'default' : 'destructive',
          onPress: async () => {
            try {
              const res = await SqlClient.toggleBlockAccount(
                account.memb___id,
                !isCurrentlyBlocked
              );
              Alert.alert('Resultado', res.message);
              // Actualizar cuenta seleccionada localmente
              if (selectedAccount && selectedAccount.memb___id === account.memb___id) {
                setSelectedAccount({
                  ...selectedAccount,
                  bloc_code: isCurrentlyBlocked ? '0' : '1',
                });
              }
              await fetchAccounts();
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  const openAccountDetails = (account: AccountSummary) => {
    setSelectedAccount(account);
    setEditUsername(account.memb___id);
    setEditPassword(account.memb__pwd || '');
    setShowPassword(false);
    setEditName(account.memb_name || account.memb___id);
    setEditEmail(account.mail_addr || `${account.memb___id}@muonline.com`);
    setEditVipLevel(account.AccountLevel || 0);
    setAddVipDaysInput('');
    setEditWarehouseCount(String(account.WarehouseCount || 1));
    setEditCoinC(String(account.WCoinC || 0));
    setEditCoinP(String(account.WCoinP || 0));
    setEditGoblinPoint(String(account.GoblinPoint || 0));
    setEditRuud(String(account.Ruud || 0));
    setAccountDetailVisible(true);

    // Cargar personajes de esta cuenta en tiempo real
    setAccountChars([]);
    setLoadingAccountChars(true);
    SqlClient.getCharactersByAccount(account.memb___id)
      .then((chars) => {
        setAccountChars(chars || []);
      })
      .catch(() => setAccountChars([]))
      .finally(() => setLoadingAccountChars(false));
  };

  const handleSaveAccount = async () => {
    if (!selectedAccount) return;
    if (!LicenseService.isPro()) {
      Alert.alert(
        'Función Bloqueada en DEMO',
        'La edición avanzada de cuentas y sincronización de datos con SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }

    setSavingAccount(true);
    try {
      const payload: AccountUpdateData = {
        username: selectedAccount.memb___id,
        newUsername: editUsername.trim() !== selectedAccount.memb___id ? editUsername.trim() : undefined,
        password: editPassword.trim(),
        name: editName.trim(),
        email: editEmail.trim(),
        accountLevel: editVipLevel,
        addVipDays: addVipDaysInput ? parseInt(addVipDaysInput, 10) : undefined,
        warehouseCount: parseInt(editWarehouseCount, 10) || 1,
        wCoinC: parseInt(editCoinC, 10) || 0,
        wCoinP: parseInt(editCoinP, 10) || 0,
        goblinPoint: parseInt(editGoblinPoint, 10) || 0,
        ruud: parseInt(editRuud, 10) || 0,
      };

      const res = await SqlClient.updateAccount(payload);
      if (res.success) {
        Alert.alert('Éxito', res.message || 'Cuenta actualizada en SQL Server.');
        const activeUser = payload.newUsername || selectedAccount.memb___id;
        setSelectedAccount(prev => prev ? {
          ...prev,
          memb___id: activeUser,
          memb__pwd: payload.password,
          memb_name: payload.name,
          mail_addr: payload.email,
          AccountLevel: payload.accountLevel || 0,
          WarehouseCount: payload.warehouseCount,
          WCoinC: payload.wCoinC,
          WCoinP: payload.wCoinP,
          GoblinPoint: payload.goblinPoint,
          Ruud: payload.ruud,
        } : null);
        setAddVipDaysInput('');
        await fetchAccounts();
      } else {
        Alert.alert('Error', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo actualizar la cuenta.');
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDisconnectAccount = async () => {
    if (!selectedAccount) return;
    Alert.alert(
      'Liberar Cuenta Trabada en SQL',
      `¿Deseas restablecer la sesión en SQL Server para "${selectedAccount.memb___id}"? Se limpiará su registro (ConnectStat = 0) en la base de datos (indicado si el servidor se cayó o la cuenta quedó trabada tras cerrar el juego).`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Liberar Sesión (ConnectStat = 0)',
          style: 'default',
          onPress: async () => {
            setDisconnectingAccount(true);
            try {
              const res = await SqlClient.disconnectAccount(selectedAccount.memb___id);
              if (res.success) {
                Alert.alert('Sesión Liberada', res.message);
                setSelectedAccount(prev => prev ? { ...prev, ConnectStat: 0 } : null);
                await fetchAccounts();
              } else {
                Alert.alert('Error', res.message);
              }
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Error al desconectar');
            } finally {
              setDisconnectingAccount(false);
            }
          },
        },
      ]
    );
  };

  const promptDeleteAccountDirect = (account: AccountSummary) => {
    Alert.alert(
      'Eliminar Cuenta',
      `¿Deseas eliminar permanentemente la cuenta "${account.memb___id}"?\n\n` +
      `Se borrarán de forma irreversible:\n` +
      `• Todos los personajes de la cuenta (${account.CharCount ?? 'todos'})\n` +
      `• Baúl principal (/ware) y baúles expandidos\n` +
      `• Monedas (WCoin, GoblinPoints, Ruud)\n` +
      `• Credenciales y registros de login en SQL\n\n` +
      `Esta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Cuenta',
          style: 'destructive',
          onPress: () => performDeleteAccount(account.memb___id, false),
        },
      ]
    );
  };

  const promptDeleteSelectedAccount = () => {
    if (!selectedAccount) return;
    const charCountText = accountChars.length > 0 ? `${accountChars.length} personajes asociados` : 'personajes asociados';
    Alert.alert(
      '⚠️ Eliminar Cuenta Completa',
      `¿Estás absolutamente seguro de eliminar la cuenta "${selectedAccount.memb___id}" de SQL Server?\n\n` +
      `Se eliminarán de forma irreversible:\n` +
      `• ${charCountText}\n` +
      `• Inventarios, habilidades y misiones\n` +
      `• Baúl (/ware) y Bóvedas expandidas\n` +
      `• Monedas y puntos CashShop\n` +
      `• Datos de acceso de MEMB_INFO\n\n` +
      `Esta acción NO se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar Definitivamente',
          style: 'destructive',
          onPress: () => performDeleteAccount(selectedAccount.memb___id, false),
        },
      ]
    );
  };

  const performDeleteAccount = async (username: string, forceOnline: boolean = false) => {
    setDeletingAccount(true);
    try {
      const res = await SqlClient.deleteAccount(username, forceOnline);
      if (!res.success) {
        if (res.message && res.message.includes('ONLINE_WARNING')) {
          Alert.alert(
            '⚠️ Cuenta Conectada',
            `La cuenta "${username}" se encuentra actualmente ONLINE en el servidor de juego.\n\nEliminarla mientras el jugador está conectado puede causar desincronización en el GameServer.\n\n¿Deseas forzar la eliminación de todos modos?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Forzar Eliminación',
                style: 'destructive',
                onPress: () => performDeleteAccount(username, true),
              },
            ]
          );
        } else {
          Alert.alert('Error', res.message || 'No se pudo eliminar la cuenta.');
        }
        return;
      }

      Alert.alert('Éxito', `La cuenta "${username}" y todos sus datos han sido eliminados correctamente.`);
      setAccountDetailVisible(false);
      setSelectedAccount(null);
      await fetchAccounts();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Error inesperado al eliminar la cuenta.');
    } finally {
      setDeletingAccount(false);
    }
  };

  const loadVaultData = async (accountId: string, vaultIdx: number) => {
    setLoadingWarehouse(true);
    try {
      const data = await SqlClient.getAccountWarehouse(accountId, vaultIdx);
      setWarehouseData(data);
      setActiveVaultIndex(vaultIdx);
      setWarehouseCount(data?.WarehouseCount || 1);
      setVaultMoney(data?.Money || 0);
      setVaultExtLevel(data?.extWarehouseLevel || 0);
      const parsed = MuItemParser.parseInventory(data?.ItemsHex || '');
      setWarehouseItems(parsed);
    } catch (e: any) {
      Alert.alert('Error Baúl', e.message || 'No se pudo leer el baúl');
    } finally {
      setLoadingWarehouse(false);
    }
  };

  const handleCloseWarehouseModal = () => {
    if (warehouseAccount) {
      SqlClient.releaseEditorLock(`Warehouse:${warehouseAccount}`).catch(() => {});
    }
    setWarehouseLockWarning(null);
    setWarehouseModalVisible(false);
  };

  const openWarehouseForAccount = async (accountId: string, initialTab: 'items' | 'warehouse' | 'vault_ext' = 'warehouse') => {
    setWarehouseAccount(accountId);
    setWarehouseViewTab(initialTab);
    setVaultSubTab(initialTab === 'vault_ext' ? 'ext' : 'main');
    setWarehouseModalVisible(true);
    // Adquirir candado suave multi-admin para este baúl
    SqlClient.acquireEditorLock(`Warehouse:${accountId}`).then((res) => {
      if (res && res.locked && res.holder) {
        setWarehouseLockWarning(`⚠️ El baúl de "${accountId}" está siendo editado por ${res.holder} hace ${res.elapsedSec || 0}s`);
        Alert.alert('Aviso de Concurrencia', `El baúl de "${accountId}" está siendo editado por ${res.holder} hace ${res.elapsedSec || 0}s.`);
      } else {
        setWarehouseLockWarning(null);
      }
    }).catch(() => {});
    await loadVaultData(accountId, 0);
  };

  const handleSwitchVault = async (targetIdx: number) => {
    if (targetIdx === activeVaultIndex || loadingWarehouse) return;
    await loadVaultData(warehouseAccount, targetIdx);
  };

  const handleUnlockWarehouses = async () => {
    if (!LicenseService.isPro()) {
      Alert.alert(
        'Función Bloqueada en DEMO',
        'El desbloqueo y expansión de múltiples baúles extendidos con SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
    const num = parseInt(unlockCountInput, 10);
    if (isNaN(num) || num < 1 || num > 250) {
      Alert.alert('Valor inválido', 'Por favor ingresa un número de baúles entre 1 y 250.');
      return;
    }
    setUnlockingVaults(true);
    try {
      const res = await SqlClient.updateWarehouseCount(warehouseAccount, num);
      if (res.success) {
        setWarehouseCount(res.warehouseCount);
        setShowUnlockModal(false);
        Alert.alert(
          '¡Baúles Desbloqueados!',
          `Se han habilitado exitosamente ${res.warehouseCount} baúles para la cuenta ${warehouseAccount}. Ya puedes cambiar entre ellos.`
        );
      } else {
        Alert.alert('Error al desbloquear', res.message || 'No se pudo actualizar en SQL Server');
      }
    } finally {
      setUnlockingVaults(false);
    }
  };

  const handleActivateVaultExpansion = async () => {
    if (!LicenseService.isPro()) {
      Alert.alert(
        'Función Bloqueada en DEMO',
        'La activación de la Bóveda Expandida en juego requiere una Licencia PRO activa.'
      );
      return;
    }
    setUnlockingVaults(true);
    try {
      const res = await SqlClient.setVaultExpansion(warehouseAccount, 1);
      if (res.success) {
        setVaultExtLevel(1);
        Alert.alert(
          '¡Bóveda Expandida Activada!',
          `Se ha activado exitosamente la Bóveda de Expansión en el juego para '${warehouseAccount}'. El botón [+] ("Abriendo una Bóveda Expandida") ahora está 100% activo en el cliente y puedes editar su contenido en la app.`
        );
        setShowUnlockModal(false);
        await loadVaultData(warehouseAccount, activeVaultIndex);
      } else {
        Alert.alert('Error al activar', res.message || 'No se pudo actualizar en SQL Server');
      }
    } finally {
      setUnlockingVaults(false);
    }
  };

  const handleVaultSlotPress = async (slotIndex: number, item?: ParsedItem) => {
    // Modo de Mover Ítem Activo
    if (movingVaultItem) {
      // Si el usuario toca el mismo ítem que está moviendo: cancelar modo mover
      if (item && item.slot === movingVaultItem.slot) {
        setMovingVaultItem(null);
        return;
      }
      // Si el usuario toca otro ítem ocupado
      if (item) {
        Alert.alert(
          'Casilla Ocupada',
          `No puedes mover el ítem sobre "${item.name}". Selecciona un cuadro libre (+) o cancela.`,
          [
            { text: 'Entendido' },
            { text: 'Cancelar Mover', style: 'cancel', onPress: () => setMovingVaultItem(null) }
          ]
        );
        return;
      }

      // El usuario tocó una casilla vacía (slotIndex)
      const moveW = Math.max(1, movingVaultItem.item.width || 1);
      const moveH = Math.max(1, movingVaultItem.item.height || 1);
      const isExpanded = slotIndex >= 120 || movingVaultItem.slot >= 120 || warehouseViewTab === 'vault_ext';
      const occupiedExcludingCurrent = getOccupiedVaultSlots(warehouseItems, movingVaultItem.slot, isExpanded);

      if (!canPlaceItemInVault(slotIndex, moveW, moveH, occupiedExcludingCurrent, isExpanded)) {
        const displaySlot = (isExpanded && slotIndex >= 120 ? slotIndex - 120 : slotIndex) + 1;
        Alert.alert(
          'Espacio Insuficiente',
          `El ítem "${movingVaultItem.item.name}" (${moveW}x${moveH}) no cabe en el cuadro #${displaySlot} porque colisiona o se sale de los bordes del baúl.`
        );
        return;
      }

      // Reubicar ítem al nuevo slot
      const itemToMove = movingVaultItem.item;
      const movedItem: ParsedItem = { ...itemToMove, slot: slotIndex, isModified: true };
      const nextItems = [
        ...warehouseItems.filter(i => i.slot !== movingVaultItem.slot && i.slot !== slotIndex),
        movedItem
      ];
      setWarehouseItems(nextItems);
      setMovingVaultItem(null);

      const displaySlot = (isExpanded && slotIndex >= 120 ? slotIndex - 120 : slotIndex) + 1;

      // Auto-sincronizar con SQL Server si está conectado
      if (warehouseAccount && LicenseService.canSaveInventory()) {
        try {
          const newHex = MuItemParser.rebuildInventoryHex(nextItems, 240, warehouseData?.ItemsHex);
          const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
          if (res && res.success) {
            setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
            Alert.alert(
              'Ítem Reubicado',
              `"${movedItem.name}" se movió al cuadro #${displaySlot} y se guardó en SQL Server.`
            );
            return;
          }
        } catch (err: any) {
          console.warn('Auto-save moved vault item error:', err);
        }
      }

      Alert.alert(
        'Ítem Reubicado',
        `"${movedItem.name}" se movió al cuadro #${displaySlot}. Presiona "Guardar Cambios" para sincronizar con SQL Server.`
      );
      return;
    }

    setVaultSubTab(slotIndex >= 120 ? 'ext' : 'main');
    if (item) {
      setActionVaultSlot(slotIndex);
      setActionVaultItem(item);
      setActionVaultModalVisible(true);
    } else {
      setSelectedVaultSlot(slotIndex);
      setSelectedVaultItem(null);
      setVaultPickerSlot(slotIndex);
      setVaultPickerVisible(true);
    }
  };

  const handleSelectVaultPickerItem = (itemDef: ItemDefinition, slotIdx: number) => {
    setVaultPickerVisible(false);
    const randomSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
    const newItem: ParsedItem = {
      slot: slotIdx,
      hex: '',
      group: itemDef.group,
      index: itemDef.index,
      id: itemDef.id,
      name: itemDef.name,
      level: 0,
      skill: itemDef.category === 'weapon',
      luck: true,
      option: 0,
      durability: 255,
      serial: randomSerial,
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

    setWarehouseItems((prev) => [...prev.filter((i) => i.slot !== slotIdx), newItem]);
    setSelectedVaultSlot(slotIdx);
    setSelectedVaultItem(newItem);
    setTimeout(() => {
      setVaultItemModalVisible(true);
    }, 150);
  };

  const handleOpenVaultItemEditor = (itemToEdit: ParsedItem, slotIndex: number) => {
    setActionVaultModalVisible(false);
    setTimeout(() => {
      setSelectedVaultSlot(slotIndex);
      setSelectedVaultItem(itemToEdit);
      setVaultItemModalVisible(true);
    }, 150);
  };

  const addQuickItem = async (slot: number, group: number, index: number, id: number, name: string, category: any) => {
    const newItem: ParsedItem = {
      slot,
      hex: '',
      group,
      index,
      id,
      name,
      level: 0,
      skill: false,
      luck: false,
      option: 0,
      durability: 1,
      serial: Math.floor(Math.random() * 999999),
      excellentFlags: 0,
      ancientOption: 0,
      option380: false,
      harmonyType: 0,
      harmonyLevel: 0,
      sockets: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
      width: 1,
      height: 1,
      isExcellent: false,
      isAncient: false,
      category,
      spriteKey: 'diamond',
      isModified: true,
    };
    const nextItems = [...warehouseItems.filter(i => i.slot !== slot), newItem];
    setWarehouseItems(nextItems);

    if (warehouseAccount && LicenseService.canSaveInventory()) {
      try {
        const newHex = MuItemParser.rebuildInventoryHex(nextItems, 240, warehouseData?.ItemsHex);
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
        if (res && res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
          const displaySlot = (slot >= 120 ? slot - 120 : slot) + 1;
          Alert.alert('Ítem Guardado', `${name} colocado y guardado en el Baúl #${activeVaultIndex} (Cuadro #${displaySlot}).`);
          return;
        } else {
          Alert.alert('Error al guardar', res?.message || 'No se pudo sincronizar el ítem con SQL Server.');
          return;
        }
      } catch (e: any) {
        console.warn('Quick item save error:', e);
        Alert.alert('Error de conexión', e.message || 'Error al comunicar con SQL Server');
        return;
      }
    }
  };

  // Funciones auxiliares para detección de huella y colisión 2D en baúl 8x15 (H13)
  const getOccupiedVaultSlots = (items: ParsedItem[], excludeSlot?: number, isExpanded: boolean = false): Set<number> => {
    const occupied = new Set<number>();
    const baseOffset = isExpanded ? 120 : 0;
    const maxSlot = baseOffset + 120;
    items.forEach(it => {
      if (excludeSlot !== undefined && it.slot === excludeSlot) return;
      if (it.slot < baseOffset || it.slot >= maxSlot) return; // solo ítems de la sección activa
      const w = Math.max(1, it.width || 1);
      const h = Math.max(1, it.height || 1);
      const relSlot = it.slot - baseOffset;
      const baseCol = relSlot % 8;
      const baseRow = Math.floor(relSlot / 8);
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const s = baseOffset + (baseRow + r) * 8 + (baseCol + c);
          if (s < maxSlot) occupied.add(s);
        }
      }
    });
    return occupied;
  };

  const canPlaceItemInVault = (slot: number, w: number, h: number, occupied: Set<number>, isExpanded: boolean = false): boolean => {
    const baseOffset = isExpanded ? 120 : 0;
    const maxSlot = baseOffset + 120;
    if (slot < baseOffset || slot >= maxSlot) return false;
    const relSlot = slot - baseOffset;
    const col = relSlot % 8;
    const row = Math.floor(relSlot / 8);
    if (col + w > 8 || row + h > 15) return false;
    for (let r = 0; r < h; r++) {
      for (let c = 0; c < w; c++) {
        const checkSlot = baseOffset + (row + r) * 8 + (col + c);
        if (checkSlot >= maxSlot || occupied.has(checkSlot)) {
          return false;
        }
      }
    }
    return true;
  };

  const handleAddCatalogItemToVault = (itemDef: ItemDefinition) => {
    const isExpanded = warehouseViewTab === 'vault_ext';
    const baseOffset = isExpanded ? 120 : 0;
    const maxSlot = baseOffset + 120;
    const itemW = Math.max(1, itemDef.width || 1);
    const itemH = Math.max(1, itemDef.height || 1);
    const occupiedSlots = getOccupiedVaultSlots(warehouseItems, undefined, isExpanded);
    let targetSlot = -1;

    // Si el usuario tocó previamente un cuadro libre específico del baúl, comprobar si cabe ahí
    if (selectedVaultSlot !== null && selectedVaultSlot >= baseOffset && selectedVaultSlot < maxSlot && canPlaceItemInVault(selectedVaultSlot, itemW, itemH, occupiedSlots, isExpanded)) {
      targetSlot = selectedVaultSlot;
    } else {
      // Buscar primer slot libre donde quepa la huella (w x h) sin solapar ni desbordar filas (H13)
      for (let s = baseOffset; s < maxSlot; s++) {
        if (canPlaceItemInVault(s, itemW, itemH, occupiedSlots, isExpanded)) {
          targetSlot = s;
          break;
        }
      }
    }

    if (targetSlot === -1) {
      Alert.alert('Baúl Lleno o Espacio Insuficiente', `No hay espacio libre continuo para colocar un ítem de ${itemW}x${itemH} en esta sección del baúl.`);
      return;
    }

    const defaultExc = (itemDef as any).defaultExc !== undefined
      ? (itemDef as any).defaultExc
      : ((itemDef as any).subType === 'gold' || itemDef.name.includes('Dorado') ? 4 :
         (itemDef as any).subType === 'blue' || itemDef.name.includes('Azul') ? 2 :
         (itemDef as any).subType === 'black' || itemDef.name.includes('Negro') ? 1 : 0);

    const newItem: ParsedItem = {
      slot: targetSlot,
      hex: '',
      group: itemDef.group,
      index: itemDef.index,
      id: itemDef.id,
      name: itemDef.name,
      level: 0,
      skill: itemDef.category === 'weapon',
      luck: true,
      option: 0,
      durability: itemDef.durability !== undefined ? itemDef.durability : 255,
      serial: Math.floor(Math.random() * 999999),
      excellentFlags: defaultExc,
      ancientOption: 0,
      option380: false,
      harmonyType: 0,
      harmonyLevel: 0,
      sockets: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
      width: itemDef.width,
      height: itemDef.height,
      isExcellent: defaultExc > 0,
      isAncient: false,
      category: itemDef.category,
      spriteKey: itemDef.icon,
      isModified: true,
    };

    setWarehouseItems(prev => [...prev.filter(i => i.slot !== targetSlot), newItem]);
    setSelectedVaultSlot(targetSlot);
    setSelectedVaultItem(newItem);
    setTimeout(() => {
      setVaultItemModalVisible(true);
    }, 150);
  };

  const VAULT_SOCKET_OPTIONS = QUICK_SOCKET_OPTIONS;

  const liveVaultMakerHex = useMemo(() => {
    if (!selectedVaultMakerDef) return '';
    try {
      const isW = selectedVaultMakerDef.category === 'weapon' || (selectedVaultMakerDef.group !== undefined && selectedVaultMakerDef.group <= 5);
      return MuItemParser.createItemHex({
        group: selectedVaultMakerDef.group,
        index: selectedVaultMakerDef.index,
        level: vaultMakerLevel,
        option: vaultMakerOption,
        luck: vaultMakerLuck,
        skill: isW ? vaultMakerSkill : false,
        durability: vaultMakerDurability,
        excellentFlags: vaultMakerExcFlags,
        ancientOption: vaultMakerAncient,
        option380: vaultMaker380,
        harmonyType: vaultMakerHarmonyType,
        harmonyLevel: vaultMakerHarmonyLevel,
        sockets: vaultMakerEnableSockets ? vaultMakerSockets : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
      });
    } catch {
      return '';
    }
  }, [
    selectedVaultMakerDef,
    vaultMakerLevel,
    vaultMakerOption,
    vaultMakerLuck,
    vaultMakerSkill,
    vaultMakerDurability,
    vaultMakerExcFlags,
    vaultMakerAncient,
    vaultMaker380,
    vaultMakerHarmonyType,
    vaultMakerHarmonyLevel,
    vaultMakerEnableSockets,
    vaultMakerSockets,
  ]);

  const handlePlaceMakerItemInVault = async () => {
    if (!selectedVaultMakerDef) {
      Alert.alert('Selecciona un Ítem', 'Por favor selecciona un ítem del catálogo primero.');
      return;
    }

    const isExpanded = warehouseViewTab === 'vault_ext';
    const baseOffset = isExpanded ? 120 : 0;
    const maxSlot = baseOffset + 120;
    const itemW = Math.max(1, selectedVaultMakerDef.width || 1);
    const itemH = Math.max(1, selectedVaultMakerDef.height || 1);
    const isW = selectedVaultMakerDef.category === 'weapon' || (selectedVaultMakerDef.group !== undefined && selectedVaultMakerDef.group <= 5);

    const qty = Math.max(1, Math.min(20, vaultMakerQuantity || 1));
    let workingItems = [...warehouseItems];
    let placedCount = 0;
    let lastPlacedItem: ParsedItem | null = null;
    let lastDisplaySlot = 1;

    for (let q = 0; q < qty; q++) {
      const occupiedSlots = getOccupiedVaultSlots(workingItems, undefined, isExpanded);
      let targetSlot = -1;

      if (q === 0 && selectedVaultSlot !== null && selectedVaultSlot !== undefined && selectedVaultSlot >= baseOffset && selectedVaultSlot < maxSlot && canPlaceItemInVault(selectedVaultSlot, itemW, itemH, occupiedSlots, isExpanded)) {
        targetSlot = selectedVaultSlot;
      } else {
        for (let s = baseOffset; s < maxSlot; s++) {
          if (canPlaceItemInVault(s, itemW, itemH, occupiedSlots, isExpanded)) {
            targetSlot = s;
            break;
          }
        }
      }

      if (targetSlot === -1) break;

      const randomSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
      const newItem: ParsedItem = {
        slot: targetSlot,
        hex: liveVaultMakerHex || '',
        group: selectedVaultMakerDef.group,
        index: selectedVaultMakerDef.index,
        id: selectedVaultMakerDef.id,
        name: selectedVaultMakerDef.name,
        level: vaultMakerLevel,
        skill: isW ? vaultMakerSkill : false,
        luck: vaultMakerLuck,
        option: vaultMakerOption,
        durability: vaultMakerDurability,
        serial: randomSerial,
        excellentFlags: vaultMakerExcFlags,
        ancientOption: vaultMakerAncient,
        option380: vaultMaker380,
        harmonyType: vaultMakerHarmonyType,
        harmonyLevel: vaultMakerHarmonyLevel,
        sockets: vaultMakerEnableSockets ? vaultMakerSockets : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
        width: selectedVaultMakerDef.width,
        height: selectedVaultMakerDef.height,
        isExcellent: vaultMakerExcFlags > 0,
        isAncient: vaultMakerAncient > 0,
        category: selectedVaultMakerDef.category,
        spriteKey: selectedVaultMakerDef.icon,
        isModified: true,
      };

      workingItems = [...workingItems.filter(i => i.slot !== targetSlot), newItem];
      placedCount++;
      lastPlacedItem = newItem;
      lastDisplaySlot = (isExpanded ? targetSlot - 120 : targetSlot) + 1;
    }

    if (placedCount === 0) {
      Alert.alert('Baúl Lleno', `No hay espacio libre suficiente para colocar un ítem de ${itemW}x${itemH} en esta sección del baúl.`);
      return;
    }

    setWarehouseItems(workingItems);
    if (lastPlacedItem) {
      setSelectedVaultSlot(lastPlacedItem.slot);
      setSelectedVaultItem(lastPlacedItem);
    }

    if (warehouseAccount && LicenseService.canSaveInventory()) {
      try {
        const newHex = MuItemParser.rebuildInventoryHex(workingItems, 240, warehouseData?.ItemsHex);
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
        if (res && res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
          Alert.alert(
            'Ítem Colocado con Éxito',
            qty === 1
              ? `"${lastPlacedItem?.name} +${lastPlacedItem?.level}" colocado en el Cuadro #${lastDisplaySlot} y guardado en SQL Server.`
              : `Se colocaron con éxito ${placedCount} de ${qty} copias de "${lastPlacedItem?.name}" en el baúl y se guardó en SQL Server.`
          );
          return;
        }
      } catch (err: any) {
        console.warn('Auto-save maker vault item error:', err);
      }
    }

    Alert.alert(
      'Ítem Colocado',
      qty === 1
        ? `"${lastPlacedItem?.name} +${lastPlacedItem?.level}" colocado en el Cuadro #${lastDisplaySlot}. Toca "Guardar Cambios" para sincronizar con SQL Server.`
        : `Se colocaron con éxito ${placedCount} de ${qty} copias de "${lastPlacedItem?.name}" en el baúl. Toca "Guardar Cambios" para sincronizar con SQL Server.`
    );
  };

  const handleQuickMaxVaultItem = async (item: ParsedItem, slotIndex: number) => {
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

    const nextItems = [...warehouseItems.filter(i => i.slot !== slotIndex), updated];
    setWarehouseItems(nextItems);

    if (warehouseAccount && LicenseService.canSaveInventory()) {
      try {
        const newHex = MuItemParser.rebuildInventoryHex(nextItems, 240, warehouseData?.ItemsHex);
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
        if (res && res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
          Alert.alert('Full Exc +15 Aplicado', `"${updated.name}" ahora es +15 +28 Full Exc y se guardó en SQL Server.`);
          return;
        }
      } catch (err: any) {
        console.warn('Quick max save error:', err);
      }
    }
    Alert.alert('Full Exc +15 Aplicado', `"${updated.name}" ahora es +15 +28 Full Exc.`);
  };

  const handleDuplicateVaultItem = async (item: ParsedItem, slotIndex: number) => {
    const isExpanded = slotIndex >= 120 || warehouseViewTab === 'vault_ext';
    const baseOffset = isExpanded ? 120 : 0;
    const maxSlot = baseOffset + 120;
    const itemW = Math.max(1, item.width || 1);
    const itemH = Math.max(1, item.height || 1);
    const occupiedSlots = getOccupiedVaultSlots(warehouseItems, undefined, isExpanded);
    let targetSlot = -1;

    for (let s = baseOffset; s < maxSlot; s++) {
      if (s !== slotIndex && canPlaceItemInVault(s, itemW, itemH, occupiedSlots, isExpanded)) {
        targetSlot = s;
        break;
      }
    }

    if (targetSlot === -1) {
      Alert.alert('Baúl Lleno', `No hay espacio continuo suficiente para duplicar "${item.name}" (${itemW}x${itemH}) en esta sección del baúl.`);
      return;
    }

    const randomSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;
    const duplicatedItem: ParsedItem = {
      ...item,
      slot: targetSlot,
      serial: randomSerial,
      isModified: true,
    };

    const nextItems = [...warehouseItems, duplicatedItem];
    setWarehouseItems(nextItems);

    const displaySlot = (isExpanded ? targetSlot - 120 : targetSlot) + 1;

    if (warehouseAccount && LicenseService.canSaveInventory()) {
      try {
        const newHex = MuItemParser.rebuildInventoryHex(nextItems, 240, warehouseData?.ItemsHex);
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
        if (res && res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
          Alert.alert('Ítem Duplicado', `"${duplicatedItem.name}" duplicado al Cuadro #${displaySlot} y guardado en SQL Server.`);
          return;
        }
      } catch (err: any) {
        console.warn('Duplicate save error:', err);
      }
    }
    Alert.alert('Ítem Duplicado', `"${duplicatedItem.name}" duplicado al Cuadro #${displaySlot}.`);
  };

  const handleInjectQuickSetToVault = async () => {
    if (!selectedVaultQuickSet) return;
    setInjectingQuickSetToVault(true);

    try {
      const isExpanded = warehouseViewTab === 'vault_ext';
      const baseOffset = isExpanded ? 120 : 0;
      const maxSlot = baseOffset + 120;
      let currentItems = [...warehouseItems];
      let injectedCount = 0;

      for (const piece of selectedVaultQuickSet.pieces) {
        const pieceDef = DEFAULT_ITEM_CATALOG.find((i) => i.group === piece.group && i.index === piece.index) || {
          group: piece.group,
          index: piece.index,
          id: piece.group * 512 + piece.index,
          name: piece.name,
          width: piece.group >= 7 && piece.group <= 11 ? 2 : 1,
          height: piece.group === 8 ? 3 : 2,
          category: piece.group <= 5 ? 'weapon' : 'armor',
          icon: 'shield-outline',
        };

        const w = pieceDef.width || 2;
        const h = pieceDef.height || 2;
        const occupied = getOccupiedVaultSlots(currentItems, undefined, isExpanded);
        let foundSlot = -1;

        for (let s = baseOffset; s < maxSlot; s++) {
          if (canPlaceItemInVault(s, w, h, occupied, isExpanded)) {
            foundSlot = s;
            break;
          }
        }

        if (foundSlot === -1) {
          console.warn(`No space in vault for ${piece.name}`);
          continue;
        }

        const isW = pieceDef.category === 'weapon' || piece.group <= 5;
        const randomSerial = Math.floor(Math.random() * 0x7FFFFFFF) + 100000;

        let pieceAncient = 0;
        if (selectedVaultQuickSet.cat === 'ACC') {
          pieceAncient = selectedVaultQuickSet.defaultAncient || 5;
        } else if (quickSetVaultAncientTier > 0) {
          const reqTier = quickSetVaultAncientTier === 5 ? 1 : 2;
          const pOpts = getAvailableAncientOptionsForItem(piece.group, piece.index);
          const match = pOpts.find((o) => o.tier === reqTier);
          if (match) {
            pieceAncient = quickSetVaultAncientTier;
          }
        }

        const resolvedPieceName = pieceAncient > 0
          ? resolveAncientItemName(piece.group, piece.index, pieceAncient, piece.name)
          : piece.name;

        let harmType = 0;
        if (quickSetVaultHarmonyType > 0) {
          if (isW) {
            harmType = (quickSetVaultHarmonyType === 10 || quickSetVaultHarmonyType === 6 || quickSetVaultHarmonyType === 5 || quickSetVaultHarmonyType === 9)
              ? quickSetVaultHarmonyType
              : 10;
          } else {
            harmType = (quickSetVaultHarmonyType === 10 || quickSetVaultHarmonyType === 6)
              ? 7
              : quickSetVaultHarmonyType;
          }
        }

        const newItem: ParsedItem = {
          slot: foundSlot,
          hex: '',
          group: piece.group,
          index: piece.index,
          id: pieceDef.id,
          name: resolvedPieceName,
          level: quickSetVaultLevel,
          skill: isW ? quickSetVaultSkill : false,
          luck: quickSetVaultLuck,
          option: quickSetVaultOption,
          durability: 255,
          serial: randomSerial,
          excellentFlags: quickSetVaultFullExc ? 63 : 0,
          ancientOption: pieceAncient,
          option380: quickSetVault380,
          harmonyType: harmType,
          harmonyLevel: harmType > 0 ? quickSetVaultHarmonyLevel : 0,
          sockets: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
          width: w,
          height: h,
          isExcellent: quickSetVaultFullExc,
          isAncient: pieceAncient > 0,
          category: pieceDef.category as any,
          spriteKey: pieceDef.icon,
          isModified: true,
        };

        currentItems.push(newItem);
        injectedCount++;
      }

      setWarehouseItems(currentItems);
      setShowQuickSetsVaultModal(false);

      if (warehouseAccount && LicenseService.canSaveInventory()) {
        const newHex = MuItemParser.rebuildInventoryHex(currentItems, 240, warehouseData?.ItemsHex);
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
        if (res && res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
          Alert.alert(
            'Set Inyectado con Éxito',
            `Se inyectaron ${injectedCount}/${selectedVaultQuickSet.pieces.length} piezas del "${selectedVaultQuickSet.name}" al Baúl #${activeVaultIndex} (${isExpanded ? 'Bóveda Expandida' : 'Baúl Normal'}) y se guardó en SQL Server.`
          );
          return;
        }
      }

      Alert.alert(
        'Set Inyectado',
        `Se inyectaron ${injectedCount}/${selectedVaultQuickSet.pieces.length} piezas del "${selectedVaultQuickSet.name}" al Baúl #${activeVaultIndex} (${isExpanded ? 'Bóveda Expandida' : 'Baúl Normal'}).`
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo inyectar el set.');
    } finally {
      setInjectingQuickSetToVault(false);
    }
  };

  const handleSetMaxZen = () => {
    if (!LicenseService.isPro()) {
      Alert.alert(
        'Límite DEMO',
        'En versión DEMO el Zen máximo permitido es 10,000,000. Activa la versión PRO para hasta 2,000,000,000.'
      );
      setVaultMoney(10000000);
    } else {
      setVaultMoney(2000000000);
    }
  };

  const handleSaveVaultItem = async (updated: ParsedItem) => {
    const targetSlot = (selectedVaultSlot !== null && selectedVaultSlot !== undefined) ? selectedVaultSlot : updated.slot;
    const isExpanded = targetSlot >= 120 || warehouseViewTab === 'vault_ext';
    const displaySlot = (isExpanded && targetSlot >= 120 ? targetSlot - 120 : targetSlot) + 1;
    const withModified: ParsedItem = { ...updated, slot: targetSlot, isModified: true };
    const nextItems = [...warehouseItems.filter(i => i.slot !== targetSlot && i.slot !== updated.slot), withModified];
    setWarehouseItems(nextItems);
    setVaultSubTab('main');

    // Auto-sincronizar inmediatamente con SQL Server si la cuenta está abierta y tiene licencia
    if (warehouseAccount && LicenseService.canSaveInventory()) {
      try {
        const newHex = MuItemParser.rebuildInventoryHex(nextItems, 240, warehouseData?.ItemsHex);
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
        if (res && res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
          Alert.alert(
            'Ítem Guardado en Baúl',
            `El ítem "${updated.name}" fue guardado y sincronizado exitosamente en el Baúl #${activeVaultIndex} (${isExpanded ? 'Bóveda Expandida' : 'Baúl Normal'}, Cuadro #${displaySlot}).`
          );
          return;
        } else {
          Alert.alert('Error al sincronizar', res?.message || 'No se pudo auto-guardar en SQL Server.');
          return;
        }
      } catch (err: any) {
        console.warn('Auto-save vault error:', err);
        Alert.alert('Error de conexión', err.message || 'Error al conectar con SQL Server');
        return;
      }
    }
    Alert.alert(
      'Ítem Colocado',
      `El ítem "${updated.name}" fue colocado en el cuadro #${displaySlot}. Presiona "Guardar Cambios" para sincronizar con SQL Server.`
    );
  };

  const handleDeleteVaultItem = async (slotIndex: number) => {
    const isExpanded = slotIndex >= 120 || warehouseViewTab === 'vault_ext';
    const displaySlot = (isExpanded && slotIndex >= 120 ? slotIndex - 120 : slotIndex) + 1;
    const nextItems = warehouseItems.filter(i => i.slot !== slotIndex);
    setWarehouseItems(nextItems);
    if (warehouseAccount && LicenseService.canSaveInventory()) {
      try {
        const newHex = MuItemParser.rebuildInventoryHex(nextItems, 240, warehouseData?.ItemsHex);
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, newHex, vaultMoney);
        if (res && res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: newHex, Money: vaultMoney }));
          Alert.alert('Ítem Eliminado', `El ítem en el cuadro #${displaySlot} fue eliminado y sincronizado en SQL Server.`);
          return;
        } else {
          Alert.alert('Error al eliminar', res?.message || 'No se pudo sincronizar la eliminación en SQL Server.');
          return;
        }
      } catch (e: any) {
        console.warn('Auto-delete vault item error:', e);
        Alert.alert('Error de conexión', e.message || 'Error al comunicar con SQL Server');
        return;
      }
    }
    Alert.alert('Ítem Eliminado', `El ítem en el cuadro #${displaySlot} ha sido removido.`);
  };

  const handleSaveWarehouse = async () => {
    if (!warehouseAccount) return;
    if (!warehouseData) {
      Alert.alert('Error', 'No se ha cargado la información del baúl. Cárgalo nuevamente antes de guardar.');
      return;
    }
    if (!LicenseService.canSaveInventory()) {
      Alert.alert(
        'Función Bloqueada en DEMO',
        'El guardado y sincronización de ítems del baúl con SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }

    const doSaveVault = async (hexToSave: string) => {
      setSavingWarehouse(true);
      try {
        const res = await SqlClient.saveAccountWarehouse(warehouseAccount, activeVaultIndex, hexToSave, vaultMoney);
        if (res.success) {
          setWarehouseData((prev: any) => ({ ...prev, ItemsHex: hexToSave, Money: vaultMoney }));
          Alert.alert('Baúl Guardado', `Los 240 slots (Baúl Normal + Bóveda Expandida) y el Zen del Baúl #${activeVaultIndex} se sincronizaron con éxito en SQL Server.`);
        } else {
          Alert.alert('Error al guardar', res.message);
        }
      } finally {
        setSavingWarehouse(false);
      }
    };

    setSavingWarehouse(true);
    try {
      const newHex = MuItemParser.rebuildInventoryHex(warehouseItems, 240, warehouseData?.ItemsHex);
      if (!newHex || newHex.length < 7680) {
        Alert.alert('Error de Integridad', 'El búfer hexadecimal generado es inválido. Operación cancelada para proteger el baúl.');
        return;
      }

      // Verificación preventiva en tiempo real si el jugador está conectado
      let isOnline = false;
      try {
        isOnline = await SqlClient.isAccountConnected(warehouseAccount);
      } catch (_) {}

      if (isOnline) {
        setSavingWarehouse(false);
        Alert.alert(
          'Jugador en Línea en el Juego',
          'El jugador está CONECTADO al juego. Para evitar que el GameServer sobreescriba los datos en memoria al salir, debe desconectarse. ¿Deseas desconectarlo automáticamente y proceder?\n\n⚠️ AVISO TÉCNICO: Desde la conexión SQL directa no es posible cerrar el cliente de juego (la sesión activa vive en la memoria RAM del GameServer).',
          [
            { text: 'Esperar a que salga', style: 'cancel' },
            {
              text: 'Liberar Traba SQL',
              onPress: async () => {
                setSavingWarehouse(true);
                try {
                  await SqlClient.disconnectAccount(warehouseAccount);
                  await new Promise((r) => setTimeout(r, 1000));
                  await doSaveVault(newHex);
                } catch (e: any) {
                  Alert.alert('Error', e.message || 'Error al actualizar estado en SQL');
                } finally {
                  setSavingWarehouse(false);
                }
              },
            },
          ]
        );
        return;
      }

      await doSaveVault(newHex);
    } finally {
      setSavingWarehouse(false);
    }
  };

  const getPlanBadge = (level: number = 0) => {
    switch (level) {
      case 3:
        return { label: 'Oro', color: '#FFD700', dot: '#FFD700' };
      case 2:
        return { label: 'Plata', color: '#B0BEC5', dot: '#B0BEC5' };
      case 1:
        return { label: 'Bronce', color: '#CD7F32', dot: '#CD7F32' };
      default:
        return { label: 'Free', color: THEME.colors.textoSecundario, dot: THEME.colors.textoSecundario };
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topInset + 10 }]}>
      {/* Header Principal estilo Captura 1 */}
      <View style={styles.headerRow}>
        <Text style={styles.mainTitle}>{t('tabAccounts') || 'Cuentas'}</Text>
        <TouchableOpacity
          style={styles.floatingAddBtn}
          onPress={() => setCreateModalVisible(true)}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons name="plus" size={24} color="#E8C86A" />
        </TouchableOpacity>
      </View>

      {/* Barra de Búsqueda con Autocomplete */}
      <AutocompleteInput
        value={search}
        onChangeText={handleSearch}
        suggestions={accounts.map((a) => a.memb___id)}
        placeholder="Buscar cuenta..."
        icon="magnify"
        clearable={true}
        containerStyle={{ marginBottom: 16 }}
      />

      {/* Error Banner si no hay conexión real */}
      {errorMessage && (
        <View style={styles.errorCard}>
          <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF5252" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.errorTitle}>Sin conexión a SQL Server</Text>
            <Text style={styles.errorSub}>{errorMessage}</Text>
          </View>
          <TouchableOpacity onPress={fetchAccounts} style={styles.retryBtn}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Lista de Cuentas */}
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item.memb___id || 'account'}_${index}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(32, insets.bottom + 24) }]}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchAccounts}
            tintColor={THEME.colors.primaryOrange}
          />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="account-search" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyText}>
                {errorMessage
                  ? 'No se cargaron cuentas debido a un error de conexión.'
                  : 'No se encontraron cuentas registradas en tu servidor.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const badge = getPlanBadge(item.AccountLevel);
          const isBlocked = String(item.bloc_code) === '1';
          const isOnline = item.ConnectStat === 1;
          const initial = (item.memb___id || 'M').charAt(0).toUpperCase();

          return (
            <TouchableOpacity
              style={[styles.accountCard, isBlocked && styles.accountCardBlocked]}
              activeOpacity={0.8}
              onPress={() => openAccountDetails(item)}
              onLongPress={() => openAccountDetails(item)}
              {...(Platform.OS === 'web' ? { onContextMenu: (e: any) => { e.preventDefault(); openAccountDetails(item); } } : {})}
            >
              {/* Círculo con Inicial Naranja */}
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>{initial}</Text>
                {isOnline && (
                  <View style={styles.onlineStatusDot} />
                )}
              </View>

              {/* Información de Cuenta */}
              <View style={styles.accountTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text style={styles.accountIdText} numberOfLines={1}>
                    {item.memb___id}
                  </Text>
                  {isOnline && (
                    <View style={styles.onlineBadgePill}>
                      <Text style={styles.onlineBadgeText}>ONLINE</Text>
                    </View>
                  )}
                  {isBlocked && (
                    <View style={[styles.onlineBadgePill, { backgroundColor: '#D32F2F20', borderColor: '#D32F2F' }]}>
                      <Text style={[styles.onlineBadgeText, { color: '#FF5252' }]}>BANEADA</Text>
                    </View>
                  )}
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, flexWrap: 'wrap' }}>
                  <Text style={styles.accountEmailText} numberOfLines={1}>
                    {item.mail_addr || `${item.memb___id}@muonline.com`}
                  </Text>
                  {item.CharCount !== undefined && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#241E1A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#3D312A' }}>
                      <MaterialCommunityIcons name="account-group" size={11} color="#E8C86A" />
                      <Text style={{ color: '#E8C86A', fontSize: 10, fontWeight: 'bold' }}>{item.CharCount} PJs</Text>
                    </View>
                  )}
                  {!!item.IP && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#241E1A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#3D312A' }}>
                      <MaterialCommunityIcons name="ip-network" size={11} color="#FFB300" />
                      <Text style={{ color: '#FFB300', fontSize: 10, fontWeight: 'bold' }}>{item.IP}</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Acciones Rápidas: Botón Editar, Botón Baúl y Badge VIP */}
              <View style={styles.cardRightGroup}>
                <TouchableOpacity
                  style={styles.editAccountQuickBtn}
                  onPress={() => openAccountDetails(item)}
                  activeOpacity={0.7}
                  accessibilityLabel="Editar Cuenta"
                >
                  <MaterialCommunityIcons name="account-edit-outline" size={20} color="#E8C86A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.warehouseBoxBtn}
                  onPress={() => openWarehouseForAccount(item.memb___id)}
                  activeOpacity={0.7}
                  accessibilityLabel="Ver Baúl"
                >
                  <MaterialCommunityIcons name="package-variant-closed" size={20} color="#E8C86A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteAccountQuickBtn}
                  onPress={() => promptDeleteAccountDirect(item)}
                  activeOpacity={0.7}
                  accessibilityLabel="Eliminar Cuenta"
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF5252" />
                </TouchableOpacity>

                <View style={styles.vipPillBadge}>
                  <Text style={styles.vipPillText}>{badge.label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* ======================================================== */}
      {/* MODAL 1: EDICIÓN INTEGRAL DE CUENTA (USER, PASS, VIP, COINS) */}
      {/* ======================================================== */}
      <Modal
        visible={accountDetailVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setAccountDetailVisible(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={styles.detailModalCard}>
            {/* Header del Modal */}
            <View style={styles.detailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={styles.avatarCircleSmall}>
                  <Text style={styles.avatarLetterSmall}>
                    {(selectedAccount?.memb___id || 'M').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.detailTitle}>{selectedAccount?.memb___id}</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                        backgroundColor: selectedAccount?.ConnectStat === 1 ? 'rgba(63, 207, 142, 0.15)' : 'rgba(150, 150, 150, 0.15)',
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: selectedAccount?.ConnectStat === 1 ? THEME.colors.jade : THEME.colors.textoSecundario,
                        }}
                      />
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: '700',
                          color: selectedAccount?.ConnectStat === 1 ? THEME.colors.jade : THEME.colors.textoSecundario,
                        }}
                      >
                        {selectedAccount?.ConnectStat === 1 ? 'ONLINE' : 'OFFLINE'}
                      </Text>
                    </View>
                  </View>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11 }}>Editar Información de Cuenta</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAccountDetailVisible(false)} style={styles.closeModalBtn}>
                <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(30, insets.bottom + 16) }}>
              {/* Campo Usuario (ID de Cuenta) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Usuario (Account ID)</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editUsername}
                    onChangeText={setEditUsername}
                    autoCapitalize="none"
                    placeholder="Usuario"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>
                <Text style={styles.helperSubtext}>* Modificarlo renombrará la cuenta y sus personajes en cascada.</Text>
              </View>

              {/* Campo Contraseña con botón Ver/Ocultar */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Contraseña (Password)</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editPassword}
                    onChangeText={setEditPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    placeholder="Contraseña"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                    <MaterialCommunityIcons name={showPassword ? "eye-off" : "eye"} size={20} color={THEME.colors.textoSecundario} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Campo Nombre Titular */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nombre / Titular</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Nombre del jugador"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>
              </View>

              {/* Campo Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Correo Electrónico</Text>
                <View style={styles.modalInputBox}>
                  <TextInput
                    style={styles.modalTextInput}
                    value={editEmail}
                    onChangeText={setEditEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholder="correo@ejemplo.com"
                    placeholderTextColor={THEME.colors.textMuted}
                  />
                </View>
              </View>

              {/* Campo Nivel VIP */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nivel de Cuenta (VIP)</Text>
                <View style={styles.vipRow}>
                  {[
                    { level: 0, label: 'Free', color: THEME.colors.textoSecundario },
                    { level: 1, label: 'Bronce', color: '#CD7F32' },
                    { level: 2, label: 'Plata', color: '#B0BEC5' },
                    { level: 3, label: 'Oro', color: '#FFD700' },
                  ].map((v) => {
                    const isActive = editVipLevel === v.level;
                    return (
                      <TouchableOpacity
                        key={v.level}
                        style={[styles.vipPillBtn, isActive && { borderColor: v.color, backgroundColor: 'rgba(255, 255, 255, 0.08)' }]}
                        onPress={() => setEditVipLevel(v.level)}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: v.color, marginBottom: 2 }} />
                        <Text style={[styles.vipPillBtnText, isActive && { color: v.color, fontWeight: 'bold' }]}>
                          {v.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Campo Fecha VIP y Añadir Días */}
              <View style={styles.fieldGroup}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Text style={styles.fieldLabel}>Vencimiento VIP</Text>
                  <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>
                    {selectedAccount?.AccountExpireDate
                      ? new Date(selectedAccount.AccountExpireDate).toLocaleDateString()
                      : 'Sin fecha (Free)'}
                  </Text>
                </View>
                <View style={styles.daysRow}>
                  <View style={[styles.modalInputBox, { flex: 1 }]}>
                    <TextInput
                      style={styles.modalTextInput}
                      value={addVipDaysInput}
                      onChangeText={setAddVipDaysInput}
                      keyboardType="numeric"
                      placeholder="+ Días a sumar"
                      placeholderTextColor={THEME.colors.textMuted}
                    />
                  </View>
                  <TouchableOpacity style={styles.quickDayBtn} onPress={() => setAddVipDaysInput('15')}>
                    <Text style={styles.quickDayText}>+15d</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickDayBtn} onPress={() => setAddVipDaysInput('30')}>
                    <Text style={styles.quickDayText}>+30d</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.quickDayBtn} onPress={() => setAddVipDaysInput('90')}>
                    <Text style={styles.quickDayText}>+90d</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Monedas Virtuales CashShop */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Monedas CashShop / Puntos</Text>
                <View style={styles.coinsRow}>
                  <View style={styles.coinCol}>
                    <Text style={styles.coinLabel}>WCoinC</Text>
                    <TextInput
                      style={styles.coinInput}
                      value={editCoinC}
                      onChangeText={setEditCoinC}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textMuted}
                    />
                  </View>
                  <View style={styles.coinCol}>
                    <Text style={styles.coinLabel}>WCoinP</Text>
                    <TextInput
                      style={styles.coinInput}
                      value={editCoinP}
                      onChangeText={setEditCoinP}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textMuted}
                    />
                  </View>
                  <View style={styles.coinCol}>
                    <Text style={styles.coinLabel}>GoblinP</Text>
                    <TextInput
                      style={styles.coinInput}
                      value={editGoblinPoint}
                      onChangeText={setEditGoblinPoint}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textMuted}
                    />
                  </View>
                  <View style={styles.coinCol}>
                    <Text style={styles.coinLabel}>Ruud</Text>
                    <TextInput
                      style={styles.coinInput}
                      value={editRuud}
                      onChangeText={setEditRuud}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={THEME.colors.textMuted}
                    />
                  </View>
                </View>
              </View>

              {/* Baúles Habilitados (WarehouseCount) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Baúles Habilitados (WarehouseCount)</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      const c = Math.max(1, (parseInt(editWarehouseCount, 10) || 1) - 1);
                      setEditWarehouseCount(String(c));
                    }}
                  >
                    <MaterialCommunityIcons name="minus" size={20} color="#FFF" />
                  </TouchableOpacity>
                  <View style={[styles.modalInputBox, { flex: 1, justifyContent: 'center' }]}>
                    <TextInput
                      style={[styles.modalTextInput, { textAlign: 'center', fontWeight: 'bold' }]}
                      value={editWarehouseCount}
                      onChangeText={setEditWarehouseCount}
                      keyboardType="numeric"
                      placeholder="1"
                      placeholderTextColor={THEME.colors.textMuted}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => {
                      const c = Math.min(250, (parseInt(editWarehouseCount, 10) || 1) + 1);
                      setEditWarehouseCount(String(c));
                    }}
                  >
                    <MaterialCommunityIcons name="plus" size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Estado de cuenta (Bloqueado / Desbloqueado) */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Estado de Cuenta</Text>
                <TouchableOpacity
                  style={[
                    styles.statusToggleButton,
                    String(selectedAccount?.bloc_code) === '1' ? styles.statusBlocked : styles.statusActive,
                  ]}
                  onPress={() => selectedAccount && handleToggleBlock(selectedAccount)}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons
                    name={String(selectedAccount?.bloc_code) === '1' ? 'lock' : 'lock-open-outline'}
                    size={20}
                    color={String(selectedAccount?.bloc_code) === '1' ? '#FF5252' : THEME.colors.jade}
                  />
                  <Text
                    style={[
                      styles.statusToggleText,
                      { color: String(selectedAccount?.bloc_code) === '1' ? '#FF5252' : THEME.colors.jade },
                    ]}
                  >
                    {String(selectedAccount?.bloc_code) === '1' ? 'Cuenta Bloqueada (Baneada)' : 'Cuenta Activa (Desbloqueada)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Botón Guardar Cambios en SQL Server */}
              <TouchableOpacity
                style={styles.saveAccountBtn}
                onPress={handleSaveAccount}
                disabled={savingAccount}
                activeOpacity={0.8}
              >
                {savingAccount ? (
                  <ActivityIndicator size="small" color="#0D0D0D" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="content-save-check" size={20} color="#0D0D0D" />
                    <Text style={styles.saveAccountBtnText}>Guardar Cambios en SQL Server</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Botón Desconectar Cuenta Trabada (Unstick) */}
              <TouchableOpacity
                style={styles.disconnectBtn}
                onPress={handleDisconnectAccount}
                disabled={disconnectingAccount}
                activeOpacity={0.8}
              >
                {disconnectingAccount ? (
                  <ActivityIndicator size="small" color="#FF5252" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="power-plug-off" size={18} color="#FF5252" />
                    <Text style={styles.disconnectBtnText}>Desconectar Cuenta Trabada (Unstick)</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Botón Eliminar Cuenta Completa de SQL */}
              <TouchableOpacity
                style={styles.deleteAccountBtn}
                onPress={promptDeleteSelectedAccount}
                disabled={deletingAccount}
                activeOpacity={0.8}
              >
                {deletingAccount ? (
                  <ActivityIndicator size="small" color="#FF5252" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="trash-can-outline" size={18} color="#FF5252" />
                    <Text style={styles.deleteAccountBtnText}>Eliminar Cuenta Completa de SQL</Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Sección Personajes de la Cuenta */}
              <View style={styles.charSectionBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.fieldLabel}>Personajes ({accountChars.length}/5)</Text>
                  {accountChars.length > 0 && (
                    <Text style={{ color: '#29B6F6', fontSize: 11, fontWeight: 'bold' }}>
                      {accountChars.length} {accountChars.length === 1 ? 'personaje' : 'personajes'}
                    </Text>
                  )}
                </View>

                {loadingAccountChars ? (
                  <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#29B6F6" />
                  </View>
                ) : accountChars.length === 0 ? (
                  <View style={styles.noCharsCard}>
                    <MaterialCommunityIcons name="alert-circle-outline" size={20} color="#FF9800" />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text style={styles.noCharsText}>Esta cuenta no posee personajes creados.</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.quickCreateCharBtn}
                      onPress={() => {
                        setAccountDetailVisible(false);
                        navigation.navigate('PJs', { filterAccount: selectedAccount?.memb___id });
                      }}
                    >
                      <Text style={styles.quickCreateCharBtnText}>+ Crear</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.charChipsList}>
                    {accountChars.map((c) => {
                      const classInfo = getMuClassInfo(c.Class);
                      return (
                        <TouchableOpacity
                          key={c.Name}
                          style={styles.charChipItem}
                          onPress={() => {
                            setAccountDetailVisible(false);
                            navigation.navigate('CharacterEdit', { characterName: c.Name });
                          }}
                        >
                          <ClassAvatar classId={c.Class} size={28} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.charChipName} numberOfLines={1}>{c.Name}</Text>
                            <Text style={styles.charChipSub}>{classInfo.name} • Lv {c.cLevel} ({c.ResetCount || 0}R)</Text>
                          </View>
                          <MaterialCommunityIcons name="chevron-right" size={16} color={THEME.colors.textoSecundario} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Botones Rápidos: Ver Personajes y Warehouse */}
              <View style={styles.detailActionButtonsRow}>
                <TouchableOpacity
                  style={styles.detailBtnPjs}
                  onPress={() => {
                    setAccountDetailVisible(false);
                    if (selectedAccount?.memb___id) {
                      navigation.navigate('PJs', { filterAccount: selectedAccount.memb___id });
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="sword-cross" size={18} color="#29B6F6" />
                  <Text style={styles.detailBtnPjsText}>Ver Personajes</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailBtnWarehouse}
                  onPress={() => {
                    if (selectedAccount?.memb___id) {
                      openWarehouseForAccount(selectedAccount.memb___id, 'warehouse');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="package-variant-closed" size={18} color="#FF9800" />
                  <Text style={styles.detailBtnWarehouseText}>Baúl (/ware)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.detailBtnWarehouse, { backgroundColor: 'rgba(91, 141, 239, 0.12)', borderColor: THEME.colors.arcano }]}
                  onPress={() => {
                    if (selectedAccount?.memb___id) {
                      openWarehouseForAccount(selectedAccount.memb___id, 'vault_ext');
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="safe" size={18} color={THEME.colors.arcano} />
                  <Text style={[styles.detailBtnWarehouseText, { color: THEME.colors.arcano }]}>Bóveda Expandida</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: GESTIÓN INTERACTIVA DE WAREHOUSE (CAPTURAS 1-4) */}
      {/* ======================================================== */}
      <Modal
        visible={warehouseModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={handleCloseWarehouseModal}
      >
        <View style={[styles.whScreenContainer, { paddingTop: topInset }]}>
          {/* Header Superior (Capturas 1, 2, 3) */}
          <View style={styles.whHeader}>
            <TouchableOpacity
              onPress={handleCloseWarehouseModal}
              style={styles.whBackBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.whBackBtnText}>← Volver</Text>
            </TouchableOpacity>

            <View style={styles.whHeaderTitleRow}>
              <Text style={styles.whHeaderTitle}>
                {warehouseViewTab === 'vault_ext'
                  ? 'Bóveda Expandida del Baúl'
                  : warehouseViewTab === 'items'
                  ? 'Item Maker para Baúl'
                  : `${activeVaultIndex === 0 ? 'Baúl Principal' : 'Baúl #' + activeVaultIndex}`}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => loadVaultData(warehouseAccount, activeVaultIndex)}
              style={styles.whRefreshBtn}
              activeOpacity={0.7}
              disabled={loadingWarehouse}
            >
              <MaterialCommunityIcons name="sync" size={20} color="#78909C" />
            </TouchableOpacity>
          </View>

          {/* Banner de Aviso de Soft-Lock Colaborativo Multi-Admin */}
          {warehouseLockWarning ? (
            <View style={styles.whLockWarningBanner}>
              <MaterialCommunityIcons name="shield-alert" size={18} color="#FFD54F" />
              <Text style={styles.whLockWarningText}>{warehouseLockWarning}</Text>
              <TouchableOpacity onPress={() => setWarehouseLockWarning(null)}>
                <MaterialCommunityIcons name="close" size={16} color="#FFE082" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* VISTA 1: TAB ITEMS - EDITOR COMPLETO (ITEM MAKER PARA WAREHOUSE) */}
          {warehouseViewTab === 'items' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Barra Superior con Botón Quick Sets y Colocar */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: 'rgba(232, 200, 106, 0.15)',
                    borderColor: '#B58F3C',
                    borderWidth: 1.5,
                    borderRadius: 6,
                    paddingVertical: 11,
                    minHeight: 44,
                  }}
                  onPress={() => setShowQuickSetsVaultModal(true)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="flash" size={18} color="#E8C86A" />
                  <Text style={{ color: '#E8C86A', fontSize: 12, fontWeight: '800' }}>
                    INYECTAR SET
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1.2,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    backgroundColor: '#3FCF8E',
                    borderRadius: 6,
                    paddingVertical: 11,
                    minHeight: 44,
                  }}
                  onPress={handlePlaceMakerItemInVault}
                  activeOpacity={0.8}
                >
                  <MaterialCommunityIcons name="plus-box" size={18} color="#100D0B" />
                  <Text style={{ color: '#100D0B', fontSize: 12, fontWeight: '800' }}>
                    {vaultSubTab === 'ext' ? 'COLOCAR EN BÓVEDA' : 'COLOCAR EN BAÚL'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tarjeta Informativa / Destino */}
              <View style={styles.whBannerCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MaterialCommunityIcons name="tools" size={16} color="#E8C86A" />
                    <Text style={styles.whBannerTitle}>Item Maker del Baúl</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(63, 207, 142, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#3FCF8E' }}>
                    <Text style={{ color: '#3FCF8E', fontSize: 11, fontWeight: 'bold' }}>
                      {selectedVaultSlot !== null && selectedVaultSlot >= 0 ? `Cuadro #${(selectedVaultSlot >= 120 ? selectedVaultSlot - 120 : selectedVaultSlot) + 1}` : 'Slot Auto'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.whBannerSubtitle}>
                  Configura todas las opciones (Nivel, Exc, Ancient, Harmony, Sockets) y colócalo en {vaultSubTab === 'ext' ? 'la Bóveda Expandida' : activeVaultIndex === 0 ? 'el Baúl Principal' : 'el Baúl #' + activeVaultIndex}.
                </Text>
              </View>

              {/* Tarjeta de Previsualización del Ítem Configurado */}
              {selectedVaultMakerDef && (
                <View style={{
                  backgroundColor: '#2B2521',
                  borderRadius: 6,
                  borderWidth: 1.5,
                  borderColor: vaultMakerExcFlags > 0 ? '#3FCF8E' : (vaultMakerAncient > 0 ? '#5B8DEF' : '#B58F3C'),
                  padding: 12,
                  marginBottom: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      width: 60,
                      height: 60,
                      borderRadius: 6,
                      backgroundColor: '#100D0B',
                      borderWidth: 1,
                      borderColor: '#6B5533',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <ItemImage
                        item={{
                          slot: 0,
                          hex: liveVaultMakerHex,
                          group: selectedVaultMakerDef.group,
                          index: selectedVaultMakerDef.index,
                          id: selectedVaultMakerDef.id,
                          name: selectedVaultMakerDef.name,
                          level: vaultMakerLevel,
                          skill: vaultMakerSkill,
                          luck: vaultMakerLuck,
                          option: vaultMakerOption,
                          durability: vaultMakerDurability,
                          serial: 0,
                          excellentFlags: vaultMakerExcFlags,
                          ancientOption: vaultMakerAncient,
                          option380: vaultMaker380,
                          harmonyType: vaultMakerHarmonyType,
                          harmonyLevel: vaultMakerHarmonyLevel,
                          sockets: vaultMakerEnableSockets ? vaultMakerSockets : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
                          width: selectedVaultMakerDef.width,
                          height: selectedVaultMakerDef.height,
                          isExcellent: vaultMakerExcFlags > 0,
                          isAncient: vaultMakerAncient > 0,
                          category: selectedVaultMakerDef.category,
                          spriteKey: selectedVaultMakerDef.icon,
                          isModified: true,
                        }}
                        size={52}
                        fallbackIcon={selectedVaultMakerDef.icon as any}
                        fallbackColor="#FF9800"
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text style={{
                        color: vaultMakerExcFlags > 0 ? THEME.colors.jade : (vaultMakerAncient > 0 ? THEME.colors.arcano : '#FFFFFF'),
                        fontSize: 15,
                        fontWeight: '800',
                      }}>
                        {selectedVaultMakerDef.name} +{vaultMakerLevel}
                      </Text>
                      <Text style={{ color: '#8E8E93', fontSize: 11, marginTop: 2 }}>
                        Opción: +{vaultMakerOption * 4} • Tamaño: {selectedVaultMakerDef.width}×{selectedVaultMakerDef.height} • Dur: {vaultMakerDurability}
                      </Text>

                      {/* Badges Fila */}
                      <View style={{ flexDirection: 'row', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                        {vaultMakerLuck && (
                          <View style={{ backgroundColor: 'rgba(63, 207, 142, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: THEME.colors.jade }}>
                            <Text style={{ color: THEME.colors.jade, fontSize: 10, fontWeight: '700' }}>Luck</Text>
                          </View>
                        )}
                        {vaultMakerSkill && (
                          <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FF9800' }}>
                            <Text style={{ color: '#FF9800', fontSize: 10, fontWeight: '700' }}>Skill</Text>
                          </View>
                        )}
                        {vaultMaker380 && (
                          <View style={{ backgroundColor: 'rgba(255, 64, 129, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#FF4081' }}>
                            <Text style={{ color: '#FF4081', fontSize: 10, fontWeight: '700' }}>380</Text>
                          </View>
                        )}
                        {vaultMakerAncient > 0 && (
                          <View style={{ backgroundColor: 'rgba(91, 141, 239, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#5B8DEF' }}>
                            <Text style={{ color: '#5B8DEF', fontSize: 10, fontWeight: '700' }}>Ancient</Text>
                          </View>
                        )}
                        {vaultMakerHarmonyType > 0 && (
                          <View style={{ backgroundColor: 'rgba(232, 200, 106, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E8C86A' }}>
                            <Text style={{ color: '#E8C86A', fontSize: 10, fontWeight: '700' }}>Harmony</Text>
                          </View>
                        )}
                        {vaultMakerEnableSockets && (
                          <View style={{ backgroundColor: 'rgba(232, 200, 106, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#E8C86A' }}>
                            <Text style={{ color: '#E8C86A', fontSize: 10, fontWeight: '700' }}>Sockets</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                </View>
              )}

              {/* CONTROLES DE NIVEL Y OPCIONES */}
              <View style={styles.whControlCardBox}>
                <Text style={styles.whSectionHeader}>NIVEL Y OPCIONES</Text>
                
                {/* Level Stepper */}
                <View style={styles.whOptionRow}>
                  <Text style={styles.whOptionLabel}>Nivel (+0 a +15):</Text>
                  <View style={styles.whStepper}>
                    <TouchableOpacity
                      style={styles.whStepBtnSmall}
                      onPress={() => setVaultMakerLevel(prev => Math.max(0, prev - 1))}
                    >
                      <Text style={styles.whStepBtnTextSmall}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.whStepperVal}>+{vaultMakerLevel}</Text>
                    <TouchableOpacity
                      style={styles.whStepBtnSmall}
                      onPress={() => setVaultMakerLevel(prev => Math.min(15, prev + 1))}
                    >
                      <Text style={styles.whStepBtnTextSmall}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.whMaxBtnSmall}
                      onPress={() => setVaultMakerLevel(15)}
                    >
                      <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Option Stepper */}
                <View style={styles.whOptionRow}>
                  <Text style={styles.whOptionLabel}>Opción (+0 a +28):</Text>
                  <View style={styles.whStepper}>
                    <TouchableOpacity
                      style={styles.whStepBtnSmall}
                      onPress={() => setVaultMakerOption(prev => Math.max(0, prev - 1))}
                    >
                      <Text style={styles.whStepBtnTextSmall}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.whStepperVal}>+{vaultMakerOption * 4}</Text>
                    <TouchableOpacity
                      style={styles.whStepBtnSmall}
                      onPress={() => setVaultMakerOption(prev => Math.min(7, prev + 1))}
                    >
                      <Text style={styles.whStepBtnTextSmall}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.whMaxBtnSmall}
                      onPress={() => setVaultMakerOption(7)}
                    >
                      <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Durability */}
                <View style={styles.whOptionRow}>
                  <Text style={styles.whOptionLabel}>Durabilidad (0 a 255):</Text>
                  <View style={styles.whStepper}>
                    <TextInput
                      style={styles.whNumInputSmall}
                      keyboardType="numeric"
                      value={String(vaultMakerDurability)}
                      onChangeText={(t) => setVaultMakerDurability(Math.min(255, Math.max(0, parseInt(t, 10) || 0)))}
                    />
                    <TouchableOpacity
                      style={styles.whMaxBtnSmall}
                      onPress={() => setVaultMakerDurability(255)}
                    >
                      <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ATRIBUTOS ESPECIALES (Luck, Skill, PvP 380) */}
              <View style={styles.whControlCardBox}>
                <Text style={styles.whSectionHeader}>ATRIBUTOS ESPECIALES</Text>
                
                <View style={styles.whSwitchRow}>
                  <Text style={styles.whOptionLabel}>Suerte (Luck + Crítico):</Text>
                  <Switch
                    value={vaultMakerLuck}
                    onValueChange={setVaultMakerLuck}
                    trackColor={{ false: '#333333', true: THEME.colors.jade }}
                    thumbColor={vaultMakerLuck ? THEME.colors.jade : THEME.colors.textMuted}
                  />
                </View>

                <View style={styles.whSwitchRow}>
                  <Text style={styles.whOptionLabel}>Habilidad (Skill):</Text>
                  <Switch
                    value={vaultMakerSkill}
                    onValueChange={setVaultMakerSkill}
                    trackColor={{ false: '#333333', true: '#FF9800' }}
                    thumbColor={vaultMakerSkill ? '#FF9800' : THEME.colors.textMuted}
                  />
                </View>

                <View style={styles.whSwitchRow}>
                  <Text style={styles.whOptionLabel}>Opción 380 PvP:</Text>
                  <Switch
                    value={vaultMaker380}
                    onValueChange={setVaultMaker380}
                    trackColor={{ false: '#333333', true: '#FF4081' }}
                    thumbColor={vaultMaker380 ? '#FF4081' : THEME.colors.textMuted}
                  />
                </View>
              </View>

              {/* FENRIR SPECIAL COLOR (si es Fenrir) */}
              {((selectedVaultMakerDef?.group === 13 && selectedVaultMakerDef?.index === 37) || selectedVaultMakerDef?.name?.toLowerCase().includes('fenrir')) && (
                <View style={[styles.whControlCardBox, { borderColor: '#EAB308', borderWidth: 1 }]}>
                  <Text style={[styles.whSectionHeader, { color: '#FACC15' }]}>COLOR DE FENRIR</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                    {[
                      { label: 'Rojo', flags: 0, color: '#FF5252' },
                      { label: 'Negro', flags: 1, color: THEME.colors.textoSecundario },
                      { label: 'Azul', flags: 2, color: '#64B5F6' },
                      { label: 'Dorado', flags: 4, color: THEME.colors.oroClaro },
                    ].map((fen) => {
                      const isSel = vaultMakerExcFlags === fen.flags;
                      return (
                        <TouchableOpacity
                          key={`fen_${fen.flags}`}
                          style={[
                            styles.whFenrirPill,
                            isSel && { borderColor: fen.color, backgroundColor: `${fen.color}22` },
                          ]}
                          onPress={() => setVaultMakerExcFlags(fen.flags)}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '700', color: isSel ? fen.color : THEME.colors.textoSecundario }}>
                            {fen.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ANCIENT OPTIONS */}
              <View style={styles.whControlCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.whSectionHeader}>OPCIÓN ANCIENT</Text>
                  {vaultMakerAncient > 0 && (
                    <Text style={{ fontSize: 11, color: THEME.colors.itemAncient, fontWeight: 'bold' }}>
                      (+{decodeAncientByte(vaultMakerAncient).staminaBonus} Stam)
                    </Text>
                  )}
                </View>

                {(!selectedVaultMakerDef || !isItemAncientEligible(selectedVaultMakerDef.group, selectedVaultMakerDef.index)) ? (
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 12, marginTop: 6, fontStyle: 'italic' }}>
                    ℹ️ Esta pieza ({selectedVaultMakerDef?.name || 'Seleccionada'}) no posee set Ancient oficial en Season 6.
                  </Text>
                ) : (
                  <View style={{ marginTop: 6 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {/* Normal Pill */}
                      <TouchableOpacity
                        key="wh_anc_none"
                        style={[
                          styles.whAncientPill,
                          vaultMakerAncient === 0 && styles.whAncientPillActive,
                        ]}
                        onPress={() => setVaultMakerAncient(0)}
                      >
                        <Text style={[styles.whAncientPillText, vaultMakerAncient === 0 && styles.whAncientPillTextActive]}>
                          Normal (Sin Ancient)
                        </Text>
                      </TouchableOpacity>

                      {/* Piece-specific Ancient Sets */}
                      {getAvailableAncientOptionsForItem(selectedVaultMakerDef.group, selectedVaultMakerDef.index).map((anc) => {
                        const currentDecoded = decodeAncientByte(vaultMakerAncient);
                        const isSel = currentDecoded.tier === anc.tier && vaultMakerAncient > 0;
                        return (
                          <TouchableOpacity
                            key={`wh_anc_${anc.tier}_${anc.setId}`}
                            style={[
                              styles.whAncientPill,
                              isSel && styles.whAncientPillActive,
                            ]}
                            onPress={() => {
                              const curStam = currentDecoded.staminaBonus === 10 ? 10 : 5;
                              setVaultMakerAncient(encodeAncientByte(anc.tier, curStam));
                            }}
                          >
                            <Text style={[styles.whAncientPillText, isSel && styles.whAncientPillTextActive]}>
                              {anc.name} (Tier {anc.tier})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>

                    {/* Stamina Bonus sub-selector if ancient selected */}
                    {vaultMakerAncient > 0 && (
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                        {[5, 10].map((bonus) => {
                          const currentDecoded = decodeAncientByte(vaultMakerAncient);
                          const isSelBonus = currentDecoded.staminaBonus === bonus;
                          return (
                            <TouchableOpacity
                              key={`wh_stam_${bonus}`}
                              style={[
                                {
                                  flex: 1,
                                  paddingVertical: 5,
                                  alignItems: 'center',
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: isSelBonus ? THEME.colors.itemAncient : '#444',
                                  backgroundColor: isSelBonus ? 'rgba(91, 141, 239, 0.2)' : 'transparent',
                                },
                              ]}
                              onPress={() => {
                                setVaultMakerAncient(encodeAncientByte(currentDecoded.tier || 1, bonus));
                              }}
                            >
                              <Text style={{ fontSize: 11, color: isSelBonus ? THEME.colors.itemAncient : THEME.colors.textoSecundario, fontWeight: isSelBonus ? 'bold' : 'normal' }}>
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

              {/* EXCELLENT OPTIONS */}
              <View style={styles.whControlCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.whSectionHeader, { color: THEME.colors.jade }]}>OPCIONES EXCELENTES</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.whQuickExcBtn}
                      onPress={() => setVaultMakerExcFlags(63)}
                    >
                      <Text style={styles.whQuickExcBtnText}>Full Exc</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.whQuickExcBtn}
                      onPress={() => setVaultMakerExcFlags(0)}
                    >
                      <Text style={styles.whQuickExcBtnText}>Normal</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.whExcGrid}>
                  {(() => {
                    const isW = selectedVaultMakerDef?.category === 'weapon' || (selectedVaultMakerDef?.group !== undefined && selectedVaultMakerDef?.group <= 5);
                    const excList = isW ? EXCELLENT_OPTIONS_WEAPON : EXCELLENT_OPTIONS_ARMOR;
                    return excList.map((opt) => {
                      const isChecked = (vaultMakerExcFlags & opt.bit) !== 0;
                      return (
                        <TouchableOpacity
                          key={`wh_exc_${opt.bit}`}
                          style={[styles.whExcChip, isChecked && styles.whExcChipActive]}
                          onPress={() => {
                            setVaultMakerExcFlags(prev => (prev & opt.bit) ? (prev & ~opt.bit) : (prev | opt.bit));
                          }}
                        >
                          <MaterialCommunityIcons
                            name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                            size={16}
                            color={isChecked ? THEME.colors.jade : THEME.colors.textMuted}
                          />
                          <Text
                            style={[
                              styles.whExcChipText,
                              isChecked && { color: THEME.colors.jade, fontWeight: 'bold' },
                            ]}
                            numberOfLines={1}
                          >
                            {opt.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>

              {/* JEWEL OF HARMONY */}
              <View style={styles.whControlCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={[styles.whSectionHeader, { color: '#FFD700' }]}>JEWEL OF HARMONY</Text>
                    {vaultMakerHarmonyType > 0 && (
                      <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: 'bold' }}>
                        (Tipo {vaultMakerHarmonyType} +{vaultMakerHarmonyLevel})
                      </Text>
                    )}
                  </View>
                  <Switch
                    value={vaultMakerHarmonyType > 0}
                    onValueChange={(val: boolean) => {
                      setVaultMakerHarmonyType(val ? 1 : 0);
                      setVaultMakerHarmonyLevel(val ? 13 : 0);
                    }}
                    trackColor={{ false: '#333333', true: '#FFD700' }}
                    thumbColor={vaultMakerHarmonyType > 0 ? '#FFD700' : THEME.colors.textMuted}
                  />
                </View>

                {vaultMakerHarmonyType > 0 && (
                  <View style={{ marginTop: 8, gap: 8 }}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(() => {
                        const isW = selectedVaultMakerDef?.category === 'weapon' || (selectedVaultMakerDef?.group !== undefined && selectedVaultMakerDef?.group <= 5);
                        const harmList = isW ? HARMONY_OPTIONS_WEAPON : HARMONY_OPTIONS_ARMOR;
                        return harmList.filter(h => h.id > 0).map((h) => {
                          const isSel = vaultMakerHarmonyType === h.id;
                          return (
                            <TouchableOpacity
                              key={`wh_harm_${h.id}`}
                              style={[
                                styles.whHarmonyBtn,
                                isSel && styles.whHarmonyBtnActive,
                              ]}
                              onPress={() => {
                                setVaultMakerHarmonyType(h.id);
                                if (vaultMakerHarmonyLevel === 0) setVaultMakerHarmonyLevel(13);
                              }}
                            >
                              <Text style={[styles.whHarmonyBtnText, isSel && styles.whHarmonyBtnTextActive]}>
                                {h.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        });
                      })()}
                    </ScrollView>

                    <View style={styles.whOptionRow}>
                      <Text style={styles.whOptionLabel}>Nivel de Harmony (+0 a +13):</Text>
                      <View style={styles.whStepper}>
                        <TouchableOpacity
                          style={styles.whStepBtnSmall}
                          onPress={() => setVaultMakerHarmonyLevel(prev => Math.max(0, prev - 1))}
                        >
                          <Text style={styles.whStepBtnTextSmall}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.whStepperVal}>+{vaultMakerHarmonyLevel}</Text>
                        <TouchableOpacity
                          style={styles.whStepBtnSmall}
                          onPress={() => setVaultMakerHarmonyLevel(prev => Math.min(13, prev + 1))}
                        >
                          <Text style={styles.whStepBtnTextSmall}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.whMaxBtnSmall}
                          onPress={() => setVaultMakerHarmonyLevel(13)}
                        >
                          <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* SOCKETS (1 AL 5) */}
              <View style={styles.whControlCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.whSectionHeader, { color: '#E8C86A' }]}>RANURAS DE SOCKETS (1 AL 5)</Text>
                  <Switch
                    value={vaultMakerEnableSockets}
                    onValueChange={(val: boolean) => {
                      setVaultMakerEnableSockets(val);
                      setVaultMakerSockets(val ? [0xFE, 0xFE, 0xFE, 0xFE, 0xFE] : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
                    }}
                    trackColor={{ false: '#332B24', true: '#6B5533' }}
                    thumbColor={vaultMakerEnableSockets ? THEME.colors.oroClaro : THEME.colors.textMuted}
                  />
                </View>

                {vaultMakerEnableSockets && (
                  <View style={{ marginTop: 8, gap: 12 }}>
                    {[0, 1, 2, 3, 4].map((sIdx) => {
                      const currentVal = vaultMakerSockets[sIdx] ?? 0xFF;
                      const sockInfo = decodeSocketByte(currentVal);
                      const currentLvl = sockInfo.hasSeed ? sockInfo.level : (vaultMakerSocketLevels[sIdx] || 1);
                      const currentOptions = getQuickSocketOptions(currentLvl);

                      return (
                        <View key={`wh_sock_${sIdx}`} style={{ gap: 6, backgroundColor: 'rgba(0,0,0,0.25)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#332B24' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#E8C86A', fontSize: 11, fontWeight: '700' }}>Slot #{sIdx + 1}:</Text>
                            <Text style={{ color: '#E8C86A', fontSize: 11, fontWeight: '700' }}>
                              {sockInfo.hasSeed ? sockInfo.fullDescription : sockInfo.label}
                            </Text>
                          </View>

                          {/* Selector de Nivel / Tipo de Seed Sphere (Lv.1 a Lv.5) */}
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
                            <Text style={{ fontSize: 10, color: THEME.colors.textoSecundario, fontWeight: '600' }}>Esfera:</Text>
                            {SEED_SPHERE_LEVELS.map((sl) => {
                              const isLvlActive = currentLvl === sl.level;
                              return (
                                <TouchableOpacity
                                  key={`wh_lvl_${sIdx}_${sl.level}`}
                                  style={{
                                    paddingHorizontal: 7,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                    backgroundColor: isLvlActive ? '#E8C86A' : '#1E1A16',
                                    borderWidth: 1,
                                    borderColor: isLvlActive ? '#E8C86A' : '#3E342B',
                                  }}
                                  onPress={() => {
                                    const updatedLevels = [...vaultMakerSocketLevels];
                                    updatedLevels[sIdx] = sl.level;
                                    setVaultMakerSocketLevels(updatedLevels);

                                    if (sockInfo.hasSeed && sockInfo.optionId >= 0) {
                                      const newByte = encodeSocketByte(sockInfo.optionId, sl.level);
                                      const updated = [...vaultMakerSockets];
                                      updated[sIdx] = newByte;
                                      setVaultMakerSockets(updated);
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

                          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4 }}>
                            {currentOptions.map((so) => {
                              const isAct = currentVal === so.val;
                              return (
                                <TouchableOpacity
                                  key={`wh_so_${sIdx}_${so.val}`}
                                  style={[
                                    styles.whSocketBtn,
                                    isAct && styles.whSocketBtnActive,
                                  ]}
                                  onPress={() => {
                                    const updated = [...vaultMakerSockets];
                                    updated[sIdx] = so.val;
                                    setVaultMakerSockets(updated);
                                    if (so.optionId >= 0) {
                                      const updatedLevels = [...vaultMakerSocketLevels];
                                      updatedLevels[sIdx] = currentLvl;
                                      setVaultMakerSocketLevels(updatedLevels);
                                    }
                                  }}
                                >
                                  <Text style={[styles.whSocketBtnText, isAct && styles.whSocketBtnTextActive]}>
                                    {so.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </ScrollView>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* CANTIDAD A GENERAR / DUPLICAR */}
              <View style={styles.whControlCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ color: THEME.colors.texto, fontSize: 13, fontWeight: '700' }}>Cantidad a Generar:</Text>
                    <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11 }}>Copias a colocar en slots libres contiguos:</Text>
                  </View>
                  <View style={styles.whStepper}>
                    <TouchableOpacity
                      style={styles.whStepBtnSmall}
                      onPress={() => setVaultMakerQuantity(prev => Math.max(1, prev - 1))}
                    >
                      <Text style={styles.whStepBtnTextSmall}>-</Text>
                    </TouchableOpacity>
                    <Text style={[styles.whStepperVal, { color: THEME.colors.oroClaro }]}>x{vaultMakerQuantity}</Text>
                    <TouchableOpacity
                      style={styles.whStepBtnSmall}
                      onPress={() => setVaultMakerQuantity(prev => Math.min(20, prev + 1))}
                    >
                      <Text style={styles.whStepBtnTextSmall}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  {[1, 5, 10, 20].map((q) => (
                    <TouchableOpacity
                      key={`vault_qty_chip_${q}`}
                      style={[
                        styles.whFenrirPill,
                        vaultMakerQuantity === q && { backgroundColor: 'rgba(232, 200, 106, 0.15)', borderColor: THEME.colors.oroClaro },
                        { flex: 1, alignItems: 'center', paddingVertical: 6 },
                      ]}
                      onPress={() => setVaultMakerQuantity(q)}
                    >
                      <Text style={{ color: vaultMakerQuantity === q ? THEME.colors.oroClaro : THEME.colors.textoSecundario, fontSize: 11, fontWeight: '700' }}>
                        x{q}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* BOTÓN COLOCAR ÍTEM CONFIGURADO EN BAÚL */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#3FCF8E',
                  borderRadius: 6,
                  paddingVertical: 14,
                  minHeight: 48,
                  marginTop: 6,
                  marginBottom: 16,
                  borderWidth: 1,
                  borderColor: '#3FCF8E',
                }}
                onPress={handlePlaceMakerItemInVault}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="arrow-down-bold-box" size={20} color="#100D0B" />
                <Text style={{ color: '#100D0B', fontSize: 14, fontWeight: '800', letterSpacing: 0.5 }}>
                  {vaultSubTab === 'ext'
                    ? (vaultMakerQuantity > 1 ? `COLOCAR ${vaultMakerQuantity}x EN BÓVEDA EXPANDIDA` : 'COLOCAR ÍTEM EN BÓVEDA EXPANDIDA')
                    : (vaultMakerQuantity > 1 ? `COLOCAR ${vaultMakerQuantity}x EN BAÚL` : 'COLOCAR ÍTEM EN BAÚL')}
                </Text>
              </TouchableOpacity>

              {/* SECCIÓN CATÁLOGO DE ÍTEMS */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MaterialCommunityIcons name="book-open-page-variant" size={18} color="#FF9800" />
                  <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '800' }}>
                    Cambiar Ítem desde el Catálogo:
                  </Text>
                </View>

                {/* Input Buscar item con Autocomplete */}
                <AutocompleteInput
                  value={catalogSearch}
                  onChangeText={setCatalogSearch}
                  suggestions={DEFAULT_ITEM_CATALOG.map((i) => i.name)}
                  placeholder="Buscar ítem en todo el catálogo..."
                  icon="sword"
                  clearable={true}
                  containerStyle={{ marginBottom: 10 }}
                />

                {/* Selector Horizontal de Categorías (Pills) */}
                <View style={{ marginBottom: 12 }}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                  >
                    {MAKER_CATEGORIES.map((cat) => {
                      const isSelected = catalogCategory === cat.id;
                      return (
                        <TouchableOpacity
                          key={`wh_cat_${cat.id}`}
                          style={[
                            styles.whCategoryPill,
                            isSelected && styles.whCategoryPillActive,
                          ]}
                          onPress={() => setCatalogCategory(cat.id)}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons
                            name={cat.icon as any}
                            size={16}
                            color={isSelected ? '#000000' : '#FF9800'}
                          />
                          <Text
                            style={[
                              styles.whCategoryPillText,
                              isSelected && styles.whCategoryPillTextActive,
                            ]}
                          >
                            {cat.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Contenedor de Ítems del Catálogo con Scroll Fluido */}
                <View style={styles.whCatalogListContainer}>
                  {(() => {
                    const curCatDef = MAKER_CATEGORIES.find((c) => c.id === catalogCategory) || MAKER_CATEGORIES[0];
                    const filteredCatalog = DEFAULT_ITEM_CATALOG.filter((item) => {
                      const matchesCat = catalogSearch.trim().length > 0 ? true : curCatDef.filter(item);
                      const matchesSearch = catalogSearch.trim().length > 0
                        ? item.name.toLowerCase().includes(catalogSearch.toLowerCase().trim())
                        : true;
                      return matchesCat && matchesSearch;
                    });

                    if (filteredCatalog.length === 0) {
                      return (
                        <View style={styles.whCatalogEmptyState}>
                          <MaterialCommunityIcons name="alert" size={28} color="#FFC107" />
                          <Text style={styles.whCatalogEmptyText}>
                            No se encontraron ítems en esta categoría o búsqueda.
                          </Text>
                        </View>
                      );
                    }

                    return filteredCatalog.map((item, idx) => {
                      const isSelected = selectedVaultMakerDef?.group === item.group && selectedVaultMakerDef?.index === item.index;
                      return (
                        <TouchableOpacity
                          key={`cat_item_${item.group}_${item.index}_${item.id || idx}`}
                          style={[
                            styles.whCatalogItemCard,
                            isSelected && { borderColor: '#FF9800', backgroundColor: 'rgba(255, 152, 0, 0.1)' },
                          ]}
                          onPress={() => {
                            setSelectedVaultMakerDef(item);
                            if (item.category === 'weapon') {
                              setVaultMakerSkill(true);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.whCatalogItemImg}>
                            <ItemImage
                              item={{
                                slot: 0,
                                hex: '',
                                group: item.group,
                                index: item.index,
                                id: item.id,
                                name: item.name,
                                level: 0,
                                skill: false,
                                luck: false,
                                option: 0,
                                durability: item.durability !== undefined ? item.durability : 255,
                                serial: 0,
                                excellentFlags: 0,
                                ancientOption: 0,
                                option380: false,
                                harmonyType: 0,
                                harmonyLevel: 0,
                                sockets: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF],
                                width: item.width,
                                height: item.height,
                                isExcellent: false,
                                isAncient: false,
                                category: item.category,
                                spriteKey: item.icon,
                                isModified: false,
                              }}
                              size={42}
                              fallbackIcon={item.icon as any}
                              fallbackColor="#FF9800"
                            />
                          </View>
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.whCatalogItemName, isSelected && { color: '#FF9800' }]}>{item.name}</Text>
                            <Text style={styles.whCatalogItemMeta}>
                              {item.width}×{item.height} slots • Index: {item.index}
                            </Text>
                          </View>
                          <View
                            style={{
                              backgroundColor: isSelected ? '#FF9800' : '#2A2E3D',
                              borderRadius: 6,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ color: isSelected ? '#000000' : '#E0E0E0', fontSize: 11, fontWeight: '700' }}>
                              {isSelected ? '✓ Seleccionado' : 'Seleccionar'}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    });
                  })()}
                </View>
              </View>
            </ScrollView>
          )}

          {/* VISTA 2: TAB WAREHOUSE (Capturas 2, 3) */}
          {warehouseViewTab === 'warehouse' && (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Header Clásico de Baúl MU Online Season 6 (Captura de Referencia) */}
                <View style={styles.muVaultHeaderBar}>
                  <TouchableOpacity
                    style={styles.muVaultArrowBtn}
                    onPress={() => {
                      if (activeVaultIndex > 0) {
                        handleSwitchVault(activeVaultIndex - 1);
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={loadingWarehouse || activeVaultIndex === 0}
                  >
                    <Text style={[styles.muVaultArrowText, activeVaultIndex === 0 && { opacity: 0.3 }]}>◄</Text>
                  </TouchableOpacity>

                  <Text style={styles.muVaultHeaderTitle}>
                    [Bault] [{activeVaultIndex}/{warehouseCount}]
                  </Text>

                  <TouchableOpacity
                    style={styles.muVaultArrowBtn}
                    onPress={() => {
                      if (!LicenseService.isPro()) {
                        setPremiumModalVisible(true);
                      } else {
                        handleSwitchVault(activeVaultIndex + 1);
                      }
                    }}
                    activeOpacity={0.7}
                    disabled={loadingWarehouse}
                  >
                    <Text style={styles.muVaultArrowText}>►</Text>
                  </TouchableOpacity>
                </View>

                {/* Selector de Baúles como Pestañas Horizontales Deslizables */}
                <View style={{ marginVertical: 8, paddingHorizontal: 4 }}>
                  <Pestanas
                    pestanas={vaultTabs}
                    activaId={String(activeVaultIndex)}
                    onSelect={(id: string) => handleSwitchVault(Number(id))}
                  />
                </View>

                {/* Banner de Acceso al Módulo Dedicado de Bóveda de Expansión */}
                <TouchableOpacity
                  style={{
                    marginHorizontal: 4,
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: THEME.shapes.radioEsquina,
                    backgroundColor: THEME.colors.casillaFondo,
                    borderWidth: 1,
                    borderColor: THEME.colors.borde,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                  onPress={() => {
                    setWarehouseViewTab('vault_ext');
                    setVaultSubTab('ext');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                    <MaterialCommunityIcons name="safe" size={22} color={THEME.colors.arcano} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: THEME.colors.arcano, fontWeight: 'bold', fontSize: 12 }}>
                        Bóveda Expandida del Baúl
                      </Text>
                      <Text style={{ color: THEME.colors.textoSecundario, fontSize: 10, marginTop: 2 }}>
                        Almacenado 1 (botón [+] en juego). Toca aquí para ver su contenido y editar en ella.
                      </Text>
                    </View>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color={THEME.colors.oroClaro} />
                </TouchableOpacity>

                {/* Rejilla de 8 columnas dentro de un Panel con remaches */}
                <Panel style={styles.vaultPanelContainer}>
                  <View style={styles.vaultCounterHeader}>
                    <Text style={styles.vaultCounterOfficialText}>
                      {warehouseItems.filter(i => i.slot < 120).length} / 120 ítems
                    </Text>
                  </View>

                  {loadingWarehouse ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={THEME.colors.oroClaro} />
                      <Text style={{ color: THEME.colors.textoSecundario, marginTop: 12 }}>Cargando baúl #{activeVaultIndex}...</Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', width: '100%' }}>
                      {movingVaultItem && (
                        <View style={styles.movingBanner}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.movingBannerTitle}>
                              Moviendo: {movingVaultItem.item.name} ({movingVaultItem.item.width || 1}x{movingVaultItem.item.height || 1})
                            </Text>
                            <Text style={styles.movingBannerSubtitle}>
                              Toca cualquier cuadro libre (+) para reubicarlo
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={styles.movingBannerCancelBtn}
                            onPress={() => setMovingVaultItem(null)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.movingBannerCancelText}>✕ Cancelar</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                      <InventoryGrid
                        startSlot={0}
                        rows={15}
                        cols={8}
                        items={warehouseItems}
                        onSlotPress={handleVaultSlotPress}
                        movingSlot={movingVaultItem?.slot}
                      />
                    </View>
                  )}
                </Panel>

                {/* Footer Clásico de Baúl MU Online Season 6: ZEN en Jade, Almacenado en Brasa y Botones de Piedra */}
                <View style={styles.muVaultFooterContainer}>
                  <View style={styles.muVaultMoneyRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Image source={INTERFACE_ASSETS.zenCoin} style={{ width: 14, height: 14 }} resizeMode="contain" />
                      <Text style={styles.muVaultZenLabel}>ZEN</Text>
                    </View>
                    <View style={styles.muVaultMoneyBox}>
                      <Text style={styles.muVaultMoneyText}>0</Text>
                    </View>
                  </View>

                  <View style={styles.muVaultMoneyRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Image source={INTERFACE_ASSETS.zenCoin} style={{ width: 14, height: 14 }} resizeMode="contain" />
                      <Text style={styles.muVaultStoredLabel}>ALMACENADO</Text>
                    </View>
                    <View style={styles.muVaultMoneyBox}>
                      <TextInput
                        style={styles.muVaultMoneyInput}
                        value={Number(vaultMoney).toLocaleString()}
                        onChangeText={(val) => {
                          const clean = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
                          setVaultMoney(clean);
                        }}
                        keyboardType="number-pad"
                        maxLength={12}
                      />
                    </View>
                  </View>

                  {/* Fila de 4 Botones de Piedra Clásicos de MU Online */}
                  <View style={styles.muVaultBtnRow}>
                    <TouchableOpacity
                      style={styles.muVaultActionBtn}
                      onPress={() => setVaultMoney(Math.min(2000000000, (vaultMoney || 0) + 10000000))}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="sack" size={20} color={THEME.colors.oroClaro} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.muVaultActionBtn}
                      onPress={() => setVaultMoney(Math.max(0, (vaultMoney || 0) - 10000000))}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="arrow-down-circle" size={20} color={THEME.colors.brasa} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.muVaultActionBtn}
                      onPress={() => Alert.alert('Seguridad de Baúl', 'El baúl se encuentra protegido.')}
                      activeOpacity={0.7}
                    >
                      <MaterialCommunityIcons name="lock" size={20} color={THEME.colors.oroClaro} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.muVaultActionBtn}
                      onPress={() => setShowUnlockModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.muVaultPlusText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </View>
          )}

          {/* VISTA 3: TAB BÓVEDA DE EXPANSIÓN SEASON 6 (MÓDULO DEDICADO) */}
          {warehouseViewTab === 'vault_ext' && (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Tarjeta de Estado y Activación en Juego */}
                <View style={styles.vaultExtHeroCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <MaterialCommunityIcons name="safe" size={20} color={THEME.colors.arcano} />
                      <Text style={{ color: THEME.colors.arcano, fontWeight: '800', fontSize: 13 }}>
                        BÓVEDA EXPANDIDA DEL BAÚL (ALMACENADO 1)
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                      backgroundColor: vaultExtLevel >= 1 ? 'rgba(63, 207, 142, 0.15)' : 'rgba(255, 152, 0, 0.15)',
                      borderWidth: 1,
                      borderColor: vaultExtLevel >= 1 ? THEME.colors.jade : '#FF9800',
                    }}>
                      <Text style={{
                        fontSize: 10,
                        fontWeight: 'bold',
                        color: vaultExtLevel >= 1 ? THEME.colors.jade : '#FFB74D',
                      }}>
                        {vaultExtLevel >= 1 ? 'ACTIVA EN JUEGO' : 'DESACTIVADA'}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, lineHeight: 16, marginBottom: 10 }}>
                    Esta es la <Text style={{ color: THEME.colors.arcano, fontWeight: 'bold' }}>Bóveda de Expansión oficial del Baúl</Text> de Season 6 (Almacenado 1). En el cliente del juego se abre abriendo el baúl y presionando el botón <Text style={{ color: '#FFF', fontWeight: 'bold' }}>[+]</Text> ("Abriendo una Bóveda Expandida").
                  </Text>

                  <TouchableOpacity
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      backgroundColor: vaultExtLevel >= 1 ? 'rgba(91, 141, 239, 0.12)' : THEME.colors.arcano,
                      borderColor: THEME.colors.arcano,
                      borderWidth: 1,
                      paddingVertical: 9,
                      borderRadius: 6,
                      minHeight: 44,
                    }}
                    onPress={handleActivateVaultExpansion}
                    disabled={unlockingVaults}
                    activeOpacity={0.8}
                  >
                    {unlockingVaults ? (
                      <ActivityIndicator size="small" color={vaultExtLevel >= 1 ? THEME.colors.arcano : '#000'} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="lightning-bolt" size={16} color={vaultExtLevel >= 1 ? THEME.colors.arcano : '#000'} />
                        <Text style={{ color: vaultExtLevel >= 1 ? THEME.colors.arcano : '#000', fontWeight: 'bold', fontSize: 12 }}>
                          {vaultExtLevel >= 1 ? 'Re-Sincronizar Bóveda en Juego' : 'Activar Bóveda Expandida en Juego'}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Zen de la Bóveda Expandida con Botón MAX */}
                <View style={styles.whControlCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <MaterialCommunityIcons name="circle-multiple" size={16} color="#E8C86A" />
                    <Text style={styles.whControlLabel}>Zen Bóveda Expandida:</Text>
                    <TextInput
                      style={styles.whZenInput}
                      value={String(vaultMoney)}
                      onChangeText={(val) => {
                        const clean = parseInt(val.replace(/[^0-9]/g, ''), 10) || 0;
                        setVaultMoney(clean);
                      }}
                      keyboardType="number-pad"
                      maxLength={10}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.whMaxBtn}
                    onPress={handleSetMaxZen}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.whMaxBtnText}>MAX</Text>
                  </TouchableOpacity>
                </View>

                {/* Fila de Acciones Rápidas (Inyectar Set, Colocar Ítem, Ir a Item Maker) */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(255, 122, 0, 0.12)',
                      borderColor: '#FF7A00',
                      borderWidth: 1,
                      borderRadius: 8,
                      paddingVertical: 9,
                    }}
                    onPress={() => setShowQuickSetsVaultModal(true)}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="flash" size={16} color="#FF7A00" />
                    <Text style={{ color: '#FF7A00', fontSize: 11, fontWeight: '800' }}>
                      INYECTAR SET
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1.1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(63, 207, 142, 0.12)',
                      borderColor: THEME.colors.jade,
                      borderWidth: 1,
                      borderRadius: 6,
                      paddingVertical: 9,
                    }}
                    onPress={handlePlaceMakerItemInVault}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="plus-box" size={16} color={THEME.colors.jade} />
                    <Text style={{ color: THEME.colors.jade, fontSize: 11, fontWeight: '800' }}>
                      COLOCAR ÍTEM
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                      backgroundColor: 'rgba(91, 141, 239, 0.12)',
                      borderColor: THEME.colors.arcano,
                      borderWidth: 1,
                      borderRadius: 6,
                      paddingVertical: 9,
                    }}
                    onPress={() => {
                      setWarehouseViewTab('items');
                      setVaultSubTab('ext');
                    }}
                    activeOpacity={0.7}
                  >
                    <MaterialCommunityIcons name="tools" size={16} color={THEME.colors.arcano} />
                    <Text style={{ color: THEME.colors.arcano, fontSize: 11, fontWeight: '800' }}>
                      ITEM MAKER
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Grid 8x15 (120 Slots de la Bóveda Expandida) */}
                {loadingWarehouse ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={THEME.colors.arcano} />
                    <Text style={{ color: THEME.colors.textoSecundario, marginTop: 12 }}>Cargando Bóveda Expandida...</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    {movingVaultItem && (
                      <View style={[styles.movingBanner, { borderColor: THEME.colors.arcano }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.movingBannerTitle, { color: THEME.colors.arcano }]}>
                            Moviendo: {movingVaultItem.item.name} ({movingVaultItem.item.width || 1}x{movingVaultItem.item.height || 1})
                          </Text>
                          <Text style={styles.movingBannerSubtitle}>
                            Toca cualquier cuadro libre (+) en la bóveda expandida para reubicarlo
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.movingBannerCancelBtn}
                          onPress={() => setMovingVaultItem(null)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.movingBannerCancelText}>✕ Cancelar</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                    <InventoryGrid
                      startSlot={120}
                      rows={15}
                      cols={8}
                      items={warehouseItems}
                      onSlotPress={handleVaultSlotPress}
                      movingSlot={movingVaultItem?.slot}
                    />
                  </View>
                )}
              </ScrollView>
            </View>
          )}

          {/* Barra de Pestañas Inferior: [Baúl Normal], [Bóveda Expandida] y [Item Maker] */}
          <View style={styles.whBottomTabsBar}>
            <TouchableOpacity
              style={styles.whBottomTabBtn}
              onPress={() => {
                setWarehouseViewTab('warehouse');
                setVaultSubTab('main');
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="package-variant-closed"
                size={22}
                color={warehouseViewTab === 'warehouse' ? '#FF7A00' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.whBottomTabText,
                  warehouseViewTab === 'warehouse' && styles.whBottomTabTextActive,
                ]}
              >
                Baúl Normal
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whBottomTabBtn}
              onPress={() => {
                setWarehouseViewTab('vault_ext');
                setVaultSubTab('ext');
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="safe"
                size={22}
                color={warehouseViewTab === 'vault_ext' ? THEME.colors.arcano : '#8E8E93'}
              />
              <Text
                style={[
                  styles.whBottomTabText,
                  warehouseViewTab === 'vault_ext' && { color: THEME.colors.arcano, fontWeight: 'bold' },
                ]}
              >
                Bóveda Expandida
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.whBottomTabBtn}
              onPress={() => setWarehouseViewTab('items')}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name="tools"
                size={22}
                color={warehouseViewTab === 'items' ? '#FF7A00' : '#8E8E93'}
              />
              <Text
                style={[
                  styles.whBottomTabText,
                  warehouseViewTab === 'items' && styles.whBottomTabTextActive,
                ]}
              >
                Item Maker
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botón Inferior de Ancho Completo: Guardar Cambios (Verde) */}
          <View style={[styles.whSaveBtnContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={styles.whGreenSaveBtn}
              onPress={handleSaveWarehouse}
              disabled={savingWarehouse || loadingWarehouse}
              activeOpacity={0.8}
            >
              {savingWarehouse ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <MaterialCommunityIcons name="content-save" size={20} color="#FFFFFF" />
                  <Text style={styles.whGreenSaveBtnText}>
                    {warehouseViewTab === 'vault_ext'
                      ? `Guardar Bóveda Expandida #${activeVaultIndex}`
                      : activeVaultIndex === 0
                      ? 'Guardar Baúl Principal'
                      : `Guardar Baúl #${activeVaultIndex}`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2A: PREMIUM REQUERIDO (CAPTURAS 4) */}
      {/* ======================================================== */}
      <Modal
        visible={premiumModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPremiumModalVisible(false)}
      >
        <View style={styles.premiumModalOverlay}>
          <View style={styles.premiumModalCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Text style={{ fontSize: 22 }}>⭐</Text>
              <Text style={styles.premiumModalTitle}>Premium Requerido</Text>
            </View>
            <Text style={styles.premiumModalBody}>
              Multi-Vault es una función Premium.{'\n\n'}Con la cuenta gratuita solo puedes usar el Vault 0 (principal).
            </Text>
            <View style={{ alignItems: 'flex-end', marginTop: 24 }}>
              <TouchableOpacity
                onPress={() => setPremiumModalVisible(false)}
                activeOpacity={0.7}
                style={{ paddingVertical: 6, paddingHorizontal: 12 }}
              >
                <Text style={styles.premiumModalBtnText}>ENTENDIDO</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2B: DESBLOQUEAR BAÚLES ADICIONALES (WarehouseCount) */}
      {/* ======================================================== */}
      <Modal
        visible={showUnlockModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUnlockModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalCard, { width: '90%', maxWidth: 360 }]}>
            <View style={styles.detailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="lock-open-outline" size={22} color="#FF9800" />
                <Text style={styles.detailTitle}>Desbloquear Baúles</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUnlockModal(false)} style={styles.closeModalBtn}>
                <MaterialCommunityIcons name="close" size={20} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: THEME.colors.textoSecundario, fontSize: 13, marginBottom: 14 }}>
              Configura el número de baúles disponibles en <Text style={{ color: '#FFF', fontWeight: 'bold' }}>MEMB_INFO.WarehouseCount</Text> para la cuenta <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>{warehouseAccount}</Text>.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {['5', '10', '20', '50'].map((preset) => (
                <TouchableOpacity
                  key={`preset_${preset}`}
                  style={[
                    styles.presetPill,
                    unlockCountInput === preset && styles.presetPillActive,
                  ]}
                  onPress={() => setUnlockCountInput(preset)}
                >
                  <Text
                    style={[
                      styles.presetPillText,
                      unlockCountInput === preset && styles.presetPillTextActive,
                    ]}
                  >
                    {preset} Baúles
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Total de Baúles (1 - 250)</Text>
              <TextInput
                style={styles.createInput}
                value={unlockCountInput}
                onChangeText={setUnlockCountInput}
                keyboardType="number-pad"
                placeholder="Ej: 20"
                placeholderTextColor={THEME.colors.textMuted}
                maxLength={3}
              />
            </View>

            {/* Tarjeta de Expansión Oficial Season 6 (ExtWarehouse 1 y 2) */}
            <View
              style={{
                backgroundColor: 'rgba(91, 141, 239, 0.06)',
                borderRadius: 6,
                padding: 10,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: 'rgba(91, 141, 239, 0.3)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MaterialCommunityIcons name="arrow-expand-all" size={16} color={THEME.colors.arcano} />
                <Text style={{ color: THEME.colors.arcano, fontWeight: 'bold', fontSize: 12 }}>
                  Expansión de Baúl Oficial Season 6
                </Text>
              </View>
              <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, marginBottom: 8 }}>
                Desbloquea las pestañas de Expansión 1 y 2 en el juego (<Text style={{ color: '#FFF' }}>AccountCharacter.ExtWarehouse = 2</Text>).
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: 'rgba(91, 141, 239, 0.2)',
                  borderWidth: 1,
                  borderColor: THEME.colors.arcano,
                  borderRadius: 6,
                  paddingVertical: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 6,
                }}
                disabled={unlockingVaults}
                onPress={handleActivateVaultExpansion}
              >
                <MaterialCommunityIcons name="lightning-bolt" size={15} color={THEME.colors.arcano} />
                <Text style={{ color: THEME.colors.arcano, fontWeight: 'bold', fontSize: 12 }}>
                  Activar Expansión 1 y 2 en Juego
                </Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowUnlockModal(false)}
                disabled={unlockingVaults}
              >
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleUnlockWarehouses}
                disabled={unlockingVaults}
              >
                {unlockingVaults ? (
                  <ActivityIndicator size="small" color="#0D0D0D" />
                ) : (
                  <Text style={styles.confirmBtnText}>Desbloquear</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2C: INYECTOR DE SETS COMPLETOS AL BAÚL (QUICK SETS) */}
      {/* ======================================================== */}
      <Modal
        visible={showQuickSetsVaultModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQuickSetsVaultModal(false)}
      >
        <View style={styles.detailModalOverlay}>
          <View style={[styles.detailModalCard, { width: '95%', maxWidth: 460, maxHeight: '90%' }]}>
            {/* Header */}
            <View style={styles.detailHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="flash" size={22} color="#FF7A00" />
                <Text style={styles.detailTitle}>Inyectar Set al Baúl #{activeVaultIndex}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQuickSetsVaultModal(false)} style={styles.closeModalBtn}>
                <MaterialCommunityIcons name="close" size={20} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
              {/* Category Filter */}
              <Text style={{ color: '#FF7A00', fontSize: 12, fontWeight: '800', marginVertical: 8 }}>
                1. FILTRAR POR CLASE:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {[
                    { id: 'ALL', label: 'Todos' },
                    { id: 'DK', label: 'Guerrero' },
                    { id: 'DW', label: 'Mago' },
                    { id: 'FE', label: 'Elfa' },
                    { id: 'MG', label: 'Magocaballero' },
                    { id: 'DL', label: 'Dark Lord' },
                    { id: 'ACC', label: 'Ancient' },
                  ].map((f) => (
                    <TouchableOpacity
                      key={`qs_vault_${f.id}`}
                      style={[
                        styles.whCategoryPill,
                        quickSetVaultCategoryFilter === f.id && styles.whCategoryPillActive,
                      ]}
                      onPress={() => setQuickSetVaultCategoryFilter(f.id as any)}
                    >
                      <Text
                        style={[
                          styles.whCategoryPillText,
                          quickSetVaultCategoryFilter === f.id && styles.whCategoryPillTextActive,
                        ]}
                      >
                        {f.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              {/* Sets List Horizontal */}
              <Text style={{ color: '#FF7A00', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>
                2. ELIGE EL SET DESEADO:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {QUICK_SETS_CATALOG
                    .filter((s) => quickSetVaultCategoryFilter === 'ALL' || s.cat === quickSetVaultCategoryFilter)
                    .map((set) => {
                      const isSelected = selectedVaultQuickSet?.id === set.id;
                      return (
                        <TouchableOpacity
                          key={`qs_set_${set.id}`}
                          style={{
                            minWidth: 110,
                            padding: 10,
                            alignItems: 'center',
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: isSelected ? '#B58F3C' : '#6B5533',
                            backgroundColor: isSelected ? 'rgba(232, 200, 106, 0.15)' : '#2B2521',
                          }}
                          onPress={() => setSelectedVaultQuickSet(set)}
                        >
                          <MaterialCommunityIcons
                            name="shield-outline"
                            size={24}
                            color={isSelected ? '#FF7A00' : THEME.colors.textMuted}
                          />
                          <Text
                            style={{
                              color: isSelected ? '#FF7A00' : '#FFF',
                              fontWeight: '700',
                              fontSize: 12,
                              textAlign: 'center',
                              marginTop: 4,
                            }}
                          >
                            {set.name}
                          </Text>
                          <Text style={{ color: THEME.colors.textoSecundario, fontSize: 10, marginTop: 2 }}>{set.catLabel}</Text>
                          <Text style={{ color: '#4CAF50', fontSize: 9, marginTop: 2, fontWeight: 'bold' }}>
                            {set.pieces.length} piezas
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              </ScrollView>

              {/* Set Pieces Preview */}
              <Text style={{ color: '#FF7A00', fontSize: 12, fontWeight: '800', marginBottom: 6 }}>
                3. PIEZAS INCLUIDAS EN {selectedVaultQuickSet?.name || 'SET'}:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {selectedVaultQuickSet?.pieces.map((p, idx) => (
                  <View
                    key={`vault_piece_${idx}`}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: '#1A1D26',
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: '#2D3240',
                    }}
                  >
                    <MaterialCommunityIcons name="check-circle" size={12} color="#4CAF50" />
                    <Text style={{ color: '#EEE', fontSize: 11 }}>{p.name}</Text>
                  </View>
                ))}
              </View>

              {/* Options Configuration */}
              <Text style={{ color: '#FF7A00', fontSize: 12, fontWeight: '800', marginBottom: 8 }}>
                4. OPCIONES DE LAS PIEZAS:
              </Text>

              {/* Level & Option */}
              <View style={styles.whOptionRow}>
                <Text style={styles.whOptionLabel}>Nivel (+0 a +15):</Text>
                <View style={styles.whStepper}>
                  <TouchableOpacity
                    style={styles.whStepBtnSmall}
                    onPress={() => setQuickSetVaultLevel((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={styles.whStepBtnTextSmall}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.whStepperVal}>+{quickSetVaultLevel}</Text>
                  <TouchableOpacity
                    style={styles.whStepBtnSmall}
                    onPress={() => setQuickSetVaultLevel((prev) => Math.min(15, prev + 1))}
                  >
                    <Text style={styles.whStepBtnTextSmall}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.whMaxBtnSmall}
                    onPress={() => setQuickSetVaultLevel(15)}
                  >
                    <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.whOptionRow}>
                <Text style={styles.whOptionLabel}>Opción (+0 a +28):</Text>
                <View style={styles.whStepper}>
                  <TouchableOpacity
                    style={styles.whStepBtnSmall}
                    onPress={() => setQuickSetVaultOption((prev) => Math.max(0, prev - 1))}
                  >
                    <Text style={styles.whStepBtnTextSmall}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.whStepperVal}>+{quickSetVaultOption * 4}</Text>
                  <TouchableOpacity
                    style={styles.whStepBtnSmall}
                    onPress={() => setQuickSetVaultOption((prev) => Math.min(7, prev + 1))}
                  >
                    <Text style={styles.whStepBtnTextSmall}>+</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.whMaxBtnSmall}
                    onPress={() => setQuickSetVaultOption(7)}
                  >
                    <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Toggles */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.whFenrirPill, quickSetVaultLuck && { backgroundColor: 'rgba(63, 207, 142, 0.2)', borderColor: '#3FCF8E' }]}
                  onPress={() => setQuickSetVaultLuck(!quickSetVaultLuck)}
                >
                  <Text style={{ color: quickSetVaultLuck ? '#3FCF8E' : THEME.colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    Luck
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.whFenrirPill, quickSetVaultSkill && { backgroundColor: 'rgba(232, 200, 106, 0.2)', borderColor: '#E8C86A' }]}
                  onPress={() => setQuickSetVaultSkill(!quickSetVaultSkill)}
                >
                  <Text style={{ color: quickSetVaultSkill ? '#E8C86A' : THEME.colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    Skill
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.whFenrirPill, quickSetVaultFullExc && { backgroundColor: 'rgba(63, 207, 142, 0.2)', borderColor: '#3FCF8E' }]}
                  onPress={() => setQuickSetVaultFullExc(!quickSetVaultFullExc)}
                >
                  <Text style={{ color: quickSetVaultFullExc ? '#3FCF8E' : THEME.colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    Full Exc
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.whFenrirPill, quickSetVault380 && { backgroundColor: 'rgba(226, 112, 58, 0.2)', borderColor: '#E2703A' }]}
                  onPress={() => setQuickSetVault380(!quickSetVault380)}
                >
                  <Text style={{ color: quickSetVault380 ? '#E2703A' : THEME.colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                    380 PvP
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Ancient Tier for Normal Sets */}
              {selectedVaultQuickSet?.cat !== 'ACC' && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                    ANCIENT OPTION:
                  </Text>
                  {vaultSetAncientOptions.length === 0 ? (
                    <View style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 6 }}>
                      <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, fontStyle: 'italic' }}>
                        Este set no posee versiones Ancient en Season 6.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        style={[
                          styles.whAncientPill,
                          quickSetVaultAncientTier === 0 && styles.whAncientPillActive,
                        ]}
                        onPress={() => setQuickSetVaultAncientTier(0)}
                      >
                        <Text style={[styles.whAncientPillText, quickSetVaultAncientTier === 0 && styles.whAncientPillTextActive]}>
                          Normal (Sin Ancient)
                        </Text>
                      </TouchableOpacity>
                      {vaultSetAncientOptions.map((anc) => {
                        const tierVal = anc.tier === 1 ? 5 : 10;
                        const isSelected = quickSetVaultAncientTier === tierVal;
                        return (
                          <TouchableOpacity
                            key={`vault_anc_${anc.tier}`}
                            style={[
                              styles.whAncientPill,
                              isSelected && styles.whAncientPillActive,
                              isSelected && { borderColor: '#5B8DEF', backgroundColor: 'rgba(91, 141, 239, 0.2)' }
                            ]}
                            onPress={() => setQuickSetVaultAncientTier(tierVal)}
                          >
                            <Text style={[styles.whAncientPillText, isSelected && { color: '#5B8DEF', fontWeight: 'bold' }]}>
                              Tier {anc.tier} ({anc.name})
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}

              {/* OPCIÓN JEWEL OF HARMONY */}
              <View style={{ marginBottom: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, fontWeight: 'bold' }}>
                    OPCIÓN JEWEL OF HARMONY:
                  </Text>
                  {quickSetVaultHarmonyType > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ color: '#FFD54F', fontSize: 11, fontWeight: 'bold' }}>Nivel +{quickSetVaultHarmonyLevel}</Text>
                      <TouchableOpacity
                        style={styles.whStepBtnSmall}
                        onPress={() => setQuickSetVaultHarmonyLevel(prev => Math.max(0, prev - 1))}
                      >
                        <Text style={styles.whStepBtnTextSmall}>-</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.whStepBtnSmall}
                        onPress={() => setQuickSetVaultHarmonyLevel(prev => Math.min(13, prev + 1))}
                      >
                        <Text style={styles.whStepBtnTextSmall}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.whMaxBtnSmall}
                        onPress={() => setQuickSetVaultHarmonyLevel(13)}
                      >
                        <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
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
                      const isSel = quickSetVaultHarmonyType === h.id;
                      return (
                        <TouchableOpacity
                          key={`v_harm_${h.id}`}
                          style={[
                            styles.whCategoryPill,
                            isSel && { backgroundColor: '#FF6D00', borderColor: '#FF6D00' },
                          ]}
                          onPress={() => {
                            setQuickSetVaultHarmonyType(h.id);
                            if (h.id > 0 && quickSetVaultHarmonyLevel === 0) setQuickSetVaultHarmonyLevel(13);
                          }}
                        >
                          <Text style={[styles.whCategoryPillText, isSel && { color: '#FFF', fontWeight: 'bold' }]}>
                            {h.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>

              {/* Inyect Button */}
              {(() => {
                const isVaultAccountValid = Boolean(warehouseAccount && warehouseAccount.trim().length > 0);
                return (
                  <TouchableOpacity
                    style={{
                      backgroundColor: isVaultAccountValid ? '#B58F3C' : '#2B2521',
                      borderRadius: 6,
                      height: 48,
                      minHeight: 48,
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'row',
                      gap: 8,
                      marginTop: 6,
                      borderWidth: 1,
                      borderColor: isVaultAccountValid ? '#E8C86A' : '#6B5533',
                      opacity: isVaultAccountValid ? 1 : 0.6,
                    }}
                    onPress={handleInjectQuickSetToVault}
                    disabled={injectingQuickSetToVault || !isVaultAccountValid}
                  >
                    {injectingQuickSetToVault ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name={isVaultAccountValid ? "lightning-bolt" : "lock-outline"}
                          size={20}
                          color={isVaultAccountValid ? "#FFF" : THEME.colors.textMuted}
                        />
                        <Text style={{ color: isVaultAccountValid ? '#FFFFFF' : THEME.colors.textMuted, fontSize: 13, fontWeight: '800' }}>
                          {isVaultAccountValid
                            ? `INYECTAR ${selectedVaultQuickSet?.name.toUpperCase()} (${selectedVaultQuickSet?.pieces.length} PIEZAS)`
                            : `SELECCIONA UNA CUENTA PARA ACTIVAR`}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                );
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal de Acción Rápida de Ítem en Warehouse (Captura 5) */}
      <ItemActionModal
        visible={actionVaultModalVisible}
        item={actionVaultItem}
        slotIndex={actionVaultSlot}
        onClose={() => setActionVaultModalVisible(false)}
        onEdit={handleOpenVaultItemEditor}
        onDelete={handleDeleteVaultItem}
        onMove={(item, slot) => setMovingVaultItem({ item, slot })}
        onQuickMax={handleQuickMaxVaultItem}
        onDuplicate={handleDuplicateVaultItem}
      />

      {/* Modal para Editar / Inspeccionar / Guardar Ítem del Baúl */}
      <ItemModal
        visible={vaultItemModalVisible}
        item={selectedVaultItem}
        slotIndex={selectedVaultSlot}
        initialEditing={true}
        onClose={() => setVaultItemModalVisible(false)}
        onSave={handleSaveVaultItem}
        onDelete={handleDeleteVaultItem}
      />

      {/* Selector de Ítem para Baúl (Reemplazo de la alerta Bless / Soul) */}
      <EquipmentPickerModal
        visible={vaultPickerVisible}
        slotIndex={vaultPickerSlot}
        isWarehouse={true}
        onClose={() => setVaultPickerVisible(false)}
        onSelectItem={handleSelectVaultPickerItem}
      />

      {/* ======================================================== */}
      {/* MODAL 3: CREAR CUENTA EN MEMB_INFO */}
      {/* ======================================================== */}
      <Modal
        visible={createModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.detailModalOverlay}
        >
          <View style={[styles.detailModalCard, { maxHeight: '90%' }]}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Nueva Cuenta (MEMB_INFO)</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeModalBtn}>
                  <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textoSecundario} />
                </TouchableOpacity>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Usuario (memb___id)</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="Ej: mspro02"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  autoCapitalize="none"
                  maxLength={10}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Contraseña (memb__pwd)</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="••••••••"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={newPassword}
                  onChangeText={setNewPassword}
                  autoCapitalize="none"
                  secureTextEntry={true}
                  maxLength={10}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Correo Electrónico</Text>
                <TextInput
                  style={styles.createInput}
                  placeholder="usuario@mspro.com"
                  placeholderTextColor={THEME.colors.textMuted}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Nivel VIP</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { level: 0, label: 'Free', color: THEME.colors.textoSecundario },
                    { level: 1, label: 'Bronce', color: '#CD7F32' },
                    { level: 2, label: 'Plata', color: '#B0BEC5' },
                    { level: 3, label: 'Oro', color: '#FFD700' },
                  ].map((l) => (
                    <TouchableOpacity
                      key={l.level}
                      style={[
                        styles.vipSelectBtn,
                        newLevel === l.level && { borderColor: l.color, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
                      ]}
                      onPress={() => setNewLevel(l.level)}
                    >
                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: l.color, marginBottom: 2 }} />
                      <Text
                        style={[
                          styles.vipSelectBtnText,
                          newLevel === l.level && { color: l.color, fontWeight: 'bold' },
                        ]}
                      >
                        {l.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreateModalVisible(false)}
                  disabled={isCreating}
                >
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={handleCreateAccount}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#0D0D0D" />
                  ) : (
                    <Text style={styles.confirmBtnText}>Crear Cuenta</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    backgroundColor: '#05070A',
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
    color: '#FFD700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(255, 215, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  floatingAddBtn: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#E8C86A',
    elevation: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#100D0B',
    borderRadius: 6,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#6B5533',
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  searchIcon: {
    marginLeft: 8,
  },
  listContent: {
    paddingBottom: 24,
  },
  accountCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191512',
    borderRadius: 6,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: '#3D312A',
    elevation: 3,
  },
  accountCardBlocked: {
    borderColor: '#E2703A',
    backgroundColor: 'rgba(226, 112, 58, 0.08)',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    borderColor: '#6B5533',
    position: 'relative',
  },
  avatarLetter: {
    color: '#E8C86A',
    fontSize: 16,
    fontWeight: '900',
  },
  accountTextCol: {
    flex: 1,
  },
  accountIdText: {
    color: '#E8C86A',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  accountEmailText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  cardRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editAccountQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6B5533',
  },
  warehouseBoxBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#6B5533',
  },
  deleteAccountQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 82, 82, 0.35)',
  },
  vipPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    backgroundColor: '#241E1A',
  },
  vipPillText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Modal Detalle
  detailModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 18,
  },
  detailModalCard: {
    backgroundColor: '#241E1A',
    borderRadius: 6,
    padding: 20,
    borderWidth: 1,
    borderColor: '#6B5533',
    maxHeight: '90%',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3D312A',
  },
  avatarCircleSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetterSmall: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  detailTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeModalBtn: {
    padding: 4,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  fieldBox: {
    backgroundColor: '#100D0B',
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#6B5533',
    minHeight: 44,
    justifyContent: 'center',
  },
  fieldValue: {
    color: THEME.colors.texto,
    fontSize: 14,
  },
  statusToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 6,
    minHeight: 44,
  },
  statusActive: {
    backgroundColor: '#1A3324',
    borderWidth: 1,
    borderColor: '#3FCF8E',
  },
  statusBlocked: {
    backgroundColor: '#3B1A1A',
    borderWidth: 1,
    borderColor: '#E2703A',
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailActionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 18,
  },
  detailBtnPjs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(91, 141, 239, 0.15)',
    borderWidth: 1,
    borderColor: '#5B8DEF',
    minHeight: 44,
  },
  detailBtnPjsText: {
    color: '#5B8DEF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  detailBtnWarehouse: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    borderWidth: 1,
    borderColor: '#B58F3C',
    minHeight: 44,
  },
  detailBtnWarehouseText: {
    color: '#E8C86A',
    fontSize: 13,
    fontWeight: 'bold',
  },

  // Estilos Editor de Cuenta
  modalInputBox: {
    backgroundColor: '#100D0B',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    minHeight: 44,
  },
  modalTextInput: {
    flex: 1,
    color: '#FFF',
    fontSize: 14,
    height: 44,
  },
  helperSubtext: {
    color: THEME.colors.textoSecundario,
    fontSize: 10,
    marginTop: 4,
    fontStyle: 'italic',
  },
  vipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  vipPillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#161618',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A2C',
  },
  vipPillBtnText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickDayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#242426',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  quickDayText: {
    color: '#FF9800',
    fontSize: 11,
    fontWeight: 'bold',
  },
  coinsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coinCol: {
    flex: 1,
    backgroundColor: '#121214',
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: '#252528',
    alignItems: 'center',
  },
  coinLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textoSecundario,
    marginBottom: 4,
  },
  coinInput: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  stepBtn: {
    backgroundColor: '#2C2C2E',
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveAccountBtn: {
    backgroundColor: '#3FCF8E',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    minHeight: 44,
  },
  saveAccountBtnText: {
    color: '#100D0B',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disconnectBtn: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderWidth: 1,
    borderColor: '#E2703A',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    minHeight: 44,
  },
  disconnectBtnText: {
    color: '#E2703A',
    fontWeight: 'bold',
    fontSize: 13,
  },
  deleteAccountBtn: {
    backgroundColor: 'rgba(244, 67, 54, 0.15)',
    borderWidth: 1,
    borderColor: '#F44336',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    minHeight: 44,
  },
  deleteAccountBtnText: {
    color: '#FF5252',
    fontWeight: 'bold',
    fontSize: 13,
  },
  onlineStatusDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: THEME.colors.jade,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  onlineBadgePill: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(63, 207, 142, 0.4)',
  },
  onlineBadgeText: {
    color: THEME.colors.jade,
    fontSize: 9,
    fontWeight: 'bold',
  },

  // Estilos Crear Cuenta
  createInput: {
    backgroundColor: '#100D0B',
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    minHeight: 44,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  vipSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#100D0B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6B5533',
    minHeight: 44,
  },
  vipSelectBtnActive: {
    borderColor: '#B58F3C',
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
  },
  vipSelectBtnText: {
    color: THEME.colors.textoSecundario,
    fontWeight: '600',
  },
  vipSelectBtnTextActive: {
    color: '#E8C86A',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#1A1613',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6B5533',
    minHeight: 44,
  },
  cancelBtnText: {
    color: THEME.colors.texto,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    backgroundColor: '#B58F3C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8C86A',
    minHeight: 44,
  },
  confirmBtnText: {
    color: '#100D0B',
    fontWeight: 'bold',
  },

  // Error Card
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2703A',
    padding: 12,
    marginBottom: 14,
  },
  errorTitle: {
    color: '#FF5252',
    fontSize: 12,
    fontWeight: 'bold',
  },
  errorSub: {
    color: '#FF8A80',
    fontSize: 11,
    marginTop: 2,
  },
  retryBtn: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryText: {
    color: '#FF5252',
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
  },

  // Estilos Warehouse Interactivo (120 slots)
  warehouseModalCard: {
    maxHeight: '94%',
    padding: 14,
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  vaultSubtitle: {
    color: '#B58F3C',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  vaultControlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  unlockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    borderColor: '#B58F3C',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    minHeight: 38,
  },
  unlockBtnText: {
    color: '#E8C86A',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vaultTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1A1613',
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    minHeight: 38,
    justifyContent: 'center',
  },
  vaultTabActive: {
    backgroundColor: '#B58F3C',
    borderColor: '#E8C86A',
  },
  vaultTabText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  vaultTabTextActive: {
    color: '#100D0B',
    fontWeight: 'bold',
  },
  vaultStatsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1A1613',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#6B5533',
    minHeight: 44,
  },
  zenInput: {
    color: '#3FCF8E',
    fontSize: 14,
    fontWeight: 'bold',
    borderBottomWidth: 1,
    borderBottomColor: '#3FCF8E',
    minWidth: 90,
    paddingVertical: 1,
  },
  slotCountBadge: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vaultHelpText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  vaultFooterBar: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#2C2C2E',
  },
  vaultCloseBtn: {
    flex: 1,
    backgroundColor: '#2A2A2C',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  vaultCloseBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  vaultSaveBtn: {
    flex: 2,
    backgroundColor: '#FF5722',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  vaultSaveBtnText: {
    color: '#0D0D0D',
    fontWeight: 'bold',
    fontSize: 13,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#242426',
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  presetPillActive: {
    backgroundColor: 'rgba(255, 87, 34, 0.2)',
    borderColor: '#FF5722',
  },
  presetPillText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: '#FF5722',
    fontWeight: 'bold',
  },

  // Warehouse Screen Styles (Capturas 1 a 5)
  whScreenContainer: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
  },
  whHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: THEME.colors.borde,
    backgroundColor: THEME.colors.superficie,
  },
  whBackBtn: {
    paddingVertical: 4,
    paddingRight: 8,
  },
  whBackBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 15,
    fontWeight: '800',
  },
  whHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whHeaderTitle: {
    color: THEME.colors.oroClaro,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  whRefreshBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Items Tab (Captura 1)
  whBannerCard: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderLeftWidth: 4,
    borderLeftColor: THEME.colors.oroClaro,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
    marginBottom: 12,
  },
  whBannerTitle: {
    color: THEME.colors.oroClaro,
    fontSize: 15,
    fontWeight: '900',
  },
  whBannerSubtitle: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    lineHeight: 17,
  },
  whSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 10,
    gap: 8,
  },
  whSearchInput: {
    flex: 1,
    color: THEME.colors.texto,
    fontSize: 14,
  },
  whCategoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  whCategoryPillActive: {
    backgroundColor: THEME.colors.oro,
    borderColor: THEME.colors.oroClaro,
  },
  whCategoryPillText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  whCategoryPillTextActive: {
    color: THEME.colors.textoOscuro,
    fontWeight: '900',
  },
  whCategorySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 10,
  },
  whCategorySelectorText: {
    color: THEME.colors.texto,
    fontSize: 14,
    fontWeight: '700',
  },
  whCategoryDropdownList: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginBottom: 12,
    maxHeight: 220,
    paddingVertical: 4,
  },
  whCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  whCategoryItemActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
  },
  whCategoryItemText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
  whCategoryItemTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: '800',
  },
  whCatalogListContainer: {
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.2,
    borderColor: THEME.colors.borde,
    padding: 10,
    minHeight: 200,
  },
  whCatalogEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  whCatalogEmptyText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
  whCatalogItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.2,
    borderColor: THEME.colors.borde,
    padding: 10,
    marginBottom: 8,
  },
  whCatalogItemImg: {
    width: 48,
    height: 48,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whCatalogItemName: {
    color: THEME.colors.texto,
    fontSize: 14,
    fontWeight: '800',
  },
  whCatalogItemMeta: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  whAddCatalogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.oro,
    borderWidth: 1,
    borderColor: THEME.colors.oroClaro,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  whAddCatalogBtnText: {
    color: THEME.colors.textoOscuro,
    fontSize: 12,
    fontWeight: '800',
  },
  // Warehouse Tab (Capturas 2, 3)
  whControlCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.2,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginBottom: 10,
    elevation: 3,
  },
  whControlLabel: {
    color: THEME.colors.oroClaro,
    fontSize: 14,
    fontWeight: '800',
  },
  whZenInput: {
    color: THEME.colors.jade,
    fontSize: 15,
    fontWeight: '900',
    flex: 1,
    textAlign: 'right',
    marginRight: 10,
    paddingVertical: 2,
  },
  whMaxBtn: {
    backgroundColor: THEME.colors.superficie,
    borderColor: THEME.colors.borde,
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  whMaxBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 12,
    fontWeight: '900',
  },
  whStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  whStepBtn: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    width: 38,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: THEME.colors.borde,
  },
  whStepBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 18,
    fontWeight: '900',
  },
  whStepValue: {
    color: THEME.colors.texto,
    fontSize: 16,
    fontWeight: '900',
    width: 44,
    textAlign: 'center',
  },
  whSubTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  whSubTabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  whSubTabBtnActive: {
    backgroundColor: THEME.colors.oro,
    borderColor: THEME.colors.oroClaro,
  },
  whSubTabBtnText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    fontWeight: '700',
  },
  whSubTabBtnTextActive: {
    color: THEME.colors.textoOscuro,
    fontWeight: '900',
  },
  whGridSubtitle: {
    color: THEME.colors.oroClaro,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    marginVertical: 8,
    letterSpacing: 0.8,
  },
  // Bottom Bar & Save Button (Capturas 1, 2)
  whBottomTabsBar: {
    flexDirection: 'row',
    backgroundColor: THEME.colors.superficie,
    borderTopWidth: 1.5,
    borderTopColor: THEME.colors.borde,
    height: 54,
  },
  whBottomTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  whBottomTabText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  whBottomTabTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: '900',
  },
  whSaveBtnContainer: {
    backgroundColor: THEME.colors.superficie,
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  whGreenSaveBtn: {
    backgroundColor: THEME.colors.oro,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.2,
    borderColor: THEME.colors.oroClaro,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  whGreenSaveBtnText: {
    color: THEME.colors.textoOscuro,
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  // Premium Modal (Captura 4)
  premiumModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  premiumModalCard: {
    width: '100%',
    maxWidth: 330,
    backgroundColor: '#2B2521',
    borderRadius: 6,
    padding: 22,
    borderWidth: 1,
    borderColor: '#6B5533',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  premiumModalTitle: {
    color: '#E8C86A',
    fontSize: 17,
    fontWeight: '800',
  },
  premiumModalBody: {
    color: THEME.colors.texto,
    fontSize: 14,
    lineHeight: 22,
  },
  premiumModalBtnText: {
    color: '#3FCF8E',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  // Character section in Account Detail Modal
  charSectionBox: {
    backgroundColor: '#1A1613',
    borderRadius: 6,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  noCharsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 200, 106, 0.08)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  noCharsText: {
    color: '#E8C86A',
    fontSize: 12,
    fontWeight: '500',
  },
  quickCreateCharBtn: {
    backgroundColor: '#B58F3C',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E8C86A',
    minHeight: 44,
    justifyContent: 'center',
  },
  quickCreateCharBtnText: {
    color: '#100D0B',
    fontWeight: '800',
    fontSize: 12,
  },
  charChipsList: {
    gap: 8,
  },
  charChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2B2521',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#6B5533',
    minHeight: 44,
  },
  charChipName: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  charChipSub: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 2,
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
    marginBottom: 10,
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
    borderRadius: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  movingBannerCancelText: {
    color: '#E2703A',
    fontSize: 11,
    fontWeight: '800',
  },

  // Warehouse Item Maker Component Styles
  whControlCardBox: {
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    padding: 12,
    marginBottom: 12,
  },
  whSectionHeader: {
    color: '#FF7A00',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  whOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  whOptionLabel: {
    color: '#E0E0E0',
    fontSize: 13,
    fontWeight: '600',
  },
  whStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whStepBtnSmall: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  whStepBtnTextSmall: {
    color: THEME.colors.oroClaro,
    fontSize: 16,
    fontWeight: 'bold',
  },
  whStepperVal: {
    color: THEME.colors.oroClaro,
    fontSize: 15,
    fontWeight: 'bold',
    minWidth: 36,
    textAlign: 'center',
  },
  whMaxBtnSmall: {
    backgroundColor: THEME.colors.brasa,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginLeft: 4,
  },
  whMaxBtnTextSmall: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  whNumInputSmall: {
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    color: THEME.colors.texto,
    fontSize: 14,
    fontWeight: 'bold',
    width: 60,
    height: 32,
    textAlign: 'center',
    padding: 0,
  },
  whSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  whFenrirPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
  },
  whAncientPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
  },
  whAncientPillActive: {
    backgroundColor: 'rgba(91, 141, 239, 0.2)',
    borderColor: THEME.colors.arcano,
  },
  whAncientPillText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  whAncientPillTextActive: {
    color: THEME.colors.arcano,
    fontWeight: '800',
  },
  whQuickExcBtn: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  whQuickExcBtnText: {
    color: THEME.colors.jade,
    fontSize: 11,
    fontWeight: '700',
  },
  whExcGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  whExcChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  whExcChipActive: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderColor: THEME.colors.jade,
  },
  whExcChipText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  whHarmonyBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#1E1A16',
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  whHarmonyBtnActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.2)',
    borderColor: '#E8C86A',
  },
  whHarmonyBtnText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  whHarmonyBtnTextActive: {
    color: '#E8C86A',
    fontWeight: '800',
  },
  whSocketBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: '#1E1A16',
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  whSocketBtnActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.2)',
    borderColor: '#E8C86A',
  },
  whSocketBtnText: {
    color: THEME.colors.textoSecundario,
    fontSize: 10,
    fontWeight: '600',
  },
  whSocketBtnTextActive: {
    color: '#E8C86A',
    fontWeight: '800',
  },
  vaultExtSubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#1E1A16',
    borderWidth: 1.2,
    borderColor: '#6B5533',
  },
  vaultExtSubTabBtnActive: {
    backgroundColor: '#B58F3C',
    borderColor: '#E8C86A',
  },
  vaultExtSubTabText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  vaultExtSubTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  vaultExtHeroCard: {
    backgroundColor: '#241E1A',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1.2,
    borderColor: '#6B5533',
    marginBottom: 12,
  },

  // ==========================================
  // ESTILOS CLÁSICOS DE BAÚL MU ONLINE SEASON 6
  // ==========================================
  muVaultHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E1A16',
    borderRadius: 6,
    borderWidth: 1.2,
    borderColor: '#6B5533',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  muVaultArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#241E1A',
    borderWidth: 1.2,
    borderColor: '#6B5533',
    alignItems: 'center',
    justifyContent: 'center',
  },
  muVaultArrowText: {
    fontSize: 16,
    color: '#E8C86A',
    fontWeight: '900',
  },
  muVaultHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#E8C86A',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  vaultPanelContainer: {
    marginVertical: THEME.shapes.espaciadoBase,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  vaultCounterHeader: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  vaultCounterOfficialText: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.texto,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  muVaultFooterContainer: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
    marginTop: 12,
    marginBottom: 20,
    gap: 10,
  },
  muVaultMoneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muVaultZenLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 1,
    width: 110,
  },
  muVaultStoredLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.brasa,
    letterSpacing: 1,
    width: 110,
  },
  muVaultMoneyBox: {
    flex: 1,
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 12,
    height: 44,
    justifyContent: 'center',
  },
  muVaultMoneyText: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.jade,
    textAlign: 'right',
    letterSpacing: 1,
  },
  muVaultMoneyInput: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.colors.brasa,
    textAlign: 'right',
    paddingVertical: 0,
    letterSpacing: 1,
  },
  muVaultBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 6,
  },
  muVaultActionBtn: {
    width: 48,
    height: 44,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  muVaultPlusText: {
    fontSize: 22,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    marginTop: -2,
  },
  whLockWarningBanner: {
    backgroundColor: 'rgba(255, 179, 0, 0.16)',
    borderColor: '#FFB300',
    borderWidth: 1,
    borderRadius: 6,
    marginHorizontal: 12,
    marginTop: 6,
    marginBottom: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whLockWarningText: {
    flex: 1,
    color: '#FFE082',
    fontSize: 11,
    fontWeight: '600',
  },
});
