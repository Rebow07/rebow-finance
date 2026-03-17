// src/screens/DashboardScreen.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Plus, TrendingUp, CreditCard,
  TrendingDown, AlertCircle, ChevronDown,
} from 'lucide-react-native';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useApp } from '../context/AppContext';
import { useTransacoes, calcularResumo } from '../hooks/useTransacoes';
import { useRendas } from '../hooks/useRendas';
import { useCartoes } from '../hooks/useCartoes';
import { useRelatorio } from '../hooks/useRelatorio';
import TransacaoItem from '../components/TransacaoItem';
import CircularProgress from '../components/CircularProgress';
import { formatarMoeda, formatarMesCompleto } from '../utils';
import { getCategoriaById } from '../constants';
import CategoriaIcon from '../components/CategoriaIcon';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { RootStackParamList } from '../navigation';
import { Transacao, FiltroTempo } from '../types';
import { supabase } from '../supabase/client';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FILTROS: { key: FiltroTempo; label: string }[] = [
  { key: 'mensal',      label: 'Mensal' },
  { key: 'trimestral',  label: 'Trimestral' },
  { key: 'semestral',   label: 'Semestral' },
  { key: 'anual',       label: 'Anual' },
];

function calcularPeriodo(filtro: FiltroTempo, mes: number, ano: number) {
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const fim = new Date(ano, mes, 0); // último dia do mês selecionado
  let inicio: Date;
  switch (filtro) {
    case 'trimestral': inicio = new Date(ano, mes - 1 - 2, 1); break;
    case 'semestral':  inicio = new Date(ano, mes - 1 - 5, 1); break;
    case 'anual':      inicio = new Date(ano, 0, 1); break;
    default:           inicio = new Date(ano, mes - 1, 1);
  }
  return { inicio: fmt(inicio), fim: fmt(fim) };
}

