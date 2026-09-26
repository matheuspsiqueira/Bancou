# desafios/serializers.py
from rest_framework import serializers

from .models import DesafioUsuario


class DesafioUsuarioSerializer(serializers.ModelSerializer):
    """
    Uma linha da listagem do InicioScreen: progresso já pronto pra exibir
    como "X/Y", descrição curta do desafio e a recompensa. Achata os
    campos de Desafio (via source) porque o frontend não precisa saber
    que existem dois models por trás disso.
    """
    nome = serializers.CharField(source='desafio.nome')
    descricao = serializers.CharField(source='desafio.descricao')
    meta = serializers.IntegerField(source='desafio.meta')
    recompensa_xp = serializers.IntegerField(source='desafio.recompensa_xp')
    recompensa_moedas = serializers.IntegerField(source='desafio.recompensa_moedas')

    class Meta:
        model = DesafioUsuario
        fields = [
            'id', 'nome', 'descricao', 'meta', 'progresso', 'completado',
            'recompensa_xp', 'recompensa_moedas',
        ]