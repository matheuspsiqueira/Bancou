import csv

from django.contrib import admin
from django.http import HttpResponse

from .models import CampanhaPioneiros, Pioneiro
from .views import _enviar_planner


@admin.register(CampanhaPioneiros)
class CampanhaPioneirosAdmin(admin.ModelAdmin):
    list_display = ('nome', 'ativa')
    list_editable = ('ativa',)

    def has_add_permission(self, request):
        return not CampanhaPioneiros.objects.exists()  # só uma campanha

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(Pioneiro)
class PioneiroAdmin(admin.ModelAdmin):
    list_display = ('email', 'nome', 'concurso', 'origem',
                    'planner_enviado', 'borda_liberada', 'criado_em')
    list_editable = ('borda_liberada',)
    list_filter = ('planner_enviado', 'borda_liberada', 'concurso', 'origem', 'criado_em')
    search_fields = ('email', 'nome', 'concurso')
    readonly_fields = ('criado_em',)
    actions = ['reenviar_planner', 'exportar_csv']

    @admin.action(description='Reenviar planner (falhas de envio)')
    def reenviar_planner(self, request, queryset):
        campanha = CampanhaPioneiros.objects.first()
        if not campanha:
            return
        ok = sum(_enviar_planner(p, campanha) for p in queryset)
        self.message_user(request, f'{ok} de {queryset.count()} enviados.')

    @admin.action(description='Exportar selecionados em CSV')
    def exportar_csv(self, request, queryset):
        resp = HttpResponse(content_type='text/csv; charset=utf-8')
        resp['Content-Disposition'] = 'attachment; filename="pioneiros.csv"'
        resp.write('\ufeff')  # BOM: o Excel abre os acentos certo
        w = csv.writer(resp)
        w.writerow(['email', 'nome', 'concurso', 'origem', 'planner_enviado', 'borda_liberada', 'criado_em'])
        for p in queryset:
            w.writerow([p.email, p.nome, p.concurso, p.origem, p.planner_enviado,
                        p.borda_liberada, p.criado_em.strftime('%d/%m/%Y %H:%M')])
        return resp