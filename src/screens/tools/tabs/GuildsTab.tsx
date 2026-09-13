import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../../constants/theme';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

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
  return (
    <ErrorBoundary tabName="Gestión de Clanes">
      <View style={styles.tabContent}>
        {/* Header info & actions */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>
              Clanes Registrados ({guildsList.length})
            </Text>
            <Text style={styles.headerSub}>
              Gestión directa en tabla Guild & GuildMember (SQL Server)
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={loadGuilds}
          >
            <MaterialCommunityIcons name="refresh" size={16} color={THEME.colors.oroClaro} />
            <Text style={styles.refreshBtnText}>Actualizar</Text>
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.inputWrap}>
          <MaterialCommunityIcons name="magnify" size={20} color={THEME.colors.textoSecundario} />
          <TextInput
            style={styles.textInput}
            placeholder="Buscar clan por nombre o Guild Master..."
            placeholderTextColor={THEME.colors.textMuted}
            value={guildSearch}
            onChangeText={setGuildSearch}
          />
          {guildSearch.length > 0 && (
            <TouchableOpacity onPress={() => setGuildSearch('')}>
              <MaterialCommunityIcons name="close-circle" size={18} color={THEME.colors.textoSecundario} />
            </TouchableOpacity>
          )}
        </View>

        {loadingGuilds ? (
          <ActivityIndicator color={THEME.colors.oroClaro} style={{ marginVertical: 30 }} />
        ) : guildsList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <MaterialCommunityIcons name="shield-off-outline" size={48} color={THEME.colors.textoSecundario} />
            <Text style={styles.emptyText}>
              No se encontraron clanes registrados en el servidor.
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
                  <View key={`guild_${gName}_${gIdx}`} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <MaterialCommunityIcons name="shield-crown" size={22} color={THEME.colors.oroClaro} />
                          <Text style={styles.guildName}>{gName}</Text>
                        </View>
                        <Text style={styles.masterText}>
                          Master: <Text style={{ color: THEME.colors.oroClaro, fontWeight: 'bold' }}>{gMaster}</Text>
                        </Text>
                        <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
                          <Text style={styles.statBlue}>
                            Miembros: <Text style={{ fontWeight: 'bold' }}>{memberCount}</Text>
                          </Text>
                          <Text style={styles.statJade}>
                            Score: <Text style={{ fontWeight: 'bold' }}>{gScore}</Text>
                          </Text>
                        </View>
                        {gNotice ? (
                          <Text style={styles.noticeText} numberOfLines={1}>
                            "{gNotice}"
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.actionCol}>
                        <TouchableOpacity
                          style={styles.membersBtn}
                          onPress={() => handleOpenGuildMembers(g)}
                        >
                          <MaterialCommunityIcons name="account-group" size={15} color={THEME.colors.oroClaro} />
                          <Text style={styles.membersBtnText}>Miembros</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.dissolveBtn}
                          onPress={() => handleDeleteGuild(gName)}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={15} color={THEME.colors.brasa} />
                          <Text style={styles.dissolveBtnText}>Disolver</Text>
                        </TouchableOpacity>
                      </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    color: THEME.colors.texto,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerSub: {
    color: THEME.colors.textoSecundario,
    fontSize: 11,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(232, 200, 106, 0.15)',
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1,
  },
  refreshBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 12,
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
    color: THEME.colors.textoSecundario,
    fontSize: 13,
    marginTop: 10,
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
    alignItems: 'flex-start',
  },
  guildName: {
    color: THEME.colors.texto,
    fontWeight: 'bold',
    fontSize: 16,
  },
  masterText: {
    color: THEME.colors.textoSecundario,
    fontSize: 12,
    marginTop: 4,
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
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.oroClaro,
    borderWidth: 1,
    borderRadius: 6,
  },
  membersBtnText: {
    color: THEME.colors.oroClaro,
    fontSize: 11,
    fontWeight: 'bold',
  },
  dissolveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#241E1A',
    borderColor: THEME.colors.brasa,
    borderWidth: 1,
    borderRadius: 6,
  },
  dissolveBtnText: {
    color: THEME.colors.brasa,
    fontSize: 11,
    fontWeight: 'bold',
  },
});
