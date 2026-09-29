import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { MuIcon } from '../../../components/ui/MuIcon';
import { THEME } from '../../../constants/theme';
import { Panel, MuButton } from '../../../components/ui';
import { MuCornerOrnaments } from '../../../components/ui/MuCornerOrnaments';
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
        <Panel variant="box" style={styles.bannerCard}>
          <MuCornerOrnaments size={12} />
          <View style={styles.bannerHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <MuIcon name="sword" size={22} color={THEME.colors.brasa} />
              <Text style={styles.bannerTitle}>
                Asesinos Activos ({pkList.length})
              </Text>
            </View>
            <MuButton
              titulo="Actualizar"
              icono="refresh"
              variante="primary"
              onPress={loadPkList}
              cargando={loadingPk}
              disabled={loadingPk}
              compacto={true}
              altura={36}
            />
          </View>
          <Text style={styles.bannerDesc}>
            Limpia el estado PK de personajes individuales o ejecuta un perdón masivo para todo el servidor restableciendo PkLevel a 3 (Común).
          </Text>

          <MuButton
            titulo="Limpiar Todos los Asesinos (Server)"
            icono="sword"
            variante="danger"
            onPress={() => handleClearPkTab()}
            disabled={pkList.length === 0}
            altura={44}
            style={{ marginTop: 8 }}
          />
        </Panel>

        {/* Search Input */}
        <View style={styles.inputWrap}>
          <MuIcon name="tools" size={18} />
          <TextInput
            style={styles.textInput}
            placeholder="Buscar por PJ o Cuenta..."
            placeholderTextColor={THEME.colors.textMuted}
            value={pkSearch}
            onChangeText={setPkSearch}
          />
          {pkSearch.length > 0 && (
            <TouchableOpacity onPress={() => setPkSearch('')}>
              <MuIcon name="close" size={16} />
            </TouchableOpacity>
          )}
        </View>

        {loadingPk ? (
          <ActivityIndicator color={THEME.colors.oroClaro} style={{ marginVertical: 30 }} />
        ) : pkList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MuIcon name="check" size={44} />
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
                  <Panel variant="box" key={`pk_${charName}_${idx}`} style={styles.card}>
                    <MuCornerOrnaments size={8} />
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

                      <MuButton
                        titulo="Limpiar PK"
                        icono="check"
                        variante="success"
                        onPress={() => handleClearPkTab(charName)}
                        compacto={true}
                        altura={32}
                      />
                    </View>
                  </Panel>
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
    paddingBottom: 120,
  },
  bannerCard: {
    marginBottom: 12,
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
    backgroundColor: '#1E1F1E',
    borderTopColor: '#5A5242',
    borderLeftColor: '#5A5242',
    borderRightColor: '#161716',
    borderBottomColor: '#161716',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
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
  clearAllBtnText: {
    color: '#FFB4AB',
    fontSize: 13,
    fontWeight: 'bold',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#090A09',
    borderWidth: 1,
    borderTopColor: '#141514',
    borderLeftColor: '#141514',
    borderRightColor: '#5A5242',
    borderBottomColor: '#5A5242',
    borderRadius: 2,
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
    marginBottom: 10,
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
    borderRadius: 2,
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
    backgroundColor: '#15241C',
    borderTopColor: '#3FCF8E',
    borderLeftColor: '#3FCF8E',
    borderRightColor: '#1E5A3E',
    borderBottomColor: '#1E5A3E',
    borderWidth: 1,
    borderRadius: 2,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cleanSingleBtnText: {
    color: THEME.colors.jade,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
