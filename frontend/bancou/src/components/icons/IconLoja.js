import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Circle,
} from 'react-native-svg';

export default function IconLoja({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="bag" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFE27A" />
          <Stop offset="100%" stopColor="#F4B400" />
        </LinearGradient>

        <LinearGradient id="handle" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#8F7BFF" />
          <Stop offset="100%" stopColor="#5F46E8" />
        </LinearGradient>

      </Defs>

      {/* Alças */}

      <Path
        d="M22 24
           C22 16 27 12 32 12
           C37 12 42 16 42 24"
        fill="none"
        stroke="url(#handle)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Sacola */}

      <Path
        d="
          M16 24
          H48
          L45 52
          H19
          Z
        "
        fill="url(#bag)"
        stroke="#C88900"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* Símbolo B */}

      <Path
        d="
          M29 26
          V42
          M29 26
          H35
          C38 26 39 28 39 30
          C39 32 38 34 35 34
          H29
          M29 34
          H36
          C39 34 40 36 40 39
          C40 41 38 42 35 42
          H29
        "
        stroke="#8A5600"
        strokeWidth="2.3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* brilho */}

      <Circle
        cx="24"
        cy="30"
        r="2"
        fill="#FFF"
        opacity={0.65}
      />

    </Svg>
  );
}