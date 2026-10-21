from django.contrib.sitemaps import Sitemap
from django.urls import reverse


class LandingSitemap(Sitemap):
    protocol = 'https'
    changefreq = 'monthly'

    def items(self):
        return [
            'landing:index',
            'landing:quem_somos',
            'landing:termos',
            'landing:privacidade',
        ]

    def location(self, item):
        return reverse(item)

    def priority(self, item):
        return 1.0 if item == 'landing:index' else 0.6