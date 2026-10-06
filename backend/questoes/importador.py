import anthropic
import json as _json
import base64
import json
import os
import re
import pdfplumber
import tempfile
from django.db import transaction
from .models import Concurso, Materia, Questao, Alternativa
from .texto_formatado import normalizar_texto, destaque_sem_formatacao

PROMPT_EXTRACAO = """Você é um especialista em concursos públicos brasileiros.

Analise o texto extraído das páginas do PDF e extraia TODAS as questões presentes, retornando SOMENTE um JSON válido, sem texto adicional, sem markdown, sem blocos de código.

Estrutura obrigatória:
{
  "questoes": [
    {
      "numero_questao": 1,
      "enunciado": "texto completo do enunciado da questão",
      "texto_base": {
        "titulo": "título do texto base se houver",
        "conteudo": "conteúdo completo do texto base",
        "fonte": "fonte do texto se houver"
      },
      "texto_base_compartilhado": true,
      "questoes_que_compartilham_texto_base": [1, 2, 3],
      "alternativas": [
        {"letra": "A", "texto": "texto da alternativa A"},
        {"letra": "B", "texto": "texto da alternativa B"},
        {"letra": "C", "texto": "texto da alternativa C"},
        {"letra": "D", "texto": "texto da alternativa D"},
        {"letra": "E", "texto": "texto da alternativa E"}
      ],
      "gabarito": "",
      "materia": "Língua Portuguesa",
      "tem_imagem": false
    }
  ]
}

Regras importantes:
- Extraia TODAS as questões presentes no texto, sem pular nenhuma
- Se a questão não tiver texto base, coloque texto_base como null e texto_base_compartilhado como false
- Se várias questões compartilham o mesmo texto base, identifique todas em questoes_que_compartilham_texto_base
- Para questões Certo/Errado, coloque apenas as alternativas C e E
- tem_imagem deve ser true se o enunciado referencia figura, gráfico, tabela, mapa ou imagem
- materia deve ser identificada pelo cabeçalho da seção (ex: Língua Portuguesa, Direito Constitucional)
- gabarito deixe vazio — será cruzado com o gabarito depois
- Retorne SOMENTE o JSON, sem nenhum texto antes ou depois
"""

PROMPT_GABARITO = """Analise o texto de gabarito e retorne SOMENTE um JSON com o seguinte formato, sem texto adicional:

{
  "gabarito": {
    "1": "A",
    "2": "C",
    "3": "E"
  }
}

Onde a chave é o número da questão e o valor é a letra do gabarito (A, B, C, D, E ou C/E para Certo/Errado).
Retorne SOMENTE o JSON, sem nenhum texto antes ou depois.
"""


def extrair_texto_pdf(pdf_file) -> list[str]:
    """Extrai texto de cada página do PDF. Retorna lista de textos por página."""
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as f:
        for chunk in pdf_file.chunks():
            f.write(chunk)
        path = f.name

    paginas = []
    try:
        with pdfplumber.open(path) as pdf:
            for page in pdf.pages:
                texto = page.extract_text() or ''
                if texto.strip():
                    paginas.append(texto)
    finally:
        os.unlink(path)

    return paginas


def extrair_gabarito_via_ia(client, pdf_gabarito_file) -> dict:
    """Manda o PDF do gabarito direto pra API — funciona mesmo com tabela em imagem."""
    pdf_data = base64.standard_b64encode(pdf_gabarito_file.read()).decode('utf-8')

    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "document",
                    "source": {
                        "type": "base64",
                        "media_type": "application/pdf",
                        "data": pdf_data,
                    },
                },
                {
                    "type": "text",
                    "text": """Analise o gabarito neste PDF e retorne SOMENTE um JSON no formato abaixo, sem texto adicional, sem markdown:

{
  "gabarito": {
    "1": "E",
    "2": "C"
  }
}

Onde a chave é o número da questão e o valor é a letra do gabarito."""
                }
            ],
        }],
    )

    texto = response.content[0].text.strip()
    if texto.startswith('```'):
        texto = texto.split('\n', 1)[1]
        texto = texto.rsplit('```', 1)[0].strip()

    dados = json.loads(texto)
    return {int(k): v for k, v in dados['gabarito'].items()}


