# questoes/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from usuarios.views import checar_regeneracao_vidas  # ← import no topo do arquivo


from .models import Banca, Concurso, Materia, Questao
from .serializers import (
    BancaSerializer, MateriaSerializer, ConcursoSerializer,
    QuestaoPartidaSerializer,
)


# ─── Listas para popular o modal "Iniciar Partida" dinamicamente ──────────

class BancasDisponiveisView(APIView):
    """Lista apenas bancas que possuem ao menos uma questão aprovada."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bancas = Banca.objects.filter(
            concursos__questoes__status=Questao.Status.APROVADA
        ).distinct()
        return Response(BancaSerializer(bancas, many=True).data)


class MateriasDisponiveisView(APIView):
    """Lista apenas matérias que possuem ao menos uma questão aprovada."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        materias = Materia.objects.filter(
            questoes__status=Questao.Status.APROVADA
        ).distinct()
        return Response(MateriaSerializer(materias, many=True).data)


class ConcursosDisponiveisView(APIView):
    """Lista apenas concursos que possuem ao menos uma questão aprovada."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        concursos = Concurso.objects.filter(
            questoes__status=Questao.Status.APROVADA
        ).distinct().select_related('banca')
        return Response(ConcursoSerializer(concursos, many=True).data)


# ─── Endpoint principal: monta uma partida de 10 questões ─────────────────

class PartidaQuestoesView(APIView):
    """
    GET /api/questoes/partida/
    GET /api/questoes/partida/?tipo=banca&id=3
    GET /api/questoes/partida/?tipo=materia&id=7
    GET /api/questoes/partida/?tipo=concurso&id=12

    Retorna até 10 questões aprovadas, aleatórias, sem o gabarito.
    Só inclui questões de múltipla escolha ou certo/errado (não discursivas)
    e exclui questões marcadas com tem_imagem=True (ainda sem suporte no app).
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

        # Modo com tempo: exclui questões com texto-base
        # (usuário não tem tempo de ler contexto longo em 60s)
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

        # Pega IDs aleatórios e busca os objetos (mais eficiente que order_by('?') em tabelas grandes)
        ids = list(questoes.values_list('id', flat=True))
        import random
        random.shuffle(ids)
        ids_selecionados = ids[:self.QUANTIDADE]

        questoes_selecionadas = Questao.objects.filter(
            id__in=ids_selecionados
        ).select_related(
            'concurso', 'concurso__banca', 'materia'
        ).prefetch_related('alternativas')

        # Mantém a ordem aleatória definida acima
        mapa = {q.id: q for q in questoes_selecionadas}
        questoes_ordenadas = [mapa[i] for i in ids_selecionados if i in mapa]

        serializer = QuestaoPartidaSerializer(questoes_ordenadas, many=True)
        return Response({
            'total': len(questoes_ordenadas),
            'questoes': serializer.data,
        })


# ─── Endpoint de correção: valida a resposta sem expor o gabarito antes ───

class CorrigirRespostaView(APIView):
    """
    POST /api/questoes/corrigir/
    Body: { "questao_id": 42, "letra": "A" }

    Retorna se a resposta está correta e qual é o gabarito.
    A correção fica no backend para impedir que o app "veja" a resposta certa
    antes de o usuário responder (poderia ser visto inspecionando o payload).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        questao_id = request.data.get('questao_id')
        letra = (request.data.get('letra') or '').strip().upper()

        if not questao_id or not letra:
            return Response(
                {'detail': 'Informe questao_id e letra.'},
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

        return Response({
            'correta': correta,
            'gabarito': questao.gabarito,
        })