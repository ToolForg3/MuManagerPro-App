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
              .filter((p) => {
                const name = String(p.Name || p.charName || '').toLowerCase();
                const acc = String(p.AccountID || p.accountId || '').toLowerCase();
                const q = (pkSearch || '').toLowerCase();
                return name.includes(q) || acc.includes(q);
              })
              .map((p, idx) => {
                const charName = p.Name || p.charName || `PJ_${idx}`;
                const accountId = p.AccountID || p.accountId || '-';
                const pkLevel = p.PkLevel ?? p.pkLevel ?? 3;
                const classCode = p.Class ?? p.class ?? 0;
                const cLevel = p.cLevel ?? p.level ?? 1;
                const pkCount = p.PkCount ?? p.pkCount ?? 0;
                const pkTime = p.PkTime ?? p.pkTime ?? 0;

                const badge = getPkBadge(pkLevel) || { label: 'PK', color: THEME.colors.textoSecundario, bg: 'rgba(200, 190, 175, 0.2)' };
                const classInfo = getMuClassInfo ? getMuClassInfo(classCode) : { name: 'Desconocido' };
                const className = classInfo?.name || 'Desconocido';

                return (
                  <View key={`pk_${charName}_${idx}`} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.charName}>{charName}</Text>
                          <View style={[styles.badgeWrap, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
                          </View>
                        </View>
                        <Text style={styles.charSub}>
                          Cuenta: {accountId} • {className} • Lv {cLevel}
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 4 }}>
                          <Text style={styles.statRed}>
                            Asesinatos: <Text style={{ fontWeight: 'bold' }}>{pkCount}</Text>
                          </Text>
                          <Text style={styles.statMuted}>
                            Tiempo PK: {pkTime}s
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.cleanSingleBtn}
                        onPress={() => handleClearPkTab(charName)}
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
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  bannerDesc: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12.5,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 18,
    ...THEME.effects.textShadowSubtle,
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
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    ...THEME.effects.textShadowSubtle,
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
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
    fontSize: 15,
    ...THEME.effects.textShadow,
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
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 3,
    ...THEME.effects.textShadowSubtle,
  },
  statRed: {
    color: THEME.colors.brasa,
    fontSize: 11,
  },
  statMuted: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11,
    fontWeight: '500',
    ...THEME.effects.textShadowSubtle,
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
