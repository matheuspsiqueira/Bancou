"""
Texto formatado das questões (enunciado, contexto e alternativas).

FORMATO DE ARMAZENAMENTO (o que fica no banco)
----------------------------------------------
Texto simples com marcação mínima:
  - tags permitidas: <u> <b> <i> <sup> <sub>
  - quebra de linha = "\n" (parágrafo = "\n\n")
  - os caracteres &, < e > aparecem escapados (&amp; &lt; &gt;)

Questões antigas (texto puro, sem nenhuma tag) continuam válidas sem migração:
o app só interpreta as tags acima e esses três escapes.

Este módulo é a ÚNICA porta de entrada de texto formatado: tanto o importador
(JSON da IA) quanto o editor do admin passam por aqui, então nada além das
tags acima chega ao banco.
"""
import html
import re
from html.parser import HTMLParser

TAGS_FORMATACAO = ('u', 'b', 'i', 'sup', 'sub')

# Elementos HTML -> tag de formatação que eles representam
_TAG_PARA_FORMATO = {
    'u': 'u', 'ins': 'u',
    'b': 'b', 'strong': 'b',
    'i': 'i', 'em': 'i', 'cite': 'i',
    'sup': 'sup', 'sub': 'sub',
}
_BLOCOS = {'p', 'div', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'tr'}
_IGNORAR_CONTEUDO = {'script', 'style', 'head', 'title'}


def _formatos_do_estilo(style):
    """text-decoration/font-weight/font-style de um atributo style -> tags."""
    formatos = []
    if not style:
        return formatos
    estilo = style.lower()
    for decl in estilo.split(';'):
        if ':' not in decl:
            continue
        prop, _, valor = decl.partition(':')
        prop, valor = prop.strip(), valor.strip()
        if prop in ('text-decoration', 'text-decoration-line') and 'underline' in valor:
            formatos.append('u')
        elif prop == 'font-weight' and (
            valor.startswith('bold') or (valor.isdigit() and int(valor) >= 600)
        ):
            formatos.append('b')
        elif prop == 'font-style' and valor.startswith('italic'):
            formatos.append('i')
        elif prop == 'vertical-align' and valor == 'super':
            formatos.append('sup')
        elif prop == 'vertical-align' and valor == 'sub':
            formatos.append('sub')
    return formatos


class _Conversor(HTMLParser):
    """
    Converte HTML/markup qualquer no formato de armazenamento.
    modo_html=True  -> semântica de HTML (espaços/quebras do código-fonte
                       colapsam; <p>/<br> viram quebras) — usado com o editor.
    modo_html=False -> semântica de texto puro com tags (a "\n" do texto é
                       quebra de verdade) — usado com JSON da IA e texto
                       já armazenado.
    """

    def __init__(self, modo_html):
        super().__init__(convert_charrefs=True)
        self.modo_html = modo_html
        self.saida = []          # pedaços finais
        self.abertos = []        # tags de formatação atualmente abertas
        self.pilha = []          # (nome_elemento, [formatos que ele abriu])
        self.ignorando = 0

    # -- helpers --------------------------------------------------------
    def _abrir(self, fmt):
        self.abertos.append(fmt)
        self.saida.append(f'<{fmt}>')

    def _fechar(self, fmt):
        """Fecha `fmt` mantendo o aninhamento válido."""
        if fmt not in self.abertos:
            return
        reabrir = []
        while self.abertos:
            topo = self.abertos.pop()
            self.saida.append(f'</{topo}>')
            if topo == fmt:
                break
            reabrir.append(topo)
        for t in reversed(reabrir):
            self._abrir(t)

    def _quebra(self, n):
        """Garante ao menos n quebras no fim (sem acumular)."""
        if not self.saida:
            return
        atuais = 0
        for pedaco in reversed(self.saida):
            if pedaco.startswith('<') and pedaco.endswith('>'):
                continue  # tags não contam como texto
            m = re.search(r'\n*$', pedaco)
            atuais += len(m.group(0))
            if m.group(0) != pedaco:
                break
        if atuais < n:
            self.saida.append('\n' * (n - atuais))

    # -- eventos ----------------------------------------------------------
    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in _IGNORAR_CONTEUDO:
            self.ignorando += 1
            return
        if tag == 'br':
            self.saida.append('\n')
            return
        formatos = []
        fmt = _TAG_PARA_FORMATO.get(tag)
        if fmt:
            formatos.append(fmt)
        estilo = dict(attrs).get('style')
        for f in _formatos_do_estilo(estilo):
            if f not in formatos:
                formatos.append(f)
        if tag in _BLOCOS:
            self._quebra(2 if tag == 'p' or tag.startswith('h') else 1)
        abertos_por_ele = []
        for f in formatos:
            if f not in self.abertos:
                self._abrir(f)
                abertos_por_ele.append(f)
        self.pilha.append((tag, abertos_por_ele))

    def handle_startendtag(self, tag, attrs):
        if tag.lower() == 'br':
            self.saida.append('\n')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in _IGNORAR_CONTEUDO:
            self.ignorando = max(0, self.ignorando - 1)
            return
        # procura o elemento correspondente na pilha
        for i in range(len(self.pilha) - 1, -1, -1):
            if self.pilha[i][0] == tag:
                for f in reversed(self.pilha[i][1]):
                    self._fechar(f)   # _fechar reabre o que estiver aninhado por dentro
                del self.pilha[i]
                break
        if tag in _BLOCOS:
            self._quebra(2 if tag == 'p' or tag.startswith('h') else 1)
        elif tag in ('td', 'th'):
            self.saida.append(' ')

    def handle_data(self, data):
        if self.ignorando:
            return
        data = data.replace('\xa0', ' ').replace('\u200b', '')
        if self.modo_html:
            data = re.sub(r'[ \t\r\n\f]+', ' ', data)
            if data.strip() == '':
                # espaço solto entre blocos/no início/após quebra não vale
                ult = next((p for p in reversed(self.saida) if not (p.startswith('<') and p.endswith('>'))), '')
                if not ult or ult.endswith('\n') or ult.endswith(' '):
                    return
        else:
            data = data.replace('\r\n', '\n').replace('\r', '\n')
        self.saida.append(html.escape(data, quote=False))

    def resultado(self):
        for f in list(reversed(self.abertos)):
            self._fechar(f)
        texto = ''.join(self.saida)
        # tags vazias (<u></u>) não servem pra nada
        anterior = None
        while anterior != texto:
            anterior = texto
            texto = re.sub(r'<(u|b|i|sup|sub)></\1>', '', texto)
        return texto


