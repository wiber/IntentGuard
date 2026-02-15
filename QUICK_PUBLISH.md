# Quick Publish Guide - IntentGuard

## 🚀 Fast Track: Publish to NPM in 3 Commands

```bash
# 1. Authenticate (first time only)
npm login

# 2. Run automated publishing assistant
npm run publish:npm

# 3. Done! ✨
```

The script will:
- ✅ Verify package is ready
- ✅ Prompt for version bump (patch/minor/major)
- ✅ Build the package
- ✅ Show what will be published
- ✅ Publish to npm
- ✅ Commit and tag the release
- ✅ Push to GitHub

---

## 📦 What Gets Published

```
intentguard@1.8.3
├── bin/cli.js              # Command: intentguard
├── lib/index.js            # Main: require('intentguard')
├── lib/index.d.ts          # TypeScript types
├── lib/auth/               # Auth modules
├── lib/pipeline/           # Pipeline system
├── lib/grid/               # Grid system
├── lib/federation/         # Federation system
├── src/                    # TypeScript source
├── templates/              # HTML templates
├── config/                 # Config files
└── README.md               # Documentation
```

---

## 🔍 Pre-Publish Check

```bash
npm run publish:verify
```

This checks:
- ✓ NPM authentication
- ✓ Package configuration
- ✓ Required files
- ✓ Build output
- ✓ Git status
- ✓ Package size

---

## 📝 Manual Publishing (Alternative)

```bash
# 1. Bump version
npm version patch    # 1.8.3 → 1.8.4
npm version minor    # 1.8.3 → 1.9.0
npm version major    # 1.8.3 → 2.0.0

# 2. Publish
npm publish

# 3. Push tags
git push origin main --tags
```

---

## 🔗 After Publishing

View your package:
- **NPM Page**: https://www.npmjs.com/package/intentguard
- **Install**: `npm install intentguard`
- **Info**: `npm view intentguard`

Test installation:
```bash
# In another directory
npm install intentguard
node -e "const ig = require('intentguard'); console.log(ig.VERSION)"
```

---

## 🆘 Troubleshooting

**Not authenticated?**
```bash
npm login
npm whoami  # Verify
```

**Version already published?**
```bash
npm version patch  # Bump version
npm publish
```

**Build errors?**
```bash
npm run build
# Fix TypeScript errors in src/
```

**What will be included?**
```bash
npm pack --dry-run
```

---

## 📚 Full Documentation

For detailed information, see:
- **PUBLISHING.md** - Comprehensive publishing guide
- **package.json** - Package configuration
- **scripts/publish-npm.sh** - Publishing automation
- **scripts/verify-publish-ready.sh** - Verification checks

---

**Current Version**: 1.8.3
**License**: MIT
**Author**: Elias Moosman <elias@thetadriven.com>
