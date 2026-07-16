// src/components/icons/IconPerfil.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Path,
} from 'react-native-svg';

export default function IconPerfil({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8F7BFF"/>
          <Stop offset="100%" stopColor="#5F46E8"/>
        </LinearGradient>

        <LinearGradient id="user" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFFFFF"/>
          <Stop offset="100%" stopColor="#ECECEC"/>
        </LinearGradient>

      </Defs>

      {/* Fundo */}

      <Circle
        cx="32"
        cy="32"
        r="24"
        fill="url(#bg)"
      />

      {/* Cabeça */}

      <Circle
        cx="32"
        cy="24"
        r="9"
        fill="url(#user)"
      />

      {/* Corpo */}

      <Path
        d="
          M18 49
          C18 40 24 35 32 35
          C40 35 46 40 46 49
          Z
        "
        fill="url(#user)"
      />

      {/* Brilho */}

      <Path
        d="
          M20 18
          C23 15 27 15 30 18
        "
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
      />

    </Svg>
  );
}