import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { MuIcon } from '../../../components/ui/MuIcon';
import { THEME } from '../../../constants/theme';
import { STITCH_ASSETS } from '../../../constants/stitchAssets';
import { Panel, MuButton } from '../../../components/ui';
import { MuCornerOrnaments } from '../../../components/ui/MuCornerOrnaments';
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
        <Panel variant="box" style={styles.statsCard}>
          <MuCornerOrnaments size={10} />
          <View style={styles.statsIconWrap}>
            <MuIcon name="database" size={28} color={THEME.colors.primaryOrange} />
          </View>
          <View style={styles.statsInfo}>
            <Text style={styles.statsNumber}>{itemsCount}</Text>
            <Text style={styles.statsLabel}>{t('itemsLoadedCount')}</Text>
          </View>
        </Panel>

        {/* Configure Items Section */}
        <Panel variant="box" style={styles.section}>
          <MuCornerOrnaments size={12} />
          <Text style={styles.sectionTitle}>{t('configureItems')}</Text>
          <Text style={styles.sectionDesc}>
            {t('configureItemsDesc')}
          </Text>

          {/* Item.txt */}
          <TouchableOpacity
            style={{ borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}
            onPress={() => onPickAndParseFile('item')}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.fileButton}
              resizeMode="stretch"
            >
              <View style={styles.fileBtnLeft}>
                <MuIcon name="file-document-outline" size={24} color={THEME.colors.primaryOrange} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileTitle}>Item.txt</Text>
                  <Text style={styles.fileSub}>{t('itemTxtDesc')}</Text>
                </View>
              </View>
              <MuIcon name="upload" size={20} color={THEME.colors.textoSecundario} />
            </ImageBackground>
          </TouchableOpacity>

          {/* 380ItemType.txt */}
          <TouchableOpacity
            style={{ borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}
            onPress={() => onPickAndParseFile('380')}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.fileButton}
              resizeMode="stretch"
            >
              <View style={styles.fileBtnLeft}>
                <MuIcon name="numeric-3-circle-outline" size={24} color={THEME.colors.item380} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileTitle}>380ItemType.txt</Text>
                  <Text style={styles.fileSub}>{t('item380TxtDesc')}</Text>
                </View>
              </View>
              <MuIcon name="upload" size={20} color={THEME.colors.textoSecundario} />
            </ImageBackground>
          </TouchableOpacity>

          {/* SocketItemType.txt */}
          <TouchableOpacity
            style={{ borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}
            onPress={() => onPickAndParseFile('socket')}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.fileButton}
              resizeMode="stretch"
            >
              <View style={styles.fileBtnLeft}>
                <MuIcon name="hexagon-multiple-outline" size={24} color={THEME.colors.itemSocket} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileTitle}>SocketItemType.txt</Text>
                  <Text style={styles.fileSub}>{t('socketTxtDesc')}</Text>
                </View>
              </View>
              <MuIcon name="upload" size={20} color={THEME.colors.textoSecundario} />
            </ImageBackground>
          </TouchableOpacity>

          {/* SetItemType.txt */}
          <TouchableOpacity
            style={{ borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}
            onPress={() => onPickAndParseFile('set')}
            activeOpacity={0.8}
          >
            <ImageBackground
              source={STITCH_ASSETS.tabs.tabModeInactive}
              style={styles.fileButton}
              resizeMode="stretch"
            >
              <View style={styles.fileBtnLeft}>
                <MuIcon name="shield-star-outline" size={24} color={THEME.colors.itemAncient} />
                <View style={styles.fileInfo}>
                  <Text style={styles.fileTitle}>SetItemType.txt</Text>
                  <Text style={styles.fileSub}>{t('setItemTxtDesc')}</Text>
                </View>
              </View>
              <MuIcon name="upload" size={20} color={THEME.colors.textoSecundario} />
            </ImageBackground>
          </TouchableOpacity>

          {/* Reset to defaults button */}
          <MuButton
            titulo={t('btnResetCatalog')}
            icono="refresh"
            variante="secondary"
            onPress={onResetDefaults}
            altura={44}
            style={{ marginTop: 8 }}
          />
        </Panel>
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    padding: 16,
    paddingBottom: 120,
  },
  statsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statsIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 2,
    backgroundColor: '#0D0E0D',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#4C463A',
    borderBottomColor: '#4C463A',
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
    padding: 12,
    minHeight: 52,
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
    backgroundColor: '#1E1F1E',
    minHeight: 48,
    height: 48,
    borderRadius: 2,
    borderWidth: 1,
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    marginTop: 6,
    gap: 8,
  },
  resetButtonText: {
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    fontWeight: 'bold',
  },
});
