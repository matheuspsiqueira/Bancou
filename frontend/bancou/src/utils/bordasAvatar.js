// src/utils/bordasAvatar.js
// Mapeia o código de usuario.borda_avatar (definido no admin do Django)
// para o estilo da borda do avatar. Código desconhecido ou vazio = null
// (o avatar mantém a borda padrão do app).
// Pra criar uma borda nova: adicionar o código aqui E em
// Usuario.BordaAvatar (backend/usuarios/models.py).
export const BORDAS_AVATAR = {
  pioneiro: { cor: '#FFC857', largura: 4 },
};

export function getBordaAvatar(codigo) {
  if (!codigo) return null;
  return BORDAS_AVATAR[codigo] ?? null;
}