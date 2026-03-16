    // src/screens/ConfiguracoesScreen.tsx
    import React, { useState } from 'react';
    import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { useApp } from '../context/AppContext';
    import { formatarMoeda } from '../utils';
    import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';

    export default function ConfiguracoesScreen() {
    const { grupo, orcamentoMensal, setOrcamentoMensal, grupoId } = useApp();
    const [orcamento, setOrcamento] = useState(String(orcamentoMensal));

    async function salvarOrcamento() {
        const val = parseFloat(orcamento.replace(',', '.'));
        if (!val || val <= 0) return Alert.alert('Valor inválido');
        await setOrcamentoMensal(val);
        Alert.alert('Salvo', 'Orçamento atualizado com sucesso!');
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
        <Text style={{ fontSize: 26, fontWeight: '800', padding: 16 }}>Configurações</Text>
        <View style={{ margin: 16, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 20, ...Shadow.sm }}>
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 4 }}>Grupo ativo</Text>
            <Text style={{ color: Colors.textSecondary }}>{grupo?.nome ?? grupoId}</Text>
        </View>
        <View style={{ margin: 16, backgroundColor: Colors.cardBg, borderRadius: 16, padding: 20, ...Shadow.sm }}>
            <Text style={{ fontWeight: '700', fontSize: 16, marginBottom: 12 }}>Orçamento Mensal</Text>
            <TextInput
            value={orcamento} onChangeText={setOrcamento}
            keyboardType="decimal-pad"
            style={{ borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, padding: 14, fontSize: 18, fontWeight: '700', marginBottom: 12 }}
            />
            <TouchableOpacity
            style={{ backgroundColor: Colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' }}
            onPress={salvarOrcamento}>
            <Text style={{ fontWeight: '700', fontSize: 16 }}>Salvar Orçamento</Text>
            </TouchableOpacity>
        </View>
        </SafeAreaView>
    );
    }