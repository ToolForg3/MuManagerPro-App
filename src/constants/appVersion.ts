import Constants from 'expo-constants';
import * as Application from 'expo-application';

export const APP_VERSION =
  Constants.expoConfig?.version ||
  Application.nativeApplicationVersion ||
  '1.8.3';

export const APP_BUILD =
  String(Constants.expoConfig?.android?.versionCode || '') ||
  Application.nativeBuildVersion ||
  '85';

export const APP_DISPLAY_VERSION = 'v' + APP_VERSION + ' (Build ' + APP_BUILD + ')';
export const PRODUCED_BY = 'ToolForg3';
export const TELEGRAM_URL = 'https://t.me/ToolForg3';

