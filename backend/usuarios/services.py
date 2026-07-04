# usuarios/services.py
import datetime
from django.utils import timezone

XP_POR_ACERTO = 10
MOEDAS_POR_ACERTO = 2


def creditar_resultado_partida(usuario, acertos, erros):
    """
    Aplica XP, moedas e streak no usuário a partir de contagens
    confiáveis (vindas do banco, nunca do app). A vida NÃO é mais
    descontada aqui — ela é paga integralmente na entrada da partida
    (ver IniciarPartidaView). Erros não afetam mais as vidas.
    """
    xp_ganho = acertos * XP_POR_ACERTO
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
        usuario.streak = 1

    usuario.data_ultima_partida = hoje
    usuario.save(update_fields=['xp', 'moedas', 'streak', 'data_ultima_partida'])

    return {
        'xp_ganho': xp_ganho,
        'moedas_ganhas': moedas_ganhas,
    }