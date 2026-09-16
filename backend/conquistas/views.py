# conquistas/views.py
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from usuarios.models import Usuario

from .models import Conquista, ConquistaUsuario
from .serializers import ConquistaPerfilSerializer


class ConquistasPerfilView(APIView):
    """
    GET /api/conquistas/usuario/<usuario_id>/

    Lista as conquistas de um usuário, com regra de visibilidade:
      - Dono do perfil (usuario_id == request.user.id): vê TODAS as
        conquistas ativas, incluindo as ainda bloqueadas (completada=False,
        progresso < meta) — o frontend decide cinza/colorido a partir de
        "completada".
      - Visitante: recebe SÓ as já completadas. As bloqueadas nem entram
        na resposta — nunca revela pro visitante o que o dono ainda não
        tem.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, usuario_id):
        try:
            usuario_alvo = Usuario.objects.get(pk=usuario_id)
        except Usuario.DoesNotExist:
            return Response({'detail': 'Usuário não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        eh_dono = request.user.id == usuario_alvo.id

        progresso_por_conquista = {
            cu.conquista_id: cu
            for cu in ConquistaUsuario.objects.filter(usuario=usuario_alvo)
        }

        conquistas = Conquista.objects.filter(ativa=True)
        if not eh_dono:
            ids_completadas = [
                cid for cid, cu in progresso_por_conquista.items() if cu.completada
            ]
            conquistas = conquistas.filter(id__in=ids_completadas)

        serializer = ConquistaPerfilSerializer(
            conquistas, many=True,
            context={'request': request, 'progresso_por_conquista': progresso_por_conquista},
        )
        return Response(serializer.data)