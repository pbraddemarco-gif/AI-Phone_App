import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

interface ProductionPoint {
  hour: string;
  goodparts: number;
  rejectparts: number;
  downtimeMinutes: number;
  goalMinutes: number;
}

interface ProductionChartProps {
  data: ProductionPoint[];
  partsHourlyGoal?: number;
}

export const ProductionChart: React.FC<ProductionChartProps> = ({ data, partsHourlyGoal = 0 }) => {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth - 32, 800); // Max width for larger screens
  const height = 240;
  const paddingLeft = 32; // space for y-axis labels
  const paddingRight = 32; // space for right y-axis labels
  const paddingBottom = 32; // space for x-axis labels
  const paddingTop = 12;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingBottom - paddingTop;

  if (!data || data.length === 0) {
    return <View style={styles.wrapper} />;
  }

  // Safely extract numeric values, filtering out NaN/Infinity
  const safeValues = data
    .map((d) => Math.max(d.goodparts || 0, d.rejectparts || 0, 1))
    .filter((v) => isFinite(v));
  const safeDowntimes = data.map((d) => d.downtimeMinutes || 0).filter((v) => isFinite(v));

  const maxProduction = Math.max(
    ...safeValues,
    isFinite(partsHourlyGoal) ? partsHourlyGoal : 0,
    1 // Ensure at least 1
  );
  // Add 15% headroom to ensure goal line is visible and has space above it
  const maxProductionWithHeadroom = maxProduction * 1.15;
  const maxDowntime = Math.max(...safeDowntimes, 1);

  const barWidth = (chartWidth / data.length) * 0.5; // 50% of slot width
  const slotWidth = chartWidth / data.length;

  // Helper scale functions with safety checks
  const scaleYProduction = (v: number) => {
    if (!isFinite(v) || !isFinite(maxProductionWithHeadroom) || maxProductionWithHeadroom === 0) {
      return chartHeight;
    }
    return chartHeight - (v / maxProductionWithHeadroom) * chartHeight;
  };
  const scaleYDowntime = (v: number) => {
    if (!isFinite(v) || !isFinite(maxDowntime) || maxDowntime === 0) {
      return chartHeight;
    }
    return chartHeight - (v / maxDowntime) * chartHeight;
  };

  // Lines points
  const scrapPoints: { x: number; y: number }[] = [];
  const downtimePoints: { x: number; y: number }[] = [];

  data.forEach((d, i) => {
    const centerX = paddingLeft + slotWidth * i + slotWidth / 2;
    const rejectValue = isFinite(d.rejectparts) ? d.rejectparts : 0;
    const downtimeValue = isFinite(d.downtimeMinutes) ? d.downtimeMinutes : 0;
    scrapPoints.push({ x: centerX, y: paddingTop + scaleYProduction(rejectValue) });
    downtimePoints.push({ x: centerX, y: paddingTop + scaleYDowntime(downtimeValue) });
  });

  return (
    <View style={styles.wrapper}>
      <Svg width={width} height={height}>
        {/* Left Y-axis grid lines & labels (Production/Scrap) */}
        {Array.from({ length: 5 }).map((_, i) => {
          const value = Math.round((maxProductionWithHeadroom / 4) * i);
          const y = paddingTop + scaleYProduction(value);
          return (
            <React.Fragment key={i}>
              <Line
                x1={paddingLeft}
                x2={paddingLeft + chartWidth}
                y1={y}
                y2={y}
                stroke="#e5e5e5"
                strokeWidth={1}
              />
              <SvgText x={paddingLeft - 6} y={y + 4} fontSize={10} fill="#000" textAnchor="end">
                {value}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Right Y-axis labels (Downtime) */}
        {Array.from({ length: 5 }).map((_, i) => {
          const value = Math.round((maxDowntime / 4) * i);
          const y = paddingTop + scaleYDowntime(value);
          return (
            <SvgText
              key={`right-${i}`}
              x={paddingLeft + chartWidth + 6}
              y={y + 4}
              fontSize={10}
              fill="#facc15"
              textAnchor="start"
            >
              {value}m
            </SvgText>
          );
        })}

        {/* Bars for good parts */}
        {data.map((d, i) => {
          const goodPartsValue = isFinite(d.goodparts) ? d.goodparts : 0;
          const x = paddingLeft + slotWidth * i + (slotWidth - barWidth) / 2;
          const barHeight = (goodPartsValue / maxProductionWithHeadroom) * chartHeight;

          // Skip rendering if invalid
          if (!isFinite(barHeight) || barHeight < 0) {
            return null;
          }

          return (
            <Rect
              key={`bar-${i}`}
              x={x}
              y={paddingTop + chartHeight - barHeight}
              width={barWidth}
              height={barHeight}
              fill="#16a34a"
              rx={3}
            />
          );
        })}

        {/* Scrap line */}
        {scrapPoints.map((p, i) => {
          if (i === 0) return null;
          const prev = scrapPoints[i - 1];
          return (
            <Line
              key={`scrap-${i}`}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke="#ef4444"
              strokeWidth={2}
            />
          );
        })}

        {/* Downtime line */}
        {downtimePoints.map((p, i) => {
          if (i === 0) return null;
          const prev = downtimePoints[i - 1];
          return (
            <Line
              key={`down-${i}`}
              x1={prev.x}
              y1={prev.y}
              x2={p.x}
              y2={p.y}
              stroke="#facc15"
              strokeWidth={2}
            />
          );
        })}

        {/* Hourly goal line (blue) */}
        {partsHourlyGoal > 0 && (
          <Line
            x1={paddingLeft}
            y1={paddingTop + scaleYProduction(partsHourlyGoal)}
            x2={paddingLeft + chartWidth}
            y2={paddingTop + scaleYProduction(partsHourlyGoal)}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="5,5"
          />
        )}

        {/* X-axis labels - show every nth label to prevent overlap */}
        {data.map((d, i) => {
          const centerX = paddingLeft + slotWidth * i + slotWidth / 2;
          // Show labels based on data length to prevent overlap
          const skipInterval = data.length > 20 ? 4 : data.length > 12 ? 2 : 1;
          const shouldShow = i % skipInterval === 0 || i === data.length - 1;

          if (!shouldShow) return null;

          return (
            <SvgText
              key={`label-${i}`}
              x={centerX}
              y={height - 10}
              fontSize={9}
              fill="#666"
              textAnchor="middle"
            >
              {d.hour}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 240,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
