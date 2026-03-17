// src/services/rendas.service.ts

import { supabase } from '../supabase/client';
import { Renda, RendaInsert } from '../types';

export const rendasService = {
  async buscarPorGrupo(grupoId: string): Promise<Renda[]> {
    const { data, error } = await supabase
      .from('rendas')
      .select('*')
      .eq('grupo_id', grupoId)
      .eq('ativo', true)
      .order('criado_em', { ascending: false });

    if (error) throw new Error(`Erro ao buscar rendas: ${error.message}`);
    return (data as Renda[]) ?? [];
  },

  async inserir(renda: RendaInsert): Promise<Renda> {
    const { data, error } = await supabase
      .from('rendas')
      .insert(renda)
      .select()
      .single();

    if (error) throw new Error(`Erro ao inserir renda: ${error.message}`);
    return data as Renda;
  },

  async atualizar(id: string, campos: Partial<RendaInsert>): Promise<Renda> {
    const { data, error } = await supabase
      .from('rendas')
      .update(campos)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(`Erro ao atualizar renda: ${error.message}`);
    return data as Renda;
  },

  async desativar(id: string): Promise<void> {
    const { error } = await supabase
      .from('rendas')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw new Error(`Erro ao desativar renda: ${error.message}`);
  },

  calcularTotal(rendas: Renda[]): number {
    return rendas.reduce((acc, r) => acc + r.valor, 0);
  },
};
