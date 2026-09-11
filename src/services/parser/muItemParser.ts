import { ParsedItem } from '../../types/item';
import { ItemDatabase } from './itemDatabase';
import { INVENTORY_CONSTANTS } from '../../constants/muConstants';
import { getAncientInfo, resolveAncientItemName } from '../../constants/ancientCatalog';

/**
 * MU Online Hexadecimal Item Parser (Season 6 / Louis)
 * Structure: 16 bytes per item (32 hexadecimal characters)
 */
export class MuItemParser {
  /**
   * Cleans and validates a hex string (removes '0x' prefix and whitespace)
   */
  static sanitizeHex(raw: string): string {
    if (!raw) return '';
    return raw.replace(/\s+/g, '').replace(/^0x/i, '').toUpperCase();
  }

  /**
   * Checks whether a 32-character hex slot is empty
   */
  static isSlotEmpty(hex32: string): boolean {
    const clean = this.sanitizeHex(hex32);
    if (!clean || clean.length < 32) return true;
    return /^F{32}$/i.test(clean.substring(0, 32));
  }

  /**
   * Decodes a single 16-byte (32-character hex) item slot
   */
  static decodeItem(slot: number, hex32: string): ParsedItem | null {
    const clean = this.sanitizeHex(hex32);
    if (clean.length < 32 || this.isSlotEmpty(clean)) {
      return null;
    }

    // Hallazgo 6: Rechazar estrictamente caracteres no hexadecimales
    if (!/^[0-9A-F]{32}$/i.test(clean.substring(0, 32))) {
      return null;
    }

    const bytes: number[] = [];
    for (let i = 0; i < 32; i += 2) {
      bytes.push(parseInt(clean.substring(i, i + 2), 16));
    }

    const byte0 = bytes[0];
    const byte1 = bytes[1];
    const byte2 = bytes[2];
    const byte3 = bytes[3];
    const byte4 = bytes[4];
    const byte5 = bytes[5];
    const byte6 = bytes[6];
    const byte7 = bytes[7];
    const byte8 = bytes[8];
    const byte9 = bytes[9];
    const byte10 = bytes[10];

    // Byte 0, 7 y 9: Grupo (0-15) e Índice (0-511) Season 6 / Louis
    // Grupo en byte9 bits 4-7: (byte9 >> 4) & 0x0F
    // Índice: byte0 (bits 0-7) + bit 7 de byte7 (bit 8 = +256)
    const group = (byte9 >> 4) & 0x0F;
    const index = byte0 | ((byte7 & 0x80) ? 0x100 : 0);

    // Byte 1: Level, Skill, Luck, Option low bits
    const level = (byte1 >> 3) & 0x0F;
    const skill = (byte1 & 0x80) !== 0;
    const luck = (byte1 & 0x04) !== 0;
    
    // Option: ((byte1 & 0x03) | ((byte7 & 0x40) >> 4))
    const option = (byte1 & 0x03) | ((byte7 & 0x40) >> 4);

    // Byte 2: Durability
    const durability = byte2;

    // Bytes 3-6: Serial Number
    const serial = ((byte3 << 24) | (byte4 << 16) | (byte5 << 8) | byte6) >>> 0;

    // Byte 7: Excellent options (bits 0-5)
    const excellentFlags = byte7 & 0x3F;
    const isExcellent = excellentFlags > 0;

    // Byte 8: Ancient Option Season 6 / Louis (Tier bits 0-1, Stamina bits 2-3)
    const ancientInfo = getAncientInfo(group, index, byte8);
    const ancientOption = byte8; // preserve full byte8
    const isAncient = ancientInfo.isAncient;
    const ancientTier = ancientInfo.tier;
    const ancientStatBonus = ancientInfo.staminaBonus;
    const ancientSetName = ancientInfo.setName || undefined;

    // Byte 9: 380 option
    const option380 = (byte9 & 0x08) !== 0;

    // Byte 10: Harmony
    const harmonyType = (byte10 >> 4) & 0x0F;
    const harmonyLevel = byte10 & 0x0F;

    // Bytes 11-15: Sockets
    const sockets = [bytes[11], bytes[12], bytes[13], bytes[14], bytes[15]];

    // Retrieve item definition from database
    const def = ItemDatabase.findItem(group, index, byte0);

    let resolvedName = def.name;
    if (isAncient && ancientSetName) {
      resolvedName = resolveAncientItemName(group, index, byte8, resolvedName);
    } else if (group === 13 && index === 37) {
      if ((excellentFlags & 0x04) || excellentFlags === 4) {
        resolvedName = 'Horn of Fenrir (Dorado - Golden)';
      } else if ((excellentFlags & 0x02) || excellentFlags === 2) {
        resolvedName = 'Horn of Fenrir (Azul - Protección)';
      } else if ((excellentFlags & 0x01) || excellentFlags === 1) {
        resolvedName = 'Horn of Fenrir (Negro - Destrucción)';
      } else {
        resolvedName = 'Horn of Fenrir (Rojo - Normal)';
      }
    } else if (group === 14 && index === 11) {
      if (level >= 1 && level <= 5) {
        resolvedName = `Box of Kundun +${level}`;
      } else {
        resolvedName = 'Box of Luck';
      }
    }

    return {
      slot,
      hex: clean.substring(0, 32),
      group,
      index,
      id: def.id,
      name: resolvedName,
      level,
      skill,
      luck,
      option,
      durability,
      serial,
      excellentFlags,
      ancientOption,
      ancientTier,
      ancientStatBonus,
      ancientSetName,
      option380,
      harmonyType,
      harmonyLevel,
      sockets,
      width: def.width,
      height: def.height,
      isExcellent,
      isAncient,
      category: def.category,
      spriteKey: def.icon,
      hasTexture: def.hasTexture,
    };
  }

