# conquistas/urls.py
from django.urls import path
from .views import ConquistasPerfilView

urlpatterns = [
    path('usuario/<int:usuario_id>/', ConquistasPerfilView.as_view(), name='conquistas-perfil'),
]