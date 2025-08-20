# IntentGuard with Husky

## Installation

First, install IntentGuard and Husky in your project:

```bash
npm install --save-dev intentguard husky
```

## Setup Husky

Initialize Husky in your repository:

```bash
npx husky install
```

## Add IntentGuard as a Pre-commit Hook

Create a pre-commit hook that runs IntentGuard:

```bash
npx husky add .husky/pre-commit "npx intentguard ci --threshold 1000"
```

This will prevent commits if Trust Debt exceeds 1000 units.

## Alternative: Post-commit Hook (Non-blocking)

If you prefer to track Trust Debt without blocking commits:

```bash
npx husky add .husky/post-commit "npx intentguard analyze || true"
```

## Custom Configuration

Create `.intent-guard.json` in your project root:

```json
{
  "threshold": 500,
  "patterns": {
    "intent": ["README.md", "docs/**/*.md", "*.md"],
    "reality": ["src/**/*.js", "src/**/*.ts", "lib/**/*.js"]
  }
}
```

## CI/CD Integration

Add to your GitHub Actions workflow:

```yaml
- name: Check Trust Debt
  run: npx intentguard ci --threshold 1000 --report
```

## Example Hook Script

For more control, create `.husky/check-trust-debt`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

echo "🔍 Checking Trust Debt..."

# Run IntentGuard analysis
npx intentguard ci --threshold 1000

if [ $? -ne 0 ]; then
  echo "❌ Trust Debt too high! Run 'npx intentguard analyze' for details."
  echo "   To bypass: git commit --no-verify"
  exit 1
fi

echo "✅ Trust Debt check passed"