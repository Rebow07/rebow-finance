// src/components/CategoriaIcon.tsx

import React from 'react';
import {
  ShoppingBag, Utensils, ShoppingCart, Car, Fuel,
  Home, Heart, Gamepad2, FileText, TrendingUp,
  MoreHorizontal, BookOpen, Plane, Sparkles, Smartphone,
  PawPrint, Gift, UtensilsCrossed, Dumbbell, Tv,
  LucideIcon,
} from 'lucide-react-native';

const ICON_MAP: Record<string, LucideIcon> = {
  ShoppingBag, Utensils, ShoppingCart, Car, Fuel,
  Home, Heart, Gamepad2, FileText, TrendingUp,
  MoreHorizontal, BookOpen, Plane, Sparkles, Smartphone,
  PawPrint, Gift, UtensilsCrossed, Dumbbell, Tv,
};

interface Props {
  iconName: string;
  cor: string;
  size?: number;
}

export default function CategoriaIcon({ iconName, cor, size = 24 }: Props) {
  const Icon = ICON_MAP[iconName] ?? MoreHorizontal;
  return <Icon size={size} color={cor} strokeWidth={2} />;
}
