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
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { AutocompleteInput } from '../../../components/common/AutocompleteInput';
import { ItemImage } from '../../../components/common/ItemImage';

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
  return (
    <ErrorBoundary tabName="Anti-Dupe">
      <View style={styles.tabContent}>
        {/* Search & Dupe Controls */}
        <View style={[styles.card, { zIndex: 10 }]}>
          <Text style={styles.cardTitle}>Buscador Global de Ítems</Text>
          <Text style={styles.cardDesc}>
            Busca cualquier ítem por nombre o número de serial en baúles e inventarios de todo el servidor:
          </Text>
          <AutocompleteInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            suggestions={catalogSuggestions}
            placeholder="Ej: Bone Blade o 12345678"
            icon="magnify"
            maxSuggestions={6}
          />

          {/* Filter Pills */}
          <View style={styles.filterRow}>
            {(['all', 'warehouse', 'inventory'] as const).map((mode) => (
              <TouchableOpacity
                key={`search_mode_${mode}`}
                style={[
                  styles.filterPill,
                  searchFilter === mode && styles.filterPillActive,
                ]}
                onPress={() => setSearchFilter(mode)}
              >
                <Text style={[styles.filterPillText, searchFilter === mode && styles.filterPillTextActive]}>
                  {mode === 'all' ? 'Todos' : mode === 'warehouse' ? 'Solo Baúles' : 'Solo Inventarios'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.searchBtn, { flex: 1 }]}
              onPress={handleSearchItems}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator color={THEME.colors.oroClaro} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="magnify" size={18} color={THEME.colors.oroClaro} />
                  <Text style={styles.searchBtnText}>Buscar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.scanDupesBtn, { flex: 1 }]}
              onPress={() => handleScanDupes(false)}
              disabled={isScanningDupes}
            >
              {isScanningDupes ? (
                <ActivityIndicator color={THEME.colors.brasa} size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="alert-octagon" size={18} color={THEME.colors.brasa} />
                  <Text style={styles.scanDupesBtnText}>Escanear Dupeos</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Dupe Scanner Results Banner */}
        {hasScannedDupes && (
          <View style={[styles.dupeBanner, dupesResults.length > 0 ? styles.dupeBannerRed : styles.dupeBannerGreen]}>
            <MaterialCommunityIcons
              name={dupesResults.length > 0 ? 'alert' : 'check-circle'}
              size={26}
              color={dupesResults.length > 0 ? THEME.colors.brasa : THEME.colors.jade}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.dupeBannerTitle}>
                {dupesResults.length > 0
                  ? `¡ATENCIÓN! Se detectaron ${dupesResults.length} ítems clonados`
                  : '¡Servidor Limpio! No hay ítems duplicados'}
              </Text>
              <Text style={styles.dupeBannerSub}>
                {dupesResults.length > 0
                  ? 'Revisa la lista a continuación para auditar las cuentas involucradas.'
                  : 'Todos los seriales registrados en baúles e inventarios son únicos.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => handleScanDupes(true)}
              disabled={isScanningDupes}
              style={styles.refreshIconBtn}
              accessibilityLabel="Forzar Re-Escaneo"
            >
              <MaterialCommunityIcons name="refresh" size={22} color={dupesResults.length > 0 ? THEME.colors.brasa : THEME.colors.jade} />
            </TouchableOpacity>
          </View>
        )}

        {/* Dupe Results List */}
        {hasScannedDupes && dupesResults.map((dupe, dIdx) => (
          <View key={`dupe_grp_${dupe.serial}_${dIdx}`} style={styles.dupeGroupCard}>
            <View style={styles.dupeGroupHeader}>
              <MaterialCommunityIcons name="content-copy" size={20} color={THEME.colors.brasa} />
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.dupeSerialText}>
                  Serial: {dupe.serial} (0x{dupe.serialHex})
                </Text>
                <Text style={styles.dupeCountText}>
                  {dupe.count} copias detectadas
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
                        Alert.alert('Copiado', `Hex de ${it.name} copiado.`);
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
          </View>
        ))}

        {/* Standard Search Results List */}
        {!hasScannedDupes && searchResults.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Resultados ({searchResults.length}):</Text>
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
                        Alert.alert('Copiado', `Hex de ${it.name} copiado.`);
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
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  tabContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
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
    borderRadius: 6,
    backgroundColor: '#1E1915',
    borderWidth: 1.5,
    borderColor: 'rgba(107, 85, 51, 0.55)',
  },
  filterPillActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.20)',
    borderColor: THEME.colors.oroClaro,
  },
  filterPillText: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  filterPillTextActive: {
    color: THEME.colors.oroClaro,
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
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
  },
  searchBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 13,
    fontWeight: 'bold',
  },
  scanDupesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.brasa,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
  },
  scanDupesBtnText: {
    color: THEME.colors.brasa,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dupeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    marginBottom: 12,
  },
  dupeBannerRed: {
    backgroundColor: 'rgba(226, 112, 58, 0.15)',
    borderColor: THEME.colors.brasa,
  },
  dupeBannerGreen: {
    backgroundColor: 'rgba(63, 207, 142, 0.15)',
    borderColor: THEME.colors.jade,
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
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.brasa,
    padding: 12,
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
    borderBottomColor: '#241E1A',
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
    color: THEME.colors.jade,
    fontSize: 9,
    fontWeight: 'bold',
    borderWidth: 1,
    borderColor: THEME.colors.jade,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
});
