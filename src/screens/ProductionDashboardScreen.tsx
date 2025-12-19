import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { ShiftTabs } from '../components/ShiftTabs';
import { ProductionChart } from '../components/ProductionChart';
import { HourlyStatsTable, HourlyStatRow } from '../components/HourlyStatsTable';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { useProductionHistory } from '../hooks/useProductionHistory';
import { useCurrentProduct } from '../hooks/useCurrentProduct';
import { useShiftSchedule } from '../hooks/useShiftSchedule';
import { useMachineName } from '../hooks/useMachineName';
import { useFaultDowntime } from '../hooks/useFaultDowntime';
import { useMachineStatus } from '../hooks/useMachineStatus';
import { FaultDowntimeChart } from '../components/FaultDowntimeChart';
import { authService } from '../services/authService';
import { DEV_FLAGS } from '../config/devFlags';
import { getShiftSchedule, extractShiftInfo } from '../services/shiftScheduleService';
import { ShiftScheduleResponse } from '../types/api';

export type ProductionDashboardProps = NativeStackScreenProps<
  RootStackParamList,
  'ProductionDashboard'
>;

const ProductionDashboardScreen: React.FC<ProductionDashboardProps> = ({ navigation, route }) => {
  // Log incoming route params to verify navigation data
  try {
    // Route params available in route.params
  } catch (e) {
    if (__DEV__) console.debug('❌ Failed to access route params:', e);
  }
  const [shiftView, setShiftView] = useState<'current' | 'last'>('current');
  const [viewMode, setViewMode] = useState<'production' | 'faults'>('production');
  const [showAllFaults, setShowAllFaults] = useState(false);
  const [sortBy, setSortBy] = useState<'downtime' | 'count'>('downtime');
  const [hourSortOrder, setHourSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentShiftSchedule, setCurrentShiftSchedule] = useState<ShiftScheduleResponse | null>(
    null
  );
  const [lastShiftSchedule, setLastShiftSchedule] = useState<ShiftScheduleResponse | null>(null);
  const [shiftLoading, setShiftLoading] = useState(false);
  const theme = useAppTheme();

  // Machine ID & name from route params (fallbacks if not provided)
  const machineId = route.params?.machineId ?? 525;
  const machineName = route.params?.machineName ?? `Machine ${machineId}`;
  const partsHourlyGoal = Math.round(route.params?.partsHourlyGoal ?? 0);

  // Debug logging for partsHourlyGoal
  if (__DEV__)
    console.debug(
      '🎯 ProductionDashboard received partsHourlyGoal:',
      partsHourlyGoal,
      'from route.params:',
      route.params
    );

  // Fetch shift schedules on mount and when shiftView changes
  React.useEffect(() => {
    const fetchShiftSchedules = async () => {
      setShiftLoading(true);
      try {
        if (__DEV__) console.debug('📅 Fetching shift schedules for machine:', machineId);
        const [current, previous] = await Promise.all([
          getShiftSchedule(machineId, 'current'),
          getShiftSchedule(machineId, 'previous'),
        ]);

        setCurrentShiftSchedule(current);
        setLastShiftSchedule(previous);

        // Log shift info for debugging
        const currentInfo = extractShiftInfo(current);
        const previousInfo = extractShiftInfo(previous);
        if (__DEV__) console.debug('📅 Current shift info:', currentInfo);
        if (__DEV__) console.debug('📅 Previous shift info:', previousInfo);
      } catch (error) {
        if (__DEV__) console.debug('❌ Failed to fetch shift schedules:', error);
      } finally {
        setShiftLoading(false);
      }
    };

    fetchShiftSchedules();
  }, [machineId]);

  // Fetch real-time machine status
  const {
    status: machineStatus,
    loading: statusLoading,
    refetch: refetchStatus,
  } = useMachineStatus({ machineId });

  // Build dims[0] from shift schedule: format is "TagId;ShiftId"
  const { dims0, productionStart, productionEnd } = useMemo(() => {
    const activeShift = shiftView === 'current' ? currentShiftSchedule : lastShiftSchedule;

    if (__DEV__) console.debug('🔄 Recalculating production time range for shiftView:', shiftView);

    if (!activeShift || !activeShift.Items || activeShift.Items.length === 0) {
      if (__DEV__) console.debug('⚠️ No shift schedule available, using calendar day fallback');
      // Fallback to calendar day if no shift schedule available
      const now = new Date();
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      const endOfYesterday = new Date(endOfToday.getTime() - 24 * 60 * 60 * 1000);

      if (shiftView === 'current') {
        return {
          dims0: undefined,
          productionStart: startOfToday.toISOString(),
          productionEnd: endOfToday.toISOString(),
        };
      } else {
        return {
          dims0: undefined,
          productionStart: startOfYesterday.toISOString(),
          productionEnd: endOfYesterday.toISOString(),
        };
      }
    }

    const shift = activeShift.Items[0];
    // Build dims as "TagId;ShiftId" format
    const dimsValue = `${shift.TagId};${shift.Id}`;

    if (__DEV__)
      console.debug(
        `📊 Using shift schedule for ${shiftView}: dims=[${dimsValue}], start=${shift.StartDateTime}, end=${shift.EndDateTime}`
      );

    return {
      dims0: dimsValue,
      productionStart: shift.StartDateTime,
      productionEnd: shift.EndDateTime,
    };
  }, [currentShiftSchedule, lastShiftSchedule, shiftView]);

  // Fault downtime (use shift-based time bounds from shift schedule)
  const {
    data: faultData,
    loading: faultsLoading,
    error: faultsError,
    refetch: refetchFaults,
  } = useFaultDowntime({
    machineId,
    start: productionStart,
    end: productionEnd,
    enabled: viewMode === 'faults',
  });

  const faultPoints = useMemo(() => {
    const points = faultData
      .map((f) => ({
        description: f.Description || 'Unknown',
        seconds: (f.FaultDownTime || 0) * 60, // Convert minutes to seconds
        count: f.Count || 0,
      }))
      .filter((fp) => fp.seconds > 0)
      .sort((a, b) => {
        if (sortBy === 'downtime') {
          return b.seconds - a.seconds; // Descending by downtime
        } else {
          return b.count - a.count; // Descending by count
        }
      });
    return points;
  }, [faultData, sortBy]);

  // Chart points - always top 5
  const chartFaultPoints = useMemo(() => {
    return faultPoints.slice(0, 5);
  }, [faultPoints]);

  // Table points - top 5 or all based on state
  const tableFaultPoints = useMemo(() => {
    return showAllFaults ? faultPoints : faultPoints.slice(0, 5);
  }, [faultPoints, showAllFaults]);

  const hasMoreFaults = faultPoints.length > 5;

  // Swipe gesture logic (PanResponder for reliable horizontal swipe)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (
          _e: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          // Activate only if horizontal movement is significant and greater than vertical
          const { dx, dy } = gestureState;
          return Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.5;
        },
        onPanResponderRelease: (
          _e: GestureResponderEvent,
          gestureState: PanResponderGestureState
        ) => {
          const { dx } = gestureState;
          // Toggle on any significant horizontal swipe
          if (Math.abs(dx) > 50) {
            setViewMode((prev) => (prev === 'production' ? 'faults' : 'production'));
          }
        },
      }),
    []
  );

  // Fetch production history using shift-based dims and date boundaries
  const {
    data: productionData,
    loading,
    error,
    refetch,
  } = useProductionHistory({
    machineId,
    start: productionStart,
    end: productionEnd,
    modes: ['OEE', 'goodparts', 'rejectparts', 'downtime'],
    timeBase: 'hour',
    intervalBase: 'hour',
    dateType: 'calendar',
    filter: 'PlannedProductionTime:true',
    // Don't pass dims - let API return all data for time range, we'll filter client-side
    dims: undefined,
  });

  // Log production data fetch results
  React.useEffect(() => {
    if (__DEV__)
      console.debug('📈 Production data state:', {
        loading,
        hasError: !!error,
        errorMessage: error || undefined,
        hasData: !!productionData,
        dataLength: productionData?.length || 0,
        shiftView,
        dims0,
        start: productionStart,
        end: productionEnd,
      });
  }, [productionData, loading, error, shiftView, dims0, productionStart, productionEnd]);

  // Machine name hook - use API data or fallback to route param
  const { machineName: apiMachineName } = useMachineName({
    machineId,
    start: (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    })(),
    end: (() => {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      return d.toISOString();
    })(),
  });

  // Use API machine name if available, otherwise use the name from navigation params
  const displayMachineName = apiMachineName || machineName;

  // Transform API data to chart format
  const chartData = useMemo(() => {
    if (__DEV__)
      console.debug('📊 Chart data transformation:', {
        hasData: !!productionData,
        dataLength: productionData?.length || 0,
        shiftView,
        productionStart,
        productionEnd,
        dims0,
      });

    if (!productionData || productionData.length === 0) {
      if (__DEV__) console.debug('⚠️ No production data to display');
      return [];
    }

    if (__DEV__) console.debug('📊 First data point:', productionData[0]);
    if (__DEV__) console.debug('📊 Last data point:', productionData[productionData.length - 1]);

    return productionData.map((point) => {
      try {
        const date = new Date(point.timestamp);
        if (isNaN(date.getTime())) {
          if (__DEV__) console.debug('Invalid timestamp in chart data:', point.timestamp);
          return {
            hour: '00:00',
            goodparts: point.goodParts || 0,
            rejectparts: point.rejectParts || 0,
            downtimeMinutes: point.downtime || 0,
            goalMinutes: 60,
          };
        }
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
      } catch (error) {
        if (__DEV__) console.debug('Error processing chart data point:', error);
        return {
          hour: '00:00',
          goodparts: 0,
          rejectparts: 0,
          downtimeMinutes: 0,
          goalMinutes: 60,
        };
      }
    });
  }, [productionData]);

  // Transform API data to table rows
  const { hourlyRows, tableDate } = useMemo(() => {
    if (!productionData || productionData.length === 0) {
      return {
        tableDate: new Date().toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        }),
        hourlyRows: [],
      };
    }

    // Get date from first data point for section header
    let tableDate: string;
    try {
      const firstDate = new Date(productionData[0].timestamp);
      if (isNaN(firstDate.getTime())) {
        tableDate = 'Invalid Date';
      } else {
        tableDate = firstDate.toLocaleDateString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
        });
      }
    } catch (error) {
      if (__DEV__) console.debug('Error formatting table date:', error);
      tableDate = 'Unknown';
    }

    const rows = productionData.map((point) => {
      try {
        const date = new Date(point.timestamp);
        let hour: string;
        if (isNaN(date.getTime())) {
          hour = '00:00';
        } else {
          hour = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          });
        }

        return {
          hour,
          timestamp: point.timestamp, // Keep timestamp for sorting
          production: Math.round(point.goodParts || 0),
          scrap: Math.round(point.rejectParts || 0),
          downtime: Math.round(point.downtime || 0),
        };
      } catch (error) {
        if (__DEV__) console.debug('Error processing table row:', error);
        return {
          hour: '00:00',
          timestamp: point.timestamp,
          production: 0,
          scrap: 0,
          downtime: 0,
        };
      }
    });

    // Sort rows by timestamp based on hourSortOrder
    const sortedRows = [...rows].sort((a, b) => {
      try {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        const timeA = dateA.getTime();
        const timeB = dateB.getTime();

        // Validate dates
        if (isNaN(timeA) && isNaN(timeB)) return 0;
        if (isNaN(timeA)) return 1;
        if (isNaN(timeB)) return -1;

        return hourSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      } catch (error) {
        if (__DEV__) console.debug('Error sorting rows:', error);
        return 0;
      }
    });

    return { hourlyRows: sortedRows, tableDate };
  }, [productionData, shiftView, hourSortOrder]);

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      if (__DEV__) console.debug('Logout failed', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} accessibilityLabel="Back">
            <Text style={[styles.backButton, { color: theme.colors.text }]}>‹</Text>
          </TouchableOpacity>
          <View>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              {displayMachineName}
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.neutralText }]}>
              Current Product:{' '}
              <Text style={{ fontWeight: 'bold' }}>
                {statusLoading ? 'Loading…' : machineStatus?.Product?.DisplayName || 'No Product'}
              </Text>
            </Text>
          </View>
        </View>
        {DEV_FLAGS.SHOW_TEMP_LOGOUT_BUTTON && (
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            accessibilityLabel="Logout"
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Error Banner */}
      {error && (
        <View style={[styles.alertBanner, { backgroundColor: '#FEE2E2' }]}>
          <View style={styles.alertContent}>
            <Text style={styles.alertIcon}>⚠️</Text>
            <Text style={[styles.alertText, { color: '#991B1B' }]}>{error}</Text>
          </View>
        </View>
      )}

      {/* Status Banner */}
      <View
        style={[
          styles.alertBanner,
          {
            backgroundColor:
              machineStatus?.Value === 'RUNNING'
                ? '#10B981'
                : machineStatus?.Value === 'IDLE'
                  ? '#F59E0B'
                  : machineStatus?.Value === 'STOPPED'
                    ? '#EF4444'
                    : '#6B7280',
          },
        ]}
      >
        <View style={styles.alertContent}>
          <Text style={[styles.alertIcon, { color: '#FFFFFF' }]}>
            {machineStatus?.Value === 'RUNNING'
              ? '✓'
              : machineStatus?.Value === 'IDLE'
                ? '⏸'
                : machineStatus?.Value === 'STOPPED'
                  ? '⚠'
                  : '○'}
          </Text>
          <Text style={[styles.alertText, { color: '#FFFFFF' }]}>
            Machine Status:{' '}
            {statusLoading
              ? 'Loading...'
              : machineStatus?.Value
                ? machineStatus.Value.charAt(0) + machineStatus.Value.slice(1).toLowerCase()
                : 'Unknown'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            void refetchStatus();
          }}
        >
          <Text style={[styles.alertClose, { color: '#FFFFFF' }]}>⟳</Text>
        </TouchableOpacity>
      </View>

      {/* Shift Tabs */}
      <ShiftTabs active={shiftView} onChange={setShiftView} />

      {/* Shift Time Display */}
      {(() => {
        const activeSchedule = shiftView === 'current' ? currentShiftSchedule : lastShiftSchedule;
        const shift = activeSchedule?.Items?.[0];

        if (__DEV__)
          console.debug(
            '🔍 Dashboard shift display - shiftView:',
            shiftView,
            'has schedule:',
            !!activeSchedule,
            'has items:',
            !!shift
          );

        if (shift?.StartDateTime && shift?.EndDateTime) {
          try {
            const startDate = new Date(shift.StartDateTime);
            const endDate = new Date(shift.EndDateTime);

            // Check if dates are valid
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
              if (__DEV__)
                console.debug('⚠️ Invalid shift dates:', shift.StartDateTime, shift.EndDateTime);
              return null;
            }

            const formatDateTime = (date: Date) => {
              return date.toLocaleString('en-US', {
                month: 'numeric',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
              });
            };

            if (__DEV__)
              console.debug(
                '✅ Dashboard rendering shift times:',
                shift.StartDateTime,
                '→',
                shift.EndDateTime
              );

            return (
              <View style={styles.shiftTimeDisplay}>
                <Text style={styles.shiftTimeText}>
                  {formatDateTime(startDate)} → {formatDateTime(endDate)}
                </Text>
              </View>
            );
          } catch (error) {
            if (__DEV__) console.debug('❌ Error rendering shift times:', error);
            return null;
          }
        } else {
          if (__DEV__) console.debug('⚠️ Dashboard no shift schedule to display');
          return null;
        }
      })()}

      {/* Mode toggle indicator */}
      <View style={styles.modeToggleRow}>
        <Text style={[styles.modeToggleLabel, viewMode === 'production' && styles.modeActive]}>
          Production
        </Text>
        <Text style={styles.modeToggleSeparator}>|</Text>
        <Text style={[styles.modeToggleLabel, viewMode === 'faults' && styles.modeActive]}>
          Faults
        </Text>
        <Text style={styles.modeHint}>Swipe ↔ to switch</Text>
        <TouchableOpacity
          style={styles.modeArrowButton}
          onPress={() => setViewMode(viewMode === 'production' ? 'faults' : 'production')}
          accessibilityLabel="Toggle production/faults chart"
        >
          <Text style={styles.modeArrowText}>{viewMode === 'production' ? '→' : '←'}</Text>
        </TouchableOpacity>
      </View>

      {/* Chart Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: '#16a34a' }]} />
          <Text style={styles.legendLabel}>Production</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: '#ef4444' }]} />
          <Text style={styles.legendLabel}>Scrap</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: '#facc15' }]} />
          <Text style={styles.legendLabel}>Downtime</Text>
        </View>
        <View style={styles.legendItem}>
          <View
            style={[
              styles.legendSwatch,
              {
                backgroundColor: '#3b82f6',
                borderStyle: 'dashed',
                borderWidth: 1.5,
                borderColor: '#3b82f6',
              },
            ]}
          />
          <Text style={styles.legendLabel}>Hourly Goal</Text>
        </View>
      </View>

      {/* Chart - Fixed position */}
      <View style={styles.chartContainer} {...panResponder.panHandlers}>
        {(loading && viewMode === 'production') || (faultsLoading && viewMode === 'faults') ? (
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
              {viewMode === 'production' ? 'Loading production data...' : 'Loading faults...'}
            </Text>
          </View>
        ) : viewMode === 'production' ? (
          <ProductionChart data={chartData} partsHourlyGoal={partsHourlyGoal} />
        ) : (
          <FaultDowntimeChart data={chartFaultPoints} metric={sortBy} />
        )}
      </View>

      {/* Table Section Title - Fixed */}
      {viewMode === 'production' && (
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Hourly Stats ({tableDate})
        </Text>
      )}

      {viewMode === 'faults' && (
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Fault Breakdown (Top 5)
        </Text>
      )}

      {/* Table Header - Fixed */}
      {viewMode === 'production' && (
        <View style={styles.tableHeaderWrapper}>
          <View
            style={[
              styles.tableHeaderContainer,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <View style={styles.tableHeaderRow}>
              <TouchableOpacity
                onPress={() => setHourSortOrder(hourSortOrder === 'asc' ? 'desc' : 'asc')}
                style={styles.sortableHeader}
              >
                <Text style={[styles.tableHeaderCell, styles.activeSort]}>
                  Hour {hourSortOrder === 'asc' ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.tableHeaderCell}>Production</Text>
              <Text style={styles.tableHeaderCell}>Scrap</Text>
              <Text style={styles.tableHeaderCell}>Downtime</Text>
              <Text style={styles.tableHeaderCell}>Goal</Text>
            </View>
          </View>
        </View>
      )}

      {viewMode === 'faults' && (
        <View style={styles.tableHeaderWrapper}>
          <View
            style={[
              styles.tableHeaderContainer,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <View style={styles.faultTableHeaderRow}>
              <Text style={styles.faultTableHeaderCell}>Fault Description</Text>
              <TouchableOpacity onPress={() => setSortBy('count')} style={styles.sortableHeader}>
                <Text
                  style={[
                    styles.faultTableHeaderCellCenter,
                    sortBy === 'count' && styles.activeSort,
                  ]}
                >
                  Count {sortBy === 'count' ? '▼' : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSortBy('downtime')} style={styles.sortableHeader}>
                <Text
                  style={[
                    styles.faultTableHeaderCellRight,
                    sortBy === 'downtime' && styles.activeSort,
                  ]}
                >
                  Downtime {sortBy === 'downtime' ? '▼' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Scrollable Table Body */}
      {viewMode === 'production' && (
        <ScrollView
          style={styles.tableScrollView}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={() => {
                void refetch();
              }}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          alwaysBounceVertical={true}
        >
          <View style={styles.tableBodyWrapper}>
            {hourlyRows.map((item, index) => (
              <View
                key={`${item.hour}-${index}`}
                style={[
                  styles.tableRow,
                  { borderBottomColor: theme.colors.backgroundNeutral },
                  index % 2 === 0 && { backgroundColor: theme.colors.backgroundNeutral },
                ]}
              >
                <Text style={[styles.tableCell, { color: theme.colors.text }]}>{item.hour}</Text>
                <Text style={[styles.tableCell, { color: theme.colors.text }]}>
                  {item.production}
                </Text>
                <Text style={[styles.tableCell, { color: theme.colors.text }]}>{item.scrap}</Text>
                <Text style={[styles.tableCell, { color: theme.colors.text }]}>
                  {item.downtime > 0 ? `${item.downtime}m` : '-'}
                </Text>
                <Text style={[styles.tableCell, { color: theme.colors.text }]}>
                  {partsHourlyGoal}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}

      {viewMode === 'faults' && (
        <ScrollView
          style={styles.tableScrollView}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={faultsLoading}
              onRefresh={() => {
                void refetchFaults();
              }}
              tintColor="#007AFF"
              colors={['#007AFF']}
            />
          }
          alwaysBounceVertical={true}
        >
          <View style={styles.tableBodyWrapper}>
            {tableFaultPoints.map((fault, index) => (
              <View
                key={`${fault.description}-${index}`}
                style={[
                  styles.faultTableRow,
                  { borderBottomColor: theme.colors.backgroundNeutral },
                  index % 2 === 0 && { backgroundColor: theme.colors.backgroundNeutral },
                ]}
              >
                <Text style={[styles.faultTableCell, { color: theme.colors.text }]}>
                  {fault.description}
                </Text>
                <Text style={[styles.faultTableCellCenter, { color: theme.colors.text }]}>
                  {fault.count}
                </Text>
                <Text style={[styles.faultTableCellRight, { color: theme.colors.text }]}>
                  {Math.round(fault.seconds / 60)}m
                </Text>
              </View>
            ))}
            {hasMoreFaults && (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => setShowAllFaults(!showAllFaults)}
              >
                <Text style={styles.moreButtonText}>
                  {showAllFaults ? 'Show Less' : `More (${faultPoints.length - 5} additional)`}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
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
  logoutButton: {
    backgroundColor: '#c62828',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  logoutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  tableScrollView: {
    flex: 1,
    marginBottom: 16,
  },
  alertBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 8,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
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
  tableHeaderWrapper: {
    paddingHorizontal: 16,
  },
  tableHeaderContainer: {
    borderWidth: 1,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  tableHeaderCell: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
  },
  faultTableHeaderRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  faultTableHeaderCell: {
    flex: 3,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'left',
    color: '#000000',
  },
  faultTableHeaderCellCenter: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    color: '#000000',
  },
  faultTableHeaderCellRight: {
    flex: 1,
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    color: '#000000',
  },
  faultTableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  faultTableCell: {
    flex: 3,
    fontSize: 13,
    textAlign: 'left',
  },
  faultTableCellCenter: {
    flex: 1,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  faultTableCellRight: {
    flex: 1,
    fontSize: 13,
    textAlign: 'right',
    fontWeight: '500',
  },
  tableBodyWrapper: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#E5E7EB',
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  modeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  modeToggleLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  modeActive: {
    color: '#000',
    textDecorationLine: 'underline',
  },
  modeToggleSeparator: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  shiftTimeDisplay: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  shiftTimeText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  modeHint: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 8,
  },
  modeArrowButton: {
    marginLeft: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  modeArrowText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  moreButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  moreButtonText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '600',
  },
  sortableHeader: {
    flex: 1,
  },
  activeSort: {
    color: '#2563EB',
    fontWeight: '700',
  },
});

export default ProductionDashboardScreen;
