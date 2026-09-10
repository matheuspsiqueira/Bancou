// src/utils/ligas.js
// Segue o mesmo padrão de niveis.js: tabela de dados + funções helper,
// centralizando o que era um mapa solto (LIGA_IMAGENS) dentro da PerfilScreen.
// Import único, reutilizável em qualquer tela que precise mostrar liga/shield
// (PerfilScreen, RankingScreen quando for reconstruída, etc).
//
// ATENÇÃO — thresholds ainda não fechados (briefing §9, pergunta em aberto):
// só "não rankeado -> Ferro" em ~300 troféus está confirmado. Os demais
// valores abaixo são placeholder pra dar estrutura ao código; ajuste assim
// que a mecânica de Ligas for decidida de verdade.

export const LIGAS = [
  { id: 'nao_rankeado', nome: 'Não rankeado', minTrofeus: null, imagem: require('../assets/icons/nao-rankeado.png') },
  { id: 'ferro',        nome: 'Ferro',        minTrofeus: 300,  imagem: require('../assets/icons/liga_ferro.png') },
  { id: 'bronze',       nome: 'Bronze',       minTrofeus: 800,  imagem: require('../assets/icons/liga_bronze.png') },
  { id: 'prata',        nome: 'Prata',        minTrofeus: 1800, imagem: require('../assets/icons/liga_prata.png') },
  { id: 'ouro',         nome: 'Ouro',         minTrofeus: 3500, imagem: require('../assets/icons/liga_ouro.png') },
  { id: 'platina',      nome: 'Platina',      minTrofeus: 6000, imagem: require('../assets/icons/liga_platina.png') },
  { id: 'diamante',     nome: 'Diamante',     minTrofeus: 10000, imagem: require('../assets/icons/liga_diamante.png') },
];

// `trofeus === null` cobre quem nunca comprou o Passe de Duelo / nunca
// entrou no sistema de ranking — sempre "Não rankeado", independente de XP.
export function getLiga(trofeus = null) {
  if (trofeus === null || trofeus === undefined) return LIGAS[0];

  let liga = LIGAS[0];
  for (const l of LIGAS) {
    if (l.minTrofeus !== null && trofeus >= l.minTrofeus) liga = l;
  }
  return liga;
}

export function getLigaImagem(trofeus = null) {
  return getLiga(trofeus).imagem;
}

export function getLigaNome(trofeus = null) {
  return getLiga(trofeus).nome;
}