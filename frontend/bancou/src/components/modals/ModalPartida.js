// src/components/modals/ModalPartida.js
// Extraído de HomeScreen.js — lógica idêntica à original, sem alterações.
// Redesign visual (09/2026): recompensas agrupadas em um card único,
// CTA principal com texto mais curto + legenda, toggle Sem tempo/Com tempo
// com peso visual balanceado entre as duas opções.
// Ajuste 09/2026 (2): sem TextInput aqui, então não precisa de
// KeyboardAvoidingView — o problema deste modal era só o paddingBottom
// fixo (40) cortando o conteúdo atrás da barra de navegação do Android;
// trocado por insets.bottom.
// Ajuste 10/2026: as etapas de filtro (banca/matéria/concurso, uma por vez, numa
// lista de meia tela) saíram daqui — "Filtrar por tema" agora abre a tela cheia
// FiltrosPartidaScreen, com filtros combináveis, busca e contagem de questões.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, fontSize, spacing, borderRadius } from '../../theme';

export default function ModalPartida({ visible, onClose, onIniciar, onFiltrar }) {
  const insets = useSafeAreaInsets();

  const [comTempo, setComTempo]   = useState(false);

  const fechar = () => {
    setComTempo(false);
    onClose();
  };

  const iniciarComFiltro = (filtro) => {
    fechar();
    onIniciar({ ...(filtro || {}), comTempo });
  };

  // Mantém a escolha "sem tempo / com tempo" ao abrir a tela de filtros
  const abrirFiltros = () => {
    const tempo = comTempo;
    fechar();
    onFiltrar?.(tempo);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <Pressable style={styles.modalOverlay} onPress={fechar}>
        <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]} onPress={() => {}}>
          <View style={styles.modalHandle} />

          <Text style={styles.modalTitulo}>Iniciar partida</Text>

          {/* Faixa de recompensas — antes eram 3 linhas de texto solto,
              agora agrupadas visualmente como uma única unidade de info */}
          <View style={styles.infoCard}>
            <View style={styles.infoItem}>
              <Text style={styles.infoValor}>10</Text>
              <Text style={styles.infoLabel}>questões</Text>
            </View>

            <View style={styles.infoDivisor} />

            <View style={styles.infoItem}>
              <View style={styles.infoIconeRow}>
                <Text style={[styles.infoValor, { color: colors.primary }]}>+10</Text>
                <Image source={require('../../assets/icons/xp.png')} style={styles.infoIcone} resizeMode="contain" />
                <Text style={[styles.infoValor, { color: colors.coins }]}>+2</Text>
                <Image source={require('../../assets/icons/moeda.png')} style={[styles.infoIcone, { marginLeft: spacing.xs }]} resizeMode="contain" />
              </View>
              <Text style={styles.infoLabel}>por acerto</Text>
            </View>

            <View style={styles.infoDivisor} />

            <View style={styles.infoItem}>
              <View style={styles.infoIconeRow}>
                <Image source={require('../../assets/icons/vida.png')} style={styles.infoIcone} resizeMode="contain" />
                <Text style={[styles.infoValor, { color: colors.lives }]}>-1</Text>
              </View>
              <Text style={styles.infoLabel}>por partida</Text>
            </View>
          </View>

          <View style={styles.toggleTempoRow}>
            <TouchableOpacity
              style={[styles.toggleTempoBtn, !comTempo && styles.toggleTempoBtnAtivo]}
              onPress={() => setComTempo(false)}
              activeOpacity={0.8}
            >
              <View style={styles.toggleTempoConteudo}>
                <Image
                  source={require('../../assets/icons/sem-tempo.png')}
                  style={[styles.toggleTempoIcone, { tintColor: !comTempo ? colors.primary : colors.textSecondary }]}
                  resizeMode="contain"
                />
                <Text style={[styles.toggleTempoText, !comTempo && styles.toggleTempoTextAtivo]}>
                  Sem tempo
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleTempoBtn, comTempo && styles.toggleTempoBtnAtivo]}
              onPress={() => setComTempo(true)}
              activeOpacity={0.8}
            >
              <View style={styles.toggleTempoConteudo}>
                <Image
                  source={require('../../assets/icons/com-tempo.png')}
                  style={[styles.toggleTempoIcone, { tintColor: comTempo ? colors.primary : colors.textSecondary }]}
                  resizeMode="contain"
                />
                <Text style={[styles.toggleTempoText, comTempo && styles.toggleTempoTextAtivo]}>
                  Com tempo (60s)
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.btnPrincipal} onPress={() => iniciarComFiltro(null)} activeOpacity={0.85}>
            <View style={styles.btnPrincipalConteudo}>
              <Image source={require('../../assets/icons/raio.png')} style={styles.raioIcone} resizeMode="contain" />
              <Text style={styles.btnPrincipalText}>Iniciar agora</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.btnPrincipalCaption}>questões aleatórias</Text>

          <TouchableOpacity style={styles.btnFiltrar} onPress={abrirFiltros} activeOpacity={0.7}>
            <View style={styles.btnFiltrarConteudo}>
              <Image source={require('../../assets/icons/filtro.png')} style={styles.filtroIcone} resizeMode="contain" />
              <Text style={styles.btnFiltrarText}>Filtrar por tema</Text>
            </View>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  );
}

// Obs: '#00000099' (overlay escurecido) e '#35355a' (borda neutra) não têm
// token nomeado no brand guide — ficam literais, igual em outros arquivos
// do projeto (AuthScreen, RecuperarSenhaScreen).
const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.card, borderRadius: borderRadius.full,
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  modalTitulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: spacing.md },

  // Faixa de recompensas agrupada
  infoCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, paddingHorizontal: spacing.sm,
    marginBottom: 20,
  },
  infoItem: { flex: 1, alignItems: 'center', gap: 2 },
  infoDivisor: { width: 1, height: 28, backgroundColor: colors.background },
  infoIconeRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  infoIcone: { width: 13, height: 13 },
  infoValor: { fontFamily: typography.bold, fontSize: fontSize.label, color: colors.text },
  infoLabel: { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },

  // Toggle Sem tempo / Com tempo — peso visual balanceado entre as duas opções
  toggleTempoRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: 20 },
  toggleTempoBtn: {
    flex: 1, backgroundColor: colors.card, borderRadius: borderRadius.lg,
    paddingVertical: spacing.md, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#35355a',
  },
  toggleTempoBtnAtivo:   { backgroundColor: `${colors.primary}22`, borderColor: colors.primary },
  toggleTempoConteudo:   { flexDirection: 'column', alignItems: 'center', gap: 5 },
  toggleTempoIcone:      { width: 22, height: 22 },
  toggleTempoText:       { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.textSecondary },
  toggleTempoTextAtivo:  { fontFamily: typography.bold, color: colors.primary },

  btnPrincipal: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.xs,
  },
  btnPrincipalConteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  raioIcone: { width: 18, height: 18 },
  btnPrincipalText: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.text },
  btnPrincipalCaption: {
    fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary,
    textAlign: 'center', marginBottom: spacing.md,
  },

  btnFiltrar: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, paddingVertical: 14, alignItems: 'center',
  },
  btnFiltrarConteudo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  filtroIcone: { width: 18, height: 18 },
  btnFiltrarText: { fontFamily: typography.bold, fontSize: fontSize.label, color: colors.textSecondary },
});