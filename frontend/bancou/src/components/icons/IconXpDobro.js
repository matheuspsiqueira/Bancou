// src/components/icons/IconXpDobro.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Polygon,
  Path,
  G,
} from 'react-native-svg';

export default function IconXpDobro({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>

        <LinearGradient id="xpCrystal" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#D7B8FF" />
          <Stop offset="45%" stopColor="#9B5CFF" />
          <Stop offset="100%" stopColor="#5A2DDA" />
        </LinearGradient>

        <RadialGradient id="shine" cx="35%" cy="25%" r="60%">
          <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </RadialGradient>

      </Defs>

      <G>

        {/* Cristal */}
        <Polygon
          points="
            32,6
            47,18
            42,45
            32,58
            22,45
            17,18
          "
          fill="url(#xpCrystal)"
          stroke="#4A25B7"
          strokeWidth="2.5"
        />

        {/* Facetas */}
        <Path
          d="
            M32 6
            L32 58
            M17 18
            L32 30
            L47 18
            M22 45
            L32 30
            L42 45
          "
          stroke="#DCC6FF"
          strokeWidth="1.5"
          opacity="0.65"
        />

        {/* Brilho */}
        <Path
          d="M24 18 L28 15 L30 23 L24 25 Z"
          fill="url(#shine)"
        />

      </G>
    </Svg>
  );
}