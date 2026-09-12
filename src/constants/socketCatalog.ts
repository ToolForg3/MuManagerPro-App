/**
 * CATÁLOGO OFICIAL DE SOCKETS Y SEED SPHERES PARA MU ONLINE SEASON 6 / LOUIS / MSPRO
 * ---------------------------------------------------------------------------------
 * Estructura de bytes en ítems Season 6 (Bytes 11 a 15 del Hex de 16 bytes / 32 caracteres):
 * - 0xFF (255): Sin Socket (Ranura no disponible o inactiva).
 * - 0xFE (254): Ranura Libre (Gris / Socket disponible sin semilla insertada).
 * - 0 a 250:   Seed Sphere insertada.
 *              Fórmula: Byte = OptionID + (NivelEsfera - 1) * 50
 *              Niveles 1 al 5 (Chipped, Flawed, Normal, Greater, Pure).
 */

export interface SocketOptionDef {
  optionId: number;
  element: 'Fuego' | 'Agua' | 'Hielo' | 'Viento' | 'Rayo' | 'Tierra';
  name: string;
  shortName: string;
  type: 'weapon' | 'armor' | 'both';
  bonuses: [string, string, string, string, string]; // Nivel 1 a 5
}

export const SOCKET_ELEMENTS = [
  'Fuego',
  'Agua',
  'Hielo',
  'Viento',
  'Rayo',
  'Tierra',
] as const;

export type SocketElement = typeof SOCKET_ELEMENTS[number];

