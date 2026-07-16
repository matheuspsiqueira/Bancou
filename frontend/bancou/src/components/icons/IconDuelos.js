import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  G,
  Path,
  Circle,
} from 'react-native-svg';

export default function IconDuelos({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="blade" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#F5F7FA" />
          <Stop offset="100%" stopColor="#BFC7D5" />
        </LinearGradient>

        <LinearGradient id="handle" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8F7BFF" />
          <Stop offset="100%" stopColor="#5F46E8" />
        </LinearGradient>

        <LinearGradient id="guard" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFE27A" />
          <Stop offset="100%" stopColor="#F4B400" />
        </LinearGradient>

      </Defs>

      {/* espada esquerda */}
      <G transform="rotate(-35 32 32)">

        {/* lâmina */}
        <Path
          d="M30 10 L34 10 L34 38 L32 42 L30 38 Z"
          fill="url(#blade)"
          stroke="#98A2B3"
          strokeWidth="1"
        />

        {/* guarda */}
        <Path
          d="M25 39 H39"
          stroke="url(#guard)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* cabo */}
        <Path
          d="M32 39 V50"
          stroke="url(#handle)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        {/* pomo */}
        <Circle
          cx="32"
          cy="52"
          r="2.5"
          fill="#5F46E8"
        />

      </G>

      {/* espada direita */}
      <G transform="rotate(35 32 32)">

        <Path
          d="M30 10 L34 10 L34 38 L32 42 L30 38 Z"
          fill="url(#blade)"
          stroke="#98A2B3"
          strokeWidth="1"
        />

        <Path
          d="M25 39 H39"
          stroke="url(#guard)"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <Path
          d="M32 39 V50"
          stroke="url(#handle)"
          strokeWidth="4"
          strokeLinecap="round"
        />

        <Circle
          cx="32"
          cy="52"
          r="2.5"
          fill="#5F46E8"
        />

      </G>

      {/* brilho */}
      <Path
        d="M29 18 L31 15"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.8}
      />

    </Svg>
  );
}