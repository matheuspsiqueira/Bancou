// src/screens/PerfilScreen.js
// Ajustes: fonte do título de nível reduzida (estava grande demais pra
// texto, mesmo tamanho de número de XP). Termos/Privacidade viraram um
// texto corrido com links embutidos, no mesmo padrão do checkbox de
// termos da AuthScreen — em vez de dois botões separados.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, Linking } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useKouAlert } from '../context/KouAlertContext';
import TelaComHeader from '../components/TelaComHeader';
import ModalAlterarSenha from '../components/modals/ModalAlterarSenha';
import ModalEditarPerfil from '../components/modals/ModalEditarPerfil';
import { getTituloNivel, getXpProximoNivel } from '../utils/niveis';
import { getLigaImagem, getLigaNome } from '../utils/ligas';
import { tocar, useSomHabilitado } from '../services/somService';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';
import { SITE_URL } from '../config';

const URL_TERMOS = `${SITE_URL}/termos/`;
const URL_PRIVACIDADE = `${SITE_URL}/privacidade/`;

export default function PerfilScreen() {
  const { usuario, signOut } = useAuth();
  const { alertar } = useKouAlert();
  const [modalSenha, setModalSenha] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [somHabilitado, alternarSom] = useSomHabilitado();

  // TODO: quando existir navegação Ranking -> perfil de outro usuário,
  // isso vira uma prop (ex: `usuarioAlvo`) comparada ao usuário logado.
  const souDono = true;

  const xp = usuario?.xp ?? 0;
  const titulo = getTituloNivel(xp);
  const xpProximo = getXpProximoNivel(xp);
  const xpPct = xpProximo ? Math.min(xp / xpProximo, 1) : 1;
  const xpLabel = xpProximo
    ? `${xp.toLocaleString()} / ${xpProximo.toLocaleString()} XP`
    : `${xp.toLocaleString()} XP — Nível máximo`;

  const username = usuario?.username ?? '…';

  // `usuario.trofeus` ainda não existe no backend (sistema de Ligas não
  // implementado) — undefined cai automaticamente em "Não rankeado".
  const trofeus = usuario?.trofeus;
  const ligaImagem = getLigaImagem(trofeus);
  const ligaLabel = getLigaNome(trofeus);

  // Placeholder até o sistema de Conquistas existir de fato.
  const conquistaRecenteLabel = 'Nenhuma conquista ainda';

  const handleLogout = () => {
    tocar('pop');
    requestAnimationFrame(() => {
      alertar(
        'Sair da conta',
        'Tem certeza que deseja sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: signOut },
        ],
        { pose: 'triste' }
      );
    });
  };

  const abrirLink = (url) => {
    Linking.openURL(url).catch(() => {
      alertar('Erro', 'Não foi possível abrir o link.', [{ text: 'OK' }], { pose: 'ops' });
    });
  };

  return (
    <TelaComHeader>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>

        {/* ===== Seção 1 — Cabeçalho (visível a qualquer visitante) ===== */}
        <View style={styles.headerCard}>
          <View style={styles.avatar}>
            <Image
              source={usuario?.avatar_url ? { uri: usuario.avatar_url } : require('../assets/kou-foco.png')}
              style={styles.avatarImg}
              resizeMode={usuario?.avatar_url ? 'cover' : 'contain'}
            />
          </View>

          <Text style={styles.username}>{username}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCol}>
              <Text style={styles.statValorTexto}>{titulo}</Text>
              <Text style={styles.statLabel}>Nível</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={styles.conquistaPlaceholder} />
              <Text style={styles.statLabel}>{conquistaRecenteLabel}</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <Image source={ligaImagem} style={styles.ligaImagem} resizeMode="contain" />
              <Text style={styles.statLabel}>{ligaLabel}</Text>
            </View>
          </View>

          {souDono && (
            <View style={styles.xpBarraContainer}>
              <View style={styles.xpBarraTrack}>
                <View style={[styles.xpBarraFill, { width: `${xpPct * 100}%` }]} />
              </View>
              <View style={styles.xpBarraLabelRow}>
                <Image source={require('../assets/icons/xp.png')} style={styles.statIconePng} resizeMode="contain" />
                <Text style={styles.xpBarraLabel}> {xpLabel}</Text>
              </View>
            </View>
          )}
        </View>

        {/* ===== Seção 2 — Conquistas ===== */}
        <Text style={styles.secaoTitulo}>Conquistas</Text>
        <View style={styles.emBreveCard}>
          <Image source={require('../assets/kou-obra.png')} style={styles.emBreveIconePng} resizeMode="contain" />
          <Text style={styles.emBreveTitulo}>Em breve</Text>
          <Text style={styles.emBreveDesc}>
            Conquistas únicas que desbloqueiam conforme você avança. Cada uma conta uma história!
          </Text>
        </View>

        {/* ===== Seção 3 — Configurações (só o dono vê) ===== */}
        {souDono && (
          <>
            <Text style={[styles.secaoTitulo, styles.secaoTituloEspacada]}>Configurações</Text>

            <View style={styles.opcaoItem}>
              <View style={styles.opcaoTextRow}>
                <Image source={require('../assets/icons/com-som.png')} style={styles.opcaoIconePng} resizeMode="contain" />
                <Text style={styles.opcaoText}> Efeitos sonoros</Text>
              </View>
              <Switch
                value={somHabilitado}
                onValueChange={alternarSom}
                trackColor={{ false: colors.background, true: colors.primary }}
                thumbColor={colors.text}
                ios_backgroundColor={colors.background}
              />
            </View>

            <TouchableOpacity style={styles.opcaoItem} onPress={() => setModalPerfil(true)} activeOpacity={0.7}>
              <View style={styles.opcaoTextRow}>
                <Image source={require('../assets/icons/lapis.png')} style={styles.opcaoIconePng} resizeMode="contain" />
                <Text style={styles.opcaoText}> Editar perfil</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.opcaoItem} onPress={() => setModalSenha(true)} activeOpacity={0.7}>
              <View style={styles.opcaoTextRow}>
                <Image source={require('../assets/icons/chave.png')} style={styles.opcaoIconePng} resizeMode="contain" />
                <Text style={styles.opcaoText}> Alterar senha</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.btnLogoutText}>Sair da conta</Text>
            </TouchableOpacity>

            <Text style={styles.legalTexto}>
              Acesse a{' '}
              <Text style={styles.legalLink} onPress={() => abrirLink(URL_PRIVACIDADE)}>
                política de privacidade
              </Text>
              {' '}e os{' '}
              <Text style={styles.legalLink} onPress={() => abrirLink(URL_TERMOS)}>
                termos de uso
              </Text>
              .
            </Text>

            <ModalAlterarSenha visible={modalSenha} onClose={() => setModalSenha(false)} />
            <ModalEditarPerfil visible={modalPerfil} onClose={() => setModalPerfil(false)} />
          </>
        )}
      </ScrollView>
    </TelaComHeader>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  scrollContent: { paddingBottom: spacing.xl2 },

  headerCard: {
    alignItems: 'center', paddingVertical: spacing.xl, paddingHorizontal: spacing.lg,
    backgroundColor: colors.card, borderRadius: borderRadius.lg, marginBottom: spacing.xl,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md, borderWidth: 2, borderColor: colors.primary, overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },

  username: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: spacing.lg },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    width: '100%', marginBottom: spacing.lg,
  },
  statCol: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 44, backgroundColor: colors.background },
  statValorTexto: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.text },
  statLabel: {
    fontFamily: typography.medium, fontSize: fontSize.caption, color: colors.textSecondary,
    marginTop: spacing.xs, textAlign: 'center',
  },
  conquistaPlaceholder: {
    width: 32, height: 32, borderRadius: borderRadius.md,
    borderWidth: 1.5, borderColor: colors.textSecondary, borderStyle: 'dashed',
  },
  ligaImagem: { width: 36, height: 36 },

  xpBarraContainer: { width: '100%' },
  xpBarraTrack: { height: 8, backgroundColor: colors.background, borderRadius: borderRadius.full, marginBottom: spacing.xs },
  xpBarraFill: { height: 8, borderRadius: borderRadius.full, backgroundColor: colors.primary },
  xpBarraLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  xpBarraLabel: { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, textAlign: 'center' },
  statIconePng: { width: 12, height: 12 },

  secaoTitulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: spacing.md },
  secaoTituloEspacada: { marginTop: spacing.sm },

  emBreveCard: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.xl,
    alignItems: 'center', marginBottom: spacing.lg,
    borderWidth: 1, borderColor: `${colors.primary}33`, borderStyle: 'dashed',
  },
  emBreveIconePng: { width: 48, height: 48, marginBottom: spacing.sm },
  emBreveTitulo: { fontFamily: typography.bold, fontSize: fontSize.body, color: colors.textSecondary, marginBottom: spacing.xs },
  emBreveDesc: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, textAlign: 'center', lineHeight: 19 },

  opcaoItem: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm,
  },
  opcaoTextRow: { flexDirection: 'row', alignItems: 'center' },
  opcaoIconePng: { width: 18, height: 18 },
  opcaoText: { fontFamily: typography.medium, fontSize: fontSize.body, color: colors.text },
  chevron: { color: colors.textSecondary, fontSize: 18 },

  btnLogout: {
    marginTop: spacing.lg, borderWidth: 1, borderColor: colors.lives,
    borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center',
  },
  btnLogoutText: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.lives },

  legalTexto: {
    fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 18, marginTop: spacing.xl, paddingHorizontal: spacing.sm,
  },
  legalLink: { color: colors.primary, fontFamily: typography.medium },
});