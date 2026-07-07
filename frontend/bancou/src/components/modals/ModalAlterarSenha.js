// src/components/modals/ModalAlterarSenha.js
// Extraído de HomeScreen.js — lógica idêntica à original, sem alterações.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { usePontsAlert } from '../../context/PontsAlertContext';
import CampoSenha from './CampoSenha';

export default function ModalAlterarSenha({ visible, onClose }) {
  const { authFetch } = useAuth();
  const { alertar } = usePontsAlert();
  const [senhaAtual,     setSenhaAtual]     = useState('');
  const [novaSenha,      setNovaSenha]      = useState('');
  const [confirmacao,    setConfirmacao]    = useState('');
  const [carregando,     setCarregando]     = useState(false);
  const [verAtual,       setVerAtual]       = useState(false);
  const [verNova,        setVerNova]        = useState(false);
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
          nova_senha:  novaSenha,
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
          data.senha_atual?.[0]      ||
          data.nova_senha?.[0]       ||
          data.non_field_errors?.[0] ||
          data.detail                ||
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

          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>Senha atual</Text>
            <TouchableOpacity onPress={esqueceuSenha} activeOpacity={0.7}>
              <Text style={styles.linkEsqueceuSenha}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputSenhaWrapper}>
            <TextInput
              style={styles.inputSenha}
              placeholder="Digite sua senha atual"
              placeholderTextColor="#9090B0"
              secureTextEntry={!verAtual}
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.inputSenhaOlho}
              onPress={() => setVerAtual((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.inputSenhaOlhoIcon}>{verAtual ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

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
            <Text style={{
              fontSize: 12,
              fontFamily: 'Inter_400Regular',
              marginBottom: 16,
              color: novaSenha === confirmacao ? '#00C896' : '#FF4069',
            }}>
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
              ? <ActivityIndicator color="#FFF" />
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
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#252540', borderRadius: 999,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitulo:    { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: '#FFFFFF', marginBottom: 4 },
  modalSubtitulo: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', marginBottom: 20, lineHeight: 18 },
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0', marginBottom: 6, marginTop: 4 },
  inputLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 4,
  },
  linkEsqueceuSenha: { fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6C63FF' },
  inputSenhaWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#252540', borderRadius: 12,
    borderWidth: 1, borderColor: '#35355a',
    marginBottom: 12, paddingRight: 12,
  },
  inputSenha: {
    flex: 1, color: '#FFFFFF',
    fontFamily: 'Inter_400Regular', fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  inputSenhaOlho:     { padding: 4 },
  inputSenhaOlhoIcon: { fontSize: 18 },
  btnPrincipal: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  btnPrincipalText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#FFFFFF' },
});
