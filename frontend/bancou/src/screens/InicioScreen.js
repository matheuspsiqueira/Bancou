// src/screens/InicioScreen.js
// Extraído de HomeScreen.js (era o componente AbaInicio + o ModalPartida
// controlado no componente principal). Lógica idêntica, só reorganizada.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import TelaComHeader from '../components/TelaComHeader';
import ModalPartida from '../components/modals/ModalPartida';
import { getSaudacao, getTituloNivel } from '../utils/niveis';
import { MOCK } from '../utils/mockData';
import { tocar } from '../services/somService';

// Recompensa de um desafio: moedas e XP viram ícone + "+N", lado a lado
// quando o desafio dá os dois (recompensa_xp configurável por desafio no admin).
function RecompensaDesafio({ desafio }) {
  return (
    <View style={styles.recompensaRow}>
      {desafio.recompensa_moedas > 0 && (
        <View style={styles.recompensaItem}>
          <Text style={styles.recompensaTexto}>+{desafio.recompensa_moedas}</Text>
          <Image
            source={require('../assets/icons/moeda.png')}
            style={styles.moedaIcone}
            resizeMode="contain"
          />
        </View>
      )}
      {desafio.recompensa_xp > 0 && (
        <View style={styles.recompensaItem}>
          <Text style={styles.recompensaTexto}>+{desafio.recompensa_xp}</Text>
          <Image
            source={require('../assets/icons/xp.png')}
            style={styles.moedaIcone}
            resizeMode="contain"
          />
        </View>
      )}
    </View>
  );
}

export default function InicioScreen({ navigation }) {
  const { usuario, authFetch } = useAuth();
  const [modalPartida, setModalPartida] = useState(false);
  const [desafios, setDesafios] = useState([]);
  const [carregandoDesafios, setCarregandoDesafios] = useState(true);

  const xp       = usuario?.xp ?? MOCK.xp;
  const saudacao = getSaudacao();
  const titulo   = getTituloNivel(xp);
  const nome     = usuario?.nome_completo?.split(' ')[0] ?? usuario?.username ?? '…';

  const carregarDesafios = useCallback(async () => {
    try {
      const resp = await authFetch('/api/desafios/meus/');
      if (resp.ok) {
        const data = await resp.json();
        setDesafios(data);
      }
      // se não for ok, mantém a lista anterior — mesmo princípio silencioso
      // de carregarPerfil() no AuthContext, sem travar a tela por falha de rede
    } catch {
      // silencioso
    } finally {
      setCarregandoDesafios(false);
    }
  }, [authFetch]);

  // Recarrega toda vez que a aba ganha foco — cobre o caso de o usuário
  // voltar de uma Partida e o progresso ter mudado.
  useFocusEffect(
    useCallback(() => {
      carregarDesafios();
    }, [carregarDesafios])
  );

  const abrirModalPartida = () => {
    tocar('pop');
    // Adia a abertura do modal em 1 frame: evita que a criação da janela
    // nativa do Modal compita com a chamada de áudio na mesma leva de
    // trabalho da thread JS, o que causava um delay perceptível no som.
     requestAnimationFrame(() => setModalPartida(true));
  };

  // filtro: { tipo, id, label, comTempo } ou { comTempo } se for aleatório.
  // 'Partida' vive na Stack pai (fora do TabNavigator) — o React Navigation
  // resolve isso automaticamente subindo na árvore de navegação.
  const handleIniciarPartida = (filtro) => {
    setModalPartida(false);
    navigation.navigate('Partida', { filtro });
  };

  // "Filtrar por tema": tela cheia com filtros combináveis (também fica na Stack pai)
  const handleFiltrar = (comTempo) => {
    setModalPartida(false);
    navigation.navigate('FiltrosPartida', { comTempo });
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
          <Image source={require('../assets/kou-foco.png')} style={styles.kouImg} resizeMode="contain" />
        </View>

        <TouchableOpacity style={styles.btnEstudar} onPress={abrirModalPartida} activeOpacity={0.85}>
          <View style={styles.btnEstudarConteudo}>
            <Image source={require('../assets/icons/raio.png')} style={styles.raioIcone} resizeMode="contain" />
            <Text style={styles.btnEstudarText}>Iniciar Partida</Text>
          </View>
        </TouchableOpacity>

        <Text style={styles.secaoTitulo}>Desafios do dia</Text>

        {carregandoDesafios ? (
          <ActivityIndicator color="#6C63FF" style={{ marginVertical: 20 }} />
        ) : desafios.length === 0 ? (
          <View style={styles.emBreveCard}>
            <Image source={require('../assets/kou-obra.png')} style={styles.emBreveImg} />
            <Text style={styles.emBreveTitulo}>Em breve</Text>
            <Text style={styles.emBreveDesc}>
              Desafios diários com recompensas de XP e moedas estão chegando. Fique de olho!
            </Text>
          </View>
        ) : (
          <View style={styles.desafiosLista}>
            {desafios.map((desafio, indice) => (
              <View
                key={desafio.id}
                style={[
                  styles.desafioLinha,
                  desafio.completado && styles.desafioLinhaCompleta,
                  indice === desafios.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                {desafio.completado ? (
                  <Text style={styles.desafioCheck}>✓</Text>
                ) : (
                  <Text style={styles.desafioProgresso}>
                    {desafio.progresso}/{desafio.meta}
                  </Text>
                )}
                <Text
                  style={[styles.desafioDescricao, desafio.completado && styles.desafioTextoCompleto]}
                  numberOfLines={2}
                >
                  {desafio.descricao}
                </Text>
                <RecompensaDesafio desafio={desafio} />
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <ModalPartida
        visible={modalPartida}
        onClose={() => setModalPartida(false)}
        onIniciar={handleIniciarPartida}
        onFiltrar={handleFiltrar}
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
  kouImg:        { width: 80, height: 90, marginLeft: 12 },
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
  emBreveImg: { width: 65, height: 90, marginRight: 13 },
  emBreveEmoji:  { fontSize: 32, marginBottom: 8 },
  emBreveTitulo: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#9090B0', marginBottom: 6 },
  emBreveDesc:   { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', textAlign: 'center', lineHeight: 19 },

  // ─── Desafios diários — listagem simples, não clicável ─────────────────
  desafiosLista: {
    backgroundColor: '#252540', borderRadius: 14, paddingHorizontal: 16,
  },
  desafioLinha: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#33334D', gap: 10,
  },
  desafioLinhaCompleta: { opacity: 0.55 },
  desafioProgresso: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 14, color: '#6C63FF',
    width: 42, textAlign: 'center',
  },
  desafioCheck: {
    fontFamily: 'Nunito_800ExtraBold', fontSize: 16, color: '#4ADE80',
    width: 42, textAlign: 'center',
  },
  desafioDescricao: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: '#FFFFFF', flex: 1,
  },
  desafioTextoCompleto: { textDecorationLine: 'line-through' },

  // ─── Recompensa (moedas e XP, ícone + "+N") ─────────────────────────────
  recompensaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  recompensaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  recompensaTexto: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: '#FFD166' },
  moedaIcone: { width: 14, height: 14 },
});