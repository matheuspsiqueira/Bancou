// src/components/icons/IconMoedas.js
import React from 'react';
import Svg, { G, Circle, Text as SvgText } from 'react-native-svg';

export default function IconMoedas({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(32,32)">
        <Circle r="27" fill="#FFD700" stroke="#C99400" strokeWidth="3" />
        <Circle r="19" fill="none" stroke="#C99400" strokeWidth="2" />
        <SvgText
          x="0"
          y="8"
          textAnchor="middle"
          fontSize="24"
          fontWeight="700"
          fill="#8B6900"
        >
          B
        </SvgText>
      </G>
    </Svg>
  );
}
