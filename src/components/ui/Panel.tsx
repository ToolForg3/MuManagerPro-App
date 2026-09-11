import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { THEME } from '../../constants/theme';

export interface PanelProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  sinRemaches?: boolean;
  padding?: number;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  style,
  sinRemaches = false,
  padding = THEME.shapes.espaciadoBase,
}) => {
  return (
    <View style={[styles.container, { padding }, style]}>
      {!sinRemaches && (
        <>
          <View style={[styles.remache, styles.remacheTopLeft]}>
            <View style={styles.remacheBrillo} />
          </View>
          <View style={[styles.remache, styles.remacheTopRight]}>
            <View style={styles.remacheBrillo} />
          </View>
        </>
      )}
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: THEME.colors.superficie,
    borderColor: THEME.colors.borde,
    borderWidth: THEME.shapes.bordeAncho,
    borderRadius: THEME.shapes.radioEsquina,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 8,
  },
  remache: {
    position: 'absolute',
    top: 6,
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
    left: 6,
  },
  remacheTopRight: {
    right: 6,
  },
  remacheBrillo: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFF2C6',
  },
});
