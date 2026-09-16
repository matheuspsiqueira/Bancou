# conquistas/admin.py
from django.contrib import admin

from .models import Conquista, ConquistaUsuario


@admin.register(Conquista)
class ConquistaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'tipo_condicao', 'meta', 'banca', 'materia', 'recompensa_xp', 'recompensa_moedas', 'ativa']
    list_filter = ['tipo_condicao', 'ativa']
    search_fields = ['nome', 'descricao']

    fieldsets = (
        ('📋 Identificação', {
            'fields': ('nome', 'descricao', 'imagem', 'ativa')
        }),
        ('🎯 Condição', {
            'fields': ('tipo_condicao', 'meta', 'banca', 'materia'),
            'description': (
                'Escolha o tipo de condição e a meta (valor a atingir). '
                'Os campos "banca" e "materia" só aparecem quando o tipo '
                'escolhido precisa de um deles — pra outros tipos, ficam '
                'ocultos automaticamente.'
            ),
        }),
        ('🎁 Recompensa', {
            'fields': ('recompensa_xp', 'recompensa_moedas')
        }),
    )

    class Media:
        js = ('conquistas/js/admin_conquista.js',)


@admin.register(ConquistaUsuario)
class ConquistaUsuarioAdmin(admin.ModelAdmin):
    """
    Somente leitura na prática — o progresso é gerido pelo listener
    central (conquistas.services.avaliar_conquistas), não por edição
    manual. Fica registrado aqui pra acompanhamento/depuração.
    """
    list_display = ['usuario', 'conquista', 'progresso_display', 'completada', 'completada_em']
    list_filter = ['completada', 'conquista']
    search_fields = ['usuario__username', 'usuario__email', 'conquista__nome']
    readonly_fields = ['usuario', 'conquista', 'progresso', 'completada', 'completada_em']

    def progresso_display(self, obj):
        return f'{obj.progresso}/{obj.conquista.meta}'
    progresso_display.short_description = 'Progresso'

    def has_add_permission(self, request):
        return False