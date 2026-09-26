# desafios/urls.py
from django.urls import path
from .views import DesafiosDoUsuarioView

urlpatterns = [
    path('meus/', DesafiosDoUsuarioView.as_view(), name='desafios-meus'),
]