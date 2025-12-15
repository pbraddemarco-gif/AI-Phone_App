# CI/CD Setup Guide

## Overview

This repository uses GitHub Actions for continuous integration and deployment to iOS App Store via EAS (Expo Application Services).

## Workflows

### 1. CI Workflow (`.github/workflows/ci.yml`)

**Triggers:**

- Pull requests to `main`, `develop`, or `release/**` branches
- Pushes to `main` branch

**Jobs:**

#### `lint-and-typecheck`

- Runs TypeScript type checking
- Runs ESLint
- Checks for console.log statements in source
- **Fails fast** if any issues found

#### `security-check`

- Scans for potential secrets in code
- Checks for insecure HTTP URLs
- Runs npm audit for vulnerable dependencies

#### `build-preview`

- Builds iOS preview for TestFlight
- Only runs on `main` branch or when PR labeled with `build-ios`
- Posts build status comment on PR

### 2. Release Workflow (`.github/workflows/release.yml`)

**Triggers:**

- Git tags matching `v*.*.*` (e.g., `v1.0.0`)
- Manual workflow dispatch

**Jobs:**

- Type check and lint
- Build iOS production
- Submit to App Store Connect
- Create GitHub release

## AWS Proxy Deployment (Elastic Beanstalk)

Use the scaffold in `proxy-aws/` to deploy a minimal reverse proxy for customer-facing integrations.

### Minimal Requirements
- Node.js platform (Node 18) on Elastic Beanstalk
- Single-instance environment (t2.micro/t3.micro), autoscaling min=1
- ACM certificate attached to the load balancer
- Route 53 DNS pointing to the EB load balancer
- CloudWatch Logs enabled; health check path `/health`

