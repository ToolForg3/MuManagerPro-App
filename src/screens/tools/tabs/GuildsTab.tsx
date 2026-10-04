import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { MuIcon } from '../../../components/ui/MuIcon';
import { THEME } from '../../../constants/theme';
import { Panel, MuButton } from '../../../components/ui';
import { MuCornerOrnaments } from '../../../components/ui/MuCornerOrnaments';
import { ErrorBoundary } from '../../../components/ErrorBoundary';
import { useLanguage } from '../../../context/LanguageContext';

interface GuildsTabProps {
  guildsList: any[];
  loadingGuilds: boolean;
  guildSearch: string;
  setGuildSearch: (s: string) => void;
  loadGuilds: () => void;
  handleOpenGuildMembers: (guild: any) => void;
  handleDeleteGuild: (name: string) => void;
}

export const GuildsTab: React.FC<GuildsTabProps> = ({
  guildsList,
  loadingGuilds,
  guildSearch,
  setGuildSearch,
  loadGuilds,
  handleOpenGuildMembers,
  handleDeleteGuild,
}) => {
  const { t } = useLanguage();

  return (
    <ErrorBoundary tabName="Gestión de Clanes">
      <View style={styles.tabContent}>
        {/* Header info & actions */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              {t('guildsHeaderTitle', { count: guildsList.length })}
            </Text>
            <Text style={styles.headerSub}>
              {t('guildsHeaderSub')}
            </Text>
          </View>
          <MuButton
            titulo={t('refresh')}
            icono="refresh"
            variante="primary"
            onPress={loadGuilds}
            cargando={loadingGuilds}
            disabled={loadingGuilds}
            compacto={true}
            altura={36}
          />
        </View>

        {/* Search Input */}
        <View style={styles.inputWrap}>
          <MuIcon name="tools" size={18} />
          <TextInput
            style={styles.textInput}
            placeholder={t('guildsSearchPlaceholder')}
            placeholderTextColor={THEME.colors.textMuted}
            value={guildSearch}
            onChangeText={setGuildSearch}
          />
          {guildSearch.length > 0 && (
            <TouchableOpacity onPress={() => setGuildSearch('')}>
              <MuIcon name="close" size={16} />
            </TouchableOpacity>
          )}
        </View>

        {loadingGuilds ? (
          <ActivityIndicator color={THEME.colors.oroClaro} style={{ marginVertical: 30 }} />
        ) : guildsList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MuIcon name="shield" size={44} />
            <Text style={styles.emptyText}>
              {t('guildsEmpty')}
            </Text>
          </View>
        ) : (
          <View style={{ gap: 10 }}>
            {guildsList
              .filter((g) => {
                const gName = (g.G_Name || g.name || '').toLowerCase();
                const gMaster = (g.G_Master || g.master || '').toLowerCase();
                const q = (guildSearch || '').toLowerCase();
                return gName.includes(q) || gMaster.includes(q);
              })
              .map((g, gIdx) => {
                const gName = (g.G_Name || g.name || 'Clan').trim();
                const gMaster = (g.G_Master || g.master || 'Sin Master').trim();
                const gScore = g.G_Score !== undefined ? g.G_Score : (g.score || 0);
                const gNotice = g.G_Notice || g.notice || '';
                const memberCount = g.memberCount !== undefined ? g.memberCount : 0;
                return (
                  <Panel variant="box" key={`guild_${gName}_${gIdx}`} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <MuIcon name="crown" size={20} />
                          <Text style={styles.guildName}>{gName}</Text>
                        </View>
                        <Text style={styles.masterText}>
                          {t('guildMaster')}: <Text style={{ color: THEME.colors.oroClaro, fontWeight: 'bold' }}>{gMaster}</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                          <Text style={styles.statBlue}>
                            {t('guildMembers')}: <Text style={{ fontWeight: 'bold' }}>{memberCount}</Text>
                          </Text>
                          <Text style={styles.statJade}>
                            {t('guildScore')}: <Text style={{ fontWeight: 'bold' }}>{gScore}</Text>
                          </Text>
                        </View>
                        {gNotice && String(gNotice).trim() !== '' && String(gNotice).trim() !== '0' ? (
                          <Text style={styles.noticeText} numberOfLines={1}>
                            "{String(gNotice).trim()}"
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.actionCol}>
                        <MuButton
                          titulo={t('btnGuildMembers')}
                          icono="user"
                          variante="primary"
                          onPress={() => handleOpenGuildMembers(g)}
                          compacto={true}
                          altura={32}
                        />

                        <MuButton
                          titulo={t('btnGuildDissolve')}
                          icono="delete"
                          variante="danger"
                          onPress={() => handleDeleteGuild(gName)}
                          compacto={true}
                          altura={32}
                        />
                      </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: THEME.colors.oroClaro,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    ...THEME.effects.textShadow,
  },
  headerSub: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 11.5,
    fontWeight: '500',
    marginTop: 2,
    ...THEME.effects.textShadowSubtle,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 2,
    backgroundColor: '#26221A',
    borderWidth: 1,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
  },
  refreshBtnText: {
    color: '#EFD28D',
    fontSize: 12,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
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
    marginBottom: 12,
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
  emptyText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 10,
    ...THEME.effects.textShadowSubtle,
  },
  card: {
    marginBottom: 10,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  guildName: {
    color: THEME.colors.oroClaro,
    fontWeight: 'bold',
    fontSize: 16,
    ...THEME.effects.textShadow,
  },
  masterText: {
    color: THEME.colors.textoSecundarioLuminoso,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    ...THEME.effects.textShadowSubtle,
  },
  statBlue: {
    color: THEME.colors.arcano,
    fontSize: 12,
  },
  statJade: {
    color: THEME.colors.jade,
    fontSize: 12,
  },
  noticeText: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
  actionCol: {
    gap: 6,
    alignItems: 'flex-end',
  },
  membersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#26221A',
    borderWidth: 1,
    borderTopColor: '#EFD28D',
    borderLeftColor: '#EFD28D',
    borderRightColor: '#5C4A22',
    borderBottomColor: '#5C4A22',
    borderRadius: 2,
  },
  membersBtnText: {
    color: '#EFD28D',
    fontSize: 11,
    fontWeight: 'bold',
    ...THEME.effects.textShadow,
  },
  dissolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#2A1314',
    borderWidth: 1,
    borderTopColor: '#E2703A',
    borderLeftColor: '#E2703A',
    borderRightColor: '#5A1A1A',
    borderBottomColor: '#5A1A1A',
    borderRadius: 2,
  },
  dissolveBtnText: {
    color: '#FFB4AB',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
