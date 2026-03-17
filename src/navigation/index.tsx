// src/navigation/index.tsx

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, TrendingUp, CreditCard, Settings, Receipt } from 'lucide-react-native';

import { useApp } from '../context/AppContext';

import AuthScreen from '../screens/AuthScreen';
import DashboardScreen from '../screens/DashboardScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';
import RendasScreen from '../screens/RendasScreen';
import CartoesScreen from '../screens/CartoesScreen';
import ConfiguracoesScreen from '../screens/ConfiguracoesScreen';
import DespesasScreen from '../screens/DespesasScreen';
import NovaTransacaoScreen from '../screens/NovaTransacaoScreen';
import NovaRendaTransacaoScreen from '../screens/NovaRendaTransacaoScreen';
import RepetirGastoScreen from '../screens/RepetirGastoScreen';
import DetalheTransacaoScreen from '../screens/DetalheTransacaoScreen';

import { Colors, FontSize, FontWeight } from '../theme';
import { Transacao } from '../types';

export type RootStackParamList = {
  MainTabs: undefined;
  NovaTransacao: { tipo?: 'despesa' };
  NovaRendaTransacao: undefined;
  RepetirGasto: undefined;
  DetalheTransacao: { transacao: Transacao };
};

export type TabParamList = {
  Inicio: undefined;
  Despesas: undefined;
  Rendas: undefined;
  Cartoes: undefined;
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
          const sw = focused ? 2.2 : 1.7;
          if (route.name === 'Inicio') return <Home size={size} color={color} strokeWidth={sw} />;
          if (route.name === 'Despesas') return <Receipt size={size} color={color} strokeWidth={sw} />;
          if (route.name === 'Rendas') return <TrendingUp size={size} color={color} strokeWidth={sw} />;
          if (route.name === 'Cartoes') return <CreditCard size={size} color={color} strokeWidth={sw} />;
          if (route.name === 'Configuracoes') return <Settings size={size} color={color} strokeWidth={sw} />;
          return null;
        },
      })}>
      <Tab.Screen name="Inicio" component={DashboardScreen} options={{ tabBarLabel: 'Início' }} />
      <Tab.Screen name="Despesas" component={DespesasScreen} options={{ tabBarLabel: 'Despesas' }} />
      <Tab.Screen name="Rendas" component={RendasScreen} options={{ tabBarLabel: 'Rendas' }} />
      <Tab.Screen name="Cartoes" component={CartoesScreen} options={{ tabBarLabel: 'Cartões' }} />
      <Tab.Screen name="Configuracoes" component={ConfiguracoesScreen} options={{ tabBarLabel: 'Config.' }} />
    </Tab.Navigator>
  );
}

function AppAutenticado() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="NovaTransacao" component={NovaTransacaoScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="NovaRendaTransacao" component={NovaRendaTransacaoScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="RepetirGasto" component={RepetirGastoScreen} options={{ presentation: 'modal' }} />
      <Stack.Screen name="DetalheTransacao" component={DetalheTransacaoScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}

// ─────────────────────────────────────────────
// NAVEGADOR RAIZ — decide entre Auth e App
// ─────────────────────────────────────────────
export default function AppNavigator() {
  const { sessao, carregandoAuth } = useApp();

  if (carregandoAuth) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {sessao ? <AppAutenticado /> : <AuthScreen />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
