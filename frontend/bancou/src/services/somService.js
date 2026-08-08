// src/services/somService.js
//
// Serviço central de efeitos sonoros do Bancou.
// Usa expo-audio (createAudioPlayer), com os players pré-carregados
// uma única vez e reaproveitados a cada chamada de tocar().
// A preferência de mudo é persistida via AsyncStorage.
//
// Pool de players: cada efeito tem 2 instâncias alternadas entre si.
// A instância que vai tocar já está parada em 0 (foi resetada em segundo
// plano na chamada anterior), então tocar() nunca precisa esperar um
// seekTo() terminar antes do play() — é isso que elimina o delay.

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const CHAVE_MUTADO = '@bancou:som_mutado';
const TAMANHO_POOL = 2;

// Importante: o Metro só reconhece extensão de asset em minúsculo (mp3).
const FONTES = {
  sucessoQuestao: require('../assets/sounds/sucesso-questao.mp3'),
  erroQuestao: require('../assets/sounds/erro-questao.mp3'),
  sucessoFim: require('../assets/sounds/sucesso-fim.mp3'),
  erroFim: require('../assets/sounds/erro-fim.mp3'),
  levelUp: require('../assets/sounds/level-up.mp3'),
  pop: require('../assets/sounds/pop.mp3'),
  compra: require('../assets/sounds/compra.mp3'),
  // abertura: require('../assets/sounds/abertura.mp3'), // reservado pro som de abertura do app
};

let pools = null;      // { nome: [player0, player1] }
let indices = {};      // { nome: índice do próximo player a tocar }
let mutado = false;
let ouvintes = []; // callbacks avisados quando `mutado` muda (usado pelo hook)

function garantirPlayers() {
  if (pools) return pools;

  pools = {};
  for (const [nome, fonte] of Object.entries(FONTES)) {
    pools[nome] = Array.from({ length: TAMANHO_POOL }, () => createAudioPlayer(fonte));
    indices[nome] = 0;
  }
  return pools;
}

function notificarOuvintes() {
  ouvintes.forEach((cb) => cb(mutado));
}

// Chame uma vez no início do app (App.js) — carrega a preferência salva
// e prepara os players antes de qualquer tela precisar tocar som.
export async function iniciarSom() {
  await setAudioModeAsync({
    playsInSilentMode: true, // efeitos tocam mesmo no modo silencioso do iOS
    shouldPlayInBackground: false,
    interruptionMode: 'mixWithOthers',
  });
  garantirPlayers();

  try {
    const salvo = await AsyncStorage.getItem(CHAVE_MUTADO);
    mutado = salvo === '1';
    notificarOuvintes();
  } catch {
    // se falhar a leitura, mantém o padrão (som ligado)
  }
}

export function tocar(nome) {
  if (mutado) return;

  const grupo = garantirPlayers()[nome];
  if (!grupo) {
    console.warn(`[som] efeito "${nome}" não existe`);
    return;
  }

  const i = indices[nome];
  const player = grupo[i];

  try {
    player.play();
  } catch (e) {
    console.warn(`[som] falha ao tocar "${nome}"`, e);
  }

  // Reseta em segundo plano a OUTRA instância do par, que já tocou antes
  // e ficou parada no fim do áudio. Isso não bloqueia o play() acima —
  // quando ela for chamada de novo (na próxima rodada), já vai estar
  // pronta em 0, sem precisar esperar o seekTo.
  const proximo = grupo[(i + 1) % TAMANHO_POOL];
  proximo.seekTo(0).catch(() => {});

  indices[nome] = (i + 1) % TAMANHO_POOL;
}

// Define e persiste o estado de mudo. Use setSomHabilitado() abaixo se
// preferir pensar em termos de "ligado/desligado" em vez de "mudo".
export async function setMutado(valor) {
  mutado = valor;
  notificarOuvintes();
  try {
    await AsyncStorage.setItem(CHAVE_MUTADO, valor ? '1' : '0');
  } catch {
    // persistência falhou, mas o estado em memória já foi atualizado
  }
}

export async function setSomHabilitado(habilitado) {
  await setMutado(!habilitado);
}

export function isMutado() {
  return mutado;
}

// ── Hook para o toggle na tela de Perfil ──────────────────────────────────
// Uso: const [somHabilitado, alternarSom] = useSomHabilitado();
export function useSomHabilitado() {
  const [habilitado, setHabilitado] = useState(!mutado);

  useEffect(() => {
    const ouvinte = (novoMutado) => setHabilitado(!novoMutado);
    ouvintes.push(ouvinte);
    // sincroniza caso iniciarSom() ainda não tivesse terminado de ler o
    // AsyncStorage quando este componente montou
    setHabilitado(!mutado);

    return () => {
      ouvintes = ouvintes.filter((o) => o !== ouvinte);
    };
  }, []);

  const alternar = useCallback((valor) => {
    setSomHabilitado(valor);
  }, []);

  return [habilitado, alternar];
}

// Chame ao desmontar o app, se necessário (geralmente não precisa)
export function liberarSom() {
  if (!pools) return;
  Object.values(pools).forEach((grupo) => grupo.forEach((p) => p.release()));
  pools = null;
}