from django import forms

CONCURSOS = [
    'INSS',
    'Polícia Militar',
    'Polícia Civil',
    'Polícia Federal',
    'Banco do Brasil',
    'Caixa',
    'Correios',
    'Tribunais (TRT/TRF/TJ)',
    'Prefeitura',
    'Outro',
    'Ainda não defini',
]


class PioneiroForm(forms.Form):
    nome = forms.CharField(max_length=80, error_messages={'required': 'Informe seu nome.'})
    email = forms.EmailField(error_messages={
        'required': 'Informe seu e-mail.', 'invalid': 'Esse e-mail não parece válido.',
    })
    concurso = forms.ChoiceField(
        choices=[(c, c) for c in CONCURSOS],
        error_messages={
            'required': 'Escolha para qual concurso você estuda.',
            'invalid_choice': 'Escolha um concurso da lista.',
        },
    )
    consentimento = forms.BooleanField(error_messages={
        'required': 'Marque a caixa para autorizar o envio.',
    })
    origem = forms.CharField(max_length=160, required=False)