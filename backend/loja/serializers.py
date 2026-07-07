# loja/serializers.py
from rest_framework import serializers
from .models import ItemLojaVirtual


class ItemLojaVirtualSerializer(serializers.ModelSerializer):
    """Serializer de leitura — usado só pelo GET /api/loja/itens/.
    A compra em si (POST /comprar-item/) não usa serializer de entrada,
    só recebe {codigo_item} e valida direto na view.
    """

    class Meta:
        model = ItemLojaVirtual
        fields = ['codigo', 'nome', 'descricao', 'preco_moedas', 'tipo_efeito']
