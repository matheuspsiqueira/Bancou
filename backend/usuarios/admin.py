from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(DjangoUserAdmin):
    """
    Admin para o model Usuario customizado (email como USERNAME_FIELD).
    Baseado no UserAdmin padrão do Django, com os campos ajustados
    para o seu model: email, username, nome_completo, avatar.
    """
    model = Usuario
    list_display = ['email', 'username', 'nome_completo', 'is_active', 'is_staff', 'date_joined']
    list_filter = ['is_active', 'is_staff', 'is_superuser', 'date_joined']
    search_fields = ['email', 'username', 'nome_completo']
    ordering = ['-date_joined']

    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Informações pessoais', {'fields': ('username', 'nome_completo', 'avatar')}),
        ('Permissões', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Datas importantes', {'fields': ('last_login', 'date_joined')}),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'username', 'nome_completo', 'password1', 'password2'),
        }),
    )

    readonly_fields = ['date_joined', 'last_login']