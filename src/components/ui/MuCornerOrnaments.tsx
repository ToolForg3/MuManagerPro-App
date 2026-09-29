import React from 'react';
import { View, Image, StyleSheet, StyleProp, ViewStyle } from 'react-native';

const cornerTopLeft = require('../../../assets/ui/stitch_assets/corner_tl.png');
const cornerTopRight = require('../../../assets/ui/stitch_assets/corner_tr.png');
const cornerBottomLeft = require('../../../assets/ui/stitch_assets/corner_bl.png');
const cornerBottomRight = require('../../../assets/ui/stitch_assets/corner_br.png');

export interface MuCornerOrnamentsProps {
  size?: number;
  offset?: number;
  style?: StyleProp<ViewStyle>;
}

export const MuCornerOrnaments: React.FC<MuCornerOrnamentsProps> = ({
  size = 14,
  offset = 0,
  style,
}) => {
  // Proportional shadow compensation so the solid lines of the 14x14 corners
  // align flush with the container's 1px border lines:
  const scale = size / 14;
  const leftAdj = Math.round(1 * scale);
  const rightAdj = Math.round(3 * scale);
  const bottomAdj = Math.round(4 * scale);

  return (
    <View style={[styles.container, style]} pointerEvents="none">
      <Image
        source={cornerTopLeft}
        style={[styles.corner, { top: offset, left: offset - leftAdj, width: size, height: size }]}
        resizeMode="contain"
      />
      <Image
        source={cornerTopRight}
        style={[styles.corner, { top: offset, right: offset - rightAdj, width: size, height: size }]}
        resizeMode="contain"
      />
      <Image
        source={cornerBottomLeft}
        style={[styles.corner, { bottom: offset - bottomAdj, left: offset - leftAdj, width: size, height: size }]}
        resizeMode="contain"
      />
      <Image
        source={cornerBottomRight}
        style={[styles.corner, { bottom: offset - bottomAdj, right: offset - rightAdj, width: size, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  corner: {
    position: 'absolute',
  },
});
