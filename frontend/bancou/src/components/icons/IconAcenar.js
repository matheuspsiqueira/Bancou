import React from 'react';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  Circle,
  Path,
  G,
} from 'react-native-svg';

export default function IconAcenar({ size = 24 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>
        <LinearGradient id="skin" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#FFE7CC" />
          <Stop offset="100%" stopColor="#F4C59A" />
        </LinearGradient>
      </Defs>

      {/* Movimento */}
      <Path
        d="M12 18 Q8 14 12 10"
        stroke="#6C63FF"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />

      <Path
        d="M10 28 Q5 28 10 28"
        stroke="#6C63FF"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />

      <Path
        d="M14 38 Q9 42 14 46"
        stroke="#6C63FF"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
      />

      {/* Mão inclinada */}
      <G transform="rotate(-22 34 32)">

        {/* dedos */}
        <Rect x="18" y="8" width="6" height="24" rx="3" fill="url(#skin)" />
        <Rect x="26" y="5" width="6" height="27" rx="3" fill="url(#skin)" />
        <Rect x="34" y="8" width="6" height="24" rx="3" fill="url(#skin)" />
        <Rect x="42" y="12" width="6" height="20" rx="3" fill="url(#skin)" />

        {/* palma */}
        <Rect
          x="18"
          y="26"
          width="30"
          height="24"
          rx="10"
          fill="url(#skin)"
        />

        {/* polegar */}
        <Path
          d="
            M20 32
            C11 30 10 42 18 45
            L22 39
            Z
          "
          fill="url(#skin)"
        />

        {/* brilho */}
        <Circle
          cx="27"
          cy="16"
          r="1.5"
          fill="#FFF"
          opacity="0.8"
        />

      </G>

    </Svg>
  );
}