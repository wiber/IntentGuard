# 🚀 Ready to Publish IntentGuard to NPM

Your package is **fully configured and ready** for npm publication!

## Quick Start (First Time Publishers)

### 1. Login to npm (One Time)
```bash
npm login
```
Enter your npm credentials when prompted.

### 2. Verify Package
```bash
npm run publish:check
```
This shows exactly what will be published (654 files, 1.4 MB).

### 3. Publish!

**Option A: Interactive Script (Recommended)**
```bash
npm run publish:npm
```
This script will:
- ✅ Check authentication
- ✅ Run tests
- ✅ Build package
- ✅ Verify version
- ✅ Show preview
- ✅ Publish to npm
- ✅ Create git tag

**Option B: Direct Publish**
```bash
npm publish
```

### 4. Verify Publication
```bash
npm view intentguard
```

Visit: https://www.npmjs.com/package/intentguard

## Package Information

- **Name**: `intentguard`
- **Version**: `1.8.3`
- **Install**: `npm install intentguard`
- **CLI**: `intentguard analyze`, `intentguard report`

## If You Need to Update Version First

```bash
# Bug fixes (1.8.3 → 1.8.4)
npm version patch

# New features (1.8.3 → 1.9.0)
npm version minor

# Breaking changes (1.8.3 → 2.0.0)
npm version major
```

Then publish as above.

## Automated Publishing (CI/CD)

To enable automatic publishing on GitHub releases:

1. **Create npm token**: https://www.npmjs.com/settings/~/tokens
   - Type: Automation

2. **Add to GitHub**:
   - Go to: `Settings → Secrets → Actions`
   - Name: `NPM_TOKEN`
   - Value: Your npm token

3. **Create GitHub Release**:
   - GitHub will automatically publish to npm
   - See `.github/workflows/npm-publish.yml`

## Troubleshooting

**"You must be logged in to publish"**
```bash
npm login
```

**"Version already exists"**
```bash
npm version patch  # Bumps to 1.8.4
npm publish
```

**"Need to verify email"**
- Check your npm account email and verify

**"2FA Required"**
- Enter your 2FA code when prompted
- Consider using automation tokens for CI/CD

## Pre-Publication Checklist

- [x] Package.json properly configured
- [x] Build scripts functional
- [x] Tests passing
- [x] README.md comprehensive
- [x] LICENSE file included
- [x] .npmignore configured
- [x] Binary (CLI) executable
- [x] TypeScript definitions included

## Documentation

For detailed information:
- **Complete Guide**: [NPM_PUBLISHING.md](./NPM_PUBLISHING.md)
- **Status Report**: [PUBLISHING_READY.md](./PUBLISHING_READY.md)
- **Package Tests**: [tests/npm-package.test.js](./tests/npm-package.test.js)

## Support

- **GitHub Issues**: https://github.com/wiber/IntentGuard/issues
- **npm Package** (after publishing): https://www.npmjs.com/package/intentguard

---

**You're all set!** 🎉

Just run `npm run publish:npm` and follow the prompts.
