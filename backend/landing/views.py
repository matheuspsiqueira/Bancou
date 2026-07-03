from django.views.generic import TemplateView


class IndexView(TemplateView):
    template_name = 'landing/index.html'


class TermosView(TemplateView):
    template_name = 'landing/termos.html'


class PrivacidadeView(TemplateView):
    template_name = 'landing/privacidade.html'
