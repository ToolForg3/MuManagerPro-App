import React from 'react';
import { View, Text, StyleSheet, ImageBackground, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { MuIcon } from './MuIcon';
import { THEME } from '../../constants/theme';

export interface MuWindowProps {
  titulo?: string;
  subtitulo?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  onClose?: () => void;
  conPie?: boolean;
}

const winHeaderLeft = require('../../../assets/ui/window_pieces/win_header_left.png');
const winHeaderMid = require('../../../assets/ui/window_pieces/win_header_mid.png');
const winHeaderRight = require('../../../assets/ui/window_pieces/win_header_right.png');

const winFooterLeft = require('../../../assets/ui/window_pieces/win_footer_left.png');
const winFooterMid = require('../../../assets/ui/window_pieces/win_footer_mid.png');
const winFooterRight = require('../../../assets/ui/window_pieces/win_footer_right.png');

const stoneBackAsset = require('../../../assets/ui/mu_stone_back.png');
const goldDividerAsset = require('../../../assets/ui/mu_gold_divider.png');

export const MuWindow: React.FC<MuWindowProps> = ({
  titulo,
  subtitulo,
  children,
  style,
  contentStyle,
  onClose,
  conPie = true,
}) => {
  return (
    <View style={[styles.windowContainer, style]}>
      {/* Cabecera Gótica Sliced en 3 piezas (sin distorsión de esquinas) */}
      <View style={styles.headerRow}>
        <Image source={winHeaderLeft} style={styles.headerCap} resizeMode="stretch" />
        <Image source={winHeaderMid} style={styles.headerMid} resizeMode="stretch" />
        <Image source={winHeaderRight} style={styles.headerCap} resizeMode="stretch" />

        <View style={styles.headerTitleArea}>
          {titulo ? (
            <Text style={styles.headerTitle} numberOfLines={1}>
              {titulo.toUpperCase()}
            </Text>
          ) : null}
          {subtitulo ? (
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {subtitulo}
            </Text>
          ) : null}
        </View>

        {onClose && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Cerrar ventana"
          >
            <MuIcon name="close" size={16} color="#CDC6B9" />
          </TouchableOpacity>
        )}
      </View>

      {/* Cuerpo de Ventana Stitch Ironforge */}
      <ImageBackground
        source={stoneBackAsset}
        style={[styles.bodyBackground, contentStyle]}
        resizeMode="repeat"
        imageStyle={styles.bodyImage}
      >
        <View style={styles.dividerTop} />

        {children}
      </ImageBackground>

      {/* Pie Biselado Sliced en 3 piezas */}
      {conPie && (
        <View style={styles.footerRow}>
          <Image source={winFooterLeft} style={styles.footerCap} resizeMode="stretch" />
          <Image source={winFooterMid} style={styles.footerMid} resizeMode="stretch" />
          <Image source={winFooterRight} style={styles.footerCap} resizeMode="stretch" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  windowContainer: {
    backgroundColor: '#1F201F',
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
    borderLeftColor: '#4C463A',
    borderRightColor: '#0D0E0D',
    borderRadius: 2,
    overflow: 'hidden',
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.75,
    shadowRadius: 6,
    elevation: 6,
  },
  headerRow: {
    width: '100%',
    height: 48,
    flexDirection: 'row',
    position: 'relative',
    alignItems: 'center',
    backgroundColor: '#1B1C1B',
  },
  headerCap: {
    width: 36,
    height: 48,
  },
  headerMid: {
    flex: 1,
    height: 48,
  },
  headerTitleArea: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 44,
    zIndex: 2,
  },
  headerTitle: {
    color: '#E4E2E0',
    fontFamily: THEME.typography.fontTitle,
    fontWeight: '800',
    fontSize: 13.5,
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    color: '#E0C380',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginTop: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  bodyBackground: {
    width: '100%',
    padding: 12,
    backgroundColor: '#1F201F',
  },
  bodyImage: {
    opacity: 0.35,
  },
  dividerTop: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(224, 195, 128, 0.35)',
    marginBottom: 8,
  },
  footerRow: {
    width: '100%',
    height: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1C1B',
  },
  footerCap: {
    width: 36,
    height: 20,
  },
  footerMid: {
    flex: 1,
    height: 20,
  },
});
