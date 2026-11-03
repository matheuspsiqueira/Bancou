# questoes/serializers.py
from rest_framework import serializers
from .models import Banca, Concurso, Materia, Questao, QuestaoImagem, Alternativa


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
    orgao_nome = serializers.CharField(source='orgao.nome', read_only=True, default=None)

    class Meta:
        model = Concurso
        fields = ['id', 'nome', 'cargo', 'ano', 'banca', 'banca_nome', 'orgao', 'orgao_nome', 'uf', 'nivel']


class AlternativaSerializer(serializers.ModelSerializer):
    # `imagem` vem null quando a alternativa é só texto (ou a imagem ainda não foi enviada).
    class Meta:
        model = Alternativa
        fields = ['id', 'letra', 'texto', 'imagem']


class QuestaoImagemSerializer(serializers.ModelSerializer):
    # `imagem` vem null enquanto o arquivo não foi enviado — o app ignora essas.
    class Meta:
        model = QuestaoImagem
        fields = ['ordem', 'imagem', 'legenda']


class QuestaoPartidaSerializer(serializers.ModelSerializer):
    """
    Serializer usado durante a partida.
    NÃO inclui o campo `gabarito` — o cliente não deve receber a resposta
    correta antes de responder. A correção é validada no backend.
    """
    alternativas = AlternativaSerializer(many=True, read_only=True)
    imagens = QuestaoImagemSerializer(many=True, read_only=True)
    materia_nome = serializers.CharField(source='materia.nome', read_only=True, default=None)
    concurso_nome = serializers.CharField(source='concurso.nome', read_only=True)
    banca_nome = serializers.CharField(source='concurso.banca.nome', read_only=True)

    class Meta:
        model = Questao
        fields = [
            'id', 'numero', 'tipo', 'enunciado', 'contexto',
            'tem_imagem', 'imagem', 'posicao_imagem', 'imagens',
            'materia_nome', 'concurso_nome', 'banca_nome',
            'alternativas',
        ]


class QuestaoHistoricoSerializer(QuestaoPartidaSerializer):
    """
    Serializer do histórico: igual ao da partida, MAS com o `gabarito`.
    Só é usado em respostas que o próprio usuário já deu (ver historico.py),
    então não entrega a resposta de uma questão que ele ainda vai jogar.
    """

    class Meta(QuestaoPartidaSerializer.Meta):
        fields = QuestaoPartidaSerializer.Meta.fields + ['gabarito']