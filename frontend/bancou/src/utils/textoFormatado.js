// Interpreta o texto formatado das questões (enunciado, contexto e alternativas).
//
// Formato vindo do backend: texto simples com as tags <u> <b> <i> <sup> <sub>,
// "\n" como quebra de linha e os escapes &lt; &gt; &amp;. Fórmulas:
//   <frac><num>…</num><den>…</den></frac>   fração empilhada
//   √<rad>…</rad>                            radicando com traço em cima
//   <vec>F</vec>  <bar>AB</bar>  <hat>A</hat>   seta / traço / chapéu em cima do texto
//   <mat>…</mat> (parênteses)  <matc>…</matc> (colchetes)  <det>…</det> (barras), com
//   linhas em <lin> e células em <cel>
// (uma pode ficar dentro da outra). Texto antigo (sem nenhuma tag) passa direto.

const ESTRUTURA = 'frac|num|den|rad|vec|bar|hat|mat|matc|det|lin|cel';
const RE_TAG_MATEMATICA = new RegExp(`(<\\/?(?:u|b|i|sup|sub|${ESTRUTURA})>)`, 'gi');
const RE_TAG_UNICA = new RegExp(`^<(\\/?)(u|b|i|sup|sub|${ESTRUTURA})>$`, 'i');
const RE_TEM_MATEMATICA = /<(frac|rad|vec|bar|hat|mat|matc|det)>/i;

const ESTILO_MATRIZ = { mat: 'parenteses', matc: 'colchetes', det: 'barras' };

const SUPER = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
  '+': '⁺', '-': '⁻', '−': '⁻', '=': '⁼', '(': '⁽', ')': '⁾',
  a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ',
  n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ',
};
const SUB = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
  '+': '₊', '-': '₋', '−': '₋', '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
};

function decodificar(t) {
  // &amp; por último, para "&amp;lt;" virar "&lt;" (literal) e não "<"
  return t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
}

function mapear(t, tabela) {
  return Array.from(t).map((c) => tabela[c] ?? c).join('');
}

function converterTexto(parte, aberto) {
  let t = decodificar(parte);
  if (aberto.sup > 0) t = mapear(t, SUPER);
  else if (aberto.sub > 0) t = mapear(t, SUB);
  return { texto: t, u: aberto.u > 0, b: aberto.b > 0, i: aberto.i > 0 };
}

/**
 * Quebra o texto em segmentos: [{ texto, u, b, i }]
 * (sup/sub são convertidos para caracteres sobrescritos/subscritos —
 * o <Text> do React Native não desloca a linha de base).
 * Fórmulas (<frac>, <rad>, <vec>, <mat>…) são ignoradas aqui: o texto delas vem
 * sem as tags (use parseMatematica quando houver fórmula).
 */
export function parseTextoFormatado(texto) {
  if (texto === null || texto === undefined) return [];
  const bruto = String(texto);
  if (!bruto.includes('<') && !bruto.includes('&')) {
    return bruto === '' ? [] : [{ texto: bruto, u: false, b: false, i: false }];
  }

  const aberto = { u: 0, b: 0, i: 0, sup: 0, sub: 0 };
  const segmentos = [];

  for (const parte of bruto.split(RE_TAG_MATEMATICA)) {
    if (parte === '') continue;
    const m = RE_TAG_UNICA.exec(parte);
    if (m) {
      const nome = m[2].toLowerCase();
      if (aberto[nome] !== undefined) {
        if (m[1]) aberto[nome] = Math.max(0, aberto[nome] - 1);
        else aberto[nome] += 1;
      }
      continue;
    }
    segmentos.push(converterTexto(parte, aberto));
  }
  return segmentos;
}

/** True se o texto tem fração, raiz, vetor/barra/chapéu ou matriz para desenhar. */
export function temMatematica(texto) {
  return RE_TEM_MATEMATICA.test(String(texto ?? ''));
}

