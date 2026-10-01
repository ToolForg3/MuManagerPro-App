import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ImageBackground,
} from 'react-native';
import { MuIcon } from '../ui/MuIcon';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../../constants/theme';
import { ItemDefinition, DEFAULT_ITEM_CATALOG } from '../../services/parser/itemDatabase';
import { PAPERDOLL_SLOTS } from '../../constants/muConstants';
import { ItemImage } from '../common/ItemImage';
import { isItemAncientEligible } from '../../constants/ancientCatalog';
import { Panel } from '../ui/Panel';
import { STITCH_ASSETS } from '../../constants/stitchAssets';

export const GENERAL_CATEGORIES = [
  { id: 'all', label: 'Todos', groups: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15] },
  { id: 'ancient', label: 'Ancient', groups: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] },
  { id: 'weapons', label: 'Armas', groups: [0, 1, 2, 3, 4, 5] },
  { id: 'shields', label: 'Escudos', groups: [6] },
  { id: 'sets', label: 'Sets', groups: [7, 8, 9, 10, 11] },
  { id: 'wings', label: 'Alas', groups: [12] },
  { id: 'jewelry', label: 'Joyería', groups: [13] },
  { id: 'jewels', label: 'Joyas', groups: [14] },
  { id: 'other', label: 'Otros', groups: [15] },
];

interface EquipmentPickerModalProps {
  visible: boolean;
  slotIndex: number;
  isWarehouse?: boolean;
  onClose: () => void;
  onSelectItem: (itemDef: ItemDefinition, slotIndex: number) => void;
}

