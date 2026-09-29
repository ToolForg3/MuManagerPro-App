import React, { useState } from 'react';
import { View, Image, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { SqlClient } from '../../services/database/sqlClient';
import { getSkillById } from '../../constants/muSkills';
import { THEME } from '../../constants/theme';
import {
  SKILL_ASSET_IMAGES,
  SKILL_UNKNOWN_IMAGE,
  SKILL_CLEAN_ASSET_IMAGES,
  SKILL_CLEAN_UNKNOWN_IMAGE,
} from '../../constants/skillAssets';

interface SkillImageProps {
  skillId?: number;
  isEmpty?: boolean;
  size?: number; // Base width; height is calculated with authentic aspect ratio
  width?: number;
  height?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  showBorder?: boolean;
  isSelected?: boolean;
}

const DEFAULT_GATEWAY_URL = SqlClient.DEFAULT_CLOUD_GATEWAY;

export const getSkillImageUrl = (skillId: number): string => {
  let baseUrl = DEFAULT_GATEWAY_URL;
  try {
    const activeUrl = SqlClient.getBridgeUrl();
    if (activeUrl && activeUrl.startsWith('http')) {
      baseUrl = activeUrl;
    }
  } catch (_) {}

  return `${baseUrl}/api/skills/image/${skillId}`;
};

export const SkillImage: React.FC<SkillImageProps> = ({
  skillId = 0,
  isEmpty = false,
  size = 34,
  width: customWidth,
  height: customHeight,
  style,
  containerStyle,
  showBorder = true,
  isSelected = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const isSlotEmpty = isEmpty || skillId <= 0;

  // Proporciones auténticas del cliente Season 6:
  // - Con marco nativo (showBorder = true): 44 ancho x 56 alto (ratio 44:56)
  // - Limpio / sin marco (showBorder = false): 34 ancho x 44 alto (ratio 34:44)
  const finalWidth = customWidth || size;
  const finalHeight = customHeight || (
    showBorder
      ? Math.round(finalWidth * (56 / 44))
      : Math.round(finalWidth * (44 / 34))
  );

  // 1. RANURA VACÍA: Ranura de piedra sin habilidad equipada
  if (isSlotEmpty) {
    return (
      <View
        style={[
          styles.container,
          styles.emptySlot,
          { width: finalWidth, height: finalHeight },
          containerStyle,
        ]}
      >
        <View style={styles.emptySlotInner} />
      </View>
    );
  }

  // 2. HABILIDAD CON ASSET LOCAL
  const localSource = showBorder
    ? (SKILL_ASSET_IMAGES[skillId] || null)
    : (SKILL_CLEAN_ASSET_IMAGES[skillId] || null);

  const fallbackImage = showBorder ? SKILL_UNKNOWN_IMAGE : SKILL_CLEAN_UNKNOWN_IMAGE;
  const imageUrl = !localSource ? getSkillImageUrl(skillId) : null;

  return (
    <View
      style={[
        styles.container,
        {
          width: finalWidth,
          height: finalHeight,
        },
        isSelected && styles.selectedAura,
        containerStyle,
      ]}
    >
      {localSource ? (
        <Image
          source={localSource}
          style={[
            styles.image,
            { width: finalWidth, height: finalHeight },
            style,
          ]}
          resizeMode="contain"
        />
      ) : !hasError && imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            { width: finalWidth, height: finalHeight },
            style,
          ]}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      ) : (
        // 3. HABILIDAD CUYO RECURSO NO ESTÁ DISPONIBLE (Diferente de ranura vacía)
        <View style={[styles.missingAssetContainer, { width: finalWidth, height: finalHeight }]}>
          <Image
            source={fallbackImage}
            style={[
              styles.image,
              { width: finalWidth, height: finalHeight, opacity: 0.8 },
              style,
            ]}
            resizeMode="contain"
          />
          <View style={styles.missingBadge}>
            <View style={styles.missingDot} />
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  emptySlot: {
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: THEME.colors.casillaFondo,
    padding: 2,
  },
  emptySlotInner: {
    flex: 1,
    width: '100%',
    borderRadius: THEME.shapes.radioEsquina,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderStyle: 'dashed',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  missingAssetContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    borderWidth: 1,
    borderColor: THEME.colors.amber,
    borderRadius: THEME.shapes.radioEsquina,
    backgroundColor: 'rgba(13, 14, 13, 0.7)',
  },
  missingBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(20, 15, 10, 0.85)',
    borderRadius: THEME.shapes.radioEsquina,
    padding: 1,
  },
  missingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5, /* círculo funcional (width/2) */
    backgroundColor: THEME.colors.amber,
  },
  selectedAura: {
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 5,
    elevation: 8,
  },
  image: {
    backgroundColor: 'transparent',
  },
});
