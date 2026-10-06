"""
Campo de formulário com editor visual (TinyMCE) para texto formatado.

Guarda no banco o formato enxuto de texto_formatado.py (texto + <u><b><i><sup><sub>),
mas mostra/edita como HTML no admin. Só mexe no formulário: o model não muda.
"""
from django import forms
from tinymce.widgets import TinyMCE

from .texto_formatado import html_para_texto, texto_para_html

# license_key 'gpl' é obrigatório no TinyMCE 7 self-hosted (sem ele o editor
# fica somente leitura). Sem menus/plugins: só o que a prova realmente usa.
_BASE = {
    'license_key': 'gpl',
    'language': 'pt_BR',
    'menubar': False,
    'statusbar': False,
    'branding': False,
    'promotion': False,
    'plugins': '',
    'toolbar': 'bold italic underline superscript subscript | removeformat | undo redo',
    'toolbar_mode': 'wrap',
    'browser_spellcheck': True,
    'content_style': 'body{font-family:Arial,sans-serif;font-size:15px;line-height:1.5}',
    'extended_valid_elements': 'u,sup,sub',
}


def _widget(altura):
    return TinyMCE(mce_attrs={**_BASE, 'height': altura})


class CampoTextoFormatado(forms.CharField):
    """altura='grande' para enunciado/contexto, 'compacta' para alternativas."""

    def __init__(self, *args, altura='grande', **kwargs):
        kwargs.setdefault('widget', _widget(320 if altura == 'grande' else 130))
        super().__init__(*args, **kwargs)

    def bound_data(self, data, initial):
        # reexibição do form após erro de validação: normaliza o que foi postado
        return html_para_texto(data) if data else data

    def prepare_value(self, value):
        return texto_para_html(value) if value else ''

    def clean(self, value):
        valor = super().clean(value)          # required / strip
        texto = html_para_texto(valor)
        if self.required and not texto:
            raise forms.ValidationError(self.error_messages['required'], code='required')
        return texto