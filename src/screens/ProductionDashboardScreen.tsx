import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { ShiftTabs } from '../components/ShiftTabs';
import { ProductionChart } from '../components/ProductionChart';
import { HourlyStatsTable, HourlyStatRow } from '../components/HourlyStatsTable';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';

export type ProductionDashboardProps = NativeStackScreenProps<RootStackParamList, 'ProductionDashboard'>;

const ProductionDashboardScreen: React.FC<ProductionDashboardProps> = ({ navigation }) => {
  const [shiftView, setShiftView] = useState<'current' | 'last'>('current');

  const chartData = useMemo(
    () => [
      { hour: '18:00', goodparts: 45, downtimeMinutes: 55, goalMinutes: 60 },
      { hour: '19:00', goodparts: 60, downtimeMinutes: 40, goalMinutes: 60 },
      { hour: '20:00', goodparts: 50, downtimeMinutes: 50, goalMinutes: 60 },
      { hour: '21:00', goodparts: 55, downtimeMinutes: 45, goalMinutes: 60 },
      { hour: '22:00', goodparts: 65, downtimeMinutes: 60, goalMinutes: 60 },
      { hour: '23:00', goodparts: 50, downtimeMinutes: 55, goalMinutes: 60 },
      { hour: '00:00', goodparts: 40, downtimeMinutes: 45, goalMinutes: 60 },
    ],
    [shiftView]
  );

  const hourlyRows: HourlyStatRow[] = useMemo(
    () => [
      { dateHour: '12/16 - 18:00', status: '174', machineStatus: '-', manualDowntime: '-', co: 8, scrap: 8 },
      { dateHour: '12/16 - 19:00', status: '174', machineStatus: '56m', manualDowntime: '-', co: 8, scrap: 8 },
      { dateHour: '12/16 - 20:00', status: '174', machineStatus: '56m', manualDowntime: '-', co: 8, scrap: 8 },
      { dateHour: '12/16 - 21:00', status: '174', machineStatus: '56m', manualDowntime: '-', co: 8, scrap: 8 },
      { dateHour: '12/16 - 22:00', status: '174', machineStatus: '56m', manualDowntime: '-', co: 8, scrap: 8 },
      { dateHour: '12/16 - 23:00', status: '174', machineStatus: '56m', manualDowntime: '-', co: 8, scrap: 8 },
      { dateHour: '13/16 - 00:00', status: '174', machineStatus: '56m', manualDowntime: '-', co: 8, scrap: 8 },
      { dateHour: '13/16 - 01:00', status: '174', machineStatus: '56m', manualDowntime: '-', co: 8, scrap: 8 },
    ],
    [shiftView]
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Line 6</Text>
            <Text style={styles.headerSubtitle}>Product #1</Text>
          </View>
        </View>
        <TouchableOpacity>
          <Text style={styles.commentIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Alert Banner */}
        <View style={styles.alertBanner}>
          <View style={styles.alertContent}>
            <Text style={styles.alertIcon}>ℹ️</Text>
            <Text style={styles.alertText}>Line 6 is down for the day</Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.alertClose}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Shift Tabs */}
        <ShiftTabs active={shiftView} onChange={setShiftView} />

        {/* Chart */}
        <View style={styles.chartContainer}>
          <ProductionChart data={chartData} />
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#22C55E' }]} />
            <Text style={styles.legendLabel}>Goodparts</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#FBBF24' }]} />
            <Text style={styles.legendLabel}>Downtime</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendLabel}>Production Goal</Text>
          </View>
        </View>

        {/* Hourly Stats */}
        <Text style={styles.sectionTitle}>Hourly Stats</Text>
        <HourlyStatsTable rows={hourlyRows} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    fontSize: 32,
    fontWeight: '300',
    color: '#000000',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  commentIcon: {
    fontSize: 24,
  },
  scrollView: {
    flex: 1,
  },
  alertBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
  },
  alertContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertIcon: {
    fontSize: 16,
  },
  alertText: {
    fontSize: 14,
    color: '#1E40AF',
  },
  alertClose: {
    fontSize: 24,
    color: '#1E40AF',
    fontWeight: '300',
  },
  chartContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 12,
    color: '#000000',
  },
});

export default ProductionDashboardScreen;
