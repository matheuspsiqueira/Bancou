from django.conf import settings
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver


class RelatoBug(models.Model):
    """
    Relato de problema enviado pelo usuário dentro do app (PartidaScreen ou
    PerfilScreen). Triagem 100% pelo Django admin.

    Os dados do usuário NÃO vêm do app: a view pega do token, então ninguém
    consegue relatar em nome de outra pessoa.
    """

    class Status(models.TextChoices):
        ABERTO = 'aberto', 'Aberto'
        EM_ANALISE = 'em_analise', 'Em análise'
        RESOLVIDO = 'resolvido', 'Resolvido'

    # CASCADE de propósito: ao excluir a conta, os relatos dela vão junto
    # (os dados pessoais saem do banco, como diz a Política de Privacidade).
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='relatos_bug',
    )
    # SET_NULL: se a questão for apagada/reimportada, o relato continua existindo.
    questao = models.ForeignKey(
        'questoes.Questao', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='relatos_bug',
    )
    questao_referencia = models.CharField(
        max_length=300, blank=True,
        help_text='Identificação da questão no momento do relato (sobrevive se a questão for apagada).',
    )
    descricao = models.TextField()
    # Print opcional enviado pelo usuário (máx. 1, validado no serializer).
    anexo = models.ImageField(
        upload_to='relatos_bug/', null=True, blank=True,
        help_text='Print opcional enviado pelo usuário.',
    )
    tela_contexto = models.CharField(max_length=50, default='partida')
    versao_app = models.CharField(max_length=30, blank=True)
    modelo_aparelho = models.CharField(max_length=120, blank=True)
    versao_so = models.CharField(max_length=60, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ABERTO)
    email_enviado = models.BooleanField(
        default=False, help_text='Se o aviso por e-mail para o suporte foi enviado com sucesso.',
    )
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Relato de bug'
        verbose_name_plural = 'Relatos de bug'
        ordering = ['-criado_em']

    def __str__(self):
        return f'Relato #{self.pk} — {self.usuario} ({self.get_status_display()})'


@receiver(post_delete, sender=RelatoBug)
def apagar_anexo_do_relato(sender, instance, **kwargs):
    """
    Apaga o arquivo do print do armazenamento quando o relato some (inclusive
    na exclusão de conta, que apaga os relatos em cascata). Falha aqui nunca
    pode travar a exclusão.
    """
    if instance.anexo:
        try:
            instance.anexo.delete(save=False)
        except Exception:
            pass