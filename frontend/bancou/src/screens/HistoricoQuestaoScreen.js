// src/screens/HistoricoQuestaoScreen.js
// 30/10/2026 — Revisão de uma questão já respondida (modo leitura).
//
// Mesma aparência da PartidaScreen, mas sem responder: a alternativa que o
// usuário marcou aparece destacada, o gabarito em verde e, se ele errou, o
// aviso mostra o que marcou e qual era a certa. Dados de
// GET /api/questoes/historico/<resposta_id>/ (o backend só entrega respostas
// do próprio usuário dentro da janela do histórico).
//
// Respostas anteriores ao histórico não têm a letra marcada guardada: nesse
// caso a tela só diz que a alternativa não foi registrada e mostra o gabarito.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, typography } from '../theme';
import TextoFormatado from '../components/TextoFormatado';

const BORDA = '#333355';
const VERDE_ESCURO = '#0d2b1f';
const VERMELHO_ESCURO = '#2b0d1a';

function ImagemQuestao({ uri }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  if (!uri || erro) {
    return (
      <View style={styles.imagemErroBox}>
        <Text style={styles.imagemErroTexto}>🖼️ Não foi possível carregar a imagem desta questão</Text>
      </View>
    );
  }

  return (
    <View style={styles.imagemContainer}>
      {carregando && <ActivityIndicator size="small" color={colors.primary} style={styles.imagemLoading} />}
      <Image
        source={{ uri }}
        style={styles.imagemQuestao}
        resizeMode="contain"
        onLoadEnd={() => setCarregando(false)}
        onError={() => {
          setCarregando(false);
          setErro(true);
        }}
      />
    </View>
  );
}

