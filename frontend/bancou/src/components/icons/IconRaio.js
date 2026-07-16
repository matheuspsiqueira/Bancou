// src/components/icons/IconRaio.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';

export default function IconRaio({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="bolt" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFF7B3" />
          <Stop offset="40%" stopColor="#FFE15A" />
          <Stop offset="100%" stopColor="#F4B400" />
        </LinearGradient>

      </Defs>

      <Path
        d="
          M36 4
          L16 34
          H28
          L24 60
          L48 26
          H36
          Z
        "
        fill="url(#bolt)"
        stroke="#D89A00"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* brilho */}
      <Path
        d="M33 12 L28 22"
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.75"
      />

    </Svg>
  );
}