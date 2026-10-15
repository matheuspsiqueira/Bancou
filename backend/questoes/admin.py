from django.contrib import admin
from django.utils.html import format_html, mark_safe
from django.urls import path
from django.shortcuts import render, redirect
from django.contrib import messages
from django import forms
import json

from django.db import models as dj_models
from django.db.models import Count
from django.template.response import TemplateResponse

from .models import Banca, Categoria, Orgao, Concurso, Materia, Questao, Alternativa
from .importador import importar_questoes_do_pdf, importar_questoes_de_json
from .campos import CampoTextoFormatado
from .taxonomia import mesclar_materias, mesclar_orgaos, UF_CHOICES


# ---------------------------------------------------------------------------
# Forms de upload
# ---------------------------------------------------------------------------

class DadosDaProvaForm(forms.Form):
    """Campos que identificam a prova — iguais na importação por PDF e por JSON."""
    orgao = forms.ModelChoiceField(
        queryset=Orgao.objects.select_related('categoria'),
        label='Órgão',
        help_text='Ex.: TJ. Categoria e esfera vêm do órgão; o estado você informa abaixo. '
                  '<a href="/admin/questoes/orgao/add/" target="_blank">Cadastrar novo órgão</a>',
    )
    banca = forms.ModelChoiceField(
        queryset=Banca.objects.all(),
        label='Banca',
        help_text='Selecione ou <a href="/admin/questoes/banca/add/" target="_blank">cadastre uma nova banca</a>',
    )
    uf = forms.ChoiceField(
        choices=[('', '---------')] + list(UF_CHOICES),
        label='Estado (UF)', required=False,
        help_text='Obrigatório para órgãos estaduais e municipais; deixe vazio em provas nacionais (federais).',
    )
    cargo = forms.CharField(max_length=200, label='Cargo', required=False)
    ano = forms.IntegerField(label='Ano', min_value=1990, max_value=2100)
    nivel = forms.ChoiceField(
        choices=[('', '---------')] + list(Concurso.Nivel.choices),
        label='Nível de escolaridade', required=False,
    )
    concurso_nome = forms.CharField(
        max_length=200, label='Nome do concurso (opcional)', required=False,
        help_text='Deixe em branco para gerar automaticamente (ex.: "TJ-RJ – Assistente Administrativo").',
    )
    caderno = forms.CharField(
        max_length=60, label='Caderno / Dia (opcional)', required=False,
        help_text='Ex.: "Dia 1". Use quando a prova é dividida em dias/cadernos com numeração própria. '
                  'Se o concurso (órgão + banca + ano + cargo + UF) já existe, as questões são '
                  'acrescentadas a ele; o número só não pode repetir dentro do mesmo caderno.',
    )

    def clean(self):
        dados = super().clean()
        orgao = dados.get('orgao')
        if orgao:
            if orgao.esfera == Orgao.Esfera.FEDERAL:
                dados['uf'] = ''
            elif not dados.get('uf'):
                self.add_error('uf', 'Informe o estado (UF) para órgãos estaduais e municipais.')
        return dados


class ImportarProvaForm(DadosDaProvaForm):
    pdf_prova = forms.FileField(label='PDF da Prova')
    pdf_gabarito = forms.FileField(label='PDF do Gabarito', required=False)


class ImportarJsonForm(DadosDaProvaForm):
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
            ('sem_orgao', '🏛️ Concurso sem órgão'),
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
        if self.value() == 'sem_orgao':
            return queryset.filter(concurso__orgao__isnull=True)
        return queryset


# ---------------------------------------------------------------------------
# Admin de Questão
# ---------------------------------------------------------------------------