export default function HistoricoQuestaoScreen({ navigation, route }) {
  const { respostaId } = route.params ?? {};
  const { authFetch } = useAuth();
  const insets = useSafeAreaInsets();

  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  const carregar = useCallback(async () => {
    setErro(null);
    try {
      const resp = await authFetch(`/api/questoes/historico/${respostaId}/`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || 'Não foi possível carregar a questão.');
      setDados(json);
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar a questão.');
    }
  }, [authFetch, respostaId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const cabecalho = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.btnVoltar}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
        accessibilityLabel="Voltar"
      >
        <Text style={styles.btnVoltarTexto}>←</Text>
      </TouchableOpacity>
      <View style={styles.headerTextos}>
        <Text style={styles.titulo}>Revisão da questão</Text>
        {dados && <Text style={styles.subtitulo}>Respondida às {dados.hora}</Text>}
      </View>
    </View>
  );

  if (erro) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {cabecalho}
        <View style={styles.centrado}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity style={styles.btnTentar} onPress={carregar} activeOpacity={0.85}>
            <Text style={styles.btnTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!dados) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {cabecalho}
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  const q = dados.questao;
  const gabarito = (q.gabarito || '').trim().toUpperCase();
  const escolhida = (dados.alternativa_escolhida || '').trim().toUpperCase();
  const tempoEsgotado = escolhida === '_';
  const marcouLetra = /^[A-Z]$/.test(escolhida);
  const acertou = dados.correta;

  // Cores das alternativas: gabarito em verde; a marcada errada em vermelho.
  const ehGabarito = (letra) => letra === gabarito;
  const ehErrada = (letra) => marcouLetra && letra === escolhida && letra !== gabarito;
  const corFundo = (letra) => (ehGabarito(letra) ? VERDE_ESCURO : ehErrada(letra) ? VERMELHO_ESCURO : colors.card);
  const corBorda = (letra) => (ehGabarito(letra) ? colors.correct : ehErrada(letra) ? colors.lives : BORDA);

  // Texto do aviso conforme o que aconteceu
  let subFeedback = null;
  if (acertou && dados.pulada) {
    subFeedback = 'Você usou um item para pular esta questão.';
  } else if (!acertou && tempoEsgotado) {
    subFeedback = `A resposta correta é a alternativa ${gabarito}.`;
  } else if (!acertou && marcouLetra) {
    subFeedback = `Você marcou a alternativa ${escolhida}. A resposta correta é a ${gabarito}.`;
  } else if (!acertou) {
    subFeedback = `Não temos registro de qual alternativa você marcou. A resposta correta é a ${gabarito}.`;
  }

  const titulo = acertou ? '✓  Correto!' : tempoEsgotado ? '⏱  Tempo esgotado!' : '✗  Incorreto';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {cabecalho}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Chips de banca e matéria */}
        <View style={styles.metaRow}>
          {!!q.banca_nome && (
            <View style={styles.metaChip}>
              <Text style={styles.metaTexto}>{q.banca_nome}</Text>
            </View>
          )}
          {!!q.materia_nome && (
            <View style={styles.metaChip}>
              <Text style={styles.metaTexto}>{q.materia_nome}</Text>
            </View>
          )}
        </View>

        {/* Texto-base */}
        {!!q.contexto && (
          <View style={styles.contextoBox}>
            <TextoFormatado style={styles.contextoTexto}>{q.contexto}</TextoFormatado>
          </View>
        )}

        {/* Imagem acima do enunciado */}
        {!!q.imagem && q.posicao_imagem === 'acima' && <ImagemQuestao uri={q.imagem} />}

        <TextoFormatado style={styles.enunciado}>{q.enunciado}</TextoFormatado>

        {/* Imagem abaixo do enunciado (padrão) */}
        {!!q.imagem && q.posicao_imagem !== 'acima' && <ImagemQuestao uri={q.imagem} />}

        {/* Alternativas (somente leitura) */}
        <View style={styles.alternativas}>
          {q.alternativas.map((alt) => (
            <View
              key={alt.id}
              style={[
                styles.alternativa,
                { backgroundColor: corFundo(alt.letra), borderColor: corBorda(alt.letra) },
              ]}
            >
              <View style={[styles.letraContainer, { borderColor: corBorda(alt.letra) }]}>
                <Text
                  style={[
                    styles.letra,
                    ehGabarito(alt.letra) && { color: colors.correct },
                    ehErrada(alt.letra) && { color: colors.lives },
                  ]}
                >
                  {alt.letra}
                </Text>
              </View>
              <TextoFormatado style={styles.altTexto}>{alt.texto}</TextoFormatado>
            </View>
          ))}
        </View>

        {/* Resultado */}
        <View
          style={[
            styles.feedback,
            {
              backgroundColor: acertou ? VERDE_ESCURO : VERMELHO_ESCURO,
              borderColor: acertou ? colors.correct : colors.lives,
            },
          ]}
        >
          <Text style={[styles.feedbackTitulo, { color: acertou ? colors.correct : colors.lives }]}>{titulo}</Text>
          {!!subFeedback && <Text style={styles.feedbackSub}>{subFeedback}</Text>}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.card,
  },
  btnVoltar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
  },
  btnVoltarTexto: { fontFamily: typography.bold, fontSize: 16, color: colors.textSecondary },
  headerTextos: { flex: 1 },
  titulo: { fontFamily: typography.extraBold, fontSize: 18, color: colors.text },
  subtitulo: { fontFamily: typography.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  centrado: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  erroTexto: {
    fontFamily: typography.regular, fontSize: 15, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  btnTentar: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  btnTentarTexto: { fontFamily: typography.bold, fontSize: 15, color: colors.text },

  scroll: { paddingHorizontal: 16, paddingTop: 16, gap: 14 },

  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: { backgroundColor: colors.card, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 4 },
  metaTexto: { fontFamily: typography.medium, fontSize: 11, color: colors.primary },

  contextoBox: {
    backgroundColor: colors.card, borderRadius: 8,
    padding: 14, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  contextoTexto: { fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },

  enunciado: { fontFamily: typography.regular, fontSize: 16, color: colors.text, lineHeight: 26 },

  imagemContainer: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: BORDA,
    padding: 8, alignItems: 'center', justifyContent: 'center', minHeight: 200,
  },
  imagemQuestao: { width: '100%', height: 240, borderRadius: 8 },
  imagemLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  imagemErroBox: {
    backgroundColor: colors.card, borderRadius: 14, borderWidth: 1, borderColor: BORDA,
    borderStyle: 'dashed', padding: 20, alignItems: 'center', justifyContent: 'center',
  },
  imagemErroTexto: {
    fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center',
  },

  alternativas: { gap: 10 },
  alternativa: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  letraContainer: {
    width: 28, height: 28, borderRadius: 8, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  letra: { fontFamily: typography.bold, fontSize: 13, color: colors.text },
  altTexto: { fontFamily: typography.regular, fontSize: 15, color: colors.text, flex: 1, lineHeight: 22 },

  feedback: { borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 6 },
  feedbackTitulo: { fontFamily: typography.bold, fontSize: 15 },
  feedbackSub: { fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20 },
});