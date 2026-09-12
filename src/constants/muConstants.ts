export interface MuClassInfo {
  id: number;
  code: string;
  name: string;
  baseClass: string;
  tier: 1 | 2 | 3;
  avatarIcon: string;
  accentColor: string;
}

export const MU_CLASSES: Record<number, MuClassInfo> = {
  // Dark Wizard tree
  0: { id: 0, code: 'DW', name: 'Dark Wizard', baseClass: 'Dark Wizard', tier: 1, avatarIcon: 'magic-staff', accentColor: '#5B8DEF' },
  1: { id: 1, code: 'SM', name: 'Soul Master', baseClass: 'Dark Wizard', tier: 2, avatarIcon: 'fire', accentColor: '#64B5F6' },
  2: { id: 2, code: 'GM', name: 'Grand Master', baseClass: 'Dark Wizard', tier: 3, avatarIcon: 'star-shooting', accentColor: '#90CAF9' },
  3: { id: 3, code: 'GM', name: 'Grand Master', baseClass: 'Dark Wizard', tier: 3, avatarIcon: 'star-shooting', accentColor: '#90CAF9' },

  // Dark Knight tree
  16: { id: 16, code: 'DK', name: 'Dark Knight', baseClass: 'Dark Knight', tier: 1, avatarIcon: 'sword', accentColor: '#FF5252' },
  17: { id: 17, code: 'BK', name: 'Blade Knight', baseClass: 'Dark Knight', tier: 2, avatarIcon: 'shield-sword', accentColor: '#FF6E40' },
  18: { id: 18, code: 'BM', name: 'Blade Master', baseClass: 'Dark Knight', tier: 3, avatarIcon: 'crown', accentColor: '#FF7A00' },
  19: { id: 19, code: 'BM', name: 'Blade Master', baseClass: 'Dark Knight', tier: 3, avatarIcon: 'crown', accentColor: '#FF7A00' },

  // Fairy Elf tree
  32: { id: 32, code: 'FE', name: 'Fairy Elf', baseClass: 'Fairy Elf', tier: 1, avatarIcon: 'bow-arrow', accentColor: '#3FCF8E' },
  33: { id: 33, code: 'ME', name: 'Muse Elf', baseClass: 'Fairy Elf', tier: 2, avatarIcon: 'leaf', accentColor: '#66BB6A' },
  34: { id: 34, code: 'HE', name: 'High Elf', baseClass: 'Fairy Elf', tier: 3, avatarIcon: 'flower', accentColor: '#81C784' },
  35: { id: 35, code: 'HE', name: 'High Elf', baseClass: 'Fairy Elf', tier: 3, avatarIcon: 'flower', accentColor: '#81C784' },

  // Magic Gladiator tree
  48: { id: 48, code: 'MG', name: 'Magic Gladiator', baseClass: 'Magic Gladiator', tier: 1, avatarIcon: 'lightning-bolt', accentColor: '#FFA726' },
  49: { id: 49, code: 'DM', name: 'Duel Master', baseClass: 'Magic Gladiator', tier: 3, avatarIcon: 'flash', accentColor: '#FFB74D' },
  50: { id: 50, code: 'DM', name: 'Duel Master', baseClass: 'Magic Gladiator', tier: 3, avatarIcon: 'flash', accentColor: '#FFB74D' },

  // Dark Lord tree
  64: { id: 64, code: 'DL', name: 'Dark Lord', baseClass: 'Dark Lord', tier: 1, avatarIcon: 'horse', accentColor: '#E8C86A' },
  65: { id: 65, code: 'LE', name: 'Lord Emperor', baseClass: 'Dark Lord', tier: 3, avatarIcon: 'shield-crown', accentColor: '#F0D27A' },
  66: { id: 66, code: 'LE', name: 'Lord Emperor', baseClass: 'Dark Lord', tier: 3, avatarIcon: 'shield-crown', accentColor: '#F0D27A' },

  // Summoner tree
  80: { id: 80, code: 'SU', name: 'Summoner', baseClass: 'Summoner', tier: 1, avatarIcon: 'book-open-variant', accentColor: '#4DD0E1' },
  81: { id: 81, code: 'BS', name: 'Bloody Summoner', baseClass: 'Summoner', tier: 2, avatarIcon: 'skull', accentColor: '#FF8A65' },
  82: { id: 82, code: 'DM', name: 'Dimension Master', baseClass: 'Summoner', tier: 3, avatarIcon: 'orbit', accentColor: '#80DEEA' },
  83: { id: 83, code: 'DM', name: 'Dimension Master', baseClass: 'Summoner', tier: 3, avatarIcon: 'orbit', accentColor: '#80DEEA' },

  // Rage Fighter tree
  96: { id: 96, code: 'RF', name: 'Rage Fighter', baseClass: 'Rage Fighter', tier: 1, avatarIcon: 'hand-back-right', accentColor: '#FF7043' },
  97: { id: 97, code: 'FM', name: 'Fist Master', baseClass: 'Rage Fighter', tier: 3, avatarIcon: 'boxing-glove', accentColor: '#FF8A65' },
  98: { id: 98, code: 'FM', name: 'Fist Master', baseClass: 'Rage Fighter', tier: 3, avatarIcon: 'boxing-glove', accentColor: '#FF8A65' },
};

