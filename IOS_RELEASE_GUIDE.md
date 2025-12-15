# iOS App Store Release Guide

## Prerequisites

### Required Accounts & Access

- ✅ Apple Developer Account (Team ID: `K7RD3CHTQ7`)
- ✅ EAS Account with project access
- ✅ App Store Connect access (App ID: `6756504159`)
- ✅ Git repository access

### Required Tools

```bash
npm install -g eas-cli
eas login
eas whoami  # Verify authentication
```

### Apple Developer Setup

1. **Certificates & Provisioning**
   - EAS automatically manages certificates and profiles
   - Ensure you have "Admin" or "App Manager" role in Apple Developer account
2. **App Store Connect**
   - App already registered: `com.automationintellect.aiproductionmonitor`
   - App ID: `6756504159`

---

## Build Profiles

### Development

```bash
eas build --profile development --platform ios
```

- Development client
- Internal distribution
- Simulator support
- Uses dev proxy endpoints

### Preview (TestFlight Internal)

```bash
eas build --profile preview --platform ios
```

- Release build configuration
- Internal distribution
- Device only (no simulator)
- Production HTTPS endpoints

### Production (App Store)

```bash
eas build --profile production --platform ios
```

- Release build
- App Store distribution
- Auto-increments build number
- Production HTTPS endpoints
- No debug menus or dev tools

---

## Release Workflow

### Step 1: Pre-Release Checklist

**Code Quality**

- [ ] All TypeScript errors fixed: `npm run typecheck`
- [ ] All linting errors fixed: `npm run lint`
- [ ] All tests passing (once implemented)
- [ ] No console.logs in production code
- [ ] Environment variables set for production

**Version Management**

- [ ] Update version in `app.json` (currently `1.0.0`)
- [ ] Update version in `package.json` (currently `1.0.0`)
- [ ] Build number auto-increments via EAS
- [ ] Update `CHANGELOG.md` with release notes

**iOS-Specific**

- [ ] App icon (1024x1024) in `assets/icon.png`
- [ ] Splash screen in `assets/splash.png`
- [ ] Privacy manifest reviewed: `PrivacyInfo.xcprivacy`
- [ ] Permission descriptions reviewed in `app.json`
- [ ] Bundle ID correct: `com.automationintellect.aiproductionmonitor`

**Security**

- [ ] All endpoints use HTTPS
- [ ] No secrets in repository
- [ ] Tokens stored in SecureStore
- [ ] Safe logging implemented

### Step 2: Build for TestFlight

```bash
# Clean install dependencies
npm ci

# Verify configuration
npm run typecheck
npm run lint

# Build for preview (TestFlight internal testing)
eas build --profile preview --platform ios

# Build for production (external TestFlight + App Store)
eas build --profile production --platform ios
```

**Build Process:**

1. EAS uploads source to cloud build servers
2. Installs dependencies in clean environment
3. Generates native iOS project
4. Compiles with Xcode
5. Signs with distribution certificate
6. Returns `.ipa` file

**Monitor Build:**

- View progress: https://expo.dev/accounts/pbraddemarco-gif/projects/ai-production-monitor/builds
- Receive email notification on completion
- Typical build time: 10-15 minutes

### Step 3: Submit to TestFlight

**Automatic Submission (Recommended):**

```bash
eas submit --platform ios --latest
```

EAS will:

- Download latest successful build
- Upload to App Store Connect
- Submit for App Review (beta)

**Manual Submission:**

1. Download `.ipa` from EAS dashboard
2. Open Xcode → Window → Transporter
3. Add `.ipa` file
4. Click "Deliver"

**TestFlight Review:**

- Apple reviews for TestFlight (1-2 days)
- Internal testers can test immediately
- External testers need App Review approval

### Step 4: TestFlight Testing

**Internal Testing (up to 100 testers):**

- No App Review required
- Instant access after build upload
- Use TestFlight app on iOS device
- Testers need Apple ID invited in App Store Connect

**External Testing (unlimited):**

- Requires App Review
- Public link available
- Use for broader beta testing

**Test Checklist:**

- [ ] App launches successfully
- [ ] Login works with production credentials
- [ ] All screens accessible
- [ ] Camera/photo picker works
- [ ] Data loads correctly
- [ ] No crashes or freezes
- [ ] Performance acceptable
- [ ] Works on iPhone & iPad

### Step 5: Submit to App Store

**In App Store Connect:**

