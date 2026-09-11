// src/screens/PartidaScreen.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { useKouAlert } from '../context/KouAlertContext';
import { tocar } from '../services/somService';
import { colors, typography, fontSize } from '../theme';

const TEMPO_POR_QUESTAO = 60;   // segundos
const PAUSA_FEEDBACK_MS = 1500; // ms que o feedback fica visível antes de avançar (só no timer/buff)

// ─── Componente de vidas ──────────────────────────────────────────────────
function Vidas({ atual }) {
  return (
    <View style={styles.vidasRow}>
      <Text style={styles.vidaIcone}>❤️</Text>
      <Text style={styles.vidaNumero}>{atual}</Text>
    </View>
  );
}

// ─── Componente de imagem da questão ───────────────────────────────────────
// Isolado em componente próprio + `key={questao.id}` no uso, pra que o
// estado de erro resete sozinho a cada troca de questão.
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
      {carregando && (
        <ActivityIndicator
          size="small"
          color={colors.primary}
          style={styles.imagemLoading}
        />
      )}
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

// ─── Tela principal ───────────────────────────────────────────────────────
export default function PartidaScreen({ navigation, route }) {
  const { filtro } = route.params ?? {};
  const { authFetch, usuario, atualizarUsuario } = useAuth();
  const { alertar } = useKouAlert();
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
  const partidaIdRef  = useRef(null);
  const streakAnteriorRef = useRef(0);

  // ── Vida consumida na entrada (fixa durante a partida inteira) ─────────
  const [vidasAtual, setVidasAtual] = useState(usuario?.vidas ?? 3);

  // ── Buffs (pula_questao / elimina_alternativas) ─────────────────────────
  // inventario: { pula_questao: 2, elimina_alternativas: 1, ... }
  const [inventario, setInventario] = useState({});
  const [usandoBuff, setUsandoBuff] = useState(null); // codigo do buff em requisição, ou null
  const [alternativasEliminadas, setAlternativasEliminadas] = useState([]);

  // ── Timer ───────────────────────────────────────────────────────────────
  const comTempo     = filtro?.comTempo ?? false;
  const [tempo,      setTempo]          = useState(TEMPO_POR_QUESTAO);
  const timerRef     = useRef(null);
  const expiradoRef  = useRef(false); // impede duplo-disparo

  // ── Busca as questões + inventário de buffs ao montar ───────────────────
  useEffect(() => {
    // Bloqueia entrada se usuário está sem vidas (checagem definitiva é no backend)
    if ((usuario?.vidas ?? 3) === 0) {
      alertar(
        'Sem vidas!',
        'Você não tem vidas suficientes para jogar. Aguarde a recuperação ou compre na loja.',
        [{ text: 'Voltar', onPress: () => navigation.goBack() }],
        { pose: 'ops' }
      );
      return;
    }
    buscarQuestoes();
    buscarInventario();
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
      let path = `/api/questoes/iniciar-partida/${query ? `?${query}` : ''}`;
      const resp = await authFetch(path);
      const data = await resp.json();
      if (!resp.ok) {
        // Backend recusou (ex: sem vidas) — trata como erro de requisição
        throw new Error(data.detail || 'Erro ao buscar questões.');
      }
      partidaIdRef.current = data.partida_id;
      setQuestoes(data.questoes);

      // A vida já foi descontada no backend ao criar a partida.
      // Sincroniza o número exibido e o contexto global.
      if (typeof data.vidas_restantes === 'number') {
        setVidasAtual(data.vidas_restantes);
        atualizarUsuario({ vidas: data.vidas_restantes });
      }
      if (typeof data.streak === 'number') {
        streakAnteriorRef.current = data.streak;
        atualizarUsuario({ streak: data.streak });
      }
    } catch (e) {
      setErroReq(e.message || 'Não foi possível carregar as questões.');
    } finally {
      setCarregando(false);
    }
  };

  // Busca quantos buffs consumíveis o usuário tem (pula_questao,
  // elimina_alternativas). Falha silenciosa — se der erro, os botões
  // simplesmente não aparecem, mas o jogo continua normalmente.
  const buscarInventario = async () => {
    try {
      const resp = await authFetch('/api/loja/inventario/');
      if (resp.ok) {
        const data = await resp.json();
        setInventario(data);
      }
    } catch {
      // silencioso
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
    registrarErroTempo(questaoAtual);
  }, [questoes, indice]);

  // Quando tempo esgota, chama /corrigir/ com letra inválida pra pegar o gabarito
  const registrarErroTempo = async (questao) => {
    setConfirmada(true);
    setAcertouAtual(false);
    errosRef.current += 1;
    tocar('erroQuestao');

    try {
      const resp = await authFetch('/api/questoes/corrigir/', {
        method: 'POST',
        body: JSON.stringify({
          partida_id: partidaIdRef.current,
          questao_id: questao.id,
          letra: '_',
        }),
      });
      const data = await resp.json();
      setGabarito(data.gabarito);
    } catch {
      // silencioso — gabarito não será exibido mas o fluxo continua
    }

    // Sem desconto de vida aqui — a vida já foi paga na entrada da partida.
    // Avança automaticamente após pausa de feedback.
    setTimeout(() => {
      avancarQuestao();
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
          partida_id: partidaIdRef.current,
          questao_id: questaoAtual.id,
          letra: selecionada,
        }),
      });
      const data = await resp.json();
      const correta = data.correta;

      setGabarito(data.gabarito);
      setAcertouAtual(correta);
      setConfirmada(true);
      tocar(correta ? 'sucessoQuestao' : 'erroQuestao');

      if (correta) {
        acertosRef.current += 1;
      } else {
        errosRef.current += 1;
        // Sem desconto de vida por erro — a vida já foi paga na entrada.
      }
    } catch {
      alertar('Erro', 'Não foi possível verificar a resposta. Tente novamente.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCorrigindo(false);
    }
  };

  // ── Usar buff: pula_questao ─────────────────────────────────────────────
  // Marca a questão como respondida com acerto no backend, sem o usuário
  // escolher alternativa. Segue o mesmo padrão visual do tempo esgotado:
  // mostra feedback de acerto e avança sozinho após a pausa.
  const usarPulaQuestao = async () => {
    if (usandoBuff || confirmada || corrigindo) return;
    const questaoAtual = questoes[indice];
    setUsandoBuff('pula_questao');

    try {
      const resp = await authFetch('/api/questoes/usar-buff/', {
        method: 'POST',
        body: JSON.stringify({
          partida_id: partidaIdRef.current,
          questao_id: questaoAtual.id,
          codigo_buff: 'pula_questao',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Não foi possível usar o buff.');

      clearInterval(timerRef.current);
      setGabarito(data.gabarito);
      setAcertouAtual(true);
      setConfirmada(true);
      acertosRef.current += 1;
      tocar('sucessoQuestao');
      setInventario((inv) => ({ ...inv, pula_questao: data.inventario_restante }));

      setTimeout(() => {
        avancarQuestao();
      }, PAUSA_FEEDBACK_MS);
    } catch (e) {
      alertar('Erro', e.message || 'Não foi possível usar o buff.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setUsandoBuff(null);
    }
  };

  // ── Usar buff: elimina_alternativas ─────────────────────────────────────
  // Não confirma a questão — só esconde 2 alternativas incorretas.
  const usarEliminaAlternativas = async () => {
    if (usandoBuff || confirmada || alternativasEliminadas.length > 0) return;
    const questaoAtual = questoes[indice];
    setUsandoBuff('elimina_alternativas');

    try {
      const resp = await authFetch('/api/questoes/usar-buff/', {
        method: 'POST',
        body: JSON.stringify({
          partida_id: partidaIdRef.current,
          questao_id: questaoAtual.id,
          codigo_buff: 'elimina_alternativas',
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Não foi possível usar o buff.');

      setAlternativasEliminadas(data.alternativas_eliminadas);
      setInventario((inv) => ({ ...inv, elimina_alternativas: data.inventario_restante }));
    } catch (e) {
      alertar('Erro', e.message || 'Não foi possível usar o buff.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setUsandoBuff(null);
    }
  };

  // ── Avançar questão ─────────────────────────────────────────────────────
  const avancarQuestao = useCallback(() => {
    const proximoIndice = indice + 1;

    setSelecionada(null);
    setConfirmada(false);
    setAcertouAtual(false);
    setGabarito(null);
    setAlternativasEliminadas([]);
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
          streak: data.usuario.streak,
        });
        navigation.replace('Score', {
          acertos,
          erros,
          total: questoes.length,
          xpGanho:      data.xp_ganho,
          moedasGanhas: data.moedas_ganhas,
          abandonada,
          streakAnterior: streakAnteriorRef.current,
          streakNovo:     data.usuario.streak,
        });
      } else {
        navigation.replace('Score', {
          acertos, erros, total: questoes.length,
          xpGanho: acertos * 10, moedasGanhas: acertos * 2, abandonada,
          streakAnterior: streakAnteriorRef.current,
          streakNovo:     streakAnteriorRef.current,
        });
      }
    } catch {
      navigation.replace('Score', {
        acertos, erros, total: questoes.length,
        xpGanho: acertos * 10, moedasGanhas: acertos * 2, abandonada,
        streakAnterior: streakAnteriorRef.current,
        streakNovo:     streakAnteriorRef.current,
      });
    }
  };

  // ── Cor das alternativas ─────────────────────────────────────────────────
  const corFundo = (letra) => {
    if (!confirmada) return selecionada === letra ? colors.primary : colors.card;
    if (letra === gabarito)                    return '#0d2b1f'; // verde escuro
    if (letra === selecionada && letra !== gabarito) return '#2b0d1a'; // vermelho escuro
    return colors.card;
  };

  const corBorda = (letra) => {
    if (!confirmada) return selecionada === letra ? colors.primary : BORDA;
    if (letra === gabarito)                    return colors.correct;
    if (letra === selecionada && letra !== gabarito) return colors.lives;
    return BORDA;
  };

  // ── Cor do timer ─────────────────────────────────────────────────────────
  const corTempo = tempo > 20 ? colors.correct : tempo > 10 ? colors.coins : colors.lives;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (carregando) {
    return (
      <View style={[styles.centrado, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primary} />
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

  const temBuffPula    = (inventario.pula_questao ?? 0) > 0;
  const temBuffElimina = (inventario.elimina_alternativas ?? 0) > 0 && alternativasEliminadas.length === 0;
  const mostrarBuffs   = !confirmada && (temBuffPula || temBuffElimina);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnSair}
          onPress={() =>
            alertar(
              'Sair da partida?',
              'Seu progresso parcial será salvo. A vida usada não será devolvida.',
              [
                { text: 'Continuar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: () => finalizarPartida(true) },
              ],
              { pose: 'triste' }
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

        {/* Imagem da questão (quando houver) */}
        {questaoAtual.imagem && (
          <ImagemQuestao key={questaoAtual.id} uri={questaoAtual.imagem} />
        )}

        {/* Botões de buff */}
        {mostrarBuffs && (
          <View style={styles.buffsRow}>
            {temBuffPula && (
              <TouchableOpacity
                style={styles.buffBtn}
                onPress={usarPulaQuestao}
                disabled={!!usandoBuff}
                activeOpacity={0.8}
              >
                {usandoBuff === 'pula_questao' ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.buffBtnTexto}>⏭️ Pular ({inventario.pula_questao})</Text>
                )}
              </TouchableOpacity>
            )}
            {temBuffElimina && (
              <TouchableOpacity
                style={styles.buffBtn}
                onPress={usarEliminaAlternativas}
                disabled={!!usandoBuff}
                activeOpacity={0.8}
              >
                {usandoBuff === 'elimina_alternativas' ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.buffBtnTexto}>✂️ Eliminar 2 ({inventario.elimina_alternativas})</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Alternativas */}
        <View style={styles.alternativas}>
          {questaoAtual.alternativas.map((alt) => {
            const eliminada = alternativasEliminadas.includes(alt.letra);
            return (
              <TouchableOpacity
                key={alt.id}
                style={[
                  styles.alternativa,
                  {
                    backgroundColor: corFundo(alt.letra),
                    borderColor: corBorda(alt.letra),
                  },
                  eliminada && styles.alternativaEliminada,
                ]}
                onPress={() => !confirmada && !eliminada && setSelecionada(alt.letra)}
                activeOpacity={confirmada || eliminada ? 1 : 0.7}
                disabled={eliminada}
              >
                <View style={[styles.letraContainer, { borderColor: corBorda(alt.letra) }]}>
                  <Text style={[
                    styles.letra,
                    confirmada && alt.letra === gabarito && { color: colors.correct },
                    confirmada && alt.letra === selecionada && alt.letra !== gabarito && { color: colors.lives },
                  ]}>
                    {alt.letra}
                  </Text>
                </View>
                <Text style={[styles.altTexto, eliminada && styles.altTextoEliminado]}>
                  {alt.texto}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback */}
        {confirmada && (
          <View style={[
            styles.feedback,
            {
              backgroundColor: acertou ? '#0d2b1f' : '#2b0d1a',
              borderColor:     acertou ? colors.correct : colors.lives,
            },
          ]}>
            <Text style={[styles.feedbackTitulo, { color: acertou ? colors.correct : colors.lives }]}>
              {acertou
                ? '✓  Correto!'
                : tempoEsgotado
                  ? '⏱  Tempo esgotado!'
                  : '✗  Incorreto'}
            </Text>
            {(errou || tempoEsgotado) && gabarito && (
              <Text style={styles.feedbackSub}>
                A resposta correta é a alternativa{' '}
                <Text style={{ color: colors.correct, fontFamily: typography.bold }}>{gabarito}</Text>
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
              ? <ActivityIndicator color={colors.text} />
              : <Text style={styles.botaoTexto}>Confirmar</Text>
            }
          </TouchableOpacity>
        ) : (
          // Tempo esgotado ou buff de pular avançam automaticamente;
          // nos demais casos mostra o botão manual.
          !tempoEsgotado && (
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
    </View>
  );
}

// ─── Estilos ───────────────────────────────────────────────────────────────
// Obs: '#333355' é a cor de borda neutra usada em todo o app (AuthScreen,
// PerfilScreen, etc.) — não existe token nomeado pra ela em theme/index.js,
// então fica literal aqui igual nos outros arquivos.
const BORDA = '#333355';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  centrado: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  loadingTexto: {
    fontFamily: typography.regular, fontSize: 14, color: colors.textSecondary, marginTop: 12,
  },
  erroEmoji:       { fontSize: 40 },
  erroTexto:       { fontFamily: typography.regular, fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
  erroBtn: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  erroBtnTexto:    { fontFamily: typography.bold, fontSize: 15, color: colors.text },
  erroBtnVoltar:   { paddingVertical: 12 },
  erroBtnVoltarTexto: { fontFamily: typography.medium, fontSize: 14, color: colors.textSecondary },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.card,
    gap: 12,
  },
  btnSair: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
  },
  btnSairTexto: { fontFamily: typography.bold, fontSize: 14, color: colors.textSecondary },

  progressoContainer: { flex: 1, gap: 4 },
  progressoTrack: {
    height: 6, backgroundColor: colors.card, borderRadius: 999, overflow: 'hidden',
  },
  progressoFill: { height: 6, backgroundColor: colors.primary, borderRadius: 999 },
  progressoTexto: {
    fontFamily: typography.regular, fontSize: 11, color: colors.textSecondary, textAlign: 'right',
  },

  vidasRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vidaIcone: { fontSize: 16 },
  vidaNumero: { fontFamily: typography.bold, fontSize: 15, color: colors.lives },

  // Timer
  timerContainer: {
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderBottomWidth: 1, borderBottomColor: colors.card,
  },
  timerNumero: { fontFamily: typography.black, fontSize: 22, width: 36, textAlign: 'center' },
  timerTrack: {
    flex: 1, height: 6, backgroundColor: colors.card, borderRadius: 999, overflow: 'hidden',
  },
  timerFill: { height: 6, borderRadius: 999 },

  // Questão
  scroll: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 24, gap: 14 },

  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  metaChip: {
    backgroundColor: colors.card, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  metaTexto: { fontFamily: typography.medium, fontSize: 11, color: colors.primary },

  contextoBox: {
    backgroundColor: colors.card, borderRadius: 8,
    padding: 14, borderLeftWidth: 3, borderLeftColor: colors.primary,
  },
  contextoTexto: {
    fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20,
  },

  enunciado: {
    fontFamily: typography.regular, fontSize: 16, color: colors.text, lineHeight: 26,
  },

  // Imagem da questão
  imagemContainer: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: BORDA,
    padding: 8, alignItems: 'center', justifyContent: 'center',
    minHeight: 200,
  },
  imagemQuestao: {
    width: '100%', height: 240, borderRadius: 8,
  },
  imagemLoading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  imagemErroBox: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: BORDA, borderStyle: 'dashed',
    padding: 20, alignItems: 'center', justifyContent: 'center',
  },
  imagemErroTexto: {
    fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center',
  },

  // Botões de buff
  buffsRow: { flexDirection: 'row', gap: 10 },
  buffBtn: {
    flex: 1, backgroundColor: colors.card, borderRadius: 12,
    borderWidth: 1.5, borderColor: colors.primary,
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
  },
  buffBtnTexto: { fontFamily: typography.bold, fontSize: 13, color: colors.primary },

  alternativas: { gap: 10 },
  alternativa: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    padding: 14, borderRadius: 14, borderWidth: 1.5,
  },
  alternativaEliminada: { opacity: 0.35 },
  letraContainer: {
    width: 28, height: 28, borderRadius: 8,
    borderWidth: 1.5, borderColor: BORDA,
    justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  letra: { fontFamily: typography.bold, fontSize: 13, color: colors.text },
  altTexto: {
    fontFamily: typography.regular, fontSize: 15, color: colors.text,
    flex: 1, lineHeight: 22,
  },
  altTextoEliminado: { textDecorationLine: 'line-through' },

  feedback: {
    borderRadius: 14, borderWidth: 1.5, padding: 16, gap: 6,
  },
  feedbackTitulo: { fontFamily: typography.bold, fontSize: 15 },
  feedbackSub: {
    fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, lineHeight: 20,
  },

  // Footer
  footer: {
    paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: colors.card,
  },
  botao: {
    backgroundColor: colors.primary, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center',
  },
  botaoDisabled: { opacity: 0.35 },
  botaoTexto: { fontFamily: typography.bold, fontSize: 17, color: colors.text },
});