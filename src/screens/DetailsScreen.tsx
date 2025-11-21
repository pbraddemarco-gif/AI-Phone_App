import React from 'react';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../types/navigation';
import CommonButton from '../components/CommonButton';
import ScreenContainer from '../components/ScreenContainer';

export type DetailsScreenProps = NativeStackScreenProps<RootStackParamList, 'Details'>;

export default function DetailsScreen({ navigation, route }: DetailsScreenProps) {
  const { itemId } = route.params || {};
  return (
    <ScreenContainer>
      <Text style={{ fontSize: 20, marginBottom: 16 }}>Details Screen</Text>
      {itemId && <Text style={{ marginBottom: 16 }}>Item ID: {itemId}</Text>}
      <CommonButton label="Go Back" onPress={() => navigation.goBack()} />
    </ScreenContainer>
  );
}
