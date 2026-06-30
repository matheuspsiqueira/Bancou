# questoes/serializers.py
from rest_framework import serializers
from .models import Banca, Concurso, Materia, Questao, Alternativa


class BancaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banca
        fields = ['id', 'nome']


class MateriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Materia
        fields = ['id', 'nome']


class ConcursoSerializer(serializers.ModelSerializer):
    banca_nome = serializers.CharField(source='banca.nome', read_only=True)

    class Meta:
        model = Concurso
        fields = ['id', 'nome', 'cargo', 'ano', 'banca', 'banca_nome']


class AlternativaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Alternativa
        fields = ['id', 'letra', 'texto']


class QuestaoPartidaSerializer(serializers.ModelSerializer):
    """
    Serializer usado durante a partida.
    NÃO inclui o campo `gabarito` — o cliente não deve receber a resposta
    correta antes de responder. A correção é validada no backend.
    """
    alternativas = AlternativaSerializer(many=True, read_only=True)
    materia_nome = serializers.CharField(source='materia.nome', read_only=True, default=None)
    concurso_nome = serializers.CharField(source='concurso.nome', read_only=True)
    banca_nome = serializers.CharField(source='concurso.banca.nome', read_only=True)

    class Meta:
        model = Questao
        fields = [
            'id', 'numero', 'tipo', 'enunciado', 'contexto',
            'tem_imagem', 'imagem',
            'materia_nome', 'concurso_nome', 'banca_nome',
            'alternativas',
        ]