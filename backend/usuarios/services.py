# usuarios/services.py
import datetime
from django.utils import timezone

from loja.services import tem_xp_dobro_ativo, consumir_protecao_streak

XP_POR_ACERTO = 10
MOEDAS_POR_ACERTO = 2


def checar_decaimento_streak(usuario):
    """
    Lazy check de streak — mesmo padrão do checar_regeneracao_vidas.
    Chamado sempre que o perfil é carregado (PerfilView.get()) e ao iniciar
    uma partida (IniciarPartidaView.get()), ANTES de qualquer partida ser jogada.

    "Dia" = dia de Brasília (TIME_ZONE = America/Sao_Paulo), virando à 00h.

    Regra: o streak sobrevive se o usuário jogou hoje ou ontem. Se o último
    dia jogado foi anteontem ou antes (ou seja, ontem inteiro passou em
    branco), o streak zera — a menos que ele tenha um congela_streak, que é
    consumido (1 unidade perdoa o intervalo inteiro, simplificação atual).
    Quando o congelamento é usado, data_ultima_partida passa a ser ONTEM:
    sem isso, a próxima chamada veria o mesmo intervalo de novo e gastaria
    outro congelamento (ou zeraria o streak que acabou de ser salvo).
    Não mexe em nada se o streak já é 0 (nada a perder, nada a proteger).
    """
    hoje = timezone.localdate()
    ultima = usuario.data_ultima_partida
    ontem = hoje - datetime.timedelta(days=1)

    if ultima is None or ultima >= ontem:
        return  # nunca jogou, ou jogou hoje/ontem — streak segue vivo

    if usuario.streak == 0:
        return  # já zerado; não gasta congelamento à toa

    if consumir_protecao_streak(usuario):
        usuario.data_ultima_partida = ontem
        usuario.save(update_fields=['data_ultima_partida'])
        return

    usuario.streak = 0
    usuario.save(update_fields=['streak'])


def creditar_resultado_partida(usuario, acertos, erros, contar_streak=True):
    """
    Aplica XP, moedas e streak no usuário a partir de contagens
    confiáveis (vindas do banco, nunca do app). A vida NÃO é mais
    descontada aqui — ela é paga integralmente na entrada da partida
    (ver IniciarPartidaView). Erros não afetam mais as vidas.

    Se o usuário tiver o buff xp_dobro ativo, o XP ganho é dobrado. O
    congelamento de streak é tratado em checar_decaimento_streak (que roda
    antes de toda partida), não aqui.

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
        # Pulou pelo menos 1 dia e o streak já foi tratado em
        # checar_decaimento_streak (zerado, ou salvo por congelamento — nesse
        # caso data_ultima_partida já virou "ontem" e caiu no elif acima).
        # Aqui o usuário recomeça: hoje é o dia 1.
        usuario.streak = 1

    usuario.data_ultima_partida = hoje
    usuario.save(update_fields=['xp', 'moedas', 'streak', 'data_ultima_partida'])

    return {
        'xp_ganho': xp_ganho,
        'moedas_ganhas': moedas_ganhas,
    }