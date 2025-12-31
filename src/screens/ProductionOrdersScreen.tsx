import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Modal,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { useProductionOrders } from '../hooks/useProductionOrders';
import { getSelectedCustomer } from '../services/customerStorage';
import { ProductionOrder } from '../types/productionOrder';
import { getMachineNameMap } from '../services/machineService';
import { BackHandler } from 'react-native';

export type ProductionOrdersProps = NativeStackScreenProps<RootStackParamList, 'ProductionOrders'>;

const ProductionOrdersScreen: React.FC<ProductionOrdersProps> = ({ navigation }) => {
  const theme = useAppTheme();
  const [clientId, setClientId] = useState<number | null>(null);
  const [machineNames, setMachineNames] = useState<Map<number, string>>(new Map());
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [machineFilter, setMachineFilter] = useState<string>('All');
  const [showMachineDropdown, setShowMachineDropdown] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrder | null>(null);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [sortBy, setSortBy] = useState<'orderId' | 'machine' | 'scheduled' | 'volume' | 'actual'>(
    'scheduled'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Date range: last 7 days to future
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);

    const end = new Date(now);
    end.setDate(end.getDate() + 60); // Next 60 days
    end.setHours(23, 59, 59, 999);

    return {
      startDate: start.toISOString().split('.')[0],
      endDate: end.toISOString().split('.')[0],
    };
  }, []);

  const { orders, loading, error, refetch, totalItems } = useProductionOrders({
    clientId,
    startDate,
    endDate,
  });

  // Get unique statuses from orders
  const availableStatuses = useMemo(() => {
    const statuses = new Set<string>();
    statuses.add('All');
    orders.forEach((order) => {
      if (order.ExternalStatus) {
        statuses.add(order.ExternalStatus);
      }
    });
    return Array.from(statuses).sort();
  }, [orders]);

  // Get unique machines from orders
  const availableMachines = useMemo(() => {
    const machines = new Map<string, number>();
    machines.set('All', -1);
    orders.forEach((order) => {
      const machineName = machineNames.get(order.MachineId) || `Machine ${order.MachineId}`;
      machines.set(machineName, order.MachineId);
    });
    return Array.from(machines.keys()).sort((a, b) => {
      if (a === 'All') return -1;
      if (b === 'All') return 1;
      return a.localeCompare(b);
    });
  }, [orders, machineNames]);

  // Filter orders by status and machine
  const filteredOrders = useMemo(() => {
    let filtered = orders;

    // Filter by status
    if (statusFilter !== 'All') {
      filtered = filtered.filter((order) => order.ExternalStatus === statusFilter);
    }

    // Filter by machine
    if (machineFilter !== 'All') {
      filtered = filtered.filter((order) => {
        const machineName = machineNames.get(order.MachineId) || `Machine ${order.MachineId}`;
        return machineName === machineFilter;
      });
    }

    return filtered;
  }, [orders, statusFilter, machineFilter, machineNames]);

  // Sort filtered orders
  const sortedOrders = useMemo(() => {
    const sorted = [...filteredOrders];
    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'orderId':
          aVal = a.ProductionOrderId.toLowerCase();
          bVal = b.ProductionOrderId.toLowerCase();
          break;
        case 'machine':
          aVal = (machineNames.get(a.MachineId) || '').toLowerCase();
          bVal = (machineNames.get(b.MachineId) || '').toLowerCase();
          break;
        case 'scheduled':
          aVal = new Date(a.Scheduled).getTime();
          bVal = new Date(b.Scheduled).getTime();
          break;
        case 'volume':
          aVal = a.Volume || 0;
          bVal = b.Volume || 0;
          break;
        case 'actual':
          aVal = a.ActualQuantity || 0;
          bVal = b.ActualQuantity || 0;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredOrders, sortBy, sortDirection, machineNames]);

  // Ensure back returns to MachineList even while loading
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.navigate('MachineList');
      return true;
    });
    return () => sub.remove();
  }, [navigation]);

  // Load client ID on mount
  React.useEffect(() => {
    const loadClient = async () => {
      try {
        const selected = await getSelectedCustomer();
        if (selected?.ParentId) {
          setClientId(selected.ParentId);
        } else {
          if (__DEV__) console.debug('⚠️ No client ID found in selected customer');
        }
      } catch (err) {
        if (__DEV__) console.debug('Failed to load client:', err);
      }
    };
    loadClient();
  }, []);

  // Fetch machine names from client machines API
  React.useEffect(() => {
    const fetchMachineNames = async () => {
      if (!clientId) return;

      try {
        const nameMap = await getMachineNameMap(clientId);

        setMachineNames(nameMap);
      } catch (err) {
        if (__DEV__) console.debug('Failed to fetch machine names:', err);
      }
    };

    if (clientId) {
      fetchMachineNames();
    }
  }, [clientId]);

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const renderItem = ({ item }: { item: ProductionOrder }) => {
    const machineName = machineNames.get(item.MachineId) || `Machine ${item.MachineId}`;
    const scheduledDate = new Date(item.Scheduled);
    const formattedDate = scheduledDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    const handleMachinePress = () => {
      navigation.navigate('ProductionDashboard', {
        machineId: item.MachineId,
        machineName: machineName,
      });
    };

    const handleOrderPress = () => {
      setSelectedOrder(item);
      setShowOrderDetails(true);
    };

    return (
      <View style={styles.row}>
        <TouchableOpacity style={styles.column} onPress={handleOrderPress}>
          <Text style={styles.orderIdText}>{item.ProductionOrderId}</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.column} onPress={handleMachinePress}>
          <Text style={styles.machineText}>{machineName}</Text>
          <Text style={styles.statusText}>{item.ExternalStatus}</Text>
        </TouchableOpacity>
        <View style={styles.columnRight}>
          <Text style={styles.volumeValue}>{item.Volume.toLocaleString()}</Text>
        </View>
        <View style={styles.columnRight}>
          <Text style={styles.actualValue}>{Math.round(item.ActualQuantity).toLocaleString()}</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header removed - using native navigation header */}

      {/* Filters */}
      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Status:</Text>
        <TouchableOpacity style={styles.filterDropdown} onPress={() => setShowStatusDropdown(true)}>
          <Text style={styles.filterDropdownText}>{statusFilter}</Text>
          <Text style={styles.filterDropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Text style={styles.filterLabel}>Machine:</Text>
        <TouchableOpacity
          style={styles.filterDropdown}
          onPress={() => setShowMachineDropdown(true)}
        >
          <Text style={styles.filterDropdownText}>{machineFilter}</Text>
          <Text style={styles.filterDropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      {/* Error Banner */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <TouchableOpacity
          style={[styles.headerCell, styles.orderIdHeader]}
          onPress={() => handleSort('orderId')}
        >
          <Text style={styles.headerCellText}>
            Order ID {sortBy === 'orderId' && (sortDirection === 'asc' ? '▲' : '▼')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerCell, styles.machineHeader]}
          onPress={() => handleSort('machine')}
        >
          <Text style={styles.headerCellText}>
            Machine {sortBy === 'machine' && (sortDirection === 'asc' ? '▲' : '▼')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerCell, styles.volumeHeader]}
          onPress={() => handleSort('volume')}
        >
          <Text style={styles.headerCellText}>
            Volume {sortBy === 'volume' && (sortDirection === 'asc' ? '▲' : '▼')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.headerCell, styles.actualHeader]}
          onPress={() => handleSort('actual')}
        >
          <Text style={styles.headerCellText}>
            Actual {sortBy === 'actual' && (sortDirection === 'asc' ? '▲' : '▼')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Orders List */}
      {loading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={sortedOrders}
          keyExtractor={(item) => item.Id.toString()}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {statusFilter === 'All'
                    ? 'No production orders found'
                    : `No ${statusFilter} orders found`}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Status Filter Modal */}
      <Modal
        visible={showStatusDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStatusDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowStatusDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Status</Text>
            <FlatList
              data={availableStatuses}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.statusItem, statusFilter === item && styles.statusItemSelected]}
                  onPress={() => {
                    setStatusFilter(item);
                    setShowStatusDropdown(false);
                  }}
                >
                  <Text style={styles.statusItemText}>{item}</Text>
                  {statusFilter === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStatusDropdown(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Machine Filter Modal */}
      <Modal
        visible={showMachineDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMachineDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMachineDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Filter by Machine</Text>
            <FlatList
              data={availableMachines}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.statusItem, machineFilter === item && styles.statusItemSelected]}
                  onPress={() => {
                    setMachineFilter(item);
                    setShowMachineDropdown(false);
                  }}
                >
                  <Text style={styles.statusItemText}>{item}</Text>
                  {machineFilter === item && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowMachineDropdown(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Order Details Modal */}
      <Modal
        visible={showOrderDetails}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOrderDetails(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOrderDetails(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.detailsModalContent}>
            <Text style={styles.modalTitle}>Production Order Details</Text>

            {selectedOrder && (
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order ID:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.ProductionOrderId}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Machine:</Text>
                  <Text style={styles.detailValue}>
                    {machineNames.get(selectedOrder.MachineId) ||
                      `Machine ${selectedOrder.MachineId}`}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Customer Status:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.ExternalStatus}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>AI Status:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.Status}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Scheduled:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrder.Scheduled).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Created:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrder.Created).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                {selectedOrder.Ended && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Ended:</Text>
                    <Text style={styles.detailValue}>
                      {new Date(selectedOrder.Ended).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Last Updated:</Text>
                  <Text style={styles.detailValue}>
                    {new Date(selectedOrder.LastUpdated).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Volume:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.Volume.toLocaleString()}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Actual Quantity:</Text>
                  <Text style={styles.detailValue}>
                    {Math.round(selectedOrder.ActualQuantity).toLocaleString()}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completion:</Text>
                  <Text style={styles.detailValue}>
                    {((selectedOrder.ActualQuantity / selectedOrder.Volume) * 100).toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Shift Schedule ID:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.ShiftScheduleId}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Type ID:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.ProductionOrderTypeId}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Order Status ID:</Text>
                  <Text style={styles.detailValue}>{selectedOrder.ProductionOrderStatusId}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowOrderDetails(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  backButtonText: {
    fontSize: 24,
    color: '#374151',
    fontWeight: '600',
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000000',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexWrap: 'nowrap',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 6,
    flexShrink: 1,
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginRight: 12,
    minWidth: 100,
    flex: 1,
  },
  filterDropdownText: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '500',
  },
  filterDropdownArrow: {
    fontSize: 12,
    color: '#6B7280',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerCell: {
    justifyContent: 'center',
  },
  headerCellText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  orderIdHeader: {
    flex: 2,
  },
  machineHeader: {
    flex: 2,
  },
  volumeHeader: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actualHeader: {
    flex: 1,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  column: {
    flex: 2,
  },
  columnRight: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 0,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  dateText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  machineText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  volumeLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  volumeValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  actualLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  actualValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '60%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusItemSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  statusItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  checkmark: {
    fontSize: 18,
    color: '#3B82F6',
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  detailsModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  detailsContainer: {
    maxHeight: 500,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    flex: 2,
    textAlign: 'right',
  },
});

export default ProductionOrdersScreen;
