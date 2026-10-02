"""
Lógica de negócio das notificações push agendadas (Expo Push Notifications).

Chamada tanto pelo management command (`enviar_notificacoes_agendadas`, uso
manual/local) quanto pela view de cron (`DispararNotificacoesAgendadasView`,
batida por um agendador externo a cada poucos minutos) — as duas só existem
pra disparar `processar_notificacoes_agendadas()`; a lógica mora aqui uma
vez só.

Regras (hierarquia de 26/09/2026; janelas estreitas + cron preciso em 02/10/2026).

O cron externo (cron-job.org, fuso America/Sao_Paulo) bate de 15 em 15 min
SÓ nas horas 7, 9, 12, 15, 19, 20 e 21 (28 chamadas/dia). Cada janela abaixo
cobre a hora cheia do cron (4 chamadas) — se uma falhar, a seguinte ainda
pega, e NotificacaoEnviada impede duplicata.

  Convite do dia (Tipo 3 / Tipo 4) — SEM requisito: vale pra quem jogou
  hoje e pra quem não jogou (Grupo A: 0-2 dias de inatividade, ou nunca
  jogou). Alterna pela contagem corrida de dias (date.toordinal, fuso do
  Django):
    dia PAR   -> só Tipo 3 (convite casual), 12h00-12h59
    dia ÍMPAR -> só Tipo 4 (desafio de 60 segundos), 15h00-15h59

  Demais notificações do Grupo A (só pra quem NÃO jogou hoje):
    7h00-7h59   -> Tipo 1 (vidas restauradas), só se estava com vidas zeradas
    20h30-21h59 -> Tipo 2 (streak em risco), só se streak > 0

  Grupo B (3+ dias sem jogar) — fora do fluxo acima. Cadência própria nos
  dias 3/7/14/30 de inatividade, às 9h (id par) ou às 19h (id ímpar).
  Não recebe os convites do dia.

Idempotência: NotificacaoEnviada (unique por usuário+tipo+dia) garante que o
mesmo tipo nunca sai duas vezes no mesmo dia, mesmo com o cron batendo várias
vezes dentro da mesma faixa. Só é registrada como enviada a mensagem cujo
ticket a Expo devolveu como "ok" — se der erro, o próximo ciclo tenta de novo.

Import de `checar_regeneracao_vidas` é feito DENTRO da função, não no topo
do arquivo — de propósito: views.py importa deste módulo, e este módulo
precisa de uma função de views.py, então importar em cima criaria um
import circular.
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


def _tipo_convite_do_dia(hoje):
    """Dia par -> convite das 12h (Tipo 3); dia ímpar -> desafio das 15h (Tipo 4)."""
    if hoje.toordinal() % 2 == 0:
        return NotificacaoEnviada.TIPO_CONVITE_CASUAL
    return NotificacaoEnviada.TIPO_DESAFIO_60S


def _na_faixa_do_convite(tipo, hora, minuto):
    if tipo == NotificacaoEnviada.TIPO_CONVITE_CASUAL:
        return hora == 12  # 12h00-12h59
    return hora == 15  # Tipo 4: 15h00-15h59


def _enviar_lote_expo(mensagens):
    """
    mensagens: lista de dicts no formato da Expo Push API. Envia em lotes
    de 100 e devolve uma lista de resultados, um por mensagem, na mesma
    ordem: {'ok': bool, 'erro': str | None}.

    Lê o ticket de cada mensagem: a Expo responde HTTP 200 mesmo quando o
    envio de uma mensagem falha (credencial FCM ausente/inválida, token de
    aparelho que não existe mais etc.) — o erro vem dentro do ticket e agora
    é logado (aparece no log do Render como "Expo push: ticket com erro").
    Isso ainda NÃO confirma entrega no aparelho (isso é o "receipt", checado
    depois); mas já pega os erros de credencial e de token.
    """
    resultados = []
    for inicio in range(0, len(mensagens), 100):
        lote = mensagens[inicio:inicio + 100]
        try:
            resp = requests.post(EXPO_PUSH_URL, json=lote, timeout=10)
        except requests.RequestException as exc:
            logger.warning('Expo push: falha de rede no lote — %s', exc)
            resultados.extend({'ok': False, 'erro': 'rede'} for _ in lote)
            continue

        if not resp.ok:
            logger.warning('Expo push: lote rejeitado (%s) — %s', resp.status_code, resp.text[:300])
            resultados.extend({'ok': False, 'erro': f'http_{resp.status_code}'} for _ in lote)
            continue

        try:
            tickets = resp.json().get('data', [])
        except ValueError:
            logger.warning('Expo push: resposta não é JSON — %s', resp.text[:300])
            tickets = []

        for i in range(len(lote)):
            ticket = tickets[i] if i < len(tickets) else {}
            if ticket.get('status') == 'ok':
                resultados.append({'ok': True, 'erro': None})
            else:
                erro = (ticket.get('details') or {}).get('error') or 'ticket_invalido'
                logger.warning(
                    'Expo push: ticket com erro (%s) — %s', erro, (ticket.get('message') or '')[:300],
                )
                resultados.append({'ok': False, 'erro': erro})
    return resultados


def _ja_enviado_hoje(usuario, tipo, hoje):
    return NotificacaoEnviada.objects.filter(usuario=usuario, tipo=tipo, data=hoje).exists()


def processar_notificacoes_agendadas():
    """
    Roda a checagem completa pra todos os usuários elegíveis, monta as
    mensagens e dispara. Idempotente (ver docstring do módulo).

    Retorna um dict {tipo: quantidade} das notificações aceitas pela Expo
    nesta chamada, pra log/debug.
    """
    from .views import checar_regeneracao_vidas  # import tardio — ver docstring do módulo

    agora = timezone.localtime()
    hoje = agora.date()
    hora, minuto = agora.hour, agora.minute

    tipo_convite_hoje = _tipo_convite_do_dia(hoje)
    convite_na_faixa = _na_faixa_do_convite(tipo_convite_hoje, hora, minuto)

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

        # ── Grupo B: 3+ dias sem jogar ────────────────────────────────
        if dias_inatividade is not None and dias_inatividade >= 3:
            if dias_inatividade not in DIAS_REENGAJAMENTO:
                continue
            usa_faixa_manha = usuario.id % 2 == 0
            dentro_da_faixa = (hora == 9) if usa_faixa_manha else (hora == 19)
            if not dentro_da_faixa:
                continue
            if _ja_enviado_hoje(usuario, NotificacaoEnviada.TIPO_REENGAJAMENTO, hoje):
                continue
            corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_REENGAJAMENTO, dias=dias_inatividade)
            mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_REENGAJAMENTO, corpo))
            continue

        # ── Grupo A (0-2 dias, ou nunca jogou) ────────────────────────
        # Convite do dia (12h OU 15h, alternado): sem requisito, vale
        # inclusive pra quem já jogou hoje.
        if convite_na_faixa:
            if not _ja_enviado_hoje(usuario, tipo_convite_hoje, hoje):
                corpo = _escolher_mensagem(tipo_convite_hoje)
                mensagens_para_enviar.append((usuario, tipo_convite_hoje, corpo))
            continue

        if jogou_hoje:
            continue  # o resto (vidas, streak) só faz sentido pra quem ainda não jogou hoje

        # Tipo 2 — streak em risco, 20h30-21h59
        if ((hora == 20 and minuto >= 30) or hora == 21) and usuario.streak > 0:
            if not _ja_enviado_hoje(usuario, NotificacaoEnviada.TIPO_STREAK_EM_RISCO, hoje):
                corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_STREAK_EM_RISCO, streak=usuario.streak)
                mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_STREAK_EM_RISCO, corpo))
            continue

        # Tipo 1 — 7h00-7h59, só se estava com vidas zeradas (reaproveita a
        # mesma lógica de reset diário usada no PerfilView).
        if hora == 7:
            if _ja_enviado_hoje(usuario, NotificacaoEnviada.TIPO_VIDAS_RESTAURADAS, hoje):
                continue
            vidas_antes = usuario.vidas
            checar_regeneracao_vidas(usuario)
            if vidas_antes == 0 and usuario.vidas > vidas_antes:
                corpo = _escolher_mensagem(NotificacaoEnviada.TIPO_VIDAS_RESTAURADAS)
                mensagens_para_enviar.append((usuario, NotificacaoEnviada.TIPO_VIDAS_RESTAURADAS, corpo))
            continue

    if not mensagens_para_enviar:
        return {}

    payload = [
        {'to': usuario.expo_push_token, 'title': TITULO_PADRAO, 'body': corpo, 'sound': 'default'}
        for usuario, _tipo, corpo in mensagens_para_enviar
    ]
    resultados = _enviar_lote_expo(payload)

    # Registra como enviada só o que a Expo aceitou (ticket "ok"). O que
    # falhou fica sem registro e é tentado de novo no próximo ciclo do cron.
    contagem = {}
    for (usuario, tipo, _corpo), resultado in zip(mensagens_para_enviar, resultados):
        if not resultado['ok']:
            continue
        NotificacaoEnviada.objects.get_or_create(usuario=usuario, tipo=tipo, data=hoje)
        contagem[tipo] = contagem.get(tipo, 0) + 1

    return contagem