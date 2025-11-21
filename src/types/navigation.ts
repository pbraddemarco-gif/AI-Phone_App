import { NavigatorScreenParams } from '@react-navigation/native';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Login: undefined;
  Home: undefined;
  Details: { itemId?: string } | undefined;
  ProductionDashboard: undefined;
  MachineShiftComparison: { machineId: number };
};
