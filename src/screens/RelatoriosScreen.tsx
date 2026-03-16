        import React, { useState } from 'react';
        import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
        import { SafeAreaView } from 'react-native-safe-area-context';
        import { useApp } from '../context/AppContext';
        import { useTransacoes } from '../hooks/useTransacoes';
        import { useRelatorio } from '../hooks/useRelatorio';
        import { formatarMoeda, formatarPercentual } from '../utils';
        import { getCategoriaById } from '../constants';
        import CategoriaIcon from '../components/CategoriaIcon';
        import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';

        export default function RelatoriosScreen() {
        const { grupoId, mesSelecionado, anoSelecionado } = useApp();
        const [tipoAtivo, setTipoAtivo] = useState<'despesa' | 'renda'>('despesa');
        const { transacoes } = useTransacoes({ grupoId, mes: mesSelecionado, ano: anoSelecionado });
        const { relatorio } = useRelatorio(transacoes, tipoAtivo);

        const totalGeral = relatorio.reduce((acc, r) => acc + r.total, 0);

        return (
            <SafeAreaView style={s.safe} edges={['top']}>
            <FlatList
                data={relatorio}
                keyExtractor={item => item.categoria}
                ListHeaderComponent={() => (
                <View>
                    <Text style={s.titulo}>Relatórios</Text>
                    <View style={s.toggle}>
                    {(['despesa', 'renda'] as const).map(t => (
                        <TouchableOpacity key={t} style={[s.toggleBtn, tipoAtivo === t && s.toggleBtnActive]}
                        onPress={() => setTipoAtivo(t)}>
                        <Text style={[s.toggleText, tipoAtivo === t && s.toggleTextActive]}>
                            {t === 'despesa' ? 'Despesas' : 'Rendas'}
                        </Text>
                        </TouchableOpacity>
                    ))}
                    </View>
                    <View style={s.totalCard}>
                    <Text style={s.totalLabel}>Total de {tipoAtivo === 'despesa' ? 'Despesas' : 'Rendas'}</Text>
                    <Text style={[s.totalValor, { color: tipoAtivo === 'despesa' ? Colors.despesa : Colors.renda }]}>
                        {formatarMoeda(totalGeral)}
                    </Text>
                    </View>
                    <Text style={s.secao}>Por categoria</Text>
                </View>
                )}
                renderItem={({ item }) => {
                const cat = getCategoriaById(item.categoria);
                return (
                    <View style={s.catCard}>
                    <View style={[s.catIcon, { backgroundColor: `${cat.cor}18` }]}>
                        <CategoriaIcon iconName={cat.icon} cor={cat.cor} size={20} />
                    </View>
                    <View style={s.catInfo}>
                        <View style={s.catRow}>
                        <Text style={s.catNome}>{cat.label}</Text>
                        <Text style={[s.catValor, { color: tipoAtivo === 'despesa' ? Colors.despesa : Colors.renda }]}>
                            {formatarMoeda(item.total)}
                        </Text>
                        </View>
                        <View style={s.barContainer}>
                        <View style={[s.bar, { width: `${item.percentual}%`, backgroundColor: cat.cor }]} />
                        </View>
                        <Text style={s.catPerc}>{formatarPercentual(item.percentual)} · {item.quantidade} transações</Text>
                    </View>
                    </View>
                );
                }}
                ListEmptyComponent={<Text style={s.vazio}>Sem dados para exibir.</Text>}
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
            />
            </SafeAreaView>
        );
        }

        const s = StyleSheet.create({
        safe: { flex: 1, backgroundColor: Colors.background },
        titulo: { fontSize: FontSize.xxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary, padding: Spacing.md, paddingBottom: 8 },
        toggle: { flexDirection: 'row', marginHorizontal: Spacing.md, marginBottom: Spacing.md, backgroundColor: Colors.surface, borderRadius: BorderRadius.md, padding: 4, borderWidth: 1, borderColor: Colors.border },
        toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
        toggleBtnActive: { backgroundColor: Colors.primary },
        toggleText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
        toggleTextActive: { color: Colors.textPrimary },
        totalCard: { backgroundColor: Colors.textPrimary, margin: Spacing.md, borderRadius: BorderRadius.lg, padding: Spacing.lg, alignItems: 'center', ...Shadow.md },
        totalLabel: { fontSize: FontSize.sm, color: '#AAA', marginBottom: 6 },
        totalValor: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold },
        secao: { fontSize: FontSize.md, fontWeight: FontWeight.bold, paddingHorizontal: Spacing.md, marginBottom: 8 },
        catCard: { flexDirection: 'row', alignItems: 'center', marginHorizontal: Spacing.md, marginBottom: 10, backgroundColor: Colors.cardBg, borderRadius: BorderRadius.md, padding: Spacing.md, ...Shadow.sm },
        catIcon: { width: 44, height: 44, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
        catInfo: { flex: 1 },
        catRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
        catNome: { fontSize: FontSize.md, fontWeight: FontWeight.semiBold, color: Colors.textPrimary },
        catValor: { fontSize: FontSize.md, fontWeight: FontWeight.bold },
        barContainer: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginBottom: 4, overflow: 'hidden' },
        bar: { height: 6, borderRadius: 3 },
        catPerc: { fontSize: FontSize.xs, color: Colors.textMuted },
        vazio: { textAlign: 'center', color: Colors.textMuted, marginTop: 40 },
        });