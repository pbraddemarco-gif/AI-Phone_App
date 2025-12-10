/**
 * ShiftProductionChart Component
 * Displays grouped bar chart comparing current vs previous shift
 */

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { ShiftHourPoint } from '../types/ShiftProduction';

interface ShiftProductionChartProps {
  data: ShiftHourPoint[];
  width?: number;
  height?: number;
}

export function ShiftProductionChart({ data, width, height }: ShiftProductionChartProps) {
  const screenWidth = width || Dimensions.get('window').width - 32;
  const chartHeight = height || 300;

  if (data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No data available</Text>
      </View>
    );
  }

  // Prepare data for BarChart
  // react-native-chart-kit BarChart expects:
  // {
  //   labels: string[],
  //   datasets: [{ data: number[] }]
  // }
  //
  // Since we need to show multiple metrics (good, reject, downtime) for both shifts,
  // we'll create 3 separate charts stacked vertically

  const labels = data.map((d) => d.hourLabel);

  // Good Parts Chart Data
  const goodPartsData = {
    labels,
    datasets: [
      {
        data: data.map((d) => d.currentGood),
        color: (opacity = 1) => `rgba(46, 213, 115, ${opacity})`, // Green for current
      },
      {
        data: data.map((d) => d.previousGood),
        color: (opacity = 1) => `rgba(134, 142, 150, ${opacity})`, // Gray for previous
      },
    ],
    legend: ['Current Good', 'Previous Good'],
  };

  // Reject Parts Chart Data
  const rejectPartsData = {
    labels,
    datasets: [
      {
        data: data.map((d) => d.currentReject),
        color: (opacity = 1) => `rgba(255, 71, 87, ${opacity})`, // Red for current
      },
      {
        data: data.map((d) => d.previousReject),
        color: (opacity = 1) => `rgba(134, 142, 150, ${opacity})`, // Gray for previous
      },
    ],
    legend: ['Current Reject', 'Previous Reject'],
  };

  // Downtime Chart Data (in minutes)
  const downtimeData = {
    labels,
    datasets: [
      {
        data: data.map((d) => d.currentDowntime),
        color: (opacity = 1) => `rgba(255, 165, 2, ${opacity})`, // Orange for current
      },
      {
        data: data.map((d) => d.previousDowntime),
        color: (opacity = 1) => `rgba(134, 142, 150, ${opacity})`, // Gray for previous
      },
    ],
    legend: ['Current Downtime', 'Previous Downtime'],
  };

  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForBackgroundLines: {
      strokeDasharray: '', // solid background lines
      stroke: '#e3e3e3',
    },
  };

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={true}>
      <View style={styles.container}>
        {/* Good Parts Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Good Parts by Hour</Text>
          <BarChart
            data={goodPartsData}
            width={Math.max(screenWidth, data.length * 40)}
            height={chartHeight}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            showBarTops
            withInnerLines
          />
        </View>

        {/* Reject Parts Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Reject Parts by Hour</Text>
          <BarChart
            data={rejectPartsData}
            width={Math.max(screenWidth, data.length * 40)}
            height={chartHeight}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            showBarTops
            withInnerLines
          />
        </View>

        {/* Downtime Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.chartTitle}>Downtime by Hour (minutes)</Text>
          <BarChart
            data={downtimeData}
            width={Math.max(screenWidth, data.length * 40)}
            height={chartHeight}
            yAxisLabel=""
            yAxisSuffix=" min"
            chartConfig={chartConfig}
            style={styles.chart}
            fromZero
            showBarTops
            withInnerLines
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
  },
  chartSection: {
    marginBottom: 32,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginLeft: 16,
    color: '#2c3e50',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  emptyContainer: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
});
