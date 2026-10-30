// src/screens/HistoricoScreen.js
// 30/10/2026 — Histórico de questões respondidas.
//
// Mostra os dias da janela (hoje + 6 anteriores, definida pelo backend) com
// uma barrinha de acertos/erros em cada um; ao escolher um dia, lista as
// questões respondidas nele (✓ acerto, ✗ erro, ⏱ tempo esgotado, ícone de
// pular = questão pulada com item). Tocar numa questão abre a
// HistoricoQuestaoScreen (modo leitura).
//
// A tela é desmontada ao sair (stack), então carrega do zero toda vez que é
// aberta — não precisa de refetch no foco. Cada dia é buscado uma vez e fica
// em cache enquanto a tela estiver aberta.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { colors, typography, spacing } from '../theme';

const BORDA = '#333355';
const VERDE_ESCURO = '#0d2b1f';
const VERMELHO_ESCURO = '#2b0d1a';

const DIAS_CURTOS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const DIAS_LONGOS = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

// 'AAAA-MM-DD' -> partes (o Date é montado local só pra descobrir o dia da semana)
function partesData(iso) {
  const [ano, mes, dia] = iso.split('-').map(Number);
  return { ano, mes, dia, semana: new Date(ano, mes - 1, dia).getDay() };
}

const dois = (n) => String(n).padStart(2, '0');
const plural = (n, singular, pluralTxt) => `${n} ${n === 1 ? singular : pluralTxt}`;

function statusDe(r) {
  if (r.pulada) return 'pulada';
  if (r.correta) return 'certa';
  if (r.alternativa_escolhida === '_') return 'tempo';
  return 'errada';
}

const STATUS_VISUAL = {
  certa:  { simbolo: '✓', cor: colors.correct, fundo: VERDE_ESCURO,   texto: 'Acertou' },
  errada: { simbolo: '✗', cor: colors.lives,   fundo: VERMELHO_ESCURO, texto: 'Errou' },
  tempo:  { simbolo: '⏱', cor: colors.lives,   fundo: VERMELHO_ESCURO, texto: 'Tempo esgotado' },
  pulada: { simbolo: null, cor: colors.primary, fundo: colors.card,    texto: 'Pulada com item' },
};

