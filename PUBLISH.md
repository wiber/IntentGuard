# Publishing IntentGuard to npm

## Pre-publish Checklist

1. **Test locally:**
   ```bash
   npm install
   npm link
   cd /tmp && mkdir test-repo && cd test-repo
   git init
   intentguard init
   ```

2. **Update version:**
   ```bash
   npm version patch  # or minor/major
   ```

3. **Commit all changes:**
   ```bash
   git add .
   git commit -m "Prepare for npm publish"
   git push origin main
   ```

## Publishing

1. **Login to npm:**
   ```bash
   npm login
   ```

2. **Publish:**
   ```bash
   npm publish
   ```

3. **Tag the release:**
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

## Post-publish

1. **Test installation:**
   ```bash
   npm install -g intentguard
   ```

2. **Create GitHub release** with release notes

3. **Update README** with npm badge:
   ```markdown
   [![npm version](https://badge.fury.io/js/intentguard.svg)](https://www.npmjs.com/package/intentguard)
   ```

## Marketing

Share on:
- X/Twitter: "Your commits say one thing. Your code does another. IntentGuard catches the drift before it becomes debt. 🎯"
- HackerNews: Focus on the semantic debt tracking feature
- Dev.to: Write article about semantic drift in codebases
- Reddit r/programming: Share with example scenarios