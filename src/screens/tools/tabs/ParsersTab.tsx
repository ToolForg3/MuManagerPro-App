import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

interface ParsersTabProps {
  itemsCount: number;
  onPickAndParseFile: (type: 'item' | '380' | 'socket' | 'set') => void;
  onResetDefaults: () => void;
  t: (key: any) => string;
}

export const ParsersTab: React.FC<ParsersTabProps> = ({
  itemsCount,
  onPickAndParseFile,
  onResetDefaults,
  t,
}) => {
  return (
    <ErrorBoundary tabName="Parsers de Logs">
      <View style={styles.tabContent}>
        {/* Memory status card */}
        <View style={styles.statsCard}>
          <View style={styles.statsIconWrap}>
            <MaterialCommunityIcons name="database" size={28} color={THEME.colors.primaryOrange} />
          </View>
          <View style={styles.statsInfo}>
            <Text style={styles.statsNumber}>{itemsCount}</Text>
            <Text style={styles.statsLabel}>{t('itemsLoadedCount')}</Text>
          </View>
        </View>

        {/* Configure Items Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('configureItems')}</Text>
          <Text style={styles.sectionDesc}>
            Carga los archivos .txt de la carpeta Data/Item de tu servidor de MU Online para sincronizar nombres, tamaños y atributos exactos:
          </Text>

          {/* Item.txt */}
          <TouchableOpacity
            style={styles.fileButton}
            onPress={() => onPickAndParseFile('item')}
          >
            <View style={styles.fileBtnLeft}>
              <MaterialCommunityIcons name="file-document-outline" size={24} color={THEME.colors.primaryOrange} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileTitle}>Item.txt</Text>
                <Text style={styles.fileSub}>Base de datos principal de armas, armaduras y joyas</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textoSecundario} />
          </TouchableOpacity>

          {/* 380ItemType.txt */}
          <TouchableOpacity
            style={styles.fileButton}
            onPress={() => onPickAndParseFile('380')}
          >
            <View style={styles.fileBtnLeft}>
              <MaterialCommunityIcons name="numeric-3-circle-outline" size={24} color={THEME.colors.item380} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileTitle}>380ItemType.txt</Text>
                <Text style={styles.fileSub}>Opciones adicionales de nivel 380 (PvP)</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textoSecundario} />
          </TouchableOpacity>

          {/* SocketItemType.txt */}
          <TouchableOpacity
            style={styles.fileButton}
            onPress={() => onPickAndParseFile('socket')}
          >
            <View style={styles.fileBtnLeft}>
              <MaterialCommunityIcons name="hexagon-multiple-outline" size={24} color={THEME.colors.itemSocket} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileTitle}>SocketItemType.txt</Text>
                <Text style={styles.fileSub}>Ítems con ranuras para Seeds y Spheres</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textoSecundario} />
          </TouchableOpacity>

          {/* SetItemType.txt */}
          <TouchableOpacity
            style={styles.fileButton}
            onPress={() => onPickAndParseFile('set')}
          >
            <View style={styles.fileBtnLeft}>
              <MaterialCommunityIcons name="shield-star-outline" size={24} color={THEME.colors.itemAncient} />
              <View style={styles.fileInfo}>
                <Text style={styles.fileTitle}>SetItemType.txt</Text>
                <Text style={styles.fileSub}>Ítems Ancient y sets de temporada</Text>
              </View>
            </View>
            <MaterialCommunityIcons name="upload" size={20} color={THEME.colors.textoSecundario} />
          </TouchableOpacity>

          {/* Reset to defaults button */}
          <TouchableOpacity
            style={styles.resetButton}
            onPress={onResetDefaults}
          >
            <MaterialCommunityIcons name="refresh" size={20} color={THEME.colors.textoSecundario} />
            <Text style={styles.resetButtonText}>Restaurar Catálogo Predeterminado</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.superficie,
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginBottom: 16,
  },
  statsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 6,
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  statsInfo: {
    flex: 1,
  },
  statsNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: THEME.colors.texto,
  },
  statsLabel: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    ...THEME.effects.textShadowSubtle,
  },
  section: {
    backgroundColor: THEME.colors.superficie,
    padding: 16,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    ...THEME.effects.textShadow,
  },
  sectionDesc: {
    fontSize: 12.5,
    fontWeight: '500',
    color: THEME.colors.textoSecundarioLuminoso,
    lineHeight: 18,
    marginBottom: 14,
    ...THEME.effects.textShadowSubtle,
  },
  fileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#191512',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginBottom: 10,
  },
  fileBtnLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  fileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  fileTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.oroClaro,
    ...THEME.effects.textShadow,
  },
  fileSub: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#191512',
    paddingVertical: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    marginTop: 6,
    gap: 8,
  },
  resetButtonText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
