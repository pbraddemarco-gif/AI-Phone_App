import { NavigatorScreenParams } from '@react-navigation/native';
import type { AuthStackParamList } from '../navigation/AuthNavigator';

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Login: undefined;
  Home: undefined;
  Details: { itemId?: string } | undefined;
  CustomerSelector: undefined;
  MachineList: undefined;
  ProductionDashboard: { machineId?: number; machineName?: string; partsHourlyGoal?: number };
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
        selectedUsers?: ActionUserSelection[];
        selectedTemplateId?: number;
        returnScrollY?: number;
      }
    | undefined;
  Actions2:
    | {
        actionId?: number;
        actionData?: any;
        selectedMachines?: ActionMachineSelection[];
        selectedUsers?: ActionUserSelection[]; // legacy
        relatedUsers?: ActionUserSelection[];
        assignedUsers?: ActionUserSelection[];
        selectedTemplateId?: number;
        returnScrollY?: number;
        fieldName?: string;
        selectionType?: 'assigned' | 'related';
      }
    | undefined;
  ActionMachinePicker:
    | {
        customerId?: number;
        customerName?: string;
        plantId?: number;
        plantName?: string;
        initialSelected?: ActionMachineSelection[];
        selectedTemplateId?: number;
        actionId?: number;
        actionData?: any;
        onSelectMachines?: (selections: ActionMachineSelection[]) => void;
        returnScrollY?: number;
      }
    | undefined;
  ActionUserPicker:
    | {
        machineId: number;
        machineName?: string;
        initialSelected?: ActionUserSelection[];
        customerId?: number;
        customerName?: string;
        plantId?: number;
        plantName?: string;
        selectedMachines?: ActionMachineSelection[];
        selectedTemplateId?: number;
        actionId?: number;
        actionData?: any;
        onSelectUsers?: (selections: ActionUserSelection[]) => void;
        returnScrollY?: number;
        fieldName?: string;
        selectionType?: 'assigned' | 'related';
        singleSelect?: boolean;
      }
    | undefined;
  ActionList: { reload?: boolean } | undefined;
};

export type ActionMachineSelection = {
  machineId: number;
  name: string;
  isLine?: boolean;
  parentLineId?: number | null;
};

export type ActionUserSelection = {
  userId: number;
  name: string;
  username?: string;
};
