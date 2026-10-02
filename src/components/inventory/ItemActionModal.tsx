import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../common/GothicAlert';
import { ParsedItem } from '../../types/item';
import { THEME } from '../../constants/theme';
import { ItemImage } from '../common/ItemImage';
import { EXCELLENT_OPTIONS_WEAPON, EXCELLENT_OPTIONS_ARMOR } from '../../constants/muConstants';
import { getAncientInfo } from '../../constants/ancientCatalog';
import { Panel } from '../ui/Panel';
import { MuCornerOrnaments } from '../ui/MuCornerOrnaments';
import { MuButton } from '../ui/MuButton';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { isJewelBundle, getBundleQuantity, isItemStackable } from '../../constants/jewelAssets';

interface ItemActionModalProps {
  visible: boolean;
  item: ParsedItem | null;
  slotIndex: number;
  onClose: () => void;
  onEdit: (item: ParsedItem, slotIndex: number) => void;
  onDelete: (slotIndex: number) => void;
  onMove?: (item: ParsedItem, slotIndex: number) => void;
  onQuickMax?: (item: ParsedItem, slotIndex: number) => void;
  onDuplicate?: (item: ParsedItem, slotIndex: number) => void;
  onUpdateItem?: (updatedItem: ParsedItem, slotIndex: number) => void;
}