@admin.register(Questao)
class QuestaoAdmin(admin.ModelAdmin):
    form = QuestaoAdminForm
    list_display = [
        'numero', 'caderno', 'concurso', 'materia', 'tipo',
        'flags_display', 'status_display', 'criada_em'
    ]
    list_filter = [
        StatusFilter, AtencaoFilter, 'tipo', 'concurso__orgao__categoria',
        'concurso__banca', 'concurso__orgao', 'concurso', 'materia',
    ]
    search_fields = ['enunciado', 'numero']
    readonly_fields = ['tem_imagem', 'baixa_confianca', 'notas_extracao', 'pagina_pdf', 'criada_em', 'atualizada_em']
    inlines = [AlternativaInline]

    fieldsets = (
        ('📋 Identificação', {
            'fields': ('concurso', 'materia', 'caderno', 'numero', 'tipo', 'status')
        }),
        ('📝 Conteúdo', {
            'fields': ('contexto', 'enunciado', 'gabarito')
        }),
        ('🖼️ Imagem', {
            'fields': ('tem_imagem', 'imagem', 'posicao_imagem'),
            'description': 'Se a questão referencia uma imagem, faça o upload aqui e escolha se ela fica acima ou abaixo do enunciado.'
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

    def _avisos_de_materias(self, request, resultado):
        if resultado['materias_unificadas']:
            pares = '; '.join(f'"{a}" → "{b}"' for a, b in resultado['materias_unificadas'])
            messages.info(request, f'🔗 Matérias unificadas automaticamente: {pares}')
        if resultado['materias_novas']:
            nomes = ', '.join(f'"{n}"' for n in resultado['materias_novas'])
            messages.warning(
                request,
                f'🆕 Matérias novas criadas: {nomes}. Se alguma for a mesma de outra que já existe, '
                f'use "Mesclar matérias" na lista de matérias.'
            )

    # ------------------------------------------------------------------
    # View de importação via PDF (com IA)
    # ------------------------------------------------------------------

    def view_importar_prova(self, request):
        if request.method == 'POST':
            form = ImportarProvaForm(request.POST, request.FILES)
            if form.is_valid():
                try:
                    resultado = importar_questoes_do_pdf(
                        banca=form.cleaned_data['banca'],
                        concurso_nome=form.cleaned_data['concurso_nome'],
                        cargo=form.cleaned_data['cargo'],
                        ano=form.cleaned_data['ano'],
                        pdf_prova=request.FILES['pdf_prova'],
                        pdf_gabarito=request.FILES.get('pdf_gabarito'),
                        orgao=form.cleaned_data['orgao'],
                        nivel=form.cleaned_data['nivel'],
                        uf=form.cleaned_data['uf'],
                        caderno=form.cleaned_data['caderno'],
                    )
                    messages.success(request, f"✅ {resultado['total']} questões importadas para a fila de revisão!")
                    self._avisos_de_materias(request, resultado)
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
                    resultado = importar_questoes_de_json(
                        banca=form.cleaned_data['banca'],
                        concurso_nome=form.cleaned_data['concurso_nome'],
                        cargo=form.cleaned_data['cargo'],
                        ano=form.cleaned_data['ano'],
                        json_file=request.FILES['arquivo_json'],
                        gabarito_texto=form.cleaned_data['gabarito_oficial'],
                        orgao=form.cleaned_data['orgao'],
                        nivel=form.cleaned_data['nivel'],
                        uf=form.cleaned_data['uf'],
                        caderno=form.cleaned_data['caderno'],
                    )
                    messages.success(
                        request,
                        f"✅ {resultado['total']} questões importadas (via JSON) para a fila de revisão! "
                        f'Use o filtro "⚠️ Baixa confiança" para conferir formatação e imagens.'
                    )
                    self._avisos_de_materias(request, resultado)
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


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'total_orgaos']
    search_fields = ['nome']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_orgaos=Count('orgaos'))

    @admin.display(description='Órgãos', ordering='_orgaos')
    def total_orgaos(self, obj):
        return obj._orgaos


class MesclarOrgaosForm(forms.Form):
    destino = forms.ModelChoiceField(
        queryset=Orgao.objects.none(),
        label='Manter este órgão',
        widget=forms.RadioSelect,
        empty_label=None,
        help_text='Os concursos dos outros passam para este (levando o estado de cada um) e os outros são apagados.',
    )
    novo_nome = forms.CharField(
        max_length=150, required=False, label='Novo nome (opcional)',
        help_text='Ex.: "TJ". Deixe vazio para manter o nome do órgão escolhido acima.',
    )
    novo_nome_completo = forms.CharField(
        max_length=250, required=False, label='Novo nome completo (opcional)',
        help_text='Só vale se você informar um novo nome. Ex.: "Tribunal de Justiça".',
    )

    def __init__(self, *args, orgaos=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['destino'].queryset = orgaos
        self._pks = list(orgaos.values_list('pk', flat=True))

    def clean_novo_nome(self):
        nome = self.cleaned_data['novo_nome'].strip()
        if nome and Orgao.objects.filter(nome__iexact=nome).exclude(pk__in=self._pks).exists():
            raise forms.ValidationError(f'Já existe outro órgão chamado "{nome}".')
        return nome


@admin.register(Orgao)
class OrgaoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'categoria', 'esfera', 'total_concursos']
    list_filter = ['categoria', 'esfera']
    search_fields = ['nome', 'nome_completo']
    actions = ['mesclar']

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_concursos=Count('concursos'))

    @admin.display(description='Concursos', ordering='_concursos')
    def total_concursos(self, obj):
        return obj._concursos

    @admin.action(description='🔀 Mesclar órgãos selecionados…')
    def mesclar(self, request, queryset):
        if queryset.count() < 2:
            self.message_user(request, 'Selecione ao menos 2 órgãos para mesclar.', level=messages.ERROR)
            return None
        if queryset.values('esfera').distinct().count() > 1:
            self.message_user(
                request, 'Só dá para mesclar órgãos da mesma esfera (federal, estadual ou municipal).',
                level=messages.ERROR,
            )
            return None

        if 'confirmar' in request.POST:
            form = MesclarOrgaosForm(request.POST, orgaos=queryset)
            if form.is_valid():
                destino = form.cleaned_data['destino']
                origens = list(queryset.exclude(pk=destino.pk))
                categorias_diferentes = queryset.values('categoria').distinct().count() > 1
                movidos = mesclar_orgaos(
                    destino, origens,
                    novo_nome=form.cleaned_data['novo_nome'],
                    novo_nome_completo=form.cleaned_data['novo_nome_completo'],
                )
                self.message_user(
                    request,
                    f'🔀 {len(origens)} órgão(s) mesclado(s) em "{destino.nome}" ({movidos} concurso(s) movido(s)).'
                )
                if categorias_diferentes:
                    self.message_user(
                        request,
                        f'⚠️ Os órgãos tinham categorias diferentes; ficou a categoria de "{destino.nome}".',
                        level=messages.WARNING,
                    )
                return None
        else:
            form = MesclarOrgaosForm(orgaos=queryset)

        context = {
            **self.admin_site.each_context(request),
            'title': 'Mesclar órgãos',
            'opts': self.model._meta,
            'form': form,
            'orgaos': queryset,
            'selecionadas': request.POST.getlist(admin.helpers.ACTION_CHECKBOX_NAME),
        }
        return TemplateResponse(request, 'admin/questoes/mesclar_orgaos.html', context)


