# conquistas/apps.py
from django.apps import AppConfig


class ConquistasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'conquistas'
    verbose_name = 'Conquistas'

    def ready(self):
        import conquistas.signals  # noqa: F401 — registra o receiver do post_save