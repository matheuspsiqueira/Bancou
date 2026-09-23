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
    SolicitarTrocaEmailSerializer,
    AlterarSenhaSerializer,
    RegistrarResultadoSerializer,
    SolicitarRecuperacaoSenhaSerializer,
    ConfirmarRecuperacaoSenhaSerializer,
    VerificarEmailSerializer,
    SolicitarExclusaoContaSerializer,
    ConfirmarExclusaoContaSerializer,
)
from usuarios.services import checar_decaimento_streak


class RegistroView(generics.CreateAPIView):
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
    Chamado pela página web de confirmação — serve tanto pra ativar a
    conta no cadastro quanto pra efetivar uma troca de e-mail pendente.

    authentication_classes=[] é proposital: esse endpoint é acessado por
    uma página anônima via fetch simples (sem JWT). Sem isso, se o
    navegador tiver uma sessão de admin logada, o SessionAuthentication
    padrão do DRF detecta essa sessão e passa a exigir CSRF token —
    retornando 403 mesmo com permission_classes=[AllowAny], porque
    autenticação e permissão são checadas em etapas separadas.
    """
    serializer_class = VerificarEmailSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'E-mail verificado com sucesso!'}, status=status.HTTP_200_OK)


class SolicitarTrocaEmailView(generics.GenericAPIView):
    """
    POST /api/usuarios/trocar-email/
    Body: { "email": "novo@email.com" }
    Autenticado. Envia um link de confirmação para o NOVO e-mail. A troca
    só é efetivada quando esse link é clicado (VerificarEmailView) — até
    lá, o login continua exigindo o e-mail atual.
    """
    serializer_class = SolicitarTrocaEmailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Enviamos um link de confirmação para o novo e-mail.'},
            status=status.HTTP_200_OK,
        )


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


class SolicitarExclusaoContaView(generics.GenericAPIView):
    """
    POST /api/usuarios/excluir-conta/solicitar/
    Body: { "email": "..." }
    Chamado pela página pública `/excluir-conta/` (sem login). Exigência
    da Play Store (Data Safety): precisa existir um link público de
    exclusão de conta que não dependa do app instalado nem de sessão
    autenticada.
    """
    serializer_class = SolicitarExclusaoContaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'excluir-conta-solicitar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Se o e-mail existir em nossa base, enviamos um link de confirmação.'},
            status=status.HTTP_200_OK,
        )


class ConfirmarExclusaoContaView(generics.GenericAPIView):
    """
    POST /api/usuarios/excluir-conta/confirmar/
    Body: { "token": "..." }
    Chamado pela página web de confirmação final. authentication_classes=[]
    pelo mesmo motivo do VerificarEmailView (ver docstring acima): evita
    que uma sessão de admin ativa no navegador force checagem de CSRF
    num endpoint AllowAny.
    """
    serializer_class = ConfirmarExclusaoContaSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'excluir-conta-confirmar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Conta excluída com sucesso.'}, status=status.HTTP_200_OK)