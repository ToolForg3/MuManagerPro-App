import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, Image, ImageBackground, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MuIcon, MuIconName } from '../ui/MuIcon';
import { MuCornerOrnaments } from '../ui/MuCornerOrnaments';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { useDatabase } from '../../context/DatabaseContext';
import { useLanguage } from '../../context/LanguageContext';
import { maskHost } from '../../services/maskUtils';

interface HeaderProps {
  title: string;
  subtitle?: string;
  showConnectionBadge?: boolean;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: {
    icon: MuIconName;
    onPress: () => void;
  };
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showConnectionBadge = true,
  showBack = false,
  onBack,
  rightAction,
}) => {
  const { isConnected, config } = useDatabase();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const isCompact = windowWidth < 385;
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );

  return (
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={[styles.container, { paddingTop: topInset + 8 }]}
      imageStyle={{ opacity: 0.35 }}
      resizeMode="repeat"
    >
      {/* Top Iron Rivets */}
      <View style={styles.topRivetRow}>
        <View style={styles.rivetDot} />
        <View style={styles.rivetDot} />
      </View>

      <View style={styles.mainRow}>
        <View style={styles.leftContainer}>
          {showBack && onBack && (
            <TouchableOpacity
              onPress={onBack}
              style={[styles.backButtonWrap, isCompact && { marginRight: 4 }]}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={t('back') || 'Atrás'}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <ImageBackground
                source={STITCH_ASSETS.buttons.small}
                resizeMode="stretch"
                style={[styles.backButtonFrame, isCompact && { paddingHorizontal: 6 }]}
              >
                <View style={styles.backButtonContent}>
                  <MuIcon name="arrow-left" size={13} color="#E4E2E0" containerStyle={{ marginRight: isCompact ? 0 : 3 }} />
                  {!isCompact && <Text style={styles.backButtonText}>{t('back') || 'Atrás'}</Text>}
                </View>
              </ImageBackground>
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: isCompact ? 6 : 8, minWidth: 0, flex: 1 }}>
              <View style={[styles.muLogoBox, isCompact && { width: 24, height: 24 }]}>
                <Image
                  source={require('../../../assets/ui/icons/mu_logo.png')}
                  style={[styles.muLogoImg, isCompact && { width: 22, height: 22 }]}
                  resizeMode="contain"
                />
              </View>
              <View style={{ flex: 1, minWidth: 0, justifyContent: 'center' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minWidth: 0, flexShrink: 1 }}>
                  <Text
                    style={[styles.title, isCompact && { fontSize: 13, letterSpacing: 0.3 }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {title}
                  </Text>
                  <View style={[styles.nativoBadge, isCompact && { paddingHorizontal: 4, paddingVertical: 1 }]}>
                    <Text style={[styles.nativoBadgeText, isCompact && { fontSize: 7.5 }]}>{t('native') || 'NATIVO'}</Text>
                  </View>
                </View>
                {subtitle && (
                  <Text style={[styles.subtitle, isCompact && { fontSize: 9.5 }]} numberOfLines={1} ellipsizeMode="tail">
                    {subtitle}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.rightContainer}>
          {showConnectionBadge && (
            <View style={[styles.badgeWrap, isCompact && { maxWidth: 105, height: 28 }]}>
              <ImageBackground
                source={STITCH_ASSETS.backgrounds.stone}
                resizeMode="repeat"
                style={[
                  styles.badgeFrame,
                  isConnected ? styles.badgeConnected : styles.badgeDisconnected,
                  isCompact && { paddingHorizontal: 5 },
                ]}
                imageStyle={{ opacity: 0.45, borderRadius: 2 }}
              >
                <View style={styles.badgeContent}>
                  <View style={[styles.jewelOrb, isConnected ? styles.jewelOrbConnected : styles.jewelOrbDisconnected, isCompact && { width: 8, height: 8, marginRight: 4 }]}>
                    <View style={styles.jewelGlance} />
                  </View>
                  <Text style={[styles.badgeText, isCompact && { fontSize: 9.5 }]} numberOfLines={1} ellipsizeMode="tail">
                    {isConnected ? (maskHost(config.host) || 'MU REALM') : (isCompact ? 'OFFLINE' : (t('noConnection') || 'SIN CONEXIÓN'))}
                  </Text>
                </View>
              </ImageBackground>
            </View>
          )}

          {rightAction && (
            rightAction.icon === 'refresh' ? (
              <TouchableOpacity
                style={[styles.refreshButtonWrap, (isCompact || (showConnectionBadge && windowWidth < 415)) && { minWidth: 32, width: 32, height: 28 }]}
                onPress={rightAction.onPress}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel={t('refresh') || 'Actualizar'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ImageBackground
                  source={STITCH_ASSETS.buttons.small}
                  resizeMode="stretch"
                  style={[styles.refreshButtonFrame, (isCompact || (showConnectionBadge && windowWidth < 415)) && { width: 32, height: 28, paddingHorizontal: 0 }]}
                >
                  <View style={styles.refreshButtonContent}>
                    <MuIcon
                      name="refresh"
                      size={12}
                      color="#EFD28D"
                      containerStyle={(isCompact || (showConnectionBadge && windowWidth < 415)) ? undefined : { marginRight: 4 }}
                    />
                    {!(isCompact || (showConnectionBadge && windowWidth < 415)) && (
                      <Text style={styles.refreshButtonText}>{t('refresh') || 'Actualizar'}</Text>
                    )}
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtnWrap, isCompact && { width: 28, height: 28 }]}
                onPress={rightAction.onPress}
                activeOpacity={0.82}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <ImageBackground
                  source={STITCH_ASSETS.buttons.small}
                  resizeMode="stretch"
                  style={[styles.actionBtnFrame, isCompact && { width: 28, height: 28 }]}
                >
                  <MuIcon name={rightAction.icon} size={15} color="#EFD28D" />
                </ImageBackground>
              </TouchableOpacity>
            )
          )}
        </View>
      </View>

      {/* Gold filigree bottom trim */}
      <Image
        source={STITCH_ASSETS.decorations.goldDividerLine}
        style={styles.goldBottomDivider}
        resizeMode="stretch"
      />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
    paddingBottom: 4,
    backgroundColor: '#111211',
    borderBottomWidth: 1.5,
    borderBottomColor: '#4C463A',
    position: 'relative',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.75,
    shadowRadius: 4,
  },
  topRivetRow: {
    position: 'absolute',
    top: 4,
    left: 12,
    right: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 1,
  },
  rivetDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#E0C380',
    borderWidth: 0.5,
    borderColor: '#4C463A',
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  leftContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  titleContainer: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: THEME.colors.oroClaro,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flexShrink: 1,
    minWidth: 0,
    ...THEME.effects.textShadow,
  },
  subtitle: {
    fontSize: 10.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...THEME.effects.textShadowSubtle,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  badgeWrap: {
    height: 32,
    maxWidth: 145,
  },
  badgeFrame: {
    flex: 1,
    borderRadius: 2,
    borderWidth: 1,
    paddingHorizontal: 8,
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  badgeConnected: {
    borderTopColor: '#2C8E5B',
    borderLeftColor: '#2C8E5B',
    borderBottomColor: '#103822',
    borderRightColor: '#103822',
    backgroundColor: 'rgba(20, 45, 30, 0.45)',
  },
  badgeDisconnected: {
    borderTopColor: '#933D35',
    borderLeftColor: '#933D35',
    borderBottomColor: '#451612',
    borderRightColor: '#451612',
    backgroundColor: 'rgba(50, 20, 20, 0.45)',
  },
  badgeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  jewelOrb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 6,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  jewelOrbConnected: {
    backgroundColor: THEME.colors.jade,
    borderColor: '#7AF5BA',
    shadowColor: THEME.colors.jade,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  jewelOrbDisconnected: {
    backgroundColor: THEME.colors.brasa,
    borderColor: '#FFA270',
    shadowColor: THEME.colors.brasa,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 4,
  },
  jewelGlance: {
    position: 'absolute',
    top: 1,
    left: 1,
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#FFFFFF',
    opacity: 0.8,
  },
  badgeText: {
    fontSize: 10,
    color: '#E4E2E0',
    fontWeight: '800',
    letterSpacing: 0.4,
    flexShrink: 1,
    ...THEME.effects.textShadowSubtle,
  },
  muLogoBox: {
    width: 34,
    height: 34,
    borderRadius: 2,
    backgroundColor: '#0A0B0A',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#202020',
    borderRightColor: '#202020',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#EFD28D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 2,
  },
  muLogoImg: {
    width: 24,
    height: 24,
  },
  nativoBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 2,
    backgroundColor: '#1E1F1E',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderBottomColor: '#202020',
    borderRightColor: '#202020',
    borderWidth: 1,
  },
  nativoBadgeText: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 9,
    fontWeight: '900',
    color: '#FEDF99',
    letterSpacing: 0.6,
    ...THEME.effects.textShadowSubtle,
  },
  goldBottomDivider: {
    width: '100%',
    height: 4,
    marginTop: 6,
    opacity: 0.9,
  },
  refreshButtonWrap: {
    height: 30,
    justifyContent: 'center',
  },
  refreshButtonFrame: {
    height: 30,
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 3,
  },
  refreshButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonText: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 11,
    fontWeight: '800',
    color: '#EFD28D',
    letterSpacing: 0.6,
    textAlign: 'center',
    ...THEME.effects.textShadow,
  },
  actionBtnWrap: {
    width: 32,
    height: 30,
    justifyContent: 'center',
  },
  actionBtnFrame: {
    width: 32,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 3,
  },
  backButtonWrap: {
    height: 30,
    marginRight: 8,
    justifyContent: 'center',
  },
  backButtonFrame: {
    height: 30,
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 2,
    elevation: 3,
  },
  backButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 11,
    fontWeight: '700',
    color: '#E4E2E0',
    letterSpacing: 0.5,
    textAlign: 'center',
    ...THEME.effects.textShadowSubtle,
  },
});
