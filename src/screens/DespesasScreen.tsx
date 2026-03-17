// src/screens/DespesasScreen.tsx

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  CheckCircle,
  Circle,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  CreditCard,
  CheckSquare,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useApp } from '../context/AppContext';
import { transacoesService } from '../services/transacoes.service';
import { supabase } from '../supabase/client';
import { getCategoriaById, MESES_CURTOS } from '../constants';
import { formatarMoeda, formatarData } from '../utils';
import CategoriaIcon from '../components/CategoriaIcon';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { Transacao } from '../types';
import { RootStackParamList } from '../navigation';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─────────────────────────────────────────────
// TELA PRINCIPAL
// ─────────────────────────────────────────────
export default function DespesasScreen() {
  const nav = useNavigation<Nav>();
  const {
    grupoId,
    mesSelecionado,
    setMesSelecionado,
    anoSelecionado,
    setAnoSelecionado,
  } = useApp();

  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pendente' | 'pago'>('todos');
  const [modoAno, setModoAno] = useState(false);

  // Seleção múltipla
  const [modoSelecao, setModoSelecao] = useState(false);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [pagando, setPagando] = useState(false);

  // Modal parcelas
  const [parcelasModal, setParcelasModal] = useState<Transacao[]>([]);
  const [transacaoAtual, setTransacaoAtual] = useState<Transacao | null>(null);
  const [modalParcelas, setModalParcelas] = useState(false);
  const [selecionadasParcelas, setSelecionadasParcelas] = useState<Set<string>>(new Set());
  const [adiantando, setAdiantando] = useState(false);

  // ── Carrega transações ──────────────────────
  const carregar = useCallback(async () => {
    if (!grupoId) { setCarregando(false); return; }
    setCarregando(true);
    try {
      let dados: Transacao[] = [];
      if (modoAno) {
        const { data } = await supabase
          .from('transacoes')
          .select('*')
          .eq('grupo_id', grupoId)
          .eq('tipo', 'despesa')
          .gte('data', `${anoSelecionado}-01-01`)
          .lte('data', `${anoSelecionado}-12-31`)
          .order('data', { ascending: true });
        dados = (data as Transacao[]) ?? [];
      } else {
        dados = await transacoesService.buscarPorMes({
          grupoId,
          mes: mesSelecionado,
          ano: anoSelecionado,
          tipo: 'despesa',
        });
      }
      setTransacoes(dados);
    } catch (e: any) {
      Alert.alert('Erro ao carregar', e.message ?? 'Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [grupoId, mesSelecionado, anoSelecionado, modoAno]);

  React.useEffect(() => { carregar(); }, [carregar]);

  // ── Atualiza item localmente (feedback imediato) ──
  function atualizarItemLocal(id: string, campos: Partial<Transacao>) {
    setTransacoes(prev =>
      prev.map(t => t.id === id ? { ...t, ...campos } : t)
    );
  }

  // ── Pagamento individual ────────────────────
  async function handleTogglePagamento(t: Transacao) {
    const jaPago = t.pago === true;

    Alert.alert(
      jaPago ? 'Desmarcar pagamento?' : 'Confirmar pagamento?',
      jaPago
        ? `"${t.titulo}" voltará a aparecer como pendente.`
        : `Confirmar que "${t.titulo}" foi pago?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: jaPago ? 'Desmarcar' : '✓ Confirmar',
          onPress: async () => {
            // Feedback visual imediato
            atualizarItemLocal(t.id, {
              pago: !jaPago,
              pago_em: !jaPago ? new Date().toISOString().split('T')[0] : null,
            });
            try {
              if (jaPago) {
                await transacoesService.marcarComoNaoPago(t.id);
              } else {
                await transacoesService.marcarComoPago(t.id);
              }
              // Recarrega para garantir consistência
              await carregar();
            } catch (e: any) {
              // Reverte o feedback visual em caso de erro
              atualizarItemLocal(t.id, { pago: jaPago, pago_em: t.pago_em });
              Alert.alert('Erro', e.message ?? 'Não foi possível atualizar.');
            }
          },
        },
      ]
    );
  }

  // ── Seleção múltipla ────────────────────────
  function toggleSelecao(id: string) {
    setSelecionadas(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function selecionarTodasPendentes() {
    const pendentes = transacoesFiltradas
      .filter(t => !t.pago)
      .map(t => t.id);
    setSelecionadas(new Set(pendentes));
  }

  function limparSelecao() {
    setSelecionadas(new Set());
    setModoSelecao(false);
  }

  // ── Pagar selecionadas (lote) ───────────────
  async function pagarSelecionadas() {
    if (!selecionadas.size) return;
    const ids = Array.from(selecionadas);
    const total = transacoes
      .filter(t => ids.includes(t.id))
      .reduce((acc, t) => acc + t.valor, 0);

    Alert.alert(
      '💰 Confirmar Pagamento',
      `Pagar ${ids.length} despesa(s) — ${formatarMoeda(total)}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '✓ Confirmar Pagamento',
          onPress: async () => {
            setPagando(true);
            try {
              await transacoesService.marcarPagoLote(ids, true);
              limparSelecao();
              await carregar();
            } catch (e: any) {
              Alert.alert('Erro', e.message ?? 'Não foi possível pagar.');
            } finally {
              setPagando(false);
            }
          },
        },
      ]
    );
  }

  // ── Abre modal de parcelas ──────────────────
  async function abrirDetalhes(t: Transacao) {
    if (modoSelecao) {
      toggleSelecao(t.id);
      return;
    }
    if (t.parcela_grupo_id) {
      try {
        setTransacaoAtual(t);
        const p = await transacoesService.buscarPorGrupoParcela(t.parcela_grupo_id);
        setParcelasModal(p);
        setSelecionadasParcelas(new Set());
        setModalParcelas(true);
      } catch (e: any) {
        Alert.alert('Erro', e.message);
      }
    } else {
      nav.navigate('DetalheTransacao', { transacao: t });
    }
  }

  // ── Pagar parcelas selecionadas ─────────────
  async function pagarParcelasSelecionadas() {
    if (!selecionadasParcelas.size) {
      Alert.alert('Atenção', 'Selecione ao menos uma parcela.');
      return;
    }
    const ids = Array.from(selecionadasParcelas);
    const total = parcelasModal
      .filter(p => ids.includes(p.id))
      .reduce((acc, p) => acc + p.valor, 0);

    Alert.alert(
      '💰 Pagar Parcelas',
      `Pagar ${ids.length} parcela(s) — ${formatarMoeda(total)}?\nSerão marcadas como pagas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: '✓ Pagar',
          onPress: async () => {
            setPagando(true);
            try {
              await transacoesService.marcarPagoLote(ids, true);
              setModalParcelas(false);
              await carregar();
              Alert.alert('✅ Pago!', `${ids.length} parcela(s) pagas.`);
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setPagando(false);
            }
          },
        },
      ]
    );
  }

  // ── Adiantar parcelas (deleta do banco) ─────
  async function adiantarParcelasSelecionadas() {
    if (!selecionadasParcelas.size) {
      Alert.alert('Atenção', 'Selecione ao menos uma parcela.');
      return;
    }
    const ids = Array.from(selecionadasParcelas);
    const total = parcelasModal
      .filter(p => ids.includes(p.id))
      .reduce((acc, p) => acc + p.valor, 0);

    Alert.alert(
      '⏩ Adiantar Parcelas',
      `Adiantar ${ids.length} parcela(s) — ${formatarMoeda(total)}?\nSerão REMOVIDAS permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Adiantar',
          style: 'destructive',
          onPress: async () => {
            setAdiantando(true);
            try {
              await transacoesService.deletarLote(ids);
              setModalParcelas(false);
              await carregar();
              Alert.alert('✅ Adiantado!', `${ids.length} parcela(s) removidas.`);
            } catch (e: any) {
              Alert.alert('Erro', e.message);
            } finally {
              setAdiantando(false);
            }
          },
        },
      ]
    );
  }

  function toggleParcela(id: string) {
    setSelecionadasParcelas(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function navegarMes(d: number) {
    let m = mesSelecionado + d;
    let a = anoSelecionado;
    if (m > 12) { m = 1; a++; }
    if (m < 1) { m = 12; a--; }
    setMesSelecionado(m);
    setAnoSelecionado(a);
  }

  // ── Derivados ───────────────────────────────
  const transacoesFiltradas = transacoes.filter(t => {
    if (filtroStatus === 'pago') return t.pago === true;
    if (filtroStatus === 'pendente') return t.pago !== true;
    return true;
  });

  const totalPendente = transacoes
    .filter(t => t.pago !== true)
    .reduce((acc, t) => acc + t.valor, 0);
  const totalPago = transacoes
    .filter(t => t.pago === true)
    .reduce((acc, t) => acc + t.valor, 0);
  const totalGeral = transacoes.reduce((acc, t) => acc + t.valor, 0);
  const totalSelecionado = transacoes
    .filter(t => selecionadas.has(t.id))
    .reduce((acc, t) => acc + t.valor, 0);
  const totalParcelasSel = parcelasModal
    .filter(p => selecionadasParcelas.has(p.id))
    .reduce((acc, p) => acc + p.valor, 0);

  const transacoesAgrupadas = modoAno
    ? agruparPorMes(transacoesFiltradas)
    : null;

  // ── Render ──────────────────────────────────
  return (
    <SafeAreaView style={s.safe} edges={['top']}>

      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          {modoSelecao ? (
            <TouchableOpacity onPress={limparSelecao}>
              <Text style={s.cancelarText}>Cancelar</Text>
            </TouchableOpacity>
          ) : (
            <Text style={s.titulo}>Despesas</Text>
          )}
        </View>
        {!modoSelecao && (
          <View style={s.modoBtns}>
            <TouchableOpacity
              style={[s.modoBtn, !modoAno && s.modoBtnActive]}
              onPress={() => setModoAno(false)}>
              <Text style={[s.modoBtnText, !modoAno && s.modoBtnTextActive]}>Mês</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.modoBtn, modoAno && s.modoBtnActive]}
              onPress={() => setModoAno(true)}>
              <Text style={[s.modoBtnText, modoAno && s.modoBtnTextActive]}>Ano</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Navegação período */}
      <View style={s.navMes}>
        <TouchableOpacity
          onPress={() => modoAno ? setAnoSelecionado(a => a - 1) : navegarMes(-1)}
          style={s.navBtn}>
          <ChevronLeft size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.navMesLabel}>
          {modoAno
            ? String(anoSelecionado)
            : `${MESES_CURTOS[mesSelecionado - 1]} ${anoSelecionado}`}
        </Text>
        <TouchableOpacity
          onPress={() => modoAno ? setAnoSelecionado(a => a + 1) : navegarMes(1)}
          style={s.navBtn}>
          <ChevronRight size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Cards resumo */}
      <View style={s.resumoRow}>
        <View style={[s.resumoCard, { borderTopColor: Colors.despesa }]}>
          <Text style={s.resumoLabel}>Pendente</Text>
          <Text style={[s.resumoValor, { color: Colors.despesa }]}>{formatarMoeda(totalPendente)}</Text>
        </View>
        <View style={[s.resumoCard, { borderTopColor: Colors.renda }]}>
          <Text style={s.resumoLabel}>Pago</Text>
          <Text style={[s.resumoValor, { color: Colors.renda }]}>{formatarMoeda(totalPago)}</Text>
        </View>
        <View style={[s.resumoCard, { borderTopColor: Colors.primary }]}>
          <Text style={s.resumoLabel}>Total</Text>
          <Text style={[s.resumoValor, { color: Colors.textPrimary }]}>{formatarMoeda(totalGeral)}</Text>
        </View>
      </View>

      {/* Filtros + botão seleção */}
      <View style={s.filtrosBar}>
        <View style={s.filtrosRow}>
          {(['todos', 'pendente', 'pago'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[s.filtroBtn, filtroStatus === f && s.filtroBtnActive]}
              onPress={() => setFiltroStatus(f)}>
              <Text style={[s.filtroBtnText, filtroStatus === f && s.filtroBtnTextActive]}>
                {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : 'Pagos'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          style={s.selecionarIconBtn}
          onPress={() => {
            if (modoSelecao) {
              selecionarTodasPendentes();
            } else {
              setModoSelecao(true);
            }
          }}>
          {modoSelecao
            ? <Text style={s.selecionarTodasText}>Todas</Text>
            : <CheckSquare size={20} color={Colors.textSecondary} />}
        </TouchableOpacity>
      </View>

      {/* Barra de ação (seleção múltipla) */}
      {modoSelecao && selecionadas.size > 0 && (
        <View style={s.acaoBar}>
          <View>
            <Text style={s.acaoBarTexto}>{selecionadas.size} selecionada(s)</Text>
            <Text style={s.acaoBarValor}>{formatarMoeda(totalSelecionado)}</Text>
          </View>
          <TouchableOpacity
            style={[s.pagarBtn, pagando && { opacity: 0.6 }]}
            onPress={pagarSelecionadas}
            disabled={pagando}>
            {pagando
              ? <ActivityIndicator size="small" color={Colors.textPrimary} />
              : (
                <>
                  <Check size={18} color={Colors.textPrimary} strokeWidth={2.5} />
                  <Text style={s.pagarBtnText}>Pagar</Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      )}

      {/* Lista */}
      {carregando ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : modoAno && transacoesAgrupadas ? (
        <FlatList
          data={transacoesAgrupadas}
          keyExtractor={item => item.mes}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <View>
              <View style={s.grupoMesHeader}>
                <Text style={s.grupoMesTitulo}>{item.mesLabel}</Text>
                <Text style={s.grupoMesTotal}>{formatarMoeda(item.total)}</Text>
              </View>
              {item.transacoes.map(t => (
                <DespesaItem
                  key={t.id}
                  transacao={t}
                  modoSelecao={modoSelecao}
                  selecionado={selecionadas.has(t.id)}
                  onToggleSelecao={() => {
                    if (!modoSelecao) setModoSelecao(true);
                    toggleSelecao(t.id);
                  }}
                  onTogglePagamento={handleTogglePagamento}
                  onDetalhes={abrirDetalhes}
                />
              ))}
            </View>
          )}
          ListEmptyComponent={<EmptyState />}
        />
      ) : (
        <FlatList
          data={transacoesFiltradas}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 80 }}
          refreshControl={
            <RefreshControl refreshing={carregando} onRefresh={carregar} tintColor={Colors.primary} />
          }
          renderItem={({ item }) => (
            <DespesaItem
              transacao={item}
              modoSelecao={modoSelecao}
              selecionado={selecionadas.has(item.id)}
              onToggleSelecao={() => {
                if (!modoSelecao) setModoSelecao(true);
                toggleSelecao(item.id);
              }}
              onTogglePagamento={handleTogglePagamento}
              onDetalhes={abrirDetalhes}
            />
          )}
          ListEmptyComponent={<EmptyState />}
        />
      )}

      {/* ── MODAL PARCELAS ───────────────────── */}
      <Modal
        visible={modalParcelas}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalParcelas(false)}>
        <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setModalParcelas(false)} style={s.iconBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.modalTitulo}>Parcelas</Text>
            <View style={s.modalAcoes}>
              <TouchableOpacity
                style={[
                  s.modalAcaoBtn,
                  { backgroundColor: Colors.renda },
                  (!selecionadasParcelas.size || pagando) && { opacity: 0.4 },
                ]}
                onPress={pagarParcelasSelecionadas}
                disabled={!selecionadasParcelas.size || pagando}>
                {pagando
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={[s.modalAcaoBtnText, { color: '#FFF' }]}>Pagar</Text>}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  s.modalAcaoBtn,
                  { backgroundColor: Colors.primary },
                  (!selecionadasParcelas.size || adiantando) && { opacity: 0.4 },
                ]}
                onPress={adiantarParcelasSelecionadas}
                disabled={!selecionadasParcelas.size || adiantando}>
                {adiantando
                  ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                  : <Text style={s.modalAcaoBtnText}>Adiantar</Text>}
              </TouchableOpacity>
            </View>
          </View>

          <View style={s.modalInfoBanner}>
            <Text style={s.modalInfoText}>
              <Text style={{ fontWeight: '700' }}>Pagar</Text> = marca como pago, mantém no banco.{'  '}
              <Text style={{ fontWeight: '700' }}>Adiantar</Text> = remove permanentemente.
            </Text>
          </View>

          <View style={s.selecionarParcelasRow}>
            <TouchableOpacity
              onPress={() => setSelecionadasParcelas(new Set(parcelasModal.map(p => p.id)))}
              style={s.selecionarParcelaBtn}>
              <Text style={s.selecionarParcelaBtnText}>Selecionar todas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelecionadasParcelas(new Set())}
              style={s.selecionarParcelaBtn}>
              <Text style={s.selecionarParcelaBtnText}>Limpar</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, paddingBottom: 40 }}>
            {parcelasModal.map(p => {
              const sel = selecionadasParcelas.has(p.id);
              const isAtual = p.id === transacaoAtual?.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    s.parcelaItem,
                    sel && s.parcelaItemSel,
                    p.pago && s.parcelaItemPaga,
                  ]}
                  onPress={() => toggleParcela(p.id)}
                  activeOpacity={0.75}>
                  <View style={[s.parcelaCheck, sel && s.parcelaCheckSel]}>
                    {sel && <Check size={12} color="#FFF" strokeWidth={3} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.parcelaNome,
                        p.pago && { textDecorationLine: 'line-through', color: Colors.textMuted },
                      ]}>
                      {p.titulo}{isAtual ? ' ← atual' : ''}
                    </Text>
                    <Text style={s.parcelaData}>{formatarData(p.data)}</Text>
                    {p.pago && (
                      <Text style={s.parcelaPago}>
                        ✓ Pago{p.pago_em ? ` em ${formatarData(p.pago_em)}` : ''}
                      </Text>
                    )}
                  </View>
                  <Text style={[s.parcelaValor, { color: p.pago ? Colors.textMuted : Colors.despesa }]}>
                    -{formatarMoeda(p.valor)}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {selecionadasParcelas.size > 0 && (
              <View style={s.totalAdiantar}>
                <View>
                  <Text style={s.totalAdiantarLabel}>Total selecionado</Text>
                  <Text style={s.totalAdiantarSub}>{selecionadasParcelas.size} parcela(s)</Text>
                </View>
                <Text style={s.totalAdiantarValor}>{formatarMoeda(totalParcelasSel)}</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// COMPONENTE ITEM
// Separação clara de áreas de toque:
// - Corpo do item → onDetalhes (ou toggleSelecao)
// - Círculo à direita → onTogglePagamento
// ─────────────────────────────────────────────
interface DespesaItemProps {
  transacao: Transacao;
  modoSelecao: boolean;
  selecionado: boolean;
  onToggleSelecao: () => void;
  onTogglePagamento: (t: Transacao) => void;
  onDetalhes: (t: Transacao) => void;
}

function DespesaItem({
  transacao: t,
  modoSelecao,
  selecionado,
  onToggleSelecao,
  onTogglePagamento,
  onDetalhes,
}: DespesaItemProps) {
  const cat = getCategoriaById(t.categoria);
  const pago = t.pago === true;

  return (
    <View style={[di.wrapper, selecionado && di.wrapperSel, pago && di.wrapperPago]}>
      {/* Área clicável principal (corpo) */}
      <TouchableOpacity
        style={di.corpo}
        onPress={() => modoSelecao ? onToggleSelecao() : onDetalhes(t)}
        onLongPress={onToggleSelecao}
        activeOpacity={0.75}>

        {/* Checkbox (modo seleção) */}
        {modoSelecao && (
          <View style={[di.checkbox, selecionado && di.checkboxSel]}>
            {selecionado && <Check size={13} color="#FFF" strokeWidth={3} />}
          </View>
        )}

        {/* Ícone categoria */}
        <View style={[di.iconWrap, { backgroundColor: `${cat.cor}18` }]}>
          <CategoriaIcon
            iconName={cat.icon}
            cor={pago ? Colors.textMuted : cat.cor}
            size={20}
          />
        </View>

        {/* Texto */}
        <View style={di.info}>
          <Text
            style={[di.titulo, pago && di.tituloPago]}
            numberOfLines={1}>
            {t.titulo}
          </Text>
          <View style={di.metaRow}>
            <Text style={di.data}>{formatarData(t.data)}</Text>
            {t.parcelado && t.parcela_index != null && (
              <View style={di.badge}>
                <Text style={di.badgeText}>{t.parcela_index}ª parc.</Text>
              </View>
            )}
            {t.fixo === true && (
              <View style={[di.badge, { backgroundColor: Colors.primaryLight }]}>
                <Text style={[di.badgeText, { color: Colors.primaryDark }]}>Fixo</Text>
              </View>
            )}
            {!!t.cartao_id && (
              <CreditCard size={12} color={Colors.textMuted} />
            )}
          </View>
          {pago && t.pago_em && (
            <Text style={di.pagoEm}>Pago em {formatarData(t.pago_em)}</Text>
          )}
        </View>

        {/* Valor */}
        <Text style={[di.valor, pago && di.valorPago]}>
          -{formatarMoeda(t.valor)}
        </Text>
      </TouchableOpacity>

      {/* Botão de pagamento — área isolada para evitar conflito */}
      {!modoSelecao && (
        <TouchableOpacity
          style={di.checkBtn}
          onPress={() => onTogglePagamento(t)}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          {pago
            ? <CheckCircle size={26} color={Colors.renda} strokeWidth={2} />
            : <Circle size={26} color={Colors.border} strokeWidth={2} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────
function EmptyState() {
  return (
    <View style={{ alignItems: 'center', paddingTop: 60 }}>
      <Text style={{ fontSize: 48, marginBottom: 12 }}>🎉</Text>
      <Text style={{
        fontSize: FontSize.lg, fontWeight: FontWeight.bold,
        color: Colors.textPrimary, marginBottom: 6,
      }}>
        Nenhuma despesa aqui!
      </Text>
      <Text style={{
        fontSize: FontSize.sm, color: Colors.textSecondary,
        textAlign: 'center', paddingHorizontal: 32,
      }}>
        Sem despesas para o período selecionado.
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// HELPER
// ─────────────────────────────────────────────
function agruparPorMes(transacoes: Transacao[]) {
  const grupos: Record<string, {
    mes: string; mesLabel: string; total: number; transacoes: Transacao[];
  }> = {};

  for (const t of transacoes) {
    const [ano, mes] = t.data.split('-');
    const chave = `${ano}-${mes}`;
    if (!grupos[chave]) {
      grupos[chave] = {
        mes: chave,
        mesLabel: `${MESES_CURTOS[parseInt(mes) - 1]} ${ano}`,
        total: 0,
        transacoes: [],
      };
    }
    grupos[chave].transacoes.push(t);
    grupos[chave].total += t.valor;
  }

  return Object.values(grupos).sort((a, b) => a.mes.localeCompare(b.mes));
}

// ─────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: 4,
  },
  headerLeft: { flex: 1 },
  titulo: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  cancelarText: { fontSize: FontSize.md, color: Colors.despesa, fontWeight: FontWeight.semiBold },
  modoBtns: {
    flexDirection: 'row', gap: 4,
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: 3, borderWidth: 1, borderColor: Colors.border,
  },
  modoBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: BorderRadius.sm },
  modoBtnActive: { backgroundColor: Colors.primary },
  modoBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  modoBtnTextActive: { color: Colors.textPrimary },
  navMes: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  navBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  navMesLabel: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  resumoRow: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 8, marginBottom: 8 },
  resumoCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: 10, borderTopWidth: 3, borderWidth: 1, borderColor: Colors.border,
  },
  resumoLabel: { fontSize: 10, color: Colors.textMuted, fontWeight: FontWeight.medium, marginBottom: 3 },
  resumoValor: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  filtrosBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  filtrosRow: { flexDirection: 'row', gap: 8 },
  filtroBtn: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: BorderRadius.full, backgroundColor: Colors.surface,
    borderWidth: 1, borderColor: Colors.border,
  },
  filtroBtnActive: { backgroundColor: Colors.textPrimary, borderColor: Colors.textPrimary },
  filtroBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  filtroBtnTextActive: { color: '#FFF' },
  selecionarIconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  selecionarTodasText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.primaryDark },
  acaoBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: Spacing.md, marginBottom: 8,
    backgroundColor: Colors.textPrimary, borderRadius: BorderRadius.md, padding: Spacing.md,
  },
  acaoBarTexto: { fontSize: FontSize.xs, color: '#AAA' },
  acaoBarValor: { fontSize: FontSize.lg, fontWeight: FontWeight.extraBold, color: '#FFF' },
  pagarBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingHorizontal: 20, paddingVertical: 12,
  },
  pagarBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  grupoMesHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    backgroundColor: Colors.primaryLight, marginBottom: 2,
  },
  grupoMesTitulo: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primaryDark },
  grupoMesTotal: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.despesa },
  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  iconBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalAcoes: { flexDirection: 'row', gap: 8 },
  modalAcaoBtn: { borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 8 },
  modalAcaoBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalInfoBanner: { backgroundColor: Colors.primaryLight, padding: Spacing.md },
  modalInfoText: { fontSize: FontSize.xs, color: Colors.primaryDark, lineHeight: 18 },
  selecionarParcelasRow: {
    flexDirection: 'row', gap: 12, paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  selecionarParcelaBtn: { paddingVertical: 4 },
  selecionarParcelaBtnText: { fontSize: FontSize.sm, color: Colors.primaryDark, fontWeight: FontWeight.semiBold },
  parcelaItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: Spacing.md, borderRadius: BorderRadius.md,
    backgroundColor: Colors.surface, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.border,
  },
  parcelaItemSel: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  parcelaItemPaga: { opacity: 0.6 },
  parcelaCheck: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF',
  },
  parcelaCheckSel: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  parcelaNome: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  parcelaData: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  parcelaPago: { fontSize: FontSize.xs, color: Colors.renda, fontWeight: FontWeight.semiBold, marginTop: 2 },
  parcelaValor: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  totalAdiantar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    padding: Spacing.md, marginTop: 8,
  },
  totalAdiantarLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  totalAdiantarSub: { fontSize: FontSize.xs, color: Colors.textPrimary, opacity: 0.7 },
  totalAdiantarValor: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
});