def extrair_questoes_via_ia(client, texto_paginas: list[str]) -> list[dict]:
    """
    Processa o texto em lotes de páginas e retorna todas as questões extraídas.
    Usa lotes de 3 páginas pra não estourar o limite de tokens.
    """
    todas_questoes = []
    tamanho_lote = 3

    for i in range(0, len(texto_paginas), tamanho_lote):
        lote = texto_paginas[i:i + tamanho_lote]
        texto_lote = '\n\n--- NOVA PÁGINA ---\n\n'.join(lote)

        print(f"  Processando páginas {i+1} a {min(i+tamanho_lote, len(texto_paginas))}...")

        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=16000,
            messages=[{
                "role": "user",
                "content": f"{PROMPT_EXTRACAO}\n\nTexto das páginas:\n{texto_lote}"
            }],
        )

        texto_resposta = response.content[0].text.strip()

        # Limpa possível markdown residual
        if texto_resposta.startswith('```'):
            texto_resposta = texto_resposta.split('\n', 1)[1]
            texto_resposta = texto_resposta.rsplit('```', 1)[0].strip()

        dados = json.loads(texto_resposta)
        questoes_lote = dados.get('questoes', [])
        todas_questoes.extend(questoes_lote)
        print(f"  ✅ {len(questoes_lote)} questões extraídas neste lote")

    return todas_questoes


def importar_questoes_do_pdf(banca, concurso_nome, cargo, ano, pdf_prova, pdf_gabarito=None):
    """
    Importação PDF + IA (só texto). ATENÇÃO: este caminho lê apenas o texto do
    PDF, então NÃO enxerga sublinhado/negrito/itálico nem imagens/tabelas.
    Para provas com trechos sublinhados, use a importação por JSON.
    """
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY não configurada no .env')

    client = anthropic.Anthropic(api_key=api_key)

    # Extrai texto do PDF da prova
    print("Extraindo texto do PDF da prova...")
    paginas_prova = extrair_texto_pdf(pdf_prova)
    print(f"  {len(paginas_prova)} páginas com texto encontradas")

    if not paginas_prova:
        raise ValueError(
            'Este PDF não tem texto selecionável (provavelmente é escaneado). '
            'Use "Importar JSON" com o JSON gerado a partir das imagens das páginas.'
        )

    # Extrai questões via IA em lotes
    print("Enviando para a API do Claude...")
    questoes = extrair_questoes_via_ia(client, paginas_prova)
    print(f"Total extraído: {len(questoes)} questões")

    # Extrai gabarito mandando PDF direto pra IA
    gabarito = {}
    if pdf_gabarito:
        print("Extraindo gabarito via IA...")
        gabarito = extrair_gabarito_via_ia(client, pdf_gabarito)
        print(f"  {len(gabarito)} respostas encontradas no gabarito")

    return _salvar_questoes(questoes, gabarito, banca, concurso_nome, cargo, ano)


# ---------------------------------------------------------------------------
# Helpers de normalização (formatação, imagens, gabarito)
# ---------------------------------------------------------------------------

# Marcador que a IA coloca no texto onde há figura/tabela: [[IMG:IMG_P07_01]].
# Hoje a questão tem UM slot de imagem (campo `imagem`), então o marcador sai
# do texto e a imagem fica descrita em notas_extracao (página + posição) para
# você recortar e subir. Se um dia houver várias imagens inline, é aqui que
# o marcador deixa de ser removido.
RE_MARCADOR_IMG = re.compile(r'[ \t]*\[\[IMG:\s*([^\]\s]+)\s*\]\][ \t]*')


def _sem_marcadores(texto, ids_imagem):
    """Remove [[IMG:id]] do texto, acumulando os ids encontrados."""
    def _troca(m):
        ids_imagem.append(m.group(1))
        return '\n'
    return RE_MARCADOR_IMG.sub(_troca, texto or '')


def _limpar(texto, ids_imagem):
    """Marcadores de imagem fora + só <u><b><i><sup><sub> + escapes corretos."""
    return normalizar_texto(_sem_marcadores(texto, ids_imagem))


def _letra_gabarito(valor):
    """'e ' -> 'E'; 'anulada' -> 'ANULADA'; vazio -> ''."""
    v = str(valor or '').strip().upper()
    if v.startswith('ANULAD'):
        return 'ANULADA'
    return v


def _texto_do_base(tb, ids_imagem):
    """titulo + conteudo + fonte — mesmo desenho do contexto de antes."""
    partes = []
    if tb.get('titulo'):
        partes.append(_limpar(tb['titulo'], ids_imagem))
    if tb.get('conteudo'):
        partes.append(_limpar(tb['conteudo'], ids_imagem))
    if tb.get('fonte'):
        partes.append(f"Fonte: {_limpar(tb['fonte'], ids_imagem)}")
    return '\n'.join(p for p in partes if p)


