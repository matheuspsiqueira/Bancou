# desafios/admin.py
from django.contrib import admin

from .models import Desafio, DesafioUsuario


@admin.register(Desafio)
class DesafioAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo_condicao', 'meta', 'recompensa_xp', 'recompensa_moedas', 'ativo']
    list_filter = ['tipo_condicao', 'ativo']
    search_fields = ['nome', 'descricao']

    fieldsets = (
        ('📋 Identificação', {
            'fields': ('nome', 'descricao', 'ativo')
        }),
        ('🎯 Condição', {
            'fields': ('tipo_condicao', 'meta', 'banca', 'materia', 'item', 'horario_inicio', 'horario_fim'),
            'description': (
                'Escolha o tipo de condição e a meta. Os campos banca/materia/'
                'item/horário só aparecem quando o tipo escolhido precisa deles — '
                'pra outros tipos, ficam ocultos automaticamente.'
            ),
        }),
        ('🎁 Recompensa', {
            'fields': ('recompensa_xp', 'recompensa_moedas')
        }),
    )

    class Media:
        js = ('desafios/js/admin_desafio.js',)


@admin.register(DesafioUsuario)
class DesafioUsuarioAdmin(admin.ModelAdmin):
    """
    Somente leitura na prática — atribuição/progresso são geridos pelo
    listener central (desafios.services). Fica aqui pra acompanhamento.
    """
    list_display = ['usuario', 'desafio', 'data', 'progresso_display', 'completado']
    list_filter = ['completado', 'data', 'desafio']
    search_fields = ['usuario__username', 'usuario__email', 'desafio__nome']
    readonly_fields = ['usuario', 'desafio', 'data', 'progresso', 'completado', 'completado_em']

    def progresso_display(self, obj):
        return f'{obj.progresso}/{obj.desafio.meta}'
    progresso_display.short_description = 'Progresso'

    def has_add_permission(self, request):
        return False