const di = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardBg,
    marginHorizontal: Spacing.md, marginBottom: 8,
    borderRadius: BorderRadius.md,
    ...Shadow.sm,
    overflow: 'hidden',
  },
  wrapperSel: { borderWidth: 2, borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  wrapperPago: { opacity: 0.55, backgroundColor: Colors.surface },
  corpo: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    padding: Spacing.md,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    marginRight: 10, backgroundColor: '#FFF',
  },
  checkboxSel: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  iconWrap: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md,
  },
  info: { flex: 1, marginRight: 8 },
  titulo: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, marginBottom: 3 },
  tituloPago: { textDecorationLine: 'line-through', color: Colors.textMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  data: { fontSize: FontSize.xs, color: Colors.textMuted },
  badge: {
    backgroundColor: '#EDE7F6', paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  badgeText: { fontSize: 10, color: '#6A1B9A', fontWeight: FontWeight.semiBold },
  pagoEm: { fontSize: 10, color: Colors.renda, marginTop: 3, fontWeight: FontWeight.medium },
  valor: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.despesa },
  valorPago: { color: Colors.textMuted, textDecorationLine: 'line-through' },
  checkBtn: {
    width: 52, height: '100%' as any,
    alignItems: 'center', justifyContent: 'center',
    borderLeftWidth: 1, borderLeftColor: Colors.border,
  },
});
