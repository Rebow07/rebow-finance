// src/types/index.ts

export interface Grupo {
  id: string;
  nome: string;
  criado_em?: string;
  created_at?: string;
}

export type TipoTransacao = 'despesa' | 'renda';

export interface Transacao {
  id: string;
  grupo_id: string;
  criado_por: string;
  titulo: string;
  valor: number;
  categoria: string;
  tipo: TipoTransacao;
  data: string;
  fixo: boolean;
  parcelado: boolean;
}

export interface TransacaoInsert {
  grupo_id: string;
  criado_por: string;
  titulo: string;
  valor: number;
  categoria: string;
  tipo: TipoTransacao;
  data: string;
  fixo: boolean;
  parcelado: boolean;
}

export interface Categoria {
  id: string;
  label: string;
  icon: string;
  cor: string;
}

export interface DashboardResumo {
  totalDespesas: number;
  totalRendas: number;
  saldo: number;
  orcamentoMensal: number;
  percentualGasto: number;
  transacoesRecentes: Transacao[];
}

export interface RelatorioPorCategoria {
  categoria: string;
  total: number;
  percentual: number;
  quantidade: number;
}

export interface FiltroTransacao {
  grupoId: string;
  mes: number;
  ano: number;
  tipo?: TipoTransacao;
}

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload {
  eventType: RealtimeEvent;
  new: Partial<Transacao>;
  old: Partial<Transacao>;
}
