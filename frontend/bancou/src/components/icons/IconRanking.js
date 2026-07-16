import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Path,
  Rect,
  Circle,
} from 'react-native-svg';

export default function IconRanking({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#FFF4B8" />
          <Stop offset="40%" stopColor="#FFD54A" />
          <Stop offset="100%" stopColor="#E6A300" />
        </LinearGradient>

        <LinearGradient id="purple" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#8F7BFF" />
          <Stop offset="100%" stopColor="#5F46E8" />
        </LinearGradient>

        <LinearGradient id="gem" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#CDB7FF"/>
          <Stop offset="100%" stopColor="#7B4DFF"/>
        </LinearGradient>

      </Defs>

      {/* Alças */}

      <Path
        d="M18 14
           C8 14 8 28 18 30"
        fill="none"
        stroke="url(#gold)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      <Path
        d="M46 14
           C56 14 56 28 46 30"
        fill="none"
        stroke="url(#gold)"
        strokeWidth="4"
        strokeLinecap="round"
      />

      {/* Corpo */}

      <Path
        d="
          M18 10
          H46
          L43 31
          C42 38 38 42 32 42
          C26 42 22 38 21 31
          Z
        "
        fill="url(#gold)"
        stroke="#C88900"
        strokeWidth="2"
      />

      {/* Cristal */}

      <Path
        d="
          M32 20
          L36 24
          L34 30
          L32 33
          L30 30
          L28 24
          Z
        "
        fill="url(#gem)"
      />

      {/* Haste */}

      <Rect
        x="29"
        y="42"
        width="6"
        height="8"
        rx="2"
        fill="url(#gold)"
      />

      {/* Base */}

      <Rect
        x="18"
        y="50"
        width="28"
        height="8"
        rx="3"
        fill="url(#purple)"
      />

      {/* Brilho */}

      <Circle
        cx="25"
        cy="18"
        r="2"
        fill="#FFFFFF"
        opacity={0.7}
      />

    </Svg>
  );
}