@admin.register(Concurso)
class ConcursoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'orgao', 'uf', 'banca', 'cargo', 'ano', 'nivel']
    list_filter = ['orgao__categoria', 'orgao', 'uf', 'banca', 'ano', 'nivel']
    search_fields = ['nome', 'cargo', 'orgao__nome']


class MesclarMateriasForm(forms.Form):
    destino = forms.ModelChoiceField(
        queryset=Materia.objects.none(),
        label='Manter esta matéria',
        widget=forms.RadioSelect,
        empty_label=None,
        help_text='As outras serão apagadas: as questões delas passam para esta, e os nomes '
                  'antigos viram apelidos (a próxima importação já une sozinha).',
    )

    def __init__(self, *args, materias=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['destino'].queryset = materias


@admin.register(Materia)
class MateriaAdmin(admin.ModelAdmin):
    list_display = ['nome', 'total_questoes', 'aliases_resumo']
    search_fields = ['nome', 'aliases']
    actions = ['mesclar']
    formfield_overrides = {
        dj_models.TextField: {'widget': forms.Textarea(attrs={'rows': 4, 'cols': 60})},
    }

    def get_queryset(self, request):
        return super().get_queryset(request).annotate(_questoes=Count('questoes'))

    @admin.display(description='Questões', ordering='_questoes')
    def total_questoes(self, obj):
        return obj._questoes

    @admin.display(description='Apelidos')
    def aliases_resumo(self, obj):
        return ' | '.join(obj.lista_aliases())

    @admin.action(description='🔀 Mesclar matérias selecionadas…')
    def mesclar(self, request, queryset):
        if queryset.count() < 2:
            self.message_user(request, 'Selecione ao menos 2 matérias para mesclar.', level=messages.ERROR)
            return None

        if 'confirmar' in request.POST:
            form = MesclarMateriasForm(request.POST, materias=queryset)
            if form.is_valid():
                destino = form.cleaned_data['destino']
                origens = list(queryset.exclude(pk=destino.pk))
                movidas = mesclar_materias(destino, origens)
                self.message_user(
                    request,
                    f'🔀 {len(origens)} matéria(s) mesclada(s) em "{destino.nome}" ({movidas} questão(ões) movida(s)).'
                )
                return None
        else:
            form = MesclarMateriasForm(materias=queryset)

        context = {
            **self.admin_site.each_context(request),
            'title': 'Mesclar matérias',
            'opts': self.model._meta,
            'form': form,
            'materias': queryset,
            'selecionadas': request.POST.getlist(admin.helpers.ACTION_CHECKBOX_NAME),
        }
        return TemplateResponse(request, 'admin/questoes/mesclar_materias.html', context)