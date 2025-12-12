import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StatusBar,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { DEV_FLAGS } from '../config/devFlags';
import { authService } from '../services/authService';
import { useMachineInventory } from '../hooks/useMachineInventory';
import { getMachineInventory, MachineInventoryItem } from '../services/machineInventoryService';
import { MiniProductionBar } from '../components/MiniProductionBar';
import { productionService } from '../services/productionService';
import {
  getProductionGoals,
  getShiftStartFromGoal,
  ProductionGoalResponse,
} from '../services/productionGoalService';
import { MachineStatus } from '../types/api';
import { CustomerAccount } from '../types/auth';
import { getSelectedCustomer, saveSelectedCustomer } from '../services/customerStorage';
import { Plant, getPlants } from '../services/plantService';
import { getShiftSchedule } from '../services/shiftScheduleService';
import { ShiftScheduleResponse } from '../types/api';

export type MachineListProps = NativeStackScreenProps<RootStackParamList, 'MachineList'>;

const MachineListScreen: React.FC<MachineListProps> = ({ navigation }) => {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const [shiftView, setShiftView] = useState<'current' | 'last'>('current');
  const [sortBy, setSortBy] = useState<'name' | 'prod' | 'downtime' | 'co' | 'scrap'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAccount | null>(null);
  const [availableCustomers, setAvailableCustomers] = useState<CustomerAccount[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  // New: hierarchical selection (Company -> Plant/Area)
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);
  const [showPlantDropdown, setShowPlantDropdown] = useState(false);
  const [currentShiftSchedule, setCurrentShiftSchedule] = useState<ShiftScheduleResponse | null>(
    null
  );
  const [lastShiftSchedule, setLastShiftSchedule] = useState<ShiftScheduleResponse | null>(null);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [selectedPlant, setSelectedPlant] = useState<Plant | null>(null);
  const { machines, loading, error, refetch } = useMachineInventory(selectedCustomer, shiftView);
  const searchInputRef = useRef<TextInput>(null);
  // One-shot refresh feedback state
  const [refreshFlash, setRefreshFlash] = useState(false);
  const [machineStatuses, setMachineStatuses] = useState<Map<number, MachineStatus>>(new Map());
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [lineChildren, setLineChildren] = useState<Record<number, MachineInventoryItem[]>>({});
  const [lineLoadingId, setLineLoadingId] = useState<number | null>(null);
  const [lineError, setLineError] = useState<Record<number, string | null>>({});
  const [productionGoals, setProductionGoals] = useState<Map<number, ProductionGoalResponse>>(
    new Map()
  );

  // Load selected customer and available customers on mount
  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const selected = await getSelectedCustomer();
        setSelectedCustomer(selected);

        const accounts = await authService.getCustomerAccounts();
        // Sort customers alphabetically by Name, then DisplayName
        const sortedAccounts = accounts.sort((a, b) => {
          const nameCompare = a.Name.localeCompare(b.Name);
          return nameCompare !== 0 ? nameCompare : a.DisplayName.localeCompare(b.DisplayName);
        });
        setAvailableCustomers(sortedAccounts);

        if (selected?.Name) {
          setSelectedCompany(selected.Name);
        }

        const clientId = selected?.ParentId || 29;
        const plantList = await getPlants(clientId);
        setPlants(plantList);
        if (selected?.DisplayName) {
          const matchingPlant = plantList.find(
            (p) => p.DisplayName === selected.DisplayName || p.Id === selected.Id
          );
          setSelectedPlant(matchingPlant || null);
        }

        if (plantList.length === 1) {
          const onlyPlant = plantList[0];
          setSelectedPlant(onlyPlant);
          const autoCustomer: CustomerAccount = {
            Id: onlyPlant.Id,
            Name: selected?.Name || selectedCompany || 'Unknown',
            DisplayName: onlyPlant.DisplayName,
            ParentId: onlyPlant.ClientId,
          };
          await handleCustomerChange(autoCustomer);
        }
      } catch (err) {
        console.error('Failed to load customer data:', err);
      }
    };
    loadCustomerData();
  }, []);

  const handleCustomerChange = async (customer: CustomerAccount) => {
    try {
      console.log('🔄 MachineListScreen: Customer/Plant change requested');
      console.log('  - Plant ID:', customer.Id);
      console.log('  - Company:', customer.Name);
      console.log('  - Plant:', customer.DisplayName);

      await saveSelectedCustomer(customer);
      setSelectedCustomer(customer);
      setSelectedCompany(customer.Name || null);
      setShowCustomerDropdown(false);
      setShowCompanyDropdown(false);
      setShowPlantDropdown(false);

      // If company changed, reload plants for the new company
      if (customer.Name !== selectedCompany && customer.ParentId) {
        try {
          const plantList = await getPlants(customer.ParentId);
          setPlants(plantList);
          // Find and set the matching plant
          const matchingPlant = plantList.find(
            (p) => p.DisplayName === customer.DisplayName || p.Id === customer.Id
          );
          setSelectedPlant(matchingPlant || null);
        } catch (err) {
          console.error('❌ Failed to reload plants:', err);
        }
      } else {
        // Same company, just update the selected plant
        const matchingPlant = plants.find(
          (p) => p.DisplayName === customer.DisplayName || p.Id === customer.Id
        );
        setSelectedPlant(matchingPlant || null);
      }

      setTimeout(async () => {
        try {
          await refetch();
          await fetchMachineStatuses();
        } catch (e) {
          console.error('❌ Deferred refetch failed:', e);
        }
      }, 0);
    } catch (err) {
      console.error('❌ Failed to change customer:', err);
    }
  };

  // Derived lists
  const companyNames = React.useMemo(() => {
    const names = Array.from(new Set(availableCustomers.map((c) => c.Name)));
    return names.sort((a, b) => a.localeCompare(b));
  }, [availableCustomers]);

  const sortedPlants = React.useMemo(() => {
    return plants.sort((a, b) => a.DisplayName.localeCompare(b.DisplayName));
  }, [plants]);

  const handleCompanySelect = async (company: string) => {
    setSelectedCompany(company);
    setShowCompanyDropdown(false);
    setSelectedPlant(null);
    setShiftView('current'); // Reset to Current Shift when changing company

    // Find a customer account that matches this company name to get the client ID
    const companyAccount = availableCustomers.find((c) => c.Name === company);
    const clientId = companyAccount?.ParentId || companyAccount?.Id || 29;

    try {
      const plantList = await getPlants(clientId);
      setPlants(plantList);

      // Create a temporary customer account with just the company name
      // Use a placeholder DisplayName to keep the plant dropdown visible
      const tempCustomer: CustomerAccount = {
        Id: 0, // Invalid ID won't fetch machines
        Name: company,
        DisplayName: 'Select Plant/Area',
        ParentId: clientId,
      };
      setSelectedCustomer(tempCustomer);

      if (plantList.length === 1) {
        const onlyPlant = plantList[0];
        setSelectedPlant(onlyPlant);
        const companyName = company;
        const autoCustomer: CustomerAccount = {
          Id: onlyPlant.Id,
          Name: companyName,
          DisplayName: onlyPlant.DisplayName,
          ParentId: onlyPlant.ClientId,
        };
        await handleCustomerChange(autoCustomer);
      }
    } catch (err) {
      console.error('Failed to load plants:', err);
      setPlants([]);
      // Still set a temp customer to keep UI consistent
      const tempCustomer: CustomerAccount = {
        Id: 0,
        Name: company,
        DisplayName: 'No Plants Available',
        ParentId: clientId,
      };
      setSelectedCustomer(tempCustomer);
    }
  };

  const handlePlantSelect = async (plant: Plant) => {
    setShowPlantDropdown(false);
    setSelectedPlant(plant);
    setShiftView('current'); // Reset to Current Shift when changing plant

    // Convert Plant to CustomerAccount format
    // Use selectedCompany or fall back to current customer name
    const companyName = selectedCompany || selectedCustomer?.Name || 'Unknown';
    const customerAccount: CustomerAccount = {
      Id: plant.Id, // Plant ID for machine API
      Name: companyName, // Company name
      DisplayName: plant.DisplayName, // Plant display name
      ParentId: plant.ClientId, // Client ID
    };

    // Save and update customer, which will trigger machine list reload
    await handleCustomerChange(customerAccount);
  };

  const handleManualRefresh = async () => {
    setRefreshFlash(true);
    try {
      await refetch(true);
      await fetchMachineStatuses();
    } finally {
      setTimeout(() => setRefreshFlash(false), 300);
    }
  };

  const fetchMachineStatuses = async (targetMachines?: MachineInventoryItem[]) => {
    const source = targetMachines || machines;
    if (source.length === 0) return;
    try {
      const ids = source.map((m) => m.MachineId.toString());
      const statuses = await productionService.getMachineStatus(ids);
      setMachineStatuses((prev) => {
        const next = new Map(prev);
        statuses.forEach((status) => next.set(status.Id, status));
        return next;
      });
    } catch (err) {
      console.error('Failed to fetch machine statuses:', err);
    }
  };

  const fetchProductionGoals = async (targetMachines?: MachineInventoryItem[]) => {
    // Check feature flag - skip if disabled
    if (!DEV_FLAGS.USE_PRODUCTION_GOAL_API) {
      console.log('🚧 Production goal API disabled via feature flag');
      return;
    }

    const source = targetMachines || machines;
    if (source.length === 0) return;
    try {
      const machineIds = source.map((m) => m.MachineId);
      const dateType = shiftView === 'current' ? 'CurrentShift' : 'LastShift';

      // Batch process in chunks of 5 to avoid timeouts
      const BATCH_SIZE = 5;
      const batches = [];
      for (let i = 0; i < machineIds.length; i += BATCH_SIZE) {
        batches.push(machineIds.slice(i, i + BATCH_SIZE));
      }

      console.log(`📊 Fetching production goals in ${batches.length} batches`);

      for (const batch of batches) {
        const goals = await getProductionGoals({ machineIds: batch, dateType });
        if (goals.length > 0) {
          setProductionGoals((prev) => {
            const next = new Map(prev);
            goals.forEach((goal) => next.set(goal.Id, goal));
            return next;
          });
        }
      }

      console.log(`✅ Production goals loaded for ${machineIds.length} machines`);
    } catch (err: any) {
      console.error('❌ Production goals fetch failed:', err?.message || err);
    }
  };

  useEffect(() => {
    if (machines.length > 0) {
      fetchMachineStatuses();
      fetchProductionGoals();
      // Fetch shift schedules for the first machine to get shift times
      fetchShiftSchedules(machines[0].MachineId);
    }
  }, [machines, shiftView]);

  const fetchShiftSchedules = async (machineId: number) => {
    try {
      console.log(`📅 Fetching shift schedules for machine ${machineId}`);
      const [current, previous] = await Promise.all([
        getShiftSchedule(machineId, 'current'),
        getShiftSchedule(machineId, 'previous'),
      ]);
      console.log(`📅 Shift schedules received:`, {
        current: current?.Items?.[0],
        previous: previous?.Items?.[0],
      });
      setCurrentShiftSchedule(current);
      setLastShiftSchedule(previous);
    } catch (error) {
      console.error('❌ Failed to fetch shift schedules:', error);
    }
  };

  // Reset expanded state when plant or shift changes
  useEffect(() => {
    setExpandedLines(new Set());
    setLineChildren({});
    setLineLoadingId(null);
    setLineError({});
  }, [selectedCustomer?.Id, shiftView]);

  // Header display names - use customer data directly instead of separate API call
  const clientName = selectedCustomer?.Name || 'Machine List';
  const plantName = selectedCustomer?.DisplayName || '';

  // Removed continuous auto-refresh per updated UX request.

  const handleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortDirection('asc');
    }
  };

  const getSortedMachines = () => {
    const filtered = machines.filter((m) =>
      (m.DisplayName || m.MachineName || '').toLowerCase().includes(search.toLowerCase())
    );

    return [...filtered].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortBy) {
        case 'name':
          aVal = (a.DisplayName || a.MachineName || '').toLowerCase();
          bVal = (b.DisplayName || b.MachineName || '').toLowerCase();
          break;
        case 'prod':
          aVal = a.TotalParts || 0;
          bVal = b.TotalParts || 0;
          break;
        case 'downtime':
          aVal = a.DownTime || 0;
          bVal = b.DownTime || 0;
          break;
        case 'co':
          aVal = a.ProductChangeOverCount || 0;
          bVal = b.ProductChangeOverCount || 0;
          break;
        case 'scrap':
          aVal = a.RejectParts || 0;
          bVal = b.RejectParts || 0;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filtered = getSortedMachines();

  // Determine machine status color using real-time API data
  const getStatusColor = (machine: (typeof machines)[0]) => {
    const status = machineStatuses.get(machine.MachineId);
    if (!status) return '#E5E7EB'; // Gray for no data
    if (status.Value === 'RUNNING') return '#10B981'; // Green
    if (status.Value === 'IDLE') return '#F59E0B'; // Orange
    if (status.Value === 'STOPPED') return '#EF4444'; // Red
    return '#6B7280'; // Gray for offline
  };

  const getRowBackgroundColor = (machine: (typeof machines)[0]) => {
    const status = machineStatuses.get(machine.MachineId);
    if (!status) return '#FFFFFF'; // White for no data
    if (status.Value === 'RUNNING') return '#F0FDF4'; // Light green
    if (status.Value === 'IDLE') return '#FEF3C7'; // Light orange
    if (status.Value === 'STOPPED') return '#FEE2E2'; // Light red
    return '#F3F4F6'; // Light gray for offline
  };

  const formatDowntime = (downtime?: number) => {
    if (!downtime) return '0m';
    const hours = Math.floor(downtime / 60);
    const mins = Math.floor(downtime % 60);
    if (hours > 0) return `${hours}h${mins}m`;
    return `${mins}m`;
  };

  const renderItem = ({ item }: { item: (typeof machines)[0] }) => {
    const displayName = item.DisplayName || item.MachineName || `Machine ${item.MachineId}`;
    const statusColor = getStatusColor(item);
    const backgroundColor = getRowBackgroundColor(item);
    const isLine = item?.MachineType?.Name === 'DiscreteLine';
    const isExpanded = expandedLines.has(item.MachineId);

    // Calculate adjusted goal using production goal data
    // For current shift: use hourly goal * hours elapsed from actual shift start
    // For last shift: use full daily goal
    let adjustedGoal = item.PartsDailyGoal || 0;

    if (shiftView === 'current') {
      const goalData = productionGoals.get(item.MachineId);

      // Try production goal API data first
      if (goalData && goalData.PartsAvgHourlyGoal) {
        const shiftStart = getShiftStartFromGoal(goalData);
        if (shiftStart) {
          try {
            const now = new Date();
            const hoursElapsed = (now.getTime() - shiftStart.getTime()) / (1000 * 60 * 60);

            if (hoursElapsed > 0) {
              adjustedGoal = goalData.PartsAvgHourlyGoal * hoursElapsed;
              console.log(
                `⏱️ ${displayName}: Shift started at ${shiftStart.toLocaleTimeString()}, ${hoursElapsed.toFixed(2)}h elapsed, hourly goal: ${goalData.PartsAvgHourlyGoal}/hr, adjusted goal: ${Math.round(adjustedGoal)}`
              );
            }
          } catch (e) {
            console.error('Failed to calculate adjusted goal:', e);
          }
        }
      }
      // Fallback: use machine inventory hourly goal if available
      else if (item.PartsHourlyGoal && item.PartsHourlyGoal > 0) {
        // Use current time and assume shift started at beginning of today
        // This is less accurate but better than showing full daily goal
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const hoursElapsed = (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60);

        if (hoursElapsed > 0) {
          adjustedGoal = item.PartsHourlyGoal * hoursElapsed;
          console.log(
            `⏱️ ${displayName} (fallback): ${hoursElapsed.toFixed(2)}h elapsed since midnight, hourly goal: ${item.PartsHourlyGoal}/hr, adjusted goal: ${Math.round(adjustedGoal)}`
          );
        }
      }
    }

    // Display goal text - matches exactly what progress bar uses
    const prodGoal =
      item.TotalParts !== undefined && adjustedGoal > 0
        ? `${item.TotalParts}/${Math.round(adjustedGoal)}`
        : item.TotalParts !== undefined
          ? `${item.TotalParts}`
          : '-';
    const downtime = formatDowntime(item.DownTime);
    const scrap = item.RejectParts || 0;

    const handleLineToggle = async () => {
      const alreadyExpanded = expandedLines.has(item.MachineId);
      if (alreadyExpanded) {
        const next = new Set(expandedLines);
        next.delete(item.MachineId);
        setExpandedLines(next);
        return;
      }

      setLineLoadingId(item.MachineId);
      setLineError((prev) => ({ ...prev, [item.MachineId]: null }));

      try {
        const children = await getMachineInventory(item.MachineId, shiftView);
        const childMachines = children.filter((child) => {
          const isMachine = child.MachineType?.Name === 'StandardOEE';
          const belongsToLine =
            child.ParentMachineId === item.MachineId ||
            child.ParentMachineName === item.DisplayName;
          return isMachine && (belongsToLine || child.ParentMachineId);
        });
        setLineChildren((prev) => ({ ...prev, [item.MachineId]: childMachines }));
        setExpandedLines((prev) => new Set(prev).add(item.MachineId));
        await fetchMachineStatuses(childMachines);
        await fetchProductionGoals(childMachines);
      } catch (err: any) {
        console.error('❌ Failed to load machines for line:', err);
        setLineError((prev) => ({
          ...prev,
          [item.MachineId]: err?.message || 'Failed to load machines for this line',
        }));
      } finally {
        setLineLoadingId(null);
      }
    };

    return (
      <View>
        <TouchableOpacity
          style={[
            styles.row,
            {
              borderLeftColor: statusColor,
              borderLeftWidth: 4,
              backgroundColor,
            },
          ]}
          onPress={() => {
            try {
              console.log('🖱️ Row tapped:', {
                machineId: item.MachineId,
                machineName: displayName,
                type: item?.MachineType?.Name,
                partsHourlyGoal: item.PartsHourlyGoal,
              });

              if (isLine) {
                navigation.navigate('ProductionDashboard', {
                  machineId: item.MachineId,
                  machineName: displayName,
                  partsHourlyGoal: item.PartsHourlyGoal || 0,
                });
                return;
              }

              navigation.navigate('ProductionDashboard', {
                machineId: item.MachineId,
                machineName: displayName,
                partsHourlyGoal: item.PartsHourlyGoal || 0,
              });
            } catch (e) {
              console.error('❌ Navigation tap handler error:', e);
            }
          }}
        >
          <View style={styles.nameColumn}>
            <View style={styles.lineLabelRow}>
              {isLine ? (
                <TouchableOpacity
                  onPress={(e) => {
                    e.stopPropagation();
                    handleLineToggle();
                  }}
                  style={styles.lineArrowHit}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.lineArrow}>{isExpanded ? '▼' : '▶'}</Text>
                </TouchableOpacity>
              ) : null}
              <Text style={styles.machineName}>{displayName}</Text>
            </View>
            <MiniProductionBar current={item.TotalParts || 0} goal={adjustedGoal || 0} />
          </View>
          <View style={styles.prodColumn}>
            <Text style={styles.cellText}>{prodGoal}</Text>
          </View>
          <View style={styles.downtimeColumn}>
            <Text style={[styles.cellText, downtime !== '0m' && styles.downtimeText]}>
              {downtime}
            </Text>
          </View>
          <View style={styles.scrapColumn}>
            <Text style={styles.cellText}>{scrap}</Text>
          </View>
        </TouchableOpacity>

        {isLine && isExpanded ? (
          <View style={styles.lineChildrenContainer}>
            {lineLoadingId === item.MachineId ? (
              <View style={styles.lineChildLoading}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.lineChildLoadingText}>Loading machines in this line...</Text>
              </View>
            ) : lineError[item.MachineId] ? (
              <Text style={styles.lineChildError}>⚠️ {lineError[item.MachineId]}</Text>
            ) : lineChildren[item.MachineId]?.length ? (
              lineChildren[item.MachineId].map((child) => {
                const childDisplay =
                  child.DisplayName || child.MachineName || `Machine ${child.MachineId}`;
                const childStatusColor = getStatusColor(child);
                const childBg = getRowBackgroundColor(child);

                // Child metrics - same calculation as parent machines
                // For current shift: use hourly goal * hours elapsed from actual shift start
                // For last shift: use full daily goal
                let childAdjustedGoal = child.PartsDailyGoal || 0;

                if (shiftView === 'current') {
                  const childGoalData = productionGoals.get(child.MachineId);

                  // Try production goal API data first
                  if (childGoalData && childGoalData.PartsAvgHourlyGoal) {
                    const childShiftStart = getShiftStartFromGoal(childGoalData);
                    if (childShiftStart) {
                      try {
                        const now = new Date();
                        const hoursElapsed =
                          (now.getTime() - childShiftStart.getTime()) / (1000 * 60 * 60);

                        if (hoursElapsed > 0) {
                          childAdjustedGoal = childGoalData.PartsAvgHourlyGoal * hoursElapsed;
                        }
                      } catch (e) {
                        console.error('Failed to calc child adjusted goal:', e);
                      }
                    }
                  }
                  // Fallback: use machine inventory hourly goal if available
                  else if (child.PartsHourlyGoal && child.PartsHourlyGoal > 0) {
                    const now = new Date();
                    const todayStart = new Date(now);
                    todayStart.setHours(0, 0, 0, 0);
                    const hoursElapsed = (now.getTime() - todayStart.getTime()) / (1000 * 60 * 60);

                    if (hoursElapsed > 0) {
                      childAdjustedGoal = child.PartsHourlyGoal * hoursElapsed;
                    }
                  }
                }

                // Display goal text - matches exactly what progress bar uses
                const childProdGoal =
                  child.TotalParts !== undefined && childAdjustedGoal > 0
                    ? `${child.TotalParts}/${Math.round(childAdjustedGoal)}`
                    : child.TotalParts !== undefined
                      ? `${child.TotalParts}`
                      : '-';
                const childDowntime = formatDowntime(child.DownTime);
                const childScrap = child.RejectParts || 0;

                return (
                  <TouchableOpacity
                    key={child.MachineId}
                    style={[
                      styles.lineChildRow,
                      { borderLeftColor: childStatusColor, backgroundColor: childBg },
                    ]}
                    onPress={() =>
                      navigation.navigate('ProductionDashboard', {
                        machineId: child.MachineId,
                        machineName: childDisplay,
                        partsHourlyGoal: child.PartsHourlyGoal || 0,
                      })
                    }
                  >
                    <View style={styles.lineChildNameCol}>
                      <Text style={styles.lineChildName}>{childDisplay}</Text>
                      <MiniProductionBar
                        current={child.TotalParts || 0}
                        goal={childAdjustedGoal || 0}
                      />
                    </View>
                    <View style={styles.lineChildProdCol}>
                      <Text style={styles.lineChildMeta}>{childProdGoal}</Text>
                    </View>
                    <View style={styles.lineChildDowntimeCol}>
                      <Text
                        style={[
                          styles.lineChildMeta,
                          childDowntime !== '0m' && styles.downtimeText,
                        ]}
                      >
                        {childDowntime}
                      </Text>
                    </View>
                    <View style={styles.lineChildScrapCol}>
                      <Text style={styles.lineChildMeta}>{childScrap}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <Text style={styles.lineChildEmpty}>No machines returned for this line.</Text>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      console.warn('Logout failed', e);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar barStyle="dark-content" />
      {false && DEV_FLAGS.SHOW_TEMP_LOGOUT_BUTTON && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Temporary Logout Button"
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}
      >
        <View style={styles.headerCentered}>
          {/* Back button to change customer/plant */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.navigate('CustomerSelector')}
            accessibilityLabel="Change customer or plant"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>

          {selectedCompany && availableCustomers.length > 0 ? (
            <View style={styles.customerTitleContainer}>
              {/* Company selector line */}
              <TouchableOpacity
                onPress={() => {
                  setShowCompanyDropdown((v) => !v);
                  setShowPlantDropdown(false);
                }}
                accessibilityLabel="Select company"
                style={styles.customerLineButton}
              >
                <Text style={styles.clientTitle}>{selectedCompany}</Text>
                <Text style={styles.dropdownArrow}>▼</Text>
              </TouchableOpacity>
              {/* Plant selector line - only show if we have a selected plant or customer with DisplayName */}
              {(selectedPlant?.DisplayName || selectedCustomer?.DisplayName) && (
                <TouchableOpacity
                  onPress={() => {
                    setShowPlantDropdown((v) => !v);
                    setShowCompanyDropdown(false);
                  }}
                  accessibilityLabel="Select plant"
                  style={styles.customerLineButton}
                >
                  <Text style={styles.plantSubtitle}>
                    {selectedPlant?.DisplayName || selectedCustomer?.DisplayName}
                  </Text>
                  <Text style={styles.dropdownArrow}>▼</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : selectedCustomer ? (
            <View style={styles.customerTitleContainer}>
              <Text style={styles.clientTitle}>{selectedCustomer.Name}</Text>
              <Text style={styles.plantSubtitle}>{selectedCustomer.DisplayName}</Text>
            </View>
          ) : (
            <>
              <Text style={styles.clientTitle}>{clientName}</Text>
              {plantName ? <Text style={styles.plantSubtitle}>{plantName}</Text> : null}
            </>
          )}
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.plantLayoutButton}
              onPress={() =>
                navigation.navigate('PlantLayout', {
                  machineId: selectedCustomer?.Id || 498,
                  machineName: selectedCustomer?.DisplayName || 'Plant Layout',
                })
              }
              accessibilityLabel="View plant layout"
            >
              <Text style={styles.plantLayoutIcon}>🏭</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plantLayoutButton}
              onPress={() => navigation.navigate('ProductionOrders')}
              accessibilityLabel="View production orders"
            >
              <Text style={styles.plantLayoutIcon}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plantLayoutButton}
              onPress={() =>
                navigation.navigate('Actions', {
                  customerId: selectedCustomer?.Id,
                  customerName: selectedCustomer?.Name,
                  plantId: selectedCustomer?.Id,
                  plantName: selectedCustomer?.DisplayName,
                })
              }
              accessibilityLabel="Create or view actions"
            >
              <Text style={styles.plantLayoutIcon}>📝</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.plantLayoutButton}
              onPress={handleLogout}
              accessibilityLabel="Logout"
            >
              <Text style={styles.plantLayoutIcon}>⬅️</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Company dropdown */}
        {showCompanyDropdown && (
          <View style={[styles.inlineDropdownContainer, { backgroundColor: '#FFFFFF' }]}>
            <Text style={styles.modalTitle}>Select Company</Text>
            <FlatList
              data={companyNames}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              nestedScrollEnabled={true}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.customerItem,
                    item === selectedCompany ? styles.customerItemSelected : undefined,
                  ]}
                  onPress={() => handleCompanySelect(item)}
                >
                  <Text style={styles.customerItemText}>{item}</Text>
                  {item === selectedCompany ? <Text style={styles.checkmark}>✓</Text> : null}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={[styles.modalCloseButton, { marginTop: 8 }]}
              onPress={() => setShowCompanyDropdown(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Plant dropdown */}
        {showPlantDropdown && (
          <View style={[styles.inlineDropdownContainer, { backgroundColor: '#FFFFFF' }]}>
            <Text style={styles.modalTitle}>Select Plant/Area</Text>
            {plants.length > 0 ? (
              <FlatList
                data={sortedPlants}
                keyExtractor={(item) => String(item.Id)}
                style={{ maxHeight: 300 }}
                nestedScrollEnabled={true}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.customerItem,
                      selectedPlant?.Id === item.Id ? styles.customerItemSelected : undefined,
                    ]}
                    onPress={() => handlePlantSelect(item)}
                  >
                    <Text style={styles.customerItemText}>{item.DisplayName}</Text>
                    {selectedPlant?.Id === item.Id ? <Text style={styles.checkmark}>✓</Text> : null}
                  </TouchableOpacity>
                )}
              />
            ) : (
              <Text style={styles.customerItemText}>Loading plants...</Text>
            )}
            <TouchableOpacity
              style={[styles.modalCloseButton, { marginTop: 8 }]}
              onPress={() => setShowPlantDropdown(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        )}

        {filtered.length > 10 && (
          <TextInput
            style={styles.searchInput}
            placeholder="Search Machines"
            value={search}
            onChangeText={setSearch}
            ref={searchInputRef}
            returnKeyType="search"
            blurOnSubmit={false}
          />
        )}
        <View style={styles.shiftTabs}>
          <TouchableOpacity
            style={[styles.tab, shiftView === 'current' && styles.activeTab]}
            onPress={() => setShiftView('current')}
          >
            <Text style={[styles.tabText, shiftView === 'current' && styles.activeTabText]}>
              Current Shift
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, shiftView === 'last' && styles.activeTab]}
            onPress={() => setShiftView('last')}
          >
            <Text style={[styles.tabText, shiftView === 'last' && styles.activeTabText]}>
              Last Shift
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.legendContainer}>
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#86EFAC' }]} />
              <Text style={styles.legendText}>Running</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#FCA5A5' }]} />
              <Text style={styles.legendText}>Stopped</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#E5E7EB' }]} />
              <Text style={styles.legendText}>No Data</Text>
            </View>
          </View>
        </View>

        <View style={styles.prodBarLegendContainer}>
          <Text style={styles.prodBarLegendTitle}>Production Progress:</Text>
          <View style={styles.prodBarLegend}>
            <View style={styles.prodBarLegendItem}>
              <View style={[styles.prodBarLegendSwatch, { backgroundColor: '#16a34a' }]} />
              <Text style={styles.prodBarLegendText}>≥75%</Text>
            </View>
            <View style={styles.prodBarLegendItem}>
              <View style={[styles.prodBarLegendSwatch, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.prodBarLegendText}>50-74%</Text>
            </View>
            <View style={styles.prodBarLegendItem}>
              <View style={[styles.prodBarLegendSwatch, { backgroundColor: '#ef4444' }]} />
              <Text style={styles.prodBarLegendText}>&lt;50%</Text>
            </View>
          </View>
        </View>

        <View style={styles.tableHeader}>
          <TouchableOpacity style={styles.nameColumn} onPress={() => handleSort('name')}>
            <Text style={styles.headerText}>
              Name {sortBy === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.prodColumn} onPress={() => handleSort('prod')}>
            <Text style={styles.headerText}>
              Prod. / Goal {sortBy === 'prod' && (sortDirection === 'asc' ? '▲' : '▼')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.downtimeColumn} onPress={() => handleSort('downtime')}>
            <Text style={styles.headerText}>
              Downtime {sortBy === 'downtime' && (sortDirection === 'asc' ? '▲' : '▼')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.scrapColumn} onPress={() => handleSort('scrap')}>
            <Text style={styles.headerText}>
              Scrap {sortBy === 'scrap' && (sortDirection === 'asc' ? '▲' : '▼')}
            </Text>
          </TouchableOpacity>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={refetch} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {loading && !error ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading machines...</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(m) => m.MachineId.toString()}
            renderItem={renderItem}
            onRefresh={handleManualRefresh}
            refreshing={loading}
            progressViewOffset={80}
            contentContainerStyle={{ flexGrow: 1 }}
            alwaysBounceVertical={true}
            stickyHeaderIndices={[]}
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No machines found</Text>
                </View>
              ) : null
            }
          />
        )}
      </KeyboardAvoidingView>

      {/* Customer Dropdown Modal */}
      <Modal
        visible={showCustomerDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomerDropdown(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCustomerDropdown(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Customer / Plant</Text>
            <FlatList
              data={availableCustomers}
              keyExtractor={(item) => item.Id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.customerItem,
                    selectedCustomer?.Id === item.Id && styles.customerItemSelected,
                  ]}
                  onPress={() => handleCustomerChange(item)}
                >
                  <Text style={styles.customerItemText}>
                    {item.Name} - {item.DisplayName}
                  </Text>
                  {selectedCustomer?.Id === item.Id && <Text style={styles.checkmark}>✓</Text>}
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowCustomerDropdown(false)}
            >
              <Text style={styles.modalCloseText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 0 : StatusBar.currentHeight,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  headerCentered: {
    paddingTop: 60,
    paddingBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 16,
    top: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 24,
    color: '#374151',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: -5,
  },
  clientTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000000',
    textAlign: 'center',
  },
  customerTitleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  customerLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#F9FAFB',
    marginVertical: 2,
    minWidth: 200,
  },
  customerTitleContainer: {
    alignItems: 'center',
  },
  dropdownArrow: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
  },
  plantSubtitle: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  headerActions: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  customerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#DBEAFE',
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  customerButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  plantLayoutButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  plantLayoutIcon: {
    fontSize: 20,
    color: '#6B7280',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  refreshButtonActive: {
    backgroundColor: '#DBEAFE',
  },
  refreshIcon: {
    fontSize: 20,
    color: '#6B7280',
  },
  refreshIconActive: {
    color: '#1D4ED8',
    fontWeight: '600',
  },
  searchInput: {
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    fontSize: 15,
  },
  shiftTabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  shiftTimeDisplay: {
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  shiftTimeText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  legendContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 12,
    color: '#6B7280',
  },
  prodBarLegendContainer: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingBottom: 12,
  },
  prodBarLegendTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  prodBarLegend: {
    flexDirection: 'row',
    gap: 12,
  },
  prodBarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  prodBarLegendSwatch: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
  },
  prodBarLegendText: {
    fontSize: 10,
    color: '#6B7280',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    alignItems: 'center',
  },
  lineLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineArrow: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '700',
    marginRight: 6,
  },
  lineArrowHit: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameColumn: {
    flex: 2,
  },
  prodColumn: {
    flex: 1.5,
    alignItems: 'center',
  },
  downtimeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  scrapColumn: {
    flex: 0.8,
    alignItems: 'center',
  },
  machineName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000000',
  },
  cellText: {
    fontSize: 13,
    color: '#374151',
  },
  downtimeText: {
    color: '#DC2626',
    fontWeight: '500',
  },
  lineChildrenContainer: {
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  lineChildRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#E5E7EB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
  },
  lineChildNameCol: {
    flex: 2,
  },
  lineChildProdCol: {
    flex: 1.2,
    alignItems: 'center',
  },
  lineChildDowntimeCol: {
    flex: 1,
    alignItems: 'center',
  },
  lineChildScrapCol: {
    flex: 0.8,
    alignItems: 'center',
  },
  lineChildName: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
  },
  lineChildMeta: {
    fontSize: 12,
    color: '#6B7280',
  },
  lineChildLoading: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  lineChildLoadingText: {
    fontSize: 12,
    color: '#374151',
  },
  lineChildError: {
    padding: 12,
    color: '#991B1B',
    fontSize: 12,
  },
  lineChildEmpty: {
    padding: 12,
    fontSize: 12,
    color: '#6B7280',
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
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
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
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  logoutButton: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#c62828',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    zIndex: 1000,
    elevation: 3,
  },
  logoutText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
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
    maxHeight: '70%',
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
  customerItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  customerItemSelected: {
    backgroundColor: '#DBEAFE',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  customerItemText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    flex: 1,
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
  inlineDropdownContainer: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    maxHeight: 400,
  },
});

export default MachineListScreen;
