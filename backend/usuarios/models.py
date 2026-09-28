from django.contrib.auth.models import AbstractUser
import secrets

from django.db import models
from django.utils import timezone


class Usuario(AbstractUser):
    email = models.EmailField(unique=True)
    nome_completo = models.CharField(max_length=255)
    avatar = models.ImageField(upload_to='avatares/', null=True, blank=True)

    # ─── Economia do jogo ───────────────────────────────────────────────
    xp = models.PositiveIntegerField(default=0)
    moedas = models.PositiveIntegerField(default=0)
    vidas = models.PositiveSmallIntegerField(default=3)
    streak = models.PositiveIntegerField(default=0)

    # ─── Controle (uso futuro: regeneração automática de vidas/streak) ──
    data_ultima_partida = models.DateField(null=True, blank=True)
    vidas_atualizadas_em = models.DateTimeField(null=True, blank=True)
    codigo_recuperacao_senha = models.CharField(max_length=6, null=True, blank=True)
    codigo_recuperacao_expira_em = models.DateTimeField(null=True, blank=True)

    # ─── Verificação de e-mail (cadastro e troca de e-mail) ──────────────
    # is_active (herdado do AbstractUser) começa False no cadastro e só
    # vira True quando o token é confirmado. O SimpleJWT já bloqueia
    # login de conta inativa automaticamente — sem lógica extra necessária.
    token_verificacao_email = models.CharField(max_length=64, null=True, blank=True)
    # Preenchido quando o usuário (já ativo) solicita troca de e-mail pelo
    # perfil. `email` só é sobrescrito por esse valor quando o token acima
    # é confirmado — até lá, o login continua com o e-mail atual.
    email_pendente = models.EmailField(null=True, blank=True)

    # ─── Exclusão de conta via página pública (sem login na web) ─────────
    # Usado pelo fluxo obrigatório da Play Store (Data Safety): usuário
    # informa o e-mail numa página pública, recebe um link por e-mail e
    # confirma a exclusão. Token de uso único, com expiração curta por ser
    # uma ação irreversível e destrutiva — diferente do
    # token_verificacao_email (que não expira).
    token_exclusao_conta = models.CharField(max_length=64, null=True, blank=True)
    token_exclusao_expira_em = models.DateTimeField(null=True, blank=True)

    # ─── Notificações push (Expo Push Notifications) ─────────────────────
    # `notificacoes_ativadas` é a preferência interna do usuário (toggle na
    # PerfilScreen) — default True. É o que o management command de envio
    # agendado consulta antes de disparar qualquer notificação; desligar
    # aqui NÃO mexe na permissão do sistema operacional, só faz o backend
    # parar de contar esse usuário nos disparos.
    # `expo_push_token` é o token do device gerado pelo expo-notifications,
    # reenviado a cada login/abertura do app (pode mudar em reinstall ou
    # troca de aparelho). Null enquanto a permissão do SO não foi concedida.
    notificacoes_ativadas = models.BooleanField(default=True)
    expo_push_token = models.CharField(max_length=255, null=True, blank=True)

    VIDAS_MAXIMAS = 3

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nome_completo']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return self.email


def _gerar_token_anuncio():
    return secrets.token_urlsafe(32)


class AnuncioVidaExtra(models.Model):
    """
    Um registro por tentativa de ganhar +1 vida assistindo a um anúncio
    premiado (rewarded) no alert "sem vidas".

    Fluxo seguro (a vida só é creditada com prova do Google):
      1. o app pede um `token` (registro criado, ainda sem `confirmado_em`);
      2. o app passa o token ao AdMob como `custom_data` ao mostrar o anúncio;
      3. quando o usuário conclui o anúncio, o Google chama o nosso endpoint
         de SSV (server-side verification), assinado; ao validar a assinatura
         creditamos a vida e preenchemos `confirmado_em`.

    O limite diário conta só os registros confirmados, pelo dia do fuso de
    Brasília (settings.TIME_ZONE = America/Sao_Paulo).
    """
    LIMITE_DIARIO = 3

    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='anuncios_vida_extra',
    )
    token = models.CharField(max_length=64, unique=True, default=_gerar_token_anuncio)
    criado_em = models.DateTimeField(auto_now_add=True)
    confirmado_em = models.DateTimeField(null=True, blank=True, db_index=True)
    # ID único da transação enviado pelo Google — impede creditar o mesmo
    # anúncio duas vezes (replay). Fica vazio quando confirmado em modo teste.
    transaction_id = models.CharField(max_length=128, unique=True, null=True, blank=True)

    class Meta:
        verbose_name = 'Anúncio de vida extra'
        verbose_name_plural = 'Anúncios de vida extra'
        ordering = ['-criado_em']

    def __str__(self):
        situacao = 'confirmado' if self.confirmado_em else 'pendente'
        return f'{self.usuario_id} — {situacao} — {self.criado_em:%d/%m/%Y %H:%M}'

    @classmethod
    def assistidos_hoje(cls, usuario):
        inicio_do_dia = timezone.localtime().replace(hour=0, minute=0, second=0, microsecond=0)
        return cls.objects.filter(usuario=usuario, confirmado_em__gte=inicio_do_dia).count()

    @classmethod
    def restantes_hoje(cls, usuario):
        return max(0, cls.LIMITE_DIARIO - cls.assistidos_hoje(usuario))


class NotificacaoEnviada(models.Model):
    """
    Um registro por notificação push agendada efetivamente enviada — é o
    que garante idempotência: o cron do GitHub Actions bate no endpoint a
    cada 15 minutos, e sem esse registro a mesma notificação seria
    reenviada em toda chamada dentro da mesma janela de horário.

    A constraint única (usuario, tipo, data) é a trava real — mesmo que o
    endpoint seja chamado em paralelo por engano, o banco impede duplicar.
    Gerenciável pelo Django admin, mesmo padrão da Loja e das Conquistas —
    dá pra auditar o que foi mandado pra quem sem precisar de log externo.
    """
    TIPO_VIDAS_RESTAURADAS = 'vidas_restauradas'
    TIPO_STREAK_EM_RISCO = 'streak_em_risco'
    TIPO_CONVITE_CASUAL = 'convite_casual'
    TIPO_DESAFIO_60S = 'desafio_60s'
    TIPO_REENGAJAMENTO = 'reengajamento'
    TIPO_CHOICES = [
        (TIPO_VIDAS_RESTAURADAS, 'Vidas restauradas'),
        (TIPO_STREAK_EM_RISCO, 'Streak em risco'),
        (TIPO_CONVITE_CASUAL, 'Convite casual'),
        (TIPO_DESAFIO_60S, 'Desafio de 60 segundos'),
        (TIPO_REENGAJAMENTO, 'Reengajamento'),
    ]

    usuario = models.ForeignKey(
        Usuario, on_delete=models.CASCADE, related_name='notificacoes_enviadas',
    )
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    # Dia (fuso America/Sao_Paulo) em que foi enviada — junto com usuario+tipo
    # forma a chave de idempotência do dia.
    data = models.DateField()
    enviado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notificação enviada'
        verbose_name_plural = 'Notificações enviadas'
        ordering = ['-enviado_em']
        constraints = [
            models.UniqueConstraint(
                fields=['usuario', 'tipo', 'data'], name='notificacao_unica_por_usuario_tipo_dia',
            ),
        ]

    def __str__(self):
        return f'{self.usuario_id} — {self.get_tipo_display()} — {self.data:%d/%m/%Y}'