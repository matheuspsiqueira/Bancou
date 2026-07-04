from django.contrib.auth.models import AbstractUser
from django.db import models


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

    VIDAS_MAXIMAS = 3

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'nome_completo']

    class Meta:
        verbose_name = 'Usuário'
        verbose_name_plural = 'Usuários'

    def __str__(self):
        return self.email