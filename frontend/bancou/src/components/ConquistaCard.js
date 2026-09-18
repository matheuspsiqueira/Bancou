// src/components/ConquistaCard.js
// Card de uma conquista no grid do perfil.
// Bloqueada: imagem_pb_url (já preto-e-branco, gerada no servidor) +
// anel de progresso. Desbloqueada: imagem_url colorida, sem anel.
// Tocar chama onPress.
//
// Não usa mais SvgImage/feColorMatrix pra filtrar a imagem em tempo
// real — o react-native-svg tinha bug de não desenhar imagem remota
// dentro de um filtro no Android (mesmo pré-carregada). O anel de
// progresso continua em SVG (só formas vetoriais, sem imagem, sempre
// funcionou bem).

import React from 'react';
import { View, Image, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import {
  colors,
  typography,
  fontSize,
  spacing,
  borderRadius,
} from '../theme';

const TAMANHO_IMAGEM = 74;
const ESPESSURA_ANEL = 3;
const RAIO = TAMANHO_IMAGEM / 2 + ESPESSURA_ANEL;
const TAMANHO_SVG = (RAIO + ESPESSURA_ANEL) * 2;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
const CENTRO = TAMANHO_SVG / 2;

export default function ConquistaCard({ conquista, onPress }) {
  const bloqueada = !conquista.completada;

  const pct =
    conquista.meta > 0
      ? Math.min(conquista.progresso / conquista.meta, 1)
      : 0;

  const offsetAnel = CIRCUNFERENCIA * (1 - pct);

  // Quando bloqueada, usa a versão PB já pronta do backend. Se ainda não
  // tiver imagem cadastrada (nem colorida nem PB), cai no Kou genérico
  // dos dois lados — sem imagem própria, não tem o que converter.
  const imagemSource = bloqueada
    ? (conquista.imagem_pb_url ? { uri: conquista.imagem_pb_url } : require('../assets/kou-pensando.png'))
    : (conquista.imagem_url ? { uri: conquista.imagem_url } : require('../assets/kou-pensando.png'));

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.imagemWrap}>
        <Image source={imagemSource} style={styles.imagem} resizeMode="contain" />

        {bloqueada && (
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

      <Text
        style={[styles.nome, !bloqueada && styles.nomeCompleta]}
        numberOfLines={2}
      >
        {conquista.nome}
      </Text>

      {bloqueada && (
        <Text style={styles.progresso}>
          {conquista.progresso}/{conquista.meta}
        </Text>
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
  imagem: {
    width: TAMANHO_IMAGEM, height: TAMANHO_IMAGEM,
    borderRadius: borderRadius.md,
  },
  anelSvg: { position: 'absolute' },
  nome: { fontFamily: typography.medium, fontSize: fontSize.caption, color: colors.textSecondary, textAlign: 'center' },
  nomeCompleta: { color: colors.primary },
  progresso: { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
});