def _nota_imagem(id_img, info):
    if not info:
        return f'Imagem {id_img} citada no texto, mas não descrita no JSON'
    nota = f"Imagem {id_img} ({info.get('tipo') or 'figura'})"
    if info.get('pagina'):
        nota += f" — pág. {info['pagina']}"
    if info.get('posicao'):
        nota += f", {info['posicao']}"
    if info.get('descricao'):
        nota += f": {info['descricao']}"
    if info.get('transcricao'):
        nota += ' | Transcrição: ' + str(info['transcricao']).replace('\n', ' / ')
    return nota


def parsear_gabarito(texto):
    """
    Gabarito oficial digitado/colado, uma letra por questão, na ordem (1, 2, 3…).
    Aceita com ou sem espaços/vírgulas: "E C C E A…" ou "ECCEA…".
    X ou * = questão anulada. Retorna {numero: letra}.
    """
    bruto = re.sub(r'[\s,;.\-]+', '', str(texto or '')).upper()
    if not bruto:
        return {}
    invalidos = sorted(set(re.findall(r'[^A-EX*]', bruto)))
    if invalidos:
        raise ValueError(
            f'Gabarito oficial: caractere(s) inválido(s) {invalidos}. '
            f'Use só A, B, C, D, E (X ou * para anulada).'
        )
    return {i + 1: ('ANULADA' if c in 'X*' else c) for i, c in enumerate(bruto)}


def _validar_questoes(questoes):
    """Junta TODOS os problemas num erro só, em vez de parar no primeiro."""
    erros, vistos = [], set()
    for i, q in enumerate(questoes):
        if not isinstance(q, dict):
            erros.append(f'Item {i} de "questoes" não é um objeto.')
            continue
        num = q.get('numero_questao')
        rotulo = f'Questão {num}' if num is not None else f'Item {i}'
        if num is None:
            erros.append(f'Item {i} não tem "numero_questao".')
        elif not isinstance(num, int):
            erros.append(f'{rotulo}: "numero_questao" deve ser número inteiro.')
        elif num in vistos:
            erros.append(f'{rotulo}: número repetido no JSON.')
        else:
            vistos.add(num)
        if not str(q.get('enunciado') or '').strip():
            erros.append(f'{rotulo}: "enunciado" vazio ou ausente.')
        for a in q.get('alternativas') or []:
            if not isinstance(a, dict):
                erros.append(f'{rotulo}: alternativa inválida.')
                break
            letra = a.get('letra') or '?'
            if not a.get('letra'):
                erros.append(f'{rotulo}: alternativa sem "letra" (chaves encontradas: {sorted(a)}).')
                break
            if a.get('texto') in (None, ''):
                dica = ' — veio "text" no lugar de "texto"' if a.get('text') else ''
                erros.append(f'{rotulo}: alternativa {letra} sem "texto"{dica}.')
                break
    if erros:
        extra = f'\n(+{len(erros) - 10} outros)' if len(erros) > 10 else ''
        raise ValueError('JSON com problemas:\n' + '\n'.join(erros[:10]) + extra)


