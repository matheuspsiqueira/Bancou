// src/components/icons/IconEliminar.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Circle,
  Path,
} from 'react-native-svg';

export default function IconEliminar({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="bomb" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#5A5A66"/>
          <Stop offset="100%" stopColor="#2F2F38"/>
        </LinearGradient>

        <LinearGradient id="spark" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFE27A"/>
          <Stop offset="100%" stopColor="#FF7A00"/>
        </LinearGradient>

      </Defs>

      {/* bomba */}
      <Circle
        cx="32"
        cy="36"
        r="18"
        fill="url(#bomb)"
        stroke="#1D1D22"
        strokeWidth="2.5"
      />

      {/* pavio */}
      <Path
        d="M32 18 C34 10 42 10 44 18"
        stroke="#43C36A"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />

      {/* faísca */}
      <Path
        d="
          M46 12
          L49 9
          M46 12
          L50 13
          M46 12
          L47 7
          M46 12
          L43 8
        "
        stroke="url(#spark)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      {/* brilho */}
      <Path
        d="M24 28 C27 24 31 24 33 27"
        stroke="#FFFFFF"
        strokeWidth="2"
        opacity={0.5}
        strokeLinecap="round"
      />

    </Svg>
  );
}