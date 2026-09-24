export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  CharacterEdit: { characterName: string };
  AppManager: undefined;
};

export type MainTabParamList = {
  Inicio: undefined;
  Jugadores: {
    subTab?: 'cuentas' | 'personajes' | 'online' | 'clanes' | 'pk' | 'gm';
    filter?: string;
    openCreateModal?: boolean;
    searchAccount?: string;
    focusSearch?: boolean;
    filterAccount?: string;
  } | undefined;
  Objetos: {
    initialTab?: 'maker' | 'kit' | 'jewels' | 'prizes';
    mode?: 'objects';
  } | undefined;
  Herramientas: {
    initialTab?: 'antidupe' | 'fixes' | 'rankings' | 'parsers';
    mode?: 'tools';
  } | undefined;
  Ajustes: undefined;

  // Rutas de compatibilidad histórica
  Cuentas: { filter?: string; openCreateModal?: boolean; searchAccount?: string; focusSearch?: boolean } | undefined;
  PJs: { filterAccount?: string } | undefined;
  Mas: { initialTab?: string; playerSubTab?: string } | undefined;
  Config: undefined;
};
