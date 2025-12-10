import React from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import CommonButton from '../components/CommonButton';
import ScreenContainer from '../components/ScreenContainer';

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Welcome to AI Mobile App</Text>
      <CommonButton
        label="Production Dashboard"
        onPress={() => navigation.navigate('ProductionDashboard', {})}
      />
      <CommonButton
        label="Shift Comparison"
        onPress={() => navigation.navigate('MachineShiftComparison', { machineId: 775 })}
      />
      <CommonButton
        label="Go to Details"
        onPress={() => navigation.navigate('Details', { itemId: '123' })}
      />
    </ScreenContainer>
  );
}
