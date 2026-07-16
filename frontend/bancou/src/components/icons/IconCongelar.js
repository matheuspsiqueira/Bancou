// src/components/icons/IconCongelar.js

import React from 'react';
import Svg,{
  Defs,
  LinearGradient,
  Stop,
  G,
  Line,
  Circle,
} from 'react-native-svg';

function Arm() {
  return (
    <G>

      <Line
        x1="0"
        y1="-20"
        x2="0"
        y2="20"
        stroke="url(#ice)"
        strokeWidth="3"
        strokeLinecap="round"
      />

      <Line
        x1="0"
        y1="-12"
        x2="-5"
        y2="-17"
        stroke="url(#ice)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <Line
        x1="0"
        y1="-12"
        x2="5"
        y2="-17"
        stroke="url(#ice)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <Line
        x1="0"
        y1="12"
        x2="-5"
        y2="17"
        stroke="url(#ice)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <Line
        x1="0"
        y1="12"
        x2="5"
        y2="17"
        stroke="url(#ice)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

    </G>
  );
}

export default function IconCongelar({ size = 20 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">

      <Defs>

        <LinearGradient id="ice" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#E8FBFF"/>
          <Stop offset="45%" stopColor="#9DE6FF"/>
          <Stop offset="100%" stopColor="#4DBBFF"/>
        </LinearGradient>

      </Defs>

      <G transform="translate(32 32)">

        <Circle
          r="3"
          fill="#DFF8FF"
        />

        <Arm/>

        <G transform="rotate(60)">
          <Arm/>
        </G>

        <G transform="rotate(120)">
          <Arm/>
        </G>

      </G>

    </Svg>
  );
}