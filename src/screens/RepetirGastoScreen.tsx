    // src/screens/RepetirGastoScreen.tsx
    import React from 'react';
    import { View, Text, TouchableOpacity } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { useNavigation } from '@react-navigation/native';
    import { X } from 'lucide-react-native';
    import { Colors } from '../theme';

    export default function RepetirGastoScreen() {
    const nav = useNavigation();
    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top','bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
            <TouchableOpacity onPress={() => nav.goBack()}>
            <X size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={{ fontSize: 18, fontWeight: '700', marginLeft: 16 }}>Repetir Gasto</Text>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
            <Text style={{ fontSize: 40, marginBottom: 16 }}>🔁</Text>
            <Text style={{ fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 8 }}>Em breve</Text>
            <Text style={{ color: Colors.textSecondary, textAlign: 'center' }}>
            Aqui você poderá repetir rapidamente um gasto recente com um toque.
            </Text>
        </View>
        </SafeAreaView>
    );
    }