def _limpar_bordas(texto):
    texto = re.sub(r'[ \t]+\n', '\n', texto)       # espaço antes da quebra
    texto = re.sub(r'\n[ \t]+', '\n', texto)       # espaço depois da quebra
    texto = re.sub(r'\n{3,}', '\n\n', texto)       # no máximo 1 linha em branco
    texto = re.sub(r'[ \t]{2,}', ' ', texto)
    return texto.strip()


def normalizar_texto(texto):
    """
    Entrada: texto puro com tags (JSON da IA, texto já armazenado, legado).
    Saída: formato de armazenamento (só <u><b><i><sup><sub>, \\n e entidades).
    Idempotente: normalizar(normalizar(x)) == normalizar(x).
    """
    if not texto:
        return ''
    c = _Conversor(modo_html=False)
    c.feed(str(texto))
    c.close()
    return _limpar_bordas(c.resultado())


def html_para_texto(conteudo_html):
    """Saída do editor (HTML) -> formato de armazenamento."""
    if not conteudo_html:
        return ''
    c = _Conversor(modo_html=True)
    c.feed(str(conteudo_html))
    c.close()
    return _limpar_bordas(c.resultado())


def texto_para_html(texto):
    """Formato de armazenamento -> HTML que o editor consegue carregar."""
    if not texto:
        return ''
    limpo = normalizar_texto(texto)   # garante escapes corretos em dados legados
    paragrafos = [p for p in limpo.split('\n\n') if p != '']
    return ''.join('<p>' + p.replace('\n', '<br>') + '</p>' for p in paragrafos)


def tem_formatacao(texto):
    return bool(re.search(r'</?(u|b|i|sup|sub)>', texto or ''))


def destaque_sem_formatacao(enunciado, texto_completo):
    """
    True se o enunciado fala de trecho sublinhado/grifado/destacado/negrito/
    itálico e o texto da questão (enunciado + contexto + alternativas) não tem
    a formatação correspondente — sinal de que o sublinhado se perdeu.
    """
    e = enunciado or ''
    t = texto_completo or ''
    if re.search(r'sublinhad', e, re.I) and '<u>' not in t:
        return True
    if re.search(r'negrito', e, re.I) and '<b>' not in t:
        return True
    if re.search(r'it[aá]lico', e, re.I) and '<i>' not in t:
        return True
    if re.search(r'grifad|destacad', e, re.I) and not tem_formatacao(t):
        return True
    return False