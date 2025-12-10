/**
 * Authentication types for OAuth token-based authentication
 */

export interface CustomerAccount {
  Id: number;
  Name: string; // Company name
  DisplayName: string; // Plant name
  ParentId?: number; // Parent machine/plant ID
  MachineId?: number; // Machine ID for this plant
  [key: string]: any; // Allow additional fields
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  account?: CustomerAccount[]; // Customer accounts from API response
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthError {
  error: string;
  error_description?: string;
}
