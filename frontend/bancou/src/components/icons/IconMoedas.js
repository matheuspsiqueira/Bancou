// src/components/icons/IconMoedas.js

import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  Circle,
  Ellipse,
  Path,
  Text as SvgText,
  G,
} from 'react-native-svg';

export default function IconMoedas({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        {/* Corpo da moeda */}
        <LinearGradient id="coin" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFF3A0" />
          <Stop offset="35%" stopColor="#FFD84A" />
          <Stop offset="100%" stopColor="#E3A700" />
        </LinearGradient>

        {/* Centro */}
        <RadialGradient id="center" cx="35%" cy="30%" r="70%">
          <Stop offset="0%" stopColor="#FFE98A" />
          <Stop offset="100%" stopColor="#FFC400" />
        </RadialGradient>
      </Defs>

      <G>

        {/* sombra */}
        <Ellipse
          cx="32"
          cy="55"
          rx="19"
          ry="4"
          fill="#000"
          opacity={0.15}
        />

        {/* moeda */}
        <Circle
          cx="32"
          cy="32"
          r="28"
          fill="url(#coin)"
          stroke="#C88600"
          strokeWidth="3"
        />

        {/* aro interno */}
        <Circle
          cx="32"
          cy="32"
          r="21"
          fill="url(#center)"
          stroke="#E2A400"
          strokeWidth="2"
        />

        {/* brilho */}
        <Ellipse
          cx="23"
          cy="22"
          rx="9"
          ry="5"
          fill="#FFF"
          opacity={0.45}
          transform="rotate(-18 23 22)"
        />

        {/* pequeno brilho */}
        <Circle
          cx="43"
          cy="18"
          r="1.8"
          fill="#FFF"
          opacity={0.9}
        />

        {/* letra */}
        <SvgText
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="24"
          fontWeight="900"
          fill="#8A5A00"
        >
          B
        </SvgText>

      </G>
    </Svg>
  );
}