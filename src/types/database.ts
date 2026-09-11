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
