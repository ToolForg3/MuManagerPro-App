import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { THEME } from '../../constants/theme';
import { AccountsScreen } from '../accounts/AccountsScreen';
import { CharacterListScreen } from '../characters/CharacterListScreen';
import { ToolsScreen } from '../tools/ToolsScreen';

export type PlayerSubTab = 'cuentas' | 'personajes' | 'online' | 'clanes' | 'pk' | 'gm';

interface SubTabOption {
  id: PlayerSubTab;
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
}

const SUB_TABS: SubTabOption[] = [
  { id: 'cuentas', label: 'Cuentas', icon: 'account-group' },
  { id: 'personajes', label: 'Personajes', icon: 'sword-cross' },
  { id: 'online', label: 'Online', icon: 'account-check' },
  { id: 'clanes', label: 'Clanes', icon: 'shield-account' },
  { id: 'pk', label: 'PK', icon: 'skull' },
  { id: 'gm', label: 'Staff GM', icon: 'crown' },
];

export const PlayersHubScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const topInset = Math.max(
    insets.top,
    Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0
  );

  const initialFromRoute = route?.params?.subTab as PlayerSubTab | undefined;
  const [activeSubTab, setActiveSubTab] = useState<PlayerSubTab>(initialFromRoute || 'cuentas');

  useEffect(() => {
    if (route?.params?.subTab && route.params.subTab !== activeSubTab) {
      setActiveSubTab(route.params.subTab);
    }
  }, [route?.params?.subTab]);

  return (
    <View style={[styles.container, { paddingTop: topInset + 6 }]}>
      {/* Top Segmented Sub-Nav Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {SUB_TABS.map((tab) => {
            const isSelected = activeSubTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.subTabButton, isSelected && styles.subTabButtonActive]}
                onPress={() => setActiveSubTab(tab.id)}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons
                  name={tab.icon}
                  size={16}
                  color={isSelected ? '#100D0B' : THEME.colors.textoSecundario}
                />
                <Text style={[styles.subTabText, isSelected && styles.subTabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Screen Body */}
      <View style={styles.contentArea}>
        {activeSubTab === 'cuentas' && (
          <AccountsScreen route={route} navigation={navigation} hideTopPadding={true} />
        )}
        {activeSubTab === 'personajes' && (
          <CharacterListScreen route={route} navigation={navigation} hideTopPadding={true} />
        )}
        {activeSubTab === 'online' && (
          <ToolsScreen
            mode="players"
            initialTab="players"
            playerSubTab="online"
            route={route}
            navigation={navigation}
            hideTopPadding={true}
            hideHeader={true}
            hideTabBar={true}
          />
        )}
        {activeSubTab === 'clanes' && (
          <ToolsScreen
            mode="players"
            initialTab="guilds"
            route={route}
            navigation={navigation}
            hideTopPadding={true}
            hideHeader={true}
            hideTabBar={true}
          />
        )}
        {activeSubTab === 'pk' && (
          <ToolsScreen
            mode="players"
            initialTab="pk"
            route={route}
            navigation={navigation}
            hideTopPadding={true}
            hideHeader={true}
            hideTabBar={true}
          />
        )}
        {activeSubTab === 'gm' && (
          <ToolsScreen
            mode="players"
            initialTab="players"
            playerSubTab="gm"
            route={route}
            navigation={navigation}
            hideTopPadding={true}
            hideHeader={true}
            hideTabBar={true}
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
  },
  tabBarWrapper: {
    paddingHorizontal: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: THEME.colors.borde,
    backgroundColor: THEME.colors.superficie,
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  subTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: '#1E1915',
    borderWidth: 1.5,
    borderColor: 'rgba(107, 85, 51, 0.55)',
  },
  subTabButtonActive: {
    backgroundColor: THEME.colors.oroClaro,
    borderColor: THEME.colors.bordeBrillante,
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.3,
    ...THEME.effects.textShadowSubtle,
  },
  subTabTextActive: {
    color: '#100D0B',
    fontWeight: '900',
  },
  contentArea: {
    flex: 1,
  },
});
