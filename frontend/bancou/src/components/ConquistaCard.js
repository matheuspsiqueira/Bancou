// src/components/ConquistaCard.js
// Card de uma conquista no grid do perfil.
// Bloqueada: imagem_pb_url (já preto-e-branco, gerada no servidor) +
// anel de progresso. Desbloqueada: imagem_url colorida, sem anel.
// Tocar chama onPress(conquista).
//
// Não usa mais SvgImage/feColorMatrix pra filtrar a imagem em tempo
// real — o react-native-svg tinha bug de não desenhar imagem remota
// dentro de um filtro no Android (mesmo pré-carregada). O anel de
// progresso continua em SVG (só formas vetoriais, sem imagem).
//
// 21/10/2026 — Performance do scroll no Perfil: card em React.memo (só
// re-renderiza se a conquista mudar), onPress agora recebe a conquista
// (handler estável no pai) e valores do anel/imagem em useMemo.

import React, { useMemo, useCallback } from 'react';
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

const KOU_PENSANDO = require('../assets/kou-pensando.png');

function ConquistaCard({ conquista, onPress }) {
  const bloqueada = !conquista.completada;

  const offsetAnel = useMemo(() => {
    const pct =
      conquista.meta > 0 ? Math.min(conquista.progresso / conquista.meta, 1) : 0;
    return { pct, offset: CIRCUNFERENCIA * (1 - pct) };
  }, [conquista.meta, conquista.progresso]);

  // Quando bloqueada, usa a versão PB já pronta do backend. Se ainda não
  // tiver imagem cadastrada (nem colorida nem PB), cai no Kou genérico.
  const imagemSource = useMemo(() => {
    const url = bloqueada ? conquista.imagem_pb_url : conquista.imagem_url;
    return url ? { uri: url } : KOU_PENSANDO;
  }, [bloqueada, conquista.imagem_pb_url, conquista.imagem_url]);

  const handlePress = useCallback(() => onPress(conquista), [onPress, conquista]);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.7}>
      <View style={styles.imagemWrap}>
        <Image source={imagemSource} style={styles.imagem} resizeMode="contain" />

        {bloqueada && (
          <Svg width={TAMANHO_SVG} height={TAMANHO_SVG} style={styles.anelSvg} pointerEvents="none">
            <Circle
              cx={CENTRO} cy={CENTRO} r={RAIO}
              stroke={colors.background} strokeWidth={ESPESSURA_ANEL} fill="none"
            />
            {offsetAnel.pct > 0 && (
              <Circle
                cx={CENTRO} cy={CENTRO} r={RAIO}
                stroke={colors.primary} strokeWidth={ESPESSURA_ANEL} fill="none"
                strokeDasharray={CIRCUNFERENCIA} strokeDashoffset={offsetAnel.offset}
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
        <Text style={styles.progresso}>
          {conquista.progresso}/{conquista.meta}
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default React.memo(ConquistaCard);

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