// Interpreta o texto formatado das questões (enunciado, contexto e alternativas).
//
// Formato vindo do backend: texto simples com as tags <u> <b> <i> <sup> <sub>,
// "\n" como quebra de linha e os escapes &lt; &gt; &amp;.
// Texto antigo (sem nenhuma tag) passa direto, sem mudança.

const RE_TAG = /(<\/?(?:u|b|i|sup|sub)>)/gi;

const SUPER = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '=': '⁼', '(': '⁽', ')': '⁾', n: 'ⁿ' };
const SUB = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '=': '₌', '(': '₍', ')': '₎' };

function decodificar(t) {
  // &amp; por último, para "&amp;lt;" virar "&lt;" (literal) e não "<"
  return t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function mapear(t, tabela) {
  return Array.from(t).map((c) => tabela[c] ?? c).join('');
}

/**
 * Quebra o texto em segmentos: [{ texto, u, b, i }]
 * (sup/sub são convertidos para caracteres sobrescritos/subscritos —
 * o <Text> do React Native não desloca a linha de base).
 */
export function parseTextoFormatado(texto) {
  if (texto === null || texto === undefined) return [];
  const bruto = String(texto);
  if (!bruto.includes('<') && !bruto.includes('&')) {
    return bruto === '' ? [] : [{ texto: bruto, u: false, b: false, i: false }];
  }

  const aberto = { u: 0, b: 0, i: 0, sup: 0, sub: 0 };
  const segmentos = [];

  for (const parte of bruto.split(RE_TAG)) {
    if (parte === '') continue;
    const m = /^<(\/?)(u|b|i|sup|sub)>$/i.exec(parte);
    if (m) {
      const nome = m[2].toLowerCase();
      if (m[1]) aberto[nome] = Math.max(0, aberto[nome] - 1);
      else aberto[nome] += 1;
      continue;
    }
    let t = decodificar(parte);
    if (aberto.sup > 0) t = mapear(t, SUPER);
    else if (aberto.sub > 0) t = mapear(t, SUB);
    segmentos.push({ texto: t, u: aberto.u > 0, b: aberto.b > 0, i: aberto.i > 0 });
  }
  return segmentos;
}

/** Texto sem nenhuma marcação (para busca, acessibilidade, etc.). */
export function textoPuro(texto) {
  return parseTextoFormatado(texto).map((s) => s.texto).join('');
}