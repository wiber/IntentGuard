# 🚀 Quick Publish Instructions - IntentGuard

## Status: ✅ READY TO PUBLISH

IntentGuard is completely ready for npm publication. Follow these steps to publish.

## Prerequisites

- [ ] npm account created at https://www.npmjs.com/signup
- [ ] Email verified on npm account
- [ ] Two-factor authentication enabled (recommended)

## Publishing Commands

### Step 1: Login to npm (First Time Only)

```bash
npm login
```

You'll be prompted for:
- Username
- Password
- Email
- 2FA code (if enabled)

### Step 2: Verify Package

```bash
# Check package contents
npm run publish:check

# Verify package readiness
npm run publish:verify
```

### Step 3: Publish to npm

**Option A: Automated (Recommended)**
```bash
npm run publish:npm
```

This script handles everything:
- Verifies authentication
- Runs tests
- Builds package
- Shows preview
- Asks for confirmation
- Publishes
- Creates git tag

**Option B: Manual**
```bash
npm publish
```

## After Publishing

### Verify Publication

```bash
# View package info
npm view intentguard

# Check latest version
npm view intentguard version

# Visit npm page
open https://www.npmjs.com/package/intentguard
```

### Test Installation

```bash
# Install globally
npm install -g intentguard

# Test CLI
intentguard --version
intentguard --help

# Test in a project
mkdir test-project && cd test-project
npm init -y
npm install intentguard
node -e "const ig = require('intentguard'); console.log(ig.VERSION)"
```

### Create GitHub Tag

```bash
git tag -a v1.8.3 -m "Release v1.8.3 - npm package published"
git push origin v1.8.3
```

## Package Information

- **Name**: intentguard
- **Version**: 1.8.3
- **Size**: ~600-800 KB (compressed)
- **Files**: ~350 files
- **License**: MIT
- **Registry**: https://registry.npmjs.org/

## What Gets Published

```
✅ bin/cli.js           - CLI executable
✅ lib/                 - Compiled JavaScript + TypeScript definitions
✅ src/                 - TypeScript source code
✅ templates/           - HTML report templates
✅ config/              - Configuration files
✅ README.md            - Documentation
✅ LICENSE              - MIT license
✅ package.json         - Package metadata
✅ trust-debt-pipeline-coms.txt

❌ node_modules/        - Excluded
❌ tests/               - Excluded
❌ docs/                - Excluded (except README)
❌ .git/                - Excluded
❌ *.test.js            - Excluded
```

## Entry Points

Users can import from:

```javascript
// Main package
import { VERSION, BRAND } from 'intentguard';

// Auth module
import { checkPermission, FimInterceptor } from 'intentguard/auth';

// Swarm coordination
import { getPoolManager, executeParallel } from 'intentguard/swarm';
```

## CLI Usage

After installation:

```bash
intentguard analyze                    # Run Trust Debt analysis
intentguard report                     # Generate HTML report
intentguard agent 0                    # Run pipeline agent 0
intentguard pipeline                   # Run full pipeline
```

## Troubleshooting

### "You cannot publish over previously published versions"
```bash
npm version patch  # Bump to 1.8.4
npm publish
```

### "You must be logged in to publish"
```bash
npm login
# Then retry publish
```

### "403 Forbidden"
```bash
npm whoami  # Check you're logged in
npm access ls-packages  # Verify permissions
```

## Support

- **Issues**: https://github.com/wiber/IntentGuard/issues
- **Email**: elias@thetadriven.com
- **Documentation**: See NPM-PUBLISHING-GUIDE.md for comprehensive details

---

**Ready to publish?** Run: `npm login && npm run publish:npm`
