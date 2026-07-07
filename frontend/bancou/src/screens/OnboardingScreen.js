import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  FlatList, Animated, Image, StatusBar,
} from 'react-native';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    pose: require('../assets/kou-foco.png'),
    titulo: 'Estude com propósito',
    descricao: 'Questões reais de bancas oficiais, organizadas por matéria. Sem enrolação.',
    mostrarPular: true,
  },
  {
    id: '2',
    pose: require('../assets/kou-constancia.png'),
    titulo: 'Ganhe pontos, mantenha o streak',
    descricao: 'Cada questão respondida te aproxima da aprovação. Não quebre sua sequência!',
    chips: [
      { icon: '🔥', label: '7 dias', cor: colors.streak },
      { icon: '❤️', label: '5 vidas', cor: colors.lives },
      { icon: '🪙', label: '320 moedas', cor: colors.coins },
    ],
    mostrarPular: true,
  },
  {
    id: '3',
    pose: require('../assets/kou-evolucao.png'),
    titulo: 'Pronto para passar\nno concurso?',
    descricao: 'Crie sua conta e comece agora. Ou experimente sem cadastro.',
    isFinal: true,
    mostrarPular: false,
  },
];

export default function OnboardingScreen({ navigation }) {
  const [indiceAtual, setIndiceAtual] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const irParaProximo = () => {
    if (indiceAtual < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: indiceAtual + 1, animated: true });
    }
  };

  const pular = () => {
    flatListRef.current?.scrollToIndex({ index: slides.length - 1, animated: true });
  };

  const onMomentumScrollEnd = (e) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndiceAtual(index);
  };

  const renderSlide = ({ item }) => (
    <View style={styles.slide}>
      <View style={styles.imagemContainer}>
        <Image source={item.pose} style={styles.mascote} resizeMode="contain" />
      </View>

      <View style={styles.conteudo}>
        <Text style={styles.titulo}>{item.titulo}</Text>
        <Text style={styles.descricao}>{item.descricao}</Text>

        {item.chips && (
          <View style={styles.chipsRow}>
            {item.chips.map((chip, i) => (
              <View key={i} style={[styles.chip, { borderColor: chip.cor }]}>
                <Text style={styles.chipIcon}>{chip.icon}</Text>
                <Text style={[styles.chipLabel, { color: chip.cor }]}>{chip.label}</Text>
              </View>
            ))}
          </View>
        )}

        {item.isFinal ? (
          <View style={styles.botoesFinais}>
            <TouchableOpacity
              style={styles.botaoPrimario}
              onPress={() => navigation.navigate('Auth', { tela: 'login' })}
            >
              <Text style={styles.botaoPrimarioTexto}>Login / Cadastro</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.botaoSecundario}
              onPress={() => navigation.navigate('Demo')}
            >
              <Text style={styles.botaoSecundarioTexto}>Testar sem cadastro</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.botaoPrimario} onPress={irParaProximo}>
            <Text style={styles.botaoPrimarioTexto}>Próximo</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      {slides[indiceAtual].mostrarPular && (
        <TouchableOpacity style={styles.pularBtn} onPress={pular}>
          <Text style={styles.pularTexto}>Pular</Text>
        </TouchableOpacity>
      )}

      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={renderSlide}
      />

      <View style={styles.dotsContainer}>
        {slides.map((_, i) => {
          const dotWidth = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [8, 24, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * width, i * width, (i + 1) * width],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return <Animated.View key={i} style={[styles.dot, { width: dotWidth, opacity }]} />;
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  pularBtn: {
    position: 'absolute', top: 52, right: spacing.xl, zIndex: 10,
    paddingVertical: 6, paddingHorizontal: spacing.md,
  },
  pularTexto: {
    fontFamily: typography.medium,
    fontSize: fontSize.label,
    color: colors.textSecondary,
  },
  slide: { width, flex: 1, alignItems: 'center', paddingTop: spacing.xl2 },
  imagemContainer: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    maxHeight: height * 0.42,
  },
  mascote: { width: width * 0.65, height: height * 0.38 },
  conteudo: {
    width: '100%', paddingHorizontal: spacing.xl2,
    paddingBottom: 120, alignItems: 'center',
  },
  titulo: {
    fontFamily: typography.extraBold,
    fontSize: fontSize.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 36,
  },
  descricao: {
    fontFamily: typography.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: spacing.xl,
  },
  chipsRow: {
    flexDirection: 'row', gap: spacing.md,
    marginBottom: spacing.xl2, flexWrap: 'wrap', justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: 7,
    gap: spacing.sm, backgroundColor: colors.card,
  },
  chipIcon: { fontSize: 16 },
  chipLabel: {
    fontFamily: typography.bold,
    fontSize: fontSize.label,
  },
  botoesFinais: { width: '100%', gap: spacing.md },
  botaoPrimario: {
    width: '100%', backgroundColor: colors.primary,
    paddingVertical: spacing.lg, borderRadius: borderRadius.lg, alignItems: 'center',
  },
  botaoPrimarioTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.text,
  },
  botaoSecundario: {
    width: '100%', backgroundColor: 'transparent',
    borderWidth: 1.5, borderColor: colors.primary,
    paddingVertical: 15, borderRadius: borderRadius.lg, alignItems: 'center',
  },
  botaoSecundarioTexto: {
    fontFamily: typography.semibold,
    fontSize: fontSize.button,
    color: colors.primary,
  },
  dotsContainer: {
    position: 'absolute', bottom: 56, flexDirection: 'row',
    alignSelf: 'center', gap: spacing.sm, alignItems: 'center',
  },
  dot: { height: 8, borderRadius: borderRadius.sm, backgroundColor: colors.primary },
});