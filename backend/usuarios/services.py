# usuarios/services.py
import datetime
from django.utils import timezone

XP_POR_ACERTO = 10
MOEDAS_POR_ACERTO = 2


def creditar_resultado_partida(usuario, acertos, erros):
    """
    Aplica XP, moedas, vidas e streak no usuário a partir de contagens
    confiáveis (vindas do banco, nunca do app). Mesma lógica de
    RegistrarResultadoSerializer.save() — extraída pra ser reaproveitada
    pelo fluxo de partida validada no servidor (Partida model).
    """
    xp_ganho = acertos * XP_POR_ACERTO
    moedas_ganhas = acertos * MOEDAS_POR_ACERTO
    vidas_perdidas = min(erros, usuario.vidas)

    usuario.xp += xp_ganho
    usuario.moedas += moedas_ganhas
    usuario.vidas = max(0, usuario.vidas - vidas_perdidas)

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
    usuario.save(update_fields=['xp', 'moedas', 'vidas', 'streak', 'data_ultima_partida'])

    return {
        'xp_ganho': xp_ganho,
        'moedas_ganhas': moedas_ganhas,
        'vidas_perdidas': vidas_perdidas,
    }