import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { Grupo, FiltroTempo } from '../types';
import { supabase } from '../supabase/client';
import { ORCAMENTO_PADRAO } from '../constants';
import { cacheService } from '../services/cache.service';

interface AppContextData {
  // Auth
  sessao: Session | null;
  usuario: User | null;
  carregandoAuth: boolean;
  sair: () => Promise<void>;

  // Grupo
  grupo: Grupo | null;
  grupoId: string;
  carregandoGrupo: boolean;

  // Período
  mesSelecionado: number;
  setMesSelecionado: (mes: number) => void;
  anoSelecionado: number;
  setAnoSelecionado: (ano: number) => void;

  // Orçamento
  orcamentoMensal: number;
  setOrcamentoMensal: (valor: number) => void;

  // Filtro dashboard
  filtroTempo: FiltroTempo;
  setFiltroTempo: (filtro: FiltroTempo) => void;
}

const AppContext = createContext<AppContextData>({} as AppContextData);

export function AppProvider({ children }: { children: ReactNode }) {
  const hoje = new Date();

  // Auth States
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregandoAuth, setCarregandoAuth] = useState(true);

  // Grupo States
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [grupoId, setGrupoId] = useState('');
  const [carregandoGrupo, setCarregandoGrupo] = useState(false);

  // Período States (Centraliza a data para todos os relatórios)
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth() + 1);
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // Orçamento State
  const [orcamentoMensal, setOrcamentoMensalState] = useState(ORCAMENTO_PADRAO);

  // Filtro Dashboard (Mensal, Trimestral...)
  const [filtroTempo, setFiltroTempo] = useState<FiltroTempo>('mensal');

  // ── 1. Gestão de Autenticação ──────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session);
      setCarregandoAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessao(session);
      setCarregandoAuth(false);

      if (!session) {
        setGrupo(null);
        setGrupoId('');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── 2. Fluxo de Dados: Usuário -> Grupo ────────
  useEffect(() => {
    if (sessao?.user) {
      carregarGrupoDoUsuario(sessao.user.id);
    }
  }, [sessao?.user?.id]);

  // ── 3. Fluxo de Dados: Grupo -> Orçamento ──────
  useEffect(() => {
    if (grupoId) carregarOrcamento();
  }, [grupoId]);

  // Função principal de carregamento (essencial para RLS e Segurança)
  async function carregarGrupoDoUsuario(userId: string) {
    setCarregandoGrupo(true);
    try {
      const { data, error } = await supabase
        .from('membros')
        .select('grupo_id, grupos(id, nome, email_relatorio, criado_em, codigo_convite)')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        console.warn('Usuário sem grupo vinculado');
        setCarregandoGrupo(false);
        return;
      }

      const grupoData = (data as any).grupos as Grupo;
      setGrupo(grupoData);
      setGrupoId(grupoData.id);

      // Persistência local para agilizar carregamentos futuros
      await cacheService.salvar(`grupo_${grupoData.id}`, grupoData);
    } catch (e) {
      console.error('Erro ao carregar grupo:', e);
    } finally {
      setCarregandoGrupo(false);
    }
  }

  async function carregarOrcamento() {
    const val = await cacheService.carregarOrcamento(grupoId);
    if (val !== null) setOrcamentoMensalState(val);
  }

  async function sair() {
    await supabase.auth.signOut();
  }

  async function setOrcamentoMensal(valor: number) {
    setOrcamentoMensalState(valor);
    await cacheService.salvarOrcamento(grupoId, valor);
    // Aqui você pode adicionar um update no Supabase futuramente
  }

  return (
    <AppContext.Provider value={{
      sessao,
      usuario: sessao?.user ?? null,
      carregandoAuth,
      sair,
      grupo,
      grupoId,
      carregandoGrupo,
      mesSelecionado, setMesSelecionado,
      anoSelecionado, setAnoSelecionado,
      orcamentoMensal, setOrcamentoMensal,
      filtroTempo, setFiltroTempo,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
