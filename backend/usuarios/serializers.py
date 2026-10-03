from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Usuario, AnuncioVidaExtra
from .emails import enviar_email_html
import random
import secrets
from datetime import timedelta
from django.utils import timezone


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
        usuario.is_active = False
        usuario.token_verificacao_email = secrets.token_urlsafe(32)
        usuario.save(update_fields=['is_active', 'token_verificacao_email'])

        request = self.context.get('request')
        link = request.build_absolute_uri(f'/verificar-email/?token={usuario.token_verificacao_email}')
        primeiro_nome = usuario.nome_completo.strip().split(' ')[0] if usuario.nome_completo else usuario.username
        enviar_email_html(
            destinatario=usuario.email,
            assunto='Bancou — Confirme seu e-mail',
            template_name='confirmar_cadastro',
            contexto={'nome': primeiro_nome, 'link': link},
            texto_alternativo=(
                'Falta pouco! Clique no link abaixo para confirmar seu e-mail e ativar sua conta:\n\n'
                f'{link}\n\n'
                'Se você não criou uma conta no Bancou, ignore este e-mail.'
            ),
        )
        return usuario


class UsuarioSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    anuncios_vida_restantes = serializers.SerializerMethodField()
    # O app enxerga o TOTAL de vidas (sistema + extras), então nada muda no frontend.
    vidas = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = (
            'id', 'email', 'username', 'nome_completo', 'avatar_url',
            'xp', 'moedas', 'vidas', 'streak', 'anuncios_vida_restantes',
            'notificacoes_ativadas',
        )
        read_only_fields = (
            'xp', 'moedas', 'vidas', 'streak', 'anuncios_vida_restantes',
            'notificacoes_ativadas',
        )

    def get_vidas(self, obj):
        return obj.vidas_total

    def get_anuncios_vida_restantes(self, obj):
        return AnuncioVidaExtra.restantes_hoje(obj)

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None


class AtualizarPerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ('nome_completo', 'username', 'avatar')
        extra_kwargs = {'avatar': {'required': False}}

    def validate_avatar(self, value):
        if value:
            MAX_MB = 5
            if value.size > MAX_MB * 1024 * 1024:
                raise serializers.ValidationError(f'A imagem deve ter no máximo {MAX_MB}MB.')
            tipos_permitidos = ('image/jpeg', 'image/png', 'image/webp')
            if value.content_type not in tipos_permitidos:
                raise serializers.ValidationError('Formato de imagem inválido. Use JPEG, PNG ou WEBP.')
        return value

    def validate_username(self, value):
        usuario_atual = self.instance
        if Usuario.objects.filter(username__iexact=value).exclude(pk=usuario_atual.pk).exists():
            raise serializers.ValidationError('Este nome de usuário já está em uso.')
        return value


class SolicitarTrocaEmailSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        usuario = self.context['request'].user
        if value.lower() == usuario.email.lower():
            raise serializers.ValidationError('Esse já é o seu e-mail atual.')
        if Usuario.objects.filter(email__iexact=value).exclude(pk=usuario.pk).exists():
            raise serializers.ValidationError('Este e-mail já está em uso por outra conta.')
        return value

    def save(self):
        usuario = self.context['request'].user
        usuario.email_pendente = self.validated_data['email']
        usuario.token_verificacao_email = secrets.token_urlsafe(32)
        usuario.save(update_fields=['email_pendente', 'token_verificacao_email'])

        request = self.context['request']
        link = request.build_absolute_uri(f'/verificar-email/?token={usuario.token_verificacao_email}')
        enviar_email_html(
            destinatario=usuario.email_pendente,
            assunto='Bancou — Confirme seu novo e-mail',
            template_name='confirmar_troca_email',
            contexto={'link': link},
            texto_alternativo=(
                'Você solicitou a troca do e-mail da sua conta Bancou. '
                'Clique no link abaixo para confirmar este novo endereço:\n\n'
                f'{link}\n\n'
                'Se você não solicitou essa troca, ignore este e-mail — seu e-mail atual continua o mesmo.'
            ),
        )
        return usuario


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
        import datetime
        from django.utils import timezone

        usuario = self.context['request'].user
        acertos = self.validated_data['acertos']
        erros = self.validated_data['erros']

        xp_ganho = acertos * self.XP_POR_ACERTO
        moedas_ganhas = acertos * self.MOEDAS_POR_ACERTO
        vidas_perdidas = min(erros, usuario.vidas)

        usuario.xp += xp_ganho
        usuario.moedas += moedas_ganhas
        usuario.vidas = max(0, usuario.vidas - vidas_perdidas)

        hoje = timezone.localdate()
        ultima = usuario.data_ultima_partida

        if ultima is None:
            usuario.streak = 1
        elif ultima == hoje:
            pass
        elif ultima == hoje - datetime.timedelta(days=1):
            usuario.streak += 1
        else:
            usuario.streak = 1

        usuario.data_ultima_partida = hoje
        usuario.save(update_fields=['xp', 'moedas', 'vidas', 'streak', 'data_ultima_partida'])

        return {
            'xp_ganho': xp_ganho,
            'moedas_ganhas': moedas_ganhas,
            'vidas_perdidas': vidas_perdidas,
            'usuario': usuario,
        }


class SolicitarRecuperacaoSenhaSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        self.usuario = Usuario.objects.filter(email__iexact=value).first()
        return value

    def save(self):
        if self.usuario:
            codigo = f'{random.randint(0, 999999):06d}'
            self.usuario.codigo_recuperacao_senha = codigo
            self.usuario.codigo_recuperacao_expira_em = timezone.now() + timedelta(minutes=15)
            self.usuario.save(update_fields=['codigo_recuperacao_senha', 'codigo_recuperacao_expira_em'])

            enviar_email_html(
                destinatario=self.usuario.email,
                assunto='Bancou — Código de recuperação de senha',
                template_name='codigo_recuperacao',
                contexto={'codigo': codigo, 'expira_minutos': 15},
                texto_alternativo=(
                    f'Seu código de recuperação de senha é: {codigo}\n\n'
                    'Ele expira em 15 minutos. Se você não solicitou isso, ignore este e-mail.'
                ),
            )


class ConfirmarRecuperacaoSenhaSerializer(serializers.Serializer):
    email = serializers.EmailField()
    codigo = serializers.CharField(max_length=6)
    nova_senha = serializers.CharField(write_only=True, validators=[validate_password])
    nova_senha2 = serializers.CharField(write_only=True)

    def validate(self, attrs):
        if attrs['nova_senha'] != attrs['nova_senha2']:
            raise serializers.ValidationError({'nova_senha': 'As senhas não coincidem.'})

        usuario = Usuario.objects.filter(email__iexact=attrs['email']).first()

        codigo_invalido = (
            not usuario
            or not usuario.codigo_recuperacao_senha
            or usuario.codigo_recuperacao_senha != attrs['codigo']
            or usuario.codigo_recuperacao_expira_em is None
            or timezone.now() > usuario.codigo_recuperacao_expira_em
        )
        if codigo_invalido:
            raise serializers.ValidationError({'codigo': 'Código inválido ou expirado.'})

        self.usuario = usuario
        return attrs

    def save(self):
        self.usuario.set_password(self.validated_data['nova_senha'])
        self.usuario.codigo_recuperacao_senha = None
        self.usuario.codigo_recuperacao_expira_em = None
        self.usuario.save(update_fields=['password', 'codigo_recuperacao_senha', 'codigo_recuperacao_expira_em'])
        return self.usuario


class VerificarEmailSerializer(serializers.Serializer):
    """
    Usado pela página web de confirmação (app `landing`), não pelo app.
    Um único token cumpre dois papéis diferentes, dependendo do estado
    do usuário no momento da confirmação:
      - conta ainda inativa (is_active=False)  -> ativa a conta (cadastro)
      - conta ativa com email_pendente setado  -> efetiva a troca de e-mail
    Token é de uso único: some do banco assim que consumido.
    """
    token = serializers.CharField()

    def validate_token(self, value):
        usuario = Usuario.objects.filter(token_verificacao_email=value).first()
        if not usuario:
            raise serializers.ValidationError('Link inválido ou já utilizado.')
        self.usuario = usuario
        return value

    def save(self):
        usuario = self.usuario
        if not usuario.is_active:
            usuario.is_active = True
        elif usuario.email_pendente:
            usuario.email = usuario.email_pendente
            usuario.email_pendente = None
        usuario.token_verificacao_email = None
        usuario.save(update_fields=['is_active', 'email', 'email_pendente', 'token_verificacao_email'])
        return usuario


