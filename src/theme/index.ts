// src/theme/index.ts

export const Colors = {
  primary: '#FFD54F',
  primaryDark: '#FFC107',
  primaryLight: '#FFF8E1',
  background: '#FFFFFF',
  surface: '#FAFAFA',
  cardBg: '#FFFFFF',

  textPrimary: '#1A1A1A',
  textSecondary: '#666666',
  textMuted: '#999999',
  textInverse: '#FFFFFF',

  despesa: '#E74C3C',
  despesaLight: '#FDEDEC',
  renda: '#27AE60',
  rendaLight: '#EAFAF1',

  border: '#EFEFEF',
  borderStrong: '#E0E0E0',
  divider: '#F5F5F5',

  shadow: 'rgba(0,0,0,0.06)',
  shadowMedium: 'rgba(0,0,0,0.10)',
  overlay: 'rgba(0,0,0,0.4)',

  // Categorias
  cat_compras: '#8E44AD',
  cat_comida: '#E67E22',
  cat_mercado: '#27AE60',
  cat_transporte: '#2980B9',
  cat_combustivel: '#D35400',
  cat_casa: '#16A085',
  cat_saude: '#E74C3C',
  cat_lazer: '#9B59B6',
  cat_contas: '#2C3E50',
  cat_renda: '#27AE60',
  cat_outros: '#95A5A6',
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 32,
  display: 40,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semiBold: '600' as const,
  bold: '700' as const,
  extraBold: '800' as const,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export const Shadow = {
  sm: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
