// src/services/grupos.service.ts

import { supabase } from '../supabase/client';
import { Grupo } from '../types';

export const gruposService = {
  async buscarPorId(id: string): Promise<Grupo | null> {
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) return null;
    return data as Grupo;
  },

  async listar(): Promise<Grupo[]> {
    const { data, error } = await supabase
      .from('grupos')
      .select('*')
      .order('criado_em', { ascending: false });

    if (error) return [];
    return (data as Grupo[]) ?? [];
  },
};
