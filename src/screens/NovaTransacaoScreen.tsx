// src/screens/NovaTransacaoScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, Alert, Switch, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { transacoesService, gerarParcelas } from '../services/transacoes.service';
import { CATEGORIAS, APP_CONFIG } from '../constants';
import { dataParaISO } from '../utils';
import CategoriaIcon from '../components/CategoriaIcon';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { RootStackParamList } from '../navigation';

type RouteT = RouteProp<RootStackParamList, 'NovaTransacao'>;

export default function NovaTransacaoScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteT>();
  const { grupoId } = useApp();

  const [tipo, setTipo] = useState<'despesa' | 'renda'>(route.params?.tipo ?? 'despesa');
  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [fixo, setFixo] = useState(false);
  const [parcelas, setParcelas] = useState('1');
  const [salvando, setSalvando] = useState(false);

  async function salvar() {
    if (!titulo.trim()) return Alert.alert('Atenção', 'Informe o título da transação.');
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');
    if (!grupoId) return Alert.alert('Erro', 'Nenhum grupo configurado.');

    setSalvando(true);
    try {
      const totalParcelas = parseInt(parcelas) || 1;

      const base = {
        grupo_id: grupoId,
        criado_por: APP_CONFIG.DEFAULT_USER_ID,
        titulo: titulo.trim(),
        valor: valorNum,
        categoria,
        tipo,
        data: dataParaISO(new Date()),
        fixo,
        parcelado: totalParcelas > 1,
      };

      if (totalParcelas > 1) {
        const lote = gerarParcelas(base, totalParcelas);
        await transacoesService.inserirLote(lote);
      } else {
        await transacoesService.inserir(base);
      }

      nav.goBack();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.closeBtn}>
          <X size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nova Transação</Text>
        <TouchableOpacity onPress={salvar} style={s.saveBtn} disabled={salvando}>
          {salvando
            ? <ActivityIndicator size="small" color={Colors.textPrimary} />
            : <Check size={22} color={Colors.textPrimary} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Tipo */}
        <View style={s.tipoRow}>
          {(['despesa', 'renda'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[
                s.tipoBtn,
                tipo === t && { backgroundColor: t === 'despesa' ? Colors.despesa : Colors.renda, borderColor: 'transparent' },
              ]}
              onPress={() => setTipo(t)}>
              <Text style={[s.tipoBtnText, tipo === t && { color: '#FFF' }]}>
                {t === 'despesa' ? '📉 Despesa' : '📈 Renda'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Título */}
        <Text style={s.label}>Título</Text>
        <TextInput
          style={s.input}
          value={titulo}
          onChangeText={setTitulo}
          placeholder="Ex: Mercado, Salário..."
          placeholderTextColor={Colors.textMuted}
        />

        {/* Valor */}
        <Text style={s.label}>Valor (R$)</Text>
        <TextInput
          style={[s.input, s.inputGrande]}
          value={valor}
          onChangeText={setValor}
          keyboardType="decimal-pad"
          placeholder="0,00"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Categorias */}
        <Text style={s.label}>Categoria</Text>
        <View style={s.catGrid}>
          {CATEGORIAS.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[
                s.catItem,
                categoria === cat.id && {
                  borderColor: cat.cor,
                  borderWidth: 2,
                  backgroundColor: `${cat.cor}12`,
                },
              ]}
              onPress={() => setCategoria(cat.id)}>
              <CategoriaIcon iconName={cat.icon} cor={cat.cor} size={18} />
              <Text style={[
                s.catLabel,
                categoria === cat.id && { color: cat.cor, fontWeight: FontWeight.bold },
              ]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Parcelas */}
        <Text style={s.label}>Parcelas</Text>
        <View style={s.row}>
          {['1', '2', '3', '4', '6', '12'].map(p => (
            <TouchableOpacity
              key={p}
              style={[s.parcelaBtn, parcelas === p && s.parcelaBtnActive]}
              onPress={() => setParcelas(p)}>
              <Text style={[s.parcelaBtnText, parcelas === p && s.parcelaBtnTextActive]}>
                {p}x
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fixo */}
        <View style={s.switchRow}>
          <View>
            <Text style={s.switchLabel}>Gasto fixo / recorrente</Text>
            <Text style={s.switchSub}>Aparece todo mês automaticamente</Text>
          </View>
          <Switch
            value={fixo}
            onValueChange={setFixo}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={fixo ? Colors.primaryDark : '#FFF'}
          />
        </View>

        {/* Botão salvar */}
        <TouchableOpacity style={s.submitBtn} onPress={salvar} disabled={salvando}>
          <Text style={s.submitText}>
            {salvando ? 'Salvando...' : `Salvar ${tipo === 'despesa' ? 'Despesa' : 'Renda'}`}
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
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  form: { padding: Spacing.md, paddingBottom: 40 },
  tipoRow: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg },
  tipoBtn: {
    flex: 1, paddingVertical: 14, borderRadius: BorderRadius.md, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  tipoBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  label: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary, marginBottom: 8, marginTop: 4,
  },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: FontSize.md, color: Colors.textPrimary,
    backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  inputGrande: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  catItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  catLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  row: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md },
  parcelaBtn: {
    flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  parcelaBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  parcelaBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  parcelaBtnTextActive: { color: Colors.textPrimary },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  switchSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 18, alignItems: 'center', ...Shadow.md,
  },
  submitText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});
