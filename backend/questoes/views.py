# questoes/views.py
import random

from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from usuarios.views import checar_regeneracao_vidas
from usuarios.services import creditar_resultado_partida
from usuarios.serializers import UsuarioSerializer

from .models import Banca, Concurso, Materia, Questao, Partida
from .serializers import (
    BancaSerializer, MateriaSerializer, ConcursoSerializer,
    QuestaoPartidaSerializer,
)


# ─── Listas para popular o modal "Iniciar Partida" dinamicamente ──────────

class BancasDisponiveisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bancas = Banca.objects.filter(
            concursos__questoes__status=Questao.Status.APROVADA
        ).distinct()
        return Response(BancaSerializer(bancas, many=True).data)


class MateriasDisponiveisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        materias = Materia.objects.filter(
            questoes__status=Questao.Status.APROVADA
        ).distinct()
        return Response(MateriaSerializer(materias, many=True).data)


class ConcursosDisponiveisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        concursos = Concurso.objects.filter(
            questoes__status=Questao.Status.APROVADA
        ).distinct().select_related('banca')
        return Response(ConcursoSerializer(concursos, many=True).data)


# ─── Inicia a partida: sorteia questões E cria o registro no banco ────────

class IniciarPartidaView(APIView):
    """
    GET /api/questoes/iniciar-partida/
    GET /api/questoes/iniciar-partida/?tipo=banca&id=3
    GET /api/questoes/iniciar-partida/?tipo=materia&id=7
    GET /api/questoes/iniciar-partida/?tipo=concurso&id=12&com_tempo=1

    Sorteia até 10 questões aprovadas e cria uma Partida no banco,
    guardando exatamente quais questões foram sorteadas. Retorna as
    questões (sem gabarito) + o partida_id, que o app precisa devolver
    em /corrigir/ e /finalizar-partida/.
    """
    permission_classes = [IsAuthenticated]
    QUANTIDADE = 10

    def get(self, request):
        checar_regeneracao_vidas(request.user)
        tipo = request.query_params.get('tipo')
        filtro_id = request.query_params.get('id')
        com_tempo = request.query_params.get('com_tempo') == '1'

        questoes = Questao.objects.filter(
            status=Questao.Status.APROVADA,
            tem_imagem=False,
        ).exclude(
            tipo=Questao.Tipo.DISCURSIVA
        ).select_related(
            'concurso', 'concurso__banca', 'materia'
        ).prefetch_related('alternativas')

        if com_tempo:
            questoes = questoes.exclude(contexto__gt='')

        if tipo and filtro_id:
            if tipo == 'banca':
                questoes = questoes.filter(concurso__banca_id=filtro_id)
            elif tipo == 'materia':
                questoes = questoes.filter(materia_id=filtro_id)
            elif tipo == 'concurso':
                questoes = questoes.filter(concurso_id=filtro_id)
            else:
                return Response(
                    {'detail': 'Tipo de filtro inválido. Use banca, materia ou concurso.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        total_disponivel = questoes.count()
        if total_disponivel == 0:
            return Response(
                {'detail': 'Nenhuma questão disponível para este filtro.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        ids = list(questoes.values_list('id', flat=True))
        random.shuffle(ids)
        ids_selecionados = ids[:self.QUANTIDADE]

        questoes_selecionadas = Questao.objects.filter(
            id__in=ids_selecionados
        ).select_related(
            'concurso', 'concurso__banca', 'materia'
        ).prefetch_related('alternativas')

        mapa = {q.id: q for q in questoes_selecionadas}
        questoes_ordenadas = [mapa[i] for i in ids_selecionados if i in mapa]

        partida = Partida.objects.create(
            usuario=request.user,
            questoes_ids=[q.id for q in questoes_ordenadas],
            com_tempo=com_tempo,
        )

        serializer = QuestaoPartidaSerializer(questoes_ordenadas, many=True)
        return Response({
            'partida_id': partida.id,
            'total': len(questoes_ordenadas),
            'questoes': serializer.data,
        })


# ─── Corrige uma resposta e acumula o resultado na Partida ────────────────

class CorrigirRespostaView(APIView):
    """
    POST /api/questoes/corrigir/
    Body: { "partida_id": 17, "questao_id": 42, "letra": "A" }

    Valida que a questão pertence à partida e ainda não foi respondida
    nela, acumula acerto/erro NO BANCO, e só então informa se a resposta
    está correta + o gabarito.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        partida_id = request.data.get('partida_id')
        questao_id = request.data.get('questao_id')
        letra = (request.data.get('letra') or '').strip().upper()

        if not partida_id or not questao_id or not letra:
            return Response(
                {'detail': 'Informe partida_id, questao_id e letra.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            partida = Partida.objects.get(id=partida_id, usuario=request.user, finalizada=False)
        except Partida.DoesNotExist:
            return Response(
                {'detail': 'Partida não encontrada ou já finalizada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            questao_id = int(questao_id)
        except (TypeError, ValueError):
            return Response({'detail': 'questao_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if questao_id not in partida.questoes_ids:
            return Response(
                {'detail': 'Essa questão não pertence a esta partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if questao_id in partida.respondidas_ids:
            return Response(
                {'detail': 'Essa questão já foi respondida nesta partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            questao = Questao.objects.get(id=questao_id, status=Questao.Status.APROVADA)
        except Questao.DoesNotExist:
            return Response(
                {'detail': 'Questão não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        correta = letra == questao.gabarito.strip().upper()

        partida.respondidas_ids.append(questao_id)
        if correta:
            partida.acertos += 1
        else:
            partida.erros += 1
        partida.save(update_fields=['respondidas_ids', 'acertos', 'erros'])

        return Response({
            'correta': correta,
            'gabarito': questao.gabarito,
        })


# ─── Finaliza a partida: credita XP/moedas a partir do que está no banco ──

class FinalizarPartidaView(APIView):
    """
    POST /api/questoes/finalizar-partida/<partida_id>/
    Body: { "abandonada": false }   (opcional, default false)

    Calcula XP/moedas/vidas a partir de partida.acertos/partida.erros
    (nunca de valores enviados pelo app) e credita no usuário.
    Idempotente: se chamada de novo pra mesma partida, retorna o
    resultado já salvo em vez de creditar duas vezes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, partida_id):
        try:
            partida = Partida.objects.get(id=partida_id, usuario=request.user)
        except Partida.DoesNotExist:
            return Response(
                {'detail': 'Partida não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if partida.finalizada:
            return Response({
                'xp_ganho': partida.xp_ganho,
                'moedas_ganhas': partida.moedas_ganhas,
                'vidas_perdidas': partida.vidas_perdidas,
                'usuario': UsuarioSerializer(request.user, context={'request': request}).data,
            })

        abandonada = bool(request.data.get('abandonada', False))

        resultado = creditar_resultado_partida(
            usuario=request.user,
            acertos=partida.acertos,
            erros=partida.erros,
        )

        partida.finalizada = True
        partida.abandonada = abandonada
        partida.xp_ganho = resultado['xp_ganho']
        partida.moedas_ganhas = resultado['moedas_ganhas']
        partida.vidas_perdidas = resultado['vidas_perdidas']
        partida.finalizada_em = timezone.now()
        partida.save(update_fields=[
            'finalizada', 'abandonada', 'xp_ganho', 'moedas_ganhas',
            'vidas_perdidas', 'finalizada_em',
        ])

        return Response({
            'xp_ganho': resultado['xp_ganho'],
            'moedas_ganhas': resultado['moedas_ganhas'],
            'vidas_perdidas': resultado['vidas_perdidas'],
            'usuario': UsuarioSerializer(request.user, context={'request': request}).data,
        })