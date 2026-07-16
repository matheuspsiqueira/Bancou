import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
} from 'react-native-svg';

export default function IconInicio({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="house" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#9B8AFF" />
          <Stop offset="100%" stopColor="#6C63FF" />
        </LinearGradient>

        <LinearGradient id="roof" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#7D72FF" />
          <Stop offset="100%" stopColor="#5346E8" />
        </LinearGradient>

        <LinearGradient id="door" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFD54A" />
          <Stop offset="100%" stopColor="#E7A800" />
        </LinearGradient>

      </Defs>

      {/* Telhado */}
      <Path
        d="
          M12 30
          L32 14
          L52 30
        "
        fill="none"
        stroke="url(#roof)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Corpo */}
      <Path
        d="
          M18 28
          V50
          H46
          V28
          Z
        "
        fill="url(#house)"
        stroke="#4F42D6"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Porta */}
      <Rect
        x="28"
        y="36"
        width="8"
        height="14"
        rx="2"
        fill="url(#door)"
      />

      {/* Brilho */}
      <Path
        d="
          M23 32
          C26 30 29 30 31 32
        "
        stroke="#FFFFFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.65"
      />

    </Svg>
  );
}