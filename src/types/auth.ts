/**
 * Authentication types for OAuth token-based authentication
 */

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthError {
  error: string;
  error_description?: string;
}
