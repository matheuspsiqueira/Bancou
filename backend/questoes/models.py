from django.core.exceptions import ValidationError
from django.db import models
from django.conf import settings
from django.db.models.signals import post_migrate
from django.dispatch import receiver

from .taxonomia import UF_CHOICES


class Banca(models.Model):
    nome = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = 'Banca'
        verbose_name_plural = 'Bancas'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Categoria(models.Model):
    """
    Tipo de carreira/segmento (ex.: Tribunais, MP e Defensoria; Polícias e
    Segurança Pública; Vestibulares e ENEM). Cadastrável no admin — novas
    categorias não exigem código.
    """
    nome = models.CharField(max_length=100, unique=True)

    class Meta:
        verbose_name = 'Categoria'
        verbose_name_plural = 'Categorias'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Orgao(models.Model):
    """
    Órgão/instituição que realiza o concurso ou vestibular (TJRJ, PRF, UERJ…).
    Guarda categoria, esfera e UF uma vez só; cada prova (Concurso) liga a um órgão.
    """

    class Esfera(models.TextChoices):
        FEDERAL = 'federal', 'Nacional (federal)'
        ESTADUAL = 'estadual', 'Estadual'
        MUNICIPAL = 'municipal', 'Municipal'

    nome = models.CharField(
        max_length=150, unique=True,
        help_text='Nome genérico, exibido no app (ex.: TJ, PM, MP). O estado fica em cada Concurso.',
    )
    nome_completo = models.CharField(max_length=250, blank=True)
    categoria = models.ForeignKey(Categoria, on_delete=models.PROTECT, related_name='orgaos')
    esfera = models.CharField(max_length=10, choices=Esfera.choices)
    uf = models.CharField(
        max_length=2, blank=True, choices=UF_CHOICES, editable=False,
        help_text='LEGADO: o estado agora fica em cada Concurso. Só existe para a migração de dados.',
    )

    class Meta:
        verbose_name = 'Órgão'
        verbose_name_plural = 'Órgãos'
        ordering = ['nome']

    def __str__(self):
        return self.nome


class Concurso(models.Model):

    class Nivel(models.TextChoices):
        FUNDAMENTAL = 'fundamental', 'Ensino fundamental'
        MEDIO = 'medio', 'Ensino médio'
        SUPERIOR = 'superior', 'Ensino superior'

    banca = models.ForeignKey(Banca, on_delete=models.PROTECT, related_name='concursos')
    orgao = models.ForeignKey(
        Orgao, on_delete=models.PROTECT, related_name='concursos', null=True, blank=True,
        help_text='Concursos antigos podem ficar sem órgão, mas só aparecem nos filtros por categoria/esfera/estado depois de ligados a um.',
    )
    nome = models.CharField(max_length=200)
    cargo = models.CharField(max_length=200, blank=True)
    ano = models.IntegerField()
    nivel = models.CharField(max_length=12, choices=Nivel.choices, blank=True)
    uf = models.CharField(
        max_length=2, blank=True, choices=UF_CHOICES,
        help_text='Estado da prova. Obrigatório para órgãos estaduais e municipais; vazio em provas nacionais (federais).',
    )

    class Meta:
        verbose_name = 'Concurso'
        verbose_name_plural = 'Concursos'
        ordering = ['-ano', 'nome']

    def __str__(self):
        return f'{self.nome} ({self.ano}) — {self.banca}'

    def clean(self):
        if self.orgao_id:
            if self.orgao.esfera == Orgao.Esfera.FEDERAL:
                self.uf = ''
            elif not self.uf:
                raise ValidationError({'uf': 'Informe o estado (UF) para concursos de órgãos estaduais e municipais.'})


class Materia(models.Model):
    nome = models.CharField(max_length=100, unique=True)
    aliases = models.TextField(
        blank=True,
        help_text='Outros nomes desta matéria nas provas, um por linha (ex.: "Noções de Direito Penal"). '
                  'O importador usa isso para unificar sozinho.',
    )

    class Meta:
        verbose_name = 'Matéria'
        verbose_name_plural = 'Matérias'
        ordering = ['nome']

    def __str__(self):
        return self.nome

    def lista_aliases(self):
        return [linha.strip() for linha in self.aliases.splitlines() if linha.strip()]


