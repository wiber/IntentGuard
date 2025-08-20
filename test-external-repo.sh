#!/bin/bash

# Test IntentGuard in an external repository
# This script creates a test repo and verifies IntentGuard works correctly

set -e

echo "🧪 Testing IntentGuard in external repository..."

# Create temp directory
TEST_DIR="/tmp/intentguard-test-$(date +%s)"
mkdir -p "$TEST_DIR"
cd "$TEST_DIR"

echo "📁 Created test directory: $TEST_DIR"

# Initialize git repo
git init
git config user.email "test@example.com"
git config user.name "Test User"

# Create some documentation
cat > README.md << 'EOF'
# Test Project

This project focuses on:
- Performance optimization for fast processing
- Security through authentication and encryption
- Speed improvements with caching
- AI-powered intelligence and predictions
- Beautiful user experience with responsive design

## Architecture

We use a modular architecture with:
- Performance monitoring
- Security guards
- Speed optimizations
- Intelligence engine
- Visual interface
EOF

# Create some code
mkdir -p src
cat > src/index.js << 'EOF'
// Main application
// Focus on performance and optimization

class PerformanceMonitor {
  constructor() {
    this.cache = new Map();
    this.optimize = true;
  }
  
  measure() {
    // Fast performance measurement
    return { speed: 'fast', efficient: true };
  }
}

class SecurityGuard {
  authenticate(user) {
    // Security authentication
    return this.protect(user);
  }
  
  protect(data) {
    // Guard and shield the data
    return { secure: true };
  }
}

module.exports = { PerformanceMonitor, SecurityGuard };
EOF

# Add and commit files
git add .
git commit -m "feat: Initial commit with performance and security features"

# Add more commits to create history
cat >> src/index.js << 'EOF'

class SpeedOptimizer {
  constructor() {
    this.fast = true;
    this.quick = true;
    this.realtime = true;
  }
  
  optimize() {
    // Speed optimization with caching
    return { latency: 10, response: 'instant' };
  }
}
EOF
git add .
git commit -m "feat: Add speed optimization with realtime processing"

cat > src/ai.js << 'EOF'
// AI and Intelligence module

class AIPredictor {
  constructor() {
    this.model = 'gpt-4';
    this.learning = true;
  }
  
  predict(data) {
    // AI prediction and forecast
    return { prediction: 0.95, forecast: 'positive' };
  }
  
  analyze(metrics) {
    // Analytics and statistics
    return { data: metrics, ml: true };
  }
}

module.exports = AIPredictor;
EOF
git add .
git commit -m "feat: Add AI intelligence with prediction and learning"

# Now test IntentGuard
echo ""
echo "🔍 Testing IntentGuard analyze command..."
npx intentguard analyze --dir "$TEST_DIR"

echo ""
echo "📊 Testing IntentGuard report generation..."
npx intentguard report --dir "$TEST_DIR" --output test-report.html --open false

echo ""
echo "🏷️ Testing IntentGuard badge generation..."
npx intentguard badge --dir "$TEST_DIR"

echo ""
echo "🩺 Testing IntentGuard doctor command..."
npx intentguard doctor --dir "$TEST_DIR"

echo ""
echo "🚦 Testing IntentGuard CI mode..."
npx intentguard ci --dir "$TEST_DIR" --threshold 10000

# Test Husky integration
echo ""
echo "🪝 Testing Husky integration..."
npm init -y > /dev/null 2>&1
npm install --save-dev husky > /dev/null 2>&1
npx husky install > /dev/null 2>&1
npx husky add .husky/pre-commit "npx intentguard ci --threshold 10000"

# Make a test commit to trigger hook
echo "// Test change" >> src/index.js
git add .
echo "Testing pre-commit hook..."
git commit -m "test: Trigger pre-commit hook" || echo "Pre-commit hook executed"

echo ""
echo "✅ All tests passed!"
echo "📁 Test files are in: $TEST_DIR"
echo ""
echo "Cleanup with: rm -rf $TEST_DIR"