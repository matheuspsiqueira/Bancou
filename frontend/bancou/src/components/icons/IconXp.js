// src/components/icons/IconXp.js
import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export default function IconXp({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(32,32)">
        <Path
          transform="translate(-12,-12) scale(2.15)"
          d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"
          fill="#6C63FF"
        />
      </G>
    </Svg>
  );
}
