# loja/models.py
from django.db import models
from django.conf import settings


# ─── FASE 2 — dinheiro real via IAP (Play Billing / App Store) ─────────────
# Ainda não plugado em nenhuma view ativa. Escopo atual: só pacote de moedas,
# suficiente pra testar o fluxo de Play Billing ponta a ponta. Passe de Duelo
# e vida avulsa com dinheiro real ficam pra quando entrarem em pauta (ver
# briefing §4 — Fase 2).

class ProdutoIAP(models.Model):
    """Catálogo de produtos comprados com dinheiro real (via IAP)."""

    TIPO_CHOICES = [
        ('moedas', 'Pacote de Moedas'),
        # Futuro: ('passe_duelo', 'Passe de Duelo')
    ]

    sku = models.CharField(
        max_length=100, unique=True,
        help_text="Deve ser idêntico ao Product ID no Play Console / App Store Connect",
    )
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    quantidade = models.PositiveIntegerField(help_text="Quantas moedas esse SKU entrega")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.nome} ({self.sku})"


class CompraIAP(models.Model):
    """Registro de cada compra com dinheiro real, validada contra a Play Developer API."""

    STATUS_CHOICES = [
        ('pendente', 'Pendente'),
        ('validada', 'Validada'),
        ('rejeitada', 'Rejeitada'),
        ('reembolsada', 'Reembolsada'),
    ]

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='compras')
    produto = models.ForeignKey(ProdutoIAP, on_delete=models.PROTECT, related_name='compras')
    purchase_token = models.CharField(
        max_length=500, unique=True,
        help_text="Token do Google/Apple — impede crédito duplicado da mesma compra",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pendente')
    criada_em = models.DateTimeField(auto_now_add=True)
    validada_em = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.usuario} — {self.produto} ({self.status})"


# ─── FASE 1 — itens comprados com moedas do jogo (em uso agora) ────────────
# codigo = "tipo" fixo que aciona lógica específica em services.py (mesmo
# padrão tipo/instância definido pra Conquistas e Desafios no briefing).
# nome, descricao, preco_moedas e ativo são "dado" — editáveis livremente
# no Django admin, sem precisar tocar em código.

class ItemLoja(models.Model):
    """Catálogo de itens comprados com moedas do jogo (nunca dinheiro real)."""

    CODIGO_CHOICES = [
        ('pula_questao', 'Pula Questão'),
        ('elimina_alternativas', 'Elimina 2 Alternativas'),
        ('xp_dobro', 'XP em Dobro por 24h'),
        ('congela_streak', 'Congelamento de Streak'),
        ('vida_extra', 'Vida Extra'),
    ]

    TIPO_EFEITO_CHOICES = [
        ('consumivel_partida', 'Consumível dentro da partida'),   # pula_questao, elimina_alternativas
        ('temporario', 'Ativo por tempo limitado'),                # xp_dobro
        ('protecao_streak', 'Protege o streak'),                   # congela_streak
        ('credito_direto', 'Credita direto no saldo do usuário'),  # vida_extra
    ]

    codigo = models.CharField(max_length=30, choices=CODIGO_CHOICES, unique=True)
    nome = models.CharField(max_length=100)
    descricao = models.TextField(blank=True)
    preco_moedas = models.PositiveIntegerField()
    tipo_efeito = models.CharField(max_length=30, choices=TIPO_EFEITO_CHOICES)
    quantidade_concedida = models.PositiveIntegerField(
        default=1, help_text="Ex: 1 vida extra, ou N usos do buff",
    )
    duracao_horas = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Só usado por itens 'temporario', ex: xp_dobro = 24",
    )
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.nome


class InventarioItem(models.Model):
    """Estoque de itens consumíveis comprados e ainda não usados.
    Aplica-se a: pula_questao, elimina_alternativas, congela_streak
    (vida_extra é crédito direto, nem passa por aqui — ver services.py).
    """

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='inventario_itens')
    item = models.ForeignKey(ItemLoja, on_delete=models.PROTECT)
    quantidade = models.PositiveIntegerField(default=0)

    class Meta:
        unique_together = ('usuario', 'item')

    def __str__(self):
        return f"{self.usuario} — {self.item}: {self.quantidade}"


class BuffAtivo(models.Model):
    """Itens com janela de tempo em vigor (hoje só xp_dobro)."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='buffs_ativos')
    item = models.ForeignKey(ItemLoja, on_delete=models.PROTECT)
    ativado_em = models.DateTimeField(auto_now_add=True)
    expira_em = models.DateTimeField()

    def __str__(self):
        return f"{self.usuario} — {self.item} até {self.expira_em}"


class UsoItemPartida(models.Model):
    """Auditoria: qual item foi usado em qual questão de qual partida.
    unique_together evita reuso indevido do mesmo item na mesma questão.
    """

    partida = models.ForeignKey('questoes.Partida', on_delete=models.CASCADE, related_name='usos_item')
    questao = models.ForeignKey('questoes.Questao', on_delete=models.CASCADE)
    item = models.ForeignKey(ItemLoja, on_delete=models.PROTECT)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    usado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('partida', 'questao', 'item')


class HistoricoCompraItem(models.Model):
    """
    Log simples de toda compra feita em comprar_item_virtual, independente
    do tipo_efeito do item (credito_direto, temporario ou inventário).
    Não existia até aqui — nenhuma outra parte do sistema precisava saber
    QUANDO uma compra aconteceu, só o efeito final (moedas, vidas,
    inventário, buff ativo). Criado especificamente pra sustentar o
    desafio "comprar_item_hoje" (ver desafios/services.py), que precisa
    contar compras por dia — algo que nem InventarioItem (só quantidade
    acumulada) nem BuffAtivo (só o item xp_dobro) resolvem sozinhos.
    Puramente aditivo: não substitui nem altera nenhum fluxo existente.
    """
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='historico_compras')
    item = models.ForeignKey(ItemLoja, on_delete=models.PROTECT)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = 'Histórico de compra de item'
        verbose_name_plural = 'Histórico de compras de itens'
        ordering = ['-criado_em']

    def __str__(self):
        return f'{self.usuario_id} — {self.item.codigo} — {self.criado_em:%d/%m/%Y %H:%M}'