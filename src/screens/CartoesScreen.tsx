// src/screens/CartoesScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus, X, Check, CreditCard, Edit2, Trash2,
  AlertTriangle, TrendingUp, ChevronDown, ChevronUp,
  Zap, Bell,
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useCartoes } from '../hooks/useCartoes';
import { cartoesService, CORES_CARTAO } from '../services/cartoes.service';
import { CartaoResumo, Cartao, Transacao } from '../types';
import { formatarMoeda, formatarData } from '../utils';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { APP_CONFIG, MESES_CURTOS } from '../constants';
import { supabase } from '../supabase/client';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function calcularDiasParaVencimento(diaVencimento: number): number {
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mesHoje = hoje.getMonth();
  const anoHoje = hoje.getFullYear();

  let diasRestantes = diaVencimento - diaHoje;
  if (diasRestantes < 0) {
    // Vence no próximo mês
    const ultimoDiaMes = new Date(anoHoje, mesHoje + 1, 0).getDate();
    diasRestantes = (ultimoDiaMes - diaHoje) + diaVencimento;
  }
  return diasRestantes;
}

function getAlertaLimite(percentual: number): { cor: string; texto: string } | null {
  if (percentual >= 100) return { cor: Colors.despesa, texto: '🚨 Limite esgotado!' };
  if (percentual >= 90) return { cor: Colors.despesa, texto: '⚠️ Limite quase no fim (90%+)' };
  if (percentual >= 80) return { cor: '#F39C12', texto: '⚡ Atenção: 80% do limite usado' };
  return null;
}

