// src/context/PontsAlertContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import PontsAlert from '../components/PontsAlert';

const PontsAlertContext = createContext();

export function PontsAlertProvider({ children }) {
  const [config, setConfig] = useState(null);

  // Mesma "forma" do Alert.alert do RN, pra facilitar a migração:
  // alertar(titulo, mensagem, botoes, { pose })
  const alertar = useCallback((titulo, mensagem, botoes, opcoes = {}) => {
    setConfig({
      titulo,
      mensagem,
      botoes: botoes && botoes.length ? botoes : [{ text: 'OK' }],
      pose: opcoes.pose || null, // 'animado' | 'ops' | 'pensando' | 'torcendo' | 'dormindo' | etc, ou null
    });
  }, []);

  const fechar = useCallback(() => setConfig(null), []);

  return (
    <PontsAlertContext.Provider value={{ alertar }}>
      {children}
      <PontsAlert
        visivel={!!config}
        titulo={config?.titulo}
        mensagem={config?.mensagem}
        botoes={config?.botoes}
        pose={config?.pose}
        onFechar={fechar}
      />
    </PontsAlertContext.Provider>
  );
}

export function usePontsAlert() {
  const ctx = useContext(PontsAlertContext);
  if (!ctx) {
    throw new Error('usePontsAlert precisa estar dentro de <PontsAlertProvider>');
  }
  return ctx;
}
