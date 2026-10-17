// src/analytics.js
// Camada única de analytics: nenhuma tela importa o Firebase direto.
// Todas as funções são "fire and forget" e nunca derrubam o app.
import {
  getAnalytics,
  logEvent,
  logScreenView,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';

const analytics = getAnalytics();

// Erros vão para o console (aparecem no `adb logcat` quando precisar investigar),
// sem alerta na tela e sem derrubar o app.
function aviso(origem, e) {
  console.warn(`[analytics] ${origem}:`, e?.message ?? e);
}

export async function registrarEvento(nome, params = {}) {
  try {
    await logEvent(analytics, nome, params);
  } catch (e) {
    aviso(`registrarEvento(${nome})`, e);
  }
}

// Telas: usa logScreenView (nome da rota em screen_name).
export async function registrarTela(nome) {
  if (!nome) return;
  try {
    await logScreenView(analytics, {
      screen_name: nome,
      screen_class: nome,
    });
  } catch (e) {
    aviso(`registrarTela(${nome})`, e);
  }
}

// Use o ID numérico do usuário no backend. Nunca e-mail, nome ou qualquer dado pessoal.
export async function identificarUsuario(id) {
  try {
    await setUserId(analytics, id ? String(id) : null);
  } catch (e) {
    aviso('identificarUsuario', e);
  }
}

export async function definirPropriedade(nome, valor) {
  try {
    await setUserProperty(analytics, nome, valor == null ? null : String(valor));
  } catch (e) {
    aviso(`definirPropriedade(${nome})`, e);
  }
}