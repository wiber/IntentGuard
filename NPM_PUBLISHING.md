# NPM Publishing Guide for IntentGuard

## Overview

IntentGuard is configured for publication to npm as a public package. This guide covers the publishing process, requirements, and best practices.

## Package Information

- **Package Name**: `intentguard`
- **Current Version**: 1.8.3
- **Registry**: npm public registry (https://registry.npmjs.org/)
- **License**: MIT
- **Repository**: https://github.com/wiber/IntentGuard

## Pre-Publishing Checklist

Before publishing to npm, ensure:

1. ✅ All tests pass (`npm test`)
2. ✅ Build succeeds (`npm run build`)
3. ✅ Version is bumped appropriately
4. ✅ CHANGELOG is updated
5. ✅ README is comprehensive
6. ✅ All dependencies are properly declared
7. ✅ .npmignore excludes development files

## Building for Production

The package uses TypeScript and compiles to JavaScript in the `lib/` directory:

```bash
# Build TypeScript to JavaScript
npm run build

# Build and watch for changes
npm run build:watch
```

The `prepublishOnly` script automatically runs the build before publishing.

## Publishing Process

### 1. Version Management

Use npm's semantic versioning commands:

```bash
# Patch release (1.8.3 → 1.8.4) - bug fixes
npm version patch

# Minor release (1.8.3 → 1.9.0) - new features, backward compatible
npm version minor

# Major release (1.8.3 → 2.0.0) - breaking changes
npm version major
```

### 2. Pre-publish Verification

Test the package locally before publishing:

```bash
# Dry run - see what will be published
npm pack --dry-run

# Create a tarball for manual inspection
npm pack

# Test installation from tarball
npm install ./intentguard-1.8.3.tgz
```

### 3. Publishing to npm

```bash
# Login to npm (first time only)
npm login

# Publish to npm
npm publish

# Publish with a tag (e.g., beta)
npm publish --tag beta
```

### 4. Post-publish Verification

After publishing:

```bash
# Verify package is available
npm view intentguard

# Test installation
npm install intentguard

# Verify package info
npm info intentguard
```

## Package Contents

The published package includes:

- `bin/` - CLI executable
- `lib/` - Compiled JavaScript + type definitions
- `src/` - TypeScript source code
- `templates/` - HTML report templates
- `config/` - Configuration files
- `trust-debt-pipeline-coms.txt` - Pipeline agent configuration
- `README.md` - Package documentation
- `LICENSE` - MIT license

## Excluded Files

The following are excluded via `.npmignore`:

- Development files (`.git`, `.vscode`, `.idea`)
- Test files (`*.test.js`, `*.spec.js`, `test/`, `tests/`)
- Build artifacts and temporary files
- Documentation files (except README.md)
- IDE and OS-specific files

## Distribution Tags

npm supports distribution tags for different release channels:

```bash
# Latest stable (default)
npm publish

# Beta release
npm publish --tag beta

# Alpha release
npm publish --tag alpha

# Next version (pre-release)
npm publish --tag next
```

Users can install specific tags:

```bash
npm install intentguard@beta
npm install intentguard@latest
```

## Version Lifecycle

### Semantic Versioning

IntentGuard follows [Semantic Versioning 2.0.0](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes, incompatible API changes
- **MINOR** (1.X.0): New features, backward compatible
- **PATCH** (1.8.X): Bug fixes, backward compatible

### Pre-release Versions

For testing before stable releases:

```bash
# Create pre-release version
npm version prerelease --preid=beta
# Result: 1.8.3 → 1.8.4-beta.0

# Increment pre-release
npm version prerelease
# Result: 1.8.4-beta.0 → 1.8.4-beta.1
```

## Unpublishing and Deprecation

### Unpublish (within 72 hours)

```bash
# Unpublish specific version
npm unpublish intentguard@1.8.3

# Unpublish entire package (not recommended)
npm unpublish intentguard --force
```

### Deprecate (preferred alternative)

```bash
# Mark version as deprecated
npm deprecate intentguard@1.8.3 "Security vulnerability fixed in 1.8.4"

# Deprecate range
npm deprecate intentguard@"< 1.8.0" "Please upgrade to 1.8.x"
```

## CI/CD Integration

### GitHub Actions (Recommended)

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Troubleshooting

### Common Issues

**Build fails:**
```bash
# Clean and rebuild
rm -rf lib node_modules
npm install
npm run build
```

**Version conflict:**
```bash
# Check current version
npm view intentguard version

# Ensure local version is higher
npm version patch
```

**Authentication issues:**
```bash
# Re-login
npm logout
npm login
```

**Permission denied:**
```bash
# Verify package ownership
npm owner ls intentguard

# Add collaborator
npm owner add <username> intentguard
```

## Security

### Two-Factor Authentication

Enable 2FA for npm account security:

```bash
# Enable 2FA
npm profile enable-2fa auth-and-writes

# Check 2FA status
npm profile get
```

### NPM Tokens

For CI/CD, create automation tokens:

1. Go to https://www.npmjs.com/settings/~/tokens
2. Create new token (Automation type)
3. Add to CI/CD secrets as `NPM_TOKEN`

## Package Stats

After publishing, monitor:

- **Downloads**: https://www.npmjs.com/package/intentguard
- **Bundle Size**: https://bundlephobia.com/package/intentguard
- **Package Health**: https://snyk.io/advisor/npm-package/intentguard

## Support

- **Issues**: https://github.com/wiber/IntentGuard/issues
- **Documentation**: https://github.com/wiber/IntentGuard#readme
- **Author**: Elias Moosman <elias@thetadriven.com>

## License

MIT License - see LICENSE file for details
