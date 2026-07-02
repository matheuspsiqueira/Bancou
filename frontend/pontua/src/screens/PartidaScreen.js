// src/screens/PartidaScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';

const TEMPO_POR_QUESTAO = 60;   // segundos
const PAUSA_FEEDBACK_MS = 1500; // ms que o feedback fica visível antes de avançar (só no timer)

// ─── Cores ────────────────────────────────────────────────────────────────
const C = {
  bg:        '#1a1a2e',
  card:      '#252540',
  primary:   '#6C63FF',
  streak:    '#FF6B35',
  lives:     '#FF4069',
  correct:   '#00C896',
  gold:      '#FFD700',
  text:      '#FFFFFF',
  text2:     '#9090B0',
  border:    '#333355',
};

// ─── Componente de vidas ──────────────────────────────────────────────────
function Vidas({ atual }) {
  return (
    <View style={styles.vidasRow}>
      <Text style={styles.vidaIcone}>❤️</Text>
      <Text style={styles.vidaNumero}>{atual}</Text>
    </View>
  );
}

// ─── Modal: Vidas zeradas ─────────────────────────────────────────────────
function ModalSemVidas({ visible, onAssistirAd, onAssinar, onEncerrar }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalSemVidasCard}>
          <Text style={styles.modalSemVidasEmoji}>💔</Text>
          <Text style={styles.modalSemVidasTitulo}>Suas vidas acabaram!</Text>
          <Text style={styles.modalSemVidasSub}>
            Você usou todas as suas vidas. O que deseja fazer?
          </Text>

          <TouchableOpacity
            style={styles.modalSemVidasBtnAd}
            onPress={onAssistirAd}
            activeOpacity={0.85}
          >
            <Text style={styles.modalSemVidasBtnAdTexto}>
              📺  Assistir anúncio · ganhar +1 ❤️
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalSemVidasBtnPremium}
            onPress={onAssinar}
            activeOpacity={0.85}
          >
            <Text style={styles.modalSemVidasBtnPremiumTexto}>
              ⭐  Assinar Premium
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.modalSemVidasBtnEncerrar}
            onPress={onEncerrar}
            activeOpacity={0.7}
          >
            <Text style={styles.modalSemVidasBtnEncerrarTexto}>Encerrar partida</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────
