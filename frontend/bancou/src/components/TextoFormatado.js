import React, { useMemo } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { parseTextoFormatado, parseMatematica, temMatematica } from '../utils/textoFormatado';

/**
 * Substitui <Text> onde aparece enunciado, contexto ou alternativa de questão.
 * Interpreta <u> sublinhado, <b> negrito, <i> itálico, <sup>/<sub> e fórmulas
 * (<frac> fração empilhada, <rad> radicando com traço em cima).
 *
 *   <TextoFormatado style={styles.enunciado}>{questao.enunciado}</TextoFormatado>
 *
 * Aceita as mesmas props do <Text> (style, numberOfLines, selectable...).
 * `fontFamilyNegrito` é opcional: informe a família em negrito da fonte do app
 * (ex.: 'Inter_700Bold') se o fontWeight sozinho não engrossar a fonte custom.
 *
 * Texto sem fórmula usa um <Text> normal. Com fórmula, a linha vira uma fileira
 * que quebra entre palavras (numberOfLines e selectable não valem nesse caso).
 */

// ─── Texto sem fórmula: <Text> com trechos formatados ──────────────────────
function estiloFormato(s, fontFamilyNegrito) {
  const estilo = {};
  if (s.u) estilo.textDecorationLine = 'underline';
  if (s.b) {
    estilo.fontWeight = 'bold';
    if (fontFamilyNegrito) estilo.fontFamily = fontFamilyNegrito;
  }
  if (s.i) estilo.fontStyle = 'italic';
  return estilo;
}

// ─── Texto com fórmula: fileira de palavras + fração/raiz desenhadas ───────
const CHAVES_DE_TEXTO = [
  'color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'letterSpacing',
  'lineHeight', 'textAlign', 'textDecorationLine',
];

function separarEstilos(style) {
  const plano = StyleSheet.flatten(style) || {};
  const texto = {};
  const caixa = {};
  Object.keys(plano).forEach((chave) => {
    (CHAVES_DE_TEXTO.includes(chave) ? texto : caixa)[chave] = plano[chave];
  });
  return { texto, caixa };
}

function renderNos(nos, ctx, prefixo, dentroDeFormula) {
  const saida = [];
  nos.forEach((no, n) => {
    const chave = `${prefixo}.${n}`;

    if (no.tipo === 'texto') {
      no.segmentos.forEach((seg, s) => {
        // "\n" vira quebra de linha; o resto é cortado em palavras (com o espaço
        // que vem depois), para a fileira poder quebrar entre elas.
        seg.texto.split(/(\n)/).forEach((pedaco, p) => {
          const k = `${chave}.${s}.${p}`;
          if (pedaco === '\n') {
            saida.push(<View key={k} style={estilos.quebra} />);
            return;
          }
          (pedaco.match(/\S+\s*|\s+/g) || []).forEach((palavra, w) => {
            saida.push(
              <Text key={`${k}.${w}`} style={[ctx.texto, dentroDeFormula && ctx.compacto, estiloFormato(seg, ctx.fontFamilyNegrito)]}>
                {palavra}
              </Text>
            );
          });
        });
      });
      return;
    }

    if (no.tipo === 'frac') {
      saida.push(
        <View key={chave} style={estilos.fracao}>
          <View style={estilos.parte}>{renderNos(no.num, ctx, `${chave}n`, true)}</View>
          <View style={[estilos.barra, { backgroundColor: ctx.cor }]} />
          <View style={estilos.parte}>{renderNos(no.den, ctx, `${chave}d`, true)}</View>
        </View>
      );
      return;
    }

    if (no.tipo === 'rad') {
      saida.push(
        <View key={chave} style={[estilos.radicando, { borderTopColor: ctx.cor }]}>
          {renderNos(no.filhos, ctx, `${chave}r`, true)}
        </View>
      );
    }
  });
  return saida;
}

function Formula({ texto, style, fontFamilyNegrito }) {
  const arvore = useMemo(() => parseMatematica(texto), [texto]);
  const { texto: estiloTexto, caixa } = separarEstilos(style);
  const tamanho = estiloTexto.fontSize ?? 16;
  const ctx = {
    texto: estiloTexto,
    // dentro de fração/raiz a altura de linha encolhe, senão a fração fica altíssima
    compacto: { lineHeight: Math.round(tamanho * 1.3) },
    cor: estiloTexto.color ?? '#FFFFFF',
    fontFamilyNegrito,
  };
  return <View style={[caixa, estilos.linha]}>{renderNos(arvore, ctx, 'f', false)}</View>;
}

export default function TextoFormatado({ children, style, fontFamilyNegrito, ...rest }) {
  const texto = typeof children === 'string' ? children : children == null ? '' : String(children);
  const comFormula = useMemo(() => temMatematica(texto), [texto]);
  const segmentos = useMemo(() => (comFormula ? [] : parseTextoFormatado(texto)), [texto, comFormula]);

  if (comFormula) {
    return <Formula texto={texto} style={style} fontFamilyNegrito={fontFamilyNegrito} />;
  }

  return (
    <Text style={style} {...rest}>
      {segmentos.map((s, idx) => {
        if (!s.u && !s.b && !s.i) return s.texto;
        return (
          <Text key={idx} style={estiloFormato(s, fontFamilyNegrito)}>
            {s.texto}
          </Text>
        );
      })}
    </Text>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  quebra: { width: '100%', height: 0 },
  fracao: { alignItems: 'center', marginHorizontal: 3 },
  parte: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  barra: { height: 1.2, alignSelf: 'stretch', marginVertical: 1 },
  radicando: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1.2, paddingTop: 1, paddingHorizontal: 2 },
});