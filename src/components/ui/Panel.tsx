import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, ImageBackground, Image } from 'react-native';
import { THEME } from '../../constants/theme';
import { MuCornerOrnaments } from './MuCornerOrnaments';

import { STITCH_ASSETS } from '../../constants/stitchAssets';

export interface PanelProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  sinRemaches?: boolean;
  conRemaches?: boolean;
  padding?: number;
  conDivisor?: boolean;
  conEsquineros?: boolean;
  sinEsquineros?: boolean;
  dorado?: boolean;
  tipo?: 'stone' | 'box' | 'gold';
  variant?: 'stone' | 'box' | 'gold';
}

const stoneBackAsset = require('../../../assets/ui/mu_stone_back.png');

export const Panel: React.FC<PanelProps> = ({
  children,
  style,
  contentStyle,
  sinRemaches = true,
  conRemaches = false,
  padding,
  conDivisor = false,
  conEsquineros = true,
  sinEsquineros = false,
  dorado = false,
  tipo = 'stone',
  variant,
}) => {
  const effectiveTipo = variant || tipo;
  const isGold = effectiveTipo === 'gold' || dorado;
  const flat = StyleSheet.flatten(style) || {};

  // Extract layout props for the outer container so margins and dimensions work
  const layoutStyle: ViewStyle = {
    margin: flat.margin,
    marginTop: flat.marginTop,
    marginBottom: flat.marginBottom,
    marginLeft: flat.marginLeft,
    marginRight: flat.marginRight,
    marginHorizontal: flat.marginHorizontal,
    marginVertical: flat.marginVertical,
    width: flat.width,
    height: flat.height,
    minHeight: flat.minHeight,
    maxHeight: flat.maxHeight,
    flex: flat.flex,
    flexGrow: flat.flexGrow,
    flexShrink: flat.flexShrink,
    alignSelf: flat.alignSelf,
  };

  // Content styles (padding, alignment)
  const defaultPadding = padding !== undefined ? padding : (flat.padding !== undefined ? flat.padding : 12);
  const innerContentStyle: ViewStyle = {
    padding: defaultPadding,
    paddingTop: flat.paddingTop !== undefined ? flat.paddingTop : flat.paddingVertical,
    paddingBottom: flat.paddingBottom !== undefined ? flat.paddingBottom : flat.paddingVertical,
    paddingLeft: flat.paddingLeft !== undefined ? flat.paddingLeft : flat.paddingHorizontal,
    paddingRight: flat.paddingRight !== undefined ? flat.paddingRight : flat.paddingHorizontal,
    justifyContent: flat.justifyContent,
    alignItems: flat.alignItems,
    flexDirection: flat.flexDirection,
  };

  // Remaches are only shown if explicitly asked for
  const showRemaches = conRemaches && !sinRemaches;
  const showEsquineros = conEsquineros && !sinEsquineros;

  return (
    <View
      style={[
        isGold
          ? styles.goldPanelContainer
          : effectiveTipo === 'box'
          ? styles.boxPanelContainer
          : styles.panelContainer,
        layoutStyle,
        contentStyle,
      ]}
    >
      <ImageBackground
        source={stoneBackAsset}
        style={[styles.innerStoneBg, innerContentStyle]}
        imageStyle={styles.stoneImage}
        resizeMode="repeat"
      >
        {/* Esquineros NewUI auténticos Season 6 */}
        {showEsquineros && <MuCornerOrnaments size={14} offset={0} />}

        {/* Remaches Season 6 solo si se solicitan explícitamente */}
        {showRemaches && (
          <>
            <View style={[styles.remache, styles.remacheTopLeft]}>
              <View style={styles.remacheBrillo} />
            </View>
            <View style={[styles.remache, styles.remacheTopRight]}>
              <View style={styles.remacheBrillo} />
            </View>
            <View style={[styles.remache, styles.remacheBottomLeft]}>
              <View style={styles.remacheBrillo} />
            </View>
            <View style={[styles.remache, styles.remacheBottomRight]}>
              <View style={styles.remacheBrillo} />
            </View>
          </>
        )}

        {/* Divisor ornamental dorado superior opcional */}
        {conDivisor && (
          <Image
            source={STITCH_ASSETS.decorations.goldDividerLine}
            style={styles.dividerGoldLine}
            resizeMode="stretch"
          />
        )}

        {children}
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  panelContainer: {
    backgroundColor: '#1F201F',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#28251E',
    borderRightColor: '#28251E',
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 2,
  },
  boxPanelContainer: {
    backgroundColor: '#181918',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#28251E',
    borderRightColor: '#28251E',
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 3,
  },
  goldPanelContainer: {
    backgroundColor: '#161715',
    borderTopColor: '#C4A65E',
    borderLeftColor: '#C4A65E',
    borderBottomColor: '#4A3C1E',
    borderRightColor: '#4A3C1E',
    borderWidth: 1,
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#C4A65E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  innerStoneBg: {
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  stoneImage: {
    opacity: 0.38,
  },
  dividerGoldLine: {
    width: '100%',
    height: 3,
    marginBottom: 8,
    opacity: 0.85,
  },
  dividerTop: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(224, 195, 128, 0.25)',
    marginBottom: 8,
  },
  remache: {
    position: 'absolute',
    width: THEME.shapes.remacheSize,
    height: THEME.shapes.remacheSize,
    borderRadius: THEME.shapes.remacheSize / 2,
    backgroundColor: THEME.colors.remache,
    borderColor: THEME.colors.remacheSombra,
    borderWidth: 0.5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  remacheTopLeft: {
    top: 4,
    left: 4,
  },
  remacheTopRight: {
    top: 4,
    right: 4,
  },
  remacheBottomLeft: {
    bottom: 4,
    left: 4,
  },
  remacheBottomRight: {
    bottom: 4,
    right: 4,
  },
  remacheBrillo: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFF2C6',
  },
});
