# IntentGuard NPM Publishing Guide

## Overview

IntentGuard is ready to be published to npm as a public package. This guide provides comprehensive instructions for publishing and maintaining the package.

## Package Information

- **Package Name**: `intentguard`
- **Current Version**: 1.8.3
- **License**: MIT
- **Repository**: https://github.com/wiber/IntentGuard
- **npm Registry**: https://registry.npmjs.org/ (public)

## Pre-Publishing Checklist

Before publishing to npm, ensure all of the following are complete:

### ✅ Package Configuration
- [x] Package name is available on npm
- [x] Version follows semantic versioning (MAJOR.MINOR.PATCH)
- [x] All required fields in package.json are present
- [x] publishConfig access is set to "public"
- [x] Main entry point (lib/index.js) exists
- [x] TypeScript definitions (lib/index.d.ts) exist
- [x] Binary (bin/cli.js) exists and is executable

### ✅ Required Files
- [x] README.md with comprehensive documentation
- [x] LICENSE file (MIT)
- [x] lib/ directory with compiled code
- [x] bin/ directory with CLI executable
- [x] templates/ directory for HTML reports
- [x] trust-debt-pipeline-coms.txt configuration

### ✅ Build & Tests
- [x] TypeScript builds successfully (`npm run build`)
- [x] All tests pass (`npm test`)
- [x] npm pack dry-run succeeds (`npm pack --dry-run`)
- [x] No critical security vulnerabilities

### ✅ Documentation
- [x] README has installation instructions
- [x] README has usage examples
- [x] API documentation is clear
- [x] Repository URL is correct
- [x] Bugs URL is specified

## Publishing Methods

### Method 1: Automated Script (Recommended)

We provide a comprehensive publishing script that includes safety checks:

```bash
# Run the automated publishing script
npm run publish:npm
```

This script will:
1. ✅ Verify you're logged into npm
2. ✅ Check for uncommitted changes
3. ✅ Run all tests
4. ✅ Build the package
5. ✅ Verify version doesn't already exist
6. ✅ Show package contents preview
7. ✅ Ask for confirmation
8. ✅ Publish to npm
9. ✅ Create git tag
10. ✅ Optionally push tag to GitHub

### Method 2: Manual Publishing

For more control, follow these steps:

```bash
# 1. Login to npm (first time only)
npm login

# 2. Verify package configuration
npm run publish:verify

# 3. Preview package contents
npm run publish:check

# 4. Bump version if needed
npm version patch   # 1.8.3 → 1.8.4 (bug fixes)
npm version minor   # 1.8.3 → 1.9.0 (new features)
npm version major   # 1.8.3 → 2.0.0 (breaking changes)

# 5. Publish to npm
npm publish

# 6. Create and push git tag
git tag -a v1.8.3 -m "Release v1.8.3"
git push origin v1.8.3
```

### Method 3: CI/CD Automation (Future)

For automated releases via GitHub Actions:

1. Add `NPM_TOKEN` to GitHub repository secrets
2. Create npm automation token at https://www.npmjs.com/settings/~/tokens
3. Trigger workflow on GitHub releases or manual dispatch

## Package Structure

The published npm package includes:

```
intentguard@1.8.3
├── bin/
│   └── cli.js                    # CLI executable (45KB)
├── lib/
│   ├── index.js                  # Main entry point
│   ├── index.d.ts                # TypeScript definitions
│   ├── auth/                     # FIM authentication module
│   │   ├── index.js
│   │   └── index.d.ts
│   ├── swarm/                    # Agent swarm coordination
│   │   ├── index.js
│   │   └── index.d.ts
│   ├── grid/                     # Grid state management
│   ├── pipeline/                 # Trust Debt pipeline
│   ├── federation/               # Federation protocols
│   └── skills/                   # Skills (wallet, cost reporter)
├── src/                          # TypeScript source (for reference)
├── templates/                    # HTML report templates
├── config/                       # Configuration files
├── trust-debt-pipeline-coms.txt  # Pipeline configuration
├── README.md                     # Documentation
├── LICENSE                       # MIT license
└── package.json                  # Package metadata
```

Total package size: ~2-3 MB (unpacked)

## Package Entry Points

### Main Library

```javascript
// CommonJS
const { VERSION, BRAND } = require('intentguard');

// ES Modules
import { VERSION, BRAND } from 'intentguard';
```

### FIM Authentication Module

```javascript
// Import FIM auth components
import {
  checkPermission,
  loadIdentityFromPipeline,
  getActionRequirement,
  FimInterceptor
} from 'intentguard/auth';

// Check permission
const identity = loadIdentityFromPipeline('./data/pipeline-runs/latest');
const requirement = getActionRequirement('git_push');
const result = checkPermission(identity, requirement);
if (result.allowed) {
  // Execute protected operation
}
```

### Agent Swarm Coordination

```javascript
// Import swarm components
import {
  getPoolManager,
  executeParallel,
  getPoolStats
} from 'intentguard/swarm';

// Initialize agent pool
await getPoolManager().initialize(ctx);

// Execute parallel tasks
const result = await executeParallel({
  description: 'Implement auth system',
  targetFiles: ['src/auth/login.ts', 'src/auth/logout.ts'],
  operation: 'implement',
  priority: 'high'
}, ctx, sovereigntyScore);
```

