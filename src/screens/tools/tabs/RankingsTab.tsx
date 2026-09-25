import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

interface RankingsTabProps {
  rankType: 'resets' | 'mresets' | 'pk' | 'guilds';
  setRankType: (t: 'resets' | 'mresets' | 'pk' | 'guilds') => void;
  loadRankings: (type?: any) => void;
  loadingRankings: boolean;
  rankingsList: any[];
  getMuClassInfo: (code: number) => any;
}

export const RankingsTab: React.FC<RankingsTabProps> = ({
  rankType,
  setRankType,
  loadRankings,
  loadingRankings,
  rankingsList,
  getMuClassInfo,
}) => {
  return (
    <ErrorBoundary tabName="Rankings">
      <View style={styles.tabContent}>
        {/* Sub-Tabs */}
        <View style={styles.rankPillsContainer}>
          {[
            { id: 'resets', label: 'Top Resets', icon: 'refresh' },
            { id: 'mresets', label: 'Master Resets', icon: 'star' },
            { id: 'pk', label: 'Top Asesinos (PK)', icon: 'skull' },
            { id: 'guilds', label: 'Top Guilds', icon: 'shield-account' },
          ].map((sub) => (
            <TouchableOpacity
              key={`rank_tab_${sub.id}`}
              style={[
                styles.rankPill,
                rankType === sub.id && styles.rankPillActive,
              ]}
              onPress={() => setRankType(sub.id as any)}
            >
              <MaterialCommunityIcons
                name={sub.icon as any}
                size={16}
                color={rankType === sub.id ? '#FFF' : THEME.colors.textoSecundario}
              />
              <Text
                style={[
                  styles.rankPillText,
                  rankType === sub.id && styles.rankPillTextActive,
                ]}
              >
                {sub.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Refresh button */}
        <TouchableOpacity
          style={styles.refreshRankBtn}
          onPress={() => loadRankings(rankType)}
          disabled={loadingRankings}
        >
          <MaterialCommunityIcons name="reload" size={16} color={THEME.colors.oroClaro} />
          <Text style={styles.refreshRankBtnText}>Actualizar Ranking</Text>
        </TouchableOpacity>

        {loadingRankings ? (
          <ActivityIndicator size="large" color={THEME.colors.oroClaro} style={{ marginTop: 24 }} />
        ) : (
          <View style={{ gap: 8 }}>
            {rankingsList.map((entry, index) => {
              const rankPos = index + 1;
              const medalColor =
                rankPos === 1 ? '#FFD700' : rankPos === 2 ? '#C0C0C0' : rankPos === 3 ? '#CD7F32' : 'rgba(200, 190, 175, 0.15)';

              if (rankType === 'guilds') {
                return (
                  <View key={`guild_${entry.G_Name}_${index}`} style={styles.rankCard}>
                    <View style={[styles.rankMedal, { backgroundColor: medalColor }]}>
                      <Text style={[styles.rankMedalText, rankPos > 3 && { color: THEME.colors.textoSecundario }]}>{rankPos}</Text>
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.rankName}>{entry.G_Name}</Text>
                      <Text style={styles.rankSub}>
                        Master: {entry.G_Master} • Miembros: {entry.G_Count}
                      </Text>
                    </View>
                    <View style={styles.rankScoreWrap}>
                      <Text style={styles.rankScoreVal}>{entry.G_Score}</Text>
                      <Text style={styles.rankScoreLabel}>Puntos</Text>
                    </View>
                  </View>
                );
              }

              const classInfo = getMuClassInfo(entry.Class);
              let scoreVal = entry.ResetCount ?? 0;
              let scoreLabel = 'Resets';
              if (rankType === 'mresets') {
                scoreVal = entry.MasterResetCount ?? 0;
                scoreLabel = 'M.Resets';
              } else if (rankType === 'pk') {
                scoreVal = entry.PkCount ?? 0;
                scoreLabel = 'Muertes';
              }

              return (
                <View key={`rank_${entry.Name}_${index}`} style={styles.rankCard}>
                  <View style={[styles.rankMedal, { backgroundColor: medalColor }]}>
                    <Text style={[styles.rankMedalText, rankPos > 3 && { color: THEME.colors.textoSecundario }]}>{rankPos}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={styles.rankName}>{entry.Name}</Text>
                      <View style={[styles.classBadge, { borderColor: classInfo.color }]}>
                        <Text style={[styles.classBadgeText, { color: classInfo.color }]}>
                          {classInfo.shortName}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.rankSub}>
                      Nivel {entry.cLevel ?? 400} • Cuenta: {entry.AccountID}
                    </Text>
                  </View>
                  <View style={styles.rankScoreWrap}>
                    <Text style={styles.rankScoreVal}>{scoreVal}</Text>
                    <Text style={styles.rankScoreLabel}>{scoreLabel}</Text>
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
  rankPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#1E1915',
    borderWidth: 1.5,
    borderColor: 'rgba(107, 85, 51, 0.55)',
  },
  rankPillActive: {
    backgroundColor: 'rgba(232, 200, 106, 0.20)',
    borderColor: THEME.colors.oroClaro,
  },
  rankPillText: {
    fontSize: 12,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  rankPillTextActive: {
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  refreshRankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    marginBottom: 14,
  },
  refreshRankBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.colors.superficie,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: THEME.colors.borde,
    padding: 12,
  },
  rankMedal: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMedalText: {
    color: '#100D0B',
    fontWeight: 'bold',
    fontSize: 13,
  },
  rankName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.colors.oroClaro,
    ...THEME.effects.textShadow,
  },
  rankSub: {
    fontSize: 11.5,
    color: THEME.colors.textoSecundarioLuminoso,
    fontWeight: '500',
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  classBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  classBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  rankScoreWrap: {
    alignItems: 'flex-end',
  },
  rankScoreVal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: THEME.colors.oroClaro,
  },
  rankScoreLabel: {
    fontSize: 10,
    color: THEME.colors.textoSecundario,
  },
});
