// src/screens/ScoreScreen.js
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tocar } from '../services/somService';
import ModalConquistaDesbloqueada from '../components/modals/ModalConquistaDesbloqueada';
import {
  registrarPartidaConcluida,
  intersticialDevido,
  preCarregarIntersticial,
  mostrarIntersticialSeDevido,
} from '../services/adsService';

// ─── Lógica de faixa de resultado ────────────────────────────────────────
function getFaixa(acertos, total, abandonada) {
  if (abandonada) {
    return {
      titulo: 'Partida encerrada',
      subtitulo: 'Você foi até onde pôde. Continue estudando!',
      pose: require('../assets/kou-ops.png'),
      corTitulo: '#FF6B35',
    };
  }
  const pct = total > 0 ? acertos / total : 0;
  if (acertos === total) {
    return {
      titulo: 'Gabaritou! 🏆',
      subtitulo: 'Perfeito! Você dominou todas as questões desta partida.',
      pose: require('../assets/kou-animado.png'),
      corTitulo: '#FFD700',
    };
  } else if (pct >= 0.7) {
    return {
      titulo: 'Excelente! ⭐',
      subtitulo: 'Ótimo desempenho. Você está no caminho certo para a aprovação.',
      pose: require('../assets/kou-torcendo.png'),
      corTitulo: '#6C63FF',
    };
  } else if (pct >= 0.4) {
    return {
      titulo: 'Bom trabalho!',
      subtitulo: 'Continue estudando com constância e os resultados vão melhorar.',
      pose: require('../assets/kou-constancia.png'),
      corTitulo: '#00C896',
    };
  } else {
    return {
      titulo: 'Não desanima!',
      subtitulo: 'Cada questão errada é uma lição. Revise e tente novamente.',
      pose: require('../assets/kou-ops.png'),
      corTitulo: '#FF4069',
    };
  }
}

