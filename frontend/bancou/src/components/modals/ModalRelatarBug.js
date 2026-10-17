// src/components/modals/ModalRelatarBug.js
// Usado em dois lugares:
//  - PartidaScreen: relato ligado a uma questão (questaoId preenchido,
//    telaContexto 'partida' — o default).
//  - PerfilScreen: relato geral (questaoId null, telaContexto 'perfil').
//
// Print (screenshot) é OPCIONAL, no máximo 1. Sem print o envio é JSON pelo
// authFetch, como sempre; com print vai multipart (FormData) direto no
// fetch, mesmo padrão do ModalEditarPerfil (o authFetch força JSON).
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
  Image,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useAuth } from '../../context/AuthContext';
import { useKouAlert } from '../../context/KouAlertContext';
import { API_URL } from '../../config';
import { colors, typography, spacing } from '../../theme';

const MIN_CHARS = 10;
const MAX_CHARS = 1000;
const LARGURA_MAX_PRINT = 1080;

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

export default function ModalRelatarBug({
  visivel,
  questaoId = null,
  telaContexto = 'partida',
  onFechar,
}) {
  const { authFetch } = useAuth();
  const { alertar } = useKouAlert();

  const [descricao, setDescricao] = useState('');
  const [anexo, setAnexo] = useState(null); // { uri, name, type } ou null
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  // Questão nova = relato novo: não carrega o texto/print da questão anterior.
  useEffect(() => {
    setDescricao('');
    setAnexo(null);
    setErro(null);
  }, [questaoId]);

  const tamanho = descricao.trim().length;
  const podeEnviar = tamanho >= MIN_CHARS && !enviando;

  const comQuestao = questaoId != null;
  const subtitulo = comQuestao
    ? 'Conte o que aconteceu nesta questão. Já enviamos junto a questão e os dados do seu aparelho.'
    : 'Conte o que aconteceu. Já enviamos junto os dados do seu aparelho.';
  const placeholder = comQuestao
    ? 'Ex.: o gabarito parece errado, o texto está cortado, a imagem não abre…'
    : 'Ex.: uma tela não abre, algo travou, um valor está errado…';

  const fechar = () => {
    if (enviando) return;
    setErro(null);
    onFechar();
  };

  const escolherPrint = async () => {
    if (enviando) return;
    setErro(null);
    try {
      const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissao.granted) {
        setErro('Precisamos de acesso à sua galeria para anexar o print.');
        return;
      }

      const resultado = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });
      if (resultado.canceled) return;

      const original = resultado.assets[0];
      // Só reduz se for maior que o limite (não amplia imagem pequena).
      const acoes = original.width > LARGURA_MAX_PRINT
        ? [{ resize: { width: LARGURA_MAX_PRINT } }]
        : [];
      const manipulado = await ImageManipulator.manipulateAsync(
        original.uri,
        acoes,
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      setAnexo({ uri: manipulado.uri, name: 'print.jpg', type: 'image/jpeg' });
    } catch {
      setErro('Não foi possível carregar a imagem. Tente outra.');
    }
  };

  const enviar = async () => {
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      const campos = {
        descricao: descricao.trim(),
        tela_contexto: telaContexto,
        ...coletarInfoAparelho(),
      };

      let resp;
      if (anexo) {
        const access = await AsyncStorage.getItem('access_token');
        const form = new FormData();
        if (questaoId != null) form.append('questao_id', String(questaoId));
        Object.entries(campos).forEach(([chave, valor]) => form.append(chave, valor ?? ''));
        form.append('anexo', anexo);

        resp = await fetch(`${API_URL}/api/suporte/relatar-bug/`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${access}` },
          body: form,
        });
      } else {
        resp = await authFetch('/api/suporte/relatar-bug/', {
          method: 'POST',
          body: JSON.stringify({ questao_id: questaoId, ...campos }),
        });
      }

      if (resp.status === 429) {
        setErro('Você enviou muitos relatos seguidos. Tente de novo daqui a pouco.');
        return;
      }
      if (resp.status === 401) {
        setErro('Sua sessão expirou. Feche e abra o app e tente de novo.');
        return;
      }
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        setErro(data.detail || 'Não foi possível enviar o relato. Tente novamente.');
        return;
      }

      // Fecha este modal ANTES do alerta, pra os dois não ficarem empilhados.
      setDescricao('');
      setAnexo(null);
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
          <Text style={styles.subtitulo}>{subtitulo}</Text>

          <TextInput
            style={styles.input}
            value={descricao}
            onChangeText={(t) => { setDescricao(t); if (erro) setErro(null); }}
            placeholder={placeholder}
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={MAX_CHARS}
            textAlignVertical="top"
            editable={!enviando}
          />
          <Text style={styles.contador}>{tamanho}/{MAX_CHARS}</Text>

          {/* Print opcional */}
          {anexo ? (
            <View style={styles.anexoRow}>
              <Image source={{ uri: anexo.uri }} style={styles.anexoMiniatura} resizeMode="cover" />
              <Text style={styles.anexoTexto} numberOfLines={1}>Print anexado</Text>
              <TouchableOpacity
                style={styles.anexoRemover}
                onPress={() => setAnexo(null)}
                disabled={enviando}
                activeOpacity={0.7}
                accessibilityLabel="Remover print"
              >
                <Text style={styles.anexoRemoverTexto}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.btnAnexar}
              onPress={escolherPrint}
              disabled={enviando}
              activeOpacity={0.8}
            >
              <Text style={styles.btnAnexarTexto}>📎  Anexar print (opcional)</Text>
            </TouchableOpacity>
          )}

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

  btnAnexar: {
    borderWidth: 1, borderColor: BORDA, borderStyle: 'dashed', borderRadius: 8,
    paddingVertical: 12, alignItems: 'center',
  },
  btnAnexarTexto: { fontFamily: typography.medium, fontSize: 13, color: colors.textSecondary },
  anexoRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.background, borderRadius: 8,
    borderWidth: 1, borderColor: BORDA, padding: spacing.sm,
  },
  anexoMiniatura: { width: 48, height: 48, borderRadius: 6 },
  anexoTexto: { flex: 1, fontFamily: typography.medium, fontSize: 13, color: colors.text },
  anexoRemover: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
  },
  anexoRemoverTexto: { fontFamily: typography.bold, fontSize: 13, color: colors.textSecondary },

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