// src/hooks/useCartoes.ts

import { useState, useEffect, useCallback } from 'react';
import { Cartao, CartaoResumo, Transacao } from '../types';
import { cartoesService } from '../services/cartoes.service';
import { supabase } from '../supabase/client';

async function buscarTodasTransacoesCartao(grupoId: string): Promise<Transacao[]> {
  // Busca TODAS as transações de cartão com data de hoje em diante
  // Inclui PAGAS e NÃO PAGAS — o calcularResumos decide o que consome limite
  const hoje = new Date();
  const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('transacoes')
    .select('*')
    .eq('grupo_id', grupoId)
    .eq('tipo', 'despesa')
    .not('cartao_id', 'is', null)
    .gte('data', dataHoje); // ← busca todas (pagas e não pagas) a partir de hoje

  if (error) console.error('Erro ao buscar transações cartão:', error.message);
  return (data as Transacao[]) ?? [];
}

export function useCartoes(grupoId: string) {
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [transacoesCartao, setTransacoesCartao] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!grupoId) { setCarregando(false); return; }
    setCarregando(true);
    try {
      const [c, t] = await Promise.all([
        cartoesService.buscarPorGrupo(grupoId),
        buscarTodasTransacoesCartao(grupoId),
      ]);
      setCartoes(c);
      setTransacoesCartao(t);
    } catch (e) {
      console.error('Erro useCartoes:', e);
    } finally {
      setCarregando(false);
    }
  }, [grupoId]);

  useEffect(() => { carregar(); }, [carregar]);

  function obterResumos(): CartaoResumo[] {
    return cartoesService.calcularResumos(cartoes, transacoesCartao);
  }

  // Compatibilidade com dashboard
  function obterResumosCom(_t: Transacao[], _m: number, _a: number): CartaoResumo[] {
    return cartoesService.calcularResumos(cartoes, transacoesCartao);
  }

  return { cartoes, carregando, recarregar: carregar, obterResumos, obterResumosCom };
}