1. Go to https://appstoreconnect.apple.com
2. Select "AI Production Monitor"
3. Click "+ Version or Platform" → "iOS"
4. Enter version number (e.g., `1.0.0`)
5. Fill out App Information:
   - **Screenshots** (required for iPhone, iPad)
   - **Description** (production monitoring capabilities)
   - **Keywords** (production, monitoring, manufacturing, AI)
   - **Support URL** (company website or support page)
   - **Marketing URL** (optional)
   - **Privacy Policy URL** (required)
   - **Category** (Business or Productivity)
   - **Age Rating** (4+, no objectionable content)
6. Select build from TestFlight
7. Complete "App Review Information"
   - Demo account credentials (for reviewers)
   - Notes for review
8. Click "Submit for Review"

**Review Time:**

- Typical: 24-48 hours
- Can be expedited for critical bugs

### Step 6: Release Management

**Phased Release (Recommended):**

- Enable in App Store Connect
- Gradual rollout over 7 days
- Monitor for issues
- Can pause/cancel if problems arise

**Immediate Release:**

- Available to all users instantly
- Higher risk if bugs present

---

## Version Management Strategy

### Semantic Versioning

- **Major** (1.x.x): Breaking changes, major new features
- **Minor** (x.1.x): New features, backwards compatible
- **Patch** (x.x.1): Bug fixes, minor improvements

### Build Numbers

- Managed automatically by EAS (`autoIncrement: true`)
- Increments on each production build
- Never reuse build numbers

### Version Update Process

1. Update `app.json` → `expo.version`
2. Update `package.json` → `version`
3. Commit changes
4. Tag in Git: `git tag v1.0.0`
5. Push: `git push --tags`
6. Build with EAS

---

## Troubleshooting

### Build Fails

```bash
# Check build logs in EAS dashboard
# Common issues:
# - TypeScript errors
# - Missing dependencies
# - Invalid app.json configuration

# Local validation before building:
npm run typecheck
npm run lint
npx expo-doctor
```

### Submission Fails

- Check Apple Developer account status
- Verify certificates not expired
- Ensure App ID matches Bundle ID
- Check EAS credentials: `eas credentials`

### App Rejected by Review

Common rejection reasons:

1. **Crash on launch** - Test thoroughly on TestFlight
2. **Missing features** - Demo account must show full functionality
3. **Privacy violations** - Ensure privacy manifest accurate
4. **Guideline violations** - Follow Apple Human Interface Guidelines

### Certificate Issues

```bash
# View current credentials
eas credentials

# Revoke and regenerate
eas credentials --platform ios
# Select "Revoke and regenerate"
```

---

## Environment Variables in Production

Production builds automatically use HTTPS endpoints (configured in `eas.json`):

- `EXPO_PUBLIC_API_BASE`: `https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com`
- `EXPO_PUBLIC_AUTH_BASE`: `https://app.automationintellect.com/api`

**No secrets in app bundle** - all authentication is runtime via user login.

---

## Testing Production Build Locally

### iOS Simulator (Preview Build)

```bash
# Build for simulator
eas build --profile preview --platform ios --local

# Install on simulator
xcrun simctl install booted <path-to-ipa>
```

### iOS Device (TestFlight)

1. Build with `--profile production`
2. Submit to TestFlight
3. Install via TestFlight app
4. Test on physical device

---

## Post-Release

### Monitor Crashes

- Use Xcode Organizer for crash logs
- Check App Store Connect → Analytics
- Consider adding crash reporting (Sentry, BugSnag)

### Update Checklist

When releasing updates:

1. Increment version in `app.json` and `package.json`
2. Update App Store screenshots if UI changed
3. Write release notes in App Store Connect
4. Test on TestFlight before releasing
5. Consider phased release for safety

---

## Quick Reference Commands

```bash
# Build for TestFlight/App Store
eas build --profile production --platform ios

# Submit to App Store Connect
eas submit --platform ios --latest

# Check build status
eas build:list

# View credentials
eas credentials

# Local build (for testing)
eas build --profile production --platform ios --local

# Check configuration
npx expo-doctor
```

---

## Support & Resources

- **EAS Documentation**: https://docs.expo.dev/build/introduction/
- **App Store Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **TestFlight**: https://developer.apple.com/testflight/
- **App Store Connect**: https://appstoreconnect.apple.com
- **EAS Dashboard**: https://expo.dev/accounts/pbraddemarco-gif/projects/ai-production-monitor

---

## Security Notes

- **Never commit certificates or provisioning profiles** - EAS manages these securely
- **Use EAS Secrets** for sensitive build-time variables (if needed in future)
- **Rotate credentials** if ever compromised
- **Enable 2FA** on Apple Developer account
- **Review app permissions** regularly in `app.json`
