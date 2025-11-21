import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { useAppTheme } from './src/hooks/useAppTheme';

export default function App() {
  const theme = useAppTheme();
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
