import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Animated,
} from 'react-native';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen({ navigation, route }) {
  const abaPadrao = route?.params?.tela === 'login' ? 1 : 0;
  const [abaAtiva, setAbaAtiva] = useState(abaPadrao);
  const { signIn } = useAuth();

  // Cadastro
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [usernameCad, setUsernameCad] = useState('');
  const [emailCad, setEmailCad] = useState('');
  const [senhaCad, setSenhaCad] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loadingCad, setLoadingCad] = useState(false);
  const [erroCad, setErroCad] = useState('');

  // Login
  const [emailLogin, setEmailLogin] = useState('');
  const [senhaLogin, setSenhaLogin] = useState('');
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [erroLogin, setErroLogin] = useState('');


  const API = 'https://beec-2804-14d-5c42-854e-45d1-5a0c-ce83-b4b1.ngrok-free.app';

  const handleCadastro = async () => {
    setErroCad('');
    if (!nomeCompleto || !usernameCad || !emailCad || !senhaCad) {
      setErroCad('Preencha todos os campos.');
      return;
    }
    if (senhaCad !== confirmarSenha) {
      setErroCad('As senhas não coincidem.');
      return;
    }
    if (!aceitouTermos) {
      setErroCad('Você precisa aceitar os termos para continuar.');
      return;
    }
    setLoadingCad(true);
    try {
      const res = await fetch(`${API}/api/usuarios/registro/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_completo: nomeCompleto,
          username: usernameCad,
          email: emailCad,
          password: senhaCad,
          aceito_termos: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = Object.values(data).flat().join(' ');
        setErroCad(msgs);
        return;
      }
      await signIn(data.access, data.refresh);
    } catch (e) {
      setErroCad('Erro de conexão. Tente novamente.');
    } finally {
      setLoadingCad(false);
    }
  };

  const handleLogin = async () => {
    setErroLogin('');
    if (!emailLogin || !senhaLogin) {
      setErroLogin('Preencha e-mail e senha.');
      return;
    }
    setLoadingLogin(true);
    try {
      const res = await fetch(`${API}/api/usuarios/login/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailLogin, password: senhaLogin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErroLogin('E-mail ou senha incorretos.');
        return;
      }
      await signIn(data.access, data.refresh);

    } catch (e) {
      setErroLogin('Erro de conexão. Tente novamente.');
    } finally {
      setLoadingLogin(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Logo */}
        <Text style={styles.logo}>Pontua<Text style={styles.ponto}>.</Text></Text>
        <Text style={styles.sub}>Sua aprovação começa aqui.</Text>

        {/* Abas */}
        <View style={styles.abas}>
          <TouchableOpacity
            style={[styles.aba, abaAtiva === 0 && styles.abaAtiva]}
            onPress={() => setAbaAtiva(0)}
          >
            <Text style={[styles.abaTexto, abaAtiva === 0 && styles.abaTextoAtivo]}>
              Criar conta
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.aba, abaAtiva === 1 && styles.abaAtiva]}
            onPress={() => setAbaAtiva(1)}
          >
            <Text style={[styles.abaTexto, abaAtiva === 1 && styles.abaTextoAtivo]}>
              Entrar
            </Text>
          </TouchableOpacity>
        </View>

        {/* CADASTRO */}
        {abaAtiva === 0 && (
          <View style={styles.form}>
            <Input
              label="Nome completo"
              value={nomeCompleto}
              onChangeText={setNomeCompleto}
              placeholder="Seu nome"
              autoCapitalize="words"
            />
            <Input
              label="Nome de usuário"
              value={usernameCad}
              onChangeText={setUsernameCad}
              placeholder="ex: joaosilva"
              autoCapitalize="none"
            />
            <Input
              label="E-mail"
              value={emailCad}
              onChangeText={setEmailCad}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Senha"
              value={senhaCad}
              onChangeText={setSenhaCad}
              placeholder="Mínimo 8 caracteres"
              secureTextEntry
            />
            <Input
              label="Confirmar senha"
              value={confirmarSenha}
              onChangeText={setConfirmarSenha}
              placeholder="Repita sua senha"
              secureTextEntry
            />

            {/* Termos */}
            <TouchableOpacity
              style={styles.termosRow}
              onPress={() => setAceitouTermos(!aceitouTermos)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, aceitouTermos && styles.checkboxAtivo]}>
                {aceitouTermos && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.termosTexto}>
                Li e aceito os{' '}
                <Text style={styles.termosLink}>Termos de Uso</Text>
                {' '}e a{' '}
                <Text style={styles.termosLink}>Política de Privacidade</Text>
              </Text>
            </TouchableOpacity>

            {erroCad ? <Text style={styles.erro}>{erroCad}</Text> : null}

            <TouchableOpacity
              style={[styles.botao, loadingCad && styles.botaoDisabled]}
              onPress={handleCadastro}
              disabled={loadingCad}
            >
              <Text style={styles.botaoTexto}>
                {loadingCad ? 'Criando conta...' : 'Criar conta'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* LOGIN */}
        {abaAtiva === 1 && (
          <View style={styles.form}>
            <Input
              label="E-mail"
              value={emailLogin}
              onChangeText={setEmailLogin}
              placeholder="seu@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Senha"
              value={senhaLogin}
              onChangeText={setSenhaLogin}
              placeholder="Sua senha"
              secureTextEntry
            />

            <TouchableOpacity style={styles.esqueciBtn}>
              <Text style={styles.esqueciTexto}>Esqueci minha senha</Text>
            </TouchableOpacity>

            {erroLogin ? <Text style={styles.erro}>{erroLogin}</Text> : null}

            <TouchableOpacity
              style={[styles.botao, loadingLogin && styles.botaoDisabled]}
              onPress={handleLogin}
              disabled={loadingLogin}
            >
              <Text style={styles.botaoTexto}>
                {loadingLogin ? 'Entrando...' : 'Entrar'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Divisor */}
        <View style={styles.divisorRow}>
          <View style={styles.divisorLinha} />
          <Text style={styles.divisorTexto}>ou</Text>
          <View style={styles.divisorLinha} />
        </View>

        {/* Experimentar */}
        <TouchableOpacity
          style={styles.botaoDemo}
          onPress={() => navigation.navigate('Demo')}
        >
          <Text style={styles.botaoDemoTexto}>🎮  Experimentar sem cadastro</Text>
        </TouchableOpacity>
        <Text style={styles.demoAviso}>10 questões gratuitas • sem salvar progresso</Text>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Componente de input reutilizável
function Input({ label, ...props }) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={colors.textSecondary}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl3,
    paddingBottom: spacing.xl2,
  },

  logo: {
    fontFamily: typography.black,
    fontSize: 42,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  ponto: { color: colors.streak },
  sub: {
    fontFamily: typography.regular,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl2,
  },

  // Abas
  abas: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.xl2,
  },
  aba: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  abaAtiva: { backgroundColor: colors.primary },
  abaTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  abaTextoAtivo: { color: colors.text },

  // Form
  form: { gap: spacing.lg },
  inputWrapper: { gap: spacing.xs },
  inputLabel: {
    fontFamily: typography.medium,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  input: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: typography.regular,
    fontSize: fontSize.body,
    color: colors.text,
    borderWidth: 1,
    borderColor: '#333355',
  },

  // Termos
  termosRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  checkboxAtivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.text,
    fontSize: 13,
    fontFamily: typography.bold,
  },
  termosTexto: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 20,
  },
  termosLink: {
    color: colors.primary,
    fontFamily: typography.medium,
  },

  // Esqueci senha
  esqueciBtn: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  esqueciTexto: {
    fontFamily: typography.medium,
    fontSize: fontSize.caption,
    color: colors.primary,
  },

  // Erro
  erro: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.lives,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },

  // Botão principal
  botao: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  botaoDisabled: { opacity: 0.6 },
  botaoTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.text,
  },

  // Divisor
  divisorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xl,
  },
  divisorLinha: { flex: 1, height: 1, backgroundColor: '#333355' },
  divisorTexto: {
    fontFamily: typography.regular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  // Demo
  botaoDemo: {
    borderWidth: 1.5,
    borderColor: '#333355',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  botaoDemoTexto: {
    fontFamily: typography.semibold,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  demoAviso: {
    fontFamily: typography.regular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
    opacity: 0.6,
  },
});