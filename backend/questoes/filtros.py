# questoes/filtros.py
"""
Filtros combináveis das partidas.

Parâmetros aceitos (valores separados por vírgula = "qualquer um destes";
filtros diferentes se combinam com E):

  categoria, banca, orgao, concurso, materia  -> ids
  esfera  -> federal | estadual | municipal
  uf      -> RJ, SP…
  nivel   -> fundamental | medio | superior

Compatibilidade: o app antigo manda ?tipo=banca|materia|concurso&id=N — continua valendo.
"""
from django.db.models import Count
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import status

from .models import Concurso, Orgao, Questao
from .taxonomia import UF_NOMES, chave_ordenacao

# parâmetro -> campo da Questao
CAMPOS_ID = {
    'categoria': 'concurso__orgao__categoria_id',
    'banca': 'concurso__banca_id',
    'orgao': 'concurso__orgao_id',
    'concurso': 'concurso_id',
    'materia': 'materia_id',
}
CAMPOS_TEXTO = {
    'esfera': 'concurso__orgao__esfera',
    'uf': 'concurso__orgao__uf',
    'nivel': 'concurso__nivel',
}
CAMPOS = {**CAMPOS_ID, **CAMPOS_TEXTO}
TIPOS_LEGADO = ('banca', 'materia', 'concurso')

VALORES_VALIDOS = {
    'esfera': {v for v, _ in Orgao.Esfera.choices},
    'uf': set(UF_NOMES),
    'nivel': {v for v, _ in Concurso.Nivel.choices},
}


def _lista(valor):
    return [v.strip() for v in str(valor or '').split(',') if v.strip()]


def ler_filtros(params):
    """query_params -> {nome_do_filtro: [valores]}. ValueError com mensagem pronta se algo for inválido."""
    filtros = {}

    for nome in CAMPOS_ID:
        brutos = _lista(params.get(nome))
        if brutos:
            try:
                filtros[nome] = [int(v) for v in brutos]
            except ValueError:
                raise ValueError(f'Filtro "{nome}" inválido: use números separados por vírgula.')

    for nome in CAMPOS_TEXTO:
        brutos = _lista(params.get(nome))
        if brutos:
            valores = [v.upper() if nome == 'uf' else v.lower() for v in brutos]
            invalidos = [v for v in valores if v not in VALORES_VALIDOS[nome]]
            if invalidos:
                raise ValueError(f'Filtro "{nome}" inválido: {", ".join(invalidos)}.')
            filtros[nome] = valores

    # app antigo: um filtro só, no formato ?tipo=banca&id=3
    tipo, id_ = params.get('tipo'), params.get('id')
    if tipo and id_:
        if tipo not in TIPOS_LEGADO:
            raise ValueError('Tipo de filtro inválido. Use banca, materia ou concurso.')
        try:
            filtros.setdefault(tipo, []).append(int(id_))
        except ValueError:
            raise ValueError('Filtro "id" inválido.')

    return filtros


def base_questoes(com_tempo=False):
    """
    Questões que podem entrar numa partida: aprovadas e de MÚLTIPLA ESCOLHA.
    (Certo/Errado do Cebraspe ganha modo próprio na fase 2 — até lá não entra.)
    """
    qs = Questao.objects.filter(
        status=Questao.Status.APROVADA,
        tipo=Questao.Tipo.MULTIPLA_ESCOLHA,
    )
    if com_tempo:
        # No modo com tempo, evita questões com contexto longo ou com
        # imagem — exigem mais tempo de leitura do que o timer permite.
        qs = qs.exclude(contexto__gt='').exclude(tem_imagem=True)
    return qs


def aplicar_filtros(qs, filtros, ignorar=None):
    for nome, valores in filtros.items():
        if nome == ignorar:
            continue
        qs = qs.filter(**{f'{CAMPOS[nome]}__in': valores})
    return qs


def _agrupar(qs, campos_id, campo_nome, **extras):
    """Conta questões por opção. `extras` = {chave_no_json: campo_extra}."""
    linhas = (
        qs.order_by()
        .values(campos_id, campo_nome, *extras.values())
        .annotate(total=Count('id'))
    )
    saida = []
    for linha in linhas:
        if linha[campos_id] in (None, ''):
            continue
        item = {'id': linha[campos_id], 'nome': linha[campo_nome], 'total': linha['total']}
        for chave, campo in extras.items():
            item[chave] = linha[campo]
        saida.append(item)
    return saida


def _alfabetico(opcoes, chave='nome'):
    return sorted(opcoes, key=lambda o: chave_ordenacao(o[chave]))


class FiltrosDisponiveisView(APIView):
    """
    GET /api/questoes/filtros/?<filtros atuais>&com_tempo=1

    Devolve, para cada filtro, as opções que existem (com a quantidade de
    questões de cada uma) considerando os OUTROS filtros já escolhidos — assim
    a tela nunca oferece uma combinação vazia — e o total de questões que a
    partida teria com os filtros atuais.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            filtros = ler_filtros(request.query_params)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        base = base_questoes(request.query_params.get('com_tempo') == '1')

        def sem(nome):
            return aplicar_filtros(base, filtros, ignorar=nome)

        categorias = _alfabetico(_agrupar(
            sem('categoria'), 'concurso__orgao__categoria_id', 'concurso__orgao__categoria__nome'))
        bancas = _alfabetico(_agrupar(sem('banca'), 'concurso__banca_id', 'concurso__banca__nome'))
        orgaos = _alfabetico(_agrupar(sem('orgao'), 'concurso__orgao_id', 'concurso__orgao__nome'))
        materias = _alfabetico(_agrupar(sem('materia'), 'materia_id', 'materia__nome'))
        concursos = _alfabetico(_agrupar(
            sem('concurso'), 'concurso_id', 'concurso__nome',
            ano='concurso__ano', cargo='concurso__cargo',
            banca_nome='concurso__banca__nome', orgao_nome='concurso__orgao__nome',
        ))
        concursos.sort(key=lambda c: (chave_ordenacao(c['nome']), -(c['ano'] or 0)))

        esferas_por_valor = {
            o['id']: o['total']
            for o in _agrupar(sem('esfera'), 'concurso__orgao__esfera', 'concurso__orgao__esfera')
        }
        esferas = [
            {'id': valor, 'nome': rotulo, 'total': esferas_por_valor[valor]}
            for valor, rotulo in Orgao.Esfera.choices if valor in esferas_por_valor
        ]
        ufs = _alfabetico([
            {'id': o['id'], 'nome': UF_NOMES.get(o['id'], o['id']), 'total': o['total']}
            for o in _agrupar(sem('uf'), 'concurso__orgao__uf', 'concurso__orgao__uf')
        ])
        niveis_por_valor = {
            o['id']: o['total']
            for o in _agrupar(sem('nivel'), 'concurso__nivel', 'concurso__nivel')
        }
        niveis = [
            {'id': valor, 'nome': rotulo, 'total': niveis_por_valor[valor]}
            for valor, rotulo in Concurso.Nivel.choices if valor in niveis_por_valor
        ]

        return Response({
            'total': aplicar_filtros(base, filtros).count(),
            'categorias': categorias,
            'esferas': esferas,
            'ufs': ufs,
            'bancas': bancas,
            'orgaos': orgaos,
            'concursos': concursos,
            'materias': materias,
            'niveis': niveis,
        })