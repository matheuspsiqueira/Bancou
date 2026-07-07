// src/screens/ScoreScreen.js
import React, { useEffect, useRef } from 'react';
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

// ─── Lógica de faixa de resultado ────────────────────────────────────────
function getFaixa(acertos, total, abandonada) {
  if (abandonada) {
    return {
      titulo: 'Partida encerrada',
      subtitulo: 'Você foi até onde pôde. Continue estudando!',
      pose: require('../assets/ponts-ops.png'),
      corTitulo: '#FF6B35',
    };
  }
  const pct = total > 0 ? acertos / total : 0;
  if (acertos === total) {
    return {
      titulo: 'Gabaritou! 🏆',
      subtitulo: 'Perfeito! Você dominou todas as questões desta partida.',
      pose: require('../assets/ponts-animado.png'),
      corTitulo: '#FFD700',
    };
  } else if (pct >= 0.7) {
    return {
      titulo: 'Excelente! ⭐',
      subtitulo: 'Ótimo desempenho. Você está no caminho certo para a aprovação.',
      pose: require('../assets/ponts-torcendo.png'),
      corTitulo: '#6C63FF',
    };
  } else if (pct >= 0.4) {
    return {
      titulo: 'Bom trabalho!',
      subtitulo: 'Continue estudando com constância e os resultados vão melhorar.',
      pose: require('../assets/ponts-constancia.png'),
      corTitulo: '#00C896',
    };
  } else {
    return {
      titulo: 'Não desanima!',
      subtitulo: 'Cada questão errada é uma lição. Revise e tente novamente.',
      pose: require('../assets/ponts-ops.png'),
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
  } = route.params ?? {};

  const insets      = useSafeAreaInsets();
  const aproveitamento = total > 0 ? Math.round((acertos / total) * 100) : 0;
  const faixa       = getFaixa(acertos, total, abandonada);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const xpAnim    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.timing(xpAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Ponts */}
      <Animated.View style={[styles.pontsWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image source={faixa.pose} style={styles.ponts} resizeMode="contain" />
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
            <Text style={styles.recompensaIcone}>⭐</Text>
            <Text style={styles.recompensaValor}>+{xpGanho}</Text>
            <Text style={styles.recompensaLabel}>XP</Text>
          </View>
          <View style={styles.recompensaDivisor} />
          <View style={styles.recompensaItem}>
            <Text style={styles.recompensaIcone}>🪙</Text>
            <Text style={[styles.recompensaValor, { color: '#FFD700' }]}>+{moedasGanhas}</Text>
            <Text style={styles.recompensaLabel}>moedas</Text>
          </View>
        </Animated.View>
      </Animated.View>

      {/* CTAs */}
      <Animated.View style={[styles.ctaWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.botaoPrimario}
          onPress={() => navigation.replace('Home')}
          activeOpacity={0.85}
        >
          <Text style={styles.botaoPrimarioTexto}>Jogar novamente</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.75}
        >
          <Text style={styles.botaoSecundarioTexto}>Voltar ao início</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  content: {
    alignItems: 'center', paddingHorizontal: 24, gap: 0,
  },

  pontsWrapper: { marginBottom: 16 },
  ponts:        { width: 160, height: 160 },

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
  recompensaIcone:  { fontSize: 22 },
  recompensaValor:  { fontFamily: 'Nunito_900Black', fontSize: 26, color: '#6C63FF' },
  recompensaLabel:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0' },

  ctaWrapper: { width: '100%', gap: 12 },
  botaoPrimario: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  botaoPrimarioTexto:   { fontFamily: 'Nunito_700Bold', fontSize: 17, color: '#FFFFFF' },
  botaoSecundario:      { borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  botaoSecundarioTexto: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#9090B0' },
});