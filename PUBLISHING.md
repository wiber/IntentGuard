# IntentGuard NPM Publishing Guide

## Overview

IntentGuard is published to npm as a public package under the name `intentguard`.

**Package URL**: https://www.npmjs.com/package/intentguard

## Prerequisites

Before publishing, ensure you have:

1. **NPM Account**: Create account at https://www.npmjs.com/signup
2. **NPM Authentication**: Run `npm login` to authenticate
3. **Publishing Rights**: Ensure you're added as a maintainer (contact package owner)
4. **Clean Build**: All tests pass and build succeeds

## Pre-Publish Checklist

Before each publish:

- [ ] Update version in `package.json` (use `npm version [patch|minor|major]`)
- [ ] Update `CHANGELOG.md` with changes since last release
- [ ] Run `npm run build` and verify no TypeScript errors
- [ ] Run `npm test` and ensure all tests pass
- [ ] Review `package.json` files array to ensure correct files are included
- [ ] Verify `.npmignore` excludes development files
- [ ] Test package locally with `npm pack` and install the tarball
- [ ] Update README.md badges if needed

## Publishing Steps

### 1. Version Bump

Choose appropriate semver increment:

```bash
# Patch release (1.8.3 → 1.8.4) - bug fixes
npm version patch

# Minor release (1.8.3 → 1.9.0) - new features (backward compatible)
npm version minor

# Major release (1.8.3 → 2.0.0) - breaking changes
npm version major
```

### 2. Build and Test

```bash
# Clean previous builds
rm -rf lib/

# Build TypeScript to lib/
npm run build

# Run tests
npm test

# Verify package contents
npm pack --dry-run
```

### 3. Publish to NPM

```bash
# Publish to npm registry
npm publish

# Or publish with tag (for beta/alpha releases)
npm publish --tag beta
npm publish --tag next
```

### 4. Post-Publish

```bash
# Push version commit and tags to GitHub
git push origin main --tags

# Verify package is live
npm view intentguard

# Test installation
npm install intentguard
```

## Local Testing Before Publish

To test the package locally before publishing:

```bash
# Create tarball
npm pack

# Install in another project
cd /path/to/test-project
npm install /path/to/IntentGuard/intentguard-1.8.3.tgz

# Test import
node -e "const ig = require('intentguard'); console.log(ig.VERSION)"
```

## Package Structure

Files included in published package (see `package.json` `files` field):

- `bin/` - CLI executables
- `lib/` - Compiled JavaScript (from `src/`)
- `src/` - TypeScript source files
- `templates/` - HTML/CSS templates
- `config/` - Configuration files
- `trust-debt-pipeline-coms.txt` - Agent communication spec
- `README.md` - Main documentation
- `LICENSE` - MIT license
- `package.json` - Package manifest

Files excluded (see `.npmignore`):

- Development tools (`.vscode`, `.idea`, etc.)
- Test files (`tests/`, `*.test.js`)
- Documentation sources (`docs/`)
- Build configurations
- Git files
- Temporary/cache files

## Version Scheme

IntentGuard follows **Semantic Versioning (semver)**:

- **MAJOR** (1.x.x → 2.x.x): Breaking API changes
- **MINOR** (1.8.x → 1.9.x): New features, backward compatible
- **PATCH** (1.8.3 → 1.8.4): Bug fixes, backward compatible

## Release Tags

Use npm tags to manage release channels:

- `latest` - Stable production release (default)
- `next` - Pre-release for testing
- `beta` - Beta releases
- `alpha` - Alpha releases

```bash
# Publish beta
npm publish --tag beta

# Promote beta to latest
npm dist-tag add intentguard@1.9.0-beta.1 latest
```

## CI/CD Publishing (Future)

For automated publishing via GitHub Actions:

```yaml
# .github/workflows/publish.yml
name: Publish to NPM
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
      - run: npm run build
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```

## Troubleshooting

### Cannot publish - already exists

If version already published:

```bash
# Bump version and try again
npm version patch
npm publish
```

### Authentication errors

```bash
# Re-authenticate
npm login

# Check authentication
npm whoami
```

### Build errors

```bash
# Check TypeScript compilation
npm run build

# Fix errors in src/ files
# Then rebuild
```

### Files missing from package

```bash
# Check what will be included
npm pack --dry-run

# Update package.json files array if needed
# Update .npmignore if needed
```

## Package Metadata

Current package information:

- **Name**: `intentguard`
- **Current Version**: `1.8.3`
- **License**: MIT
- **Repository**: https://github.com/wiber/IntentGuard
- **Homepage**: https://github.com/wiber/IntentGuard
- **Author**: Elias Moosman <elias@thetadriven.com>
- **Keywords**: ai-safety, trust-measurement, ai-alignment, trust-debt

## Support

- **Issues**: https://github.com/wiber/IntentGuard/issues
- **Documentation**: https://github.com/wiber/IntentGuard#readme
- **NPM Package**: https://www.npmjs.com/package/intentguard

## Security

To report security vulnerabilities:

1. **DO NOT** open public GitHub issues
2. Email security concerns to: elias@thetadriven.com
3. Include detailed description and reproduction steps
4. Allow 48 hours for initial response

---

*Last updated: 2026-02-15*
