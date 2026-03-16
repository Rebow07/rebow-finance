// src/services/cache.service.ts

import AsyncStorage from '@react-native-async-storage/async-storage';

export const cacheService = {
  async salvar<T>(chave: string, dados: T): Promise<void> {
    try {
      const payload = JSON.stringify({ dados, timestamp: Date.now() });
      await AsyncStorage.setItem(chave, payload);
    } catch {
      // Falha silenciosa no cache
    }
  },

  async carregar<T>(chave: string, maxIdadeMs = 5 * 60 * 1000): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(chave);
      if (!raw) return null;

      const { dados, timestamp } = JSON.parse(raw);
      const idade = Date.now() - timestamp;

      if (idade > maxIdadeMs) return null;
      return dados as T;
    } catch {
      return null;
    }
  },

  async limpar(chave: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(chave);
    } catch {
      // Falha silenciosa
    }
  },

  async salvarOrcamento(grupoId: string, valor: number): Promise<void> {
    await this.salvar(`orcamento_${grupoId}`, valor);
  },

  async carregarOrcamento(grupoId: string): Promise<number | null> {
    return this.carregar<number>(`orcamento_${grupoId}`, Infinity);
  },
};