class Questao(models.Model):

    class Status(models.TextChoices):
        PENDENTE = 'pendente', 'Pendente'
        APROVADA = 'aprovada', 'Aprovada'
        REJEITADA = 'rejeitada', 'Rejeitada'

    class PosicaoImagem(models.TextChoices):
        ACIMA = 'acima', 'Acima do enunciado'
        ABAIXO = 'abaixo', 'Abaixo do enunciado'

    class Tipo(models.TextChoices):
        MULTIPLA_ESCOLHA = 'multipla_escolha', 'Múltipla Escolha'
        CERTO_ERRADO = 'certo_errado', 'Certo/Errado'
        DISCURSIVA = 'discursiva', 'Discursiva'

    # Origem
    concurso = models.ForeignKey(Concurso, on_delete=models.PROTECT, related_name='questoes')
    materia = models.ForeignKey(Materia, on_delete=models.PROTECT, related_name='questoes', null=True, blank=True)

    # Conteúdo
    caderno = models.CharField(
        max_length=60, blank=True,
        help_text='Dia/caderno da prova (ex.: "Dia 1", "Dia 2"). Vazio quando a prova é uma só. '
                  'O número da questão só precisa ser único dentro do mesmo caderno.',
    )
    numero = models.IntegerField()
    tipo = models.CharField(max_length=20, choices=Tipo.choices)
    enunciado = models.TextField()
    contexto = models.TextField(blank=True, help_text='Texto-base compartilhado por múltiplas questões')
    gabarito = models.CharField(max_length=1, blank=True)

    # Imagem
    tem_imagem = models.BooleanField(default=False, help_text='Script detectou referência a imagem/figura')
    imagem = models.ImageField(upload_to='questoes/imagens/', null=True, blank=True)
    posicao_imagem = models.CharField(
        max_length=10, choices=PosicaoImagem.choices, default=PosicaoImagem.ABAIXO,
        help_text='Onde a imagem aparece no app em relação ao enunciado '
                  '("...veja a imagem abaixo" → abaixo; "A imagem acima representa..." → acima).',
    )

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
        ordering = ['concurso', 'caderno', 'numero']

    def __str__(self):
        prefixo = f'{self.caderno} · ' if self.caderno else ''
        return f'{prefixo}Q{self.numero} — {self.concurso}'
    
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


class RespostaUsuario(models.Model):
    """
    Log de cada resposta corrigida (via CorrigirRespostaView ou o efeito
    pula_questao do UsarBuffView).

    Existe especificamente pra dar suporte a conquistas que dependem de
    granularidade por banca/matéria (ex: "Rei da FGV" = 500 acertos na
    banca FGV) — o campo agregado `Partida.acertos` sabe QUANTAS questões
    foram acertadas, mas não QUAIS, então não dá pra filtrar por banca ou
    matéria a partir dele sozinho.

    banca e matéria não são duplicadas aqui como colunas — dá pra chegar
    nelas via `questao.concurso.banca` e `questao.materia` num join, então
    guardar só o FK de questao é suficiente e evita dado redundante.
    """
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='respostas')
    partida = models.ForeignKey(Partida, on_delete=models.CASCADE, related_name='respostas')
    questao = models.ForeignKey(Questao, on_delete=models.CASCADE, related_name='respostas')
    correta = models.BooleanField()
    respondida_em = models.DateTimeField(auto_now_add=True)

    # Histórico (30/10/2026): letra que o usuário marcou ('_' = tempo esgotado).
    # Vazio em respostas antigas (anteriores a este campo) e quando a questão foi
    # pulada com item — nesse caso `pulada` é True.
    alternativa_escolhida = models.CharField(max_length=1, blank=True, default='')
    pulada = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Resposta do Usuário'
        verbose_name_plural = 'Respostas dos Usuários'
        unique_together = ('partida', 'questao')  # mesma trava de duplicidade que já existe em respondidas_ids
        ordering = ['-respondida_em']
        indexes = [
            # consultas do histórico: "respostas deste usuário a partir de tal data"
            models.Index(fields=['usuario', '-respondida_em'], name='resp_usuario_data_idx'),
        ]

    def __str__(self):
        resultado = '✅' if self.correta else '❌'
        return f'{self.usuario} — Q{self.questao.numero} {resultado}'


@receiver(post_migrate)
def copiar_uf_do_orgao_legado(sender, **kwargs):
    """
    Migração de dados automática (o deploy não tem terminal): a UF que antes ficava no
    Orgao passa para os Concursos dele e o campo legado é zerado. Roda a cada `migrate`,
    mas é idempotente — depois da 1ª vez não encontra mais nada para copiar.
    """
    if getattr(sender, 'label', None) != 'questoes':
        return
    banco = kwargs.get('using', 'default')
    for orgao in Orgao.objects.using(banco).exclude(uf=''):
        Concurso.objects.using(banco).filter(orgao=orgao, uf='').update(uf=orgao.uf)
    Orgao.objects.using(banco).exclude(uf='').update(uf='')