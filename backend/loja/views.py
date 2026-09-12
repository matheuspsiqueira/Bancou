# loja/views.py
from rest_framework.views import APIView
from rest_framework.generics import ListAPIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from .models import ItemLoja, InventarioItem
from .serializers import ItemLojaSerializer
from .services import comprar_item_virtual, SaldoInsuficienteError


class ItensLojaView(ListAPIView):
    """GET /api/loja/itens/
    Catálogo de itens ativos comprados com moedas do jogo. 100% dinâmico —
    o frontend nunca deve hardcodar essa lista (mesmo padrão dos filtros
    de partida em questoes/views.py).
    """
    serializer_class = ItemLojaSerializer
    permission_classes = [IsAuthenticated]
    queryset = ItemLoja.objects.filter(ativo=True).order_by('preco_moedas')


class ComprarItemView(APIView):
    """POST /api/loja/comprar-item/
    Body esperado: {"codigo_item": "vida_extra"}

    Nunca confia em saldo/efeito vindo do app — tudo é recalculado e
    validado no servidor via comprar_item_virtual (mesmo princípio do
    CorrigirRespostaView em questoes/views.py).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        codigo_item = request.data.get('codigo_item')
        if not codigo_item:
            return Response(
                {'detail': 'codigo_item é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultado = comprar_item_virtual(request.user, codigo_item)
        except ItemLoja.DoesNotExist:
            return Response(
                {'detail': 'Item não encontrado ou indisponível.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        except SaldoInsuficienteError:
            return Response(
                {'detail': 'Moedas insuficientes.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        request.user.refresh_from_db()

        resposta = {
            'saldo_moedas': request.user.moedas,
            'tipo_resultado': resultado['tipo'],
        }
        if resultado['tipo'] == 'vida_extra':
            resposta['vidas_atuais'] = resultado['vidas_atuais']
        elif resultado['tipo'] == 'buff_ativo':
            resposta['expira_em'] = resultado['expira_em']
        elif resultado['tipo'] == 'inventario':
            resposta['quantidade'] = resultado['quantidade']

        return Response(resposta, status=status.HTTP_200_OK)


class InventarioLojaView(APIView):
    """GET /api/loja/inventario/
    Retorna {codigo_item: quantidade} pra cada item consumível que o
    usuário tem em estoque (quantidade > 0). Usado pela PartidaScreen
    pra decidir quais botões de buff mostrar durante a partida.
    Ex. resposta: {"pula_questao": 2, "elimina_alternativas": 1}
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        inventario = InventarioItem.objects.filter(
            usuario=request.user, quantidade__gt=0
        ).select_related('item')
        return Response({inv.item.codigo: inv.quantidade for inv in inventario})