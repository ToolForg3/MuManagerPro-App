import React, { useMemo, memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { THEME } from '../../constants/theme';
import { ParsedItem } from '../../types/item';
import { ItemImage } from '../common/ItemImage';

interface InventoryGridProps {
  startSlot: number;
  rows?: number;
  cols?: number;
  items: ParsedItem[];
  onSlotPress: (slotIndex: number, item?: ParsedItem) => void;
  movingSlot?: number | null;
}

export const InventoryGrid: React.FC<InventoryGridProps> = memo(({
  startSlot,
  rows = 4,
  cols = 8,
  items,
  onSlotPress,
  movingSlot,
}) => {
  const { width: windowWidth } = useWindowDimensions();
  // Ensure the grid fits comfortably on mobile screens
  const availableWidth = Math.min(windowWidth - 24, 380);
  const cellSize = Math.floor((availableWidth - 16) / cols);
  const totalSlots = rows * cols;
  const gridWidth = cellSize * cols;
  const gridHeight = cellSize * rows;

  const getRarityColor = (item: ParsedItem) => {
    if (item.isAncient) return THEME.colors.itemAncient;
    if (item.isExcellent) return THEME.colors.itemExcellent;
    if (item.sockets && item.sockets.some((s) => s !== 0xFF && s !== undefined)) return THEME.colors.itemSocket;
    if (item.level >= 13) return THEME.colors.itemPlus15;
    if (item.option380) return THEME.colors.item380;
    if (item.harmonyType && item.harmonyType > 0) return THEME.colors.itemHarmony;
    return THEME.colors.itemNormal;
  };

  // Mapeo de ocupación multi-slot
  const { occupiedSet, gridItems } = useMemo(() => {
    const occupied = new Set<number>();
    const activeItems: {
      item: ParsedItem;
      col: number;
      row: number;
      w: number;
      h: number;
    }[] = [];

    // Filtrar ítems que caen dentro del rango de este grid
    const relevantItems = items.filter(
      (it) => it.slot >= startSlot && it.slot < startSlot + totalSlots
    );

    for (const item of relevantItems) {
      const relSlot = item.slot - startSlot;
      const col = relSlot % cols;
      const row = Math.floor(relSlot / cols);
      const w = Math.max(1, Math.min(cols - col, item.width || 1));
      const h = Math.max(1, Math.min(rows - row, item.height || 1));

      // Marcar todas las celdas cubiertas
      for (let r = 0; r < h; r++) {
        for (let c = 0; c < w; c++) {
          const coveredRel = (row + r) * cols + (col + c);
          occupied.add(coveredRel);
        }
      }

      activeItems.push({ item, col, row, w, h });
    }

    return { occupiedSet: occupied, gridItems: activeItems };
  }, [items, startSlot, totalSlots, cols, rows]);

  const isMoving = movingSlot !== undefined && movingSlot !== null;

  // Celdas de fondo: slots vacíos interactivos o celdas ocupadas pasivas
  const renderBackgroundCells = () => {
    const cells = [];
    for (let i = 0; i < totalSlots; i++) {
      const globalSlot = startSlot + i;
      const isOccupied = occupiedSet.has(i);

      if (isOccupied) {
        // Celda cubierta por un ítem multi-slot: celda de fondo pasiva
        cells.push(
          <View
            key={`bg_occ_${globalSlot}`}
            style={[styles.occupiedCellBg, { width: cellSize, height: cellSize }]}
          />
        );
      } else {
        // Slot realmente vacío: botón interactivo para abrir selector o reubicar ítem
        cells.push(
          <TouchableOpacity
            key={`bg_empty_${globalSlot}`}
            style={[
              styles.emptyCell,
              { width: cellSize, height: cellSize },
              isMoving && styles.emptyCellMovingTarget,
            ]}
            onPress={() => onSlotPress(globalSlot, undefined)}
            activeOpacity={0.7}
          >
            <Text style={[styles.slotIndexText, isMoving && styles.slotIndexMoving]}>
              {isMoving ? '+' : i + 1}
            </Text>
          </TouchableOpacity>
        );
      }
    }
    return cells;
  };

  // Ítems superpuestos abarcando sus dimensiones reales (Multi-Slot Cards)
  const renderOverlaidItems = () => {
    return gridItems.map(({ item, col, row, w, h }) => {
      const rarityColor = getRarityColor(item);
      const isThisMoving = isMoving && item.slot === movingSlot;
      const cardBorderColor = isThisMoving ? '#FFD700' : rarityColor;
      const cardBg = isThisMoving ? 'rgba(255, 215, 0, 0.35)' : `${rarityColor}1F`;
      const cardBorderWidth = isThisMoving ? 2 : 1.5;

      const cardWidth = w * cellSize - 2;
      const cardHeight = h * cellSize - 2;
      const cardLeft = col * cellSize + 1;
      const cardTop = row * cellSize + 1;

      // Calcular tamaño del sprite escalado proporcionalmente a la caja multi-slot
      const imageSize = Math.max(
        cellSize * 0.72,
        Math.min(cardWidth * 0.85, cardHeight * 0.85)
      );

      return (
        <TouchableOpacity
          key={`multi_item_${item.slot}`}
          style={[
            styles.multiSlotCard,
            {
              left: cardLeft,
              top: cardTop,
              width: cardWidth,
              height: cardHeight,
              borderColor: cardBorderColor,
              borderWidth: cardBorderWidth,
              backgroundColor: cardBg,
            },
          ]}
          onPress={() => onSlotPress(item.slot, item)}
          activeOpacity={0.75}
        >
          {/* Sprite del ítem */}
          <ItemImage
            item={item}
            size={imageSize}
            fallbackColor={cardBorderColor}
          />

          {/* Badges de nivel y rareza */}
          {item.level > 0 && (
            <View style={[styles.levelBadgeContainer, { borderColor: cardBorderColor }]}>
              <Text style={[styles.levelBadgeText, { color: rarityColor }]}>
                +{item.level}
              </Text>
            </View>
          )}

          {/* Indicador de Ítem Seleccionado para Mover */}
          {isThisMoving && (
            <View style={styles.movingBadge}>
              <Text style={styles.movingBadgeText}>MOVIENDO</Text>
            </View>
          )}

          {/* Indicadores en esquina superior */}
          {!isThisMoving && (
            <View style={styles.topBadgeRow}>
              {item.isAncient && (
                <View style={[styles.miniDot, { backgroundColor: THEME.colors.itemAncient }]} />
              )}
              {item.isExcellent && (
                <View style={[styles.miniDot, { backgroundColor: THEME.colors.itemExcellent }]} />
              )}
              {item.option380 && (
                <View style={[styles.miniDot, { backgroundColor: THEME.colors.item380 }]} />
              )}
            </View>
          )}
        </TouchableOpacity>
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={[styles.gridContainer, { width: gridWidth, height: gridHeight }]}>
        {/* Capa de fondo con cuadrícula */}
        <View style={[styles.gridBackground, { width: gridWidth, height: gridHeight }]}>
          {renderBackgroundCells()}
        </View>

        {/* Capa de ítems multi-slot superpuestos */}
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          {renderOverlaidItems()}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: THEME.colors.superficie,
    padding: 7,
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1.5,
    borderColor: THEME.colors.borde,
    alignSelf: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  gridContainer: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: THEME.colors.casillaFondo,
  },
  gridBackground: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 0.5,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCellMovingTarget: {
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(232, 200, 106, 0.18)',
  },
  occupiedCellBg: {
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 0.5,
    borderColor: 'rgba(107, 85, 51, 0.4)',
  },
  slotIndexText: {
    fontSize: 8,
    color: THEME.colors.textoSecundario,
    fontWeight: '700',
  },
  slotIndexMoving: {
    color: THEME.colors.oroClaro,
    fontSize: 10,
    fontWeight: '900',
  },
  movingBadge: {
    position: 'absolute',
    top: 2,
    backgroundColor: THEME.colors.oroClaro,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  movingBadgeText: {
    fontSize: 7,
    fontWeight: '900',
    color: THEME.colors.textoOscuro,
    letterSpacing: 0.4,
  },
  multiSlotCard: {
    position: 'absolute',
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
    elevation: 4,
  },
  levelBadgeContainer: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    backgroundColor: 'rgba(7, 10, 15, 0.88)',
    borderWidth: 0.8,
    paddingHorizontal: 3,
    paddingVertical: 0.5,
    borderRadius: 3,
  },
  levelBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  topBadgeRow: {
    position: 'absolute',
    top: 2,
    right: 2,
    flexDirection: 'row',
    gap: 3,
  },
  miniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
