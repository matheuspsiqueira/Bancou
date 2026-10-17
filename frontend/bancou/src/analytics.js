// src/analytics.js
// Camada única de analytics: nenhuma tela importa o Firebase direto.
// Todas as funções são "fire and forget" e nunca derrubam o app.
import {
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperty,
} from '@react-native-firebase/analytics';

const analytics = getAnalytics();

function aviso(e) {
  if (__DEV__) console.warn('[analytics]', e?.message ?? e);
}

export async function registrarEvento(nome, params = {}) {
  try {
    await logEvent(analytics, nome, params);
  } catch (e) {
    aviso(e);
  }
}

export async function registrarTela(nome) {
  if (!nome) return;
  try {
    await logEvent(analytics, 'screen_view', {
      screen_name: nome,
      screen_class: nome,
    });
  } catch (e) {
    aviso(e);
  }
}

// Use o ID numérico do usuário no backend. Nunca e-mail, nome ou qualquer dado pessoal.
export async function identificarUsuario(id) {
  try {
    await setUserId(analytics, id ? String(id) : null);
  } catch (e) {
    aviso(e);
  }
}

export async function definirPropriedade(nome, valor) {
  try {
    await setUserProperty(analytics, nome, valor == null ? null : String(valor));
  } catch (e) {
    aviso(e);
  }
}