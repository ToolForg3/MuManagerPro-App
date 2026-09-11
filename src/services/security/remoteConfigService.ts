import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppUpdateInfo, BroadcastNoticeInfo, TelemetryPingResult } from '../database/sqlClient';

export interface RemoteConfigState {
  updateInfo: AppUpdateInfo | null;
  broadcast: BroadcastNoticeInfo | null;
  releaseChannel: 'STABLE' | 'BETA';
  betaStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  isUpdateVisible: boolean;
  isBroadcastVisible: boolean;
}

const DISMISSED_BROADCAST_KEY = '@mumanager_dismissed_broadcast_v1';

export class RemoteConfigService {
  private static updateInfo: AppUpdateInfo | null = null;
  private static broadcast: BroadcastNoticeInfo | null = null;
  private static releaseChannel: 'STABLE' | 'BETA' = 'STABLE';
  private static betaStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'NONE';
  private static isUpdateDismissed: boolean = false;
  private static dismissedUpdateVersion: string | null = null;
  private static dismissedBroadcastId: string | null = null;

  private static listeners: Array<(state: RemoteConfigState) => void> = [];

  static async initialize(): Promise<void> {
    try {
      this.dismissedBroadcastId = await AsyncStorage.getItem(DISMISSED_BROADCAST_KEY);
    } catch {
      this.dismissedBroadcastId = null;
    }
  }

  static handleTelemetryPingResult(res: TelemetryPingResult) {
    if (res.releaseChannel) {
      this.releaseChannel = res.releaseChannel;
    }
    if (res.betaStatus) {
      this.betaStatus = res.betaStatus;
    }

    if (res.updateInfo) {
      if (this.updateInfo?.latestVersion !== res.updateInfo.latestVersion) {
        if (this.dismissedUpdateVersion !== res.updateInfo.latestVersion) {
          this.isUpdateDismissed = false;
        }
      }
      this.updateInfo = res.updateInfo;
    }

    if (res.broadcast) {
      this.broadcast = res.broadcast;
    }

    this.notify();
  }

  static getReleaseChannel(): 'STABLE' | 'BETA' {
    return this.releaseChannel;
  }

  static getBetaStatus(): 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED' {
    return this.betaStatus;
  }

  static setLocalBetaStatus(status: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED') {
    this.betaStatus = status;
    this.notify();
  }

  static getUpdateInfo(): AppUpdateInfo | null {
    return this.updateInfo;
  }

  static getBroadcast(): BroadcastNoticeInfo | null {
    return this.broadcast;
  }

  static isUpdateVisible(): boolean {
    if (!this.updateInfo || !this.updateInfo.hasUpdate) return false;
    if (this.updateInfo.forceUpdate) return true;
    if (this.dismissedUpdateVersion === this.updateInfo.latestVersion) return false;
    return !this.isUpdateDismissed;
  }

  static dismissUpdate(): void {
    if (this.updateInfo && !this.updateInfo.forceUpdate) {
      this.isUpdateDismissed = true;
      this.dismissedUpdateVersion = this.updateInfo.latestVersion;
      this.notify();
    }
  }

  static isBroadcastVisible(): boolean {
    if (!this.broadcast || !this.broadcast.active) return false;
    if (this.broadcast.id && this.broadcast.id === this.dismissedBroadcastId) {
      return false;
    }
    return true;
  }

  static async dismissBroadcast(): Promise<void> {
    if (this.broadcast && this.broadcast.id) {
      this.dismissedBroadcastId = this.broadcast.id;
      try {
        await AsyncStorage.setItem(DISMISSED_BROADCAST_KEY, this.broadcast.id);
      } catch {}
      this.notify();
    }
  }

  static getState(): RemoteConfigState {
    return {
      updateInfo: this.updateInfo,
      broadcast: this.broadcast,
      releaseChannel: this.releaseChannel,
      betaStatus: this.betaStatus,
      isUpdateVisible: this.isUpdateVisible(),
      isBroadcastVisible: this.isBroadcastVisible(),
    };
  }

  static subscribe(fn: (state: RemoteConfigState) => void): () => void {
    this.listeners.push(fn);
    fn(this.getState());
    return () => {
      this.listeners = this.listeners.filter(l => l !== fn);
    };
  }

  private static notify() {
    const state = this.getState();
    this.listeners.forEach(fn => fn(state));
  }
}
