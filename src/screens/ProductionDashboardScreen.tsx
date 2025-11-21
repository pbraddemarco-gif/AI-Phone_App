import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { ShiftTabs } from '../components/ShiftTabs';
import { ProductionChart } from '../components/ProductionChart';
import { HourlyStatsTable, HourlyStatRow } from '../components/HourlyStatsTable';
import TimeRangeSelector from '../components/TimeRangeSelector';
import CommonButton from '../components/CommonButton';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { useProductionData } from '../hooks/useProductionData';
import { TimeRangeType } from '../types/api';

export type ProductionDashboardProps = NativeStackScreenProps<RootStackParamList, 'ProductionDashboard'>;

const ProductionDashboardScreen: React.FC<ProductionDashboardProps> = ({ navigation }) => {
  const [shiftView, setShiftView] = useState<'current' | 'last'>('current');
  const [timeRange, setTimeRange] = useState<TimeRangeType>('daily');
  const theme = useAppTheme();

  // TODO: Get machine ID from user selection or route params
  const machineId = 'line-6'; // Placeholder - will be dynamic later

  // Calculate date range based on selected time range
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = new Date();
    
    switch (timeRange) {
      case 'hourly':
        start.setHours(start.getHours() - 1);
        break;
      case 'daily':
        start.setHours(start.getHours() - 24);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
      intervalBase: (timeRange === 'hourly' || timeRange === 'daily' ? 'hour' : 'day') as 'hour' | 'day',
      timeBase: 'hour' as const,
    };
  }, [timeRange]);

  const { performance, productionHistory, isLoading, error, refresh } = useProductionData(
    machineId,
    {
      ...dateRange,
      modes: ['goodparts', 'scrap', 'downtime'],
      groupBy: 'hour',
    }
  );

  const chartData = useMemo(() => {
    if (!productionHistory.length) {
      // Fallback mock data
      return [
        { hour: '18:00', goodparts: 45, downtimeMinutes: 5, goalMinutes: 60 },
        { hour: '19:00', goodparts: 48, downtimeMinutes: 8, goalMinutes: 60 },
        { hour: '20:00', goodparts: 50, downtimeMinutes: 3, goalMinutes: 60 },
        { hour: '21:00', goodparts: 52, downtimeMinutes: 0, goalMinutes: 60 },
        { hour: '22:00', goodparts: 58, downtimeMinutes: 12, goalMinutes: 60 },
        { hour: '23:00', goodparts: 40, downtimeMinutes: 20, goalMinutes: 60 },
      ];
    }

    return productionHistory.map((point) => ({
      hour: new Date(point.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      goodparts: point.goodParts || 0,
      downtimeMinutes: point.downtime || 0,
      goalMinutes: point.goal || 60,
    }));
  }, [productionHistory]);

  const hourlyRows: HourlyStatRow[] = useMemo(() => {
    if (!productionHistory.length) {
      // Fallback mock data
      return [
        { dateHour: '12/16 - 18:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 45 },
        { dateHour: '12/16 - 19:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 48 },
        { dateHour: '12/16 - 20:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 50 },
        { dateHour: '12/16 - 21:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 52 },
        { dateHour: '12/16 - 22:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 58 },
        { dateHour: '12/16 - 23:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 40 },
      ];
    }

    return productionHistory.map((point) => {
      const date = new Date(point.timestamp);
      const dateHour = `${date.getMonth() + 1}/${date.getDate()} - ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
      
      return {
        dateHour,
        status: point.status || '-',
        manualDowntime: point.manualDowntime ? `${point.manualDowntime}m` : '-',
        co: point.changeover || 0,
        scrap: point.scrap || 0,
        goodparts: point.goodParts || 0,
      };
    });
  }, [productionHistory]);

  return (
    <ScreenContainer>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refresh} />
        }
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>Production Dashboard</Text>
          <CommonButton label="Details" onPress={() => navigation.navigate('Details')} />
        </View>

        {error && (
          <View style={[styles.alert, { borderColor: '#EF4444', backgroundColor: '#FEF2F2' }]}>
            <Text style={[styles.alertText, { color: '#991B1B' }]}>⚠️ {error}</Text>
          </View>
        )}

        <View style={[styles.alert, { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]}>
          <Text style={styles.alertText}>ℹ Line is down for the day</Text>
        </View>

        <TimeRangeSelector selectedRange={timeRange} onRangeChange={setTimeRange} />

        <ShiftTabs active={shiftView} onChange={setShiftView} />

        {isLoading && !productionHistory.length ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading production data...</Text>
          </View>
        ) : (
          <>
            <ProductionChart data={chartData} />

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#16a34a' }]} />
                <Text style={styles.legendLabel}>Goodparts</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#facc15' }]} />
                <Text style={styles.legendLabel}>Downtime</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: '#0ea5e9' }]} />
                <Text style={styles.legendLabel}>Production Goal</Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Hourly Stats</Text>
            <HourlyStatsTable rows={hourlyRows} />

            {performance && (
              <View style={styles.performanceContainer}>
                <Text style={styles.performanceTitle}>Performance Metrics</Text>
                <View style={styles.metricsRow}>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>OEE</Text>
                    <Text style={styles.metricValue}>{performance.oee.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Availability</Text>
                    <Text style={styles.metricValue}>{performance.availability.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Quality</Text>
                    <Text style={styles.metricValue}>{performance.quality.toFixed(1)}%</Text>
                  </View>
                  <View style={styles.metric}>
                    <Text style={styles.metricLabel}>Performance</Text>
                    <Text style={styles.metricValue}>{performance.performance.toFixed(1)}%</Text>
                  </View>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  title: {
    fontSize: 20,
    fontWeight: '700'
  },
  alert: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12
  },
  alertText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1F2937'
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 8,
    marginBottom: 4
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4
  },
  legendLabel: {
    fontSize: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 4
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  performanceContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  performanceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
});

export default ProductionDashboardScreen;