### CLI Usage

```bash
# After global installation
npm install -g intentguard

# Run Trust Debt analysis
intentguard analyze

# Generate report
intentguard report

# Run pipeline agents
intentguard agent 0   # Agent 0: Outcome Requirements Parser
intentguard agent 1   # Agent 1: Database Indexer
# ... agents 2-7
```

## Version Management

IntentGuard follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking API changes
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

### When to Bump Versions

```bash
# Patch (1.8.3 → 1.8.4)
# - Bug fixes
# - Documentation updates
# - Internal refactoring (no API changes)
npm version patch

# Minor (1.8.3 → 1.9.0)
# - New features
# - New exports or APIs
# - New CLI commands
# - Backward compatible changes
npm version minor

# Major (1.8.3 → 2.0.0)
# - Breaking API changes
# - Removed exports or APIs
# - Changed behavior that breaks existing code
npm version major
```

## Testing Before Publication

### 1. Run Full Test Suite

```bash
npm test
```

### 2. Test Package Locally

```bash
# Create tarball
npm pack

# Install locally in another project
cd /path/to/test-project
npm install /path/to/IntentGuard/intentguard-1.8.3.tgz

# Test imports
node -e "const ig = require('intentguard'); console.log(ig.VERSION)"
```

### 3. Test CLI Locally

```bash
# Install globally from tarball
npm install -g ./intentguard-1.8.3.tgz

# Test CLI
intentguard --version
intentguard --help
```

## Post-Publication Verification

After publishing, verify the package:

```bash
# 1. View package on npm registry
npm view intentguard

# 2. Check latest version
npm view intentguard version

# 3. See all versions
npm view intentguard versions

# 4. Install and test
npm install -g intentguard@latest
intentguard --version
```

### Package URLs

- **npm Package**: https://www.npmjs.com/package/intentguard
- **Bundle Size**: https://bundlephobia.com/package/intentguard
- **Package Health**: https://snyk.io/advisor/npm-package/intentguard
- **Unpkg CDN**: https://unpkg.com/intentguard@latest/

## Common Issues & Solutions

### Issue: "You cannot publish over the previously published versions"

**Solution**: Bump the version before publishing:
```bash
npm version patch
npm publish
```

### Issue: "You must be logged in to publish packages"

**Solution**: Login to npm:
```bash
npm login
# Enter your npm username, password, and email
```

### Issue: "Package name too similar to existing package"

**Solution**: The package name `intentguard` is unique and available.

### Issue: "npm ERR! 403 Forbidden"

**Solution**: Check your npm account permissions:
```bash
npm whoami  # Verify you're logged in
npm access ls-packages  # Check your packages
```

## Security Best Practices

### 1. Enable Two-Factor Authentication (2FA)

```bash
# Enable 2FA on npm account
npm profile enable-2fa
```

### 2. Use Automation Tokens for CI/CD

- Create automation tokens (not user tokens) for automated publishing
- Set tokens to read-only when possible
- Rotate tokens regularly

### 3. Review Package Contents

Always review what's included in the package:
```bash
npm pack --dry-run | less
```

### 4. Monitor Package Activity

- Watch for unexpected downloads or usage patterns
- Monitor GitHub issues for security reports
- Keep dependencies updated

## Maintenance & Updates

### Regular Maintenance Tasks

1. **Monthly**
   - Check for dependency updates: `npm outdated`
   - Review security vulnerabilities: `npm audit`
   - Update dependencies: `npm update`

2. **Quarterly**
   - Review package keywords and description
   - Update documentation
   - Check bundle size and optimize if needed

3. **Annually**
   - Review and update LICENSE if needed
   - Update README with new features
   - Consider major version bump for accumulated breaking changes

### Deprecating Old Versions

If a version has critical bugs or security issues:

```bash
# Deprecate a specific version
npm deprecate intentguard@1.7.0 "Critical security vulnerability - upgrade to 1.8.3+"

# Deprecate all versions before a certain version
npm deprecate "intentguard@<1.8.0" "Upgrade to 1.8.3 or later"
```

## Support & Resources

- **Issues**: https://github.com/wiber/IntentGuard/issues
- **Documentation**: https://github.com/wiber/IntentGuard#readme
- **npm Package**: https://www.npmjs.com/package/intentguard
- **Contributing**: See CONTRIBUTING.md
- **Security**: See SECURITY.md

## Quick Reference

```bash
# Publishing workflow
npm login                           # Login once
npm run publish:verify              # Verify readiness
npm version patch                   # Bump version
npm run publish:npm                 # Publish with safety checks

# Alternative: Direct publish
npm publish                         # Publish to npm
git tag -a v1.8.3 -m "Release"     # Create tag
git push origin v1.8.3              # Push tag

# Post-publish verification
npm view intentguard                # View package info
npm install -g intentguard@latest   # Test installation
intentguard --version               # Test CLI
```

## License

This package is published under the MIT License. See [LICENSE](../LICENSE) for details.

---

**Last Updated**: February 15, 2026
**Package Version**: 1.8.3
**Status**: ✅ Ready for Publication
