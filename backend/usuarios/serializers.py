from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Usuario


class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    aceito_termos = serializers.BooleanField(write_only=True)

    class Meta:
        model = Usuario
        fields = ('nome_completo', 'username', 'email', 'password', 'password2', 'aceito_termos')

    def validate_username(self, value):
        if Usuario.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError('Este nome de usuário já está em uso.')
        return value

    def validate_aceito_termos(self, value):
        if not value:
            raise serializers.ValidationError('Você precisa aceitar os termos de uso.')
        return value

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'As senhas não coincidem.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        validated_data.pop('aceito_termos')
        usuario = Usuario.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            nome_completo=validated_data['nome_completo'],
            password=validated_data['password'],
        )
        return usuario


class UsuarioSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'username', 'nome_completo', 'avatar_url',
            'xp', 'moedas', 'vidas', 'streak',
        )
        # xp/moedas/vidas/streak só mudam via lógica de servidor
        # (registrar-resultado/), nunca direto pelo cliente.
        read_only_fields = ('xp', 'moedas', 'vidas', 'streak')

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class AtualizarPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ('nome_completo', 'username', 'email', 'avatar')
        extra_kwargs = {
            'avatar': {'required': False},
        }

    def validate_username(self, value):
        usuario_atual = self.instance
        if Usuario.objects.filter(username__iexact=value).exclude(pk=usuario_atual.pk).exists():
            raise serializers.ValidationError('Este nome de usuário já está em uso.')
        return value

    def validate_email(self, value):
        usuario_atual = self.instance
        if Usuario.objects.filter(email__iexact=value).exclude(pk=usuario_atual.pk).exists():
            raise serializers.ValidationError('Este e-mail já está em uso.')
        return value


class AlterarSenhaSerializer(serializers.Serializer):
    senha_atual = serializers.CharField(write_only=True)
    nova_senha = serializers.CharField(write_only=True, validators=[validate_password])
    nova_senha2 = serializers.CharField(write_only=True)

    def validate_senha_atual(self, value):
        usuario = self.context['request'].user
        if not usuario.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value

    def validate(self, attrs):
        if attrs['nova_senha'] != attrs['nova_senha2']:
            raise serializers.ValidationError({'nova_senha': 'As senhas não coincidem.'})
        return attrs

    def save(self):
        usuario = self.context['request'].user
        usuario.set_password(self.validated_data['nova_senha'])
        usuario.save()
        return usuario


class RegistrarResultadoSerializer(serializers.Serializer):
    """
    Recebe o resultado consolidado de UMA partida e calcula no servidor
    as variações de XP, moedas e vidas. O app nunca envia "xp_ganho" pronto
    — só o que aconteceu na partida — pra evitar manipulação de payload.
    """
    acertos = serializers.IntegerField(min_value=0)
    erros = serializers.IntegerField(min_value=0)
    abandonada = serializers.BooleanField(default=False)

    XP_POR_ACERTO = 10
    MOEDAS_POR_ACERTO = 2

    def validate(self, attrs):
        if attrs['acertos'] + attrs['erros'] > 10:
            raise serializers.ValidationError('Uma partida tem no máximo 10 questões.')
        return attrs

    def save(self):
        usuario = self.context['request'].user
        acertos = self.validated_data['acertos']
        erros = self.validated_data['erros']

        xp_ganho = acertos * self.XP_POR_ACERTO
        moedas_ganhas = acertos * self.MOEDAS_POR_ACERTO
        vidas_perdidas = min(erros, usuario.vidas)

        usuario.xp += xp_ganho
        usuario.moedas += moedas_ganhas
        usuario.vidas = max(0, usuario.vidas - vidas_perdidas)
        usuario.save(update_fields=['xp', 'moedas', 'vidas'])

        return {
            'xp_ganho': xp_ganho,
            'moedas_ganhas': moedas_ganhas,
            'vidas_perdidas': vidas_perdidas,
            'usuario': usuario,
        }