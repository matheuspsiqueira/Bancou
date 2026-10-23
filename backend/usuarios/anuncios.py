"""
Anúncios premiados (AdMob) — verificação do lado do servidor (SSV).

Quando o usuário conclui um anúncio premiado, o Google chama a nossa URL
de callback (GET) com os dados da recompensa e uma assinatura digital
(ECDSA/SHA-256). Só creditamos a vida se a assinatura for válida — assim
ninguém consegue ganhar vidas "de graça" chamando a API na mão.

Docs: https://developers.google.com/admob/android/rewarded-video-ssv
"""
import base64
import json
import logging
import time
from datetime import timedelta
from urllib.parse import parse_qs
from urllib.request import urlopen

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import load_pem_public_key
from django.conf import settings
from django.db import IntegrityError, transaction
from django.utils import timezone

logger = logging.getLogger(__name__)

URL_CHAVES_GOOGLE = 'https://www.gstatic.com/admob/reward/verifier-keys.json'
CACHE_CHAVES_SEGUNDOS = 24 * 3600
INTERVALO_MIN_REBUSCA_SEGUNDOS = 300   # evita martelar o Google se chegar key_id desconhecido
VALIDADE_TOKEN = timedelta(minutes=30)

# Resultados de creditar_vida_por_anuncio
OK = 'ok'
TOKEN_DESCONHECIDO = 'token_desconhecido'
JA_CONFIRMADO = 'ja_confirmado'
USUARIO_DIFERENTE = 'usuario_diferente'
EXPIRADO = 'expirado'
LIMITE_DIARIO = 'limite_diario'

_cache = {'chaves': {}, 'buscado_em': 0.0}


def _buscar_chaves_google():
    with urlopen(URL_CHAVES_GOOGLE, timeout=5) as resp:
        dados = json.loads(resp.read().decode('utf-8'))
    return {str(k['keyId']): k['pem'] for k in dados['keys']}


def _chave_publica_pem(key_id):
    agora = time.time()
    idade = agora - _cache['buscado_em']
    precisa_buscar = idade > CACHE_CHAVES_SEGUNDOS or (
        key_id not in _cache['chaves'] and idade > INTERVALO_MIN_REBUSCA_SEGUNDOS
    )
    if precisa_buscar:
        try:
            _cache['chaves'] = _buscar_chaves_google()
            _cache['buscado_em'] = agora
        except Exception:
            logger.exception('SSV: falha ao buscar as chaves públicas do Google.')
    return _cache['chaves'].get(str(key_id))


def verificar_assinatura_ssv(query_string):
    """
    `query_string` é a query CRUA da requisição (request.META['QUERY_STRING']).
    A mensagem assinada é tudo que vem antes de "&signature=" — por isso não
    pode ser reconstruída a partir de request.GET (a ordem/encoding mudariam).
    """
    mensagem, separador, resto = query_string.partition('&signature=')
    if not separador:
        return False
    params = parse_qs('signature=' + resto)
    try:
        assinatura = params['signature'][0]
        key_id = params['key_id'][0]
    except (KeyError, IndexError):
        return False

    try:
        pem = _chave_publica_pem(key_id)
        if not pem:
            return False
        assinatura_bytes = base64.urlsafe_b64decode(assinatura + '=' * (-len(assinatura) % 4))
        chave = load_pem_public_key(pem.encode('utf-8'))
        chave.verify(assinatura_bytes, mensagem.encode('utf-8'), ec.ECDSA(hashes.SHA256()))
        return True
    except (InvalidSignature, ValueError):
        return False
    except Exception:
        logger.exception('SSV: erro inesperado ao verificar a assinatura.')
        return False


def unidade_confere(ad_unit):
    """Garante que o anúncio veio do NOSSO bloco premiado (e não de outro app)."""
    esperado = settings.ADMOB_UNIDADE_PREMIADO.split('/')[-1]
    return bool(ad_unit) and str(ad_unit).split('/')[-1] == esperado


def creditar_vida_por_anuncio(token, usuario_id=None, transaction_id=None):
    """
    Confirma o registro `token` e credita +1 vida no pote de vidas_extras
    (acumula e NÃO é cortada pela recarga diária da 00h). Retorna uma das
    constantes de resultado acima. `usuario_id` (quando informado) precisa
    bater com o dono do token. Idempotente: o mesmo token/transaction_id
    nunca credita 2x.
    """
    from .models import AnuncioVidaExtra, Usuario

    if not token:
        return TOKEN_DESCONHECIDO

    try:
        with transaction.atomic():
            registro = AnuncioVidaExtra.objects.select_for_update().filter(token=token).first()
            if registro is None:
                return TOKEN_DESCONHECIDO
            if registro.confirmado_em is not None:
                return JA_CONFIRMADO
            if usuario_id is not None and str(registro.usuario_id) != str(usuario_id):
                return USUARIO_DIFERENTE
            if timezone.now() - registro.criado_em > VALIDADE_TOKEN:
                return EXPIRADO

            usuario = Usuario.objects.select_for_update().get(pk=registro.usuario_id)
            if AnuncioVidaExtra.restantes_hoje(usuario) <= 0:
                return LIMITE_DIARIO

            registro.confirmado_em = timezone.now()
            registro.transaction_id = transaction_id or None
            registro.save(update_fields=['confirmado_em', 'transaction_id'])

            usuario.vidas_extras += 1
            usuario.save(update_fields=['vidas_extras'])
            return OK
    except IntegrityError:
        # transaction_id repetido → o Google reenviou o mesmo callback.
        return JA_CONFIRMADO