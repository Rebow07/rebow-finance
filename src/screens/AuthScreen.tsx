// src/screens/AuthScreen.tsx

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react-native';
import { supabase } from '../supabase/client';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow } from '../theme';

type Modo = 'login' | 'cadastro' | 'recuperar';

export default function AuthScreen() {
  const [modo, setModo] = useState<Modo>('login');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [nomeGrupo, setNomeGrupo] = useState('');
  const [codigoGrupo, setCodigoGrupo] = useState('');
  const [tipoEntrada, setTipoEntrada] = useState<'criar' | 'entrar'>('entrar');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);

  // ── Login ────────────────────────────────
  async function handleLogin() {
    if (!email.trim() || !senha) return Alert.alert('Atenção', 'Preencha email e senha.');
    setCarregando(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: senha,
      });
      if (error) throw error;
      // O AppContext detecta a sessão automaticamente via onAuthStateChange
    } catch (e: any) {
      Alert.alert('Erro ao entrar', traduzirErro(e.message));
    } finally {
      setCarregando(false);
    }
  }

  // ── Cadastro ─────────────────────────────
  async function handleCadastro() {
    if (!email.trim()) return Alert.alert('Atenção', 'Informe seu email.');
    if (senha.length < 6) return Alert.alert('Atenção', 'A senha deve ter ao menos 6 caracteres.');
    if (senha !== confirmarSenha) return Alert.alert('Atenção', 'As senhas não coincidem.');

    if (tipoEntrada === 'criar' && !nomeGrupo.trim())
      return Alert.alert('Atenção', 'Informe o nome do seu grupo familiar.');
    if (tipoEntrada === 'entrar' && !codigoGrupo.trim())
      return Alert.alert('Atenção', 'Informe o ID do grupo para entrar.');

    setCarregando(true);
    try {
      // 1. Cria o usuário
        const { data, error } = await supabase.auth.signUp({
          email: email.trim().toLowerCase(),
          password: senha,
          options: {
            // Isso garante que se ele clicar no email pelo celular, o app abre direto
            emailRedirectTo: 'exp://localhost:8081', 
          },
        }); 
      if (error) throw error;
      if (!data.user) throw new Error('Usuário não criado.');

      const userId = data.user.id;

      if (tipoEntrada === 'criar') {
        // 2a. Cria o grupo (insert direto ainda sem RLS de membro)
        const { data: grupo, error: erroGrupo } = await supabase
          .from('grupos')
          .insert({ nome: nomeGrupo.trim() })
          .select()
          .single();
        if (erroGrupo) throw erroGrupo;

        // 3a. Vincula via função SECURITY DEFINER (ignora RLS)
        const { error: erroMembro } = await supabase.rpc('inserir_membro', {
          p_user_id: userId,
          p_grupo_id: grupo.id,
        });
        if (erroMembro) throw erroMembro;

      } else {
        // 2b. Verifica se o grupo existe
        const { data: grupo, error: erroGrupo } = await supabase
          .from('grupos')
          .select('id, nome')
          .eq('id', codigoGrupo.trim())
          .single();
        if (erroGrupo || !grupo)
          throw new Error('Grupo não encontrado. Verifique o ID informado.');

        // 3b. Vincula via função SECURITY DEFINER (ignora RLS)
        const { error: erroMembro } = await supabase.rpc('inserir_membro', {
          p_user_id: userId,
          p_grupo_id: grupo.id,
        });
        if (erroMembro) throw erroMembro;
      }

      Alert.alert(
        '✅ Conta criada!',
        'Verifique seu email para confirmar o cadastro antes de entrar.',
        [{ text: 'OK', onPress: () => setModo('login') }]
      );
    } catch (e: any) {
      Alert.alert('Erro no cadastro', traduzirErro(e.message));
    } finally {
      setCarregando(false);
    }
  }

  // ── Recuperar senha ──────────────────────
  async function handleRecuperar() {
    if (!email.trim()) return Alert.alert('Atenção', 'Informe seu email.');
    setCarregando(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim().toLowerCase(),
        { redirectTo: 'rebowfinance://reset-password' }
      );
      if (error) throw error;
      Alert.alert(
        '📧 Email enviado',
        'Verifique sua caixa de entrada para redefinir a senha.',
        [{ text: 'OK', onPress: () => setModo('login') }]
      );
    } catch (e: any) {
      Alert.alert('Erro', traduzirErro(e.message));
    } finally {
      setCarregando(false);
    }
  }

  function traduzirErro(msg: string): string {
    if (msg.includes('Invalid login credentials')) return 'Email ou senha incorretos.';
    if (msg.includes('Email not confirmed')) return 'Confirme seu email antes de entrar.';
    if (msg.includes('User already registered')) return 'Este email já está cadastrado.';
    if (msg.includes('Password should be at least')) return 'A senha deve ter ao menos 6 caracteres.';
    if (msg.includes('Unable to validate email')) return 'Email inválido.';
    return msg;
  }

  const handleSubmit = modo === 'login' ? handleLogin
    : modo === 'cadastro' ? handleCadastro
    : handleRecuperar;

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          {/* Logo */}
          <View style={s.logoArea}>
            <View style={s.logoCircle}>
              <Text style={s.logoEmoji}>💛</Text>
            </View>
            <Text style={s.logoTitulo}>Rebow Finance</Text>
            <Text style={s.logoSub}>Controle financeiro familiar</Text>
          </View>

          {/* Card */}
          <View style={s.card}>
            {/* Abas Login / Cadastro */}
            {modo !== 'recuperar' && (
              <View style={s.abas}>
                <TouchableOpacity
                  style={[s.aba, modo === 'login' && s.abaAtiva]}
                  onPress={() => setModo('login')}>
                  <Text style={[s.abaText, modo === 'login' && s.abaTextAtiva]}>Entrar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.aba, modo === 'cadastro' && s.abaAtiva]}
                  onPress={() => setModo('cadastro')}>
                  <Text style={[s.abaText, modo === 'cadastro' && s.abaTextAtiva]}>Criar conta</Text>
                </TouchableOpacity>
              </View>
            )}

            {modo === 'recuperar' && (
              <Text style={s.cardTitulo}>Recuperar senha</Text>
            )}

            {/* Email */}
            <Text style={s.label}>Email</Text>
            <View style={s.inputWrap}>
              <Mail size={18} color={Colors.textMuted} />
              <TextInput
                style={s.input}
                value={email}
                onChangeText={setEmail}
                placeholder="seu@email.com"
                placeholderTextColor={Colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Senha */}
            {modo !== 'recuperar' && (
              <>
                <Text style={s.label}>Senha</Text>
                <View style={s.inputWrap}>
                  <Lock size={18} color={Colors.textMuted} />
                  <TextInput
                    style={s.input}
                    value={senha}
                    onChangeText={setSenha}
                    placeholder="Mínimo 6 caracteres"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setMostrarSenha(v => !v)}>
                    {mostrarSenha
                      ? <EyeOff size={18} color={Colors.textMuted} />
                      : <Eye size={18} color={Colors.textMuted} />}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Confirmar senha (cadastro) */}
            {modo === 'cadastro' && (
              <>
                <Text style={s.label}>Confirmar senha</Text>
                <View style={s.inputWrap}>
                  <Lock size={18} color={Colors.textMuted} />
                  <TextInput
                    style={s.input}
                    value={confirmarSenha}
                    onChangeText={setConfirmarSenha}
                    placeholder="Repita a senha"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!mostrarSenha}
                    autoCapitalize="none"
                  />
                </View>

                {/* Tipo de entrada no grupo */}
                <Text style={s.label}>Grupo familiar</Text>
                <View style={s.tipoEntradaRow}>
                  <TouchableOpacity
                    style={[s.tipoBtn, tipoEntrada === 'entrar' && s.tipoBtnAtivo]}
                    onPress={() => setTipoEntrada('entrar')}>
                    <Text style={[s.tipoBtnText, tipoEntrada === 'entrar' && s.tipoBtnTextAtivo]}>
                      Entrar em grupo existente
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.tipoBtn, tipoEntrada === 'criar' && s.tipoBtnAtivo]}
                    onPress={() => setTipoEntrada('criar')}>
                    <Text style={[s.tipoBtnText, tipoEntrada === 'criar' && s.tipoBtnTextAtivo]}>
                      Criar novo grupo
                    </Text>
                  </TouchableOpacity>
                </View>

                {tipoEntrada === 'criar' ? (
                  <>
                    <Text style={s.labelSub}>Nome do grupo</Text>
                    <View style={s.inputWrap}>
                      <UserPlus size={18} color={Colors.textMuted} />
                      <TextInput
                        style={s.input}
                        value={nomeGrupo}
                        onChangeText={setNomeGrupo}
                        placeholder="Ex: Família Silva, Kelvin e Thaylla..."
                        placeholderTextColor={Colors.textMuted}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={s.labelSub}>ID do grupo</Text>
                    <View style={s.inputWrap}>
                      <UserPlus size={18} color={Colors.textMuted} />
                      <TextInput
                        style={s.input}
                        value={codigoGrupo}
                        onChangeText={setCodigoGrupo}
                        placeholder="Cole o ID do grupo aqui"
                        placeholderTextColor={Colors.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <Text style={s.dica}>
                      O ID do grupo está em Configurações → Grupo ativo
                    </Text>
                  </>
                )}
              </>
            )}

            {/* Botão principal */}
            <TouchableOpacity style={s.btn} onPress={handleSubmit} disabled={carregando}>
              {carregando
                ? <ActivityIndicator color={Colors.textPrimary} />
                : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={s.btnText}>
                      {modo === 'login' ? 'Entrar'
                        : modo === 'cadastro' ? 'Criar conta'
                        : 'Enviar email'}
                    </Text>
                    <ArrowRight size={18} color={Colors.textPrimary} strokeWidth={2.5} />
                  </View>
                )}
            </TouchableOpacity>

            {/* Links secundários */}
            {modo === 'login' && (
              <TouchableOpacity style={s.linkBtn} onPress={() => setModo('recuperar')}>
                <Text style={s.linkText}>Esqueci minha senha</Text>
              </TouchableOpacity>
            )}

            {modo === 'recuperar' && (
              <TouchableOpacity style={s.linkBtn} onPress={() => setModo('login')}>
                <Text style={s.linkText}>Voltar para o login</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  logoArea: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: Colors.textPrimary,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, ...Shadow.md,
  },
  logoEmoji: { fontSize: 36 },
  logoTitulo: { fontSize: FontSize.xxxl, fontWeight: FontWeight.extraBold, color: Colors.textPrimary },
  logoSub: { fontSize: FontSize.sm, color: Colors.primaryDark, marginTop: 4 },
  card: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadow.lg,
  },
  cardTitulo: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary, marginBottom: Spacing.md },
  abas: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  aba: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: BorderRadius.sm },
  abaAtiva: { backgroundColor: Colors.primary },
  abaText: { fontSize: FontSize.sm, fontWeight: FontWeight.semiBold, color: Colors.textSecondary },
  abaTextAtiva: { color: Colors.textPrimary },
  label: {
    fontSize: FontSize.sm, fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary, marginBottom: 8, marginTop: 4,
  },
  labelSub: {
    fontSize: FontSize.xs, fontWeight: FontWeight.semiBold,
    color: Colors.textSecondary, marginBottom: 6, marginTop: 2,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    backgroundColor: Colors.surface, marginBottom: Spacing.md,
  },
  input: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  tipoEntradaRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tipoBtn: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
    borderRadius: BorderRadius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  tipoBtnAtivo: { backgroundColor: Colors.primaryLight, borderColor: Colors.primaryDark },
  tipoBtnText: { fontSize: FontSize.xs, fontWeight: FontWeight.semiBold, color: Colors.textSecondary, textAlign: 'center' },
  tipoBtnTextAtivo: { color: Colors.primaryDark },
  dica: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: -8, marginBottom: 12 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: BorderRadius.lg,
    paddingVertical: 18, alignItems: 'center',
    marginTop: Spacing.sm, ...Shadow.md,
  },
  btnText: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  linkBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  linkText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
});
