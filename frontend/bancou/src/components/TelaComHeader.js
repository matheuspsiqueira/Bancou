// src/components/TelaComHeader.js
// Substitui o topBar que antes vivia direto no HomeScreen.js.
// Cada tela de aba (Inicio, Loja, Duelos, Ranking, Perfil) usa este wrapper
// pra manter o header (logo + stats) e a safe area consistentes entre si,
// já que agora cada aba é uma tela própria dentro do TabNavigator.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import StatsHeader from './StatsHeader';
import { MOCK } from '../utils/mockData';

export default function TelaComHeader({ children }) {
  const insets = useSafeAreaInsets();
  const { usuario } = useAuth();

  const streak = usuario?.streak ?? MOCK.streak;
  const vidas  = usuario?.vidas  ?? MOCK.vidas;
  const moedas = usuario?.moedas ?? MOCK.moedas;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.logo}>
          Bancou<Text style={{ color: '#FF6B35' }}>.</Text>
        </Text>
        <StatsHeader streak={streak} vidas={vidas} moedas={moedas} />
      </View>

      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#1a1a2e' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#252540',
  },
  logo: { fontFamily: 'Nunito_900Black', fontSize: 22, color: '#FFFFFF' },
});
