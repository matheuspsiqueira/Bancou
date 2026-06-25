import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from questoes.models import Banca, Concurso, Materia, Questao, Alternativa

# ---------------------------------------------------------------
BANCA_NOME = 'FGV'
CONCURSO_NOME = 'TJRJ Técnico de Atividade Judiciária'
CARGO = 'Técnico de Atividade Judiciária sem especialidade'
ANO = 2018
JSON_PATH = 'questoes_tjrj.json'
# ---------------------------------------------------------------

with open(JSON_PATH, 'r', encoding='utf-8') as f:
    dados = json.load(f)

banca, _ = Banca.objects.get_or_create(nome=BANCA_NOME)
concurso, _ = Concurso.objects.get_or_create(
    nome=CONCURSO_NOME,
    banca=banca,
    ano=ANO,
    defaults={'cargo': CARGO}
)

# Guarda texto base por grupo de questões (pega o primeiro que aparecer)
textos_base = {}
for q in dados['questoes']:
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
for q in dados['questoes']:
    # Resolve matéria
    materia = None
    nome_materia = q.get('materia', '').strip()
    if nome_materia:
        materia, _ = Materia.objects.get_or_create(nome=nome_materia)

    # Resolve contexto — busca pelo grupo que contém esse número
    contexto = ''
    num = q['numero_questao']
    for grupo, texto in textos_base.items():
        if num in grupo:
            contexto = texto
            break

    # Detecta tipo
    letras = [a['letra'] for a in q['alternativas']]
    if set(letras) <= {'C', 'E'}:
        tipo = 'certo_errado'
    else:
        tipo = 'multipla_escolha'

    questao = Questao.objects.create(
        concurso=concurso,
        materia=materia,
        numero=q['numero_questao'],
        tipo=tipo,
        enunciado=q['enunciado'],
        contexto=contexto,
        tem_imagem=q.get('tem_imagem', False),
        baixa_confianca=False,
        notas_extracao=[],
        status='pendente',
    )

    for alt in q['alternativas']:
        Alternativa.objects.create(
            questao=questao,
            letra=alt['letra'],
            texto=alt['texto'],
        )

    total += 1
    print(f"✅ Q{q['numero_questao']} [{materia}]: {q['enunciado'][:60]}...")

print(f"\n✅ {total} questões importadas!")
print(f"   Banca: {banca}")
print(f"   Concurso: {concurso}")