"""
Campo de formulário com editor visual (TinyMCE) para texto formatado.

Guarda no banco o formato enxuto de texto_formatado.py (texto + <u><b><i><sup><sub>),
mas mostra/edita como HTML no admin. Só mexe no formulário: o model não muda.
"""
from django import forms
from tinymce.widgets import TinyMCE

from .texto_formatado import html_para_texto, texto_para_html

# Símbolos do botão Ω (os nomes em português valem para a busca do diálogo).
# Frações e raízes são escritas em texto linear: 9/14, √(x² + 1), (R + h)³ / (G · M).
_SIMBOLOS = [
    # matemática
    (8730, 'raiz quadrada'), (8731, 'raiz cubica'), (8732, 'raiz quarta'), (960, 'pi'),
    (215, 'vezes multiplicacao'), (183, 'ponto multiplicacao'), (247, 'dividido divisao'), (177, 'mais ou menos'),
    (8722, 'menos'), (8804, 'menor ou igual'), (8805, 'maior ou igual'), (8800, 'diferente'),
    (8776, 'aproximadamente'), (8734, 'infinito'), (176, 'grau'), (8240, 'por mil'),
    (189, 'um meio'), (8531, 'um terco'), (8532, 'dois tercos'), (188, 'um quarto'), (190, 'tres quartos'),
    (8533, 'um quinto'), (8537, 'um sexto'), (8539, 'um oitavo'),
    (178, 'ao quadrado'), (179, 'ao cubo'), (185, 'expoente um'), (8319, 'expoente n'),
    (8721, 'somatorio'), (8747, 'integral'), (8706, 'derivada parcial'), (8711, 'nabla'),
    (8733, 'proporcional'), (8736, 'angulo'), (8869, 'perpendicular'), (8741, 'paralelo'),
    # logica e conjuntos
    (8743, 'e conjuncao'), (8744, 'ou disjuncao'), (172, 'negacao nao'), (8594, 'seta direita implica'),
    (8596, 'seta dupla se e somente se'), (8658, 'implica'), (8660, 'equivalente'),
    (8712, 'pertence'), (8713, 'nao pertence'), (8834, 'contido'), (8836, 'nao contido'), (8838, 'contido ou igual'),
    (8745, 'intersecao'), (8746, 'uniao'), (8709, 'conjunto vazio'), (8704, 'para todo'), (8707, 'existe'),
    (8756, 'portanto'), (8757, 'pois'),
    # letras gregas
    (945, 'alfa'), (946, 'beta'), (947, 'gama'), (948, 'delta'), (949, 'epsilon'), (952, 'teta'),
    (955, 'lambda'), (956, 'mi micro'), (961, 'ro'), (963, 'sigma'), (964, 'tau'), (966, 'fi'), (969, 'omega'),
    (915, 'Gama maiusculo'), (916, 'Delta maiusculo'), (920, 'Teta maiusculo'), (923, 'Lambda maiusculo'),
    (928, 'Pi maiusculo'), (931, 'Sigma maiusculo'), (934, 'Fi maiusculo'), (936, 'Psi maiusculo'), (937, 'Omega maiusculo'),
    # química e física
    (8652, 'equilibrio reversivel'), (8593, 'seta cima'), (8595, 'seta baixo'), (8592, 'seta esquerda'), (197, 'angstrom'),
]

# license_key 'gpl' é obrigatório no TinyMCE 7 self-hosted (sem ele o editor
# fica somente leitura). Sem menus: só o que a prova realmente usa.
_BASE = {
    'license_key': 'gpl',
    'language': 'pt_BR',
    'menubar': False,
    'statusbar': False,
    'branding': False,
    'promotion': False,
    'plugins': 'charmap',
    'charmap': [[codigo, nome] for codigo, nome in _SIMBOLOS],
    'toolbar': 'bold italic underline superscript subscript | charmap | removeformat | undo redo',
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