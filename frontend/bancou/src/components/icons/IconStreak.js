// src/components/icons/IconStreak.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';

export default function IconStreak({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="fireOuter" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FFC34D"/>
          <Stop offset="45%" stopColor="#FF8A2A"/>
          <Stop offset="100%" stopColor="#F04A1D"/>
        </LinearGradient>

        <LinearGradient id="fireInner" x1="50%" y1="0%" x2="50%" y2="100%">
          <Stop offset="0%" stopColor="#FFF7B0"/>
          <Stop offset="100%" stopColor="#FFD84A"/>
        </LinearGradient>

      </Defs>

      {/* Chama principal */}
      <Path
        d="
          M32 58
          C18 50 14 38 18 27
          C20 20 26 16 28 8
          C29 15 34 18 38 23
          C43 18 46 12 45 5
          C55 16 56 31 51 42
          C47 51 40 56 32 58
          Z
        "
        fill="url(#fireOuter)"
        stroke="#D95516"
        strokeWidth="2"
      />

      {/* Núcleo */}
      <Path
        d="
          M32 50
          C24 45 24 35 29 29
          C31 26 32 22 32 18
          C35 24 39 28 39 35
          C39 42 36 47 32 50
          Z
        "
        fill="url(#fireInner)"
      />

      {/* Brilho */}
      <Path
        d="M27 18 C29 16 31 16 32 18"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.8}
      />

    </Svg>
  );
}