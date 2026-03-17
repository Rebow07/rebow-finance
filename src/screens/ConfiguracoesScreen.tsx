// src/screens/ConfiguracoesScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, Switch, Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  Mail, DollarSign, Users, Info, Bell, 
  BellOff, Check, LogOut, Copy 
} from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useCartoes } from '../hooks/useCartoes';
import { formatarMoeda } from '../utils';
import { supabase } from '../supabase/client';
import { notificacoesService } from '../services/notificacoes.service';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { APP_CONFIG } from '../constants';

export default function ConfiguracoesScreen() {
  const { grupo, grupoId, orcamentoMensal, setOrcamentoMensal, usuario, sair } = useApp();
  const { cartoes } = useCartoes(grupoId);

  const [orcamento, setOrcamento] = useState(String(orcamentoMensal));
  const [email, setEmail] = useState(grupo?.email_relatorio ?? '');
  const [salvandoOrc, setSalvandoOrc] = useState(false);
  const [salvandoEmail, setSalvandoEmail] = useState(false);

  // Notificações
  const [notifAtivas, setNotifAtivas] = useState(false);
  const [agendando, setAgendando] = useState(false);
  const [qtdAgendadas, setQtdAgendadas] = useState(0);

  useEffect(() => {
    verificarNotificacoes();
  }, []);

  async function verificarNotificacoes() {
    const tem = await notificacoesService.temPermissao();
    setNotifAtivas(tem);
    if (tem) {
      const agendadas = await notificacoesService.listarAgendadas();
      setQtdAgendadas(agendadas.length);
    }
  }

  async function toggleNotificacoes(ativar: boolean) {
    if (!ativar) {
      Alert.alert(
        'Desativar notificações?',
        'Você não receberá mais lembretes de vencimento de cartão.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desativar',
            style: 'destructive',
            onPress: async () => {
              await notificacoesService.cancelarTodas();
              setNotifAtivas(false);
              setQtdAgendadas(0);
            },
          },
        ]
      );
      return;
    }

    setAgendando(true);
    try {
      const temPermissao = await notificacoesService.solicitarPermissao();
      if (!temPermissao) return;
      await notificacoesService.agendarParaTodos(cartoes);
      setNotifAtivas(true);
      const agendadas = await notificacoesService.listarAgendadas();
      setQtdAgendadas(agendadas.length);
      Alert.alert('✅ Notificações ativadas!', `${agendadas.length} lembrete(s) agendado(s) para seus ${cartoes.length} cartão(ões).`);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setAgendando(false);
    }
  }

  async function reagendarTodas() {
    setAgendando(true);
    try {
      await notificacoesService.agendarParaTodos(cartoes);
      const agendadas = await notificacoesService.listarAgendadas();
      setQtdAgendadas(agendadas.length);
      Alert.alert('✅ Refeito!', `${agendadas.length} notificação(ões) reagendada(s).`);
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setAgendando(false);
    }
  }

  async function salvarOrcamento() {
    const val = parseFloat(orcamento.replace(',', '.'));
    if (!val || val <= 0) return Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
    setSalvandoOrc(true);
    await setOrcamentoMensal(val);
    setSalvandoOrc(false);
    Alert.alert('✅ Salvo', 'Orçamento mensal atualizado!');
  }

  async function salvarEmail() {
    if (!email.trim() || !email.includes('@'))
      return Alert.alert('Email inválido', 'Digite um email válido.');
    setSalvandoEmail(true);
    try {
      const { error } = await supabase
        .from('grupos')
        .update({ email_relatorio: email.trim() })
        .eq('id', grupoId);
      if (error) throw error;
      Alert.alert('✅ Salvo', 'Email para relatório salvo!');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvandoEmail(false);
    }
  }

  function confirmarSair() {
    Alert.alert(
      'Sair da conta',
      'Deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: sair },
      ]
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.titulo}>Configurações</Text>

          {/* Grupo + conta */}
          <View style={s.card}>
          <View style={s.cardHeader}>
            <Users size={18} color={Colors.textSecondary} />
            <Text style={s.cardTitulo}>Meu Grupo Familiar</Text>
          </View>

          <Text style={s.grupoNome}>{grupo?.nome ?? 'Carregando...'}</Text>

          {/* NOVO: Bloco do Código de Convite */}
          <View style={s.codigoContainer}>
            <Text style={s.labelCodigo}>Código de Convite:</Text>
            <TouchableOpacity 
              style={s.codigoBadge} 
              onPress={() => {
                Clipboard.setString(grupo?.codigo_convite || '');
                Alert.alert('Copiado!', 'Código copiado para a área de transferência.');
              }}
            >
              <Text style={s.codigoTexto}>{grupo?.codigo_convite || '------'}</Text>
              <Copy size={14} color={Colors.primaryDark} />
            </TouchableOpacity>
            <Text style={s.ajudaCodigo}>
              Passe este código para sua família entrar no grupo.
            </Text>
          </View>

          {usuario?.email && (
            <Text style={[s.cardSub, { marginTop: 15, marginBottom: 0, fontSize: 12 }]}>
              Logado como: {usuario.email}
            </Text>
          )}
          </View>

        {/* Notificações */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            {notifAtivas
              ? <Bell size={18} color={Colors.primaryDark} />
              : <BellOff size={18} color={Colors.textSecondary} />}
            <Text style={s.cardTitulo}>Notificações de vencimento</Text>
          </View>
          <Text style={s.cardSub}>
            Receba lembretes 3 dias antes e no dia do vencimento de cada cartão.
          </Text>

          {cartoes.length === 0 ? (
            <View style={s.semCartaoAviso}>
              <Text style={s.semCartaoTexto}>
                Cadastre um cartão primeiro para ativar os lembretes.
              </Text>
            </View>
          ) : (
            <>
              <View style={s.notifToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.notifToggleLabel}>
                    {notifAtivas ? '🔔 Ativas' : '🔕 Desativadas'}
                  </Text>
                  {notifAtivas && qtdAgendadas > 0 && (
                    <Text style={s.notifQtd}>{qtdAgendadas} lembrete(s) agendado(s)</Text>
                  )}
                </View>
                <Switch
                  value={notifAtivas}
                  onValueChange={toggleNotificacoes}
                  disabled={agendando || cartoes.length === 0}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={notifAtivas ? Colors.primaryDark : '#FFF'}
                />
              </View>

              {notifAtivas && (
                <View style={s.cartoesNotifList}>
                  {cartoes.map(c => (
                    <View key={c.id} style={s.cartaoNotifRow}>
                      <View style={[s.cartaoNotifDot, { backgroundColor: c.cor }]} />
                      <Text style={s.cartaoNotifNome}>{c.nome}</Text>
                      <Text style={s.cartaoNotifDia}>
                        Vence dia {c.vencimento} — lembrete 3 dias antes
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {notifAtivas && (
                <TouchableOpacity style={s.reagendarBtn} onPress={reagendarTodas} disabled={agendando}>
                  <Check size={16} color={Colors.primaryDark} />
                  <Text style={s.reagendarText}>
                    {agendando ? 'Agendando...' : 'Reagendar todas'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        {/* Orçamento */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <DollarSign size={18} color={Colors.textSecondary} />
            <Text style={s.cardTitulo}>Orçamento Mensal</Text>
          </View>
          <Text style={s.cardSub}>
            Define o limite de gastos do mês. Usado no indicador circular da dashboard.
          </Text>
          <Text style={s.orcamentoAtual}>{formatarMoeda(orcamentoMensal)}</Text>
          <TextInput
            style={s.input} value={orcamento} onChangeText={setOrcamento}
            keyboardType="decimal-pad" placeholder="Ex: 3000,00"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity style={s.btn} onPress={salvarOrcamento} disabled={salvandoOrc}>
            <Text style={s.btnText}>{salvandoOrc ? 'Salvando...' : 'Salvar Orçamento'}</Text>
          </TouchableOpacity>
        </View>

        {/* Email */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Mail size={18} color={Colors.textSecondary} />
            <Text style={s.cardTitulo}>Email para Relatório</Text>
          </View>
          <Text style={s.cardSub}>
            Futuramente você receberá um relatório mensal completo neste email.
          </Text>
          <TextInput
            style={s.input} value={email} onChangeText={setEmail}
            keyboardType="email-address" autoCapitalize="none"
            placeholder="seu@email.com" placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity
            style={[s.btn, { backgroundColor: Colors.textPrimary }]}
            onPress={salvarEmail} disabled={salvandoEmail}>
            <Mail size={16} color="#FFF" />
            <Text style={[s.btnText, { color: '#FFF' }]}>
              {salvandoEmail ? 'Salvando...' : 'Salvar Email'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sobre */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Info size={18} color={Colors.textSecondary} />
            <Text style={s.cardTitulo}>Sobre o App</Text>
          </View>
          <Text style={s.cardSub}>Rebow Finance v{APP_CONFIG.APP_VERSION}</Text>
          <Text style={s.cardSub}>Controle financeiro familiar em tempo real.</Text>
        </View>

        {/* Sair */}
        <View style={s.card}>
          <TouchableOpacity
            style={[s.btn, { backgroundColor: Colors.despesa }]}
            onPress={confirmarSair}>
            <LogOut size={18} color="#FFF" />
            <Text style={[s.btnText, { color: '#FFF' }]}>Sair da conta</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.md, paddingBottom: 40 },
  titulo: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary, marginBottom: Spacing.lg },
  card: {
    backgroundColor: Colors.cardBg, borderRadius: BorderRadius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitulo: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  cardSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: 8, lineHeight: 20 },
  grupoNome: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  grupoId: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  notifToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  notifToggleLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  notifQtd: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  cartoesNotifList: {
    borderRadius: BorderRadius.md, overflow: 'hidden',
    borderWidth: 1, borderColor: Colors.border, marginBottom: 10,
  },
  cartaoNotifRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cartaoNotifDot: { width: 10, height: 10, borderRadius: 5 },
  cartaoNotifNome: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary, width: 100 },
  cartaoNotifDia: { flex: 1, fontSize: FontSize.xs, color: Colors.textMuted },
  reagendarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primaryDark, borderRadius: BorderRadius.md,
    paddingVertical: 10,
  },
  reagendarText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.primaryDark },
  semCartaoAviso: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  semCartaoTexto: { fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center' },
  orcamentoAtual: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.primary, marginBottom: 12 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.md,
    color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: 12,
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: BorderRadius.md,
    paddingVertical: 14, ...Shadow.sm,
  },
  btnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  codigoContainer: {
    marginTop: 15,
    padding: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  labelCodigo: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.bold,
    marginBottom: 5,
  },
  codigoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
  },
  codigoTexto: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extraBold,
    color: Colors.primaryDark,
    letterSpacing: 2,
  },
  ajudaCodigo: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
});
