// src/components/modals/ModalEditarPerfil.js
// Ajuste 09/2026: campo de e-mail adicionado pra espelhar o cadastro
// (AuthScreen). E-mail vem travado (read-only) porque o backend ainda
// não tem o fluxo de reenvio de confirmação pra troca de e-mail — ver
// briefing seção 2. Quando esse endpoint existir, troca `editavel={false}`
// por `true` no campo abaixo e ajusta o `salvar()` pra incluir o e-mail
// no payload (provavelmente um endpoint separado, tipo
// /api/usuarios/solicitar-troca-email/, não o PATCH de perfil direto).
// Ajuste 09/2026 (2): KeyboardAvoidingView + ScrollView internos (o Modal
// do RN não herda o adjustResize do Android sozinho, então o teclado
// cobria "Nome de usuário" e o botão salvar) e paddingBottom baseado em
// safe-area pra não cortar na barra de navegação do Android.
// Ajuste 09/2026 (3): o endpoint de troca de e-mail existe agora
// (POST /api/usuarios/trocar-email/) — campo de e-mail virou editável.
// A troca não é imediata: salvar dispara o PATCH normal (username/nome/
// avatar) e, se o e-mail mudou, uma chamada separada que envia um link
// de confirmação pro e-mail NOVO. `usuario.email` (contexto/AuthContext)
// só muda quando esse link é confirmado — até lá o login continua
// exigindo o e-mail antigo, então não precisamos deslogar nem re-buscar
// token nenhum aqui.
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { useKouAlert } from '../../context/KouAlertContext';
import { API_URL } from '../../config';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, typography, fontSize, spacing, borderRadius } from '../../theme';

export default function ModalEditarPerfil({ visible, onClose }) {
  const insets = useSafeAreaInsets();
  const { authFetch, usuario, atualizarUsuario, signOut } = useAuth();
  const { alertar } = useKouAlert();
  const [username, setUsername] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoArquivo, setFotoArquivo] = useState(null);

  React.useEffect(() => {
    if (visible) {
      setUsername(usuario?.username || '');
      setNome(usuario?.nome_completo || '');
      setEmail(usuario?.email || '');
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
    if (!email.trim()) {
      alertar('Atenção', 'O e-mail não pode ficar em branco.', [{ text: 'OK' }]);
      return;
    }

    const emailMudou = email.trim().toLowerCase() !== (usuario?.email || '').toLowerCase();

    setCarregando(true);
    try {
      let resp;

      if (fotoArquivo) {
        const access = await AsyncStorage.getItem('access_token');
        const form = new FormData();
        form.append('username', username.trim());
        form.append('nome_completo', nome.trim());
        form.append('avatar', fotoArquivo);

        resp = await fetch(`${API_URL}/api/usuarios/perfil/`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${access}`,
          },
          body: form,
        });
      } else {
        resp = await authFetch('/api/usuarios/perfil/', {
          method: 'PATCH',
          body: JSON.stringify({
            username: username.trim(),
            nome_completo: nome.trim(),
          }),
        });
      }

      const data = await resp.json();
      if (!resp.ok) {
        const msg =
          data.username?.[0] ||
          data.nome_completo?.[0] ||
          data.avatar?.[0] ||
          data.detail ||
          'Erro ao atualizar perfil.';
        alertar('Erro', msg, [{ text: 'OK' }], { pose: 'ops' });
        return;
      }

      atualizarUsuario({
        username: data.username,
        nome_completo: data.nome_completo,
        avatar_url: data.avatar_url,
      });

      if (emailMudou) {
        const respEmail = await authFetch('/api/usuarios/trocar-email/', {
          method: 'POST',
          body: JSON.stringify({ email: email.trim() }),
        });
        const dataEmail = await respEmail.json();

        if (!respEmail.ok) {
          const msgEmail = dataEmail.email?.[0] || dataEmail.detail || 'Não foi possível solicitar a troca de e-mail.';
          alertar(
            'Perfil atualizado, mas...',
            msgEmail,
            [{ text: 'OK', onPress: fechar }],
            { pose: 'ops' }
          );
          return;
        }

        alertar(
          'Confirme seu novo e-mail',
          `Enviamos um link de confirmação para ${email.trim()}. Até você clicar nele, seu login continua sendo feito com o e-mail antigo.`,
          [{ text: 'Entendi', onPress: fechar }],
          { pose: 'pensando' }
        );
        return;
      }

      alertar(
        'Perfil atualizado!',
        'Suas informações foram salvas.',
        [{ text: 'OK', onPress: fechar }],
        { pose: 'torcendo' }
      );
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
        { text: 'Excluir', style: 'destructive', onPress: excluirConta },
      ],
      { pose: 'chorando' }
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
      : require('../../assets/kou-foco.png');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={styles.modalOverlay} onPress={fechar}>
          <Pressable style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.lg }]} onPress={() => {}}>
            <View style={styles.modalHandle} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitulo}>Editar perfil</Text>
              <Text style={styles.modalSubtitulo}>
                Altere seus dados de cadastro.
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

              <Text style={styles.inputLabel}>Nome completo</Text>
              <TextInput
                style={styles.input}
                placeholder="Seu nome"
                placeholderTextColor={colors.textSecondary}
                value={nome}
                onChangeText={setNome}
                autoCapitalize="words"
              />

              <Text style={styles.inputLabel}>Nome de usuário</Text>
              <TextInput
                style={styles.input}
                placeholder="@seu_username"
                placeholderTextColor={colors.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Text style={styles.inputLabel}>E-mail</Text>
              <TextInput
                style={styles.input}
                placeholder="seu@email.com"
                placeholderTextColor={colors.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
              />
              <Text style={styles.avisoEmail}>
                Mudar o e-mail exige confirmação: enviaremos um link para o endereço novo antes de efetivar a troca.
              </Text>

              <TouchableOpacity
                style={[styles.btnPrincipal, carregando && { opacity: 0.6 }]}
                onPress={salvar}
                disabled={carregando}
                activeOpacity={0.85}
              >
                {carregando
                  ? <ActivityIndicator color={colors.text} />
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
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, maxHeight: '85%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.card, borderRadius: borderRadius.full,
    alignSelf: 'center', marginBottom: spacing.xl,
  },
  modalTitulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: 4 },
  modalSubtitulo: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 18 },
  inputLabel: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: 4 },
  input: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: typography.regular, fontSize: fontSize.body, color: colors.text,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#35355a',
  },
  avisoEmail: {
    fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary,
    marginBottom: spacing.md, lineHeight: 16,
  },
  avatarEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  avatarEdit: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary, overflow: 'hidden',
  },
  avatarEditImg: { width: '100%', height: '100%' },
  btnTrocarFoto: {
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 1,
  },
  btnTrocarFotoText: { fontFamily: typography.semibold, fontSize: fontSize.label, color: colors.text },
  btnPrincipal: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md,
  },
  btnPrincipalText: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.text },
  btnExcluirConta: {
    marginTop: 4, borderWidth: 1, borderColor: `${colors.lives}44`,
    borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center',
  },
  btnExcluirContaText: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.lives },
});