# Publishing Intent Guard to NPM

## Pre-publish Checklist

- [ ] Update version in package.json
- [ ] Update CHANGELOG.md
- [ ] Run tests: `npm test`
- [ ] Build: `npm run build`
- [ ] Update README if needed
- [ ] Commit all changes
- [ ] Tag release: `git tag v0.1.0`

## First-time Setup

1. **Create NPM account** (if you don't have one):
   ```bash
   npm adduser
   ```

2. **Create GitHub organization** (recommended):
   - Organization: `unity-architecture`
   - Repository: `intent-guard`

3. **Reserve NPM scope**:
   ```bash
   npm org create unity-architecture
   ```

## Publishing Process

### 1. Test Locally

```bash
# In intent-guard directory
npm link

# In a test project
npm link @unity-architecture/intent-guard
intent-guard init
intent-guard analyze
```

### 2. Dry Run

```bash
# See what would be published
npm pack --dry-run

# Check package contents
npm pack
tar -xvf unity-architecture-intent-guard-*.tgz
```

### 3. Publish Beta (Recommended First)

```bash
# Publish beta version
npm version prerelease --preid=beta
npm publish --tag beta --access public

# Test beta in another project
npm install @unity-architecture/intent-guard@beta
```

### 4. Publish Stable

```bash
# When ready for stable release
npm version patch  # or minor/major
npm publish --access public
```

### 5. Post-publish

```bash
# Push tags to GitHub
git push origin main --tags

# Create GitHub release
gh release create v0.1.0 \
  --title "Intent Guard v0.1.0" \
  --notes "Initial release of Intent Guard - measure Trust Debt in your codebase"

# Announce on social media
echo "🚀 Intent Guard is now on NPM!"
echo "npm install -g @unity-architecture/intent-guard"
```

## Version Strategy

```
0.1.x - Alpha features, breaking changes allowed
0.2.x - Beta features, API stabilizing
1.0.x - Stable release, semantic versioning
```

## Marketing Launch

### Week 1: Soft Launch
- Publish to NPM
- Post on personal Twitter/LinkedIn
- Share in relevant Discord/Slack communities

### Week 2: Content Marketing
- Blog post: "Why Trust Debt Matters"
- Video demo on YouTube
- Submit to Hacker News

### Week 3: Community Building
- Create Discord server
- First contributor guidelines
- Bounty program for features

### Week 4: Enterprise Outreach
- Case study from ThetaCoach
- Reach out to YC companies
- Create intentguard.io landing page

## Revenue Tracking

### Metrics to Monitor
- NPM downloads (weekly/monthly)
- GitHub stars
- Issues/PRs opened
- Cloud signups (when launched)

### Success Milestones
- 100 downloads: Validate interest
- 1,000 downloads: Consider cloud service
- 10,000 downloads: Raise funding
- 100,000 downloads: Enterprise focus

## Common Issues

### "Package name unavailable"
```bash
# Check availability
npm view @unity-architecture/intent-guard

# If taken, use alternative:
@intent-guard/core
@trustdebt/intent-guard
intent-guard-cli
```

### "Permission denied"
```bash
# Ensure you're logged in
npm whoami

# Check org membership
npm org ls unity-architecture
```

### "Version already exists"
```bash
# Bump version first
npm version patch
```

## Emergency Rollback

If critical bug discovered after publish:

```bash
# Deprecate bad version
npm deprecate @unity-architecture/intent-guard@0.1.0 "Critical bug - use 0.1.1"

# Publish fix immediately
npm version patch
npm publish --access public
```

## Legal Considerations

- [ ] MIT License included
- [ ] Patent notice in LICENSE
- [ ] No proprietary code included
- [ ] No hard-coded credentials
- [ ] No customer data

## Support Infrastructure

Before going public, ensure:
- GitHub issues enabled
- Email support@intentguard.io set up
- Discord/Slack community created
- Documentation site ready

---

## Quick Publish Command

For subsequent releases after initial setup:

```bash
# One-liner for patch release
npm version patch && npm publish --access public && git push origin main --tags
```

---

*Remember: Once published to NPM, packages cannot be fully deleted (only deprecated). 
Test thoroughly before publishing!*