// src/screens/PerfilScreen.js
// Ajustes: fonte do título de nível reduzida (estava grande demais pra
// texto, mesmo tamanho de número de XP). Termos/Privacidade viraram um
// texto corrido com links embutidos, no mesmo padrão do checkbox de
// termos da AuthScreen — em vez de dois botões separados.
//
// Conquistas: grid real na seção 2, buscado em
// GET /api/conquistas/usuario/<id>/ — o backend já filtra visibilidade
// (dono vê tudo, incluindo bloqueadas; visitante só veria as
// completadas, quando essa tela passar a aceitar um usuário-alvo
// diferente do logado). Busca em useFocusEffect, mesmo padrão já usado
// pra música de fundo em telas de tab — reflete conquistas novas ao
// voltar de uma partida sem precisar sair e entrar no app. Cada card
// (ConquistaCard) cuida do anel de progresso e do preto-e-branco;
// tocar num card abre o ModalConquista com a descrição.
//
// statValorBox: as 3 colunas do statsRow têm conteúdo de altura
// diferente (texto "Nível" vs imagem 45x45 de conquista/liga) — sem
// isso, alignItems:'center' na linha deixa elas desalinhadas entre si.
// O box de altura fixa (mesmo tamanho da imagem) resolve isso: todas as
// colunas passam a ter a mesma altura de referência, então os rótulos
// embaixo alinham certinho.
//
// 26/09/2026 — Reestruturação da seção 3: "Configurações" agora só tem
// itens do jogo/conta (Editar perfil, Alterar senha, Sair). Criado um
// bloco novo "Sistema" abaixo, pra tudo que é preferência de
// dispositivo/app: Efeitos sonoros (que morava em Configurações),
// Notificações (novo — toggle liga/desliga notificacoes_ativadas no
// backend, pedindo permissão do SO na primeira vez que liga), Política
// de Privacidade e Termos de uso (viraram itens clicáveis com chevron,
// saem do texto corrido de antes) e Versão do app (não clicável, só
// informativo). O botão de Relatar Bug entra em Sistema futuramente.
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch, Linking, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Constants from 'expo-constants';
import { useAuth } from '../context/AuthContext';
import { useKouAlert } from '../context/KouAlertContext';
import TelaComHeader from '../components/TelaComHeader';
import ConquistaCard from '../components/ConquistaCard';
import ModalConquista from '../components/modals/ModalConquista';
import ModalAlterarSenha from '../components/modals/ModalAlterarSenha';
import ModalEditarPerfil from '../components/modals/ModalEditarPerfil';
import { getTituloNivel, getXpProximoNivel } from '../utils/niveis';
import { getLigaImagem, getLigaNome } from '../utils/ligas';
import { tocar, useSomHabilitado } from '../services/somService';
import { pedirPermissaoEObterToken } from '../services/notificacaoService';
import { colors, typography, fontSize, spacing, borderRadius } from '../theme';
import { SITE_URL } from '../config';

const URL_TERMOS = `${SITE_URL}/termos/`;
const URL_PRIVACIDADE = `${SITE_URL}/privacidade/`;
const VERSAO_APP = Constants.expoConfig?.version ?? '—';

const ALTURA_VALOR_STAT = 45; // mesmo tamanho das imagens de conquista/liga

