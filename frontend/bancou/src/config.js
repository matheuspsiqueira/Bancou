// src/config.js

// DEV_URL: túnel do Cloudflare, muda toda vez que reinicia o cloudflared local.
// PROD_URL: backend hospedado no Render (produção).
const DEV_URL = 'https://affiliated-nebraska-certificates-presidential.trycloudflare.com';
const PROD_URL = 'https://SEU-APP.onrender.com'; // troca quando o backend estiver no ar

// Troca aqui pra alternar entre local e produção — é a única linha que precisa mexer.
export const API_URL = PROD_URL;

export const SITE_URL = API_URL;