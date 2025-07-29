#!/bin/bash

# IntentGuard Quick Start Script
# This helps you get IntentGuard running quickly

echo "🎯 IntentGuard Quick Start"
echo "========================="
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Check for OpenAI API key
if [ -z "$OPENAI_API_KEY" ]; then
    echo ""
    echo "⚠️  No OpenAI API key found in environment."
    echo "   You'll be prompted to enter one during 'intentguard init'"
    echo ""
fi

# Make bin script executable
chmod +x bin/intentguard.js

echo ""
echo "✅ IntentGuard is ready!"
echo ""
echo "Next steps:"
echo "1. Link globally:    npm link"
echo "2. Go to a git repo: cd /path/to/your/repo"
echo "3. Initialize:       intentguard init"
echo "4. Make commits:     git commit -m 'your message'"
echo ""
echo "Or run the demo:"
echo "   export OPENAI_API_KEY=your-key-here"
echo "   node example/demo.js"
echo ""