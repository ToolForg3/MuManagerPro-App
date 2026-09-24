import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { MainTabParamList } from '../types/navigation';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { PlayersHubScreen } from '../screens/players/PlayersHubScreen';
import { ObjectsHubScreen } from '../screens/objects/ObjectsHubScreen';
import { ToolsHubScreen } from '../screens/tools/ToolsHubScreen';
import { ConfigScreen } from '../screens/config/ConfigScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { CharacterListScreen } from '../screens/characters/CharacterListScreen';
import { ToolsScreen } from '../screens/tools/ToolsScreen';
import { useLanguage } from '../context/LanguageContext';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const BottomTabs = () => {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(6, insets.bottom);

  return (
    <Tab.Navigator
      initialRouteName="Inicio"
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: THEME.colors.fondo,
          borderTopColor: THEME.colors.borde,
          borderTopWidth: 1.5,
          height: 56 + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 4,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.7,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: THEME.colors.oro,
        tabBarInactiveTintColor: THEME.colors.textoSecundario,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '900',
          fontFamily: THEME.typography.fontTitle,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
      }}
    >
      {/* ========================================================================= */}
      {/* 5 ÁREAS PRINCIPALES DEL SISTEMA                                           */}
      {/* ========================================================================= */}
      <Tab.Screen
        name="Inicio"
        component={DashboardScreen}
        options={{
          tabBarLabel: t('tabHome'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              {focused && <View style={styles.tabGlowAura} />}
              <MaterialCommunityIcons
                name="shield-crown"
                size={focused ? 24 : 21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Jugadores"
        component={PlayersHubScreen}
        options={{
          tabBarLabel: t('tabPlayers') || 'Jugadores',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              {focused && <View style={styles.tabGlowAura} />}
              <MaterialCommunityIcons
                name="account-group"
                size={focused ? 24 : 21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Objetos"
        component={ObjectsHubScreen}
        options={{
          tabBarLabel: t('tabObjects') || 'Objetos',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              {focused && <View style={styles.tabGlowAura} />}
              <MaterialCommunityIcons
                name="treasure-chest"
                size={focused ? 24 : 21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Herramientas"
        component={ToolsHubScreen}
        options={{
          tabBarLabel: t('tabTools') || 'Herramientas',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              {focused && <View style={styles.tabGlowAura} />}
              <MaterialCommunityIcons
                name="anvil"
                size={focused ? 24 : 21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Ajustes"
        component={ConfigScreen}
        options={{
          tabBarLabel: t('tabSettings') || 'Ajustes',
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              {focused && <View style={styles.tabGlowAura} />}
              <MaterialCommunityIcons
                name="cog"
                size={focused ? 24 : 21}
                color={color}
              />
            </View>
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
  tabIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 30,
    borderRadius: 6,
    position: 'relative',
  },
  tabIconWrapFocused: {
    backgroundColor: 'rgba(232, 200, 106, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(232, 200, 106, 0.4)',
  },
  tabGlowAura: {
    position: 'absolute',
    top: -4,
    width: 20,
    height: 2,
    backgroundColor: THEME.colors.oro,
    borderRadius: 1,
    shadowColor: THEME.colors.oro,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 5,
  },
});
