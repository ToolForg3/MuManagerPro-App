import React from 'react';
import { View, Text, StyleSheet, Image, ImageBackground, StyleProp, ViewStyle, TextStyle, TouchableOpacity } from 'react-native';
import { THEME } from '../../constants/theme';
import { MuIcon, MuIconName } from './MuIcon';

const headerAsset = require('../../../assets/ui/mu_window_header.png');
const goldDividerAsset = require('../../../assets/ui/mu_gold_divider.png');

import { STITCH_ASSETS } from '../../constants/stitchAssets';

export interface MuHeaderBannerProps {
  titulo?: string;
  title?: string;
  subtitulo?: string;
  subtitle?: string;
  conDivisor?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  height?: number;
  onBack?: () => void;
  showBack?: boolean;
  rightAction?: {
    icon: MuIconName | string;
    onPress: () => void;
  };
}

export const MuHeaderBanner: React.FC<MuHeaderBannerProps> = ({
  titulo,
  title,
  subtitulo,
  subtitle,
  conDivisor = false,
  style,
  textStyle,
  height = 42,
  onBack,
  showBack,
  rightAction,
}) => {
  const displayTitle = titulo || title || '';
  const displaySubtitle = subtitulo || subtitle;
  const shouldShowBack = showBack || !!onBack;

  return (
    <View style={[styles.wrapper, style]}>
      <View
        style={[styles.headerBg, { height }]}
      >
        <View style={styles.contentRow}>
          {shouldShowBack && onBack ? (
            <TouchableOpacity
              onPress={onBack}
              style={styles.actionBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MuIcon name="arrow-left" size={18} color={THEME.colors.oroClaro} />
            </TouchableOpacity>
          ) : (
            rightAction ? <View style={styles.actionBtnPlaceholder} /> : null
          )}

          <View style={styles.titleColumn}>
            <Text style={[styles.titulo, textStyle]} numberOfLines={1}>
              {displayTitle.toUpperCase()}
            </Text>
            {displaySubtitle ? (
              <Text style={styles.subtitulo} numberOfLines={1}>
                {displaySubtitle}
              </Text>
            ) : null}
          </View>

          {rightAction ? (
            <TouchableOpacity
              onPress={rightAction.onPress}
              style={styles.actionBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <MuIcon name={rightAction.icon as any} size={18} color={THEME.colors.oroClaro} />
            </TouchableOpacity>
          ) : (
            shouldShowBack ? <View style={styles.actionBtnPlaceholder} /> : null
          )}
        </View>
      </View>
      {conDivisor && (
        <Image
          source={STITCH_ASSETS.decorations.goldDividerLine}
          style={styles.dividerImage}
          resizeMode="stretch"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 4,
  },
  headerBg: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: '#1B1C1B',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: '#4C463A',
    borderBottomColor: '#4C463A',
    borderRadius: 2,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  contentRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPlaceholder: {
    width: 32,
    height: 32,
  },
  titulo: {
    color: THEME.colors.oroClaro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitulo: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 9,
    fontFamily: THEME.typography.fontBody,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 1,
  },
  dividerImage: {
    width: '100%',
    height: 3,
    marginTop: 4,
    opacity: 0.85,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(224, 195, 128, 0.25)',
    marginTop: 4,
  },
});
