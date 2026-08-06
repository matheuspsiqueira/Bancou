// src/screens/RankingScreen.js
// Extraído de HomeScreen.js (era o componente AbaRanking). Lógica idêntica,
// ainda usando RANKING_MOCK até o backend de Ligas/PDL existir.
import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import TelaComHeader from '../components/TelaComHeader';
import { MOCK, RANKING_MOCK } from '../utils/mockData';

// Cor de cada liga (estilo LoL). Troféu (ícone) fica fixo — só a cor do
// selo muda conforme a liga. Fallback cinza pra liga desconhecida.
const LIGA_CORES = {
  Ferro:    '#8E8E99',
  Bronze:   '#CD7F32',
  Prata:    '#C7C9D9',
  Ouro:     '#FFD700',
  Platina:  '#4FD1C5',
  Diamante: '#63B3FF',
};
const corDaLiga = (liga) => LIGA_CORES[liga] ?? '#9090B0';

export default function RankingScreen() {
  const { usuario } = useAuth();
  const liga = usuario?.liga ?? MOCK.liga;
  const corLiga = corDaLiga(liga);
  const medalhas = ['🥇', '🥈', '🥉'];

  return (
    <TelaComHeader>
      <ScrollView style={styles.abaContainer} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.emBreveCardRanking}>
          <Image source={require('../assets/icons/trofeu.png')} style={styles.emBreveIconePng} resizeMode="contain" />
          <Text style={styles.emBreveTitulo}>Ranking · Em breve</Text>
          <Text style={styles.emBreveDesc}>
            As ligas semanais estão sendo preparadas. Abaixo você vê uma prévia de como vai funcionar!
          </Text>
        </View>

        <View style={[styles.ligaBanner, { opacity: 0.5 }]}>
          <View style={[styles.ligaSelo, { backgroundColor: corLiga + '33', borderColor: corLiga }]}>
            <Image source={require('../assets/icons/trofeu.png')} style={styles.ligaSeloIcone} resizeMode="contain" />
          </View>
          <View>
            <Text style={[styles.ligaTitulo, { color: corLiga }]}>Liga {liga}</Text>
            <Text style={styles.ligaSub}>Ranking semanal — encerra em 3 dias</Text>
          </View>
        </View>

        {RANKING_MOCK.map((item) => (
          <View key={item.pos} style={[styles.rankingItem, item.voce && styles.rankingItemVoce, { opacity: 0.5 }]}>
            <Text style={styles.rankingPos}>{item.pos <= 3 ? medalhas[item.pos - 1] : `#${item.pos}`}</Text>
            <Text style={[styles.rankingNome, item.voce && styles.rankingNomeVoce]}>{item.nome}</Text>
            <View style={styles.rankingXpRow}>
              <Image source={require('../assets/icons/trofeu.png')} style={styles.rankingXpIcone} resizeMode="contain" />
              <Text style={styles.rankingXp}> {item.xp.toLocaleString()}</Text>
            </View>
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
  emBreveIconePng: { width: 32, height: 32, marginBottom: 8 },
  emBreveTitulo: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#9090B0', marginBottom: 6 },
  emBreveDesc:   { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', textAlign: 'center', lineHeight: 19 },
  ligaBanner: {
    backgroundColor: '#252540', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  ligaSelo: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  ligaSeloIcone: { width: 26, height: 26 },
  ligaTitulo: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18 },
  ligaSub:    { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0' },
  rankingItem: {
    backgroundColor: '#252540', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12,
  },
  rankingItemVoce: { borderWidth: 1, borderColor: '#6C63FF', backgroundColor: '#6C63FF18' },
  rankingPos:      { fontFamily: 'Nunito_700Bold', fontSize: 18, width: 36, textAlign: 'center', color: '#FFFFFF' },
  rankingNome:     { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#FFFFFF' },
  rankingNomeVoce: { color: '#6C63FF', fontFamily: 'Nunito_700Bold' },
  rankingXpRow:    { flexDirection: 'row', alignItems: 'center' },
  rankingXpIcone:  { width: 14, height: 14 },
  rankingXp:       { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#6C63FF' },
  ligaAviso:       { backgroundColor: '#252540', borderRadius: 10, padding: 12, marginTop: 8 },
  ligaAvisoText:   { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', textAlign: 'center', lineHeight: 17 },
});