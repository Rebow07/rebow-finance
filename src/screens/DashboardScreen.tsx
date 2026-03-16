    import React from 'react';
    import {
    View, Text, FlatList, TouchableOpacity,
    StyleSheet, ActivityIndicator, RefreshControl
    } from 'react-native';
    import { SafeAreaView } from 'react-native-safe-area-context';
    import { Plus, RefreshCw, BarChart2 } from 'lucide-react-native';
    import { useNavigation } from '@react-navigation/native';
    import { NativeStackNavigationProp } from '@react-navigation/native-stack';
    import { useApp } from '../context/AppContext';
    import { useTransacoes, calcularResumo } from '../hooks/useTransacoes';
    import TransacaoItem from '../components/TransacaoItem';
    import CircularProgress from '../components/CircularProgress';
    import { formatarMoeda, formatarMesCompleto } from '../utils';
    import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';
    import { RootStackParamList } from '../navigation';

    type Nav = NativeStackNavigationProp<RootStackParamList>;

    export default function DashboardScreen() {
    const nav = useNavigation<Nav>();
    const { grupo, grupoId, mesSelecionado, anoSelecionado, orcamentoMensal } = useApp();
    const { transacoes, carregando, recarregar } = useTransacoes({
        grupoId, mes: mesSelecionado, ano: anoSelecionado,
    });
    const resumo = calcularResumo(transacoes, orcamentoMensal);

    const Header = () => (
        <View>
        {/* Topo */}
        <View style={s.header}>
            <View>
            <Text style={s.grupoLabel}>Grupo</Text>
            <Text style={s.grupoNome}>{grupo?.nome ?? 'Carregando...'}</Text>
            </View>
            <TouchableOpacity style={s.addBtn} onPress={() => nav.navigate('NovaTransacao', {})}>
            <Plus size={22} color={Colors.textPrimary} strokeWidth={2.5} />
            </TouchableOpacity>
        </View>

        {/* Mês */}
        <Text style={s.mesLabel}>{formatarMesCompleto(mesSelecionado, anoSelecionado)}</Text>

        {/* Card Resumo */}
        <View style={s.resumoCard}>
            <View style={s.resumoLeft}>
            <View style={s.resumoRow}>
                <Text style={s.resumoItemLabel}>Despesas</Text>
                <Text style={[s.resumoItemValor, { color: Colors.despesa }]}>
                -{formatarMoeda(resumo.totalDespesas)}
                </Text>
            </View>
            <View style={[s.resumoRow, { marginTop: 8 }]}>
                <Text style={s.resumoItemLabel}>Rendas</Text>
                <Text style={[s.resumoItemValor, { color: Colors.renda }]}>
                +{formatarMoeda(resumo.totalRendas)}
                </Text>
            </View>
            <View style={s.divider} />
            <View style={s.resumoRow}>
                <Text style={s.saldoLabel}>Saldo</Text>
                <Text style={[s.saldoValor, { color: resumo.saldo >= 0 ? Colors.renda : Colors.despesa }]}>
                {formatarMoeda(resumo.saldo)}
                </Text>
            </View>
            </View>
            <CircularProgress percentual={resumo.percentualGasto} tamanho={110} />
        </View>

        {/* Atalhos */}
        <View style={s.atalhos}>
            <TouchableOpacity style={s.atalhoBtn} onPress={() => nav.navigate('NovaTransacao', { tipo: 'despesa' })}>
            <Plus size={18} color={Colors.textPrimary} />
            <Text style={s.atalhoText}>Lançar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.atalhoBtn} onPress={() => nav.navigate('RepetirGasto')}>
            <RefreshCw size={18} color={Colors.textPrimary} />
            <Text style={s.atalhoText}>Repetir</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.atalhoBtn, { backgroundColor: Colors.primaryLight }]}
            onPress={() => {}}>
            <BarChart2 size={18} color={Colors.primaryDark} />
            <Text style={[s.atalhoText, { color: Colors.primaryDark }]}>Relatórios</Text>
            </TouchableOpacity>
        </View>

        <Text style={s.secaoTitulo}>Últimas transações</Text>
        </View>
    );

    return (
        <SafeAreaView style={s.safe} edges={['top']}>
        {carregando && transacoes.length === 0 ? (
            <View style={s.loading}>
            <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        ) : (
            <FlatList
                    data={resumo.transacoesRecentes}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => <TransacaoItem transacao={item} />}
                    ListHeaderComponent={Header}
                    ListEmptyComponent={
                        <Text style={s.vazio}>Nenhuma transação este mês.</Text>
                    }
                    refreshControl={
                        <RefreshControl refreshing={carregando} onRefresh={recarregar} tintColor={Colors.primary} />
                    }
                    contentContainerStyle={{ paddingBottom: 32 }}
                    showsVerticalScrollIndicator={false}
                    />
                )}
                </SafeAreaView>
            );
            }

    const s = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.background },
    loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    },
    grupoLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
    grupoNome: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
    addBtn: {
        width: 44, height: 44, borderRadius: BorderRadius.full,
        backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
        ...Shadow.sm,
    },
    mesLabel: {
        fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium,
        paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
    },
    resumoCard: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: Colors.textPrimary, marginHorizontal: Spacing.md,
        borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
        ...Shadow.md,
    },
    resumoLeft: { flex: 1 },
    resumoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resumoItemLabel: { fontSize: FontSize.sm, color: '#AAA', fontWeight: FontWeight.medium },
    resumoItemValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
    divider: { height: 1, backgroundColor: '#333', marginVertical: 10 },
    saldoLabel: { fontSize: FontSize.md, color: '#CCC', fontWeight: FontWeight.semiBold },
    saldoValor: { fontSize: FontSize.xl, fontWeight: FontWeight.extraBold },
    atalhos: {
        flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 10, marginBottom: Spacing.lg,
    },
    atalhoBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: Colors.surface, borderRadius: BorderRadius.md,
        paddingVertical: 12, borderWidth: 1, borderColor: Colors.border,
    },
    atalhoText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
    secaoTitulo: {
        fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary,
        paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
    },
    vazio: {
        textAlign: 'center', color: Colors.textMuted, marginTop: 40, fontSize: FontSize.md,
    },
    });