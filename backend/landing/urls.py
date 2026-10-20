from django.urls import path
from . import views

app_name = 'landing'

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('quem-somos/', views.QuemSomosView.as_view(), name='quem_somos'),
    path('termos/', views.TermosView.as_view(), name='termos'),
    path('privacidade/', views.PrivacidadeView.as_view(), name='privacidade'),
    path('verificar-email/', views.VerificarEmailView.as_view(), name='verificar_email'),
    path('excluir-conta/', views.ExcluirContaView.as_view(), name='excluir_conta'),
    path('excluir-conta/confirmar/', views.ConfirmarExclusaoContaView.as_view(), name='excluir_conta_confirmar'),
]