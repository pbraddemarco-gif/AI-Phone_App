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
      console.error('Invalid token: token is not a string');
      return null;
    }

    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error(`Invalid JWT format: expected 3 parts, got ${parts.length}`);
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
    console.log('🔍 Decoded JWT payload keys:', Object.keys(parsed));
    return parsed;
  } catch (error) {
    console.error('Failed to decode JWT token:', error);
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
    console.error('Could not decode token');
    return [];
  }

  console.log('📋 Full decoded token payload:', JSON.stringify(decoded, null, 2));

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
      console.log(`✅ Found customer data in token property: "${key}"`);
      accountData = decoded[key as keyof DecodedToken];
      break;
    }
  }

  if (!accountData) {
    console.warn('⚠️ No account information found in token. Available keys:', Object.keys(decoded));
    return [];
  }

  if (!Array.isArray(accountData)) {
    console.warn('⚠️ Account data is not an array:', accountData);
    return [];
  }

  const customers = accountData.map((acc: any) => ({
    Id: acc.Id || acc.id || 0,
    Name: acc.Name || acc.name || 'Unknown',
    DisplayName: acc.DisplayName || acc.displayName || acc.Name || acc.name || 'Unknown',
  }));

  console.log(`✅ Found ${customers.length} customer account(s):`);
  customers.forEach((customer) => {
    console.log(`  - [${customer.Id}] ${customer.Name} (${customer.DisplayName})`);
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