export interface MuRaceTier {
  tier: 1 | 2 | 3;
  classId: number;
  name: string;
  subtitle: string;
  icon: string;
}

export interface MuBaseRace {
  baseClass: string;
  code: string;
  name: string;
  avatarIcon: string;
  accentColor: string;
  defaultId: number;
  tiers: MuRaceTier[];
}

export const MU_BASE_RACES: MuBaseRace[] = [
  {
    baseClass: 'Dark Knight',
    code: 'DK',
    name: 'Dark Knight',
    avatarIcon: 'sword',
    accentColor: '#FF5252',
    defaultId: 18,
    tiers: [
      { tier: 1, classId: 16, name: 'Dark Knight', subtitle: '1ra Clase Inicial', icon: 'sword' },
      { tier: 2, classId: 17, name: 'Blade Knight', subtitle: '2da Clase', icon: 'shield-sword' },
      { tier: 3, classId: 18, name: 'Blade Master', subtitle: '3ra Clase (Master Evolution)', icon: 'crown' },
    ],
  },
  {
    baseClass: 'Dark Wizard',
    code: 'DW',
    name: 'Dark Wizard',
    avatarIcon: 'magic-staff',
    accentColor: '#5B8DEF',
    defaultId: 2,
    tiers: [
      { tier: 1, classId: 0, name: 'Dark Wizard', subtitle: '1ra Clase Inicial', icon: 'magic-staff' },
      { tier: 2, classId: 1, name: 'Soul Master', subtitle: '2da Clase', icon: 'fire' },
      { tier: 3, classId: 2, name: 'Grand Master', subtitle: '3ra Clase (Master Evolution)', icon: 'star-shooting' },
    ],
  },
  {
    baseClass: 'Fairy Elf',
    code: 'FE',
    name: 'Fairy Elf',
    avatarIcon: 'bow-arrow',
    accentColor: '#3FCF8E',
    defaultId: 34,
    tiers: [
      { tier: 1, classId: 32, name: 'Fairy Elf', subtitle: '1ra Clase Inicial', icon: 'bow-arrow' },
      { tier: 2, classId: 33, name: 'Muse Elf', subtitle: '2da Clase', icon: 'leaf' },
      { tier: 3, classId: 34, name: 'High Elf', subtitle: '3ra Clase (Master Evolution)', icon: 'flower' },
    ],
  },
  {
    baseClass: 'Magic Gladiator',
    code: 'MG',
    name: 'Magic Gladiator',
    avatarIcon: 'lightning-bolt',
    accentColor: '#FFA726',
    defaultId: 50,
    tiers: [
      { tier: 1, classId: 48, name: 'Magic Gladiator', subtitle: '1ra Clase Inicial', icon: 'lightning-bolt' },
      { tier: 3, classId: 50, name: 'Duel Master', subtitle: '3ra Clase (Master Evolution)', icon: 'flash' },
    ],
  },
  {
    baseClass: 'Dark Lord',
    code: 'DL',
    name: 'Dark Lord',
    avatarIcon: 'shield-crown',
    accentColor: '#E8C86A',
    defaultId: 66,
    tiers: [
      { tier: 1, classId: 64, name: 'Dark Lord', subtitle: '1ra Clase Inicial', icon: 'horse' },
      { tier: 3, classId: 66, name: 'Lord Emperor', subtitle: '3ra Clase (Master Evolution)', icon: 'shield-crown' },
    ],
  },
  {
    baseClass: 'Summoner',
    code: 'SU',
    name: 'Summoner',
    avatarIcon: 'book-open-variant',
    accentColor: '#4DD0E1',
    defaultId: 82,
    tiers: [
      { tier: 1, classId: 80, name: 'Summoner', subtitle: '1ra Clase Inicial', icon: 'book-open-variant' },
      { tier: 2, classId: 81, name: 'Bloody Summoner', subtitle: '2da Clase', icon: 'skull' },
      { tier: 3, classId: 82, name: 'Dimension Master', subtitle: '3ra Clase (Master Evolution)', icon: 'orbit' },
    ],
  },
  {
    baseClass: 'Rage Fighter',
    code: 'RF',
    name: 'Rage Fighter',
    avatarIcon: 'boxing-glove',
    accentColor: '#FF7043',
    defaultId: 98,
    tiers: [
      { tier: 1, classId: 96, name: 'Rage Fighter', subtitle: '1ra Clase Inicial', icon: 'boxing-glove' },
      { tier: 3, classId: 98, name: 'Fist Master', subtitle: '3ra Clase (Master Evolution)', icon: 'hand-back-right' },
    ],
  },
];