export default function ScoreScreen({ navigation, route }) {
  const {
    acertos      = 0,
    erros        = 0,
    total        = 10,
    xpGanho      = 0,
    moedasGanhas = 0,
    abandonada   = false,
    streakAnterior = 0,
    streakNovo     = 0,
    conquistasDesbloqueadas = [],
  } = route.params ?? {};

  const streakAumentou = streakNovo > streakAnterior;
  const insets      = useSafeAreaInsets();
  const aproveitamento = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const faixa       = getFaixa(acertos, total, abandonada);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const xpAnim    = useRef(new Animated.Value(0)).current;
  const streakAnim  = useRef(new Animated.Value(0)).current;
  const streakScale = useRef(new Animated.Value(0.5)).current;

  // ── Celebração de conquista destravada ─────────────────────────────────
  // Fila simples: mostra uma de cada vez, avança ao fechar. O modal só
  // aparece depois da animação de entrada terminar (~1.4s) pra não
  // competir visualmente nem sonoramente com o som de sucessoFim/erroFim
  // que já toca assim que a tela monta.
  const [indiceConquista, setIndiceConquista] = useState(0);
  const [modalConquistaVisivel, setModalConquistaVisivel] = useState(false);

  useEffect(() => {
    if (conquistasDesbloqueadas.length === 0) return;
    const timer = setTimeout(() => {
      tocar('conquista');
      setModalConquistaVisivel(true);
    }, 1400);
    return () => clearTimeout(timer);
  }, []);

  const avancarConquista = () => {
    const proximoIndice = indiceConquista + 1;
    if (proximoIndice < conquistasDesbloqueadas.length) {
      setIndiceConquista(proximoIndice);
      tocar('conquista');
    } else {
      setModalConquistaVisivel(false);
    }
  };

  // ── Anúncio intersticial (a cada N partidas concluídas) ────────────────
  // Conta a partida ao montar (abandonadas não contam) e, se já for a vez,
  // começa a carregar o anúncio enquanto o usuário vê o resultado. Ele só é
  // exibido ao SAIR da tela (botões abaixo), pra não competir com as
  // animações, o som de fim de partida nem com o modal de conquista.
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    if (abandonada) return;
    (async () => {
      await registrarPartidaConcluida();
      if (await intersticialDevido()) preCarregarIntersticial();
    })();
  }, []);

  const sair = async (destino) => {
    if (saindo) return;
    setSaindo(true);
    try {
      await mostrarIntersticialSeDevido();
    } catch {
      // anúncio nunca pode travar a navegação
    }
    destino();
  };

  // ── Som de fim de partida ────────────────────────────────────────────
  // Toca uma única vez ao montar a tela: sucesso se aproveitamento > 50%,
  // erro caso contrário (partida abandonada sempre conta como erro).
  useEffect(() => {
    if (abandonada) {
      tocar('erroFim');
    } else {
      tocar(aproveitamento > 49 ? 'sucessoFim' : 'erroFim');
    }
  }, []);

  useEffect(() => {
    const sequencia = [
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.timing(xpAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ];

    if (streakAumentou) {
      sequencia.push(
        Animated.parallel([
          Animated.timing(streakAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(streakScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        ])
      );
    }

    Animated.sequence(sequencia).start();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Kou */}
      <Animated.View style={[styles.kouWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image source={faixa.pose} style={styles.kou} resizeMode="contain" />
      </Animated.View>

      {/* Título */}
      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
        <Text style={[styles.titulo, { color: faixa.corTitulo }]}>{faixa.titulo}</Text>
        <Text style={styles.subtitulo}>{faixa.subtitulo}</Text>
      </Animated.View>

      {/* Card de resultado */}
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.placarRow}>
          <View style={styles.placarItem}>
            <Text style={styles.numeroAcerto}>{acertos}</Text>
            <Text style={styles.placarLabel}>acertos</Text>
          </View>
          <View style={styles.divisorVertical} />
          <View style={styles.placarItem}>
            <Text style={styles.numeroErro}>{erros}</Text>
            <Text style={styles.placarLabel}>erros</Text>
          </View>
          <View style={styles.divisorVertical} />
          <View style={styles.placarItem}>
            <Text style={styles.numeroPct}>{aproveitamento}%</Text>
            <Text style={styles.placarLabel}>aproveitamento</Text>
          </View>
        </View>

        <View style={styles.divisorHorizontal} />

        {/* Recompensas */}
        <Animated.View style={[styles.recompensasRow, { opacity: xpAnim }]}>
          <View style={styles.recompensaItem}>
            <Image source={require('../assets/icons/xp.png')} style={styles.recompensaIconePng} resizeMode="contain" />
            <Text style={styles.recompensaValor}>+{xpGanho}</Text>
            <Text style={styles.recompensaLabel}>XP</Text>
          </View>
          <View style={styles.recompensaDivisor} />
          <View style={styles.recompensaItem}>
            <Image source={require('../assets/icons/moeda.png')} style={styles.recompensaIconePng} resizeMode="contain" />
            <Text style={[styles.recompensaValor, { color: '#FFD700' }]}>+{moedasGanhas}</Text>
            <Text style={styles.recompensaLabel}>moedas</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {streakAumentou && (
        <Animated.View
          style={[
            styles.streakCard,
            { opacity: streakAnim, transform: [{ scale: streakScale }] },
          ]}
        >
          <Image
            source={require('../assets/kou-constancia.png')}
            style={styles.streakPose}
            resizeMode="contain"
          />
          <View style={styles.streakTextos}>
            <View style={styles.streakTituloRow}>
              <Image source={require('../assets/icons/streak.png')} style={styles.streakIconePng} resizeMode="contain" />
              <Text style={styles.streakTitulo}>
                {' '}Streak de {streakNovo} {streakNovo === 1 ? 'dia' : 'dias'}!
              </Text>
            </View>
            <Text style={styles.streakSub}>
              Volte amanhã pra manter o fogo aceso.
            </Text>
          </View>
        </Animated.View>
      )}

      {/* CTAs */}
      <Animated.View style={[styles.ctaWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.botaoPrimario}
          onPress={() => sair(() => navigation.replace('Home'))}
          activeOpacity={0.85}
        >
          <Text style={styles.botaoPrimarioTexto}>Jogar novamente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={() => sair(() => navigation.navigate('Home'))}
          activeOpacity={0.75}
        >
          <Text style={styles.botaoSecundarioTexto}>Voltar ao início</Text>
        </TouchableOpacity>
      </Animated.View>

      <ModalConquistaDesbloqueada
        conquista={conquistasDesbloqueadas[indiceConquista]}
        visible={modalConquistaVisivel}
        onFechar={avancarConquista}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: {
    alignItems: 'center', paddingHorizontal: 24, gap: 0,
  },

  kouWrapper: { marginBottom: 16 },
  kou:        { width: 160, height: 160 },

  titulo: {
    fontFamily: 'Nunito_900Black', fontSize: 28,
    textAlign: 'center', marginBottom: 8,
  },
  subtitulo: {
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#9090B0',
    textAlign: 'center', lineHeight: 22, marginBottom: 28, paddingHorizontal: 8,
  },

  card: {
    backgroundColor: '#252540', borderRadius: 14, width: '100%',
    paddingVertical: 24, paddingHorizontal: 16, marginBottom: 20,
  },

  placarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  placarItem: { width: 90, alignItems: 'center' },
  numeroAcerto: {
    fontFamily: 'Nunito_900Black', fontSize: 36, color: '#FFD700', includeFontPadding: false,
  },
  numeroErro: {
    fontFamily: 'Nunito_900Black', fontSize: 36, color: '#FF4069', includeFontPadding: false,
  },
  numeroPct: {
    fontFamily: 'Nunito_900Black', fontSize: 30, color: '#FFD700', includeFontPadding: false,
  },
  placarLabel: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', marginTop: 4, textAlign: 'center',
  },
  divisorVertical: { width: 1, height: 56, backgroundColor: '#1a1a2e', marginHorizontal: 4 },
  divisorHorizontal: { height: 1, backgroundColor: '#1a1a2e', marginVertical: 20 },

  recompensasRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 0,
  },
  recompensaItem:   { flex: 1, alignItems: 'center', gap: 4 },
  recompensaDivisor:{ width: 1, height: 48, backgroundColor: '#1a1a2e' },
  recompensaIconePng: { width: 24, height: 24 },
  recompensaValor:  { fontFamily: 'Nunito_900Black', fontSize: 26, color: '#6C63FF' },
  recompensaLabel:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0' },

  streakCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#2b1d16', borderRadius: 14,
    borderWidth: 1.5, borderColor: '#FF6B35',
    paddingVertical: 14, paddingHorizontal: 16,
    width: '100%', marginBottom: 20,
  },
  streakPose:   { width: 56, height: 56 },
  streakTextos: { flex: 1 },
  streakTituloRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  streakIconePng:  { width: 14, height: 14 },
  streakTitulo: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 15, color: '#FF6B35',
  },
  streakSub: {
    fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', lineHeight: 17,
  },

  ctaWrapper: { width: '100%', gap: 12 },
  botaoPrimario: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  botaoPrimarioTexto:   { fontFamily: 'Nunito_700Bold', fontSize: 17, color: '#FFFFFF' },
  botaoSecundario:      { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  botaoSecundarioTexto: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#9090B0' },
});