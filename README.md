# AI Production Monitor

> Cross-platform production monitoring mobile application built with Expo (React Native) and TypeScript.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Expo SDK](https://img.shields.io/badge/Expo%20SDK-54-000000)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.81-61DAFB)](https://reactnative.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](LICENSE)

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Development](#development)
- [Building & Deployment](#building--deployment)
- [Architecture](#architecture)
- [Documentation](#documentation)
- [Contributing](#contributing)

## Overview

**AI Production Monitor** is a mobile application for real-time monitoring of production facilities, machine performance, and operational metrics. The app provides:

- 📊 Real-time production dashboards
- 🏭 Machine inventory and status tracking
- 📈 Shift comparison and performance analytics
- 📸 Action reporting with photo capture
- 🔐 Secure OAuth authentication
- 🏢 Multi-plant, multi-customer support

### Key Features

- **Production Dashboard**: Real-time metrics, hourly stats, shift comparisons
- **Machine Monitoring**: Status, performance, fault tracking
- **Shift Analytics**: Compare shifts, view trends, analyze downtime
- **Action Management**: Create actions with photo attachments
- **Plant Layout**: Visual facility overview
- **Production Orders**: Track active orders and progress

## Quick Start

### Prerequisites

- Node.js 20+ and npm
- iOS Simulator (macOS) or iOS device for testing
- Expo account ([create one](https://expo.dev/signup))
- EAS CLI for builds

### Installation

```bash
# Clone repository
git clone https://github.com/pbraddemarco-gif/AI-Phone_App.git
cd AI-Phone_App

# Install dependencies
npm install

# Start development server
npm start
```

### Running the App

```bash
# iOS Simulator (macOS only)
npm run ios

# Web browser
npm run web

# With development proxy (for API access)
npm run dev
```

## Development

### Environment Setup

**Development with Local Proxy:**
```bash
# Start proxy + Metro bundler
npm run dev

# Or manually:
# Terminal 1: Start proxy
npm run proxy

# Terminal 2: Set env vars and start Expo
$env:EXPO_PUBLIC_API_BASE="http://localhost:3001/api/data"
$env:EXPO_PUBLIC_AUTH_BASE="http://localhost:3001/api/auth"
npm start
```

**Expo Go (Mobile Testing):**
```bash
npm start
# Scan QR code with Expo Go app
```

### Project Structure

```
src/
├── components/      # Reusable UI components
│   ├── BrandLogo.tsx
│   ├── ProductionChart.tsx
│   └── ...
├── screens/         # Screen components
│   ├── HomeScreen.tsx
│   ├── LoginScreen.tsx
│   ├── ProductionDashboardScreen.tsx
│   └── ...
├── services/        # API clients and business logic
│   ├── apiClient.ts        # Axios instances
│   ├── authService.ts      # Authentication
│   └── ...
├── hooks/           # Custom React hooks
├── navigation/      # React Navigation setup
├── config/          # App configuration
├── types/           # TypeScript type definitions
└── utils/           # Utility functions
    ├── logger.ts           # Safe logging
    └── validation.ts       # Input validation

Configuration:
├── app.json         # Expo app manifest
├── eas.json         # EAS Build profiles
├── tsconfig.json    # TypeScript config
└── package.json     # Dependencies & scripts
```

### Available Scripts

```bash
npm start              # Start Expo dev server
npm run dev            # Start with proxy + dev server
npm run ios            # Run on iOS simulator
npm run android        # Run on Android emulator
npm run web            # Run in web browser

npm run lint           # Run ESLint
npm run lint:fix       # Auto-fix linting issues
npm run typecheck      # TypeScript type checking
npm test               # Run tests (when configured)

npm run proxy          # Start development proxy server
npm run dev:reset      # Clean restart (PowerShell script)
```

### Code Quality

```bash
# Run before committing
npm run typecheck      # Must pass
npm run lint           # Must pass

# CI/CD checks these automatically on PRs
```

## Building & Deployment

### iOS App Store Release

**Full guide:** [IOS_RELEASE_GUIDE.md](IOS_RELEASE_GUIDE.md)

#### Quick Build

```bash
# Install EAS CLI (once)
npm install -g eas-cli
eas login

# Build for TestFlight
eas build --profile preview --platform ios

# Build for App Store
eas build --profile production --platform ios

# Submit to App Store Connect
eas submit --platform ios --latest
```

#### Version Management

```bash
# 1. Update version in app.json and package.json
# Current: 1.0.0

# 2. Commit and tag
git add app.json package.json
git commit -m "chore: bump version to 1.0.1"
git tag v1.0.1
git push origin v1.0.1

# 3. GitHub Actions will automatically build and submit
```

### Build Profiles

| Profile | Use Case | Distribution | Endpoints |
|---------|----------|--------------|-----------|
| `development` | Local dev | Internal | Dev proxy |
| `preview` | TestFlight testing | Internal | Production HTTPS |
| `production` | App Store | Store | Production HTTPS |

### EAS Build Configuration

See [eas.json](eas.json) for detailed configuration.

**Key Settings:**
- Bundle ID: `com.automationintellect.aiproductionmonitor`
- Apple Team ID: `K7RD3CHTQ7`
- App Store ID: `6756504159`
- Auto-increment build numbers: Enabled

## Architecture

### Technology Stack

- **Framework**: Expo SDK 54
- **Language**: TypeScript 5.9
- **UI Library**: React Native 0.81
- **Navigation**: React Navigation 7
- **State Management**: React hooks
- **Charts**: react-native-chart-kit + react-native-svg
- **HTTP Client**: Axios
- **Storage**: Expo SecureStore (iOS Keychain)
- **Build System**: EAS Build

### Authentication Flow

```
User Login
    ↓
OAuth Password Grant (form-urlencoded)
    ↓
JWT Access Token + Customer Accounts
    ↓
Store in SecureStore (iOS Keychain)
    ↓
Auto-inject Bearer token (Axios interceptor)
    ↓
401 Response → Clear token → Redirect to login
```

### API Architecture

**Development Mode:**
```
App → Local Proxy (localhost:3001) → Upstream APIs
```

**Production Mode:**
```
App → HTTPS APIs directly
```

**Endpoints:**
- Auth: `https://app.automationintellect.com/api`
- Data: `https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com`

### Security

- ✅ All production traffic over HTTPS (App Transport Security compliant)
- ✅ Tokens stored in iOS Keychain via Expo SecureStore
- ✅ Safe logging (no PII/tokens in production logs)
- ✅ Input validation on authentication
- ✅ No secrets in repository
- ✅ OAuth client_id is public (safe to hardcode)

**See:** [SECURITY.md](SECURITY.md) for full security documentation.

## Documentation

| Document | Description |
|----------|-------------|
| [IOS_RELEASE_GUIDE.md](IOS_RELEASE_GUIDE.md) | Complete iOS App Store submission guide |
| [SECURITY.md](SECURITY.md) | Security hardening and best practices |
| [CI_CD_SETUP.md](CI_CD_SETUP.md) | GitHub Actions and EAS Build setup |
| [TESTING.md](TESTING.md) | Testing strategy and manual test checklists |
| [BUILD_GUIDE.md](BUILD_GUIDE.md) | Detailed build instructions |
| [STARTUP_GUIDE.md](STARTUP_GUIDE.md) | Development environment setup |

## Contributing

### Development Workflow

1. Create feature branch from `main`
2. Make changes
3. Run `npm run typecheck` and `npm run lint`
4. Commit with conventional commits
5. Push and create PR
6. CI must pass (automatic)
7. Code review
8. Merge to `main`

### Commit Convention

```bash
feat: Add new feature
fix: Bug fix
chore: Maintenance task
docs: Documentation update
refactor: Code refactoring
test: Add tests
style: Code formatting
```

### Branch Strategy

- `main`: Production-ready code
- `develop`: Integration branch (optional)
- `feature/*`: Feature branches
- `release/*`: Release preparation
- `hotfix/*`: Critical production fixes

## Troubleshooting

### Development Issues

**"Network request failed" on login**
- Ensure development proxy is running: `npm run proxy`
- Check proxy health: http://localhost:3001/health
- Verify environment variables are set

**TypeScript errors**
```bash
npm run typecheck  # See full error list
```

**Metro bundler issues**
```bash
# Clear cache and restart
npm run dev:reset
# Or manually:
npx expo start --clear
```

### Build Issues

**EAS build fails**
1. Check build logs in EAS dashboard
2. Verify `eas.json` configuration
3. Run `eas credentials` to check certificates
4. Ensure `npm run typecheck` and `npm run lint` pass locally

**App rejected by Apple**
- Review rejection reason in App Store Connect
- See [IOS_RELEASE_GUIDE.md](IOS_RELEASE_GUIDE.md) troubleshooting section
- Test thoroughly on TestFlight before submitting

## Support & Resources

- **Repository**: https://github.com/pbraddemarco-gif/AI-Phone_App
- **EAS Dashboard**: https://expo.dev/accounts/pbraddemarco-gif/projects/ai-production-monitor
- **App Store Connect**: https://appstoreconnect.apple.com
- **Expo Documentation**: https://docs.expo.dev
- **React Native Docs**: https://reactnative.dev/docs/getting-started

## License

Proprietary - Automation Intellect © 2025

---

**Current Version**: 1.0.0  
**Last Updated**: December 15, 2025  
**Maintainer**: Brad DeMarco (brad.demarco@automationintellect.com)


## API Client

`src/services/apiClient.ts` exports an Axios instance. Replace `baseURL` with your backend URL and extend with custom methods.

## Development Proxy & One-Step Reset (Web CORS Bypass)

See also [STARTUP_GUIDE.md](STARTUP_GUIDE.md) for the full step-by-step.

### Single Command (Recommended)

Use the reset script to kill lingering ports (3001/8081/8082), start the proxy, wait for health, set Expo env vars, and launch Expo:

```bash
npm run dev:reset
```

Flags:

```bash
npm run dev:reset -- --web      # start web target
npm run dev:reset -- --clear    # clear Metro cache
npm run dev:reset -- --web --clear
```

Script: `scripts/reset-dev.ps1` (Windows PowerShell).

### Manual Fallback

1. Install deps (first time): `npm install`
2. Terminal A: `npm run proxy`
3. Terminal B:

```powershell
$env:EXPO_PUBLIC_API_BASE="http://localhost:3001/api/data"
$env:EXPO_PUBLIC_AUTH_BASE="http://localhost:3001/api/auth"
npm start
```

Health check: `http://localhost:3001/health` should return `{ ok: true }`.

Proxy code: `proxy/server.js` maps `/api/data`, `/api/auth`, `/api/plant` to upstreams and injects permissive CORS headers for development.

### Automatic Web Fallback

If you forget env vars on web, the clients fall back to `http://localhost:3001/api/auth` and `http://localhost:3001/api/data`. Ensure the proxy is running (`npm run proxy` or `npm run dev:reset`) or login will fail.

### Legacy Manual Combined Start

You can still run both with the concurrent script:

```bash
npm run dev
```

This uses `concurrently` to run `npm run proxy` and `expo start` together.

## Running the App

```bash
npm install
npm run start
```

Then:

- iPhone: Open Expo Go, scan the QR code from the terminal/web.
- Android: Use Expo Go or press `a` in the terminal to launch an emulator.

## Bitbucket Remote Setup (SSH / PuTTY)

1. Generate SSH key (if not existing) using PuTTYgen:
   - Open PuTTYgen > Generate > Save private key.
   - Copy the public key to Bitbucket (Settings > SSH Keys > Add Key).
2. Test connection:
   ```bash
   ssh -T git@bitbucket.org
   ```
3. Add remote after creating repo:
   ```bash
   git remote add origin <YOUR_BITBUCKET_GIT_URL>
   git push -u origin main
   ```

If using App Password:

1. Create App Password in Bitbucket (Personal Settings > App Passwords).
2. Push using HTTPS and enter username + app password when prompted.

## Git Workflow

```bash
git add .
git commit -m "<commit message>"
git push
```

## Lint & Format

```bash
npm run lint
npx prettier . --write
```

## Type Checking

```bash
npm run typecheck
```

## Notes

- Update `app.json` for app metadata, icons, and splash screens.
- Extend theme or add context providers in `App.tsx` as the app grows.

---

Initial setup generated by automated assistant.
