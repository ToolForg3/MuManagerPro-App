import { ItemDefinition } from '../services/parser/itemDatabase';

export interface ItemKitEntry {
  id: string;
  itemDef: ItemDefinition;
  level: number;
  option: number;
  skill: boolean;
  luck: boolean;
  excFlags: number;
  option380: boolean;
  enableSockets: boolean;
  sockets: number[];
  quantity: number;
}

export interface ServerProfile {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  isActive: boolean;
  encrypt?: boolean;
  emulatorType?: 'MSPro' | 'Louis' | 'Season6';
  bridgeUrl?: string;
  updatedAt?: number;
}

export interface OnlinePlayer {
  charName: string;
  accountId: string;
  class: number;
  level: number;
  map?: number;
  mapNumber?: number;
  mapX?: number;
  mapY?: number;
  isGm?: boolean;
  serverName?: string;
  ip?: string;
  connectTime?: string;
  resets?: number;
  money?: number;
  ctlCode?: number;
  pkCount?: number;
  strength?: number;
  dexterity?: number;
  vitality?: number;
  energy?: number;
  leadership?: number;
}

export interface GuildEntry {
  name: string;
  master: string;
  score: number;
  notice?: string;
  memberCount: number;
  G_Name: string;
  G_Master: string;
  G_Score: number;
  G_Notice?: string;
}

export interface GuildMemberEntry {
  name: string;
  status: number;
  level: number;
  class: number;
  resets?: number;
  Name: string;
  G_Name: string;
  G_Status: number;
  cLevel: number;
  Class: number;
}

export interface PkPlayerEntry {
  charName: string;
  accountId: string;
  class: number;
  level: number;
  pkLevel: number;
  pkCount: number;
  pkTime: number;
  Name: string;
  AccountID: string;
  Class: number;
  cLevel: number;
  PkLevel: number;
  PkCount: number;
  PkTime: number;
}

export interface BanEntry {
  type?: 'account' | 'character';
  accountId: string;
  charName?: string;
  class?: number;
  level?: number;
  reason: string;
  bannedAt?: string;
  expiresAt?: string;
}

export type GmLevel = 0 | 1 | 2 | 3;
// 0 = Jugador normal
// 1 = Helper (GM básico, puede chatear como GM)
// 2 = GM (puede usar comandos admin)
// 3 = Admin (acceso completo)

export interface GmEntry {
  charName: string;
  accountId: string;
  gmLevel: GmLevel;
  assignedAt: string;
  assignedBy: string;
}

export interface JewelSummaryItem {
  id: string;
  name: string;
  group: number;
  index: number;
  totalSlots: number;
  totalUnits: number;
  icon?: string;
}

export interface JewelOwnerSummary {
  ownerKey: string;
  accountId: string;
  charName?: string | null;
  location: string;
  isOnline: boolean;
  slotsCount: number;
  unitsCount: number;
}

export interface JewelAuditParams {
  targetScope: 'all' | 'character' | 'account';
  targetName?: string;
  itemFilter: 'all_jewels' | 'specific' | 'custom_jewels' | 'all_items';
  specificGroup?: number;
  specificIndex?: number;
  includeInventory?: boolean;
  includeWarehouse?: boolean;
  includeExtWarehouse?: boolean;
  protectEquipment?: boolean;
}

export interface JewelAuditResult {
  success: boolean;
  totalSlots: number;
  totalUnits: number;
  summaryByType: JewelSummaryItem[];
  owners: JewelOwnerSummary[];
  onlineAccountsSkipped?: number;
  message?: string;
}

export interface JewelPurgeParams {
  targetScope: 'all' | 'character' | 'account';
  targetName?: string;
  itemFilter: 'all_jewels' | 'specific' | 'custom_jewels' | 'all_items';
  specificGroup?: number;
  specificIndex?: number;
  action: 'purge_all' | 'cap_per_target' | 'cap_server_wide';
  maxAmount?: number;
  countBy: 'slots' | 'units';
  includeInventory?: boolean;
  includeWarehouse?: boolean;
  includeExtWarehouse?: boolean;
  protectEquipment?: boolean;
  skipOnline?: boolean;
  dryRun?: boolean;
}

export interface JewelPurgeResult {
  success: boolean;
  dryRun: boolean;
  totalFoundSlots: number;
  totalFoundUnits: number;
  slotsDeleted: number;
  unitsDeleted: number;
  slotsKept: number;
  unitsKept: number;
  affectedAccounts: number;
  affectedCharacters: number;
  affectedWarehouses: number;
  skippedOnlineCount: number;
  skippedOnlineList?: string[];
  message: string;
}

export interface JewelBankData {
  AccountID?: string;
  Bless: number;
  Soul: number;
  Chaos: number;
  Life: number;
  Creation: number;
  Guardian: number;
  Harmony: number;
  GemStone: number;
  LowStone: number;
  HighStone: number;
}
