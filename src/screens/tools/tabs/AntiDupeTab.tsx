import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { GothicAlert as Alert } from '../../../components/common/GothicAlert';
import * as Clipboard from 'expo-clipboard';
import { MuIcon } from '../../../components/ui/MuIcon';
import { THEME } from '../../../constants/theme';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { AutocompleteInput } from '../../../components/common/AutocompleteInput';
import { ItemImage } from '../../../components/common/ItemImage';
import { Panel, MuButton, Chip } from '../../../components/ui';
import { MuCornerOrnaments } from '../../../components/ui/MuCornerOrnaments';
import { useLanguage } from '../../../context/LanguageContext';

interface AntiDupeTabProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  catalogSuggestions: string[];
  searchFilter: 'all' | 'warehouse' | 'inventory';
  setSearchFilter: (f: 'all' | 'warehouse' | 'inventory') => void;
  handleSearchItems: () => void;
  isSearching: boolean;
  handleScanDupes: (forceFresh: boolean) => void;
  isScanningDupes: boolean;
  hasScannedDupes: boolean;
  dupesResults: any[];
  searchResults: any[];
}

export const AntiDupeTab: React.FC<AntiDupeTabProps> = ({
  searchQuery,
  setSearchQuery,
  catalogSuggestions,
  searchFilter,
  setSearchFilter,
  handleSearchItems,
  isSearching,
  handleScanDupes,
  isScanningDupes,
  hasScannedDupes,
  dupesResults,
  searchResults,
}) => {
  const { t } = useLanguage();

  return (
    <ErrorBoundary tabName="Anti-Dupe">
      <View style={styles.tabContent}>
        {/* Search & Dupe Controls */}
        <Panel variant="box" style={[styles.card, { zIndex: 10 }]}>
          <MuCornerOrnaments size={12} />
          <Text style={styles.cardTitle}>{t('antiDupeTitle')}</Text>
          <Text style={styles.cardDesc}>
            {t('antiDupeDesc')}
          </Text>
          <AutocompleteInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            suggestions={catalogSuggestions}
            placeholder={t('antiDupePlaceholder')}
            icon="magnify"
            maxSuggestions={6}
          />

          {/* Filter Pills con texturas nativas MU */}
          <View style={styles.filterRow}>
            {(['all', 'warehouse', 'inventory'] as const).map((mode) => (
              <Chip
                key={`search_mode_${mode}`}
                activo={searchFilter === mode}
                etiqueta={mode === 'all' ? t('filterAll') : mode === 'warehouse' ? t('filterOnlyWarehouses') : t('filterOnlyInventories')}
                onPress={() => setSearchFilter(mode)}
              />
            ))}
          </View>

          <View style={styles.btnRow}>
            <View style={{ flex: 1 }}>
              <MuButton
                titulo={t('btnSearch')}
                icono="magnify"
                variante="primary"
                onPress={handleSearchItems}
                cargando={isSearching}
                disabled={isSearching}
                altura={44}
              />
            </View>

            <View style={{ flex: 1 }}>
              <MuButton
                titulo={t('btnScanDupes')}
                icono="shield-alert"
                variante="danger"
                onPress={() => handleScanDupes(false)}
                cargando={isScanningDupes}
                disabled={isScanningDupes}
                altura={44}
              />
            </View>
          </View>
        </Panel>

        {/* Dupe Scanner Results Banner */}
        {hasScannedDupes && (
          <View style={[styles.dupeBanner, dupesResults.length > 0 ? styles.dupeBannerRed : styles.dupeBannerGreen]}>
            <MuIcon
              name={dupesResults.length > 0 ? 'shield-alert' : 'check'}
              size={24}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.dupeBannerTitle}>
                {dupesResults.length > 0
                  ? t('dupeBannerAlert', { count: dupesResults.length })
                  : t('dupeBannerClean')}
              </Text>
              <Text style={styles.dupeBannerSub}>
                {dupesResults.length > 0
                  ? t('dupeBannerSubAlert')
                  : t('dupeBannerSubClean')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleScanDupes(true)}
              disabled={isScanningDupes}
              style={styles.refreshIconBtn}
              accessibilityLabel={t('forceRescan')}
            >
              <MuIcon name="refresh" size={20} />
            </TouchableOpacity>
          </View>
        )}

        {/* Dupe Results List */}
        {hasScannedDupes && dupesResults.map((dupe, dIdx) => (
          <Panel variant="box" key={`dupe_grp_${dupe.serial}_${dIdx}`} style={styles.dupeGroupCard}>
            <MuCornerOrnaments size={10} />
            <View style={styles.dupeGroupHeader}>
              <MuIcon name="save" size={18} color={THEME.colors.oroClaro} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.dupeSerialText}>
                  Serial: {dupe.serial} (0x{dupe.serialHex})
                </Text>
                <Text style={styles.dupeCountText}>
                  {t('dupeCopiesDetected', { count: dupe.count })}
                </Text>
              </View>
            </View>

            {dupe.items.map((it: any, iIdx: number) => (
              <View key={`dupe_it_${iIdx}`} style={styles.dupeItemRow}>
                <ItemImage itemName={it.name} size={30} fallbackColor={THEME.colors.oroClaro} />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.dupeItemName}>{it.name} +{it.level}</Text>
                  <Text style={styles.dupeItemLoc}>
                    {it.location?.startsWith('Baúl') || it.location?.startsWith('Personaje')
                      ? `${it.location} • Cuenta: ${it.accountId}`
                      : it.location === 'Warehouse'
                      ? `Baúl: ${it.accountId} (Slot ${it.slot})`
                      : `PJ: ${it.charName} [${it.accountId}] (Slot ${it.slot})`}
                  </Text>
                  {it.hex && (
                    <TouchableOpacity
                      onPress={async () => {
                        await Clipboard.setStringAsync(it.hex);
                        Alert.alert(t('copiedHex'), t('copiedHexMsg', { name: it.name }));
                      }}
                    >
                      <Text style={styles.hexText}>
                        HEX: {it.hex}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {it.isExc && <Text style={styles.excBadge}>EXC</Text>}
              </View>
            ))}
          </Panel>
        ))}

        {/* Standard Search Results List */}
        {!hasScannedDupes && searchResults.length > 0 && (
          <Panel variant="box" style={styles.card}>
            <MuCornerOrnaments size={12} />
            <Text style={styles.cardTitle}>{t('dupeSearchResults', { count: searchResults.length })}</Text>
            {searchResults.map((it, idx) => (
              <View key={`search_res_${idx}`} style={styles.dupeItemRow}>
                <ItemImage itemName={it.name} size={32} fallbackColor={THEME.colors.oroClaro} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.dupeItemName}>{it.name} +{it.level}</Text>
                  <Text style={styles.dupeItemLoc}>
                    {it.location?.startsWith('Baúl') || it.location?.startsWith('Personaje')
                      ? `${it.location} • Cuenta: ${it.accountId}`
                      : it.location === 'Warehouse'
                      ? `Baúl: ${it.accountId} (Slot ${it.slot})`
                      : `PJ: ${it.charName} [${it.accountId}] (Slot ${it.slot})`}
                  </Text>
                  <Text style={styles.serialMutedText}>
                    Serial: {it.serial} (0x{it.serialHex})
                  </Text>
                  {it.hex && (
                    <TouchableOpacity
                      onPress={async () => {
                        await Clipboard.setStringAsync(it.hex);
                        Alert.alert(t('copiedHex'), t('copiedHexMsg', { name: it.name }));
                      }}
                    >
                      <Text style={styles.hexText}>
                        HEX: {it.hex}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {it.isExc && <Text style={styles.excBadge}>EXC</Text>}
              </View>
            ))}
          </Panel>
        )}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    padding: 16,
    paddingBottom: 120,
  },
  card: {
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: THEME.colors.oroClaro,
    marginBottom: 4,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  cardDesc: {
    fontSize: 12.5,
    fontWeight: '500',
    color: THEME.colors.textoSecundarioLuminoso,
    marginBottom: 12,
    lineHeight: 18,
    ...THEME.effects.textShadowSubtle,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginVertical: 10,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: '#1A1B1A',
    borderWidth: 1,
    borderTopColor: '#4A463F',
    borderLeftColor: '#4A463F',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
  },
  filterPillActive: {
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  filterPillText: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  filterPillTextActive: {
    color: '#EFD28D',
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6,
  },
  searchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#26221A',
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    borderWidth: 1,
    borderRadius: 2,
    minHeight: 48,
    height: 48,
  },
  searchBtnText: {
    color: '#EFD28D',
    fontSize: 13,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  scanDupesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2A1314',
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
    borderWidth: 1,
    borderRadius: 2,
    minHeight: 48,
    height: 48,
  },
  scanDupesBtnText: {
    color: '#FFB4AB',
    fontSize: 13,
    fontWeight: 'bold',
  },
  dupeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 2,
    borderWidth: 1,
    marginBottom: 12,
  },
  dupeBannerRed: {
    backgroundColor: '#2A1314',
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
  },
  dupeBannerGreen: {
    backgroundColor: '#10241A',
    borderTopColor: '#3FCF8E',
    borderLeftColor: '#3FCF8E',
    borderRightColor: '#1A4D33',
    borderBottomColor: '#1A4D33',
  },
  dupeBannerTitle: {
    color: THEME.colors.texto,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dupeBannerSub: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  refreshIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dupeGroupCard: {
    marginBottom: 12,
  },
  dupeGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(226, 112, 58, 0.3)',
    marginBottom: 8,
  },
  dupeSerialText: {
    color: THEME.colors.texto,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dupeCountText: {
    color: THEME.colors.brasa,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 1,
  },
  dupeItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
  },
  dupeItemName: {
    color: THEME.colors.texto,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dupeItemLoc: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 2,
  },
  hexText: {
    color: THEME.colors.jade,
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    marginTop: 2,
  },
  serialMutedText: {
    color: THEME.colors.textoSecundario,
    fontSize: 10,
    marginTop: 1,
  },
  excBadge: {
    color: '#3FCF8E',
    fontSize: 9,
    fontWeight: 'bold',
    backgroundColor: '#0D1A14',
    borderWidth: 1,
    borderTopColor: '#5FCF9E',
    borderLeftColor: '#5FCF9E',
    borderRightColor: '#1A4D33',
    borderBottomColor: '#1A4D33',
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
