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
    <View style={[styles.container, { backgroundColor: theme.colors.backgroundNeutral }]}>
      <TouchableOpacity
        style={[styles.tab, active === 'current' && { backgroundColor: theme.colors.accent }]}
        onPress={() => onChange('current')}
      >
        <Text
          style={[
            styles.tabText,
            { color: theme.colors.text },
            active === 'current' && { color: theme.colors.textInverse },
          ]}
        >
          Current Shift
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, active === 'last' && { backgroundColor: theme.colors.accent }]}
        onPress={() => onChange('last')}
      >
        <Text
          style={[
            styles.tabText,
            { color: theme.colors.text },
            active === 'last' && { color: theme.colors.textInverse },
          ]}
        >
          Last Shift
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    padding: 4,
    borderRadius: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
