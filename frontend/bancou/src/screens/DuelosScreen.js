// src/screens/DuelosScreen.js
// A TabBarCustomizada já intercepta o toque na aba Duelos e mostra um
// alerta sem navegar pra cá. Esta tela existe só porque o Tab.Navigator
// exige um componente por rota — serve como fallback caso a navegação
// aconteça por outro caminho (deep link, navigation.navigate direto, etc).
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import TelaComHeader from '../components/TelaComHeader';
import { colors, typography, fontSize, spacing } from '../theme';

export default function DuelosScreen() {
  return (
    <TelaComHeader>
      <View style={styles.container}>
        <Image source={require('../assets/kou-obra.png')} style={styles.kou} resizeMode="contain" />
        <Text style={styles.titulo}>Modo Duelo</Text>
        <Text style={styles.desc}>
          Desafie outros concurseiros em partidas 1x1 com as mesmas 10 questões.
          Essa feature ainda está em construção — fique de olho!
        </Text>
      </View>
    </TelaComHeader>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl2 },
  kou:    { width: 120, height: 120, marginBottom: 20 },
  titulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: spacing.sm },
  desc:   { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});