// src/components/icons/IconStreak.js
import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export default function IconStreak({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(32,36)">
        <Path d="M0,-30 C16,-10 16,12 0,26 C-16,12 -16,-10 0,-30 Z" fill="#FF6B35" />
        <Path
          d="M0,-30 C16,-10 16,12 0,26 C-16,12 -16,-10 0,-30 Z"
          fill="#FFD700"
          transform="scale(0.55)"
        />
      </G>
    </Svg>
  );
}
