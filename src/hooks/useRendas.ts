// src/hooks/useRendas.ts

import { useState, useEffect, useCallback } from 'react';
import { Renda } from '../types';
import { rendasService } from '../services/rendas.service';

export function useRendas(grupoId: string) {
  const [rendas, setRendas] = useState<Renda[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregar = useCallback(async () => {
    if (!grupoId) { setCarregando(false); return; }
    setCarregando(true);
    try {
      const dados = await rendasService.buscarPorGrupo(grupoId);
      setRendas(dados);
    } catch {
      // erro silencioso
    } finally {
      setCarregando(false);
    }
  }, [grupoId]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalRendas = rendasService.calcularTotal(rendas);

  return { rendas, carregando, recarregar: carregar, totalRendas };
}
