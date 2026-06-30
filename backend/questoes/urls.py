# questoes/urls.py
from django.urls import path
from .views import (
    BancasDisponiveisView,
    MateriasDisponiveisView,
    ConcursosDisponiveisView,
    PartidaQuestoesView,
    CorrigirRespostaView,
)

urlpatterns = [
    path('bancas/', BancasDisponiveisView.as_view(), name='bancas-disponiveis'),
    path('materias/', MateriasDisponiveisView.as_view(), name='materias-disponiveis'),
    path('concursos/', ConcursosDisponiveisView.as_view(), name='concursos-disponiveis'),
    path('partida/', PartidaQuestoesView.as_view(), name='partida-questoes'),
    path('corrigir/', CorrigirRespostaView.as_view(), name='corrigir-resposta'),
]