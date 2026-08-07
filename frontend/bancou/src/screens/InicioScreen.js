// src/screens/InicioScreen.js
// Extraído de HomeScreen.js (era o componente AbaInicio + o ModalPartida
// controlado no componente principal). Lógica idêntica, só reorganizada.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useAuth } from '../context/AuthContext';
import TelaComHeader from '../components/TelaComHeader';
import ModalPartida from '../components/modals/ModalPartida';
import { getSaudacao, getTituloNivel } from '../utils/niveis';
import { MOCK } from '../utils/mockData';

export default function InicioScreen({ navigation }) {
  const { usuario } = useAuth();
  const [modalPartida, setModalPartida] = useState(false);

  const xp       = usuario?.xp ?? MOCK.xp;
  const saudacao = getSaudacao();
  const titulo   = getTituloNivel(xp);
  const nome     = usuario?.nome_completo?.split(' ')[0] ?? usuario?.username ?? '…';

  // filtro: { tipo, id, label, comTempo } ou { comTempo } se for aleatório.
  // 'Partida' vive na Stack pai (fora do TabNavigator) — o React Navigation
  // resolve isso automaticamente subindo na árvore de navegação.
  const handleIniciarPartida = (filtro) => {
    setModalPartida(false);
    navigation.navigate('Partida', { filtro });
  };

  return (
    <TelaComHeader>
      <ScrollView
        style={styles.abaContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        <View style={styles.boasVindasCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.boasVindasSub}>{saudacao},</Text>
            <View style={styles.boasVindasNomeRow}>
              <Text style={styles.boasVindasNome}>{nome}</Text>
              <Image source={require('../assets/icons/mao.png')} style={styles.maoIcone} resizeMode="contain" />
            </View>
            <Text style={styles.boasVindasNivel}>
              Nível <Text style={{ color: '#6C63FF' }}>{titulo}</Text>
            </Text>
            <Text style={styles.boasVindasDesc}>pronto para pontuar?</Text>
          </View>
          <Image source={require('../assets/kou-foco.png')} style={styles.pontsImg} resizeMode="contain" />
        </View>

        <TouchableOpacity style={styles.btnEstudar} onPress={() => setModalPartida(true)} activeOpacity={0.85}>
          <View style={styles.btnEstudarConteudo}>
            <Image source={require('../assets/icons/raio.png')} style={styles.raioIcone} resizeMode="contain" />
            <Text style={styles.btnEstudarText}>Iniciar Partida</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.secaoTitulo}>Desafios do dia</Text>
        <View style={styles.emBreveCard}>
          <Text style={styles.emBreveEmoji}>🎯</Text>
          <Text style={styles.emBreveTitulo}>Em breve</Text>
          <Text style={styles.emBreveDesc}>
            Desafios diários com recompensas de XP e moedas estão chegando. Fique de olho!
          </Text>
        </View>
      </ScrollView>

      <ModalPartida
        visible={modalPartida}
        onClose={() => setModalPartida(false)}
        onIniciar={handleIniciarPartida}
      />
    </TelaComHeader>
  );
}

const styles = StyleSheet.create({
  abaContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  boasVindasCard: {
    backgroundColor: '#252540', borderRadius: 14, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, overflow: 'hidden',
  },
  boasVindasSub:   { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#9090B0' },
  boasVindasNomeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  boasVindasNome:  { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: '#FFFFFF', marginBottom: 2 },
  maoIcone:        { width: 25, height: 25 },
  boasVindasNivel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0', marginBottom: 2 },
  boasVindasDesc:  { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0' },
  pontsImg:        { width: 80, height: 90, marginLeft: 12 },
  btnEstudar: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 24,
  },
  btnEstudarText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: '#FFFFFF' },
  btnEstudarConteudo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  raioIcone: { width: 22, height: 22 },
  secaoTitulo: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#FFFFFF', marginBottom: 12 },
  emBreveCard: {
    backgroundColor: '#252540', borderRadius: 14, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#6C63FF33', borderStyle: 'dashed',
  },
  emBreveEmoji:  { fontSize: 32, marginBottom: 8 },
  emBreveTitulo: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#9090B0', marginBottom: 6 },
  emBreveDesc:   { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', textAlign: 'center', lineHeight: 19 },
});