export const getMuClassInfo = (classId: number): MuClassInfo => {
  return MU_CLASSES[classId] || {
    id: classId,
    code: 'UK',
    name: `Unknown (${classId})`,
    baseClass: 'Unknown',
    tier: 1,
    avatarIcon: 'account-question',
    accentColor: '#757575',
  };
};

export interface PaperdollSlotDefinition {
  slot: number;
  key: string;
  name: string;
  shortName: string;
  icon: string;
  gridSize: { w: number; h: number };
}

// Canonical Season 6+ Paperdoll slot indices (0 to 11)
export const PAPERDOLL_SLOTS: PaperdollSlotDefinition[] = [
  { slot: 0, key: 'weapon1', name: 'Arma Principal (R)', shortName: 'Arma 1', icon: 'sword', gridSize: { w: 2, h: 3 } },
  { slot: 1, key: 'weapon2', name: 'Arma Secundaria / Escudo (L)', shortName: 'Arma 2 / Escudo', icon: 'shield', gridSize: { w: 2, h: 3 } },
  { slot: 2, key: 'helm', name: 'Casco', shortName: 'Casco', icon: 'hard-hat', gridSize: { w: 2, h: 2 } },
  { slot: 3, key: 'armor', name: 'Pechera / Armadura', shortName: 'Pechera', icon: 'tshirt-crew', gridSize: { w: 2, h: 2 } },
  { slot: 4, key: 'pants', name: 'Pantalón', shortName: 'Pantalón', icon: 'run-fast', gridSize: { w: 2, h: 2 } },
  { slot: 5, key: 'gloves', name: 'Guantes', shortName: 'Guantes', icon: 'hand-front-right', gridSize: { w: 2, h: 2 } },
  { slot: 6, key: 'boots', name: 'Botas', shortName: 'Botas', icon: 'shoe-formal', gridSize: { w: 2, h: 2 } },
  { slot: 7, key: 'wings', name: 'Alas / Capa', shortName: 'Alas', icon: 'butterfly', gridSize: { w: 2, h: 2 } },
  { slot: 8, key: 'pet', name: 'Pet / Guardián', shortName: 'Pet', icon: 'paw', gridSize: { w: 1, h: 1 } },
  { slot: 9, key: 'pendant', name: 'Pendiente', shortName: 'Pendiente', icon: 'necklace', gridSize: { w: 1, h: 1 } },
  { slot: 10, key: 'ring1', name: 'Anillo Izquierdo', shortName: 'Anillo 1', icon: 'ring', gridSize: { w: 1, h: 1 } },
  { slot: 11, key: 'ring2', name: 'Anillo Derecho', shortName: 'Anillo 2', icon: 'ring', gridSize: { w: 1, h: 1 } },
];

