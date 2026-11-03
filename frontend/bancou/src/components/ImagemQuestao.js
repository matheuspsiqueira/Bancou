// src/components/ImagemQuestao.js
import React, { useState } from 'react';
import { View, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography } from '../theme';

const BORDA = '#333355';

/**
 * Imagem de questão (enunciado, texto-base ou alternativa).
 * Isolada em componente próprio: use `key` com o id da questão (e da imagem)
 * para que o estado de erro/loading resete sozinho a cada troca de questão.
 *
 * `altura`: 240 para imagens do enunciado; menor (ex.: 150) dentro de alternativas.
 */
export default function ImagemQuestao({ uri, altura = 240 }) {
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  if (!uri || erro) {
    return (
      <View style={estilos.erroBox}>
        <Text style={estilos.erroTexto}>🖼️ Não foi possível carregar a imagem</Text>
      </View>
    );
  }

  return (
    <View style={[estilos.container, { minHeight: Math.min(200, altura) }]}>
      {carregando && (
        <ActivityIndicator size="small" color={colors.primary} style={estilos.loading} />
      )}
      <Image
        source={{ uri }}
        style={[estilos.imagem, { height: altura }]}
        resizeMode="contain"
        onLoadEnd={() => setCarregando(false)}
        onError={() => {
          setCarregando(false);
          setErro(true);
        }}
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  container: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: BORDA,
    padding: 8, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'stretch',
  },
  imagem: { width: '100%', borderRadius: 8 },
  loading: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center', alignItems: 'center',
  },
  erroBox: {
    backgroundColor: colors.card, borderRadius: 14,
    borderWidth: 1, borderColor: BORDA, borderStyle: 'dashed',
    padding: 20, alignItems: 'center', justifyContent: 'center',
    alignSelf: 'stretch',
  },
  erroTexto: {
    fontFamily: typography.regular, fontSize: 13, color: colors.textSecondary, textAlign: 'center',
  },
});