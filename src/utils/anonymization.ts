/**
 * Anonymization utility for demo/test accounts
 * Replaces real customer, plant, and machine names with generic identifiers
 */

import { safeLog } from './logger';

// Test/demo usernames that should see anonymized data
const ANONYMIZED_USERNAMES = ['testuserapp', 'demouser', 'testuser'];

// Cache for consistent mapping (e.g., "Acme Corp" always maps to "Customer1")
const customerMap = new Map<string, string>();
const plantMap = new Map<string, string>();
const machineMap = new Map<string, string>();

let customerCounter = 1;
let plantCounter = 1;
let machineCounter = 1;

/**
 * Check if the current user should see anonymized data
 */
export function shouldAnonymizeData(username: string | null | undefined): boolean {
  if (!username) return false;
  const normalized = username.toLowerCase().trim();
  return ANONYMIZED_USERNAMES.some((testUser) => normalized.includes(testUser));
}

/**
 * Anonymize customer name
 */
export function anonymizeCustomerName(originalName: string): string {
  if (!customerMap.has(originalName)) {
    customerMap.set(originalName, `Customer${customerCounter++}`);
  }
  return customerMap.get(originalName)!;
}

/**
 * Anonymize plant/area name
 */
export function anonymizePlantName(originalName: string): string {
  if (!plantMap.has(originalName)) {
    plantMap.set(originalName, `Plant${plantCounter++}`);
  }
  return plantMap.get(originalName)!;
}

/**
 * Anonymize machine name
 */
export function anonymizeMachineName(originalName: string): string {
  if (!machineMap.has(originalName)) {
    machineMap.set(originalName, `Machine${machineCounter++}`);
  }
  return machineMap.get(originalName)!;
}

/**
 * Anonymize customer account object
 */
export function anonymizeCustomerAccount(account: any): any {
  return {
    ...account,
    Name: anonymizeCustomerName(account.Name),
    DisplayName: anonymizeCustomerName(account.DisplayName),
    Description: `Demo facility ${anonymizeCustomerName(account.Name)}`,
  };
}

/**
 * Anonymize plant/machine object
 */
export function anonymizePlant(plant: any): any {
  return {
    ...plant,
    Name: anonymizePlantName(plant.Name),
    DisplayName: anonymizePlantName(plant.DisplayName),
    Description: plant.Description ? `Demo plant ${anonymizePlantName(plant.Name)}` : null,
  };
}

/**
 * Anonymize machine object
 */
export function anonymizeMachine(machine: any): any {
  return {
    ...machine,
    Name: anonymizeMachineName(machine.Name),
    DisplayName: anonymizeMachineName(machine.DisplayName),
    Description: machine.Description ? `Demo machine ${anonymizeMachineName(machine.Name)}` : null,
    ParentMachineName: machine.ParentMachineName
      ? anonymizePlantName(machine.ParentMachineName)
      : null,
  };
}

/**
 * Reset anonymization mappings (useful for testing)
 */
export function resetAnonymization(): void {
  customerMap.clear();
  plantMap.clear();
  machineMap.clear();
  customerCounter = 1;
  plantCounter = 1;
  machineCounter = 1;
  safeLog('info', '🔄 Anonymization mappings reset');
}
