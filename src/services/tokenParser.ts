/**
 * JWT Token Parser
 * Parses JWT tokens to extract customer/account information
 */

export interface CustomerAccount {
  Id: number;
  Name: string; // Company name
  DisplayName: string; // Plant name
}

export interface DecodedToken {
  account?: CustomerAccount[];
  Account?: CustomerAccount[];
  accounts?: CustomerAccount[];
  Accounts?: CustomerAccount[];
  CustomerAccounts?: CustomerAccount[];
  customerAccounts?: CustomerAccount[];
  exp?: number;
  iss?: string;
  aud?: string;
  sub?: string;
  [key: string]: any; // Allow any other properties
}

/**
 * Decode a JWT token without verification
 * @param token - The JWT token string
 * @returns Decoded token payload
 */
export function decodeJwtToken(token: string): DecodedToken | null {
  try {
    if (!token || typeof token !== 'string') {
      if (__DEV__) console.debug('⚠️ Token is not a string or empty');
      return null;
    }

    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      if (__DEV__)
        console.debug(
          `⚠️ Token is not in JWT format (has ${parts.length} parts instead of 3) - skipping decode`
        );
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];

    // Base64 decode - handle URL-safe base64
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    const paddedBase64 = base64 + '=='.substring(0, (4 - (base64.length % 4)) % 4);

    // Decode using atob (browser) or Buffer (Node.js)
    let decoded: string;
    if (typeof atob !== 'undefined') {
      // Browser environment
      decoded = atob(paddedBase64);
    } else {
      // Node.js environment (for testing)
      decoded = Buffer.from(paddedBase64, 'base64').toString('utf-8');
    }

    const parsed = JSON.parse(decoded);
    if (__DEV__) console.debug('🔍 Decoded JWT payload keys:', Object.keys(parsed));
    return parsed;
  } catch (error) {
    if (__DEV__) console.debug('Failed to decode JWT token:', error);
    return null;
  }
}

/**
 * Extract customer accounts from JWT token
 * @param token - The JWT token string
 * @returns Array of customer accounts
 */
export function extractCustomerAccounts(token: string): CustomerAccount[] {
  const decoded = decodeJwtToken(token);

  if (!decoded) {
    if (__DEV__) console.debug('Could not decode token');
    return [];
  }

  if (__DEV__) console.debug('📋 Full decoded token payload:', JSON.stringify(decoded, null, 2));

  // Try different possible property names for customer accounts
  const possibleKeys = [
    'account',
    'Account',
    'accounts',
    'Accounts',
    'CustomerAccounts',
    'customerAccounts',
  ];
  let accountData: any = null;

  for (const key of possibleKeys) {
    if (decoded[key as keyof DecodedToken]) {
      if (__DEV__) console.debug(`✅ Found customer data in token property: "${key}"`);
      accountData = decoded[key as keyof DecodedToken];
      break;
    }
  }

  if (!accountData) {
    if (__DEV__)
      console.debug(
        '⚠️ No account information found in token. Available keys:',
        Object.keys(decoded)
      );
    return [];
  }

  if (!Array.isArray(accountData)) {
    if (__DEV__) console.debug('⚠️ Account data is not an array:', accountData);
    return [];
  }

  const customers = accountData.map((acc: any) => ({
    Id: acc.Id || acc.id || 0,
    Name: acc.Name || acc.name || 'Unknown',
    DisplayName: acc.DisplayName || acc.displayName || acc.Name || acc.name || 'Unknown',
  }));

  if (__DEV__) console.debug(`✅ Found ${customers.length} customer account(s):`);
  customers.forEach((customer) => {
    if (__DEV__) console.debug(`  - [${customer.Id}] ${customer.Name} (${customer.DisplayName})`);
  });

  return customers;
}

/**
 * Get a specific customer by ID
 * @param token - The JWT token string
 * @param customerId - The customer ID to find
 * @returns Customer account or null
 */
export function getCustomerById(token: string, customerId: number): CustomerAccount | null {
  const customers = extractCustomerAccounts(token);
  return customers.find((c) => c.Id === customerId) || null;
}

/**
 * Get the username from the JWT token
 * @param token - The JWT token string
 * @returns Username string or null if not found
 */
export function getUsernameFromToken(token: string): string | null {
  console.log('🔍 getUsernameFromToken called');
  const decoded = decodeJwtToken(token);

  if (!decoded) {
    console.log('❌ Token decode failed');
    return null;
  }

  console.log('✅ Token decoded successfully. Keys:', Object.keys(decoded));
  console.log('🔎 Checking username claims:');
  console.log('  - unique_name:', decoded.unique_name);
  console.log('  - preferred_username:', decoded.preferred_username);
  console.log('  - username:', decoded.username);
  console.log('  - name:', decoded.name);
  console.log('  - email:', decoded.email);
  console.log('  - sub:', decoded.sub);

  // Try common JWT username claims in order of preference
  const result =
    decoded.unique_name ||
    decoded.preferred_username ||
    decoded.username ||
    decoded.name ||
    decoded.email ||
    decoded.sub ||
    null;

  console.log('📤 Returning username:', result);
  return result;
}

/**
 * Check if token has expired
 * @param token - The JWT token string
 * @returns True if expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwtToken(token);

  if (!decoded || !decoded.exp) {
    return true;
  }

  // exp is in seconds, Date.now() is in milliseconds
  const expirationTime = decoded.exp * 1000;
  const currentTime = Date.now();

  return currentTime >= expirationTime;
}
