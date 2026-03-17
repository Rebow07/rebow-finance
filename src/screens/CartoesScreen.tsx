// src/screens/CartoesScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, Alert, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, X, Check, CreditCard, Edit2, Trash2, Info } from 'lucide-react-native';
import { useApp } from '../context/AppContext';
import { useCartoes } from '../hooks/useCartoes';
import { cartoesService, CORES_CARTAO } from '../services/cartoes.service';
import { CartaoResumo, Cartao } from '../types';
import { formatarMoeda } from '../utils';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
import { APP_CONFIG } from '../constants';

export default function CartoesScreen() {
  const { grupoId } = useApp();
  const { cartoes, carregando, recarregar, obterResumos } = useCartoes(grupoId);
  const resumos = obterResumos();

  const [modalVisivel, setModalVisivel] = useState(false);
  const [editando, setEditando] = useState<Cartao | null>(null);
  const [nome, setNome] = useState('');
  const [limite, setLimite] = useState('');
  const [vencimento, setVencimento] = useState('');
  const [corSelecionada, setCorSelecionada] = useState(CORES_CARTAO[0]);
  const [salvando, setSalvando] = useState(false);

  function abrirModal(cartao?: Cartao) {
    if (cartao) {
      setEditando(cartao);
      setNome(cartao.nome);
      setLimite(String(cartao.limite));
      setVencimento(String(cartao.vencimento));
      setCorSelecionada(cartao.cor);
    } else {
      setEditando(null);
      setNome(''); setLimite(''); setVencimento('');
      setCorSelecionada(CORES_CARTAO[0]);
    }
    setModalVisivel(true);
  }

  async function salvar() {
    if (!nome.trim()) return Alert.alert('Atenção', 'Informe o nome do cartão.');
    const limiteNum = parseFloat(limite.replace(',', '.'));
    if (!limiteNum || limiteNum <= 0) return Alert.alert('Atenção', 'Informe o limite.');
    const vencNum = parseInt(vencimento);
    if (!vencNum || vencNum < 1 || vencNum > 31) return Alert.alert('Atenção', 'Dia de vencimento deve ser entre 1 e 31.');

    setSalvando(true);
    try {
      if (editando) {
        await cartoesService.atualizar(editando.id, {
          nome: nome.trim(), limite: limiteNum, vencimento: vencNum, cor: corSelecionada,
        });
      } else {
        await cartoesService.inserir({
          grupo_id: grupoId,
          criado_por: APP_CONFIG.DEFAULT_USER_ID,
          nome: nome.trim(), limite: limiteNum,
          vencimento: vencNum, cor: corSelecionada, ativo: true,
        });
      }
      await recarregar();
      setModalVisivel(false);
      setEditando(null);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível salvar.');
    } finally { setSalvando(false); }
  }

  async function excluir(cartao: Cartao) {
    Alert.alert('Excluir Cartão', `Deseja excluir "${cartao.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir', style: 'destructive',
        onPress: async () => {
          try {
            await cartoesService.desativar(cartao.id);
            recarregar();
          } catch (e: any) {
            Alert.alert('Erro', e.message);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FlatList
        data={resumos}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={() => (
          <View>
            <View style={s.header}>
              <View>
                <Text style={s.titulo}>Cartões</Text>
                <Text style={s.subtitulo}>limites de seus cartões</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => abrirModal()}>
                <Plus size={22} color={Colors.textPrimary} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>
            <View style={s.infoCard}>
              <Info size={14} color={Colors.primaryDark} />
              <Text style={s.infoText}>
                Limite usado = todas as parcelas pendentes (data de hoje em diante). Ao adiantar ou excluir parcelas, o limite é liberado automaticamente.
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          !carregando ? (
            <View style={s.vazio}>
              <Text style={s.vazioEmoji}>💳</Text>
              <Text style={s.vazioTitulo}>Nenhum cartão cadastrado</Text>
              <Text style={s.vazioSub}>Toque no + para adicionar seu primeiro cartão</Text>
            </View>
          ) : (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          )
        )}
        renderItem={({ item }) => (
          <CartaoCard resumo={item} onEdit={() => abrirModal(item)} onDelete={() => excluir(item)} />
        )}
      />

      {/* Modal */}
      <Modal visible={modalVisivel} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modalSafe} edges={['top', 'bottom']}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { setModalVisivel(false); setEditando(null); }} style={s.closeBtn}>
              <X size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
            <Text style={s.modalTitulo}>{editando ? 'Editar Cartão' : 'Novo Cartão'}</Text>
            <TouchableOpacity onPress={salvar} style={s.saveBtn} disabled={salvando}>
              {salvando
                ? <ActivityIndicator size="small" color={Colors.textPrimary} />
                : <Check size={22} color={Colors.textPrimary} />}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.modalForm} keyboardShouldPersistTaps="handled">
            <View style={[s.cartaoPreview, { backgroundColor: corSelecionada }]}>
              <CreditCard size={28} color="#FFF" />
              <Text style={s.cartaoPreviewNome}>{nome || 'Meu Cartão'}</Text>
              <View style={s.cartaoPreviewBottom}>
                <Text style={s.cartaoPreviewLimite}>
                  Limite: {limite ? formatarMoeda(parseFloat(limite.replace(',', '.')) || 0) : 'R$ 0,00'}
                </Text>
                <Text style={s.cartaoPreviewVenc}>Vence dia {vencimento || '--'}</Text>
              </View>
            </View>

            <Text style={s.label}>Nome do Cartão</Text>
            <TextInput
              style={s.input} value={nome} onChangeText={setNome}
              placeholder="Ex: Nubank, Itaú, Inter..."
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Limite Total (R$)</Text>
            <TextInput
              style={[s.input, s.inputGrande]} value={limite} onChangeText={setLimite}
              keyboardType="decimal-pad" placeholder="0,00"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Dia do Vencimento</Text>
            <TextInput
              style={s.input} value={vencimento} onChangeText={setVencimento}
              keyboardType="number-pad" placeholder="Ex: 10"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={s.label}>Cor do Cartão</Text>
            <View style={s.coresGrid}>
              {CORES_CARTAO.map(cor => (
                <TouchableOpacity
                  key={cor}
                  style={[s.corBtn, { backgroundColor: cor },
                    corSelecionada === cor && s.corBtnSelecionada]}
                  onPress={() => setCorSelecionada(cor)}
                />
              ))}
            </View>

            <TouchableOpacity style={s.submitBtn} onPress={salvar} disabled={salvando}>
              <Text style={s.submitText}>
                {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Adicionar Cartão'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function CartaoCard({ resumo, onEdit, onDelete }: {
  resumo: CartaoResumo; onEdit: () => void; onDelete: () => void;
}) {
  const corStatus = resumo.percentualUso >= 90 ? Colors.despesa
    : resumo.percentualUso >= 70 ? '#F39C12'
    : Colors.renda;

  return (
    <View style={[cs.card, { borderLeftColor: resumo.cor, borderLeftWidth: 4 }]}>
      <View style={cs.cardHeader}>
        <View style={[cs.cardIcon, { backgroundColor: `${resumo.cor}20` }]}>
          <CreditCard size={20} color={resumo.cor} />
        </View>
        <View style={cs.cardInfo}>
          <Text style={cs.cardNome}>{resumo.nome}</Text>
          <Text style={cs.cardVenc}>Vence dia {resumo.vencimento}</Text>
        </View>
        <View style={cs.cardAcoes}>
          <TouchableOpacity onPress={onEdit} style={cs.acaoBtn}>
            <Edit2 size={15} color={Colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={cs.acaoBtn}>
            <Trash2 size={15} color={Colors.despesa} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={cs.valoresRow}>
        <View>
          <Text style={cs.valorLabel}>Gasto</Text>
          <Text style={[cs.valorNum, { color: Colors.despesa }]}>
            {formatarMoeda(resumo.totalGasto)}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={cs.valorLabel}>Uso</Text>
          <Text style={[cs.valorNum, { color: corStatus }]}>
            {Math.round(resumo.percentualUso)}%
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={cs.valorLabel}>Disponível</Text>
          <Text style={[cs.valorNum, { color: resumo.disponivel > 0 ? Colors.renda : Colors.despesa }]}>
            {formatarMoeda(resumo.disponivel)}
          </Text>
        </View>
      </View>

      <View style={cs.barraContainer}>
        <View style={[cs.barra, {
          width: `${resumo.percentualUso}%` as any,
          backgroundColor: corStatus,
        }]} />
      </View>
      <Text style={cs.limiteText}>Limite total: {formatarMoeda(resumo.limite)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  titulo: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  subtitulo: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  addBtn: {
    width: 44, height: 44, borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Shadow.sm,
  },
  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md, padding: 10, marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: FontSize.xs, color: Colors.primaryDark, lineHeight: 16 },
  vazio: { alignItems: 'center', paddingTop: 60 },
  vazioEmoji: { fontSize: 48, marginBottom: 12 },
  vazioTitulo: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: 6 },
  vazioSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: 32 },
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
  modalForm: { padding: Spacing.md, paddingBottom: 40 },
  cartaoPreview: {
    borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
    minHeight: 150, justifyContent: 'space-between', ...Shadow.md,
  },
  cartaoPreviewNome: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: '#FFF', marginTop: 8 },
  cartaoPreviewBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  cartaoPreviewLimite: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.9)', fontWeight: FontWeight.semiBold },
  cartaoPreviewVenc: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)' },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary, marginBottom: 8, marginTop: 4 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14, fontSize: FontSize.md,
    color: Colors.textPrimary, backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  inputGrande: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, textAlign: 'center' },
  coresGrid: { flexDirection: 'row', gap: 12, marginBottom: Spacing.lg, flexWrap: 'wrap' },
  corBtn: { width: 44, height: 44, borderRadius: 22 },
  corBtnSelecionada: { borderWidth: 3, borderColor: Colors.textPrimary },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 18, alignItems: 'center', ...Shadow.md,
  },
  submitText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});

const cs = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardBg, borderRadius: BorderRadius.md,
    marginHorizontal: Spacing.md, marginBottom: 12, padding: Spacing.md, ...Shadow.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  cardInfo: { flex: 1 },
  cardNome: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  cardVenc: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  cardAcoes: { flexDirection: 'row', gap: 4 },
  acaoBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  valoresRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  valorLabel: { fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: 2 },
  valorNum: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
  barraContainer: { height: 8, backgroundColor: Colors.border, borderRadius: 4, overflow: 'hidden', marginBottom: 6 },
  barra: { height: 8, borderRadius: 4 },
  limiteText: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'right' },
});
