# questoes/historico.py
"""
Histórico de questões respondidas (30/10/2026).

Endpoints (todos só do próprio usuário logado):

  GET /api/questoes/historico/
      Resumo dos dias da janela: [{data, acertos, erros, total}], do mais
      antigo ao de hoje. Dias sem resposta vêm com zeros.

  GET /api/questoes/historico/?data=2026-10-30
      Lista leve das respostas daquele dia (sem enunciado), em ordem
      cronológica.

  GET /api/questoes/historico/<resposta_id>/
      A questão completa (com gabarito) + o que o usuário marcou.

JANELA: os dados NÃO são apagados — só os últimos HISTORICO_DIAS_GRATIS dias
(contando hoje, fuso de Brasília) são exibidos. O limite é aplicado aqui, nos
três endpoints, nunca no app. Quando existir a assinatura premium, basta
trocar `inicio_da_janela()` para não limitar quem for assinante.

Os dias viram à 00h de Brasília, como o resto do app (vidas, streak, desafios).
"""
from datetime import date, datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import RespostaUsuario
from .serializers import QuestaoHistoricoSerializer

FUSO = ZoneInfo('America/Sao_Paulo')
HISTORICO_DIAS_GRATIS = 7


def _hoje():
    return timezone.now().astimezone(FUSO).date()


def _inicio_do_dia(dia):
    return datetime.combine(dia, time.min, tzinfo=FUSO)


def inicio_da_janela(usuario=None):
    """Primeiro instante visível no histórico (00h de Brasília do dia mais antigo)."""
    return _inicio_do_dia(_hoje() - timedelta(days=HISTORICO_DIAS_GRATIS - 1))


class HistoricoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        inicio = inicio_da_janela(request.user)
        base = RespostaUsuario.objects.filter(usuario=request.user, respondida_em__gte=inicio)

        data_param = request.query_params.get('data')
        if data_param:
            return self._respostas_do_dia(base, data_param, inicio)
        return self._resumo_dos_dias(base)

    def _resumo_dos_dias(self, base):
        hoje = _hoje()
        dias = {
            hoje - timedelta(days=i): {'acertos': 0, 'erros': 0}
            for i in range(HISTORICO_DIAS_GRATIS)
        }
        for quando, correta in base.values_list('respondida_em', 'correta'):
            dia = quando.astimezone(FUSO).date()
            if dia in dias:
                dias[dia]['acertos' if correta else 'erros'] += 1

        return Response({
            'janela_dias': HISTORICO_DIAS_GRATIS,
            'dias': [
                {
                    'data': dia.isoformat(),
                    'acertos': dias[dia]['acertos'],
                    'erros': dias[dia]['erros'],
                    'total': dias[dia]['acertos'] + dias[dia]['erros'],
                }
                for dia in sorted(dias)
            ],
        })

    def _respostas_do_dia(self, base, data_param, inicio):
        try:
            dia = date.fromisoformat(data_param)
        except ValueError:
            return Response({'detail': 'Data inválida. Use AAAA-MM-DD.'}, status=status.HTTP_400_BAD_REQUEST)

        inicio_dia = _inicio_do_dia(dia)
        if inicio_dia < inicio:
            return Response(
                {'detail': f'O histórico mostra apenas os últimos {HISTORICO_DIAS_GRATIS} dias.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        fim_dia = _inicio_do_dia(dia + timedelta(days=1))

        respostas = (
            base.filter(respondida_em__gte=inicio_dia, respondida_em__lt=fim_dia)
            .select_related('questao__materia', 'questao__concurso__banca')
            .order_by('respondida_em')
        )

        return Response({
            'data': dia.isoformat(),
            'respostas': [
                {
                    'id': r.id,
                    'questao_id': r.questao_id,
                    'correta': r.correta,
                    'alternativa_escolhida': r.alternativa_escolhida,
                    'pulada': r.pulada,
                    'hora': r.respondida_em.astimezone(FUSO).strftime('%H:%M'),
                    'materia_nome': r.questao.materia.nome if r.questao.materia else None,
                    'banca_nome': r.questao.concurso.banca.nome,
                }
                for r in respostas
            ],
        })


class HistoricoQuestaoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, resposta_id):
        try:
            resposta = (
                RespostaUsuario.objects
                .select_related('questao__materia', 'questao__concurso__banca')
                .prefetch_related('questao__alternativas')
                .get(
                    id=resposta_id,
                    usuario=request.user,
                    respondida_em__gte=inicio_da_janela(request.user),
                )
            )
        except RespostaUsuario.DoesNotExist:
            return Response(
                {'detail': 'Resposta não encontrada ou fora da janela do histórico.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({
            'resposta_id': resposta.id,
            'correta': resposta.correta,
            'alternativa_escolhida': resposta.alternativa_escolhida,
            'pulada': resposta.pulada,
            'hora': resposta.respondida_em.astimezone(FUSO).strftime('%H:%M'),
            'questao': QuestaoHistoricoSerializer(
                resposta.questao, context={'request': request}
            ).data,
        })