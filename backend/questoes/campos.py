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
    (8467, 'ele cursivo l litro comprimento lado'), (8652, 'equilibrio reversivel'), (8593, 'seta cima'), (8595, 'seta baixo'), (8592, 'seta esquerda'), (197, 'angstrom'),
]

# Botões "Fração", "Raiz" e "Imagem": o django-tinymce só aceita função em `setup` como texto
# (ele faz eval no navegador), então o código fica aqui, como string.
# Fração/raiz gravam <frac><num>…</num><den>…</den></frac> e √<rad>…</rad>; o app desenha empilhado.
# Imagem grava o marcador [[img:N]], que o app troca pela imagem de ordem N (bloco "Imagens da questão").
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
  // Sugere a próxima imagem ainda não usada no texto: olha as "ordem" do bloco
  // "Imagens da questão" (se a questão já tem imagens) e os marcadores já escritos.
  function proximaOrdem() {
    var usadas = {}, m, re = /\[\[img:(\d+)\]\]/gi;
    var texto = editor.getContent({ format: 'text' });
    while ((m = re.exec(texto))) { usadas[parseInt(m[1], 10)] = true; }
    var campos = document.querySelectorAll('input[name^="imagens-"][name$="-ordem"]');
    var ordens = [];
    for (var i = 0; i < campos.length; i++) {
      var n = parseInt(campos[i].value, 10);
      if (n > 0) ordens.push(n);
    }
    ordens.sort(function (a, b) { return a - b; });
    for (var j = 0; j < ordens.length; j++) { if (!usadas[ordens[j]]) return String(ordens[j]); }
    var k = 1;
    while (usadas[k]) k++;
    return String(k);
  }
  function abrir(titulo, campos, montar, inicial) {
    editor.windowManager.open({
      title: titulo,
      body: { type: 'panel', items: campos },
      buttons: [{ type: 'cancel', text: 'Cancelar' }, { type: 'submit', text: 'Inserir', buttonType: 'primary' }],
      initialData: inicial || {},
      onSubmit: function (api) {
        var html = montar(api.getData());
        if (html) { editor.insertContent(html.indexOf('<p>') === 0 ? html : html + '&nbsp;'); }
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
  // Vetor / Barra / Chapéu: acento em cima de uma ou mais letras
  function montarSobre(tag, texto) {
    texto = String(texto || '').trim();
    return texto ? '<' + tag + '>' + fmt(texto) + '</' + tag + '>' : '';
  }
  [
    ['vetor', 'vec', 'Vetor', 'Vetor (seta sobre a letra)', 'Letra(s) (ex.: F ou AB)'],
    ['barra', 'bar', 'Barra', 'Barra sobre o texto (segmento AB, média…)', 'Letra(s) ou texto (ex.: AB)'],
    ['chapeu', 'hat', 'Chapéu', 'Chapéu sobre a letra (vetor unitário, ângulo Â)', 'Letra (ex.: A)']
  ].forEach(function (b) {
    editor.ui.registry.addButton(b[0], {
      text: b[2], tooltip: b[3],
      onAction: function () {
        abrir('Inserir ' + b[2].toLowerCase(), [
          { type: 'input', name: 'texto', label: b[4] }
        ], function (d) { return montarSobre(b[1], d.texto); });
      }
    });
  });
  // Matriz: uma linha da matriz por linha de texto, células separadas por ";" (a vírgula é decimal)
  function montarMatriz(tipo, celulas) {
    var linhas = String(celulas || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
    if (!linhas.length) return '';
    var corpo = linhas.map(function (l) {
      return '<lin>' + l.split(';').map(function (c) { return '<cel>' + fmt(c) + '</cel>'; }).join('') + '</lin>';
    }).join('');
    return '<' + tipo + '>' + corpo + '</' + tipo + '>';
  }
  editor.ui.registry.addButton('matriz', {
    text: 'Matriz', tooltip: 'Matriz ou determinante',
    onAction: function () {
      abrir('Inserir matriz', [
        { type: 'selectbox', name: 'tipo', label: 'Delimitador', items: [
          { value: 'mat', text: 'Parênteses ( )' },
          { value: 'matc', text: 'Colchetes [ ]' },
          { value: 'det', text: 'Barras | | (determinante)' }
        ] },
        { type: 'textarea', name: 'celulas', label: 'Uma linha da matriz por linha; separe as células com ;  (ex.: 1; 2; 3)' }
      ], function (d) { return montarMatriz(d.tipo, d.celulas); }, { tipo: 'mat', celulas: '' });
    }
  });
  editor.ui.registry.addButton('imagem', {
    text: '\uD83D\uDDBC Imagem', tooltip: 'Inserir marcador de imagem neste ponto do texto',
    onAction: function () {
      abrir('Inserir imagem no texto', [
        { type: 'input', name: 'ordem', label: 'Número da imagem (a "ordem" dela no bloco Imagens da questão)' }
      ], function (d) {
        var n = parseInt(d.ordem, 10);
        return n > 0 ? '<p>[[img:' + n + ']]</p>' : '';
      }, { ordem: proximaOrdem() });
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
    'vec,bar,hat{display:inline-block;vertical-align:middle;text-align:center}'
    'vec::before{content:"\\2192";display:block;font-size:.65em;line-height:.9}'
    'hat::before{content:"^";display:block;font-size:.8em;line-height:.9}'
    'bar{border-top:1.5px solid currentColor}'
    'mat,matc,det{display:inline-table;vertical-align:middle;margin:0 4px;padding:0 8px;'
    'border-left:2px solid currentColor;border-right:2px solid currentColor}'
    'mat{border-radius:10px}'
    'det{border-left-width:1.5px;border-right-width:1.5px}'
    'lin{display:table-row}'
    'cel{display:table-cell;padding:1px 7px;text-align:center}'
)

_TOOLBAR_COMPACTA = (
    'bold italic underline superscript subscript | fracao raiz vetor barra chapeu matriz charmap '
    '| removeformat | undo redo'
)
# Enunciado/contexto: ganham o botão "Imagem" (o marcador só vale nesses dois campos).
_TOOLBAR_GRANDE = (
    'bold italic underline superscript subscript | fracao raiz vetor barra chapeu matriz imagem charmap '
    '| removeformat | undo redo'
)

# license_key 'gpl' é obrigatório no TinyMCE 7 self-hosted (sem ele o editor
# fica somente leitura). Sem menus: só o que a prova realmente usa.
_BASE = {
    'license_key': 'gpl',
    'language': 'pt_BR',
    'menubar': False,
    # Barra de baixo só com a "alça" de arrastar para redimensionar (sem caminho de elementos)
    'statusbar': True,
    'elementpath': False,
    'resize': True,
    'min_height': 120,
    'width': '100%',
    'branding': False,
    'promotion': False,
    'plugins': 'charmap',
    'charmap': [[codigo, nome] for codigo, nome in _SIMBOLOS],
    'toolbar': _TOOLBAR_COMPACTA,
    'toolbar_mode': 'wrap',
    'browser_spellcheck': True,
    'content_style': _CSS_EDITOR,
    'entity_encoding': 'raw',
    'custom_elements': '~frac,~num,~den,~rad,~vec,~bar,~hat,~mat,~matc,~det,~lin,~cel',
    'extended_valid_elements': 'u,sup,sub,frac,num,den,rad,vec,bar,hat,mat,matc,det,lin,cel',
    'setup': _SETUP_FORMULAS,
}


def _widget(altura):
    toolbar = _TOOLBAR_GRANDE if altura == 'grande' else _TOOLBAR_COMPACTA
    return TinyMCE(mce_attrs={**_BASE, 'toolbar': toolbar, 'height': 320 if altura == 'grande' else 130})


class CampoTextoFormatado(forms.CharField):
    """altura='grande' para enunciado/contexto (com botão Imagem), 'compacta' para alternativas."""

    def __init__(self, *args, altura='grande', **kwargs):
        kwargs.setdefault('widget', _widget(altura))
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