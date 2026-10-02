import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
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
});