  /**
   * Encodes a ParsedItem object back into a 32-character hexadecimal string
   */
  static encodeItem(item: ParsedItem): string {
    const bytes: number[] = new Array(16).fill(0xFF);

    // Byte 0: ID calculation (Season 6 / Louis: byte 0 holds index 0-255)
    bytes[0] = item.index & 0xFF;

    // Safeguard Box of Kundun (Group 14, Index 11) - Max level in MU Online is +5 (0 is Box of Luck)
    let safeLevel = item.level;
    let safeDurability = item.durability;
    if (item.group === 14 && item.index === 11) {
      safeLevel = Math.min(5, Math.max(0, safeLevel || 0));
      if (safeLevel > 0) safeDurability = 1;
    }

    // Byte 1: Skill (bit 7), Level (bits 3-6), Luck (bit 2), Option low bits (bits 0-1)
    const skillBit = item.skill ? 0x80 : 0x00;
    const levelBits = (safeLevel & 0x0F) << 3;
    const luckBit = item.luck ? 0x04 : 0x00;
    const optLow = item.option & 0x03;
    bytes[1] = skillBit | levelBits | luckBit | optLow;

    // Byte 2: Durability
    bytes[2] = safeDurability & 0xFF;

    // Bytes 3-6: Serial
    bytes[3] = (item.serial >>> 24) & 0xFF;
    bytes[4] = (item.serial >>> 16) & 0xFF;
    bytes[5] = (item.serial >>> 8) & 0xFF;
    bytes[6] = item.serial & 0xFF;

    // Byte 7: Option high bit (bit 6), Excellent flags (bits 0-5) y 9no bit de índice (bit 7 = +256)
    const optHighBit = (item.option & 0x04) ? 0x40 : 0x00;
    const excBits = item.excellentFlags & 0x3F;
    const indexHighBit = (item.index & 0x100) ? 0x80 : 0x00;
    bytes[7] = optHighBit | excBits | indexHighBit;

    // Byte 8: Ancient Option (Louis S6 Byte 8: tier + stamina bits)
    bytes[8] = (item.ancientOption || 0) & 0xFF;

    // Byte 9: Group upper bits (bits 4-7) and 380 option (bit 3)
    const groupBits = (item.group & 0x0F) << 4;
    const opt380Bit = item.option380 ? 0x08 : 0x00;
    bytes[9] = groupBits | opt380Bit;

    // Byte 10: Harmony
    bytes[10] = ((item.harmonyType & 0x0F) << 4) | (item.harmonyLevel & 0x0F);

    // Bytes 11-15: Sockets
    for (let s = 0; s < 5; s++) {
      bytes[11 + s] = (item.sockets && item.sockets[s] !== undefined) ? item.sockets[s] : 0xFF;
    }

    return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  /**
   * Generates a brand new 16-byte (32-character hex) item string from custom parameters
   */
  static createItemHex(params: {
    group: number;
    index: number;
    level: number;
    option: number;
    skill: boolean;
    luck: boolean;
    durability?: number;
    serial?: number;
    excellentFlags?: number;
    ancientOption?: number;
    option380?: boolean;
    harmonyType?: number;
    harmonyLevel?: number;
    sockets?: number[];
  }): string {
    const bytes: number[] = new Array(16).fill(0xFF);

    // Byte 0: ID calculation
    bytes[0] = params.index & 0xFF;

    // Safeguard Box of Kundun (Group 14, Index 11) - Max level in MU Online is +5 (0 is Box of Luck)
    let safeLevel = params.level || 0;
    let safeDurability = params.durability !== undefined ? params.durability : 255;
    if (params.group === 14 && params.index === 11) {
      safeLevel = Math.min(5, Math.max(0, safeLevel || 0));
      if (safeLevel > 0) safeDurability = 1;
    }

    // Byte 1: Skill, Level, Luck, Option low bits
    const skillBit = params.skill ? 0x80 : 0x00;
    const levelBits = (safeLevel & 0x0F) << 3;
    const luckBit = params.luck ? 0x04 : 0x00;
    const optLow = (params.option || 0) & 0x03;
    bytes[1] = skillBit | levelBits | luckBit | optLow;

    // Byte 2: Durability
    bytes[2] = safeDurability & 0xFF;

    // Bytes 3-6: Serial
    const serial = params.serial !== undefined
      ? params.serial
      : Math.floor(Math.random() * 0xFFFFFFFE) + 1;
    bytes[3] = (serial >>> 24) & 0xFF;
    bytes[4] = (serial >>> 16) & 0xFF;
    bytes[5] = (serial >>> 8) & 0xFF;
    bytes[6] = serial & 0xFF;

    // Byte 7: Option high bit, Excellent flags, Index 9th bit
    const optHighBit = ((params.option || 0) & 0x04) ? 0x40 : 0x00;
    const excBits = (params.excellentFlags || 0) & 0x3F;
    const indexHighBit = (params.index & 0x100) ? 0x80 : 0x00;
    bytes[7] = optHighBit | excBits | indexHighBit;

    // Byte 8: Ancient (Louis S6 Byte 8: tier + stamina bits)
    bytes[8] = (params.ancientOption || 0) & 0xFF;

    // Byte 9: Group and 380 option
    const groupBits = (params.group & 0x0F) << 4;
    const opt380Bit = params.option380 ? 0x08 : 0x00;
    bytes[9] = groupBits | opt380Bit;

    // Byte 10: Harmony
    bytes[10] = (((params.harmonyType || 0) & 0x0F) << 4) | ((params.harmonyLevel || 0) & 0x0F);

    // Bytes 11-15: Sockets
    const sockets = params.sockets || [0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
    for (let s = 0; s < 5; s++) {
      bytes[11 + s] = (sockets[s] !== undefined) ? sockets[s] : 0xFF;
    }

    return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  /**
   * Parses the full Inventory hex string from SQL Server (varbinary)
   * Splits into 32-character chunks and decodes each slot
   */
  static parseInventory(inventoryHex: string): ParsedItem[] {
    const clean = this.sanitizeHex(inventoryHex);
    // Validar que el hex tenga al menos la longitud de 1 slot (32 caracteres)
    if (!clean || clean.length < INVENTORY_CONSTANTS.HEX_CHARS_PER_ITEM) {
      return [];
    }

    const items: ParsedItem[] = [];
    const slotCount = Math.floor(clean.length / INVENTORY_CONSTANTS.HEX_CHARS_PER_ITEM);
    for (let slot = 0; slot < slotCount; slot++) {
      const chunk = clean.substring(
        slot * INVENTORY_CONSTANTS.HEX_CHARS_PER_ITEM,
        (slot + 1) * INVENTORY_CONSTANTS.HEX_CHARS_PER_ITEM
      );
      const parsed = this.decodeItem(slot, chunk);
      if (parsed) {
        items.push(parsed);
      }
    }

    return items;
  }

  /**
   * Patches an existing 16-byte item hex string preserving unknown/custom bits (H12)
   */
  static patchItemHex(originalHex: string, item: ParsedItem): string {
    const cleanOrig = this.sanitizeHex(originalHex);
    if (!cleanOrig || cleanOrig.length !== 32 || this.isSlotEmpty(cleanOrig)) {
      return this.encodeItem(item);
    }

    const bytes: number[] = [];
    for (let i = 0; i < 16; i++) {
      bytes.push(parseInt(cleanOrig.substring(i * 2, (i + 1) * 2), 16) || 0);
    }

    // Byte 0 & Byte 7: Index (9 bits)
    if (item.index !== undefined) {
      bytes[0] = item.index & 0xFF;
      const indexHighBit = (item.index & 0x100) ? 0x80 : 0x00;
      bytes[7] = (bytes[7] & ~0x80) | indexHighBit;
    }

    // Byte 1: Skill (bit 7), Level (bits 3-6), Luck (bit 2), Option low (bits 0-1)
    if (item.skill !== undefined) {
      bytes[1] = (bytes[1] & ~0x80) | (item.skill ? 0x80 : 0x00);
    }
    if (item.level !== undefined) {
      bytes[1] = (bytes[1] & ~0x78) | (((item.level & 0x0F) << 3));
    }
    if (item.luck !== undefined) {
      bytes[1] = (bytes[1] & ~0x04) | (item.luck ? 0x04 : 0x00);
    }
    if (item.option !== undefined) {
      const optLow = item.option & 0x03;
      bytes[1] = (bytes[1] & ~0x03) | optLow;
      const optHigh = (item.option & 0x04) ? 0x40 : 0x00;
      bytes[7] = (bytes[7] & ~0x40) | optHigh;
    }

    // Byte 2: Durability
    if (item.durability !== undefined) {
      bytes[2] = item.durability & 0xFF;
    }

    // Bytes 3-6: Serial
    if (item.serial !== undefined && item.serial > 0) {
      bytes[3] = (item.serial >>> 24) & 0xFF;
      bytes[4] = (item.serial >>> 16) & 0xFF;
      bytes[5] = (item.serial >>> 8) & 0xFF;
      bytes[6] = item.serial & 0xFF;
    }

    // Byte 7: Excellent Flags (bits 0-5)
    if (item.excellentFlags !== undefined) {
      bytes[7] = (bytes[7] & ~0x3F) | (item.excellentFlags & 0x3F);
    }

    // Byte 8: Ancient (Louis S6 Byte 8: tier + stamina bits)
    if (item.ancientOption !== undefined) {
      bytes[8] = (item.ancientOption || 0) & 0xFF;
    }

    // Byte 9: Group (bits 4-7), 380 Option (bit 3) - Preserva bits 0-2
    if (item.group !== undefined) {
      bytes[9] = (bytes[9] & ~0xF0) | ((item.group & 0x0F) << 4);
    }
    if (item.option380 !== undefined) {
      bytes[9] = (bytes[9] & ~0x08) | (item.option380 ? 0x08 : 0x00);
    }

    // Byte 10: Harmony (Type bits 4-7, Level bits 0-3)
    if (item.harmonyType !== undefined || item.harmonyLevel !== undefined) {
      const hType = (item.harmonyType || 0) & 0x0F;
      const hLevel = (item.harmonyLevel || 0) & 0x0F;
      bytes[10] = (hType << 4) | hLevel;
    }

    // Bytes 11-15: Sockets
    if (item.sockets && Array.isArray(item.sockets)) {
      for (let s = 0; s < 5; s++) {
        if (item.sockets[s] !== undefined) {
          bytes[11 + s] = item.sockets[s] & 0xFF;
        }
      }
    }

    return bytes.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join('');
  }

  /**
   * Rebuilds the complete Inventory hex string for saving back to SQL Server
   */
  static rebuildInventoryHex(
    items: ParsedItem[],
    totalSlots: number = INVENTORY_CONSTANTS.TOTAL_BASE_SLOTS,
    originalHex?: string
  ): string {
    const cleanOrig = this.sanitizeHex(originalHex || '');
    const maxItemSlot = items.reduce((max, it) => Math.max(max, it.slot), -1);
    const origSlotCount = Math.floor(cleanOrig.length / INVENTORY_CONSTANTS.HEX_CHARS_PER_ITEM);
    const slotCount = Math.max(
      totalSlots,
      origSlotCount,
      maxItemSlot + 1
    );

    // Inicializar todos los slots con vacío (FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF)
    // Hallazgo 7: Si un ítem fue removido de `items`, su slot quedará limpio en F...F
    const slotHexes: string[] = new Array(slotCount).fill(INVENTORY_CONSTANTS.EMPTY_ITEM_HEX);

    // Mapear los ítems activos en sus posiciones
    items.forEach((item) => {
      if (item.slot >= 0 && item.slot < slotCount) {
        const origChunk = cleanOrig.substring(
          item.slot * INVENTORY_CONSTANTS.HEX_CHARS_PER_ITEM,
          (item.slot + 1) * INVENTORY_CONSTANTS.HEX_CHARS_PER_ITEM
        );

        // Hallazgo 6 & 12: Conservar bytes binarios exactos si no fue modificado, o aplicar máscara de bits si fue editado
        if (!item.isModified && item.hex && item.hex.length === 32 && /^[0-9A-F]{32}$/i.test(item.hex)) {
          slotHexes[item.slot] = item.hex.toUpperCase();
        } else if (!item.isModified && origChunk.length === 32 && !this.isSlotEmpty(origChunk)) {
          slotHexes[item.slot] = origChunk.toUpperCase();
        } else if (item.isModified && (item.hex || (origChunk.length === 32 && !this.isSlotEmpty(origChunk)))) {
          const baseHex = (item.hex && item.hex.length === 32 && !this.isSlotEmpty(item.hex)) ? item.hex : origChunk;
          slotHexes[item.slot] = this.patchItemHex(baseHex, item);
        } else {
          slotHexes[item.slot] = this.encodeItem(item);
        }
      } else {
        console.warn(`[muItemParser] Slot ${item.slot} fuera de rango (máximo ${slotCount - 1}) para ítem: ${item.name}`);
      }
    });

    return slotHexes.join('');
  }

  /**
   * Creates an empty item slot at the given slot index
   */
  static createEmptySlotHex(): string {
    return INVENTORY_CONSTANTS.EMPTY_ITEM_HEX;
  }
}
