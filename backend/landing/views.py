import logging

from django.conf import settings
from django.core.cache import cache
from django.core.mail import EmailMultiAlternatives
from django.http import JsonResponse
from django.shortcuts import redirect
from django.utils.html import escape
from django.views import View
from django.views.generic import TemplateView

from .forms import CONCURSOS, PioneiroForm
from .models import CampanhaPioneiros, Pioneiro

logger = logging.getLogger(__name__)


class IndexView(TemplateView):
    template_name = 'landing/index.html'

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx['campanha'] = CampanhaPioneiros.atual()
        ctx['concursos'] = CONCURSOS
        return ctx


def _ip(request):
    # Atrás do proxy (Render), o IP real vem no X-Forwarded-For
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')


def _enviar_planner(pioneiro, campanha):
    primeiro_nome = pioneiro.nome.split()[0]
    suporte = settings.EMAIL_SUPORTE
    texto = (
        f'Oi, {primeiro_nome}!\n\n'
        f'Aqui está o seu planner de estudos gratuito do Bancou:\n{campanha.link_planner}\n\n'
        'Quer um extra? Baixe o app e cadastre-se com ESTE mesmo e-mail para '
        'ganhar uma borda de avatar dourada exclusiva.\n\n'
        'Bons estudos!\nEquipe Bancou\n\n'
        f'Dúvidas ou não quer mais receber nossos e-mails? Envie um e-mail para {suporte}.'
    )
    html = (
        f'<p>Oi, {escape(primeiro_nome)}!</p>'
        f'<p>Aqui está o seu planner de estudos gratuito do Bancou:<br>'
        f'<a href="{escape(campanha.link_planner)}">Baixar o planner</a></p>'
        '<p>Quer um extra? Baixe o app e cadastre-se com <strong>este mesmo e-mail</strong> '
        'para ganhar uma <strong>borda de avatar dourada</strong> exclusiva.</p>'
        '<p>Bons estudos!<br>Equipe Bancou</p>'
        '<p style="color:#888;font-size:12px">Dúvidas ou não quer mais receber nossos e-mails? '
        f'Envie um e-mail para <a href="mailto:{escape(suporte)}">{escape(suporte)}</a>.</p>'
    )
    try:
        msg = EmailMultiAlternatives(
            campanha.assunto_email, texto, settings.DEFAULT_FROM_EMAIL,
            [pioneiro.email], reply_to=[suporte],
        )
        msg.attach_alternative(html, 'text/html')
        msg.send()
    except Exception:
        logger.exception('Falha ao enviar planner para pioneiro %s', pioneiro.pk)
        return False
    pioneiro.planner_enviado = True
    pioneiro.save(update_fields=['planner_enviado'])
    return True


class PioneiroCadastroView(View):
    """Recebe o formulário (AJAX). Limite de 5 envios/hora por IP + honeypot."""

    def post(self, request):
        campanha = CampanhaPioneiros.atual()
        if not campanha:
            return JsonResponse({'ok': False, 'erro': 'Essa campanha foi encerrada.'}, status=410)

        chave = f'pioneiro:{_ip(request)}'
        tentativas = cache.get(chave, 0)
        if tentativas >= 5:
            return JsonResponse({'ok': False, 'erro': 'Muitas tentativas. Tente mais tarde.'}, status=429)
        cache.set(chave, tentativas + 1, 3600)

        if request.POST.get('site'):  # honeypot preenchido = bot
            return JsonResponse({'ok': True})

        form = PioneiroForm(request.POST)
        if not form.is_valid():
            erro = next(iter(form.errors.values()))[0]
            return JsonResponse({'ok': False, 'erro': erro}, status=400)

        d = form.cleaned_data
        pioneiro, criado = Pioneiro.objects.get_or_create(
            email=d['email'].strip().lower(),
            defaults={
                'nome': d['nome'], 'concurso': d['concurso'],
                'consentimento': True, 'origem': d['origem'],
            },
        )
        # E-mail repetido não recebe o planner de novo (evita uso como disparador de spam)
        if not pioneiro.planner_enviado:
            _enviar_planner(pioneiro, campanha)
        return JsonResponse({'ok': True})


class QuemSomosView(TemplateView):
    template_name = 'landing/quem_somos.html'


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


class ExcluirContaView(TemplateView):
    """
    Página pública de exclusão de conta (exigência da Play Store — Data
    Safety form). Usuário informa o e-mail; o backend cuida do envio do
    link de confirmação.
    """
    template_name = 'landing/excluir_conta.html'


class ConfirmarExclusaoContaView(TemplateView):
    """
    Mesma lógica de segurança do VerificarEmailView: só renderiza a
    página de confirmação final se vier um token na URL.
    """
    template_name = 'landing/excluir_conta_confirmar.html'

    def get(self, request, *args, **kwargs):
        if not request.GET.get('token'):
            return redirect('landing:index')
        return super().get(request, *args, **kwargs)