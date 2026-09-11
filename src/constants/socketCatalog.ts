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

export interface QuickSocketOption {
  label: string;
  val: number;
  element: string;
}

export const QUICK_SOCKET_OPTIONS: QuickSocketOption[] = [
  { label: 'Sin Socket', val: 0xFF, element: 'Ninguno' },
  { label: 'Libre (Gris)', val: 0xFE, element: 'Ninguno' },
  // Fuego (Weapons)
  { label: 'Fuego: Vel. Atq +7', val: encodeSocketByte(1, 1), element: 'Fuego' },
  { label: 'Fuego: Max Atq +30', val: encodeSocketByte(2, 1), element: 'Fuego' },
  { label: 'Fuego: Min Atq +20', val: encodeSocketByte(3, 1), element: 'Fuego' },
  { label: 'Fuego: Atq/Mag +20', val: encodeSocketByte(4, 1), element: 'Fuego' },
  { label: 'Fuego: -Costo AG 40%', val: encodeSocketByte(5, 1), element: 'Fuego' },
  // Agua (Armor)
  { label: 'Agua: Reduc. Daño +4%', val: encodeSocketByte(13, 1), element: 'Agua' },
  { label: 'Agua: Defensa +30', val: encodeSocketByte(11, 1), element: 'Agua' },
  { label: 'Agua: Reflejo Daño +5%', val: encodeSocketByte(14, 1), element: 'Agua' },
  { label: 'Agua: Tasa Def. +10%', val: encodeSocketByte(10, 1), element: 'Agua' },
  { label: 'Agua: Def. Escudo +7%', val: encodeSocketByte(12, 1), element: 'Agua' },
  // Hielo (Both)
  { label: 'Hielo: Atq Skill +37', val: encodeSocketByte(18, 1), element: 'Hielo' },
  { label: 'Hielo: Vida x Kill +V/8', val: encodeSocketByte(16, 1), element: 'Hielo' },
  { label: 'Hielo: Tasa Atq +25', val: encodeSocketByte(19, 1), element: 'Hielo' },
  // Viento (Armor)
  { label: 'Viento: Vida Max +4%', val: encodeSocketByte(22, 1), element: 'Viento' },
  { label: 'Viento: Auto Vida +8', val: encodeSocketByte(21, 1), element: 'Viento' },
  { label: 'Viento: AG Max +25', val: encodeSocketByte(25, 1), element: 'Viento' },
  // Rayo (Weapons)
  { label: 'Rayo: Daño Exc +15', val: encodeSocketByte(27, 1), element: 'Rayo' },
  { label: 'Rayo: Daño Crít +30', val: encodeSocketByte(29, 1), element: 'Rayo' },
  { label: 'Rayo: Tasa Exc +10%', val: encodeSocketByte(28, 1), element: 'Rayo' },
  { label: 'Rayo: Tasa Crít +8%', val: encodeSocketByte(30, 1), element: 'Rayo' },
  // Tierra (Armor)
  { label: 'Tierra: Fuerza/Vit +30', val: encodeSocketByte(31, 1), element: 'Tierra' },
];
