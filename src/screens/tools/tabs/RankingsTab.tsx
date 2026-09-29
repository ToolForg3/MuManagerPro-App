import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ImageBackground } from 'react-native';
import { MuIcon } from '../../../components/ui/MuIcon';
import { THEME } from '../../../constants/theme';
import { STITCH_ASSETS } from '../../../constants/stitchAssets';
import { Panel, MuButton } from '../../../components/ui';
import { MuCornerOrnaments } from '../../../components/ui/MuCornerOrnaments';
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
        {/* Sub-Tabs con texturas nativas MU */}
        <View style={styles.rankPillsContainer}>
          {[
            { id: 'resets', label: 'Top Resets', icon: 'refresh' },
            { id: 'mresets', label: 'Master Resets', icon: 'crown' },
            { id: 'pk', label: 'Top Asesinos (PK)', icon: 'sword' },
            { id: 'guilds', label: 'Top Guilds', icon: 'shield' },
          ].map((sub) => {
            const isSel = rankType === sub.id;
            return (
              <TouchableOpacity
                key={`rank_tab_${sub.id}`}
                style={styles.rankPillTouch}
                onPress={() => setRankType(sub.id as any)}
                activeOpacity={0.8}
              >
                <ImageBackground
                  source={isSel ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                  style={[
                    styles.rankPill,
                    isSel && styles.rankPillActive,
                  ]}
                  resizeMode="stretch"
                >
                  <MuIcon
                    name={sub.icon}
                    size={16}
                    color={isSel ? '#FEDF99' : '#CDC6B9'}
                  />
                  <Text
                    style={[
                      styles.rankPillText,
                      isSel && styles.rankPillTextActive,
                    ]}
                  >
                    {sub.label}
                  </Text>
                </ImageBackground>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Refresh button */}
        <MuButton
          titulo="Actualizar Ranking"
          icono="refresh"
          variante="primary"
          onPress={() => loadRankings(rankType)}
          cargando={loadingRankings}
          disabled={loadingRankings}
          altura={44}
          style={{ marginBottom: 12 }}
        />

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
                  <Panel variant="box" key={`guild_${entry.G_Name}_${index}`} style={styles.rankCard}>
                    <MuCornerOrnaments size={8} />
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
                  </Panel>
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
                <Panel variant="box" key={`rank_${entry.Name}_${index}`} style={styles.rankCard}>
                  <MuCornerOrnaments size={8} />
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
  rankPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  rankPillTouch: {
    borderRadius: 2,
    overflow: 'hidden',
  },
  rankPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 2,
    minHeight: 38,
    overflow: 'hidden',
  },
  rankPillActive: {
    shadowColor: '#EFD28D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 6,
  },
  rankPillText: {
    fontSize: 12,
    color: '#CDC6B9',
    fontWeight: '600',
    ...THEME.effects.textShadowSubtle,
  },
  rankPillTextActive: {
    color: '#FEDF99',
    fontWeight: '900',
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  refreshRankBtn: {
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
    marginBottom: 14,
  },
  refreshRankBtnText: {
    color: '#EFD28D',
    fontSize: 12,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rankMedal: {
    width: 28,
    height: 28,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankMedalText: {
    color: THEME.colors.textoOscuro,
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
    borderRadius: 2,
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
