export interface SqlServerConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  encrypt: boolean;
  emulatorType: 'MSPro' | 'Louis' | 'Season6';
  useBridge: boolean;
  bridgeUrl?: string;
  connectionMode?: 'direct' | 'connector';
}

export interface DashboardMetrics {
  Cuentas: number;
  Personajes: number;
  Online: number;
  VIP: number;
  Guilds?: number;
  hostIp: string;
  connected: boolean;
  accountType: 'Standard' | 'Silver' | 'Premium';
}

export interface SqlLogEntry {
  id: string;
  timestamp: string;
  query: string;
  durationMs: number;
  success: boolean;
  rowCount?: number;
  error?: string;
}

export interface ServerCapabilities {
  Success: number;
  SeasonProfile: 'SEASON97D' | 'SEASON6' | 'SEASON8_PLUS' | string;
  ItemBytesPerSlot: number;
  ItemHexChars: number;
  PasswordType: 'PLAIN' | 'MD5_WEBZEN' | 'MD5_BINARY' | 'SHA256' | string;
  ResetColumn: string;
  MasterResetColumn: string;
  StatsDataType: string;
  HasMasterSkillTree: boolean;
  HasCastleSiege: boolean;
  HasCashShop: boolean;
  HasExtWarehouse: boolean;
  HasGens: boolean;
  HasMarriage: boolean;
  HasGiftCodes: boolean;
  HasMultiDb: boolean;
}