class SolicitarExclusaoContaSerializer(serializers.Serializer):
    """
    Usado pela página pública `/excluir-conta/` (exigência da Play Store:
    link público de exclusão que não depende de login nem do app
    instalado). Não revela se o e-mail existe na base — mesma postura da
    recuperação de senha — pra não vazar quais e-mails estão cadastrados.
    """
    email = serializers.EmailField()

    def validate_email(self, value):
        self.usuario = Usuario.objects.filter(email__iexact=value).first()
        return value

    def save(self):
        if self.usuario:
            self.usuario.token_exclusao_conta = secrets.token_urlsafe(32)
            self.usuario.token_exclusao_expira_em = timezone.now() + timedelta(minutes=30)
            self.usuario.save(update_fields=['token_exclusao_conta', 'token_exclusao_expira_em'])

            request = self.context.get('request')
            link = request.build_absolute_uri(
                f'/excluir-conta/confirmar/?token={self.usuario.token_exclusao_conta}'
            )
            primeiro_nome = (
                self.usuario.nome_completo.strip().split(' ')[0]
                if self.usuario.nome_completo else self.usuario.username
            )
            enviar_email_html(
                destinatario=self.usuario.email,
                assunto='Bancou — Confirme a exclusão da sua conta',
                template_name='confirmar_exclusao_conta',
                contexto={'nome': primeiro_nome, 'link': link, 'expira_minutos': 30},
                texto_alternativo=(
                    f'Olá, {primeiro_nome}.\n\n'
                    'Recebemos uma solicitação para excluir sua conta no Bancou. Essa ação é '
                    'irreversível: todo o seu progresso (XP, moedas, streak, conquistas) e seus '
                    'dados pessoais serão apagados permanentemente.\n\n'
                    'Se foi você quem solicitou, clique no link abaixo para confirmar:\n\n'
                    f'{link}\n\n'
                    'Este link expira em 30 minutos. Se você não solicitou essa exclusão, ignore '
                    'este e-mail — sua conta continua normalmente.'
                ),
            )


class ConfirmarExclusaoContaSerializer(serializers.Serializer):
    """
    Usado pela página web de confirmação final `/excluir-conta/confirmar/`.
    Token de uso único e com expiração — diferente do token de verificação
    de e-mail, aqui a ação é destrutiva e irreversível, então o link não
    pode ficar válido indefinidamente.
    """
    token = serializers.CharField()

    def validate_token(self, value):
        usuario = Usuario.objects.filter(token_exclusao_conta=value).first()
        token_invalido = (
            not usuario
            or usuario.token_exclusao_expira_em is None
            or timezone.now() > usuario.token_exclusao_expira_em
        )
        if token_invalido:
            raise serializers.ValidationError('Link inválido ou expirado.')
        self.usuario = usuario
        return value

    def save(self):
        usuario = self.usuario
        usuario.delete()
        return usuario


class NotificacaoConfigSerializer(serializers.ModelSerializer):
    """
    Usado pela PerfilScreen (toggle de notificações) e pelo registro
    automático de token no login/abertura do app. Os dois campos são
    opcionais e independentes: o app manda só o que mudou — por exemplo,
    só `expo_push_token` ao reabrir o app com o toggle já ligado, ou só
    `notificacoes_ativadas` quando o usuário liga/desliga manualmente.
    """
    class Meta:
        model = Usuario
        fields = ('notificacoes_ativadas', 'expo_push_token')
        extra_kwargs = {
            'notificacoes_ativadas': {'required': False},
            'expo_push_token': {'required': False, 'allow_blank': True, 'allow_null': True},
        }