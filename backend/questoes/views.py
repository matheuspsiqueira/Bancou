# questoes/views.py
import random

from django.db import transaction
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from usuarios.models import Usuario
from usuarios.views import checar_regeneracao_vidas
from usuarios.services import creditar_resultado_partida, checar_decaimento_streak
from usuarios.serializers import UsuarioSerializer

from loja.models import ItemLoja, InventarioItem, UsoItemPartida

from conquistas.services import avaliar_conquistas
from conquistas.serializers import ConquistaDesbloqueadaSerializer

from .models import Banca, Concurso, Materia, Questao, Partida, RespostaUsuario
from .serializers import (
    BancaSerializer, MateriaSerializer, ConcursoSerializer,
    QuestaoPartidaSerializer,
)
from desafios.services import sortear_desafios_do_dia, avaliar_desafios


# ─── Listas para popular o modal "Iniciar Partida" dinamicamente ──────────

class BancasDisponiveisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bancas = Banca.objects.filter(
            concursos__questoes__status=Questao.Status.APROVADA
        ).distinct()
        return Response(BancaSerializer(bancas, many=True).data)


class MateriasDisponiveisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        materias = Materia.objects.filter(
            questoes__status=Questao.Status.APROVADA
        ).distinct()
        return Response(MateriaSerializer(materias, many=True).data)


class ConcursosDisponiveisView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        concursos = Concurso.objects.filter(
            questoes__status=Questao.Status.APROVADA
        ).distinct().select_related('banca')
        return Response(ConcursoSerializer(concursos, many=True).data)


# ─── Inicia a partida: sorteia questões, DESCONTA 1 VIDA e cria o registro ─

