import logging

from django.conf import settings
from django.db.models import F, IntegerField, Q
from django.db.models.functions import Greatest
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import AllowAny
from .models import Usuario, AnuncioVidaExtra
from . import anuncios
from .serializers import (
    RegistroSerializer,
    UsuarioSerializer,
    AtualizarPerfilSerializer,
    SolicitarTrocaEmailSerializer,
    AlterarSenhaSerializer,
    RegistrarResultadoSerializer,
    SolicitarRecuperacaoSenhaSerializer,
    ConfirmarRecuperacaoSenhaSerializer,
    VerificarEmailSerializer,
    SolicitarExclusaoContaSerializer,
    ConfirmarExclusaoContaSerializer,
    NotificacaoConfigSerializer,
)
from usuarios.services import checar_decaimento_streak

logger = logging.getLogger(__name__)


class RegistroView(generics.CreateAPIView):
    serializer_class = RegistroSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Cadastro realizado! Enviamos um e-mail de confirmação — verifique sua caixa de entrada para ativar a conta.'},
            status=status.HTTP_201_CREATED,
        )


class VerificarEmailView(generics.GenericAPIView):
    """
    POST /api/usuarios/verificar-email/
    Body: { "token": "..." }
    Chamado pela página web de confirmação — serve tanto pra ativar a
    conta no cadastro quanto pra efetivar uma troca de e-mail pendente.

    authentication_classes=[] é proposital: esse endpoint é acessado por
    uma página anônima via fetch simples (sem JWT). Sem isso, se o
    navegador tiver uma sessão de admin logada, o SessionAuthentication
    padrão do DRF detecta essa sessão e passa a exigir CSRF token —
    retornando 403 mesmo com permission_classes=[AllowAny], porque
    autenticação e permissão são checadas em etapas separadas.
    """
    serializer_class = VerificarEmailSerializer
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'E-mail verificado com sucesso!'}, status=status.HTTP_200_OK)


class SolicitarTrocaEmailView(generics.GenericAPIView):
    """
    POST /api/usuarios/trocar-email/
    Body: { "email": "novo@email.com" }
    Autenticado. Envia um link de confirmação para o NOVO e-mail. A troca
    só é efetivada quando esse link é clicado (VerificarEmailView) — até
    lá, o login continua exigindo o e-mail atual.
    """
    serializer_class = SolicitarTrocaEmailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Enviamos um link de confirmação para o novo e-mail.'},
            status=status.HTTP_200_OK,
        )


class PerfilView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        checar_regeneracao_vidas(request.user)
        checar_decaimento_streak(request.user)
        serializer = UsuarioSerializer(request.user, context={'request': request})
        return Response(serializer.data)

    def patch(self, request):
        serializer = AtualizarPerfilSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UsuarioSerializer(request.user, context={'request': request}).data)

    def delete(self, request):
        user = request.user
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AlterarSenhaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = AlterarSenhaSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Senha alterada com sucesso.'}, status=status.HTTP_200_OK)


class NotificacaoConfigView(APIView):
    """
    PATCH /api/usuarios/notificacoes/
    Body: { "notificacoes_ativadas": true/false, "expo_push_token": "..." }
    Ambos os campos são opcionais e independentes — ver docstring do
    NotificacaoConfigSerializer. Usado tanto pelo toggle na PerfilScreen
    quanto pelo registro automático do token feito pelo AuthContext no
    login/abertura do app.
    """
    permission_classes = [permissions.IsAuthenticated]

    def patch(self, request):
        serializer = NotificacaoConfigSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UsuarioSerializer(request.user, context={'request': request}).data)


