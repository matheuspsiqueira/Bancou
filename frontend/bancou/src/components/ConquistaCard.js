// src/components/ConquistaCard.js
// Card de uma conquista no grid do perfil.
// Bloqueada: imagem em preto-e-branco + anel de progresso.
// Desbloqueada: imagem colorida, sem anel.
// Tocar chama onPress.
//
// Pré-carrega a imagem remota com Image.prefetch antes de desenhar o
// SvgImage — sem isso, no Android o SvgImage às vezes não repinta
// sozinho quando o download termina, deixando um espaço vazio até
// alguma coisa forçar um novo render (era por isso que sair e voltar
// da tela "resolvia": remontava o componente por acaso).

import React, { useState, useEffect } from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Filter,
  FeColorMatrix,
  Image as SvgImage,
} from 'react-native-svg';

import {
  colors,
  typography,
  fontSize,
  spacing,
} from '../theme';

const TAMANHO_IMAGEM = 64;
const ESPESSURA_ANEL = 3;
const RAIO = TAMANHO_IMAGEM / 2 + ESPESSURA_ANEL;
const TAMANHO_SVG = (RAIO + ESPESSURA_ANEL) * 2;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const CENTRO = TAMANHO_SVG / 2;

const MATRIZ_GRAYSCALE = `
  0.299 0.587 0.114 0 0
  0.299 0.587 0.114 0 0
  0.299 0.587 0.114 0 0
  0     0     0     1 0
`;

export default function ConquistaCard({ conquista, onPress }) {
  const bloqueada = !conquista.completada;

  const pct =
    conquista.meta > 0
      ? Math.min(conquista.progresso / conquista.meta, 1)
      : 0;

  const offsetAnel = CIRCUNFERENCIA * (1 - pct);

  const imagemSource = conquista.imagem_url
    ? { uri: conquista.imagem_url }
    : require('../assets/kou-pensando.png');

  // Só precisa pré-carregar imagem remota — o require local já está
  // embutido no bundle, sempre "pronto".
  const [imagemPronta, setImagemPronta] = useState(!conquista.imagem_url);

  useEffect(() => {
    if (!conquista.imagem_url) {
      setImagemPronta(true);
      return;
    }
    let cancelado = false;
    setImagemPronta(false);
    Image.prefetch(conquista.imagem_url)
      .then(() => { if (!cancelado) setImagemPronta(true); })
      .catch(() => { if (!cancelado) setImagemPronta(true); }); // mesmo se falhar, libera o render
    return () => { cancelado = true; };
  }, [conquista.imagem_url]);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imagemWrap}>

        {!imagemPronta ? (
          <ActivityIndicator size="small" color={colors.textSecondary} />
        ) : bloqueada ? (
          <Svg width={TAMANHO_IMAGEM} height={TAMANHO_IMAGEM} style={styles.imagemSvg}>
            <Defs>
              <Filter id="grayscale">
                <FeColorMatrix type="matrix" values={MATRIZ_GRAYSCALE} />
              </Filter>
            </Defs>
            <SvgImage
              x="0" y="0"
              width={TAMANHO_IMAGEM} height={TAMANHO_IMAGEM}
              href={imagemSource}
              preserveAspectRatio="xMidYMid meet"
              filter="url(#grayscale)"
            />
          </Svg>
        ) : (
          <Image source={imagemSource} style={styles.imagem} resizeMode="contain" />
        )}

        {imagemPronta && bloqueada && (
          <Svg width={TAMANHO_SVG} height={TAMANHO_SVG} style={styles.anelSvg} pointerEvents="none">
            <Circle
              cx={CENTRO} cy={CENTRO} r={RAIO}
              stroke={colors.background} strokeWidth={ESPESSURA_ANEL} fill="none"
            />
            {pct > 0 && (
              <Circle
                cx={CENTRO} cy={CENTRO} r={RAIO}
                stroke={colors.primary} strokeWidth={ESPESSURA_ANEL} fill="none"
                strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={offsetAnel}
                strokeLinecap="round" rotation="-90" origin={`${CENTRO}, ${CENTRO}`}
              />
            )}
          </Svg>
        )}
      </View>

      <Text style={[styles.nome, !bloqueada && styles.nomeCompleta]} numberOfLines={2}>
        {conquista.nome}
      </Text>

      {bloqueada && (
        <Text style={styles.progresso}>{conquista.progresso}/{conquista.meta}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { width: '31%', alignItems: 'center', marginBottom: spacing.lg },
  imagemWrap: {
    width: TAMANHO_SVG, height: TAMANHO_SVG,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xs,
  },
  imagemSvg: { position: 'absolute', width: TAMANHO_IMAGEM, height: TAMANHO_IMAGEM },
  imagem: { width: TAMANHO_IMAGEM, height: TAMANHO_IMAGEM },
  anelSvg: { position: 'absolute' },
  nome: { fontFamily: typography.medium, fontSize: fontSize.caption, color: colors.textSecondary, textAlign: 'center' },
  nomeCompleta: { color: colors.primary },
  progresso: { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
});