export const SOCKET_OPTIONS_CATALOG: SocketOptionDef[] = [
  // ---------------- FUEGO (Armas) ----------------
  {
    optionId: 0,
    element: 'Fuego',
    name: 'Incremento de Ataque/Magia (Nvl)',
    shortName: 'Atq/Mag +Nvl',
    type: 'weapon',
    bonuses: ['+Lv/20', '+Lv/19', '+Lv/18', '+Lv/17', '+Lv/14'],
  },
  {
    optionId: 1,
    element: 'Fuego',
    name: 'Incremento de velocidad de ataque',
    shortName: 'Vel. Ataque',
    type: 'weapon',
    bonuses: ['+7', '+8', '+9', '+10', '+11'],
  },
  {
    optionId: 2,
    element: 'Fuego',
    name: 'Máximo Incremento de Ataque/Magia',
    shortName: 'Max Ataque',
    type: 'weapon',
    bonuses: ['+30', '+33', '+35', '+40', '+45'],
  },
  {
    optionId: 3,
    element: 'Fuego',
    name: 'Mínimo Incremento de Ataque/Magia',
    shortName: 'Min Ataque',
    type: 'weapon',
    bonuses: ['+20', '+22', '+25', '+30', '+35'],
  },
  {
    optionId: 4,
    element: 'Fuego',
    name: 'Incremento de Ataque/Magia',
    shortName: 'Ataque/Magia',
    type: 'weapon',
    bonuses: ['+20', '+22', '+25', '+30', '+35'],
  },
  {
    optionId: 5,
    element: 'Fuego',
    name: 'Disminución de costo de AG',
    shortName: '-Costo AG',
    type: 'weapon',
    bonuses: ['+40%', '+41%', '+42%', '+43%', '+44%'],
  },

  // ---------------- AGUA (Armaduras / Escudos) ----------------
  {
    optionId: 10,
    element: 'Agua',
    name: 'Incremento de tasa de éxito de defensa',
    shortName: 'Tasa Def.',
    type: 'armor',
    bonuses: ['+10%', '+11%', '+12%', '+13%', '+14%'],
  },
  {
    optionId: 11,
    element: 'Agua',
    name: 'Incremento de defensa',
    shortName: 'Defensa',
    type: 'armor',
    bonuses: ['+30', '+33', '+36', '+39', '+42'],
  },
  {
    optionId: 12,
    element: 'Agua',
    name: 'Incremento de defensa de escudo',
    shortName: 'Def. Escudo',
    type: 'armor',
    bonuses: ['+7%', '+10%', '+13%', '+16%', '+19%'],
  },
  {
    optionId: 13,
    element: 'Agua',
    name: 'Reducción de daño',
    shortName: 'Reduc. Daño',
    type: 'armor',
    bonuses: ['+4%', '+5%', '+6%', '+7%', '+8%'],
  },
  {
    optionId: 14,
    element: 'Agua',
    name: 'Reflejo de daño',
    shortName: 'Reflejo Daño',
    type: 'armor',
    bonuses: ['+5%', '+6%', '+7%', '+8%', '+9%'],
  },

  // ---------------- HIELO (Armas y Armaduras) ----------------
  {
    optionId: 16,
    element: 'Hielo',
    name: 'Recuperación de vida por monstruo muerto',
    shortName: 'Vida x Kill',
    type: 'both',
    bonuses: ['+Vida/8', '+Vida/7', '+Vida/6', '+Vida/5', '+Vida/4'],
  },
  {
    optionId: 17,
    element: 'Hielo',
    name: 'Recuperación de mana por monstruo muerto',
    shortName: 'Mana x Kill',
    type: 'both',
    bonuses: ['+Mana/8', '+Mana/7', '+Mana/6', '+Mana/5', '+Mana/4'],
  },
  {
    optionId: 18,
    element: 'Hielo',
    name: 'Incremento de ataque de habilidad',
    shortName: 'Ataque Skill',
    type: 'weapon',
    bonuses: ['+37', '+40', '+45', '+50', '+60'],
  },
  {
    optionId: 19,
    element: 'Hielo',
    name: 'Incremento de tasa de éxito de ataque',
    shortName: 'Tasa Ataque',
    type: 'both',
    bonuses: ['+25', '+27', '+30', '+35', '+40'],
  },
  {
    optionId: 20,
    element: 'Hielo',
    name: 'Incremento de durabilidad de ítem',
    shortName: 'Durabilidad',
    type: 'both',
    bonuses: ['+30%', '+32%', '+34%', '+36%', '+38%'],
  },

  // ---------------- VIENTO (Armaduras y Escudos) ----------------
  {
    optionId: 21,
    element: 'Viento',
    name: 'Incremento de recuperación automática de vida',
    shortName: 'Recup. Auto Vida',
    type: 'armor',
    bonuses: ['+8', '+10', '+13', '+16', '+20'],
  },
  {
    optionId: 22,
    element: 'Viento',
    name: 'Incremento de vida máxima',
    shortName: 'Vida Max',
    type: 'armor',
    bonuses: ['+4%', '+5%', '+6%', '+7%', '+8%'],
  },
  {
    optionId: 23,
    element: 'Viento',
    name: 'Incremento de mana máximo',
    shortName: 'Mana Max',
    type: 'armor',
    bonuses: ['+4%', '+5%', '+6%', '+7%', '+8%'],
  },
  {
    optionId: 24,
    element: 'Viento',
    name: 'Incremento de recuperación automática de mana',
    shortName: 'Recup. Auto Mana',
    type: 'armor',
    bonuses: ['+7', '+14', '+21', '+28', '+35'],
  },
  {
    optionId: 25,
    element: 'Viento',
    name: 'Incremento de AG máximo',
    shortName: 'AG Max',
    type: 'armor',
    bonuses: ['+25', '+30', '+35', '+40', '+50'],
  },
  {
    optionId: 26,
    element: 'Viento',
    name: 'Incremento de valor de AG',
    shortName: 'Valor AG',
    type: 'armor',
    bonuses: ['+3', '+5', '+7', '+10', '+15'],
  },

  // ---------------- RAYO (Armas) ----------------
  {
    optionId: 27,
    element: 'Rayo',
    name: 'Incremento de daño excelente',
    shortName: 'Daño Exc',
    type: 'weapon',
    bonuses: ['+15', '+20', '+25', '+30', '+40'],
  },
  {
    optionId: 28,
    element: 'Rayo',
    name: 'Incremento de tasa de daño excelente',
    shortName: 'Tasa Exc',
    type: 'weapon',
    bonuses: ['+10%', '+11%', '+12%', '+13%', '+14%'],
  },
  {
    optionId: 29,
    element: 'Rayo',
    name: 'Incremento de daño crítico',
    shortName: 'Daño Crítico',
    type: 'weapon',
    bonuses: ['+30', '+32', '+35', '+40', '+50'],
  },
  {
    optionId: 30,
    element: 'Rayo',
    name: 'Incremento de tasa de daño crítico',
    shortName: 'Tasa Crítico',
    type: 'weapon',
    bonuses: ['+8%', '+9%', '+10%', '+11%', '+12%'],
  },

  // ---------------- TIERRA (Armaduras) ----------------
  {
    optionId: 31,
    element: 'Tierra',
    name: 'Incremento de fuerza / vitalidad',
    shortName: 'Fuerza/Vit',
    type: 'armor',
    bonuses: ['+30', '+32', '+34', '+36', '+38'],
  },
];

export interface DecodedSocketInfo {
  val: number;
  isNone: boolean;
  isEmpty: boolean;
  hasSeed: boolean;
  element: SocketElement | 'Ninguno';
  optionId: number;
  level: number;
  name: string;
  shortName: string;
  bonus: string;
  label: string;
  fullDescription: string;
}

/**
 * Decodifica un byte individual de socket según la lógica Season 6 / Louis / MSPro.
 */
