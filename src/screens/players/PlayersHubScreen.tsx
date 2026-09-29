import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  ImageBackground,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MuIcon, MuIconName } from '../../components/ui/MuIcon';
import { THEME } from '../../constants/theme';
import { STITCH_ASSETS } from '../../constants/stitchAssets';
import { AccountsScreen } from '../accounts/AccountsScreen';
import { CharacterListScreen } from '../characters/CharacterListScreen';
import { ToolsScreen } from '../tools/ToolsScreen';
import { MuHeaderBanner } from '../../components/ui/MuHeaderBanner';
import { MuSideMoldings } from '../../components/ui/MuSideMoldings';

export type PlayerSubTab = 'cuentas' | 'personajes' | 'online' | 'bans' | 'clanes' | 'pk' | 'gm';

interface SubTabOption {
  id: PlayerSubTab;
  label: string;
  icon?: MuIconName;
  imageIcon?: any;
  badgeDot?: string;
  customColor?: string;
}

const SUB_TABS: SubTabOption[] = [
  { id: 'cuentas', label: 'Cuentas', icon: 'account-multiple' },
  { id: 'personajes', label: 'Personajes', icon: 'character' },
  { id: 'online', label: 'Online', icon: 'sync', badgeDot: THEME.colors.jade },
  { id: 'bans', label: 'Baneados', icon: 'gavel', customColor: THEME.colors.brasa },
  { id: 'clanes', label: 'Clanes', icon: 'guild' },
  { id: 'pk', label: 'PK', icon: 'skull', customColor: THEME.colors.brasa },
  { id: 'gm', label: 'Staff GM', icon: 'shield-crown', customColor: THEME.colors.oroClaro },
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
    <ImageBackground
      source={STITCH_ASSETS.backgrounds.stone}
      style={[styles.container, { paddingTop: topInset + 4 }]}
      imageStyle={{ opacity: 0.50 }}
      resizeMode="repeat"
    >

      {/* Cornisa Gótica Superior Stitch 02 */}
      <View style={styles.headerWrapper}>
        <MuHeaderBanner
          title="MU MANAGER PRO · JUGADORES Y CUENTAS"
          subtitle="PADRÓN Y GESTIÓN DE USUARIOS"
        />
      </View>

      {/* Barra de Sub-Navegación Táctica de Secciones (Stitch 02) */}
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
                style={styles.subTabTouchable}
                onPress={() => setActiveSubTab(tab.id)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
              >
                <ImageBackground
                  source={isSelected ? STITCH_ASSETS.tabs.tabModeActive : STITCH_ASSETS.tabs.tabModeInactive}
                  style={styles.subTabButton}
                  resizeMode="stretch"
                  imageStyle={{ borderRadius: 2 }}
                >
                  {tab.badgeDot && (
                    <View style={[styles.tabDot, { backgroundColor: tab.badgeDot }]} />
                  )}
                  {tab.imageIcon ? (
                    <Image
                      source={tab.imageIcon}
                      style={styles.subTabImage}
                      resizeMode="contain"
                    />
                  ) : tab.icon ? (
                    <MuIcon
                      name={tab.icon}
                      size={14}
                      color={isSelected ? '#EFD28D' : (tab.customColor || THEME.colors.textoSecundarioLuminoso)}
                    />
                  ) : null}
                  <Text
                    style={[
                      styles.subTabText,
                      tab.customColor && !isSelected ? { color: tab.customColor } : null,
                      isSelected && styles.subTabTextActive,
                    ]}
                  >
                    {tab.label}
                  </Text>
                </ImageBackground>
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
        {activeSubTab === 'bans' && (
          <ToolsScreen
            mode="players"
            initialTab="players"
            playerSubTab="bans"
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
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.fondo,
  },
  headerWrapper: {
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  tabBarWrapper: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 3,
    backgroundColor: '#0D0E0D',
    borderRadius: 2,
    borderWidth: 1,
    borderColor: '#4C463A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 3,
    elevation: 3,
  },
  tabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 1,
    paddingRight: 24,
  },
  subTabTouchable: {
    borderRadius: 2,
    overflow: 'hidden',
    minHeight: 44,
  },
  subTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 8,
    minHeight: 44,
  },
  tabDot: {
    width: 6,
    height: 6,
    borderRadius: 3, /* círculo funcional (width/2): indicador de estado */
    marginRight: 2,
  },
  subTabImage: {
    width: 16,
    height: 16,
  },
  subTabText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: THEME.colors.textoSecundarioLuminoso,
    letterSpacing: 0.3,
    ...THEME.effects.textShadowSubtle,
  },
  subTabTextActive: {
    color: '#EFD28D',
    fontWeight: '900',
    ...THEME.effects.textShadow,
  },
  contentArea: {
    flex: 1,
  },
});
