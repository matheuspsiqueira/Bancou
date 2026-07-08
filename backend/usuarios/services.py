# usuarios/services.py
import datetime
from django.utils import timezone

from loja.services import tem_xp_dobro_ativo, consumir_protecao_streak

XP_POR_ACERTO = 10
MOEDAS_POR_ACERTO = 2


def creditar_resultado_partida(usuario, acertos, erros):
    """
    Aplica XP, moedas e streak no usuário a partir de contagens
    confiáveis (vindas do banco, nunca do app). A vida NÃO é mais
    descontada aqui — ela é paga integralmente na entrada da partida
    (ver IniciarPartidaView). Erros não afetam mais as vidas.

    NOVO: se o usuário tiver o buff xp_dobro ativo, o XP ganho é
    dobrado. Se o streak for resetar por ter pulado um dia, tenta
    consumir 1 unidade de congela_streak antes de resetar de fato.
    """
    xp_ganho = acertos * XP_POR_ACERTO
    if tem_xp_dobro_ativo(usuario):
        xp_ganho *= 2

    moedas_ganhas = acertos * MOEDAS_POR_ACERTO

    usuario.xp += xp_ganho
    usuario.moedas += moedas_ganhas

    hoje = timezone.localdate()
    ultima = usuario.data_ultima_partida

    if ultima is None:
        usuario.streak = 1
    elif ultima == hoje:
        pass
    elif ultima == hoje - datetime.timedelta(days=1):
        usuario.streak += 1
    else:
        # Pulou pelo menos 1 dia — tenta consumir um congelamento de streak
        # antes de resetar. Simplificação atual: 1 unidade de congela_streak
        # sempre "perdoa" o intervalo inteiro, não importa quantos dias
        # foram pulados. Se quiser cobrir só 1 dia por unidade, dá pra
        # refinar depois comparando (hoje - ultima).days.
        if consumir_protecao_streak(usuario):
            usuario.streak += 1
        else:
            usuario.streak = 1

    usuario.data_ultima_partida = hoje
    usuario.save(update_fields=['xp', 'moedas', 'streak', 'data_ultima_partida'])

    return {
        'xp_ganho': xp_ganho,
        'moedas_ganhas': moedas_ganhas,
    }
