import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList, ActionUserSelection } from '../types/navigation';
import { useAppTheme } from '../hooks/useAppTheme';
import { getUsersForMachine } from '../services/machineUserService';
import { safeLog } from '../utils/logger';

export type ActionUserPickerProps = NativeStackScreenProps<RootStackParamList, 'ActionUserPicker'>;

export default function ActionUserPickerScreen({ navigation, route }: ActionUserPickerProps) {
  const theme = useAppTheme();
  const { machineId, initialSelected, onSelectUsers } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<ActionUserSelection[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const defaults = new Set<number>();
    (initialSelected || []).forEach((u) => defaults.add(u.userId));
    setSelected(defaults);
  }, [initialSelected]);

  useEffect(() => {
    if (!machineId) {
      setError('Missing machine. Please select a machine first.');
      safeLog('warn', 'UserPicker: missing machineId');
      return;
    }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('🔍 UserPicker: Fetching users for machine:', machineId);
        safeLog('debug', 'UserPicker: fetching users', { machineId });
        const items = await getUsersForMachine(machineId);
        const mapped: ActionUserSelection[] = (items || []).map((u) => ({
          userId: u.Id,
          name: u.DisplayName || u.Name || u.Username || `User ${u.Id}`,
          username: u.Username,
        }));
        setUsers(mapped);
        console.log('✅ UserPicker: Loaded', mapped.length, 'users');
        safeLog('debug', 'UserPicker: users loaded', { count: mapped.length });
      } catch (e: any) {
        safeLog('error', 'UserPicker: failed to load users', { message: e?.message });
        setError(e?.message || 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [machineId]);

  const toggleSelect = (userId: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleSave = () => {
    const selections: ActionUserSelection[] = users.filter((u) => selected.has(u.userId));
    safeLog('debug', 'UserPicker: save selections', {
      count: selections.length,
      ids: selections.map((s) => s.userId),
    });
    if (onSelectUsers) onSelectUsers(selections);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.muted}>Loading users…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContainer}>
          {users.length ? (
            users.map((u) => (
              <TouchableOpacity
                key={u.userId}
                style={[styles.row, selected.has(u.userId) && styles.rowSelected]}
                onPress={() => toggleSelect(u.userId)}
              >
                <View style={styles.rowLeft}>
                  <View style={styles.checkbox}>
                    {selected.has(u.userId) ? <Text style={styles.check}>✓</Text> : null}
                  </View>
                  <Text style={styles.rowLabel}>{u.name}</Text>
                </View>
                {u.username ? <Text style={styles.secondary}>{u.username}</Text> : null}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.muted}>No users found for this machine.</Text>
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
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#111827' },
  subtitle: { color: '#6B7280', marginTop: 4 },
  listContainer: { paddingHorizontal: 12, paddingBottom: 80 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 40 },
  muted: { color: '#6B7280', marginTop: 8 },
  errorText: { color: '#B91C1C', fontSize: 14 },
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
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  rowSelected: { borderColor: '#2563EB', backgroundColor: '#EFF6FF' },
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
  check: { color: '#2563EB', fontWeight: '800' },
  rowLabel: { fontSize: 14, color: '#111827' },
  secondary: { fontSize: 12, color: '#6B7280' },
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
  footerButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  footerCancel: {
    width: 120,
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerCancelText: { color: '#111827', fontWeight: '700' },
});
