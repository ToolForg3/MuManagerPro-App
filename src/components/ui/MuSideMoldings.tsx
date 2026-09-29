import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';

const sideAsset = require('../../../assets/ui/mu_window_side.png');

export interface MuSideMoldingsProps {
  width?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}

export const MuSideMoldings: React.FC<MuSideMoldingsProps> = () => {
  // En Stitch Ironforge las molduras laterales de piedra pesada se omiten para evitar recortes horizontales
  return null;
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99,
  },
  sideLeft: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    height: '100%',
  },
  sideRight: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    height: '100%',
  },
});
