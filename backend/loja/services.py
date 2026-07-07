from django.db import transaction
from django.utils import timezone
from datetime import timedelta

from .models import ProdutoLoja, CompraLoja, ItemLojaVirtual, InventarioBuff, BuffAtivo


class SaldoInsuficienteError(Exception):
    pass


class CompraJaProcessadaError(Exception):
    pass


@transaction.atomic
def creditar_compra_iap(usuario, produto: ProdutoLoja, purchase_token: str):
    """Credita uma compra com dinheiro real já validada contra a Play Developer API / App Store.
    NUNCA chamar antes de validar o token junto ao Google/Apple.
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
    elif produto.tipo == 'vida_avulsa':
        usuario_locked.vidas += produto.quantidade  # pode passar do teto — decisão já confirmada com Matheus

    usuario_locked.save(update_fields=['moedas', 'vidas'])
    return compra


@transaction.atomic
def comprar_item_virtual(usuario, codigo_item: str):
    """Compra qualquer item da loja de moedas: buffs ou vida extra."""
    item = ItemLojaVirtual.objects.get(codigo=codigo_item, ativo=True)

    usuario_locked = usuario.__class__.objects.select_for_update().get(pk=usuario.pk)

    if usuario_locked.moedas < item.preco_moedas:
        raise SaldoInsuficienteError("Moedas insuficientes.")

    usuario_locked.moedas -= item.preco_moedas

    if item.tipo_efeito == 'credito_direto':
        # vida_extra — passa do teto de VIDAS_MAXIMAS, decisão já validada com Matheus
        usuario_locked.vidas += item.quantidade_concedida
        usuario_locked.save(update_fields=['moedas', 'vidas'])
        return {'tipo': 'vida_extra', 'vidas_atuais': usuario_locked.vidas}

    usuario_locked.save(update_fields=['moedas'])

    if item.tipo_efeito == 'temporario':
        ativo = BuffAtivo.objects.create(
            usuario=usuario_locked,
            item=item,
            expira_em=timezone.now() + timedelta(hours=item.duracao_horas),
        )
        return {'tipo': 'buff_ativo', 'expira_em': ativo.expira_em}

    # consumivel_partida ou protecao_streak → vai pro inventário
    inventario, _ = InventarioBuff.objects.get_or_create(usuario=usuario_locked, item=item)
    inventario.quantidade += item.quantidade_concedida
    inventario.save(update_fields=['quantidade'])
    return {'tipo': 'inventario', 'quantidade': inventario.quantidade}