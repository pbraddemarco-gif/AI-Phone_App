import { NavigatorScreenParams } from '@react-navigation/native';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Login: undefined;
  Home: undefined;
  Details: { itemId?: string } | undefined;
  CustomerSelector: undefined;
  MachineList: undefined;
  ProductionDashboard: { machineId?: number; machineName?: string };
  MachineShiftComparison: { machineId: number };
  PlantLayout: { machineId?: number; machineName?: string };
  ProductionOrders: undefined;
};
