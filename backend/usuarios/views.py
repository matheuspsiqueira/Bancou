from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Usuario
from .serializers import (
    RegistroSerializer,
    UsuarioSerializer,
    AtualizarPerfilSerializer,
    AlterarSenhaSerializer,
    RegistrarResultadoSerializer,
)


class RegistroView(generics.CreateAPIView):
    serializer_class = RegistroSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()

        refresh = RefreshToken.for_user(usuario)
        return Response({
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class PerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UsuarioSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = AtualizarPerfilSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UsuarioSerializer(request.user, context={'request': request}).data)

    def delete(self, request):
        user = request.user
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlterarSenhaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AlterarSenhaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Senha alterada com sucesso.'}, status=status.HTTP_200_OK)


class RegistrarResultadoView(APIView):
    """
    POST /api/usuarios/registrar-resultado/
    Body: { "acertos": 7, "erros": 3, "abandonada": false }

    Recebe o resultado bruto de uma partida e aplica a lógica de
    XP/moedas/vidas no servidor. Retorna os totais atualizados do usuário
    junto com o que foi ganho/perdido nessa partida especificamente,
    pra a ScoreScreen poder animar os números.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RegistrarResultadoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        resultado = serializer.save()

        usuario = resultado['usuario']
        return Response({
            'xp_ganho': resultado['xp_ganho'],
            'moedas_ganhas': resultado['moedas_ganhas'],
            'vidas_perdidas': resultado['vidas_perdidas'],
            'usuario': UsuarioSerializer(usuario, context={'request': request}).data,
        }, status=status.HTTP_200_OK)


class RecuperarVidaView(APIView):
    """
    POST /api/usuarios/recuperar-vida/
    Usado após o usuário assistir um anúncio recompensado (AdMob).
    Adiciona 1 vida, respeitando o teto de Usuario.VIDAS_MAXIMAS.
    A validação real de "o anúncio foi assistido até o fim" é feita
    no SDK do AdMob no app — este endpoint só aplica o efeito no servidor.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        usuario = request.user
        if usuario.vidas >= Usuario.VIDAS_MAXIMAS:
            return Response(
                {'detail': 'Você já está com o número máximo de vidas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.vidas += 1
        usuario.save(update_fields=['vidas'])
        return Response(UsuarioSerializer(usuario, context={'request': request}).data)