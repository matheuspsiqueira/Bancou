from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from django.views.decorators.http import require_safe
from django.http import HttpResponse


@require_safe
def health(request):
    """Endpoint leve pro ping do keep-alive (sem auth, sem banco)."""
    return JsonResponse({'status': 'ok'})

def app_ads_txt(request):
    return HttpResponse(
        "google.com, pub-5823717618050092, DIRECT, f08c47fec0942fa0\n",
        content_type="text/plain",
    )


urlpatterns = [
    path('health/', health),
    path("app-ads.txt", app_ads_txt),
    path('admin/', admin.site.urls),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/questoes/', include('questoes.urls')),
    path('api/loja/', include('loja.urls')),
    path('api/conquistas/', include('conquistas.urls')),
    path('api/desafios/', include('desafios.urls')),
    path('', include('landing.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)