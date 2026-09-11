// src/context/KouAlertContext.js
import React, { createContext, useContext, useState, useCallback } from 'react';
import KouAlert from '../components/KouAlert';

const KouAlertContext = createContext();

export function KouAlertProvider({ children }) {
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
    <KouAlertContext.Provider value={{ alertar }}>
      {children}
      <KouAlert
        visivel={!!config}
        titulo={config?.titulo}
        mensagem={config?.mensagem}
        botoes={config?.botoes}
        pose={config?.pose}
        onFechar={fechar}
      />
    </KouAlertContext.Provider>
  );
}

export function useKouAlert() {
  const ctx = useContext(KouAlertContext);
  if (!ctx) {
    throw new Error('useKouAlert precisa estar dentro de <KouAlertProvider>');
  }
  return ctx;
}