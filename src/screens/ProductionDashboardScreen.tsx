import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { ShiftTabs } from '../components/ShiftTabs';
import { ProductionChart } from '../components/ProductionChart';
import { HourlyStatsTable, HourlyStatRow } from '../components/HourlyStatsTable';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { useProductionHistory } from '../hooks/useProductionHistory';

export type ProductionDashboardProps = NativeStackScreenProps<
  RootStackParamList,
  'ProductionDashboard'
>;

const ProductionDashboardScreen: React.FC<ProductionDashboardProps> = ({ navigation }) => {
  const [shiftView, setShiftView] = useState<'current' | 'last'>('current');
  const theme = useAppTheme();

  // Machine ID for production data
  const machineId = 775;
  
  // Calculate date range based on shift selection
  const { start, end } = useMemo(() => {
    const today = new Date();
    
    if (shiftView === 'current') {
      // Current shift: today
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
      return {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
      };
    } else {
      // Last shift: yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
      const endOfDay = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59);
      return {
        start: startOfDay.toISOString(),
        end: endOfDay.toISOString(),
      };
    }
  }, [shiftView]);
  
  const { data: productionData, loading, error, refetch } = useProductionHistory({
    machineId,
    start,
    end,
    modes: ['OEE', 'goodparts', 'rejectparts', 'downtime'],
    timeBase: 'hour',
  });

  
  // Transform API data to chart format
  const chartData = useMemo(() => {
    if (!productionData || productionData.length === 0) {
      // Fallback mock data if API returns nothing
      return [
        { hour: '18:00', goodparts: 45, rejectparts: 5, downtimeMinutes: 55, goalMinutes: 60 },
        { hour: '19:00', goodparts: 60, rejectparts: 3, downtimeMinutes: 40, goalMinutes: 60 },
        { hour: '20:00', goodparts: 50, rejectparts: 4, downtimeMinutes: 50, goalMinutes: 60 },
        { hour: '21:00', goodparts: 55, rejectparts: 2, downtimeMinutes: 45, goalMinutes: 60 },
        { hour: '22:00', goodparts: 65, rejectparts: 6, downtimeMinutes: 60, goalMinutes: 60 },
        { hour: '23:00', goodparts: 50, rejectparts: 3, downtimeMinutes: 55, goalMinutes: 60 },
        { hour: '00:00', goodparts: 40, rejectparts: 4, downtimeMinutes: 45, goalMinutes: 60 },
      ];
    }

    console.log('📊 Transforming chart data, sample point:', JSON.stringify(productionData[0]));

    return productionData.map(point => {
      const date = new Date(point.timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const timeLabel = `${hours}:${minutes}`;

      return {
        hour: timeLabel,
        goodparts: point.goodParts || 0,
        rejectparts: point.rejectParts || 0,
        downtimeMinutes: point.downtime || 0,
        goalMinutes: 60,
      };
    });
  }, [productionData]);

  // Transform API data to table rows
  const hourlyRows: HourlyStatRow[] = useMemo(() => {
    if (!productionData || productionData.length === 0) {
      // Fallback mock data if API returns nothing
      return [
        {
          dateHour: '12/16 - 18:00',
          status: '174',
          machineStatus: '-',
          manualDowntime: '-',
          co: 8,
          scrap: 8,
        },
        {
          dateHour: '12/16 - 19:00',
          status: '174',
          machineStatus: '56m',
          manualDowntime: '-',
          co: 8,
          scrap: 8,
        },
      ];
    }

    return productionData.map(point => {
      const date = new Date(point.timestamp);
      const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
      const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const downtimeMinutes = point.downtime || 0;
      const downtimeDisplay = downtimeMinutes > 0 ? `${Math.round(downtimeMinutes)}m` : '-';
      
      return {
        dateHour: `${dateStr} - ${timeStr}`,
        status: point.goodParts?.toString() || '-',
        machineStatus: downtimeDisplay,
        manualDowntime: '-',
        co: point.goodParts || 0,
        scrap: point.rejectParts || 0,
      };
    });
  }, [productionData]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.backButton, { color: theme.colors.text }]}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Line 6</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.neutralText }]}>
              Product #1
            </Text>
          </View>
        </View>
        <TouchableOpacity>
          <Text style={styles.commentIcon}>💬</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} />
        }
      >
        {/* Error Banner */}
        {error && (
          <View style={[styles.alertBanner, { backgroundColor: '#FEE2E2' }]}>
            <View style={styles.alertContent}>
              <Text style={styles.alertIcon}>⚠️</Text>
              <Text style={[styles.alertText, { color: '#991B1B' }]}>
                {error}
              </Text>
            </View>
          </View>
        )}

        {/* Alert Banner */}
        <View style={[styles.alertBanner, { backgroundColor: theme.colors.highlightBg }]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertIcon}>ℹ️</Text>
            <Text style={[styles.alertText, { color: theme.colors.text }]}>
              {loading ? 'Loading production data...' : `Showing ${productionData.length} data points`}
            </Text>
          </View>
          <TouchableOpacity>
            <Text style={styles.alertClose}>×</Text>
          </TouchableOpacity>
        </View>

        {/* Shift Tabs */}
        <ShiftTabs active={shiftView} onChange={setShiftView} />

        {/* Chart */}
        <View style={styles.chartContainer}>
          {loading ? (
            <View
              style={{
                height: 240,
                backgroundColor: theme.colors.backgroundNeutral,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator size="large" color={theme.colors.accent} />
              <Text style={{ color: theme.colors.neutralText, fontSize: 14, marginTop: 8 }}>
                Loading chart data...
              </Text>
            </View>
          ) : (
            <ProductionChart data={chartData} />
          )}
        </View>

        {/* Legend */}
        <View style={styles.legendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#16a34a' }]} />
            <Text style={styles.legendLabel}>Good Parts</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.legendLabel}>Scrap</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: '#facc15' }]} />
            <Text style={styles.legendLabel}>Downtime (min)</Text>
          </View>
        </View>

        {/* Hourly Stats */}
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Hourly Stats</Text>
        <HourlyStatsTable rows={hourlyRows} />
      </ScrollView>
    </View>
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
