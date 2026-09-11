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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';

const XP_POR_ACERTO = 10;

function getFaixa(acertos, total) {
  const pct = acertos / total;
  if (acertos === total) {
    return {
      titulo: 'Gabaritou! 🏆',
      subtitulo: 'Impressionante. Você já tá na frente de muita gente.',
      pose: require('../assets/kou-constancia.png'),
      corTitulo: colors.coins,
    };
  } else if (pct >= 0.7) {
    return {
      titulo: 'Quase perfeito! ⭐',
      subtitulo: 'Com estudo constante, você chega lá rapidinho.',
      pose: require('../assets/kou-evolucao.png'),
      corTitulo: colors.primary,
    };
  } else if (pct >= 0.4) {
    return {
      titulo: 'Bom começo!',
      subtitulo: 'Você tem potencial. Falta consistência — e o Bancou te ajuda com isso.',
      pose: require('../assets/kou.png'),
      corTitulo: colors.correct,
    };
  } else {
    return {
      titulo: 'Não desanima!',
      subtitulo: 'Todo especialista já foi iniciante. O primeiro passo é agora.',
      pose: require('../assets/kou-foco.png'),
      corTitulo: colors.streak,
    };
  }
}

export default function DemoScoreScreen({ navigation, route }) {
  const { acertos = 0, total = 10 } = route.params ?? {};
  const xpGanho = acertos * XP_POR_ACERTO;
  const erros = total - acertos;
  const aproveitamento = Math.round((acertos / total) * 100);
  const faixa = getFaixa(acertos, total);
  const insets = useSafeAreaInsets();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const xpAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

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

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <Animated.View style={[styles.kouWrapper, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image source={faixa.pose} style={styles.kou} resizeMode="contain" />
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
          <Image source={require('../assets/icons/xp.png')} style={styles.xpIconePng} resizeMode="contain" />
          <Text style={styles.xpValor}> +{xpGanho} XP</Text>
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
    backgroundColor: colors.background,
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: 0,
  },

  kouWrapper: { marginBottom: spacing.lg },
  kou: { width: 160, height: 160 },

  titulo: {
    fontFamily: typography.black,
    fontSize: 28,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitulo: {
    fontFamily: typography.regular,
    fontSize: fontSize.label,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: spacing.sm,
  },

  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    width: '100%',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xl,
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
    fontFamily: typography.black,
    fontSize: 36,
    color: colors.coins,
    includeFontPadding: false,
  },
  numeroErro: {
    fontFamily: typography.black,
    fontSize: 36,
    color: colors.lives,
    includeFontPadding: false,
  },
  numeroPct: {
    fontFamily: typography.black,
    fontSize: 30,
    color: colors.coins,
    includeFontPadding: false,
  },
  placarLabel: {
    fontFamily: typography.regular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  divisorVertical: {
    width: 1,
    height: 56,
    backgroundColor: colors.background,
    marginHorizontal: spacing.xs,
  },
  divisorHorizontal: {
    height: 1,
    backgroundColor: colors.background,
    marginVertical: spacing.lg,
  },

  xpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  xpIconePng: { width: 20, height: 20 },
  xpValor: {
    fontFamily: typography.black,
    fontSize: 24,
    color: colors.primary,
  },
  xpLabel: {
    fontFamily: typography.regular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  valorBox: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    width: '100%',
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  valorTexto: {
    fontFamily: typography.regular,
    fontSize: fontSize.label,
    color: colors.text,
    lineHeight: 21,
  },

  ctaWrapper: {
    width: '100%',
    gap: spacing.md,
  },
  botaoPrimario: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  botaoPrimarioTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.text,
  },
  botaoSecundario: {
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoSecundarioTexto: {
    fontFamily: typography.medium,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
});