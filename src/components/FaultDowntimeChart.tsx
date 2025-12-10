import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';

export interface FaultDowntimePoint {
  description: string;
  seconds: number; // downtime seconds
  count: number; // number of occurrences
}

interface FaultDowntimeChartProps {
  data: FaultDowntimePoint[];
  metric: 'downtime' | 'count';
}

export const FaultDowntimeChart: React.FC<FaultDowntimeChartProps> = ({ data, metric }) => {
  const { width: windowWidth } = useWindowDimensions();
  const width = Math.min(windowWidth - 32, 800); // Max width for larger screens
  const height = 240;
  const paddingLeft = 32;
  const paddingRight = 32;
  const paddingBottom = 32;
  const paddingTop = 12;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingBottom - paddingTop;

  if (!data || data.length === 0) {
    return <View style={styles.wrapper} />;
  }

  // Top 5 faults only
  const faults = data.slice(0, 5);

  // Get max value based on metric
  const maxValue =
    metric === 'downtime'
      ? Math.max(...faults.map((d) => Math.round(d.seconds / 60)), 1)
      : Math.max(...faults.map((d) => d.count), 1);

  const barWidth = (chartWidth / faults.length) * 0.6;
  const slotWidth = chartWidth / faults.length;

  const scaleY = (value: number) => chartHeight - (value / maxValue) * chartHeight;

  return (
    <View style={styles.wrapper}>
      <Svg width={width} height={height}>
        {/* Y-axis grid lines & labels */}
        {Array.from({ length: 5 }).map((_, i) => {
          const value = Math.round((maxValue / 4) * i);
          const y = paddingTop + scaleY(value);
          const label = metric === 'downtime' ? `${value}m` : `${value}`;
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
                {label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Bars for each fault */}
        {faults.map((d, i) => {
          const x = paddingLeft + slotWidth * i + (slotWidth - barWidth) / 2;
          const value = metric === 'downtime' ? Math.round(d.seconds / 60) : d.count;
          const barH = (value / maxValue) * chartHeight;
          return (
            <Rect
              key={`bar-${i}`}
              x={x}
              y={paddingTop + chartHeight - barH}
              width={barWidth}
              height={barH}
              fill="#facc15"
              rx={3}
            />
          );
        })}

        {/* X-axis labels */}
        {faults.map((d, i) => {
          const centerX = paddingLeft + slotWidth * i + slotWidth / 2;
          return (
            <SvgText
              key={`label-${i}`}
              x={centerX}
              y={height - 10}
              fontSize={9}
              fill="#666"
              textAnchor="middle"
            >
              {truncate(d.description, 12)}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

function truncate(str: string, len: number) {
  return str.length > len ? str.slice(0, len - 1) + '…' : str;
}

const styles = StyleSheet.create({
  wrapper: {
    height: 240,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
