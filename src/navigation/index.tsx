// src/navigation/index.tsx

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, BarChart2, Tag, Settings } from 'lucide-react-native';

import DashboardScreen from '../screens/DashboardScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';
import CategoriasScreen from '../screens/CategoriasScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import NovaTransacaoScreen from '../screens/NovaTransacaoScreen';
import RepetirGastoScreen from '../screens/RepetirGastoScreen';

import { Colors, FontSize, FontWeight } from '../theme';

export type RootStackParamList = {
  MainTabs: undefined;
  NovaTransacao: { tipo?: 'despesa' | 'renda' };
  RepetirGasto: undefined;
};

export type TabParamList = {
  Inicio: undefined;
  Relatorios: undefined;
  Categorias: undefined;
  Configuracoes: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.textPrimary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color }) => {
          const size = 22;
          const strokeWidth = focused ? 2.2 : 1.7;
          if (route.name === 'Inicio') return <Home size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Relatorios') return <BarChart2 size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Categorias') return <Tag size={size} color={color} strokeWidth={strokeWidth} />;
          if (route.name === 'Configuracoes') return <Settings size={size} color={color} strokeWidth={strokeWidth} />;
          return null;
        },
        tabBarIndicatorStyle: { display: 'none' },
      })}
    >
      <Tab.Screen name="Inicio" component={DashboardScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Relatorios" component={RelatoriosScreen} options={{ tabBarLabel: 'Relatórios' }} />
      <Tab.Screen name="Categorias" component={CategoriasScreen} options={{ tabBarLabel: 'Categorias' }} />
      <Tab.Screen name="Configuracoes" component={ConfiguracoesScreen} options={{ tabBarLabel: 'Config.' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen
          name="NovaTransacao"
          component={NovaTransacaoScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="RepetirGasto"
          component={RepetirGastoScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    height: 64,
    paddingBottom: 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  tabLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    marginTop: 2,
  },
});
