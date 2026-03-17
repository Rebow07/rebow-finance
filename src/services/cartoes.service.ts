// src/services/cartoes.service.ts

import { supabase } from '../supabase/client';
import { Cartao, CartaoInsert, CartaoResumo, Transacao } from '../types';

export const cartoesService = {
  async buscarPorGrupo(grupoId: string): Promise<Cartao[]> {
    const { data, error } = await supabase
      .from('cartoes')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq('ativo', true)
      .order('criado_em', { ascending: false });
    if (error) throw new Error(`Erro ao buscar cartões: ${error.message}`);
    return (data as Cartao[]) ?? [];
  },

  async inserir(cartao: CartaoInsert): Promise<Cartao> {
    const { data, error } = await supabase
      .from('cartoes')
      .insert(cartao)
      .select()
      .single();
    if (error) throw new Error(`Erro ao inserir cartão: ${error.message}`);
    return data as Cartao;
  },

  async atualizar(id: string, campos: Partial<CartaoInsert>): Promise<Cartao> {
    const { data, error } = await supabase
      .from('cartoes')
      .update(campos)
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(`Erro ao atualizar cartão: ${error.message}`);
    return data as Cartao;
  },

  async desativar(id: string): Promise<void> {
    const { error } = await supabase
      .from('cartoes')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw new Error(`Erro ao desativar cartão: ${error.message}`);
  },

  /**
   * LÓGICA CORRETA DO LIMITE:
   * - Soma apenas transações NÃO PAGAS com data >= hoje
   * - Transação paga = limite liberado automaticamente
   * - Transação adiantada/deletada = limite liberado automaticamente
   */
  calcularResumos(cartoes: Cartao[], todasTransacoes: Transacao[]): CartaoResumo[] {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return cartoes.map(cartao => {
      const transacoesCartao = todasTransacoes.filter(t => {
        if (t.cartao_id !== cartao.id) return false;
        if (t.tipo !== 'despesa') return false;
        if (t.pago === true) return false; // ✅ PAGO = não consome limite
        const dataT = new Date(t.data + 'T00:00:00');
        return dataT >= hoje;
      });

      const totalGasto = transacoesCartao.reduce((acc, t) => acc + t.valor, 0);
      const disponivel = Math.max(cartao.limite - totalGasto, 0);
      const percentualUso = cartao.limite > 0
        ? Math.min((totalGasto / cartao.limite) * 100, 100)
        : 0;

      return { ...cartao, totalGasto, disponivel, percentualUso };
    });
  },
};

export const CORES_CARTAO = [
  '#1A1A1A', '#2C3E50', '#E74C3C', '#8E44AD',
  '#2980B9', '#27AE60', '#F39C12', '#D35400',
];
