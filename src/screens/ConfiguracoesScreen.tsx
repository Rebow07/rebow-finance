// src/screens/ConfiguracoesScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, DollarSign, Users, Info } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { formatarMoeda } from '../utils';
import { supabase } from '../supabase/client';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { APP_CONFIG } from '../constants';

export default function ConfiguracoesScreen() {
  const { grupo, grupoId, orcamentoMensal, setOrcamentoMensal } = useApp();
  const [orcamento, setOrcamento] = useState(String(orcamentoMensal));
  const [email, setEmail] = useState(grupo?.email_relatorio ?? '');
  const [salvandoOrc, setSalvandoOrc] = useState(false);
  const [salvandoEmail, setSalvandoEmail] = useState(false);

  async function salvarOrcamento() {
    const val = parseFloat(orcamento.replace(',', '.'));
    if (!val || val <= 0) return Alert.alert('Valor inválido', 'Digite um valor maior que zero.');
    setSalvandoOrc(true);
    await setOrcamentoMensal(val);
    setSalvandoOrc(false);
    Alert.alert('✅ Salvo', 'Orçamento mensal atualizado!');
  }

  async function salvarEmail() {
    if (!email.trim() || !email.includes('@')) {
      return Alert.alert('Email inválido', 'Digite um email válido.');
    }
    setSalvandoEmail(true);
    try {
      const { error } = await supabase
        .from('grupos')
        .update({ email_relatorio: email.trim() })
        .eq('id', grupoId);
      if (error) throw error;
      Alert.alert('✅ Salvo', 'Email para relatório salvo! Em breve você poderá receber relatórios mensais por email.');
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setSalvandoEmail(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <Text style={s.titulo}>Configurações</Text>

        {/* Grupo */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Users size={18} color={Colors.textSecondary} />
            <Text style={s.cardTitulo}>Grupo ativo</Text>
          </View>
          <Text style={s.grupoNome}>{grupo?.nome ?? 'Carregando...'}</Text>
          <Text style={s.grupoId} numberOfLines={1}>{grupoId}</Text>
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
            style={s.input}
            value={orcamento}
            onChangeText={setOrcamento}
            keyboardType="decimal-pad"
            placeholder="Ex: 3000,00"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity
            style={s.btn}
            onPress={salvarOrcamento}
            disabled={salvandoOrc}>
            <Text style={s.btnText}>
              {salvandoOrc ? 'Salvando...' : 'Salvar Orçamento'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Email para relatório */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Mail size={18} color={Colors.textSecondary} />
            <Text style={s.cardTitulo}>Email para Relatório</Text>
          </View>
          <Text style={s.cardSub}>
            Futuramente você receberá um relatório mensal completo neste email com todas as despesas, rendas e análises do mês.
          </Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="seu@email.com"
            placeholderTextColor={Colors.textMuted}
          />
          <TouchableOpacity
            style={[s.btn, { backgroundColor: Colors.textPrimary }]}
            onPress={salvarEmail}
            disabled={salvandoEmail}>
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
  orcamentoAtual: {
    fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold,
    color: Colors.primary, marginBottom: 12,
  },
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
});
