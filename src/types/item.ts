export interface ParsedItem {
  slot: number; // 0 to 107 (or expanded)
  hex: string;  // 32 characters hex string
  group: number; // 0 to 15
  index: number; // 0 to 511
  id: number;    // global item id: group * 512 + index (or group * 32 + index in legacy)
  name: string;
  level: number; // 0 to 15
  skill: boolean;
  luck: boolean;
  option: number; // 0 to 7 (Option * 4 = +0 to +28)
  durability: number;
  serial: number;
  excellentFlags: number; // 6 bits
  ancientOption: number;  // Season 6 Byte 8 (tier + stamina bonus)
  ancientTier?: number;   // 0 = none, 1 = tier 1, 2 = tier 2
  ancientStatBonus?: number; // 0, 5, or 10
  ancientSetName?: string; // e.g. Hyon, Vicious, Ceto
  option380: boolean;
  harmonyType: number;
  harmonyLevel: number;
  sockets: number[]; // 5 sockets
  width: number;
  height: number;
  isExcellent: boolean;
  isAncient: boolean;
  category: 'weapon' | 'armor' | 'wings' | 'pet' | 'jewelry' | 'consumable' | 'quest';
  spriteKey?: string;
  hasTexture?: boolean;
  isModified?: boolean;
}

export interface InventorySubView {
  type: 'equip' | 'main' | 'ext1' | 'ext2' | 'store';
  name: string;
  startSlot: number;
  slotCount: number;
}
