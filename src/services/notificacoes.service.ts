// src/services/notificacoes.service.ts

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { Cartao } from '../types';

// ─────────────────────────────────────────────
// CONFIGURAÇÃO GLOBAL
// Deve ser chamado no App.tsx antes de tudo
// ─────────────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
function proximoVencimento(diaVencimento: number): Date {
  const hoje = new Date();
  const diaHoje = hoje.getDate();
  const mes = hoje.getMonth();
  const ano = hoje.getFullYear();

  // Se o dia de vencimento ainda não passou neste mês
  if (diaVencimento >= diaHoje) {
    return new Date(ano, mes, diaVencimento, 9, 0, 0);
  }
  // Senão, agenda para o próximo mês
  return new Date(ano, mes + 1, diaVencimento, 9, 0, 0);
}

function identificadorNotificacao(cartaoId: string, tipo: 'alerta' | 'vencimento'): string {
  return `cartao_${cartaoId}_${tipo}`;
}

// ─────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────
export const notificacoesService = {

  // ── Solicita permissão ──────────────────────
  async solicitarPermissao(): Promise<boolean> {
    if (!Device.isDevice) {
      // Emulador/simulador — funciona parcialmente
      console.log('Notificações: rodando em emulador');
    }

    const { status: existente } = await Notifications.getPermissionsAsync();
    let status = existente;

    if (existente !== 'granted') {
      const { status: novo } = await Notifications.requestPermissionsAsync();
      status = novo;
    }

    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Ative as notificações nas configurações do dispositivo para receber lembretes de vencimento.',
      );
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('vencimentos', {
        name: 'Vencimentos de cartão',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD54F',
        sound: 'default',
      });
    }

    return true;
  },

  // ── Agenda notificações para um cartão ─────
  async agendarParaCartao(cartao: Cartao): Promise<void> {
    const temPermissao = await this.solicitarPermissao();
    if (!temPermissao) return;

    // Cancela notificações anteriores deste cartão
    await this.cancelarParaCartao(cartao.id);

    const vencimento = proximoVencimento(cartao.vencimento);
    const agora = new Date();

    // ── Notificação 3 dias antes ────────────
    const tresAntes = new Date(vencimento);
    tresAntes.setDate(tresAntes.getDate() - 3);
    tresAntes.setHours(9, 0, 0, 0);

    if (tresAntes > agora) {
      await Notifications.scheduleNotificationAsync({
        identifier: identificadorNotificacao(cartao.id, 'alerta'),
        content: {
          title: '⏰ Cartão vencendo em breve',
          body: `${cartao.nome} vence em 3 dias (dia ${cartao.vencimento}). Não esqueça de pagar!`,
          data: { cartaoId: cartao.id, tipo: 'alerta_vencimento' },
          sound: 'default',
        },
        trigger: {
          date: tresAntes,
          channelId: 'vencimentos',
        } as any,
      });
    }

    // ── Notificação no dia do vencimento ────
    if (vencimento > agora) {
      await Notifications.scheduleNotificationAsync({
        identifier: identificadorNotificacao(cartao.id, 'vencimento'),
        content: {
          title: '🚨 Fatura vencendo hoje!',
          body: `A fatura do ${cartao.nome} vence hoje (dia ${cartao.vencimento}). Pague para evitar juros!`,
          data: { cartaoId: cartao.id, tipo: 'vencimento' },
          sound: 'default',
        },
        trigger: {
          date: vencimento,
          channelId: 'vencimentos',
        } as any,
      });
    }
  },

  // ── Agenda para todos os cartões ───────────
  async agendarParaTodos(cartoes: Cartao[]): Promise<void> {
    const temPermissao = await this.solicitarPermissao();
    if (!temPermissao) return;

    for (const cartao of cartoes) {
      await this.agendarParaCartao(cartao);
    }
  },

  // ── Cancela notificações de um cartão ──────
  async cancelarParaCartao(cartaoId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(
      identificadorNotificacao(cartaoId, 'alerta')
    ).catch(() => {});
    await Notifications.cancelScheduledNotificationAsync(
      identificadorNotificacao(cartaoId, 'vencimento')
    ).catch(() => {});
  },

  // ── Cancela todas as notificações ──────────
  async cancelarTodas(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  },

  // ── Lista notificações agendadas (debug) ───
  async listarAgendadas(): Promise<Notifications.NotificationRequest[]> {
    return Notifications.getAllScheduledNotificationsAsync();
  },

  // ── Verifica se tem permissão ───────────────
  async temPermissao(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  },
};
