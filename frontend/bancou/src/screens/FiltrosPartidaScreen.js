// src/screens/FiltrosPartidaScreen.js
// Tela cheia de filtros da partida (substitui as etapas "Filtrar por" do modal).
// Cada linha é um filtro; tocar abre a lista (com busca) em tela cheia. Os
// filtros se combinam, e o botão do rodapé mostra quantas questões existem
// com a escolha atual (vem de /api/questoes/filtros/, que já considera os
// outros filtros — a tela nunca oferece uma combinação vazia).
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ScrollView,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { tocar } from '../services/somService';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';
import {
  FILTROS,
  temFiltroAtivo,
  montarQuery,
  alternarValor,
  resumoSelecao,
  itensDoSeletor,
  atualizarNomes,
  textoTotal,
} from '../utils/filtrosPartida';

const ATRASO_BUSCA_MS = 250; // espera o aluno parar de tocar antes de recontar

export default function FiltrosPartidaScreen({ navigation, route }) {
  const comTempo = route.params?.comTempo ?? false;
  const { authFetch } = useAuth();
  const insets = useSafeAreaInsets();

  const [selecao, setSelecao]     = useState({});     // { banca: [3, 5], uf: ['RJ'], ... }
  const [dados, setDados]         = useState(null);   // última resposta de /filtros/
  const [nomes, setNomes]         = useState({});     // { banca: { 3: 'FGV' }, ... }
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro]           = useState(null);
  const [aberto, setAberto]       = useState(null);   // chave do filtro cuja lista está aberta
  const [busca, setBusca]         = useState('');
  const [tentativa, setTentativa] = useState(0);

  // authFetch por ref: a busca depende só dos filtros, não da identidade da função
  const authFetchRef = useRef(authFetch);
  authFetchRef.current = authFetch;
  const reqRef = useRef(0);
  const primeiraRef = useRef(true);

  const query = useMemo(() => montarQuery(selecao, comTempo), [selecao, comTempo]);

  // ── Busca as opções + o total toda vez que a seleção muda ─────────────────
  useEffect(() => {
    const id = ++reqRef.current;
    setCarregando(true);
    setErro(null);

    const espera = primeiraRef.current ? 0 : ATRASO_BUSCA_MS;
    primeiraRef.current = false;

    const timer = setTimeout(async () => {
      try {
        const resp = await authFetchRef.current(`/api/questoes/filtros/${query ? `?${query}` : ''}`);
        const json = await resp.json();
        if (id !== reqRef.current) return; // resposta velha: já mudou a seleção
        if (!resp.ok) throw new Error(json.detail || 'Falha ao carregar os filtros.');
        setDados(json);
        setNomes((anterior) => atualizarNomes(anterior, json));
      } catch (e) {
        if (id !== reqRef.current) return;
        setErro('Não foi possível carregar os filtros. Verifique sua conexão.');
      } finally {
        if (id === reqRef.current) setCarregando(false);
      }
    }, espera);

    return () => clearTimeout(timer);
  }, [query, tentativa]);

  // ── Botão voltar do Android fecha a lista aberta antes de sair da tela ────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (aberto) {
        fecharLista();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [aberto]);

  const abrirLista = (chave) => {
    tocar('pop');
    setBusca('');
    setAberto(chave);
  };
  const fecharLista = () => {
    setBusca('');
    setAberto(null);
  };

  const alternar = (chave, id) => setSelecao((atual) => alternarValor(atual, chave, id));
  const limparFiltro = (chave) => setSelecao((atual) => ({ ...atual, [chave]: [] }));
  const limparTudo = () => setSelecao({});

  const total = dados?.total ?? 0;
  const podeJogar = !carregando && !erro && dados !== null && total > 0;

  const iniciar = () => {
    if (!podeJogar) return;
    // replace: a pilha continua Home → Partida → Score, como no início rápido
    navigation.replace('Partida', { filtro: { filtros: selecao, comTempo } });
  };

  // ════════════════════════════════════════════════════════════════════════
  // Lista de um filtro (tela cheia)
  // ════════════════════════════════════════════════════════════════════════
  const definicao = aberto ? FILTROS.find((f) => f.chave === aberto) : null;
  const itens = useMemo(
    () => (definicao
      ? itensDoSeletor(dados?.[definicao.lista], selecao[aberto], nomes[aberto], busca)
      : []),
    [definicao, dados, selecao, nomes, aberto, busca]
  );

  const renderItem = useCallback(({ item }) => {
    const marcado = (selecao[aberto] ?? []).some((v) => String(v) === String(item.id));
    const detalhes = [item.ano, item.banca_nome].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        style={styles.itemLinha}
        onPress={() => alternar(aberto, item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.caixa, marcado && styles.caixaMarcada]}>
          {marcado && <Text style={styles.caixaCheck}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.itemNome, item.total === 0 && styles.itemNomeVazio]}>{item.nome}</Text>
          {!!detalhes && <Text style={styles.itemDetalhe}>{detalhes}</Text>}
        </View>
        <Text style={[styles.itemTotal, item.total === 0 && styles.itemNomeVazio]}>{item.total}</Text>
      </TouchableOpacity>
    );
  }, [aberto, selecao]);

  if (definicao) {
    const qtd = (selecao[aberto] ?? []).length;
    return (
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.btnRedondo} onPress={fecharLista} activeOpacity={0.7}>
            <Text style={styles.btnRedondoTexto}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitulo}>{definicao.titulo}</Text>
          {qtd > 0 ? (
            <TouchableOpacity onPress={() => limparFiltro(aberto)} activeOpacity={0.7}>
              <Text style={styles.headerAcao}>Limpar</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 48 }} />
          )}
        </View>

        {definicao.busca && (
          <View style={styles.buscaBox}>
            <TextInput
              style={styles.buscaInput}
              value={busca}
              onChangeText={setBusca}
              placeholder={`Buscar ${definicao.titulo.toLowerCase()}…`}
              placeholderTextColor={colors.textSecondary}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
            />
          </View>
        )}

        <FlatList
          data={itens}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.lg }}
          ListEmptyComponent={
            <Text style={styles.vazio}>
              {busca ? 'Nada encontrado para essa busca.' : 'Nenhuma opção disponível com os outros filtros.'}
            </Text>
          }
        />

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Text style={styles.totalTexto}>{carregando ? 'Atualizando…' : textoTotal(total)}</Text>
          <TouchableOpacity style={styles.botao} onPress={fecharLista} activeOpacity={0.85}>
            <Text style={styles.botaoTexto}>{qtd > 0 ? `Concluir (${qtd})` : 'Concluir'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // ════════════════════════════════════════════════════════════════════════
  // Tela principal: uma linha por filtro
  // ════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.btnRedondo} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.btnRedondoTexto}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitulo}>Filtrar questões</Text>
        {temFiltroAtivo(selecao) ? (
          <TouchableOpacity onPress={limparTudo} activeOpacity={0.7}>
            <Text style={styles.headerAcao}>Limpar</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 48 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {comTempo && (
          <View style={styles.chipTempo}>
            <Text style={styles.chipTempoTexto}>Modo com tempo (60s): questões com texto-base ou imagem não entram</Text>
          </View>
        )}

        {erro && (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{erro}</Text>
            <TouchableOpacity style={styles.erroBtn} onPress={() => setTentativa((t) => t + 1)}>
              <Text style={styles.erroBtnTexto}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {FILTROS.map(({ chave, titulo, lista }) => {
          const opcoes = dados?.[lista] ?? [];
          const escolhidos = selecao[chave] ?? [];
          const semOpcoes = dados !== null && opcoes.length === 0 && escolhidos.length === 0;
          return (
            <TouchableOpacity
              key={chave}
              style={[styles.linha, semOpcoes && styles.linhaDesativada]}
              onPress={() => abrirLista(chave)}
              disabled={semOpcoes}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.linhaTitulo}>{titulo}</Text>
                <Text
                  style={[styles.linhaResumo, escolhidos.length > 0 && styles.linhaResumoAtivo]}
                  numberOfLines={1}
                >
                  {semOpcoes ? 'Sem opções neste recorte' : resumoSelecao(escolhidos, nomes[chave])}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}

        {dados !== null && dados.total === 0 && !temFiltroAtivo(selecao) && !carregando && !erro && (
          <Text style={styles.vazio}>Ainda não há questões disponíveis.</Text>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
        <Text style={styles.totalTexto}>
          {erro ? 'Sem conexão' : carregando && dados === null ? 'Carregando…' : carregando ? 'Atualizando…' : textoTotal(total)}
        </Text>
        <TouchableOpacity
          style={[styles.botao, !podeJogar && styles.botaoDesativado]}
          onPress={iniciar}
          disabled={!podeJogar}
          activeOpacity={0.85}
        >
          {carregando && dados === null
            ? <ActivityIndicator color={colors.text} />
            : <Text style={styles.botaoTexto}>Iniciar partida</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// '#35355a' (borda neutra) não tem token nomeado — fica literal, como no ModalPartida.
const BORDA = '#35355a';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.card, gap: spacing.md,
  },
  btnRedondo: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
  },
  btnRedondoTexto: { fontFamily: typography.bold, fontSize: 22, color: colors.textSecondary, marginTop: -2 },
  headerTitulo: { flex: 1, fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text },
  headerAcao: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.primary, width: 48, textAlign: 'right' },

  chipTempo: {
    backgroundColor: `${colors.primary}22`, borderRadius: borderRadius.lg,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.primary,
  },
  chipTempoTexto: { fontFamily: typography.medium, fontSize: fontSize.caption, color: colors.primary },

  linha: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md + 2, paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  linhaDesativada: { opacity: 0.4 },
  linhaTitulo: { fontFamily: typography.bold, fontSize: fontSize.body, color: colors.text },
  linhaResumo: { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
  linhaResumoAtivo: { color: colors.primary, fontFamily: typography.medium },
  chevron: { color: colors.primary, fontSize: 20 },

  buscaBox: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  buscaInput: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: BORDA,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: typography.regular, fontSize: fontSize.body, color: colors.text,
  },

  itemLinha: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.card,
  },
  caixa: {
    width: 24, height: 24, borderRadius: 7, borderWidth: 1.5, borderColor: BORDA,
    justifyContent: 'center', alignItems: 'center',
  },
  caixaMarcada: { backgroundColor: colors.primary, borderColor: colors.primary },
  caixaCheck: { color: colors.text, fontFamily: typography.bold, fontSize: 14 },
  itemNome: { fontFamily: typography.medium, fontSize: fontSize.body, color: colors.text },
  itemNomeVazio: { color: colors.textSecondary },
  itemDetalhe: { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
  itemTotal: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.textSecondary },

  vazio: {
    fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary,
    textAlign: 'center', paddingVertical: spacing.xl, lineHeight: 19,
  },

  erroBox: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
  erroTexto: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, textAlign: 'center' },
  erroBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderWidth: 1, borderColor: BORDA,
  },
  erroBtnTexto: { fontFamily: typography.medium, fontSize: fontSize.caption, color: colors.primary },

  footer: {
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.card, gap: spacing.sm,
  },
  totalTexto: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.textSecondary, textAlign: 'center' },
  botao: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center',
  },
  botaoDesativado: { opacity: 0.35 },
  botaoTexto: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.text },
});