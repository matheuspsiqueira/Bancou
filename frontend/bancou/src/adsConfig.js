// src/adsConfig.js
//
// Configuração dos anúncios (AdMob). Funciona igual ao config.js:
// UM bloco para cada situação, e a linha `export const ADS = ...` lá embaixo
// decide qual está valendo. Para trocar de modo, mude SÓ essa linha.
//
//   TESTE     → anúncios de exemplo do Google (seguros, sem risco para a conta).
//               O Google NÃO envia o callback de verificação (SSV) nesses anúncios,
//               então o app confirma a vida pelo endpoint de teste do backend.
//               Requer: API_URL apontando para o backend LOCAL/DEV (config.js) com
//               ANUNCIOS_CONFIRMACAO_DIRETA=True no .env do backend.
//
//   PRODUCAO  → blocos reais do AdMob. A vida só é creditada quando o GOOGLE
//               confirma o anúncio (SSV) — sem atalhos.
//               NUNCA clique nos seus próprios anúncios reais: use
//               DISPOSITIVOS_TESTE (abaixo) enquanto testa nesse modo.

const TESTE = {
  modo: 'teste',
  intersticialId: 'ca-app-pub-3940256099942544/1033173712', // ID de exemplo do Google (Android)
  premiadoId:     'ca-app-pub-3940256099942544/5224354917', // ID de exemplo do Google (Android)
  confirmacaoDireta: true,
};

const PRODUCAO = {
  modo: 'producao',
  intersticialId: 'ca-app-pub-5823717618050092/2111461852', // Score Interstitial
  premiadoId:     'ca-app-pub-5823717618050092/5364311155', // Vida Extra Rewarded
  confirmacaoDireta: false,
};

// ▼▼▼ TROQUE AQUI: TESTE  ↔  PRODUCAO ▼▼▼
export const ADS = TESTE;
// ▲▲▲ Antes de gerar o AAB da Play Store: ADS = PRODUCAO ▲▲▲

// Intersticial: aparece a cada N partidas concluídas (abandonadas não contam).
export const INTERSTICIAL_A_CADA = 3;

// IDs do SEU aparelho para receber anúncios de teste mesmo com blocos reais
// (modo PRODUCAO). O ID aparece no logcat ao rodar o app:
//   "Use RequestConfiguration.Builder().setTestDeviceIds(Arrays.asList("XXXXXXXX"))"
// Exemplo: ['33BE2250B43518CCDA7DE426D04EE231']
export const DISPOSITIVOS_TESTE = [];