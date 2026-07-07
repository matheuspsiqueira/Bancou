# loja/urls.py
from django.urls import path
from .views import ItensLojaView, ComprarItemView

urlpatterns = [
    path('itens/', ItensLojaView.as_view(), name='loja-itens'),
    path('comprar-item/', ComprarItemView.as_view(), name='loja-comprar-item'),
]
