// src/services/transacoes.service.ts

import { supabase } from '../supabase/client';
import { Transacao, TransacaoInsert, FiltroTransacao } from '../types';

function gerarUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function dataHoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const transacoesService = {

  async buscarPorMes(filtro: FiltroTransacao): Promise<Transacao[]> {
    const inicioMes = `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}-01`;
    const ultimoDia = new Date(filtro.ano, filtro.mes, 0).getDate();
    const fimMes = `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}-${ultimoDia}`;

    let query = supabase
      .from('transacoes')
      .select('*')
      .eq('grupo_id', filtro.grupoId)
      .gte('data', inicioMes)
      .lte('data', fimMes)
      .order('data', { ascending: false });

    if (filtro.tipo) query = query.eq('tipo', filtro.tipo);

    const { data, error } = await query;
    if (error) throw new Error(`Erro ao buscar transações: ${error.message}`);
    return (data as Transacao[]) ?? [];
  },

  async inserir(transacao: TransacaoInsert): Promise<Transacao> {
    const { data, error } = await supabase
      .from('transacoes')
      .insert(transacao)
      .select()
      .single();
    if (error) throw new Error(`Erro ao inserir: ${error.message}`);
    return data as Transacao;
  },

  async inserirLote(transacoes: TransacaoInsert[]): Promise<Transacao[]> {
    const { data, error } = await supabase
      .from('transacoes')
      .insert(transacoes)
      .select();
    if (error) throw new Error(`Erro ao inserir lote: ${error.message}`);
    return (data as Transacao[]) ?? [];
  },

  async atualizar(id: string, campos: Partial<TransacaoInsert>): Promise<Transacao> {
    const { data, error } = await supabase
      .from('transacoes')
      .update(campos)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Erro ao atualizar: ${error.message}`);
    return data as Transacao;
  },

  async deletar(id: string): Promise<void> {
    const { error } = await supabase
      .from('transacoes')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Erro ao deletar: ${error.message}`);
  },

  async deletarLote(ids: string[]): Promise<void> {
    if (!ids.length) return;
    const { error } = await supabase
      .from('transacoes')
      .delete()
      .in('id', ids);
    if (error) throw new Error(`Erro ao deletar lote: ${error.message}`);
  },

  /**
   * Marca uma única transação como PAGA
   * SET pago = true, pago_em = hoje
   */
  async marcarComoPago(id: string): Promise<Transacao> {
    const { data, error } = await supabase
      .from('transacoes')
      .update({ pago: true, pago_em: dataHoje() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Erro ao marcar como pago: ${error.message}`);
    return data as Transacao;
  },

  /**
   * Desmarca uma única transação (pago → false)
   * SET pago = false, pago_em = null
   */
  async marcarComoNaoPago(id: string): Promise<Transacao> {
    const { data, error } = await supabase
      .from('transacoes')
      .update({ pago: false, pago_em: null })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Erro ao desmarcar pagamento: ${error.message}`);
    return data as Transacao;
  },

  /**
   * Marca múltiplas transações como pagas ou não-pagas (lote)
   * UPDATE transacoes SET pago = ?, pago_em = ? WHERE id IN (...)
   */
  async marcarPagoLote(ids: string[], pago: boolean): Promise<void> {
    if (!ids.length) return;
    const { error } = await supabase
      .from('transacoes')
      .update({
        pago,
        pago_em: pago ? dataHoje() : null,
      })
      .in('id', ids);
    if (error) throw new Error(`Erro ao marcar lote: ${error.message}`);
  },

  /**
   * Busca todas as parcelas de um grupo de parcelamento ordenadas
   */
  async buscarPorGrupoParcela(parcelaGrupoId: string): Promise<Transacao[]> {
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('parcela_grupo_id', parcelaGrupoId)
      .order('parcela_index', { ascending: true });
    if (error) throw new Error(`Erro ao buscar parcelas: ${error.message}`);
    return (data as Transacao[]) ?? [];
  },
};

/**
 * Gera parcelas com arredondamento correto.
 * A primeira parcela absorve a diferença de centavos
 * para garantir que a soma = valor original declarado.
 *
 * Ex: R$ 2.000 em 4x → 500,00 + 500,00 + 500,00 + 500,00
 * Ex: R$ 1.000 em 3x → 333,34 + 333,33 + 333,33 = 1.000,00
 */
export function gerarParcelas(
  base: TransacaoInsert,
  totalParcelas: number
): TransacaoInsert[] {
  const parcelaGrupoId = gerarUUID();
  const valorTotal = base.valor;

  const valorBase = Math.floor((valorTotal / totalParcelas) * 100) / 100;
  const diferenca =
    Math.round((valorTotal - valorBase * totalParcelas) * 100) / 100;

  const [anoBase, mesBase, diaBase] = base.data.split('-').map(Number);

  return Array.from({ length: totalParcelas }, (_, i) => {
    const dataRef = new Date(anoBase, mesBase - 1 + i, diaBase);
    const dataStr = [
      dataRef.getFullYear(),
      String(dataRef.getMonth() + 1).padStart(2, '0'),
      String(dataRef.getDate()).padStart(2, '0'),
    ].join('-');

    const valorParcela =
      i === 0
        ? Math.round((valorBase + diferenca) * 100) / 100
        : valorBase;

    return {
      ...base,
      titulo: `${base.titulo} (${i + 1}/${totalParcelas})`,
      valor: valorParcela,
      data: dataStr,
      parcelado: true,
      parcela_grupo_id: parcelaGrupoId,
      parcela_index: i + 1,
    };
  });
}
