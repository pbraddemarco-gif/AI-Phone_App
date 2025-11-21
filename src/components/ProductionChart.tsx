import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface ProductionPoint {
  hour: string;
  goodparts: number;
  downtimeMinutes: number;
  goalMinutes: number;
}

interface ProductionChartProps {
  data: ProductionPoint[];
}

export const ProductionChart: React.FC<ProductionChartProps> = ({ data }) => {
  const screenWidth = Dimensions.get('window').width;

  const chartData = {
    labels: data.map((d) => d.hour),
    datasets: [
      {
        data: data.map((d) => d.goodparts),
        color: () => '#16a34a', // green
        strokeWidth: 2,
      },
      {
        data: data.map((d) => d.downtimeMinutes),
        color: () => '#facc15', // yellow
        strokeWidth: 2,
      },
      {
        data: data.map((d) => d.goalMinutes),
        color: () => '#0ea5e9', // blue
        strokeWidth: 2,
      },
    ],
    legend: ['Good Parts', 'Downtime', 'Goal'],
  };

  return (
    <View style={styles.wrapper}>
      <LineChart
        data={chartData}
        width={screenWidth - 32}
        height={240}
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
          },
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 240,
    paddingVertical: 4,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
});
