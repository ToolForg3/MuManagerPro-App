import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SqlServerConfig, DashboardMetrics, SqlLogEntry } from '../types/database';
import { SqlClient } from '../services/database/sqlClient';

interface DatabaseContextType {
  config: SqlServerConfig;
  metrics: DashboardMetrics | null;
  isConnected: boolean;
  isConnecting: boolean;
  latency: number;
  logs: SqlLogEntry[];
  updateConfig: (newConfig: Partial<SqlServerConfig>) => Promise<void>;
  connect: () => Promise<{ success: boolean; message: string }>;
  refreshMetrics: () => Promise<void>;
  clearLogs: () => void;
  resetDatabaseState: () => Promise<void>;
}

const DatabaseContext = createContext<DatabaseContextType>({
  config: SqlClient.getConfig(),
  metrics: null,
  isConnected: false,
  isConnecting: false,
  latency: 0,
  logs: [],
  updateConfig: async () => {},
  connect: async () => ({ success: false, message: '' }),
  refreshMetrics: async () => {},
  clearLogs: () => {},
  resetDatabaseState: async () => {},
});

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<SqlServerConfig>(SqlClient.getConfig());
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [latency, setLatency] = useState<number>(0);
  const [logs, setLogs] = useState<SqlLogEntry[]>([]);

  useEffect(() => {
    const init = async () => {
      const saved = await SqlClient.loadSavedConfig();
      setConfig(saved);
      
      // Auto-conexión persistente al Cloud Gateway o base de datos en el arranque del APK
      // Se conecta automáticamente en segundo plano sin requerir ir a Configuración
      if (saved.useBridge || (saved.host && saved.host !== '127.0.0.1' && saved.host !== 'localhost')) {
        (async () => {
          try {
            setIsConnecting(true);
            const result = await SqlClient.testConnection();
            setIsConnected(result.success);
            setLatency(result.latency);
            if (result.success) {
              await refreshMetrics();
            }
          } catch (e) {
            console.log('Auto-connect on boot completed:', e);
          } finally {
            setIsConnecting(false);
            setLogs(SqlClient.getLogs());
          }
        })();
      }
      setLogs(SqlClient.getLogs());
    };
    init();
  }, []);

  const refreshMetrics = async () => {
    try {
      const data = await SqlClient.getDashboardMetrics();
      const fallbackMetrics: DashboardMetrics = {
        Cuentas: 0,
        Personajes: 0,
        Online: 0,
        VIP: 0,
        Guilds: 0,
        hostIp: config?.host || '127.0.0.1',
        connected: true,
        accountType: 'Premium',
      };
      setMetrics(data || fallbackMetrics);
      setIsConnected(true);
      setLogs(SqlClient.getLogs());
    } catch (e: any) {
      console.warn('refreshMetrics notice:', e?.message);
      // Mantener métricas seguras para evitar pantallas en blanco o bloqueos visuales
      const fallbackMetrics: DashboardMetrics = {
        Cuentas: 0,
        Personajes: 0,
        Online: 0,
        VIP: 0,
        Guilds: 0,
        hostIp: config?.host || '127.0.0.1',
        connected: true,
        accountType: 'Premium',
      };
      setMetrics((prev) => prev || fallbackMetrics);
      setLogs(SqlClient.getLogs());
      const isFatalNetwork = e?.message && (
        e.message.includes('Timeout') ||
        e.message.includes('No se pudo contactar') ||
        e.message.includes('Network request failed') ||
        e.message.includes('Login failed')
      );
      if (isFatalNetwork) {
        setIsConnected(false);
        throw e;
      }
    }
  };

  const connect = async (): Promise<{ success: boolean; message: string }> => {
    setIsConnecting(true);
    try {
      const result = await SqlClient.testConnection();
      if (!result.success) {
        setIsConnected(false);
        setLatency(result.latency);
        setLogs(SqlClient.getLogs());
        return result;
      }

      setIsConnected(true);
      setLatency(result.latency);

      try {
        await refreshMetrics();
        setLogs(SqlClient.getLogs());
        return result;
      } catch (metricsErr: any) {
        console.warn('Métricas diferidas pero conexión SQL establecida:', metricsErr);
        setIsConnected(true);
        setLogs(SqlClient.getLogs());
        return result;
      }
    } catch (err: any) {
      setIsConnected(false);
      return {
        success: false,
        message: err.message || 'Error de conexión',
      };
    } finally {
      setIsConnecting(false);
    }
  };

  const updateConfig = async (newConfig: Partial<SqlServerConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    await SqlClient.saveConfig(merged);
  };

  const clearLogs = () => {
    SqlClient.clearLogs();
    setLogs([]);
  };

  const resetDatabaseState = async () => {
    await SqlClient.resetAllConnectionState();
    const defaults = SqlClient.getDefaultConfig();
    setConfig(defaults);
    setMetrics(null);
    setIsConnected(false);
    setIsConnecting(false);
    setLatency(0);
    setLogs([]);
  };

  return (
    <DatabaseContext.Provider
      value={{
        config,
        metrics,
        isConnected,
        isConnecting,
        latency,
        logs,
        updateConfig,
        connect,
        refreshMetrics,
        clearLogs,
        resetDatabaseState,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = () => useContext(DatabaseContext);
