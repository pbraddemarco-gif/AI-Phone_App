/**
 * MachineShiftComparisonScreen
 * Full-screen view comparing current shift vs previous shift
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useShiftProductionComparison } from '../hooks/useShiftProductionComparison';
import { ShiftProductionChart } from '../components/ShiftProductionChart';
import { ShiftWindow } from '../types/ShiftProduction';

interface MachineShiftComparisonScreenProps {
  route: {
    params: {
      machineId: number;
    };
  };
}

export function MachineShiftComparisonScreen({ route }: MachineShiftComparisonScreenProps) {
  const { machineId } = route.params;

  // TODO: Replace with dynamic shift calculation based on user's shift schedule
  // For now, hardcoded to compare:
  // - Current shift: Today 6:00 AM - Today 6:00 PM (12-hour shift)
  // - Previous shift: Yesterday 6:00 AM - Yesterday 6:00 PM (12-hour shift)

  const currentShift: ShiftWindow = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setHours(6, 0, 0, 0); // 6:00 AM today

    const end = new Date(now);
    end.setHours(18, 0, 0, 0); // 6:00 PM today

    // If current time is before 6 AM, use yesterday's shift
    if (now.getHours() < 6) {
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate() - 1);
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, []);

  const previousShift: ShiftWindow = React.useMemo(() => {
    const current = new Date(currentShift.start);
    const start = new Date(current);
    start.setDate(start.getDate() - 1); // One day earlier

    const end = new Date(currentShift.end);
    end.setDate(end.getDate() - 1); // One day earlier

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }, [currentShift]);

  const { data, loading, error, refetch } = useShiftProductionComparison({
    machineId,
    currentShift,
    previousShift,
  });

  // Format dates for display
  const formatShiftLabel = (shift: ShiftWindow) => {
    const start = new Date(shift.start);
    const end = new Date(shift.end);
    const dateStr = start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    const startTime = start.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    const endTime = end.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
    return `${dateStr} (${startTime} - ${endTime})`;
  };

  if (loading && data.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3788d8" />
        <Text style={styles.loadingText}>Loading shift comparison...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={refetch}
          tintColor="#007AFF"
          colors={['#007AFF']}
        />
      }
      alwaysBounceVertical={true}
    >
      {/* Header info section */}
      <View style={styles.shiftInfoContainer}>
        <View style={styles.shiftInfo}>
          <View style={[styles.shiftIndicator, { backgroundColor: '#3788d8' }]} />
          <View>
            <Text style={styles.shiftLabel}>Current Shift</Text>
            <Text style={styles.shiftDate}>{formatShiftLabel(currentShift)}</Text>
          </View>
        </View>

        <View style={styles.shiftInfo}>
          <View style={[styles.shiftIndicator, { backgroundColor: '#868e96' }]} />
          <View>
            <Text style={styles.shiftLabel}>Previous Shift</Text>
            <Text style={styles.shiftDate}>{formatShiftLabel(previousShift)}</Text>
          </View>
        </View>
      </View>

      <ShiftProductionChart data={data} />

      {data.length === 0 && !loading && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No production data available for these shifts</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 8,
  },
  machineLabel: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  shiftInfoContainer: {
    marginTop: 8,
  },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  shiftLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  shiftDate: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
});
