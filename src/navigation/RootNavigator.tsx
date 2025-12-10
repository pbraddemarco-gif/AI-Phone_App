/**
 * Root Navigator
 * Conditionally renders Auth or Main app stack based on authentication state
 */

import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthNavigator } from './AuthNavigator';
import HomeScreen from '../screens/HomeScreen';
import DetailsScreen from '../screens/DetailsScreen';
import MachineListScreen from '../screens/MachineListScreen';
import ProductionDashboardScreen from '../screens/ProductionDashboardScreen';
import { MachineShiftComparisonScreen } from '../screens/MachineShiftComparisonScreen';
import PlantLayoutScreen from '../screens/PlantLayoutScreen';
import CustomerSelectorScreen from '../screens/CustomerSelectorScreen';
import ProductionOrdersScreen from '../screens/ProductionOrdersScreen';
import { RootStackParamList } from '../types/navigation';
import { authService } from '../services/authService';
import { DEV_FLAGS } from '../config/devFlags';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const devForceApplied = React.useRef(false);

  // Bootstrap & subscription
  useEffect(() => {
    checkAuthStatus();
    const listener = () => {
      checkAuthStatus();
    };
    authService.addAuthListener(listener);
    return () => authService.removeAuthListener(listener);
  }, []);

  const checkAuthStatus = async () => {
    try {
      if (DEV_FLAGS.FORCE_LOGIN_ON_START && !devForceApplied.current) {
        console.log('🧪 DEV: FORCE_LOGIN_ON_START is enabled — starting at Login');
        setIsAuthenticated(false);
        devForceApplied.current = true;
        return;
      }
      const authenticated = await authService.isAuthenticated();
      console.log(
        '🔍 Auth status check:',
        authenticated ? 'AUTHENTICATED ✅' : 'NOT AUTHENTICATED ❌'
      );
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? 'authenticated' : 'unauthenticated'}
      screenOptions={{ headerShown: true }}
      initialRouteName={isAuthenticated ? 'CustomerSelector' : 'Auth'}
    >
      {isAuthenticated ? (
        // Main app stack for authenticated users
        <>
          <Stack.Screen
            name="CustomerSelector"
            component={CustomerSelectorScreen}
            options={{ title: 'Select Customer', headerShown: false }}
          />
          <Stack.Screen
            name="MachineList"
            component={MachineListScreen}
            options={{ title: 'Machines', headerShown: false }}
          />
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Home' }} />
          <Stack.Screen
            name="ProductionDashboard"
            component={ProductionDashboardScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="MachineShiftComparison"
            component={MachineShiftComparisonScreen}
            options={{ title: 'Shift Comparison' }}
          />
          <Stack.Screen
            name="PlantLayout"
            component={PlantLayoutScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="ProductionOrders"
            component={ProductionOrdersScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen name="Details" component={DetailsScreen} options={{ title: 'Details' }} />
        </>
      ) : (
        // Auth stack for unauthenticated users
        <Stack.Screen name="Auth" component={AuthNavigator} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}
