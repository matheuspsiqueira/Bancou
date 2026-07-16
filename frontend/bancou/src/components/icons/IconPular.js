// src/components/icons/IconPular.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
} from 'react-native-svg';

export default function IconPular({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>
        <LinearGradient id="skip" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#9D86FF" />
          <Stop offset="100%" stopColor="#6C63FF" />
        </LinearGradient>
      </Defs>

      {/* seta dupla */}
      <Path
        d="
          M10 18
          L28 32
          L10 46
          Z

          M28 18
          L46 32
          L28 46
          Z
        "
        fill="url(#skip)"
      />

      {/* barra */}
      <Path
        d="M52 18 V46"
        stroke="#4C43D8"
        strokeWidth="4"
        strokeLinecap="round"
      />

    </Svg>
  );
}