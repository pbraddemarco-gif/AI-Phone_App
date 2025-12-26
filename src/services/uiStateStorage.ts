import { MachineInventoryItem } from './machineInventoryService';
import { MachineUser } from './machineUserService';

export type Actions2State = {
  formData: Record<string, any>;
  actionName: string;
  selectedMachines: MachineInventoryItem[];
  selectedUsers: MachineUser[];
  assignedUser: MachineUser | null;
  selectedTemplateId?: number;
  shifts: any[];
  scrollY?: number;
};

let actions2State: Actions2State | null = null;

export function saveActions2State(state: Actions2State) {
  actions2State = { ...state };
}

export function loadActions2State(): Actions2State | null {
  return actions2State;
}

export function clearActions2State() {
  actions2State = null;
}
