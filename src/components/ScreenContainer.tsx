import React from 'react';
import { SafeAreaView, StyleSheet, ViewProps, TouchableOpacity, Text } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { DEV_FLAGS } from '../config/devFlags';
import { authService } from '../services/authService';
import { useNavigation } from '@react-navigation/native';

interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
}

export default function ScreenContainer({ children, style, ...rest }: ScreenContainerProps) {
  const theme = useAppTheme();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    try {
      await authService.logout();
    } catch (e) {
      if (__DEV__) console.debug('Logout failed', e);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      {DEV_FLAGS.SHOW_TEMP_LOGOUT_BUTTON && (
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityLabel="Temporary Logout Button"
        >
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      )}
      <SafeAreaView style={[styles.inner, style]} {...rest}>
        {children}
      </SafeAreaView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  inner: {
    flex: 1,
    padding: 16,
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
});
