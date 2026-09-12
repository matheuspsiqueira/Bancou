# loja/admin.py
from django.contrib import admin
from .models import (
    ProdutoIAP,
    CompraIAP,
    ItemLoja,
    InventarioItem,
    BuffAtivo,
    UsoItemPartida,
)


@admin.register(ItemLoja)
class ItemLojaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'codigo', 'preco_moedas', 'tipo_efeito', 'ativo')
    list_editable = ('preco_moedas', 'ativo')
    list_filter = ('tipo_efeito', 'ativo')


@admin.register(ProdutoIAP)
class ProdutoIAPAdmin(admin.ModelAdmin):
    list_display = ('nome', 'sku', 'tipo', 'quantidade', 'ativo')
    list_editable = ('ativo',)
    list_filter = ('tipo', 'ativo')


@admin.register(CompraIAP)
class CompraIAPAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'produto', 'status', 'criada_em')
    list_filter = ('status',)
    readonly_fields = ('purchase_token', 'criada_em', 'validada_em')


admin.site.register(InventarioItem)
admin.site.register(BuffAtivo)
admin.site.register(UsoItemPartida)