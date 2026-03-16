// src/constants/index.ts

import { Categoria } from '../types';
import { Colors } from '../theme';

export const CATEGORIAS: Categoria[] = [
  { id: 'compras',     label: 'Compras',     icon: 'ShoppingBag',    cor: Colors.cat_compras },
  { id: 'comida',      label: 'Comida',      icon: 'Utensils',       cor: Colors.cat_comida },
  { id: 'mercado',     label: 'Mercado',     icon: 'ShoppingCart',   cor: Colors.cat_mercado },
  { id: 'transporte',  label: 'Transporte',  icon: 'Car',            cor: Colors.cat_transporte },
  { id: 'combustivel', label: 'Combustível', icon: 'Fuel',           cor: Colors.cat_combustivel },
  { id: 'casa',        label: 'Casa',        icon: 'Home',           cor: Colors.cat_casa },
  { id: 'saude',       label: 'Saúde',       icon: 'Heart',          cor: Colors.cat_saude },
  { id: 'lazer',       label: 'Lazer',       icon: 'Gamepad2',       cor: Colors.cat_lazer },
  { id: 'contas',      label: 'Contas',      icon: 'FileText',       cor: Colors.cat_contas },
  { id: 'renda',       label: 'Renda',       icon: 'TrendingUp',     cor: Colors.cat_renda },
  { id: 'outros',      label: 'Outros',      icon: 'MoreHorizontal', cor: Colors.cat_outros },
];

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const ORCAMENTO_PADRAO = 3000;

export const CACHE_KEYS = {
  TRANSACOES: (grupoId: string, mes: number, ano: number) =>
    `transacoes_${grupoId}_${ano}_${mes}`,
  GRUPO: (grupoId: string) => `grupo_${grupoId}`,
  ORCAMENTO: (grupoId: string) => `orcamento_${grupoId}`,
};

export const APP_CONFIG = {
  DEFAULT_USER_ID: 'ac031b0c-70a8-4eb9-97ed-5387982424eb',
  APP_VERSION: '1.0.0',
};

export function getCategoriaById(id: string): Categoria {
  return CATEGORIAS.find(c => c.id === id) ?? CATEGORIAS[CATEGORIAS.length - 1];
}
