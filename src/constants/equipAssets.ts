import { ImageSourcePropType } from 'react-native';

/**
 * Texturas canónicas de siluetas de equipamiento extraídas directamente
 * del cliente MU Online Season 6 (Data/Interface/newui_item_*.OZT).
 * Mantienen transparencia nativa RGBA y proporciones canónicas del juego.
 */
export const EQUIP_SLOT_ASSETS: Record<number, ImageSourcePropType> = {
  0: require('../../assets/interface/equip/weapon_l.png'),
  1: require('../../assets/interface/equip/weapon_r.png'),
  2: require('../../assets/interface/equip/cap.png'),
  3: require('../../assets/interface/equip/upper.png'),
  4: require('../../assets/interface/equip/lower.png'),
  5: require('../../assets/interface/equip/gloves.png'),
  6: require('../../assets/interface/equip/boots.png'),
  7: require('../../assets/interface/equip/wing.png'),
  8: require('../../assets/interface/equip/fairy.png'),
  9: require('../../assets/interface/equip/necklace.png'),
  10: require('../../assets/interface/equip/ring.png'),
  11: require('../../assets/interface/equip/ring.png'),
};

export const INTERFACE_ASSETS = {
  zenCoin: require('../../assets/interface/money/zen_coin.png'),
  lockClosed: require('../../assets/interface/lock/lock_closed.png'),
  lockOpen: require('../../assets/interface/lock/lock_open.png'),
  pkBadge: require('../../assets/interface/pk/pk_badge.png'),
};
