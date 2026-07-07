// src/utils/niveis.js
// Extraído do HomeScreen.js original — tabela de níveis, título por XP e saudação.

export const NIVEIS = [
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

export function getTituloNivel(xp = 0) {
  let titulo = NIVEIS[0].titulo;
  for (const n of NIVEIS) {
    if (xp >= n.minXp) titulo = n.titulo;
    else break;
  }
  return titulo;
}

export function getXpProximoNivel(xp = 0) {
  for (const n of NIVEIS) {
    if (xp < n.minXp) return n.minXp;
  }
  return null;
}

export function getSaudacao() {
  const h = new Date().getHours();
  if (h >= 0  && h < 5)  return 'Boa madrugada';
  if (h >= 5  && h < 12) return 'Bom dia';
  if (h >= 12 && h < 18) return 'Boa tarde';
  return 'Boa noite';
}
