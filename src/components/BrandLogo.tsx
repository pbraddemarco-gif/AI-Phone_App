import React from 'react';
import Svg, { Circle, Rect, Polygon, Path } from 'react-native-svg';

interface BrandLogoProps {
  size?: number;
}

// Simplified vector approximation of provided gear + "i" logo.
export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 140 }) => {
  const center = size / 2;
  const gearRadius = size * 0.48;
  const innerRadius = size * 0.26;

  // Basic gear teeth count approximation
  const teeth = 8;
  const toothWidth = (Math.PI * 2 * gearRadius) / (teeth * 6);
  const toothHeight = size * 0.1;
  const toothElements: React.ReactElement[] = [];

  for (let i = 0; i < teeth; i++) {
    const angle = (i / teeth) * Math.PI * 2;
    const tx = center + (gearRadius - toothHeight / 2) * Math.cos(angle) - toothWidth / 2;
    const ty = center + (gearRadius - toothHeight / 2) * Math.sin(angle) - toothHeight / 2;
    const rotation = (angle * 180) / Math.PI;
    toothElements.push(
      <Rect
        key={i}
        x={tx}
        y={ty}
        width={toothWidth}
        height={toothHeight}
        fill={i < teeth / 2 ? '#7f8287' : '#3788d8'}
        originX={tx + toothWidth / 2}
        originY={ty + toothHeight / 2}
        rotation={rotation}
      />
    );
  }

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Top half gear */}
      <Path
        d={`M ${center - gearRadius} ${center} A ${gearRadius} ${gearRadius} 0 0 1 ${center + gearRadius} ${center} L ${center + gearRadius} ${center - gearRadius} L ${center - gearRadius} ${center - gearRadius} Z`}
        fill="#7f8287"
      />
      {/* Bottom half gear */}
      <Path
        d={`M ${center - gearRadius} ${center} A ${gearRadius} ${gearRadius} 0 0 0 ${center + gearRadius} ${center} L ${center + gearRadius} ${center + gearRadius} L ${center - gearRadius} ${center + gearRadius} Z`}
        fill="#3788d8"
      />
      {/* Teeth */}
      {toothElements}
      {/* Inner circle (mask approximation) */}
      <Circle cx={center} cy={center} r={innerRadius} fill="#ffffff" />
      {/* Letter i stem */}
      <Rect
        x={center - innerRadius * 0.18}
        y={center - innerRadius * 0.55}
        width={innerRadius * 0.36}
        height={innerRadius * 0.85}
        fill="#2c3e50"
        rx={innerRadius * 0.06}
      />
      {/* Diamond above stem */}
      <Polygon
        points={`${center},${center - innerRadius * 0.85} ${center - innerRadius * 0.16},${center - innerRadius * 0.69} ${center},${center - innerRadius * 0.53} ${center + innerRadius * 0.16},${center - innerRadius * 0.69}`}
        fill="#3788d8"
      />
    </Svg>
  );
};
