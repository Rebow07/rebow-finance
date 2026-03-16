// src/services/transacoes.service.ts

import { supabase } from '../supabase/client';
import { Transacao, TransacaoInsert, FiltroTransacao } from '../types';

export const transacoesService = {
  async buscarPorMes(filtro: FiltroTransacao): Promise<Transacao[]> {
    const inicioMes = `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}-01`;
    const fimMesDate = new Date(filtro.ano, filtro.mes, 0);
    const fimMesStr = `${filtro.ano}-${String(filtro.mes).padStart(2, '0')}-${fimMesDate.getDate()}`;

    let query = supabase
      .from('transacoes')
      .select('*')
      .eq('grupo_id', filtro.grupoId)
      .gte('data', inicioMes)
      .lte('data', fimMesStr)
      .order('data', { ascending: false });

    if (filtro.tipo) {
      query = query.eq('tipo', filtro.tipo);
    }

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

    if (error) throw new Error(`Erro ao inserir transação: ${error.message}`);
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

  async buscarFixas(grupoId: string): Promise<Transacao[]> {
    const { data, error } = await supabase
      .from('transacoes')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq('fixo', true)
      .order('data', { ascending: false });

    if (error) throw new Error(`Erro ao buscar fixas: ${error.message}`);
    return (data as Transacao[]) ?? [];
  },
};

export function gerarParcelas(base: TransacaoInsert, totalParcelas: number): TransacaoInsert[] {
  const valorParcela = parseFloat((base.valor / totalParcelas).toFixed(2));
  const [anoBase, mesBase, diaBase] = base.data.split('-').map(Number);

  return Array.from({ length: totalParcelas }, (_, i) => {
    const dataRef = new Date(anoBase, mesBase - 1 + i, diaBase);
    const dataStr = `${dataRef.getFullYear()}-${String(dataRef.getMonth() + 1).padStart(2, '0')}-${String(dataRef.getDate()).padStart(2, '0')}`;

    return {
      ...base,
      titulo: `${base.titulo} (${i + 1}/${totalParcelas})`,
      valor: valorParcela,
      data: dataStr,
      parcelado: true,
    };
  });
}
