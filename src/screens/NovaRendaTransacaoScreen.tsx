// src/screens/NovaRendaTransacaoScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { transacoesService } from '../services/transacoes.service';
import { APP_CONFIG } from '../constants';
import { dataParaISO } from '../utils';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';

export default function NovaRendaTransacaoScreen() {
  const nav = useNavigation();
  const { grupoId } = useApp();
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo.trim()) return Alert.alert('Atenção', 'Informe o título.');
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');

    setSalvando(true);
    try {
      await transacoesService.inserir({
        grupo_id: grupoId,
        criado_por: APP_CONFIG.DEFAULT_USER_ID,
        titulo: titulo.trim(),
        valor: valorNum,
        categoria: 'renda',
        tipo: 'renda',
        data: dataParaISO(new Date()),
        fixo: false,
        parcelado: false,
        cartao_id: null,
      });
      nav.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn}>
          <X size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Lançar Renda</Text>
        <TouchableOpacity onPress={salvar} style={[s.saveBtn, { backgroundColor: Colors.renda }]} disabled={salvando}>
          {salvando
            ? <ActivityIndicator size="small" color="#FFF" />
            : <Check size={22} color="#FFF" />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>Descrição</Text>
        <TextInput
          style={s.input} value={titulo} onChangeText={setTitulo}
          placeholder="Ex: Salário extra, Freela..." placeholderTextColor={Colors.textMuted}
        />

        <Text style={s.label}>Valor (R$)</Text>
        <TextInput
          style={[s.input, s.inputGrande]} value={valor} onChangeText={setValor}
          keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted}
        />

        <TouchableOpacity style={[s.submitBtn, { backgroundColor: Colors.renda }]} onPress={salvar} disabled={salvando}>
          <Text style={[s.submitText, { color: '#FFF' }]}>
            {salvando ? 'Salvando...' : 'Salvar Renda'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtn: { width: 40, height: 40, borderRadius: BorderRadius.full, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  form: { padding: Spacing.md, paddingBottom: 40 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.md,
    color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  inputGrande: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  submitBtn: {
    borderRadius: BorderRadius.lg, paddingVertical: 18, alignItems: 'center', ...Shadow.md, marginTop: Spacing.lg,
  },
  submitText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold },
});
