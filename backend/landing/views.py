from django.shortcuts import redirect
from django.views.generic import TemplateView


class IndexView(TemplateView):
    template_name = 'landing/index.html'


class TermosView(TemplateView):
    template_name = 'landing/termos.html'


class PrivacidadeView(TemplateView):
    template_name = 'landing/privacidade.html'


class VerificarEmailView(TemplateView):
    """
    Só renderiza a página de confirmação se vier um token na URL.
    Acesso direto sem token (ex: alguém digitando a URL à mão, ou um bot
    varrendo rotas) é redirecionado pra home em vez de mostrar a página
    com estado de erro — reduz a superfície exposta desse endpoint.
    """
    template_name = 'landing/verificar_email.html'

    def get(self, request, *args, **kwargs):
        if not request.GET.get('token'):
            return redirect('landing:index')
        return super().get(request, *args, **kwargs)