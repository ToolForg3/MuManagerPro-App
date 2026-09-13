import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { PkPlayerEntry } from '../../../types/admin';

interface PkTabProps {
  pkList: PkPlayerEntry[];
  loadingPk: boolean;
  pkSearch: string;
  setPkSearch: (s: string) => void;
  loadPkList: () => void;
  handleClearPkTab: (charName?: string) => void;
  getPkBadge: (pkLevel: number) => { label: string; color: string; bg: string };
  getMuClassInfo: (code: number) => any;
}

export const PkTab: React.FC<PkTabProps> = ({
  pkList,
  loadingPk,
  pkSearch,
  setPkSearch,
  loadPkList,
  handleClearPkTab,
  getPkBadge,
  getMuClassInfo,
}) => {
  return (
    <ErrorBoundary tabName="Limpieza de PK">
      <View style={styles.tabContent}>
        {/* Action Banner */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MaterialCommunityIcons name="skull" size={24} color={THEME.colors.brasa} />
              <Text style={styles.bannerTitle}>
                Asesinos Activos ({pkList.length})
              </Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={loadPkList}
            >
              <MaterialCommunityIcons name="refresh" size={16} color={THEME.colors.oroClaro} />
              <Text style={styles.refreshBtnText}>Actualizar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bannerDesc}>
            Limpia el estado PK de personajes individuales o ejecuta un perdón masivo para todo el servidor restableciendo PkLevel a 3 (Común).
          </Text>

          <TouchableOpacity
            style={styles.clearAllBtn}
            onPress={() => handleClearPkTab()}
            disabled={pkList.length === 0}
          >
            <MaterialCommunityIcons name="sword-cross" size={18} color={THEME.colors.brasa} />
            <Text style={styles.clearAllBtnText}>Limpiar Todos los Asesinos (Server)</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.inputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={THEME.colors.textoSecundario} />
          <TextInput
            style={styles.textInput}
            placeholder="Buscar por PJ o Cuenta..."
            placeholderTextColor={THEME.colors.textMuted}
            value={pkSearch}
            onChangeText={setPkSearch}
          />
          {pkSearch.length > 0 && (
            <TouchableOpacity onPress={() => setPkSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={THEME.colors.textoSecundario} />
            </TouchableOpacity>
          )}
        </View>

        {loadingPk ? (
          <ActivityIndicator color={THEME.colors.oroClaro} style={{ marginVertical: 30 }} />
        ) : pkList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="shield-check" size={48} color={THEME.colors.jade} />
            <Text style={styles.emptyTitle}>
              ¡Servidor Libre de Asesinos!
            </Text>
            <Text style={styles.emptySub}>
              No hay personajes con PkLevel mayor a 3 o muertes pendientes.
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {pkList
              .filter(
                (p) =>
                  p.Name.toLowerCase().includes(pkSearch.toLowerCase()) ||
                  p.AccountID.toLowerCase().includes(pkSearch.toLowerCase())
              )
              .map((p) => {
                const badge = getPkBadge(p.PkLevel);
                const classInfo = getMuClassInfo(p.Class);
                return (
                  <View key={`pk_${p.Name}`} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.charName}>{p.Name}</Text>
                          <View style={[styles.badgeWrap, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.charSub}>
                          Cuenta: {p.AccountID} • {classInfo.name} • Lv {p.cLevel}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                          <Text style={styles.statRed}>
                            Asesinatos: <Text style={{ fontWeight: 'bold' }}>{p.PkCount}</Text>
                          </Text>
                          <Text style={styles.statMuted}>
                            Tiempo PK: {p.PkTime}s
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.cleanSingleBtn}
                        onPress={() => handleClearPkTab(p.Name || p.charName)}
                      >
                        <MaterialCommunityIcons name="check-circle-outline" size={16} color={THEME.colors.jade} />
                        <Text style={styles.cleanSingleBtnText}>Limpiar PK</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
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
  bannerCard: {
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.borde,
    borderWidth: 1,
    borderRadius: 6,
    padding: 14,
  },
  bannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bannerTitle: {
    color: THEME.colors.oroClaro,
    fontSize: 15,
    fontWeight: 'bold',
  },
  bannerDesc: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 17,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#191512',
    borderColor: THEME.colors.borde,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  refreshBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 11,
    fontWeight: 'bold',
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.brasa,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
  },
  clearAllBtnText: {
    color: THEME.colors.brasa,
    fontSize: 13,
    fontWeight: 'bold',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191512',
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    borderRadius: 6,
    paddingHorizontal: 12,
    height: 44,
    marginVertical: 12,
    gap: 8,
  },
  textInput: {
    flex: 1,
    color: THEME.colors.texto,
    fontSize: 13,
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  emptyTitle: {
    color: THEME.colors.jade,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
  },
  emptySub: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    marginTop: 4,
  },
  card: {
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charName: {
    color: THEME.colors.texto,
    fontWeight: 'bold',
    fontSize: 15,
  },
  badgeWrap: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  charSub: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    marginTop: 3,
  },
  statRed: {
    color: THEME.colors.brasa,
    fontSize: 11,
  },
  statMuted: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
  },
  cleanSingleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.jade,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cleanSingleBtnText: {
    color: THEME.colors.jade,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
