from django.db import models


class CampanhaPioneiros(models.Model):
    """Liga/desliga a campanha. Desligou, o banner e o formulário somem do site
    e o endpoint para de aceitar cadastros."""
    nome = models.CharField(max_length=80, default='Lista de Pioneiros')
    ativa = models.BooleanField(
        default=False,
        help_text='Desmarque para encerrar a campanha (some do site).',
    )
    link_planner = models.URLField(
        help_text='Link de download do planner (ex.: Google Drive com acesso por link).',
    )
    assunto_email = models.CharField(
        max_length=120, default='Seu planner de estudos do Bancou chegou 🎁',
    )

    class Meta:
        verbose_name = 'Campanha de pioneiros'
        verbose_name_plural = 'Campanha de pioneiros'

    def __str__(self):
        return f'{self.nome} ({"ativa" if self.ativa else "encerrada"})'

    @classmethod
    def atual(cls):
        return cls.objects.filter(ativa=True).first()


class Pioneiro(models.Model):
    email = models.EmailField(unique=True)
    nome = models.CharField(max_length=80)
    concurso = models.CharField(max_length=100)
    consentimento = models.BooleanField(default=False)
    origem = models.CharField(max_length=160, blank=True)
    planner_enviado = models.BooleanField(default=False)
    borda_liberada = models.BooleanField(default=False)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Pioneiro'
        verbose_name_plural = 'Pioneiros'

    def __str__(self):
        return self.email