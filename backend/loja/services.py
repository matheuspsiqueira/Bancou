# loja/services.py
from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import ProdutoLoja, CompraLoja, ItemLojaVirtual, InventarioBuff, BuffAtivo


class SaldoInsuficienteError(Exception):
    """Levantado quando o usuário não tem moedas suficientes pro item."""
    pass


class CompraJaProcessadaError(Exception):
    """Levantado quando um purchase_token de IAP já foi creditado antes."""
    pass


# ─── Fase 2 — dinheiro real via IAP (ainda não plugado em nenhuma view) ─────

@transaction.atomic
def creditar_compra_iap(usuario, produto: ProdutoLoja, purchase_token: str):
    """Credita uma compra com dinheiro real já validada contra a Play Developer
    API / App Store. NUNCA chamar antes de validar o token junto ao Google/Apple.
    """
    if CompraLoja.objects.filter(purchase_token=purchase_token).exists():
        raise CompraJaProcessadaError("Esse purchase_token já foi processado.")

    compra = CompraLoja.objects.create(
        usuario=usuario,
        produto=produto,
        purchase_token=purchase_token,
        status='validada',
        validada_em=timezone.now(),
    )

    usuario_locked = usuario.__class__.objects.select_for_update().get(pk=usuario.pk)

    if produto.tipo == 'moedas':
        usuario_locked.moedas += produto.quantidade
        usuario_locked.save(update_fields=['moedas'])
    elif produto.tipo == 'vida_avulsa':
        usuario_locked.vidas += produto.quantidade
        usuario_locked.save(update_fields=['vidas'])

    return compra


# ─── Fase 1 — moedas do jogo (em uso agora) ─────────────────────────────────

@transaction.atomic
def comprar_item_virtual(usuario, codigo_item: str):
    """Compra um item da loja de moedas: buffs consumíveis, buff temporário
    (xp_dobro) ou vida extra (crédito direto, pode passar do teto de vidas).

    Levanta ItemLojaVirtual.DoesNotExist se o código não existir/estiver
    inativo, e SaldoInsuficienteError se faltar moeda.
    """
    item = ItemLojaVirtual.objects.get(codigo=codigo_item, ativo=True)

    usuario_locked = usuario.__class__.objects.select_for_update().get(pk=usuario.pk)

    if usuario_locked.moedas < item.preco_moedas:
        raise SaldoInsuficienteError("Moedas insuficientes.")

    usuario_locked.moedas -= item.preco_moedas

    if item.tipo_efeito == 'credito_direto':
        # vida_extra — passa do teto de VIDAS_MAXIMAS, decisão já validada
        usuario_locked.vidas += item.quantidade_concedida
        usuario_locked.save(update_fields=['moedas', 'vidas'])
        return {'tipo': 'vida_extra', 'vidas_atuais': usuario_locked.vidas}

    usuario_locked.save(update_fields=['moedas'])

    if item.tipo_efeito == 'temporario':
        ativo = BuffAtivo.objects.create(
            usuario=usuario_locked,
            item=item,
            expira_em=timezone.now() + timedelta(hours=item.duracao_horas or 24),
        )
        return {'tipo': 'buff_ativo', 'expira_em': ativo.expira_em}

    # consumivel_partida ou protecao_streak → vai pro inventário
    inventario, _ = InventarioBuff.objects.get_or_create(usuario=usuario_locked, item=item)
    inventario.quantidade += item.quantidade_concedida
    inventario.save(update_fields=['quantidade'])
    return {'tipo': 'inventario', 'quantidade': inventario.quantidade}


def tem_xp_dobro_ativo(usuario) -> bool:
    """Usar dentro de usuarios/services.py::creditar_resultado_partida
    pra dobrar o XP creditado quando True. Ainda não integrado lá — ver
    os pontos pendentes anotados na conversa sobre a loja.
    """
    return BuffAtivo.objects.filter(
        usuario=usuario, item__codigo='xp_dobro', expira_em__gt=timezone.now()
    ).exists()
