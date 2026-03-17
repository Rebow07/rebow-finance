// src/screens/DetalheTransacaoScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, ActivityIndicator, Switch, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Trash2, Check, CreditCard, ChevronDown, Edit2, FastForward } from 'lucide-react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { useCartoes } from '../hooks/useCartoes';
import { transacoesService } from '../services/transacoes.service';
import { CATEGORIAS, getCategoriaById } from '../constants';
import { formatarMoeda, formatarData } from '../utils';
import CategoriaIcon from '../components/CategoriaIcon';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { RootStackParamList } from '../navigation';
import { Transacao } from '../types';

type RouteT = RouteProp<RootStackParamList, 'DetalheTransacao'>;

export default function DetalheTransacaoScreen() {
  const nav = useNavigation();
  const route = useRoute<RouteT>();
  const { grupoId } = useApp();
  const { cartoes } = useCartoes(grupoId);
  const t = route.params.transacao;

  const [editando, setEditando] = useState(false);
  const [titulo, setTitulo] = useState(t.titulo);
  const [valor, setValor] = useState(String(t.valor));
  const [categoria, setCategoria] = useState(t.categoria);
  const [fixo, setFixo] = useState(t.fixo);
  const [cartaoId, setCartaoId] = useState<string | null>(t.cartao_id ?? null);
  const [modalCartao, setModalCartao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [deletando, setDeletando] = useState(false);

  // Parcelas
  const [parcelas, setParcelas] = useState<Transacao[]>([]);
  const [carregandoParcelas, setCarregandoParcelas] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [modalParcelas, setModalParcelas] = useState(false);
  const [adiantando, setAdiantando] = useState(false);

  const cat = getCategoriaById(t.categoria);
  const cartaoSelecionado = cartoes.find(c => c.id === cartaoId);
  const isDespesa = t.tipo === 'despesa';

  useEffect(() => {
    if (t.parcela_grupo_id) carregarParcelas();
  }, []);

  async function carregarParcelas() {
    if (!t.parcela_grupo_id) return;
    setCarregandoParcelas(true);
    try {
      const p = await transacoesService.buscarPorGrupoParcela(t.parcela_grupo_id);
      setParcelas(p);
    } catch (e: any) {
      console.error('Erro ao carregar parcelas:', e.message);
    } finally {
      setCarregandoParcelas(false);
    }
  }

  async function salvarEdicao() {
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!titulo.trim() || !valorNum) return Alert.alert('Atenção', 'Preencha todos os campos.');
    setSalvando(true);
    try {
      await transacoesService.atualizar(t.id, {
        titulo: titulo.trim(),
        valor: valorNum,
        categoria,
        fixo,
        cartao_id: cartaoId,
      });
      Alert.alert('✅ Salvo', 'Transação atualizada!', [
        { text: 'OK', onPress: () => nav.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e.message ?? 'Tente novamente.');
    } finally {
      setSalvando(false); }
  }

  function confirmarExclusao() {
    Alert.alert(
      'Excluir transação',
      `Deseja excluir "${t.titulo}"?\n\nEsta ação não pode ser desfeita.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: executarExclusao,
        },
      ]
    );
  }

  async function executarExclusao() {
    setDeletando(true);
    try {
      await transacoesService.deletar(t.id);
      nav.goBack();
    } catch (e: any) {
      setDeletando(false);
      Alert.alert('Erro ao excluir', e.message ?? 'Não foi possível excluir. Verifique sua conexão.');
    }
  }

  function toggleParcela(id: string) {
    setSelecionadas(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodas() {
    const todasIds = new Set(parcelasRestantes.map(p => p.id));
    setSelecionadas(todasIds);
  }

  function deselecionarTodas() {
    setSelecionadas(new Set());
  }

  function confirmarAdiantamento() {
    if (selecionadas.size === 0) {
      Alert.alert('Atenção', 'Selecione ao menos uma parcela para adiantar.');
      return;
    }

    const totalAdiantar = parcelasRestantes
      .filter(p => selecionadas.has(p.id))
      .reduce((acc, p) => acc + p.valor, 0);

    Alert.alert(
      'Adiantar Parcelas',
      `Deseja adiantar ${selecionadas.size} parcela(s) no valor de ${formatarMoeda(totalAdiantar)}?\n\nElas serão removidas do banco.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', style: 'destructive', onPress: executarAdiantamento },
      ]
    );
  }

  async function executarAdiantamento() {
    setAdiantando(true);
    try {
      const ids = Array.from(selecionadas);
      await transacoesService.deletarLote(ids);
      setModalParcelas(false);
      Alert.alert('✅ Parcelas adiantadas!', `${ids.length} parcela(s) removidas com sucesso.`, [
        { text: 'OK', onPress: () => nav.goBack() }
      ]);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível adiantar. Verifique sua conexão.');
    } finally {
      setAdiantando(false);
    }
  }

  const parcelasRestantes = parcelas.filter(p => p.id !== t.id);
  const totalParcelas = parcelas.length;
  const parcelaAtual = t.parcela_index ?? 1;
  const totalSelecionado = parcelasRestantes
    .filter(p => selecionadas.has(p.id))
    .reduce((acc, p) => acc + p.valor, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={s.iconBtn}>
          <X size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>{editando ? 'Editando' : 'Detalhes'}</Text>
        <View style={s.headerAcoes}>
          {!editando && (
            <TouchableOpacity onPress={() => setEditando(true)} style={s.iconBtn}>
              <Edit2 size={18} color={Colors.textPrimary} />
            </TouchableOpacity>
          )}
          {deletando
            ? <ActivityIndicator size="small" color={Colors.despesa} style={{ width: 40 }} />
            : (
              <TouchableOpacity onPress={confirmarExclusao} style={s.iconBtn}>
                <Trash2 size={18} color={Colors.despesa} />
              </TouchableOpacity>
            )}
          {editando && (
            <TouchableOpacity onPress={salvarEdicao} style={s.saveBtn} disabled={salvando}>
              {salvando
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Check size={22} color={Colors.textPrimary} />}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={s.form} keyboardShouldPersistTaps="handled">
        {/* Badge tipo */}
        <View style={[s.tipoBadge, { backgroundColor: isDespesa ? Colors.despesaLight : Colors.rendaLight }]}>
          <Text style={[s.tipoBadgeText, { color: isDespesa ? Colors.despesa : Colors.renda }]}>
            {isDespesa ? '📉 Despesa' : '📈 Renda'}
          </Text>
          {t.parcelado && totalParcelas > 0 && (
            <View style={s.parceladoBadge}>
              <Text style={s.parceladoBadgeText}>
                Parcela {parcelaAtual}/{totalParcelas}
              </Text>
            </View>
          )}
          {t.fixo && (
            <View style={s.fixoBadge}>
              <Text style={s.fixoBadgeText}>Fixo</Text>
            </View>
          )}
        </View>

        {/* Valor destaque */}
        {!editando && (
          <View style={s.valorDestaque}>
            <Text style={[s.valorDestaqueNum, { color: isDespesa ? Colors.despesa : Colors.renda }]}>
              {isDespesa ? '-' : '+'}{formatarMoeda(t.valor)}
            </Text>
            <Text style={s.valorData}>{formatarData(t.data)}</Text>
          </View>
        )}

        {editando ? (
          <>
            <Text style={s.label}>Título</Text>
            <TextInput
              style={s.input} value={titulo} onChangeText={setTitulo}
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Valor (R$)</Text>
            <TextInput
              style={[s.input, s.inputGrande]} value={valor} onChangeText={setValor}
              keyboardType="decimal-pad" placeholderTextColor={Colors.textMuted}
            />

            {isDespesa && cartoes.length > 0 && (
              <>
                <Text style={s.label}>Cartão</Text>
                <TouchableOpacity style={s.cartaoSelector} onPress={() => setModalCartao(true)}>
                  <CreditCard size={18} color={cartaoSelecionado ? cartaoSelecionado.cor : Colors.textMuted} />
                  <Text style={[s.cartaoSelectorText, !cartaoSelecionado && { color: Colors.textMuted }]}>
                    {cartaoSelecionado ? cartaoSelecionado.nome : 'Sem cartão'}
                  </Text>
                  <ChevronDown size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </>
            )}

            <Text style={s.label}>Categoria</Text>
            <View style={s.catGrid}>
              {CATEGORIAS.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catItem, categoria === cat.id && {
                    borderColor: cat.cor, borderWidth: 2, backgroundColor: `${cat.cor}12`,
                  }]}
                  onPress={() => setCategoria(cat.id)}>
                  <CategoriaIcon iconName={cat.icon} cor={cat.cor} size={16} />
                  <Text style={[s.catLabel, categoria === cat.id && { color: cat.cor }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.switchRow}>
              <Text style={s.switchLabel}>Fixo / recorrente</Text>
              <Switch
                value={fixo} onValueChange={setFixo}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={fixo ? Colors.primaryDark : '#FFF'}
              />
            </View>
          </>
        ) : (
          <>
            {/* Detalhes */}
            <View style={s.detalheCard}>
              <View style={s.detalheRow}>
                <Text style={s.detalheLabel}>Título</Text>
                <Text style={s.detalheValor} numberOfLines={2}>{t.titulo}</Text>
              </View>
              <View style={s.detalheDivider} />
              <View style={s.detalheRow}>
                <Text style={s.detalheLabel}>Categoria</Text>
                <View style={s.detalheCatRow}>
                  <CategoriaIcon iconName={cat.icon} cor={cat.cor} size={16} />
                  <Text style={[s.detalheValor, { color: cat.cor }]}>{cat.label}</Text>
                </View>
              </View>
              <View style={s.detalheDivider} />
              <View style={s.detalheRow}>
                <Text style={s.detalheLabel}>Data</Text>
                <Text style={s.detalheValor}>{formatarData(t.data)}</Text>
              </View>
              {cartaoSelecionado && (
                <>
                  <View style={s.detalheDivider} />
                  <View style={s.detalheRow}>
                    <Text style={s.detalheLabel}>Cartão</Text>
                    <View style={s.detalheCatRow}>
                      <CreditCard size={16} color={cartaoSelecionado.cor} />
                      <Text style={[s.detalheValor, { color: cartaoSelecionado.cor }]}>
                        {cartaoSelecionado.nome}
                      </Text>
                    </View>
                  </View>
                </>
              )}
              {t.parcelado && totalParcelas > 1 && (
                <>
                  <View style={s.detalheDivider} />
                  <View style={s.detalheRow}>
                    <Text style={s.detalheLabel}>Parcelas restantes</Text>
                    <Text style={[s.detalheValor, { color: Colors.primaryDark }]}>
                      {parcelasRestantes.length} de {totalParcelas}
                    </Text>
                  </View>
                </>
              )}
            </View>

            {/* Botão adiantar */}
            {t.parcela_grupo_id && parcelasRestantes.length > 0 && (
              <TouchableOpacity
                style={s.adiantarBtn}
                onPress={() => {
                  selecionarTodas();
                  setModalParcelas(true);
                }}>
                <FastForward size={18} color={Colors.primaryDark} />
                <Text style={s.adiantarBtnText}>
                  Adiantar parcelas ({parcelasRestantes.length} restantes)
                </Text>
              </TouchableOpacity>
            )}

            {/* Botão editar */}
            <TouchableOpacity style={s.editarBtn} onPress={() => setEditando(true)}>
              <Edit2 size={18} color={Colors.textPrimary} />
              <Text style={s.editarBtnText}>Editar transação</Text>
            </TouchableOpacity>

            {/* Botão excluir */}
            <TouchableOpacity
              style={[s.deletarBtn, deletando && { opacity: 0.6 }]}
              onPress={confirmarExclusao}
              disabled={deletando}>
              {deletando
                ? <ActivityIndicator size="small" color={Colors.despesa} />
                : <Trash2 size={18} color={Colors.despesa} />}
              <Text style={s.deletarBtnText}>
                {deletando ? 'Excluindo...' : 'Excluir transação'}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* ===== MODAL ADIANTAR PARCELAS ===== */}
      <Modal
        visible={modalParcelas}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalParcelas(false)}>
        <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity
              onPress={() => setModalParcelas(false)}
              style={s.iconBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.modalTitulo}>Adiantar Parcelas</Text>
            <TouchableOpacity
              onPress={confirmarAdiantamento}
              style={[s.saveBtn, (selecionadas.size === 0 || adiantando) && { opacity: 0.4 }]}
              disabled={selecionadas.size === 0 || adiantando}>
              {adiantando
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Check size={22} color={Colors.textPrimary} />}
            </TouchableOpacity>
          </View>

          <View style={s.modalInfoBanner}>
            <Text style={s.modalInfoText}>
              Selecione as parcelas que deseja antecipar. Elas serão removidas do banco e o limite do cartão será liberado.
            </Text>
          </View>

          {/* Botões selecionar/desselecionar todas */}
          <View style={s.selecionarRow}>
            <TouchableOpacity onPress={selecionarTodas} style={s.selecionarBtn}>
              <Text style={s.selecionarBtnText}>Selecionar todas</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={deselecionarTodas} style={s.selecionarBtn}>
              <Text style={s.selecionarBtnText}>Limpar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 20 }}>
            {/* Parcela atual — não selecionável */}
            <View style={[s.parcelaItem, { opacity: 0.45 }]}>
              <View style={s.parcelaCheck} />
              <View style={{ flex: 1 }}>
                <Text style={s.parcelaNome}>{t.titulo} — atual</Text>
                <Text style={s.parcelaData}>{formatarData(t.data)}</Text>
              </View>
              <Text style={s.parcelaValor}>{formatarMoeda(t.valor)}</Text>
            </View>

            {/* Parcelas restantes */}
            {parcelasRestantes.map(p => {
              const sel = selecionadas.has(p.id);
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[s.parcelaItem, sel && s.parcelaItemSel]}
                  onPress={() => toggleParcela(p.id)}
                  activeOpacity={0.7}>
                  <View style={[s.parcelaCheck, sel && s.parcelaCheckSel]}>
                    {sel && <Check size={12} color="#FFF" strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.parcelaNome, sel && { color: Colors.primaryDark }]}>
                      {p.titulo}
                    </Text>
                    <Text style={s.parcelaData}>{formatarData(p.data)}</Text>
                  </View>
                  <Text style={[s.parcelaValor, { color: Colors.despesa }]}>
                    -{formatarMoeda(p.valor)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* Total */}
            {selecionadas.size > 0 && (
              <View style={s.totalAdiantar}>
                <View>
                  <Text style={s.totalAdiantarLabel}>Total a antecipar</Text>
                  <Text style={s.totalAdiantarSub}>{selecionadas.size} parcela(s)</Text>
                </View>
                <Text style={s.totalAdiantarValor}>{formatarMoeda(totalSelecionado)}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ===== MODAL CARTÃO ===== */}
      <Modal visible={modalCartao} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalSheetHeader}>
              <Text style={s.modalSheetTitulo}>Selecionar Cartão</Text>
              <TouchableOpacity onPress={() => setModalCartao(false)}>
                <X size={22} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={s.cartaoOpcao}
              onPress={() => { setCartaoId(null); setModalCartao(false); }}>
              <Text style={{ fontSize: FontSize.md, color: Colors.textSecondary }}>
                Sem cartão
              </Text>
            </TouchableOpacity>
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
  headerTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  headerAcoes: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  saveBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  form: { padding: Spacing.md, paddingBottom: 40 },
  tipoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap',
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    borderRadius: BorderRadius.md, marginBottom: Spacing.md,
  },
  tipoBadgeText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  parceladoBadge: {
    backgroundColor: '#EDE7F6', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  parceladoBadgeText: { fontSize: 11, color: '#6A1B9A', fontWeight: FontWeight.bold },
  fixoBadge: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: BorderRadius.full,
  },
  fixoBadgeText: { fontSize: 11, color: Colors.primaryDark, fontWeight: FontWeight.bold },
  valorDestaque: { alignItems: 'center', paddingVertical: Spacing.lg, marginBottom: Spacing.md },
  valorDestaqueNum: { fontSize: FontSize.display, fontWeight: FontWeight.extraBold },
  valorData: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 6 },
  detalheCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.md,
  },
  detalheRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md,
  },
  detalheDivider: { height: 1, backgroundColor: Colors.border },
  detalheLabel: { fontSize: FontSize.sm, color: Colors.textMuted },
  detalheValor: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, textAlign: 'right', flex: 1, marginLeft: 16 },
  detalheCatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  adiantarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.lg,
    paddingVertical: 16, marginBottom: 10,
    borderWidth: 1.5, borderColor: Colors.primary,
  },
  adiantarBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.primaryDark },
  editarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 16, marginBottom: 10, ...Shadow.sm,
  },
  editarBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  deletarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.despesaLight, borderRadius: BorderRadius.lg, paddingVertical: 16,
  },
  deletarBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.despesa },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.md,
    color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  inputGrande: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  catItem: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: BorderRadius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  catLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  cartaoSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  cartaoSelectorText: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  // Modal parcelas
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  modalTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalInfoBanner: {
    backgroundColor: Colors.primaryLight, padding: Spacing.md,
  },
  modalInfoText: { fontSize: FontSize.sm, color: Colors.primaryDark, lineHeight: 18 },
  selecionarRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  selecionarBtn: { paddingVertical: 4 },
  selecionarBtnText: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: FontWeight.semiBold },
  parcelaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  parcelaItemSel: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  parcelaCheck: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  parcelaCheckSel: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  parcelaNome: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  parcelaData: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  parcelaValor: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  totalAdiantar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: 8,
  },
  totalAdiantarLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  totalAdiantarSub: { fontSize: FontSize.xs, color: Colors.textPrimary, opacity: 0.7 },
  totalAdiantarValor: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  // Modal cartão
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
