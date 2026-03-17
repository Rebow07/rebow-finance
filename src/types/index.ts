// src/types/index.ts

export interface Grupo {
  id: string;
  nome: string;
  criado_em?: string;
  created_at?: string;
  email_relatorio?: string;
  codigo_convite?: string;
}

export type TipoTransacao = 'despesa' | 'renda';
export type FiltroTempo = 'mensal' | 'trimestral' | 'semestral' | 'anual';

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
  cartao_id?: string | null;
  parcela_grupo_id?: string | null;
  parcela_index?: number;
  pago?: boolean;
  pago_em?: string | null;
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
  cartao_id?: string | null;
  parcela_grupo_id?: string | null;
  parcela_index?: number;
  pago?: boolean;
  pago_em?: string | null;
}

export interface Renda {
  id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  valor: number;
  fixo: boolean;
  ativo: boolean;
  criado_em: string;
}

export interface RendaInsert {
  grupo_id: string;
  criado_por: string;
  nome: string;
  valor: number;
  fixo: boolean;
  ativo: boolean;
}

export interface Cartao {
  id: string;
  grupo_id: string;
  criado_por: string;
  nome: string;
  limite: number;
  vencimento: number;
  cor: string;
  ativo: boolean;
  criado_em: string;
}

export interface CartaoInsert {
  grupo_id: string;
  criado_por: string;
  nome: string;
  limite: number;
  vencimento: number;
  cor: string;
  ativo: boolean;
}

export interface CartaoResumo extends Cartao {
  totalGasto: number;
  disponivel: number;
  percentualUso: number;
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
