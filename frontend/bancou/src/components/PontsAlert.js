// src/components/PontsAlert.js
import React from 'react';
import { Modal, View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';

// Mapa de poses disponíveis hoje. Adicione aqui assim que novas poses
// forem geradas (ex: 'chorando' pra despedidas/exclusão de conta).
const POSES = {
  animado:    require('../assets/kou-animado.png'),
  constancia: require('../assets/kou-constancia.png'),
  dormindo:   require('../assets/kou-dormindo.png'),
  evolucao:   require('../assets/kou-evolucao.png'),
  foco:       require('../assets/kou-foco.png'),
  ops:        require('../assets/kou-ops.png'),
  pensando:   require('../assets/kou-pensando.png'),
  torcendo:   require('../assets/kou-torcendo.png'),
  triste:   require('../assets/kou-triste.png'),
  dinheiro: require('../assets/kou-dinheiro.png'),
};

export default function PontsAlert({ visivel, titulo, mensagem, botoes = [], pose, onFechar }) {
  const executar = (botao) => {
    onFechar();
    // Pequeno delay pra deixar o modal fechar antes de disparar ações
    // mais pesadas (ex: navegação, logout) — evita flicker visual.
    if (botao?.onPress) {
      setTimeout(() => botao.onPress(), 150);
    }
  };

  return (
    <Modal visible={visivel} transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {pose && POSES[pose] && (
            <Image source={POSES[pose]} style={styles.ponts} resizeMode="contain" />
          )}

          {titulo ? <Text style={styles.titulo}>{titulo}</Text> : null}
          {mensagem ? <Text style={styles.mensagem}>{mensagem}</Text> : null}

          <View style={[styles.botoesRow, botoes.length > 2 && styles.botoesColuna]}>
            {botoes.map((botao, i) => (
              <TouchableOpacity
                key={i}
                style={[
                  styles.botao,
                  botao.style === 'cancel' && styles.botaoCancelar,
                  botao.style === 'destructive' && styles.botaoDestrutivo,
                  botoes.length === 1 && styles.botaoUnico,
                ]}
                onPress={() => executar(botao)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.botaoTexto,
                    botao.style === 'cancel' && styles.botaoTextoCancelar,
                  ]}
                >
                  {botao.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    paddingTop: spacing.xl2,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    alignItems: 'center',
  },
  ponts: {
    width: 88,
    height: 88,
    marginBottom: spacing.md,
  },
  titulo: {
    fontFamily: typography.bold,
    fontSize: fontSize.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  mensagem: {
    fontFamily: typography.regular,
    fontSize: fontSize.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  botoesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  botoesColuna: {
    flexDirection: 'column',
  },
  botao: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 13,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  botaoUnico: {
    flex: 1,
  },
  botaoCancelar: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#35355a',
  },
  botaoDestrutivo: {
    backgroundColor: colors.lives,
  },
  botaoTexto: {
    fontFamily: typography.bold,
    fontSize: fontSize.button,
    color: colors.text,
  },
  botaoTextoCancelar: {
    color: colors.textSecondary,
  },
});
