// src/services/somService.js
//
// Serviço central de efeitos sonoros do Bancou.
// Usa expo-audio (createAudioPlayer), com um player pré-carregado por
// efeito, reaproveitado a cada chamada de tocar().
// A preferência de mudo é persistida via AsyncStorage.
//
// Histórico (pra não repetir os mesmos erros no futuro):
// - Pool de 2 instâncias por som: causava conflito no Android, onde
//   play() em uma instância pausa automaticamente as outras (bug
//   documentado no repositório do expo-audio). Resultado: delay de ~1s
//   especificamente no "pop" a partir do 2º toque.
// - Aquecimento (play+pause silencioso no boot): tocar/pausar várias
//   instâncias em sequência no início do app deixava a lib instável e
//   causava silêncio total depois de um tempo (bug conhecido do
//   expo-audio: perde o rastro do estado interno após várias reproduções
//   em sequência).
// Por isso: nada de pool, nada de aquecimento. Implementação mínima.

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState, useEffect, useCallback } from 'react';

const CHAVE_MUTADO = '@bancou:som_mutado';

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

let players = null;
let mutado = false;
let ouvintes = []; // callbacks avisados quando `mutado` muda (usado pelo hook)

function garantirPlayers() {
  if (players) return players;

  players = {};
  for (const [nome, fonte] of Object.entries(FONTES)) {
    players[nome] = createAudioPlayer(fonte);
  }
  return players;
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

  const p = garantirPlayers()[nome];
  if (!p) {
    console.warn(`[som] efeito "${nome}" não existe`);
    return;
  }

  try {
    p.seekTo(0);
    p.play();
  } catch (e) {
    console.warn(`[som] falha ao tocar "${nome}"`, e);
  }
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
  if (!players) return;
  Object.values(players).forEach((p) => p.release());
  players = null;
}