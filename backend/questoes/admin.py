from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
from django import forms
import json

from .models import Banca, Concurso, Materia, Questao, Alternativa
from .importador import importar_questoes_do_pdf, importar_questoes_de_json
from .campos import CampoTextoFormatado


# ---------------------------------------------------------------------------
# Forms de upload
# ---------------------------------------------------------------------------

class ImportarProvaForm(forms.Form):
    banca = forms.ModelChoiceField(
        queryset=Banca.objects.all(),
        label='Banca',
        help_text='Selecione ou <a href="/admin/questoes/banca/add/" target="_blank">cadastre uma nova banca</a>',
    )
    concurso_nome = forms.CharField(max_length=200, label='Nome do concurso')
    cargo = forms.CharField(max_length=200, label='Cargo', required=False)
    ano = forms.IntegerField(label='Ano', min_value=1990, max_value=2100)
    pdf_prova = forms.FileField(label='PDF da Prova')
    pdf_gabarito = forms.FileField(label='PDF do Gabarito', required=False)


class ImportarJsonForm(forms.Form):
    banca = forms.ModelChoiceField(
        queryset=Banca.objects.all(),
        label='Banca',
        help_text='Selecione ou <a href="/admin/questoes/banca/add/" target="_blank">cadastre uma nova banca</a>',
    )
    concurso_nome = forms.CharField(max_length=200, label='Nome do concurso')
    cargo = forms.CharField(max_length=200, label='Cargo', required=False)
    ano = forms.IntegerField(label='Ano', min_value=1990, max_value=2100)
    arquivo_json = forms.FileField(
        label='Arquivo JSON',
        help_text='JSON já estruturado (sem passar pela IA). Aceita as tags <u> <b> <i> <sup> <sub> nos textos.',
    )
    gabarito_oficial = forms.CharField(
        label='Gabarito oficial (recomendado)',
        required=False,
        widget=forms.Textarea(attrs={'rows': 3, 'cols': 80}),
        help_text='Cole as letras do gabarito na ordem das questões (1, 2, 3…), ex.: E C C E A E C D… '
                  'Se preenchido, vale mais que o gabarito do JSON (X ou * = anulada). '
                  'Evita gabarito errado vindo da IA.',
    )


# ---------------------------------------------------------------------------
# Forms com editor de texto formatado (negrito, itálico, sublinhado...)
# ---------------------------------------------------------------------------

class QuestaoAdminForm(forms.ModelForm):
    enunciado = CampoTextoFormatado(label='Enunciado', altura='grande')
    contexto = CampoTextoFormatado(
        label='Contexto (texto base)', altura='grande', required=False,
        help_text='Texto de apoio compartilhado. Cole da prova: o sublinhado, negrito e itálico são mantidos.',
    )

    class Meta:
        model = Questao
        fields = '__all__'


class AlternativaInlineForm(forms.ModelForm):
    texto = CampoTextoFormatado(label='Texto', altura='compacta')

    class Meta:
        model = Alternativa
        fields = '__all__'


# ---------------------------------------------------------------------------
# Inline de alternativas
# ---------------------------------------------------------------------------

class AlternativaInline(admin.TabularInline):
    model = Alternativa
    form = AlternativaInlineForm
    extra = 0
    fields = ['letra', 'texto']


# ---------------------------------------------------------------------------
# Filtros
# ---------------------------------------------------------------------------

class StatusFilter(admin.SimpleListFilter):
    title = 'Status'
    parameter_name = 'status'

    def lookups(self, request, model_admin):
        return [
            ('pendente', '🟡 Pendente'),
            ('aprovada', '🟢 Aprovada'),
            ('rejeitada', '🔴 Rejeitada'),
        ]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(status=self.value())
        return queryset


class AtencaoFilter(admin.SimpleListFilter):
    title = 'Atenção'
    parameter_name = 'atencao'

    def lookups(self, request, model_admin):
        return [
            ('imagem', '🖼️ Com imagem'),
            ('baixa', '⚠️ Baixa confiança'),
            ('sem_materia', '📚 Sem matéria'),
            ('sem_gabarito', '❓ Sem gabarito'),
        ]

    def queryset(self, request, queryset):
        if self.value() == 'imagem':
            return queryset.filter(tem_imagem=True)
        if self.value() == 'baixa':
            return queryset.filter(baixa_confianca=True)
        if self.value() == 'sem_materia':
            return queryset.filter(materia__isnull=True)
        if self.value() == 'sem_gabarito':
            return queryset.filter(gabarito='')
        return queryset


