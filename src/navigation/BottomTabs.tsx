import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { THEME } from '../constants/theme';
import { MainTabParamList } from '../types/navigation';
import { DashboardScreen } from '../screens/dashboard/DashboardScreen';
import { AccountsScreen } from '../screens/accounts/AccountsScreen';
import { CharacterListScreen } from '../screens/characters/CharacterListScreen';
import { ToolsScreen } from '../screens/tools/ToolsScreen';
import { ConfigScreen } from '../screens/config/ConfigScreen';
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
          fontSize: 10,
          fontWeight: '900',
          fontFamily: THEME.typography.fontTitle,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        },
      }}
    >
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
        name="Cuentas"
        component={AccountsScreen}
        options={{
          tabBarLabel: t('tabAccounts'),
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
        name="PJs"
        component={CharacterListScreen}
        options={{
          tabBarLabel: t('tabPJs'),
          tabBarIcon: ({ color, focused }) => (
            <View style={[styles.tabIconWrap, focused && styles.tabIconWrapFocused]}>
              {focused && <View style={styles.tabGlowAura} />}
              <MaterialCommunityIcons
                name="sword-cross"
                size={focused ? 24 : 21}
                color={color}
              />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Mas"
        component={ToolsScreen}
        options={{
          tabBarLabel: t('tabMore'),
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
        name="Config"
        component={ConfigScreen}
        options={{
          tabBarLabel: t('tabConfig'),
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
