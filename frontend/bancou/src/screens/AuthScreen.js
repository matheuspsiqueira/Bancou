// src/screens/AuthScreen.js
// Ajuste 09/2026: ícone de olho trocado de emoji pros ícones reais do
// app (olho-aberto/olho-fechado). behavior do KeyboardAvoidingView no
// Android voltou pra undefined — o Android já resolve o teclado sozinho
// via adjustResize nativo (padrão do Expo); usar 'height' por cima disso
// causava a barra branca residual ao fechar o teclado. paddingBottom do
// ScrollView continua somando insets.bottom (isso é pra barra de
// navegação do Android, não tem relação com o teclado).
// Ajuste 09/2026 (2): cadastro não loga mais automaticamente — agora
// exige verificação de e-mail via link antes do primeiro login.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useKouAlert } from '../context/KouAlertContext';
import { API_URL, SITE_URL } from '../config';
import { Linking } from 'react-native';



// ─── Input com toggle de visibilidade ─────────────────────────────────────────
function Input({ label, secureTextEntry, ...props }) {
  const [visivel, setVisivel] = useState(false);
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.inputField}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={secureTextEntry && !visivel}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            style={styles.olhoBtn}
            onPress={() => setVisivel(v => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Image
              source={visivel
                ? require('../assets/icons/olho-aberto.png')
                : require('../assets/icons/olho-fechado.png')}
              style={styles.olhoIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Modal de documento (Termos / Privacidade) ────────────────────────────────
function ModalDocumento({ visivel, titulo, conteudo, onFechar }) {
  return (
    <Modal visible={visivel} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalDoc}>
          <View style={styles.modalDocHeader}>
            <Text style={styles.modalDocTitulo}>{titulo}</Text>
            <TouchableOpacity onPress={onFechar} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.modalDocFechar}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalDocScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.modalDocTexto}>{conteudo}</Text>
          </ScrollView>
          <TouchableOpacity style={styles.modalDocBotao} onPress={onFechar}>
            <Text style={styles.modalDocBotaoTexto}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}


// ─── Tela principal ───────────────────────────────────────────────────────────
export default function AuthScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const abaPadrao = route?.params?.tela === 'login' ? 1 : 0;
  const [abaAtiva, setAbaAtiva] = useState(abaPadrao);
  const { signIn } = useAuth();
  const { alertar } = useKouAlert();

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

  // Modais de documentos
  const [modalTermos, setModalTermos] = useState(false);
  const [modalPrivacidade, setModalPrivacidade] = useState(false);

  const handleCadastro = async () => {
    setErroCad('');
    if (!nomeCompleto || !usernameCad || !emailCad || !senhaCad || !confirmarSenha) {
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
      const res = await fetch(`${API_URL}/api/usuarios/registro/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_completo: nomeCompleto,
          username: usernameCad,
          email: emailCad,
          password: senhaCad,
          password2: confirmarSenha,
          aceito_termos: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msgs = Object.values(data).flat().join(' ');
        setErroCad(msgs);
        return;
      }

      // Cadastro não loga mais automaticamente — precisa confirmar o e-mail antes.
      setNomeCompleto('');
      setUsernameCad('');
      setEmailCad('');
      setSenhaCad('');
      setConfirmarSenha('');
      setAceitouTermos(false);

      alertar(
        'Verifique seu e-mail',
        'Enviamos um link de confirmação para o seu e-mail. Abra a mensagem e clique no link para ativar sua conta antes de fazer login.',
        [{ text: 'OK', onPress: () => setAbaAtiva(1) }],
        { pose: 'torcendo' }
      );
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
      const res = await fetch(`${API_URL}/api/usuarios/login/`, {
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

      

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.xl3, paddingBottom: insets.bottom + spacing.xl2 }]}
        keyboardShouldPersistTaps="handled"
      >

        {/* Logo */}
        <Text style={styles.logo}>Bancou<Text style={styles.ponto}>.</Text></Text>
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
                <Text
                  style={styles.termosLink}
                  onPress={() => Linking.openURL(`${SITE_URL}/termos/`)}
                >
                  Termos de Uso
                </Text>
                {' '}e a{' '}
                <Text
                  style={styles.termosLink}
                  onPress={() => Linking.openURL(`${SITE_URL}/privacidade/`)}
                >
                  Política de Privacidade
                </Text>
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

            <TouchableOpacity
              style={styles.esqueciBtn}
              onPress={() => navigation.navigate('RecuperarSenha')}
            >
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
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

  form: { gap: spacing.lg },
  inputWrapper: { gap: spacing.xs },
  inputLabel: {
    fontFamily: typography.medium,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#333355',
  },
  inputField: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontFamily: typography.regular,
    fontSize: fontSize.body,
    color: colors.text,
  },
  olhoBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  olhoIcon: { width: 18, height: 18 },

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

  esqueciBtn: { alignSelf: 'flex-end', marginTop: -spacing.sm },
  esqueciTexto: {
    fontFamily: typography.medium,
    fontSize: fontSize.caption,
    color: colors.primary,
  },

  erro: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.lives,
    textAlign: 'center',
    marginTop: -spacing.sm,
  },

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

  // Modal documento
  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end',
  },
  modalDoc: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl2,
    maxHeight: '85%',
  },
  modalDocHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalDocTitulo: {
    fontFamily: typography.bold,
    fontSize: fontSize.h2,
    color: colors.text,
  },
  modalDocFechar: {
    fontSize: 18,
    color: colors.textSecondary,
    fontFamily: typography.bold,
  },
  modalDocScroll: {
    marginBottom: spacing.xl,
  },
  modalDocTexto: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  modalDocBotao: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  modalDocBotaoTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.text,
  },
});