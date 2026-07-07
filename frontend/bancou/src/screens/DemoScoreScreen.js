import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Animated,
  ScrollView,
  StatusBar,
} from 'react-native';
import {
  useFonts,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  Inter_400Regular,
  Inter_500Medium,
} from '@expo-google-fonts/inter';

const XP_POR_ACERTO = 10;

function getFaixa(acertos, total) {
  const pct = acertos / total;
  if (acertos === total) {
    return {
      titulo: 'Gabaritou! 🏆',
      subtitulo: 'Impressionante. Você já tá na frente de muita gente.',
      pose: require('../assets/kou-constancia.png'),
      corTitulo: '#FFD700',
    };
  } else if (pct >= 0.7) {
    return {
      titulo: 'Quase perfeito! ⭐',
      subtitulo: 'Com estudo constante, você chega lá rapidinho.',
      pose: require('../assets/kou-evolucao.png'),
      corTitulo: '#6C63FF',
    };
  } else if (pct >= 0.4) {
    return {
      titulo: 'Bom começo!',
      subtitulo: 'Você tem potencial. Falta consistência — e o Bancou te ajuda com isso.',
      pose: require('../assets/kou.png'),
      corTitulo: '#00C896',
    };
  } else {
    return {
      titulo: 'Não desanima!',
      subtitulo: 'Todo especialista já foi iniciante. O primeiro passo é agora.',
      pose: require('../assets/kou-foco.png'),
      corTitulo: '#FF6B35',
    };
  }
}

export default function DemoScoreScreen({ navigation, route }) {
  const { acertos = 0, total = 10 } = route.params ?? {};
  const xpGanho = acertos * XP_POR_ACERTO;
  const erros = total - acertos;
  const aproveitamento = Math.round((acertos / total) * 100);
  const faixa = getFaixa(acertos, total);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Inter_400Regular,
    Inter_500Medium,
  });

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 80, useNativeDriver: true }),
      ]),
      Animated.timing(xpAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, []);

  if (!fontsLoaded) return null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <Animated.View style={[styles.pontsWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image source={faixa.pose} style={styles.ponts} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}>
        <Text style={[styles.titulo, { color: faixa.corTitulo }]}>{faixa.titulo}</Text>
        <Text style={styles.subtitulo}>{faixa.subtitulo}</Text>
      </Animated.View>

      {/* Card de resultado */}
      <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Placar — três colunas com largura fixa, sem flex */}
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

        <Animated.View style={[styles.xpRow, { opacity: xpAnim }]}>
          <Text style={styles.xpIcone}>⭐</Text>
          <Text style={styles.xpValor}>+{xpGanho} XP</Text>
          <Text style={styles.xpLabel}>ganhos nesta sessão</Text>
        </Animated.View>
      </Animated.View>

      <Animated.View style={[styles.valorBox, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.valorTexto}>
          Crie sua conta e acumule XP, mantenha sua sequência e concorra às vagas que você quer.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.ctaWrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity
          style={styles.botaoPrimario}
          onPress={() => navigation.navigate('Auth', { tela: 'cadastro' })}
          activeOpacity={0.85}
        >
          <Text style={styles.botaoPrimarioTexto}>Criar conta grátis</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.botaoSecundario}
          onPress={() => navigation.navigate('Demo')}
          activeOpacity={0.75}
        >
          <Text style={styles.botaoSecundarioTexto}>Tentar novamente</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 40,
    gap: 0,
  },

  pontsWrapper: { marginBottom: 16 },
  ponts: { width: 160, height: 160 },

  titulo: {
    fontFamily: 'Nunito_900Black',
    fontSize: 28,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitulo: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#9090B0',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },

  card: {
    backgroundColor: '#252540',
    borderRadius: 14,
    width: '100%',
    paddingVertical: 24,
    paddingHorizontal: 16,
    marginBottom: 20,
  },

  placarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placarItem: {
    width: 90,
    alignItems: 'center',
  },
  numeroAcerto: {
    fontFamily: 'Nunito_900Black',
    fontSize: 36,
    color: '#FFD700',
    includeFontPadding: false,
  },
  numeroErro: {
    fontFamily: 'Nunito_900Black',
    fontSize: 36,
    color: '#FF4069',
    includeFontPadding: false,
  },
  numeroPct: {
    fontFamily: 'Nunito_900Black',
    fontSize: 30,
    color: '#FFD700',
    includeFontPadding: false,
  },
  placarLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#9090B0',
    marginTop: 4,
    textAlign: 'center',
  },
  divisorVertical: {
    width: 1,
    height: 56,
    backgroundColor: '#1a1a2e',
    marginHorizontal: 4,
  },
  divisorHorizontal: {
    height: 1,
    backgroundColor: '#1a1a2e',
    marginVertical: 20,
  },

  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  xpIcone: { fontSize: 20 },
  xpValor: {
    fontFamily: 'Nunito_900Black',
    fontSize: 24,
    color: '#6C63FF',
  },
  xpLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#9090B0',
  },

  valorBox: {
    backgroundColor: '#252540',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: '#6C63FF',
  },
  valorTexto: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 21,
  },

  ctaWrapper: {
    width: '100%',
    gap: 12,
  },
  botaoPrimario: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  botaoPrimarioTexto: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 17,
    color: '#FFFFFF',
  },
  botaoSecundario: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: '#9090B0',
  },
});