// src/hooks/useRelatorio.ts

import { useMemo } from 'react';
import { Transacao, RelatorioPorCategoria, TipoTransacao } from '../types';
import { getCategoriaById } from '../constants';

export function useRelatorio(transacoes: Transacao[], tipo: TipoTransacao) {
  const relatorio = useMemo((): RelatorioPorCategoria[] => {
    const filtradas = transacoes.filter(t => t.tipo === tipo);
    const total = filtradas.reduce((acc, t) => acc + t.valor, 0);

    const porCategoria: Record<string, { total: number; quantidade: number }> = {};

    for (const t of filtradas) {
      const cat = t.categoria ?? 'outros';
      if (!porCategoria[cat]) porCategoria[cat] = { total: 0, quantidade: 0 };
      porCategoria[cat].total += t.valor;
      porCategoria[cat].quantidade += 1;
    }

    return Object.entries(porCategoria)
      .map(([categoria, info]) => ({
        categoria,
        total: info.total,
        quantidade: info.quantidade,
        percentual: total > 0 ? (info.total / total) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);
  }, [transacoes, tipo]);

  return { relatorio };
}
