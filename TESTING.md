# Testing Strategy

## Current Status

### Unit Tests (Partially Implemented)

Due to Expo SDK 54's "winter" runtime requirements, full Jest integration tests require additional configuration. Test files have been created in:

- `src/utils/__tests__/validation.test.ts`
- `src/utils/__tests__/logger.test.ts`
- `src/services/__tests__/tokenStorage.test.ts`

**Resolution for App Store Release:**

- TypeScript compilation + lint checks provide basic correctness validation
- Manual testing on TestFlight provides functional validation
- Post-launch: Configure jest-expo with proper Expo modules mocking

### Quality Assurance for Release

**Pre-Build Checks (Automated):**

```bash
npm run typecheck   # TypeScript validation
npm run lint        # ESLint code quality
```

**Manual Testing Checklist:**

1. **Authentication Flow**
   - [ ] Login with valid credentials
   - [ ] Login with invalid credentials (proper error)
   - [ ] Logout clears session
   - [ ] Token persists across app restarts

2. **Production Data**
   - [ ] Machine list loads
   - [ ] Production metrics display correctly
   - [ ] Shift data shows accurate charts
   - [ ] Real-time updates work

3. **Actions/Media**
   - [ ] Camera picker works
   - [ ] Photo library picker works
   - [ ] File upload completes successfully

4. **Error Handling**
   - [ ] Network offline shows appropriate message
   - [ ] Invalid API responses don't crash app
   - [ ] 401 redirects to login

5. **iOS Specific**
   - [ ] App launches on iPhone
   - [ ] App launches on iPad
   - [ ] Permissions requested properly
   - [ ] No crashes during normal usage
   - [ ] Rotation works (if supported)

## Testing Commands

### Static Analysis

```bash
# Type checking (catches ~80% of bugs)
npm run typecheck

# Linting (code quality)
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

### Build Validation

```bash
# Development build
eas build --profile development --platform ios

# Production build (for App Store)
eas build --profile production --platform ios
```

### Runtime Testing

```bash
# Local development
npm run start

# With proxy (for testing against staging)
npm run dev
```

## Future Testing Improvements

### Post-Launch Priorities

1. **Fix Jest Configuration**
   - Configure jest-expo for SDK 54
   - Mock Expo modules properly
   - Add React Native Testing Library

2. **E2E Tests**
   - Detox for iOS native E2E tests
   - Cover critical user flows
   - Run in CI/CD pipeline

3. **Integration Tests**
   - API contract tests
   - Token refresh flow
   - Offline mode

4. **Visual Regression**
   - Screenshot tests for key screens
   - Ensure UI consistency

### Recommended Tools

- **Detox**: E2E testing for React Native
- **React Native Testing Library**: Component testing
- **MSW (Mock Service Worker)**: API mocking
- **Maestro**: Mobile UI testing (alternative to Detox)

## Test Coverage Goals

Current: ~0% (manual testing only)
Target Post-Launch:

- Unit tests: 60%+ coverage
- Integration tests: Critical paths
- E2E tests: Happy path + error scenarios

## CI/CD Testing

GitHub Actions workflow (see `.github/workflows/ci.yml`) runs:

- `npm run typecheck`
- `npm run lint`
- (Future) `npm test`
- (Future) `eas build --profile preview` on PR

## Known Testing Limitations

1. **Expo SecureStore**: Can't be fully tested in Jest without native env
   - Mitigation: Test on real devices via TestFlight

2. **React Navigation**: Requires full React Native environment
   - Mitigation: Component contracts tested, full flow tested manually

3. **Camera/Image Picker**: Native modules require device
   - Mitigation: TestFlight testing required

4. **Network Requests**: Axios interceptors hard to mock
   - Mitigation: Use MSW in future for API mocking

## Testing Best Practices

1. **Every PR Should:**
   - Pass `npm run typecheck`
   - Pass `npm run lint`
   - Be manually tested on device

2. **Before TestFlight:**
   - Run full manual checklist
   - Test on multiple device sizes
   - Test in airplane mode

3. **Before App Store:**
   - Full regression testing
   - Performance testing
   - Accessibility testing
   - Multiple iOS versions (if possible)

## Manual Test Execution Log

**Template for TestFlight Testers:**

```
Build: ___
iOS Version: ___
Device: ___
Date: ___

[ ] Login successful
[ ] Data loads correctly
[ ] Camera works
[ ] No crashes
[ ] Performance acceptable

Issues Found:
1. ___
2. ___
```

## Automated Smoke Test Script

See `scripts/smoke-test.sh` (to be created) for automated smoke tests that can run on CI.