# ---------------------------------------------------------------------------
# Admin de Questão
# ---------------------------------------------------------------------------

@admin.register(Questao)
class QuestaoAdmin(admin.ModelAdmin):
    form = QuestaoAdminForm
    list_display = [
        'numero', 'concurso', 'materia', 'tipo',
        'flags_display', 'status_display', 'criada_em'
    ]
    list_filter = [StatusFilter, AtencaoFilter, 'tipo', 'concurso__banca', 'concurso']
    search_fields = ['enunciado', 'numero']
    readonly_fields = ['tem_imagem', 'baixa_confianca', 'notas_extracao', 'pagina_pdf', 'criada_em', 'atualizada_em']
    inlines = [AlternativaInline]

    fieldsets = (
        ('📋 Identificação', {
            'fields': ('concurso', 'materia', 'numero', 'tipo', 'status')
        }),
        ('📝 Conteúdo', {
            'fields': ('contexto', 'enunciado', 'gabarito')
        }),
        ('🖼️ Imagem', {
            'fields': ('tem_imagem', 'imagem'),
            'description': 'Se a questão referencia uma imagem, faça o upload aqui.'
        }),
        ('⚠️ Flags', {
            'fields': ('baixa_confianca', 'notas_extracao', 'pagina_pdf'),
            'classes': ('collapse',)
        }),
        ('📅 Metadados', {
            'fields': ('criada_em', 'atualizada_em'),
            'classes': ('collapse',)
        }),
    )

    actions = ['aprovar_questoes', 'rejeitar_questoes', 'marcar_como_revisadas']

    def get_urls(self):
        urls = super().get_urls()
        extras = [
            path('importar-prova/', self.admin_site.admin_view(self.view_importar_prova), name='importar_prova'),
            path('importar-json/', self.admin_site.admin_view(self.view_importar_json), name='importar_json'),
        ]
        return extras + urls

    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        extra_context['importar_url'] = 'importar-prova/'
        extra_context['importar_json_url'] = 'importar-json/'
        return super().changelist_view(request, extra_context=extra_context)

    # ------------------------------------------------------------------
    # View de importação via PDF (com IA)
    # ------------------------------------------------------------------

    def view_importar_prova(self, request):
        if request.method == 'POST':
            form = ImportarProvaForm(request.POST, request.FILES)
            if form.is_valid():
                try:
                    total = importar_questoes_do_pdf(
                        banca=form.cleaned_data['banca'],
                        concurso_nome=form.cleaned_data['concurso_nome'],
                        cargo=form.cleaned_data['cargo'],
                        ano=form.cleaned_data['ano'],
                        pdf_prova=request.FILES['pdf_prova'],
                        pdf_gabarito=request.FILES.get('pdf_gabarito'),
                    )
                    messages.success(request, f'✅ {total} questões importadas para a fila de revisão!')
                    return redirect('../')
                except Exception as e:
                    messages.error(request, f'❌ Erro ao processar: {e}')
        else:
            form = ImportarProvaForm()

        context = {
            **self.admin_site.each_context(request),
            'form': form,
            'title': 'Importar Prova (PDF + IA)',
            'opts': self.model._meta,
        }
        return render(request, 'admin/questoes/importar_prova.html', context)

    # ------------------------------------------------------------------
    # View de importação via JSON pronto (sem IA)
    # ------------------------------------------------------------------

    def view_importar_json(self, request):
        if request.method == 'POST':
            form = ImportarJsonForm(request.POST, request.FILES)
            if form.is_valid():
                try:
                    total = importar_questoes_de_json(
                        banca=form.cleaned_data['banca'],
                        concurso_nome=form.cleaned_data['concurso_nome'],
                        cargo=form.cleaned_data['cargo'],
                        ano=form.cleaned_data['ano'],
                        json_file=request.FILES['arquivo_json'],
                        gabarito_texto=form.cleaned_data['gabarito_oficial'],
                    )
                    messages.success(
                        request,
                        f'✅ {total} questões importadas (via JSON) para a fila de revisão! '
                        f'Use o filtro "⚠️ Baixa confiança" para conferir formatação e imagens.'
                    )
                    return redirect('../')
                except Exception as e:
                    messages.error(request, f'❌ Erro ao processar: {e}')
        else:
            form = ImportarJsonForm()

        context = {
            **self.admin_site.each_context(request),
            'form': form,
            'title': 'Importar Prova (JSON pronto)',
            'opts': self.model._meta,
        }
        # Reaproveita o mesmo template do import de PDF — o form muda,
        # o layout (título + botão) é genérico o suficiente.
        return render(request, 'admin/questoes/importar_prova.html', context)

    # ------------------------------------------------------------------
    # Colunas customizadas
    # ------------------------------------------------------------------

    def flags_display(self, obj):
        flags = []
        if obj.tem_imagem:
            flags.append('🖼️')
        if obj.baixa_confianca:
            flags.append('⚠️')
        if not obj.materia:
            flags.append('📚')
        if not obj.gabarito:
            flags.append('❓')
        resultado = ' '.join(flags) if flags else '✓'
        return mark_safe(f'<span>{resultado}</span>')
    flags_display.short_description = 'Flags'

    def status_display(self, obj):
        cores = {
            'pendente': '#f59e0b',
            'aprovada': '#10b981',
            'rejeitada': '#ef4444',
        }
        labels = {
            'pendente': '🟡 Pendente',
            'aprovada': '🟢 Aprovada',
            'rejeitada': '🔴 Rejeitada',
        }
        cor = cores.get(obj.status, '#ccc')
        label = labels.get(obj.status, obj.status)
        return format_html(
            '<span style="color:{}; font-weight:bold">{}</span>', cor, label
        )
    status_display.short_description = 'Status'

    # ------------------------------------------------------------------
    # Ações em lote
    # ------------------------------------------------------------------

    @admin.action(description='✅ Aprovar questões selecionadas')
    def aprovar_questoes(self, request, queryset):
        sem_materia = queryset.filter(materia__isnull=True)
        if sem_materia.exists():
            self.message_user(
                request,
                f'❌ {sem_materia.count()} questão(ões) sem matéria — preencha antes de aprovar.',
                level=messages.ERROR
            )
            return

        # Gabarito vazio/inválido faria TODA resposta contar como erro no jogo.
        problemas = []
        for q in queryset.prefetch_related('alternativas'):
            letras = {a.letra.strip().upper() for a in q.alternativas.all()}
            gab = (q.gabarito or '').strip().upper()
            if not gab or (letras and gab not in letras):
                problemas.append(f'{q.concurso} nº {q.numero}')
        if problemas:
            lista = ', '.join(problemas[:8]) + ('…' if len(problemas) > 8 else '')
            self.message_user(
                request,
                f'❌ {len(problemas)} questão(ões) com gabarito vazio ou fora das alternativas: {lista}. '
                f'Corrija antes de aprovar.',
                level=messages.ERROR
            )
            return

        ainda_com_alerta = queryset.filter(baixa_confianca=True).count()
        total = queryset.update(status='aprovada')
        self.message_user(request, f'✅ {total} questão(ões) aprovada(s).')
        if ainda_com_alerta:
            self.message_user(
                request,
                f'⚠️ {ainda_com_alerta} delas ainda estão com o alerta de baixa confiança.',
                level=messages.WARNING
            )

    @admin.action(description='❌ Rejeitar questões selecionadas')
    def rejeitar_questoes(self, request, queryset):
        total = queryset.update(status='rejeitada')
        self.message_user(request, f'❌ {total} questão(ões) rejeitada(s).')

    @admin.action(description='🧹 Marcar como revisadas (limpar alerta ⚠️)')
    def marcar_como_revisadas(self, request, queryset):
        total = queryset.update(baixa_confianca=False)
        self.message_user(request, f'🧹 Alerta removido de {total} questão(ões).')


# ---------------------------------------------------------------------------
# Admins auxiliares
# ---------------------------------------------------------------------------

@admin.register(Banca)
class BancaAdmin(admin.ModelAdmin):
    list_display = ['nome']
    search_fields = ['nome']


@admin.register(Concurso)
class ConcursoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'banca', 'cargo', 'ano']
    list_filter = ['banca', 'ano']
    search_fields = ['nome', 'cargo']


@admin.register(Materia)
class MateriaAdmin(admin.ModelAdmin):
    list_display = ['nome']
    search_fields = ['nome']