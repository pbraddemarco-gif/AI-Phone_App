# Stable Startup Guide (Windows)

Follow these steps each time to start the proxy and Expo reliably.

## Prerequisites (one-time)

- Node + npm installed; run `npm install` in the repo once to install dependencies.
- PowerShell allowed to run local scripts (handled via `npm run dev:reset`).

## Standard Start (recommended)

From the repo root (`C:\Dev\AI-Phone_App`):

```powershell
npm run dev:reset
```

Flags:

- `npm run dev:reset -- --web` to open the web target.
- `npm run dev:reset -- --clear` to clear the Metro cache (use if bundler acts stale).
- Flags can be combined: `npm run dev:reset -- --web --clear`.

What the script does:

1. Kill any process on ports 3001, 8081, 8082.
2. Start the dev proxy on http://localhost:3001 and wait for `/health` to be OK.
3. Set `EXPO_PUBLIC_API_BASE` and `EXPO_PUBLIC_AUTH_BASE` for the session.
4. Launch Expo via the local CLI.

## Manual Fallback

If you need to run things manually:

1. Terminal A: `npm run proxy`
2. Terminal B:
   ```powershell
   $env:EXPO_PUBLIC_API_BASE="http://localhost:3001/api/data"
   $env:EXPO_PUBLIC_AUTH_BASE="http://localhost:3001/api/auth"
   npm start
   ```
3. Verify proxy health: `Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing` (expect StatusCode 200 with `{ ok: true }`).

## Troubleshooting

- If Expo complains about package versions, update to expected versions:
  ```powershell
  npm install expo@~54.0.28 expo-image-picker@~17.0.10 expo-secure-store@~15.0.8
  ```
- If Metro seems stuck, rerun with `--clear` or delete `.expo` and `node_modules\.cache`.
- If the proxy fails to bind, make sure ports 3001/8081/8082 are free (the reset script already attempts to free them).
- If `node_modules` is missing or stale, run `npm install` again.
