# AI Production Monitor - Expo Go Access

## 📱 How to Access the App

The app is now published to Expo's cloud servers and works **without your computer running**!

### Method 1: Direct URL (Easiest)

Copy and share this URL:

```
exp://u.expo.dev/c8a91170-3131-42db-ac96-ea600a7a48fd?channel-name=production
```

**On iOS/Android:**

1. Install "Expo Go" from App Store/Play Store
2. Open the URL above on your phone (send via email/text)
3. It will automatically open in Expo Go
4. Log in with your credentials

### Method 2: Manual Entry

1. Open Expo Go app
2. Tap "Enter URL manually"
3. Paste: `exp://u.expo.dev/c8a91170-3131-42db-ac96-ea600a7a48fd?channel-name=production`
4. Tap "Connect"

### Method 3: QR Code

Generate a QR code for this URL:

```
exp://u.expo.dev/c8a91170-3131-42db-ac96-ea600a7a48fd?channel-name=production
```

Use: https://www.qr-code-generator.com/

### Method 4: Expo Dashboard

View in Expo Dashboard (includes QR code):

```
https://expo.dev/accounts/bdemarco/projects/ai-production-monitor/updates/aa6b3932-37d2-4582-ab88-efa19f09763a
```

## ✅ Configuration

- **API Endpoint**: https://app.automationintellect.com/api
- **Data Endpoint**: https://lowcost-env.upd2vnf6k6.us-west-2.elasticbeanstalk.com
- **Platform**: iOS & Android via Expo Go
- **Multi-user**: ✅ Yes - multiple people can use simultaneously
- **Offline**: ❌ No - requires internet connection
- **Computer Required**: ❌ No - runs from Expo's cloud

## 🔄 Updating the App

To publish updates:

```bash
cd C:\Dev\AI-Phone_App
eas update --branch production --message "your update message"
```

All users will automatically get the update next time they open the app!

## 🚀 Next Steps: TestFlight (Optional)

For a standalone app that doesn't require Expo Go:

```bash
eas build --platform ios --profile preview
```

Then upload to TestFlight for distribution.
