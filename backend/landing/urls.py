from django.urls import path
from . import views

app_name = 'landing'

urlpatterns = [
    path('', views.IndexView.as_view(), name='index'),
    path('termos/', views.TermosView.as_view(), name='termos'),
    path('privacidade/', views.PrivacidadeView.as_view(), name='privacidade'),
]
