# usuarios/services.py
import datetime
from django.utils import timezone

from loja.services import tem_xp_dobro_ativo, consumir_protecao_streak

XP_POR_ACERTO = 10
MOEDAS_POR_ACERTO = 2


def checar_decaimento_streak(usuario):
    """
    Lazy check de streak — mesmo padrão do checar_regeneracao_vidas.
    Deve ser chamado sempre que o perfil é carregado (PerfilView.get()
    e IniciarPartidaView.get()), ANTES de qualquer partida ser jogada.

    Se o usuário pulou pelo menos 1 dia sem jogar, o streak zera (vira 0),
    a menos que ele tenha uma proteção de streak ativa pra consumir.
    Não mexe em nada se ele já jogou hoje ou nunca jogou.
    """
    hoje = timezone.localdate()
    ultima = usuario.data_ultima_partida

    if ultima is None or ultima == hoje:
        return  # nunca jogou, ou já jogou hoje — nada a fazer

    if ultima < hoje - datetime.timedelta(days=1):
        # pulou pelo menos 1 dia sem jogar — tenta proteção antes de zerar
        if consumir_protecao_streak(usuario):
            return
        usuario.streak = 0
        usuario.save(update_fields=['streak'])


def creditar_resultado_partida(usuario, acertos, erros, contar_streak=True):
    """
    Aplica XP, moedas e streak no usuário a partir de contagens
    confiáveis (vindas do banco, nunca do app). A vida NÃO é mais
    descontada aqui — ela é paga integralmente na entrada da partida
    (ver IniciarPartidaView). Erros não afetam mais as vidas.

    NOVO: se o usuário tiver o buff xp_dobro ativo, o XP ganho é
    dobrado. Se o streak for resetar por ter pulado um dia, tenta
    consumir 1 unidade de congela_streak antes de resetar de fato.

    contar_streak=False (partida abandonada/incompleta): XP e moedas
    continuam sendo creditados normalmente, mas o streak e a
    data_ultima_partida NÃO são tocados — o dia só conta como "jogado"
    quando o usuário termina uma partida de verdade.
    """
    xp_ganho = acertos * XP_POR_ACERTO
    if tem_xp_dobro_ativo(usuario):
        xp_ganho *= 2

    moedas_ganhas = acertos * MOEDAS_POR_ACERTO

    usuario.xp += xp_ganho
    usuario.moedas += moedas_ganhas

    if not contar_streak:
        usuario.save(update_fields=['xp', 'moedas'])
        return {
            'xp_ganho': xp_ganho,
            'moedas_ganhas': moedas_ganhas,
        }

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