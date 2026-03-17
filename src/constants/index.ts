// src/constants/index.ts

import { Categoria } from '../types';
import { Colors } from '../theme';

export const CATEGORIAS: Categoria[] = [
  { id: 'compras',       label: 'Compras',       icon: 'ShoppingBag',    cor: '#8E44AD' },
  { id: 'comida',        label: 'Comida',        icon: 'Utensils',       cor: '#E67E22' },
  { id: 'mercado',       label: 'Mercado',       icon: 'ShoppingCart',   cor: '#27AE60' },
  { id: 'transporte',    label: 'Transporte',    icon: 'Car',            cor: '#2980B9' },
  { id: 'combustivel',   label: 'Combustível',   icon: 'Fuel',           cor: '#D35400' },
  { id: 'casa',          label: 'Casa',          icon: 'Home',           cor: '#16A085' },
  { id: 'saude',         label: 'Saúde',         icon: 'Heart',          cor: '#E74C3C' },
  { id: 'lazer',         label: 'Lazer',         icon: 'Gamepad2',       cor: '#9B59B6' },
  { id: 'contas',        label: 'Contas',        icon: 'FileText',       cor: '#2C3E50' },
  { id: 'educacao',      label: 'Educação',      icon: 'BookOpen',       cor: '#1ABC9C' },
  { id: 'viagem',        label: 'Viagem',        icon: 'Plane',          cor: '#3498DB' },
  { id: 'beleza',        label: 'Beleza',        icon: 'Sparkles',       cor: '#E91E8C' },
  { id: 'eletronicos',   label: 'Eletrônicos',   icon: 'Smartphone',     cor: '#607D8B' },
  { id: 'pet',           label: 'Pet',           icon: 'PawPrint',       cor: '#795548' },
  { id: 'presente',      label: 'Presente',      icon: 'Gift',           cor: '#F06292' },
  { id: 'restaurante',   label: 'Restaurante',   icon: 'UtensilsCrossed',cor: '#FF5722' },
  { id: 'academia',      label: 'Academia',      icon: 'Dumbbell',       cor: '#4CAF50' },
  { id: 'streaming',     label: 'Streaming',     icon: 'Tv',             cor: '#673AB7' },
  { id: 'renda',         label: 'Renda',         icon: 'TrendingUp',     cor: '#27AE60' },
  { id: 'outros',        label: 'Outros',        icon: 'MoreHorizontal', cor: '#95A5A6' },
];

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export const MESES_CURTOS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
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
