# desafios/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DesafioUsuario
from .serializers import DesafioUsuarioSerializer
from .services import sortear_desafios_do_dia, _hoje


class DesafiosDoUsuarioView(APIView):
    """
    GET /api/desafios/meus/

    Garante que o usuário tem os desafios de hoje sorteados (lazy,
    mesmo padrão de checar_regeneracao_vidas) e devolve a lista pra
    montar a listagem simples do InicioScreen — sem grade, sem clique.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        sortear_desafios_do_dia(request.user)

        desafios_hoje = DesafioUsuario.objects.filter(
            usuario=request.user, data=_hoje()
        ).select_related('desafio')

        serializer = DesafioUsuarioSerializer(desafios_hoje, many=True)
        return Response(serializer.data)