# suporte/urls.py
from django.urls import path
from .views import RelatarBugView

urlpatterns = [
    path('relatar-bug/', RelatarBugView.as_view(), name='suporte-relatar-bug'),
]