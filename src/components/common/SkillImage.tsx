import React, { useState } from 'react';
import { View, Image, StyleSheet, StyleProp, ImageStyle, ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SqlClient } from '../../services/database/sqlClient';
import { getSkillById } from '../../constants/muSkills';
import { THEME } from '../../constants/theme';

interface SkillImageProps {
  skillId: number;
  size?: number;
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
  skillId,
  size = 32,
  style,
  containerStyle,
  showBorder = true,
  isSelected = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const skillDef = getSkillById(skillId);

  const fallbackIcon = (skillDef?.icon || 'star') as any;

  // Frame colors based on skill category
  let borderColor = THEME.colors.borde;
  let bgColor = THEME.colors.casillaFondo;
  if (skillDef?.category === 'Magia') {
    borderColor = THEME.colors.arcano;
  } else if (skillDef?.category === 'Buff') {
    borderColor = THEME.colors.jade;
  } else if (skillDef?.category === 'Invocación') {
    borderColor = THEME.colors.oroClaro;
  } else if (skillDef?.category === 'Especial') {
    borderColor = THEME.colors.brasa;
  }

  // Si está seleccionado (como en la barra de MU Online), resaltar con marco dorado brillante
  if (isSelected) {
    borderColor = THEME.colors.oroClaro;
  }

  const imageUrl = getSkillImageUrl(skillId);
  const borderThickness = isSelected ? 2 : 1.5;

  return (
    <View
      style={[
        styles.container,
        {
          width: size + (showBorder ? borderThickness * 2 : 0),
          height: size + (showBorder ? borderThickness * 2 : 0),
          borderRadius: 2,
          backgroundColor: bgColor,
          borderColor: showBorder ? borderColor : 'transparent',
          borderWidth: showBorder ? borderThickness : 0,
        },
        isSelected && styles.selectedGlow,
        containerStyle,
      ]}
    >
      {!hasError && imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: 1 },
            style,
          ]}
          resizeMode="cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={[styles.fallbackWrapper, { width: size, height: size }]}>
          <MaterialCommunityIcons
            name={fallbackIcon}
            size={Math.max(16, Math.floor(size * 0.65))}
            color={borderColor}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 4,
    borderRadius: THEME.shapes.radioEsquina,
    borderColor: THEME.colors.borde,
    backgroundColor: THEME.colors.casillaFondo,
  },
  selectedGlow: {
    borderColor: THEME.colors.oroClaro,
    shadowColor: THEME.colors.oroClaro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 8,
  },
  image: {
    backgroundColor: THEME.colors.casillaFondo,
  },
  fallbackWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