export const getBaseRaceByClass = (classId: number): MuBaseRace => {
  const numId = Number(classId ?? 0);
  // Match direct tier classId first
  const directMatch = MU_BASE_RACES.find((r) => r.tiers.some((t) => t.classId === numId));
  if (directMatch) return directMatch;

  const baseId = Math.floor(numId / 16) * 16;
  const race = MU_BASE_RACES.find((r) => {
    const rBaseId = r.tiers[0]?.classId ?? (Math.floor(r.defaultId / 16) * 16);
    return (Math.floor(rBaseId / 16) * 16) === baseId;
  });
  return race || MU_BASE_RACES[0];
};

export const INVENTORY_CONSTANTS = {
  ITEM_BYTE_SIZE: 16, // Season 6 format (32 hex characters per slot)
  HEX_CHARS_PER_ITEM: 32,
  EQUIPMENT_SLOTS_COUNT: 12, // 0 - 11 (Paperdoll)
  MAIN_INVENTORY_START: 12,
  MAIN_INVENTORY_SLOTS_COUNT: 64, // 12 - 75 (8 x 8)
  EXT1_INVENTORY_START: 76,
  EXT1_INVENTORY_SLOTS: 32, // 76 - 107 (4 x 8 Mochila Mágica 1)
  EXT2_INVENTORY_START: 108,
  EXT2_INVENTORY_SLOTS: 32, // 108 - 139 (4 x 8 Mochila Mágica 2)
  EXT3_INVENTORY_START: 140,
  EXT3_INVENTORY_SLOTS: 32, // 140 - 171 (4 x 8 Mochila Mágica 3)
  EXT4_INVENTORY_START: 172,
  EXT4_INVENTORY_SLOTS: 32, // 172 - 203 (4 x 8 Mochila Mágica 4)
  STORE_INVENTORY_START: 204,
  STORE_INVENTORY_SLOTS: 32, // 204 - 235 (4 x 8 Tienda Personal / PShop)
  TOTAL_BASE_SLOTS: 76,
  TOTAL_EXT1_SLOTS: 108,
  TOTAL_EXT2_SLOTS: 140,
  TOTAL_SEASON6_SLOTS: 236, // Total oficial Season 6 Louis (236 slots * 16 bytes = 3776 bytes)
  GRID_WIDTH: 8,
  GRID_HEIGHT: 8,
  EMPTY_ITEM_HEX: 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF',
  // Constantes de Baúl Season 6 (Louis Update 40: 240 slots = 3840 bytes = 7680 hex chars)
  VAULT_NORMAL_START: 0,
  VAULT_NORMAL_SLOTS: 120, // 8 x 15 (slots 0 - 119)
  VAULT_EXP_START: 120,
  VAULT_EXP_SLOTS: 120, // 8 x 15 (slots 120 - 239)
  TOTAL_VAULT_SLOTS: 240, // 240 slots
  TOTAL_VAULT_HEX_CHARS: 7680, // 240 * 32
};

export const MU_MAPS: Record<number, string> = {
  0: 'Lorencia',
  1: 'Dungeon',
  2: 'Devias',
  3: 'Noria',
  4: 'LostTower',
  6: 'Arena / Stadium',
  7: 'Atlans',
  8: 'Tarkan',
  10: 'Icarus',
  30: 'Valley of Loren',
  31: 'Land of Trials',
  33: 'Aida',
  34: 'Crywolf',
  37: 'Kanturu 1',
  38: 'Kanturu 2',
  39: 'Kanturu Relics',
  40: 'Silent Map',
  41: 'Barracks of Balgass',
  42: 'Refuge of Balgass',
  51: 'Elbeland',
  56: 'Swamp of Peace',
  57: 'Raklion',
  58: 'Raklion Boss',
  62: 'Santa Town',
  63: 'Vulcanus',
  69: 'Loren Market',
  79: 'Karutan 1',
  80: 'Karutan 2',
};

