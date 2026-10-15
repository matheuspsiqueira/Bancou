from rest_framework import serializers


class RelatoBugSerializer(serializers.Serializer):
    """Só valida a entrada. Quem relata, e quando, vem do token — não do app."""
    questao_id = serializers.IntegerField(required=False, allow_null=True)
    descricao = serializers.CharField(
        min_length=10, max_length=1000, trim_whitespace=True,
        error_messages={
            'required': 'Descreva o problema.',
            'blank': 'Descreva o problema.',
            'min_length': 'Descreva um pouco mais o problema (mínimo de 10 caracteres).',
            'max_length': 'A descrição é longa demais (máximo de 1000 caracteres).',
        },
    )
    tela_contexto = serializers.CharField(max_length=50, required=False, allow_blank=True, default='partida')
    versao_app = serializers.CharField(max_length=30, required=False, allow_blank=True, default='')
    modelo_aparelho = serializers.CharField(max_length=120, required=False, allow_blank=True, default='')
    versao_so = serializers.CharField(max_length=60, required=False, allow_blank=True, default='')