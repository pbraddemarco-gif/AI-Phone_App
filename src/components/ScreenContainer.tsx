import React from 'react';
import { SafeAreaView, StyleSheet, ViewProps } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
}

export default function ScreenContainer({ children, style, ...rest }: ScreenContainerProps) {
  const theme = useAppTheme();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView style={[styles.inner, style]} {...rest}>
        {children}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  inner: {
    flex: 1,
    padding: 16
  }
});