export default function PerfilScreen() {
  const { usuario, signOut, authFetch, atualizarUsuario } = useAuth();
  const { alertar } = useKouAlert();
  const [modalSenha, setModalSenha] = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [somHabilitado, alternarSom] = useSomHabilitado();
  const [alternandoNotificacoes, setAlternandoNotificacoes] = useState(false);

  // TODO: quando existir navegação Ranking -> perfil de outro usuário,
  // isso vira uma prop (ex: `usuarioAlvo`) comparada ao usuário logado,
  // e a busca de conquistas abaixo passa a usar o id do usuarioAlvo.
  const souDono = true;

  const [conquistas, setConquistas] = useState([]);
  const [carregandoConquistas, setCarregandoConquistas] = useState(true);
  const [conquistaSelecionada, setConquistaSelecionada] = useState(null);

  const carregarConquistas = useCallback(async () => {
    if (!usuario?.id) return;
    try {
      const resp = await authFetch(`/api/conquistas/usuario/${usuario.id}/`);
      if (resp.ok) {
        const data = await resp.json();
        setConquistas(data);
      }
    } catch {
      // silencioso — falha de rede, mantém o que já estava carregado
    } finally {
      setCarregandoConquistas(false);
    }
  }, [authFetch, usuario?.id]);

  useFocusEffect(
    useCallback(() => {
      carregarConquistas();
    }, [carregarConquistas])
  );

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

  // Conquista mais recente pro cabeçalho — só entre as já completadas,
  // ordenada pela data de conclusão. null enquanto carrega ou se ainda
  // não tiver nenhuma.
  const conquistaRecente = conquistas
    .filter((c) => c.completada && c.completada_em)
    .sort((a, b) => new Date(b.completada_em) - new Date(a.completada_em))[0] || null;

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

  // Notificações: diferente do Som (preferência 100% local), esse toggle
  // reflete `usuario.notificacoes_ativadas` no backend — é o que o envio
  // agendado do servidor consulta antes de disparar qualquer notificação.
  // Ligar pede permissão do SO na hora (além do pedido automático já
  // feito no login); negar mantém o switch desligado e avisa o usuário.
  const alternarNotificacoes = async (valor) => {
    setAlternandoNotificacoes(true);
    try {
      if (valor) {
        const token = await pedirPermissaoEObterToken();
        if (!token) {
          alertar(
            'Notificações bloqueadas',
            'Ative as notificações do Bancou nas configurações do seu celular para poder ligar essa opção.',
            [{ text: 'OK' }],
            { pose: 'ops' }
          );
          return;
        }
        const resp = await authFetch('/api/usuarios/notificacoes/', {
          method: 'PATCH',
          body: JSON.stringify({ notificacoes_ativadas: true, expo_push_token: token }),
        });
        if (resp.ok) atualizarUsuario({ notificacoes_ativadas: true });
      } else {
        const resp = await authFetch('/api/usuarios/notificacoes/', {
          method: 'PATCH',
          body: JSON.stringify({ notificacoes_ativadas: false }),
        });
        if (resp.ok) atualizarUsuario({ notificacoes_ativadas: false });
      }
    } catch {
      // silencioso — falha de rede, o switch simplesmente não reflete a
      // mudança (continua mostrando o valor anterior de usuario)
    } finally {
      setAlternandoNotificacoes(false);
    }
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
              <View style={styles.statValorBox}>
                <Text style={styles.statValorTexto}>{titulo}</Text>
              </View>
              <Text style={styles.statLabel}>Nível</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={styles.statValorBox}>
                {conquistaRecente ? (
                  <Image
                    source={
                      conquistaRecente.imagem_url
                        ? { uri: conquistaRecente.imagem_url }
                        : require('../assets/kou-pensando.png')
                    }
                    style={styles.conquistaRecenteImagem}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.conquistaPlaceholder} />
                )}
              </View>
              <Text style={styles.statLabel} numberOfLines={1}>
                {conquistaRecente ? conquistaRecente.nome : 'Nenhuma conquista ainda'}
              </Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statCol}>
              <View style={styles.statValorBox}>
                <Image source={ligaImagem} style={styles.ligaImagem} resizeMode="contain" />
              </View>
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

        {carregandoConquistas && conquistas.length === 0 ? (
          <View style={styles.conquistasCarregando}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : conquistas.length === 0 ? (
          <Text style={styles.conquistasVazioTexto}>
            {souDono ? 'Nenhuma conquista cadastrada ainda.' : 'Ainda não conquistou nada.'}
          </Text>
        ) : (
          <View style={styles.conquistasGrid}>
            {conquistas.map((c) => (
              <ConquistaCard key={c.id} conquista={c} onPress={() => setConquistaSelecionada(c)} />
            ))}
          </View>
        )}

        {/* ===== Seção 3 — Configurações (do jogo/conta — só o dono vê) ===== */}
        {souDono && (
          <>
            <Text style={[styles.secaoTitulo, styles.secaoTituloEspacada]}>Configurações</Text>

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


            {/* ===== Seção 4 — Sistema (preferências de dispositivo/app) ===== */}
            <Text style={[styles.secaoTitulo, styles.secaoTituloEspacada]}>Sistema</Text>

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

            <View style={styles.opcaoItem}>
              <View style={styles.opcaoTextRow}>
                <Image source={require('../assets/icons/sino.png')} style={styles.opcaoIconePng} resizeMode="contain" />
                <Text style={styles.opcaoText}> Notificações</Text>
              </View>
              <Switch
                value={usuario?.notificacoes_ativadas ?? true}
                onValueChange={alternarNotificacoes}
                disabled={alternandoNotificacoes}
                trackColor={{ false: colors.background, true: colors.primary }}
                thumbColor={colors.text}
                ios_backgroundColor={colors.background}
              />
            </View>

            <TouchableOpacity style={styles.opcaoItem} onPress={() => abrirLink(URL_PRIVACIDADE)} activeOpacity={0.7}>
              <View style={styles.opcaoTextRow}>
                <Text style={styles.opcaoText}>Política de privacidade</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.opcaoItem} onPress={() => abrirLink(URL_TERMOS)} activeOpacity={0.7}>
              <View style={styles.opcaoTextRow}>
                <Text style={styles.opcaoText}>Termos de uso</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.opcaoItem}>
              <View style={styles.opcaoTextRow}>
                <Text style={styles.opcaoText}>Versão</Text>
              </View>
              <Text style={styles.versaoTexto}>{VERSAO_APP}</Text>
            </View>

            <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
              <Text style={styles.btnLogoutText}>Sair da conta</Text>
            </TouchableOpacity>

            <ModalAlterarSenha visible={modalSenha} onClose={() => setModalSenha(false)} />
            <ModalEditarPerfil visible={modalPerfil} onClose={() => setModalPerfil(false)} />
          </>
        )}

        <ModalConquista
          conquista={conquistaSelecionada}
          visible={!!conquistaSelecionada}
          onClose={() => setConquistaSelecionada(null)}
        />
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
  statValorBox: { height: ALTURA_VALOR_STAT, justifyContent: 'center', alignItems: 'center' },
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
  conquistaRecenteImagem: { width: 45, height: 45 },
  ligaImagem: { width: 45, height: 45 },

  xpBarraContainer: { width: '100%' },
  xpBarraTrack: { height: 8, backgroundColor: colors.background, borderRadius: borderRadius.full, marginBottom: spacing.xs },
  xpBarraFill: { height: 8, borderRadius: borderRadius.full, backgroundColor: colors.primary },
  xpBarraLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  xpBarraLabel: { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, textAlign: 'center' },
  statIconePng: { width: 12, height: 12 },

  secaoTitulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: spacing.md },
  secaoTituloEspacada: { marginTop: spacing.sm },

  conquistasCarregando: { paddingVertical: spacing.xl, alignItems: 'center' },
  conquistasVazioTexto: {
    fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary,
    textAlign: 'center', paddingVertical: spacing.lg, marginBottom: spacing.lg,
  },
  conquistasGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: spacing.xl,
  },

  opcaoItem: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm,
  },
  opcaoTextRow: { flexDirection: 'row', alignItems: 'center' },
  opcaoIconePng: { width: 18, height: 18 },
  opcaoText: { fontFamily: typography.medium, fontSize: fontSize.body, color: colors.text },
  chevron: { color: colors.textSecondary, fontSize: 18 },
  versaoTexto: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary },

  btnLogout: {
    marginTop: spacing.sm, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.lives,
    borderRadius: borderRadius.lg, padding: spacing.lg, alignItems: 'center',
  },
  btnLogoutText: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.lives },
});