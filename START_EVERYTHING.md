# Start Everything - Development Setup

## Quick Start

Run this command to start both the proxy and Expo dev server:

```powershell
npm run start:everything
```

Or directly:

```powershell
.\start-everything.ps1
```

## What It Does

1. **Cleans up** - Stops any existing node processes on ports 3001 and 8081
2. **Starts Proxy** - Launches the development proxy server in a separate window on `localhost:3001`
3. **Verifies Proxy** - Waits and confirms the proxy is running
4. **Starts Expo** - Launches the Expo dev server on `localhost:8081`

## Access Points

- **Web App**: http://localhost:8081
- **Proxy Health**: http://localhost:3001/health
- **Metro Bundler**: http://localhost:8081

## Important Notes

- **Do not close the proxy window** - It must stay open for the app to work
- **Web requires proxy** - The web version uses the proxy to avoid CORS issues
- **Native apps** - iOS/Android connect directly to APIs (no proxy needed)

## Manual Start (If Needed)

If you need to start components separately:

### Start Proxy Only

```powershell
node proxy\server.js
```

### Start Expo Only

```powershell
npm start
```

## Troubleshooting

### Proxy won't start

- Check if port 3001 is already in use: `Get-NetTCPConnection -LocalPort 3001`
- Kill the process: `Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process -Force`

### Expo won't start

- Check if port 8081 is already in use
- Try clearing cache: `npx expo start --clear`

### Login hangs

- Verify proxy is running: http://localhost:3001/health
- Check the proxy window for errors
- Restart everything: `npm run start:everything`
