import React from 'react';
import {
  ScrollView,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  StyleProp,
  ViewStyle,
  ImageBackground,
} from 'react-native';
import { THEME } from '../../constants/theme';

import { STITCH_ASSETS } from '../../constants/stitchAssets';

export interface PestanaItem {
  id: string;
  titulo: string;
  badge?: number | string;
}

export interface PestanasProps {
  pestanas: PestanaItem[];
  activaId: string;
  onSelect: (id: string) => void;
  style?: StyleProp<ViewStyle>;
}

export const Pestanas: React.FC<PestanasProps> = ({
  pestanas,
  activaId,
  onSelect,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pestanas.map((p) => {
          const isActiva = p.id === activaId;
          return (
            <TouchableOpacity
              key={p.id}
              style={styles.tabTouchable}
              onPress={() => onSelect(p.id)}
              activeOpacity={0.8}
            >
              <ImageBackground
                source={isActiva ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                style={styles.tabBackground}
                resizeMode="stretch"
              >
                <Text
                  style={[
                    styles.tabTexto,
                    isActiva ? styles.tabTextoActivo : styles.tabTextoInactivo,
                  ]}
                  numberOfLines={1}
                >
                  {p.titulo}
                </Text>
                {p.badge !== undefined && (
                  <View style={[styles.badge, isActiva && styles.badgeActivo]}>
                    <Text style={styles.badgeTexto}>{p.badge}</Text>
                  </View>
                )}
              </ImageBackground>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 54,
    borderBottomWidth: 1.5,
    borderBottomColor: '#4C463A',
    backgroundColor: '#131413',
  },
  scrollContent: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tabTouchable: {
    marginHorizontal: 3,
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 44,
  },
  tabBackground: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
  },
  tabTexto: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.4,
  },
  tabTextoActivo: {
    color: '#0D0E0D',
    fontWeight: '900',
  },
  tabTextoInactivo: {
    color: '#CDC6B9',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  badge: {
    marginLeft: 6,
    backgroundColor: 'rgba(13, 14, 13, 0.85)',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
  },
  badgeActivo: {
    borderColor: '#E0C380',
  },
  badgeTexto: {
    color: '#E4E2E0',
    fontSize: 11,
    fontWeight: '800',
  },
});
