// src/components/icons/IconRanking.js
import React from 'react';
import Svg, { G, Ellipse, Path, Rect } from 'react-native-svg';

export default function IconRanking({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(32,34)">
        <Ellipse cx="-19" cy="-16" rx="6" ry="9" fill="none" stroke="#FFD700" strokeWidth="4" />
        <Ellipse cx="19" cy="-16" rx="6" ry="9" fill="none" stroke="#FFD700" strokeWidth="4" />
        <Path d="M-16,-24 L16,-24 L12,-6 C12,4 -12,4 -12,-6 Z" fill="#FFD700" />
        <Rect x="-3" y="-6" width="6" height="10" fill="#FFD700" />
        <Rect x="-14" y="4" width="28" height="8" rx="2" fill="#6C63FF" />
      </G>
    </Svg>
  );
}
