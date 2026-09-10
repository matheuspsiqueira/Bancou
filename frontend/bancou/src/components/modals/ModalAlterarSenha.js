// src/components/modals/ModalAlterarSenha.js
// Lógica idêntica à original. Diferença: os 3 campos de senha agora
// usam o mesmo componente CampoSenha (antes o "Senha atual" duplicava
// o JSX/estilo por causa do link "Esqueci minha senha").
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { usePontsAlert } from '../../context/PontsAlertContext';
import CampoSenha from './CampoSenha';
import { colors, typography, fontSize, spacing, borderRadius } from '../../theme';

export default function ModalAlterarSenha({ visible, onClose }) {
  const { authFetch } = useAuth();
  const { alertar } = usePontsAlert();
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [verAtual, setVerAtual] = useState(false);
  const [verNova, setVerNova] = useState(false);
  const [verConfirmacao, setVerConfirmacao] = useState(false);

  const fechar = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmacao('');
    setVerAtual(false);
    setVerNova(false);
    setVerConfirmacao(false);
    onClose();
  };

  const esqueceuSenha = () => {
    alertar(
      'Esqueceu sua senha?',
      'Para redefinir sua senha, faça logout e use a opção "Esqueci minha senha" na tela de login.',
      [{ text: 'Entendi' }],
      { pose: 'pensando' }
    );
  };

  const salvar = async () => {
    if (!senhaAtual || !novaSenha || !confirmacao) {
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
    if (novaSenha === senhaAtual) {
      alertar('Atenção', 'A nova senha deve ser diferente da senha atual.', [{ text: 'OK' }]);
      return;
    }

    setCarregando(true);
    try {
      const resp = await authFetch('/api/usuarios/alterar-senha/', {
        method: 'POST',
        body: JSON.stringify({
          senha_atual: senhaAtual,
          nova_senha: novaSenha,
          nova_senha2: confirmacao,
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        alertar(
          'Senha alterada!',
          'Sua senha foi atualizada com sucesso.',
          [{ text: 'OK', onPress: fechar }],
          { pose: 'torcendo' }
        );
      } else {
        const msg =
          data.senha_atual?.[0] ||
          data.nova_senha?.[0] ||
          data.non_field_errors?.[0] ||
          data.detail ||
          'Erro ao alterar senha.';
        alertar('Erro', msg, [{ text: 'OK' }], { pose: 'ops' });
      }
    } catch {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <Pressable style={styles.modalOverlay} onPress={fechar}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitulo}>Alterar senha</Text>
          <Text style={styles.modalSubtitulo}>
            Escolha uma senha forte com pelo menos 8 caracteres.
          </Text>

          <CampoSenha
            label="Senha atual"
            placeholder="Digite sua senha atual"
            value={senhaAtual}
            onChangeText={setSenhaAtual}
            ver={verAtual}
            setVer={setVerAtual}
            labelExtra={
              <TouchableOpacity onPress={esqueceuSenha} activeOpacity={0.7}>
                <Text style={styles.linkEsqueceuSenha}>Esqueci minha senha</Text>
              </TouchableOpacity>
            }
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

          {confirmacao.length > 0 && (
            <Text style={[
              styles.matchLabel,
              { color: novaSenha === confirmacao ? colors.correct : colors.lives },
            ]}>
              {novaSenha === confirmacao ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btnPrincipal, carregando && { opacity: 0.6 }]}
            onPress={salvar}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color={colors.text} />
              : <Text style={styles.btnPrincipalText}>Salvar senha</Text>
            }
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.card, borderRadius: borderRadius.full,
    alignSelf: 'center', marginBottom: spacing.xl,
  },
  modalTitulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: 4 },
  modalSubtitulo: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 18 },
  linkEsqueceuSenha: { fontSize: fontSize.caption, fontFamily: typography.regular, color: colors.primary },
  matchLabel: { fontSize: fontSize.caption, fontFamily: typography.regular, marginBottom: spacing.md },
  btnPrincipal: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md,
  },
  btnPrincipalText: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.text },
});