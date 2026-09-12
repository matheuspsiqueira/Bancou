# loja/serializers.py
from rest_framework import serializers
from .models import ItemLoja


class ItemLojaSerializer(serializers.ModelSerializer):
    """Serializer de leitura — usado só pelo GET /api/loja/itens/.
    A compra em si (POST /comprar-item/) não usa serializer de entrada,
    só recebe {codigo_item} e valida direto na view.
    """

    class Meta:
        model = ItemLoja
        fields = ['codigo', 'nome', 'descricao', 'preco_moedas', 'tipo_efeito']