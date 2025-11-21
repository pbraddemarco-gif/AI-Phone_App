import React from 'react';
import { TouchableOpacity, Text, StyleSheet, GestureResponderEvent } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface CommonButtonProps {
  label: string;
  onPress: (event: GestureResponderEvent) => void;
}

export default function CommonButton({ label, onPress }: CommonButtonProps) {
  const theme = useAppTheme();
  return (
    <TouchableOpacity style={[styles.button, { backgroundColor: theme.colors.primary }]} onPress={onPress}>
      <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center'
  },
  label: {
    fontSize: 16,
    fontWeight: '600'
  }
});
