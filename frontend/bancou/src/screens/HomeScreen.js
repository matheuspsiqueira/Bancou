// src/screens/HomeScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { usePontsAlert } from '../context/PontsAlertContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';



// ─── Tabela de níveis ──────────────────────────────────────────────────────
const NIVEIS = [
  { minXp: 0,     titulo: 'Calouro'  },
  { minXp: 500,   titulo: 'Aprendiz' },
  { minXp: 1500,  titulo: 'Dedicado' },
  { minXp: 3000,  titulo: 'Focado'   },
  { minXp: 6000,  titulo: 'Veterano' },
  { minXp: 10000, titulo: 'Expert'   },
  { minXp: 16000, titulo: 'Elite'    },
  { minXp: 25000, titulo: 'Mestre'   },
  { minXp: 40000, titulo: 'Lendário' },
];

function getTituloNivel(xp = 0) {
  let titulo = NIVEIS[0].titulo;
  for (const n of NIVEIS) {
    if (xp >= n.minXp) titulo = n.titulo;
    else break;
  }
  return titulo;
}

function getXpProximoNivel(xp = 0) {
  for (const n of NIVEIS) {
    if (xp < n.minXp) return n.minXp;
  }
  return null;
}

function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 0  && h < 5)  return 'Boa madrugada';
  if (h >= 5  && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── Valores mock para campos ainda não no backend ────────────────────────
const MOCK = { xp: 1240, liga: 'Prata', streak: 7, vidas: 4, moedas: 320 };

const RANKING_MOCK = [
  { pos: 1, nome: 'Carolina S.', xp: 2840, voce: false },
  { pos: 2, nome: 'Rafael M.',   xp: 2610, voce: false },
  { pos: 3, nome: 'Juliana P.',  xp: 2390, voce: false },
  { pos: 4, nome: 'Você',        xp: 1240, voce: true  },
  { pos: 5, nome: 'Bruno T.',    xp: 1100, voce: false },
];

// ─── Header de Stats ──────────────────────────────────────────────────────
function StatsHeader({ streak, vidas, moedas }) {
  return (
    <View style={styles.statsHeader}>
      <View style={styles.statChip}>
        <Text style={styles.statEmoji}>🔥</Text>
        <Text style={[styles.statValue, { color: '#FF6B35' }]}>{streak}</Text>
      </View>
      <View style={styles.statChip}>
        <Text style={styles.statEmoji}>❤️</Text>
        <Text style={[styles.statValue, { color: '#FF4069' }]}>{vidas}</Text>
      </View>
      <View style={styles.statChip}>
        <Text style={styles.statEmoji}>🪙</Text>
        <Text style={[styles.statValue, { color: '#FFD700' }]}>{moedas}</Text>
      </View>
    </View>
  );
}

// ─── Campo de senha reutilizável ──────────────────────────────────────────
function CampoSenha({ label, value, onChangeText, ver, setVer, placeholder }) {
  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputSenhaWrapper}>
        <TextInput
          style={styles.inputSenha}
          placeholder={placeholder}
          placeholderTextColor="#9090B0"
          secureTextEntry={!ver}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.inputSenhaOlho}
          onPress={() => setVer((v) => !v)}
          activeOpacity={0.7}
        >
          <Text style={styles.inputSenhaOlhoIcon}>{ver ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

// ─── Modal: Alterar Senha ─────────────────────────────────────────────────
function ModalAlterarSenha({ visible, onClose }) {
  const { authFetch } = useAuth();
  const { alertar } = usePontsAlert();
  const [senhaAtual,     setSenhaAtual]     = useState('');
  const [novaSenha,      setNovaSenha]      = useState('');
  const [confirmacao,    setConfirmacao]    = useState('');
  const [carregando,     setCarregando]     = useState(false);
  const [verAtual,       setVerAtual]       = useState(false);
  const [verNova,        setVerNova]        = useState(false);
  const [verConfirmacao, setVerConfirmacao] = useState(false);

  const fechar = () => {
    setSenhaAtual('');
    setNovaSenha('');
    setConfirmacao('');
    setVerAtual(false);
    setVerNova(false);
    setVerConfirmacao(false);
    onClose();
  };

  const esqueceuSenha = () => {
    alertar(
      'Esqueceu sua senha?',
      'Para redefinir sua senha, faça logout e use a opção "Esqueci minha senha" na tela de login.',
      [{ text: 'Entendi' }],
      { pose: 'pensando' }
    );
  };

  const salvar = async () => {
    if (!senhaAtual || !novaSenha || !confirmacao) {
      alertar('Atenção', 'Preencha todos os campos.', [{ text: 'OK' }]);
      return;
    }
    if (novaSenha !== confirmacao) {
      alertar('Atenção', 'A nova senha e a confirmação não coincidem.', [{ text: 'OK' }]);
      return;
    }
    if (novaSenha.length < 8) {
      alertar('Atenção', 'A nova senha deve ter pelo menos 8 caracteres.', [{ text: 'OK' }]);
      return;
    }
    if (novaSenha === senhaAtual) {
      alertar('Atenção', 'A nova senha deve ser diferente da senha atual.', [{ text: 'OK' }]);
      return;
    }

    setCarregando(true);
    try {
      const resp = await authFetch('/api/usuarios/alterar-senha/', {
        method: 'POST',
        body: JSON.stringify({
          senha_atual: senhaAtual,
          nova_senha:  novaSenha,
          nova_senha2: confirmacao, // ← campo correto que o backend espera
        }),
      });
      const data = await resp.json();
      if (resp.ok) {
        alertar(
          'Senha alterada!',
          'Sua senha foi atualizada com sucesso.',
          [{ text: 'OK', onPress: fechar }],
          { pose: 'torcendo' }
        );
      } else {
        const msg =
          data.senha_atual?.[0]      ||
          data.nova_senha?.[0]       ||
          data.non_field_errors?.[0] ||
          data.detail                ||
          'Erro ao alterar senha.';
        alertar('Erro', msg, [{ text: 'OK' }], { pose: 'ops' });
      }
    } catch {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <Pressable style={styles.modalOverlay} onPress={fechar}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitulo}>Alterar senha</Text>
          <Text style={styles.modalSubtitulo}>
            Escolha uma senha forte com pelo menos 8 caracteres.
          </Text>

          {/* Senha atual + link esqueci */}
          <View style={styles.inputLabelRow}>
            <Text style={styles.inputLabel}>Senha atual</Text>
            <TouchableOpacity onPress={esqueceuSenha} activeOpacity={0.7}>
              <Text style={styles.linkEsqueceuSenha}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.inputSenhaWrapper}>
            <TextInput
              style={styles.inputSenha}
              placeholder="Digite sua senha atual"
              placeholderTextColor="#9090B0"
              secureTextEntry={!verAtual}
              value={senhaAtual}
              onChangeText={setSenhaAtual}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.inputSenhaOlho}
              onPress={() => setVerAtual((v) => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.inputSenhaOlhoIcon}>{verAtual ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <CampoSenha
            label="Nova senha"
            placeholder="Digite a nova senha"
            value={novaSenha}
            onChangeText={setNovaSenha}
            ver={verNova}
            setVer={setVerNova}
          />

          <CampoSenha
            label="Confirmar nova senha"
            placeholder="Repita a nova senha"
            value={confirmacao}
            onChangeText={setConfirmacao}
            ver={verConfirmacao}
            setVer={setVerConfirmacao}
          />

          {/* Indicador de correspondência em tempo real */}
          {confirmacao.length > 0 && (
            <Text style={{
              fontSize: 12,
              fontFamily: 'Inter_400Regular',
              marginBottom: 16,
              color: novaSenha === confirmacao ? '#00C896' : '#FF4069',
            }}>
              {novaSenha === confirmacao ? '✓ Senhas coincidem' : '✗ Senhas não coincidem'}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.btnPrincipal, carregando && { opacity: 0.6 }]}
            onPress={salvar}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.btnPrincipalText}>Salvar senha</Text>
            }
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Modal: Editar Perfil ─────────────────────────────────────────────────
function ModalEditarPerfil({ visible, onClose }) {
  const { authFetch, usuario, atualizarUsuario, signOut } = useAuth();
  const { alertar } = usePontsAlert();
  const [username,   setUsername]   = useState('');
  const [nome,       setNome]       = useState('');
  const [carregando, setCarregando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null); // uri local pra prévia
  const [fotoArquivo, setFotoArquivo] = useState(null); // { uri, name, type } pronto pra upload

  React.useEffect(() => {
    if (visible) {
      setUsername(usuario?.username    || '');
      setNome(usuario?.nome_completo   || '');
      setFotoPreview(null);
      setFotoArquivo(null);
    }
  }, [visible]);

  const fechar = () => onClose();

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      alertar('Permissão necessária', 'Precisamos de acesso à sua galeria pra trocar a foto.', [{ text: 'OK' }]);
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (resultado.canceled) return;

    const original = resultado.assets[0];

    // Comprime e redimensiona no client antes de enviar
    const manipulado = await ImageManipulator.manipulateAsync(
      original.uri,
      [{ resize: { width: 512 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    setFotoPreview(manipulado.uri);
    setFotoArquivo({
      uri: manipulado.uri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    });
  };

  const salvar = async () => {
    if (!username.trim()) {
      alertar('Atenção', 'O username não pode ficar em branco.', [{ text: 'OK' }]);
      return;
    }
    setCarregando(true);
    try {
      let resp;

      if (fotoArquivo) {
        // Tem foto nova → precisa de multipart/form-data, então usamos fetch
        // direto (igual excluirConta já faz) pra não passar por Content-Type
        // JSON do authFetch.
        const access = await AsyncStorage.getItem('access_token');
        const form = new FormData();
        form.append('username', username.trim());
        form.append('nome_completo', nome.trim());
        form.append('avatar', fotoArquivo);

        resp = await fetch(`${API_URL}/api/usuarios/perfil/`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${access}`,
            'ngrok-skip-browser-warning': 'true',
            // Sem 'Content-Type' aqui de propósito — o fetch define o
            // boundary do multipart automaticamente.
          },
          body: form,
        });
      } else {
        resp = await authFetch('/api/usuarios/perfil/', {
          method: 'PATCH',
          body: JSON.stringify({
            username:      username.trim(),
            nome_completo: nome.trim(),
          }),
        });
      }

      const data = await resp.json();
      if (resp.ok) {
        atualizarUsuario({
          username: data.username,
          nome_completo: data.nome_completo,
          avatar_url: data.avatar_url,
        });
        alertar(
          'Perfil atualizado!',
          'Suas informações foram salvas.',
          [{ text: 'OK', onPress: fechar }],
          { pose: 'torcendo' }
        );
      } else {
        const msg =
          data.username?.[0]      ||
          data.nome_completo?.[0] ||
          data.avatar?.[0]        ||
          data.detail             ||
          'Erro ao atualizar perfil.';
        alertar('Erro', msg, [{ text: 'OK' }], { pose: 'ops' });
      }
    } catch {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusao = () => {
    alertar(
      'Excluir conta',
      'Tem certeza? Esta ação é permanente e todos os seus dados serão apagados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir minha conta', style: 'destructive', onPress: excluirConta },
      ],
      { pose: 'ops' } // trocar por 'chorando' quando a pose existir
    );
  };

  const excluirConta = async () => {
    setCarregando(true);
    try {
      const access = await AsyncStorage.getItem('access_token');
      const resp = await fetch(`${API_URL}/api/usuarios/perfil/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (resp.ok || resp.status === 204) {
        await signOut();
      } else {
        alertar('Erro', 'Não foi possível excluir a conta. Tente novamente.', [{ text: 'OK' }], { pose: 'ops' });
      }
    } catch (e) {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  const fonteAvatar = fotoPreview
    ? { uri: fotoPreview }
    : usuario?.avatar_url
      ? { uri: usuario.avatar_url }
      : require('../assets/kou-foco.png');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <Pressable style={styles.modalOverlay} onPress={fechar}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitulo}>Editar perfil</Text>
          <Text style={styles.modalSubtitulo}>
            Altere seu username ou nome de exibição.
          </Text>

          <View style={styles.avatarEditRow}>
            <View style={styles.avatarEdit}>
              <Image
                source={fonteAvatar}
                style={styles.avatarEditImg}
                resizeMode={fotoPreview || usuario?.avatar_url ? 'cover' : 'contain'}
              />
            </View>
            <TouchableOpacity style={styles.btnTrocarFoto} onPress={escolherFoto} disabled={carregando}>
              <Text style={styles.btnTrocarFotoText}>Trocar foto</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="@seu_username"
            placeholderTextColor="#9090B0"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            placeholderTextColor="#9090B0"
            value={nome}
            onChangeText={setNome}
          />

          <TouchableOpacity
            style={[styles.btnPrincipal, carregando && { opacity: 0.6 }]}
            onPress={salvar}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.btnPrincipalText}>Salvar alterações</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnExcluirConta}
            onPress={confirmarExclusao}
            disabled={carregando}
            activeOpacity={0.7}
          >
            <Text style={styles.btnExcluirContaText}>Excluir minha conta</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Modal: Iniciar Partida ───────────────────────────────────────────────
// Agora consome os endpoints reais do backend:
//   GET /api/questoes/bancas/
//   GET /api/questoes/materias/
//   GET /api/questoes/concursos/
// e tem o toggle de modo Com Tempo / Sem Tempo na etapa inicial.
function ModalPartida({ visible, onClose, onIniciar }) {
  const { authFetch } = useAuth();

  const [etapa, setEtapa]         = useState('inicio');
  const [tipoFiltro, setTipo]     = useState(null);
  const [comTempo, setComTempo]   = useState(false);

  const [opcoes, setOpcoes]       = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]           = useState(null);

  // Cache simples por tipo, pra não rebuscar toda vez que volta nessa etapa
  const cacheRef = React.useRef({});

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
              <Text style={styles.modalSubtitulo}>
                10 questões · +10 XP e +2 🪙 por acerto · consome ❤️ ao iniciar
              </Text>

              {/* Toggle de tempo */}
              <View style={styles.toggleTempoRow}>
                <TouchableOpacity
                  style={[styles.toggleTempoBtn, !comTempo && styles.toggleTempoBtnAtivo]}
                  onPress={() => setComTempo(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleTempoText, !comTempo && styles.toggleTempoTextAtivo]}>
                    🧘  Sem tempo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleTempoBtn, comTempo && styles.toggleTempoBtnAtivo]}
                  onPress={() => setComTempo(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleTempoText, comTempo && styles.toggleTempoTextAtivo]}>
                    ⏱️  Com tempo (60s)
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.btnPrincipal} onPress={() => iniciarComFiltro(null)} activeOpacity={0.85}>
                <Text style={styles.btnPrincipalText}>⚡  Iniciar agora — questões aleatórias</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFiltrar} onPress={() => setEtapa('escolha')} activeOpacity={0.7}>
                <Text style={styles.btnFiltrarText}>🎯  Filtrar por tema</Text>
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
              {[
                { tipo: 'banca',    icone: '🏛️', label: 'Banca',    desc: 'CESPE, FCC, FGV…' },
                { tipo: 'materia',  icone: '📚', label: 'Matéria',  desc: 'Direito, Português, Lógica…' },
                { tipo: 'concurso', icone: '🎯', label: 'Concurso', desc: 'TJ, PF, INSS, Receita…' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.tipo}
                  style={styles.filtroTipoItem}
                  onPress={() => escolherTipo(item.tipo)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 26 }}>{item.icone}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filtroTipoLabel}>{item.label}</Text>
                    <Text style={styles.filtroTipoDesc}>{item.desc}</Text>
                  </View>
                  <Text style={{ color: '#6C63FF', fontSize: 20 }}>›</Text>
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
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <ActivityIndicator color="#6C63FF" />
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
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                  {opcoes.map((op) => (
                    <TouchableOpacity
                      key={op.id}
                      style={styles.opcaoFiltroItem}
                      onPress={() => iniciarComFiltro({ tipo: tipoFiltro, id: op.id, label: labelDe(tipoFiltro, op) })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.opcaoFiltroLabel}>{labelDe(tipoFiltro, op)}</Text>
                      <Text style={{ color: '#6C63FF', fontSize: 18 }}>›</Text>
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

// ─── Aba: Início ─────────────────────────────────────────────────────────
function AbaInicio({ onAbrirModal }) {
  const { usuario } = useAuth();
  const xp       = usuario?.xp ?? MOCK.xp;
  const saudacao = getSaudacao();
  const titulo   = getTituloNivel(xp);
  const nome     = usuario?.nome_completo?.split(' ')[0] ?? usuario?.username ?? '…';

  return (
    <ScrollView style={styles.abaContainer} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.boasVindasCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.boasVindasSub}>{saudacao},</Text>
          <Text style={styles.boasVindasNome}>{nome} 👋</Text>
          <Text style={styles.boasVindasNivel}>
            Nível <Text style={{ color: '#6C63FF' }}>{titulo}</Text>
          </Text>
          <Text style={styles.boasVindasDesc}>pronto para pontuar?</Text>
        </View>
        <Image source={require('../assets/kou-foco.png')} style={styles.pontsImg} resizeMode="contain" />
      </View>

      <TouchableOpacity style={styles.btnEstudar} onPress={onAbrirModal} activeOpacity={0.85}>
        <Text style={styles.btnEstudarText}>⚡  Iniciar Partida</Text>
      </TouchableOpacity>

      <Text style={styles.secaoTitulo}>Desafios do dia</Text>
      <View style={styles.emBreveCard}>
        <Text style={styles.emBreveEmoji}>🎯</Text>
        <Text style={styles.emBreveTitulo}>Em breve</Text>
        <Text style={styles.emBreveDesc}>
          Desafios diários com recompensas de XP e moedas estão chegando. Fique de olho!
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Aba: Ranking ────────────────────────────────────────────────────────
function AbaRanking() {
  const { usuario } = useAuth();
  const liga = usuario?.liga ?? MOCK.liga;
  const medalhas = ['🥇', '🥈', '🥉'];

  return (
    <ScrollView style={styles.abaContainer} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.emBreveCardRanking}>
        <Text style={styles.emBreveEmoji}>🏆</Text>
        <Text style={styles.emBreveTitulo}>Ranking · Em breve</Text>
        <Text style={styles.emBreveDesc}>
          As ligas semanais estão sendo preparadas. Abaixo você vê uma prévia de como vai funcionar!
        </Text>
      </View>

      <View style={[styles.ligaBanner, { opacity: 0.5 }]}>
        <Text style={styles.ligaEmoji}>🏆</Text>
        <View>
          <Text style={styles.ligaTitulo}>Liga {liga}</Text>
          <Text style={styles.ligaSub}>Ranking semanal — encerra em 3 dias</Text>
        </View>
      </View>

      {RANKING_MOCK.map((item) => (
        <View key={item.pos} style={[styles.rankingItem, item.voce && styles.rankingItemVoce, { opacity: 0.5 }]}>
          <Text style={styles.rankingPos}>{item.pos <= 3 ? medalhas[item.pos - 1] : `#${item.pos}`}</Text>
          <Text style={[styles.rankingNome, item.voce && styles.rankingNomeVoce]}>{item.nome}</Text>
          <Text style={styles.rankingXp}>⭐ {item.xp.toLocaleString()}</Text>
        </View>
      ))}

      <View style={[styles.ligaAviso, { opacity: 0.5 }]}>
        <Text style={styles.ligaAvisoText}>
          Os 3 primeiros sobem para Liga Ouro. Os 2 últimos descem para Bronze.
        </Text>
      </View>
    </ScrollView>
  );
}

// ─── Aba: Perfil ─────────────────────────────────────────────────────────
function AbaPerfil({ onLogout }) {
  const { usuario } = useAuth();
  const [modalSenha,  setModalSenha]  = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);

  const xp      = usuario?.xp     ?? MOCK.xp;
  const streak  = usuario?.streak  ?? MOCK.streak;
  const moedas  = usuario?.moedas  ?? MOCK.moedas;
  const liga    = usuario?.liga    ?? MOCK.liga;
  const titulo  = getTituloNivel(xp);
  const xpProximo = getXpProximoNivel(xp);
  const xpPct   = xpProximo ? Math.min(xp / xpProximo, 1) : 1;
  const xpLabel = xpProximo
    ? `⭐ ${xp.toLocaleString()} / ${xpProximo.toLocaleString()} XP`
    : `⭐ ${xp.toLocaleString()} XP — Nível máximo`;
  const nome     = usuario?.nome_completo ?? '…';
  const username = usuario?.username      ?? '…';

  return (
    <ScrollView style={styles.abaContainer} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.perfilHeader}>
        <View style={styles.avatar}>
          <Image
            source={usuario?.avatar_url ? { uri: usuario.avatar_url } : require('../assets/kou-foco.png')}
            style={styles.avatarImg}
            resizeMode={usuario?.avatar_url ? 'cover' : 'contain'}
          />
        </View>
        <Text style={styles.perfilNome}>{username}</Text>
        <Text style={styles.perfilUsername}>{nome}</Text>
        <View style={styles.nivelBadge}>
          <Text style={styles.nivelBadgeText}>Nível {titulo}</Text>
        </View>
        <View style={styles.xpBarraContainer}>
          <View style={styles.xpBarraTrack}>
            <View style={[styles.xpBarraFill, { width: `${xpPct * 100}%` }]} />
          </View>
          <Text style={styles.xpBarraLabel}>{xpLabel}</Text>
        </View>
        <View style={styles.perfilStatsRow}>
          <View style={styles.perfilStatBox}>
            <Text style={styles.perfilStatVal}>{streak}</Text>
            <Text style={styles.perfilStatLabel}>🔥 Streak</Text>
          </View>
          <View style={styles.perfilStatDivider} />
          <View style={styles.perfilStatBox}>
            <Text style={styles.perfilStatVal}>{moedas}</Text>
            <Text style={styles.perfilStatLabel}>🪙 Moedas</Text>
          </View>
          <View style={styles.perfilStatDivider} />
          <View style={styles.perfilStatBox}>
            <Text style={styles.perfilStatVal}>{/*liga*/}Em breve</Text>
            <Text style={styles.perfilStatLabel}>🏆 Liga</Text>
          </View>
        </View>
      </View>

      <Text style={styles.secaoTitulo}>Conquistas</Text>
      <View style={styles.emBreveCard}>
        <Text style={styles.emBreveEmoji}>🏅</Text>
        <Text style={styles.emBreveTitulo}>Em breve</Text>
        <Text style={styles.emBreveDesc}>
          Conquistas únicas que desbloqueiam conforme você avança. Cada uma conta uma história!
        </Text>
      </View>

      <Text style={[styles.secaoTitulo, { marginTop: 8 }]}>Configurações</Text>

      <TouchableOpacity style={styles.opcaoItem} onPress={() => setModalPerfil(true)} activeOpacity={0.7}>
        <Text style={styles.opcaoText}>✏️  Editar perfil</Text>
        <Text style={{ color: '#9090B0', fontSize: 18 }}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.opcaoItem} onPress={() => setModalSenha(true)} activeOpacity={0.7}>
        <Text style={styles.opcaoText}>🔑  Alterar senha</Text>
        <Text style={{ color: '#9090B0', fontSize: 18 }}>›</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.btnLogout} onPress={onLogout} activeOpacity={0.8}>
        <Text style={styles.btnLogoutText}>Sair da conta</Text>
      </TouchableOpacity>

      <ModalAlterarSenha visible={modalSenha}  onClose={() => setModalSenha(false)} />
      <ModalEditarPerfil visible={modalPerfil} onClose={() => setModalPerfil(false)} />
    </ScrollView>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const [abaAtiva,     setAbaAtiva]     = useState('inicio');
  const [modalPartida, setModalPartida] = useState(false);
  const insets = useSafeAreaInsets();
  const { signOut, usuario } = useAuth();
  const { alertar } = usePontsAlert();

  const handleLogout = () => {
    alertar(
      'Sair da conta',
      'Tem certeza que deseja sair?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Sair', style: 'destructive', onPress: signOut },
      ],
      { pose: 'triste' }
    );
  };

  // filtro: { tipo, id, label, comTempo } ou { comTempo } se for aleatório
  const handleIniciarPartida = (filtro) => {
    setModalPartida(false);
    navigation.navigate('Partida', { filtro });
  };

  const streak = usuario?.streak ?? MOCK.streak;
  const vidas  = usuario?.vidas  ?? MOCK.vidas;
  const moedas = usuario?.moedas ?? MOCK.moedas;

  const ABAS = [
    { key: 'inicio',  label: 'Início',  icone: '🏠' },
    { key: 'ranking', label: 'Ranking', icone: '🏆' },
    { key: 'perfil',  label: 'Perfil',  icone: '👤' },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Text style={styles.logo}>
          Bancou<Text style={{ color: '#FF6B35' }}>.</Text>
        </Text>
        <StatsHeader streak={streak} vidas={vidas} moedas={moedas} />
      </View>

      <View style={{ flex: 1 }}>
        {abaAtiva === 'inicio'  && <AbaInicio onAbrirModal={() => setModalPartida(true)} />}
        {abaAtiva === 'ranking' && <AbaRanking />}
        {abaAtiva === 'perfil'  && <AbaPerfil onLogout={handleLogout} />}
      </View>

      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 6 }]}>
        {ABAS.map((aba) => {
          const ativa = abaAtiva === aba.key;
          return (
            <TouchableOpacity key={aba.key} style={styles.tabItem} onPress={() => setAbaAtiva(aba.key)} activeOpacity={0.7}>
              {ativa && <View style={styles.tabIndicador} />}
              <Text style={[styles.tabIcone, ativa && styles.tabIconeAtivo]}>{aba.icone}</Text>
              <Text style={[styles.tabLabel, ativa && styles.tabLabelAtivo]}>{aba.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ModalPartida
        visible={modalPartida}
        onClose={() => setModalPartida(false)}
        onIniciar={handleIniciarPartida}
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:         { flex: 1, backgroundColor: '#1a1a2e' },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#252540',
  },
  logo:         { fontFamily: 'Nunito_900Black', fontSize: 22, color: '#FFFFFF' },
  statsHeader:  { flexDirection: 'row', gap: 8 },
  statChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#252540', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5, gap: 4,
  },
  statEmoji:    { fontSize: 13 },
  statValue:    { fontFamily: 'Nunito_700Bold', fontSize: 13 },

  abaContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  boasVindasCard: {
    backgroundColor: '#252540', borderRadius: 14, padding: 20,
    flexDirection: 'row', alignItems: 'center', marginBottom: 16, overflow: 'hidden',
  },
  boasVindasSub:   { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#9090B0' },
  boasVindasNome:  { fontFamily: 'Nunito_800ExtraBold', fontSize: 24, color: '#FFFFFF', marginBottom: 2 },
  boasVindasNivel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0', marginBottom: 2 },
  boasVindasDesc:  { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0' },
  pontsImg:        { width: 80, height: 90, marginLeft: 12 },

  btnEstudar: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 24,
  },
  btnEstudarText: { fontFamily: 'Nunito_700Bold', fontSize: 17, color: '#FFFFFF' },

  secaoTitulo: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#FFFFFF', marginBottom: 12 },

  emBreveCard: {
    backgroundColor: '#252540', borderRadius: 14, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#6C63FF33', borderStyle: 'dashed',
  },
  emBreveCardRanking: {
    backgroundColor: '#252540', borderRadius: 14, padding: 20,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#FFD70033', borderStyle: 'dashed',
  },
  emBreveEmoji:  { fontSize: 32, marginBottom: 8 },
  emBreveTitulo: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#9090B0', marginBottom: 6 },
  emBreveDesc:   { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', textAlign: 'center', lineHeight: 19 },

  ligaBanner: {
    backgroundColor: '#252540', borderRadius: 14, padding: 16,
    flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16,
  },
  ligaEmoji:  { fontSize: 32 },
  ligaTitulo: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#FFD700' },
  ligaSub:    { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0' },
  rankingItem: {
    backgroundColor: '#252540', borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12,
  },
  rankingItemVoce: { borderWidth: 1, borderColor: '#6C63FF', backgroundColor: '#6C63FF18' },
  rankingPos:      { fontFamily: 'Nunito_700Bold', fontSize: 18, width: 36, textAlign: 'center', color: '#FFFFFF' },
  rankingNome:     { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: '#FFFFFF' },
  rankingNomeVoce: { color: '#6C63FF', fontFamily: 'Nunito_700Bold' },
  rankingXp:       { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#6C63FF' },
  ligaAviso:       { backgroundColor: '#252540', borderRadius: 10, padding: 12, marginTop: 8 },
  ligaAvisoText:   { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', textAlign: 'center', lineHeight: 17 },

  perfilHeader: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16,
    backgroundColor: '#252540', borderRadius: 14, marginBottom: 24,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: '#6C63FF', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  perfilNome:      { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: '#FFFFFF' },
  perfilUsername:  { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', marginBottom: 8 },
  nivelBadge: {
    backgroundColor: '#6C63FF22', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16,
    borderWidth: 1, borderColor: '#6C63FF55',
  },
  nivelBadgeText:   { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#6C63FF' },
  xpBarraContainer: { width: '100%', marginBottom: 20 },
  xpBarraTrack:     { height: 8, backgroundColor: '#1a1a2e', borderRadius: 999, marginBottom: 6 },
  xpBarraFill:      { height: 8, borderRadius: 999, backgroundColor: '#6C63FF' },
  xpBarraLabel:     { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', textAlign: 'center' },
  perfilStatsRow:   { flexDirection: 'row', alignItems: 'center' },
  perfilStatBox:    { flex: 1, alignItems: 'center' },
  perfilStatDivider:{ width: 1, height: 32, backgroundColor: '#1a1a2e' },
  perfilStatVal:    { fontFamily: 'Nunito_900Black', fontSize: 20, color: '#FFFFFF' },
  perfilStatLabel:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', marginTop: 2 },

  opcaoItem: {
    backgroundColor: '#252540', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  opcaoText:    { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#FFFFFF' },
  btnLogout: {
    marginTop: 16, borderWidth: 1, borderColor: '#FF4069',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  btnLogoutText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#FF4069' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#252540', borderRadius: 999,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitulo:    { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: '#FFFFFF', marginBottom: 4 },
  modalSubtitulo: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', marginBottom: 20, lineHeight: 18 },

  // Toggle de tempo
  toggleTempoRow: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
  },
  toggleTempoBtn: {
    flex: 1, backgroundColor: '#252540', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#35355a',
  },
  toggleTempoBtnAtivo: {
    backgroundColor: '#6C63FF22', borderColor: '#6C63FF',
  },
  toggleTempoText: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0',
  },
  toggleTempoTextAtivo: {
    fontFamily: 'Nunito_700Bold', color: '#6C63FF',
  },

  // Inputs normais (Editar Perfil)
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#252540', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#FFFFFF',
    marginBottom: 12, borderWidth: 1, borderColor: '#35355a',
  },

  // Inputs de senha com olho (Alterar Senha)
  inputLabelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 4,
  },
  linkEsqueceuSenha: {
    fontSize: 12, fontFamily: 'Inter_400Regular', color: '#6C63FF',
  },
  inputSenhaWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#252540', borderRadius: 12,
    borderWidth: 1, borderColor: '#35355a',
    marginBottom: 12, paddingRight: 12,
  },
  inputSenha: {
    flex: 1, color: '#FFFFFF',
    fontFamily: 'Inter_400Regular', fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  inputSenhaOlho:    { padding: 4 },
  inputSenhaOlhoIcon:{ fontSize: 18 },

  // Avatar editar
  avatarEditRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarEdit: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#252540', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#6C63FF', overflow: 'hidden',
  },
  avatarEditImg: { width: '100%', height: '100%' },
  btnTrocarFoto: {
    backgroundColor: '#6C63FF', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 0,
  },
  btnTrocarFotoText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },

  btnPrincipal: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  btnPrincipalText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#FFFFFF' },

  btnExcluirConta: {
    marginTop: 4, borderWidth: 1, borderColor: '#FF406944',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  btnExcluirContaText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#FF4069' },

  btnFiltrar: {
    backgroundColor: '#252540', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  btnFiltrarText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#9090B0' },
  voltarBtn:      { marginBottom: 12 },
  voltarText:     { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6C63FF' },
  filtroTipoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#252540', borderRadius: 12, padding: 16, marginBottom: 10,
  },
  filtroTipoLabel: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#FFFFFF' },
  filtroTipoDesc:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', marginTop: 2 },
  opcaoFiltroItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#252540',
  },
  opcaoFiltroLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#FFFFFF', flex: 1, marginRight: 8 },

  filtroErroBox: {
    paddingVertical: 24, alignItems: 'center', gap: 12,
  },
  filtroErroText: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0',
    textAlign: 'center', lineHeight: 19,
  },
  filtroErroBtn: {
    backgroundColor: '#252540', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#35355a',
  },
  filtroErroBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#6C63FF' },

  tabBar: {
    flexDirection: 'row', backgroundColor: '#252540',
    borderTopWidth: 1, borderTopColor: '#1a1a2e', paddingTop: 10,
  },
  tabItem:      { flex: 1, alignItems: 'center', position: 'relative' },
  tabIndicador: {
    position: 'absolute', top: -10, width: 32, height: 3,
    backgroundColor: '#6C63FF', borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
  },
  tabIcone:     { fontSize: 22, marginBottom: 2, opacity: 0.4 },
  tabIconeAtivo:{ opacity: 1 },
  tabLabel:     { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9090B0' },
  tabLabelAtivo:{ fontFamily: 'Inter_500Medium', color: '#6C63FF' },
});