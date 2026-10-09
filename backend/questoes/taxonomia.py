"""
Organização das questões: matérias unificadas (nome oficial + apelidos),
siglas de estados e ordenação alfabética sem acento.

Este módulo não importa models no topo (os models importam daqui);
as funções que mexem no banco importam o que precisam por dentro.
"""
import re
import unicodedata

UF_NOMES = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas', 'BA': 'Bahia',
    'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo', 'GO': 'Goiás',
    'MA': 'Maranhão', 'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
    'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco', 'PI': 'Piauí',
    'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte', 'RS': 'Rio Grande do Sul',
    'RO': 'Rondônia', 'RR': 'Roraima', 'SC': 'Santa Catarina', 'SP': 'São Paulo',
    'SE': 'Sergipe', 'TO': 'Tocantins',
}
UF_CHOICES = sorted(((sigla, f'{sigla} — {nome}') for sigla, nome in UF_NOMES.items()))


def sem_acento(texto):
    return ''.join(
        c for c in unicodedata.normalize('NFKD', str(texto or '')) if not unicodedata.combining(c)
    )


def chave_ordenacao(texto):
    """Ordem alfabética que ignora acento e maiúscula (Ágata vem antes de Zebra)."""
    return sem_acento(texto).casefold()


# "Noções de X", "Noções Básicas de X", "Conhecimentos de X" -> X
_PREFIXO = re.compile(
    r'^(?:'
    r'nocoes?\s+(?:basicas?\s+)?(?:(?:de|do|da|dos|das|em)\s+)?'
    r'|conhecimentos\s+(?:basicos?\s+)?(?:de|do|da|dos|das|em)\s+'
    r')'
)


def chave_materia(nome):
    """
    Chave de comparação entre nomes de matéria: sem acento/maiúscula/pontuação
    e sem prefixos como "Noções de". "Noções de Direito Penal" e "Direito Penal"
    geram a mesma chave. Nomes realmente diferentes ("Raciocínio Lógico" x
    "Raciocínio Lógico Matemático") NÃO se unem sozinhos — isso é feito por
    apelido ou pela ação "Mesclar matérias" no admin.
    """
    t = sem_acento(nome).lower().replace('&', ' e ')
    t = re.sub(r'[^a-z0-9]+', ' ', t).strip()
    sem_prefixo = _PREFIXO.sub('', t).strip()
    return sem_prefixo or t


def resolver_materias(nomes_impressos):
    """
    Recebe os nomes de matéria como estão na prova e devolve
    (mapa {nome impresso: Materia}, novas [nomes], unificadas [(impresso, oficial)]).

    - procura pelo nome oficial e pelos apelidos de todas as matérias;
    - o que não reconhecer vira matéria nova (com o nome como veio na prova).
    """
    from .models import Materia

    materias = list(Materia.objects.order_by('id'))
    por_chave = {}
    for m in materias:                      # nomes oficiais têm prioridade...
        por_chave.setdefault(chave_materia(m.nome), m)
    for m in materias:                      # ...sobre apelidos
        for apelido in m.lista_aliases():
            por_chave.setdefault(chave_materia(apelido), m)

    mapa, novas, unificadas = {}, [], []
    for nome in sorted({n.strip() for n in nomes_impressos if n and n.strip()}):
        chave = chave_materia(nome)
        materia = por_chave.get(chave)
        if materia is None:
            materia = Materia.objects.create(nome=nome[:100])
            por_chave[chave] = materia
            novas.append(materia.nome)
        elif materia.nome != nome:
            unificadas.append((nome, materia.nome))
        mapa[nome] = materia
    return mapa, novas, unificadas


def mesclar_materias(destino, origens):
    """
    Move todas as questões das `origens` para `destino`, guarda os nomes antigos
    como apelidos do destino (assim a próxima importação já une sozinha) e apaga
    as origens. Retorna quantas questões foram movidas.
    """
    from django.db import transaction
    from .models import Materia, Questao

    origens = [o for o in origens if o.pk != destino.pk]
    if not origens:
        return 0
    with transaction.atomic():
        movidas = Questao.objects.filter(materia__in=origens).update(materia=destino)
        conhecidos = {chave_materia(destino.nome)} | {chave_materia(a) for a in destino.lista_aliases()}
        apelidos = destino.lista_aliases()
        for o in origens:
            for nome in [o.nome] + o.lista_aliases():
                if chave_materia(nome) not in conhecidos and nome != destino.nome:
                    apelidos.append(nome)
                    conhecidos.add(chave_materia(nome))
        destino.aliases = '\n'.join(apelidos)
        destino.save(update_fields=['aliases'])
        Materia.objects.filter(pk__in=[o.pk for o in origens]).delete()
    return movidas