// src/context/AppContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Grupo } from '../types';
import { gruposService } from '../services/grupos.service';
import { ORCAMENTO_PADRAO } from '../constants';
import { cacheService } from '../services/cache.service';

const DEFAULT_GRUPO_ID = process.env.EXPO_PUBLIC_DEFAULT_GRUPO_ID ?? '';

interface AppContextData {
  grupo: Grupo | null;
  grupoId: string;
  setGrupoId: (id: string) => void;
  mesSelecionado: number;
  setMesSelecionado: (mes: number) => void;
  anoSelecionado: number;
  setAnoSelecionado: (ano: number) => void;
  orcamentoMensal: number;
  setOrcamentoMensal: (valor: number) => void;
  carregandoGrupo: boolean;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export function AppProvider({ children }: { children: ReactNode }) {
  const hoje = new Date();
  const [grupoId, setGrupoIdState] = useState(DEFAULT_GRUPO_ID);
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());
  const [orcamentoMensal, setOrcamentoMensalState] = useState(ORCAMENTO_PADRAO);
  const [carregandoGrupo, setCarregandoGrupo] = useState(true);

  useEffect(() => {
    carregarGrupo();
    carregarOrcamento();
  }, [grupoId]);

  async function carregarGrupo() {
    if (!grupoId) { setCarregandoGrupo(false); return; }
    setCarregandoGrupo(true);

    // Tenta cache primeiro
    const cached = await cacheService.carregar<Grupo>(`grupo_${grupoId}`, Infinity);
    if (cached) setGrupo(cached);

    try {
      const g = await gruposService.buscarPorId(grupoId);
      if (g) {
        setGrupo(g);
        await cacheService.salvar(`grupo_${grupoId}`, g);
      }
    } catch {
      // Usa cache se disponível
    } finally {
      setCarregandoGrupo(false);
    }
  }

  async function carregarOrcamento() {
    const val = await cacheService.carregarOrcamento(grupoId);
    if (val !== null) setOrcamentoMensalState(val);
  }

  function setGrupoId(id: string) {
    setGrupoIdState(id);
    AsyncStorage.setItem('grupo_id_ativo', id);
  }

  async function setOrcamentoMensal(valor: number) {
    setOrcamentoMensalState(valor);
    await cacheService.salvarOrcamento(grupoId, valor);
  }

  return (
    <AppContext.Provider value={{
      grupo,
      grupoId,
      setGrupoId,
      mesSelecionado,
      setMesSelecionado,
      anoSelecionado,
      setAnoSelecionado,
      orcamentoMensal,
      setOrcamentoMensal,
      carregandoGrupo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
