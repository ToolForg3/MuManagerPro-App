import React from 'react';
import { View, StyleSheet, useWindowDimensions, Text, Image } from 'react-native';
import { THEME } from '../../constants/theme';
import { PAPERDOLL_SLOTS, PaperdollSlotDefinition } from '../../constants/muConstants';
import { PaperdollSlot } from './PaperdollSlot';
import { ParsedItem } from '../../types/item';
import { Panel } from '../ui/Panel';

interface PaperdollViewProps {
  items: ParsedItem[];
  onSlotPress: (slotDef: PaperdollSlotDefinition, item?: ParsedItem) => void;
}

const goldDividerAsset = require('../../../assets/ui/mu_gold_divider.png');

export const PaperdollView: React.FC<PaperdollViewProps> = ({ items, onSlotPress }) => {
  const { width: windowWidth } = useWindowDimensions();
  // Ergonomic slot size based on screen width
  const slotSize = Math.min(68, Math.max(54, Math.floor((windowWidth - 72) / 4)));

  const getItemAtSlot = (slotIndex: number) => {
    return items.find((i) => i.slot === slotIndex);
  };

  const getDef = (slotIndex: number) => {
    return PAPERDOLL_SLOTS.find((s) => s.slot === slotIndex)!;
  };

  return (
    <Panel tipo="gold" conEsquineros={true} style={styles.dollPanel} sinRemaches={true}>
      <View style={styles.headerArea}>
        <Text style={styles.headerTitle}>EQUIPAMIENTO</Text>
        <Image
          source={goldDividerAsset}
          style={styles.goldDivider}
          resizeMode="stretch"
        />
      </View>

      <View style={styles.dollContainer}>
        {/* Fila 1: [Pet 8] --- [Casco 2] --- [Alas 7] */}
        <View style={styles.row}>
          <PaperdollSlot
            definition={getDef(8)}
            item={getItemAtSlot(8)}
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

        {/* Fila 2 (Cuello): [Colgante 9] centrado */}
        <View style={styles.row}>
          <View style={{ width: slotSize, margin: 3 }} />
          <PaperdollSlot
            definition={getDef(9)}
            item={getItemAtSlot(9)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
          <View style={{ width: slotSize, margin: 3 }} />
        </View>

        {/* Fila 3 (Torso): [Arma L 0] --- [Pechera 3] --- [Arma R / Escudo 1] */}
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
            definition={getDef(1)}
            item={getItemAtSlot(1)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
        </View>

        {/* Fila 4 (Extremidades Superiores): [Guantes 5] --- [Pantalón 4] --- [Anillo 1 (10)] */}
        <View style={styles.row}>
          <PaperdollSlot
            definition={getDef(5)}
            item={getItemAtSlot(5)}
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
            definition={getDef(10)}
            item={getItemAtSlot(10)}
            onPress={onSlotPress}
            width={slotSize}
            height={slotSize}
          />
        </View>

        {/* Fila 5 (Extremidades Inferiores): [Anillo 2 (11)] --- [Botas 6] --- [Espacio] */}
        <View style={styles.row}>
          <PaperdollSlot
            definition={getDef(11)}
            item={getItemAtSlot(11)}
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
          <View style={{ width: slotSize, margin: 3 }} />
        </View>
      </View>
    </Panel>
  );
};

const styles = StyleSheet.create({
  dollPanel: {
    marginVertical: 8,
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerTitle: {
    color: '#E4E2E0',
    fontFamily: THEME.typography.fontTitle,
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 1,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  goldDivider: {
    width: '100%',
    height: 2,
    marginBottom: 4,
  },
  dollContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
