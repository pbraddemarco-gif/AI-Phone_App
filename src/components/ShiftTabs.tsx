import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface ShiftTabsProps {
  active: 'current' | 'last';
  onChange: (value: 'current' | 'last') => void;
}

export const ShiftTabs: React.FC<ShiftTabsProps> = ({ active, onChange }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, active === 'current' && { backgroundColor: theme.colors.primary }]}
        onPress={() => onChange('current')}
      >
        <Text style={[styles.tabText, active === 'current' && { color: '#FFF' }]}>Current Shift</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, active === 'last' && { backgroundColor: theme.colors.primary }]}
        onPress={() => onChange('last')}
      >
        <Text style={[styles.tabText, active === 'last' && { color: '#FFF' }]}>Last Shift</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    paddingVertical: 10,
    alignItems: 'center'
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937'
  }
});