export default function PartidaScreen({ navigation, route }) {
  const { filtro } = route.params ?? {};
  const { authFetch, usuario, atualizarUsuario } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Estado de carregamento ──────────────────────────────────────────────
  const [carregando,   setCarregando]   = useState(true);
  const [erroReq,      setErroReq]      = useState(null);
  const [questoes,     setQuestoes]     = useState([]);

  // ── Estado de jogo ──────────────────────────────────────────────────────
  const [indice,       setIndice]       = useState(0);
  const [selecionada,  setSelecionada]  = useState(null);
  const [confirmada,   setConfirmada]   = useState(false);
  const [acertouAtual, setAcertouAtual] = useState(false);
  const [gabarito,     setGabarito]     = useState(null);
  const [corrigindo,   setCorrigindo]   = useState(false);

  // useRef pra contadores síncronos — igual ao DemoScreen
  const acertosRef    = useRef(0);
  const errosRef      = useRef(0);
  const vidasRef      = useRef(usuario?.vidas ?? 5);
  const partidaIdRef  = useRef(null);

  // ── Estado de vidas/modal ───────────────────────────────────────────────
  const [vidasAtual,   setVidasAtual]   = useState(usuario?.vidas ?? 5);
  const [modalSemVidas, setModalSemVidas] = useState(false);

  // ── Timer ───────────────────────────────────────────────────────────────
  const comTempo     = filtro?.comTempo ?? false;
  const [tempo,      setTempo]          = useState(TEMPO_POR_QUESTAO);
  const timerRef     = useRef(null);
  const expiradoRef  = useRef(false); // impede duplo-disparo

  // ── Busca as questões ao montar ─────────────────────────────────────────
  useEffect(() => {
    // Bloqueia entrada se usuário está sem vidas
    if ((usuario?.vidas ?? 5) === 0) {
      Alert.alert(
        'Sem vidas!',
        'Você não tem vidas suficientes para jogar. Aguarde a recuperação ou assine o Premium.',
        [{ text: 'Voltar', onPress: () => navigation.goBack() }]
      );
      return;
    }
    buscarQuestoes();
  }, []);

  const buscarQuestoes = async () => {
    setCarregando(true);
    setErroReq(null);
    try {
      const params = new URLSearchParams();
      if (filtro?.tipo && filtro?.id) {
        params.append('tipo', filtro.tipo);
        params.append('id', filtro.id);
      }
      if (comTempo) {
        params.append('com_tempo', '1');
      }
      const query = params.toString();
      let path = `/api/questoes/iniciar-partida/${query ? `?${query}` : ''}`;   // ← trocado
      const resp = await authFetch(path);
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.detail || 'Erro ao buscar questões.');
      }
      partidaIdRef.current = data.partida_id;   // ← linha nova
      setQuestoes(data.questoes);
    } catch (e) {
      setErroReq(e.message || 'Não foi possível carregar as questões.');
    } finally {
      setCarregando(false);
    }
  };

  // ── Timer: inicia/reinicia a cada nova questão ──────────────────────────
  useEffect(() => {
    if (!comTempo || carregando || questoes.length === 0) return;
    if (confirmada) return; // para o timer quando já confirmou

    setTempo(TEMPO_POR_QUESTAO);
    expiradoRef.current = false;

    timerRef.current = setInterval(() => {
      setTempo((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          if (!expiradoRef.current) {
            expiradoRef.current = true;
            handleTempoEsgotado();
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [indice, comTempo, carregando, questoes.length, confirmada]);

  const handleTempoEsgotado = useCallback(() => {
    const questaoAtual = questoes[indice];
    if (!questaoAtual) return;

    // Tempo esgotado = erro: mostra gabarito por PAUSA_FEEDBACK_MS e avança
    setGabarito(questaoAtual.gabarito_temp ?? null); // não temos gabarito ainda — chama corrigir com letra vazia
    registrarErroTempo(questaoAtual);
  }, [questoes, indice]);

  // Quando tempo esgota, chama /corrigir/ com letra inválida pra pegar o gabarito
  const registrarErroTempo = async (questao) => {
    setConfirmada(true);
    setAcertouAtual(false);
    errosRef.current += 1;

    try {
      const resp = await authFetch('/api/questoes/corrigir/', {
        method: 'POST',
        body: JSON.stringify({
          partida_id: partidaIdRef.current,   // ← linha nova
          questao_id: questao.id,
          letra: '_',
        }),
      });
      const data = await resp.json();
      setGabarito(data.gabarito);
    } catch {
      // silencioso — gabarito não será exibido mas o fluxo continua
    }

    // Desconta vida
    const novasVidas = Math.max(0, vidasRef.current - 1);
    vidasRef.current = novasVidas;
    setVidasAtual(novasVidas);

    // Avança automaticamente após pausa de feedback
    setTimeout(() => {
      if (novasVidas === 0) {
        setModalSemVidas(true);
      } else {
        avancarQuestao();
      }
    }, PAUSA_FEEDBACK_MS);
  };

  // ── Confirmar resposta ──────────────────────────────────────────────────
  const confirmar = async () => {
    if (!selecionada || confirmada || corrigindo) return;
    clearInterval(timerRef.current);
    setCorrigindo(true);

    const questaoAtual = questoes[indice];
    try {
      const resp = await authFetch('/api/questoes/corrigir/', {
        method: 'POST',
        body: JSON.stringify({
          partida_id: partidaIdRef.current,   // ← linha nova
          questao_id: questaoAtual.id,
          letra: selecionada,
        }),
      });
      const data = await resp.json();
      const correta = data.correta;

      setGabarito(data.gabarito);
      setAcertouAtual(correta);
      setConfirmada(true);

      if (correta) {
        acertosRef.current += 1;
      } else {
        errosRef.current += 1;
        const novasVidas = Math.max(0, vidasRef.current - 1);
        vidasRef.current = novasVidas;
        setVidasAtual(novasVidas);

        if (novasVidas === 0) {
          // Mostra feedback brevemente antes do modal
          setTimeout(() => setModalSemVidas(true), 600);
        }
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível verificar a resposta. Tente novamente.');
    } finally {
      setCorrigindo(false);
    }
  };

  // ── Avançar questão ─────────────────────────────────────────────────────
  const avancarQuestao = useCallback(() => {
    const proximoIndice = indice + 1;

    setSelecionada(null);
    setConfirmada(false);
    setAcertouAtual(false);
    setGabarito(null);
    expiradoRef.current = false;

    if (proximoIndice >= questoes.length) {
      finalizarPartida(false);
    } else {
      setIndice(proximoIndice);
    }
  }, [indice, questoes.length]);

  // ── Finalizar partida ───────────────────────────────────────────────────
  const finalizarPartida = async (abandonada = false) => {
    const acertos = acertosRef.current;
    const erros   = errosRef.current;

    try {
      const resp = await authFetch(`/api/questoes/finalizar-partida/${partidaIdRef.current}/`, {
        method: 'POST',
        body: JSON.stringify({ abandonada }),
      });
      if (resp.ok) {
        const data = await resp.json();
        atualizarUsuario({
          xp:     data.usuario.xp,
          moedas: data.usuario.moedas,
          vidas:  data.usuario.vidas,
        });
        navigation.replace('Score', {
          acertos,
          erros,
          total: questoes.length,
          xpGanho:      data.xp_ganho,
          moedasGanhas: data.moedas_ganhas,
          abandonada,
        });
      } else {
        navigation.replace('Score', {
          acertos, erros, total: questoes.length,
          xpGanho: acertos * 10, moedasGanhas: acertos * 2, abandonada,
        });
      }
    } catch {
      navigation.replace('Score', {
        acertos, erros, total: questoes.length,
        xpGanho: acertos * 10, moedasGanhas: acertos * 2, abandonada,
      });
    }
  };

  // ── Modal sem vidas: ações ─────────────────────────────────────────────
  const handleAssistirAd = () => {
    // TODO: integrar AdMob — quando o ad terminar de verdade:
    // 1. Chamar POST /api/usuarios/recuperar-vida/
    // 2. Atualizar vidasRef e setVidasAtual com o retorno
    // 3. Chamar setModalSemVidas(false) e avancarQuestao()
    // Por enquanto não faz nada — modal permanece aberto.
    Alert.alert(
      'Em breve',
      'Os anúncios recompensados estão chegando em breve!',
    );
  };

  const handleAssinar = () => {
    // TODO: navegar para tela de assinatura Premium
    // Enquanto não existir, só informa — modal permanece aberto.
    Alert.alert(
      'Em breve',
      'A assinatura Premium está chegando em breve!',
    );
  };

  const handleEncerrar = () => {
    setModalSemVidas(false);
    finalizarPartida(true);
  };

  // ── Cor das alternativas ─────────────────────────────────────────────────
  const corFundo = (letra) => {
    if (!confirmada) return selecionada === letra ? C.primary : C.card;
    if (letra === gabarito)                    return '#0d2b1f'; // verde escuro
    if (letra === selecionada && letra !== gabarito) return '#2b0d1a'; // vermelho escuro
    return C.card;
  };

  const corBorda = (letra) => {
    if (!confirmada) return selecionada === letra ? C.primary : C.border;
    if (letra === gabarito)                    return C.correct;
    if (letra === selecionada && letra !== gabarito) return C.lives;
    return C.border;
  };

  // ── Cor do timer ─────────────────────────────────────────────────────────
  const corTempo = tempo > 20 ? C.correct : tempo > 10 ? C.gold : C.lives;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <View style={[styles.centrado, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={C.primary} />
        <Text style={styles.loadingTexto}>Preparando sua partida…</Text>
      </View>
    );
  }

  // ── Erro de requisição ────────────────────────────────────────────────────
  if (erroReq) {
    return (
      <View style={[styles.centrado, { paddingTop: insets.top }]}>
        <Text style={styles.erroEmoji}>😕</Text>
        <Text style={styles.erroTexto}>{erroReq}</Text>
        <TouchableOpacity style={styles.erroBtn} onPress={buscarQuestoes}>
          <Text style={styles.erroBtnTexto}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.erroBtnVoltar} onPress={() => navigation.goBack()}>
          <Text style={styles.erroBtnVoltarTexto}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const questaoAtual = questoes[indice];
  if (!questaoAtual) return null;

  const isUltima   = indice === questoes.length - 1;
  const acertou    = confirmada && acertouAtual;
  const errou      = confirmada && !acertouAtual && selecionada !== null;
  const tempoEsgotado = confirmada && selecionada === null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnSair}
          onPress={() =>
            Alert.alert(
              'Sair da partida?',
              'Seu progresso parcial será salvo.',
              [
                { text: 'Continuar jogando', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: () => finalizarPartida(true) },
              ]
            )
          }
          activeOpacity={0.7}
        >
          <Text style={styles.btnSairTexto}>✕</Text>
        </TouchableOpacity>

        {/* Barra de progresso */}
        <View style={styles.progressoContainer}>
          <View style={styles.progressoTrack}>
            <View
              style={[
                styles.progressoFill,
                { width: `${((indice + (confirmada ? 1 : 0)) / questoes.length) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.progressoTexto}>{indice + 1}/{questoes.length}</Text>
        </View>

        <Vidas atual={vidasAtual} />
      </View>

      {/* ── Timer (só no modo com tempo) ────────────────────────────── */}
      {comTempo && (
        <View style={styles.timerContainer}>
          <Text style={[styles.timerNumero, { color: corTempo }]}>{tempo}</Text>
          <View style={styles.timerTrack}>
            <View
              style={[
                styles.timerFill,
                {
                  width: `${(tempo / TEMPO_POR_QUESTAO) * 100}%`,
                  backgroundColor: corTempo,
                },
              ]}
            />
          </View>
        </View>
      )}

      {/* ── Questão ─────────────────────────────────────────────────── */}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Meta chips */}
        <View style={styles.metaRow}>
          {questaoAtual.banca_nome && (
            <View style={styles.metaChip}>
              <Text style={styles.metaTexto}>{questaoAtual.banca_nome}</Text>
            </View>
          )}
          {questaoAtual.materia_nome && (
            <View style={styles.metaChip}>
              <Text style={styles.metaTexto}>{questaoAtual.materia_nome}</Text>
            </View>
          )}
        </View>

        {/* Contexto (texto-base compartilhado) */}
        {!!questaoAtual.contexto && (
          <View style={styles.contextoBox}>
            <Text style={styles.contextoTexto}>{questaoAtual.contexto}</Text>
          </View>
        )}

        {/* Enunciado */}
        <Text style={styles.enunciado}>{questaoAtual.enunciado}</Text>

        {/* Alternativas */}
        <View style={styles.alternativas}>
          {questaoAtual.alternativas.map((alt) => (
            <TouchableOpacity
              key={alt.id}
              style={[
                styles.alternativa,
                {
                  backgroundColor: corFundo(alt.letra),
                  borderColor: corBorda(alt.letra),
                },
              ]}
              onPress={() => !confirmada && setSelecionada(alt.letra)}
              activeOpacity={confirmada ? 1 : 0.7}
            >
              <View style={[styles.letraContainer, { borderColor: corBorda(alt.letra) }]}>
                <Text style={[
                  styles.letra,
                  confirmada && alt.letra === gabarito && { color: C.correct },
                  confirmada && alt.letra === selecionada && alt.letra !== gabarito && { color: C.lives },
                ]}>
                  {alt.letra}
                </Text>
              </View>
              <Text style={styles.altTexto}>{alt.texto}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Feedback */}
        {confirmada && (
          <View style={[
            styles.feedback,
            {
              backgroundColor: acertou ? '#0d2b1f' : '#2b0d1a',
              borderColor:     acertou ? C.correct : C.lives,
            },
          ]}>
            <Text style={[styles.feedbackTitulo, { color: acertou ? C.correct : C.lives }]}>
              {acertou
                ? '✓  Correto!'
                : tempoEsgotado
                  ? '⏱  Tempo esgotado!'
                  : '✗  Incorreto'}
            </Text>
            {(errou || tempoEsgotado) && gabarito && (
              <Text style={styles.feedbackSub}>
                A resposta correta é a alternativa{' '}
                <Text style={{ color: C.correct, fontFamily: 'Nunito_700Bold' }}>{gabarito}</Text>
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
        {!confirmada ? (
          <TouchableOpacity
            style={[styles.botao, (!selecionada || corrigindo) && styles.botaoDisabled]}
            onPress={confirmar}
            disabled={!selecionada || corrigindo}
            activeOpacity={0.85}
          >
            {corrigindo
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.botaoTexto}>Confirmar</Text>
            }
          </TouchableOpacity>
        ) : (
          // Só mostra botão Próxima/Ver resultado se não foi tempo esgotado
          // (tempo esgotado avança automaticamente)
          !tempoEsgotado && vidasAtual > 0 && (
            <TouchableOpacity
              style={styles.botao}
              onPress={() => {
                if (isUltima) {
                  finalizarPartida(false);
                } else {
                  avancarQuestao();
                }
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.botaoTexto}>
                {isUltima ? 'Ver resultado' : 'Próxima →'}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>

      {/* ── Modal: sem vidas ─────────────────────────────────────────── */}
      <ModalSemVidas
        visible={modalSemVidas}
        onAssistirAd={handleAssistirAd}
        onAssinar={handleAssinar}
        onEncerrar={handleEncerrar}
      />
    </View>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  centrado: {
    flex: 1, backgroundColor: C.bg,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  loadingTexto: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: C.text2, marginTop: 12,
  },
  erroEmoji:       { fontSize: 40 },
  erroTexto:       { fontFamily: 'Inter_400Regular', fontSize: 15, color: C.text2, textAlign: 'center', lineHeight: 22 },
  erroBtn: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  erroBtnTexto:    { fontFamily: 'Nunito_700Bold', fontSize: 15, color: C.text },
  erroBtnVoltar:   { paddingVertical: 12 },
  erroBtnVoltarTexto: { fontFamily: 'Inter_500Medium', fontSize: 14, color: C.text2 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: C.card,
    gap: 12,
  },
  btnSair: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.card, justifyContent: 'center', alignItems: 'center',
  },
  btnSairTexto: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: C.text2 },

  progressoContainer: { flex: 1, gap: 4 },
  progressoTrack: {
    height: 6, backgroundColor: C.card, borderRadius: 999, overflow: 'hidden',
  },
  progressoFill: { height: 6, backgroundColor: C.primary, borderRadius: 999 },
  progressoTexto: {
    fontFamily: 'Inter_400Regular', fontSize: 11, color: C.text2, textAlign: 'right',
  },

  vidasRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vidaIcone: { fontSize: 16 },
  vidaNumero: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#FF4069' },

  // Timer
  timerContainer: {
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: C.card,
  },
  timerNumero: { fontFamily: 'Nunito_900Black', fontSize: 22, width: 36, textAlign: 'center' },
  timerTrack: {
    flex: 1, height: 6, backgroundColor: C.card, borderRadius: 999, overflow: 'hidden',
  },
  timerFill: { height: 6, borderRadius: 999 },

  // Questão
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 14 },

  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    backgroundColor: C.card, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  metaTexto: { fontFamily: 'Inter_500Medium', fontSize: 11, color: C.primary },

  contextoBox: {
    backgroundColor: C.card, borderRadius: 8,
    padding: 14, borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  contextoTexto: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: C.text2, lineHeight: 20,
  },

  enunciado: {
    fontFamily: 'Inter_400Regular', fontSize: 16, color: C.text, lineHeight: 26,
  },

  alternativas: { gap: 10 },
  alternativa: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  letraContainer: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1.5, borderColor: C.border,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  letra: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: C.text },
  altTexto: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: C.text,
    flex: 1, lineHeight: 22,
  },

  feedback: {
    borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 6,
  },
  feedbackTitulo: { fontFamily: 'Nunito_700Bold', fontSize: 15 },
  feedbackSub: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: C.text2, lineHeight: 20,
  },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: C.card,
  },
  botao: {
    backgroundColor: C.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
  },
  botaoDisabled: { opacity: 0.35 },
  botaoTexto: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: C.text },

  // Modal sem vidas
  modalOverlay: {
    flex: 1, backgroundColor: '#000000CC',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalSemVidasCard: {
    backgroundColor: C.card, borderRadius: 24,
    padding: 28, width: '100%', alignItems: 'center', gap: 12,
  },
  modalSemVidasEmoji:   { fontSize: 48 },
  modalSemVidasTitulo:  { fontFamily: 'Nunito_900Black', fontSize: 22, color: C.text, textAlign: 'center' },
  modalSemVidasSub: {
    fontFamily: 'Inter_400Regular', fontSize: 14, color: C.text2,
    textAlign: 'center', lineHeight: 20, marginBottom: 8,
  },
  modalSemVidasBtnAd: {
    backgroundColor: C.primary, borderRadius: 14,
    paddingVertical: 16, width: '100%', alignItems: 'center',
  },
  modalSemVidasBtnAdTexto: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: C.text },
  modalSemVidasBtnPremium: {
    backgroundColor: '#FFD70022', borderRadius: 14,
    paddingVertical: 16, width: '100%', alignItems: 'center',
    borderWidth: 1.5, borderColor: C.gold,
  },
  modalSemVidasBtnPremiumTexto: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: C.gold },
  modalSemVidasBtnEncerrar: {
    paddingVertical: 14, width: '100%', alignItems: 'center',
  },
  modalSemVidasBtnEncerrarTexto: {
    fontFamily: 'Inter_500Medium', fontSize: 14, color: C.text2,
  },
});