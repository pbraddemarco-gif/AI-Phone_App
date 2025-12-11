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
import { RootStackParamList, ActionMachineSelection } from '../types/navigation';
import { getMachineInventory, MachineInventoryItem } from '../services/machineInventoryService';
import { useAppTheme } from '../hooks/useAppTheme';

export type ActionMachinePickerProps = NativeStackScreenProps<
  RootStackParamList,
  'ActionMachinePicker'
>;

export default function ActionMachinePickerScreen({ navigation, route }: ActionMachinePickerProps) {
  const theme = useAppTheme();
  const { plantId, plantName, initialSelected } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [machines, setMachines] = useState<MachineInventoryItem[]>([]);
  const [expandedLines, setExpandedLines] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());

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
        console.error('Failed to load machines for picker', e);
        setError(e?.message || 'Failed to load machines');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [plantId]);

  const lines = useMemo(
    () => machines.filter((m) => m.MachineType?.Name === 'DiscreteLine'),
    [machines]
  );

  const childrenMap = useMemo(() => {
    const map: Record<number, MachineInventoryItem[]> = {};
    machines.forEach((m) => {
      if (m.ParentMachineId) {
        map[m.ParentMachineId] = map[m.ParentMachineId] || [];
        map[m.ParentMachineId].push(m);
      }
    });
    return map;
  }, [machines]);

  const toggleExpand = (lineId: number) => {
    setExpandedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
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
    machines.forEach((m) => {
      if (selected.has(m.MachineId)) {
        selections.push({
          machineId: m.MachineId,
          name: m.DisplayName || m.MachineName || `Machine ${m.MachineId}`,
          isLine: m.MachineType?.Name === 'DiscreteLine',
          parentLineId: m.ParentMachineId ?? null,
        });
      }
    });

    navigation.navigate('Actions', { selectedMachines: selections }, { merge: true } as any);
    navigation.goBack();
  };

  const renderRow = (machine: MachineInventoryItem, depth = 0) => {
    const isLine = machine.MachineType?.Name === 'DiscreteLine';
    const isSelected = selected.has(machine.MachineId);
    const children = childrenMap[machine.MachineId] || [];
    const expanded = expandedLines.has(machine.MachineId);
    return (
      <View key={machine.MachineId} style={{ marginLeft: depth * 12 }}>
        <TouchableOpacity
          style={[styles.row, isSelected && styles.rowSelected]}
          onPress={() => toggleSelect(machine)}
          onLongPress={isLine ? () => toggleExpand(machine.MachineId) : undefined}
        >
          {isLine ? (
            <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
          ) : (
            <Text style={styles.chevronPlaceholder}>•</Text>
          )}
          <View style={styles.checkbox}>
            {isSelected ? <Text style={styles.check}>✓</Text> : null}
          </View>
          <Text style={styles.rowLabel}>{machine.DisplayName || machine.MachineName}</Text>
        </TouchableOpacity>
        {isLine && expanded ? children.map((child) => renderRow(child, depth + 1)) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Machines</Text>
        {plantName ? <Text style={styles.subtitle}>{plantName}</Text> : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.muted}>Loading machines…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {lines.map((line) => renderRow(line))}
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
