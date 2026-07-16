// src/components/icons/IconXp.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Polygon,
  Path,
  G,
} from 'react-native-svg';

export default function IconXp({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#D8C0FF" />
          <Stop offset="40%" stopColor="#9D6BFF" />
          <Stop offset="100%" stopColor="#5C35E6" />
        </LinearGradient>
      </Defs>

      <G>

        {/* Cristal */}
        <Polygon
          points="
            32,8
            45,18
            40,43
            32,55
            24,43
            19,18
          "
          fill="url(#xpGradient)"
          stroke="#4E2DBD"
          strokeWidth="2"
        />

        {/* Facetas */}
        <Path
          d="
            M32 8
            L32 55
            M19 18
            L32 30
            L45 18
            M24 43
            L32 30
            L40 43
          "
          stroke="#E6D8FF"
          strokeWidth="1.5"
          opacity="0.7"
        />

        {/* Brilho */}
        <Path
          d="M25 18 L29 15 L30 23 L24 24 Z"
          fill="#FFFFFF"
          opacity="0.55"
        />

      </G>
    </Svg>
  );
}