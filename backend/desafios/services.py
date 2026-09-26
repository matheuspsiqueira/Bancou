# desafios/services.py
import random

from django.db.models import Sum
from django.utils import timezone


QUANTIDADE_DESAFIOS_POR_DIA = 3


def _inicio_do_dia():
    """Meia-noite de HOJE no fuso de Brasília (settings.TIME_ZONE)."""
    return timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)


def _hoje():
    return timezone.localtime().date()


# ---------------------------------------------------------------------------
# Catálogo de tipos de condição — mesmo princípio de conquistas/services.py,
# mas todo tipo aqui conta só o que aconteceu HOJE (sem baseline: o dia
# novo já nasce zerado por natureza, filtrando por data). Cada função
# recebe (usuario, desafio) e devolve o valor atual do usuário HOJE pra
# aquela métrica. Pra adicionar um tipo novo: escreve a função, registra
# em CATALOGO_CONDICOES e, se precisar de campo extra além da meta,
# registra em CAMPOS_EXTRAS_POR_TIPO (e espelha em
# desafios/static/desafios/js/admin_desafio.js).
# ---------------------------------------------------------------------------

def _eval_partidas_jogadas_hoje(usuario, desafio):
    from questoes.models import Partida
    return Partida.objects.filter(
        usuario=usuario, finalizada=True, finalizada_em__gte=_inicio_do_dia()
    ).count()


def _eval_total_acertos_hoje(usuario, desafio):
    from questoes.models import Partida
    total = Partida.objects.filter(
        usuario=usuario, finalizada=True, finalizada_em__gte=_inicio_do_dia()
    ).aggregate(soma=Sum('acertos'))['soma']
    return total or 0


def _eval_total_erros_hoje(usuario, desafio):
    from questoes.models import Partida
    total = Partida.objects.filter(
        usuario=usuario, finalizada=True, finalizada_em__gte=_inicio_do_dia()
    ).aggregate(soma=Sum('erros'))['soma']
    return total or 0


def _eval_acertos_por_banca_hoje(usuario, desafio):
    from questoes.models import RespostaUsuario
    if not desafio.banca_id:
        return 0
    return RespostaUsuario.objects.filter(
        usuario=usuario, correta=True,
        questao__concurso__banca_id=desafio.banca_id,
        partida__finalizada_em__gte=_inicio_do_dia(),
    ).count()


def _eval_acertos_por_materia_hoje(usuario, desafio):
    from questoes.models import RespostaUsuario
    if not desafio.materia_id:
        return 0
    return RespostaUsuario.objects.filter(
        usuario=usuario, correta=True,
        questao__materia_id=desafio.materia_id,
        partida__finalizada_em__gte=_inicio_do_dia(),
    ).count()


def _eval_usar_item_hoje(usuario, desafio):
    from loja.models import UsoItemPartida
    if not desafio.item_id:
        return 0
    return UsoItemPartida.objects.filter(
        usuario=usuario, item_id=desafio.item_id, usado_em__gte=_inicio_do_dia()
    ).count()


def _eval_comprar_item_hoje(usuario, desafio):
    from loja.models import HistoricoCompraItem
    qs = HistoricoCompraItem.objects.filter(usuario=usuario, criado_em__gte=_inicio_do_dia())
    if desafio.item_id:
        qs = qs.filter(item_id=desafio.item_id)
    return qs.count()


def _eval_partida_em_horario_hoje(usuario, desafio):
    from questoes.models import Partida
    if not desafio.horario_inicio or not desafio.horario_fim:
        return 0
    partidas_hoje = Partida.objects.filter(
        usuario=usuario, finalizada=True, finalizada_em__gte=_inicio_do_dia()
    )
    contagem = 0
    for partida in partidas_hoje:
        hora_local = timezone.localtime(partida.finalizada_em).time()
        if desafio.horario_inicio <= hora_local <= desafio.horario_fim:
            contagem += 1
    return contagem