export const EquipmentPickerModal: React.FC<EquipmentPickerModalProps> = ({
  visible,
  slotIndex,
  isWarehouse = false,
  onClose,
  onSelectItem,
}) => {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(16, insets.bottom);
  const [search, setSearch] = useState('');
  const [overrideCategory, setOverrideCategory] = useState<number | null>(null);
  const [selectedGeneralCat, setSelectedGeneralCat] = useState<string>('all');

  const slotDef = useMemo(() => {
    if (isWarehouse) return null;
    return PAPERDOLL_SLOTS.find((s) => s.slot === slotIndex);
  }, [slotIndex, isWarehouse]);

  // Determine allowed item groups based on paperdoll slot or warehouse
  const targetGroups = useMemo<number[]>(() => {
    if (isWarehouse || slotIndex >= 12) {
      const found = GENERAL_CATEGORIES.find((c) => c.id === selectedGeneralCat);
      return found ? found.groups : [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    }
    if (overrideCategory !== null) return [overrideCategory];
    if (slotIndex === 0) return [0, 1, 2, 3, 4, 5]; // Weapons
    if (slotIndex === 1) return [6, 0, 1, 2, 3, 4, 5]; // Shield or Off-hand weapon
    if (slotIndex === 2) return [7]; // Helmets
    if (slotIndex === 3) return [8]; // Armors
    if (slotIndex === 4) return [9]; // Pants
    if (slotIndex === 5) return [10]; // Gloves
    if (slotIndex === 6) return [11]; // Boots
    if (slotIndex === 7) return [12]; // Wings
    if (slotIndex === 8) return [13]; // Pets
    if (slotIndex === 9) return [13]; // Pendant
    if (slotIndex === 10 || slotIndex === 11) return [13]; // Rings
    // Backpack / Inventory / Store: all items allowed
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
  }, [slotIndex, overrideCategory, isWarehouse, selectedGeneralCat]);

  const filteredItems = useMemo(() => {
    let list = DEFAULT_ITEM_CATALOG.filter((it) => targetGroups.includes(it.group));

    if (selectedGeneralCat === 'ancient') {
      list = list.filter((i) => isItemAncientEligible(i.group, i.index));
    }

    // Secondary filter for Pets vs Rings vs Pendants if in group 13
    if (!isWarehouse && overrideCategory === null) {
      if (slotIndex === 8) {
        // Pet slot
        list = list.filter((i) => i.category === 'pet' || i.name.toLowerCase().includes('angel') || i.name.toLowerCase().includes('demon') || i.name.toLowerCase().includes('uniria') || i.name.toLowerCase().includes('dinorant') || i.name.toLowerCase().includes('fenrir') || i.name.toLowerCase().includes('panda'));
      } else if (slotIndex === 9) {
        // Pendant slot
        list = list.filter((i) => i.name.toLowerCase().includes('pendant'));
      } else if (slotIndex === 10 || slotIndex === 11) {
        // Ring slot
        list = list.filter((i) => i.name.toLowerCase().includes('ring'));
      }
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      // Mapeo inteligente de sinónimos español-inglés (ej: "pantalon" -> grupo 9 Pants)
      const isPantsSearch = q.includes('pantalon') || q.includes('pantalón') || q.includes('pants');
      const isHelmSearch = q.includes('casco') || q.includes('helm');
      const isArmorSearch = q.includes('pechera') || q.includes('armadura') || q.includes('armor');
      const isGlovesSearch = q.includes('guante') || q.includes('gloves');
      const isBootsSearch = q.includes('bota') || q.includes('boots');
      const isWingsSearch = q.includes('ala') || q.includes('wings');
      const isSwordSearch = q.includes('espada') || q.includes('sword');
      const isShieldSearch = q.includes('escudo') || q.includes('shield');

      list = list.filter((i) => {
        if (i.name.toLowerCase().includes(q) || String(i.id).includes(q)) return true;
        if (isPantsSearch && i.group === 9) return true;
        if (isHelmSearch && i.group === 7) return true;
        if (isArmorSearch && i.group === 8) return true;
        if (isGlovesSearch && i.group === 10) return true;
        if (isBootsSearch && i.group === 11) return true;
        if (isWingsSearch && i.group === 12) return true;
        if (isSwordSearch && i.group === 0) return true;
        if (isShieldSearch && i.group === 6) return true;
        return false;
      });
    }

    return list;
  }, [targetGroups, search, slotIndex, overrideCategory, isWarehouse]);

  const slotTitle = useMemo(() => {
    if (isWarehouse) return `Elegir Ítem para Baúl (Cuadro #${slotIndex + 1})`;
    if (slotDef) return `Equipar ${slotDef.name} (#${slotIndex})`;
    return `Colocar Ítem en Slot #${slotIndex}`;
  }, [slotDef, slotIndex, isWarehouse]);

  const quickJewels: ItemDefinition[] = useMemo(() => {
    return [
      { group: 14, index: 13, id: 461, name: 'Jewel of Bless', width: 1, height: 1, category: 'consumable', icon: 'diamond' },
      { group: 14, index: 14, id: 462, name: 'Jewel of Soul', width: 1, height: 1, category: 'consumable', icon: 'diamond-outline' },
      { group: 14, index: 16, id: 464, name: 'Jewel of Life', width: 1, height: 1, category: 'consumable', icon: 'heart' },
      { group: 12, index: 15, id: 399, name: 'Jewel of Chaos', width: 1, height: 1, category: 'consumable', icon: 'fire' },
    ];
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Panel style={[styles.card, { paddingBottom: bottomInset }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title} numberOfLines={1}>{slotTitle}</Text>
              <Text style={styles.subtitle}>
                {isWarehouse
                  ? 'Elige cualquier ítem del catálogo para colocarlo en este cuadro'
                  : (slotIndex < 12 ? 'Selecciona una pieza compatible para tu set' : 'Selecciona un ítem para este cuadro')}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MuIcon name="close" size={20} />
            </TouchableOpacity>
          </View>

          {/* Quick Jewels (always accessible at top if in backpack or warehouse) */}
          {(slotIndex >= 12 || isWarehouse) && (
            <View style={styles.quickBar}>
              <Text style={styles.quickLabel}>Joyas Rápidas:</Text>
              <View style={styles.quickJewelRow}>
                {quickJewels.map((j) => (
                  <TouchableOpacity
                    key={j.name}
                    style={{ height: 38, borderRadius: 2, overflow: 'hidden' }}
                    onPress={() => {
                      onSelectItem(j, slotIndex);
                      onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <ImageBackground
                      source={STITCH_ASSETS.tabs.tabModeInactive}
                      style={{ height: '100%', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}
                      resizeMode="stretch"
                    >
                      <MuIcon name="coins" size={16} color={THEME.colors.oroClaro} />
                      <Text style={styles.quickJewelText}>{j.name.replace('Jewel of ', '')}</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Category Switcher if user wants to override (e.g. view other sets) */}
          {slotIndex < 12 && (
            <View style={styles.filterRowContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRowScroll}
              >
                {[
                  { cat: null, label: slotDef?.shortName || 'Compatible' },
                  { cat: 7, label: 'Cascos' },
                  { cat: 8, label: 'Pecheras' },
                  { cat: 9, label: 'Pantalones (Pants)' },
                  { cat: 10, label: 'Guantes' },
                  { cat: 11, label: 'Botas' },
                ].map((c) => {
                  const isActive = overrideCategory === c.cat;
                  return (
                    <TouchableOpacity
                      key={c.label}
                      style={{ height: 36, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setOverrideCategory(c.cat)}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={{ height: '100%', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                          {c.label}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Category Switcher for Store / Backpack / Warehouse (>= 12) */}
          {(slotIndex >= 12 || isWarehouse) && (
            <View style={styles.filterRowContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRowScroll}
              >
                {GENERAL_CATEGORIES.map((cat) => {
                  const isActive = selectedGeneralCat === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={{ height: 36, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() => setSelectedGeneralCat(cat.id)}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={{ height: '100%', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                          {cat.label}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Search Input */}
          <View style={styles.searchBox}>
            <MuIcon name="tools" size={18} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar ítem o armadura..."
              placeholderTextColor={THEME.colors.textMuted}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MuIcon name="close" size={16} />
              </TouchableOpacity>
            )}
          </View>

          {/* Search Match Badge */}
          {search.trim().length > 0 && (
            <View style={styles.searchResultBadgeRow}>
              <Text style={styles.searchResultBadgeText}>
                {filteredItems.length} {filteredItems.length === 1 ? 'coincidencia encontrada' : 'coincidencias encontradas'}
              </Text>
            </View>
          )}

          {/* Items List */}
          <FlatList
            data={filteredItems}
            keyExtractor={(item) => `${item.group}_${item.index}_${item.id}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset + 40 }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={25}
            windowSize={10}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <MuIcon name="chest" size={40} />
                <Text style={styles.emptyText}>No se encontraron ítems para este slot.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.itemRow}
                activeOpacity={0.7}
                onPress={() => {
                  onSelectItem(item, slotIndex);
                  onClose();
                }}
              >
                <View style={styles.iconContainer}>
                  <ItemImage
                    item={{
                      group: item.group,
                      index: item.index,
                      name: item.name,
                      category: item.category,
                      spriteKey: item.icon,
                    } as any}
                    size={42}
                  />
                </View>
                <View style={styles.itemInfo}>
                  {(() => {
                    const q = search.trim().toLowerCase();
                    const idx = q ? item.name.toLowerCase().indexOf(q) : -1;
                    if (idx !== -1 && q) {
                      return (
                        <Text style={styles.itemName} numberOfLines={1}>
                          {item.name.slice(0, idx)}
                          <Text style={styles.searchMatchHighlight}>{item.name.slice(idx, idx + q.length)}</Text>
                          {item.name.slice(idx + q.length)}
                        </Text>
                      );
                    }
                    return <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>;
                  })()}
                  <Text style={styles.itemSub}>
                    Grupo {item.group} • Index {item.index} • Tamaño: {item.width}x{item.height}
                  </Text>
                </View>
                <View style={{ width: 84, height: 36, borderRadius: 2, overflow: 'hidden' }}>
                  <ImageBackground
                    source={STITCH_ASSETS.buttons.small}
                    style={{ width: '100%', height: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                    resizeMode="stretch"
                  >
                    <Text style={styles.equipBtnText}>EQUIPAR</Text>
                    <MuIcon name="arrow-right" size={14} color="#FEDF99" />
                  </ImageBackground>
                </View>
              </TouchableOpacity>
            )}
          />
        </Panel>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'flex-end',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    maxHeight: '85%',
    minHeight: '60%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    backgroundColor: '#1B1C1B',
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: THEME.typography.fontTitle,
    color: '#E0C380',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  subtitle: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    marginTop: 2,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 2,
    backgroundColor: '#292A29',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1B1C1B',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  quickLabel: {
    fontSize: 11.5,
    color: '#E0C380',
    fontFamily: THEME.typography.fontTitle,
    fontWeight: '800',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    ...THEME.effects.textShadow,
  },
  quickJewelRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickJewelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: THEME.colors.casillaFondo,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  quickJewelText: {
    color: THEME.colors.texto,
    fontSize: 11.5,
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    flexWrap: 'wrap',
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  filterRowContainer: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    paddingVertical: 8,
    backgroundColor: '#1B1C1B',
  },
  filterRowScroll: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    backgroundColor: THEME.colors.casillaFondo,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  filterChipActive: {
    backgroundColor: THEME.colors.oroClaro,
    borderColor: '#EFD28D',
  },
  filterChipText: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
  },
  filterChipTextActive: {
    color: '#FEDF99',
    fontWeight: '900',
    ...THEME.effects.textShadowHigh,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.casillaFondo,
    marginHorizontal: 16,
    marginVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    minHeight: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: THEME.colors.texto,
    fontSize: 13,
    fontWeight: '600',
  },
  searchResultBadgeRow: {
    paddingHorizontal: 16,
    paddingBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchResultBadgeText: {
    color: '#FEDF99',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(239, 210, 141, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: 'rgba(239, 210, 141, 0.4)',
    ...THEME.effects.textShadowHigh,
  },
  searchMatchHighlight: {
    color: '#FEDF99',
    backgroundColor: 'rgba(239, 210, 141, 0.28)',
    fontWeight: '900',
    paddingHorizontal: 2,
    borderRadius: 2,
    ...THEME.effects.textShadowHigh,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F201F',
    padding: 10,
    borderRadius: 2,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  iconContainer: {
    width: 48,
    height: 48,
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    color: THEME.colors.texto,
    fontSize: 14,
    fontWeight: '800',
    ...THEME.effects.textShadowSubtle,
  },
  itemSub: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  equipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    borderRadius: 2,
    backgroundColor: THEME.colors.oroClaro,
    borderWidth: 1,
    borderColor: '#EFD28D',
  },
  equipBtnText: {
    color: '#FEDF99',
    fontFamily: THEME.typography.fontTitle,
    fontSize: 11,
    fontWeight: '900',
    marginRight: 2,
    ...THEME.effects.textShadowHigh,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 13,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
});