export function decodeSocketByte(byte: number): DecodedSocketInfo {
  const b = (byte !== undefined && byte !== null) ? (byte & 0xFF) : 0xFF;

  if (b === 0xFF) {
    return {
      val: 0xFF,
      isNone: true,
      isEmpty: false,
      hasSeed: false,
      element: 'Ninguno',
      optionId: -1,
      level: 0,
      name: 'Sin Socket',
      shortName: 'Sin Socket',
      bonus: '',
      label: 'Sin Socket',
      fullDescription: 'Ranura no disponible o vacía',
    };
  }

  if (b === 0xFE) {
    return {
      val: 0xFE,
      isNone: false,
      isEmpty: true,
      hasSeed: false,
      element: 'Ninguno',
      optionId: -1,
      level: 0,
      name: 'Libre (Gris)',
      shortName: 'Libre',
      bonus: '',
      label: 'Libre (Gris)',
      fullDescription: 'Ranura de socket libre para insertar Seed Sphere',
    };
  }

  const level = Math.min(5, Math.max(1, Math.floor(b / 50) + 1));
  const optionId = b % 50;

  const optDef = SOCKET_OPTIONS_CATALOG.find((o) => o.optionId === optionId);

  if (optDef) {
    const bonus = optDef.bonuses[level - 1] || '';
    const label = `${optDef.element}: ${optDef.shortName} ${bonus}`;
    const fullDescription = `${optDef.element}(${optDef.name} ${bonus})`;

    return {
      val: b,
      isNone: false,
      isEmpty: false,
      hasSeed: true,
      element: optDef.element,
      optionId: optDef.optionId,
      level,
      name: optDef.name,
      shortName: optDef.shortName,
      bonus,
      label,
      fullDescription,
    };
  }

  return {
    val: b,
    isNone: false,
    isEmpty: false,
    hasSeed: true,
    element: 'Ninguno',
    optionId,
    level,
    name: `Socket ID #${optionId}`,
    shortName: `Opt #${optionId}`,
    bonus: `(Lv.${level})`,
    label: `Socket #${optionId} (Lv.${level})`,
    fullDescription: `Socket Opción ${optionId} Nivel ${level}`,
  };
}

/**
 * Codifica un optionId y nivel de esfera en su byte respectivo.
 */
export function encodeSocketByte(optionId: number, level: number = 1): number {
  if (optionId === 0xFF || optionId === 0xFE) return optionId;
  const safeLevel = Math.min(5, Math.max(1, level));
  return (optionId % 50) + (safeLevel - 1) * 50;
}

export interface SeedSphereLevelDef {
  level: number;
  name: string;
  badge: string;
}

export const SEED_SPHERE_LEVELS: SeedSphereLevelDef[] = [
  { level: 1, name: 'Nivel 1 (Chipped)', badge: 'Lv.1' },
  { level: 2, name: 'Nivel 2 (Flawed)', badge: 'Lv.2' },
  { level: 3, name: 'Nivel 3 (Standard)', badge: 'Lv.3' },
  { level: 4, name: 'Nivel 4 (Greater)', badge: 'Lv.4' },
  { level: 5, name: 'Nivel 5 (Pure)', badge: 'Lv.5' },
];

export interface QuickSocketOption {
  label: string;
  val: number;
  element: string;
  optionId: number;
}

/**
 * Genera el listado completo de opciones rápidas de socket para el nivel de Seed Sphere indicado (1 a 5).
 */
export function getQuickSocketOptions(level: number = 1): QuickSocketOption[] {
  const safeLvl = Math.min(5, Math.max(1, level));
  const lvlIdx = safeLvl - 1;

  const options: QuickSocketOption[] = [
    { label: 'Sin Socket', val: 0xFF, element: 'Ninguno', optionId: -1 },
    { label: 'Libre (Gris)', val: 0xFE, element: 'Ninguno', optionId: -1 },
  ];

  // Opciones clave por elemento con bono dinámico según el nivel
  const keyOptions = [
    // Fuego (Weapons)
    { id: 1, short: 'Vel. Atq' },
    { id: 2, short: 'Max Atq' },
    { id: 3, short: 'Min Atq' },
    { id: 4, short: 'Atq/Mag' },
    { id: 5, short: '-Costo AG' },
    // Agua (Armor)
    { id: 13, short: 'Reduc. Daño' },
    { id: 11, short: 'Defensa' },
    { id: 14, short: 'Reflejo Daño' },
    { id: 10, short: 'Tasa Def.' },
    { id: 12, short: 'Def. Escudo' },
    // Hielo (Both)
    { id: 18, short: 'Atq Skill' },
    { id: 16, short: 'Vida x Kill' },
    { id: 19, short: 'Tasa Atq' },
    // Viento (Armor)
    { id: 22, short: 'Vida Max' },
    { id: 21, short: 'Auto Vida' },
    { id: 25, short: 'AG Max' },
    // Rayo (Weapons)
    { id: 27, short: 'Daño Exc' },
    { id: 29, short: 'Daño Crít' },
    { id: 28, short: 'Tasa Exc' },
    { id: 30, short: 'Tasa Crít' },
    // Tierra (Armor)
    { id: 31, short: 'Fuerza/Vit' },
  ];

  for (const ko of keyOptions) {
    const def = SOCKET_OPTIONS_CATALOG.find((o) => o.optionId === ko.id);
    if (def) {
      const bonus = def.bonuses[lvlIdx] || '';
      options.push({
        label: `${def.element}: ${ko.short} ${bonus}`,
        val: encodeSocketByte(ko.id, safeLvl),
        element: def.element,
        optionId: ko.id,
      });
    }
  }

  return options;
}

export const QUICK_SOCKET_OPTIONS: QuickSocketOption[] = getQuickSocketOptions(1);

