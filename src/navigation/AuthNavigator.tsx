/**
 * Authentication Navigator
 * Stack navigator for unauthenticated screens
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import ProductionDashboardScreen from '../screens/ProductionDashboardScreen';

export type AuthStackParamList = {
  Login: undefined;
  ProductionDashboard: { machineId?: number; machineName?: string } | undefined; // TEMPORARY
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      {/* TEMPORARY: For dev work - remove before production */}
      <Stack.Screen name="ProductionDashboard" component={ProductionDashboardScreen as any} />
    </Stack.Navigator>
  );
}
