// src/components/modals/ModalRelatarBug.js
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../../context/AuthContext';
import { useKouAlert } from '../../context/KouAlertContext';
import { colors, typography, spacing } from '../../theme';

const MIN_CHARS = 10;
const MAX_CHARS = 1000;

// '#333355' é a borda neutra usada em todo o app (sem token nomeado no theme).
const BORDA = '#333355';

// O usuário nunca digita dado técnico que o app já sabe sozinho.
function coletarInfoAparelho() {
  const c = Platform.constants ?? {};
  const modelo = [c.Brand, c.Model].filter(Boolean).join(' ');
  const so =
    Platform.OS === 'android'
      ? `Android ${c.Release ?? '?'} (API ${Platform.Version})`
      : `${Platform.OS} ${Platform.Version}`;
  return {
    modelo_aparelho: modelo,
    versao_so: so,
    versao_app: Constants.expoConfig?.version ?? '',
  };
}

export default function ModalRelatarBug({ visivel, questaoId, onFechar }) {
  const { authFetch } = useAuth();
  const { alertar } = useKouAlert();

  const [descricao, setDescricao] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  // Questão nova = relato novo: não carrega o texto da questão anterior.
  useEffect(() => {
    setDescricao('');
    setErro(null);
  }, [questaoId]);

  const tamanho = descricao.trim().length;
  const podeEnviar = tamanho >= MIN_CHARS && !enviando;

  const fechar = () => {
    if (enviando) return;
    setErro(null);
    onFechar();
  };

  const enviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      const resp = await authFetch('/api/suporte/relatar-bug/', {
        method: 'POST',
        body: JSON.stringify({
          questao_id: questaoId,
          descricao: descricao.trim(),
          tela_contexto: 'partida',
          ...coletarInfoAparelho(),
        }),
      });

      if (resp.status === 429) {
        setErro('Você enviou muitos relatos seguidos. Tente de novo daqui a pouco.');
        return;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setErro(data.detail || 'Não foi possível enviar o relato. Tente novamente.');
        return;
      }

      // Fecha este modal ANTES do alerta, pra os dois não ficarem empilhados.
      setDescricao('');
      onFechar();
      alertar(
        'Relato enviado!',
        'Obrigado por ajudar a melhorar o Bancou. Vamos analisar com carinho.',
        [{ text: 'OK' }],
        { pose: 'animado' }
      );
    } catch {
      setErro('Sem conexão. Verifique sua internet e tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={fechar}>
      <KeyboardAvoidingView style={styles.overlay} behavior="padding">
        <View style={styles.card}>
          <Text style={styles.titulo}>Relatar um problema</Text>
          <Text style={styles.subtitulo}>
            Conte o que aconteceu nesta questão. Já enviamos junto a questão e os dados do seu aparelho.
          </Text>

          <TextInput
            style={styles.input}
            value={descricao}
            onChangeText={(t) => { setDescricao(t); if (erro) setErro(null); }}
            placeholder="Ex.: o gabarito parece errado, o texto está cortado, a imagem não abre…"
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={MAX_CHARS}
            textAlignVertical="top"
            editable={!enviando}
          />
          <Text style={styles.contador}>{tamanho}/{MAX_CHARS}</Text>

          {!!erro && <Text style={styles.erro}>{erro}</Text>}

          <View style={styles.botoes}>
            <TouchableOpacity
              style={[styles.btn, styles.btnCancelar]}
              onPress={fechar}
              disabled={enviando}
              activeOpacity={0.8}
            >
              <Text style={styles.btnCancelarTexto}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnEnviar, !podeEnviar && styles.btnDisabled]}
              onPress={enviar}
              disabled={!podeEnviar}
              activeOpacity={0.85}
            >
              {enviando
                ? <ActivityIndicator color={colors.text} size="small" />
                : <Text style={styles.btnEnviarTexto}>Enviar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: '#00000099',
    justifyContent: 'center', paddingHorizontal: spacing.xl,
  },
  card: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: BORDA,
    padding: spacing.xl, gap: spacing.md,
  },
  titulo: { fontFamily: typography.bold, fontSize: 20, color: colors.text },
  subtitulo: {
    fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 19,
  },
  input: {
    minHeight: 130, maxHeight: 220,
    backgroundColor: colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: BORDA,
    padding: spacing.md,
    fontFamily: typography.regular, fontSize: 15, color: colors.text, lineHeight: 22,
  },
  contador: {
    fontFamily: typography.regular, fontSize: 11, color: colors.textSecondary,
    textAlign: 'right', marginTop: -spacing.sm,
  },
  erro: { fontFamily: typography.medium, fontSize: 13, color: colors.lives, lineHeight: 19 },
  botoes: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  btn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  btnCancelar: { backgroundColor: colors.background, borderWidth: 1, borderColor: BORDA },
  btnCancelarTexto: { fontFamily: typography.bold, fontSize: 15, color: colors.textSecondary },
  btnEnviar: { backgroundColor: colors.primary },
  btnEnviarTexto: { fontFamily: typography.bold, fontSize: 15, color: colors.text },
  btnDisabled: { opacity: 0.35 },
});