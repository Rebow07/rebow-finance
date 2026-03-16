// src/hooks/useTransacoes.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { Transacao, FiltroTransacao, DashboardResumo } from '../types';
import { transacoesService } from '../services/transacoes.service';
import { cacheService } from '../services/cache.service';
import { supabase } from '../supabase/client';
import { CACHE_KEYS } from '../constants';

export function useTransacoes(filtro: FiltroTransacao) {
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const cacheKey = CACHE_KEYS.TRANSACOES(filtro.grupoId, filtro.mes, filtro.ano);

  const carregar = useCallback(async (usarCache = true) => {
    if (!filtro.grupoId) {
      setCarregando(false);
      return;
    }

    setErro(null);

    if (usarCache) {
      const cached = await cacheService.carregar<Transacao[]>(cacheKey, 3 * 60 * 1000);
      if (cached) {
        setTransacoes(cached);
        setCarregando(false);
      }
    }

    try {
      const dados = await transacoesService.buscarPorMes(filtro);
      setTransacoes(dados);
      await cacheService.salvar(cacheKey, dados);
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao carregar transações');
    } finally {
      setCarregando(false);
    }
  }, [filtro.grupoId, filtro.mes, filtro.ano, filtro.tipo]);

  useEffect(() => {
    if (!filtro.grupoId) return;

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`transacoes:grupo:${filtro.grupoId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transacoes',
          filter: `grupo_id=eq.${filtro.grupoId}`,
        },
        () => {
          carregar(false);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filtro.grupoId]);

  useEffect(() => {
    carregar(true);
  }, [carregar]);

  const resumo = calcularResumo(transacoes, 0);

  return {
    transacoes,
    carregando,
    erro,
    recarregar: () => carregar(false),
    resumo,
  };
}

export function calcularResumo(transacoes: Transacao[], orcamento: number): DashboardResumo {
  const totalDespesas = transacoes
    .filter(t => t.tipo === 'despesa')
    .reduce((acc, t) => acc + t.valor, 0);

  const totalRendas = transacoes
    .filter(t => t.tipo === 'renda')
    .reduce((acc, t) => acc + t.valor, 0);

  const saldo = totalRendas - totalDespesas;
  const base = orcamento > 0 ? orcamento : totalRendas > 0 ? totalRendas : 1;
  const percentualGasto = Math.min((totalDespesas / base) * 100, 100);

  return {
    totalDespesas,
    totalRendas,
    saldo,
    orcamentoMensal: orcamento,
    percentualGasto,
    transacoesRecentes: transacoes.slice(0, 10),
  };
}
