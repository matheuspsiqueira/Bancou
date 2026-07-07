import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { usePontsAlert } from '../context/PontsAlertContext';
import { API_URL } from '../config';

const ICONES = {
  pula_questao: '⏭️',
  elimina_alternativas: '✂️',
  xp_dobro: '⚡',
  congela_streak: '🧊',
  vida_extra: '❤️',
};

export default function LojaScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { usuario, authFetch, atualizarUsuario } = useAuth();
  const { mostrarAlert } = usePontsAlert();

  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [comprando, setComprando] = useState(null);

  const carregarItens = useCallback(async () => {
    try {
      const res = await authFetch(`${API_URL}/api/loja/itens/`);
      const data = await res.json();
      setItens(data);
    } catch (e) {
      mostrarAlert({ pose: 'ops', titulo: 'Ops!', mensagem: 'Não foi possível carregar a loja.' });
    } finally {
      setCarregando(false);
    }
  }, [authFetch]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  const comprarItem = async (item) => {
    if (usuario.moedas < item.preco_moedas) {
      mostrarAlert({ pose: 'ops', titulo: 'Moedas insuficientes', mensagem: 'Jogue mais partidas para ganhar moedas!' });
      return;
    }

    setComprando(item.codigo);
    try {
      const res = await authFetch(`${API_URL}/api/loja/comprar-item/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo_item: item.codigo }),
      });

      if (!res.ok) throw new Error('Falha na compra');

      const data = await res.json();
      atualizarUsuario({ moedas: data.saldo_moedas, vidas: data.vidas_atuais ?? usuario.vidas });

      mostrarAlert({ pose: 'torcendo', titulo: 'Compra realizada!', mensagem: `Você adquiriu: ${item.nome}` });
    } catch (e) {
      mostrarAlert({ pose: 'ops', titulo: 'Ops!', mensagem: 'Não foi possível concluir a compra.' });
    } finally {
      setComprando(null);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.voltar}>←</Text>
        </TouchableOpacity>
        <Text style={styles.titulo}>Loja</Text>
        <View style={styles.saldoMoedas}>
          <Text style={styles.saldoTexto}>🪙 {usuario.moedas}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.avisoConstrucao}>
          <Image source={require('../assets/kou-pensando.png')} style={styles.kouConstrucao} />
          <View style={{ flex: 1 }}>
            <Text style={styles.avisoTitulo}>Loja em construção 🚧</Text>
            <Text style={styles.avisoTexto}>
              Por enquanto você pode usar moedas para comprar buffs e vidas extras.
              Em breve: pacotes de moedas, passe de batalha e assinatura Premium!
            </Text>
          </View>
        </View>

        {carregando ? (
          <ActivityIndicator color="#6C63FF" size="large" style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.grid}>
            {itens.map((item) => (
              <View key={item.codigo} style={styles.card}>
                <Text style={styles.cardIcone}>{ICONES[item.codigo] || '🎁'}</Text>
                <Text style={styles.cardNome}>{item.nome}</Text>
                <Text style={styles.cardDescricao}>{item.descricao}</Text>
                <TouchableOpacity
                  style={styles.botaoComprar}
                  onPress={() => comprarItem(item)}
                  disabled={comprando === item.codigo}
                >
                  {comprando === item.codigo ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.botaoComprarTexto}>🪙 {item.preco_moedas}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  voltar: { color: '#FFFFFF', fontSize: 24 },
  titulo: { color: '#FFFFFF', fontSize: 22, fontFamily: 'Nunito_700Bold' },
  saldoMoedas: {
    backgroundColor: '#252540',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  saldoTexto: { color: '#FFD700', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  scroll: { padding: 16, paddingBottom: 48 },
  avisoConstrucao: {
    flexDirection: 'row',
    backgroundColor: '#252540',
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  kouConstrucao: { width: 48, height: 48, resizeMode: 'contain' },
  avisoTitulo: { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 4 },
  avisoTexto: { color: '#9090B0', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: '#252540',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcone: { fontSize: 32, marginBottom: 8 },
  cardNome: { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 15, textAlign: 'center', marginBottom: 4 },
  cardDescricao: { color: '#9090B0', fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginBottom: 12, minHeight: 32 },
  botaoComprar: {
    backgroundColor: '#6C63FF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  botaoComprarTexto: { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 14 },
});