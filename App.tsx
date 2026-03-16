import 'react-native-url-polyfill/auto';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation';
import { AppProvider } from './src/context/AppContext';
import { Colors } from './src/theme';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    setTimeout(async () => {
      await SplashScreen.hideAsync();
      setPronto(true);
    }, 1500);
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