export const EXCELLENT_OPTIONS_WEAPON = [
  { bit: 0x01, name: 'Zen +40% al matar monstruos', short: 'Zen +40%' },
  { bit: 0x02, name: 'Attack Speed +7', short: 'Speed +7' },
  { bit: 0x04, name: 'Aumento de Daño +2%', short: 'Daño +2%' },
  { bit: 0x08, name: 'Aumento de Daño / Nivel / 20', short: 'Daño/Lv' },
  { bit: 0x10, name: 'Recuperación de Vida +1/8 al matar', short: 'Vida 1/8' },
  { bit: 0x20, name: 'Excelente Daño Rate +10%', short: 'Exc Dmg 10%' },
];

export const EXCELLENT_OPTIONS_ARMOR = [
  { bit: 0x01, name: 'Zen Extra +40% al caer', short: 'Zen +40%' },
  { bit: 0x02, name: 'Defense Success Rate +10%', short: 'Def Rate 10%' },
  { bit: 0x04, name: 'Damage Reflection +5%', short: 'Reflect 5%' },
  { bit: 0x08, name: 'Damage Decrease +4%', short: 'Dmg Dec 4%' },
  { bit: 0x10, name: 'Max Mana Increase +4%', short: 'Mana +4%' },
  { bit: 0x20, name: 'Max HP/Life Increase +4%', short: 'Life +4%' },
];

export const ANCIENT_SETS = [
  { id: 0, name: 'None' },
  { id: 1, name: 'Vicious (Stamina +5, Daño +15)' },
  { id: 2, name: 'Hyon (Defensa +25, Crítico +10%)' },
  { id: 3, name: 'Gaion (Ignora Defensa +5%)' },
  { id: 4, name: 'Anubis (Doble Daño +10%)' },
  { id: 5, name: 'Enis (Skill Dmg +10)' },
  { id: 6, name: 'Ceto (Defensa +10)' },
  { id: 7, name: 'Apollo (Mana +30, ENE +10)' },
];

export const HARMONY_OPTIONS_WEAPON = [
  { id: 0, name: 'Sin Harmony', short: 'Ninguno' },
  { id: 1, name: 'Min Attack/Magic Damage (+2 ~ +12)', short: 'Min Dmg' },
  { id: 2, name: 'Max Attack/Magic Damage (+3 ~ +15)', short: 'Max Dmg' },
  { id: 3, name: 'Required Strength Decrease (-6 ~ -40)', short: 'Req Str -' },
  { id: 4, name: 'Required Agility Decrease (-6 ~ -40)', short: 'Req Agi -' },
  { id: 5, name: 'Attack/Magic Damage Increase (+6 ~ +31)', short: 'Dmg Inc' },
  { id: 6, name: 'Critical Damage Increase (+6 ~ +30)', short: 'Crit Dmg' },
  { id: 7, name: 'Skill Damage Increase (+7 ~ +32)', short: 'Skill Dmg' },
  { id: 8, name: 'Attack Success Rate PvP (+5 ~ +14)', short: 'Rate PvP' },
  { id: 9, name: 'SD Decrease Rate (+3% ~ +10%)', short: 'SD Dec Rate' },
  { id: 10, name: 'SD Ignore Rate (+10% ~ +15%)', short: 'SD Ignore' },
];

export const HARMONY_OPTIONS_ARMOR = [
  { id: 0, name: 'Sin Harmony', short: 'Ninguno' },
  { id: 1, name: 'Defense Increase (+3 ~ +25)', short: 'Defensa +' },
  { id: 2, name: 'Max AG Increase (+4 ~ +20)', short: 'Max AG +' },
  { id: 3, name: 'Max HP Increase (+7 ~ +30)', short: 'Max HP +' },
  { id: 4, name: 'HP Recovery Rate (+1% ~ +3%)', short: 'HP Recov' },
  { id: 5, name: 'Mana Recovery Rate (+1% ~ +3%)', short: 'Mana Recov' },
  { id: 6, name: 'Defense Rate PvP (+3 ~ +8)', short: 'Def Rate PvP' },
  { id: 7, name: 'Damage Reduction Rate (+3% ~ +7%)', short: 'Dmg Reduc' },
  { id: 8, name: 'SD Ratio Increase (+3% ~ +5%)', short: 'SD Ratio +' },
];

