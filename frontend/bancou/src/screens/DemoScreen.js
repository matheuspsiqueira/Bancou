import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';

const QUESTOES_DEMO = [
  {
    id: 1,
    banca: 'CESPE',
    materia: 'Direito Constitucional',
    enunciado: 'Acerca dos direitos e garantias fundamentais previstos na Constituição Federal de 1988, assinale a opção correta.',
    alternativas: [
      { id: 'A', texto: 'Os direitos e garantias fundamentais expressos na CF não excluem outros decorrentes do regime e dos princípios por ela adotados.' },
      { id: 'B', texto: 'Os tratados internacionais de direitos humanos aprovados pelo Congresso Nacional sempre têm hierarquia constitucional.' },
      { id: 'C', texto: 'A casa é asilo inviolável do indivíduo, sendo vedada qualquer forma de entrada, inclusive com mandado judicial.' },
      { id: 'D', texto: 'O sigilo das comunicações telefônicas pode ser quebrado por autoridade policial, independentemente de ordem judicial.' },
      { id: 'E', texto: 'A liberdade de expressão é direito absoluto, não podendo ser restringida em nenhuma hipótese.' },
    ],
    gabarito: 'A',
  },
  {
    id: 2,
    banca: 'FCC',
    materia: 'Português',
    enunciado: 'Assinale a alternativa em que a concordância verbal está correta de acordo com a norma culta da língua portuguesa.',
    alternativas: [
      { id: 'A', texto: 'Fazem dois anos que não o vejo.' },
      { id: 'B', texto: 'Houveram muitos problemas na reunião.' },
      { id: 'C', texto: 'Existe várias soluções para esse problema.' },
      { id: 'D', texto: 'Faz dois anos que não o vejo.' },
      { id: 'E', texto: 'Haviam muitas pessoas no local.' },
    ],
    gabarito: 'D',
  },
  {
    id: 3,
    banca: 'VUNESP',
    materia: 'Raciocínio Lógico',
    enunciado: 'Se todos os A são B e nenhum B é C, então é correto afirmar que:',
    alternativas: [
      { id: 'A', texto: 'Alguns C são A.' },
      { id: 'B', texto: 'Nenhum A é C.' },
      { id: 'C', texto: 'Todos os C são B.' },
      { id: 'D', texto: 'Alguns A são C.' },
      { id: 'E', texto: 'Nenhum B é A.' },
    ],
    gabarito: 'B',
  },
  {
    id: 4,
    banca: 'CESPE',
    materia: 'Direito Administrativo',
    enunciado: 'Com relação aos princípios que regem a administração pública, é correto afirmar que o princípio da legalidade:',
    alternativas: [
      { id: 'A', texto: 'Permite ao administrador público fazer tudo o que a lei não proíba expressamente.' },
      { id: 'B', texto: 'Obriga o administrador a agir somente quando há expressa previsão legal autorizadora.' },
      { id: 'C', texto: 'Tem o mesmo conteúdo para o direito público e para o direito privado.' },
      { id: 'D', texto: 'É aplicável apenas aos atos vinculados da administração.' },
      { id: 'E', texto: 'Dispensa a motivação dos atos administrativos discricionários.' },
    ],
    gabarito: 'B',
  },
  {
    id: 5,
    banca: 'FGV',
    materia: 'Informática',
    enunciado: 'No contexto da segurança da informação, o termo "phishing" refere-se a:',
    alternativas: [
      { id: 'A', texto: 'Um tipo de vírus que danifica arquivos do sistema operacional.' },
      { id: 'B', texto: 'Uma técnica de engenharia social para obter informações confidenciais mediante engano.' },
      { id: 'C', texto: 'Um protocolo de comunicação segura entre servidores.' },
      { id: 'D', texto: 'Um método de criptografia de dados em repouso.' },
      { id: 'E', texto: 'Um software para monitoramento de redes corporativas.' },
    ],
    gabarito: 'B',
  },
  {
    id: 6,
    banca: 'CESPE',
    materia: 'Português',
    enunciado: 'Em relação ao emprego do sinal indicativo de crase, assinale a opção correta.',
    alternativas: [
      { id: 'A', texto: 'Refiro-me à aquela situação mencionada.' },
      { id: 'B', texto: 'Às vezes, o silêncio é a melhor resposta.' },
      { id: 'C', texto: 'Ele foi à São Paulo resolver pendências.' },
      { id: 'D', texto: 'A proposta foi dirigida à ele.' },
      { id: 'E', texto: 'Estarei à sua disposição à qualquer hora.' },
    ],
    gabarito: 'B',
  },
  {
    id: 7,
    banca: 'FCC',
    materia: 'Direito Constitucional',
    enunciado: 'De acordo com a Constituição Federal de 1988, o habeas corpus é o remédio constitucional adequado para proteger o direito de:',
    alternativas: [
      { id: 'A', texto: 'Acesso a informações de interesse particular mantidas por órgãos públicos.' },
      { id: 'B', texto: 'Locomoção, quando ameaçado ou prejudicado por ilegalidade ou abuso de poder.' },
      { id: 'C', texto: 'Obtenção de certidões em repartições públicas.' },
      { id: 'D', texto: 'Proteção de dados pessoais em poder de terceiros.' },
      { id: 'E', texto: 'Mandato eletivo, quando ameaçado por ato ilegal.' },
    ],
    gabarito: 'B',
  },
  {
    id: 8,
    banca: 'VUNESP',
    materia: 'Matemática',
    enunciado: 'Uma torneira enche um tanque em 6 horas e outra o esvazia em 10 horas. Se ambas forem abertas ao mesmo tempo com o tanque vazio, em quantas horas o tanque ficará cheio?',
    alternativas: [
      { id: 'A', texto: '12 horas' },
      { id: 'B', texto: '15 horas' },
      { id: 'C', texto: '16 horas' },
      { id: 'D', texto: '13 horas' },
      { id: 'E', texto: '18 horas' },
    ],
    gabarito: 'B',
  },
  {
    id: 9,
    banca: 'FGV',
    materia: 'Direito Administrativo',
    enunciado: 'O ato administrativo que impõe ao particular uma obrigação de fazer ou não fazer, independentemente de seu consentimento, caracteriza o atributo da:',
    alternativas: [
      { id: 'A', texto: 'Presunção de legitimidade.' },
      { id: 'B', texto: 'Autoexecutoriedade.' },
      { id: 'C', texto: 'Imperatividade.' },
      { id: 'D', texto: 'Tipicidade.' },
      { id: 'E', texto: 'Motivação.' },
    ],
    gabarito: 'C',
  },
  {
    id: 10,
    banca: 'CESPE',
    materia: 'Raciocínio Lógico',
    enunciado: 'A negação da proposição "Todos os servidores públicos são concursados" é:',
    alternativas: [
      { id: 'A', texto: 'Nenhum servidor público é concursado.' },
      { id: 'B', texto: 'Todos os servidores públicos não são concursados.' },
      { id: 'C', texto: 'Algum servidor público não é concursado.' },
      { id: 'D', texto: 'Alguns servidores públicos são concursados.' },
      { id: 'E', texto: 'Nenhum concursado é servidor público.' },
    ],
    gabarito: 'C',
  },
];

