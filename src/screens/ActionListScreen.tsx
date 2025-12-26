import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  TouchableWithoutFeedback,
  BackHandler,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';
import {
  ActionLabel,
  ActionListItem,
  ActionListFilters,
  fetchActions,
  fetchActionLabels,
  fetchActionStatuses,
  ActionStatus,
} from '../services/actionService';
import { useAppTheme } from '../hooks/useAppTheme';
import { getSelectedCustomer } from '../services/customerStorage';
import { useMachineInventory } from '../hooks/useMachineInventory';
import {
  fetchActionTemplateSummaries,
  ActionTemplateSummary,
} from '../services/actionTemplateService';
import { getUsersForMachine, MachineUser } from '../services/machineUserService';

export type ActionListScreenProps = NativeStackScreenProps<RootStackParamList, 'ActionList'>;

export default function ActionListScreen({ navigation, route }: ActionListScreenProps) {
  const theme = useAppTheme();
  const isFocused = useIsFocused();

  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const { machines } = useMachineInventory(selectedCustomer);

  const [actions, setActions] = useState<ActionListItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<ActionStatus[]>([]);
  const [labels, setLabels] = useState<ActionLabel[]>([]);
  const [templates, setTemplates] = useState<ActionTemplateSummary[]>([]);

  const [searchText, setSearchText] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);
  const [statusId, setStatusId] = useState<number | undefined>(undefined);
  const [labelId, setLabelId] = useState<number | undefined>(undefined);
  const [assignedToId, setAssignedToId] = useState<number | string | undefined>(undefined);
  const [selectedMachineId, setSelectedMachineId] = useState<number | undefined>(undefined);

  // Dropdown open states
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [assignedToDropdownOpen, setAssignedToDropdownOpen] = useState(false);
  const [machineDropdownOpen, setMachineDropdownOpen] = useState(false);

  // Track last successful load signature to avoid duplicate loads
  const lastLoadKeyRef = useRef<string | null>(null);
  // Cache machine users to resolve AssigneeId -> name
  const machineUsersRef = useRef<Map<number, MachineUser[]>>(new Map());

  // Close all dropdowns
  const closeAllDropdowns = useCallback(() => {
    setTypeDropdownOpen(false);
    setStatusDropdownOpen(false);
    setAssignedToDropdownOpen(false);
    setMachineDropdownOpen(false);
  }, []);

  // Helper: stable hash for names when ID missing (defined before usage)
  function hash32(s: string): number {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return h >>> 0;
  }

  // Helper: unified assignee key for filtering and grouping
  function getAssigneeKey(a: Partial<ActionListItem>): number | undefined {
    if (typeof a.AssigneeId === 'number' && Number.isFinite(a.AssigneeId)) return a.AssigneeId;
    if (a.AssigneeName && typeof a.AssigneeName === 'string') return hash32(a.AssigneeName);
    return undefined;
  }

  // Get unique assignees and machines from loaded actions
  const uniqueAssignees = useMemo(() => {
    const assignees = new Map<number, string>();
    actions.forEach((action) => {
      const key = getAssigneeKey(action);
      if (key !== undefined && action.AssigneeName) {
        assignees.set(key as number, action.AssigneeName);
      }
    });
    return Array.from(assignees, ([id, name]) => ({ id, name }));
  }, [actions]);

  const uniqueMachines = useMemo(() => {
    const machinesMap = new Map<number, string>();
    actions.forEach((action) => {
      if (action.MachineId && action.MachineName) {
        machinesMap.set(action.MachineId, action.MachineName);
      }
    });
    return Array.from(machinesMap, ([id, name]) => ({ id, name }));
  }, [actions]);

  // Filter the actions based on selected filters
  const filteredActions = useMemo(() => {
    let filtered = [...actions];

    // Filter by type
    if (selectedTypeId !== undefined) {
      filtered = filtered.filter((action) => action.Type?.Id === selectedTypeId);
    }

    // Filter by status
    if (statusId !== undefined) {
      filtered = filtered.filter((action) => action.StatusId === statusId);
    }

    // Filter by assigned to (supports synthetic keys when AssigneeId missing, and unassigned)
    if (assignedToId !== undefined) {
      if (assignedToId === 'unassigned') {
        filtered = filtered.filter((action) => !action.AssigneeId);
      } else {
        filtered = filtered.filter((action) => getAssigneeKey(action) === assignedToId);
      }
    }

    // Filter by machine
    if (selectedMachineId !== undefined) {
      filtered = filtered.filter((action) => action.MachineId === selectedMachineId);
    }

    // Filter by search text
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(
        (action) =>
          action.Name?.toLowerCase().includes(search) ||
          action.Description?.toLowerCase().includes(search) ||
          action.Details?.toLowerCase().includes(search) ||
          action.MachineName?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [actions, selectedTypeId, statusId, assignedToId, selectedMachineId, searchText]);

  const filters = useMemo<ActionListFilters>(() => {
    // Calculate date range: last 7 days to today
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    return {
      from: startDate.toISOString().split('T')[0], // YYYY-MM-DD
      to: endDate.toISOString().split('T')[0], // YYYY-MM-DD
      dateType: 'calendar',
      pageSize: 25,
      orderBy: 'CreatedDate',
      ascending: false,
    };
  }, []);

  const loadReferenceData = useCallback(async () => {
    try {
      const [statusData, customer, templateData] = await Promise.all([
        fetchActionStatuses(),
        getSelectedCustomer(),
        fetchActionTemplateSummaries(),
      ]);
      setStatuses(statusData || []);
      setSelectedCustomer(customer);
      setTemplates(templateData || []);

      if (customer?.ParentId) {
        const labelData = await fetchActionLabels(customer.ParentId);
        setLabels(labelData || []);
      } else {
        setLabels([]);
      }
    } catch (e: any) {
      if (__DEV__) console.debug('Failed to load action filters', e?.message || e);
    }
  }, []);

  const loadActions = useCallback(
    async (opts?: { silent?: boolean; force?: boolean }) => {
      if (loading && opts?.silent) return;
      if (__DEV__)
        console.debug('🧭 loadActions called', { silent: opts?.silent, force: opts?.force });

      // Determine which machine(s) to load from: selected filter or all machines
      const machineIds: number[] = selectedMachineId
        ? [selectedMachineId]
        : (machines || []).map((m: any) => m.MachineId).filter((id: any) => Number.isFinite(id));

      if (machineIds.length === 0) {
        if (__DEV__) console.debug('⏸️ No machines available yet. Skipping load.');
        setActions([]);
        setTotal(0);
        return;
      }

      // Prevent duplicate loads for same machine set + date window unless forced
      const keyMachines = machineIds
        .slice()
        .sort((a, b) => a - b)
        .join(',');
      const loadKey = `${keyMachines}|${filters.from}|${filters.to}|${filters.pageSize}`;
      if (!opts?.force && lastLoadKeyRef.current === loadKey) {
        if (__DEV__)
          console.debug('⏭️ Skipping duplicate load for', loadKey, 'last=', lastLoadKeyRef.current);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const allActions: ActionListItem[] = [];
        const seen = new Set<string>();
        const machineNameById = new Map<number, string>();
        (machines || []).forEach((m: any) => {
          const name = m.MachineName || m.DisplayName || m.Name;
          if (Number.isFinite(m.MachineId) && name) machineNameById.set(m.MachineId, name);
        });

        // Fetch each machine's actions in parallel with a single call per machine
        const results = await Promise.allSettled(
          machineIds.map(async (mid) => {
            const [res, users] = await Promise.all([
              fetchActions(mid, { ...filters }),
              (async () => {
                if (machineUsersRef.current.has(mid)) return machineUsersRef.current.get(mid);
                const u = await getUsersForMachine(mid);
                machineUsersRef.current.set(mid, u || []);
                return u;
              })(),
            ]);
            return { mid, res, users };
          })
        );

        for (const r of results) {
          if (r.status === 'fulfilled') {
            const { mid, res, users } = r.value as any;
            const items = res?.Items || [];
            items.forEach((it: any) => {
              const mId = it.MachineId ?? mid;
              it.MachineId = mId;
              it.MachineName = it.MachineName || machineNameById.get(mId);
              fillAssigneeFields(it);
              // Resolve AssigneeId to name using machine users list if missing
              if (!it.AssigneeName && it.AssigneeId && Array.isArray(users)) {
                const match = users.find((u: any) => u.Id === it.AssigneeId);
                if (match) {
                  it.AssigneeName =
                    match.DisplayName || match.Name || match.Username || match.Email;
                }
              }
              const key = `${it.MachineId}-${it.Id}`;
              if (!seen.has(key)) {
                seen.add(key);
                allActions.push(it);
              }
            });
            if (__DEV__ && items.length > 0) {
              const sampleItems = items.slice(0, 3);
              console.log('🧩 taskdocuments sample items', sampleItems);
              console.log(
                '🧩 taskdocuments field summary',
                sampleItems.map((sample) => ({
                  keys: Object.keys(sample),
                  Id: sample.Id,
                  Name: sample.Name,
                  MachineId: sample.MachineId,
                  MachineName: sample.MachineName,
                  AssigneeId: sample.AssigneeId,
                  AssigneeName: sample.AssigneeName,
                  Assignee: sample.Assignee,
                  AssignedTo: sample.AssignedTo,
                  AssignedUser: sample.AssignedUser,
                  AssignedUsers: sample.AssignedUsers,
                  Users: sample.Users,
                  AssignedToName: sample.AssignedToName,
                  AssignedToUserName: sample.AssignedToUserName,
                  AssignedToUserFullName: sample.AssignedToUserFullName,
                  AssignedToDisplayName: sample.AssignedToDisplayName,
                  AssigneeFullName: sample.AssigneeFullName,
                  AssigneeDisplayName: sample.AssigneeDisplayName,
                  OwnerName: sample.OwnerName,
                  OwnerFullName: sample.OwnerFullName,
                }))
              );
            }
          } else {
            if (__DEV__) console.debug('  ⚠️ Load failed:', r.reason?.message || r.reason);
          }
        }

        // Sort by created date descending
        allActions.sort((a, b) => {
          const dateA = new Date(a.CreatedDate || 0).getTime();
          const dateB = new Date(b.CreatedDate || 0).getTime();
          return dateB - dateA;
        });

        setActions(allActions);
        setTotal(allActions.length);
        lastLoadKeyRef.current = loadKey;

        console.log(`✅ Total: ${allActions.length} actions (force=${opts?.force ? 'yes' : 'no'})`);
        console.log(`📊 Breakdown by type:`);
        const typeCounts: Record<string, number> = {};
        allActions.forEach((action) => {
          const typeName = action.Type?.DisplayName || 'Unknown';
          typeCounts[typeName] = (typeCounts[typeName] || 0) + 1;
        });
        Object.entries(typeCounts).forEach(([type, count]) => {
          console.log(`   ${type}: ${count}`);
        });
      } catch (e: any) {
        const message = e?.message || 'Failed to load actions';
        setError(message);
        console.log(`❌ Failed to load actions:`, message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [filters, loading, selectedMachineId, machines]
  );

  useEffect(() => {
    loadReferenceData();
  }, [loadReferenceData]);

  // Load actions when screen is focused (only once)
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (isFocused && !hasLoadedRef.current) {
      console.log(
        '📱 ActionList focused, initial load...',
        'route.params=',
        (route as any)?.params
      );
      hasLoadedRef.current = true;
      loadActions();
    }

    if (!isFocused) {
      hasLoadedRef.current = false;
    }
  }, [isFocused, loadActions]);

  // Force reload when returning from edit with reload flag
  useEffect(() => {
    const reloadFlag = (route as any)?.params?.reload;
    if (isFocused && reloadFlag) {
      console.log(
        '🔁 ActionList received reload flag, forcing load...',
        'route.params=',
        (route as any)?.params
      );
      loadActions({ force: true });
      try {
        navigation.setParams({ reload: undefined });
        console.log('🧹 Cleared reload flag from route params');
      } catch {}
    }
  }, [isFocused, route, navigation, loadActions]);

  // Override back: from ActionList go to MachineList
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (__DEV__) console.debug('🔙 Hardware back on ActionList — navigating to MachineList');
      navigation.navigate('MachineList');
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      // Prevent default back
      e.preventDefault();
      if (__DEV__) console.debug('🔙 Header back on ActionList — navigating to MachineList');
      navigation.navigate('MachineList');
    });
    return unsubscribe;
  }, [navigation]);

  // When machines load after first render, trigger a background load
  useEffect(() => {
    if (!isFocused) return;
    // Let loadActions decide whether to skip via lastLoadKeyRef
    loadActions({ silent: true });
  }, [machines, selectedMachineId, filters, isFocused, loadActions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadActions();
  }, [loadActions]);

  const clearFilters = useCallback(() => {
    // Filters currently disabled pending supported query mapping
  }, []);

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  };

  const renderStatusPill = (item: ActionStatus | ActionLabel, selected: boolean) => (
    <TouchableOpacity
      key={item.Id}
      style={[styles.pill, selected && styles.pillActive]}
      onPress={() => {
        if ('Color' in item && item.Color) {
          setLabelId(selected ? undefined : item.Id);
        } else {
          setStatusId(selected ? undefined : item.Id);
        }
      }}
    >
      <Text style={[styles.pillText, selected && styles.pillTextActive]}>
        {'DisplayName' in item && item.DisplayName ? item.DisplayName : item.Name}
      </Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: ActionListItem }) => {
    const typeName = item.Type?.Name || 'UNKNOWN';
    const typeDisplay = item.Type?.DisplayName || typeName;
    const typeColor = getTypeColor(typeName);

    return (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate('Actions2', {
            actionId: item.Id,
            actionData: item,
          });
        }}
      >
        <View style={styles.card}>
          <View style={[styles.typeChip, { backgroundColor: typeColor }]}>
            <Text style={styles.typeChipText}>{typeDisplay}</Text>
          </View>
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.Name || 'Untitled action'}
              </Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.dateText}>{formatDate(item.CreatedDate)}</Text>
              <Text style={styles.machineText} numberOfLines={1}>
                {item.MachineName || 'Unknown machine'}
              </Text>
              <Text style={styles.assignedText} numberOfLines={1}>
                {item.AssigneeName ? `Assigned: ${item.AssigneeName}` : 'Unassigned'}
              </Text>
            </View>
            <View style={styles.footerRow}>
              {item.StatusName ? (
                <Text style={styles.statusBadge}>{item.StatusName}</Text>
              ) : (
                <View />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const getTypeColor = (typeName: string): string => {
    switch (typeName.toUpperCase()) {
      case 'NOTE':
        return '#3B82F6'; // Blue
      case 'IDEA':
        return '#8B5CF6'; // Purple
      case 'TASK':
        return '#10B981'; // Green
      case 'SAFETY':
        return '#EF4444'; // Red
      case 'DOWNTIME':
        return '#F59E0B'; // Amber
      default:
        return '#6B7280'; // Gray
    }
  };

  // Try to infer assignee info from various possible API shapes
  const fillAssigneeFields = (it: any) => {
    if (it.AssigneeName && it.AssigneeId) return;
    const tryUserLike = (u: any) => {
      if (!u) return undefined;
      const id = u.Id ?? u.UserId ?? u.AssigneeId;
      const name = u.Name || u.DisplayName || u.Username || u.UserName;
      if (name) {
        it.AssigneeName = it.AssigneeName || name;
      }
      if (id && !it.AssigneeId) {
        it.AssigneeId = id;
      }
    };
    tryUserLike(it.Assignee);
    tryUserLike(it.AssignedTo);
    tryUserLike(it.AssignedUser);
    tryUserLike(it.AssignedToUser);
    tryUserLike(it.AssigneeUser);
    // Direct user fields
    if (!it.AssigneeId && typeof it.UserId === 'number') {
      it.AssigneeId = it.UserId;
    }
    if (!it.AssigneeName && typeof it.UserName === 'string' && it.UserName.trim()) {
      it.AssigneeName = it.UserName.trim();
    }
    if (!it.AssigneeName && typeof it.UserFullName === 'string' && it.UserFullName.trim()) {
      it.AssigneeName = it.UserFullName.trim();
    }
    if (Array.isArray(it.AssignedUsers) && it.AssignedUsers.length > 0) {
      tryUserLike(it.AssignedUsers[0]);
    }
    if (Array.isArray(it.Users) && it.Users.length > 0) {
      tryUserLike(it.Users[0]);
    }
    // Common name-only fallbacks
    if (!it.AssigneeName) {
      const nameOnly =
        it.AssignedToName ||
        it.AssignedToUserName ||
        it.AssignedToUserFullName ||
        it.AssignedToDisplayName ||
        it.AssigneeFullName ||
        it.AssigneeDisplayName ||
        it.AssignedTo ||
        it.UserName ||
        it.UserFullName ||
        it.Username ||
        it.CreatedByName ||
        it.OwnerName ||
        it.OwnerFullName;
      if (typeof nameOnly === 'string' && nameOnly.trim()) {
        it.AssigneeName = nameOnly.trim();
      }
    }
  };

  // helpers defined earlier (hash32, getAssigneeKey)

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Filter Actions</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.closeLink}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Row 1: Type, Status, Assigned To */}
        <View style={styles.filterRow}>
          {/* Type Dropdown */}
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Type</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setTypeDropdownOpen(!typeDropdownOpen)}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedTypeId
                  ? templates.find((t) => t.Id === selectedTypeId)?.DisplayName || 'All'
                  : 'All'}
              </Text>
              <Text style={styles.dropdownArrow}>{typeDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {typeDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedTypeId(undefined);
                    setTypeDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedTypeId === undefined && styles.dropdownItemTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {templates.map((template) => (
                  <TouchableOpacity
                    key={template.Id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedTypeId(template.Id);
                      setTypeDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedTypeId === template.Id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {template.DisplayName}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Status Dropdown */}
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Status</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {statusId
                  ? statuses.find((s) => s.Id === statusId)?.DisplayName ||
                    statuses.find((s) => s.Id === statusId)?.Name ||
                    'All'
                  : 'All'}
              </Text>
              <Text style={styles.dropdownArrow}>{statusDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {statusDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setStatusId(undefined);
                    setStatusDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      statusId === undefined && styles.dropdownItemTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {statuses.map((status) => (
                  <TouchableOpacity
                    key={status.Id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setStatusId(status.Id);
                      setStatusDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        statusId === status.Id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {status.DisplayName || status.Name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Assigned To Dropdown */}
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Assigned</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setAssignedToDropdownOpen(!assignedToDropdownOpen)}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {assignedToId === 'unassigned'
                  ? 'Unassigned'
                  : assignedToId
                    ? uniqueAssignees.find((a) => a.id === assignedToId)?.name || 'All'
                    : 'All'}
              </Text>
              <Text style={styles.dropdownArrow}>{assignedToDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {assignedToDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setAssignedToId(undefined);
                    setAssignedToDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      assignedToId === undefined && styles.dropdownItemTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setAssignedToId('unassigned');
                    setAssignedToDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      assignedToId === 'unassigned' && styles.dropdownItemTextActive,
                    ]}
                  >
                    Unassigned
                  </Text>
                </TouchableOpacity>
                {uniqueAssignees.map((assignee) => (
                  <TouchableOpacity
                    key={assignee.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setAssignedToId(assignee.id);
                      setAssignedToDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        assignedToId === assignee.id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {assignee.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Row 2: Machine, Search */}
        <View style={styles.filterRow}>
          {/* Machine Dropdown */}
          <View style={styles.filterCol}>
            <Text style={styles.filterLabel}>Machine</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setMachineDropdownOpen(!machineDropdownOpen)}
            >
              <Text style={styles.dropdownText} numberOfLines={1}>
                {selectedMachineId
                  ? uniqueMachines.find((m) => m.id === selectedMachineId)?.name || 'All'
                  : 'All'}
              </Text>
              <Text style={styles.dropdownArrow}>{machineDropdownOpen ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {machineDropdownOpen && (
              <View style={styles.dropdownMenu}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setSelectedMachineId(undefined);
                    setMachineDropdownOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedMachineId === undefined && styles.dropdownItemTextActive,
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>
                {uniqueMachines.map((machine) => (
                  <TouchableOpacity
                    key={machine.id}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setSelectedMachineId(machine.id);
                      setMachineDropdownOpen(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        selectedMachineId === machine.id && styles.dropdownItemTextActive,
                      ]}
                    >
                      {machine.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Search */}
          <View style={[styles.filterCol, styles.filterColWide]}>
            <Text style={styles.filterLabel}>Search</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search actions..."
              value={searchText}
              onChangeText={setSearchText}
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <Text style={styles.resultSummaryText}>
          {filteredActions.length} of {actions.length} actions
        </Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading actions...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContent}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => loadActions()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredActions}
          keyExtractor={(item) => `${item.MachineId ?? 'm'}-${item.Id}`}
          contentContainerStyle={styles.listContent}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onScrollBeginDrag={closeAllDropdowns}
          ListEmptyComponent={() => (
            <View style={styles.centerContent}>
              <Text style={styles.emptyText}>No actions found</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  closeLink: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  filterCol: {
    flex: 1,
  },
  filterColWide: {
    flex: 2,
  },
  filterGroup: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 14,
    color: '#111827',
    flex: 1,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#6B7280',
    marginLeft: 4,
  },
  dropdownMenu: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  searchInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  resultSummaryText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 4,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
    position: 'relative',
  },
  cardContent: {
    padding: 14,
    paddingTop: 12,
  },
  typeChip: {
    position: 'absolute',
    top: 10,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
  },
  typeChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
    flexShrink: 0,
  },
  machineText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    textAlign: 'center',
  },
  assignedText: {
    fontSize: 14,
    color: '#374151',
    flexShrink: 0,
    textAlign: 'right',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#E0F2FE',
    color: '#0369A1',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '500',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 15,
  },
  resultSummary: {
    paddingVertical: 4,
    marginBottom: 6,
  },
  resultSummaryText: {
    fontSize: 13,
    color: '#6B7280',
  },
});
