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
  Alert,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialCommunityIcons } from '@expo/vector-icons';
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

import {
  decodeSocketByte,
  encodeSocketByte,
  QUICK_SOCKET_OPTIONS,
  getQuickSocketOptions,
  SEED_SPHERE_LEVELS,
} from '../../constants/socketCatalog';

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
        <View style={styles.container}>
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
              <MaterialCommunityIcons name="close" size={22} color={THEME.colors.textSecondary} />
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
                  <View style={[styles.pill, { backgroundColor: 'rgba(0,229,255,0.2)' }]}>
                    <Text style={[styles.pillText, { color: THEME.colors.itemAncient }]}>Ancient</Text>
                  </View>
                )}
                {editedItem.isExcellent && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(0,255,102,0.2)' }]}>
                    <Text style={[styles.pillText, { color: THEME.colors.itemExcellent }]}>Excellent</Text>
                  </View>
                )}
                {editedItem.option380 && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(255,64,129,0.2)' }]}>
                    <Text style={[styles.pillText, { color: THEME.colors.item380 }]}>PvP 380</Text>
                  </View>
                )}
                {((editedItem.harmonyType || 0) > 0) && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(255,215,0,0.2)' }]}>
                    <Text style={[styles.pillText, { color: '#FFD700' }]}>Harmony</Text>
                  </View>
                )}
                {enableSockets && (
                  <View style={[styles.pill, { backgroundColor: 'rgba(232,200,106,0.2)' }]}>
                    <Text style={[styles.pillText, { color: '#E8C86A' }]}>Sockets</Text>
                  </View>
                )}
              </View>
            </View>

            {/* General Attributes */}
            <View style={styles.section}>
              <Text style={styles.sectionHeading}>NIVEL Y OPCIÓN</Text>

              {/* Level Control */}
              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Nivel (+0 a +15):</Text>
                {isEditing ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setEditedItem({ ...editedItem, level: Math.max(0, editedItem.level - 1), isModified: true })
                      }
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>+{editedItem.level}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setEditedItem({ ...editedItem, level: Math.min(15, editedItem.level + 1), isModified: true })
                      }
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.maxBtn}
                      onPress={() => setEditedItem({ ...editedItem, level: 15, isModified: true })}
                    >
                      <Text style={styles.maxBtnText}>MAX</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.rowVal}>+{editedItem.level}</Text>
                )}
              </View>

              {/* Option (Life) */}
              <View style={styles.rowItem}>
                <Text style={styles.rowLabel}>Opción (+0 a +28):</Text>
                {isEditing ? (
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setEditedItem({ ...editedItem, option: Math.max(0, editedItem.option - 1), isModified: true })
                      }
                    >
                      <Text style={styles.stepBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>+{editedItem.option * 4}</Text>
                    <TouchableOpacity
                      style={styles.stepBtn}
                      onPress={() =>
                        setEditedItem({ ...editedItem, option: Math.min(7, editedItem.option + 1), isModified: true })
                      }
                    >
                      <Text style={styles.stepBtnText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.maxBtn}
                      onPress={() => setEditedItem({ ...editedItem, option: 7, isModified: true })}
                    >
                      <Text style={styles.maxBtnText}>MAX</Text>
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
                        style={styles.stepBtn}
                        onPress={() =>
                          setEditedItem({
                            ...editedItem,
                            durability: Math.max(0, (editedItem.durability ?? 255) - 1),
                            isModified: true,
                          })
                        }
                      >
                        <Text style={styles.stepBtnText}>-</Text>
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
                        style={styles.stepBtn}
                        onPress={() =>
                          setEditedItem({
                            ...editedItem,
                            durability: Math.min(255, (editedItem.durability ?? 255) + 1),
                            isModified: true,
                          })
                        }
                      >
                        <Text style={styles.stepBtnText}>+</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.maxBtn}
                        onPress={() => setEditedItem({ ...editedItem, durability: 255, isModified: true })}
                      >
                        <Text style={styles.maxBtnText}>MAX</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={styles.rowVal}>{editedItem.durability} / 255</Text>
                  )}
                </View>

                {isEditing && (
                  <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'flex-end', marginTop: 4 }}>
                    {[1, 10, 30, 50, 100, 255].map((qtyVal) => (
                      <TouchableOpacity
                        key={`dur_chip_${qtyVal}`}
                        style={{
                          backgroundColor: editedItem.durability === qtyVal ? THEME.colors.primaryOrange : '#202028',
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 4,
                          borderWidth: 1,
                          borderColor: editedItem.durability === qtyVal ? THEME.colors.primaryOrange : '#38384A',
                        }}
                        onPress={() =>
                          setEditedItem({
                            ...editedItem,
                            durability: qtyVal,
                            isModified: true,
                          })
                        }
                      >
                        <Text
                          style={{
                            color: editedItem.durability === qtyVal ? '#FFF' : '#AAA',
                            fontSize: 10,
                            fontWeight: 'bold',
                          }}
                        >
                          {qtyVal === 255 ? 'x255' : `x${qtyVal}`}
                        </Text>
                      </TouchableOpacity>
                    ))}
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
                    thumbColor={editedItem.luck ? '#00E676' : '#888'}
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
                    thumbColor={editedItem.skill ? THEME.colors.primaryOrange : '#888'}
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
                    thumbColor={editedItem.option380 ? THEME.colors.item380 : '#888'}
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
                  <Text style={{ fontSize: 11, color: '#A1A1AA' }}>Season 6 Louis</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Rojo (Normal)', flags: 0, color: '#EF4444', desc: 'Estándar' },
                    { label: 'Negro (Destrucción)', flags: 1, color: '#A1A1AA', desc: '+10% Daño' },
                    { label: 'Azul (Protección)', flags: 2, color: '#3B82F6', desc: '+10% Absorción' },
                    { label: 'Dorado (Golden)', flags: 4, color: '#EAB308', desc: 'Especial / Ilusión' },
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
                          borderRadius: 8,
                          borderWidth: 1.5,
                          borderColor: isSelected ? fen.color : '#333338',
                          backgroundColor: isSelected ? `${fen.color}22` : '#18181B',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? fen.color : '#DDD' }}>
                          {fen.label}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{fen.desc}</Text>
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
                    <TouchableOpacity style={styles.quickActionBtn} onPress={handleSetFullExc}>
                      <Text style={styles.quickActionBtnText}>Full Exc</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.quickActionBtn} onPress={handleClearExc}>
                      <Text style={styles.quickActionBtnText}>Limpiar</Text>
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
                      style={[styles.excChip, isChecked && styles.excChipActive]}
                      disabled={!isEditing}
                      onPress={() => toggleExcBit(opt.bit)}
                    >
                      <MaterialCommunityIcons
                        name={isChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                        size={18}
                        color={isChecked ? THEME.colors.accentGreenBright : '#666'}
                      />
                      <Text
                        style={[
                          styles.excChipText,
                          isChecked && { color: THEME.colors.accentGreenBright, fontWeight: '600' },
                        ]}
                      >
                        {opt.name}
                      </Text>
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
                    trackColor={{ false: '#332B24', true: '#6B5533' }}
                    thumbColor={enableSockets ? '#E8C86A' : '#8C7B6B'}
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
                        <Text style={[styles.socketDisplayText, sockInfo.hasSeed && { color: '#E8C86A' }]}>
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
                      <View key={`socket_modal_${sIdx}`} style={{ gap: 6, backgroundColor: 'rgba(255,255,255,0.02)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#2A241E' }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={styles.socketLabel}>Slot #{sIdx + 1}:</Text>
                          <Text style={{ fontSize: 11, color: '#E8C86A', fontWeight: '700' }}>
                            {sockInfo.hasSeed ? sockInfo.fullDescription : sockInfo.label}
                          </Text>
                        </View>

                        {/* Selector de Nivel / Tipo de Seed Sphere (Lv.1 a Lv.5) */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#8C7B6B', fontWeight: '600' }}>Esfera:</Text>
                          {SEED_SPHERE_LEVELS.map((sl) => {
                            const isLvlActive = currentLvl === sl.level;
                            return (
                              <TouchableOpacity
                                key={`lvl_${sIdx}_${sl.level}`}
                                style={{
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  borderRadius: 4,
                                  backgroundColor: isLvlActive ? '#E8C86A' : '#1E1A16',
                                  borderWidth: 1,
                                  borderColor: isLvlActive ? '#E8C86A' : '#3E342B',
                                }}
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
                                <Text style={{
                                  fontSize: 10,
                                  fontWeight: 'bold',
                                  color: isLvlActive ? '#120F0D' : '#C5B5A5',
                                }}>
                                  {sl.badge}
                                </Text>
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
                  <View style={[{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, borderWidth: 1 }, { backgroundColor: 'rgba(0,229,255,0.15)', borderColor: THEME.colors.itemAncient }]}>
                    <Text style={{ fontSize: 10, color: THEME.colors.itemAncient, fontWeight: 'bold' }}>
                      {editedItem.ancientSetName || 'ANCIENT'} (+{decodeAncientByte(editedItem.ancientOption).staminaBonus} Stam)
                    </Text>
                  </View>
                )}
              </View>

              {!isItemAncientEligible(editedItem.group, editedItem.index) ? (
                <View style={{ backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#333' }}>
                  <Text style={{ color: '#888', fontSize: 12 }}>
                    ℹ️ Esta pieza ({editedItem.name}) no posee ningún set Ancient oficial en Season 6.
                  </Text>
                  {editedItem.isAncient && isEditing && (
                    <TouchableOpacity
                      style={[styles.ancientBtn, { marginTop: 8, borderColor: '#FF5252' }]}
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
                      <Text style={{ color: '#FF5252', fontSize: 11, fontWeight: 'bold' }}>
                        Quitar Ancient (Convertir a Normal)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View>
                  <Text style={{ color: '#AAA', fontSize: 11, marginBottom: 8 }}>
                    Sets Ancient oficiales correspondientes a esta pieza:
                  </Text>
                  <View style={styles.ancientRow}>
                    {/* Botón Normal */}
                    <TouchableOpacity
                      style={[
                        styles.ancientBtn,
                        editedItem.ancientOption === 0 && {
                          borderColor: THEME.colors.primaryOrange,
                          backgroundColor: 'rgba(255,102,0,0.15)',
                        },
                      ]}
                      disabled={!isEditing}
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
                      <Text
                        style={[
                          styles.ancientBtnText,
                          editedItem.ancientOption === 0 && { color: THEME.colors.primaryOrange, fontWeight: 'bold' },
                        ]}
                      >
                        Normal (Sin Ancient)
                      </Text>
                    </TouchableOpacity>

                    {/* Sets específicos disponibles para este item */}
                    {getAvailableAncientOptionsForItem(editedItem.group, editedItem.index).map((anc) => {
                      const currentDecoded = decodeAncientByte(editedItem.ancientOption);
                      const isSelected = currentDecoded.tier === anc.tier && editedItem.ancientOption > 0;
                      return (
                        <TouchableOpacity
                          key={`anc_set_${anc.tier}_${anc.setId}`}
                          style={[
                            styles.ancientBtn,
                            isSelected && {
                              borderColor: THEME.colors.itemAncient,
                              backgroundColor: 'rgba(0,229,255,0.15)',
                            },
                          ]}
                          disabled={!isEditing}
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
                          <Text
                            style={[
                              styles.ancientBtnText,
                              isSelected && { color: THEME.colors.itemAncient, fontWeight: 'bold' },
                            ]}
                          >
                            {anc.name} (Tier {anc.tier})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Stamina Bonus Selector si el ítem es Ancient */}
                  {editedItem.isAncient && (
                    <View style={{ marginTop: 10, padding: 8, backgroundColor: 'rgba(0,229,255,0.05)', borderRadius: 6, borderWidth: 1, borderColor: 'rgba(0,229,255,0.2)' }}>
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
                              style={[
                                {
                                  flex: 1,
                                  paddingVertical: 6,
                                  alignItems: 'center',
                                  borderRadius: 6,
                                  borderWidth: 1,
                                  borderColor: isSelBonus ? THEME.colors.itemAncient : '#444',
                                  backgroundColor: isSelBonus ? 'rgba(0,229,255,0.2)' : 'transparent',
                                },
                              ]}
                              disabled={!isEditing}
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
                              <Text style={{ fontSize: 11, color: isSelBonus ? THEME.colors.itemAncient : '#AAA', fontWeight: isSelBonus ? 'bold' : 'normal' }}>
                                +{bonus} Stamina ({bonus === 5 ? 'Standard' : 'Max'})
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* Mostrar las opciones del set Ancient seleccionado */}
                      {(() => {
                        const info = getAncientInfo(editedItem.group, editedItem.index, editedItem.ancientOption);
                        if (!info.set) return null;
                        return (
                          <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(0,229,255,0.1)' }}>
                            <Text style={{ fontSize: 10, color: '#00E5FF', fontWeight: 'bold', marginBottom: 2 }}>
                              Propiedades del Set {info.set.name}:
                            </Text>
                            {info.set.options.slice(0, 4).map((opt, oIdx) => (
                              <Text key={`anc_prop_${oIdx}`} style={{ fontSize: 10, color: '#80DEEA' }}>
                                • {opt.optName}: +{opt.val}
                              </Text>
                            ))}
                            {info.set.fullOptions.length > 0 && (
                              <Text style={{ fontSize: 10, color: '#4DD0E1', marginTop: 2, fontStyle: 'italic' }}>
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
                  <Text style={[styles.sectionHeading, { color: '#E8C86A' }]}>JEWEL OF HARMONY</Text>
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
                    thumbColor={(editedItem.harmonyType || 0) > 0 ? '#FFD700' : '#888'}
                  />
                )}
              </View>

              {((editedItem.harmonyType || 0) > 0) && (
                <View style={{ marginTop: 8, gap: 10 }}>
                  <Text style={{ fontSize: 12, color: '#AAA', fontWeight: '600' }}>
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
                          style={styles.stepBtn}
                          onPress={() =>
                            setEditedItem({
                              ...editedItem,
                              harmonyLevel: Math.max(0, (editedItem.harmonyLevel || 0) - 1),
                              isModified: true,
                            })
                          }
                        >
                          <Text style={styles.stepBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.stepperVal}>+{editedItem.harmonyLevel || 0}</Text>
                        <TouchableOpacity
                          style={styles.stepBtn}
                          onPress={() =>
                            setEditedItem({
                              ...editedItem,
                              harmonyLevel: Math.min(13, (editedItem.harmonyLevel || 0) + 1),
                              isModified: true,
                            })
                          }
                        >
                          <Text style={styles.stepBtnText}>+</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.maxBtn}
                          onPress={() =>
                            setEditedItem({
                              ...editedItem,
                              harmonyLevel: 13,
                              isModified: true,
                            })
                          }
                        >
                          <Text style={styles.maxBtnText}>MAX</Text>
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
                  <MaterialCommunityIcons name="content-copy" size={16} color={THEME.colors.primaryOrange} />
                </TouchableOpacity>
              </View>
              <Text style={styles.rawHexCode} selectable={true}>
                {currentLiveHex || 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF'}
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons: Eliminar, Modo Edición, Guardar Cambios */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleDelete}
              accessibilityLabel="Eliminar ítem"
            >
              <MaterialCommunityIcons name="trash-can-outline" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.editBtn, isEditing && styles.editBtnActive]}
              onPress={() => setIsEditing(!isEditing)}
            >
              <MaterialCommunityIcons
                name={isEditing ? 'pencil-lock' : 'pencil'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.btnText}>{isEditing ? 'Editando' : 'Editar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.okBtn, isEditing && { backgroundColor: THEME.colors.accentGreenBright }]}
              onPress={isEditing ? handleSave : onClose}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons
                name={isEditing ? 'content-save-check' : 'close'}
                size={20}
                color="#FFFFFF"
              />
              <Text style={styles.btnText}>{isEditing ? 'Guardar Cambios' : 'Cerrar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
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
    maxWidth: 480,
    height: '90%',
    maxHeight: '94%',
    backgroundColor: '#2B2521',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6B5533',
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
    borderBottomWidth: 1.5,
    borderBottomColor: '#6B5533',
    backgroundColor: '#1E1A16',
  },
  headerTitleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '900',
    color: '#E8C86A',
    fontFamily: THEME.typography.fontTitle,
    letterSpacing: 0.8,
  },
  subtitle: {
    fontSize: 11,
    color: '#9C9182',
    marginTop: 2,
    fontWeight: '600',
  },
  closeBtn: {
    padding: 6,
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: THEME.spacing.md,
    paddingBottom: 40,
  },
  spriteCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: THEME.spacing.md,
    backgroundColor: '#100D0B',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#6B5533',
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
    borderRadius: 6,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  section: {
    marginBottom: THEME.spacing.md,
    backgroundColor: '#231D19',
    borderRadius: 6,
    padding: THEME.spacing.md,
    borderWidth: 1.2,
    borderColor: '#6B5533',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '900',
    color: '#E8C86A',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    fontFamily: THEME.typography.fontTitle,
  },
  quickActionBtn: {
    backgroundColor: 'rgba(232, 200, 106, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  quickActionBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#E8C86A',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 13,
    color: '#EDE4D3',
    fontWeight: '600',
  },
  rowVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E8C86A',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBtn: {
    backgroundColor: '#1E1A16',
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  stepBtnText: {
    color: '#E8C86A',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepperVal: {
    fontSize: 13,
    fontWeight: '900',
    color: '#E8C86A',
    minWidth: 32,
    textAlign: 'center',
  },
  maxBtn: {
    backgroundColor: '#B58F3C',
    borderColor: '#E8C86A',
    borderWidth: 1,
    paddingHorizontal: 8,
    height: 36,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maxBtnText: {
    color: '#191512',
    fontSize: 10,
    fontWeight: '900',
  },
  numInput: {
    backgroundColor: '#100D0B',
    color: '#EDE4D3',
    borderWidth: 1,
    borderColor: '#6B5533',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 12,
    width: 60,
    height: 36,
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
    backgroundColor: '#1E1A16',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    gap: 8,
  },
  excChipActive: {
    borderColor: '#3FCF8E',
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
  },
  excChipText: {
    fontSize: 12,
    color: '#9C9182',
    flex: 1,
    fontWeight: '600',
  },
  socketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  socketLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8C86A',
    width: 60,
  },
  socketOptionBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    backgroundColor: '#1E1A16',
  },
  socketOptionBtnActive: {
    borderColor: '#E8C86A',
    backgroundColor: 'rgba(232, 200, 106, 0.2)',
  },
  socketOptionText: {
    fontSize: 10,
    color: '#9C9182',
    fontWeight: '600',
  },
  socketOptionTextActive: {
    color: '#E8C86A',
    fontWeight: '800',
  },
  socketDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1A16',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3D312A',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  socketDisplayIndex: {
    fontSize: 11,
    fontWeight: '800',
    color: '#E8C86A',
    minWidth: 70,
  },
  socketDisplayText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EDE4D3',
    flex: 1,
  },
  ancientRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  ancientBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#6B5533',
    backgroundColor: '#1E1A16',
  },
  ancientBtnText: {
    fontSize: 11,
    color: '#9C9182',
    fontWeight: '600',
  },
  rawHexCard: {
    backgroundColor: '#100D0B',
    borderRadius: 6,
    padding: THEME.spacing.sm,
    borderWidth: 1.2,
    borderColor: '#6B5533',
    marginBottom: THEME.spacing.md,
  },
  rawHexLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9C9182',
    letterSpacing: 0.5,
  },
  rawHexCode: {
    fontFamily: THEME.typography.fontMono,
    fontSize: 10,
    color: '#E8C86A',
    marginTop: 4,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: THEME.spacing.md,
    backgroundColor: '#1E1A16',
    borderTopWidth: 1.5,
    borderTopColor: '#6B5533',
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
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#2B2521',
    borderWidth: 1.2,
    borderColor: '#6B5533',
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  editBtnActive: {
    backgroundColor: '#B58F3C',
    borderColor: '#E8C86A',
  },
  okBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#B58F3C',
    borderWidth: 1.2,
    borderColor: '#E8C86A',
    paddingVertical: 12,
    minHeight: 44,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  harmonyOptionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1E1A16',
    borderWidth: 1,
    borderColor: '#6B5533',
  },
  harmonyOptionBtnActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.2)',
    borderColor: '#E8C86A',
  },
  harmonyOptionText: {
    fontSize: 12,
    color: '#9C9182',
    fontWeight: '600',
  },
  harmonyOptionTextActive: {
    color: '#E8C86A',
    fontWeight: '800',
  },
});

