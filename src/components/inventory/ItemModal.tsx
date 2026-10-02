import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Switch,
  TextInput,
  ImageBackground,
} from 'react-native';
import { GothicAlert as Alert } from '../common/GothicAlert';
import * as Clipboard from 'expo-clipboard';
import { MuIcon } from '../ui/MuIcon';
import { THEME } from '../../constants/theme';
import { ParsedItem } from '../../types/item';
import { MuItemParser } from '../../services/parser/muItemParser';
import {
  EXCELLENT_OPTIONS_WEAPON,
  EXCELLENT_OPTIONS_ARMOR,
  HARMONY_OPTIONS_WEAPON,
  HARMONY_OPTIONS_ARMOR,
} from '../../constants/muConstants';
import {
  isItemAncientEligible,
  getAvailableAncientOptionsForItem,
  decodeAncientByte,
  encodeAncientByte,
  getAncientInfo,
} from '../../constants/ancientCatalog';
import { ItemDatabase } from '../../services/parser/itemDatabase';
import { ItemImage } from '../common/ItemImage';
import { Panel } from '../ui/Panel';
import { MuButton } from '../ui/MuButton';
import { STITCH_ASSETS } from '../../constants/stitchAssets';

import {
  decodeSocketByte,
  encodeSocketByte,
  QUICK_SOCKET_OPTIONS,
  getQuickSocketOptions,
  SEED_SPHERE_LEVELS,
} from '../../constants/socketCatalog';
import { isJewelBundle, getBundleQuantity, isItemStackable } from '../../constants/jewelAssets';