function LinhaResposta({ resposta, onPress }) {
  const visual = STATUS_VISUAL[statusDe(resposta)];
  return (
    <TouchableOpacity style={styles.linha} onPress={() => onPress(resposta)} activeOpacity={0.8}>
      <View style={[styles.linhaIcone, { backgroundColor: visual.fundo, borderColor: visual.cor }]}>
        {visual.simbolo ? (
          <Text style={[styles.linhaSimbolo, { color: visual.cor }]}>{visual.simbolo}</Text>
        ) : (
          <Image
            source={require('../assets/icons/pula_questao.png')}
            style={styles.linhaIconePng}
            resizeMode="contain"
          />
        )}
      </View>

      <View style={styles.linhaTextos}>
        <Text style={styles.linhaTitulo} numberOfLines={1}>
          {resposta.materia_nome || 'Sem matéria'}
        </Text>
        <Text style={styles.linhaMeta} numberOfLines={1}>
          {resposta.hora} · {resposta.banca_nome}
        </Text>
      </View>

      <View style={styles.linhaDireita}>
        <Text style={[styles.linhaStatus, { color: visual.cor }]}>{visual.texto}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoricoScreen({ navigation }) {
  const { authFetch } = useAuth();
  const insets = useSafeAreaInsets();

  const [dias, setDias] = useState(null);          // resumo dos dias da janela
  const [erro, setErro] = useState(null);
  const [selecionado, setSelecionado] = useState(null); // 'AAAA-MM-DD'
  const [listas, setListas] = useState({});        // cache: data -> respostas
  const [erroDia, setErroDia] = useState(null);    // { data, msg }

  const carregarDias = useCallback(async () => {
    setErro(null);
    try {
      const resp = await authFetch('/api/questoes/historico/');
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.detail || 'Não foi possível carregar o histórico.');
      setDias(data.dias);
      setSelecionado((atual) => atual ?? data.dias[data.dias.length - 1]?.data ?? null);
    } catch (e) {
      setErro(e.message || 'Não foi possível carregar o histórico.');
    }
  }, [authFetch]);

  const carregarDia = useCallback(async (data) => {
    setErroDia(null);
    try {
      const resp = await authFetch(`/api/questoes/historico/?data=${data}`);
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.detail || 'Não foi possível carregar este dia.');
      setListas((l) => ({ ...l, [data]: json.respostas }));
    } catch (e) {
      setErroDia({ data, msg: e.message || 'Não foi possível carregar este dia.' });
    }
  }, [authFetch]);

  useEffect(() => {
    carregarDias();
  }, [carregarDias]);

  // Busca o dia escolhido (dias sem resposta nem chamam o servidor)
  useEffect(() => {
    if (!selecionado || !dias || listas[selecionado]) return;
    const resumo = dias.find((d) => d.data === selecionado);
    if (resumo && resumo.total === 0) {
      setListas((l) => ({ ...l, [selecionado]: [] }));
      return;
    }
    carregarDia(selecionado);
  }, [selecionado, dias]);

  const abrirQuestao = useCallback(
    (resposta) => navigation.navigate('HistoricoQuestao', { respostaId: resposta.id }),
    [navigation]
  );

  const resumoSel = dias?.find((d) => d.data === selecionado);
  const lista = selecionado ? listas[selecionado] : undefined;
  const erroDoDia = erroDia && erroDia.data === selecionado ? erroDia.msg : null;

  let tituloDia = '';
  if (resumoSel) {
    const p = partesData(resumoSel.data);
    const ehHoje = dias[dias.length - 1].data === resumoSel.data;
    tituloDia = `${ehHoje ? 'Hoje' : DIAS_LONGOS[p.semana]}, ${dois(p.dia)}/${dois(p.mes)}`;
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ───────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.btnVoltar}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          accessibilityLabel="Voltar"
        >
          <Text style={styles.btnVoltarTexto}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTextos}>
          <Text style={styles.titulo}>Histórico</Text>
          <Text style={styles.subtitulo}>
            Questões respondidas nos últimos {dias ? dias.length : 7} dias
          </Text>
        </View>
      </View>

      {/* ── Erro geral / carregando ──────────────────────────────── */}
      {erro ? (
        <View style={styles.centrado}>
          <Text style={styles.erroTexto}>{erro}</Text>
          <TouchableOpacity style={styles.btnTentar} onPress={carregarDias} activeOpacity={0.85}>
            <Text style={styles.btnTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : !dias ? (
        <View style={styles.centrado}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <>
          {/* ── Faixa de dias ──────────────────────────────────────── */}
          <View style={styles.diasRow}>
            {dias.map((d) => {
              const p = partesData(d.data);
              const ativo = d.data === selecionado;
              const vazio = d.total === 0;
              return (
                <TouchableOpacity
                  key={d.data}
                  style={[styles.diaChip, ativo && styles.diaChipAtivo]}
                  onPress={() => setSelecionado(d.data)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.diaSemana, vazio && !ativo && styles.diaApagado, ativo && styles.diaTextoAtivo]}>
                    {DIAS_CURTOS[p.semana]}
                  </Text>
                  <Text style={[styles.diaNumero, vazio && !ativo && styles.diaApagado, ativo && styles.diaTextoAtivo]}>
                    {p.dia}
                  </Text>
                  <View style={styles.diaBarra}>
                    {d.acertos > 0 && <View style={{ flex: d.acertos, backgroundColor: colors.correct }} />}
                    {d.erros > 0 && <View style={{ flex: d.erros, backgroundColor: colors.lives }} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Resumo + lista do dia ──────────────────────────────── */}
          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
          >
            {resumoSel && (
              <View style={styles.resumoBox}>
                <Text style={styles.resumoTitulo}>{tituloDia}</Text>
                {resumoSel.total > 0 && (
                  <Text style={styles.resumoSub}>
                    {plural(resumoSel.acertos, 'acerto', 'acertos')} e {plural(resumoSel.erros, 'erro', 'erros')}
                  </Text>
                )}
              </View>
            )}

            {erroDoDia ? (
              <View style={styles.centradoInline}>
                <Text style={styles.erroTexto}>{erroDoDia}</Text>
                <TouchableOpacity
                  style={styles.btnTentar}
                  onPress={() => carregarDia(selecionado)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.btnTentarTexto}>Tentar novamente</Text>
                </TouchableOpacity>
              </View>
            ) : lista === undefined ? (
              <View style={styles.centradoInline}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : lista.length === 0 ? (
              <Text style={styles.vazioTexto}>Você não respondeu questões neste dia.</Text>
            ) : (
              lista.map((r) => <LinhaResposta key={r.id} resposta={r} onPress={abrirQuestao} />)
            )}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: colors.card,
  },
  btnVoltar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
  },
  btnVoltarTexto: { fontFamily: typography.bold, fontSize: 16, color: colors.textSecondary },
  headerTextos: { flex: 1 },
  titulo: { fontFamily: typography.extraBold, fontSize: 20, color: colors.text },
  subtitulo: { fontFamily: typography.regular, fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  centrado: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 32, gap: 16,
  },
  centradoInline: { paddingVertical: 32, alignItems: 'center', gap: 16 },
  erroTexto: {
    fontFamily: typography.regular, fontSize: 15, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22,
  },
  btnTentar: {
    backgroundColor: colors.primary, borderRadius: 14,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  btnTentarTexto: { fontFamily: typography.bold, fontSize: 15, color: colors.text },

  // Faixa de dias
  diasRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingTop: 16 },
  diaChip: {
    flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: 12, backgroundColor: colors.card, borderWidth: 1, borderColor: BORDA, gap: 2,
  },
  diaChipAtivo: { backgroundColor: colors.primary, borderColor: colors.primary },
  diaSemana: { fontFamily: typography.medium, fontSize: 11, color: colors.textSecondary },
  diaNumero: { fontFamily: typography.bold, fontSize: 16, color: colors.text },
  diaApagado: { opacity: 0.4 },
  diaTextoAtivo: { color: colors.text },
  diaBarra: {
    flexDirection: 'row', width: '100%', height: 4, borderRadius: 999,
    overflow: 'hidden', backgroundColor: BORDA, marginTop: 4,
  },

  // Lista
  scroll: { paddingHorizontal: 16, paddingTop: 20, gap: 10 },
  resumoBox: { marginBottom: 4, gap: 2 },
  resumoTitulo: { fontFamily: typography.extraBold, fontSize: 17, color: colors.text },
  resumoSub: { fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary },
  vazioTexto: {
    fontFamily: typography.regular, fontSize: 14, color: colors.textSecondary,
    textAlign: 'center', paddingVertical: 32,
  },

  linha: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: BORDA,
  },
  linhaIcone: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1.5,
    justifyContent: 'center', alignItems: 'center',
  },
  linhaSimbolo: { fontFamily: typography.bold, fontSize: 16 },
  linhaIconePng: { width: 18, height: 18 },
  linhaTextos: { flex: 1, gap: 2 },
  linhaTitulo: { fontFamily: typography.bold, fontSize: 14, color: colors.text },
  linhaMeta: { fontFamily: typography.regular, fontSize: 12, color: colors.textSecondary },
  linhaDireita: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  linhaStatus: { fontFamily: typography.medium, fontSize: 11 },
  chevron: { color: colors.textSecondary, fontSize: 18 },
});