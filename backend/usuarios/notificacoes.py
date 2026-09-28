"""
Lógica de negócio das notificações push agendadas (Expo Push Notifications).

Chamada tanto pelo management command (`enviar_notificacoes_agendadas`, uso
manual/local) quanto pela view de cron (`DispararNotificacoesAgendadasView`,
batida pelo GitHub Actions a cada poucos minutos) — as duas só existem pra
disparar `processar_notificacoes_agendadas()`; a lógica mora aqui uma vez só.

Hierarquia decidida em 26/09/2026:

  Grupo A (usuário jogou nos últimos 0-2 dias) — no máximo 1 notificação
  por dia, por ordem de prioridade horária:
    7h   -> Tipo 1 (vidas restauradas), só se estava com vidas zeradas
    12h  -> Tipo 3 (convite casual)
    15h  -> Tipo 4 (desafio de 60 segundos)
    20h30-21h30 -> Tipo 2 (streak em risco) — ÚNICA exceção ao limite de
                   1/dia: dispara mesmo se já notificado hoje, porque
                   perder a streak é uma perda concreta (XP+moedas do
                   marco, e a sequência em si)
  Usuário que já jogou hoje não recebe nada do Grupo A.

  Grupo B (3+ dias sem jogar) — sai do fluxo acima. Cadência própria nos
  dias 3/7/14/30 de inatividade. Horário personalizado por uso costumeiro
  fica pra fase 2 — por enquanto, testa horário fixo 9h ou 19h, dividido
  por paridade do id do usuário (split simples de A/B).

Import de `checar_regeneracao_vidas` é feito DENTRO da função, não no topo
do arquivo — de propósito: views.py importa deste módulo, e este módulo
precisa de uma função de views.py, então importar em cima criaria um
import circular. Adiando pra dentro da função, os dois módulos já estão
totalmente carregados na hora em que o import realmente roda.
"""
import logging
import random

import requests
from django.utils import timezone

from .models import Usuario, NotificacaoEnviada

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
TITULO_PADRAO = 'Bancou'

MENSAGENS = {
    NotificacaoEnviada.TIPO_VIDAS_RESTAURADAS: [
        'Vem fazer uma lição! Suas vidas voltaram e estou morrendo de saudade 🥺',
        'Já são 3 vidas de novo! Bora gastar elas comigo? 🔥',
        'Recarreguei. E aí, vamos ou não?',
    ],
    NotificacaoEnviada.TIPO_STREAK_EM_RISCO: [
        'Sua ofensiva de {streak} dias tá pendurada por um fio. 🔥 Uma questão já resolve.',
        'Ei, não deixa hoje ser o dia que quebra tudo. 2 minutos e sua sequência continua viva.',
    ],
    NotificacaoEnviada.TIPO_CONVITE_CASUAL: [
        'Oi! Sou eu, o Kou. Que tal um intervalinho para fazer algumas questões?',
        'Pausa de 5 minutos pra estudar? Eu topo se você topar.',
        'E aí, hoje é dia de Bancou ou não?',
    ],
    NotificacaoEnviada.TIPO_DESAFIO_60S: [
        'Tem 1 minutinho para mim? Então bora lá fazer questões com tempo!',
        'Rapidinho: topa fazer um desafio de questões com tempo agora?',
    ],
    NotificacaoEnviada.TIPO_REENGAJAMENTO: [
        'Faz tempo que a gente não se vê por aqui. Bora recomeçar? Suas questões estão te esperando.',
        'Eu sei que a vida atropela às vezes. Mas seu futuro concurseiro continua aqui, quando quiser voltar.',
        '{dias} dias sem aparecer. Sem cobrança — só um lembrete de que eu ainda tô aqui. 💜',
    ],
}

DIAS_REENGAJAMENTO = (3, 7, 14, 30)


def _escolher_mensagem(tipo, **contexto):
    template = random.choice(MENSAGENS[tipo])
    return template.format(**contexto)


def _enviar_lote_expo(mensagens):
    """
    mensagens: lista de dicts no formato da Expo Push API. Envia em lotes
    de 100 (limite recomendado pela Expo). Retorna quantas mensagens
    tiveram o lote aceito na resposta HTTP — não confirma entrega
    individual por token (a Expo devolve um "ticket" por mensagem que
    permite checar isso depois; fica de fora da v1, mesmo princípio de
    "sem SSV" — só o anúncio rewarded tem verificação forte, aqui não é
    crédito de jogo, então o risco de over-engineering não compensa agora).
    """
    aceitas = 0
    for inicio in range(0, len(mensagens), 100):
        lote = mensagens[inicio:inicio + 100]
        try:
            resp = requests.post(EXPO_PUSH_URL, json=lote, timeout=10)
            if resp.ok:
                aceitas += len(lote)
            else:
                logger.warning('Expo push: lote rejeitado (%s) — %s', resp.status_code, resp.text[:300])
        except requests.RequestException as exc:
            logger.warning('Expo push: falha de rede no lote — %s', exc)
    return aceitas


