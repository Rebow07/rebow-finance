// src/screens/RendasScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Switch, Alert, ActivityIndicator, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Check, TrendingUp, Edit2, Trash2 } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useRendas } from '../hooks/useRendas';
import { rendasService } from '../services/rendas.service';
import { Renda } from '../types';
import { formatarMoeda } from '../utils';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { APP_CONFIG } from '../constants';

export default function RendasScreen() {
  const { grupoId } = useApp();
  const { rendas, carregando, recarregar, totalRendas } = useRendas(grupoId);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [editando, setEditando] = useState<Renda | null>(null);
  const [nome, setNome] = useState('');
  const [valor, setValor] = useState('');
  const [fixo, setFixo] = useState(true);
  const [salvando, setSalvando] = useState(false);

  function abrirModal(renda?: Renda) {
    if (renda) {
      setEditando(renda);
      setNome(renda.nome);
      setValor(String(renda.valor));
      setFixo(renda.fixo);
    } else {
      setEditando(null);
      setNome('');
      setValor('');
      setFixo(true);
    }
    setModalVisivel(true);
  }

  function fecharModal() {
    setModalVisivel(false);
    setEditando(null);
    setNome('');
    setValor('');
    setFixo(true);
  }

  async function salvar() {
    if (!nome.trim()) return Alert.alert('Atenção', 'Informe o nome da renda.');
    const valorNum = parseFloat(valor.replace(',', '.'));
    if (!valorNum || valorNum <= 0) return Alert.alert('Atenção', 'Informe um valor válido.');

    setSalvando(true);
    try {
      if (editando) {
        await rendasService.atualizar(editando.id, { nome: nome.trim(), valor: valorNum, fixo });
      } else {
        await rendasService.inserir({
          grupo_id: grupoId,
          criado_por: APP_CONFIG.DEFAULT_USER_ID,
          nome: nome.trim(),
          valor: valorNum,
          fixo,
          ativo: true,
        });
      }
      await recarregar();
      fecharModal();
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(renda: Renda) {
    Alert.alert(
      'Excluir Renda',
      `Deseja excluir "${renda.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir', style: 'destructive',
          onPress: async () => {
            await rendasService.desativar(renda.id);
            recarregar();
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={rendas}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <View>
            {/* Header */}
            <View style={s.header}>
              <View>
                <Text style={s.titulo}>Rendas</Text>
                <Text style={s.subtitulo}>Gerencie suas fontes de renda</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => abrirModal()}>
                <Plus size={22} color={Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            {/* Card Total */}
            <View style={s.totalCard}>
              <View style={s.totalIcon}>
                <TrendingUp size={28} color={Colors.renda} />
              </View>
              <View>
                <Text style={s.totalLabel}>Total de Rendas</Text>
                <Text style={s.totalValor}>{formatarMoeda(totalRendas)}</Text>
              </View>
            </View>

            <Text style={s.secao}>
              {rendas.length} {rendas.length === 1 ? 'fonte' : 'fontes'} de renda
            </Text>
          </View>
        )}
        ListEmptyComponent={() => (
          !carregando ? (
            <View style={s.vazio}>
              <Text style={s.vazioemoji}>💰</Text>
              <Text style={s.vazioTitulo}>Nenhuma renda cadastrada</Text>
              <Text style={s.vazioSub}>Toque no + para adicionar sua primeira renda</Text>
            </View>
          ) : (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          )
        )}
        renderItem={({ item }) => (
          <View style={s.rendaCard}>
            <View style={s.rendaIconWrap}>
              <TrendingUp size={22} color={Colors.renda} />
            </View>
            <View style={s.rendaInfo}>
              <Text style={s.rendaNome}>{item.nome}</Text>
              <View style={s.rendaMeta}>
                {item.fixo && (
                  <View style={s.fixoBadge}>
                    <Text style={s.fixoText}>Fixo</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={s.rendaValor}>{formatarMoeda(item.valor)}</Text>
            <View style={s.rendaAcoes}>
              <TouchableOpacity onPress={() => abrirModal(item)} style={s.acaoBtn}>
                <Edit2 size={16} color={Colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => excluir(item)} style={s.acaoBtn}>
                <Trash2 size={16} color={Colors.despesa} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Modal Adicionar/Editar */}
      <Modal visible={modalVisivel} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={fecharModal} style={s.closeBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.modalTitulo}>{editando ? 'Editar Renda' : 'Nova Renda'}</Text>
            <TouchableOpacity onPress={salvar} style={s.saveBtn} disabled={salvando}>
              {salvando
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Check size={22} color={Colors.textPrimary} />}
            </TouchableOpacity>
          </View>

          <View style={s.modalForm}>
            <Text style={s.label}>Nome da Renda</Text>
            <TextInput
              style={s.input}
              value={nome}
              onChangeText={setNome}
              placeholder="Ex: Kelvin, Thaylla, Freelance..."
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Valor Mensal (R$)</Text>
            <TextInput
              style={[s.input, s.inputGrande]}
              value={valor}
              onChangeText={setValor}
              keyboardType="decimal-pad"
              placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={s.switchRow}>
              <View>
                <Text style={s.switchLabel}>Renda fixa</Text>
                <Text style={s.switchSub}>Recorrente todo mês</Text>
              </View>
              <Switch
                value={fixo}
                onValueChange={setFixo}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={fixo ? Colors.primaryDark : '#FFF'}
              />
            </View>

            <TouchableOpacity style={s.submitBtn} onPress={salvar} disabled={salvando}>
              <Text style={s.submitText}>
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Adicionar Renda'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  titulo: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  subtitulo: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.sm,
  },
  totalCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.rendaLight, borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing.md, padding: Spacing.lg, marginBottom: Spacing.md,
  },
  totalIcon: {
    width: 52, height: 52, borderRadius: BorderRadius.md,
    backgroundColor: `${Colors.renda}20`, alignItems: 'center', justifyContent: 'center',
  },
  totalLabel: { fontSize: FontSize.sm, color: Colors.renda, fontWeight: FontWeight.medium },
  totalValor: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.renda },
  secao: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary, paddingHorizontal: Spacing.md, marginBottom: 8,
  },
  rendaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.cardBg, borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md, marginBottom: 10,
    padding: Spacing.md, ...Shadow.sm,
  },
  rendaIconWrap: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: Colors.rendaLight, alignItems: 'center',
    justifyContent: 'center', marginRight: Spacing.md,
  },
  rendaInfo: { flex: 1 },
  rendaNome: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  rendaMeta: { flexDirection: 'row', marginTop: 4 },
  fixoBadge: {
    backgroundColor: Colors.primaryLight, paddingHorizontal: 8,
    paddingVertical: 2, borderRadius: BorderRadius.full,
  },
  fixoText: { fontSize: 10, color: Colors.primaryDark, fontWeight: FontWeight.semiBold },
  rendaValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.renda, marginRight: 8 },
  rendaAcoes: { flexDirection: 'row', gap: 4 },
  acaoBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  vazio: { alignItems: 'center', paddingTop: 60 },
  vazioemoji: { fontSize: 48, marginBottom: 12 },
  vazioTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 6 },
  vazioSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
  // Modal
  modalSafe: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  saveBtn: {
    width: 40, height: 40, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  modalTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  modalForm: { padding: Spacing.md },
  label: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary, marginBottom: 8, marginTop: 4,
  },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    fontSize: FontSize.md, color: Colors.textPrimary,
    backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  inputGrande: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing.lg,
  },
  switchLabel: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
  switchSub: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 18, alignItems: 'center', ...Shadow.md,
  },
  submitText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});
