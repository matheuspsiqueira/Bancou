// src/components/modals/ModalConquista.js
// Modal de detalhe de uma conquista — nome, imagem (imagem_pb_url se
// bloqueada, já preto-e-branco vinda do backend), descrição e
// progresso/status. Overlay no padrão único do app (#00000099).
//
// Sem SvgImage/filtro — mesmo motivo do ConquistaCard.

import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

import {
  colors,
  typography,
  fontSize,
  spacing,
  borderRadius,
} from '../../theme';

const TAMANHO_IMAGEM = 125;

export default function ModalConquista({
  conquista,
  visible,
  onClose,
}) {
  if (!conquista) return null;

  const bloqueada = !conquista.completada;

  const imagemSource = bloqueada
    ? (conquista.imagem_pb_url ? { uri: conquista.imagem_pb_url } : require('../../assets/kou-pensando.png'))
    : (conquista.imagem_url ? { uri: conquista.imagem_url } : require('../../assets/kou-pensando.png'));

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
            <Image
              source={imagemSource}
              style={styles.imagem}
              resizeMode="contain"
            />
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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
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