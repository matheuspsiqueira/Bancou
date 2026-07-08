# questoes/urls.py
from django.urls import path
from .views import (
    BancasDisponiveisView,
    MateriasDisponiveisView,
    ConcursosDisponiveisView,
    IniciarPartidaView,
    CorrigirRespostaView,
    UsarBuffView,
    FinalizarPartidaView,
)

urlpatterns = [
    path('bancas/', BancasDisponiveisView.as_view(), name='bancas-disponiveis'),
    path('materias/', MateriasDisponiveisView.as_view(), name='materias-disponiveis'),
    path('concursos/', ConcursosDisponiveisView.as_view(), name='concursos-disponiveis'),
    path('iniciar-partida/', IniciarPartidaView.as_view(), name='iniciar-partida'),
    path('corrigir/', CorrigirRespostaView.as_view(), name='corrigir-resposta'),
    path('usar-buff/', UsarBuffView.as_view(), name='usar-buff'),
    path('finalizar-partida/<int:partida_id>/', FinalizarPartidaView.as_view(), name='finalizar-partida'),
]