def _salvar_questoes(questoes, gabarito, banca, concurso_nome, cargo, ano,
                     textos_base=None, imagens=None):
    """
    Grava as questões no banco.

    Reescrito pra evitar timeout do worker (Gunicorn mata a request após
    30s) em JSONs grandes: a versão anterior fazia 1 INSERT/SELECT por
    questão (Materia via get_or_create) + 1 INSERT por Alternativa —
    centenas de round-trips individuais pro Postgres do Neon. Agora:

      1. Tudo roda dentro de transaction.atomic() — se algo falhar no
         meio, o banco volta pro estado anterior (nada fica "pela metade").
      2. Todas as Materias distintas são resolvidas de uma vez (poucas
         queries), não uma por questão.
      3. Questao e Alternativa são gravadas via bulk_create — 2 INSERTs
         no total (em lote), em vez de um por linha.

    Aceita DOIS formatos de JSON:
      - novo: `textos_base` (lista com id) + `texto_base_ids` em cada questão
        + `imagens` (lista com id) + marcadores [[IMG:id]] nos textos;
      - antigo: `texto_base` embutido na 1ª questão do grupo +
        `questoes_que_compartilham_texto_base`.

    Texto formatado: enunciado, contexto e alternativas passam por
    texto_formatado.normalizar_texto (só <u><b><i><sup><sub>).
    """
    textos_por_id = {t['id']: t for t in (textos_base or []) if t.get('id')}
    imagens_por_id = {i['id']: i for i in (imagens or []) if i.get('id')}

    with transaction.atomic():
        concurso, _ = Concurso.objects.get_or_create(
            nome=concurso_nome,
            banca=banca,
            ano=ano,
            defaults={'cargo': cargo or ''}
        )

        # Reimportar o mesmo JSON duplicaria tudo — barra antes de gravar.
        numeros = [q['numero_questao'] for q in questoes]
        ja_existem = sorted(
            Questao.objects.filter(concurso=concurso, numero__in=numeros)
            .values_list('numero', flat=True)
        )
        if ja_existem:
            raise ValueError(
                f'O concurso "{concurso_nome}" já tem as questões {ja_existem[:15]}'
                f'{"…" if len(ja_existem) > 15 else ""}. Apague as antigas no admin '
                f'antes de reimportar (ou use outro nome de concurso).'
            )

        # Resolve todas as matérias distintas de uma vez só
        nomes_materias = {
            q.get('materia', '').strip()
            for q in questoes
            if q.get('materia', '').strip()
        }
        materias_por_nome = {
            m.nome: m for m in Materia.objects.filter(nome__in=nomes_materias)
        }
        novas_materias = [
            Materia(nome=nome) for nome in nomes_materias if nome not in materias_por_nome
        ]
        if novas_materias:
            Materia.objects.bulk_create(novas_materias)
            # bulk_create não garante pk populado em todas as versões/backends
            # antigas — recarrega pra ter certeza de que os ids existem
            for m in Materia.objects.filter(nome__in=[m.nome for m in novas_materias]):
                materias_por_nome[m.nome] = m

        # Formato antigo: texto base embutido na questão, agrupado por lista de números
        textos_legado = {}
        for q in questoes:
            if q.get('texto_base') and q.get('questoes_que_compartilham_texto_base'):
                grupo = tuple(q['questoes_que_compartilham_texto_base'])
                if grupo not in textos_legado:
                    textos_legado[grupo] = q['texto_base']

        questoes_objs = []
        alternativas_brutas = []  # lista paralela: alternativas de cada questão, na mesma ordem

        for q in questoes:
            nome_materia = q.get('materia', '').strip()
            materia = materias_por_nome.get(nome_materia)
            num = q['numero_questao']
            notas = []
            ids_img = list(q.get('imagem_ids') or [])

            # --- contexto (texto base) ---------------------------------
            contexto = ''
            ids_texto = q.get('texto_base_ids') or []
            if ids_texto:
                partes = []
                for tid in ids_texto:
                    tb = textos_por_id.get(tid)
                    if tb:
                        partes.append(_texto_do_base(tb, ids_img))
                    else:
                        notas.append(f'Texto-base {tid} não encontrado no JSON')
                contexto = '\n\n'.join(p for p in partes if p)
            else:
                for grupo, tb in textos_legado.items():
                    if num in grupo:
                        contexto = _texto_do_base(tb, ids_img)
                        break

            # --- enunciado e alternativas ------------------------------
            enunciado = _limpar(q['enunciado'], ids_img)
            alternativas = []
            for a in q.get('alternativas', []):
                alternativas.append({
                    'letra': str(a['letra']).strip().upper(),
                    'texto': _limpar(a['texto'], ids_img),
                })

            letras = [a['letra'] for a in alternativas]
            if set(letras) <= {'C', 'E'}:
                tipo = 'certo_errado'
            elif letras:
                tipo = 'multipla_escolha'
            else:
                tipo = 'discursiva'

            # --- imagens -----------------------------------------------
            ids_unicos = list(dict.fromkeys(ids_img))
            tem_imagem = bool(ids_unicos) or bool(q.get('tem_imagem', False))
            if tem_imagem:
                notas.append('Questão com imagem — faça o upload manualmente')
            for id_img in ids_unicos:
                notas.append(_nota_imagem(id_img, imagens_por_id.get(id_img)))

            baixa_confianca = tem_imagem

            # --- revisão pedida pela IA / formatação suspeita ----------
            if q.get('revisar'):
                baixa_confianca = True
                notas.append('Revisar: ' + (q.get('motivo_revisao') or 'marcada pela IA para conferência'))

            tudo = ' '.join([enunciado, contexto] + [a['texto'] for a in alternativas])
            if destaque_sem_formatacao(enunciado, tudo):
                baixa_confianca = True
                notas.append(
                    'O enunciado cita trecho sublinhado/grifado/destacado, mas a questão '
                    'está sem formatação — confira na prova e sublinhe no editor'
                )

            # --- gabarito ------------------------------------------------
            gabarito_letra = _letra_gabarito(gabarito.get(num, q.get('gabarito', '')))
            gab_json = _letra_gabarito(q.get('gabarito', ''))
            if num in gabarito and gab_json and gab_json != gabarito_letra:
                baixa_confianca = True
                notas.append(
                    f'Gabarito do JSON ({gab_json}) diferia do gabarito oficial informado '
                    f'({gabarito_letra}) — foi usado o oficial'
                )
            status = 'pendente'
            if gabarito_letra == 'ANULADA':
                status = 'rejeitada'
                gabarito_letra = ''
                notas.append('Questão anulada pela banca')
            elif letras and gabarito_letra not in letras:
                baixa_confianca = True
                notas.append('Gabarito ausente ou não bate com as alternativas — conferir')

            questoes_objs.append(Questao(
                concurso=concurso,
                materia=materia,
                numero=num,
                tipo=tipo,
                enunciado=enunciado,
                contexto=contexto,
                gabarito=gabarito_letra,
                tem_imagem=tem_imagem,
                baixa_confianca=baixa_confianca,
                notas_extracao=notas,
                status=status,
            ))
            alternativas_brutas.append(alternativas)

        questoes_criadas = Questao.objects.bulk_create(questoes_objs)

        alternativas_objs = [
            Alternativa(questao=questao, letra=alt['letra'], texto=alt['texto'])
            for questao, alts in zip(questoes_criadas, alternativas_brutas)
            for alt in alts
        ]
        if alternativas_objs:
            Alternativa.objects.bulk_create(alternativas_objs)

        return len(questoes_criadas)


