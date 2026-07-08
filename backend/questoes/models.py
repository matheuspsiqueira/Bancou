from django.db import models
from django.conf import settings


class Banca(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = 'Banca'
        verbose_name_plural = 'Bancas'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Concurso(models.Model):
    banca = models.ForeignKey(Banca, on_delete=models.PROTECT, related_name='concursos')
    nome = models.CharField(max_length=200)
    cargo = models.CharField(max_length=200, blank=True)
    ano = models.IntegerField()

    class Meta:
        verbose_name = 'Concurso'
        verbose_name_plural = 'Concursos'
        ordering = ['-ano', 'nome']

    def __str__(self):
        return f'{self.nome} ({self.ano}) — {self.banca}'


class Materia(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = 'Matéria'
        verbose_name_plural = 'Matérias'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Questao(models.Model):

    class Status(models.TextChoices):
        PENDENTE = 'pendente', 'Pendente'
        APROVADA = 'aprovada', 'Aprovada'
        REJEITADA = 'rejeitada', 'Rejeitada'

    class Tipo(models.TextChoices):
        MULTIPLA_ESCOLHA = 'multipla_escolha', 'Múltipla Escolha'
        CERTO_ERRADO = 'certo_errado', 'Certo/Errado'
        DISCURSIVA = 'discursiva', 'Discursiva'

    # Origem
    concurso = models.ForeignKey(Concurso, on_delete=models.PROTECT, related_name='questoes')
    materia = models.ForeignKey(Materia, on_delete=models.PROTECT, related_name='questoes', null=True, blank=True)

    # Conteúdo
    numero = models.IntegerField()
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    enunciado = models.TextField()
    contexto = models.TextField(blank=True, help_text='Texto-base compartilhado por múltiplas questões')
    gabarito = models.CharField(max_length=1, blank=True)

    # Imagem
    tem_imagem = models.BooleanField(default=False, help_text='Script detectou referência a imagem/figura')
    imagem = models.ImageField(upload_to='questoes/imagens/', null=True, blank=True)

    # Flags de qualidade
    baixa_confianca = models.BooleanField(default=False, help_text='Extração com possíveis problemas')
    notas_extracao = models.JSONField(default=list, blank=True, help_text='Alertas gerados pelo script')

    # Status de revisão
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDENTE)

    # Metadados
    pagina_pdf = models.IntegerField(default=0)
    criada_em = models.DateTimeField(auto_now_add=True)
    atualizada_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Questão'
        verbose_name_plural = 'Questões'
        ordering = ['concurso', 'numero']

    def __str__(self):
        return f'Q{self.numero} — {self.concurso}'
    
    def save(self, *args, **kwargs):
        if self.imagem and self.tem_imagem:
            self.tem_imagem = False
        super().save(*args, **kwargs)

    def precisa_atencao(self):
        return self.tem_imagem or self.baixa_confianca

    def pode_aprovar(self):
        return self.materia is not None


class Alternativa(models.Model):
    questao = models.ForeignKey(Questao, on_delete=models.CASCADE, related_name='alternativas')
    letra = models.CharField(max_length=1)
    texto = models.TextField()

    class Meta:
        verbose_name = 'Alternativa'
        verbose_name_plural = 'Alternativas'
        ordering = ['letra']

    def __str__(self):
        return f'{self.letra}) {self.texto[:60]}'


class Partida(models.Model):
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='partidas')
    questoes_ids = models.JSONField(default=list)       # ids das questões sorteadas, na ordem
    respondidas_ids = models.JSONField(default=list)    # ids já corrigidos — impede corrigir a mesma 2x
    acertos = models.PositiveIntegerField(default=0)
    erros = models.PositiveIntegerField(default=0)
    com_tempo = models.BooleanField(default=False)
    finalizada = models.BooleanField(default=False)
    abandonada = models.BooleanField(default=False)
    xp_ganho = models.PositiveIntegerField(default=0)      # guardado pra idempotência
    moedas_ganhas = models.PositiveIntegerField(default=0) # guardado pra idempotência
    vidas_perdidas = models.PositiveIntegerField(default=0)
    criada_em = models.DateTimeField(auto_now_add=True)
    finalizada_em = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        status = 'finalizada' if self.finalizada else 'em andamento'
        return f'Partida #{self.id} de {self.usuario} ({status})'