CATALOGO_CONDICOES = {
    'partidas_jogadas_hoje': _eval_partidas_jogadas_hoje,
    'total_acertos_hoje': _eval_total_acertos_hoje,
    'total_erros_hoje': _eval_total_erros_hoje,
    'acertos_por_banca_hoje': _eval_acertos_por_banca_hoje,
    'acertos_por_materia_hoje': _eval_acertos_por_materia_hoje,
    'usar_item_hoje': _eval_usar_item_hoje,
    'comprar_item_hoje': _eval_comprar_item_hoje,
    'partida_em_horario_hoje': _eval_partida_em_horario_hoje,
}

# Tipos que exigem campo(s) extra(s) além de "meta" — usado na validação
# de Desafio.clean() e espelhado em admin_desafio.js pra mostrar só os
# campos certos no admin. 'comprar_item_hoje' fica de fora de propósito:
# item é opcional pra ele (vazio = qualquer item).
CAMPOS_EXTRAS_POR_TIPO = {
    'acertos_por_banca_hoje': ['banca'],
    'acertos_por_materia_hoje': ['materia'],
    'usar_item_hoje': ['item'],
    'partida_em_horario_hoje': ['horario_inicio', 'horario_fim'],
}


def sortear_desafios_do_dia(usuario):
    """
    Lazy check, mesmo padrão de checar_regeneracao_vidas/
    checar_decaimento_streak (usuarios/services.py) — sem cron/Celery.
    Se o usuário já tem desafios pra hoje, não faz nada. Senão, sorteia
    QUANTIDADE_DESAFIOS_POR_DIA entre os Desafios ativos e cria as linhas
    do dia. Chamado em toda entrada que pode ser a primeira do dia
    (IniciarPartidaView e a view que lista os desafios do usuário).
    """
    from .models import Desafio, DesafioUsuario

    hoje = _hoje()
    if DesafioUsuario.objects.filter(usuario=usuario, data=hoje).exists():
        return

    candidatos = list(Desafio.objects.filter(ativo=True))
    if not candidatos:
        return

    quantidade = min(QUANTIDADE_DESAFIOS_POR_DIA, len(candidatos))
    sorteados = random.sample(candidatos, quantidade)

    DesafioUsuario.objects.bulk_create(
        [DesafioUsuario(usuario=usuario, desafio=desafio, data=hoje) for desafio in sorteados],
        ignore_conflicts=True,
    )


def avaliar_desafios(usuario):
    """
    Listener central, mesmo espírito de conquistas.services.avaliar_conquistas.
    Roda só os desafios de HOJE ainda não completados, atualiza progresso
    e credita XP/moedas na hora em que a meta é batida. Chamado em
    FinalizarPartidaView, logo depois de avaliar_conquistas — ponto onde
    acertos/erros/RespostaUsuario/UsoItemPartida da partida já estão
    fechados no banco.

    Retorna a lista de Desafio completados NESSA chamada (pode ser vazia).
    Diferente de Conquistas, hoje não há celebração dedicada pra desafios
    (listagem simples no InicioScreen) — mas a lista já vem pronta caso
    queira adicionar um toast/som no futuro sem mexer aqui.
    """
    from .models import DesafioUsuario

    hoje = _hoje()
    desafios_do_dia = DesafioUsuario.objects.filter(
        usuario=usuario, data=hoje, completado=False
    ).select_related('desafio')

    completados_agora = []

    for du in desafios_do_dia:
        avaliador = CATALOGO_CONDICOES.get(du.desafio.tipo_condicao)
        if avaliador is None:
            continue  # tipo desconhecido/renomeado — não derruba o fim de partida

        valor_atual = avaliador(usuario, du.desafio)

        if du.progresso != valor_atual:
            du.progresso = valor_atual
            du.save(update_fields=['progresso'])

        if valor_atual >= du.desafio.meta and not du.completado:
            du.completado = True
            du.completado_em = timezone.now()
            du.save(update_fields=['completado', 'completado_em'])

            usuario.xp += du.desafio.recompensa_xp
            usuario.moedas += du.desafio.recompensa_moedas
            usuario.save(update_fields=['xp', 'moedas'])

            completados_agora.append(du.desafio)

    return completados_agora