### Deploy Steps
1. Zip the contents of `proxy-aws/` and upload to EB as a new application version.
2. Configure environment variables:
  - `API_DATA_TARGET`: upstream data API (Elastic Beanstalk URL)
  - `API_AUTH_TARGET`: upstream auth API (e.g., https://app.automationintellect.com/api)
  - `API_PLANT_TARGET`: upstream plant API
  - `CORS_ALLOW_ORIGINS`: comma-separated allowed origins (e.g., https://yourapp.example.com)
  - `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX` (optional)
3. Attach ACM certificate and enforce HTTPS (Nginx redirect file provided in `.ebextensions/01-nginx-https.config`).
4. Validate `/health` returns 200, and test proxied paths `/api/data`, `/api/auth`, `/api/plant`.
5. Enable CloudWatch alarms for 5xx error rate and latency.

### Security Notes
- Strict CORS; avoid `*` in production.
- Rate limiting via `express-rate-limit`.
- Security headers via `helmet`.
- Consider AWS WAF managed rules on the load balancer.

## Bitbucket Mirroring

We mirror GitHub changes to Bitbucket to keep downstream consumers in sync.

### Options
- Set up repository mirroring (GitHub → Bitbucket) using Bitbucket’s mirror feature or GitHub Actions.
- Alternatively, push to both remotes manually or via CI.

### Setup Instructions
1. Add Bitbucket remote locally:
  - `git remote add bitbucket https://bitbucket.org/<workspace>/<repo>.git`
2. Update CI pipeline to push on successful `main` merges:
  - Use a GitHub Action with a PAT to run `git push bitbucket main --tags`.
3. Validate: `git remote -v` shows both `origin` (GitHub) and `bitbucket` (Bitbucket).
4. Document any credential storage (GitHub Secrets for PAT, Bitbucket app passwords).

### Checklist
- Release branch merged to `main` on GitHub.
- CI runs succeed; artifacts built.
- Mirroring job pushes to Bitbucket `main` and tags.
- Proxy deployment instructions shared with customer (URL, rate limits, health path).

## Setup Requirements

### GitHub Secrets

Configure these in repository settings → Secrets and variables → Actions:

#### `EXPO_TOKEN` (Required)

Expo authentication token for EAS CLI.

**How to get:**

```bash
eas login
eas whoami  # Verify you're logged in
# Token is stored in ~/.expo/state.json or via eas config
```

**Set in GitHub:**

1. Go to repository Settings → Secrets → Actions
2. Click "New repository secret"
3. Name: `EXPO_TOKEN`
4. Value: (paste token)

#### Apple Developer Credentials

Managed by EAS - no GitHub secrets needed. Configured via:

```bash
eas credentials
```

## Usage

### Running CI on Pull Requests

CI automatically runs on every PR. To pass:

```bash
# Locally verify before pushing
npm run typecheck
npm run lint
```

### Building iOS Preview from PR

Add the label `build-ios` to your PR, or push to `main` branch.

### Creating a Production Release

```bash
# 1. Update version in app.json and package.json
# 2. Commit changes
git add app.json package.json
git commit -m "chore: bump version to 1.0.1"

# 3. Create and push tag
git tag v1.0.1
git push origin v1.0.1

# 4. GitHub Actions automatically:
#    - Builds production iOS
#    - Submits to App Store Connect
#    - Creates GitHub release
```

### Manual Release Trigger

Go to Actions → Release Build → Run workflow → Select branch → Run

## EAS Configuration

### Build Profiles (eas.json)

- **development**: Development client, internal distribution
- **preview**: TestFlight, production config
- **production**: App Store, auto-increment build number

### Environment Variables

Set in `eas.json` under each profile:

```json
"env": {
  "EXPO_PUBLIC_API_BASE": "https://...",
  "EXPO_PUBLIC_AUTH_BASE": "https://..."
}
```

## Monitoring Builds

### EAS Dashboard

https://expo.dev/accounts/pbraddemarco-gif/projects/ai-production-monitor/builds

### GitHub Actions

https://github.com/pbraddemarco-gif/AI-Phone_App/actions

### App Store Connect

https://appstoreconnect.apple.com

## Troubleshooting

### CI Fails with "Type error"

```bash
# Run locally to see full error
npm run typecheck
```

### CI Fails with "Lint error"

```bash
# Auto-fix many issues
npm run lint:fix

# Manual fixes may be needed
npm run lint
```

### Build Fails in EAS

Check EAS dashboard for logs. Common issues:

- Dependencies not resolving: Check `package.json`
- Certificate expired: Run `eas credentials`
- Build timeout: Increase `resourceClass` in eas.json

### "EXPO_TOKEN not set"

Ensure `EXPO_TOKEN` secret is configured in GitHub repository settings.

### Build succeeds but not appearing in TestFlight

- Check App Store Connect for processing status
- Builds take 10-15 minutes to process
- Check for App Store Connect email notifications

## Best Practices

### Before Merging PR

- [ ] CI passes (green checkmark)
- [ ] Code reviewed
- [ ] Tested locally
- [ ] No console.log statements
- [ ] Version bumped if needed

### Before Creating Release

- [ ] All features tested on TestFlight
- [ ] Version updated in app.json and package.json
- [ ] CHANGELOG.md updated
- [ ] Screenshots updated (if UI changed)
- [ ] App Store metadata reviewed

### After Release

- [ ] Monitor crash reports in Xcode Organizer
- [ ] Check App Store Connect analytics
- [ ] Verify external TestFlight testers receive build
- [ ] Monitor user feedback

## Security

### Secrets Management

- Never commit secrets to repository
- Use GitHub Secrets for CI/CD credentials
- Rotate tokens if exposed
- Use EAS Secrets for build-time secrets (if needed)

### Access Control

- Limit GitHub Actions write access
- Restrict EAS project access
- Use branch protection rules on `main`

## Performance

### Build Times

- Lint/Typecheck: ~2 minutes
- iOS Preview Build: ~10-15 minutes
- iOS Production Build: ~15-20 minutes

### Optimization

- Use `npm ci` instead of `npm install`
- Cache node_modules with `actions/cache`
- Use appropriate EAS resource class

## Future Enhancements

- [ ] Add automated E2E tests with Detox
- [ ] Add test coverage reporting
- [ ] Add automated screenshot tests
- [ ] Deploy to Android Play Store
- [ ] Add staging environment builds
- [ ] Implement blue-green deployments
- [ ] Add Slack/Discord notifications

## Support

For issues with:

- **GitHub Actions**: Check workflow logs, GitHub Actions documentation
- **EAS Builds**: Check EAS dashboard, Expo documentation
- **App Store**: Check App Store Connect, Apple Developer documentation

## Quick Reference

```bash
# Local validation
npm run typecheck
npm run lint

# Manual EAS builds
eas build --profile preview --platform ios
eas build --profile production --platform ios

# Submit to App Store
eas submit --platform ios --latest

# Check credentials
eas credentials

# View build logs
eas build:list
```
