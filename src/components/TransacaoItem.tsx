// src/components/TransacaoItem.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Transacao } from '../types';
import { getCategoriaById } from '../constants';
import { formatarMoeda, formatarData } from '../utils';
import { Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow } from '../theme';
import CategoriaIcon from './CategoriaIcon';

interface Props {
  transacao: Transacao;
  onPress?: (t: Transacao) => void;
  onLongPress?: (t: Transacao) => void;
}

export default function TransacaoItem({ transacao, onPress, onLongPress }: Props) {
  const categoria = getCategoriaById(transacao.categoria);
  const isDespesa = transacao.tipo === 'despesa';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(transacao)}
      onLongPress={() => onLongPress?.(transacao)}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: `${categoria.cor}18` }]}>
        <CategoriaIcon iconName={categoria.icon} cor={categoria.cor} size={20} />
      </View>

      <View style={styles.info}>
        <Text style={styles.titulo} numberOfLines={1}>
          {transacao.titulo}
        </Text>
        <View style={styles.metaRow}>
          <Text style={styles.categoriaLabel}>{categoria.label}</Text>
          {transacao.fixo && (
            <View style={styles.fixoBadge}>
              <Text style={styles.fixoText}>Fixo</Text>
            </View>
          )}
          {transacao.parcelado && (
            <View style={styles.parcelaBadge}>
              <Text style={styles.parcelaText}>Parcelado</Text>
            </View>
          )}
        </View>
        <Text style={styles.data}>{formatarData(transacao.data)}</Text>
      </View>

      <Text style={[styles.valor, { color: isDespesa ? Colors.despesa : Colors.renda }]}>
        {isDespesa ? '-' : '+'}{formatarMoeda(transacao.valor)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardBg,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.md,
    marginVertical: 4,
    ...Shadow.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  info: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  titulo: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semiBold,
    color: Colors.textPrimary,
    marginBottom: 3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  categoriaLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: FontWeight.medium,
  },
  data: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  fixoBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  fixoText: {
    fontSize: 10,
    color: Colors.primaryDark,
    fontWeight: FontWeight.semiBold,
  },
  parcelaBadge: {
    backgroundColor: '#EDE7F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  parcelaText: {
    fontSize: 10,
    color: '#6A1B9A',
    fontWeight: FontWeight.semiBold,
  },
  valor: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
  },
});
