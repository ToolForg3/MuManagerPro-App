export interface CharacterSummary {
  Name: string;
  AccountID: string;
  Class: number;
  cLevel: number;
  ResetCount: number;
  Money: number;
  MasterResetCount?: number;
  MapNumber?: number;
  MapPosX?: number;
  MapPosY?: number;
  PkCount?: number;
  PkLevel?: number;
  CtlCode?: number;
  ConnectStat?: number;
  GuildName?: string;
}

export interface CharacterDetail {
  Name: string;
  AccountID: string;
  Class: number;
  cLevel: number;
  LevelUpPoint: number;
  MasterLevel: number;
  MasterPoint: number;
  Strength: number;
  Dexterity: number;
  Vitality: number;
  Energy: number;
  Leadership: number;
  Money: number;
  FruitPoint: number;
  Inventory: string; // Hex string from varbinary
  ResetCount?: number;
  MasterResetCount?: number;
  MapNumber?: number;
  MapPosX?: number;
  MapPosY?: number;
  PkCount?: number;
  PkLevel?: number;
  PkTime?: number;
  QuestHex?: string;
  CtlCode?: number; // 0 = Player, 32 = GameMaster
  ConnectStat?: number; // 0 = Offline, 1 = Online
  Ruud?: number;
  MagicList?: string; // Hex string from varbinary(180)
}

export interface AccountSummary {
  memb___id: string;
  memb__pwd?: string;
  memb_name?: string;
  sno__numb?: string;
  mail_addr?: string;
  AccountLevel: number; // 0 = Free, 1 = Bronze, 2 = Silver, 3 = Gold
  AccountExpireDate?: string;
  bloc_code?: string; // '0' = Active, '1' = Blocked
  status?: string;
  regDate?: string;
  online?: boolean;
  WarehouseCount?: number;
  WCoinC?: number;
  WCoinP?: number;
  GoblinPoint?: number;
  Ruud?: number;
  ConnectStat?: number;
  CharCount?: number;
  IP?: string;
  ConnectTM?: string;
  DisConnectTM?: string;
}

export interface AccountUpdateData {
  username: string;
  newUsername?: string;
  password?: string;
  name?: string;
  email?: string;
  accountLevel?: number;
  addVipDays?: number;
  accountExpireDate?: string;
  bloc_code?: string;
  warehouseCount?: number;
  wCoinC?: number;
  wCoinP?: number;
  goblinPoint?: number;
  ruud?: number;
}

