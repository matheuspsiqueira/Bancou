// src/services/notificacaoService.js
//
// Serviço de notificações push do Bancou, via Expo Push Notifications.
//
// IMPORTANTE (26-27/09/2026): expo-notifications tem módulo nativo próprio,
// só disponível em builds standalone já compilados com o pacote — nunca no
// Expo Go (que desde o SDK 53 removeu suporte a push remoto) e nunca num
// dev client/APK gerado antes do pacote ser adicionado ao projeto.
//
// A checagem de disponibilidade usa `requireOptionalNativeModule`, do
// `expo-modules-core` — a ferramenta OFICIAL do próprio Expo pra esse
// feature-detect. Ela consulta o registro nativo do Expo diretamente (sem
// nunca importar o pacote `expo-notifications` em si) e funciona igual em
// arquitetura antiga ou New Architecture. Tentativa anterior usava
// `NativeModules.<nome>` do react-native puro — parecia funcionar (evitava
// o crash em build sem o módulo), mas dava FALSO NEGATIVO mesmo em builds
// COM o módulo compilado, porque módulos nativos do Expo não aparecem
// nesse objeto clássico do jeito que se presumiu. `requireOptionalNativeModule`
// não tem esse problema — é null quando genuinamente ausente, e retorna o
// módulo normalmente quando compilado.
//
// Duas responsabilidades separadas, cada uma chamada do lugar certo:
//   - configurarNotificacoes(): configuração de nível de dispositivo
//     (canal do Android, comportamento em primeiro plano) — chamada uma
//     vez no boot do app (App.js), não depende de usuário logado.
//   - registrarTokenNotificacao(authFetch): pede permissão ao SO, gera o
//     expoPushToken e manda pro backend vinculado ao usuário — chamada
//     do AuthContext (login e restauração de sessão).

import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

let handlerConfigurado = false;

// Checagem "por fora", via expo-modules-core — ver docstring do arquivo.
// Só quando isso retorna true é seguro fazer require('expo-notifications').
function moduloNotificacoesDisponivel() {
  try {
    return !!requireOptionalNativeModule('ExpoPushTokenManager');
  } catch {
    return false;
  }
}

// require() tardio (não import estático) — só é chamado depois que
// moduloNotificacoesDisponivel() já confirmou que é seguro.
function carregarNotifications() {
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}

function garantirHandler(Notifications) {
  if (handlerConfigurado) return;
  try {
    // Comportamento ao receber notificação com o app em primeiro plano —
    // sem isso, o SO recebe mas não mostra nada nesse estado.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
    handlerConfigurado = true;
  } catch {
    // sem problema — segue sem handler
  }
}

// Canal obrigatório no Android 8+ pra notificação aparecer com prioridade
// normal (som + heads-up). Idempotente — pode chamar toda vez que o app
// abre. Não faz nada se o módulo nativo não estiver disponível neste build.
export async function configurarNotificacoes() {
  if (!moduloNotificacoesDisponivel()) return;

  const Notifications = carregarNotifications();
  if (!Notifications) return;

  garantirHandler(Notifications);

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
  } catch {
    // segue sem canal configurado
  }
}

// Pede permissão (só mostra o prompt do SO se ainda não foi decidida
// antes) e devolve o expoPushToken, ou null se negar/módulo indisponível.
export async function pedirPermissaoEObterToken() {
  if (!moduloNotificacoesDisponivel()) return null;

  const Notifications = carregarNotifications();
  if (!Notifications) return null;

  try {
    const { status: statusAtual } = await Notifications.getPermissionsAsync();
    let status = statusAtual;

    if (status !== 'granted') {
      const resposta = await Notifications.requestPermissionsAsync();
      status = resposta.status;
    }

    if (status !== 'granted') return null;

    const Constants = require('expo-constants').default;
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const { data: token } = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    return token;
  } catch {
    return null;
  }
}

// Chamada pelo AuthContext após login/restauração de sessão. Silenciosa
// de propósito: se o módulo nativo não existir neste build, se o usuário
// negar a permissão, ou se a rede falhar, o app segue normal, sem travar
// nem avisar — feedback visual explícito só quando a ação parte do
// toggle na PerfilScreen.
export async function registrarTokenNotificacao(authFetch) {
  try {
    const token = await pedirPermissaoEObterToken();
    if (!token) return null;

    await authFetch('/api/usuarios/notificacoes/', {
      method: 'PATCH',
      body: JSON.stringify({ expo_push_token: token }),
    });
    return token;
  } catch {
    return null;
  }
}