export default function DashboardScreen() {
  const nav = useNavigation<Nav>();
  const {
    grupo, grupoId,
    mesSelecionado, anoSelecionado,
    orcamentoMensal,
    filtroTempo, setFiltroTempo,
  } = useApp();

  const [modalFiltro, setModalFiltro] = useState(false);
  const [transacoesPeriodo, setTransacoesPeriodo] = useState<Transacao[]>([]);
  const [carregandoPeriodo, setCarregandoPeriodo] = useState(false);

  // Transações do mês atual
  const { transacoes, carregando, recarregar } = useTransacoes({
    grupoId, mes: mesSelecionado, ano: anoSelecionado,
  });

  // Mês anterior (comparativo)
  const mesAnt = mesSelecionado === 1 ? 12 : mesSelecionado - 1;
  const anoAnt = mesSelecionado === 1 ? anoSelecionado - 1 : anoSelecionado;
  const { transacoes: transacoesAnt } = useTransacoes({
    grupoId, mes: mesAnt, ano: anoAnt,
  });

  const { totalRendas, rendas } = useRendas(grupoId);
  const { obterResumosCom } = useCartoes(grupoId);
  const { relatorio } = useRelatorio(transacoes, 'despesa');

  const base = orcamentoMensal > 0 ? orcamentoMensal : totalRendas;
  const resumo    = calcularResumo(transacoes,    base);
  const resumoAnt = calcularResumo(transacoesAnt, base);

  const resumosCartao = obterResumosCom(transacoes, mesSelecionado, anoSelecionado)
    .filter(c => c.totalGasto > 0)
    .slice(0, 3);

  const top3 = relatorio.slice(0, 3);

  // Despesas fixas: compatível com campo `fixo` (boolean)
  const despesasFixas = transacoes.filter(
    t => t.tipo === 'despesa' && t.fixo === true
  );
  const totalFixas = despesasFixas.reduce((acc, t) => acc + t.valor, 0);

  const variacaoMes = resumoAnt.totalDespesas > 0
    ? ((resumo.totalDespesas - resumoAnt.totalDespesas) / resumoAnt.totalDespesas) * 100
    : 0;

  const saldoReal = totalRendas - resumo.totalDespesas;

  // Carrega período estendido quando filtro != mensal
  useEffect(() => {
    if (filtroTempo === 'mensal' || !grupoId) {
      setTransacoesPeriodo([]);
      return;
    }
    let ativo = true;
    setCarregandoPeriodo(true);
    const { inicio, fim } = calcularPeriodo(filtroTempo, mesSelecionado, anoSelecionado);
    supabase
      .from('transacoes')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq('tipo', 'despesa')
      .gte('data', inicio)
      .lte('data', fim)
      .then(({ data }) => {
        if (ativo) {
          setTransacoesPeriodo((data as Transacao[]) ?? []);
          setCarregandoPeriodo(false);
        }
      });
    return () => { ativo = false; };
  }, [filtroTempo, mesSelecionado, anoSelecionado, grupoId]);

  const totalPeriodo = (filtroTempo === 'mensal' ? transacoes : transacoesPeriodo)
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc + t.valor, 0);

  function irParaDetalhe(transacao: Transacao) {
    nav.navigate('DetalheTransacao', { transacao });
  }

  function irParaRendas() {
    nav.dispatch(CommonActions.navigate({ name: 'MainTabs', params: { screen: 'Rendas' } }));
  }

  // ── Header da FlatList ──────────────────────
  const Header = () => (
    <View>
      {/* Topo */}
      <View style={s.header}>
        <View>
          <Text style={s.grupoLabel}>Grupo</Text>
          <Text style={s.grupoNome}>{grupo?.nome ?? 'Rebow Finance'}</Text>
        </View>
        <TouchableOpacity
          style={s.addBtn}
          onPress={() => nav.navigate('NovaTransacao', {})}>
          <Plus size={22} color={Colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Período + filtro */}
      <View style={s.filtroRow}>
        <Text style={s.mesLabel}>
          {formatarMesCompleto(mesSelecionado, anoSelecionado)}
        </Text>
        <TouchableOpacity style={s.filtroBtn} onPress={() => setModalFiltro(true)}>
          <Text style={s.filtroBtnText}>
            {FILTROS.find(f => f.key === filtroTempo)?.label ?? 'Mensal'}
          </Text>
          <ChevronDown size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Card Resumo */}
      <View style={s.resumoCard}>
        <View style={s.resumoLeft}>
          <View style={s.resumoRow}>
            <Text style={s.resumoItemLabel}>
              Despesas
              {filtroTempo !== 'mensal'
                ? ` (${FILTROS.find(f => f.key === filtroTempo)?.label})`
                : ''}
            </Text>
            <Text style={[s.resumoItemValor, { color: Colors.despesa }]}>
              -{formatarMoeda(totalPeriodo)}
            </Text>
          </View>
          <View style={[s.resumoRow, { marginTop: 8 }]}>
            <Text style={s.resumoItemLabel}>Rendas</Text>
            <Text style={[s.resumoItemValor, { color: Colors.renda }]}>
              +{formatarMoeda(totalRendas)}
            </Text>
          </View>
          <View style={s.divider} />
          <View style={s.resumoRow}>
            <Text style={s.saldoLabel}>Saldo</Text>
            <Text style={[s.saldoValor, {
              color: saldoReal >= 0 ? Colors.renda : Colors.despesa,
            }]}>
              {formatarMoeda(saldoReal)}
            </Text>
          </View>
        </View>
        <CircularProgress percentual={resumo.percentualGasto} tamanho={110} />
      </View>

      {/* Atalhos */}
      <View style={s.atalhos}>
        <TouchableOpacity
          style={s.atalhoBtn}
          onPress={() => nav.navigate('NovaTransacao', {})}>
          <Plus size={18} color={Colors.textPrimary} />
          <Text style={s.atalhoText}>Despesa</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.atalhoBtn, { backgroundColor: Colors.primaryLight }]}
          onPress={irParaRendas}>
          <TrendingUp size={18} color={Colors.primaryDark} />
          <Text style={[s.atalhoText, { color: Colors.primaryDark }]}>
            Lançar Renda
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── ANÁLISES ── */}
      <Text style={s.secaoTitulo}>📊 Análises do mês</Text>

      {/* Comparativo com mês anterior */}
      {resumoAnt.totalDespesas > 0 && (
        <View style={s.comparativoCard}>
          <View style={s.comparativoLeft}>
            <Text style={s.comparativoLabel}>vs. mês anterior</Text>
            <Text style={s.comparativoSub}>
              Anterior: {formatarMoeda(resumoAnt.totalDespesas)}
            </Text>
          </View>
          <View style={[s.comparativoBadge, {
            backgroundColor: variacaoMes > 0 ? Colors.despesaLight : Colors.rendaLight,
          }]}>
            {variacaoMes > 0
              ? <TrendingUp size={14} color={Colors.despesa} />
              : <TrendingDown size={14} color={Colors.renda} />}
            <Text style={[s.comparativoNum, {
              color: variacaoMes > 0 ? Colors.despesa : Colors.renda,
            }]}>
              {variacaoMes > 0 ? '+' : ''}{variacaoMes.toFixed(1)}%
            </Text>
          </View>
        </View>
      )}

      {/* Top 3 categorias */}
      {top3.length > 0 && (
        <View style={s.analisCard}>
          <Text style={s.analiseTitulo}>🏆 Onde mais gastou</Text>
          {top3.map((item, idx) => {
            const cat = getCategoriaById(item.categoria);
            return (
              <View key={item.categoria} style={s.catAnaliseRow}>
                <Text style={s.catAnalisePos}>#{idx + 1}</Text>
                <View style={[s.catAnaliseIcon, { backgroundColor: `${cat.cor}18` }]}>
                  <CategoriaIcon iconName={cat.icon} cor={cat.cor} size={16} />
                </View>
                <View style={s.catAnaliseInfo}>
                  <View style={s.catAnaliseInfoRow}>
                    <Text style={s.catAnaliseNome}>{cat.label}</Text>
                    <Text style={[s.catAnaliseValor, { color: Colors.despesa }]}>
                      {formatarMoeda(item.total)}
                    </Text>
                  </View>
                  <View style={s.catAnaliseBarra}>
                    <View style={[s.catAnaliseBarraFill, {
                      width: `${item.percentual}%` as any,
                      backgroundColor: cat.cor,
                    }]} />
                  </View>
                  <Text style={s.catAnalisePerc}>
                    {item.percentual.toFixed(1)}% do total
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Progresso do orçamento */}
      {top3.length > 0 && base > 0 && (
        <View style={s.analisCard}>
          <Text style={s.analiseTitulo}>🎯 Progresso do orçamento</Text>
          {top3.map(item => {
            const cat = getCategoriaById(item.categoria);
            const percOrc = Math.min((item.total / base) * 100, 100);
            return (
              <View key={item.categoria} style={s.orcamentoRow}>
                <View style={[s.catAnaliseIcon, { backgroundColor: `${cat.cor}18` }]}>
                  <CategoriaIcon iconName={cat.icon} cor={cat.cor} size={14} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={s.catAnaliseInfoRow}>
                    <Text style={s.catAnaliseNome}>{cat.label}</Text>
                    <Text style={s.orcPercText}>{percOrc.toFixed(1)}% da renda</Text>
                  </View>
                  <View style={s.catAnaliseBarra}>
                    <View style={[s.catAnaliseBarraFill, {
                      width: `${percOrc}%` as any,
                      backgroundColor: percOrc > 30 ? Colors.despesa : cat.cor,
                    }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Gastos fixos */}
      {despesasFixas.length > 0 && (
        <View style={[s.analisCard, { borderLeftWidth: 3, borderLeftColor: Colors.primaryDark }]}>
          <View style={s.fixasHeader}>
            <AlertCircle size={16} color={Colors.primaryDark} />
            <Text style={s.analiseTitulo}>📌 Gastos fixos do mês</Text>
          </View>
          <Text style={s.fixasTotal}>{formatarMoeda(totalFixas)}</Text>
          <Text style={s.fixasSub}>{despesasFixas.length} compromisso(s) fixo(s)</Text>
          {despesasFixas.slice(0, 3).map(t => (
            <View key={t.id} style={s.fixaItem}>
              <Text style={s.fixaItemNome} numberOfLines={1}>{t.titulo}</Text>
              <Text style={s.fixaItemValor}>{formatarMoeda(t.valor)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Fontes de renda */}
      {rendas.length > 0 && (
        <View style={s.rendasResumoCard}>
          <View style={s.rendasResumoHeader}>
            <TrendingUp size={16} color={Colors.renda} />
            <Text style={s.rendasResumoTitulo}>Fontes de Renda</Text>
            <Text style={s.rendasTotal}>{formatarMoeda(totalRendas)}</Text>
          </View>
          <View style={s.rendasGrid}>
            {rendas.slice(0, 4).map(r => (
              <View key={r.id} style={s.rendaChip}>
                <Text style={s.rendaChipNome} numberOfLines={1}>{r.nome}</Text>
                <Text style={s.rendaChipValor}>{formatarMoeda(r.valor)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Cartões */}
      {resumosCartao.length > 0 && (
        <View style={s.cartoesResumoCard}>
          <View style={s.cartoesResumoHeader}>
            <CreditCard size={16} color={Colors.textSecondary} />
            <Text style={s.cartoesResumoTitulo}>Cartões — limite comprometido</Text>
          </View>
          {resumosCartao.map(c => (
            <View key={c.id} style={s.cartaoResumoItem}>
              <View style={[s.cartaoResumoCorDot, { backgroundColor: c.cor }]} />
              <Text style={s.cartaoResumoNome} numberOfLines={1}>{c.nome}</Text>
              <View style={s.cartaoResumoBarraWrap}>
                <View style={s.cartaoResumoBarraFundo}>
                  <View style={[s.cartaoResumoBarraFill, {
                    width: `${c.percentualUso}%` as any,
                    backgroundColor: c.percentualUso >= 90 ? Colors.despesa : c.cor,
                  }]} />
                </View>
              </View>
              <Text style={s.cartaoResumoValor}>{formatarMoeda(c.totalGasto)}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={s.secaoTitulo}>Últimas transações</Text>
    </View>
  );

  // ── Render ──────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {carregando && transacoes.length === 0 ? (
        <View style={s.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={resumo.transacoesRecentes}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <TransacaoItem transacao={item} onPress={irParaDetalhe} />
          )}
          ListHeaderComponent={Header}
          ListEmptyComponent={
            <Text style={s.vazio}>Nenhuma transação este mês.</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={carregando}
              onRefresh={recarregar}
              tintColor={Colors.primary}
            />
          }
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal filtro de tempo */}
      <Modal visible={modalFiltro} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <Text style={s.modalSheetTitulo}>Período de visualização</Text>
            {FILTROS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[
                  s.filtroOpcao,
                  filtroTempo === f.key && s.filtroOpcaoAtiva,
                ]}
                onPress={() => {
                  setFiltroTempo(f.key);
                  setModalFiltro(false);
                }}>
                <Text style={[
                  s.filtroOpcaoText,
                  filtroTempo === f.key && s.filtroOpcaoTextAtiva,
                ]}>
                  {f.label}
                </Text>
                {filtroTempo === f.key && (
                  <Text style={s.filtroOpcaoCheck}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  grupoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  grupoNome: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  addBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
    ...Shadow.sm,
  },
  filtroRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  mesLabel: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  filtroBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: Colors.border,
  },
  filtroBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  resumoCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.textPrimary, marginHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
    ...Shadow.md,
  },
  resumoLeft: { flex: 1 },
  resumoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  resumoItemLabel: { fontSize: FontSize.sm, color: '#AAA', fontWeight: FontWeight.medium },
  resumoItemValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
  saldoLabel: { fontSize: FontSize.md, color: '#CCC', fontWeight: FontWeight.semiBold },
  saldoValor: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold },
  atalhos: {
    flexDirection: 'row', paddingHorizontal: Spacing.md,
    gap: 10, marginBottom: Spacing.lg,
  },
  atalhoBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    paddingVertical: 14, borderWidth: 1, borderColor: Colors.border,
  },
  atalhoText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  secaoTitulo: {
    fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary,
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm, marginTop: 4,
  },
  comparativoCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  comparativoLeft: { flex: 1 },
  comparativoLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  comparativoSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  comparativoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.full,
  },
  comparativoNum: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  analisCard: {
    marginHorizontal: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  analiseTitulo: {
    fontSize: FontSize.sm, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: 12,
  },
  catAnaliseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  catAnalisePos: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textMuted, width: 20 },
  catAnaliseIcon: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
  },
  catAnaliseInfo: { flex: 1 },
  catAnaliseInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  catAnaliseNome: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  catAnaliseValor: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  catAnaliseBarra: {
    height: 5, backgroundColor: Colors.border,
    borderRadius: 3, overflow: 'hidden', marginBottom: 2,
  },
  catAnaliseBarraFill: { height: 5, borderRadius: 3 },
  catAnalisePerc: { fontSize: 10, color: Colors.textMuted },
  orcamentoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  orcPercText: { fontSize: 10, color: Colors.textMuted },
  fixasHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  fixasTotal: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, color: Colors.primaryDark, marginBottom: 2 },
  fixasSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 8 },
  fixaItem: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 4, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  fixaItemNome: { fontSize: FontSize.xs, color: Colors.textSecondary, flex: 1 },
  fixaItemValor: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  rendasResumoCard: {
    marginHorizontal: Spacing.md, backgroundColor: Colors.rendaLight,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: 10,
  },
  rendasResumoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  rendasResumoTitulo: { flex: 1, fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.renda },
  rendasTotal: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.renda },
  rendasGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  rendaChip: {
    backgroundColor: '#FFF', borderRadius: BorderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  rendaChipNome: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary, maxWidth: 80,
  },
  rendaChipValor: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.renda },
  cartoesResumoCard: {
    marginHorizontal: Spacing.md, backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md, padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  cartoesResumoHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  cartoesResumoTitulo: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  cartaoResumoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cartaoResumoCorDot: { width: 8, height: 8, borderRadius: 4 },
  cartaoResumoNome: {
    fontSize: FontSize.xs, fontWeight: FontWeight.medium,
    color: Colors.textPrimary, width: 70,
  },
  cartaoResumoBarraWrap: { flex: 1 },
  cartaoResumoBarraFundo: {
    height: 6, backgroundColor: Colors.border,
    borderRadius: 3, overflow: 'hidden',
  },
  cartaoResumoBarraFill: { height: 6, borderRadius: 3 },
  cartaoResumoValor: {
    fontSize: FontSize.xs, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, width: 70, textAlign: 'right',
  },
  vazio: { textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: FontSize.md },
  modalOverlay: { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg, paddingBottom: 40,
  },
  modalSheetTitulo: {
    fontSize: FontSize.lg, fontWeight: FontWeight.bold,
    color: Colors.textPrimary, marginBottom: Spacing.md,
  },
  filtroOpcao: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  filtroOpcaoAtiva: {
    backgroundColor: Colors.primaryLight,
    marginHorizontal: -Spacing.lg, paddingHorizontal: Spacing.lg,
  },
  filtroOpcaoText: { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  filtroOpcaoTextAtiva: { color: Colors.primaryDark, fontWeight: FontWeight.bold },
  filtroOpcaoCheck: { fontSize: FontSize.lg, color: Colors.primaryDark },
});
