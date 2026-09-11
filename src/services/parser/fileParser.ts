import { ItemDefinition, ItemDatabase } from './itemDatabase';

export interface ParseResult {
  success: boolean;
  count: number;
  message: string;
  errors?: string[];
}

export class MuFileParser {
  /**
   * Parses standard MU Online Item.txt file
   * Structure: Section numbers (0 to 15) followed by item rows ending with 'end'
   */
  static parseItemTxt(content: string): ParseResult {
    try {
      const lines = content.split(/\r?\n/);
      let currentSection = -1;
      const parsedItems: ItemDefinition[] = [];
      const errors: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        // Skip comments and empty lines
        if (!line || line.startsWith('//') || line.startsWith(';')) {
          continue;
        }

        // Section header e.g. "0", "1", "2" ... "15"
        if (/^\d+$/.test(line)) {
          currentSection = parseInt(line, 10);
          continue;
        }

        if (line.toLowerCase() === 'end') {
          currentSection = -1;
          continue;
        }

        if (currentSection >= 0 && currentSection <= 15) {
          // Tokenize line (handling quotes for item names like "Dragon Armor")
          const tokens = line.match(/"[^"]*"|\S+/g);
          if (tokens && tokens.length >= 7) {
            const index = parseInt(tokens[0], 10);
            const name = tokens[tokens.length > 8 ? 7 : 1].replace(/^"|"$/g, '');
            const width = parseInt(tokens[tokens.length > 8 ? 3 : 2], 10) || 1;
            const height = parseInt(tokens[tokens.length > 8 ? 4 : 3], 10) || 1;

            if (!isNaN(index) && name) {
              const category: ItemDefinition['category'] =
                currentSection <= 5 ? 'weapon' :
                currentSection <= 11 ? 'armor' :
                currentSection === 12 ? 'wings' :
                currentSection === 13 ? (index < 8 ? 'pet' : 'jewelry') : 'consumable';

              parsedItems.push({
                group: currentSection,
                index,
                id: (currentSection << 9) | index,
                name,
                width: Math.min(Math.max(width, 1), 2),
                height: Math.min(Math.max(height, 1), 4),
                category,
                icon: category === 'weapon' ? 'sword' : 'shield',
              });
            }
          }
        }
      }

      if (parsedItems.length > 0) {
        ItemDatabase.addItems(parsedItems);
        return {
          success: true,
          count: parsedItems.length,
          message: `Se importaron ${parsedItems.length} ítems exitosamente desde Item.txt.`,
        };
      } else {
        return {
          success: false,
          count: 0,
          message: 'No se encontraron registros válidos de ítems en el archivo.',
        };
      }
    } catch (err: any) {
      return {
        success: false,
        count: 0,
        message: `Error al procesar Item.txt: ${err.message}`,
      };
    }
  }

  /**
   * Parses 380ItemType.txt (Defines which items have level 380 options)
   */
  static parse380ItemType(content: string): ParseResult {
    try {
      const lines = content.split(/\r?\n/);
      let count = 0;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith(';') || line.toLowerCase() === 'end') continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10)) && !isNaN(parseInt(parts[1], 10))) {
          count++;
        }
      }
      return {
        success: true,
        count,
        message: `Se reconocieron ${count} definiciones de opciones 380.`,
      };
    } catch (err: any) {
      return { success: false, count: 0, message: err.message };
    }
  }

  /**
   * Parses SocketItemType.txt (Defines items eligible for sockets)
   */
  static parseSocketItemType(content: string): ParseResult {
    try {
      const lines = content.split(/\r?\n/);
      let count = 0;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith(';') || line.toLowerCase() === 'end') continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 2 && !isNaN(parseInt(parts[0], 10))) {
          count++;
        }
      }
      return {
        success: true,
        count,
        message: `Se reconocieron ${count} tipos de socket items.`,
      };
    } catch (err: any) {
      return { success: false, count: 0, message: err.message };
    }
  }

  /**
   * Parses SetItemType.txt and SetItemOption.txt (Ancient sets)
   */
  static parseSetItemType(content: string): ParseResult {
    try {
      const lines = content.split(/\r?\n/);
      let count = 0;
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('//') || line.startsWith(';') || line.toLowerCase() === 'end') continue;
        const parts = line.split(/\s+/);
        if (parts.length >= 3 && !isNaN(parseInt(parts[0], 10))) {
          count++;
        }
      }
      return {
        success: true,
        count,
        message: `Se reconocieron ${count} definiciones de sets Ancient.`,
      };
    } catch (err: any) {
      return { success: false, count: 0, message: err.message };
    }
  }
}
