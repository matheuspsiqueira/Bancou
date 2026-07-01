import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, ScrollView, StatusBar, Modal,
} from 'react-native';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';
import { useAuth } from '../context/AuthContext';

const API = 'https://3c6d-2804-14d-5c42-854e-29f8-83b2-e255-2e7.ngrok-free.app';

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
            <Text style={styles.olhoIcon}>{visivel ? '🙈' : '👁️'}</Text>
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

// ─── Conteúdo dos documentos ──────────────────────────────────────────────────
const TERMOS_DE_USO = `Termos de Uso — Pontua
Última atualização: junho de 2025

1. ACEITAÇÃO DOS TERMOS
Ao criar uma conta no Pontua, você confirma que leu, entendeu e concorda com estes Termos de Uso. Se não concordar, não utilize o aplicativo.

2. DESCRIÇÃO DO SERVIÇO
O Pontua é uma plataforma gamificada de estudos para concursos públicos. Oferecemos questões de provas anteriores, sistema de pontuação, ranking e desafios diários para auxiliar na sua preparação.

3. ELEGIBILIDADE
Para criar uma conta, você deve ter pelo menos 13 anos de idade. Menores de 18 anos devem ter autorização de um responsável legal.

4. CONTA DE USUÁRIO
Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas na sua conta. Notifique-nos imediatamente sobre qualquer uso não autorizado.

5. CONTEÚDO E PROPRIEDADE INTELECTUAL
As questões disponibilizadas são de provas públicas e de domínio público, conforme legislação brasileira. O sistema de gamificação, design, mascote Ponts e marca Pontua são propriedade exclusiva do Pontua.

6. CONDUTA DO USUÁRIO
É proibido: usar mecanismos automáticos (bots) para responder questões; compartilhar credenciais de acesso; tentar manipular o sistema de ranking; publicar conteúdo ofensivo ou ilegal.

7. MODIFICAÇÕES DO SERVIÇO
Podemos modificar, suspender ou encerrar qualquer parte do serviço a qualquer momento, com aviso prévio de 30 dias para alterações substanciais.

8. LIMITAÇÃO DE RESPONSABILIDADE
O Pontua é uma ferramenta de estudo complementar. Não garantimos aprovação em concursos. O serviço é fornecido "como está", sem garantias de disponibilidade ininterrupta.

9. LEI APLICÁVEL
Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro da comarca do Rio de Janeiro/RJ para dirimir eventuais conflitos.

10. CONTATO
Dúvidas: suporte@pontua.app`;

const POLITICA_PRIVACIDADE = `Política de Privacidade — Pontua
Última atualização: junho de 2025

1. INTRODUÇÃO
Esta Política descreve como o Pontua coleta, usa e protege suas informações pessoais, em conformidade com a Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).

2. DADOS QUE COLETAMOS
• Dados de cadastro: nome completo, nome de usuário, e-mail e senha (armazenada de forma criptografada).
• Dados de uso: questões respondidas, pontuação, tempo de estudo, sequência de dias (streak).
• Dados do dispositivo: modelo, sistema operacional e identificador para envio de notificações (opcional).

3. COMO USAMOS SEUS DADOS
• Criar e gerenciar sua conta;
• Exibir seu progresso, ranking e conquistas;
• Enviar notificações de desafios e lembretes de estudo (se autorizado);
• Melhorar o aplicativo com base em padrões de uso agregados e anônimos.

4. COMPARTILHAMENTO DE DADOS
Não vendemos seus dados pessoais. Podemos compartilhar com:
• Prestadores de serviço essenciais (hospedagem, analytics) sob acordo de confidencialidade;
• Autoridades, quando exigido por lei.

5. RETENÇÃO DE DADOS
Seus dados são mantidos enquanto sua conta estiver ativa. Ao excluir a conta, os dados pessoais identificáveis são removidos em até 30 dias, exceto onde a lei exige retenção maior.

6. SEUS DIREITOS (LGPD)
Você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou desatualizados; solicitar anonimização ou exclusão; revogar consentimento a qualquer momento.

Para exercer seus direitos: privacidade@pontua.app

7. SEGURANÇA
Utilizamos criptografia em trânsito (HTTPS) e em repouso. Senhas são armazenadas com hash seguro. Realizamos revisões periódicas de segurança.

8. COOKIES E TECNOLOGIAS SIMILARES
O aplicativo não utiliza cookies. Utilizamos armazenamento local apenas para manter sua sessão ativa.

9. ALTERAÇÕES NESTA POLÍTICA
Notificaremos mudanças relevantes por e-mail ou notificação no app com antecedência mínima de 15 dias.

10. CONTATO
Encarregado de Dados (DPO): privacidade@pontua.app`;

// ─── Tela principal ───────────────────────────────────────────────────────────
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
      const res = await fetch(`${API}/api/usuarios/registro/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome_completo: nomeCompleto,
          username: usernameCad,
          email: emailCad,
          password: senhaCad,
          password2: confirmarSenha,  // ← campo que faltava no body
          aceito_termos: true,
        }),
      });
      const data = await res.json();
      console.log('STATUS:', res.status);
      console.log('RESPOSTA:', JSON.stringify(data));
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

      <ModalDocumento
        visivel={modalTermos}
        titulo="Termos de Uso"
        conteudo={TERMOS_DE_USO}
        onFechar={() => setModalTermos(false)}
      />
      <ModalDocumento
        visivel={modalPrivacidade}
        titulo="Política de Privacidade"
        conteudo={POLITICA_PRIVACIDADE}
        onFechar={() => setModalPrivacidade(false)}
      />

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
                <Text
                  style={styles.termosLink}
                  onPress={() => setModalTermos(true)}
                >
                  Termos de Uso
                </Text>
                {' '}e a{' '}
                <Text
                  style={styles.termosLink}
                  onPress={() => setModalPrivacidade(true)}
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
  olhoIcon: { fontSize: 16 },

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
    backgroundColor: 'rgba(0,0,0,0.7)',
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