// src/services/adsService.js
//
// Camada única de anúncios do app (AdMob). As telas só chamam as funções
// daqui — nada de SDK espalhado pelas telas. Os IDs e o modo (teste/produção)
// vêm de src/adsConfig.js.
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds, {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import { ADS, INTERSTICIAL_A_CADA, DISPOSITIVOS_TESTE } from '../adsConfig';

const CHAVE_CONTADOR = 'ads_partidas_desde_intersticial';
const TIMEOUT_CARREGAR_MS = 20000;

// ─── Inicialização (lazy, uma vez só) ─────────────────────────────────────
let promessaInit = null;

export function inicializarAds() {
  if (!promessaInit) {
    promessaInit = (async () => {
      try {
        if (DISPOSITIVOS_TESTE.length > 0) {
          await mobileAds().setRequestConfiguration({
            testDeviceIdentifiers: DISPOSITIVOS_TESTE,
          });
        }
        await mobileAds().initialize();
        if (__DEV__) console.log(`[ads] inicializado em modo "${ADS.modo}"`);
      } catch (e) {
        if (__DEV__) console.warn('[ads] falha ao inicializar', e);
      }
    })();
  }
  return promessaInit;
}

// ─── Intersticial (fim de partida) ────────────────────────────────────────
let intersticial = null;
let intersticialCarregado = false;
let intersticialCarregando = false;

export async function preCarregarIntersticial() {
  if (intersticialCarregado || intersticialCarregando) return;
  intersticialCarregando = true;
  try {
    await inicializarAds();
    const ad = InterstitialAd.createForAdRequest(ADS.intersticialId);
    const remover = ad.addAdEventsListener(({ type, payload }) => {
      if (type === AdEventType.LOADED) {
        intersticial = ad;
        intersticialCarregado = true;
        intersticialCarregando = false;
      } else if (type === AdEventType.ERROR) {
        intersticialCarregando = false;
        remover();
        if (__DEV__) console.warn('[ads] intersticial não carregou', payload);
      }
    });
    ad.load();
  } catch (e) {
    intersticialCarregando = false;
    if (__DEV__) console.warn('[ads] erro ao pré-carregar intersticial', e);
  }
}

// Resolve `true` quando o anúncio foi exibido e fechado; `false` se não
// estava carregado ou deu erro (o app segue o fluxo normal nos dois casos).
function mostrarIntersticial() {
  return new Promise((resolve) => {
    if (!intersticialCarregado || !intersticial) return resolve(false);
    const ad = intersticial;
    intersticial = null;
    intersticialCarregado = false;

    const remover = ad.addAdEventsListener(({ type }) => {
      if (type === AdEventType.CLOSED) {
        remover();
        resolve(true);
      } else if (type === AdEventType.ERROR) {
        remover();
        resolve(false);
      }
    });
    ad.show().catch(() => {
      remover();
      resolve(false);
    });
  });
}

// ─── Contador de partidas (frequência do intersticial) ────────────────────
async function lerContador() {
  try {
    return parseInt(await AsyncStorage.getItem(CHAVE_CONTADOR), 10) || 0;
  } catch {
    return 0;
  }
}

export async function registrarPartidaConcluida() {
  try {
    await AsyncStorage.setItem(CHAVE_CONTADOR, String((await lerContador()) + 1));
  } catch {
    // silencioso
  }
}

export async function intersticialDevido() {
  return (await lerContador()) >= INTERSTICIAL_A_CADA;
}

// Chamado ao sair da ScoreScreen: só mostra se já for a vez E o anúncio
// estiver carregado. Se não estiver, o contador NÃO zera e tenta na próxima.
export async function mostrarIntersticialSeDevido() {
  if (!(await intersticialDevido())) return false;
  const mostrou = await mostrarIntersticial();
  if (mostrou) {
    try {
      await AsyncStorage.setItem(CHAVE_CONTADOR, '0');
    } catch {
      // silencioso
    }
  }
  return mostrou;
}

// ─── Premiado (vida extra) ────────────────────────────────────────────────
// `token` vem do backend e viaja ao Google como customData: é assim que o
// callback de verificação (SSV) sabe qual registro creditar.
// Resolve { recompensa: true } se o usuário assistiu até ganhar a recompensa;
// { recompensa: false } se fechou antes; rejeita se não conseguiu carregar.
export async function assistirAnuncioPremiado({ userId, token }) {
  await inicializarAds();

  return new Promise((resolve, reject) => {
    const ad = RewardedAd.createForAdRequest(ADS.premiadoId, {
      serverSideVerificationOptions: { userId: String(userId), customData: token },
    });

    let recompensa = false;
    let finalizado = false;
    let timeout = null;
    let remover = () => {};

    const finalizar = (acao) => {
      if (finalizado) return;
      finalizado = true;
      clearTimeout(timeout);
      remover();
      acao();
    };

    remover = ad.addAdEventsListener(({ type, payload }) => {
      if (type === RewardedAdEventType.LOADED) {
        clearTimeout(timeout); // o timeout vale só para o carregamento
        ad.show().catch((e) => finalizar(() => reject(e)));
      } else if (type === RewardedAdEventType.EARNED_REWARD) {
        recompensa = true;
      } else if (type === AdEventType.CLOSED) {
        finalizar(() => resolve({ recompensa }));
      } else if (type === AdEventType.ERROR) {
        finalizar(() =>
          reject(payload instanceof Error ? payload : new Error('Falha ao carregar o anúncio.'))
        );
      }
    });

    timeout = setTimeout(
      () => finalizar(() => reject(new Error('O anúncio demorou para carregar. Tente de novo.'))),
      TIMEOUT_CARREGAR_MS
    );

    ad.load();
  });
}