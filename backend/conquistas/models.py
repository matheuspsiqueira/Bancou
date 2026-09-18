# conquistas/models.py
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.conf import settings

from .services import CATALOGO_CONDICOES, CAMPOS_EXTRAS_POR_TIPO


class Conquista(models.Model):
    """
    Um registro de DADO, não de código. O tipo escolhe qual função
    avaliadora do catálogo fixo (services.CATALOGO_CONDICOES) vai rodar;
    a meta e a recompensa são configuráveis 100% pelo Django admin, sem
    precisar codar nada novo — desde que o tipo já exista no catálogo.

    banca/materia só valem pra tipos que precisam de um dado extra além
    da meta (acertos_por_banca / acertos_por_materia). No admin, o campo
    certo aparece sozinho conforme o tipo_condicao escolhido — ver
    static/conquistas/js/admin_conquista.js.
    """
    TIPO_CHOICES = [(chave, chave) for chave in CATALOGO_CONDICOES.keys()]

    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    tipo_condicao = models.CharField(
        max_length=50,
        choices=TIPO_CHOICES,
        help_text='Tipo de condição avaliada — lista vem do catálogo fixo em conquistas/services.py',
    )
    meta = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text='Valor que o usuário precisa atingir pra completar a conquista.',
    )
    banca = models.ForeignKey(
        'questoes.Banca', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='conquistas',
        help_text='Só usado quando tipo_condicao = acertos_por_banca.',
    )
    materia = models.ForeignKey(
        'questoes.Materia', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='conquistas',
        help_text='Só usado quando tipo_condicao = acertos_por_materia.',
    )
    recompensa_xp = models.PositiveIntegerField(default=0)
    recompensa_moedas = models.PositiveIntegerField(default=0)
    imagem = models.ImageField(
        upload_to='conquistas/',
        null=True,
        blank=True,
        help_text='Imagem própria da conquista (estilo Steam) — colorida, mostrada quando desbloqueada.',
    )
    imagem_pb = models.ImageField(
        upload_to='conquistas/pb/',
        null=True,
        blank=True,
        editable=False,
        help_text=(
            'Gerada automaticamente a partir de "imagem" (ver conquistas/signals.py) — '
            'versão preto-e-branco usada quando a conquista está bloqueada. Não editar na mão.'
        ),
    )
    ativa = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Conquista'
        verbose_name_plural = 'Conquistas'
        ordering = ['nome']  # sem campo de ordem manual — exibição sempre alfabética

    def __str__(self):
        return self.nome

    def clean(self):
        campo_extra = CAMPOS_EXTRAS_POR_TIPO.get(self.tipo_condicao)
        if campo_extra and not getattr(self, f'{campo_extra}_id'):
            raise ValidationError({
                campo_extra: f'Obrigatório para o tipo de condição "{self.tipo_condicao}".'
            })


class ConquistaUsuario(models.Model):
    """
    Progresso de UM usuário em UMA conquista. Criado/atualizado pelo
    listener central (services.avaliar_conquistas) — nunca editado
    manualmente em uso normal.

    valor_inicial: "baseline" — o valor que a métrica do usuário JÁ TINHA
    no momento em que essa conquista foi criada (registrado por
    services.inicializar_baseline_para_todos_usuarios, chamado uma vez na
    criação da Conquista no admin). O progresso exibido é sempre
    valor_atual - valor_inicial, nunca o valor absoluto.
    """
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='conquistas')
    conquista = models.ForeignKey(Conquista, on_delete=models.CASCADE, related_name='usuarios')
    valor_inicial = models.PositiveIntegerField(default=0)
    progresso = models.PositiveIntegerField(default=0)
    completada = models.BooleanField(default=False)
    completada_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Conquista do Usuário'
        verbose_name_plural = 'Conquistas dos Usuários'
        unique_together = ('usuario', 'conquista')
        ordering = ['-completada_em', 'conquista__nome']

    def __str__(self):
        status = '✅' if self.completada else f'{self.progresso}/{self.conquista.meta}'
        return f'{self.usuario} — {self.conquista.nome} ({status})'