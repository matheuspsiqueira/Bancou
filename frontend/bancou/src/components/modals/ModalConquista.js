// src/components/modals/ModalConquista.js
// Modal de detalhe de uma conquista — mostra nome, imagem (P&B se
// bloqueada), descrição (explica como alcançar) e progresso/status.
// Overlay no padrão único do app (#00000099).
//
// Mesmo fix de pré-carregamento do ConquistaCard: pré-carrega a imagem
// remota com Image.prefetch antes de desenhar o SvgImage, evitando o
// espaço vazio por bug de repaint do react-native-svg no Android.

import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';

import Svg, {
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
  borderRadius,
} from '../../theme';

const TAMANHO_IMAGEM = 125;

const MATRIZ_GRAYSCALE = `
  0.299 0.587 0.114 0 0
  0.299 0.587 0.114 0 0
  0.299 0.587 0.114 0 0
  0     0     0     1 0
`;

export default function ModalConquista({
  conquista,
  visible,
  onClose,
}) {
  const [imagemPronta, setImagemPronta] = useState(true);

  useEffect(() => {
    const url = conquista?.imagem_url;
    if (!url) {
      setImagemPronta(true);
      return;
    }
    let cancelado = false;
    setImagemPronta(false);
    Image.prefetch(url)
      .then(() => { if (!cancelado) setImagemPronta(true); })
      .catch(() => { if (!cancelado) setImagemPronta(true); });
    return () => { cancelado = true; };
  }, [conquista?.imagem_url]);

  if (!conquista) return null;

  const bloqueada = !conquista.completada;

  const imagemSource = conquista.imagem_url
    ? { uri: conquista.imagem_url }
    : require('../../assets/kou-pensando.png');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.card}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.imagemWrap}>

            {!imagemPronta ? (
              <ActivityIndicator color={colors.textSecondary} />
            ) : bloqueada ? (
              <Svg
                width={TAMANHO_IMAGEM}
                height={TAMANHO_IMAGEM}
                style={styles.imagemSvg}
              >
                <Defs>
                  <Filter id="grayscaleModal">
                    <FeColorMatrix
                      type="matrix"
                      values={MATRIZ_GRAYSCALE}
                    />
                  </Filter>
                </Defs>

                <SvgImage
                  x="0"
                  y="0"
                  width={TAMANHO_IMAGEM}
                  height={TAMANHO_IMAGEM}
                  href={imagemSource}
                  preserveAspectRatio="xMidYMid meet"
                  filter="url(#grayscaleModal)"
                />
              </Svg>
            ) : (
              <Image
                source={imagemSource}
                style={styles.imagem}
                resizeMode="contain"
              />
            )}

          </View>

          <Text style={styles.nome}>
            {conquista.nome}
          </Text>

          {!!conquista.descricao && (
            <Text style={styles.descricao}>
              {conquista.descricao}
            </Text>
          )}

          {bloqueada ? (
            <Text style={styles.progresso}>
              {conquista.progresso}/{conquista.meta}
            </Text>
          ) : (
            <Text style={styles.completa}>
              ✅ Conquistada
            </Text>
          )}

          <TouchableOpacity
            style={styles.btnFechar}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.btnFecharTexto}>
              Fechar
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },

  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },

  imagemWrap: {
    width: TAMANHO_IMAGEM,
    height: TAMANHO_IMAGEM,
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },

  imagemSvg: {
    width: TAMANHO_IMAGEM,
    height: TAMANHO_IMAGEM,
  },

  imagem: {
    width: '100%',
    height: '100%',
  },

  nome: {
    fontFamily: typography.extraBold,
    fontSize: fontSize.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },

  descricao: {
    fontFamily: typography.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: spacing.md,
  },

  progresso: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },

  completa: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.primary,
    marginBottom: spacing.lg,
  },

  btnFechar: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },

  btnFecharTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.primary,
  },
});