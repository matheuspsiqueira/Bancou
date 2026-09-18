# conquistas/serializers.py
from rest_framework import serializers

from .models import Conquista


class ConquistaPerfilSerializer(serializers.ModelSerializer):
    """
    Usado pelo endpoint de perfil (dono ou visitante). O progresso/status
    vem de um mapa {conquista_id: ConquistaUsuario} passado via context
    pela view — evita 1 query por conquista.
    """
    imagem_url = serializers.SerializerMethodField()
    imagem_pb_url = serializers.SerializerMethodField()
    progresso = serializers.SerializerMethodField()
    completada = serializers.SerializerMethodField()
    completada_em = serializers.SerializerMethodField()

    class Meta:
        model = Conquista
        fields = [
            'id', 'nome', 'descricao', 'imagem_url', 'imagem_pb_url',
            'meta', 'progresso', 'completada', 'completada_em',
        ]

    def get_imagem_url(self, obj):
        request = self.context.get('request')
        if obj.imagem and request:
            return request.build_absolute_uri(obj.imagem.url)
        return None

    def get_imagem_pb_url(self, obj):
        request = self.context.get('request')
        if obj.imagem_pb and request:
            return request.build_absolute_uri(obj.imagem_pb.url)
        return None

    def _progresso_usuario(self, obj):
        mapa = self.context.get('progresso_por_conquista', {})
        return mapa.get(obj.id)

    def get_progresso(self, obj):
        cu = self._progresso_usuario(obj)
        return cu.progresso if cu else 0

    def get_completada(self, obj):
        cu = self._progresso_usuario(obj)
        return cu.completada if cu else False

    def get_completada_em(self, obj):
        cu = self._progresso_usuario(obj)
        return cu.completada_em if cu else None