export default function DemoScreen({ navigation }) {
  const [indice, setIndice] = useState(0);
  const [selecionada, setSelecionada] = useState(null);
  const [confirmada, setConfirmada] = useState(false);

  // useRef é síncrono — leitura sempre reflete o valor atual
  const acertosRef = useRef(0);
  // acertouAtual guarda se a questão atual foi acertada, para o footer saber
  const acertouAtualRef = useRef(false);

  const questao = QUESTOES_DEMO[indice];
  const isUltima = indice === QUESTOES_DEMO.length - 1;
  const acertou = confirmada && acertouAtualRef.current;
  const errou = confirmada && !acertouAtualRef.current;

  const confirmar = () => {
    if (!selecionada) return;
    const correto = selecionada === questao.gabarito;
    acertouAtualRef.current = correto;
    if (correto) acertosRef.current += 1;
    setConfirmada(true); // força re-render para mostrar feedback
  };

  const avancar = () => {
    if (isUltima) {
      navigation.replace('DemoScore', {
        acertos: acertosRef.current,
        total: QUESTOES_DEMO.length,
      });
      return;
    }
    acertouAtualRef.current = false;
    setIndice(i => i + 1);
    setSelecionada(null);
    setConfirmada(false);
  };

  const corAlternativa = (id) => {
    if (!confirmada) return selecionada === id ? colors.primary : colors.card;
    if (id === questao.gabarito) return colors.correct;
    if (id === selecionada && id !== questao.gabarito) return colors.lives;
    return colors.card;
  };

  const borderAlternativa = (id) => {
    if (!confirmada) return selecionada === id ? colors.primary : '#333355';
    if (id === questao.gabarito) return colors.correct;
    if (id === selecionada && id !== questao.gabarito) return colors.lives;
    return '#333355';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <View style={styles.progressoRow}>
          {QUESTOES_DEMO.map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressoBolinha,
                i < indice && styles.progressoFeita,
                i === indice && styles.progressoAtual,
              ]}
            />
          ))}
        </View>
        <Text style={styles.contadorTexto}>{indice + 1} / {QUESTOES_DEMO.length}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <View style={styles.demoBadge}>
          <Text style={styles.demoBadgeTexto}>🎮 Modo demonstração</Text>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaTexto}>{questao.banca}</Text>
          </View>
          <View style={styles.metaChip}>
            <Text style={styles.metaTexto}>{questao.materia}</Text>
          </View>
        </View>

        <Text style={styles.enunciado}>{questao.enunciado}</Text>

        <View style={styles.alternativas}>
          {questao.alternativas.map((alt) => (
            <TouchableOpacity
              key={alt.id}
              style={[
                styles.alternativa,
                { backgroundColor: corAlternativa(alt.id), borderColor: borderAlternativa(alt.id) },
              ]}
              onPress={() => !confirmada && setSelecionada(alt.id)}
              activeOpacity={confirmada ? 1 : 0.7}
            >
              <View style={[styles.letraContainer, { borderColor: borderAlternativa(alt.id) }]}>
                <Text style={[styles.letra, confirmada && alt.id === questao.gabarito && { color: colors.correct }]}>
                  {alt.id}
                </Text>
              </View>
              <Text style={styles.altTexto}>{alt.texto}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {confirmada && (
          <View style={[styles.feedback, {
            backgroundColor: acertou ? '#0d2b1f' : '#2b0d1a',
            borderColor: acertou ? colors.correct : colors.lives,
          }]}>
            <Text style={[styles.feedbackTitulo, { color: acertou ? colors.correct : colors.lives }]}>
              {acertou ? '✓  Correto!' : '✗  Incorreto'}
            </Text>
            {errou && (
              <Text style={styles.feedbackSub}>
                A resposta correta é a alternativa{' '}
                <Text style={{ color: colors.correct, fontFamily: typography.bold }}>{questao.gabarito}</Text>
              </Text>
            )}
          </View>
        )}

      </ScrollView>

      <View style={styles.footer}>
        {!confirmada ? (
          <TouchableOpacity
            style={[styles.botao, !selecionada && styles.botaoDisabled]}
            onPress={confirmar}
            disabled={!selecionada}
          >
            <Text style={styles.botaoTexto}>Confirmar</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.botao} onPress={avancar}>
            <Text style={styles.botaoTexto}>{isUltima ? 'Ver resultado' : 'Próxima'}</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  progressoRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  progressoBolinha: {
    width: 22,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: '#333355',
  },
  progressoFeita: { backgroundColor: colors.primary },
  progressoAtual: { backgroundColor: colors.streak, width: 32 },
  contadorTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
    textAlign: 'right',
  },

  scroll: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },

  demoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#333355',
  },
  demoBadgeTexto: {
    fontFamily: typography.medium,
    fontSize: fontSize.caption,
    color: colors.textSecondary,
  },

  metaRow: { flexDirection: 'row', gap: spacing.sm },
  metaChip: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  metaTexto: {
    fontFamily: typography.medium,
    fontSize: fontSize.caption,
    color: colors.primary,
  },

  enunciado: {
    fontFamily: typography.regular,
    fontSize: fontSize.body,
    color: colors.text,
    lineHeight: 26,
  },

  alternativas: { gap: spacing.md },
  alternativa: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
  },
  letraContainer: {
    width: 28,
    height: 28,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    borderColor: '#555577',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  letra: {
    fontFamily: typography.bold,
    fontSize: 13,
    color: colors.text,
  },
  altTexto: {
    fontFamily: typography.regular,
    fontSize: 15,
    color: colors.text,
    flex: 1,
    lineHeight: 22,
  },

  feedback: {
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  feedbackTitulo: {
    fontFamily: typography.bold,
    fontSize: fontSize.label,
  },
  feedbackSub: {
    fontFamily: typography.regular,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#252540',
  },
  botao: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
  },
  botaoDisabled: { opacity: 0.35 },
  botaoTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.text,
  },
});