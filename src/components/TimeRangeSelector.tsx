import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { TimeRangeType, TimeRangeOption } from '../types/api';

interface TimeRangeSelectorProps {
  selectedRange: TimeRangeType;
  onRangeChange: (range: TimeRangeType) => void;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { type: 'hourly', label: 'Hourly', hours: 1 },
  { type: 'daily', label: 'Daily', hours: 24 },
  { type: 'weekly', label: 'Weekly', hours: 168 },
  { type: 'monthly', label: 'Monthly', hours: 720 },
];

export default function TimeRangeSelector({
  selectedRange,
  onRangeChange,
}: TimeRangeSelectorProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      {TIME_RANGE_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.type}
          style={[
            styles.option,
            {
              backgroundColor:
                selectedRange === option.type
                  ? theme.colors.primary
                  : theme.colors.background,
              borderColor: theme.colors.primary,
            },
          ]}
          onPress={() => onRangeChange(option.type)}
        >
          <Text
            style={[
              styles.optionText,
              {
                color:
                  selectedRange === option.type
                    ? '#FFF'
                    : theme.colors.text,
              },
            ]}
          >
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  option: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
