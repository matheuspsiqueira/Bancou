from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from .models import RelatoBug

# (fundo, texto) de cada status — pastel com texto escuro, legível no tema claro e escuro
CORES_STATUS = {
    RelatoBug.Status.ABERTO: ('#fff3cd', '#664d03'),       # amarelo — pendente
    RelatoBug.Status.EM_ANALISE: ('#cff4fc', '#055160'),   # azul — em análise
    RelatoBug.Status.RESOLVIDO: ('#d1e7dd', '#0a3622'),    # verde — resolvido
}


def _selo_status(obj):
    fundo, texto = CORES_STATUS.get(obj.status, ('#e9ecef', '#212529'))
    return format_html(
        '<span style="background:{};color:{};padding:3px 10px;border-radius:999px;'
        'font-weight:600;font-size:12px;white-space:nowrap;">{}</span>',
        fundo, texto, obj.get_status_display(),
    )


@admin.register(RelatoBug)
class RelatoBugAdmin(admin.ModelAdmin):
    list_display = ('id', 'criado_em', 'usuario', 'questao_referencia', 'tela_contexto', 'status_colorido', 'email_enviado')
    list_display_links = ('id', 'criado_em')
    list_filter = ('status', 'email_enviado', 'criado_em')
    search_fields = (
        'descricao', 'questao_referencia',
        'usuario__username', 'usuario__email', 'usuario__nome_completo',
    )
    list_select_related = ('usuario',)
    date_hierarchy = 'criado_em'
    actions = ('marcar_aberto', 'marcar_em_analise', 'marcar_resolvido')

    # Tudo que veio do app é só leitura; o admin só mexe no status.
    readonly_fields = (
        'usuario', 'criado_em', 'questao_link', 'questao_referencia', 'descricao',
        'tela_contexto', 'versao_app', 'modelo_aparelho', 'versao_so', 'email_enviado',
        'status_colorido',
    )
    fieldsets = (
        ('Triagem', {'fields': ('status_colorido', 'status', 'criado_em', 'usuario')}),
        ('Relato', {'fields': ('descricao', 'tela_contexto')}),
        ('Questão', {'fields': ('questao_link', 'questao_referencia')}),
        ('Aparelho', {'fields': ('modelo_aparelho', 'versao_so', 'versao_app')}),
        ('Aviso', {'fields': ('email_enviado',)}),
    )

    def has_add_permission(self, request):
        return False  # relatos só nascem pelo app

    @admin.display(description='Status', ordering='status')
    def status_colorido(self, obj):
        return _selo_status(obj)

    @admin.display(description='Questão (abrir no admin)')
    def questao_link(self, obj):
        if not obj.questao_id:
            return '—'
        url = reverse('admin:questoes_questao_change', args=[obj.questao_id])
        return format_html('<a href="{}">Abrir a questão #{}</a>', url, obj.questao_id)

    @admin.action(description='Marcar como aberto (pendente)')
    def marcar_aberto(self, request, queryset):
        queryset.update(status=RelatoBug.Status.ABERTO)

    @admin.action(description='Marcar como em análise')
    def marcar_em_analise(self, request, queryset):
        queryset.update(status=RelatoBug.Status.EM_ANALISE)

    @admin.action(description='Marcar como resolvido')
    def marcar_resolvido(self, request, queryset):
        queryset.update(status=RelatoBug.Status.RESOLVIDO)