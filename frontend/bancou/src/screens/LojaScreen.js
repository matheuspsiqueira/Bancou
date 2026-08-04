// src/screens/LojaScreen.js
// Fase 1 da loja: apenas itens comprados com moedas do jogo (buffs + vida
// extra). Compras com dinheiro real (IAP) ficam para a fase de produção,
// conforme decidido — ver anotações do roadmap.
// Consome GET /api/loja/itens/ e POST /api/loja/comprar-item/ (backend a implementar).
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
import { useAuth } from '../context/AuthContext';
import { usePontsAlert } from '../context/PontsAlertContext';
import TelaComHeader from '../components/TelaComHeader';
import { IconPular } from '../components/icons';

// Itens com imagem PNG própria (src/assets/icons/)
const IMAGEM_ITEM = {
  elimina_alternativas: require('../assets/icons/bomba.png'),
  xp_dobro:             require('../assets/icons/xp.png'),
  congela_streak:       require('../assets/icons/congelamento_streak.png'),
  vida_extra:           require('../assets/icons/vida.png'),
};

// pula_questao ainda não tem PNG — segue usando o ícone SVG gradiente
const ICONE_COMPONENTE_ITEM = {
  pula_questao: IconPular,
};

export default function LojaScreen() {
  const { usuario, authFetch, atualizarUsuario } = useAuth();
  const { alertar } = usePontsAlert();

  const [itens, setItens]         = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [comprando, setComprando]   = useState(null);

  const carregarItens = useCallback(async () => {
    setCarregando(true);
    try {
      const resp = await authFetch('/api/loja/itens/');
      if (!resp.ok) throw new Error('Falha ao buscar itens da loja');
      const data = await resp.json();
      setItens(data);
    } catch (e) {
      alertar('Erro', 'Não foi possível carregar a loja. Verifique sua conexão.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  }, [authFetch]);

  useEffect(() => {
    carregarItens();
  }, [carregarItens]);

  // ── Passo 1: valida saldo e pede confirmação antes de gastar moedas ──────
  const solicitarCompra = (item) => {
    if ((usuario?.moedas ?? 0) < item.preco_moedas) {
      alertar('Moedas insuficientes', 'Jogue mais partidas para ganhar moedas!', [{ text: 'OK' }], { pose: 'ops' });
      return;
    }

    alertar(
      'Confirmar compra',
      `Comprar ${item.nome} por ${item.preco_moedas} moedas?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Comprar', onPress: () => executarCompra(item) },
      ],
      { pose: 'dinheiro' }
    );
  };

  // ── Passo 2: só roda depois que o usuário confirma no alerta acima ───────
  const executarCompra = async (item) => {
    setComprando(item.codigo);
    try {
      const resp = await authFetch('/api/loja/comprar-item/', {
        method: 'POST',
        body: JSON.stringify({ codigo_item: item.codigo }),
      });

      if (!resp.ok) throw new Error('Falha na compra');
      const data = await resp.json();

      atualizarUsuario({
        moedas: data.saldo_moedas,
        ...(data.vidas_atuais != null ? { vidas: data.vidas_atuais } : {}),
      });

      alertar('Compra realizada!', `Você adquiriu: ${item.nome}`, [{ text: 'OK' }], { pose: 'torcendo' });
    } catch (e) {
      alertar('Erro', 'Não foi possível concluir a compra.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setComprando(null);
    }
  };

  return (
    <TelaComHeader>
      <ScrollView style={styles.abaContainer} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.avisoConstrucao}>
          <Image source={require('../assets/kou-pensando.png')} style={styles.kouConstrucao} resizeMode="contain" />
          <View style={{ flex: 1 }}>
            <Text style={styles.avisoTitulo}>Loja em construção 🚧</Text>
            <Text style={styles.avisoTexto}>
              Por enquanto você pode usar moedas para comprar buffs e vidas extras.
              Em breve: pacotes de moedas, passe de batalha e mais!
            </Text>
          </View>
        </View>

        {carregando ? (
          <ActivityIndicator color="#6C63FF" size="large" style={{ marginTop: 32 }} />
        ) : (
          <View style={styles.grid}>
            {itens.map((item) => {
              const imagemItem = IMAGEM_ITEM[item.codigo];
              const IconeComponente = ICONE_COMPONENTE_ITEM[item.codigo];
              return (
                <View key={item.codigo} style={styles.card}>
                  {imagemItem ? (
                    <Image source={imagemItem} style={styles.cardIconeImagem} resizeMode="contain" />
                  ) : IconeComponente ? (
                    <View style={styles.cardIconeCustom}>
                      <IconeComponente size={32} />
                    </View>
                  ) : (
                    <Text style={styles.cardIcone}>🎁</Text>
                  )}
                  <Text style={styles.cardNome}>{item.nome}</Text>
                  <Text style={styles.cardDescricao}>{item.descricao}</Text>
                  <TouchableOpacity
                    style={styles.botaoComprar}
                    onPress={() => solicitarCompra(item)}
                    disabled={comprando === item.codigo}
                    activeOpacity={0.85}
                  >
                    {comprando === item.codigo
                      ? <ActivityIndicator color="#FFFFFF" size="small" />
                      : (
                        <View style={styles.botaoComprarConteudo}>
                          <Image
                            source={require('../assets/icons/moeda.png')}
                            style={styles.moedaIcone}
                            resizeMode="contain"
                          />
                          <Text style={styles.botaoComprarTexto}>{item.preco_moedas}</Text>
                        </View>
                      )
                    }
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </TelaComHeader>
  );
}

const styles = StyleSheet.create({
  abaContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
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
  kouConstrucao: { width: 48, height: 48 },
  avisoTitulo:   { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 16, marginBottom: 4 },
  avisoTexto:    { color: '#9090B0', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 18 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: {
    width: '47%',
    backgroundColor: '#252540',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcone:       { fontSize: 32, marginBottom: 8 },
  cardIconeCustom: { marginBottom: 8 },
  cardIconeImagem: { width: 40, height: 40, marginBottom: 8 },
  cardNome:        { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 15, textAlign: 'center', marginBottom: 4 },
  cardDescricao:   { color: '#9090B0', fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginBottom: 12, minHeight: 32 },
  botaoComprar: {
    backgroundColor: '#6C63FF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  botaoComprarConteudo: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  moedaIcone: { width: 16, height: 16 },
  botaoComprarTexto: { color: '#FFFFFF', fontFamily: 'Nunito_700Bold', fontSize: 14 },
});