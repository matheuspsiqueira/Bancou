from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegistroView, PerfilView, AlterarSenhaView, RegistrarResultadoView,
    RecuperarVidaView, SolicitarRecuperacaoSenhaView, ConfirmarRecuperacaoSenhaView,
    VerificarEmailView,
)

urlpatterns = [
    path('registro/', RegistroView.as_view(), name='registro'),
    path('verificar-email/', VerificarEmailView.as_view(), name='verificar_email'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('alterar-senha/', AlterarSenhaView.as_view(), name='alterar_senha'),
    path('registrar-resultado/', RegistrarResultadoView.as_view(), name='registrar_resultado'),
    path('recuperar-vida/', RecuperarVidaView.as_view(), name='recuperar_vida'),
    path('recuperar-senha/', SolicitarRecuperacaoSenhaView.as_view(), name='recuperar-senha'),
    path('recuperar-senha/confirmar/', ConfirmarRecuperacaoSenhaView.as_view(), name='recuperar-senha-confirmar'),
]