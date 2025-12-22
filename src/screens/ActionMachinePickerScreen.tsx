import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { RootStackParamList, ActionMachineSelection } from '../types/navigation';
import { getMachineInventory, MachineInventoryItem } from '../services/machineInventoryService';
import { useAppTheme } from '../hooks/useAppTheme';

export type ActionMachinePickerProps = NativeStackScreenProps<
  RootStackParamList,
  'ActionMachinePicker'
>;

export default function ActionMachinePickerScreen({ navigation, route }: ActionMachinePickerProps) {
  const theme = useAppTheme();
  const { plantId, plantName, initialSelected, onSelectMachines } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [machines, setMachines] = useState<MachineInventoryItem[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [lineChildren, setLineChildren] = useState<Record<number, MachineInventoryItem[]>>({});
  const [lineLoading, setLineLoading] = useState<Record<number, boolean>>({});
  const [lineError, setLineError] = useState<Record<number, string | null>>({});

  const allMachines = useMemo(() => {
    const map = new Map<number, MachineInventoryItem>();
    machines.forEach((m) => map.set(m.MachineId, m));
    Object.values(lineChildren)
      .flat()
      .forEach((m) => map.set(m.MachineId, m));
    return Array.from(map.values());
  }, [machines, lineChildren]);

  useEffect(() => {
    const defaults = new Set<number>();
    (initialSelected || []).forEach((m) => defaults.add(m.machineId));
    setSelected(defaults);
  }, [initialSelected]);

  useEffect(() => {
    if (!plantId) {
      setError('Missing plant/area. Please go back and select a plant.');
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getMachineInventory(plantId, 'current');
        setMachines(data);
      } catch (e: any) {
        if (__DEV__) console.debug('Failed to load machines for picker', e);
        setError(e?.message || 'Failed to load machines');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [plantId]);

  const topLevel = useMemo(() => {
    const machineIds = new Set(machines.map((m) => m.MachineId));
    const parentIds = new Set(
      machines.map((m) => m.ParentMachineId).filter((p) => p !== null && p !== undefined)
    );

    return machines.filter((m) => {
      const isLine = m.MachineType?.Name === 'DiscreteLine';
      const noParent = m.ParentMachineId === null || m.ParentMachineId === undefined;
      const parentMissing =
        m.ParentMachineId !== null &&
        m.ParentMachineId !== undefined &&
        !machineIds.has(m.ParentMachineId);
      // show lines always, standalone machines (no parent), and machines whose parent isn't in the list
      return isLine || noParent || parentMissing;
    });
  }, [machines]);

  const childrenMap = useMemo(() => {
    const map: Record<number, MachineInventoryItem[]> = {};
    machines.forEach((m) => {
      if (m.ParentMachineId !== null && m.ParentMachineId !== undefined) {
        map[m.ParentMachineId] = map[m.ParentMachineId] || [];
        map[m.ParentMachineId].push(m);
      }
    });
    // merge any on-demand loaded children
    Object.entries(lineChildren).forEach(([id, kids]) => {
      const key = Number(id);
      if (!map[key]) {
        map[key] = [];
      }
      map[key] = map[key].concat(kids);
    });
    return map;
  }, [machines, lineChildren]);

  const toggleExpand = async (lineId: number) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });

    const alreadyLoaded = lineChildren[lineId];
    if (alreadyLoaded) return;

    setLineLoading((prev) => ({ ...prev, [lineId]: true }));
    setLineError((prev) => ({ ...prev, [lineId]: null }));
    try {
      const fetched = await getMachineInventory(lineId, 'current');
      setLineChildren((prev) => ({ ...prev, [lineId]: fetched }));
    } catch (e: any) {
      setLineError((prev) => ({ ...prev, [lineId]: e?.message || 'Failed to load machines' }));
    } finally {
      setLineLoading((prev) => ({ ...prev, [lineId]: false }));
    }
  };

  const toggleSelect = (machine: MachineInventoryItem) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(machine.MachineId)) next.delete(machine.MachineId);
      else next.add(machine.MachineId);
      return next;
    });
  };

  const handleSave = () => {
    const selections: ActionMachineSelection[] = [];
    allMachines.forEach((m) => {
      if (selected.has(m.MachineId)) {
        selections.push({
          machineId: m.MachineId,
          name: m.DisplayName || m.MachineName || `Machine ${m.MachineId}`,
          isLine: m.MachineType?.Name === 'DiscreteLine',
          parentLineId: m.ParentMachineId ?? null,
        });
      }
    });

    if (onSelectMachines) {
      onSelectMachines(selections);
    }

    navigation.goBack();
  };

  const renderRow = (machine: MachineInventoryItem, depth = 0) => {
    const isLine = machine.MachineType?.Name === 'DiscreteLine';
    const isSelected = selected.has(machine.MachineId);
    const children = childrenMap[machine.MachineId] || [];
    const expanded = expandedLines.has(machine.MachineId);
    const hasChildren = children.length > 0;

    return (
      <View key={machine.MachineId} style={{ marginLeft: depth * 12 }}>
        <TouchableOpacity
          style={[styles.row, isSelected && styles.rowSelected]}
          onPress={() => toggleSelect(machine)}
        >
          <View style={styles.rowLeft}>
            {isLine ? (
              <TouchableOpacity
                onPress={() => toggleExpand(machine.MachineId)}
                style={styles.lineArrowHit}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.lineArrow}>{expanded ? '▼' : '▶'}</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.lineArrowHit} />
            )}
            <View style={styles.checkbox}>
              {isSelected ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={styles.rowLabel}>{machine.DisplayName || machine.MachineName}</Text>
          </View>
          {isLine && hasChildren ? <Text style={styles.childCount}>{children.length}</Text> : null}
        </TouchableOpacity>
        {isLine && expanded ? (
          <View style={styles.lineChildrenWrapper}>
            {lineLoading[machine.MachineId] ? (
              <View style={styles.lineChildLoading}>
                <ActivityIndicator size="small" color="#2563EB" />
                <Text style={styles.lineChildLoadingText}>Loading machines…</Text>
              </View>
            ) : lineError[machine.MachineId] ? (
              <Text style={styles.lineChildError}>⚠️ {lineError[machine.MachineId]}</Text>
            ) : hasChildren ? (
              children.map((child) => renderRow(child, depth + 1))
            ) : (
              <Text style={styles.lineChildEmpty}>No machines in this line.</Text>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.listContainer}>
          {topLevel.length ? (
            topLevel.map((item) => renderRow(item))
          ) : (
            <Text style={styles.muted}>No lines or machines found for this plant.</Text>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerButton} onPress={handleSave}>
          <Text style={styles.footerButtonText}>Add Selected</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerCancel} onPress={() => navigation.goBack()}>
          <Text style={styles.footerCancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    color: '#6B7280',
    marginTop: 4,
  },
  listContainer: {
    paddingHorizontal: 12,
    paddingBottom: 80,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  muted: {
    color: '#6B7280',
    marginTop: 8,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    marginVertical: 4,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  lineArrowHit: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lineArrow: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '700',
  },
  rowSelected: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  chevron: {
    width: 18,
    color: '#374151',
    marginRight: 6,
    textAlign: 'center',
  },
  chevronPlaceholder: {
    width: 18,
    color: '#D1D5DB',
    marginRight: 6,
    textAlign: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  check: {
    color: '#2563EB',
    fontWeight: '800',
  },
  rowLabel: {
    fontSize: 14,
    color: '#111827',
  },
  childCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  lineChildrenWrapper: {
    marginLeft: 30,
    marginTop: 4,
    marginBottom: 6,
    gap: 4,
  },
  lineChildLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  lineChildLoadingText: {
    color: '#6B7280',
    fontSize: 12,
  },
  lineChildError: {
    color: '#B91C1C',
    fontSize: 12,
  },
  lineChildEmpty: {
    color: '#6B7280',
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginRight: 8,
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  footerCancel: {
    width: 120,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerCancelText: {
    color: '#111827',
    fontWeight: '700',
  },
});
