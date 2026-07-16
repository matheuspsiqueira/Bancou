// src/components/icons/IconVidas.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  G,
} from 'react-native-svg';

export default function IconVidas({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>
        <LinearGradient id="heartGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FF85A1" />
          <Stop offset="45%" stopColor="#FF4F7A" />
          <Stop offset="100%" stopColor="#D61F56" />
        </LinearGradient>
      </Defs>

      <G>

        {/* coração */}
        <Path
          d="
            M32 56
            C8 42 6 24 16 16
            C22 11 29 13 32 20
            C35 13 42 11 48 16
            C58 24 56 42 32 56
          "
          fill="url(#heartGradient)"
          stroke="#B11645"
          strokeWidth="2"
        />

        {/* brilho */}
        <Path
          d="
            M22 20
            C24 17 28 16 30 18
            "
          stroke="#FFF"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
        />

      </G>

    </Svg>
  );
}