class IniciarPartidaView(APIView):
    """
    GET /api/questoes/iniciar-partida/
    GET /api/questoes/iniciar-partida/?tipo=banca&id=3
    GET /api/questoes/iniciar-partida/?tipo=materia&id=7
    GET /api/questoes/iniciar-partida/?tipo=concurso&id=12&com_tempo=1

    Sorteia até 10 questões aprovadas e cria uma Partida no banco,
    guardando exatamente quais questões foram sorteadas. Consome 1 vida
    do usuário no momento da criação — mecânica de "energia": a vida é
    gasta ao entrar na partida, independente de quantos acertos/erros
    ela tiver. A vida sai primeiro do pote do sistema (recarrega à 00h) e,
    se ele estiver zerado, do pote de vidas extras (compradas/ganhas).
    Retorna as questões (sem gabarito) + o partida_id + o número TOTAL de
    vidas restantes.
    """
    permission_classes = [IsAuthenticated]
    QUANTIDADE = 10

    def get(self, request):
        checar_regeneracao_vidas(request.user)
        checar_decaimento_streak(request.user)
        sortear_desafios_do_dia(request.user)
        request.user.refresh_from_db(fields=['vidas', 'vidas_extras'])

        # Checagem rápida antes de gastar esforço montando o sorteio
        if request.user.vidas_total <= 0:
            return Response(
                {'detail': 'Você não tem vidas suficientes para iniciar uma partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tipo = request.query_params.get('tipo')
        filtro_id = request.query_params.get('id')
        com_tempo = request.query_params.get('com_tempo') == '1'

        questoes = Questao.objects.filter(
            status=Questao.Status.APROVADA,
        ).exclude(
            tipo=Questao.Tipo.DISCURSIVA
        ).select_related(
            'concurso', 'concurso__banca', 'materia'
        ).prefetch_related('alternativas')

        if com_tempo:
            # No modo com tempo, evita questões com contexto longo ou com
            # imagem — exigem mais tempo de leitura do que o timer permite.
            questoes = questoes.exclude(contexto__gt='').exclude(tem_imagem=True)

        if tipo and filtro_id:
            if tipo == 'banca':
                questoes = questoes.filter(concurso__banca_id=filtro_id)
            elif tipo == 'materia':
                questoes = questoes.filter(materia_id=filtro_id)
            elif tipo == 'concurso':
                questoes = questoes.filter(concurso_id=filtro_id)
            else:
                return Response(
                    {'detail': 'Tipo de filtro inválido. Use banca, materia ou concurso.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        total_disponivel = questoes.count()
        if total_disponivel == 0:
            return Response(
                {'detail': 'Nenhuma questão disponível para este filtro.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        ids = list(questoes.values_list('id', flat=True))
        random.shuffle(ids)
        ids_selecionados = ids[:self.QUANTIDADE]

        questoes_selecionadas = Questao.objects.filter(
            id__in=ids_selecionados
        ).select_related(
            'concurso', 'concurso__banca', 'materia'
        ).prefetch_related('alternativas')

        mapa = {q.id: q for q in questoes_selecionadas}
        questoes_ordenadas = [mapa[i] for i in ids_selecionados if i in mapa]

        # Desconta a vida e cria a partida atomicamente, com lock na linha
        # do usuário — evita que 2 toques rápidos em "Iniciar Partida"
        # (ou retry de rede) descontem 2 vidas por engano.
        with transaction.atomic():
            usuario = Usuario.objects.select_for_update().get(pk=request.user.pk)

            if not usuario.gastar_vida():
                return Response(
                    {'detail': 'Você não tem vidas suficientes para iniciar uma partida.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            usuario.save(update_fields=['vidas', 'vidas_extras'])

            partida = Partida.objects.create(
                usuario=usuario,
                questoes_ids=[q.id for q in questoes_ordenadas],
                com_tempo=com_tempo,
            )

        serializer = QuestaoPartidaSerializer(
            questoes_ordenadas, many=True, context={'request': request}
        )
        return Response({
            'partida_id': partida.id,
            'total': len(questoes_ordenadas),
            'questoes': serializer.data,
            'vidas_restantes': usuario.vidas_total,
            'streak': usuario.streak,
        })


# ─── Corrige uma resposta e acumula o resultado na Partida ────────────────

class CorrigirRespostaView(APIView):
    """
    POST /api/questoes/corrigir/
    Body: { "partida_id": 17, "questao_id": 42, "letra": "A" }

    Valida que a questão pertence à partida e ainda não foi respondida
    nela, acumula acerto/erro NO BANCO, e só então informa se a resposta
    está correta + o gabarito. Não mexe em vidas — a vida já foi paga
    integralmente na entrada da partida.

    Também grava um RespostaUsuario (log individual) — usado pelo sistema
    de Conquistas pra avaliar tipos que dependem de banca/matéria
    específica (ex: "acertos_por_banca"), que o contador agregado
    Partida.acertos sozinho não sustenta.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        partida_id = request.data.get('partida_id')
        questao_id = request.data.get('questao_id')
        letra = (request.data.get('letra') or '').strip().upper()

        if not partida_id or not questao_id or not letra:
            return Response(
                {'detail': 'Informe partida_id, questao_id e letra.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            partida = Partida.objects.get(id=partida_id, usuario=request.user, finalizada=False)
        except Partida.DoesNotExist:
            return Response(
                {'detail': 'Partida não encontrada ou já finalizada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            questao_id = int(questao_id)
        except (TypeError, ValueError):
            return Response({'detail': 'questao_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if questao_id not in partida.questoes_ids:
            return Response(
                {'detail': 'Essa questão não pertence a esta partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if questao_id in partida.respondidas_ids:
            return Response(
                {'detail': 'Essa questão já foi respondida nesta partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            questao = Questao.objects.get(id=questao_id, status=Questao.Status.APROVADA)
        except Questao.DoesNotExist:
            return Response(
                {'detail': 'Questão não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        correta = letra == questao.gabarito.strip().upper()

        partida.respondidas_ids.append(questao_id)
        if correta:
            partida.acertos += 1
        else:
            partida.erros += 1
        partida.save(update_fields=['respondidas_ids', 'acertos', 'erros'])

        RespostaUsuario.objects.create(
            usuario=request.user, partida=partida, questao=questao, correta=correta,
        )

        return Response({
            'correta': correta,
            'gabarito': questao.gabarito,
        })


# ─── Usa um buff da loja dentro de uma questão em andamento ────────────────

class UsarBuffView(APIView):
    """
    POST /api/questoes/usar-buff/
    Body: { "partida_id": 17, "questao_id": 42, "codigo_buff": "pula_questao" }

    Consome 1 unidade do item do inventário do usuário (app loja) e aplica
    o efeito na questão dentro da partida. Suporta:

      - pula_questao: marca a questão como respondida com acerto no banco
        (mesmo efeito de um CorrigirRespostaView com acerto), sem que o
        usuário precise escolher uma alternativa.
      - elimina_alternativas: NÃO marca nada como respondida — só sorteia
        e retorna 2 letras de alternativas incorretas pra esconder no
        frontend. O usuário ainda responde normalmente entre as restantes.

    Segue o mesmo princípio de validação server-side do CorrigirRespostaView:
    a questão precisa pertencer à partida e ainda não ter sido respondida.
    """
    permission_classes = [IsAuthenticated]
    CODIGOS_VALIDOS = ['pula_questao', 'elimina_alternativas']

    def post(self, request):
        partida_id = request.data.get('partida_id')
        questao_id = request.data.get('questao_id')
        codigo_buff = request.data.get('codigo_buff')

        if not partida_id or not questao_id or codigo_buff not in self.CODIGOS_VALIDOS:
            return Response(
                {'detail': 'Informe partida_id, questao_id e um codigo_buff válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            partida = Partida.objects.get(id=partida_id, usuario=request.user, finalizada=False)
        except Partida.DoesNotExist:
            return Response(
                {'detail': 'Partida não encontrada ou já finalizada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            questao_id = int(questao_id)
        except (TypeError, ValueError):
            return Response({'detail': 'questao_id inválido.'}, status=status.HTTP_400_BAD_REQUEST)

        if questao_id not in partida.questoes_ids:
            return Response(
                {'detail': 'Essa questão não pertence a esta partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if questao_id in partida.respondidas_ids:
            return Response(
                {'detail': 'Essa questão já foi respondida nesta partida.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            questao = Questao.objects.get(id=questao_id, status=Questao.Status.APROVADA)
        except Questao.DoesNotExist:
            return Response({'detail': 'Questão não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            item = ItemLoja.objects.get(codigo=codigo_buff, ativo=True)
        except ItemLoja.DoesNotExist:
            return Response({'detail': 'Item de loja não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        with transaction.atomic():
            inventario = InventarioItem.objects.select_for_update().filter(
                usuario=request.user, item=item, quantidade__gt=0
            ).first()

            if not inventario:
                return Response(
                    {'detail': 'Você não tem esse item no inventário.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # unique_together em UsoItemPartida impede usar o mesmo item
            # 2x na mesma questão (proteção extra contra retry/duplo toque)
            if UsoItemPartida.objects.filter(partida=partida, questao=questao, item=item).exists():
                return Response(
                    {'detail': 'Esse buff já foi usado nesta questão.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            inventario.quantidade -= 1
            inventario.save(update_fields=['quantidade'])

            UsoItemPartida.objects.create(
                partida=partida, questao=questao, item=item, usuario=request.user,
            )

            avaliar_desafios(request.user)   # NOVO — contabiliza usar_item_hoje na hora do uso

            if codigo_buff == 'pula_questao':
                partida.respondidas_ids.append(questao_id)
                partida.acertos += 1
                partida.save(update_fields=['respondidas_ids', 'acertos'])

                RespostaUsuario.objects.create(
                    usuario=request.user, partida=partida, questao=questao, correta=True,
                )

                return Response({
                    'efeito': 'pula_questao',
                    'correta': True,
                    'gabarito': questao.gabarito,
                    'inventario_restante': inventario.quantidade,
                })

            # elimina_alternativas
            letras_erradas = [
                alt.letra for alt in questao.alternativas.all()
                if alt.letra.strip().upper() != questao.gabarito.strip().upper()
            ]
            random.shuffle(letras_erradas)
            eliminadas = letras_erradas[:2]

            return Response({
                'efeito': 'elimina_alternativas',
                'alternativas_eliminadas': eliminadas,
                'inventario_restante': inventario.quantidade,
            })


# ─── Finaliza a partida: credita XP/moedas a partir do que está no banco ──

class FinalizarPartidaView(APIView):
    """
    POST /api/questoes/finalizar-partida/<partida_id>/
    Body: { "abandonada": false }   (opcional, default false)

    Calcula XP/moedas a partir de partida.acertos/partida.erros (nunca
    de valores enviados pelo app) e credita no usuário. A vida NÃO é
    descontada aqui — já foi descontada na entrada (IniciarPartidaView).
    partida.vidas_perdidas é sempre 1, refletindo o custo fixo de entrada.
    Idempotente: se chamada de novo pra mesma partida, retorna o
    resultado já salvo em vez de creditar duas vezes.

    STREAK: só é atualizado se a partida foi realmente concluída — ou
    seja, todas as questões sorteadas foram respondidas (verificado no
    banco via respondidas_ids, não pela flag "abandonada" do app) e a
    partida não veio marcada como abandonada. Partida abandonada ainda
    credita o XP/moedas dos acertos já feitos, mas não conta o dia.

    Dispara avaliar_conquistas() logo depois de consolidar o resultado —
    é o ponto onde acertos/erros da partida (e os RespostaUsuario
    associados a ela) já estão fechados no banco. Não roda de novo se a
    partida já estava finalizada (branch idempotente acima retorna antes)
    — ou seja, a celebração de conquista só aparece na primeira vez que
    o fim da partida é processado, nunca em retries.

    "conquistas_desbloqueadas" na resposta: lista (pode ser vazia) das
    conquistas destravadas NESSA chamada — o frontend usa isso pra
    mostrar a celebração (som + modal) na ScoreScreen.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, partida_id):
        try:
            partida = Partida.objects.get(id=partida_id, usuario=request.user)
        except Partida.DoesNotExist:
            return Response(
                {'detail': 'Partida não encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if partida.finalizada:
            return Response({
                'xp_ganho': partida.xp_ganho,
                'moedas_ganhas': partida.moedas_ganhas,
                'vidas_perdidas': partida.vidas_perdidas,
                'usuario': UsuarioSerializer(request.user, context={'request': request}).data,
                'conquistas_desbloqueadas': [],
            })

        abandonada = bool(request.data.get('abandonada', False))

        # A verdade está no banco: a partida só é "completa" se todas as
        # questões sorteadas foram respondidas.
        partida_completa = len(partida.respondidas_ids) >= len(partida.questoes_ids)
        contar_streak = partida_completa and not abandonada

        resultado = creditar_resultado_partida(
            usuario=request.user,
            acertos=partida.acertos,
            erros=partida.erros,
            contar_streak=contar_streak,
        )

        partida.finalizada = True
        partida.abandonada = abandonada
        partida.xp_ganho = resultado['xp_ganho']
        partida.moedas_ganhas = resultado['moedas_ganhas']
        partida.vidas_perdidas = 1  # custo fixo, pago na entrada
        partida.finalizada_em = timezone.now()
        partida.save(update_fields=[
            'finalizada', 'abandonada', 'xp_ganho', 'moedas_ganhas',
            'vidas_perdidas', 'finalizada_em',
        ])

        conquistas_desbloqueadas = avaliar_conquistas(request.user)
        avaliar_desafios(request.user)

        return Response({
            'xp_ganho': resultado['xp_ganho'],
            'moedas_ganhas': resultado['moedas_ganhas'],
            'vidas_perdidas': partida.vidas_perdidas,
            'usuario': UsuarioSerializer(request.user, context={'request': request}).data,
            'conquistas_desbloqueadas': ConquistaDesbloqueadaSerializer(
                conquistas_desbloqueadas, many=True, context={'request': request}
            ).data,
        })