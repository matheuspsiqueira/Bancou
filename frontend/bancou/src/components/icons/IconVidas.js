// src/components/icons/IconVidas.js
import React from 'react';
import Svg, { G, Path } from 'react-native-svg';

export default function IconVidas({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="translate(32,31) scale(2.5)">
        <Path
          transform="translate(-12,-10.5)"
          d="M12 4.435c-1.989-5.399-12-4.597-12 3.568 0 4.068 3.06 7.639 12 12.997 8.94-5.358 12-8.929 12-12.997 0-8.129-10.011-8.967-12-3.568z"
          fill="#FF4069"
        />
      </G>
    </Svg>
  );
}
