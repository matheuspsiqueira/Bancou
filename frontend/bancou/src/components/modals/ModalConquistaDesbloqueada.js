// src/components/modals/ModalConquistaDesbloqueada.js
// Modal de CELEBRAÇÃO — diferente do ModalConquista (que mostra detalhe
// de progresso no perfil). Esse aqui aparece na ScoreScreen no momento
// em que uma conquista acaba de ser destravada: imagem colorida (já
// desbloqueada, sem P&B/anel), nome, descrição e a recompensa ganha.
//
// `conquista` aqui vem de ConquistaDesbloqueadaSerializer (backend):
// { id, nome, descricao, imagem_url, recompensa_xp, recompensa_moedas }
// — não tem progresso/meta/completada, então não reaproveita o
// ModalConquista do perfil.

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

export default function ModalConquistaDesbloqueada({ conquista, visible, onFechar }) {
  if (!conquista) return null;

  const imagemSource = conquista.imagem_url
    ? { uri: conquista.imagem_url }
    : require('../../assets/kou-torcendo.png');

  const temRecompensa = conquista.recompensa_xp > 0 || conquista.recompensa_moedas > 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.selo}>🏆 Nova conquista!</Text>

          <View style={styles.imagemWrap}>
            <Image source={imagemSource} style={styles.imagem} resizeMode="contain" />
          </View>

          <Text style={styles.nome}>{conquista.nome}</Text>

          {!!conquista.descricao && (
            <Text style={styles.descricao}>{conquista.descricao}</Text>
          )}

          {temRecompensa && (
            <View style={styles.recompensasRow}>
              {conquista.recompensa_xp > 0 && (
                <View style={styles.recompensaItem}>
                  <Image source={require('../../assets/icons/xp.png')} style={styles.recompensaIcone} resizeMode="contain" />
                  <Text style={styles.recompensaTexto}>+{conquista.recompensa_xp} XP</Text>
                </View>
              )}
              {conquista.recompensa_moedas > 0 && (
                <View style={styles.recompensaItem}>
                  <Image source={require('../../assets/icons/moeda.png')} style={styles.recompensaIcone} resizeMode="contain" />
                  <Text style={[styles.recompensaTexto, styles.recompensaMoedas]}>
                    +{conquista.recompensa_moedas}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity style={styles.botao} onPress={onFechar} activeOpacity={0.85}>
            <Text style={styles.botaoTexto}>Continuar</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  selo: {
    fontFamily: typography.bold,
    fontSize: fontSize.label,
    color: colors.primary,
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  imagemWrap: {
    width: 110,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  imagem: { width: '100%', height: '100%' },
  nome: {
    fontFamily: typography.extraBold,
    fontSize: fontSize.h1,
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
  recompensasRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.lg,
  },
  recompensaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recompensaIcone: { width: 18, height: 18 },
  recompensaTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.primary,
  },
  recompensaMoedas: { color: '#FFD700' },
  botao: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  botaoTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: '#FFFFFF',
  },
});