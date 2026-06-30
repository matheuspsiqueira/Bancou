import anthropic
import json as _json
import base64
import json
import os
import pdfplumber
import tempfile
from .models import Concurso, Materia, Questao, Alternativa

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
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        raise ValueError('ANTHROPIC_API_KEY não configurada no .env')

    client = anthropic.Anthropic(api_key=api_key)

    # Extrai texto do PDF da prova
    print("Extraindo texto do PDF da prova...")
    paginas_prova = extrair_texto_pdf(pdf_prova)
    print(f"  {len(paginas_prova)} páginas com texto encontradas")

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


def _salvar_questoes(questoes, gabarito, banca, concurso_nome, cargo, ano):
    concurso, _ = Concurso.objects.get_or_create(
        nome=concurso_nome,
        banca=banca,
        ano=ano,
        defaults={'cargo': cargo or ''}
    )

    # Mapeia textos base por grupo
    textos_base = {}
    for q in questoes:
        if q.get('texto_base') and q.get('questoes_que_compartilham_texto_base'):
            grupo = tuple(q['questoes_que_compartilham_texto_base'])
            if grupo not in textos_base:
                tb = q['texto_base']
                partes = []
                if tb.get('titulo'):
                    partes.append(tb['titulo'])
                if tb.get('conteudo'):
                    partes.append(tb['conteudo'])
                if tb.get('fonte'):
                    partes.append(f"Fonte: {tb['fonte']}")
                textos_base[grupo] = '\n'.join(partes)

    total = 0
    for q in questoes:
        # Matéria
        materia = None
        nome_materia = q.get('materia', '').strip()
        if nome_materia:
            materia, _ = Materia.objects.get_or_create(nome=nome_materia)

        # Contexto compartilhado
        contexto = ''
        num = q['numero_questao']
        for grupo, texto in textos_base.items():
            if num in grupo:
                contexto = texto
                break

        # Tipo
        letras = [a['letra'] for a in q.get('alternativas', [])]
        if set(letras) <= {'C', 'E'}:
            tipo = 'certo_errado'
        elif letras:
            tipo = 'multipla_escolha'
        else:
            tipo = 'discursiva'

        tem_imagem = q.get('tem_imagem', False)

        # Gabarito — usa o do JSON ou cruza com o PDF de gabarito
        gabarito_letra = gabarito.get(num, q.get('gabarito', ''))

        questao = Questao.objects.create(
            concurso=concurso,
            materia=materia,
            numero=num,
            tipo=tipo,
            enunciado=q['enunciado'],
            contexto=contexto,
            gabarito=gabarito_letra,
            tem_imagem=tem_imagem,
            baixa_confianca=tem_imagem,
            notas_extracao=['Questão com imagem — faça o upload manualmente'] if tem_imagem else [],
            status='pendente',
        )

        for alt in q.get('alternativas', []):
            Alternativa.objects.create(
                questao=questao,
                letra=alt['letra'],
                texto=alt['texto'],
            )

        total += 1

    return total


def importar_questoes_de_json(banca, concurso_nome, cargo, ano, json_file):
    """
    Importa questões a partir de um arquivo JSON já estruturado,
    sem passar pela extração via IA. Usa o mesmo schema que o
    PROMPT_EXTRACAO já produz, então um JSON exportado da extração
    automática (ou editado manualmente) pode ser reimportado direto.

    Schema esperado:
    {
      "questoes": [
        {
          "numero_questao": 1,
          "enunciado": "...",
          "texto_base": {"titulo": "...", "conteudo": "...", "fonte": "..."} | null,
          "texto_base_compartilhado": true | false,
          "questoes_que_compartilham_texto_base": [1, 2, 3],
          "alternativas": [{"letra": "A", "texto": "..."}, ...],
          "gabarito": "A",
          "materia": "Direito Constitucional",
          "tem_imagem": false
        }
      ]
    }
    """
    conteudo = json_file.read()
    if isinstance(conteudo, bytes):
        conteudo = conteudo.decode('utf-8')

    try:
        dados = _json.loads(conteudo)
    except _json.JSONDecodeError as e:
        raise ValueError(f'JSON inválido: {e}')

    questoes = dados.get('questoes')
    if not questoes:
        raise ValueError('O JSON precisa ter uma chave "questoes" com uma lista de questões.')

    # Validação mínima de cada questão antes de salvar
    for i, q in enumerate(questoes):
        if 'numero_questao' not in q:
            raise ValueError(f'Questão no índice {i} não tem "numero_questao".')
        if 'enunciado' not in q:
            raise ValueError(f'Questão {q.get("numero_questao", i)} não tem "enunciado".')

    # Reaproveita a mesma função de gravação usada pela extração via IA.
    # Gabarito já vem embutido em cada questão (campo "gabarito"), então
    # passamos um dict vazio — a função usa q.get('gabarito', '') como fallback.
    return _salvar_questoes(questoes, {}, banca, concurso_nome, cargo, ano)