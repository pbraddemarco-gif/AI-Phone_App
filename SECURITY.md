# Security Hardening Documentation

## Overview
This document outlines the security measures implemented for iOS App Store submission.

## 🔒 Security Measures Implemented

### 1. Transport Security (ATS Compliance)
- ✅ **All production endpoints use HTTPS**
  - Auth API: `https://app.automationintellect.com/api`
  - Data API: `https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com`
- ✅ HTTP allowed only in development mode via local proxy
- ✅ Environment validation enforces HTTPS in production

### 2. Secure Token Storage
- ✅ **iOS**: Uses Expo SecureStore (backed by iOS Keychain)
- ✅ **Android**: Uses Expo SecureStore (backed by EncryptedSharedPreferences)
- ⚠️ **Web**: Falls back to localStorage (acceptable for development, not recommended for production)
- ✅ Tokens are never logged or exposed in production builds

### 3. Safe Logging
- ✅ `src/utils/logger.ts` provides sanitized logging
- ✅ Sensitive fields automatically redacted:
  - Tokens (JWT, Bearer, access_token, refresh_token)
  - Passwords
  - API keys
  - Authorization headers
- ✅ Production builds only log warnings and errors
- ✅ Development logs never include full token values

### 4. Input Validation
- ✅ `src/utils/validation.ts` provides validation utilities
- ✅ Login inputs validated for:
  - Username format and length (3-100 chars)
  - Password strength (8-128 chars)
  - Type safety
- ✅ XSS prevention via string sanitization
- ✅ Filename sanitization prevents path traversal

### 5. Error Handling
- ✅ User-friendly error messages without sensitive details
- ✅ HTTP status codes mapped to safe messages:
  - 401/403 → "Invalid username or password"
  - 429 → "Too many attempts"
  - 5xx → "Server error"
  - Network → "Please check connection"
- ✅ Detailed errors only in development mode

### 6. Secret Management
- ✅ Enhanced `.gitignore` prevents committing:
  - `.env*` files
  - Certificate files (`.pem`, `.p12`, `.mobileprovision`)
  - Keystore files
  - Service account keys
- ✅ CLIENT_ID is the only hardcoded credential (public OAuth client ID - safe)
- ✅ No API keys, secrets, or passwords in repository

### 7. API Security
- ✅ Automatic Bearer token injection via Axios interceptors
- ✅ 401 responses automatically clear invalid tokens
- ✅ 30-second timeout prevents hanging requests
- ✅ CORS handled by development proxy only

## 🚨 Known Limitations & Mitigation

### Web Platform Token Storage
**Issue**: Web uses `localStorage` instead of encrypted storage  
**Mitigation**: 
- Development/testing only
- Not recommended for production web deployment
- Mobile apps (iOS/Android) use secure storage

**Future**: Consider implementing cookie-based auth for web with HttpOnly, Secure flags

### Hardcoded CLIENT_ID
**Issue**: OAuth CLIENT_ID is in source code  
**Risk Level**: LOW - This is a public identifier for OAuth password grant  
**Mitigation**: 
- CLIENT_ID is designed to be public (not a secret)
- Password grant uses username/password for authentication
- No client_secret is used or stored

## 🔐 Security Checklist for Release

- [x] All production endpoints use HTTPS
- [x] Tokens stored in secure storage (iOS Keychain)
- [x] No secrets in repository
- [x] Safe logging implemented
- [x] Input validation on auth endpoints
- [x] Error messages don't leak sensitive info
- [x] .gitignore prevents secret commits
- [ ] Enable Code Signing (handled by EAS Build)
- [ ] Set up automatic certificate rotation (via EAS)
- [ ] Implement certificate pinning (optional, advanced)
- [ ] Add rate limiting on backend (backend responsibility)

## 📝 Secrets Rotation Guide

If any credentials are ever compromised:

1. **Access Token Compromise**
   - User should logout and login again (clears old token)
   - Token expires automatically (check token TTL on backend)

2. **Backend API Keys**
   - Rotate on backend service
   - No mobile app update required

3. **OAuth CLIENT_ID**
   - Update `src/services/authService.ts` line 18
   - Rebuild and redeploy app
   - Consider environment variable for future

4. **Apple Team/Bundle ID**
   - Update `app.json` ios.bundleIdentifier
   - Update `eas.json` submit credentials
   - Coordinate with Apple Developer account admin

## 🔍 Security Testing Commands

```bash
# Check for potential secrets in codebase
git grep -i "password\|secret\|api_key" --exclude-dir=node_modules

# Search for hardcoded URLs with credentials
git grep -E "(https?://[^:]+:[^@]+@|api[_-]?key|secret[_-]?key)" --exclude-dir=node_modules

# Verify HTTPS enforcement
npm run typecheck
npm run lint

# Test token storage (should not appear in logs)
npm run start
# Login and verify console doesn't show full tokens
```

## 📚 References

- [Expo SecureStore Documentation](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [iOS App Transport Security](https://developer.apple.com/documentation/security/preventing_insecure_network_connections)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security Best Practices](https://reactnative.dev/docs/security)
