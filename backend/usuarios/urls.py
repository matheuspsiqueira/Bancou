from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegistroView, PerfilView, AlterarSenhaView, RegistrarResultadoView, RecuperarVidaView

urlpatterns = [
    path('registro/', RegistroView.as_view(), name='registro'),
    path('login/', TokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('perfil/', PerfilView.as_view(), name='perfil'),
    path('alterar-senha/', AlterarSenhaView.as_view(), name='alterar_senha'),
    path('registrar-resultado/', RegistrarResultadoView.as_view(), name='registrar_resultado'),
    path('recuperar-vida/', RecuperarVidaView.as_view(), name='recuperar_vida'),
]