# desafios/models.py
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.conf import settings

from .services import CATALOGO_CONDICOES, CAMPOS_EXTRAS_POR_TIPO


class Desafio(models.Model):
    """
    Catálogo de desafios diários — mesmo princípio de dado/código de
    Conquista (conquistas/models.py): o tipo escolhe o avaliador fixo do
    catálogo (services.CATALOGO_CONDICOES), e nome/descrição/meta/
    recompensa são 100% editáveis no admin, sem precisar codar nada novo
    por instância. Diferente de Conquista: sem imagem/badge, sem
    baseline (os tipos aqui contam "hoje", já nascem zerados todo dia).

    banca/materia/item/horario_inicio/horario_fim só valem pra tipos que
    precisam de um dado extra além da meta — ver CAMPOS_EXTRAS_POR_TIPO
    em services.py. item é opcional mesmo pra 'comprar_item_hoje'
    (vazio = qualquer item da loja conta).
    """
    TIPO_CHOICES = [(chave, chave) for chave in CATALOGO_CONDICOES.keys()]

    nome = models.CharField(max_length=100)
    descricao = models.CharField(
        max_length=150,
        help_text='Texto curto mostrado na listagem, ex.: "Jogue 1 partida hoje".',
    )
    tipo_condicao = models.CharField(
        max_length=50,
        choices=TIPO_CHOICES,
        help_text='Tipo de condição avaliada — lista vem do catálogo fixo em desafios/services.py',
    )
    meta = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        help_text='Valor que o usuário precisa atingir HOJE pra completar o desafio.',
    )
    banca = models.ForeignKey(
        'questoes.Banca', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='desafios',
        help_text='Só usado quando tipo_condicao = acertos_por_banca_hoje.',
    )
    materia = models.ForeignKey(
        'questoes.Materia', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='desafios',
        help_text='Só usado quando tipo_condicao = acertos_por_materia_hoje.',
    )
    item = models.ForeignKey(
        'loja.ItemLoja', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='desafios',
        help_text=(
            'Usado por usar_item_hoje (obrigatório) e comprar_item_hoje '
            '(opcional — vazio conta compra de qualquer item da loja).'
        ),
    )
    horario_inicio = models.TimeField(
        null=True, blank=True,
        help_text='Só usado quando tipo_condicao = partida_em_horario_hoje. Ex.: 05:00.',
    )
    horario_fim = models.TimeField(
        null=True, blank=True,
        help_text='Só usado quando tipo_condicao = partida_em_horario_hoje. Ex.: 10:00.',
    )
    recompensa_xp = models.PositiveIntegerField(default=0)
    recompensa_moedas = models.PositiveIntegerField(default=0)
    ativo = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Desafio'
        verbose_name_plural = 'Desafios'
        ordering = ['nome']

    def __str__(self):
        return self.nome

    def clean(self):
        campos_obrigatorios = CAMPOS_EXTRAS_POR_TIPO.get(self.tipo_condicao, [])
        erros = {}
        for campo in campos_obrigatorios:
            if campo in ('horario_inicio', 'horario_fim'):
                valor = getattr(self, campo, None)
            else:
                valor = getattr(self, f'{campo}_id', None)
            if not valor:
                erros[campo] = f'Obrigatório para o tipo de condição "{self.tipo_condicao}".'
        if erros:
            raise ValidationError(erros)


class DesafioUsuario(models.Model):
    """
    Atribuição diária: qual Desafio um usuário recebeu num dia específico,
    e o progresso dele. O campo `data` É o mecanismo de reset — não existe
    job/cron zerando nada; um novo dia é simplesmente uma linha nova
    (ver services.sortear_desafios_do_dia). Linhas de dias passados não
    completados só ficam "mortas" no banco (histórico bruto), nunca são
    reexibidas nem migradas — combina com a decisão de que desafios não
    completados simplesmente somem no dia seguinte.
    """
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='desafios')
    desafio = models.ForeignKey(Desafio, on_delete=models.CASCADE, related_name='usuarios')
    data = models.DateField(db_index=True)
    progresso = models.PositiveIntegerField(default=0)
    completado = models.BooleanField(default=False)
    completado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Desafio do Usuário'
        verbose_name_plural = 'Desafios dos Usuários'
        unique_together = ('usuario', 'desafio', 'data')
        ordering = ['desafio__nome']

    def __str__(self):
        status = '✅' if self.completado else f'{self.progresso}/{self.desafio.meta}'
        return f'{self.usuario} — {self.desafio.nome} ({self.data}) — {status}'