// ─────────────────────────────────────────────
// TELA PRINCIPAL
// ─────────────────────────────────────────────
export default function CartoesScreen() {
  const { grupoId } = useApp();
  const { cartoes, carregando, recarregar, obterResumos } = useCartoes(grupoId);
  const resumos = obterResumos();

  // Modal cadastro
  const [modalVisivel, setModalVisivel] = useState(false);
  const [editando, setEditando] = useState<Cartao | null>(null);
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [corSelecionada, setCorSelecionada] = useState(CORES_CARTAO[0]);
  const [salvando, setSalvando] = useState(false);

  // Modal detalhe do cartão
  const [cartaoDetalhe, setCartaoDetalhe] = useState<CartaoResumo | null>(null);
  const [modalDetalhe, setModalDetalhe] = useState(false);
  const [transacoesCartao, setTransacoesCartao] = useState<Transacao[]>([]);
  const [historicoMensal, setHistoricoMensal] = useState<{ mes: string; total: number }[]>([]);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  // Modal divisão entre cartões
  const [modalDivisao, setModalDivisao] = useState(false);
  const [tituloDivisao, setTituloDivisao] = useState('');
  const [valorDivisao, setValorDivisao] = useState('');
  const [divisoes, setDivisoes] = useState<{ cartaoId: string; valor: string }[]>([]);
  const [salvandoDivisao, setSalvandoDivisao] = useState(false);

  function abrirModal(cartao?: Cartao) {
    if (cartao) {
      setEditando(cartao);
      setNome(cartao.nome);
      setLimite(String(cartao.limite));
      setVencimento(String(cartao.vencimento));
      setCorSelecionada(cartao.cor);
    } else {
      setEditando(null);
      setNome(''); setLimite(''); setVencimento('');
      setCorSelecionada(CORES_CARTAO[0]);
    }
    setModalVisivel(true);
  }

  async function salvar() {
    if (!nome.trim()) return Alert.alert('Atenção', 'Informe o nome do cartão.');
    const limiteNum = parseFloat(limite.replace(',', '.'));
    if (!limiteNum || limiteNum <= 0) return Alert.alert('Atenção', 'Informe o limite.');
    const vencNum = parseInt(vencimento);
    if (!vencNum || vencNum < 1 || vencNum > 31)
      return Alert.alert('Atenção', 'Dia de vencimento deve ser entre 1 e 31.');

    setSalvando(true);
    try {
      if (editando) {
        await cartoesService.atualizar(editando.id, {
          nome: nome.trim(), limite: limiteNum, vencimento: vencNum, cor: corSelecionada,
        });
      } else {
        await cartoesService.inserir({
          grupo_id: grupoId,
          criado_por: APP_CONFIG.DEFAULT_USER_ID,
          nome: nome.trim(), limite: limiteNum,
          vencimento: vencNum, cor: corSelecionada, ativo: true,
        });
      }
      await recarregar();
      setModalVisivel(false);
      setEditando(null);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally { setSalvando(false); }
  }

  async function excluir(cartao: Cartao) {
    Alert.alert('Excluir Cartão', `Deseja excluir "${cartao.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await cartoesService.desativar(cartao.id);
            recarregar();
          } catch (e: any) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  }

  // ── Abre detalhe do cartão ──────────────────
  async function abrirDetalhe(resumo: CartaoResumo) {
    setCartaoDetalhe(resumo);
    setModalDetalhe(true);
    setCarregandoDetalhe(true);
    try {
      // Busca transações recentes do cartão
      const hoje = new Date();
      const { data: trans } = await supabase
        .from('transacoes')
        .select('*')
        .eq('cartao_id', resumo.id)
        .eq('tipo', 'despesa')
        .order('data', { ascending: false })
        .limit(20);
      setTransacoesCartao((trans as Transacao[]) ?? []);

      // Histórico mensal dos últimos 6 meses
      const historico: { mes: string; total: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const ano = d.getFullYear();
        const mes = d.getMonth() + 1;
        const inicio = `${ano}-${String(mes).padStart(2, '0')}-01`;
        const fim = `${ano}-${String(mes).padStart(2, '0')}-${new Date(ano, mes, 0).getDate()}`;
        const { data: h } = await supabase
          .from('transacoes')
          .select('valor')
          .eq('cartao_id', resumo.id)
          .eq('tipo', 'despesa')
          .gte('data', inicio)
          .lte('data', fim);
        const total = ((h as any[]) ?? []).reduce((acc: number, t: any) => acc + t.valor, 0);
        historico.push({ mes: MESES_CURTOS[mes - 1], total });
      }
      setHistoricoMensal(historico);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  // ── Inicializa divisão entre cartões ───────
  function abrirDivisao() {
    setTituloDivisao('');
    setValorDivisao('');
    setDivisoes(cartoes.slice(0, 2).map(c => ({ cartaoId: c.id, valor: '' })));
    setModalDivisao(true);
  }

  function adicionarCartaoDivisao() {
    if (divisoes.length >= cartoes.length) return;
    const usados = divisoes.map(d => d.cartaoId);
    const proximo = cartoes.find(c => !usados.includes(c.id));
    if (proximo) setDivisoes(prev => [...prev, { cartaoId: proximo.id, valor: '' }]);
  }

  function removerCartaoDivisao(idx: number) {
    setDivisoes(prev => prev.filter((_, i) => i !== idx));
  }

  function atualizarDivisao(idx: number, campo: 'cartaoId' | 'valor', val: string) {
    setDivisoes(prev => prev.map((d, i) => i === idx ? { ...d, [campo]: val } : d));
  }

  async function salvarDivisao() {
    if (!tituloDivisao.trim()) return Alert.alert('Atenção', 'Informe o título.');
    const valorTotal = parseFloat(valorDivisao.replace(',', '.'));
    if (!valorTotal || valorTotal <= 0) return Alert.alert('Atenção', 'Informe o valor total.');

    const totalDividido = divisoes.reduce((acc, d) => acc + (parseFloat(d.valor.replace(',', '.')) || 0), 0);
    const diff = Math.abs(totalDividido - valorTotal);
    if (diff > 0.01) {
      return Alert.alert('Atenção', `A soma das divisões (${formatarMoeda(totalDividido)}) não bate com o total (${formatarMoeda(valorTotal)}).`);
    }

    // Verifica limites
    const semLimite: string[] = [];
    for (const d of divisoes) {
      const resumo = resumos.find(r => r.id === d.cartaoId);
      const val = parseFloat(d.valor.replace(',', '.')) || 0;
      if (resumo && val > resumo.disponivel) {
        semLimite.push(`${resumo.nome} (disponível: ${formatarMoeda(resumo.disponivel)})`);
      }
    }

    const salvar = async () => {
      setSalvandoDivisao(true);
      try {
        const hoje = new Date();
        const dataStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
        const inserts = divisoes.map(d => ({
          grupo_id: grupoId,
          criado_por: APP_CONFIG.DEFAULT_USER_ID,
          titulo: tituloDivisao.trim(),
          valor: parseFloat(d.valor.replace(',', '.')) || 0,
          categoria: 'outros',
          tipo: 'despesa' as const,
          data: dataStr,
          fixo: false,
          parcelado: false,
          cartao_id: d.cartaoId,
        }));
        const { error } = await supabase.from('transacoes').insert(inserts);
        if (error) throw new Error(error.message);
        setModalDivisao(false);
        await recarregar();
        Alert.alert('✅ Sucesso', `Despesa dividida entre ${divisoes.length} cartões!`);
      } catch (e: any) {
        Alert.alert('Erro', e.message);
      } finally {
        setSalvandoDivisao(false);
      }
    };

    if (semLimite.length > 0) {
      Alert.alert(
        '⚠️ Limite insuficiente',
        `Os seguintes cartões não têm limite suficiente:\n\n${semLimite.join('\n')}\n\nDeseja salvar mesmo assim?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salvar mesmo assim', onPress: salvar },
        ]
      );
    } else {
      await salvar();
    }
  }

  // ── Resumo geral ────────────────────────────
  const totalGastoGeral = resumos.reduce((acc, r) => acc + r.totalGasto, 0);
  const totalLimiteGeral = resumos.reduce((acc, r) => acc + r.limite, 0);
  const totalDisponivelGeral = resumos.reduce((acc, r) => acc + r.disponivel, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={resumos}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <View>
            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.titulo}>Cartões</Text>
                <Text style={s.subtitulo}>Gerencie seus limites</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {cartoes.length >= 2 && (
                  <TouchableOpacity style={[s.addBtn, { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border }]} onPress={abrirDivisao}>
                    <Zap size={20} color={Colors.primaryDark} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={s.addBtn} onPress={() => abrirModal()}>
                  <Plus size={22} color={Colors.textPrimary} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Card resumo geral */}
            {resumos.length > 0 && (
              <View style={s.resumoGeralCard}>
                <View style={s.resumoGeralRow}>
                  <View>
                    <Text style={s.resumoGeralLabel}>Total gasto</Text>
                    <Text style={[s.resumoGeralValor, { color: Colors.despesa }]}>{formatarMoeda(totalGastoGeral)}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={s.resumoGeralLabel}>Limite total</Text>
                    <Text style={s.resumoGeralValor}>{formatarMoeda(totalLimiteGeral)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.resumoGeralLabel}>Disponível</Text>
                    <Text style={[s.resumoGeralValor, { color: Colors.renda }]}>{formatarMoeda(totalDisponivelGeral)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Alertas de limite */}
            {resumos.filter(r => r.percentualUso >= 80).map(r => {
              const alerta = getAlertaLimite(r.percentualUso);
              if (!alerta) return null;
              return (
                <View key={r.id} style={[s.alertaCard, { borderLeftColor: alerta.cor }]}>
                  <Bell size={14} color={alerta.cor} />
                  <Text style={[s.alertaText, { color: alerta.cor }]}>
                    {r.nome}: {alerta.texto}
                  </Text>
                </View>
              );
            })}

            {/* Dica divisão */}
            {cartoes.length >= 2 && (
              <TouchableOpacity style={s.dicaDivisao} onPress={abrirDivisao}>
                <Zap size={14} color={Colors.primaryDark} />
                <Text style={s.dicaDivisaoText}>Dividir despesa entre múltiplos cartões</Text>
                <ChevronDown size={14} color={Colors.primaryDark} />
              </TouchableOpacity>
            )}
          </View>
        )}
        ListEmptyComponent={() => (
          !carregando ? (
            <View style={s.vazio}>
              <Text style={s.vazioEmoji}>💳</Text>
              <Text style={s.vazioTitulo}>Nenhum cartão cadastrado</Text>
              <Text style={s.vazioSub}>Toque no + para adicionar seu primeiro cartão</Text>
            </View>
          ) : (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          )
        )}
        renderItem={({ item }) => (
          <CartaoCard
            resumo={item}
            onEdit={() => abrirModal(item)}
            onDelete={() => excluir(item)}
            onPress={() => abrirDetalhe(item)}
          />
        )}
      />

      {/* ── MODAL CADASTRO ─────────────────── */}
      <Modal visible={modalVisivel} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisivel(false); setEditando(null); }} style={s.closeBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.modalTitulo}>{editando ? 'Editar Cartão' : 'Novo Cartão'}</Text>
            <TouchableOpacity onPress={salvar} style={s.saveBtn} disabled={salvando}>
              {salvando
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Check size={22} color={Colors.textPrimary} />}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalForm} keyboardShouldPersistTaps="handled">
            <View style={[s.cartaoPreview, { backgroundColor: corSelecionada }]}>
              <CreditCard size={28} color="#FFF" />
              <Text style={s.cartaoPreviewNome}>{nome || 'Meu Cartão'}</Text>
              <View style={s.cartaoPreviewBottom}>
                <Text style={s.cartaoPreviewLimite}>
                  Limite: {limite ? formatarMoeda(parseFloat(limite.replace(',', '.')) || 0) : 'R$ 0,00'}
                </Text>
                <Text style={s.cartaoPreviewVenc}>Vence dia {vencimento || '--'}</Text>
              </View>
            </View>

            <Text style={s.label}>Nome do Cartão</Text>
            <TextInput
              style={s.input} value={nome} onChangeText={setNome}
              placeholder="Ex: Nubank, Itaú, Inter..."
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Limite Total (R$)</Text>
            <TextInput
              style={[s.input, s.inputGrande]} value={limite} onChangeText={setLimite}
              keyboardType="decimal-pad" placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Dia do Vencimento</Text>
            <TextInput
              style={s.input} value={vencimento} onChangeText={setVencimento}
              keyboardType="number-pad" placeholder="Ex: 10"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Cor do Cartão</Text>
            <View style={s.coresGrid}>
              {CORES_CARTAO.map(cor => (
                <TouchableOpacity
                  key={cor}
                  style={[s.corBtn, { backgroundColor: cor },
                    corSelecionada === cor && s.corBtnSelecionada]}
                  onPress={() => setCorSelecionada(cor)}
                />
              ))}
            </View>

            <TouchableOpacity style={s.submitBtn} onPress={salvar} disabled={salvando}>
              <Text style={s.submitText}>
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Adicionar Cartão'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── MODAL DETALHE CARTÃO ───────────── */}
      <Modal visible={modalDetalhe} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalDetalhe(false)}>
        <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalDetalhe(false)} style={s.closeBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.modalTitulo}>{cartaoDetalhe?.nome}</Text>
            <View style={{ width: 40 }} />
          </View>

          {carregandoDetalhe ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
              {cartaoDetalhe && (
                <>
                  {/* Card visual */}
                  <View style={[s.cartaoPreview, { backgroundColor: cartaoDetalhe.cor, marginBottom: Spacing.md }]}>
                    <CreditCard size={28} color="#FFF" />
                    <Text style={s.cartaoPreviewNome}>{cartaoDetalhe.nome}</Text>
                    <View style={s.cartaoPreviewBottom}>
                      <Text style={s.cartaoPreviewLimite}>Limite: {formatarMoeda(cartaoDetalhe.limite)}</Text>
                      <Text style={s.cartaoPreviewVenc}>Vence dia {cartaoDetalhe.vencimento}</Text>
                    </View>
                  </View>

                  {/* Vencimento */}
                  <VencimentoBanner dias={calcularDiasParaVencimento(cartaoDetalhe.vencimento)} cor={cartaoDetalhe.cor} />

                  {/* Alerta de limite */}
                  {getAlertaLimite(cartaoDetalhe.percentualUso) && (
                    <View style={[s.alertaCard, { borderLeftColor: getAlertaLimite(cartaoDetalhe.percentualUso)!.cor, marginBottom: 12 }]}>
                      <AlertTriangle size={14} color={getAlertaLimite(cartaoDetalhe.percentualUso)!.cor} />
                      <Text style={[s.alertaText, { color: getAlertaLimite(cartaoDetalhe.percentualUso)!.cor }]}>
                        {getAlertaLimite(cartaoDetalhe.percentualUso)!.texto}
                      </Text>
                    </View>
                  )}

                  {/* Resumo */}
                  <View style={s.detalheResumoRow}>
                    <View style={s.detalheResumoItem}>
                      <Text style={s.detalheResumoLabel}>Gasto</Text>
                      <Text style={[s.detalheResumoValor, { color: Colors.despesa }]}>{formatarMoeda(cartaoDetalhe.totalGasto)}</Text>
                    </View>
                    <View style={s.detalheResumoItem}>
                      <Text style={s.detalheResumoLabel}>Uso</Text>
                      <Text style={[s.detalheResumoValor, { color: cartaoDetalhe.percentualUso >= 80 ? Colors.despesa : Colors.renda }]}>
                        {Math.round(cartaoDetalhe.percentualUso)}%
                      </Text>
                    </View>
                    <View style={s.detalheResumoItem}>
                      <Text style={s.detalheResumoLabel}>Disponível</Text>
                      <Text style={[s.detalheResumoValor, { color: cartaoDetalhe.disponivel > 0 ? Colors.renda : Colors.despesa }]}>
                        {formatarMoeda(cartaoDetalhe.disponivel)}
                      </Text>
                    </View>
                  </View>

                  {/* Barra de uso */}
                  <View style={s.barraDetalheFundo}>
                    <View style={[s.barraDetalhe, {
                      width: `${Math.min(cartaoDetalhe.percentualUso, 100)}%` as any,
                      backgroundColor: cartaoDetalhe.percentualUso >= 90 ? Colors.despesa : cartaoDetalhe.cor,
                    }]} />
                  </View>

                  {/* Gráfico histórico mensal */}
                  {historicoMensal.length > 0 && (
                    <View style={s.graficoCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                        <TrendingUp size={16} color={cartaoDetalhe.cor} />
                        <Text style={s.graficoTitulo}>Gastos dos últimos 6 meses</Text>
                      </View>
                      <GraficoBarras dados={historicoMensal} cor={cartaoDetalhe.cor} />
                    </View>
                  )}

                  {/* Transações recentes */}
                  {transacoesCartao.length > 0 && (
                    <View style={s.transacoesCard}>
                      <Text style={s.graficoTitulo}>Transações recentes</Text>
                      {transacoesCartao.map(t => (
                        <View key={t.id} style={s.transacaoRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.transacaoTitulo} numberOfLines={1}>{t.titulo}</Text>
                            <Text style={s.transacaoData}>{formatarData(t.data)}</Text>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={[s.transacaoValor, { color: t.pago ? Colors.textMuted : Colors.despesa }]}>
                              -{formatarMoeda(t.valor)}
                            </Text>
                            {t.pago && <Text style={s.transacaoPago}>✓ Pago</Text>}
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* ── MODAL DIVISÃO ENTRE CARTÕES ────── */}
      <Modal visible={modalDivisao} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setModalDivisao(false)}>
        <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalDivisao(false)} style={s.closeBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.modalTitulo}>Dividir Despesa</Text>
            <TouchableOpacity onPress={salvarDivisao} style={s.saveBtn} disabled={salvandoDivisao}>
              {salvandoDivisao
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Check size={22} color={Colors.textPrimary} />}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalForm} keyboardShouldPersistTaps="handled">
            <View style={s.divisaoInfo}>
              <Zap size={16} color={Colors.primaryDark} />
              <Text style={s.divisaoInfoText}>
                Divida uma despesa entre múltiplos cartões. O valor é debitado do limite de cada um.
              </Text>
            </View>

            <Text style={s.label}>Título da Despesa</Text>
            <TextInput
              style={s.input} value={tituloDivisao} onChangeText={setTituloDivisao}
              placeholder="Ex: Compra na loja, Viagem..."
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Valor Total (R$)</Text>
            <TextInput
              style={[s.input, s.inputGrande]} value={valorDivisao} onChangeText={setValorDivisao}
              keyboardType="decimal-pad" placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Divisão por cartão</Text>
            {divisoes.map((d, idx) => {
              const cartao = cartoes.find(c => c.id === d.cartaoId);
              const resumo = resumos.find(r => r.id === d.cartaoId);
              const val = parseFloat(d.valor.replace(',', '.')) || 0;
              const semLimite = resumo && val > resumo.disponivel;
              return (
                <View key={idx} style={[s.divisaoItem, semLimite && { borderColor: Colors.despesa }]}>
                  {/* Seletor de cartão */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                    {cartoes.map(c => (
                      <TouchableOpacity
                        key={c.id}
                        style={[s.divisaoCartaoChip, { borderColor: c.cor },
                          d.cartaoId === c.id && { backgroundColor: `${c.cor}20` }]}
                        onPress={() => atualizarDivisao(idx, 'cartaoId', c.id)}>
                        <View style={[s.divisaoCartaoDot, { backgroundColor: c.cor }]} />
                        <Text style={[s.divisaoCartaoNome, { color: d.cartaoId === c.id ? c.cor : Colors.textSecondary }]}>
                          {c.nome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      style={[s.input, { flex: 1, marginBottom: 0 }, semLimite && { borderColor: Colors.despesa }]}
                      value={d.valor}
                      onChangeText={v => atualizarDivisao(idx, 'valor', v)}
                      keyboardType="decimal-pad"
                      placeholder="Valor deste cartão"
                      placeholderTextColor={Colors.textMuted}
                    />
                    {divisoes.length > 2 && (
                      <TouchableOpacity onPress={() => removerCartaoDivisao(idx)} style={s.removerDivisaoBtn}>
                        <X size={16} color={Colors.despesa} />
                      </TouchableOpacity>
                    )}
                  </View>

                  {resumo && (
                    <Text style={[s.divisaoDisponivel, semLimite && { color: Colors.despesa }]}>
                      {semLimite ? '⚠️ ' : '✓ '}Disponível: {formatarMoeda(resumo.disponivel)}
                    </Text>
                  )}
                </View>
              );
            })}

            {divisoes.length < cartoes.length && (
              <TouchableOpacity style={s.adicionarCartaoBtn} onPress={adicionarCartaoDivisao}>
                <Plus size={16} color={Colors.primaryDark} />
                <Text style={s.adicionarCartaoBtnText}>Adicionar outro cartão</Text>
              </TouchableOpacity>
            )}

            {/* Resumo da divisão */}
            {valorDivisao !== '' && (
              <View style={s.divisaoResumo}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.divisaoResumoLabel}>Total dividido:</Text>
                  <Text style={s.divisaoResumoValor}>
                    {formatarMoeda(divisoes.reduce((acc, d) => acc + (parseFloat(d.valor.replace(',', '.')) || 0), 0))}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={s.divisaoResumoLabel}>Total da despesa:</Text>
                  <Text style={s.divisaoResumoValor}>
                    {formatarMoeda(parseFloat(valorDivisao.replace(',', '.')) || 0)}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={s.submitBtn} onPress={salvarDivisao} disabled={salvandoDivisao}>
              <Text style={s.submitText}>
                {salvandoDivisao ? 'Salvando...' : 'Salvar Divisão'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE: CARD DO CARTÃO
// ─────────────────────────────────────────────
function CartaoCard({ resumo, onEdit, onDelete, onPress }: {
  resumo: CartaoResumo;
  onEdit: () => void;
  onDelete: () => void;
  onPress: () => void;
}) {
  const corStatus = resumo.percentualUso >= 90 ? Colors.despesa
    : resumo.percentualUso >= 70 ? '#F39C12'
    : Colors.renda;

  const alerta = getAlertaLimite(resumo.percentualUso);
  const dias = calcularDiasParaVencimento(resumo.vencimento);
  const venceEmBreve = dias <= 5;

  return (
    <TouchableOpacity
      style={[cs.card, { borderLeftColor: resumo.cor, borderLeftWidth: 4 }]}
      onPress={onPress}
      activeOpacity={0.85}>

      <View style={cs.cardHeader}>
        <View style={[cs.cardIcon, { backgroundColor: `${resumo.cor}20` }]}>
          <CreditCard size={20} color={resumo.cor} />
        </View>
        <View style={cs.cardInfo}>
          <Text style={cs.cardNome}>{resumo.nome}</Text>
          <Text style={[cs.cardVenc, venceEmBreve && { color: Colors.despesa, fontWeight: FontWeight.bold }]}>
            {venceEmBreve ? `⏰ Vence em ${dias} dia(s)!` : `Vence dia ${resumo.vencimento}`}
          </Text>
        </View>
        <View style={cs.cardAcoes}>
          <TouchableOpacity onPress={onEdit} style={cs.acaoBtn}>
            <Edit2 size={15} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={cs.acaoBtn}>
            <Trash2 size={15} color={Colors.despesa} />
          </TouchableOpacity>
        </View>
      </View>

      {alerta && (
        <View style={[cs.alertaBanner, { backgroundColor: `${alerta.cor}15` }]}>
          <AlertTriangle size={12} color={alerta.cor} />
          <Text style={[cs.alertaBannerText, { color: alerta.cor }]}>{alerta.texto}</Text>
        </View>
      )}

      <View style={cs.valoresRow}>
        <View>
          <Text style={cs.valorLabel}>Gasto</Text>
          <Text style={[cs.valorNum, { color: Colors.despesa }]}>{formatarMoeda(resumo.totalGasto)}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={cs.valorLabel}>Uso</Text>
          <Text style={[cs.valorNum, { color: corStatus }]}>{Math.round(resumo.percentualUso)}%</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={cs.valorLabel}>Disponível</Text>
          <Text style={[cs.valorNum, { color: resumo.disponivel > 0 ? Colors.renda : Colors.despesa }]}>
            {formatarMoeda(resumo.disponivel)}
          </Text>
        </View>
      </View>

      <View style={cs.barraContainer}>
        <View style={[cs.barra, {
          width: `${Math.min(resumo.percentualUso, 100)}%` as any,
          backgroundColor: corStatus,
        }]} />
      </View>
      <Text style={cs.limiteText}>Limite total: {formatarMoeda(resumo.limite)} · Toque para detalhes</Text>
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE: BANNER DE VENCIMENTO
// ─────────────────────────────────────────────
function VencimentoBanner({ dias, cor }: { dias: number; cor: string }) {
  const urgente = dias <= 3;
  const atencao = dias <= 7;
  const bgColor = urgente ? `${Colors.despesa}15` : atencao ? '#FFF8E1' : `${Colors.renda}10`;
  const textColor = urgente ? Colors.despesa : atencao ? '#F39C12' : Colors.renda;
  const emoji = urgente ? '🚨' : atencao ? '⏰' : '📅';

  return (
    <View style={[s.vencimentoBanner, { backgroundColor: bgColor, borderLeftColor: textColor }]}>
      <Text style={[s.vencimentoTexto, { color: textColor }]}>
        {emoji} Fatura vence em {dias === 0 ? 'hoje!' : `${dias} dia(s)`}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE: GRÁFICO DE BARRAS
// ─────────────────────────────────────────────
function GraficoBarras({ dados, cor }: { dados: { mes: string; total: number }[]; cor: string }) {
  const maxValor = Math.max(...dados.map(d => d.total), 1);
  const alturaMaxima = 80;

  return (
    <View style={g.container}>
      {dados.map((d, i) => {
        const altura = (d.total / maxValor) * alturaMaxima;
        const isUltimo = i === dados.length - 1;
        return (
          <View key={i} style={g.coluna}>
            <Text style={g.valorLabel}>
              {d.total > 0 ? `R$${(d.total / 1000).toFixed(1)}k` : ''}
            </Text>
            <View style={g.barraFundo}>
              <View style={[g.barra, {
                height: Math.max(altura, 4),
                backgroundColor: isUltimo ? cor : `${cor}60`,
              }]} />
            </View>
            <Text style={[g.mesLabel, isUltimo && { color: cor, fontWeight: FontWeight.bold }]}>
              {d.mes}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  titulo: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  subtitulo: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.sm,
  },
  resumoGeralCard: {
    backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md, padding: Spacing.md, marginBottom: 10, ...Shadow.md,
  },
  resumoGeralRow: { flexDirection: 'row', justifyContent: 'space-between' },
  resumoGeralLabel: { fontSize: FontSize.xs, color: '#AAA', marginBottom: 4 },
  resumoGeralValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: '#FFF' },
  alertaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderLeftWidth: 3, backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md, padding: 10,
    borderRadius: BorderRadius.sm, marginBottom: 6,
  },
  alertaText: { flex: 1, fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  dicaDivisao: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md, padding: 10, marginBottom: 8,
  },
  dicaDivisaoText: { flex: 1, fontSize: FontSize.xs, color: Colors.primaryDark, fontWeight: FontWeight.semiBold },
  vazio: { alignItems: 'center', paddingTop: 60 },
  vazioEmoji: { fontSize: 48, marginBottom: 12 },
  vazioTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 6 },
  vazioSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  modalTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalForm: { padding: Spacing.md, paddingBottom: 40 },
  cartaoPreview: {
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
    minHeight: 150, justifyContent: 'space-between', ...Shadow.md,
  },
  cartaoPreviewNome: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#FFF', marginTop: 8 },
  cartaoPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cartaoPreviewLimite: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', fontWeight: FontWeight.semiBold },
  cartaoPreviewVenc: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.md,
    color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  inputGrande: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  coresGrid: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  corBtn: { width: 44, height: 44, borderRadius: 22 },
  corBtnSelecionada: { borderWidth: 3, borderColor: Colors.textPrimary },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 18, alignItems: 'center', ...Shadow.md,
  },
  submitText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  // Detalhe
  detalheResumoRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 10, borderWidth: 1, borderColor: Colors.border,
  },
  detalheResumoItem: { alignItems: 'center' },
  detalheResumoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 4 },
  detalheResumoValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  barraDetalheFundo: {
    height: 10, backgroundColor: Colors.border,
    borderRadius: 5, overflow: 'hidden', marginBottom: Spacing.md,
  },
  barraDetalhe: { height: 10, borderRadius: 5 },
  graficoCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 12, borderWidth: 1, borderColor: Colors.border,
  },
  graficoTitulo: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 12 },
  transacoesCard: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  transacaoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  transacaoTitulo: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  transacaoData: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  transacaoValor: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  transacaoPago: { fontSize: 10, color: Colors.renda, fontWeight: FontWeight.semiBold },
  vencimentoBanner: {
    borderLeftWidth: 3, borderRadius: BorderRadius.sm,
    padding: 10, marginBottom: 12,
  },
  vencimentoTexto: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold },
  // Divisão
  divisaoInfo: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    padding: 10, marginBottom: Spacing.md,
  },
  divisaoInfoText: { flex: 1, fontSize: FontSize.xs, color: Colors.primaryDark, lineHeight: 18 },
  divisaoItem: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 12,
  },
  divisaoCartaoChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8,
  },
  divisaoCartaoDot: { width: 8, height: 8, borderRadius: 4 },
  divisaoCartaoNome: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold },
  divisaoDisponivel: { fontSize: FontSize.xs, color: Colors.renda, marginTop: 6, fontWeight: FontWeight.medium },
  removerDivisaoBtn: {
    width: 40, height: 48, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.despesa, borderRadius: BorderRadius.md,
  },
  adicionarCartaoBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primaryDark, borderRadius: BorderRadius.md,
    paddingVertical: 12, marginBottom: 16,
  },
  adicionarCartaoBtnText: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: FontWeight.semiBold },
  divisaoResumo: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginBottom: 16, gap: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  divisaoResumoLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  divisaoResumoValor: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});

const cs = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg, borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md, marginBottom: 12, padding: Spacing.md, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  cardIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  cardInfo: { flex: 1 },
  cardNome: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  cardVenc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  cardAcoes: { flexDirection: 'row', gap: 4 },
  acaoBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  alertaBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: BorderRadius.sm, padding: 6, marginBottom: 8,
  },
  alertaBannerText: { fontSize: 10, fontWeight: FontWeight.semiBold },
  valoresRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  valorLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  valorNum: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  barraContainer: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  barra: { height: 8, borderRadius: 4 },
  limiteText: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
});

const g = StyleSheet.create({
  container: {
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120,
  },
  coluna: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  barraFundo: { width: '70%', height: 80, justifyContent: 'flex-end' },
  barra: { width: '100%', borderRadius: 4 },
  valorLabel: { fontSize: 9, color: Colors.textMuted, marginBottom: 4, textAlign: 'center' },
  mesLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 4 },
});
