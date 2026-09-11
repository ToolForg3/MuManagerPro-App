import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AdminLogEntry {
  action: string;
  detail?: string;
  timestamp: string;
}

const ADMIN_ACTION_LOG_KEY = '@mumanager_action_log';
const MAX_LOG_ENTRIES = 50;

/**
 * Registra una acción administrativa en el almacenamiento local persistente
 * Conserva un historial rotativo de hasta 50 entradas más recientes.
 */
export async function logAdminAction(action: string, detail?: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_ACTION_LOG_KEY);
    let logs: AdminLogEntry[] = [];
    if (raw) {
      try {
        logs = JSON.parse(raw);
        if (!Array.isArray(logs)) logs = [];
      } catch {
        logs = [];
      }
    }

    const newEntry: AdminLogEntry = {
      action: action.trim(),
      detail: detail ? detail.trim() : undefined,
      timestamp: new Date().toISOString(),
    };

    logs.unshift(newEntry);
    if (logs.length > MAX_LOG_ENTRIES) {
      logs = logs.slice(0, MAX_LOG_ENTRIES);
    }

    await AsyncStorage.setItem(ADMIN_ACTION_LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    console.warn('[adminLog] Error al registrar acción administrativa:', error);
  }
}

/**
 * Obtiene la lista completa de acciones administrativas registradas
 */
export async function getAdminLog(): Promise<AdminLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ADMIN_ACTION_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('[adminLog] Error al leer historial de acciones:', error);
    return [];
  }
}

/**
 * Limpia por completo el historial de acciones administrativas
 */
export async function clearAdminLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(ADMIN_ACTION_LOG_KEY);
  } catch (error) {
    console.warn('[adminLog] Error al limpiar historial de acciones:', error);
  }
}
