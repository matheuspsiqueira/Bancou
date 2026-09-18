from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import AllowAny
from .models import Usuario
from .serializers import (
    RegistroSerializer,
    UsuarioSerializer,
    AtualizarPerfilSerializer,
    AlterarSenhaSerializer,
    RegistrarResultadoSerializer,
    SolicitarRecuperacaoSenhaSerializer,
    ConfirmarRecuperacaoSenhaSerializer,
    VerificarEmailSerializer,
)
from usuarios.services import checar_decaimento_streak


class RegistroView(generics.CreateAPIView):
    """
    POST /api/usuarios/registro/
    Cria o usuário com is_active=False e dispara o e-mail de verificação.
    Não retorna mais access/refresh — login só é possível após a
    confirmação do e-mail (ver VerificarEmailView).
    """
    serializer_class = RegistroSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Cadastro realizado! Enviamos um e-mail de confirmação — verifique sua caixa de entrada para ativar a conta.'},
            status=status.HTTP_201_CREATED,
        )


class VerificarEmailView(generics.GenericAPIView):
    """
    POST /api/usuarios/verificar-email/
    Body: { "token": "..." }
    Chamado pela página web de confirmação, não pelo app.
    """
    serializer_class = VerificarEmailSerializer
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'E-mail verificado com sucesso!'}, status=status.HTTP_200_OK)


class PerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        checar_regeneracao_vidas(request.user)
        checar_decaimento_streak(request.user)
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


def checar_regeneracao_vidas(usuario):
    from django.utils import timezone
    agora = timezone.now()
    precisa_resetar = (
        usuario.vidas_atualizadas_em is None or
        usuario.vidas_atualizadas_em.date() < agora.date()
    )
    if precisa_resetar and usuario.vidas < usuario.VIDAS_MAXIMAS:
        usuario.vidas = usuario.VIDAS_MAXIMAS
        usuario.vidas_atualizadas_em = agora
        usuario.save(update_fields=['vidas', 'vidas_atualizadas_em'])


class SolicitarRecuperacaoSenhaView(generics.GenericAPIView):
    serializer_class = SolicitarRecuperacaoSenhaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'recuperar-senha-solicitar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Se o e-mail existir em nossa base, um código foi enviado.'},
            status=status.HTTP_200_OK,
        )


class ConfirmarRecuperacaoSenhaView(generics.GenericAPIView):
    serializer_class = ConfirmarRecuperacaoSenhaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'recuperar-senha-confirmar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Senha redefinida com sucesso.'}, status=status.HTTP_200_OK)