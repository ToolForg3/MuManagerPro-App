import { ItemDefinition } from '../services/parser/itemDatabase';
import { isItemAncientEligible } from './ancientCatalog';

export interface MakerCategoryDef {
  id: string;
  name: string;
  icon: string;
  filter: (item: ItemDefinition) => boolean;
}

export const MAKER_CATEGORIES: MakerCategoryDef[] = [
  { id: 'ancient', name: 'Sets Ancient', icon: 'shield-crown', filter: (i) => isItemAncientEligible(i.group, i.index) },
  { id: 'swords', name: 'Espadas / Claws', icon: 'sword', filter: (i) => i.group === 0 },
  { id: 'axes', name: 'Hachas', icon: 'axe', filter: (i) => i.group === 1 },
  { id: 'maces', name: 'Mazas / Cetros', icon: 'hammer', filter: (i) => i.group === 2 },
  { id: 'spears', name: 'Lanzas', icon: 'spear', filter: (i) => i.group === 3 },
  { id: 'bows', name: 'Arcos', icon: 'bow-arrow', filter: (i) => i.group === 4 },
  { id: 'staffs', name: 'Staffs / Libros', icon: 'magic-staff', filter: (i) => i.group === 5 },
  { id: 'shields', name: 'Escudos', icon: 'shield', filter: (i) => i.group === 6 },
  { id: 'helms', name: 'Cascos', icon: 'hard-hat', filter: (i) => i.group === 7 },
  { id: 'armors', name: 'Armaduras', icon: 'tshirt-crew', filter: (i) => i.group === 8 },
  { id: 'pants', name: 'Pantalones', icon: 'run-fast', filter: (i) => i.group === 9 },
  { id: 'gloves', name: 'Guantes', icon: 'hand-back-right', filter: (i) => i.group === 10 },
  { id: 'boots', name: 'Botas', icon: 'shoe-formal', filter: (i) => i.group === 11 },
  { id: 'wings', name: 'Alas / Wings', icon: 'feather', filter: (i) => i.group === 12 && /wing|mantle|cape/i.test(i.name) },
  { id: 'pets', name: 'Mascotas / Pets', icon: 'paw', filter: (i) => i.group === 13 && /fenrir|horse|raven|uniria|dinorant|angel|imp|satan|demon|spirit|panda|skeleton|pet/i.test(i.name) },
  { id: 'jewelry', name: 'Joyería / Anillos', icon: 'ring', filter: (i) => i.group === 13 && /ring|pendant/i.test(i.name) },
  { id: 'seeds', name: 'Seeds & Sockets', icon: 'molecule', filter: (i) => i.group === 12 && /seed|sphere/i.test(i.name) },
  { id: 'jewels', name: 'Joyas', icon: 'diamond-stone', filter: (i) => i.group === 14 && /jewel|gemstone|harmony|chaos|bless|soul|creation|life|guardian|refine/i.test(i.name) },
  { id: 'events', name: 'Eventos / Tickets', icon: 'ticket-percent', filter: (i) => (i.group === 13 || i.group === 14) && /ticket|blood|devil|kalima|illusion|archangel|invitation|eye|key/i.test(i.name) },
  { id: 'scrolls', name: 'Pergaminos / Orbs', icon: 'book-open-page-variant', filter: (i) => i.group === 15 || (i.group === 12 && /orb|scroll/i.test(i.name)) },
  {
    id: 'others',
    name: 'Otros / Seals / Plumas',
    icon: 'cube-outline',
    filter: (i) => {
      if (i.group <= 11) return false;
      if (i.group === 12 && (/wing|mantle|cape/i.test(i.name) || /seed|sphere/i.test(i.name) || /orb|scroll/i.test(i.name))) return false;
      if (i.group === 13 && (/ring|pendant/i.test(i.name) || /fenrir|horse|raven|uniria|dinorant|angel|imp|satan|demon|spirit|panda|skeleton|pet/i.test(i.name) || /ticket|blood|devil|kalima|illusion|archangel|invitation|eye|key/i.test(i.name))) return false;
      if (i.group === 14 && (/jewel|gemstone|harmony|chaos|bless|soul|creation|life|guardian|refine/i.test(i.name) || /ticket|blood|devil|kalima|illusion|archangel/i.test(i.name))) return false;
      if (i.group === 15) return false;
      return true;
    },
  },
];