/**
 * Árvore de uma linha com fórmulas:
 *   { tipo: 'texto', segmentos: [{ texto, u, b, i }] }
 *   { tipo: 'frac', num: [nós], den: [nós] }
 *   { tipo: 'rad' | 'vec' | 'bar' | 'hat', filhos: [nós] }
 *   { tipo: 'mat', estilo: 'parenteses' | 'colchetes' | 'barras', linhas: [[ [nós] (célula) ]] }
 * Tolera tags mal fechadas (fecha o que ficou aberto, ignora fechamento solto).
 */
export function parseMatematica(texto) {
  const raiz = [];
  const pilha = [{ nome: 'raiz', lista: raiz }];   // onde os nós novos entram
  const aberto = { u: 0, b: 0, i: 0, sup: 0, sub: 0 };
  const topo = () => pilha[pilha.length - 1];
  const procurar = (nome) => [...pilha].reverse().find((p) => p.nome === nome);
  const fechar = (nome) => {
    const i = pilha.map((p) => p.nome).lastIndexOf(nome);
    if (i > 0) pilha.length = i;
  };

  const empurrarTexto = (parte) => {
    const lista = topo().lista;
    const seg = converterTexto(parte, aberto);
    const ultimo = lista[lista.length - 1];
    if (ultimo && ultimo.tipo === 'texto') ultimo.segmentos.push(seg);
    else lista.push({ tipo: 'texto', segmentos: [seg] });
  };

  for (const parte of String(texto ?? '').split(RE_TAG_MATEMATICA)) {
    if (parte === '') continue;
    const m = RE_TAG_UNICA.exec(parte);
    if (!m) { empurrarTexto(parte); continue; }
    const abre = !m[1];
    const nome = m[2].toLowerCase();

    if (aberto[nome] !== undefined) {              // formatação
      aberto[nome] = abre ? aberto[nome] + 1 : Math.max(0, aberto[nome] - 1);
    } else if (nome === 'frac') {
      if (abre) {
        const no = { tipo: 'frac', num: [], den: [] };
        topo().lista.push(no);
        pilha.push({ nome: 'frac', no, lista: [] });   // lista vazia até chegar <num>/<den>
      } else {
        fechar('frac');
      }
    } else if (nome === 'num' || nome === 'den') {
      if (abre) {
        const frac = procurar('frac');
        if (frac) pilha.push({ nome, lista: nome === 'num' ? frac.no.num : frac.no.den });
      } else {
        fechar(nome);
      }
    } else if (nome === 'rad' || nome === 'vec' || nome === 'bar' || nome === 'hat') {
      if (abre) {
        const no = { tipo: nome, filhos: [] };
        topo().lista.push(no);
        pilha.push({ nome, lista: no.filhos });
      } else {
        fechar(nome);
      }
    } else if (ESTILO_MATRIZ[nome]) {                // <mat> <matc> <det>
      if (abre) {
        const no = { tipo: 'mat', estilo: ESTILO_MATRIZ[nome], linhas: [] };
        topo().lista.push(no);
        pilha.push({ nome, no, lista: [] });          // texto solto entre as peças da matriz é descartado
      } else {
        fechar(nome);
      }
    } else if (nome === 'lin') {
      if (abre) {
        const matriz = [...pilha].reverse().find((p) => p.no && p.no.tipo === 'mat');
        if (matriz) {
          const linha = [];
          matriz.no.linhas.push(linha);
          pilha.push({ nome: 'lin', linha, lista: [] });
        }
      } else {
        fechar('lin');
      }
    } else if (nome === 'cel') {
      if (abre) {
        const lin = procurar('lin');
        if (lin) {
          const celula = [];
          lin.linha.push(celula);
          pilha.push({ nome: 'cel', lista: celula });
        }
      } else {
        fechar('cel');
      }
    }
  }
  return raiz;
}

/** Texto sem nenhuma marcação (para busca, acessibilidade, etc.). */
export function textoPuro(texto) {
  return parseTextoFormatado(texto).map((s) => s.texto).join('');
}