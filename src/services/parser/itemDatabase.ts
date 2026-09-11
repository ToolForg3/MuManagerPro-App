export interface ItemDefinition {
  group: number;
  index: number;
  id: number;
  name: string;
  slot?: number;
  width: number;
  height: number;
  category: 'weapon' | 'armor' | 'wings' | 'pet' | 'jewelry' | 'consumable' | 'quest';
  icon: string;
  durability?: number;
  is380?: boolean;
  maxSockets?: number;
  isAncient?: boolean;
  hasTexture?: boolean;
}

// Carga universal compatible con Metro Bundler, Expo y CommonJS en Node.js
const catalogData = require('../../constants/itemCatalogGenerated.json');
export const DEFAULT_ITEM_CATALOG: ItemDefinition[] = (catalogData.default || catalogData) as ItemDefinition[];

export class ItemDatabase {
  private static catalog: Map<number, ItemDefinition> = new Map();
  private static nameMap: Map<string, ItemDefinition> = new Map();

  static initialize(customItems?: ItemDefinition[]) {
    this.catalog.clear();
    this.nameMap.clear();

    DEFAULT_ITEM_CATALOG.forEach((item) => {
      const key = (item.group << 9) | item.index;
      if (!this.catalog.has(key) || !(item as any).subType) {
        this.catalog.set(key, item);
      }
      this.nameMap.set(item.name.toLowerCase().trim(), item);
    });

    if (customItems) {
      customItems.forEach((item) => {
        const key = (item.group << 9) | item.index;
        this.catalog.set(key, item);
        this.nameMap.set(item.name.toLowerCase().trim(), item);
      });
    }
  }

  static findItem(group: number, index: number, _unusedFallbackId?: number): ItemDefinition {
    if (this.catalog.size === 0) {
      this.initialize();
    }
    const key = (group << 9) | index;
    if (this.catalog.has(key)) {
      return this.catalog.get(key)!;
    }

    // Definición genérica de fallback limpia (sin colisiones cruzadas)
    const category: ItemDefinition['category'] = 
      group <= 5 ? 'weapon' :
      group <= 11 ? 'armor' :
      group === 12 ? 'wings' :
      group === 13 ? (index < 8 ? 'pet' : 'jewelry') : 'consumable';

    return {
      group,
      index,
      id: (group * 512) + index,
      name: `Item (${group}, ${index})`,
      slot: group <= 5 ? 0 : (group === 6 ? 1 : (group === 7 ? 2 : (group === 8 ? 3 : (group === 9 ? 4 : (group === 10 ? 5 : (group === 11 ? 6 : (group === 12 ? 7 : (group === 13 ? 8 : 0)))))))),
      width: (group >= 6 && group <= 11) ? 2 : (group <= 5 ? 2 : 1),
      height: (group >= 6 && group <= 11) ? 2 : (group <= 5 ? 3 : 1),
      category,
      icon: category === 'weapon' ? 'sword' : 'shield',
      durability: 255,
      hasTexture: false,
    };
  }

  static findByName(name?: string): ItemDefinition | undefined {
    if (!name) return undefined;
    if (this.catalog.size === 0) {
      this.initialize();
    }
    return this.nameMap.get(name.toLowerCase().trim());
  }

  static addItems(items: ItemDefinition[]) {
    items.forEach((item) => {
      const key = (item.group << 9) | item.index;
      this.catalog.set(key, item);
      this.nameMap.set(item.name.toLowerCase().trim(), item);
    });
  }

  static getCount(): number {
    if (this.catalog.size === 0) this.initialize();
    return this.catalog.size;
  }
}
