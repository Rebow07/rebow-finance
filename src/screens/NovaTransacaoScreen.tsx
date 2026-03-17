// src/screens/NovaTransacaoScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, Switch, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Check, CreditCard, ChevronDown } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useCartoes } from '../hooks/useCartoes';
import { transacoesService, gerarParcelas } from '../services/transacoes.service';
import { CATEGORIAS, APP_CONFIG } from '../constants';
import { dataParaISO } from '../utils';
import CategoriaIcon from '../components/CategoriaIcon';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { RootStackParamList } from '../navigation';

type RouteT = RouteProp<RootStackParamList, 'NovaTransacao'>;

const PARCELAS_RAPIDAS = ['1', '2', '3', '4', '6', '12'];

export default function NovaTransacaoScreen() {
  const nav = useNavigation();
  const { grupoId } = useApp();
  const { cartoes } = useCartoes(grupoId);

  const [titulo, setTitulo] = useState('');
  const [valor, setValor] = useState('');
  const [categoria, setCategoria] = useState('outros');
  const [fixo, setFixo] = useState(false);
  const [parcelas, setParcelas] = useState('1');
  const [parcelasCustom, setParcelasCustom] = useState('');
  const [mostrarCustom, setMostrarCustom] = useState(false);
  const [cartaoId, setCartaoId] = useState<string | null>(null);
  const [modalCartao, setModalCartao] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const cartaoSelecionado = cartoes.find(c => c.id === cartaoId);
  const totalParcelas = mostrarCustom
    ? parseInt(parcelasCustom) || 1
    : parseInt(parcelas) || 1;

  async function salvar() {
    if (!titulo.trim()) return Alert.alert('Atenção', 'Informe o título.');
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');
    if (!grupoId) return Alert.alert('Erro', 'Nenhum grupo configurado.');
    if (mostrarCustom && (totalParcelas < 1 || totalParcelas > 360))
      return Alert.alert('Atenção', 'Número de parcelas inválido.');

    setSalvando(true);
    try {
      const base = {
        grupo_id: grupoId,
        criado_por: APP_CONFIG.DEFAULT_USER_ID,
        titulo: titulo.trim(),
        valor: valorNum,
        categoria,
        tipo: 'despesa' as const,
        data: dataParaISO(new Date()),
        fixo,
        parcelado: totalParcelas > 1,
        cartao_id: cartaoId,
      };

      if (totalParcelas > 1) {
        await transacoesService.inserirLote(gerarParcelas(base, totalParcelas));
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
        <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn}>
          <X size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Nova Despesa</Text>
        <TouchableOpacity onPress={salvar} style={s.saveBtn} disabled={salvando}>
          {salvando
            ? <ActivityIndicator size="small" color={Colors.textPrimary} />
            : <Check size={22} color={Colors.textPrimary} />}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.form} showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {/* Título */}
        <Text style={s.label}>Título</Text>
        <TextInput
          style={s.input} value={titulo} onChangeText={setTitulo}
          placeholder="Ex: Mercado, Conta de luz..." placeholderTextColor={Colors.textMuted}
        />

        {/* Valor */}
        <Text style={s.label}>Valor (R$)</Text>
        <TextInput
          style={[s.input, s.inputGrande]} value={valor} onChangeText={setValor}
          keyboardType="decimal-pad" placeholder="0,00" placeholderTextColor={Colors.textMuted}
        />

        {/* Cartão */}
        <Text style={s.label}>Cartão {cartoes.length === 0 ? '(nenhum cadastrado)' : '(opcional)'}</Text>
        <TouchableOpacity
          style={[s.cartaoSelector, cartoes.length === 0 && { opacity: 0.5 }]}
          onPress={() => cartoes.length > 0 && setModalCartao(true)}
          disabled={cartoes.length === 0}>
          <CreditCard size={18} color={cartaoSelecionado ? cartaoSelecionado.cor : Colors.textMuted} />
          <Text style={[s.cartaoSelectorText, !cartaoSelecionado && { color: Colors.textMuted }]}>
            {cartaoSelecionado ? cartaoSelecionado.nome : 'Selecionar cartão'}
          </Text>
          <ChevronDown size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        {cartaoId && (
          <TouchableOpacity onPress={() => setCartaoId(null)} style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: FontSize.xs, color: Colors.despesa, fontWeight: FontWeight.semiBold }}>
              ✕ Remover cartão
            </Text>
          </TouchableOpacity>
        )}

        {/* Categoria */}
        <Text style={s.label}>Categoria</Text>
        <View style={s.catGrid}>
          {CATEGORIAS.filter(c => c.id !== 'renda').map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[s.catItem, categoria === cat.id && {
                borderColor: cat.cor, borderWidth: 2, backgroundColor: `${cat.cor}12`,
              }]}
              onPress={() => setCategoria(cat.id)}>
              <CategoriaIcon iconName={cat.icon} cor={cat.cor} size={18} />
              <Text style={[s.catLabel, categoria === cat.id && { color: cat.cor, fontWeight: FontWeight.bold }]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Parcelas */}
        <Text style={s.label}>Parcelas</Text>
        <View style={s.parcelasRow}>
          {PARCELAS_RAPIDAS.map(p => (
            <TouchableOpacity
              key={p}
              style={[s.parcelaBtn, !mostrarCustom && parcelas === p && s.parcelaBtnActive]}
              onPress={() => { setParcelas(p); setMostrarCustom(false); }}>
              <Text style={[s.parcelaBtnText, !mostrarCustom && parcelas === p && s.parcelaBtnTextActive]}>
                {p}x
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[s.parcelaBtn, mostrarCustom && s.parcelaBtnActive]}
            onPress={() => setMostrarCustom(true)}>
            <Text style={[s.parcelaBtnText, mostrarCustom && s.parcelaBtnTextActive]}>Outro</Text>
          </TouchableOpacity>
        </View>

        {mostrarCustom && (
          <TextInput
            style={[s.input, { marginTop: 8 }]}
            value={parcelasCustom}
            onChangeText={setParcelasCustom}
            keyboardType="number-pad"
            placeholder="Quantas parcelas? Ex: 8, 10, 18..."
            placeholderTextColor={Colors.textMuted}
          />
        )}

        {totalParcelas > 1 && (
          <View style={s.parcelaInfo}>
            <Text style={s.parcelaInfoText}>
              {totalParcelas}x de {valor
                ? `R$ ${(parseFloat(valor.replace(',', '.')) / totalParcelas).toFixed(2)}`
                : 'R$ 0,00'}
            </Text>
          </View>
        )}

        {/* Fixo */}
        <View style={s.switchRow}>
          <View>
            <Text style={s.switchLabel}>Gasto fixo / recorrente</Text>
            <Text style={s.switchSub}>Aparece todo mês automaticamente</Text>
          </View>
          <Switch
            value={fixo} onValueChange={setFixo}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={fixo ? Colors.primaryDark : '#FFF'}
          />
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={salvar} disabled={salvando}>
          <Text style={s.submitText}>{salvando ? 'Salvando...' : 'Salvar Despesa'}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal Cartão */}
      <Modal visible={modalCartao} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalSheetHeader}>
              <Text style={s.modalSheetTitulo}>Selecionar Cartão</Text>
              <TouchableOpacity onPress={() => setModalCartao(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            {cartoes.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[s.cartaoOpcao, cartaoId === c.id && { backgroundColor: `${c.cor}12` }]}
                onPress={() => { setCartaoId(c.id); setModalCartao(false); }}>
                <View style={[s.cartaoOpcaoIcon, { backgroundColor: `${c.cor}20` }]}>
                  <CreditCard size={20} color={c.cor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.cartaoOpcaoNome}>{c.nome}</Text>
                  <Text style={s.cartaoOpcaoSub}>Vence dia {c.vencimento}</Text>
                </View>
                {cartaoId === c.id && <Check size={20} color={c.cor} />}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
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
  saveBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  form: { padding: Spacing.md, paddingBottom: 40 },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.md,
    color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  inputGrande: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  cartaoSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    backgroundColor: Colors.surface, marginBottom: 6,
  },
  cartaoSelectorText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  catItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  catLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  parcelasRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  parcelaBtn: {
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: BorderRadius.md,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  parcelaBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  parcelaBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  parcelaBtnTextActive: { color: Colors.textPrimary },
  parcelaInfo: {
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    padding: 10, marginBottom: Spacing.md, alignItems: 'center',
  },
  parcelaInfoText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primaryDark },
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
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl, padding: Spacing.md, paddingBottom: 40,
  },
  modalSheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md,
  },
  modalSheetTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  cartaoOpcao: {
    flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
    borderRadius: BorderRadius.md, marginBottom: 8,
  },
  cartaoOpcaoIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  cartaoOpcaoNome: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  cartaoOpcaoSub: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
});
