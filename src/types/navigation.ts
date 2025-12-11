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
  Actions:
    | {
        machineId?: number;
        machineName?: string;
        customerId?: number;
        customerName?: string;
        plantId?: number;
        plantName?: string;
        selectedMachines?: ActionMachineSelection[];
      }
    | undefined;
  ActionMachinePicker:
    | {
        customerId?: number;
        customerName?: string;
        plantId?: number;
        plantName?: string;
        initialSelected?: ActionMachineSelection[];
        onSelectMachines?: (selections: ActionMachineSelection[]) => void;
      }
    | undefined;
};

export type ActionMachineSelection = {
  machineId: number;
  name: string;
  isLine?: boolean;
  parentLineId?: number | null;
};
