    // src/screens/CategoriasScreen.tsx
    import React from 'react';
    import { View, Text, FlatList, StyleSheet } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { CATEGORIAS } from '../constants';
    import CategoriaIcon from '../components/CategoriaIcon';
    import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';

    export default function CategoriasScreen() {
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <Text style={{ fontSize: 26, fontWeight: '800', padding: 16 }}>Categorias</Text>
        <FlatList
            data={CATEGORIAS}
            numColumns={2}
            keyExtractor={i => i.id}
            contentContainerStyle={{ padding: 8 }}
            renderItem={({ item }) => (
            <View style={{
                flex: 1, margin: 6, backgroundColor: Colors.cardBg, borderRadius: 16,
                padding: 20, alignItems: 'center', ...Shadow.sm,
            }}>
                <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: `${item.cor}18`, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <CategoriaIcon iconName={item.icon} cor={item.cor} size={26} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.textPrimary }}>{item.label}</Text>
            </View>
            )}
        />
        </SafeAreaView>
    );
    }