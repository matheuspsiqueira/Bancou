// src/components/modals/ModalPartida.js
// Extraído de HomeScreen.js — lógica idêntica à original, sem alterações.
// Redesign visual (09/2026): recompensas agrupadas em um card único,
// CTA principal com texto mais curto + legenda, toggle Sem tempo/Com tempo
// com peso visual balanceado entre as duas opções.
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { colors, typography, fontSize, spacing, borderRadius } from '../../theme';

export default function ModalPartida({ visible, onClose, onIniciar }) {
  const { authFetch } = useAuth();

  const [etapa, setEtapa]         = useState('inicio');
  const [tipoFiltro, setTipo]     = useState(null);
  const [comTempo, setComTempo]   = useState(false);

  const [opcoes, setOpcoes]       = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]           = useState(null);

  const cacheRef = useRef({});

  const ENDPOINTS = {
    banca:    '/api/questoes/bancas/',
    materia:  '/api/questoes/materias/',
    concurso: '/api/questoes/concursos/',
  };

  const tituloFiltro = {
    banca:    'Escolha a banca',
    materia:  'Escolha a matéria',
    concurso: 'Escolha o concurso',
  };

  const TIPOS_FILTRO = [
    { tipo: 'banca',    icone: require('../../assets/icons/bancas.png'),    label: 'Banca',    desc: 'CESPE, FCC, FGV…' },
    { tipo: 'materia',  icone: require('../../assets/icons/materias.png'),  label: 'Matéria',  desc: 'Direito, Português, Lógica…' },
    { tipo: 'concurso', icone: require('../../assets/icons/concursos.png'), label: 'Concurso', desc: 'TJ, PF, INSS, Receita…' },
  ];

  const labelDe = (tipo, item) => {
    if (tipo === 'concurso') {
      return `${item.nome}${item.ano ? ` (${item.ano})` : ''} — ${item.banca_nome}`;
    }
    return item.nome;
  };

  const buscarOpcoes = useCallback(async (tipo) => {
    if (cacheRef.current[tipo]) {
      setOpcoes(cacheRef.current[tipo]);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const resp = await authFetch(ENDPOINTS[tipo]);
      if (!resp.ok) throw new Error('Falha ao buscar opções');
      const data = await resp.json();
      cacheRef.current[tipo] = data;
      setOpcoes(data);
    } catch (e) {
      setErro('Não foi possível carregar as opções. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [authFetch]);

  const escolherTipo = (tipo) => {
    setTipo(tipo);
    setEtapa('opcoes');
    buscarOpcoes(tipo);
  };

  const fechar = () => {
    setEtapa('inicio');
    setTipo(null);
    setOpcoes([]);
    setErro(null);
    setComTempo(false);
    onClose();
  };

  const iniciarComFiltro = (filtro) => {
    fechar();
    onIniciar({ ...(filtro || {}), comTempo });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <Pressable style={styles.modalOverlay} onPress={fechar}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />

          {etapa === 'inicio' && (
            <>
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
                    <Image source={require('../../assets/icons/xp.png')} style={styles.infoIcone} resizeMode="contain" />
                    <Text style={[styles.infoValor, { color: colors.coins }]}>+10</Text>
                    <Image source={require('../../assets/icons/moeda.png')} style={[styles.infoIcone, { marginLeft: spacing.xs }]} resizeMode="contain" />
                    <Text style={[styles.infoValor, { color: colors.coins }]}>+2</Text>
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

              <TouchableOpacity style={styles.btnFiltrar} onPress={() => setEtapa('escolha')} activeOpacity={0.7}>
                <View style={styles.btnFiltrarConteudo}>
                  <Image source={require('../../assets/icons/filtro.png')} style={styles.filtroIcone} resizeMode="contain" />
                  <Text style={styles.btnFiltrarText}>Filtrar por tema</Text>
                </View>
              </TouchableOpacity>
            </>
          )}

          {etapa === 'escolha' && (
            <>
              <TouchableOpacity onPress={() => setEtapa('inicio')} style={styles.voltarBtn}>
                <Text style={styles.voltarText}>‹  Voltar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitulo}>Filtrar por</Text>
              <Text style={styles.modalSubtitulo}>Escolha como quer organizar sua partida</Text>
              {TIPOS_FILTRO.map((item) => (
                <TouchableOpacity
                  key={item.tipo}
                  style={styles.filtroTipoItem}
                  onPress={() => escolherTipo(item.tipo)}
                  activeOpacity={0.7}
                >
                  <Image source={item.icone} style={styles.filtroTipoIcone} resizeMode="contain" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filtroTipoLabel}>{item.label}</Text>
                    <Text style={styles.filtroTipoDesc}>{item.desc}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {etapa === 'opcoes' && tipoFiltro && (
            <>
              <TouchableOpacity onPress={() => setEtapa('escolha')} style={styles.voltarBtn}>
                <Text style={styles.voltarText}>‹  Voltar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitulo}>{tituloFiltro[tipoFiltro]}</Text>
              <Text style={styles.modalSubtitulo}>A partida terá 10 questões deste filtro</Text>

              {carregando && (
                <View style={styles.carregandoBox}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              )}

              {!carregando && erro && (
                <View style={styles.filtroErroBox}>
                  <Text style={styles.filtroErroText}>{erro}</Text>
                  <TouchableOpacity onPress={() => buscarOpcoes(tipoFiltro)} style={styles.filtroErroBtn}>
                    <Text style={styles.filtroErroBtnText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!carregando && !erro && opcoes.length === 0 && (
                <View style={styles.filtroErroBox}>
                  <Text style={styles.filtroErroText}>
                    Nenhuma opção disponível ainda para este filtro.
                  </Text>
                </View>
              )}

              {!carregando && !erro && opcoes.length > 0 && (
                <ScrollView showsVerticalScrollIndicator={false} style={styles.opcoesScroll}>
                  {opcoes.map((op) => (
                    <TouchableOpacity
                      key={op.id}
                      style={styles.opcaoFiltroItem}
                      onPress={() => iniciarComFiltro({ tipo: tipoFiltro, id: op.id, label: labelDe(tipoFiltro, op) })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.opcaoFiltroLabel}>{labelDe(tipoFiltro, op)}</Text>
                      <Text style={styles.chevronPequeno}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}
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
    padding: spacing.xl, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.card, borderRadius: borderRadius.full,
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  modalTitulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: spacing.md },
  modalSubtitulo: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, lineHeight: 18, marginBottom: 2 },

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

  voltarBtn:  { marginBottom: spacing.md },
  voltarText: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.primary },

  filtroTipoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.sm,
  },
  filtroTipoIcone: { width: 26, height: 26 },
  filtroTipoLabel: { fontFamily: typography.bold, fontSize: fontSize.body, color: colors.text },
  filtroTipoDesc:  { fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary, marginTop: 2 },
  chevron:         { color: colors.primary, fontSize: 20 },
  chevronPequeno:  { color: colors.primary, fontSize: 18 },
  carregandoBox:   { paddingVertical: spacing.xl, alignItems: 'center' },
  opcoesScroll:    { maxHeight: 340 },
  opcaoFiltroItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.card,
  },
  opcaoFiltroLabel: { fontFamily: typography.medium, fontSize: fontSize.body, color: colors.text, flex: 1, marginRight: spacing.sm },
  filtroErroBox:  { paddingVertical: spacing.xl, alignItems: 'center', gap: spacing.md },
  filtroErroText: {
    fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 19,
  },
  filtroErroBtn: {
    backgroundColor: colors.card, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: '#35355a',
  },
  filtroErroBtnText: { fontFamily: typography.medium, fontSize: fontSize.caption, color: colors.primary },
});