export const ItemActionModal: React.FC<ItemActionModalProps> = ({
  visible,
  item,
  slotIndex,
  onClose,
  onEdit,
  onDelete,
  onMove,
  onQuickMax,
  onDuplicate,
  onUpdateItem,
}) => {
  if (!visible || !item) return null;

  const excList = item.category === 'weapon' ? EXCELLENT_OPTIONS_WEAPON : EXCELLENT_OPTIONS_ARMOR;
  const activeExcOptions = excList.filter((opt) => (item.excellentFlags & opt.bit) !== 0);
  const ancientInfo = getAncientInfo(item.group, item.index, item.ancientOption);

  const handleDeletePress = () => {
    Alert.alert(
      'Eliminar Ítem',
      `¿Confirmas que deseas eliminar "${item.name}" del slot #${slotIndex}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            onDelete(slotIndex);
            onClose();
          },
        },
      ]
    );
  };

  const handleEditPress = () => {
    onClose();
    setTimeout(() => {
      onEdit(item, slotIndex);
    }, 150);
  };

  const handleMovePress = () => {
    onClose();
    if (onMove) {
      setTimeout(() => {
        onMove(item, slotIndex);
      }, 150);
    }
  };

  const displayName = item.name && item.name !== 'Unknown' 
    ? item.name 
    : `Item ${item.group}-${item.index}`;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Panel variant="box" style={styles.card}>
          <MuCornerOrnaments size={10} />
          {/* Cabecera con Imagen grande, Título e Index */}
          <View style={styles.headerRow}>
            <View style={styles.imageBox}>
              <ItemImage
                item={item}
                size={58}
                fallbackIcon={item.spriteKey as any || 'shield-outline'}
                fallbackColor={THEME.colors.oroClaro}
              />
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.title} numberOfLines={2}>
                {displayName}
              </Text>
              <Text style={styles.subtitle}>
                Type: {item.group} | Index: {item.index}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Listado de Atributos: Sección Básico */}
          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionHeader}>Básico</Text>
            
            <View style={styles.attrList}>
              {isJewelBundle(item.group, item.index, item.name) ? (
                <>
                  <Text style={[styles.attrLine, { color: THEME.colors.oroClaro, fontWeight: 'bold' }]}>
                    • Paquete (Bundle): {getBundleQuantity(item.level, item.durability)} Joyas
                  </Text>
                  <Text style={styles.attrLine}>• Nivel del Paquete: +{item.level} (x{getBundleQuantity(item.level, item.durability)})</Text>
                  <Text style={styles.attrLine}>• Durabilidad: {item.durability}</Text>
                </>
              ) : isItemStackable(item.group, item.index, item.category) ? (
                <>
                  <Text style={[styles.attrLine, { color: THEME.colors.oroClaro, fontWeight: 'bold' }]}>
                    • Cantidad en Pila: {item.durability ?? 1} / 255 unidades
                  </Text>
                  {item.level > 0 && <Text style={styles.attrLine}>• Nivel / Grado: +{item.level}</Text>}
                </>
              ) : (
                <>
                  <Text style={styles.attrLine}>• Level: +{item.level}</Text>
                  <Text style={styles.attrLine}>• Option: +{item.option * 4}</Text>
                  <Text style={styles.attrLine}>• Durability: {item.durability}</Text>
                </>
              )}
              {item.luck ? <Text style={styles.attrLine}>• Luck (Suerte)</Text> : null}
              {item.skill ? <Text style={styles.attrLine}>• Skill (Habilidad)</Text> : null}
            </View>

            {/* Control Rápido de Cantidad en Pila (Pociones / Consumibles) */}
            {isItemStackable(item.group, item.index, item.category) && onUpdateItem && (
              <View style={styles.stackControlCard}>
                <View style={styles.stackControlHeader}>
                  <Text style={styles.stackControlTitle}>CANTIDAD EN PILA (APILADO):</Text>
                  <Text style={styles.stackControlCurrentVal}>
                    {item.durability ?? 1} / 255
                  </Text>
                </View>

                {/* Steppers e Input Centrado */}
                <View style={styles.stackStepperRow}>
                  <TouchableOpacity
                    style={styles.stackStepBtnTouchable}
                    onPress={() => {
                      const cur = item.durability ?? 1;
                      const next = Math.max(1, cur - 10);
                      onUpdateItem({ ...item, durability: next, isModified: true }, slotIndex);
                    }}
                    activeOpacity={0.7}
                  >
                    <ImageBackground source={STITCH_ASSETS.buttons.small} style={styles.stackStepBtnBg} resizeMode="stretch">
                      <Text style={styles.stackStepBtnText}>-10</Text>
                    </ImageBackground>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stackStepBtnTouchable}
                    onPress={() => {
                      const cur = item.durability ?? 1;
                      const next = Math.max(1, cur - 1);
                      onUpdateItem({ ...item, durability: next, isModified: true }, slotIndex);
                    }}
                    activeOpacity={0.7}
                  >
                    <ImageBackground source={STITCH_ASSETS.buttons.small} style={styles.stackStepBtnBg} resizeMode="stretch">
                      <Text style={styles.stackStepBtnText}>-1</Text>
                    </ImageBackground>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.stackNumInput}
                    keyboardType="numeric"
                    value={String(item.durability ?? 1)}
                    selectTextOnFocus
                    maxLength={3}
                    onChangeText={(txt) => {
                      const cleaned = txt.replace(/[^0-9]/g, '');
                      const parsed = parseInt(cleaned, 10);
                      const finalVal = isNaN(parsed) ? 1 : Math.max(1, Math.min(255, parsed));
                      onUpdateItem({ ...item, durability: finalVal, isModified: true }, slotIndex);
                    }}
                  />

                  <TouchableOpacity
                    style={styles.stackStepBtnTouchable}
                    onPress={() => {
                      const cur = item.durability ?? 1;
                      const next = Math.min(255, cur + 1);
                      onUpdateItem({ ...item, durability: next, isModified: true }, slotIndex);
                    }}
                    activeOpacity={0.7}
                  >
                    <ImageBackground source={STITCH_ASSETS.buttons.small} style={styles.stackStepBtnBg} resizeMode="stretch">
                      <Text style={styles.stackStepBtnText}>+1</Text>
                    </ImageBackground>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.stackStepBtnTouchable}
                    onPress={() => {
                      const cur = item.durability ?? 1;
                      const next = Math.min(255, cur + 10);
                      onUpdateItem({ ...item, durability: next, isModified: true }, slotIndex);
                    }}
                    activeOpacity={0.7}
                  >
                    <ImageBackground source={STITCH_ASSETS.buttons.small} style={styles.stackStepBtnBg} resizeMode="stretch">
                      <Text style={styles.stackStepBtnText}>+10</Text>
                    </ImageBackground>
                  </TouchableOpacity>
                </View>

                {/* Presets Rápidos de Cantidad */}
                <View style={styles.stackPresetsRow}>
                  {[1, 10, 30, 50, 100, 255].map((qtyVal) => {
                    const isActive = (item.durability ?? 1) === qtyVal;
                    return (
                      <TouchableOpacity
                        key={`quick_stack_${qtyVal}`}
                        style={styles.stackPresetChipTouchable}
                        onPress={() => onUpdateItem({ ...item, durability: qtyVal, isModified: true }, slotIndex)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={isActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={styles.stackPresetChipBg}
                          resizeMode="stretch"
                        >
                          <Text style={[styles.stackPresetChipText, isActive && styles.stackPresetChipTextActive]}>
                            {qtyVal === 255 ? 'x255' : `x${qtyVal}`}
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Selector de Paquete de Joyas (Bundle: x10, x20, x30) */}
            {isJewelBundle(item.group, item.index, item.name) && onUpdateItem && (
              <View style={styles.stackControlCard}>
                <View style={styles.stackControlHeader}>
                  <Text style={styles.stackControlTitle}>TAMAÑO DEL PAQUETE (BUNDLE):</Text>
                  <Text style={styles.stackControlCurrentVal}>
                    {getBundleQuantity(item.level, item.durability)} Joyas
                  </Text>
                </View>
                <View style={styles.stackPresetsRow}>
                  {[
                    { lvl: 0, count: 10, label: 'x10 Joyas' },
                    { lvl: 1, count: 20, label: 'x20 Joyas' },
                    { lvl: 2, count: 30, label: 'x30 Joyas' },
                  ].map((b) => {
                    const isSelected = item.level === b.lvl;
                    return (
                      <TouchableOpacity
                        key={`quick_bundle_${b.lvl}`}
                        style={[styles.stackPresetChipTouchable, { flex: 1 }]}
                        onPress={() => onUpdateItem({ ...item, level: b.lvl, durability: b.count, isModified: true }, slotIndex)}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                          style={styles.stackPresetChipBg}
                          resizeMode="stretch"
                        >
                          <Text style={[styles.stackPresetChipText, isSelected && styles.stackPresetChipTextActive]}>
                            {b.label}
                          </Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Opciones Excelentes si las tiene */}
            {activeExcOptions.length > 0 && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: THEME.colors.jade, marginTop: 10 }]}>
                  Excelente
                </Text>
                {activeExcOptions.map((opt) => (
                  <Text key={opt.bit} style={[styles.attrLine, { color: THEME.colors.jade }]}>
                    • {opt.name}
                  </Text>
                ))}
              </View>
            )}

            {/* Ancient Set si lo tiene */}
            {ancientInfo.isAncient && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: THEME.colors.arcano, marginTop: 10 }]}>
                  Ancient ({ancientInfo.setName || 'Set Ancient'})
                </Text>
                <Text style={[styles.attrLine, { color: THEME.colors.arcano }]}>
                  • Tier {ancientInfo.tier} (+{ancientInfo.staminaBonus} Stamina)
                </Text>
                {ancientInfo.set && ancientInfo.set.options.slice(0, 3).map((opt, i) => (
                  <Text key={`act_anc_${i}`} style={[styles.attrLine, { color: THEME.colors.arcano }]}>
                    • {opt.optName}: +{opt.val}
                  </Text>
                ))}
              </View>
            )}

            {/* Opción 380 */}
            {item.option380 && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: THEME.colors.amber, marginTop: 10 }]}>
                  Opción 380
                </Text>
                <Text style={[styles.attrLine, { color: THEME.colors.amber }]}>
                  • Propiedad Especial PvP Activa
                </Text>
              </View>
            )}

            {/* Harmony */}
            {!!item.harmonyType && item.harmonyType > 0 && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: THEME.colors.oroClaro, marginTop: 10 }]}>
                  Harmony
                </Text>
                <Text style={[styles.attrLine, { color: THEME.colors.oroClaro }]}>
                  • Tipo {item.harmonyType} (Lv +{item.harmonyLevel})
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Fila de Acciones Rápidas (Full Exc +15 y Duplicar) */}
          {(onQuickMax || onDuplicate) && (
            <View style={styles.quickActionsRow}>
              {onQuickMax && (
                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Full Exc +15"
                    variante="primary"
                    altura={38}
                    compacto
                    onPress={() => {
                      onClose();
                      setTimeout(() => onQuickMax(item, slotIndex), 100);
                    }}
                  />
                </View>
              )}
              {onDuplicate && (
                <View style={{ flex: 1 }}>
                  <MuButton
                    titulo="Duplicar"
                    variante="secondary"
                    altura={38}
                    compacto
                    onPress={() => {
                      onClose();
                      setTimeout(() => onDuplicate(item, slotIndex), 100);
                    }}
                  />
                </View>
              )}
            </View>
          )}

          {/* Botonera de Acciones Principales (OK | MOVER | EDITAR | ELIMINAR) */}
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 14 }}>
            <View style={{ flex: 1 }}>
              <MuButton
                titulo="OK"
                variante="secondary"
                altura={38}
                compacto
                onPress={onClose}
              />
            </View>

            {onMove && (
              <View style={{ flex: 1 }}>
                <MuButton
                  titulo="MOVER"
                  variante="primary"
                  altura={38}
                  compacto
                  onPress={handleMovePress}
                />
              </View>
            )}

            <View style={{ flex: 1 }}>
              <MuButton
                titulo="EDITAR"
                variante="primary"
                altura={38}
                compacto
                onPress={handleEditPress}
              />
            </View>

            <View style={{ flex: 1 }}>
              <MuButton
                titulo="BORRAR"
                variante="danger"
                altura={38}
                compacto
                onPress={handleDeletePress}
              />
            </View>
          </View>
        </Panel>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '90%',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  imageBox: {
    width: 60,
    height: 60,
    backgroundColor: THEME.colors.casillaFondo,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    color: '#E0C380',
    fontFamily: THEME.typography.fontTitle,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
    ...THEME.effects.textShadow,
  },
  subtitle: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.colors.borde,
    marginBottom: 10,
  },
  scrollArea: {
    maxHeight: 200,
    flexShrink: 1,
  },
  sectionHeader: {
    color: '#E0C380',
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  attrList: {
    paddingLeft: 4,
    gap: 3,
  },
  extraSection: {
    paddingLeft: 4,
    gap: 3,
  },
  attrLine: {
    color: THEME.colors.texto,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    marginBottom: 4,
  },
  btnQuickMax: {
    flex: 1,
    backgroundColor: 'rgba(63, 207, 142, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.jade,
    borderRadius: 2,
    paddingVertical: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnQuickMaxText: {
    color: '#5DF5B0',
    fontSize: 12,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  btnDuplicate: {
    flex: 1,
    backgroundColor: 'rgba(91, 141, 239, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.arcano,
    borderRadius: 2,
    paddingVertical: 10,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDuplicateText: {
    color: '#7BA4F5',
    fontSize: 12,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.colors.borde,
    marginHorizontal: -16,
  },
  btnOk: {
    flex: 1,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borde,
  },
  btnOkText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11,
    fontWeight: '800',
    ...THEME.effects.textShadowSubtle,
  },
  btnMove: {
    flex: 1.1,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C1B',
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borde,
  },
  btnMoveText: {
    color: '#E0C380',
    fontSize: 11,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  btnEdit: {
    flex: 1.2,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B1C1B',
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borde,
  },
  btnEditText: {
    color: '#7BA4F5',
    fontSize: 11,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  btnDelete: {
    flex: 1.1,
    paddingVertical: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteText: {
    color: '#FFA87D',
    fontSize: 11,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  stackControlCard: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#121312',
    borderWidth: 1,
    borderTopColor: '#3A3C38',
    borderLeftColor: '#3A3C38',
    borderBottomColor: '#1A1B1A',
    borderRightColor: '#1A1B1A',
    borderRadius: 2,
    gap: 8,
  },
  stackControlHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stackControlTitle: {
    color: THEME.colors.oroClaro,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stackControlCurrentVal: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
  },
  stackStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  stackStepBtnTouchable: {
    width: 36,
    height: 36,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stackStepBtnBg: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackStepBtnText: {
    color: THEME.colors.texto,
    fontSize: 12,
    fontWeight: '700',
  },
  stackNumInput: {
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    borderRadius: 2,
    color: THEME.colors.oroClaro,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
    minWidth: 64,
    height: 36,
    paddingHorizontal: 6,
  },
  stackPresetsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 4,
  },
  stackPresetChipTouchable: {
    flex: 1,
    height: 28,
    borderRadius: 2,
    overflow: 'hidden',
  },
  stackPresetChipBg: {
    width: '100%',
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackPresetChipText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 10,
    fontWeight: '700',
  },
  stackPresetChipTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
});
