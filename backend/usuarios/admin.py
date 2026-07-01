from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(DjangoUserAdmin):
    model = Usuario
    list_display = ['email', 'username', 'nome_completo', 'xp', 'moedas', 'vidas', 'streak', 'is_active', 'date_joined']
    list_editable = ['xp', 'moedas', 'vidas', 'streak']
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['email', 'username', 'nome_completo']
    ordering = ['-date_joined']
    readonly_fields = ['date_joined', 'last_login']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações pessoais', {'fields': ('username', 'nome_completo', 'avatar')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas importantes', {'fields': ('last_login', 'date_joined')}),
        ('🎮 Economia do jogo', {
            'fields': ('xp', 'moedas', 'vidas', 'streak', 'data_ultima_partida', 'vidas_atualizadas_em'),
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'nome_completo', 'password1', 'password2'),
        }),
    )