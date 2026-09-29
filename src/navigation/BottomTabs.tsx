import React from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity, Image } from 'react-native';
import { createBottomTabNavigator, BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { useLanguage } from '../context/LanguageContext';
import { THEME } from '../constants/theme';
import { STITCH_ASSETS } from '../constants/stitchAssets';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PlayersHubScreen } from '../screens/players/PlayersHubScreen';
import { ObjectsHubScreen } from '../screens/objects/ObjectsHubScreen';
import { ToolsHubScreen } from '../screens/tools/ToolsHubScreen';
import { ConfigScreen } from '../screens/config/ConfigScreen';

// Subpantallas para compatibilidad directa
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { CharacterListScreen } from '../screens/characters/CharacterListScreen';
import { ToolsScreen } from '../screens/tools/ToolsScreen';
import { MuIcon } from '../components/ui/MuIcon';

const Tab = createBottomTabNavigator();

// Custom Tab Button replicating Stitch 01 / Final 13R exact active container with native Season 6 pixel-art icons
const StitchTabBarButton = (
  props: BottomTabBarButtonProps & { label: string; imageSource: any }
) => {
  const { accessibilityState, onPress, onLongPress, label, imageSource } = props;
  const isFocused = accessibilityState?.selected;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[
        styles.tabButton,
        isFocused ? styles.tabButtonActive : styles.tabButtonInactive,
      ]}
    >
      <View style={styles.tabIconWrap}>
        <Image
          source={imageSource}
          style={[
            styles.tabIconImage,
            isFocused ? styles.tabIconImageActive : styles.tabIconImageInactive,
          ]}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          isFocused ? styles.tabLabelActive : styles.tabLabelInactive,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

export const BottomTabs = () => {
  const { t } = useLanguage();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0d0e0d',
          borderTopWidth: 2,
          borderTopColor: '#5a470f',
          height: Platform.OS === 'ios' ? 88 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 0,
          paddingTop: 0,
          elevation: 12,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.9,
          shadowRadius: 10,
        },
      }}
    >
      {/* ========================================================================= */}
      {/* 5 ÁREAS PRINCIPALES DEL SISTEMA (IDÉNTICAS A STITCH 01 & 13R)             */}
      {/* ========================================================================= */}
      <Tab.Screen
        name="Inicio"
        component={DashboardScreen}
        options={{
          tabBarButton: (props) => (
            <StitchTabBarButton
              {...props}
              label={t('tabHome') || 'Inicio'}
              imageSource={STITCH_ASSETS.tabs.inicio}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Jugadores"
        component={PlayersHubScreen}
        options={{
          tabBarButton: (props) => (
            <StitchTabBarButton
              {...props}
              label={t('tabPlayers') || 'Jugadores'}
              imageSource={STITCH_ASSETS.tabs.jugadores}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Objetos"
        component={ObjectsHubScreen}
        options={{
          tabBarButton: (props) => (
            <StitchTabBarButton
              {...props}
              label={t('tabObjects') || 'Objetos'}
              imageSource={STITCH_ASSETS.tabs.objetos}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Herramientas"
        component={ToolsHubScreen}
        options={{
          tabBarButton: (props) => (
            <StitchTabBarButton
              {...props}
              label={t('tabTools') || 'Herramientas'}
              imageSource={STITCH_ASSETS.tabs.herramientas}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Ajustes"
        component={ConfigScreen}
        options={{
          tabBarButton: (props) => (
            <StitchTabBarButton
              {...props}
              label={t('tabSettings') || 'Ajustes'}
              imageSource={STITCH_ASSETS.tabs.ajustes}
            />
          ),
        }}
      />

      {/* ========================================================================= */}
      {/* RUTAS DE COMPATIBILIDAD RETROACTIVA (Ocultas de la barra inferior)        */}
      {/* ========================================================================= */}
      <Tab.Screen
        name="Cuentas"
        component={AccountsScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="PJs"
        component={CharacterListScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Mas"
        component={ToolsScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
      <Tab.Screen
        name="Config"
        component={ConfigScreen}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  tabButton: {
    flex: 1,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    marginHorizontal: 1,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(31, 32, 31, 0.95)',
    borderTopWidth: 2,
    borderTopColor: '#efd28d',
    borderRadius: 2,
    shadowColor: '#efd28d',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
    borderTopWidth: 2,
    borderTopColor: 'transparent',
  },
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 30,
    width: 30,
    marginBottom: 2,
  },
  tabIconImage: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  tabIconImageActive: {
    opacity: 1,
  },
  tabIconImageInactive: {
    opacity: 0.75,
  },
  tabLabel: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: '#fedf99',
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
  },
  tabLabelInactive: {
    color: '#cfc5b5',
    fontWeight: '600',
  },
});
