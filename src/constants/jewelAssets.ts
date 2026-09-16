// Catálogo oficial de assets empaquetados directamente en la APK para Joyas de MU Online
// Sprites transparentes auténticos de Season 6

export const JEWEL_ASSET_IMAGES: Record<string, any> = {
  Bless: require('../../assets/jewels/bless.png'),
  Soul: require('../../assets/jewels/soul.png'),
  Chaos: require('../../assets/jewels/chaos.png'),
  Life: require('../../assets/jewels/life.png'),
  Creation: require('../../assets/jewels/creation.png'),
  Guardian: require('../../assets/jewels/guardian.png'),
  Harmony: require('../../assets/jewels/harmony.png'),
  GemStone: require('../../assets/jewels/gemstone.png'),
  LowStone: require('../../assets/jewels/lowstone.png'),
  HighStone: require('../../assets/jewels/highstone.png'),
};

/**
 * Obtener imagen de joya por clave canónica (ej: 'Bless', 'Soul', 'Chaos')
 */
export function getJewelImageByKey(key: string): any | null {
  if (!key) return null;
  const normalized = key.trim();
  if (JEWEL_ASSET_IMAGES[normalized]) {
    return JEWEL_ASSET_IMAGES[normalized];
  }
  const lower = normalized.toLowerCase();
  for (const [k, v] of Object.entries(JEWEL_ASSET_IMAGES)) {
    if (k.toLowerCase() === lower) return v;
  }
  return null;
}

/**
 * Obtener imagen de joya por (Grupo, Index)
 */
export function getJewelImageByGroupIndex(group: number, index: number): any | null {
  // Joyas individuales
  if (group === 14) {
    if (index === 13) return JEWEL_ASSET_IMAGES.Bless;
    if (index === 14) return JEWEL_ASSET_IMAGES.Soul;
    if (index === 16) return JEWEL_ASSET_IMAGES.Life;
    if (index === 22) return JEWEL_ASSET_IMAGES.Creation;
    if (index === 31) return JEWEL_ASSET_IMAGES.Guardian;
    if (index === 41) return JEWEL_ASSET_IMAGES.GemStone;
    if (index === 42) return JEWEL_ASSET_IMAGES.Harmony;
    if (index === 43) return JEWEL_ASSET_IMAGES.LowStone;
    if (index === 44) return JEWEL_ASSET_IMAGES.HighStone;
  }
  if (group === 12) {
    if (index === 15) return JEWEL_ASSET_IMAGES.Chaos;
    // Bundles
    if (index === 30) return JEWEL_ASSET_IMAGES.Bless;
    if (index === 31) return JEWEL_ASSET_IMAGES.Soul;
    if (index === 136) return JEWEL_ASSET_IMAGES.Life;
    if (index === 137) return JEWEL_ASSET_IMAGES.Creation;
    if (index === 138) return JEWEL_ASSET_IMAGES.Guardian;
    if (index === 139) return JEWEL_ASSET_IMAGES.GemStone;
    if (index === 140) return JEWEL_ASSET_IMAGES.Harmony;
    if (index === 141) return JEWEL_ASSET_IMAGES.Chaos;
    if (index === 142) return JEWEL_ASSET_IMAGES.LowStone;
    if (index === 143) return JEWEL_ASSET_IMAGES.HighStone;
  }
  return null;
}

/**
 * Obtener imagen de joya por nombre canónico en español o inglés
 */
export function getJewelImageByName(name: string): any | null {
  if (!name) return null;
  const n = name.toLowerCase().trim();
  if (n.includes('bless')) return JEWEL_ASSET_IMAGES.Bless;
  if (n.includes('soul')) return JEWEL_ASSET_IMAGES.Soul;
  if (n.includes('chaos')) return JEWEL_ASSET_IMAGES.Chaos;
  if (n.includes('life')) return JEWEL_ASSET_IMAGES.Life;
  if (n.includes('creation')) return JEWEL_ASSET_IMAGES.Creation;
  if (n.includes('guardian')) return JEWEL_ASSET_IMAGES.Guardian;
  if (n.includes('harmony')) return JEWEL_ASSET_IMAGES.Harmony;
  if (n.includes('gemstone') || n.includes('gem stone')) return JEWEL_ASSET_IMAGES.GemStone;
  if (n.includes('lower refining') || n.includes('lowstone') || n.includes('low stone')) return JEWEL_ASSET_IMAGES.LowStone;
  if (n.includes('higher refining') || n.includes('highstone') || n.includes('high stone')) return JEWEL_ASSET_IMAGES.HighStone;
  return null;
}
