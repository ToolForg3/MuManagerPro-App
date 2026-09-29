import React from 'react';
import { Image, ImageStyle, StyleProp, View, ViewStyle, StyleSheet } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

export type MuIconName = string;

export interface MuIconProps {
  name: MuIconName;
  size?: number;
  color?: string;
  forceTint?: boolean;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

// Map to MaterialIcons glyphs
const MATERIAL_ICONS_MAP: Record<string, string> = {
  'home': 'home',
  'person': 'person',
  'user': 'person',
  'account-box': 'account-box',
  'person-add': 'person-add',
  'person_add': 'person-add',
  'user-plus': 'person-add',
  'account-plus': 'person-add',
  'search': 'search',
  'user-search': 'search',
  'groups': 'groups',
  'group': 'groups',
  'users': 'groups',
  'settings': 'settings',
  'tune': 'tune',
  'adjust': 'tune',
  'shield': 'shield',
  'security': 'shield',
  'build': 'build',
  'tools': 'build',
  'wrench': 'build',
  'construction': 'build',
  'military-tech': 'military-tech',
  'military_tech': 'military-tech',
  'trophy': 'military-tech',
  'card-giftcard': 'card-giftcard',
  'card_giftcard': 'card-giftcard',
  'admin-panel-settings': 'admin-panel-settings',
  'admin_panel_settings': 'admin-panel-settings',
  'manage-accounts': 'manage-accounts',
  'manage_accounts': 'manage-accounts',
  'lock': 'lock',
  'lock-open': 'lock-open',
  'lock_open': 'lock-open',
  'lock-outline': 'lock-outline',
  'lock-person': 'lock-person',
  'lock_person': 'lock-person',
  'visibility': 'visibility',
  'visibility-off': 'visibility-off',
  'visibility_off': 'visibility-off',
  'storage': 'storage',
  'refresh': 'refresh',
  'sync': 'refresh',
  'reload': 'refresh',
  'edit': 'edit',
  'pencil': 'edit',
  'delete': 'delete',
  'trash': 'delete',
  'trash-can': 'delete',
  'close': 'close',
  'cancel': 'close',
  'check': 'check',
  'check-circle': 'check-circle',
  'arrow-left': 'arrow-back',
  'arrow_left': 'arrow-back',
  'chevron-left': 'chevron-left',
  'arrow-right': 'arrow-forward',
  'arrow_right': 'arrow-forward',
  'chevron-right': 'chevron-right',
  'arrow-up': 'arrow-upward',
  'arrow_up': 'arrow-upward',
  'chevron-up': 'expand-less',
  'arrow-down': 'arrow-downward',
  'arrow_down': 'arrow-downward',
  'chevron-down': 'expand-more',
  'copy': 'content-copy',
  'content-copy': 'content-copy',
  'inventory': 'inventory',
  'inventory_2': 'inventory',
  'notifications': 'notifications',
  'bell': 'notifications',
  'clear': 'clear-all',
  'broom': 'clear-all',
  'download': 'file-download',
  'upload': 'file-upload',
  'server': 'dns',
  'location': 'place',
  'place': 'place',
  'plus': 'add',
  'add': 'add',
  'save': 'save',
  'content-save': 'save',
  'help': 'help-outline',
  'info': 'info-outline',
  'filter': 'filter-list',
  'crop-free': 'crop-free',
  'crop_free': 'crop-free',
  'grid-view': 'grid-view',
  'grid_view': 'grid-view',
  'touch-app': 'touch-app',
  'touch_app': 'touch-app',
  'smart-button': 'smart-button',
  'smart_button': 'smart-button',
  'send': 'send',
};

// Map to MaterialCommunityIcons glyphs
const MATERIAL_COMMUNITY_MAP: Record<string, string> = {
  'account': 'account',
  'account-alert': 'account-alert',
  'account-cancel': 'account-cancel',
  'account-group': 'account-group',
  'account-lock': 'account-lock',
  'account-multiple': 'account-multiple',
  'account-off': 'account-off',
  'account-question': 'account-question',
  'account-search': 'account-search',
  'community': 'account-group',
  'cog': 'cog',
  'magnify': 'magnify',
  'eye': 'eye',
  'eye-off': 'eye-off',
  'eye-outline': 'eye-outline',
  'eye-off-outline': 'eye-off-outline',
  'crown': 'crown',
  'character': 'shield-account',
  'helmet': 'shield-account',
  'sword': 'sword',
  'sword-cross': 'sword-cross',
  'bow': 'bow-arrow',
  'bow-arrow': 'bow-arrow',
  'staff': 'wizard-hat',
  'magic-staff': 'wizard-hat',
  'pk': 'skull',
  'skull': 'skull',
  'fire': 'fire',
  'lightning': 'lightning-bolt',
  'lightning-bolt': 'lightning-bolt',
  'flash': 'flash',
  'coins': 'cash-multiple',
  'cash': 'cash-multiple',
  'cash-multiple': 'cash-multiple',
  'zen': 'cash-multiple',
  'ruud': 'diamond-stone',
  'gem': 'diamond-stone',
  'diamond': 'diamond-stone',
  'diamond-stone': 'diamond-stone',
  'chest': 'treasure-chest',
  'treasure-chest': 'treasure-chest',
  'vault': 'safe',
  'safe': 'safe',
  'package': 'package-variant-closed',
  'package-variant-closed': 'package-variant-closed',
  'whatsapp': 'whatsapp',
  'brand_whatsapp': 'whatsapp',
  'telegram': 'telegram',
  'brand_telegram': 'telegram',
  'google': 'google',
  'brand_google': 'google',
  'shield-check': 'shield-check',
  'shield-alert': 'shield-alert',
  'shield-alert-outline': 'shield-alert-outline',
  'shield-remove': 'shield-remove',
  'shield-account': 'shield-account',
  'shield-search': 'shield-search',
  'shield-crown': 'shield-crown',
  'shield-star': 'shield-star',
  'guild': 'shield-star',
  'texture': 'texture-box',
  'mail': 'email-outline',
  'email-outline': 'email-outline',
  'email-check': 'email-check',
  'email-check-outline': 'email-check-outline',
  'cellphone': 'cellphone',
  'cellphone-lock': 'cellphone-lock',
  'cellphone-key': 'cellphone-key',
  'cellphone-wireless': 'cellphone-wireless',
  'checkbox-marked': 'checkbox-marked',
  'checkbox-blank-outline': 'checkbox-blank-outline',
  'check-square': 'checkbox-marked',
  'square': 'square-outline',
  'square-outline': 'square-outline',
  'database-check': 'database-check',
  'database-off': 'database-off',
  'database-sync': 'database-sync',
  'cloud-download': 'cloud-download',
  'cloud-upload': 'cloud-upload',
  'cloud-upload-outline': 'cloud-upload-outline',
  'check-decagram': 'check-decagram',
  'flask-round-bottom': 'flask-round-bottom',
  'flask-outline': 'flask-outline',
  'clock-outline': 'clock-outline',
  'star-circle': 'star-circle',
  'plus-circle': 'plus-circle',
  'plus-circle-outline': 'plus-circle-outline',
  'close-circle': 'close-circle',
  'lock-open-outline': 'lock-open-outline',
  'lock-check-outline': 'lock-check-outline',
  'gift': 'gift',
  'gift-outline': 'gift-outline',
  'chart-bar': 'chart-bar',
  'hand-coin': 'hand-coin',
  'sack': 'sack',
  'scale-balance': 'scale-balance',
  'map-marker': 'map-marker',
  'map-marker-path': 'map-marker-path',
  'code-braces': 'code-braces',
  'code-tags': 'code-tags',
  'console-network': 'console-network',
  'ip-network': 'ip-network',
  'key-plus': 'key-plus',
  'power-plug-off': 'power-plug-off',
  'file-cog-outline': 'file-cog-outline',
  'file-document-outline': 'file-document-outline',
  'hexagon-multiple': 'hexagon-multiple',
  'hexagon-multiple-outline': 'hexagon-multiple-outline',
  'book-open-blank-variant': 'book-open-blank-variant',
  'book-open-page-variant': 'book-open-page-variant',
  'anvil': 'anvil',
  'alert-circle-outline': 'alert-circle-outline',
  'zap': 'lightning-bolt',
  'bolt': 'lightning-bolt',
  'log-in': 'login',
  'login': 'login',
  'log-out': 'logout',
  'logout': 'logout',
  'fire-spread': 'fire',
  'vampire': 'skull',
  'weather-dust': 'weather-fog',
  'user-plus': 'account-plus',
  'user-check': 'account-check',
  'user-remove': 'account-remove',
  'user-x': 'account-remove',
  'user-minus': 'account-minus',
  'lock-closed': 'lock',
  'alert-triangle': 'alert',
  'x': 'close',
  'trash': 'trash-can',
  'user': 'account',
  'location': 'map-marker',
};

// Authentic MU Online game assets that require original textured PNGs
const ASSET_SOURCES: Record<string, any> = {
  'logo': require('../../../assets/ui/icons/mu_logo.png'),
  'mu_logo': require('../../../assets/ui/icons/mu_logo.png'),
  'jewels': require('../../../assets/ui/icons/mu_jewels.png'),
  'raw_character': require('../../../assets/ui/icons/mu_character.png'),
  'raw_sword': require('../../../assets/ui/icons/mu_sword.png'),
  'raw_shield': require('../../../assets/ui/icons/mu_shield.png'),
  'raw_chest': require('../../../assets/ui/icons/mu_chest.png'),
  'raw_vault': require('../../../assets/ui/icons/mu_vault.png'),
};

const isMciGlyph = (key: string): boolean => {
  try {
    const map = (MaterialCommunityIcons as any)?.glyphMap;
    return Boolean(map && map[key] !== undefined);
  } catch {
    return false;
  }
};

const isMiGlyph = (key: string): boolean => {
  try {
    const map = (MaterialIcons as any)?.glyphMap;
    return Boolean(map && map[key] !== undefined);
  } catch {
    return false;
  }
};

export const MuIcon: React.FC<MuIconProps> = ({
  name,
  size = 20,
  color = '#E0C380',
  forceTint = false,
  style,
  containerStyle,
}) => {
  const normalizedKey = (name || '').toLowerCase().trim();

  // 1. Direct game asset texture check (Logo, Joyas nativas)
  if (ASSET_SOURCES[normalizedKey]) {
    return (
      <View style={[styles.container, { width: size, height: size }, containerStyle]}>
        <Image
          source={ASSET_SOURCES[normalizedKey]}
          style={[
            { width: size, height: size },
            forceTint && color ? { tintColor: color } : null,
            style,
          ]}
          resizeMode="contain"
        />
      </View>
    );
  }

  // 2. Explicit MaterialIcons mapped override
  const miGlyph = MATERIAL_ICONS_MAP[normalizedKey];
  if (miGlyph) {
    return (
      <View style={[styles.container, { width: size, height: size }, containerStyle]}>
        <MaterialIcons
          name={miGlyph as any}
          size={size}
          color={color}
          style={style as any}
        />
      </View>
    );
  }

  // 3. Explicit MaterialCommunityIcons mapped override
  const mciGlyph = MATERIAL_COMMUNITY_MAP[normalizedKey];
  if (mciGlyph) {
    return (
      <View style={[styles.container, { width: size, height: size }, containerStyle]}>
        <MaterialCommunityIcons
          name={mciGlyph as any}
          size={size}
          color={color}
          style={style as any}
        />
      </View>
    );
  }

  // 4. Dynamic check on MaterialCommunityIcons
  if (isMciGlyph(normalizedKey)) {
    return (
      <View style={[styles.container, { width: size, height: size }, containerStyle]}>
        <MaterialCommunityIcons
          name={normalizedKey as any}
          size={size}
          color={color}
          style={style as any}
        />
      </View>
    );
  }

  // 5. Dynamic check on MaterialIcons
  if (isMiGlyph(normalizedKey)) {
    return (
      <View style={[styles.container, { width: size, height: size }, containerStyle]}>
        <MaterialIcons
          name={normalizedKey as any}
          size={size}
          color={color}
          style={style as any}
        />
      </View>
    );
  }

  // 6. Intelligent heuristic fallback
  if (normalizedKey.includes('-outline') || normalizedKey.includes('-box') || normalizedKey.includes('-circle')) {
    return (
      <View style={[styles.container, { width: size, height: size }, containerStyle]}>
        <MaterialCommunityIcons
          name={normalizedKey as any}
          size={size}
          color={color}
          style={style as any}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }, containerStyle]}>
      <MaterialIcons
        name={normalizedKey as any}
        size={size}
        color={color}
        style={style as any}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
});
