import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { ParsedItem } from '../../types/item';
import { THEME } from '../../constants/theme';
import { ItemImage } from '../common/ItemImage';
import { EXCELLENT_OPTIONS_WEAPON, EXCELLENT_OPTIONS_ARMOR } from '../../constants/muConstants';
import { getAncientInfo } from '../../constants/ancientCatalog';

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
        <View style={styles.card}>
          {/* Cabecera con Imagen grande, Título e Index */}
          <View style={styles.headerRow}>
            <View style={styles.imageBox}>
              <ItemImage
                item={item}
                size={58}
                fallbackIcon={item.spriteKey as any || 'shield-outline'}
                fallbackColor={THEME.colors.primaryOrange}
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
              <Text style={styles.attrLine}>• Level: +{item.level}</Text>
              <Text style={styles.attrLine}>• Option: +{item.option * 4}</Text>
              <Text style={styles.attrLine}>• Durability: {item.durability}</Text>
              {item.luck ? <Text style={styles.attrLine}>• Luck (Suerte)</Text> : null}
              {item.skill ? <Text style={styles.attrLine}>• Skill (Habilidad)</Text> : null}
            </View>

            {/* Opciones Excelentes si las tiene */}
            {activeExcOptions.length > 0 && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: '#3FCF8E', marginTop: 10 }]}>
                  Excelente
                </Text>
                {activeExcOptions.map((opt) => (
                  <Text key={opt.bit} style={[styles.attrLine, { color: '#3FCF8E' }]}>
                    • {opt.name}
                  </Text>
                ))}
              </View>
            )}

            {/* Ancient Set si lo tiene */}
            {ancientInfo.isAncient && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: '#5B8DEF', marginTop: 10 }]}>
                  Ancient ({ancientInfo.setName || 'Set Ancient'})
                </Text>
                <Text style={[styles.attrLine, { color: '#5B8DEF' }]}>
                  • Tier {ancientInfo.tier} (+{ancientInfo.staminaBonus} Stamina)
                </Text>
                {ancientInfo.set && ancientInfo.set.options.slice(0, 3).map((opt, i) => (
                  <Text key={`act_anc_${i}`} style={[styles.attrLine, { color: '#80DEEA' }]}>
                    • {opt.optName}: +{opt.val}
                  </Text>
                ))}
              </View>
            )}

            {/* Opción 380 */}
            {item.option380 && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: '#FF8A50', marginTop: 10 }]}>
                  Opción 380
                </Text>
                <Text style={[styles.attrLine, { color: '#FF8A50' }]}>
                  • Propiedad Especial PvP Activa
                </Text>
              </View>
            )}

            {/* Harmony */}
            {!!item.harmonyType && item.harmonyType > 0 && (
              <View style={styles.extraSection}>
                <Text style={[styles.sectionHeader, { color: '#E8C86A', marginTop: 10 }]}>
                  Harmony
                </Text>
                <Text style={[styles.attrLine, { color: '#E8C86A' }]}>
                  • Tipo {item.harmonyType} (Lv +{item.harmonyLevel})
                </Text>
              </View>
            )}
          </ScrollView>

          {/* Fila de Acciones Rápidas (Full Exc +15 y Duplicar) */}
          {(onQuickMax || onDuplicate) && (
            <View style={styles.quickActionsRow}>
              {onQuickMax && (
                <TouchableOpacity
                  style={styles.btnQuickMax}
                  onPress={() => {
                    onClose();
                    setTimeout(() => onQuickMax(item, slotIndex), 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnQuickMaxText}>Full Exc +15</Text>
                </TouchableOpacity>
              )}
              {onDuplicate && (
                <TouchableOpacity
                  style={styles.btnDuplicate}
                  onPress={() => {
                    onClose();
                    setTimeout(() => onDuplicate(item, slotIndex), 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnDuplicateText}>Duplicar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Botonera de Acciones Principales (OK | MOVER | EDITAR | ELIMINAR) */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.btnOk} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.btnOkText} numberOfLines={1}>OK</Text>
            </TouchableOpacity>

            {onMove && (
              <TouchableOpacity style={styles.btnMove} onPress={handleMovePress} activeOpacity={0.7}>
                <Text style={styles.btnMoveText} numberOfLines={1}>MOVER</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.btnEdit} onPress={handleEditPress} activeOpacity={0.7}>
              <Text style={styles.btnEditText} numberOfLines={1}>EDITAR</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnDelete} onPress={handleDeletePress} activeOpacity={0.7}>
              <Text style={styles.btnDeleteText} numberOfLines={1}>ELIMINAR</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    maxHeight: '90%',
    backgroundColor: '#2B2521',
    borderRadius: 6,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
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
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    color: THEME.colors.oro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  subtitle: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    marginTop: 2,
    fontWeight: '700',
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
    color: THEME.colors.oro,
    fontFamily: THEME.typography.fontTitle,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
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
    borderRadius: 6,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnQuickMaxText: {
    color: THEME.colors.jade,
    fontSize: 12,
    fontWeight: '900',
  },
  btnDuplicate: {
    flex: 1,
    backgroundColor: 'rgba(91, 141, 239, 0.12)',
    borderWidth: 1,
    borderColor: THEME.colors.arcano,
    borderRadius: 6,
    paddingVertical: 10,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDuplicateText: {
    color: THEME.colors.arcano,
    fontSize: 12,
    fontWeight: '900',
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
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borde,
  },
  btnOkText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontWeight: '800',
  },
  btnMove: {
    flex: 1.1,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1708',
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borde,
  },
  btnMoveText: {
    color: THEME.colors.oro,
    fontSize: 11,
    fontWeight: '900',
  },
  btnEdit: {
    flex: 1.2,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171E2B',
    borderRightWidth: 1,
    borderRightColor: THEME.colors.borde,
  },
  btnEditText: {
    color: THEME.colors.arcano,
    fontSize: 11,
    fontWeight: '900',
  },
  btnDelete: {
    flex: 1.1,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDeleteText: {
    color: THEME.colors.brasa,
    fontSize: 11,
    fontWeight: '900',
  },
});
