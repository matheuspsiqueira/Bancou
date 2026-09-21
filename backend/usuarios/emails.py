from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def enviar_email_html(destinatario, assunto, template_name, contexto, texto_alternativo):
    """
    Envia um e-mail com versão HTML (identidade visual do Bancou) e uma
    versão texto puro como fallback, pra clientes de e-mail que não
    renderizam HTML ou pra quando o destinatário prefere ver só texto.
    `template_name` é o nome do arquivo em usuarios/templates/emails/,
    sem a extensão .html.
    """
    html = render_to_string(f'emails/{template_name}.html', contexto)

    email = EmailMultiAlternatives(
        subject=assunto,
        body=texto_alternativo,
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[destinatario],
    )
    email.attach_alternative(html, 'text/html')
    email.send()