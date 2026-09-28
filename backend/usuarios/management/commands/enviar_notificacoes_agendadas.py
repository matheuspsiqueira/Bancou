# usuarios/management/commands/enviar_notificacoes_agendadas.py
from django.core.management.base import BaseCommand

from usuarios.notificacoes import processar_notificacoes_agendadas


class Command(BaseCommand):
    help = (
        'Roda a checagem de notificações push agendadas (mesma lógica usada '
        'pelo endpoint de cron, em usuarios/notificacoes.py). Uso principal: '
        'teste manual local. Em produção, quem dispara isso de verdade é o '
        'workflow do GitHub Actions batendo em '
        '/api/usuarios/notificacoes/disparar-agendadas/.'
    )

    def handle(self, *args, **options):
        contagem = processar_notificacoes_agendadas()
        if not contagem:
            self.stdout.write('Nenhuma notificação elegível neste momento (confira o horário atual).')
            return
        for tipo, quantidade in contagem.items():
            self.stdout.write(self.style.SUCCESS(f'{tipo}: {quantidade} enviada(s)'))