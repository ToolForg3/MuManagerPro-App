import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type LanguageCode = 'es' | 'en' | 'pt';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  flag: string;
  country: string;
}

export const LANGUAGES: LanguageInfo[] = [
  { code: 'es', name: 'Español', flag: '🇦🇷', country: 'Argentina' },
  { code: 'en', name: 'English', flag: '🇺🇸', country: 'United States' },
  { code: 'pt', name: 'Português', flag: '🇧🇷', country: 'Brasil' },
];

const TRANSLATIONS = {
  es: {
    // Auth
    appTitle: 'Mu Manager PRO',
    appSubtitle: 'DB Manager para MU Online',
    email: 'Correo Electrónico',
    username: 'Nombre de Usuario',
    password: 'Contraseña',
    rememberEmail: 'Recordar email',
    rememberUsername: 'Recordar usuario',
    signIn: 'Iniciar Sesión',
    register: 'Registrarse',
    terms: 'Términos y condiciones de uso',
    loggingIn: 'Autenticando...',

    // Dashboard
    connectedTo: 'Conectado a',
    accountTier: 'Cuenta',
    metricAccounts: 'Cuentas Totales',
    metricCharacters: 'Personajes Totales',
    metricOnline: 'Usuarios Online',
    metricVip: 'Cuentas VIP Activas',
    quickActions: 'Acciones Rápidas',
    actionNewAccount: 'Nueva cuenta',
    actionSearchAccount: 'Buscar cuenta',
    actionViewCharacters: 'Ver personajes',
    actionSettings: 'Configuración',
    recentAccounts: 'Cuentas Recientes',
    statusActive: 'Activa',
    planFree: 'Free',
    planBronze: 'Bronce',
    planSilver: 'Plata',
    planGold: 'Oro',
    planVip: 'VIP',

    // Characters List
    charactersTitle: 'Lista de Personajes',
    searchPlaceholder: 'Buscar personaje o cuenta...',
    level: 'Nivel',
    resets: 'Resets',
    account: 'Cuenta',
    zen: 'Zen',
    noCharactersFound: 'No se encontraron personajes coincidentes',

    // Character Editor
    editorTitle: 'Editor de Personaje',
    tabStats: 'Stats',
    tabProgress: 'Progreso',
    tabInventory: 'Inventario',
    tabLocation: 'Ubicación',
    tabQuest: 'Quest',
    basicInfo: 'Información Básica',
    charName: 'Nombre',
    charClass: 'Clase',
    charRank: 'Rango',
    rankPlayer: 'Player',
    rankGm: 'GameMaster',
    leveling: 'Nivel y Puntos',
    lvlPoints: 'LvL Points',
    masterLevel: 'M.Level',
    masterPoints: 'M.Points',
    statsGrid: 'Estadísticas del Personaje',
    str: 'STR (Fuerza)',
    agi: 'AGI (Agilidad)',
    vit: 'VIT (Vitalidad)',
    ene: 'ENE (Energía)',
    cmd: 'CMD (Comando)',
    fruitPoints: 'Fruit Points',
    saveStats: 'Guardar Estadísticas',
    saving: 'Guardando...',

    // Equipment & Inventory
    equipTab: 'Equip',
    mainInventory: 'Main (8x8)',
    ext1Inventory: 'Ext 1',
    ext2Inventory: 'Ext 2',
    storeInventory: 'Store',
    saveInventory: 'Guardar Cambios',
    itemDetails: 'Detalles del Ítem',
    itemIndex: 'Item Index',
    itemLevel: 'Nivel',
    itemDurability: 'Durabilidad',
    itemOption: 'Opción de Vida',
    skill: 'Skill',
    luck: 'Luck',
    excellentOptions: 'Opciones Excelentes',
    ancientOption: 'Opción Ancient',
    btnOk: 'OK',
    btnEdit: 'Editar',
    btnDelete: 'Eliminar',
    emptySlot: 'Slot Vacío',

    // Tools
    toolsTitle: 'Herramientas de Carga',
    configureItems: 'Configurar Items del Servidor',
    loadItemTxt: 'Cargar Item.txt (Base principal)',
    load380Txt: 'Cargar 380ItemType.txt',
    loadSocketTxt: 'Cargar SocketItemType.txt',
    loadSetItemTxt: 'Cargar SetItemType.txt',
    itemsLoadedCount: 'Ítems registrados en memoria local',
    resetDefaults: 'Restaurar base por defecto',

    // Config
    configTitle: 'Configuración de Conexión',
    languageSection: 'Idioma de la Aplicación',
    debugPanel: 'Panel de Debug (Logs & SQL)',
    emulatorSection: 'Emulador Compatible',
    sqlSection: 'Conexión a SQL Server',
    serverIp: 'IP del Servidor',
    quickIp: 'Atajos IP',
    serverPort: 'Puerto TCP',
    databaseName: 'Base de Datos',
    sqlUser: 'Usuario SQL',
    sqlPassword: 'Contraseña SQL',
    sslSwitch: 'Habilitar Cifrado SSL',
    btnConnect: 'Conectar a Base de Datos',
    btnClearConfig: 'Limpiar Configuración',
    networkNoticeTitle: 'Información de Red & Firewall',
    networkNoticeDesc: 'Asegúrate de permitir el puerto 1433 TCP en el Firewall de Windows en el servidor donde corre SQL Server.',
    userProfile: 'Perfil de Administrador',
    signOut: 'Cerrar Sesión',

    // Tabs
    tabHome: 'Inicio',
    tabAccounts: 'Cuentas',
    tabPJs: 'PJs',
    tabMore: 'Más',
    tabConfig: 'Config',
  },
  en: {
    appTitle: 'Mu Manager PRO',
    appSubtitle: 'DB Manager for MU Online',
    email: 'Email Address',
    username: 'Username',
    password: 'Password',
    rememberEmail: 'Remember email',
    rememberUsername: 'Remember username',
    signIn: 'Sign In',
    register: 'Register',
    terms: 'Terms and conditions of use',
    loggingIn: 'Authenticating...',

    connectedTo: 'Connected to',
    accountTier: 'Account',
    metricAccounts: 'Total Accounts',
    metricCharacters: 'Total Characters',
    metricOnline: 'Online Users',
    metricVip: 'Active VIP Accounts',
    quickActions: 'Quick Actions',
    actionNewAccount: 'New account',
    actionSearchAccount: 'Search account',
    actionViewCharacters: 'View characters',
    actionSettings: 'Settings',
    recentAccounts: 'Recent Accounts',
    statusActive: 'Active',
    planFree: 'Free',
    planBronze: 'Bronze',
    planSilver: 'Silver',
    planGold: 'Gold',
    planVip: 'VIP',

    charactersTitle: 'Characters List',
    searchPlaceholder: 'Search character or account...',
    level: 'Level',
    resets: 'Resets',
    account: 'Account',
    zen: 'Zen',
    noCharactersFound: 'No matching characters found',

    editorTitle: 'Character Editor',
    tabStats: 'Stats',
    tabProgress: 'Progress',
    tabInventory: 'Inventory',
    tabLocation: 'Location',
    tabQuest: 'Quest',
    basicInfo: 'Basic Information',
    charName: 'Name',
    charClass: 'Class',
    charRank: 'Rank',
    rankPlayer: 'Player',
    rankGm: 'GameMaster',
    leveling: 'Level and Points',
    lvlPoints: 'LvL Points',
    masterLevel: 'M.Level',
    masterPoints: 'M.Points',
    statsGrid: 'Character Statistics',
    str: 'STR (Strength)',
    agi: 'AGI (Agility)',
    vit: 'VIT (Vitality)',
    ene: 'ENE (Energy)',
    cmd: 'CMD (Command)',
    fruitPoints: 'Fruit Points',
    saveStats: 'Save Stats',
    saving: 'Saving...',

    equipTab: 'Equip',
    mainInventory: 'Main (8x8)',
    ext1Inventory: 'Ext 1',
    ext2Inventory: 'Ext 2',
    storeInventory: 'Store',
    saveInventory: 'Save Changes',
    itemDetails: 'Item Details',
    itemIndex: 'Item Index',
    itemLevel: 'Level',
    itemDurability: 'Durability',
    itemOption: 'Life Option',
    skill: 'Skill',
    luck: 'Luck',
    excellentOptions: 'Excellent Options',
    ancientOption: 'Ancient Option',
    btnOk: 'OK',
    btnEdit: 'Edit',
    btnDelete: 'Delete',
    emptySlot: 'Empty Slot',

    toolsTitle: 'Loading Tools',
    configureItems: 'Configure Server Items',
    loadItemTxt: 'Load Item.txt (Main DB)',
    load380Txt: 'Load 380ItemType.txt',
    loadSocketTxt: 'Load SocketItemType.txt',
    loadSetItemTxt: 'Load SetItemType.txt',
    itemsLoadedCount: 'Items registered in local memory',
    resetDefaults: 'Restore default catalog',

    configTitle: 'Connection Settings',
    languageSection: 'App Language',
    debugPanel: 'Debug Panel (Logs & SQL)',
    emulatorSection: 'Compatible Emulator',
    sqlSection: 'SQL Server Connection',
    serverIp: 'Server IP',
    quickIp: 'IP Shortcuts',
    serverPort: 'TCP Port',
    databaseName: 'Database',
    sqlUser: 'SQL Username',
    sqlPassword: 'SQL Password',
    sslSwitch: 'Enable SSL Encryption',
    btnConnect: 'Connect to Database',
    btnClearConfig: 'Clear Settings',
    networkNoticeTitle: 'Network & Firewall Notice',
    networkNoticeDesc: 'Ensure TCP port 1433 is allowed through Windows Firewall on your host SQL Server.',
    userProfile: 'Admin Profile',
    signOut: 'Sign Out',

    tabHome: 'Home',
    tabAccounts: 'Accounts',
    tabPJs: 'Chars',
    tabMore: 'More',
    tabConfig: 'Config',
  },
  pt: {
    appTitle: 'Mu Manager PRO',
    appSubtitle: 'DB Manager para MU Online',
    email: 'E-mail',
    username: 'Nome de Usuário',
    password: 'Senha',
    rememberEmail: 'Lembrar e-mail',
    rememberUsername: 'Lembrar usuário',
    signIn: 'Entrar',
    register: 'Cadastrar-se',
    terms: 'Termos e condições de uso',
    loggingIn: 'Autenticando...',

    connectedTo: 'Conectado a',
    accountTier: 'Conta',
    metricAccounts: 'Contas Totais',
    metricCharacters: 'Personagens Totais',
    metricOnline: 'Usuários Online',
    metricVip: 'Contas VIP Ativas',
    quickActions: 'Ações Rápidas',
    actionNewAccount: 'Nova conta',
    actionSearchAccount: 'Buscar conta',
    actionViewCharacters: 'Ver personagens',
    actionSettings: 'Configurações',
    recentAccounts: 'Contas Recentes',
    statusActive: 'Ativa',
    planFree: 'Grátis',
    planBronze: 'Bronze',
    planSilver: 'Prata',
    planGold: 'Ouro',
    planVip: 'VIP',

    charactersTitle: 'Lista de Personagens',
    searchPlaceholder: 'Buscar personagem ou conta...',
    level: 'Nível',
    resets: 'Resets',
    account: 'Conta',
    zen: 'Zen',
    noCharactersFound: 'Nenhum personagem encontrado',

    editorTitle: 'Editor de Personagem',
    tabStats: 'Stats',
    tabProgress: 'Progresso',
    tabInventory: 'Inventário',
    tabLocation: 'Localização',
    tabQuest: 'Missões',
    basicInfo: 'Informações Básicas',
    charName: 'Nome',
    charClass: 'Classe',
    charRank: 'Cargo',
    rankPlayer: 'Jogador',
    rankGm: 'GameMaster',
    leveling: 'Nível e Pontos',
    lvlPoints: 'Pontos de Nível',
    masterLevel: 'M.Level',
    masterPoints: 'M.Points',
    statsGrid: 'Atributos do Personagem',
    str: 'STR (Força)',
    agi: 'AGI (Agilidade)',
    vit: 'VIT (Vitalidade)',
    ene: 'ENE (Energia)',
    cmd: 'CMD (Comando)',
    fruitPoints: 'Fruit Points',
    saveStats: 'Salvar Atributos',
    saving: 'Salvando...',

    equipTab: 'Equip',
    mainInventory: 'Principal (8x8)',
    ext1Inventory: 'Ext 1',
    ext2Inventory: 'Ext 2',
    storeInventory: 'Loja',
    saveInventory: 'Salvar Alterações',
    itemDetails: 'Detalhes do Item',
    itemIndex: 'Item Index',
    itemLevel: 'Nível',
    itemDurability: 'Durabilidade',
    itemOption: 'Opção de Vida',
    skill: 'Habilidade (Skill)',
    luck: 'Sorte (Luck)',
    excellentOptions: 'Opções Excelentes',
    ancientOption: 'Opção Ancient',
    btnOk: 'OK',
    btnEdit: 'Editar',
    btnDelete: 'Excluir',
    emptySlot: 'Slot Vazio',

    toolsTitle: 'Ferramentas de Carga',
    configureItems: 'Configurar Itens do Servidor',
    loadItemTxt: 'Carregar Item.txt (Base Principal)',
    load380Txt: 'Carregar 380ItemType.txt',
    loadSocketTxt: 'Carregar SocketItemType.txt',
    loadSetItemTxt: 'Carregar SetItemType.txt',
    itemsLoadedCount: 'Itens registrados na memória local',
    resetDefaults: 'Restaurar catálogo padrão',

    configTitle: 'Configuração de Conexão',
    languageSection: 'Idioma do Aplicativo',
    debugPanel: 'Painel de Debug (Logs & SQL)',
    emulatorSection: 'Emulador Compatível',
    sqlSection: 'Conexão SQL Server',
    serverIp: 'IP do Servidor',
    quickIp: 'Atalhos IP',
    serverPort: 'Porta TCP',
    databaseName: 'Banco de Dados',
    sqlUser: 'Usuário SQL',
    sqlPassword: 'Senha SQL',
    sslSwitch: 'Habilitar Criptografia SSL',
    btnConnect: 'Conectar ao Banco',
    btnClearConfig: 'Limpar Configuração',
    networkNoticeTitle: 'Aviso de Rede & Firewall',
    networkNoticeDesc: 'Certifique-se de liberar a porta TCP 1433 no Firewall do Windows do seu servidor.',
    userProfile: 'Perfil de Administrador',
    signOut: 'Sair da Conta',

    tabHome: 'Início',
    tabAccounts: 'Contas',
    tabPJs: 'PJs',
    tabMore: 'Mais',
    tabConfig: 'Config',
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: keyof typeof TRANSLATIONS.es) => string;
  currentFlag: string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'es',
  setLanguage: () => {},
  t: (k) => TRANSLATIONS.es[k] || k,
  currentFlag: '🇦🇷',
});

const LANG_STORAGE_KEY = '@mumanager_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLangState] = useState<LanguageCode>('es');

  useEffect(() => {
    AsyncStorage.getItem(LANG_STORAGE_KEY).then((saved) => {
      if (saved && (saved === 'es' || saved === 'en' || saved === 'pt')) {
        setLangState(saved);
      }
    });
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLangState(lang);
    AsyncStorage.setItem(LANG_STORAGE_KEY, lang);
  };

  const t = (key: keyof typeof TRANSLATIONS.es): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.es[key] || key;
  };

  const currentFlag = LANGUAGES.find((l) => l.code === language)?.flag || '🇦🇷';

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, currentFlag }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