def processar_notificacoes_agendadas():
    """
    Roda a checagem completa pra todos os usuários elegíveis, monta as
    mensagens e dispara. Idempotente: usa NotificacaoEnviada (unique por
    usuário+tipo+dia) pra nunca mandar a mesma notificação duas vezes no
    mesmo dia, mesmo chamada várias vezes seguidas pelo cron dentro da
    mesma janela de horário.

    Retorna um dict {tipo: quantidade} das notificações enviadas nesta
    chamada, pra log/debug (management command imprime isso).
    """
    from .views import checar_regeneracao_vidas  # import tardio — ver docstring do módulo

    agora = timezone.localtime()
    hoje = agora.date()
    hora, minuto = agora.hour, agora.minute

    mensagens_para_enviar = []  # [(usuario, tipo, corpo)]

    usuarios = Usuario.objects.filter(
        notificacoes_ativadas=True,
        expo_push_token__isnull=False,
    ).exclude(expo_push_token='')

    for usuario in usuarios:
        if usuario.data_ultima_partida is None:
            dias_inatividade = None
        else:
            dias_inatividade = (hoje - usuario.data_ultima_partida).days

        jogou_hoje = dias_inatividade == 0
        if jogou_hoje:
            continue  # já converteu hoje, Grupo A não se aplica

        # ── Grupo B: 3+ dias sem jogar ────────────────────────────────
        if dias_inatividade is not None and dias_inatividade >= 3:
            if dias_inatividade not in DIAS_REENGAJAMENTO:
                continue
            horario_teste = 9 if usuario.id % 2 == 0 else 19
            if hora != horario_teste:
                continue
            ja_enviado = NotificacaoEnviada.objects.filter(
                usuario=usuario, tipo=NotificacaoEnviada.TIPO_REENGAJAMENTO, data=hoje,
            ).exists()
            if ja_enviado:
                continue
            corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_REENGAJAMENTO, dias=dias_inatividade)
            mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_REENGAJAMENTO, corpo))
            continue

        # ── Grupo A: fluxo diário normal ──────────────────────────────
        # Tipo 2 (streak em risco) é checado primeiro e ignora o limite
        # de 1/dia de propósito — ver docstring do módulo.
        dentro_da_janela_streak = (hora == 20 and minuto >= 30) or (hora == 21 and minuto < 30)
        if dentro_da_janela_streak and usuario.streak > 0:
            ja_enviado_streak = NotificacaoEnviada.objects.filter(
                usuario=usuario, tipo=NotificacaoEnviada.TIPO_STREAK_EM_RISCO, data=hoje,
            ).exists()
            if not ja_enviado_streak:
                corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_STREAK_EM_RISCO, streak=usuario.streak)
                mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_STREAK_EM_RISCO, corpo))
            continue

        ja_notificado_grupo_a_hoje = NotificacaoEnviada.objects.filter(
            usuario=usuario,
            tipo__in=[
                NotificacaoEnviada.TIPO_VIDAS_RESTAURADAS,
                NotificacaoEnviada.TIPO_CONVITE_CASUAL,
                NotificacaoEnviada.TIPO_DESAFIO_60S,
            ],
            data=hoje,
        ).exists()
        if ja_notificado_grupo_a_hoje:
            continue

        # Tipo 1 — 7h, só se estava com vidas zeradas (reaproveita a mesma
        # lógica de reset diário usada no PerfilView).
        if hora == 7:
            vidas_antes = usuario.vidas
            checar_regeneracao_vidas(usuario)
            if vidas_antes == 0 and usuario.vidas > vidas_antes:
                corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_VIDAS_RESTAURADAS)
                mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_VIDAS_RESTAURADAS, corpo))
            continue

        # Tipo 3 — 12h
        if hora == 12:
            corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_CONVITE_CASUAL)
            mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_CONVITE_CASUAL, corpo))
            continue

        # Tipo 4 — 15h
        if hora == 15:
            corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_DESAFIO_60S, )
            mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_DESAFIO_60S, corpo))
            continue

    if not mensagens_para_enviar:
        return {}

    payload = [
        {'to': usuario.expo_push_token, 'title': TITULO_PADRAO, 'body': corpo, 'sound': 'default'}
        for usuario, _tipo, corpo in mensagens_para_enviar
    ]
    _enviar_lote_expo(payload)

    # Registra como enviada só depois do POST pra Expo — se a chamada
    # inteira falhar antes daqui (exceção não tratada), nada fica marcado
    # e o próximo ciclo do cron tenta de novo.
    contagem = {}
    for usuario, tipo, _corpo in mensagens_para_enviar:
        NotificacaoEnviada.objects.get_or_create(usuario=usuario, tipo=tipo, data=hoje)
        contagem[tipo] = contagem.get(tipo, 0) + 1

    return contagem