class DispararNotificacoesAgendadasView(APIView):
    """
    POST /api/usuarios/notificacoes/disparar-agendadas/
    Chamado pelo workflow do GitHub Actions a cada poucos minutos, nunca
    pelo app — por isso AllowAny + sem autenticação JWT (quem chama não é
    um usuário logado), protegido em vez disso por um segredo compartilhado
    no header X-Cron-Secret (settings.NOTIFICACOES_CRON_SECRET). A lógica
    de verdade mora em usuarios/notificacoes.py (hierarquia de prioridade,
    idempotência via NotificacaoEnviada) — esta view só autentica e chama.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        segredo_esperado = getattr(settings, 'NOTIFICACOES_CRON_SECRET', '')
        segredo_recebido = request.headers.get('X-Cron-Secret', '')
        if not segredo_esperado or segredo_recebido != segredo_esperado:
            return Response({'detail': 'Não autorizado.'}, status=status.HTTP_403_FORBIDDEN)

        from .notificacoes import processar_notificacoes_agendadas
        contagem = processar_notificacoes_agendadas()
        return Response({'enviadas': contagem}, status=status.HTTP_200_OK)


class RegistrarResultadoView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = RegistrarResultadoSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        resultado = serializer.save()

        usuario = resultado['usuario']
        return Response({
            'xp_ganho': resultado['xp_ganho'],
            'moedas_ganhas': resultado['moedas_ganhas'],
            'vidas_perdidas': resultado['vidas_perdidas'],
            'usuario': UsuarioSerializer(usuario, context={'request': request}).data,
        }, status=status.HTTP_200_OK)


class RecuperarVidaView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        usuario = request.user
        if usuario.vidas >= Usuario.VIDAS_MAXIMAS:
            return Response(
                {'detail': 'Você já está com o número máximo de vidas.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        usuario.vidas += 1
        usuario.save(update_fields=['vidas'])
        return Response(UsuarioSerializer(usuario, context={'request': request}).data)


class AnuncioVidaExtraIniciarView(APIView):
    """
    POST /api/usuarios/anuncios/vida-extra/iniciar/
    1º passo do fluxo do anúncio premiado no alert "sem vidas": devolve um
    `token` que o app passa ao AdMob como `custom_data`. A vida NÃO é
    creditada aqui — só quando o Google confirmar o anúncio (AnuncioSSVView).
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'anuncio-vida-iniciar'

    def post(self, request):
        usuario = request.user
        if usuario.vidas > 0:
            return Response(
                {'detail': 'Você ainda tem vidas disponíveis.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        restantes = AnuncioVidaExtra.restantes_hoje(usuario)
        if restantes <= 0:
            return Response(
                {'detail': 'Você já usou todos os anúncios de vida de hoje.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Faxina: tentativas antigas que nunca foram confirmadas.
        AnuncioVidaExtra.objects.filter(
            usuario=usuario,
            confirmado_em__isnull=True,
            criado_em__lt=timezone.now() - anuncios.VALIDADE_TOKEN,
        ).delete()

        registro = AnuncioVidaExtra.objects.create(usuario=usuario)
        return Response({'token': registro.token, 'restantes': restantes})


class AnuncioSSVView(APIView):
    """
    GET /api/usuarios/anuncios/ssv/
    Callback chamado pelo GOOGLE (não pelo app) quando o usuário conclui um
    anúncio premiado. Configurar essa URL no bloco "Vida Extra Rewarded" em
    AdMob → Blocos de anúncios → Verificação do lado do servidor.

    Só credita a vida se a assinatura do Google for válida. Responde 200 para
    qualquer callback autêntico (mesmo sem crédito) para o Google não reenviar.
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        if not anuncios.verificar_assinatura_ssv(request.META.get('QUERY_STRING', '')):
            logger.warning('SSV: assinatura inválida.')
            return Response({'detail': 'Assinatura inválida.'}, status=status.HTTP_403_FORBIDDEN)

        params = request.query_params
        if not anuncios.unidade_confere(params.get('ad_unit', '')):
            logger.warning('SSV: ad_unit inesperado (%s).', params.get('ad_unit'))
            return Response({'detail': 'unidade_desconhecida'}, status=status.HTTP_200_OK)

        resultado = anuncios.creditar_vida_por_anuncio(
            token=params.get('custom_data', ''),
            usuario_id=params.get('user_id'),
            transaction_id=params.get('transaction_id'),
        )
        logger.info('SSV: resultado=%s user_id=%s', resultado, params.get('user_id'))
        return Response({'detail': resultado}, status=status.HTTP_200_OK)


class AnuncioConfirmarTesteView(APIView):
    """
    POST /api/usuarios/anuncios/vida-extra/confirmar-teste/
    Body: { "token": "..." }
    SÓ PARA DESENVOLVIMENTO: com anúncios de teste do Google (IDs de exemplo)
    o Google não envia o callback SSV, então este endpoint confirma direto.
    Fica DESLIGADO por padrão: só funciona com ANUNCIOS_CONFIRMACAO_DIRETA=True
    no ambiente. Em produção NUNCA ligar (seria o furo de segurança de volta).
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if not settings.ANUNCIOS_CONFIRMACAO_DIRETA:
            return Response(
                {'detail': 'Indisponível neste ambiente.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        resultado = anuncios.creditar_vida_por_anuncio(
            token=request.data.get('token', ''),
            usuario_id=request.user.pk,
        )
        if resultado != anuncios.OK:
            return Response({'detail': resultado}, status=status.HTTP_400_BAD_REQUEST)
        request.user.refresh_from_db()
        return Response(UsuarioSerializer(request.user, context={'request': request}).data)


def checar_regeneracao_vidas(usuario):
    """
    Recarga diária: à 00h de Brasília (TIME_ZONE = America/Sao_Paulo), todo
    usuário volta a ter pelo menos VIDAS_MAXIMAS vidas — nunca tira vidas
    acima disso (ex.: compradas na loja). Roda sob demanda (perfil, iniciar
    partida, cron de notificações) e é atômica: só uma requisição por dia
    aplica a recarga, sem risco de sobrescrever um desconto de vida feito
    em paralelo.
    """
    agora = timezone.now()
    inicio_do_dia = timezone.localtime(agora).replace(hour=0, minute=0, second=0, microsecond=0)
    Usuario.objects.filter(pk=usuario.pk).filter(
        Q(vidas_atualizadas_em__isnull=True) | Q(vidas_atualizadas_em__lt=inicio_do_dia)
    ).update(
        vidas=Greatest(F('vidas'), Usuario.VIDAS_MAXIMAS, output_field=IntegerField()),
        vidas_atualizadas_em=agora,
    )
    usuario.refresh_from_db(fields=['vidas', 'vidas_atualizadas_em'])


class SolicitarRecuperacaoSenhaView(generics.GenericAPIView):
    serializer_class = SolicitarRecuperacaoSenhaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'recuperar-senha-solicitar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Se o e-mail existir em nossa base, um código foi enviado.'},
            status=status.HTTP_200_OK,
        )


class ConfirmarRecuperacaoSenhaView(generics.GenericAPIView):
    serializer_class = ConfirmarRecuperacaoSenhaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'recuperar-senha-confirmar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Senha redefinida com sucesso.'}, status=status.HTTP_200_OK)


class SolicitarExclusaoContaView(generics.GenericAPIView):
    """
    POST /api/usuarios/excluir-conta/solicitar/
    Body: { "email": "..." }
    Chamado pela página pública `/excluir-conta/` (sem login). Exigência
    da Play Store (Data Safety): precisa existir um link público de
    exclusão de conta que não dependa do app instalado nem de sessão
    autenticada.
    """
    serializer_class = SolicitarExclusaoContaSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'excluir-conta-solicitar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {'detail': 'Se o e-mail existir em nossa base, enviamos um link de confirmação.'},
            status=status.HTTP_200_OK,
        )


class ConfirmarExclusaoContaView(generics.GenericAPIView):
    """
    POST /api/usuarios/excluir-conta/confirmar/
    Body: { "token": "..." }
    Chamado pela página web de confirmação final. authentication_classes=[]
    pelo mesmo motivo do VerificarEmailView (ver docstring acima): evita
    que uma sessão de admin ativa no navegador force checagem de CSRF
    num endpoint AllowAny.
    """
    serializer_class = ConfirmarExclusaoContaSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'excluir-conta-confirmar'

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({'detail': 'Conta excluída com sucesso.'}, status=status.HTTP_200_OK)