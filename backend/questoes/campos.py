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

# Botões "Fração" e "Raiz": o django-tinymce só aceita função em `setup` como texto
# (ele faz eval no navegador), então o código fica aqui, como string.
# Gravam <frac><num>…</num><den>…</den></frac> e √<rad>…</rad>; o app desenha empilhado.
_SETUP_FORMULAS = r"""function (editor) {
  function esc(t) { return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim(); }
  // Atalhos de digitação nas janelas: x^2 e x^{n+1} viram sobrescrito, a_n e a_{10} viram subscrito, * vira ·
  function fmt(t) {
    return esc(t)
      .replace(/\^(\{[^}]*\}|[+\-\u2212]?[A-Za-z0-9]+)/g, function (m, g) { return '<sup>' + g.replace(/^\{|\}$/g, '') + '</sup>'; })
      .replace(/_(\{[^}]*\}|[A-Za-z0-9]+)/g, function (m, g) { return '<sub>' + g.replace(/^\{|\}$/g, '') + '</sub>'; })
      .replace(/\*/g, '\u00b7');
  }
  function semParenteses(t) {
    t = String(t || '').trim();
    if (t.charAt(0) !== '(' || t.charAt(t.length - 1) !== ')') return t;
    var prof = 0;
    for (var i = 0; i < t.length; i++) {
      if (t.charAt(i) === '(') prof++;
      if (t.charAt(i) === ')') prof--;
      if (prof === 0 && i < t.length - 1) return t;
    }
    return t.slice(1, -1).trim();
  }
  function montarFracao(num, den) {
    num = semParenteses(num); den = semParenteses(den);
    if (!num || !den) return '';
    return '<frac><num>' + fmt(num) + '</num><den>' + fmt(den) + '</den></frac>';
  }
  function barraSimples(t) {
    var prof = 0, pos = -1;
    for (var i = 0; i < t.length; i++) {
      var c = t.charAt(i);
      if (c === '(') prof++;
      else if (c === ')') prof--;
      else if (c === '/' && prof === 0) { if (pos !== -1) return -1; pos = i; }
    }
    return pos;
  }
  function montarRaiz(indice, radicando) {
    radicando = String(radicando || '').trim();
    if (!radicando) return '';
    var pos = barraSimples(radicando);
    var dentro = pos > 0 ? montarFracao(radicando.slice(0, pos), radicando.slice(pos + 1)) : '';
    if (!dentro) dentro = fmt(radicando);
    var idx = String(indice || '').trim();
    return (idx ? '<sup>' + fmt(idx) + '</sup>' : '') + '\u221a<rad>' + dentro + '</rad>';
  }
  function abrir(titulo, campos, montar) {
    editor.windowManager.open({
      title: titulo,
      body: { type: 'panel', items: campos },
      buttons: [{ type: 'cancel', text: 'Cancelar' }, { type: 'submit', text: 'Inserir', buttonType: 'primary' }],
      initialData: {},
      onSubmit: function (api) {
        var html = montar(api.getData());
        if (html) { editor.insertContent(html + '&nbsp;'); }
        api.close();
      }
    });
  }
  editor.ui.registry.addButton('fracao', {
    text: 'a\u2044b', tooltip: 'Fração (numerador sobre denominador)',
    onAction: function () {
      abrir('Inserir fração', [
        { type: 'input', name: 'num', label: 'Numerador' },
        { type: 'input', name: 'den', label: 'Denominador' }
      ], function (d) { return montarFracao(d.num, d.den); });
    }
  });
  editor.ui.registry.addButton('raiz', {
    text: '\u221ax', tooltip: 'Raiz (com traço sobre o radicando)',
    onAction: function () {
      abrir('Inserir raiz', [
        { type: 'input', name: 'indice', label: 'Índice (vazio = raiz quadrada)' },
        { type: 'input', name: 'radicando', label: 'Radicando (use / para fração: R³ / (G · M))' }
      ], function (d) { return montarRaiz(d.indice, d.radicando); });
    }
  });
}"""

# Como a fórmula aparece DENTRO do editor (empilhada, como no app)
_CSS_EDITOR = (
    'body{font-family:Arial,sans-serif;font-size:15px;line-height:1.5}'
    'frac{display:inline-block;vertical-align:middle;text-align:center;margin:0 3px}'
    'frac>num{display:block;border-bottom:1.5px solid currentColor;padding:0 4px}'
    'frac>den{display:block;padding:0 4px}'
    'rad{display:inline-block;vertical-align:middle;border-top:1.5px solid currentColor;padding:2px 2px 0}'
)

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
    'toolbar': 'bold italic underline superscript subscript | fracao raiz charmap | removeformat | undo redo',
    'toolbar_mode': 'wrap',
    'browser_spellcheck': True,
    'content_style': _CSS_EDITOR,
    'entity_encoding': 'raw',
    'custom_elements': '~frac,~num,~den,~rad',
    'extended_valid_elements': 'u,sup,sub,frac,num,den,rad',
    'setup': _SETUP_FORMULAS,
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