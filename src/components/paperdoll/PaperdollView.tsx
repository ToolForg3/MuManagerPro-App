import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { THEME } from '../../constants/theme';
import { PAPERDOLL_SLOTS, PaperdollSlotDefinition } from '../../constants/muConstants';
import { PaperdollSlot } from './PaperdollSlot';
import { ParsedItem } from '../../types/item';
import { Panel } from '../ui/Panel';
import { TituloSeccion } from '../ui/TituloSeccion';

interface PaperdollViewProps {
  items: ParsedItem[];
  onSlotPress: (slotDef: PaperdollSlotDefinition, item?: ParsedItem) => void;
}

export const PaperdollView: React.FC<PaperdollViewProps> = ({ items, onSlotPress }) => {
  const { width: windowWidth } = useWindowDimensions();
  // 4 columnas uniformes centradas dentro del panel
  const slotSize = Math.min(72, Math.max(58, Math.floor((windowWidth - 80) / 4)));

  const getItemAtSlot = (slotIndex: number) => {
    return items.find((i) => i.slot === slotIndex);
  };

  const getDef = (slotIndex: number) => {
    return PAPERDOLL_SLOTS.find((s) => s.slot === slotIndex)!;
  };

  return (
    <Panel style={styles.container}>
      <TituloSeccion titulo="EQUIPAMIENTO" />

      <View style={styles.gridContainer}>
        {/* Fila 1 (4x3): Pet (8), Pendiente (9), Casco (2), Alas (7) */}
        <View style={styles.row}>
          <PaperdollSlot
            definition={getDef(8)}
            item={getItemAtSlot(8)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(9)}
            item={getItemAtSlot(9)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(2)}
            item={getItemAtSlot(2)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(7)}
            item={getItemAtSlot(7)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
        </View>

        {/* Fila 2 (4x3): Arma 1 (0), Pechera (3), Pantalón (4), Arma 2 / Escudo (1) */}
        <View style={styles.row}>
          <PaperdollSlot
            definition={getDef(0)}
            item={getItemAtSlot(0)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(3)}
            item={getItemAtSlot(3)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(4)}
            item={getItemAtSlot(4)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(1)}
            item={getItemAtSlot(1)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
        </View>

        {/* Fila 3 (4x3): Anillo 1 (10), Guantes (5), Botas (6), Anillo 2 (11) */}
        <View style={styles.row}>
          <PaperdollSlot
            definition={getDef(10)}
            item={getItemAtSlot(10)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(5)}
            item={getItemAtSlot(5)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(6)}
            item={getItemAtSlot(6)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <PaperdollSlot
            definition={getDef(11)}
            item={getItemAtSlot(11)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
        </View>
      </View>
    </Panel>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: THEME.shapes.espaciadoBase,
    alignItems: 'center',
    paddingVertical: 12,
  },
  gridContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    paddingTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
});
