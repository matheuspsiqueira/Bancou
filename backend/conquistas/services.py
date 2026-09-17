# conquistas/services.py
from django.db.models import Sum
from django.utils import timezone


# ---------------------------------------------------------------------------
# Catálogo de tipos de condição — código fixo, escrito uma única vez por tipo.
#
# Cada função recebe (usuario, conquista) — o objeto Conquista inteiro — e
# devolve o VALOR ATUAL do usuário pra aquela métrica (não um booleano de
# "bateu ou não"). Quem decide se bateu a meta é avaliar_conquistas(), mais
# abaixo, comparando com conquista.meta — e, pra tipos cumulativos, só
# depois de descontar o "baseline" (valor_inicial) de quando a conquista
# foi criada. Ver TIPOS_INSTANTANEOS logo abaixo.
#
# Pra adicionar um tipo de condição NOVO: escreve a função aqui e registra
# no dict CATALOGO_CONDICOES (isso também atualiza as choices do campo
# tipo_condicao no admin). Se o tipo novo precisar de um dado extra além
# da meta (como banca/materia hoje), registra também em
# CAMPOS_EXTRAS_POR_TIPO — e replica a mesma entrada no mapa JS em
# conquistas/static/conquistas/js/admin_conquista.js pra o campo aparecer
# certo no formulário. Se o tipo novo for um ESTADO atual (como
# streak_dias) em vez de um total histórico acumulado, adiciona também em
# TIPOS_INSTANTANEOS. Cadastrar uma Conquista nova usando um tipo JÁ
# EXISTENTE não precisa de código nenhum — vira trabalho 100% de admin.
# ---------------------------------------------------------------------------

def _eval_total_acertos(usuario, conquista):
    from questoes.models import Partida
    total = Partida.objects.filter(
        usuario=usuario, finalizada=True
    ).aggregate(soma=Sum('acertos'))['soma']
    return total or 0


def _eval_partidas_jogadas(usuario, conquista):
    from questoes.models import Partida
    return Partida.objects.filter(usuario=usuario, finalizada=True).count()


def _eval_streak_dias(usuario, conquista):
    return usuario.streak


def _eval_acertos_por_banca(usuario, conquista):
    from questoes.models import RespostaUsuario
    if not conquista.banca_id:
        return 0
    return RespostaUsuario.objects.filter(
        usuario=usuario, correta=True, questao__concurso__banca_id=conquista.banca_id
    ).count()


def _eval_acertos_por_materia(usuario, conquista):
    from questoes.models import RespostaUsuario
    if not conquista.materia_id:
        return 0
    return RespostaUsuario.objects.filter(
        usuario=usuario, correta=True, questao__materia_id=conquista.materia_id
    ).count()


CATALOGO_CONDICOES = {
    'total_acertos': _eval_total_acertos,
    'partidas_jogadas': _eval_partidas_jogadas,
    'streak_dias': _eval_streak_dias,
    'acertos_por_banca': _eval_acertos_por_banca,
    'acertos_por_materia': _eval_acertos_por_materia,
}

# Tipos que exigem um campo extra além de "meta", e qual campo do model
# Conquista é esse. Usado pra validação (Conquista.clean()) e espelhado em
# admin_conquista.js pra mostrar só o campo certo no formulário.
CAMPOS_EXTRAS_POR_TIPO = {
    'acertos_por_banca': 'banca',
    'acertos_por_materia': 'materia',
}

# Tipos "de estado" — o valor reflete uma condição ATUAL, não um total
# histórico que se acumula com o tempo. Não usam baseline: se o usuário
# já está com a condição batida no momento em que a conquista é criada,
# ele já a tem de verdade — não é "crédito retroativo" de ações passadas,
# é o estado real agora (ex.: já estar com streak de 7 dias quando a
# conquista "streak de 7 dias" é criada).
TIPOS_INSTANTANEOS = {'streak_dias'}


def inicializar_baseline_para_todos_usuarios(conquista):
    """
    Chamado uma única vez, quando uma Conquista NOVA é criada (ver
    ConquistaAdmin.save_model). Pra tipos cumulativos, registra o valor
    atual de cada usuário já existente como ponto de partida
    (valor_inicial) — assim o progresso da conquista só conta o que
    acontecer DEPOIS dela existir. Sem isso, criar "jogue 100 partidas"
    quando alguém já tem 101 partidas jogadas destravaria na hora, o que
    não faz sentido.

    Usuários que se cadastrarem depois não precisam disso: não têm
    histórico anterior à conquista, então ConquistaUsuario nasce com
    valor_inicial=0 (default) na primeira avaliação normal — já é o
    baseline correto pra eles.

    Tipos em TIPOS_INSTANTANEOS não usam baseline — não faz nada pra eles.
    """
    if conquista.tipo_condicao in TIPOS_INSTANTANEOS:
        return

    avaliador = CATALOGO_CONDICOES.get(conquista.tipo_condicao)
    if avaliador is None:
        return

    from usuarios.models import Usuario
    from .models import ConquistaUsuario

    novos = [
        ConquistaUsuario(
            usuario=usuario,
            conquista=conquista,
            valor_inicial=avaliador(usuario, conquista),
        )
        for usuario in Usuario.objects.all()
    ]
    if novos:
        ConquistaUsuario.objects.bulk_create(novos, ignore_conflicts=True)


def avaliar_conquistas(usuario):
    """
    Listener central. Roda todas as Conquistas ativas que o usuário ainda
    não completou, chama a função avaliadora de cada uma, atualiza o
    progresso salvo (já descontando o baseline pra tipos cumulativos) e
    credita XP/moedas na hora em que a meta é batida.

    Chamado hoje só em FinalizarPartidaView (fim de partida) — ponto onde
    os dados da partida (acertos/erros + os RespostaUsuario associados)
    já estão consolidados no banco.
    """
    from .models import Conquista, ConquistaUsuario

    conquistas_pendentes = Conquista.objects.filter(ativa=True).exclude(
        usuarios__usuario=usuario, usuarios__completada=True
    )

    for conquista in conquistas_pendentes:
        avaliador = CATALOGO_CONDICOES.get(conquista.tipo_condicao)
        if avaliador is None:
            continue  # tipo desconhecido/renomeado — não derruba o fluxo do fim de partida

        valor_atual = avaliador(usuario, conquista)

        # valor_inicial=0 por default no get_or_create: correto pra quem
        # se cadastrou depois da conquista existir. Quem já existia antes
        # já teve essa linha criada (com o baseline certo) por
        # inicializar_baseline_para_todos_usuarios — aqui só faz "get".
        progresso_obj, _ = ConquistaUsuario.objects.get_or_create(
            usuario=usuario, conquista=conquista,
        )

        if conquista.tipo_condicao in TIPOS_INSTANTANEOS:
            progresso_real = valor_atual
        else:
            progresso_real = max(0, valor_atual - progresso_obj.valor_inicial)

        if progresso_obj.progresso != progresso_real:
            progresso_obj.progresso = progresso_real
            progresso_obj.save(update_fields=['progresso'])

        if progresso_real >= conquista.meta and not progresso_obj.completada:
            progresso_obj.completada = True
            progresso_obj.completada_em = timezone.now()
            progresso_obj.save(update_fields=['completada', 'completada_em'])

            usuario.xp += conquista.recompensa_xp
            usuario.moedas += conquista.recompensa_moedas
            usuario.save(update_fields=['xp', 'moedas'])