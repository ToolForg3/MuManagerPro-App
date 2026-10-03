import Constants from 'expo-constants';
import * as Application from 'expo-application';

export const APP_VERSION =
  Constants.expoConfig?.version ||
  Application.nativeApplicationVersion ||
  '2.4.9';

export const APP_BUILD =
  String(Constants.expoConfig?.android?.versionCode || '') ||
  Application.nativeBuildVersion ||
  '151';

export const APP_DISPLAY_VERSION = 'v' + APP_VERSION + ' (Build ' + APP_BUILD + ')';
export const PRODUCED_BY = 'ToolForg3';
export const TELEGRAM_URL = 'https://t.me/ToolForg3';
export const DISCORD_URL = 'https://discord.gg/4YXguuBFV';

