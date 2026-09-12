import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

export const PaperdollSlot: React.FC<PaperdollSlotProps> = memo(({
  definition,
  item,
  onPress,
  width = 68,
  height = 68,
}) => {
  const isOccupied = !!item;

  const getItemBorderColor = () => {
    if (!item) return THEME.colors.borde;
    if (item.isAncient) return THEME.colors.itemAncient;
    if (item.isExcellent) return THEME.colors.jade;
    if (item.sockets && item.sockets.some((s) => s !== 0xFF && s !== undefined)) return THEME.colors.arcano;
    if (item.level >= 13) return THEME.colors.oroClaro;
    if (item.option380) return THEME.colors.item380;
    if (item.harmonyType && item.harmonyType > 0) return THEME.colors.itemHarmony;
    return THEME.colors.oro;
  };

  const getItemGlowColor = () => {
    if (!item) return THEME.colors.casillaFondo;
    if (item.isAncient) return 'rgba(91, 141, 239, 0.15)';
    if (item.isExcellent) return 'rgba(63, 207, 142, 0.15)';
    if (item.level >= 13) return 'rgba(232, 200, 106, 0.18)';
    if (item.sockets && item.sockets.some((s) => s !== 0xFF && s !== undefined)) return 'rgba(91, 141, 239, 0.15)';
    return 'rgba(181, 143, 60, 0.12)';
  };

  // Silueta tallada en bajo relieve en piedra (MU Online clásico)
  const getSilhouetteIcon = () => {
    switch (definition.slot) {
      case 0: return 'sword';
      case 1: return 'shield';
      case 2: return 'crown';
      case 3: return 'shield-account';
      case 4: return 'hanger';
      case 5: return 'hand-front-right';
      case 6: return 'shoe-formal';
      case 7: return 'butterfly';
      case 8: return 'paw';
      case 9: return 'necklace';
      case 10:
      case 11: return 'ring';
      default: return definition.icon || 'shield-outline';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.slot,
        {
          width,
          height,
          borderColor: getItemBorderColor(),
          backgroundColor: getItemGlowColor(),
        },
      ]}
      onPress={() => onPress(definition, item)}
      activeOpacity={0.7}
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
        /* Silueta clásica tallada en piedra sin textos */
        <View style={styles.emptyContent}>
          <MaterialCommunityIcons
            name={getSilhouetteIcon() as any}
            size={height * 0.44}
            color="#282017"
            style={styles.silhouetteIcon}
          />
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  slot: {
    borderWidth: 1,
    borderRadius: THEME.shapes.radioEsquina,
    margin: 3,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: THEME.colors.casillaFondo,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  emptyContent: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouetteIcon: {
    textShadowColor: 'rgba(107, 85, 51, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
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
  },
  levelBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(16, 13, 11, 0.92)',
    borderWidth: 1,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 3,
  },
  levelText: {
    fontSize: 8,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
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
    color: THEME.colors.oroClaro,
    fontWeight: '900',
  },
  skillText: {
    fontSize: 8,
    color: THEME.colors.arcano,
    fontWeight: '900',
  },
  optText: {
    fontSize: 8,
    color: THEME.colors.jade,
    fontWeight: '900',
  },
});
