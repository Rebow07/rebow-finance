// App.tsx

import 'react-native-url-polyfill/auto';
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation';
import { AppProvider } from './src/context/AppContext';
import { Colors } from './src/theme';

SplashScreen.preventAutoHideAsync();

// Configura como as notificações aparecem quando o app está aberto
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  const [pronto, setPronto] = useState(false);
  const notificationListener = useRef<Notifications.EventSubscription>();
  const responseListener = useRef<Notifications.EventSubscription>();

  useEffect(() => {
    // Listener: notificação recebida com app aberto
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notificação recebida:', notification.request.content.title);
    });

    // Listener: usuário tocou na notificação
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notificação tocada, cartaoId:', data?.cartaoId);
      // Aqui você pode navegar para a tela de cartões se quiser
    });

    setTimeout(async () => {
      await SplashScreen.hideAsync();
      setPronto(true);
    }, 1500);

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  if (!pronto) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>💛 Rebow</Text>
        <Text style={styles.splashSub}>Finance</Text>
        <ActivityIndicator color={Colors.textPrimary} style={{ marginTop: 24 }} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <AppNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#FFD54F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  splashSub: {
    fontSize: 22,
    fontWeight: '600',
    color: '#333',
    marginTop: -8,
  },
});
