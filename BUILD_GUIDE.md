# Building and Distributing Version 0.1

This guide will help you build and distribute the AI Production Monitor app to your beta customers.

## Prerequisites

1. **Install EAS CLI** (if not already installed):

```powershell
npm install -g eas-cli
```

2. **Create an Expo account** (if you don't have one):
   - Visit https://expo.dev and sign up
   - Or run: `eas login`

3. **Configure your project**:

```powershell
eas build:configure
```

## Building for Beta Distribution

### Option 1: Android APK (Fastest for Beta Testing)

This creates an installable APK file you can share directly with beta testers:

```powershell
eas build --platform android --profile preview
```

After the build completes:

- You'll get a download link for the APK
- Share this link with your beta testers
- They can install it directly on their Android devices (may need to enable "Install from Unknown Sources")

### Option 2: iOS Ad-Hoc Build (For iOS Beta Testing)

For iOS devices, you'll need:

1. An Apple Developer Account ($99/year)
2. Register your beta testers' device UDIDs

```powershell
eas build --platform ios --profile preview
```

### Option 3: Both Platforms

```powershell
eas build --platform all --profile preview
```

## Production Builds

When ready for production release:

### Android (Google Play Store)

```powershell
eas build --platform android --profile production
```

### iOS (App Store)

```powershell
eas build --platform ios --profile production
```

## Alternative: Expo Go (Quick Testing Only)

For quick internal testing without building, beta testers can:

1. Install Expo Go app from their app store
2. You publish your app: `eas update --branch preview`
3. Share the QR code or deep link

**Note**: This only works with apps that don't use custom native code.

## Environment Variables

Your app uses these API endpoints. Make sure to set production URLs before building:

Current configuration in your app:

- `EXPO_PUBLIC_API_BASE` - Your data API endpoint
- `EXPO_PUBLIC_AUTH_BASE` - Your auth API endpoint

To set for builds, add to `eas.json`:

```json
"preview": {
  "env": {
    "EXPO_PUBLIC_API_BASE": "https://your-production-api.com/api/data",
    "EXPO_PUBLIC_AUTH_BASE": "https://your-production-api.com/api/auth"
  }
}
```

## Distribution to Beta Testers

### Android:

1. Download the APK from the build link
2. Upload to Google Drive, Dropbox, or email it
3. Beta testers download and install
4. May need to enable "Install from Unknown Sources" in Android settings

### iOS:

1. Add tester emails in Expo dashboard
2. They'll receive an email with installation instructions
3. Requires TestFlight or ad-hoc distribution

## Recommended Beta Distribution Flow

1. **Build the Android APK**:

   ```powershell
   eas build --platform android --profile preview
   ```

2. **Share the build**:
   - Download link is provided after build completes
   - Share directly with beta testers
   - Or upload to a shared location

3. **Collect feedback**:
   - Track issues and feature requests
   - Iterate and rebuild as needed

## Version Management

Current version: **0.1.0**

To update for next release:

1. Update version in `app.json` and `package.json`
2. Rebuild with new version number

## Next Steps

1. Run `eas build:configure` to set up your project
2. Run `eas login` to authenticate
3. Choose your build type based on your needs
4. Wait for build to complete (typically 10-20 minutes)
5. Share the download link with beta testers

## Support

- EAS Build Documentation: https://docs.expo.dev/build/introduction/
- Expo Forums: https://forums.expo.dev/
