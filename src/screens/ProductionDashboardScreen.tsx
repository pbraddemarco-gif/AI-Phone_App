import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ScreenContainer from '../components/ScreenContainer';
import { ShiftTabs } from '../components/ShiftTabs';
import { ProductionChart } from '../components/ProductionChart';
import { HourlyStatsTable, HourlyStatRow } from '../components/HourlyStatsTable';
import CommonButton from '../components/CommonButton';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';

export type ProductionDashboardProps = NativeStackScreenProps<RootStackParamList, 'ProductionDashboard'>;

const ProductionDashboardScreen: React.FC<ProductionDashboardProps> = ({ navigation }) => {
  const [shiftView, setShiftView] = useState<'current' | 'last'>('current');
  const theme = useAppTheme();

  const chartData = useMemo(
    () => [
      { hour: '18:00', goodparts: 45, downtimeMinutes: 5, goalMinutes: 60 },
      { hour: '19:00', goodparts: 48, downtimeMinutes: 8, goalMinutes: 60 },
      { hour: '20:00', goodparts: 50, downtimeMinutes: 3, goalMinutes: 60 },
      { hour: '21:00', goodparts: 52, downtimeMinutes: 0, goalMinutes: 60 },
      { hour: '22:00', goodparts: 58, downtimeMinutes: 12, goalMinutes: 60 },
      { hour: '23:00', goodparts: 40, downtimeMinutes: 20, goalMinutes: 60 },
    ],
    [shiftView]
  );

  const hourlyRows: HourlyStatRow[] = useMemo(
    () => [
      { dateHour: '12/16 - 18:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 45 },
      { dateHour: '12/16 - 19:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 48 },
      { dateHour: '12/16 - 20:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 50 },
      { dateHour: '12/16 - 21:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 52 },
      { dateHour: '12/16 - 22:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 58 },
      { dateHour: '12/16 - 23:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 40 },
      { dateHour: '13/16 - 00:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 42 },
      { dateHour: '13/16 - 01:00', status: '174', manualDowntime: '56m', co: 8, scrap: 8, goodparts: 41 },
    ],
    [shiftView]
  );

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Production Dashboard</Text>
          <CommonButton label="Details" onPress={() => navigation.navigate('Details')} />
        </View>

        <View style={[styles.alert, { borderColor: '#3B82F6', backgroundColor: '#EFF6FF' }]}>
          <Text style={styles.alertText}>ℹ Line is down for the day</Text>
        </View>

        <ShiftTabs active={shiftView} onChange={setShiftView} />

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
  }
});

export default ProductionDashboardScreen;
