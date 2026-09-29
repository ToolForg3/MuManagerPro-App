import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ImageBackground } from 'react-native';
import { THEME } from '../../constants/theme';
import { ParsedItem } from '../../types/item';
import { PaperdollSlotDefinition } from '../../constants/muConstants';
import { ItemImage } from '../common/ItemImage';

interface PaperdollSlotProps {
  definition: PaperdollSlotDefinition;
  item?: ParsedItem;
  onPress: (slotDef: PaperdollSlotDefinition, item?: ParsedItem) => void;
  width?: number;
  height?: number;
}

const slotBoxAsset = require('../../../assets/ui/mu_slot_box.png');

const SILHOUETTE_ASSETS: Record<number, any> = {
  0: require('../../../assets/ui/silhouettes/silhouette_weapon_l.png'),
  1: require('../../../assets/ui/silhouettes/silhouette_weapon_r.png'),
  2: require('../../../assets/ui/silhouettes/silhouette_helm.png'),
  3: require('../../../assets/ui/silhouettes/silhouette_armor.png'),
  4: require('../../../assets/ui/silhouettes/silhouette_pants.png'),
  5: require('../../../assets/ui/silhouettes/silhouette_gloves.png'),
  6: require('../../../assets/ui/silhouettes/silhouette_boots.png'),
  7: require('../../../assets/ui/silhouettes/silhouette_wings.png'),
  8: require('../../../assets/ui/silhouettes/silhouette_pet.png'),
  9: require('../../../assets/ui/silhouettes/silhouette_pendant.png'),
  10: require('../../../assets/ui/silhouettes/silhouette_ring.png'),
  11: require('../../../assets/ui/silhouettes/silhouette_ring.png'),
};

export const PaperdollSlot: React.FC<PaperdollSlotProps> = memo(({
  definition,
  item,
  onPress,
  width = 68,
  height = 68,
}) => {
  const isOccupied = !!item;

  const getItemBorderColor = () => {
    if (!item) return '#4C463A';
    if (item.isAncient) return THEME.colors.itemAncient;
    if (item.isExcellent) return THEME.colors.jade;
    if (item.sockets && item.sockets.some((s) => s !== 0xFF && s !== undefined)) return THEME.colors.arcano;
    if (item.level >= 13) return THEME.colors.oroClaro;
    if (item.option380) return THEME.colors.item380;
    if (item.harmonyType && item.harmonyType > 0) return THEME.colors.itemHarmony;
    return '#E0C380';
  };

  const silhouetteSource = SILHOUETTE_ASSETS[definition.slot];

  return (
    <TouchableOpacity
      style={[
        styles.slotContainer,
        {
          width,
          height,
          borderColor: getItemBorderColor(),
        },
      ]}
      onPress={() => onPress(definition, item)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${definition.name}${item ? `: ${item.name}` : ' (Vacío)'}`}
    >
      <ImageBackground
        source={slotBoxAsset}
        style={styles.slotBackground}
        resizeMode="stretch"
      >
        {isOccupied ? (
          <View style={styles.occupiedContent}>
            <ItemImage
              item={item}
              size={height * 0.52}
              fallbackIcon={(item.spriteKey as any) || 'shield-outline'}
              fallbackColor={getItemBorderColor()}
            />
            <Text style={[styles.itemName, { color: getItemBorderColor() }]} numberOfLines={1}>
              {item.name.split(' ')[0]}
            </Text>

            {/* Badge de Nivel */}
            {item.level > 0 && (
              <View style={[styles.levelBadge, { borderColor: getItemBorderColor() }]}>
                <Text style={styles.levelText}>+{item.level}</Text>
              </View>
            )}

            {/* Fila de Modificadores */}
            <View style={styles.modRow}>
              {item.luck && <Text style={styles.luckText}>L</Text>}
              {item.skill && <Text style={styles.skillText}>S</Text>}
              {item.option > 0 && <Text style={styles.optText}>+{item.option * 4}</Text>}
            </View>
          </View>
        ) : (
          /* Silueta de cliente MU Online auténtica en bajo relieve */
          <View style={styles.emptyContent}>
            {silhouetteSource ? (
              <Image
                source={silhouetteSource}
                style={[
                  styles.silhouetteImage,
                  {
                    maxWidth: width * 0.65,
                    maxHeight: height * 0.65,
                  },
                ]}
                resizeMode="contain"
              />
            ) : null}
            <Text style={styles.emptySlotLabel}>{definition.name.substring(0, 4)}</Text>
          </View>
        )}
      </ImageBackground>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  slotContainer: {
    borderWidth: 1.5,
    borderRadius: 2,
    margin: 3,
    overflow: 'hidden',
    backgroundColor: '#090A09',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.7,
    shadowRadius: 3,
    elevation: 4,
  },
  slotBackground: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  silhouetteImage: {
    opacity: 0.45,
  },
  emptySlotLabel: {
    fontSize: 8,
    color: '#8A7D6E',
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  occupiedContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    padding: 2,
  },
  itemName: {
    fontSize: 9,
    fontWeight: '800',
    marginTop: 2,
    textAlign: 'center',
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  levelBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(13, 14, 13, 0.92)',
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 2,
  },
  levelText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#E0C380',
  },
  modRow: {
    position: 'absolute',
    bottom: 2,
    left: 2,
    flexDirection: 'row',
    gap: 2,
  },
  luckText: {
    fontSize: 8,
    color: '#E0C380',
    fontWeight: '900',
  },
  skillText: {
    fontSize: 8,
    color: '#5B8DEF',
    fontWeight: '900',
  },
  optText: {
    fontSize: 8,
    color: '#3FCF8E',
    fontWeight: '900',
  },
});
