// src/components/ConteudoComImagens.js
import React from 'react';
import TextoFormatado from './TextoFormatado';
import ImagemQuestao from './ImagemQuestao';

const RE_MARCADOR = /\[\[img:(\d+)\]\]/gi;
const RE_DIVISAO = /\[\[img:(\d+)\]\]/i;

/**
 * Lista normalizada de imagens da questão: [{ ordem, uri, legenda }].
 * Ignora imagens ainda sem arquivo (uri null). Questões antigas, que só têm o
 * campo `imagem` (imagem única), viram uma lista de 1 item com ordem 1.
 */
export function imagensDaQuestao(questao) {
  const lista = (questao?.imagens ?? [])
    .filter((i) => !!i.imagem)
    .map((i) => ({ ordem: i.ordem, uri: i.imagem, legenda: i.legenda }));
  if (lista.length === 0 && questao?.imagem) {
    return [{ ordem: 1, uri: questao.imagem, legenda: '' }];
  }
  return lista;
}

/** Conjunto das ordens citadas por marcadores [[img:N]] nos textos dados. */
export function ordensMarcadas(...textos) {
  const usadas = new Set();
  textos.forEach((t) => {
    for (const m of String(t ?? '').matchAll(RE_MARCADOR)) usadas.add(Number(m[1]));
  });
  return usadas;
}

/**
 * Desenha um texto formatado e, no ponto de cada [[img:N]], a imagem de ordem N.
 * Marcador cuja imagem ainda não foi enviada (ou não existe) simplesmente não aparece.
 *
 *   <ConteudoComImagens texto={q.enunciado} imagens={imagens} questaoId={q.id} style={styles.enunciado} />
 *
 * Devolve um Fragment: os blocos viram filhos diretos do container (herdam o `gap`).
 */
export default function ConteudoComImagens({ texto, imagens, questaoId, style }) {
  const partes = String(texto ?? '').split(RE_DIVISAO);

  return (
    <>
      {partes.map((parte, i) => {
        // índices pares = texto; ímpares = número capturado do marcador
        if (i % 2 === 0) {
          const t = parte.trim();
          return t ? (
            <TextoFormatado key={`t${i}`} style={style}>{t}</TextoFormatado>
          ) : null;
        }
        const img = imagens.find((x) => x.ordem === Number(parte));
        return img ? (
          <ImagemQuestao key={`${questaoId}-${parte}-${i}`} uri={img.uri} />
        ) : null;
      })}
    </>
  );
}