// src/utils/filtrosPartida.js
// Lógica pura (sem React) da tela de filtros da partida — fica separada para
// ser fácil de testar e para a PartidaScreen montar a mesma query.

// Ordem em que os filtros aparecem na tela. `lista` = chave na resposta de
// /api/questoes/filtros/.
export const FILTROS = [
  { chave: 'categoria', titulo: 'Categoria', lista: 'categorias', busca: false },
  { chave: 'esfera',    titulo: 'Esfera',    lista: 'esferas',    busca: false },
  { chave: 'uf',        titulo: 'Estado',    lista: 'ufs',        busca: true  },
  { chave: 'orgao',     titulo: 'Órgão',     lista: 'orgaos',     busca: true  },
  { chave: 'banca',     titulo: 'Banca',     lista: 'bancas',     busca: true  },
  { chave: 'concurso',  titulo: 'Concurso',  lista: 'concursos',  busca: true  },
  { chave: 'materia',   titulo: 'Matéria',   lista: 'materias',   busca: true  },
  { chave: 'nivel',     titulo: 'Nível',     lista: 'niveis',     busca: false },
];

export function temFiltroAtivo(selecao) {
  return FILTROS.some(({ chave }) => (selecao?.[chave] ?? []).length > 0);
}

/** Acrescenta os filtros escolhidos em um URLSearchParams (valores separados por vírgula). */
export function anexarFiltros(params, selecao) {
  FILTROS.forEach(({ chave }) => {
    const valores = selecao?.[chave] ?? [];
    if (valores.length) params.append(chave, valores.join(','));
  });
  return params;
}

export function montarQuery(selecao, comTempo) {
  const params = new URLSearchParams();
  anexarFiltros(params, selecao);
  if (comTempo) params.append('com_tempo', '1');
  return params.toString();
}

/** Liga/desliga um valor dentro da seleção de um filtro (devolve uma seleção nova). */
export function alternarValor(selecao, chave, id) {
  const atual = selecao[chave] ?? [];
  const existe = atual.some((v) => String(v) === String(id));
  const proximo = existe ? atual.filter((v) => String(v) !== String(id)) : [...atual, id];
  return { ...selecao, [chave]: proximo };
}

/** "Todos", "TJRJ", "TJRJ, PRF" ou "3 selecionados". */
export function resumoSelecao(valores, nomes) {
  if (!valores || valores.length === 0) return 'Todos';
  if (valores.length <= 2) return valores.map((v) => nomes?.[v] ?? String(v)).join(', ');
  return `${valores.length} selecionados`;
}

export function normalizarBusca(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Itens do seletor: opções vindas da API + as já escolhidas que sumiram do
 * recorte atual (aparecem com 0 para o aluno conseguir desmarcar), filtradas
 * pela busca. A ordem alfabética vem do servidor.
 */
export function itensDoSeletor(opcoes, selecionados, nomes, busca) {
  const lista = opcoes ?? [];
  const presentes = new Set(lista.map((o) => String(o.id)));
  const faltando = (selecionados ?? [])
    .filter((id) => !presentes.has(String(id)))
    .map((id) => ({ id, nome: nomes?.[id] ?? String(id), total: 0 }));
  const termo = normalizarBusca(busca);
  const todos = [...faltando, ...lista];
  if (!termo) return todos;
  return todos.filter((o) =>
    normalizarBusca(`${o.nome} ${o.orgao_nome ?? ''} ${o.banca_nome ?? ''} ${o.ano ?? ''}`).includes(termo)
  );
}

/** Guarda id -> nome de cada opção que a API já mostrou (para o resumo das linhas). */
export function atualizarNomes(nomes, resposta) {
  const proximo = { ...nomes };
  FILTROS.forEach(({ chave, lista }) => {
    proximo[chave] = { ...(proximo[chave] ?? {}) };
    (resposta?.[lista] ?? []).forEach((o) => {
      proximo[chave][o.id] = o.nome;
    });
  });
  return proximo;
}

export function textoTotal(total) {
  if (total === 0) return 'Nenhuma questão com esses filtros';
  if (total === 1) return '1 questão disponível';
  return `${total} questões disponíveis`;
}