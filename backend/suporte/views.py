import logging
from html import unescape

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone
from django.utils.html import strip_tags
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from questoes.models import Questao

from .models import RelatoBug
from .serializers import RelatoBugSerializer

logger = logging.getLogger(__name__)


def _montar_email(relato, questao):
    usuario = relato.usuario
    nome = usuario.nome_completo or usuario.username
    quando = timezone.localtime(relato.criado_em).strftime('%d/%m/%Y %H:%M')

    linhas = [
        f'Novo relato de bug #{relato.pk}',
        '',
        f'Usuário: {nome} (@{usuario.username})',
        f'E-mail: {usuario.email}',
        f'ID do usuário: {usuario.pk}',
        f'Data: {quando}',
        '',
        f'Tela: {relato.tela_contexto or "—"}',
    ]

    if questao is not None:
        enunciado = ' '.join(unescape(strip_tags(questao.enunciado)).split())
        if len(enunciado) > 300:
            enunciado = enunciado[:300].rstrip() + '…'
        linhas += [
            f'Questão: {relato.questao_referencia} (id {questao.pk})',
            f'Matéria: {questao.materia.nome if questao.materia else "—"}',
            f'Gabarito cadastrado: {questao.gabarito or "—"}',
            f'Enunciado: {enunciado}',
        ]
    else:
        linhas.append('Questão: não identificada')

    linhas += [
        '',
        f'Aparelho: {relato.modelo_aparelho or "—"}',
        f'Sistema: {relato.versao_so or "—"}',
        f'Versão do app: {relato.versao_app or "—"}',
        '',
        'Descrição:',
        relato.descricao,
        '',
        f'Abrir no admin: {settings.SITE_BASE_URL}/admin/suporte/relatobug/{relato.pk}/change/',
    ]
    return '\n'.join(linhas)


def _avisar_suporte(relato, questao):
    """
    Manda o aviso por e-mail. Qualquer falha é só registrada em log: o relato
    já está salvo no banco e continua aparecendo no admin.
    """
    try:
        email = EmailMessage(
            subject=f'[Bancou] Relato de bug #{relato.pk}',
            body=_montar_email(relato, questao),
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[settings.EMAIL_SUPORTE],
            # Responder o e-mail já responde direto para o usuário.
            reply_to=[relato.usuario.email] if relato.usuario.email else None,
        )
        email.send()
        relato.email_enviado = True
        relato.save(update_fields=['email_enviado'])
    except Exception:
        logger.exception('Falha ao enviar o aviso do relato de bug #%s', relato.pk)


class RelatarBugView(APIView):
    """
    POST /api/suporte/relatar-bug/
    Cria o RelatoBug, avisa o suporte por e-mail e responde 201.
    """
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'relato-bug'

    def post(self, request):
        serializer = RelatoBugSerializer(data=request.data)
        if not serializer.is_valid():
            primeiro = next(iter(serializer.errors.values()))
            return Response({'detail': str(primeiro[0]), 'erros': serializer.errors},
                            status=status.HTTP_400_BAD_REQUEST)
        dados = serializer.validated_data

        # questao_id inexistente não derruba o relato: ele só fica sem questão.
        questao = None
        if dados.get('questao_id'):
            questao = (
                Questao.objects.select_related('concurso__banca', 'materia')
                .filter(pk=dados['questao_id']).first()
            )

        relato = RelatoBug.objects.create(
            usuario=request.user,
            questao=questao,
            # str(questao) já traz caderno, número, concurso, ano e banca.
            questao_referencia=str(questao)[:300] if questao else '',
            descricao=dados['descricao'],
            tela_contexto=dados.get('tela_contexto') or 'partida',
            versao_app=dados.get('versao_app', ''),
            modelo_aparelho=dados.get('modelo_aparelho', ''),
            versao_so=dados.get('versao_so', ''),
        )

        _avisar_suporte(relato, questao)

        return Response(
            {'detail': 'Relato recebido. Obrigado por ajudar a melhorar o Bancou!'},
            status=status.HTTP_201_CREATED,
        )