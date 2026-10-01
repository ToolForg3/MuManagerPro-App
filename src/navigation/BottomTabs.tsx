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

// Custom Tab Button with crisp, transparent native icons (resolves muddy background & white borders)
const StitchTabBarButton = (
  props: BottomTabBarButtonProps & { label: string; iconName: string }
) => {
  const { accessibilityState, onPress, onLongPress, label, iconName } = props;
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
        <MuIcon
          name={iconName}
          size={24}
          color={isFocused ? '#FEDF99' : '#CDC6B9'}
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
      {/* 5 ÁREAS PRINCIPALES DEL SISTEMA                                           */}
      {/* ========================================================================= */}
      <Tab.Screen
        name="Inicio"
        component={DashboardScreen}
        options={{
          tabBarButton: (props) => (
            <StitchTabBarButton
              {...props}
              label={t('tabHome') || 'Inicio'}
              iconName="database"
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
              iconName="account-group"
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
              iconName="treasure-chest"
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
              iconName="tools"
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
              iconName="cog"
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
    height: 28,
    width: 28,
    marginBottom: 2,
  },
  tabLabel: {
    fontFamily: THEME.typography.fontTitle,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tabLabelActive: {
    color: '#fedf99',
    fontWeight: '900',
    ...THEME.effects.textShadowSubtle,
  },
  tabLabelInactive: {
    color: '#CDC6B9',
    fontWeight: '700',
    ...THEME.effects.textShadowSubtle,
  },
});
