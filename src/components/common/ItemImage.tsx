import React, { useState, memo } from 'react';
import { View, Image, StyleSheet, StyleProp, ImageStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ParsedItem } from '../../types/item';
import { ItemDatabase } from '../../services/parser/itemDatabase';
import { SqlClient } from '../../services/database/sqlClient';

interface ItemImageProps {
  item?: ParsedItem | { name?: string; spriteKey?: string; category?: string; group?: number; index?: number; hasTexture?: boolean; [key: string]: any } | null;
  itemName?: string;
  size?: number;
  fallbackIcon?: string;
  fallbackColor?: string;
  style?: StyleProp<ImageStyle>;
}

const DEFAULT_GATEWAY_URL = SqlClient.DEFAULT_CLOUD_GATEWAY;

export const getItemImageUrl = (rawName?: string, group?: number, index?: number): string => {
  let baseUrl = DEFAULT_GATEWAY_URL;
  try {
    const activeUrl = SqlClient.getBridgeUrl();
    if (activeUrl && activeUrl.startsWith('http')) {
      baseUrl = activeUrl;
    }
  } catch (_) {}

  // 1. Prioridad: Textura directa por (Grupo, Index)
  if (group !== undefined && index !== undefined && group >= 0 && index >= 0) {
    return `${baseUrl}/api/items/texture/${group}/${index}.jpg`;
  }

  // 2. Si sólo tenemos el nombre, buscar en el catálogo canónico
  if (rawName) {
    const def = ItemDatabase.findByName(rawName);
    if (def && def.group !== undefined && def.index !== undefined) {
      return `${baseUrl}/api/items/texture/${def.group}/${def.index}.jpg`;
    }
    const clean = rawName.trim();
    if (!clean.startsWith('Item (') && !clean.startsWith('?')) {
      return `${baseUrl}/api/items/image/${encodeURIComponent(clean)}.png`;
    }
  }

  return '';
};

export const ItemImage: React.FC<ItemImageProps> = memo(({
  item,
  itemName,
  size = 32,
  fallbackIcon,
  fallbackColor = '#FF5722',
  style,
}) => {
  const [hasError, setHasError] = useState(false);

  const resolvedName = itemName || item?.name || '';
  const isGeneric = !resolvedName || resolvedName.startsWith('Item (') || resolvedName.startsWith('?');

  // Buscar definición en el catálogo si es necesario
  const itemDef = React.useMemo(() => {
    if (item && item.group !== undefined && item.index !== undefined) {
      return ItemDatabase.findItem(item.group, item.index);
    }
    if (resolvedName) {
      return ItemDatabase.findByName(resolvedName);
    }
    return null;
  }, [item, resolvedName]);

  const group = item?.group !== undefined ? item.group : itemDef?.group;
  const index = item?.index !== undefined ? item.index : itemDef?.index;
  const hasTexture = item?.hasTexture !== undefined ? item.hasTexture : (itemDef ? itemDef.hasTexture : true);

  const rawIconName = (
    fallbackIcon ||
    itemDef?.icon ||
    item?.spriteKey ||
    (item?.category === 'weapon' || itemDef?.category === 'weapon' ? 'sword' : 'shield-outline')
  );

  const safeIcon = (() => {
    if (!rawIconName || typeof rawIconName !== 'string') return 'cube-outline';
    if (rawIconName === 'knight') return 'hard-hat';
    if (rawIconName === 'scepter') return 'crown';
    if (rawIconName === 'wand') return 'magic-staff';
    return rawIconName;
  })() as any;

  // Si no tiene textura conocida o es genérico o dio error, mostrar icono vectorial limpio
  if (isGeneric || hasError || hasTexture === false) {
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size }]}>
        <MaterialCommunityIcons
          name={safeIcon}
          size={size * 0.75}
          color={fallbackColor}
        />
      </View>
    );
  }

  const imageUrl = getItemImageUrl(resolvedName, group, index);

  if (!imageUrl) {
    return (
      <View style={[styles.fallbackContainer, { width: size, height: size }]}>
        <MaterialCommunityIcons
          name={safeIcon}
          size={size * 0.75}
          color={fallbackColor}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, { width: size, height: size }, style]}
        resizeMode="contain"
        onError={() => {
          setHasError(true);
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: 'transparent',
  },
  fallbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
