from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.contrib.sitemaps.views import sitemap
from django.http import JsonResponse
from django.views.decorators.http import require_safe
from django.http import HttpResponse

from landing.sitemaps import LandingSitemap


@require_safe
def health(request):
    """Endpoint leve pro ping do keep-alive (sem auth, sem banco)."""
    return JsonResponse({'status': 'ok'})

def app_ads_txt(request):
    return HttpResponse(
        "google.com, pub-5823717618050092, DIRECT, f08c47fec0942fa0\n",
        content_type="text/plain",
    )

@require_safe
def robots_txt(request):
    linhas = [
        "User-agent: *",
        "Allow: /",
        "Disallow: /admin/",
        "Disallow: /api/",
        "Disallow: /health/",
        "",
        "Sitemap: https://bancou.app.br/sitemap.xml",
    ]
    return HttpResponse("\n".join(linhas) + "\n", content_type="text/plain")


sitemaps = {'landing': LandingSitemap}

urlpatterns = [
    path('health/', health),
    path("app-ads.txt", app_ads_txt),
    path("robots.txt", robots_txt),
    path("sitemap.xml", sitemap, {'sitemaps': sitemaps},
         name='django.contrib.sitemaps.views.sitemap'),
    path('admin/', admin.site.urls),
    path('api/usuarios/', include('usuarios.urls')),
    path('api/questoes/', include('questoes.urls')),
    path('api/loja/', include('loja.urls')),
    path('api/conquistas/', include('conquistas.urls')),
    path('api/desafios/', include('desafios.urls')),
    path('api/suporte/', include('suporte.urls')),
    path('', include('landing.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)