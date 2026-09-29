import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
  KeyboardAvoidingView,
  Switch,
  Image,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../../components/common/GothicAlert';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MuIcon } from '../../components/ui/MuIcon';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { THEME } from '../../constants/theme';
import { AccountSummary, AccountUpdateData, CharacterSummary } from '../../types/character';
import { JewelBankData } from '../../types/admin';
import { JEWEL_ASSET_IMAGES } from '../../constants/jewelAssets';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { SqlClient } from '../../services/database/sqlClient';
import { useLanguage } from '../../context/LanguageContext';
import { maskHost } from '../../services/maskUtils';
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
import { LicenseModal } from '../../components/security/LicenseModal';
import { DEFAULT_ITEM_CATALOG, ItemDefinition } from '../../services/parser/itemDatabase';
import { AutocompleteInput } from '../../components/common/AutocompleteInput';
import { MAKER_CATEGORIES } from '../../constants/makerCategories';
import { QuickSetDef, QUICK_SETS_CATALOG } from '../../constants/quickSetsCatalog';
import { Panel, Pestanas, TituloSeccion, BotonPiedra, MuCornerOrnaments, MuSideMoldings, MuButton, BotonOro, BotonBrasa } from '../../components/ui';

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

const JEWEL_CONFIG: { key: keyof JewelBankData; label: string; icon: string; color: string; bg: string }[] = [
  { key: 'Bless', label: 'Jewel of Bless', icon: 'diamond', color: '#5B8DEF', bg: 'rgba(91, 141, 239, 0.15)' },
  { key: 'Soul', label: 'Jewel of Soul', icon: 'fire', color: '#E2703A', bg: 'rgba(226, 112, 58, 0.15)' },
  { key: 'Chaos', label: 'Jewel of Chaos', icon: 'star-four-points', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
  { key: 'Life', label: 'Jewel of Life', icon: 'heart', color: '#3FCF8E', bg: 'rgba(63, 207, 142, 0.15)' },
  { key: 'Creation', label: 'Jewel of Creation', icon: 'feather', color: '#5B8DEF', bg: 'rgba(91, 141, 239, 0.15)' },
  { key: 'Guardian', label: 'Jewel of Guardian', icon: 'shield', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
  { key: 'Harmony', label: 'Jewel of Harmony', icon: 'auto-fix', color: '#EFD28D', bg: 'rgba(239, 210, 141, 0.15)' },
  { key: 'GemStone', label: 'GemStone', icon: 'rhombus', color: '#CDC6B9', bg: 'rgba(205, 198, 185, 0.15)' },
  { key: 'LowStone', label: 'Lower Refining Stone', icon: 'octagram', color: '#CDC6B9', bg: 'rgba(205, 198, 185, 0.15)' },
  { key: 'HighStone', label: 'Higher Refining Stone', icon: 'octagram-outline', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
  { key: 'Kundun1', label: 'Box of Kundun +1', icon: 'package-variant', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
  { key: 'Kundun2', label: 'Box of Kundun +2', icon: 'package-variant', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
  { key: 'Kundun3', label: 'Box of Kundun +3', icon: 'package-variant', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
  { key: 'Kundun4', label: 'Box of Kundun +4', icon: 'package-variant', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
  { key: 'Kundun5', label: 'Box of Kundun +5', icon: 'package-variant', color: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)' },
];

export interface AccountsScreenProps {
  hideTopPadding?: boolean;
  route?: any;
  navigation?: any;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = (props) => {
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

  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [filtered, setFiltered] = useState<AccountSummary[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'activas' | 'bloqueadas' | 'vip'>('todos');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal State para Registro de Cuenta (Botón +)
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
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
      setStatusFilter('vip');
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

  // Modal Banco de Joyas (CustomJewelBank)
  const [jewelBankModalVisible, setJewelBankModalVisible] = useState(false);
  const [jewelBankLoading, setJewelBankLoading] = useState(false);
  const [jewelBankSaving, setJewelBankSaving] = useState(false);
  const [jewelBankAcc, setJewelBankAcc] = useState('');
  const [jewelBankHasTable, setJewelBankHasTable] = useState(true);
  const [jewelBankTableName, setJewelBankTableName] = useState<string>('CustomJewelBank');
  const [jewelBankData, setJewelBankData] = useState<JewelBankData>({
    Bless: 0,
    Soul: 0,
    Chaos: 0,
    Life: 0,
    Creation: 0,
    Guardian: 0,
    Harmony: 0,
    GemStone: 0,
    LowStone: 0,
    HighStone: 0,
    Kundun1: 0,
    Kundun2: 0,
    Kundun3: 0,
    Kundun4: 0,
    Kundun5: 0,
  });

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
  const [warehouseViewTab, setWarehouseViewTab] = useState<'items' | 'warehouse' | 'vault_ext' | 'jewels'>('warehouse');
  const [vaultSubTab, setVaultSubTab] = useState<'main' | 'ext'>('main');
  const [premiumModalVisible, setPremiumModalVisible] = useState<boolean>(false);
  const [licenseModalVisible, setLicenseModalVisible] = useState<boolean>(false);
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



  const fetchRequestIdRef = useRef(0);

  const fetchAccounts = async (silent: boolean | any = false) => {
    const isSilent = silent === true;
    const reqId = ++fetchRequestIdRef.current;
    if (!isSilent) {
      setLoading(true);
    }
    setErrorMessage(null);
    try {
      const data = await SqlClient.getRecentAccounts();
      if (reqId === fetchRequestIdRef.current) {
        setAccounts(data);
        applyFilter(search, data);
      }
    } catch (err: any) {
      if (reqId === fetchRequestIdRef.current) {
        setErrorMessage(err.message || 'Error al conectar con SQL Server');
        setAccounts([]);
        setFiltered([]);
      }
    } finally {
      if (reqId === fetchRequestIdRef.current && !isSilent) {
        setLoading(false);
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAccounts(false);
      const interval = setInterval(() => {
        fetchAccounts(true);
      }, 15000);
      return () => clearInterval(interval);
    }, [])
  );

  const applyFilter = (
    q: string,
    list = accounts,
    mode: 'todos' | 'activas' | 'bloqueadas' | 'vip' = (typeof statusFilter !== 'undefined' ? statusFilter : 'todos')
  ) => {
    let result = list;
    if (mode === 'activas') {
      result = result.filter((a) => String(a.bloc_code) !== '1');
    } else if (mode === 'bloqueadas') {
      result = result.filter((a) => String(a.bloc_code) === '1');
    } else if (mode === 'vip') {
      result = result.filter((a) => (a.AccountLevel || 0) > 0);
    }

    if (q.trim()) {
      const lower = q.toLowerCase();
      result = result.filter((a) =>
        a.memb___id.toLowerCase().includes(lower) ||
        (a.mail_addr && a.mail_addr.toLowerCase().includes(lower)) ||
        (a.memb_name && a.memb_name.toLowerCase().includes(lower))
      );
    }
    setFiltered(result);
  };

  const handleSearch = (text: string) => {
    setSearch(text);
    applyFilter(text, accounts, statusFilter);
  };

  const handleStatusFilterChange = (mode: 'todos' | 'activas' | 'bloqueadas' | 'vip') => {
    setStatusFilter(mode);
    applyFilter(search, accounts, mode);
  };

  const handleCreateAccount = async () => {
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Creación de Cuentas',
        () => setLicenseModalVisible(true),
        'La creación de nuevas cuentas en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }

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
        if (LicenseService.isLicenseError(result.message)) {
          LicenseService.alertProRequired('Creación de Cuentas', () => setLicenseModalVisible(true), result.message);
        } else {
          Alert.alert('Error SQL', result.message);
        }
      }
    } catch (e: any) {
      if (LicenseService.isLicenseError(e.message)) {
        LicenseService.alertProRequired('Creación de Cuentas', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleBlock = async (account: AccountSummary) => {
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Bloqueo de Cuentas',
        () => setLicenseModalVisible(true),
        'El bloqueo o desbloqueo de cuentas en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }

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
              if (res.success) {
                Alert.alert('Resultado', res.message);
                // Actualizar cuenta seleccionada localmente
                if (selectedAccount && selectedAccount.memb___id === account.memb___id) {
                  setSelectedAccount({
                    ...selectedAccount,
                    bloc_code: isCurrentlyBlocked ? '0' : '1',
                  });
                }
                await fetchAccounts();
              } else {
                if (LicenseService.isLicenseError(res.message)) {
                  LicenseService.alertProRequired('Bloqueo de Cuentas', () => setLicenseModalVisible(true), res.message);
                } else {
                  Alert.alert('Error', res.message);
                }
              }
            } catch (err: any) {
              if (LicenseService.isLicenseError(err.message)) {
                LicenseService.alertProRequired('Bloqueo de Cuentas', () => setLicenseModalVisible(true), err.message);
              } else {
                Alert.alert('Error', err.message);
              }
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
      LicenseService.alertProRequired(
        'Edición de Cuentas',
        () => setLicenseModalVisible(true),
        'La edición avanzada de cuentas y sincronización de datos con SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }

    setSavingAccount(true);
    try {
      const payload: AccountUpdateData = {
        username: selectedAccount.memb___id,
        newUsername: editUsername.trim() !== selectedAccount.memb___id ? editUsername.trim() : undefined,
        password: (editPassword.trim() && editPassword.trim() !== '••••••••' && editPassword.trim() !== '********' && editPassword.trim() !== selectedAccount.memb__pwd) ? editPassword.trim() : undefined,
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
          memb__pwd: payload.password || selectedAccount.memb__pwd,
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Edición de Cuentas', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error', res.message);
        }
      }
    } catch (e: any) {
      if (LicenseService.isLicenseError(e.message)) {
        LicenseService.alertProRequired('Edición de Cuentas', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message || 'No se pudo actualizar la cuenta.');
      }
    } finally {
      setSavingAccount(false);
    }
  };

  const handleDisconnectAccount = async () => {
    if (!selectedAccount) return;
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Liberar Sesión SQL',
        () => setLicenseModalVisible(true),
        'Liberar sesiones y modificar el estado de conexión en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
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
                if (LicenseService.isLicenseError(res.message)) {
                  LicenseService.alertProRequired('Liberar Sesión SQL', () => setLicenseModalVisible(true), res.message);
                } else {
                  Alert.alert('Error', res.message);
                }
              }
            } catch (e: any) {
              if (LicenseService.isLicenseError(e.message)) {
                LicenseService.alertProRequired('Liberar Sesión SQL', () => setLicenseModalVisible(true), e.message);
              } else {
                Alert.alert('Error', e.message || 'Error al desconectar');
              }
            } finally {
              setDisconnectingAccount(false);
            }
          },
        },
      ]
    );
  };

  const promptDeleteAccountDirect = (account: AccountSummary) => {
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Eliminación de Cuentas',
        () => setLicenseModalVisible(true),
        'La eliminación de cuentas y todos sus datos en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
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
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Eliminación de Cuentas',
        () => setLicenseModalVisible(true),
        'La eliminación de cuentas y todos sus datos en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
    const charCountText = accountChars.length > 0 ? `${accountChars.length} personajes asociados` : 'personajes asociados';
    Alert.alert(
      '[AVISO] Eliminar Cuenta Completa',
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
            '[AVISO] Cuenta Conectada',
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
        } else if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Eliminación de Cuentas', () => setLicenseModalVisible(true), res.message);
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
      if (LicenseService.isLicenseError(e.message)) {
        LicenseService.alertProRequired('Eliminación de Cuentas', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message || 'Error inesperado al eliminar la cuenta.');
      }
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

  const loadJewelBankData = async (accId: string) => {
    setJewelBankAcc(accId);
    setJewelBankLoading(true);
    try {
      const res = await SqlClient.getJewelBank(accId);
      if (!res.hasTable) {
        setJewelBankHasTable(false);
      } else {
        setJewelBankHasTable(true);
        if (res.tableName) {
          setJewelBankTableName(res.tableName);
        }
        if (res.bank) {
          const raw: any = res.bank;
          const getBankVal = (key: string): number => {
            if (raw[key] !== undefined && raw[key] !== null) {
              const n = Number(raw[key]);
              return isNaN(n) ? 0 : Math.max(0, n);
            }
            const foundKey = Object.keys(raw).find(k => k.toLowerCase() === key.toLowerCase());
            if (foundKey && raw[foundKey] !== undefined && raw[foundKey] !== null) {
              const n = Number(raw[foundKey]);
              return isNaN(n) ? 0 : Math.max(0, n);
            }
            return 0;
          };
          setJewelBankData({
            Bless: getBankVal('Bless'),
            Soul: getBankVal('Soul'),
            Chaos: getBankVal('Chaos'),
            Life: getBankVal('Life'),
            Creation: getBankVal('Creation'),
            Guardian: getBankVal('Guardian'),
            Harmony: getBankVal('Harmony'),
            GemStone: getBankVal('GemStone'),
            LowStone: getBankVal('LowStone'),
            HighStone: getBankVal('HighStone'),
            Kundun1: getBankVal('Kundun1'),
            Kundun2: getBankVal('Kundun2'),
            Kundun3: getBankVal('Kundun3'),
            Kundun4: getBankVal('Kundun4'),
            Kundun5: getBankVal('Kundun5'),
          });
        } else {
          setJewelBankData({
            Bless: 0,
            Soul: 0,
            Chaos: 0,
            Life: 0,
            Creation: 0,
            Guardian: 0,
            Harmony: 0,
            GemStone: 0,
            LowStone: 0,
            HighStone: 0,
            Kundun1: 0,
            Kundun2: 0,
            Kundun3: 0,
            Kundun4: 0,
            Kundun5: 0,
          });
        }
      }
    } catch (e: any) {
      Alert.alert('Error al cargar Banco de Joyas', e.message);
    } finally {
      setJewelBankLoading(false);
    }
  };

  const openJewelBankForAccount = async (accId: string) => {
    openWarehouseForAccount(accId, 'jewels');
  };

  const handleSaveJewelBank = async () => {
    const accToSave = jewelBankAcc || warehouseAccount;
    if (!accToSave) return;
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Banco de Joyas',
        () => setLicenseModalVisible(true),
        'La modificación y sincronización del Banco de Joyas en SQL Server requiere una Licencia PRO activa.'
      );
      return;
    }
    setJewelBankSaving(true);
    try {
      const res = await SqlClient.updateJewelBank(accToSave, jewelBankData);
      if (res.success) {
        Alert.alert('¡Banco de Joyas Guardado!', `Las joyas de la cuenta '${accToSave}' se guardaron exitosamente en SQL Server.`);
      } else {
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Banco de Joyas', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error al guardar', res.message);
        }
      }
    } catch (e: any) {
      if (LicenseService.isLicenseError(e.message)) {
        LicenseService.alertProRequired('Banco de Joyas', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      setJewelBankSaving(false);
    }
  };

  const handleJewelChange = (key: keyof JewelBankData, delta: number) => {
    setJewelBankData(prev => ({
      ...prev,
      [key]: Math.max(0, (Number(prev[key]) || 0) + delta),
    }));
  };

  const handleJewelSetDirect = (key: keyof JewelBankData, text: string) => {
    const val = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
    setJewelBankData(prev => ({
      ...prev,
      [key]: Math.max(0, val),
    }));
  };

  const handleQuickFillAll = (amount: number) => {
    setJewelBankData({
      Bless: amount,
      Soul: amount,
      Chaos: amount,
      Life: amount,
      Creation: amount,
      Guardian: amount,
      Harmony: amount,
      GemStone: amount,
      LowStone: amount,
      HighStone: amount,
      Kundun1: amount,
      Kundun2: amount,
      Kundun3: amount,
      Kundun4: amount,
      Kundun5: amount,
    });
  };

  const handleCloseWarehouseModal = () => {
    if (warehouseAccount) {
      SqlClient.releaseEditorLock(`Warehouse:${warehouseAccount}`).catch(() => {});
    }
    setWarehouseLockWarning(null);
    setWarehouseModalVisible(false);
  };

  const handleReleaseWarehouseLock = async () => {
    if (!warehouseAccount) return;
    try {
      await SqlClient.releaseEditorLock(`Warehouse:${warehouseAccount}`);
      setWarehouseLockWarning(null);
      Alert.alert('Candado Liberado', `Se ha liberado exitosamente el candado de edición del baúl de la cuenta "${warehouseAccount}".`);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'No se pudo liberar el candado.');
    }
  };

  const handleSelectWarehouseTab = (tab: 'items' | 'warehouse' | 'vault_ext' | 'jewels') => {
    setWarehouseViewTab(tab);
    if (tab === 'vault_ext') {
      setVaultSubTab('ext');
    } else if (tab === 'warehouse') {
      setVaultSubTab('main');
    } else if (tab === 'jewels') {
      if (warehouseAccount) {
        loadJewelBankData(warehouseAccount);
      }
    }
  };

  const openWarehouseForAccount = async (accountId: string, initialTab: 'items' | 'warehouse' | 'vault_ext' | 'jewels' = 'warehouse') => {
    setWarehouseAccount(accountId);
    setWarehouseViewTab(initialTab);
    setVaultSubTab(initialTab === 'vault_ext' ? 'ext' : 'main');
    setWarehouseModalVisible(true);
    // Adquirir candado suave multi-admin para este baúl
    SqlClient.acquireEditorLock(`Warehouse:${accountId}`).then((res) => {
      if (res && res.locked && res.holder) {
        setWarehouseLockWarning(`[AVISO] El baúl de "${accountId}" está siendo editado por ${res.holder} hace ${res.elapsedSec || 0}s`);
        Alert.alert('Aviso de Concurrencia', `El baúl de "${accountId}" está siendo editado por ${res.holder} hace ${res.elapsedSec || 0}s.`);
      } else {
        setWarehouseLockWarning(null);
      }
    }).catch(() => {});
    if (initialTab === 'jewels') {
      loadJewelBankData(accountId);
    }
    await loadVaultData(accountId, 0);
  };

  const handleSwitchVault = async (targetIdx: number) => {
    if (targetIdx === activeVaultIndex || loadingWarehouse) return;
    if (targetIdx > 0 && !LicenseService.isPro()) {
      LicenseService.alertProRequired(
        `Multi-Vault (Baúl #${targetIdx})`,
        () => setLicenseModalVisible(true),
        'El acceso a múltiples baúles (Multi-Vault) requiere una Licencia PRO activa. En versión DEMO solo se permite acceder al Baúl 0 (Principal).'
      );
      return;
    }
    await loadVaultData(warehouseAccount, targetIdx);
  };

  const handleUnlockWarehouses = async () => {
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Desbloqueo de Baúles',
        () => setLicenseModalVisible(true),
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Desbloqueo de Baúles', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error al desbloquear', res.message || 'No se pudo actualizar en SQL Server');
        }
      }
    } catch (e: any) {
      if (LicenseService.isLicenseError(e.message)) {
        LicenseService.alertProRequired('Desbloqueo de Baúles', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message);
      }
    } finally {
      setUnlockingVaults(false);
    }
  };

  const handleActivateVaultExpansion = async () => {
    if (!LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Bóveda Expandida',
        () => setLicenseModalVisible(true),
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
        if (LicenseService.isLicenseError(res.message)) {
          LicenseService.alertProRequired('Bóveda Expandida', () => setLicenseModalVisible(true), res.message);
        } else {
          Alert.alert('Error al activar', res.message || 'No se pudo actualizar en SQL Server');
        }
      }
    } catch (e: any) {
      if (LicenseService.isLicenseError(e.message)) {
        LicenseService.alertProRequired('Bóveda Expandida', () => setLicenseModalVisible(true), e.message);
      } else {
        Alert.alert('Error', e.message);
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
      LicenseService.alertProRequired(
        'Límite de Zen',
        () => setLicenseModalVisible(true),
        'En versión DEMO el Zen máximo permitido es 10,000,000. Activa la versión PRO para almacenar hasta 2,000,000,000 de Zen.'
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
      LicenseService.alertProRequired(
        'Guardado de Baúl',
        () => setLicenseModalVisible(true),
        'El guardado y sincronización de ítems del baúl con SQL Server requiere una Licencia PRO activa. En versión DEMO puedes editar y probar los ítems en memoria, pero no sincronizarlos con la base de datos.'
      );
      return;
    }
    if (vaultMoney > 10000000 && !LicenseService.isPro()) {
      LicenseService.alertProRequired(
        'Límite de Zen en Baúl',
        () => setLicenseModalVisible(true),
        'En versión DEMO el Zen máximo permitido en el baúl es 10,000,000. Activa la versión PRO para guardar hasta 2,000,000,000 de Zen.'
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
          if (LicenseService.isLicenseError(res.message)) {
            LicenseService.alertProRequired('Guardado de Baúl', () => setLicenseModalVisible(true), res.message);
          } else {
            Alert.alert('Error al guardar', res.message);
          }
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
          'El jugador está CONECTADO al juego. Para evitar que el GameServer sobreescriba los datos en memoria al salir, debe desconectarse. ¿Deseas desconectarlo automáticamente y proceder?\n\n[AVISO TÉCNICO]: Desde la conexión SQL directa no es posible cerrar el cliente de juego (la sesión activa vive en la memoria RAM del GameServer).',
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
        return { label: 'Oro', color: '#E0C380', dot: '#E0C380', bg: 'rgba(224, 195, 128, 0.15)', border: 'rgba(224, 195, 128, 0.55)' };
      case 2:
        return { label: 'Plata', color: '#E4E2E0', dot: '#E4E2E0', bg: 'rgba(228, 226, 224, 0.12)', border: 'rgba(228, 226, 224, 0.45)' };
      case 1:
        return { label: 'Bronce', color: '#FFA87D', dot: '#FFA87D', bg: 'rgba(255, 168, 125, 0.15)', border: 'rgba(255, 168, 125, 0.55)' };
      default:
        return { label: 'Free', color: '#E4E2E0', dot: '#CDC6B9', bg: '#1B1C1B', border: '#4C463A' };
    }
  };

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={[styles.container, { paddingTop: props?.hideTopPadding ? 4 : (topInset + 6) }]}
      imageStyle={{ opacity: 0.50 }}
      resizeMode="repeat"
    >
      {/* Buscador Metálico y Botón Táctil de Nueva Cuenta (Stitch 02) */}
      <View style={styles.stitchSearchRow}>
        <View style={styles.stitchSearchBox}>
          <MuIcon name="search" size={17} color={THEME.colors.textMuted} style={{ marginRight: 6 }} />
          <TextInput
            value={search}
            onChangeText={handleSearch}
            placeholder="Buscar cuenta o [MEMB_INFO]..."
            placeholderTextColor={THEME.colors.textMuted}
            style={styles.stitchSearchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.stitchClearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MuIcon name="close" size={14} color={THEME.colors.textoSecundarioLuminoso} />
            </TouchableOpacity>
          )}
        </View>
        <MuButton
          titulo="NUEVA CUENTA"
          icono="plus"
          variante="primary"
          compacto={true}
          altura={44}
          onPress={() => setCreateModalVisible(true)}
          style={{ minWidth: 124 }}
          accessibilityLabel="Crear Nueva Cuenta"
        />
      </View>

      {/* Chips de Filtros Rápidos (Stitch 02) */}
      <View style={styles.stitchFilterChipsRow}>
        <Text style={styles.stitchFilterLabel}>FILTROS:</Text>
        <TouchableOpacity
          style={styles.stitchFilterChipTouchable}
          onPress={() => handleStatusFilterChange('todos')}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={statusFilter === 'todos' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
            style={styles.stitchFilterChipBg}
            resizeMode="stretch"
            imageStyle={{ borderRadius: 2 }}
          >
            <Text style={[styles.stitchFilterChipText, statusFilter === 'todos' && styles.stitchFilterChipTextActive]}>
              Todos
            </Text>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stitchFilterChipTouchable}
          onPress={() => handleStatusFilterChange('activas')}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={statusFilter === 'activas' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
            style={styles.stitchFilterChipBg}
            resizeMode="stretch"
            imageStyle={{ borderRadius: 2 }}
          >
            <Text style={[styles.stitchFilterChipText, statusFilter === 'activas' ? styles.stitchFilterChipTextActive : { color: THEME.colors.jade }]}>
              Activas
            </Text>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stitchFilterChipTouchable}
          onPress={() => handleStatusFilterChange('bloqueadas')}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={statusFilter === 'bloqueadas' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
            style={styles.stitchFilterChipBg}
            resizeMode="stretch"
            imageStyle={{ borderRadius: 2 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MuIcon name="lock" size={11} color={statusFilter === 'bloqueadas' ? '#EFD28D' : '#FFB4AB'} />
              <Text style={[styles.stitchFilterChipText, statusFilter === 'bloqueadas' ? styles.stitchFilterChipTextActive : { color: '#FFB4AB' }]}>
                Bloqueadas
              </Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.stitchFilterChipTouchable}
          onPress={() => handleStatusFilterChange('vip')}
          activeOpacity={0.8}
        >
          <ImageBackground
            source={statusFilter === 'vip' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
            style={styles.stitchFilterChipBg}
            resizeMode="stretch"
            imageStyle={{ borderRadius: 2 }}
          >
            <Text style={[styles.stitchFilterChipText, statusFilter === 'vip' ? styles.stitchFilterChipTextActive : { color: THEME.colors.oroClaro }]}>
              VIP
            </Text>
          </ImageBackground>
        </TouchableOpacity>
      </View>

      {/* Subtítulo de Tabla MEMB_INFO con Esquineros Metálicos NewUI (Stitch 02) */}
      <View style={styles.stitchTableHeaderBanner}>
        <MuCornerOrnaments size={10} />
        <View style={styles.stitchTableHeaderLeft}>
          <MuIcon name="database" size={16} color={THEME.colors.oroClaro} />
          <Text style={styles.stitchTableHeaderTitle}>TABLA DE CUENTAS (MEMB_INFO)</Text>
        </View>
        <View style={styles.stitchTableHeaderCountBadge}>
          <Text style={styles.stitchTableHeaderCountText}>Total: {filtered.length}</Text>
        </View>
      </View>

      {/* Error Banner si no hay conexión real */}
      {errorMessage && (
        <View style={styles.errorCard}>
          <MuIcon name="alert-circle-outline" size={20} color="#FF5252" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.errorTitle}>Sin conexión a SQL Server</Text>
            <Text style={styles.errorSub}>{errorMessage}</Text>
          </View>
          {errorMessage.includes('NO_AUTORIZADO') || errorMessage.includes('Sesión') || errorMessage.includes('sesión') ? (
            <TouchableOpacity
              onPress={() => LicenseService.triggerSessionInvalidated('Tu sesión requiere reautenticación.')}
              style={[styles.retryBtn, { backgroundColor: THEME.colors.primaryOrange }]}
            >
              <Text style={[styles.retryText, { color: THEME.colors.textoOscuro, fontWeight: 'bold' }]}>Iniciar Sesión</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={fetchAccounts} style={styles.retryBtn}>
              <Text style={styles.retryText}>Reintentar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Lista de Cuentas */}
      <FlatList
        data={filtered}
        keyExtractor={(item, index) => `${item.memb___id || 'account'}_${index}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 120 + insets.bottom }]}
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
              <MuIcon name="account-search" size={48} color={THEME.colors.textMuted} />
              <Text style={styles.emptyText}>
                {errorMessage
                  ? 'No se cargaron cuentas debido a un error de conexión.'
                  : search.trim()
                  ? `No se encontraron coincidencias para "${search.trim()}".`
                  : 'No se encontraron cuentas registradas en tu servidor.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => {
          const badge = getPlanBadge(item.AccountLevel);
          const isBlocked = String(item.bloc_code) === '1';
          const isOnline = item.ConnectStat === 1;

          return (
            <View style={[styles.stitchAccountCard, isBlocked && styles.stitchAccountCardBlocked]}>
              <MuCornerOrnaments size={12} />

              {/* Fila Superior de Identidad */}
              <View style={styles.stitchCardHeaderRow}>
                <View style={styles.stitchCardHeaderLeft}>
                  <View style={[styles.stitchAvatarBox, isBlocked && styles.stitchAvatarBoxBlocked]}>
                    <MuIcon
                      name={isBlocked ? "lock" : "account"}
                      size={20}
                      color={isBlocked ? THEME.colors.brasa : THEME.colors.oroClaro}
                    />
                    {isOnline && <View style={styles.stitchOnlineDot} />}
                  </View>
                  <View style={styles.stitchHeaderInfoCol}>
                    <View style={styles.stitchTitleRow}>
                      <Text style={styles.stitchAccountIdText} numberOfLines={1}>
                        {item.memb___id}
                      </Text>
                      {item.AccountLevel > 0 && (
                        <View style={[styles.stitchVipBadge, { backgroundColor: badge.bg, borderColor: badge.border }]}>
                          <Text style={[styles.stitchVipBadgeText, { color: badge.color }]}>{badge.label}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.stitchAccountEmailText} numberOfLines={1}>
                      {item.mail_addr || `${item.memb___id}@muonline.com`}
                    </Text>
                  </View>
                </View>

                {/* Badge de Estado Activa/Baneada/Online */}
                <View
                  style={[
                    styles.stitchStatusBadge,
                    isBlocked
                      ? styles.stitchStatusBlocked
                      : isOnline
                      ? styles.stitchStatusOnline
                      : styles.stitchStatusActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.stitchStatusText,
                      isBlocked
                        ? { color: '#FFB4AB' }
                        : isOnline
                        ? { color: THEME.colors.jade }
                        : { color: THEME.colors.jade },
                    ]}
                  >
                    {isBlocked ? 'Bloqueada' : isOnline ? 'Online' : 'Activa'}
                  </Text>
                </View>
              </View>

              {/* Cuadrícula de Datos de la Cuenta */}
              <View style={styles.stitchDataGrid}>
                <View style={styles.stitchDataItem}>
                  <MuIcon name="character" size={13} color={THEME.colors.oroClaro} />
                  <Text style={styles.stitchDataText}>PJs: {item.CharCount ?? 0} / 5</Text>
                </View>
                <View style={styles.stitchDataItem}>
                  <MuIcon
                    name={isBlocked ? "lock" : "check"}
                    size={13}
                    color={isBlocked ? THEME.colors.brasa : THEME.colors.jade}
                  />
                  <Text
                    style={[
                      styles.stitchDataText,
                      { color: isBlocked ? THEME.colors.brasa : THEME.colors.jade },
                    ]}
                  >
                    Bloqueo: {isBlocked ? 'Sí' : 'No'}
                  </Text>
                </View>
                {!!item.IP && (
                  <View style={styles.stitchDataItem}>
                    <MuIcon name="server" size={13} color={THEME.colors.arcano} />
                    <Text style={[styles.stitchDataText, { color: THEME.colors.arcano }]}>
                      IP: {maskHost(item.IP)}
                    </Text>
                  </View>
                )}
              </View>

              {/* Barra de Acciones Táctiles Stitch Ironforge (Compacta y Jerárquica) */}
              <View style={styles.stitchActionContainer}>
                <View style={styles.stitchActionRow}>
                  {/* 1. Detalle: Botón Primario Forjado */}
                  <MuButton
                    titulo="Detalle"
                    icono="eye"
                    variante="primary"
                    compacto={true}
                    altura={36}
                    onPress={() => openAccountDetails(item)}
                    style={{ flex: 1.2 }}
                    accessibilityLabel="Ver Detalle y Editar Cuenta"
                  />

                  {/* 2. Baúl: Botón Secundario Forjado */}
                  <MuButton
                    titulo="Baúl"
                    icono="treasure-chest"
                    variante="secondary"
                    compacto={true}
                    altura={36}
                    onPress={() => openWarehouseForAccount(item.memb___id)}
                    style={{ flex: 1 }}
                    accessibilityLabel="Ver Baúl y Almacén"
                  />

                  {/* 3. Bloquear/Activar: Toggle Compacto */}
                  <MuButton
                    titulo={isBlocked ? 'Activar' : 'Bloquear'}
                    icono={isBlocked ? 'lock-open' : 'lock'}
                    variante={isBlocked ? 'success' : 'danger'}
                    compacto={true}
                    altura={36}
                    onPress={() => handleToggleBlock(item)}
                    style={{ flex: 1.1 }}
                    accessibilityLabel={isBlocked ? "Desbloquear Cuenta" : "Bloquear Cuenta"}
                  />

                  {/* 4. Eliminar: Acción Peligro Compacta */}
                  <MuButton
                    titulo=""
                    icono="trash"
                    variante="danger"
                    compacto={true}
                    altura={36}
                    onPress={() => promptDeleteAccountDirect(item)}
                    style={{ width: 38 }}
                    accessibilityLabel="Eliminar Cuenta"
                  />
                </View>
              </View>
            </View>
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
          <Panel style={styles.detailModalCard}>
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
                        borderRadius: THEME.shapes.radioEsquina,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3, /* círculo funcional (width/2) */
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
                <MuIcon name="close" size={22} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingBottom: Math.max(120, insets.bottom + 90) }}
            >
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
                    placeholder="Contraseña (máx 10)"
                    placeholderTextColor={THEME.colors.textMuted}
                    maxLength={10}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 6 }}>
                    <MuIcon name={showPassword ? "eye-off" : "eye"} size={20} color={THEME.colors.textoSecundario} />
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
                        style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setEditVipLevel(v.level)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <View style={{ width: 6, height: 6, borderRadius: 3, /* círculo funcional (width/2) */ backgroundColor: v.color, marginBottom: 2 }} />
                          <Text style={[styles.vipPillBtnText, isActive ? { color: '#FEDF99', fontWeight: '900' } : { color: '#CDC6B9' }]}>
                            {v.label}
                          </Text>
                        </ImageBackground>
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
                    <MuIcon name="minus" size={20} color="#E0C380" />
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
                    <MuIcon name="plus" size={20} color="#E0C380" />
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
                  <MuIcon
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
              <BotonOro
                titulo="GUARDAR CAMBIOS EN SQL SERVER"
                icono="content-save-check"
                cargando={savingAccount}
                disabled={savingAccount}
                onPress={handleSaveAccount}
                altura={44}
                style={{ marginTop: 14 }}
              />

              {/* Botón Desconectar Cuenta Trabada (Unstick) */}
              <BotonPiedra
                titulo="DESCONECTAR CUENTA TRABADA (UNSTICK)"
                icono="power-plug-off"
                cargando={disconnectingAccount}
                disabled={disconnectingAccount}
                onPress={handleDisconnectAccount}
                altura={40}
                style={{ marginTop: 10 }}
              />

              {/* Botón Eliminar Cuenta Completa de SQL */}
              <BotonBrasa
                titulo="ELIMINAR CUENTA COMPLETA DE SQL"
                icono="trash-can-outline"
                cargando={deletingAccount}
                disabled={deletingAccount}
                onPress={promptDeleteSelectedAccount}
                altura={40}
                style={{ marginTop: 10 }}
              />

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
                    <MuIcon name="alert-circle-outline" size={20} color="#FF9800" />
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
                          <MuIcon name="chevron-right" size={16} color={THEME.colors.textoSecundario} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              {/* Botones Rápidos: Ver Personajes, Baúl, Bóveda Expandida y Banco Joyas (Grid 2x2) */}
              <View style={styles.detailActionButtonsGrid}>
                {/* Fila 1: Ver Personajes y Baúl */}
                <View style={styles.detailActionButtonsRow}>
                  <View style={{ flex: 1 }}>
                    <MuButton
                      titulo="VER PERSONAJES"
                      icono="sword-cross"
                      variante="secondary"
                      altura={42}
                      onPress={() => {
                        setAccountDetailVisible(false);
                        if (selectedAccount?.memb___id) {
                          navigation.navigate('PJs', { filterAccount: selectedAccount.memb___id });
                        }
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <MuButton
                      titulo="BAÚL (/WARE)"
                      icono="package-variant-closed"
                      variante="primary"
                      altura={42}
                      onPress={() => {
                        if (selectedAccount?.memb___id) {
                          openWarehouseForAccount(selectedAccount.memb___id, 'warehouse');
                        }
                      }}
                    />
                  </View>
                </View>

                {/* Fila 2: Bóveda Expandida y Banco Joyas */}
                <View style={styles.detailActionButtonsRow}>
                  <View style={{ flex: 1 }}>
                    <MuButton
                      titulo="BÓVEDA EXTRA"
                      icono="safe"
                      variante="secondary"
                      altura={42}
                      onPress={() => {
                        if (selectedAccount?.memb___id) {
                          openWarehouseForAccount(selectedAccount.memb___id, 'vault_ext');
                        }
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <MuButton
                      titulo="BANCO JOYAS"
                      icono="diamond-stone"
                      variante="primary"
                      altura={42}
                      onPress={() => {
                        if (selectedAccount?.memb___id) {
                          openJewelBankForAccount(selectedAccount.memb___id);
                        }
                      }}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
          </Panel>
        </View>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL BANCO DE JOYAS (CUSTOMJEWELBANK LOUIS S6 UP40)     */}
      {/* ======================================================== */}
      <Modal
        visible={jewelBankModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setJewelBankModalVisible(false)}
      >
        <View style={styles.jbModalOverlay}>
          <Panel tipo="gold" conEsquineros={true} style={styles.jbModalContent}>
            {/* Header */}
            <View style={styles.jbModalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MuIcon name="diamond-stone" size={24} color={THEME.colors.oroClaro} />
                <View>
                  <Text style={styles.jbModalTitle}>BANCO DE JOYAS</Text>
                  <Text style={styles.jbModalSubtitle}>Cuenta: <Text style={{ color: THEME.colors.oroClaro, fontWeight: 'bold' }}>{jewelBankAcc}</Text> ({jewelBankTableName})</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setJewelBankModalVisible(false)}
                style={styles.jbCloseBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <MuIcon name="close" size={20} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            {jewelBankLoading ? (
              <View style={{ padding: 40, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color={THEME.colors.oroClaro} />
                <Text style={{ color: THEME.colors.textoSecundario, marginTop: 12 }}>Consultando saldo en SQL Server...</Text>
              </View>
            ) : !jewelBankHasTable ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <MuIcon name="alert-circle-outline" size={48} color={THEME.colors.brasa} />
                <Text style={{ color: THEME.colors.texto, fontSize: 16, fontWeight: 'bold', marginTop: 12, textAlign: 'center' }}>
                  Tabla de Joyas no detectada
                </Text>
                <Text style={{ color: THEME.colors.textoSecundario, fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 18 }}>
                  Esta base de datos no cuenta con tabla de Banco de Joyas (CustomJewelBank o JewelBank). Requiere emulador Louis Season 6 Update 40 o MSPro compatible.
                </Text>
                <View style={{ width: 180, marginTop: 20 }}>
                  <MuButton
                    titulo="Entendido"
                    variante="primary"
                    altura={42}
                    onPress={() => setJewelBankModalVisible(false)}
                  />
                </View>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={true}>
                {/* Presets rápidos */}
                <View style={styles.jbQuickRow}>
                  <Text style={styles.jbQuickLabel}>Llenado Rápido:</Text>
                  {[
                    { label: 'Vaciar (0)', val: 0, color: THEME.colors.textoSecundario },
                    { label: '100 c/u', val: 100, color: THEME.colors.textoSecundario },
                    { label: '250 (Max)', val: 250, color: THEME.colors.oroClaro },
                    { label: '1000', val: 1000, color: THEME.colors.jade },
                  ].map((p) => (
                    <TouchableOpacity
                      key={p.label}
                      style={{ borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => handleQuickFillAll(p.val)}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={{ paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={[styles.jbQuickPillText, { color: p.color }]}>{p.label}</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Lista de Joyas */}
                <View style={styles.jbListContainer}>
                  {JEWEL_CONFIG.map((jewel) => {
                    const currentVal = jewelBankData[jewel.key] || 0;
                    return (
                      <View key={jewel.key} style={styles.jbItemRow}>
                        <View style={styles.jbItemLeft}>
                          <View style={[styles.jbIconWrap, { backgroundColor: jewel.bg }]}>
                            {JEWEL_ASSET_IMAGES[jewel.key] ? (
                              <Image
                                source={JEWEL_ASSET_IMAGES[jewel.key]}
                                style={{ width: 22, height: 22 }}
                                resizeMode="contain"
                              />
                            ) : (
                              <MuIcon name={jewel.icon as any} size={18} color={jewel.color} />
                            )}
                          </View>
                          <Text style={styles.jbItemName} numberOfLines={1}>{jewel.label}</Text>
                        </View>

                        <View style={styles.jbStepperRow}>
                          <TouchableOpacity
                            style={{ borderRadius: 2, overflow: 'hidden', width: 34, height: 36 }}
                            onPress={() => handleJewelChange(jewel.key, -10)}
                            activeOpacity={0.7}
                          >
                            <ImageBackground
                              source={STITCH_ASSETS.buttons.small}
                              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                              resizeMode="stretch"
                            >
                              <Text style={styles.jbStepBtnText}>-10</Text>
                            </ImageBackground>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ borderRadius: 2, overflow: 'hidden', width: 34, height: 36 }}
                            onPress={() => handleJewelChange(jewel.key, -1)}
                            activeOpacity={0.7}
                          >
                            <ImageBackground
                              source={STITCH_ASSETS.buttons.small}
                              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                              resizeMode="stretch"
                            >
                              <Text style={styles.jbStepBtnText}>-1</Text>
                            </ImageBackground>
                          </TouchableOpacity>

                          <TextInput
                            style={styles.jbInput}
                            value={String(currentVal)}
                            onChangeText={(txt) => handleJewelSetDirect(jewel.key, txt)}
                            keyboardType="numeric"
                            selectTextOnFocus
                          />

                          <TouchableOpacity
                            style={{ borderRadius: 2, overflow: 'hidden', width: 34, height: 36 }}
                            onPress={() => handleJewelChange(jewel.key, 1)}
                            activeOpacity={0.7}
                          >
                            <ImageBackground
                              source={STITCH_ASSETS.buttons.small}
                              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                              resizeMode="stretch"
                            >
                              <Text style={styles.jbStepBtnText}>+1</Text>
                            </ImageBackground>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ borderRadius: 2, overflow: 'hidden', width: 34, height: 36 }}
                            onPress={() => handleJewelChange(jewel.key, 10)}
                            activeOpacity={0.7}
                          >
                            <ImageBackground
                              source={STITCH_ASSETS.buttons.small}
                              style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                              resizeMode="stretch"
                            >
                              <Text style={styles.jbStepBtnText}>+10</Text>
                            </ImageBackground>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {/* Footer con Botón Guardar */}
            {jewelBankHasTable && !jewelBankLoading && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Cancelar"
                    variante="secondary"
                    altura={42}
                    onPress={() => setJewelBankModalVisible(false)}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Guardar en SQL"
                    icono="content-save"
                    variante="primary"
                    altura={42}
                    cargando={jewelBankSaving}
                    onPress={handleSaveJewelBank}
                  />
                </View>
              </View>
            )}
          </Panel>
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
          {/* Header Superior Stitch 17R */}
          <View style={styles.whHeader}>
            <TouchableOpacity
              onPress={handleCloseWarehouseModal}
              style={styles.whBackBtn}
              activeOpacity={0.7}
              accessibilityLabel="Volver a Cuentas"
            >
              <MuIcon name="arrow-left" size={18} color={THEME.colors.oroClaro} />
              <Text style={styles.whBackBtnText}>Volver</Text>
            </TouchableOpacity>

            <View style={styles.whHeaderTitleCol}>
              <View style={styles.whHeaderTitleRow}>
                <Text style={styles.whHeaderTitle}>MU MANAGER PRO</Text>
                <View style={styles.whS6Badge}>
                  <Text style={styles.whS6BadgeText}>S6</Text>
                </View>
              </View>
              <Text style={styles.whHeaderSubtitle}>
                {warehouseViewTab === 'items'
                  ? 'ITEM MAKER DEL BAÚL'
                  : 'BAÚL Y BANCO DE JOYAS'}
              </Text>
            </View>

            <View style={styles.whHeaderActions}>
              <View style={styles.whSyncBadge}>
                <View style={styles.whSyncDot} />
                <Text style={styles.whSyncText}>SYNC</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (warehouseViewTab === 'jewels') {
                    loadJewelBankData(warehouseAccount);
                  } else {
                    loadVaultData(warehouseAccount, activeVaultIndex);
                  }
                }}
                style={styles.whRefreshBtn}
                activeOpacity={0.7}
                disabled={loadingWarehouse || jewelBankLoading}
                accessibilityLabel="Refrescar Baúl"
              >
                <MuIcon name="sync" size={18} color={THEME.colors.oroClaro} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Banner de Aviso de Soft-Lock Colaborativo Multi-Admin */}
          {warehouseLockWarning ? (
            <View style={styles.whLockWarningBanner}>
              <MuIcon name="shield-alert" size={18} color="#FFD54F" />
              <Text style={styles.whLockWarningText}>{warehouseLockWarning}</Text>
              <TouchableOpacity onPress={() => setWarehouseLockWarning(null)}>
                <MuIcon name="close" size={16} color="#FFE082" />
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Barra de Resumen de Cuenta Maestra y Zen en Bóveda (Stitch 17R) */}
          <View style={styles.whSummaryCard}>
            <View style={styles.whSummaryColLeft}>
              <Text style={styles.whSummaryLabel}>CUENTA MAESTRA</Text>
              <Text style={styles.whSummaryAccount} numberOfLines={1}>{warehouseAccount}</Text>
            </View>
            <View style={styles.whSummaryColRight}>
              <Text style={styles.whSummaryLabel}>ZEN EN BÓVEDA</Text>
              <Text style={styles.whSummaryZen} numberOfLines={1}>
                {vaultMoney !== undefined && vaultMoney !== null ? Number(vaultMoney).toLocaleString() : '0'}
              </Text>
            </View>
          </View>

          {/* Subpestañas NewUI Season 6: [BAUL BASE] | [EXPANDIDO] | [BANCO JOYAS] */}
          <View style={styles.whTopTabsContainer}>
            <TouchableOpacity
              style={[
                styles.whTopTabBtn,
                warehouseViewTab === 'warehouse' && styles.whTopTabBtnActive,
              ]}
              onPress={() => handleSelectWarehouseTab('warehouse')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.whTopTabText,
                  warehouseViewTab === 'warehouse' && styles.whTopTabTextActive,
                ]}
              >
                BAÚL BASE
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.whTopTabBtn,
                warehouseViewTab === 'vault_ext' && styles.whTopTabBtnActive,
              ]}
              onPress={() => handleSelectWarehouseTab('vault_ext')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.whTopTabText,
                  warehouseViewTab === 'vault_ext' && styles.whTopTabTextActive,
                ]}
              >
                EXPANDIDO
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.whTopTabBtn,
                warehouseViewTab === 'jewels' && styles.whTopTabBtnActive,
              ]}
              onPress={() => handleSelectWarehouseTab('jewels')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.whTopTabText,
                  warehouseViewTab === 'jewels' && styles.whTopTabTextActive,
                ]}
              >
                BANCO JOYAS
              </Text>
            </TouchableOpacity>

            {warehouseViewTab === 'items' && (
              <TouchableOpacity
                style={[styles.whTopTabBtn, styles.whTopTabBtnActive]}
                onPress={() => handleSelectWarehouseTab('items')}
                activeOpacity={0.7}
              >
                <Text style={[styles.whTopTabText, styles.whTopTabTextActive]}>
                  ITEM MAKER
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* VISTA 1: TAB ITEMS - EDITOR COMPLETO (ITEM MAKER PARA WAREHOUSE) */}
          {warehouseViewTab === 'items' && (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ padding: 14, paddingBottom: 60 }}
              showsVerticalScrollIndicator={true}
              nestedScrollEnabled={true}
            >
              {/* Barra Superior con Botón Volver, Quick Sets y Colocar */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <TouchableOpacity
                  style={{ borderRadius: 2, overflow: 'hidden', minHeight: 44 }}
                  onPress={() => handleSelectWarehouseTab(vaultSubTab === 'ext' ? 'vault_ext' : 'warehouse')}
                  activeOpacity={0.7}
                  accessibilityLabel="Volver al Baúl"
                >
                  <ImageBackground
                    source={STITCH_ASSETS.buttons.small}
                    style={{
                      paddingHorizontal: 14,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      height: 44,
                    }}
                    resizeMode="stretch"
                  >
                    <MuIcon name="arrow-left" size={16} color="#FEDF99" />
                    <Text style={{ color: '#FEDF99', fontSize: 11, fontWeight: '900', fontFamily: THEME.typography.fontTitle }}>
                      VOLVER
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>

                <MuButton
                  titulo="INYECTAR SET"
                  icono="flash"
                  onPress={() => setShowQuickSetsVaultModal(true)}
                  variante="secondary"
                  altura={44}
                  compacto
                  style={{ flex: 1 }}
                />

                <MuButton
                  titulo={vaultSubTab === 'ext' ? 'COLOCAR EN BÓVEDA' : 'COLOCAR EN BAÚL'}
                  icono="plus-box"
                  onPress={handlePlaceMakerItemInVault}
                  variante="success"
                  altura={44}
                  compacto
                  style={{ flex: 1.2 }}
                />
              </View>

              {/* Tarjeta Informativa / Destino */}
              <View style={styles.whBannerCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MuIcon name="tools" size={16} color="#E0C380" />
                    <Text style={styles.whBannerTitle}>Item Maker del Baúl</Text>
                  </View>
                  <View style={{ backgroundColor: 'rgba(63, 207, 142, 0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, borderWidth: 1, borderColor: '#3FCF8E' }}>
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
                  backgroundColor: '#1F201F',
                  borderRadius: 2,
                  borderWidth: 1.5,
                  borderColor: vaultMakerExcFlags > 0 ? '#3FCF8E' : (vaultMakerAncient > 0 ? '#5B8DEF' : '#E0C380'),
                  padding: 12,
                  marginBottom: 14,
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{
                      width: 60,
                      height: 60,
                      borderRadius: 2,
                      backgroundColor: '#0D0E0D',
                      borderWidth: 1,
                      borderColor: '#4C463A',
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
                          <View style={{ backgroundColor: 'rgba(63, 207, 142, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: THEME.colors.jade }}>
                            <Text style={{ color: THEME.colors.jade, fontSize: 10, fontWeight: '700' }}>Luck</Text>
                          </View>
                        )}
                        {vaultMakerSkill && (
                          <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: '#FF9800' }}>
                            <Text style={{ color: '#FF9800', fontSize: 10, fontWeight: '700' }}>Skill</Text>
                          </View>
                        )}
                        {vaultMaker380 && (
                          <View style={{ backgroundColor: 'rgba(255, 64, 129, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: '#FF4081' }}>
                            <Text style={{ color: '#FF4081', fontSize: 10, fontWeight: '700' }}>380</Text>
                          </View>
                        )}
                        {vaultMakerAncient > 0 && (
                          <View style={{ backgroundColor: 'rgba(91, 141, 239, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: '#5B8DEF' }}>
                            <Text style={{ color: '#5B8DEF', fontSize: 10, fontWeight: '700' }}>Ancient</Text>
                          </View>
                        )}
                        {vaultMakerHarmonyType > 0 && (
                          <View style={{ backgroundColor: 'rgba(224, 195, 128, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: '#E0C380' }}>
                            <Text style={{ color: '#E0C380', fontSize: 10, fontWeight: '700' }}>Harmony</Text>
                          </View>
                        )}
                        {vaultMakerEnableSockets && (
                          <View style={{ backgroundColor: 'rgba(224, 195, 128, 0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2, borderWidth: 1, borderColor: '#E0C380' }}>
                            <Text style={{ color: '#E0C380', fontSize: 10, fontWeight: '700' }}>Sockets</Text>
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
                          style={{ flex: 1, minWidth: 70, borderRadius: 2, overflow: 'hidden' }}
                          onPress={() => setVaultMakerExcFlags(fen.flags)}
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={isSel ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                            style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={{ fontSize: 11, fontWeight: isSel ? '900' : '700', color: isSel ? '#FEDF99' : '#CDC6B9' }}>
                              {fen.label}
                            </Text>
                          </ImageBackground>
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
                        style={{ borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setVaultMakerAncient(0)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={vaultMakerAncient === 0 ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{ paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={[styles.whAncientPillText, vaultMakerAncient === 0 ? { color: '#FEDF99', fontWeight: '900' } : { color: '#CDC6B9' }]}>
                            Normal (Sin Ancient)
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>

                      {/* Piece-specific Ancient Sets */}
                      {getAvailableAncientOptionsForItem(selectedVaultMakerDef.group, selectedVaultMakerDef.index).map((anc) => {
                        const currentDecoded = decodeAncientByte(vaultMakerAncient);
                        const isSel = currentDecoded.tier === anc.tier && vaultMakerAncient > 0;
                        return (
                          <TouchableOpacity
                            key={`wh_anc_${anc.tier}_${anc.setId}`}
                            style={{ borderRadius: 2, overflow: 'hidden' }}
                            onPress={() => {
                              const curStam = currentDecoded.staminaBonus === 10 ? 10 : 5;
                              setVaultMakerAncient(encodeAncientByte(anc.tier, curStam));
                            }}
                            activeOpacity={0.7}
                          >
                            <ImageBackground
                              source={isSel ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                              style={{ paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                              resizeMode="stretch"
                            >
                              <Text style={[styles.whAncientPillText, isSel ? { color: '#FEDF99', fontWeight: '900' } : { color: '#CDC6B9' }]}>
                                {anc.name} (Tier {anc.tier})
                              </Text>
                            </ImageBackground>
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
                              style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                              onPress={() => {
                                setVaultMakerAncient(encodeAncientByte(currentDecoded.tier || 1, bonus));
                              }}
                              activeOpacity={0.7}
                            >
                              <ImageBackground
                                source={isSelBonus ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                                style={{ paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
                                resizeMode="stretch"
                              >
                                <Text style={{ fontSize: 11, color: isSelBonus ? '#FEDF99' : '#CDC6B9', fontWeight: isSelBonus ? '900' : '700' }}>
                                  +{bonus} Stamina ({bonus === 5 ? 'Standard' : 'Max'})
                                </Text>
                              </ImageBackground>
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
                          <MuIcon
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
                          style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                          onPress={() => setVaultMakerHarmonyLevel(prev => Math.max(0, prev - 1))}
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={STITCH_ASSETS.buttons.small}
                            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={styles.whStepBtnTextSmall}>-</Text>
                          </ImageBackground>
                        </TouchableOpacity>
                        <Text style={styles.whStepperVal}>+{vaultMakerHarmonyLevel}</Text>
                        <TouchableOpacity
                          style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                          onPress={() => setVaultMakerHarmonyLevel(prev => Math.min(13, prev + 1))}
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={STITCH_ASSETS.buttons.small}
                            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={styles.whStepBtnTextSmall}>+</Text>
                          </ImageBackground>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ width: 44, height: 34, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                          onPress={() => setVaultMakerHarmonyLevel(13)}
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={STITCH_ASSETS.tabs.tabModeActive}
                            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                          </ImageBackground>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* SOCKETS (1 AL 5) */}
              <View style={styles.whControlCardBox}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.whSectionHeader, { color: '#EFD28D' }]}>RANURAS DE SOCKETS (1 AL 5)</Text>
                  <Switch
                    value={vaultMakerEnableSockets}
                    onValueChange={(val: boolean) => {
                      setVaultMakerEnableSockets(val);
                      setVaultMakerSockets(val ? [0xFE, 0xFE, 0xFE, 0xFE, 0xFE] : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF]);
                    }}
                    trackColor={{ false: '#292A29', true: '#4C463A' }}
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
                        <View key={`wh_sock_${sIdx}`} style={{ gap: 6, backgroundColor: '#121312', padding: 8, borderRadius: 2, borderWidth: 1, borderColor: '#4C463A' }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: '#E0C380', fontSize: 11, fontWeight: '700' }}>Slot #{sIdx + 1}:</Text>
                            <Text style={{ color: '#EFD28D', fontSize: 11, fontWeight: '700' }}>
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
                                  style={{ borderRadius: 2, overflow: 'hidden' }}
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
                                  <ImageBackground
                                    source={isLvlActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                                    style={{ paddingHorizontal: 8, paddingVertical: 3, alignItems: 'center', justifyContent: 'center' }}
                                    resizeMode="stretch"
                                  >
                                    <Text style={{
                                      fontSize: 10,
                                      fontWeight: 'bold',
                                      color: isLvlActive ? '#FEDF99' : '#C5B5A5',
                                    }}>
                                      {sl.badge}
                                    </Text>
                                  </ImageBackground>
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
                      style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setVaultMakerQuantity(prev => Math.max(1, prev - 1))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.whStepBtnTextSmall}>-</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <Text style={[styles.whStepperVal, { color: THEME.colors.oroClaro }]}>x{vaultMakerQuantity}</Text>
                    <TouchableOpacity
                      style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setVaultMakerQuantity(prev => Math.min(20, prev + 1))}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.whStepBtnTextSmall}>+</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                  {[1, 5, 10, 20].map((q) => {
                    const isSel = vaultMakerQuantity === q;
                    return (
                      <TouchableOpacity
                        key={`vault_qty_chip_${q}`}
                        style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setVaultMakerQuantity(q)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={isSel ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{ paddingVertical: 6, alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={{ color: isSel ? '#FEDF99' : '#CDC6B9', fontSize: 11, fontWeight: isSel ? '900' : '700' }}>
                            x{q}
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* BOTÓN COLOCAR ÍTEM CONFIGURADO EN BAÚL */}
              <MuButton
                titulo={
                  vaultSubTab === 'ext'
                    ? (vaultMakerQuantity > 1 ? `COLOCAR ${vaultMakerQuantity}x EN BÓVEDA EXPANDIDA` : 'COLOCAR ÍTEM EN BÓVEDA EXPANDIDA')
                    : (vaultMakerQuantity > 1 ? `COLOCAR ${vaultMakerQuantity}x EN BAÚL` : 'COLOCAR ÍTEM EN BAÚL')
                }
                icono="arrow-down-bold-box"
                onPress={handlePlaceMakerItemInVault}
                variante="success"
                altura={48}
                style={{ marginTop: 6, marginBottom: 16 }}
              />

              {/* SECCIÓN CATÁLOGO DE ÍTEMS */}
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <MuIcon name="book-open-page-variant" size={18} color="#FF9800" />
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
                          <MuIcon
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
                          <MuIcon name="alert" size={28} color="#FFC107" />
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
                              backgroundColor: isSelected ? THEME.colors.oroClaro : THEME.colors.raisedIron,
                              borderRadius: THEME.shapes.radioEsquina,
                              paddingHorizontal: 10,
                              paddingVertical: 6,
                            }}
                          >
                            <Text style={{ color: isSelected ? THEME.colors.textoOscuro : THEME.colors.texto, fontSize: 11, fontWeight: '700' }}>
                              {isSelected ? '[OK] Seleccionado' : 'Seleccionar'}
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

          {/* VISTA 2: TAB WAREHOUSE (Stitch 17R) */}
          {warehouseViewTab === 'warehouse' && (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Selector de Bóvedas Stitch 17R */}
                <View style={styles.muVaultHeaderBar}>
                  <Text style={styles.muVaultHeaderTitle}>
                    BÓVEDA ACTIVA: <Text style={{ color: THEME.colors.textoSecundario }}>#{activeVaultIndex === 0 ? '1 BASE' : `${activeVaultIndex + 1} EXTRA`}</Text>
                  </Text>
                  <Text style={styles.muVaultHeaderSlots}>
                    SLOTS: {warehouseItems.filter(i => i.slot < 120).length} / 120
                  </Text>
                </View>

                {/* Fila de 5 Bóvedas Rápidas + Botón Expandir [+] */}
                <View style={styles.muVaultQuickRow}>
                  {[0, 1, 2, 3, 4].map((idx) => {
                    const isActive = activeVaultIndex === idx;
                    const isAvailable = idx < warehouseCount;
                    const label = idx === 0 ? '#1 BASE' : `#${idx + 1} EXTRA`;
                    return (
                      <TouchableOpacity
                        key={`vault_btn_${idx}`}
                        style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => {
                          if (isAvailable) {
                            handleSwitchVault(idx);
                          } else {
                            setShowUnlockModal(true);
                          }
                        }}
                        activeOpacity={0.7}
                        disabled={loadingWarehouse}
                      >
                        <ImageBackground
                          source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{
                            paddingVertical: 8,
                            paddingHorizontal: 4,
                            alignItems: 'center',
                            justifyContent: 'center',
                            opacity: isAvailable ? 1 : 0.5,
                          }}
                          resizeMode="stretch"
                        >
                          <Text
                            style={[
                              styles.muVaultQuickText,
                              isActive && styles.muVaultQuickTextActive,
                            ]}
                          >
                            {label}
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    style={{ width: 36, height: 32, borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => setShowUnlockModal(true)}
                    activeOpacity={0.7}
                    accessibilityLabel="Desbloquear más baúles"
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.muVaultPlusQuickText}>+</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>

                {/* Banner de Acceso al Módulo Dedicado de Bóveda de Expansión */}
                <TouchableOpacity
                  style={{
                    marginBottom: 12,
                    padding: 10,
                    borderRadius: 2,
                    backgroundColor: '#161716',
                    borderWidth: 1,
                    borderTopColor: '#3A3C38',
                    borderLeftColor: '#3A3C38',
                    borderRightColor: '#101110',
                    borderBottomColor: '#101110',
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
                    <MuIcon name="safe" size={22} color={THEME.colors.arcano} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: THEME.colors.arcano, fontWeight: 'bold', fontSize: 12 }}>
                        Bóveda Expandida del Baúl
                      </Text>
                      <Text style={{ color: THEME.colors.textoSecundario, fontSize: 10, marginTop: 2 }}>
                        Almacenado 1 (botón [+] en juego). Toca aquí para ver su contenido y editar en ella.
                      </Text>
                    </View>
                  </View>
                  <MuIcon name="chevron-right" size={20} color={THEME.colors.oroClaro} />
                </TouchableOpacity>

                {/* Rejilla 8x15 dentro de un Panel con Esquineros Góticos */}
                <Panel tipo="gold" conEsquineros={true} style={styles.vaultPanelContainer}>
                  <View style={styles.muVaultGothicBar}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MuIcon name="shield-outline" size={16} color={THEME.colors.oroClaro} />
                      <Text style={styles.muVaultGothicTitle}>SLOTS DE BAÚL (8x15)</Text>
                    </View>
                    <Text style={styles.muVaultGothicBadge}>MU CANON S6</Text>
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
                            <Text style={styles.movingBannerCancelText}>Cancelar</Text>
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

                {/* Footer Clásico de Baúl MU Online Season 6: ZEN en Jade, Almacenado en Brasa y Botonera Táctica */}
                <View style={styles.muVaultFooterContainer}>
                  <View style={styles.muVaultMoneyRow}>
                    <Text style={styles.muVaultZenLabel}>ZEN</Text>
                    <View style={styles.muVaultMoneyBox}>
                      <Text style={styles.muVaultMoneyText}>0</Text>
                    </View>
                  </View>

                  <View style={styles.muVaultMoneyRow}>
                    <Text style={styles.muVaultStoredLabel}>ALMACENADO</Text>
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

                  {/* Fila de Botones Táctiles de 48dp */}
                  <View style={styles.muVaultBtnRow}>
                    <TouchableOpacity
                      style={{ width: 48, height: 44, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setVaultMoney(Math.min(2000000000, (vaultMoney || 0) + 10000000))}
                      activeOpacity={0.7}
                      accessibilityLabel="Sumar 10 Millones Zen"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <MuIcon name="sack" size={20} color={THEME.colors.oroClaro} />
                      </ImageBackground>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ width: 48, height: 44, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setVaultMoney(Math.max(0, (vaultMoney || 0) - 10000000))}
                      activeOpacity={0.7}
                      accessibilityLabel="Restar 10 Millones Zen"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <MuIcon name="arrow-down-circle" size={20} color={THEME.colors.brasa} />
                      </ImageBackground>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ width: 48, height: 44, borderRadius: 2, overflow: 'hidden' }}
                      onPress={handleSetMaxZen}
                      activeOpacity={0.7}
                      accessibilityLabel="Zen Máximo"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.muVaultMaxText}>MAX</Text>
                      </ImageBackground>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{ width: 48, height: 44, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setShowUnlockModal(true)}
                      activeOpacity={0.7}
                      accessibilityLabel="Desbloquear Baúles"
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.muVaultPlusText}>+</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Botones Rápidos Stitch 17R: ITEM MAKER / SETS RÁPIDOS */}
                <View style={{ flexDirection: 'row', gap: 10, marginVertical: 10 }}>
                  <View style={{ flex: 1 }}>
                    <MuButton
                      titulo="ITEM MAKER"
                      icono="tools"
                      variante="primary"
                      altura={42}
                      onPress={() => {
                        setWarehouseViewTab('items');
                        setVaultSubTab('main');
                      }}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <MuButton
                      titulo="SETS RÁPIDOS"
                      icono="flash"
                      variante="primary"
                      altura={42}
                      onPress={() => setShowQuickSetsVaultModal(true)}
                    />
                  </View>
                </View>

                {/* Botones de Confirmación y Liberación de Candado */}
                <View style={{ gap: 10, marginTop: 8 }}>
                  <BotonOro
                    titulo="GUARDAR CAMBIOS DE BAÚL"
                    icono="content-save"
                    onPress={handleSaveWarehouse}
                    disabled={savingWarehouse || loadingWarehouse}
                    cargando={savingWarehouse}
                    altura={48}
                  />

                  <MuButton
                    variante="secondary"
                    titulo="LIBERAR CANDADO DE BAÚL TRANCADO"
                    icono="lock-open-outline"
                    onPress={handleReleaseWarehouseLock}
                    altura={46}
                  />
                </View>
              </ScrollView>
            </View>
          )}

          {/* VISTA 3: TAB BÓVEDA DE EXPANSIÓN SEASON 6 (Stitch 17R) */}
          {warehouseViewTab === 'vault_ext' && (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Tarjeta de Estado y Activación en Juego */}
                <View style={styles.vaultExtHeroCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <MuIcon name="safe" size={20} color={THEME.colors.arcano} />
                      <Text style={{ color: THEME.colors.arcano, fontWeight: '800', fontSize: 13 }}>
                        BÓVEDA EXPANDIDA DEL BAÚL (ALMACENADO 1)
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: THEME.shapes.radioEsquina,
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

                  <MuButton
                    titulo={vaultExtLevel >= 1 ? 'Re-Sincronizar Bóveda en Juego' : 'Activar Bóveda Expandida en Juego'}
                    icono="lightning-bolt"
                    variante={vaultExtLevel >= 1 ? 'secondary' : 'primary'}
                    altura={48}
                    cargando={unlockingVaults}
                    disabled={unlockingVaults}
                    onPress={handleActivateVaultExpansion}
                  />
                </View>

                {/* Zen de la Bóveda Expandida con Botón MAX */}
                <View style={styles.whControlCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                    <MuIcon name="circle-multiple" size={16} color="#E0C380" />
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
                    style={{ width: 52, height: 36, borderRadius: 2, overflow: 'hidden' }}
                    onPress={handleSetMaxZen}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.whMaxBtnText}>MAX</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>

                {/* Fila de Acciones Rápidas (Inyectar Set, Colocar Ítem, Ir a Item Maker) */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <MuButton
                    variante="secondary"
                    titulo="INYECTAR SET"
                    icono="flash"
                    compacto
                    altura={42}
                    style={{ flex: 1 }}
                    onPress={() => setShowQuickSetsVaultModal(true)}
                  />

                  <MuButton
                    variante="success"
                    titulo="COLOCAR ÍTEM"
                    icono="plus-box"
                    compacto
                    altura={42}
                    style={{ flex: 1.1 }}
                    onPress={handlePlaceMakerItemInVault}
                  />

                  <MuButton
                    variante="primary"
                    titulo="ITEM MAKER"
                    icono="tools"
                    compacto
                    altura={42}
                    style={{ flex: 1 }}
                    onPress={() => {
                      setWarehouseViewTab('items');
                      setVaultSubTab('ext');
                    }}
                  />
                </View>

                {/* Grid 8x15 (120 Slots de la Bóveda Expandida) */}
                <Panel tipo="gold" conEsquineros={true} style={styles.vaultPanelContainer}>
                  <View style={styles.muVaultGothicBar}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MuIcon name="shield-outline" size={16} color={THEME.colors.arcano} />
                      <Text style={[styles.muVaultGothicTitle, { color: THEME.colors.arcano }]}>SLOTS DE BÓVEDA EXPANDIDA (8x15)</Text>
                    </View>
                    <Text style={[styles.muVaultGothicBadge, { color: THEME.colors.jade }]}>ALMACENADO 1</Text>
                  </View>

                  {loadingWarehouse ? (
                    <View style={{ padding: 40, alignItems: 'center' }}>
                      <ActivityIndicator size="large" color={THEME.colors.arcano} />
                      <Text style={{ color: THEME.colors.textoSecundario, marginTop: 12 }}>Cargando Bóveda Expandida...</Text>
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', width: '100%' }}>
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
                            <Text style={styles.movingBannerCancelText}>Cancelar</Text>
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
                </Panel>

                {/* Botón Guardar Bóveda Expandida */}
                <View style={{ marginTop: 12 }}>
                  <BotonOro
                    titulo={`GUARDAR BÓVEDA EXPANDIDA #${activeVaultIndex}`}
                    icono="content-save"
                    onPress={handleSaveWarehouse}
                    disabled={savingWarehouse || loadingWarehouse}
                    cargando={savingWarehouse}
                    altura={48}
                  />
                </View>
              </ScrollView>
            </View>
          )}

          {/* VISTA 4: TAB BANCO DE JOYAS (Stitch 17R) */}
          {warehouseViewTab === 'jewels' && (
            <View style={{ flex: 1 }}>
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 14, paddingBottom: 24 }}
                showsVerticalScrollIndicator={true}
              >
                {/* Header Gótico de Banco de Joyas */}
                <Panel tipo="gold" conEsquineros={true} style={{ padding: 14, marginBottom: 12 }}>
                  <View style={styles.muVaultGothicBar}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <MuIcon name="diamond-stone" size={18} color={THEME.colors.oroClaro} />
                      <Text style={styles.muVaultGothicTitle}>BANCO DE JOYAS CANÓNICO</Text>
                    </View>
                    <Text style={styles.muVaultGothicBadge}>SEASON 6</Text>
                  </View>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, marginTop: 4 }}>
                    Cuenta: <Text style={{ color: THEME.colors.oroClaro, fontWeight: 'bold' }}>{warehouseAccount || jewelBankAcc}</Text> ({jewelBankTableName})
                  </Text>

                  {/* Acciones Rápidas */}
                  <View style={styles.jbQuickRow}>
                    <Text style={styles.jbQuickLabel}>Llenado Rápido:</Text>
                    {[
                      { label: '+10 a Todas', amt: 10, isMax: false },
                      { label: '+30 a Todas', amt: 30, isMax: false },
                      { label: 'Llenar a 250 (Max)', amt: 250, isMax: true },
                    ].map((btn, idx) => (
                      <TouchableOpacity
                        key={`jb_quick_${idx}`}
                        style={{ height: 32, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => handleQuickFillAll(btn.amt)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={btn.isMax ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{ height: '100%', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={[styles.jbQuickPillText, btn.isMax && { color: THEME.colors.oroClaro, fontWeight: '900' }]}>
                            {btn.label}
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    ))}
                  </View>
                </Panel>

                {jewelBankLoading ? (
                  <View style={{ padding: 40, alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={THEME.colors.oroClaro} />
                    <Text style={{ color: THEME.colors.textoSecundario, marginTop: 12 }}>
                      Cargando Banco de Joyas...
                    </Text>
                  </View>
                ) : !jewelBankHasTable ? (
                  <View style={{ padding: 24, alignItems: 'center', backgroundColor: THEME.colors.casillaFondo, borderRadius: THEME.shapes.radioEsquina, borderWidth: 1, borderColor: THEME.colors.brasa }}>
                    <MuIcon name="alert-circle-outline" size={36} color={THEME.colors.brasa} />
                    <Text style={{ color: THEME.colors.brasa, fontSize: 14, fontWeight: 'bold', marginTop: 8 }}>
                      Tabla de Joyas no detectada
                    </Text>
                    <Text style={{ color: THEME.colors.textoSecundario, fontSize: 12, textAlign: 'center', marginTop: 6, lineHeight: 18 }}>
                      Esta base de datos no cuenta con tabla de Banco de Joyas (CustomJewelBank o JewelBank). Requiere emulador Louis Season 6 Update 40 o MSPro compatible.
                    </Text>
                  </View>
                ) : (
                  <Panel tipo="gold" conEsquineros={true} style={{ padding: 12, marginBottom: 16 }}>
                    <View style={styles.jbListContainer}>
                      {JEWEL_CONFIG.map((jewel) => {
                        const currentVal = jewelBankData[jewel.key] || 0;
                        return (
                          <View key={`wh_jb_${jewel.key}`} style={styles.whJewelItemRow}>
                            <View style={styles.whJewelItemLeft}>
                              <View style={[styles.whJewelIconWrap, { backgroundColor: jewel.bg }]}>
                                {JEWEL_ASSET_IMAGES[jewel.key] ? (
                                  <Image
                                    source={JEWEL_ASSET_IMAGES[jewel.key]}
                                    style={{ width: 32, height: 32 }}
                                    resizeMode="contain"
                                  />
                                ) : (
                                  <MuIcon name={jewel.icon as any} size={22} color={jewel.color} />
                                )}
                              </View>
                              <View style={styles.whJewelNameCol}>
                                <Text style={styles.whJewelNameText} numberOfLines={1}>{jewel.label}</Text>
                                <Text style={styles.whJewelCountText}>CANTIDAD: {currentVal}</Text>
                              </View>
                            </View>

                            <View style={styles.whJewelStepper}>
                              <TouchableOpacity
                                style={{ width: 44, height: 44, borderRadius: 2, overflow: 'hidden' }}
                                onPress={() => handleJewelChange(jewel.key, -1)}
                                activeOpacity={0.7}
                              >
                                <ImageBackground
                                  source={STITCH_ASSETS.buttons.small}
                                  style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                                  resizeMode="stretch"
                                >
                                  <Text style={styles.whJewelStepBtnText}>-</Text>
                                </ImageBackground>
                              </TouchableOpacity>

                              <TextInput
                                style={styles.whJewelInput}
                                value={String(currentVal)}
                                keyboardType="number-pad"
                                maxLength={4}
                                onChangeText={(txt) => handleJewelSetDirect(jewel.key, txt)}
                              />

                              <TouchableOpacity
                                style={{ width: 44, height: 44, borderRadius: 2, overflow: 'hidden' }}
                                onPress={() => handleJewelChange(jewel.key, 1)}
                                activeOpacity={0.7}
                              >
                                <ImageBackground
                                  source={STITCH_ASSETS.buttons.small}
                                  style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                                  resizeMode="stretch"
                                >
                                  <Text style={[styles.whJewelStepBtnText, styles.whJewelStepBtnTextPlus]}>+</Text>
                                </ImageBackground>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </Panel>
                )}

                {/* Botón Guardar Banco de Joyas */}
                <BotonOro
                  titulo="GUARDAR BANCO DE JOYAS"
                  icono="content-save"
                  onPress={handleSaveJewelBank}
                  disabled={jewelBankSaving || jewelBankLoading || !jewelBankHasTable}
                  cargando={jewelBankSaving}
                  altura={48}
                />
              </ScrollView>
            </View>
          )}

          {/* Barra de Pestañas Inferior Ergonómica (48dp minHeight) */}
          <View style={styles.whBottomTabsBar}>
            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 2, overflow: 'hidden' }}
              onPress={() => handleSelectWarehouseTab('warehouse')}
              activeOpacity={0.7}
            >
              <ImageBackground
                source={warehouseViewTab === 'warehouse' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}
                resizeMode="stretch"
              >
                <MuIcon
                  name="package-variant-closed"
                  size={18}
                  color={warehouseViewTab === 'warehouse' ? THEME.colors.oroClaro : THEME.colors.textoSecundario}
                />
                <Text
                  style={[
                    styles.whBottomTabText,
                    warehouseViewTab === 'warehouse' && styles.whBottomTabTextActive,
                  ]}
                >
                  Baúl Base
                </Text>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 2, overflow: 'hidden' }}
              onPress={() => handleSelectWarehouseTab('vault_ext')}
              activeOpacity={0.7}
            >
              <ImageBackground
                source={warehouseViewTab === 'vault_ext' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}
                resizeMode="stretch"
              >
                <MuIcon
                  name="safe"
                  size={18}
                  color={warehouseViewTab === 'vault_ext' ? THEME.colors.arcano : THEME.colors.textoSecundario}
                />
                <Text
                  style={[
                    styles.whBottomTabText,
                    warehouseViewTab === 'vault_ext' && { color: THEME.colors.arcano, fontWeight: 'bold' },
                  ]}
                >
                  Expandido
                </Text>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 2, overflow: 'hidden' }}
              onPress={() => handleSelectWarehouseTab('jewels')}
              activeOpacity={0.7}
            >
              <ImageBackground
                source={warehouseViewTab === 'jewels' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}
                resizeMode="stretch"
              >
                <MuIcon
                  name="diamond-stone"
                  size={18}
                  color={warehouseViewTab === 'jewels' ? THEME.colors.oroClaro : THEME.colors.textoSecundario}
                />
                <Text
                  style={[
                    styles.whBottomTabText,
                    warehouseViewTab === 'jewels' && styles.whBottomTabTextActive,
                  ]}
                >
                  Banco Joyas
                </Text>
              </ImageBackground>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ flex: 1, height: 48, borderRadius: 2, overflow: 'hidden' }}
              onPress={() => handleSelectWarehouseTab('items')}
              activeOpacity={0.7}
            >
              <ImageBackground
                source={warehouseViewTab === 'items' ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', gap: 2 }}
                resizeMode="stretch"
              >
                <MuIcon
                  name="tools"
                  size={18}
                  color={warehouseViewTab === 'items' ? THEME.colors.oroClaro : THEME.colors.textoSecundario}
                />
                <Text
                  style={[
                    styles.whBottomTabText,
                    warehouseViewTab === 'items' && styles.whBottomTabTextActive,
                  ]}
                >
                  Item Maker
                </Text>
              </ImageBackground>
            </TouchableOpacity>
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
                <MuIcon name="lock-open-outline" size={22} color="#FF9800" />
                <Text style={styles.detailTitle}>Desbloquear Baúles</Text>
              </View>
              <TouchableOpacity onPress={() => setShowUnlockModal(false)} style={styles.closeModalBtn}>
                <MuIcon name="close" size={20} color={THEME.colors.textoSecundario} />
              </TouchableOpacity>
            </View>

            <Text style={{ color: THEME.colors.textoSecundario, fontSize: 13, marginBottom: 14 }}>
              Configura el número de baúles disponibles en <Text style={{ color: '#FFF', fontWeight: 'bold' }}>MEMB_INFO.WarehouseCount</Text> para la cuenta <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>{warehouseAccount}</Text>.
            </Text>

            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
              {['5', '10', '20', '50'].map((preset) => {
                const isAct = unlockCountInput === preset;
                return (
                  <TouchableOpacity
                    key={`preset_${preset}`}
                    style={{ flex: 1, height: 38, borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => setUnlockCountInput(preset)}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={isAct ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text
                        style={[
                          styles.presetPillText,
                          isAct && styles.presetPillTextActive,
                        ]}
                      >
                        {preset} Baúles
                      </Text>
                    </ImageBackground>
                  </TouchableOpacity>
                );
              })}
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
                borderRadius: THEME.shapes.radioEsquina,
                padding: 10,
                marginBottom: 10,
                borderWidth: 1,
                borderColor: 'rgba(91, 141, 239, 0.3)',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <MuIcon name="arrow-expand-all" size={16} color={THEME.colors.arcano} />
                <Text style={{ color: THEME.colors.arcano, fontWeight: 'bold', fontSize: 12 }}>
                  Expansión de Baúl Oficial (ExtWarehouse)
                </Text>
              </View>
              <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, marginBottom: 8 }}>
                Desbloquea las pestañas de Expansión 1 y 2 en el juego (<Text style={{ color: '#FFF' }}>AccountCharacter.ExtWarehouse = 2</Text>).
              </Text>
              <MuButton
                variante="primary"
                titulo="Activar Expansión 1 y 2 en Juego"
                icono="lightning-bolt"
                disabled={unlockingVaults}
                onPress={handleActivateVaultExpansion}
                compacto
                altura={38}
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <BotonPiedra
                titulo="Cancelar"
                onPress={() => setShowUnlockModal(false)}
                disabled={unlockingVaults}
                altura={42}
                style={{ flex: 1 }}
              />

              <BotonOro
                titulo="Desbloquear"
                onPress={handleUnlockWarehouses}
                disabled={unlockingVaults}
                cargando={unlockingVaults}
                altura={42}
                style={{ flex: 1 }}
              />
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
                <MuIcon name="flash" size={22} color="#FF7A00" />
                <Text style={styles.detailTitle}>Inyectar Set al Baúl #{activeVaultIndex}</Text>
              </View>
              <TouchableOpacity onPress={() => setShowQuickSetsVaultModal(false)} style={styles.closeModalBtn}>
                <MuIcon name="close" size={20} color={THEME.colors.textoSecundario} />
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
                          style={{ minWidth: 110, borderRadius: 2, overflow: 'hidden' }}
                          onPress={() => setSelectedVaultQuickSet(set)}
                        >
                          <ImageBackground
                            source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                            resizeMode="stretch"
                            style={{
                              padding: 10,
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <MuIcon
                              name="shield-outline"
                              size={24}
                              color={isSelected ? '#FEDF99' : THEME.colors.textMuted}
                            />
                            <Text
                              style={{
                                color: isSelected ? '#FEDF99' : '#CDC6B9',
                                fontWeight: isSelected ? '900' : '700',
                                fontSize: 12,
                                textAlign: 'center',
                                marginTop: 4,
                                ...(isSelected ? THEME.effects.textShadowSubtle : {}),
                              }}
                            >
                              {set.name}
                            </Text>
                            <Text style={{ color: isSelected ? '#FEDF99' : THEME.colors.textoSecundario, fontSize: 10, marginTop: 2 }}>{set.catLabel}</Text>
                            <Text style={{ color: '#4CAF50', fontSize: 9, marginTop: 2, fontWeight: 'bold' }}>
                              {set.pieces.length} piezas
                            </Text>
                          </ImageBackground>
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
                      backgroundColor: '#1F201F',
                      paddingHorizontal: 8,
                      paddingVertical: 5,
                      borderRadius: 2,
                      borderWidth: 1,
                      borderColor: '#4C463A',
                    }}
                  >
                    <MuIcon name="check-circle" size={12} color="#4CAF50" />
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
                    style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => setQuickSetVaultLevel((prev) => Math.max(0, prev - 1))}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.whStepBtnTextSmall}>-</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <Text style={styles.whStepperVal}>+{quickSetVaultLevel}</Text>
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => setQuickSetVaultLevel((prev) => Math.min(15, prev + 1))}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.whStepBtnTextSmall}>+</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ width: 44, height: 34, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                    onPress={() => setQuickSetVaultLevel(15)}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeActive}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.whOptionRow}>
                <Text style={styles.whOptionLabel}>Opción (+0 a +28):</Text>
                <View style={styles.whStepper}>
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => setQuickSetVaultOption((prev) => Math.max(0, prev - 1))}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.whStepBtnTextSmall}>-</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <Text style={styles.whStepperVal}>+{quickSetVaultOption * 4}</Text>
                  <TouchableOpacity
                    style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => setQuickSetVaultOption((prev) => Math.min(7, prev + 1))}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.buttons.small}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.whStepBtnTextSmall}>+</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={{ width: 44, height: 34, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                    onPress={() => setQuickSetVaultOption(7)}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeActive}
                      style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                      resizeMode="stretch"
                    >
                      <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Toggles */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14, marginTop: 4 }}>
                <TouchableOpacity
                  style={{ flex: 1, minWidth: 70, borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setQuickSetVaultLuck(!quickSetVaultLuck)}
                  activeOpacity={0.7}
                >
                  <ImageBackground
                    source={quickSetVaultLuck ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={{ color: quickSetVaultLuck ? '#FEDF99' : '#CDC6B9', fontSize: 11, fontWeight: quickSetVaultLuck ? '900' : '700' }}>
                      Luck
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, minWidth: 70, borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setQuickSetVaultSkill(!quickSetVaultSkill)}
                  activeOpacity={0.7}
                >
                  <ImageBackground
                    source={quickSetVaultSkill ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={{ color: quickSetVaultSkill ? '#FEDF99' : '#CDC6B9', fontSize: 11, fontWeight: quickSetVaultSkill ? '900' : '700' }}>
                      Skill
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, minWidth: 70, borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setQuickSetVaultFullExc(!quickSetVaultFullExc)}
                  activeOpacity={0.7}
                >
                  <ImageBackground
                    source={quickSetVaultFullExc ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={{ color: quickSetVaultFullExc ? '#FEDF99' : '#CDC6B9', fontSize: 11, fontWeight: quickSetVaultFullExc ? '900' : '700' }}>
                      Full Exc
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, minWidth: 70, borderRadius: 2, overflow: 'hidden' }}
                  onPress={() => setQuickSetVault380(!quickSetVault380)}
                  activeOpacity={0.7}
                >
                  <ImageBackground
                    source={quickSetVault380 ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                    style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                    resizeMode="stretch"
                  >
                    <Text style={{ color: quickSetVault380 ? '#FEDF99' : '#CDC6B9', fontSize: 11, fontWeight: quickSetVault380 ? '900' : '700' }}>
                      380 PvP
                    </Text>
                  </ImageBackground>
                </TouchableOpacity>
              </View>

              {/* Ancient Tier for Normal Sets */}
              {selectedVaultQuickSet?.cat !== 'ACC' && (
                <View style={{ marginBottom: 14 }}>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, fontWeight: 'bold', marginBottom: 6 }}>
                    ANCIENT OPTION:
                  </Text>
                  {vaultSetAncientOptions.length === 0 ? (
                    <View style={{ padding: 8, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: THEME.shapes.radioEsquina }}>
                      <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, fontStyle: 'italic' }}>
                        Este set no posee versiones Ancient registradas.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      <TouchableOpacity
                        style={{ height: 34, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setQuickSetVaultAncientTier(0)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={quickSetVaultAncientTier === 0 ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{ height: '100%', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={[styles.whAncientPillText, quickSetVaultAncientTier === 0 && styles.whAncientPillTextActive]}>
                            Normal (Sin Ancient)
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                      {vaultSetAncientOptions.map((anc) => {
                        const tierVal = anc.tier === 1 ? 5 : 10;
                        const isSelected = quickSetVaultAncientTier === tierVal;
                        return (
                          <TouchableOpacity
                            key={`vault_anc_${anc.tier}`}
                            style={{ height: 34, borderRadius: 2, overflow: 'hidden' }}
                            onPress={() => setQuickSetVaultAncientTier(tierVal)}
                            activeOpacity={0.7}
                          >
                            <ImageBackground
                              source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                              style={{ height: '100%', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
                              resizeMode="stretch"
                            >
                              <Text style={[styles.whAncientPillText, isSelected && { color: THEME.colors.oroClaro, fontWeight: 'bold' }]}>
                                Tier {anc.tier} ({anc.name})
                              </Text>
                            </ImageBackground>
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
                        style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setQuickSetVaultHarmonyLevel(prev => Math.max(0, prev - 1))}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.whStepBtnTextSmall}>-</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ width: 34, height: 34, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setQuickSetVaultHarmonyLevel(prev => Math.min(13, prev + 1))}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.whStepBtnTextSmall}>+</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ width: 44, height: 34, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                        onPress={() => setQuickSetVaultHarmonyLevel(13)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.tabs.tabModeActive}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.whMaxBtnTextSmall}>MAX</Text>
                        </ImageBackground>
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
                          style={{ borderRadius: 2, overflow: 'hidden' }}
                          onPress={() => {
                            setQuickSetVaultHarmonyType(h.id);
                            if (h.id > 0 && quickSetVaultHarmonyLevel === 0) setQuickSetVaultHarmonyLevel(13);
                          }}
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={isSel ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                            style={{ paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={[styles.whCategoryPillText, isSel ? { color: '#FEDF99', fontWeight: '900' } : { color: '#CDC6B9' }]}>
                              {h.label}
                            </Text>
                          </ImageBackground>
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
                      borderRadius: 2,
                      overflow: 'hidden',
                      height: 48,
                      minHeight: 48,
                      marginTop: 6,
                      opacity: isVaultAccountValid ? 1 : 0.6,
                    }}
                    onPress={handleInjectQuickSetToVault}
                    disabled={injectingQuickSetToVault || !isVaultAccountValid}
                  >
                    <ImageBackground
                      source={isVaultAccountValid ? STITCH_ASSETS.buttons.big : STITCH_ASSETS.tabs.tabModeInactive}
                      style={{
                        width: '100%',
                        height: '100%',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 8,
                      }}
                      resizeMode="stretch"
                    >
                      {injectingQuickSetToVault ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <>
                          <MuIcon
                            name={isVaultAccountValid ? "lightning-bolt" : "lock-outline"}
                            size={20}
                            color={isVaultAccountValid ? "#FEDF99" : THEME.colors.textMuted}
                          />
                          <Text style={{
                            color: isVaultAccountValid ? '#FEDF99' : THEME.colors.textMuted,
                            fontSize: 13,
                            fontWeight: '900',
                            ...(isVaultAccountValid ? THEME.effects.textShadowSubtle : {}),
                          }}>
                            {isVaultAccountValid
                              ? `INYECTAR ${selectedVaultQuickSet?.name.toUpperCase()} (${selectedVaultQuickSet?.pieces.length} PIEZAS)`
                              : `SELECCIONA UNA CUENTA PARA ACTIVAR`}
                          </Text>
                        </>
                      )}
                    </ImageBackground>
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
          <Panel style={[styles.detailModalCard, { maxHeight: '90%' }]}>
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailHeader}>
                <Text style={styles.detailTitle}>Nueva Cuenta (MEMB_INFO)</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={styles.closeModalBtn}>
                  <MuIcon name="close" size={22} color={THEME.colors.textoSecundario} />
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
                <View style={{ position: 'relative', justifyContent: 'center' }}>
                  <TextInput
                    style={[styles.createInput, { paddingRight: 40 }]}
                    placeholder="••••••••"
                    placeholderTextColor={THEME.colors.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    autoCapitalize="none"
                    secureTextEntry={!showNewPassword}
                    maxLength={10}
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={{ position: 'absolute', right: 10, padding: 4 }}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    accessibilityLabel="Ver u ocultar contraseña"
                  >
                    <MuIcon
                      name={showNewPassword ? 'eye-off' : 'eye'}
                      size={20}
                      color={THEME.colors.textoSecundario}
                    />
                  </TouchableOpacity>
                </View>
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
                  ].map((l) => {
                    const isSel = newLevel === l.level;
                    return (
                      <TouchableOpacity
                        key={l.level}
                        style={{ flex: 1, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() => setNewLevel(l.level)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={isSel ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={{ paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <View style={{ width: 6, height: 6, borderRadius: 3, /* círculo funcional (width/2) */ backgroundColor: l.color, marginBottom: 2 }} />
                          <Text
                            style={[
                              styles.vipSelectBtnText,
                              isSel ? { color: '#FEDF99', fontWeight: '900' } : { color: '#CDC6B9' },
                            ]}
                          >
                            {l.label}
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                <TouchableOpacity
                  style={styles.detailModalBtnCancel}
                  onPress={() => setCreateModalVisible(false)}
                  disabled={isCreating}
                  activeOpacity={0.75}
                >
                  <Text style={styles.detailBtnTextCancel}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.detailModalBtnSave}
                  onPress={handleCreateAccount}
                  disabled={isCreating}
                  activeOpacity={0.75}
                >
                  {isCreating ? (
                    <ActivityIndicator size="small" color="#0D0E0D" />
                  ) : (
                    <Text style={styles.detailBtnTextSave}>Crear Cuenta</Text>
                  )}
                </TouchableOpacity>
              </View>
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
    paddingHorizontal: 14,
  },
  /* ================= STITCH 02 ESTILOS CUENTAS ================= */
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
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#28251E',
    borderRightColor: '#28251E',
    borderWidth: 1,
    paddingHorizontal: 10,
    minHeight: 48,
  },
  stitchSearchIconImg: {
    width: 20,
    height: 20,
    marginRight: 4,
  },
  stitchFilterChipIcon: {
    width: 14,
    height: 14,
    marginRight: 4,
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
  stitchAddAccountBtn: {
    height: 44,
    paddingHorizontal: 12,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#252625',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#E0C380',
    borderBottomColor: '#8C6F2D',
    borderRightColor: '#8C6F2D',
    borderWidth: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stitchAddAccountBtnText: {
    color: '#EFD28D',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadow,
  },
  stitchFilterChipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  stitchFilterLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.textMuted,
    letterSpacing: 0.5,
    marginRight: 2,
  },
  stitchFilterChipTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  stitchFilterChipBg: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stitchFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 2,
  },
  stitchFilterChipActive: {
    shadowColor: '#EFD28D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  stitchFilterChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
  },
  stitchFilterChipTextActive: {
    color: '#EFD28D',
    fontWeight: '900',
  },
  stitchTableHeaderBanner: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111211',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
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
    backgroundColor: '#090A09',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stitchTableHeaderCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
  },
  stitchAccountCard: {
    position: 'relative',
    backgroundColor: '#171817',
    borderRadius: 2,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#161716',
    borderRightColor: '#161716',
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 2,
  },
  stitchAccountCardBlocked: {
    borderColor: THEME.colors.brasa,
    backgroundColor: 'rgba(226, 112, 58, 0.08)',
  },
  stitchCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  stitchCardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  stitchAvatarBox: {
    position: 'relative',
    width: 38,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stitchAvatarBoxBlocked: {
    backgroundColor: '#1E100D',
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
  },
  stitchAvatarImg: {
    width: 24,
    height: 24,
  },
  stitchBtnIconImg: {
    width: 16,
    height: 16,
  },
  stitchOnlineDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5, /* círculo funcional (width/2): indicador de presencia online */
    backgroundColor: THEME.colors.jade,
    borderWidth: 1.5,
    borderColor: '#0D0E0D',
  },
  stitchHeaderInfoCol: {
    flex: 1,
  },
  stitchTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  stitchAccountIdText: {
    fontSize: 13,
    fontWeight: '800',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.3,
    ...THEME.effects.textShadow,
  },
  stitchVipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    backgroundColor: '#26221A',
  },
  stitchVipBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#EFD28D',
  },
  stitchAccountEmailText: {
    fontSize: 11,
    fontWeight: '500',
    color: THEME.colors.textMuted,
    marginTop: 2,
  },
  stitchStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
  },
  stitchStatusActive: {
    backgroundColor: '#0F1F14',
    borderTopColor: '#3FCF8E',
    borderLeftColor: '#3FCF8E',
    borderRightColor: '#1A4D33',
    borderBottomColor: '#1A4D33',
  },
  stitchStatusOnline: {
    backgroundColor: '#0F1F14',
    borderTopColor: '#3FCF8E',
    borderLeftColor: '#3FCF8E',
    borderRightColor: '#1A4D33',
    borderBottomColor: '#1A4D33',
  },
  stitchStatusBlocked: {
    backgroundColor: '#2A1210',
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
  },
  stitchStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  stitchDataGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0E0F0E',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#4C463A',
    borderBottomColor: '#4C463A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  stitchDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  stitchDataText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#E4E2E0',
  },
  stitchActionContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2B2C2B',
    paddingTop: 8,
  },
  stitchActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnDetail: {
    flex: 1.2,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#252625',
    borderWidth: 1,
    borderColor: '#E0C380',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  actionBtnDetailText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EFD28D',
    fontFamily: THEME.typography.fontTitle,
  },
  actionBtnWarehouse: {
    flex: 1,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#1F201F',
    borderWidth: 1,
    borderColor: '#4C463A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  actionBtnWarehouseText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#E4E2E0',
    fontFamily: THEME.typography.fontTitle,
  },
  actionBtnBlock: {
    flex: 1.1,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#2A1616',
    borderWidth: 1,
    borderColor: '#7A2E28',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 4,
  },
  actionBtnUnblock: {
    backgroundColor: '#14281E',
    borderColor: '#1E6B43',
  },
  actionBtnBlockText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFB4AB',
    fontFamily: THEME.typography.fontTitle,
  },
  actionBtnUnblockText: {
    color: '#5DF5B0',
  },
  actionBtnDelete: {
    width: 38,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#2A1616',
    borderWidth: 1,
    borderColor: '#7A2E28',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* ================= FIN STITCH 02 ESTILOS ================= */
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
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFD28D',
    elevation: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    elevation: 3,
  },
  accountCardBlocked: {
    borderColor: '#E2703A',
    backgroundColor: 'rgba(226, 112, 58, 0.08)',
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.deepForge,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    position: 'relative',
  },
  avatarLetter: {
    color: '#EFD28D',
    fontSize: 16,
    fontWeight: '900',
  },
  accountTextCol: {
    flex: 1,
  },
  accountIdText: {
    color: '#EFD28D',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 2,
    ...THEME.effects.textShadow,
  },
  accountEmailText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11.5,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  cardRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editAccountQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  warehouseBoxBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  deleteAccountQuickBtn: {
    width: 36,
    height: 36,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: 'rgba(255, 82, 82, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 82, 82, 0.35)',
  },
  vipPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    backgroundColor: THEME.colors.superficie,
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
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 24,
  },
  detailModalCard: {
    padding: 16,
    maxHeight: '92%',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  avatarCircleSmall: {
    width: 34,
    height: 34,
    borderRadius: 17, // círculo funcional (width/2): avatar inicial de usuario
    backgroundColor: THEME.colors.deepForge,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetterSmall: {
    color: '#EFD28D',
    fontSize: 15,
    fontWeight: 'bold',
  },
  detailTitle: {
    color: '#E4E2E0',
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
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    ...THEME.effects.textShadowSubtle,
  },
  fieldBox: {
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.5,
    minHeight: 44,
  },
  statusActive: {
    backgroundColor: '#122417',
    borderColor: '#3FCF8E',
    borderTopColor: '#7DFCC2',
    borderBottomColor: '#1F6B47',
  },
  statusBlocked: {
    backgroundColor: '#261010',
    borderColor: '#E2703A',
    borderTopColor: '#FF9E79',
    borderBottomColor: '#7A2411',
  },
  statusToggleText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detailActionButtonsGrid: {
    gap: 10,
    marginTop: 18,
    marginBottom: 16,
  },
  detailActionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  detailBtnPjs: {
    flex: 1,
    height: 46,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    backgroundColor: '#1F201F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  detailBtnWarehouse: {
    flex: 1,
    height: 46,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E0C380',
    backgroundColor: '#292A29',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  detailBtnExtWh: {
    flex: 1,
    height: 46,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#3FCF8E',
    backgroundColor: '#14281E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  detailBtnJewels: {
    flex: 1,
    height: 46,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#E0C380',
    backgroundColor: '#292A29',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  detailBtnPjsText: {
    color: '#E4E2E0',
    fontSize: 12,
    fontFamily: THEME.typography.fontTitle,
    fontWeight: '800',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  detailBtnWarehouseText: {
    color: '#E4E2E0',
    fontSize: 12,
    fontFamily: THEME.typography.fontTitle,
    fontWeight: '800',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(0,0,0,0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // Estilos Editor de Cuenta
  modalInputBox: {
    backgroundColor: THEME.colors.deepForge,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.5,
    borderColor: THEME.colors.borde,
    borderTopColor: THEME.colors.brightSteel,
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
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.fondoRadialTop,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  vipPillBtnActive: {
    backgroundColor: THEME.colors.raisedIron,
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1.5,
  },
  vipPillBtnText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  vipPillBtnTextActive: {
    color: '#E4E2E0',
    fontWeight: '900',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickDayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: THEME.colors.fondoRadialTop,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  quickDayText: {
    color: '#E0C380',
    fontSize: 11,
    fontWeight: '800',
  },
  coinsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  coinCol: {
    flex: 1,
    backgroundColor: THEME.colors.fondoRadialTop,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    borderBottomColor: THEME.colors.borde,
  },
  stepBtn: {
    backgroundColor: THEME.colors.raisedIron,
    width: 40,
    height: 40,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  saveAccountBtn: {
    backgroundColor: '#3FCF8E',
    paddingVertical: 12,
    borderRadius: THEME.shapes.radioEsquina,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
    minHeight: 44,
  },
  saveAccountBtnText: {
    color: '#0D0E0D',
    fontWeight: 'bold',
    fontSize: 14,
  },
  disconnectBtn: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderWidth: 1,
    borderColor: '#E2703A',
    paddingVertical: 10,
    borderRadius: THEME.shapes.radioEsquina,
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
    borderRadius: THEME.shapes.radioEsquina,
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
    borderRadius: 6, /* círculo funcional (width/2): indicador circular online */
    backgroundColor: THEME.colors.jade,
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  onlineBadgePill: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: THEME.shapes.radioEsquina,
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
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 12,
    height: 44,
    minHeight: 44,
    color: '#FFF',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  vipSelectBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minHeight: 44,
  },
  vipSelectBtnActive: {
    borderColor: '#EFD28D',
    backgroundColor: 'rgba(224, 195, 128, 0.15)',
  },
  vipSelectBtnText: {
    color: THEME.colors.textoSecundario,
    fontWeight: '600',
  },
  vipSelectBtnTextActive: {
    color: '#EFD28D',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minHeight: 44,
  },
  cancelBtnText: {
    color: THEME.colors.texto,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#EFD28D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFD28D',
    minHeight: 44,
  },
  confirmBtnText: {
    color: '#0D0E0D',
    fontWeight: 'bold',
  },

  // Error Card
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderRadius: THEME.shapes.radioEsquina,
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
    borderRadius: THEME.shapes.radioEsquina,
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
    backgroundColor: '#1F201F',
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: '#4C463A',
  },
  vaultSubtitle: {
    color: '#EFD28D',
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
    backgroundColor: 'rgba(224, 195, 128, 0.15)',
    borderColor: '#EFD28D',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: THEME.shapes.radioEsquina,
    minHeight: 38,
  },
  unlockBtnText: {
    color: '#EFD28D',
    fontSize: 12,
    fontWeight: 'bold',
  },
  vaultTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    marginRight: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minHeight: 48,
    justifyContent: 'center',
  },
  vaultTabActive: {
    backgroundColor: '#292A29',
    borderColor: '#EFD28D',
  },
  vaultTabText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  vaultTabTextActive: {
    color: '#EFD28D',
    fontWeight: 'bold',
  },
  vaultStatsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    borderRadius: THEME.shapes.radioEsquina,
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
    borderRadius: THEME.shapes.radioEsquina,
    alignItems: 'center',
  },
  vaultCloseBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 13,
  },
  vaultSaveBtn: {
    flex: 2,
    backgroundColor: THEME.colors.oroClaro,
    paddingVertical: 10,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.bordeBrillante,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  vaultSaveBtnText: {
    color: THEME.colors.textoOscuro,
    fontWeight: 'bold',
    fontSize: 13,
  },
  presetPill: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  presetPillActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.2)',
    borderColor: THEME.colors.oroClaro,
  },
  presetPillText: {
    color: THEME.colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  presetPillTextActive: {
    color: THEME.colors.oroClaro,
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
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: THEME.colors.borde,
    backgroundColor: THEME.colors.superficie,
  },
  whBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minHeight: 44,
  },
  whBackBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 12,
    fontWeight: '800',
  },
  whHeaderTitleCol: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  whHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  whHeaderTitle: {
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.6,
    ...THEME.effects.textShadow,
  },
  whS6Badge: {
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 5,
    paddingVertical: 1,
    marginLeft: 6,
  },
  whS6BadgeText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 9,
    fontWeight: '900',
  },
  whHeaderSubtitle: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  whHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whSyncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  whSyncDot: {
    width: 6,
    height: 6,
    borderRadius: 3, /* círculo funcional (width/2): indicador sync baúl */
    backgroundColor: THEME.colors.jade,
  },
  whSyncText: {
    color: THEME.colors.textoSecundario,
    fontSize: 9,
    fontWeight: '800',
  },
  whRefreshBtn: {
    width: 38,
    height: 38,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  whSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  whSummaryColLeft: {
    flex: 1,
  },
  whSummaryColRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  whSummaryLabel: {
    color: THEME.colors.textoSecundario,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  whSummaryAccount: {
    color: THEME.colors.oroClaro,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
    ...THEME.effects.textShadow,
  },
  whSummaryZen: {
    color: THEME.colors.jade,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  whTopTabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginBottom: 10,
    gap: 6,
  },
  whTopTabBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 4,
  },
  whTopTabBtnActive: {
    backgroundColor: '#292A29',
    borderColor: THEME.colors.oroClaro,
  },
  whTopTabText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  whTopTabTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: '900',
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
    backgroundColor: '#121312',
    borderTopWidth: 1.5,
    borderTopColor: '#5A5242',
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
    backgroundColor: '#1F201F',
    borderRadius: THEME.shapes.radioEsquina,
    padding: 22,
    borderWidth: 1,
    borderColor: '#4C463A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 10,
  },
  premiumModalTitle: {
    color: '#EFD28D',
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
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  noCharsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(224, 195, 128, 0.08)',
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  noCharsText: {
    color: '#EFD28D',
    fontSize: 12,
    fontWeight: '500',
  },
  quickCreateCharBtn: {
    backgroundColor: '#EFD28D',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: '#EFD28D',
    minHeight: 44,
    justifyContent: 'center',
  },
  quickCreateCharBtnText: {
    color: '#0D0E0D',
    fontWeight: '800',
    fontSize: 12,
  },
  charChipsList: {
    gap: 8,
  },
  charChipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minHeight: 46,
    elevation: 2,
  },
  charChipName: {
    color: '#E4E2E0',
    fontWeight: '800',
    fontSize: 13,
  },
  charChipSub: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  movingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.superficie,
    borderColor: '#EFD28D',
    borderWidth: 1.5,
    borderRadius: THEME.shapes.radioEsquina,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 10,
    width: '100%',
    maxWidth: 380,
  },
  movingBannerTitle: {
    color: '#EFD28D',
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
    borderRadius: THEME.shapes.radioEsquina,
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
    backgroundColor: '#1F201F',
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: '#4C463A',
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
    width: 36,
    height: 36,
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
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  whHarmonyBtnActive: {
    backgroundColor: 'rgba(224, 195, 128, 0.2)',
    borderColor: '#EFD28D',
  },
  whHarmonyBtnText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '600',
  },
  whHarmonyBtnTextActive: {
    color: '#EFD28D',
    fontWeight: '800',
  },
  whSocketBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  whSocketBtnActive: {
    backgroundColor: 'rgba(224, 195, 128, 0.2)',
    borderColor: '#EFD28D',
  },
  whSocketBtnText: {
    color: THEME.colors.textoSecundario,
    fontSize: 10,
    fontWeight: '600',
  },
  whSocketBtnTextActive: {
    color: '#EFD28D',
    fontWeight: '800',
  },
  vaultExtSubTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.superficie,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  vaultExtSubTabBtnActive: {
    backgroundColor: '#292A29',
    borderColor: '#EFD28D',
  },
  vaultExtSubTabText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '700',
  },
  vaultExtSubTabTextActive: {
    color: '#EFD28D',
    fontWeight: '800',
  },
  vaultExtHeroCard: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginBottom: 12,
  },

  // ==========================================
  // ESTILOS CLÁSICOS DE BAÚL MU ONLINE SEASON 6
  // ==========================================
  muVaultHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  muVaultHeaderTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#EFD28D',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  muVaultHeaderSlots: {
    fontSize: 12,
    fontWeight: '800',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.5,
  },
  muVaultQuickRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  muVaultQuickBtn: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  muVaultQuickBtnActive: {
    backgroundColor: '#292A29',
    borderColor: THEME.colors.oroClaro,
  },
  muVaultQuickText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '700',
  },
  muVaultQuickTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: '900',
  },
  muVaultPlusQuickBtn: {
    width: 44,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  muVaultPlusQuickText: {
    color: THEME.colors.oroClaro,
    fontSize: 20,
    fontWeight: '900',
  },
  muVaultGothicBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: THEME.colors.casillaFondo,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    marginBottom: 10,
    borderRadius: THEME.shapes.radioEsquina,
  },
  muVaultGothicTitle: {
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  muVaultGothicBadge: {
    color: THEME.colors.arcano,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  muVaultMaxText: {
    color: THEME.colors.oroClaro,
    fontSize: 12,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  muVaultActionGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  muVaultActionPill: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: THEME.colors.superficie,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  muVaultActionPillText: {
    color: THEME.colors.oroClaro,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  muVaultUnlockLockBtn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(226, 112, 58, 0.1)',
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.2,
    borderColor: THEME.colors.amber,
    paddingHorizontal: 14,
  },
  muVaultUnlockLockBtnText: {
    color: THEME.colors.amber,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
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
    width: 52,
    height: 48,
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
  // Banco de Joyas dentro de Warehouse Modal (Stitch 17R)
  whJewelItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121312',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#3A3C38',
    borderLeftColor: '#3A3C38',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
  },
  whJewelItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  whJewelIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 2,
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#3A3C38',
    borderBottomColor: '#3A3C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whJewelNameCol: {
    flex: 1,
  },
  whJewelNameText: {
    color: THEME.colors.texto,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  whJewelCountText: {
    color: THEME.colors.oroClaro,
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  whJewelStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  whJewelStepBtn: {
    width: 48,
    height: 48,
    borderRadius: 2,
    backgroundColor: '#1C1D1C',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    alignItems: 'center',
    justifyContent: 'center',
  },
  whJewelStepBtnText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 18,
    fontWeight: '900',
  },
  whJewelStepBtnPlus: {
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    backgroundColor: '#26221A',
  },
  whJewelStepBtnTextPlus: {
    color: THEME.colors.oroClaro,
  },
  whJewelInput: {
    width: 56,
    height: 48,
    borderRadius: 2,
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    color: '#EFD28D',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  whLockWarningBanner: {
    backgroundColor: 'rgba(255, 179, 0, 0.16)',
    borderColor: '#FFB300',
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
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

  // ==========================================
  // ESTILOS BANCO DE JOYAS (STITCH APPROVED IRONFORGE)
  // ==========================================
  jbModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  jbModalContent: {
    width: '100%',
    maxWidth: 520,
    padding: 16,
  },
  jbModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    marginBottom: 12,
  },
  jbModalTitle: {
    color: THEME.colors.texto,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  jbModalSubtitle: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    marginTop: 2,
  },
  jbCloseBtn: {
    width: 36,
    height: 36,
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
  jbQuickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  jbQuickLabel: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    fontWeight: '600',
  },
  jbQuickPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 2,
    backgroundColor: '#1C1D1C',
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  jbQuickPillText: {
    color: THEME.colors.texto,
    fontSize: 11,
    fontWeight: '700',
  },
  jbListContainer: {
    gap: 8,
  },
  jbItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121312',
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#3A3C38',
    borderLeftColor: '#3A3C38',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  jbItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  jbIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 2,
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#3A3C38',
    borderBottomColor: '#3A3C38',
    alignItems: 'center',
    justifyContent: 'center',
  },
  jbItemName: {
    color: THEME.colors.texto,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  jbStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  jbStepBtn: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 4,
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
  jbStepBtnText: {
    color: '#E4E2E0',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
  },
  jbInput: {
    width: 52,
    height: 30,
    borderRadius: 2,
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    color: '#EFD28D',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  jbFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
  },
  jbCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  jbCancelText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    fontWeight: '600',
  },
  jbSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.oroClaro,
  },
  jbSaveBtnText: {
    color: '#0D0E0D',
    fontSize: 13,
    fontWeight: 'bold',
  },
  detailBtnWrap: {
    flex: 1,
    height: 42,
    overflow: 'hidden',
    borderRadius: THEME.shapes.radioEsquina,
  },
  detailBtnImgBg: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  detailBtnText: {
    color: '#E4E2E0',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
  },
  detailModalBtn: {
    flex: 1,
    height: 42,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#1F201F',
    borderWidth: 1,
    borderColor: '#4C463A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  detailModalBtnCancel: {
    flex: 1,
    height: 44,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#1F201F',
    borderWidth: 1,
    borderColor: '#4C463A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalBtnSave: {
    flex: 1,
    height: 44,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: '#252625',
    borderWidth: 1,
    borderColor: '#E0C380',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailBtnTextCancel: {
    color: '#E4E2E0',
    fontSize: 12,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
  },
  detailBtnTextSave: {
    color: '#EFD28D',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: THEME.typography.fontTitle,
  },
});

