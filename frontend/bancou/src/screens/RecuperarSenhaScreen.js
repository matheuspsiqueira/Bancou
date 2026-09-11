// src/screens/RecuperarSenhaScreen.js
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../config';
import { useKouAlert } from '../context/KouAlertContext';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';


function CampoSenha({ label, value, onChangeText, ver, setVer, placeholder }) {
  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputSenhaWrapper}>
        <TextInput
          style={styles.inputSenha}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!ver}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.inputSenhaOlho} onPress={() => setVer((v) => !v)} activeOpacity={0.7}>
          <Text style={styles.inputSenhaOlhoIcon}>{ver ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

export default function RecuperarSenhaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { alertar } = useKouAlert();
  
  const [etapa, setEtapa]           = useState('email'); // 'email' | 'codigo'
  const [email, setEmail]           = useState('');
  const [codigo, setCodigo]         = useState('');
  const [novaSenha, setNovaSenha]   = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [verNova, setVerNova]       = useState(false);
  const [verConfirmacao, setVerConfirmacao] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const solicitarCodigo = async () => {
    if (!email.trim()) {
      alertar('Atenção', 'Digite seu e-mail.', [{ text: 'OK' }]);
      return;
    }
    setCarregando(true);
    try {
      await fetch(`${API_URL}/api/usuarios/recuperar-senha/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      // Resposta é sempre genérica — avançamos pra próxima etapa independente do resultado
      setEtapa('codigo');
    } catch {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  const confirmarNovaSenha = async () => {
    if (!codigo.trim() || !novaSenha || !confirmacao) {
      alertar('Atenção', 'Preencha todos os campos.', [{ text: 'OK' }]);
      return;
    }
    if (novaSenha !== confirmacao) {
      alertar('Atenção', 'A nova senha e a confirmação não coincidem.', [{ text: 'OK' }]);
      return;
    }
    if (novaSenha.length < 8) {
      alertar('Atenção', 'A nova senha deve ter pelo menos 8 caracteres.', [{ text: 'OK' }]);
      return;
    }

    setCarregando(true);
    try {
      const resp = await fetch(`${API_URL}/api/usuarios/recuperar-senha/confirmar/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          codigo: codigo.trim(),
          nova_senha: novaSenha,
          nova_senha2: confirmacao,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        alertar(
          'Senha redefinida!',
          'Faça login com sua nova senha.',
          [{ text: 'OK', onPress: () => navigation.navigate('Auth', { tela: 'login' }) }],
          { pose: 'torcendo' }
        );
      } else {
        const msg = data.codigo?.[0] || data.nova_senha?.[0] || data.detail || 'Erro ao redefinir senha.';
        alertar('Erro', msg, [{ text: 'OK' }], { pose: 'ops' });
      }
    } catch {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl, paddingHorizontal: spacing.xl }}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.voltarBtn}>
        <Text style={styles.voltarText}>‹  Voltar</Text>
      </TouchableOpacity>

      {etapa === 'email' && (
        <>
          <Text style={styles.titulo}>Esqueceu a senha?</Text>
          <Text style={styles.subtitulo}>
            Digite o e-mail da sua conta. Vamos enviar um código de 6 dígitos para redefinir sua senha.
          </Text>

          <Text style={styles.inputLabel}>E-mail</Text>
          <TextInput
            style={styles.input}
            placeholder="seu@email.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.botao, carregando && styles.botaoDisabled]}
            onPress={solicitarCodigo}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.botaoTexto}>Enviar código</Text>}
          </TouchableOpacity>
        </>
      )}

      {etapa === 'codigo' && (
        <>
          <Text style={styles.titulo}>Digite o código</Text>
          <Text style={styles.subtitulo}>
            Enviamos um código de 6 dígitos para {email}. Ele expira em 15 minutos.
          </Text>

          <Text style={styles.inputLabel}>Código</Text>
          <TextInput
            style={styles.input}
            placeholder="000000"
            placeholderTextColor={colors.textSecondary}
            value={codigo}
            onChangeText={setCodigo}
            keyboardType="number-pad"
            maxLength={6}
          />

          <CampoSenha
            label="Nova senha"
            placeholder="Digite a nova senha"
            value={novaSenha}
            onChangeText={setNovaSenha}
            ver={verNova}
            setVer={setVerNova}
          />
          <CampoSenha
            label="Confirmar nova senha"
            placeholder="Repita a nova senha"
            value={confirmacao}
            onChangeText={setConfirmacao}
            ver={verConfirmacao}
            setVer={setVerConfirmacao}
          />

          <TouchableOpacity
            style={[styles.botao, carregando && styles.botaoDisabled]}
            onPress={confirmarNovaSenha}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando ? <ActivityIndicator color={colors.text} /> : <Text style={styles.botaoTexto}>Redefinir senha</Text>}
          </TouchableOpacity>

          <TouchableOpacity onPress={solicitarCodigo} style={styles.reenviarBtn}>
            <Text style={styles.reenviarText}>Reenviar código</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  voltarBtn: { marginBottom: 20 },
  voltarText: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.primary },
  titulo: { fontFamily: typography.black, fontSize: fontSize.h1, color: colors.text, marginBottom: spacing.sm },
  subtitulo: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, lineHeight: 21, marginBottom: 28 },
  inputLabel: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.textSecondary, marginBottom: 6, marginTop: spacing.xs },
  input: {
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
    fontFamily: typography.regular, fontSize: fontSize.body, color: colors.text,
    marginBottom: spacing.lg, borderWidth: 1, borderColor: '#35355a',
  },
  inputSenhaWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: '#35355a',
    marginBottom: spacing.lg, paddingRight: spacing.md,
  },
  inputSenha: {
    flex: 1, color: colors.text,
    fontFamily: typography.regular, fontSize: fontSize.body,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  inputSenhaOlho: { padding: spacing.xs },
  inputSenhaOlhoIcon: { fontSize: 18 },
  botao: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', marginTop: spacing.sm,
  },
  botaoDisabled: { opacity: 0.6 },
  botaoTexto: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.text },
  reenviarBtn: { marginTop: spacing.xs, alignItems: 'center' },
  reenviarText: { fontFamily: typography.medium, fontSize: fontSize.caption, color: colors.primary },
});