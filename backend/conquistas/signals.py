# conquistas/signals.py
import time
from io import BytesIO

from django.core.files.base import ContentFile
from django.db.models.signals import post_save
from django.dispatch import receiver
from PIL import Image as PILImage

from .models import Conquista


@receiver(post_save, sender=Conquista)
def gerar_imagem_pb(sender, instance, **kwargs):
    """
    Gera (ou regenera) a versão preto-e-branco de `imagem`, sempre que a
    Conquista é salva e tem uma imagem, no servidor.

    Por quê aqui e não em tempo real no app: o filtro SVG (feColorMatrix)
    aplicado na imagem remota direto no React Native se mostrou pouco
    confiável no Android — o <Image> do react-native-svg às vezes não
    desenhava a imagem remota dentro do filtro. Gerando o PB pronto aqui,
    o app só troca entre duas imagens já prontas (imagem_url /
    imagem_pb_url) com o <Image> normal do RN.

    Duas pegadinhas resolvidas aqui:
    1. Transparência: `.convert('L')` sozinho descarta o canal alpha —
       recolocar como RGBA opaco depois vira preto sólido onde era
       transparente. Por isso o alpha é separado ANTES de converter pra
       cinza, e recolocado depois.
    2. Cache: o nome do arquivo sempre inclui um timestamp. Sem isso, uma
       regeneração produz o MESMO nome de arquivo de antes → MESMA URL →
       tanto o CDN (Cloudinary) quanto o cache de imagem do próprio app
       continuam servindo a versão antiga em cache, mesmo com o arquivo
       certo já salvo no servidor. Com URL sempre nova, esse problema
       nunca mais acontece, inclusive em edições futuras de imagem.

    Roda em TODO save (não só quando a imagem muda) — é barato, é só
    admin (sem tráfego alto), e evita ter que rastrear se a imagem
    "mudou de verdade" pra decidir se regenera. Usa queryset.update()
    (não instance.save()) pra gravar o resultado — update() não dispara
    o post_save de novo, evitando loop infinito.
    """
    if not instance.imagem:
        return

    instance.imagem.open()
    original = PILImage.open(instance.imagem).convert('RGBA')

    # Separa o alpha, converte só o RGB pra escala de cinza, recoloca o
    # alpha original — preserva a transparência do PNG.
    r, g, b, alpha = original.split()
    cinza = PILImage.merge('RGB', (r, g, b)).convert('L')
    imagem_pb = PILImage.merge('RGBA', (cinza, cinza, cinza, alpha))

    buffer = BytesIO()
    imagem_pb.save(buffer, format='PNG')
    instance.imagem.close()

    nome_arquivo = instance.imagem.name.rsplit('/', 1)[-1]
    nome_pb = f'pb_{int(time.time())}_{nome_arquivo}'  # timestamp = URL sempre nova

    instance.imagem_pb.save(nome_pb, ContentFile(buffer.getvalue()), save=False)
    Conquista.objects.filter(pk=instance.pk).update(imagem_pb=instance.imagem_pb.name)