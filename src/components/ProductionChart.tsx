import React from 'react';
import { View, StyleSheet } from 'react-native';
import { VictoryChart, VictoryBar, VictoryLine, VictoryAxis, VictoryTheme } from 'victory-native';
import { useAppTheme } from '../hooks/useAppTheme';

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
  const theme = useAppTheme();
  return (
    <View style={styles.wrapper}>
      <VictoryChart theme={VictoryTheme.material} domainPadding={{ x: 20, y: 20 }}>
        <VictoryAxis tickFormat={(t: string) => t} style={{ tickLabels: { fontSize: 10 } }} />
        <VictoryAxis
          dependentAxis
          tickFormat={(t: number) => `${t}`}
          style={{ tickLabels: { fontSize: 10 } }}
        />
        <VictoryBar
          data={data}
          x="hour"
          y="goodparts"
          style={{ data: { fill: '#16a34a' } }}
          barRatio={0.6}
        />
        <VictoryLine
          data={data}
          x="hour"
          y={(d: ProductionPoint) => d.downtimeMinutes}
          style={{ data: { stroke: '#facc15', strokeWidth: 2 } }}
        />
        <VictoryLine
          data={data}
          x="hour"
          y={(d: ProductionPoint) => d.goalMinutes}
          style={{ data: { stroke: '#0ea5e9', strokeWidth: 2 } }}
        />
      </VictoryChart>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    height: 240,
    paddingVertical: 4
  }
});
