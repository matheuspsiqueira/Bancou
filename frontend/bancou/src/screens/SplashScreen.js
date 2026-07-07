import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, StatusBar } from 'react-native';
import { colors, typography, fontSize } from '../theme';

export default function SplashScreen({ navigation }) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.delay(1500),
    ]).start(() => navigation.replace('Onboarding'));
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <Animated.View style={[styles.content, { opacity }]}>
        <Image
          source={require('../assets/kou.png')}
          style={styles.mascote}
          resizeMode="contain"
        />
        <Text style={styles.logo}>
          Bancou<Text style={styles.ponto}>.</Text>
        </Text>
        <Text style={styles.tagline}>Estude. Acumule pontos. Conquiste seu futuro.</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  mascote: {
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  logo: {
    fontFamily: typography.black,
    fontSize: fontSize.heroLogo,
    color: colors.text,
    marginBottom: 12,
  },
  ponto: {
    color: colors.streak,
  },
  tagline: {
    fontFamily: typography.regular,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 20,
  },
});