import { getSkillById, MuSkillDefinition } from '../../constants/muSkills';

export interface ParsedSkill {
  slotIndex: number;
  id: number;
  level: number;
  name: string;
  nameEs: string;
  category: 'Físico' | 'Magia' | 'Buff' | 'Invocación' | 'Especial';
  icon: string;
  races: string[];
  description?: string;
}

export class MuSkillParser {
  public static readonly BYTES_PER_SKILL = 3;
  public static readonly HEX_PER_SKILL = 6;
  public static readonly TOTAL_SKILL_SLOTS = 60; // 60 ranuras x 3 bytes = 180 bytes (varbinary(180))

  /**
   * Parsea el campo hexadecimal `MagicList` (varbinary(180)) de la tabla Character
   * @param magicListHex Cadena hexadecimal obtenida de SQL Server (CONVERT(VARCHAR(MAX), MagicList, 2))
   */
  public static parseMagicListHex(magicListHex?: string | null): ParsedSkill[] {
    if (!magicListHex || typeof magicListHex !== 'string') {
      return [];
    }

    const cleanHex = magicListHex.trim().toUpperCase().replace(/^0X/, '');
    if (cleanHex.length < this.HEX_PER_SKILL) {
      return [];
    }

    const parsedSkills: ParsedSkill[] = [];
    const totalSlots = Math.min(Math.floor(cleanHex.length / this.HEX_PER_SKILL), this.TOTAL_SKILL_SLOTS);

    for (let slot = 0; slot < totalSlots; slot++) {
      const offset = slot * this.HEX_PER_SKILL;
      const slotHex = cleanHex.substring(offset, offset + this.HEX_PER_SKILL);

      const b0 = parseInt(slotHex.substring(0, 2), 16);
      const b1 = parseInt(slotHex.substring(2, 4), 16);
      const b2 = parseInt(slotHex.substring(4, 6), 16);

      // Detección de ranura vacía
      // 0xFF 0xFF (65535) o 0x00 0x00 (0) o 0xFF 0x00 (vacío en 97d)
      if (
        (b0 === 0xFF && b1 === 0xFF) ||
        (b0 === 0x00 && b1 === 0x00) ||
        (b0 === 0xFF && b1 === 0x00) ||
        isNaN(b0) || isNaN(b1)
      ) {
        continue;
      }

      const skillId = (b1 << 8) | b0;
      if (skillId === 0 || skillId === 0xFFFF) {
        continue;
      }

      const skillLevel = isNaN(b2) ? 0 : b2;
      const def = getSkillById(skillId);

      if (def) {
        parsedSkills.push({
          slotIndex: slot,
          id: skillId,
          level: skillLevel,
          name: def.name,
          nameEs: def.nameEs,
          category: def.category,
          icon: def.icon,
          races: def.races,
          description: def.description,
        });
      } else {
        parsedSkills.push({
          slotIndex: slot,
          id: skillId,
          level: skillLevel,
          name: `Skill #${skillId}`,
          nameEs: `Habilidad #${skillId}`,
          category: 'Especial',
          icon: 'star-four-points',
          races: [],
          description: `Habilidad personalizada (ID ${skillId})`,
        });
      }
    }

    return parsedSkills;
  }

  /**
   * Codifica una lista de habilidades a formato hexadecimal `varbinary(180)` (360 caracteres hex)
   * @param skills Lista de habilidades a serializar
   * @param totalSlots Número total de ranuras (por defecto 60)
   */
  public static encodeMagicListHex(
    skills: Array<{ id: number; level?: number }>,
    totalSlots: number = this.TOTAL_SKILL_SLOTS
  ): string {
    let result = '';

    // Filtrar habilidades válidas y evitar duplicados
    const uniqueSkills: Array<{ id: number; level: number }> = [];
    const seenIds = new Set<number>();

    for (const s of skills) {
      if (s && typeof s.id === 'number' && s.id > 0 && s.id < 0xFFFF && !seenIds.has(s.id)) {
        seenIds.add(s.id);
        uniqueSkills.push({ id: s.id, level: s.level || 0 });
      }
    }

    // Escribir ranuras activas (máximo totalSlots)
    const count = Math.min(uniqueSkills.length, totalSlots);
    for (let i = 0; i < count; i++) {
      const s = uniqueSkills[i];
      const b0 = (s.id & 0xFF).toString(16).padStart(2, '0').toUpperCase();
      const b1 = ((s.id >> 8) & 0xFF).toString(16).padStart(2, '0').toUpperCase();
      const b2 = ((s.level || 0) & 0xFF).toString(16).padStart(2, '0').toUpperCase();
      result += b0 + b1 + b2;
    }

    // Rellenar ranuras vacías restantes con FFFF00 (marcador oficial de ranura vacía en Season 6)
    for (let i = count; i < totalSlots; i++) {
      result += 'FFFF00';
    }

    return result;
  }
}