interface ItemModalProps {
  visible: boolean;
  item: ParsedItem | null;
  slotIndex: number;
  initialEditing?: boolean;
  onClose: () => void;
  onSave: (updatedItem: ParsedItem) => void;
  onDelete: (slotIndex: number) => void;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  visible,
  item,
  slotIndex,
  initialEditing = false,
  onClose,
  onSave,
  onDelete,
}) => {
  const [isEditing, setIsEditing] = useState(initialEditing);
  const [editedItem, setEditedItem] = useState<ParsedItem | null>(null);
  const [enableSockets, setEnableSockets] = useState<boolean>(false);
  const [socketLevels, setSocketLevels] = useState<number[]>([1, 1, 1, 1, 1]);

  useEffect(() => {
    if (item) {
      const initialItem: ParsedItem = { ...item, slot: slotIndex };
      setEditedItem(initialItem);
      setIsEditing(initialEditing);
      const hasActiveSockets =
        item.sockets &&
        item.sockets.length > 0 &&
        item.sockets.some((s) => s !== 0xFF && s !== undefined);
      setEnableSockets(!!hasActiveSockets);
      const initialLevels = [0, 1, 2, 3, 4].map((idx) => {
        const byte = (item.sockets && item.sockets[idx] !== undefined) ? item.sockets[idx] : 0xFF;
        return byte < 250 ? Math.min(5, Math.max(1, Math.floor(byte / 50) + 1)) : 1;
      });
      setSocketLevels(initialLevels);
    } else {
      setEditedItem(null);
      setIsEditing(false);
      setEnableSockets(false);
      setSocketLevels([1, 1, 1, 1, 1]);
    }
  }, [item, visible, initialEditing, slotIndex]);

  // Recalcular el Hex en tiempo real cada vez que cambia el ítem editado
  const currentLiveHex = useMemo(() => {
    if (!editedItem) return '';
    try {
      return MuItemParser.encodeItem(editedItem);
    } catch {
      return editedItem.hex || '';
    }
  }, [editedItem]);

  if (!item || !editedItem) {
    return null;
  }

  const isWeapon =
    item.category === 'weapon' ||
    (editedItem.group !== undefined && editedItem.group <= 5);
  const isFenrir =
    (editedItem.group === 13 && editedItem.index === 37) ||
    (item.name ? item.name.toLowerCase().includes('fenrir') : false);
  const excOptions = isWeapon
    ? EXCELLENT_OPTIONS_WEAPON
    : EXCELLENT_OPTIONS_ARMOR;
  const harmonyOptions = isWeapon ? HARMONY_OPTIONS_WEAPON : HARMONY_OPTIONS_ARMOR;

  const toggleExcBit = (bit: number) => {
    if (!editedItem) return;
    const current = editedItem.excellentFlags || 0;
    const updated = current & bit ? current & ~bit : current | bit;
    setEditedItem({
      ...editedItem,
      excellentFlags: updated,
      isExcellent: updated > 0,
      isModified: true,
    });
  };

  const handleSetFullExc = () => {
    if (!editedItem) return;
    setEditedItem({
      ...editedItem,
      excellentFlags: 63,
      isExcellent: true,
      isModified: true,
    });
  };

  const handleClearExc = () => {
    if (!editedItem) return;
    setEditedItem({
      ...editedItem,
      excellentFlags: 0,
      isExcellent: false,
      isModified: true,
    });
  };

  const handleCopyHex = async () => {
    if (!currentLiveHex) return;
    await Clipboard.setStringAsync(currentLiveHex);
    Alert.alert('Copiado', 'Cadena hexadecimal de 16 bytes copiada al portapapeles.');
  };

  const handleSave = () => {
    if (editedItem) {
      const finalHex = currentLiveHex;
      onSave({
        ...editedItem,
        slot: slotIndex,
        hex: finalHex,
        isModified: true,
      });
      setIsEditing(false);
      onClose();
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Eliminar Ítem',
      `¿Deseas eliminar permanentemente '${editedItem.name}' del slot #${slotIndex}?`,
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

  const getRarityColor = () => {
    if (editedItem.isAncient) return THEME.colors.itemAncient;
    if (editedItem.isExcellent) return THEME.colors.itemExcellent;
    if (editedItem.level >= 13) return THEME.colors.itemPlus15;
    return THEME.colors.primaryOrange;
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Panel style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleContainer}>
              <Text style={[styles.title, { color: getRarityColor() }]} numberOfLines={1}>
                {editedItem.name} {editedItem.level > 0 ? `+${editedItem.level}` : ''}
              </Text>
              <Text style={styles.subtitle}>
                Slot #{slotIndex} • Index ({editedItem.group}, {editedItem.index}) • Tamaño: {editedItem.width}×{editedItem.height}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <MuIcon name="close" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.body}
            contentContainerStyle={styles.bodyContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            {/* Sprite Preview Card */}
            <View style={[styles.spriteCard, { borderColor: getRarityColor() }]}>
              <ItemImage
                item={editedItem}
                size={76}
                fallbackIcon={(editedItem.spriteKey as any) || 'shield-outline'}
                fallbackColor={getRarityColor()}
              />
              <View style={styles.badgeRow}>
                {editedItem.isAncient && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(91, 141, 239, 0.2)' }]}>
                    <Text style={[styles.pillText, { color: THEME.colors.itemAncient }]}>Ancient</Text>
                  </View>
                )}
                {editedItem.isExcellent && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(63, 207, 142, 0.2)' }]}>
                    <Text style={[styles.pillText, { color: THEME.colors.itemExcellent }]}>Excellent</Text>
                  </View>
                )}
                {editedItem.option380 && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(226, 112, 58, 0.2)' }]}>
                    <Text style={[styles.pillText, { color: THEME.colors.item380 }]}>PvP 380</Text>
                  </View>
                )}
                {((editedItem.harmonyType || 0) > 0) && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(255,215,0,0.2)' }]}>
                    <Text style={[styles.pillText, { color: '#FFD700' }]}>Harmony</Text>
                  </View>
                )}
                {enableSockets && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(224, 195, 128, 0.2)' }]}>
                    <Text style={[styles.pillText, { color: '#E0C380' }]}>Sockets</Text>
                  </View>
                )}
              </View>
            </View>

            {/* General Attributes */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>NIVEL Y OPCIÓN</Text>

              {/* Level Control / Bundle Size */}
              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>
                  {isJewelBundle(editedItem.group, editedItem.index, editedItem.name)
                    ? 'Paquete de Joyas (Bundle):'
                    : 'Nivel (+0 a +15):'}
                </Text>
                {isEditing ? (
                  isJewelBundle(editedItem.group, editedItem.index, editedItem.name) ? (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {[
                        { lvl: 0, count: 10, label: 'x10 Joyas' },
                        { lvl: 1, count: 20, label: 'x20 Joyas' },
                        { lvl: 2, count: 30, label: 'x30 Joyas' },
                      ].map((b) => {
                        const isSelected = editedItem.level === b.lvl;
                        return (
                          <TouchableOpacity
                            key={`bundle_lvl_${b.lvl}`}
                            style={{ height: 32, borderRadius: 2, overflow: 'hidden' }}
                            onPress={() =>
                              setEditedItem({
                                ...editedItem,
                                level: b.lvl,
                                durability: b.count,
                                isModified: true,
                              })
                            }
                            activeOpacity={0.7}
                          >
                            <ImageBackground
                              source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                              style={{ height: '100%', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}
                              resizeMode="stretch"
                            >
                              <Text
                                style={{
                                  color: isSelected ? THEME.colors.oroClaro : THEME.colors.textoSecundarioLuminoso,
                                  fontSize: 11,
                                  fontWeight: 'bold',
                                }}
                              >
                                {b.label}
                              </Text>
                            </ImageBackground>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() =>
                          setEditedItem({ ...editedItem, level: Math.max(0, editedItem.level - 1), isModified: true })
                        }
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.stepBtnText}>-</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>+{editedItem.level}</Text>
                      <TouchableOpacity
                        style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() =>
                          setEditedItem({ ...editedItem, level: Math.min(15, editedItem.level + 1), isModified: true })
                        }
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ width: 48, height: 38, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                        onPress={() => setEditedItem({ ...editedItem, level: 15, isModified: true })}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.tabs.tabModeActive}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.maxBtnText}>MAX</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    </View>
                  )
                ) : (
                  <Text style={styles.rowVal}>
                    {isJewelBundle(editedItem.group, editedItem.index, editedItem.name)
                      ? `x${getBundleQuantity(editedItem.level, editedItem.durability)} Joyas (+${editedItem.level})`
                      : `+${editedItem.level}`}
                  </Text>
                )}
              </View>

              {/* Option (Life) */}
              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Opción (+0 a +28):</Text>
                {isEditing ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() =>
                        setEditedItem({ ...editedItem, option: Math.max(0, editedItem.option - 1), isModified: true })
                      }
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.stepBtnText}>-</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>+{editedItem.option * 4}</Text>
                    <TouchableOpacity
                      style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                      onPress={() =>
                        setEditedItem({ ...editedItem, option: Math.min(7, editedItem.option + 1), isModified: true })
                      }
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.buttons.small}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ width: 48, height: 38, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                      onPress={() => setEditedItem({ ...editedItem, option: 7, isModified: true })}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeActive}
                        style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.maxBtnText}>MAX</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.rowVal}>+{editedItem.option * 4}</Text>
                )}
              </View>

              {/* Durability / Quantity */}
              <View style={{ marginBottom: 10 }}>
                <View style={[styles.rowItem, { marginBottom: isEditing ? 6 : 0 }]}>
                  <Text style={styles.rowLabel}>Durabilidad / Cantidad (Pila):</Text>
                  {isEditing ? (
                    <View style={styles.stepper}>
                      <TouchableOpacity
                        style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() =>
                          setEditedItem({
                            ...editedItem,
                            durability: Math.max(0, (editedItem.durability ?? 255) - 1),
                            isModified: true,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.stepBtnText}>-</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                      <TextInput
                        style={styles.numInput}
                        keyboardType="numeric"
                        value={String(editedItem.durability ?? 255)}
                        onChangeText={(t) =>
                          setEditedItem({
                            ...editedItem,
                            durability: Math.min(255, Math.max(0, parseInt(t, 10) || 0)),
                            isModified: true,
                          })
                        }
                      />
                      <TouchableOpacity
                        style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                        onPress={() =>
                          setEditedItem({
                            ...editedItem,
                            durability: Math.min(255, (editedItem.durability ?? 255) + 1),
                            isModified: true,
                          })
                        }
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.buttons.small}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ width: 48, height: 38, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                        onPress={() => setEditedItem({ ...editedItem, durability: 255, isModified: true })}
                        activeOpacity={0.7}
                      >
                        <ImageBackground
                          source={STITCH_ASSETS.tabs.tabModeActive}
                          style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                          resizeMode="stretch"
                        >
                          <Text style={styles.maxBtnText}>MAX</Text>
                        </ImageBackground>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.rowVal}>{editedItem.durability} / 255</Text>
                  )}
                </View>

                {isEditing && (
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                    {[1, 10, 30, 50, 100, 255].map((qtyVal) => {
                      const isAct = editedItem.durability === qtyVal;
                      return (
                        <TouchableOpacity
                          key={`dur_chip_${qtyVal}`}
                          style={{ height: 28, borderRadius: 2, overflow: 'hidden' }}
                          onPress={() =>
                            setEditedItem({
                              ...editedItem,
                              durability: qtyVal,
                              isModified: true,
                            })
                          }
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={isAct ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                            style={{ height: '100%', paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text
                              style={{
                                color: isAct ? THEME.colors.oroClaro : THEME.colors.textoSecundarioLuminoso,
                                fontSize: 10,
                                fontWeight: 'bold',
                              }}
                            >
                              {qtyVal === 255 ? 'x255' : `x${qtyVal}`}
                            </Text>
                          </ImageBackground>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Switches: Luck, Skill, PvP 380 */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>ATRIBUTOS ESPECIALES</Text>

              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Suerte (Luck + Crítico):</Text>
                {isEditing ? (
                  <Switch
                    value={editedItem.luck}
                    onValueChange={(val) => setEditedItem({ ...editedItem, luck: val, isModified: true })}
                    trackColor={{ false: '#333333', true: THEME.colors.accentGreen }}
                    thumbColor={editedItem.luck ? THEME.colors.jade : THEME.colors.textMuted}
                  />
                ) : (
                  <Text style={styles.rowVal}>{editedItem.luck ? 'Sí' : 'No'}</Text>
                )}
              </View>

              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Habilidad (Skill):</Text>
                {isEditing ? (
                  <Switch
                    value={editedItem.skill}
                    onValueChange={(val) => setEditedItem({ ...editedItem, skill: val, isModified: true })}
                    trackColor={{ false: '#333333', true: THEME.colors.primaryOrange }}
                    thumbColor={editedItem.skill ? THEME.colors.primaryOrange : THEME.colors.textMuted}
                  />
                ) : (
                  <Text style={styles.rowVal}>{editedItem.skill ? 'Sí' : 'No'}</Text>
                )}
              </View>

              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Opción 380 PvP:</Text>
                {isEditing ? (
                  <Switch
                    value={!!editedItem.option380}
                    onValueChange={(val) => setEditedItem({ ...editedItem, option380: val, isModified: true })}
                    trackColor={{ false: '#333333', true: THEME.colors.item380 }}
                    thumbColor={editedItem.option380 ? THEME.colors.item380 : THEME.colors.textMuted}
                  />
                ) : (
                  <Text style={styles.rowVal}>{editedItem.option380 ? 'Sí' : 'No'}</Text>
                )}
              </View>
            </View>

            {/* Fenrir Special Color Selector */}
            {isFenrir && (
              <View style={[styles.section, { borderColor: '#EAB308', borderWidth: 1, backgroundColor: '#1A1608' }]}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={[styles.sectionHeading, { color: '#FACC15' }]}>COLOR / TIPO DE FENRIR</Text>
                  <Text style={{ fontSize: 11, color: THEME.colors.textoSecundario }}>Season 6 Louis</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Rojo (Normal)', flags: 0, color: '#FF5252', desc: 'Estándar' },
                    { label: 'Negro (Destrucción)', flags: 1, color: THEME.colors.textoSecundario, desc: '+10% Daño' },
                    { label: 'Azul (Protección)', flags: 2, color: '#64B5F6', desc: '+10% Absorción' },
                    { label: 'Dorado (Golden)', flags: 4, color: THEME.colors.oroClaro, desc: 'Especial / Ilusión' },
                  ].map((fen) => {
                    const isSelected = (editedItem.excellentFlags || 0) === fen.flags;
                    return (
                      <TouchableOpacity
                        key={'fenrir_' + fen.flags}
                        disabled={!isEditing}
                        onPress={() => {
                          setEditedItem({
                            ...editedItem,
                            excellentFlags: fen.flags,
                            isExcellent: fen.flags > 0,
                            isModified: true,
                          });
                        }}
                        style={{
                          flex: 1,
                          minWidth: '46%',
                          paddingVertical: 10,
                          paddingHorizontal: 8,
                          borderRadius: 2,
                          borderWidth: 1.5,
                          borderColor: isSelected ? fen.color : '#333338',
                          backgroundColor: isSelected ? `${fen.color}22` : '#18181B',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? fen.color : THEME.colors.texto }}>
                          {fen.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: THEME.colors.textoSecundarioLuminoso, marginTop: 2, fontWeight: '600', ...THEME.effects.textShadowSubtle }}>{fen.desc}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Excellent Options */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>OPCIONES EXCELENTES</Text>
                {isEditing && (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={{ height: 32, borderRadius: 2, overflow: 'hidden' }}
                      onPress={handleSetFullExc}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeActive}
                        style={{ height: '100%', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={[styles.quickActionBtnText, { color: THEME.colors.oroClaro, fontWeight: '900' }]}>Full Exc</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ height: 32, borderRadius: 2, overflow: 'hidden' }}
                      onPress={handleClearExc}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={STITCH_ASSETS.tabs.tabModeInactive}
                        style={{ height: '100%', paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text style={styles.quickActionBtnText}>Limpiar</Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.excChipsGrid}>
                {excOptions.map((opt) => {
                  const isChecked = ((editedItem.excellentFlags || 0) & opt.bit) !== 0;
                  return (
                    <TouchableOpacity
                      key={opt.bit}
                      style={{ minHeight: 44, borderRadius: 2, overflow: 'hidden' }}
                      disabled={!isEditing}
                      onPress={() => toggleExcBit(opt.bit)}
                      activeOpacity={0.7}
                    >
                      <ImageBackground
                        source={isChecked ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 }}
                        resizeMode="stretch"
                      >
                        {isChecked ? (
                          <MuIcon name="check" size={16} color={THEME.colors.oroClaro} />
                        ) : (
                          <View style={{ width: 16, height: 16, borderRadius: 2, borderWidth: 1, borderColor: '#5A5242', backgroundColor: '#090A09' }} />
                        )}
                        <Text
                          style={[
                            styles.excChipText,
                            isChecked && { color: THEME.colors.oroClaro, fontWeight: '800' },
                          ]}
                        >
                          {opt.name}
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sockets Section (1 to 5) */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>RANURAS DE SOCKETS (1 AL 5)</Text>
                {isEditing && (
                  <Switch
                    value={enableSockets}
                    onValueChange={(val) => {
                      setEnableSockets(val);
                      const updatedSockets = val
                        ? (editedItem.sockets && editedItem.sockets.length === 5 ? editedItem.sockets : [0xFE, 0xFE, 0xFE, 0xFE, 0xFE])
                        : [0xFF, 0xFF, 0xFF, 0xFF, 0xFF];
                      setEditedItem({
                        ...editedItem,
                        sockets: updatedSockets,
                        isModified: true,
                      });
                    }}
                    trackColor={{ false: THEME.colors.casillaFondo, true: THEME.colors.borde }}
                    thumbColor={enableSockets ? THEME.colors.oroClaro : THEME.colors.textMuted}
                  />
                )}
              </View>

              {enableSockets && !isEditing && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  {[0, 1, 2, 3, 4].map((sIdx) => {
                    const currentVal = (editedItem.sockets && editedItem.sockets[sIdx] !== undefined)
                      ? editedItem.sockets[sIdx]
                      : 0xFF;
                    const sockInfo = decodeSocketByte(currentVal);
                    if (sockInfo.isNone) return null;
                    return (
                      <View key={`socket_view_${sIdx}`} style={styles.socketDisplayRow}>
                        <Text style={styles.socketDisplayIndex}>Entrada {sIdx + 1}:</Text>
                        <Text style={[styles.socketDisplayText, sockInfo.hasSeed && { color: '#E0C380' }]}>
                          {sockInfo.hasSeed ? sockInfo.fullDescription : sockInfo.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}

              {enableSockets && isEditing && (
                <View style={{ marginTop: 8, gap: 14 }}>
                  {[0, 1, 2, 3, 4].map((sIdx) => {
                    const currentVal = (editedItem.sockets && editedItem.sockets[sIdx] !== undefined)
                      ? editedItem.sockets[sIdx]
                      : 0xFF;
                    const sockInfo = decodeSocketByte(currentVal);
                    const currentLvl = sockInfo.hasSeed ? sockInfo.level : (socketLevels[sIdx] || 1);
                    const currentOptions = getQuickSocketOptions(currentLvl);

                    return (
                      <View key={`socket_modal_${sIdx}`} style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 2, borderWidth: 1, borderColor: '#4C463A' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.socketLabel}>Slot #{sIdx + 1}:</Text>
                          <Text style={{ fontSize: 11, color: '#E0C380', fontWeight: '700' }}>
                            {sockInfo.hasSeed ? sockInfo.fullDescription : sockInfo.label}
                          </Text>
                        </View>

                        {/* Selector de Nivel / Tipo de Seed Sphere (Lv.1 a Lv.5) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: THEME.colors.textoSecundario, fontWeight: '600' }}>Esfera:</Text>
                          {SEED_SPHERE_LEVELS.map((sl) => {
                            const isLvlActive = currentLvl === sl.level;
                            return (
                              <TouchableOpacity
                                key={`lvl_${sIdx}_${sl.level}`}
                                style={{ height: 26, borderRadius: 2, overflow: 'hidden' }}
                                activeOpacity={0.7}
                                onPress={() => {
                                  const updatedLevels = [...socketLevels];
                                  updatedLevels[sIdx] = sl.level;
                                  setSocketLevels(updatedLevels);

                                  if (sockInfo.hasSeed && sockInfo.optionId >= 0) {
                                    const newByte = encodeSocketByte(sockInfo.optionId, sl.level);
                                    const newSockets = [...(editedItem.sockets || [0xFF, 0xFF, 0xFF, 0xFF, 0xFF])];
                                    newSockets[sIdx] = newByte;
                                    setEditedItem({
                                      ...editedItem,
                                      sockets: newSockets,
                                      isModified: true,
                                    });
                                  }
                                }}
                              >
                                <ImageBackground
                                  source={isLvlActive ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                                  style={{ height: '100%', paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center' }}
                                  resizeMode="stretch"
                                >
                                  <Text style={{
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    color: isLvlActive ? THEME.colors.oroClaro : '#C5B5A5',
                                  }}>
                                    {sl.badge}
                                  </Text>
                                </ImageBackground>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          <View style={{ flexDirection: 'row', gap: 4 }}>
                            {currentOptions.map((so) => {
                              const isActive = currentVal === so.val;
                              return (
                                <TouchableOpacity
                                  key={`so_${sIdx}_${so.val}`}
                                  style={[
                                    styles.socketOptionBtn,
                                    isActive && styles.socketOptionBtnActive,
                                  ]}
                                  onPress={() => {
                                    const newSockets = [...(editedItem.sockets || [0xFF, 0xFF, 0xFF, 0xFF, 0xFF])];
                                    newSockets[sIdx] = so.val;
                                    setEditedItem({
                                      ...editedItem,
                                      sockets: newSockets,
                                      isModified: true,
                                    });
                                    if (so.optionId >= 0) {
                                      const updatedLevels = [...socketLevels];
                                      updatedLevels[sIdx] = currentLvl;
                                      setSocketLevels(updatedLevels);
                                    }
                                  }}
                                >
                                  <Text
                                    style={[
                                      styles.socketOptionText,
                                      isActive && styles.socketOptionTextActive,
                                    ]}
                                  >
                                    {so.label}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Ancient Options */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>OPCIONES ANCIENT</Text>
                {editedItem.isAncient && (
                  <View style={[{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 2, borderWidth: 1 }, { backgroundColor: 'rgba(91, 141, 239, 0.15)', borderColor: THEME.colors.itemAncient }]}>
                    <Text style={{ fontSize: 10, color: THEME.colors.itemAncient, fontWeight: 'bold' }}>
                      {editedItem.ancientSetName || 'ANCIENT'} (+{decodeAncientByte(editedItem.ancientOption).staminaBonus} Stam)
                    </Text>
                  </View>
                )}
              </View>

              {!isItemAncientEligible(editedItem.group, editedItem.index) ? (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 2, borderWidth: 1, borderColor: '#333' }}>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 12 }}>
                    ℹ️ Esta pieza ({editedItem.name}) no posee ningún set Ancient oficial en Season 6.
                  </Text>
                  {editedItem.isAncient && isEditing && (
                    <MuButton
                      titulo="Quitar Ancient (Convertir a Normal)"
                      icono="trash-can-outline"
                      variante="danger"
                      altura={38}
                      onPress={() => {
                        const baseDef = ItemDatabase.findItem(editedItem.group, editedItem.index);
                        setEditedItem({
                          ...editedItem,
                          ancientOption: 0,
                          ancientTier: 0,
                          ancientStatBonus: 0,
                          ancientSetName: undefined,
                          isAncient: false,
                          name: baseDef.name,
                          isModified: true,
                        });
                      }}
                      style={{ marginTop: 8 }}
                    />
                  )}
                </View>
              ) : (
                <View>
                  <Text style={{ color: THEME.colors.textoSecundario, fontSize: 11, marginBottom: 8 }}>
                    Sets Ancient oficiales correspondientes a esta pieza:
                  </Text>
                  <View style={styles.ancientRow}>
                    {/* Botón Normal */}
                    <TouchableOpacity
                      style={{ borderRadius: 2, overflow: 'hidden' }}
                      disabled={!isEditing}
                      activeOpacity={0.7}
                      onPress={() => {
                        const baseDef = ItemDatabase.findItem(editedItem.group, editedItem.index);
                        setEditedItem({
                          ...editedItem,
                          ancientOption: 0,
                          ancientTier: 0,
                          ancientStatBonus: 0,
                          ancientSetName: undefined,
                          isAncient: false,
                          name: baseDef.name,
                          isModified: true,
                        });
                      }}
                    >
                      <ImageBackground
                        source={editedItem.ancientOption === 0 ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                        style={{ paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                        resizeMode="stretch"
                      >
                        <Text
                          style={[
                            styles.ancientBtnText,
                            editedItem.ancientOption === 0 && { color: THEME.colors.oroClaro, fontWeight: 'bold' },
                          ]}
                        >
                          Normal (Sin Ancient)
                        </Text>
                      </ImageBackground>
                    </TouchableOpacity>

                    {/* Sets específicos disponibles para este item */}
                    {getAvailableAncientOptionsForItem(editedItem.group, editedItem.index).map((anc) => {
                      const currentDecoded = decodeAncientByte(editedItem.ancientOption);
                      const isSelected = currentDecoded.tier === anc.tier && editedItem.ancientOption > 0;
                      return (
                        <TouchableOpacity
                          key={`anc_set_${anc.tier}_${anc.setId}`}
                          style={{ borderRadius: 2, overflow: 'hidden' }}
                          disabled={!isEditing}
                          activeOpacity={0.7}
                          onPress={() => {
                            const currentStam = currentDecoded.staminaBonus === 10 ? 10 : 5;
                            const newByte8 = encodeAncientByte(anc.tier, currentStam);
                            const info = getAncientInfo(editedItem.group, editedItem.index, newByte8);
                            const baseDef = ItemDatabase.findItem(editedItem.group, editedItem.index);
                            const newName = (info.setName ? `${info.setName} ${baseDef.name}` : baseDef.name);
                            setEditedItem({
                              ...editedItem,
                              ancientOption: newByte8,
                              ancientTier: info.tier,
                              ancientStatBonus: info.staminaBonus,
                              ancientSetName: info.setName || undefined,
                              isAncient: true,
                              name: newName,
                              isModified: true,
                            });
                          }}
                        >
                          <ImageBackground
                            source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                            style={{ paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text
                              style={[
                                styles.ancientBtnText,
                                isSelected && { color: THEME.colors.oroClaro, fontWeight: 'bold' },
                              ]}
                            >
                              {anc.name} (Tier {anc.tier})
                            </Text>
                          </ImageBackground>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Stamina Bonus Selector si el ítem es Ancient */}
                  {editedItem.isAncient && (
                    <View style={{ marginTop: 10, padding: 8, backgroundColor: 'rgba(91, 141, 239, 0.05)', borderRadius: 2, borderWidth: 1, borderColor: 'rgba(91, 141, 239, 0.2)' }}>
                      <Text style={{ fontSize: 11, color: THEME.colors.itemAncient, fontWeight: 'bold', marginBottom: 6 }}>
                        Bonificación de Atributo Ancient (Stamina):
                      </Text>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        {[5, 10].map((bonus) => {
                          const currentDecoded = decodeAncientByte(editedItem.ancientOption);
                          const isSelBonus = currentDecoded.staminaBonus === bonus;
                          return (
                            <TouchableOpacity
                              key={`stam_${bonus}`}
                              style={{ flex: 1, height: 34, borderRadius: 2, overflow: 'hidden' }}
                              disabled={!isEditing}
                              activeOpacity={0.7}
                              onPress={() => {
                                const newByte8 = encodeAncientByte(currentDecoded.tier || 1, bonus);
                                const info = getAncientInfo(editedItem.group, editedItem.index, newByte8);
                                setEditedItem({
                                  ...editedItem,
                                  ancientOption: newByte8,
                                  ancientTier: info.tier,
                                  ancientStatBonus: info.staminaBonus,
                                  ancientSetName: info.setName || undefined,
                                  isModified: true,
                                });
                              }}
                            >
                              <ImageBackground
                                source={isSelBonus ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                                style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                                resizeMode="stretch"
                              >
                                <Text style={{ fontSize: 11, color: isSelBonus ? THEME.colors.oroClaro : THEME.colors.textoSecundario, fontWeight: isSelBonus ? 'bold' : 'normal' }}>
                                  +{bonus} Stamina ({bonus === 5 ? 'Standard' : 'Max'})
                                </Text>
                              </ImageBackground>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Mostrar las opciones del set Ancient seleccionado */}
                      {(() => {
                        const info = getAncientInfo(editedItem.group, editedItem.index, editedItem.ancientOption);
                        if (!info.set) return null;
                        return (
                          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(91, 141, 239, 0.25)' }}>
                            <Text style={{ fontSize: 11.5, color: '#7CA8FF', fontWeight: '800', marginBottom: 3, ...THEME.effects.textShadowSubtle }}>
                              Propiedades del Set {info.set.name}:
                            </Text>
                            {info.set.options.slice(0, 4).map((opt, oIdx) => (
                              <Text key={`anc_prop_${oIdx}`} style={{ fontSize: 11, color: THEME.colors.textoSecundarioLuminoso, fontWeight: '600', ...THEME.effects.textShadowSubtle }}>
                                • {opt.optName}: +{opt.val}
                              </Text>
                            ))}
                            {info.set.fullOptions.length > 0 && (
                              <Text style={{ fontSize: 11, color: '#7CA8FF', marginTop: 3, fontStyle: 'italic', fontWeight: '700', ...THEME.effects.textShadowSubtle }}>
                                • Full Set: {info.set.fullOptions[0].optName} +{info.set.fullOptions[0].val}
                              </Text>
                            )}
                          </View>
                        );
                      })()}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Jewel of Harmony Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[styles.sectionHeading, { color: '#E0C380' }]}>JEWEL OF HARMONY</Text>
                  {((editedItem.harmonyType || 0) > 0) && (
                    <Text style={{ fontSize: 11, color: '#FFD700', fontWeight: 'bold' }}>
                      (Tipo {editedItem.harmonyType} +{editedItem.harmonyLevel || 0})
                    </Text>
                  )}
                </View>
                {isEditing && (
                  <Switch
                    value={(editedItem.harmonyType || 0) > 0}
                    onValueChange={(val) => {
                      setEditedItem({
                        ...editedItem,
                        harmonyType: val ? 1 : 0,
                        harmonyLevel: val ? Math.max(1, editedItem.harmonyLevel || 13) : 0,
                        isModified: true,
                      });
                    }}
                    trackColor={{ false: '#333333', true: '#FFD700' }}
                    thumbColor={(editedItem.harmonyType || 0) > 0 ? '#FFD700' : THEME.colors.textMuted}
                  />
                )}
              </View>

              {((editedItem.harmonyType || 0) > 0) && (
                <View style={{ marginTop: 8, gap: 10 }}>
                  <Text style={{ fontSize: 12, color: THEME.colors.textoSecundario, fontWeight: '600' }}>
                    Tipo de Opción ({isWeapon ? 'Arma / Báculo' : 'Armadura / Escudo'}):
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                    {harmonyOptions.filter((h) => h.id > 0).map((h) => {
                      const isSel = editedItem.harmonyType === h.id;
                      return (
                        <TouchableOpacity
                          key={`harm_opt_${h.id}`}
                          disabled={!isEditing}
                          style={[
                            styles.harmonyOptionBtn,
                            isSel && styles.harmonyOptionBtnActive,
                          ]}
                          onPress={() => {
                            setEditedItem({
                              ...editedItem,
                              harmonyType: h.id,
                              harmonyLevel: Math.max(1, editedItem.harmonyLevel || 13),
                              isModified: true,
                            });
                          }}
                        >
                          <Text
                            style={[
                              styles.harmonyOptionText,
                              isSel && styles.harmonyOptionTextActive,
                            ]}
                          >
                            {h.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* Harmony Level Stepper */}
                  <View style={[styles.rowItem, { marginTop: 4 }]}>
                    <Text style={styles.rowLabel}>Nivel de Harmony (+0 a +13):</Text>
                    {isEditing ? (
                      <View style={styles.stepper}>
                        <TouchableOpacity
                          style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                          onPress={() =>
                            setEditedItem({
                              ...editedItem,
                              harmonyLevel: Math.max(0, (editedItem.harmonyLevel || 0) - 1),
                              isModified: true,
                            })
                          }
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={STITCH_ASSETS.buttons.small}
                            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={styles.stepBtnText}>-</Text>
                          </ImageBackground>
                        </TouchableOpacity>
                        <Text style={styles.stepperVal}>+{editedItem.harmonyLevel || 0}</Text>
                        <TouchableOpacity
                          style={{ width: 38, height: 38, borderRadius: 2, overflow: 'hidden' }}
                          onPress={() =>
                            setEditedItem({
                              ...editedItem,
                              harmonyLevel: Math.min(13, (editedItem.harmonyLevel || 0) + 1),
                              isModified: true,
                            })
                          }
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={STITCH_ASSETS.buttons.small}
                            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={styles.stepBtnText}>+</Text>
                          </ImageBackground>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={{ width: 48, height: 38, borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}
                          onPress={() =>
                            setEditedItem({
                              ...editedItem,
                              harmonyLevel: 13,
                              isModified: true,
                            })
                          }
                          activeOpacity={0.7}
                        >
                          <ImageBackground
                            source={STITCH_ASSETS.tabs.tabModeActive}
                            style={{ width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' }}
                            resizeMode="stretch"
                          >
                            <Text style={styles.maxBtnText}>MAX</Text>
                          </ImageBackground>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.rowVal}>+{editedItem.harmonyLevel || 0}</Text>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Raw Hex Preview with Copy Button */}
            <View style={styles.rawHexCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.rawHexLabel}>CADENA HEXADECIMAL (16 BYTES / 32 CARACTERES):</Text>
                <TouchableOpacity onPress={handleCopyHex} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <MuIcon name="save" size={16} />
                </TouchableOpacity>
              </View>
              <Text style={styles.rawHexCode} selectable={true}>
                {currentLiveHex || 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons: Eliminar, Modo Edición, Guardar Cambios */}
          <View style={styles.footerRowStitch}>
            <View style={{ width: 48 }}>
              <MuButton
                titulo=""
                icono="delete"
                variante="danger"
                onPress={handleDelete}
                altura={44}
                accessibilityLabel="Eliminar ítem"
              />
            </View>

            <View style={{ flex: 1 }}>
              <MuButton
                titulo={isEditing ? 'Editando' : 'Editar'}
                icono={isEditing ? 'lock' : 'edit'}
                variante={isEditing ? 'primary' : 'secondary'}
                onPress={() => setIsEditing(!isEditing)}
                altura={44}
              />
            </View>

            <View style={{ flex: 1.3 }}>
              <MuButton
                titulo={isEditing ? 'Guardar' : 'Cerrar'}
                icono={isEditing ? 'save' : 'close'}
                variante={isEditing ? 'success' : 'primary'}
                onPress={isEditing ? handleSave : onClose}
                altura={44}
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: THEME.spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 420,
    height: '90%',
    maxHeight: '90%',
    overflow: 'hidden',
    flexDirection: 'column',
    alignSelf: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: THEME.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    backgroundColor: THEME.colors.superficie,
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E0C380',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.8,
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
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: THEME.spacing.md,
    paddingBottom: 60,
  },
  spriteCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.md,
    backgroundColor: '#0D0E0D',
    borderRadius: 2,
    borderWidth: 1.5,
    borderColor: '#4C463A',
    marginBottom: THEME.spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  section: {
    marginBottom: THEME.spacing.md,
    backgroundColor: '#1F201F',
    borderRadius: 2,
    padding: THEME.spacing.md,
    borderWidth: 1.2,
    borderColor: '#4C463A',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#E0C380',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: THEME.typography.fontTitle,
    ...THEME.effects.textShadow,
  },
  quickActionBtn: {
    backgroundColor: 'rgba(224, 195, 128, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
  },
  quickActionBtnText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#E0C380',
    ...THEME.effects.textShadowSubtle,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: THEME.colors.texto,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  rowVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E0C380',
    ...THEME.effects.textShadow,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    backgroundColor: '#1B1C1B',
    width: 44,
    height: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4C463A',
  },
  stepBtnText: {
    color: '#E0C380',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepperVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E0C380',
    minWidth: 32,
    textAlign: 'center',
  },
  maxBtn: {
    backgroundColor: '#E0C380',
    borderColor: '#EFD28D',
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxBtnText: {
    color: '#FEDF99',
    fontSize: 10,
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  numInput: {
    backgroundColor: '#0D0E0D',
    color: THEME.colors.texto,
    borderWidth: 1,
    borderColor: '#4C463A',
    borderRadius: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    width: 60,
    height: 44,
    textAlign: 'center',
    fontWeight: '800',
  },
  excChipsGrid: {
    gap: 6,
    marginTop: 4,
  },
  excChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    minHeight: 44,
    backgroundColor: '#1B1C1B',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    gap: 8,
  },
  excChipActive: {
    borderColor: '#3FCF8E',
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
  },
  excChipText: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    flex: 1,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  socketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socketLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#E0C380',
    width: 60,
    ...THEME.effects.textShadowSubtle,
  },
  socketOptionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    backgroundColor: '#1B1C1B',
  },
  socketOptionBtnActive: {
    borderColor: '#E0C380',
    backgroundColor: 'rgba(224, 195, 128, 0.2)',
  },
  socketOptionText: {
    fontSize: 10.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  socketOptionTextActive: {
    color: '#E0C380',
    fontWeight: '800',
    ...THEME.effects.textShadow,
  },
  socketDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1B1C1B',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: 44,
    gap: 8,
  },
  socketDisplayIndex: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#E0C380',
    minWidth: 70,
    ...THEME.effects.textShadow,
  },
  socketDisplayText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.texto,
    flex: 1,
    ...THEME.effects.textShadowSubtle,
  },
  ancientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ancientBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    backgroundColor: '#1B1C1B',
  },
  ancientBtnText: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  rawHexCard: {
    backgroundColor: '#0D0E0D',
    borderRadius: 2,
    padding: THEME.spacing.sm,
    borderWidth: 1.2,
    borderColor: '#4C463A',
    marginBottom: THEME.spacing.md,
  },
  rawHexLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.5,
    ...THEME.effects.textShadowSubtle,
  },
  rawHexCode: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 10,
    color: '#E0C380',
    marginTop: 4,
    fontWeight: '700',
    ...THEME.effects.textShadow,
  },
  footerRowStitch: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#1B1C1B',
    borderTopWidth: 1.5,
    borderTopColor: '#4C463A',
    gap: 8,
    flexShrink: 0,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: '#1B1C1B',
    borderTopWidth: 1.5,
    borderTopColor: '#4C463A',
    gap: THEME.spacing.sm,
    flexShrink: 0,
  },
  deleteBtn: {
    backgroundColor: '#E2703A',
    borderWidth: 1,
    borderColor: '#FF8A50',
    padding: 12,
    minHeight: 44,
    minWidth: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#292A29',
    borderWidth: 1.2,
    borderColor: '#4C463A',
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editBtnActive: {
    backgroundColor: '#E0C380',
    borderColor: '#EFD28D',
  },
  okBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#E0C380',
    borderWidth: 1.2,
    borderColor: '#EFD28D',
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    color: '#0D0E0D',
    fontWeight: '800',
    fontSize: 13,
  },
  harmonyOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 2,
    backgroundColor: '#1B1C1B',
    borderWidth: 1,
    borderColor: '#4C463A',
  },
  harmonyOptionBtnActive: {
    backgroundColor: 'rgba(224, 195, 128, 0.2)',
    borderColor: '#E0C380',
  },
  harmonyOptionText: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  harmonyOptionTextActive: {
    color: '#E0C380',
    fontWeight: '800',
    ...THEME.effects.textShadow,
  },
});