def importar_questoes_de_json(banca, concurso_nome, cargo, ano, json_file, gabarito_texto=''):
    """
    Importa questões a partir de um arquivo JSON já estruturado,
    sem passar pela extração via IA.

    Formato NOVO (o do prompt atual — preserva formatação e imagens):
    {
      "textos_base": [
        {"id": "TB_Q01", "titulo": "...", "conteudo": "... <u>trecho</u> ...", "fonte": "..." | null}
      ],
      "imagens": [
        {"id": "IMG_P07_01", "tipo": "figura|tabela|grafico|texto_em_imagem",
         "pagina": 7, "posicao": "...", "descricao": "...", "transcricao": "..." | null}
      ],
      "questoes": [
        {
          "numero_questao": 1,
          "materia": "Língua Portuguesa",
          "texto_base_ids": ["TB_Q01"],
          "enunciado": "... [[IMG:IMG_P07_01]] ...",
          "alternativas": [{"letra": "A", "texto": "<u>...</u>"}, ...],
          "gabarito": "A" | "ANULADA",
          "imagem_ids": ["IMG_P07_01"],
          "revisar": false,
          "motivo_revisao": null
        }
      ]
    }
    Tags aceitas nos textos: <u> <b> <i> <sup> <sub>.

    Formato ANTIGO (continua funcionando): texto_base embutido +
    questoes_que_compartilham_texto_base + tem_imagem.
    """
    conteudo = json_file.read()
    if isinstance(conteudo, bytes):
        conteudo = conteudo.decode('utf-8-sig')   # aceita BOM

    try:
        dados = _json.loads(conteudo)
    except _json.JSONDecodeError as e:
        raise ValueError(f'JSON inválido: {e}')

    if not isinstance(dados, dict):
        raise ValueError('O JSON precisa ser um objeto com a chave "questoes".')

    questoes = dados.get('questoes')
    if not questoes:
        raise ValueError('O JSON precisa ter uma chave "questoes" com uma lista de questões.')

    _validar_questoes(questoes)

    # O gabarito do JSON é só um fallback: a IA às vezes "resolve" a questão em
    # vez de copiar o gabarito. Se o gabarito oficial vier digitado, ele manda
    # e qualquer divergência fica anotada na questão.
    gabarito_oficial = parsear_gabarito(gabarito_texto)
    return _salvar_questoes(
        questoes, gabarito_oficial, banca, concurso_nome, cargo, ano,
        textos_base=dados.get('textos_base'),
        imagens=dados.get('imagens'),
    )