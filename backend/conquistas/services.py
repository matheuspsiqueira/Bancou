# conquistas/services.py
from django.db.models import Sum
from django.utils import timezone


# ---------------------------------------------------------------------------
# Catálogo de tipos de condição — código fixo, escrito uma única vez por tipo.
#
# Cada função recebe (usuario, conquista) — o objeto Conquista inteiro, não
# só um dict — e devolve o VALOR ATUAL do usuário pra aquela métrica (não
# um booleano de "bateu ou não"); quem compara com conquista.meta é o
# listener central, avaliar_conquistas(), logo abaixo.
#
# Pra adicionar um tipo de condição NOVO: escreve a função aqui e registra
# no dict CATALOGO_CONDICOES (isso também atualiza as choices do campo
# tipo_condicao no admin). Se o tipo novo precisar de um dado extra além
# da meta (como banca/materia hoje), registra também em
# CAMPOS_EXTRAS_POR_TIPO — e replica a mesma entrada no mapa JS em
# conquistas/static/conquistas/js/admin_conquista.js pra o campo aparecer
# certo no formulário. Cadastrar uma Conquista nova usando um tipo JÁ
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


def avaliar_conquistas(usuario):
    """
    Listener central. Roda todas as Conquistas ativas que o usuário ainda
    não completou, chama a função avaliadora de cada uma, atualiza o
    progresso salvo e credita XP/moedas na hora em que a meta é batida.

    Chamado hoje só em FinalizarPartidaView (fim de partida) — ponto onde
    os dados da partida (acertos/erros + os RespostaUsuario associados)
    já estão consolidados no banco. Se no futuro fizer sentido avaliar
    conquista no meio da partida (ex.: um popup instantâneo ao acertar a
    questão que bate a meta), basta chamar essa mesma função também em
    CorrigirRespostaView — nada aqui precisa mudar pra isso.
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

        progresso, criado = ConquistaUsuario.objects.get_or_create(
            usuario=usuario, conquista=conquista,
            defaults={'progresso': valor_atual},
        )
        if not criado and progresso.progresso != valor_atual:
            progresso.progresso = valor_atual
            progresso.save(update_fields=['progresso'])

        if valor_atual >= conquista.meta and not progresso.completada:
            progresso.completada = True
            progresso.completada_em = timezone.now()
            progresso.save(update_fields=['completada', 'completada_em'])

            usuario.xp += conquista.recompensa_xp
            usuario.moedas += conquista.recompensa_moedas
            usuario.save(update_fields=['xp', 'moedas'])