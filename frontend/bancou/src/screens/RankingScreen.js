// src/screens/RankingScreen.js
// Extraído de HomeScreen.js (era o componente AbaRanking). Lógica idêntica,
// ainda usando RANKING_MOCK até o backend de Ligas/PDL existir.
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import TelaComHeader from '../components/TelaComHeader';
import { MOCK, RANKING_MOCK } from '../utils/mockData';

export default function RankingScreen() {
  const { usuario } = useAuth();
  const liga = usuario?.liga ?? MOCK.liga;
  const medalhas = ['🥇', '🥈', '🥉'];

  return (
    <TelaComHeader>
      <ScrollView style={styles.abaContainer} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.emBreveCardRanking}>
          <Text style={styles.emBreveEmoji}>🏆</Text>
          <Text style={styles.emBreveTitulo}>Ranking · Em breve</Text>
          <Text style={styles.emBreveDesc}>
            As ligas semanais estão sendo preparadas. Abaixo você vê uma prévia de como vai funcionar!
          </Text>
        </View>

        <View style={[styles.ligaBanner, { opacity: 0.5 }]}>
          <Text style={styles.ligaEmoji}>🏆</Text>
          <View>
            <Text style={styles.ligaTitulo}>Liga {liga}</Text>
            <Text style={styles.ligaSub}>Ranking semanal — encerra em 3 dias</Text>
          </View>
        </View>

        {RANKING_MOCK.map((item) => (
          <View key={item.pos} style={[styles.rankingItem, item.voce && styles.rankingItemVoce, { opacity: 0.5 }]}>
            <Text style={styles.rankingPos}>{item.pos <= 3 ? medalhas[item.pos - 1] : `#${item.pos}`}</Text>
            <Text style={[styles.rankingNome, item.voce && styles.rankingNomeVoce]}>{item.nome}</Text>
            <Text style={styles.rankingXp}>⭐ {item.xp.toLocaleString()}</Text>
          </View>
        ))}

        <View style={[styles.ligaAviso, { opacity: 0.5 }]}>
          <Text style={styles.ligaAvisoText}>
            Os 3 primeiros sobem para Liga Ouro. Os 2 últimos descem para Bronze.
          </Text>
        </View>
      </ScrollView>
    </TelaComHeader>
  );
}

const styles = StyleSheet.create({
  abaContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  emBreveCardRanking: {
    backgroundColor: '#252540', borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#FFD70033', borderStyle: 'dashed',
  },
  emBreveEmoji:  { fontSize: 32, marginBottom: 8 },
  emBreveTitulo: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#9090B0', marginBottom: 6 },
  emBreveDesc:   { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', textAlign: 'center', lineHeight: 19 },
  ligaBanner: {
    backgroundColor: '#252540', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  ligaEmoji:  { fontSize: 32 },
  ligaTitulo: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#FFD700' },
  ligaSub:    { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0' },
  rankingItem: {
    backgroundColor: '#252540', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12,
  },
  rankingItemVoce: { borderWidth: 1, borderColor: '#6C63FF', backgroundColor: '#6C63FF18' },
  rankingPos:      { fontFamily: 'Nunito_700Bold', fontSize: 18, width: 36, textAlign: 'center', color: '#FFFFFF' },
  rankingNome:     { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#FFFFFF' },
  rankingNomeVoce: { color: '#6C63FF', fontFamily: 'Nunito_700Bold' },
  rankingXp:       { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#6C63FF' },
  ligaAviso:       { backgroundColor: '#252540', borderRadius: 10, padding: 12, marginTop: 8 },
  ligaAvisoText:   { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', textAlign: 'center', lineHeight: 17 },
});
