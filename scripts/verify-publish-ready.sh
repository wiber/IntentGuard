#!/bin/bash

# IntentGuard Publishing Verification Script
# Verifies package is ready for npm publishing

set -e

echo "🔍 IntentGuard Publishing Verification"
echo "======================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print status
print_status() {
    if [ "$1" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} $2"
    elif [ "$1" == "FAIL" ]; then
        echo -e "${RED}✗${NC} $2"
        ERRORS=$((ERRORS + 1))
    elif [ "$1" == "WARN" ]; then
        echo -e "${YELLOW}⚠${NC} $2"
        WARNINGS=$((WARNINGS + 1))
    else
        echo "  $2"
    fi
}

# 1. Check npm authentication
echo "📦 NPM Authentication"
echo "-------------------"
if npm whoami >/dev/null 2>&1; then
    NPM_USER=$(npm whoami)
    print_status "PASS" "Authenticated as: $NPM_USER"
else
    print_status "FAIL" "Not authenticated with npm (run: npm login)"
fi
echo ""

# 2. Check package.json validity
echo "📋 Package Configuration"
echo "----------------------"
if [ -f "package.json" ]; then
    print_status "PASS" "package.json exists"

    # Check required fields
    NAME=$(node -p "require('./package.json').name" 2>/dev/null)
    VERSION=$(node -p "require('./package.json').version" 2>/dev/null)
    DESCRIPTION=$(node -p "require('./package.json').description" 2>/dev/null)
    LICENSE=$(node -p "require('./package.json').license" 2>/dev/null)

    if [ "$NAME" == "intentguard" ]; then
        print_status "PASS" "Package name: $NAME"
    else
        print_status "FAIL" "Invalid package name: $NAME"
    fi

    if [ ! -z "$VERSION" ]; then
        print_status "PASS" "Version: $VERSION"
    else
        print_status "FAIL" "Version not set"
    fi

    if [ ! -z "$DESCRIPTION" ]; then
        print_status "PASS" "Description present"
    else
        print_status "WARN" "Description missing or empty"
    fi

    if [ "$LICENSE" == "MIT" ]; then
        print_status "PASS" "License: $LICENSE"
    else
        print_status "WARN" "License: $LICENSE (expected MIT)"
    fi
else
    print_status "FAIL" "package.json not found"
fi
echo ""

# 3. Check critical files
echo "📁 Required Files"
echo "---------------"
for file in "README.md" "LICENSE" "package.json" "bin/cli.js"; do
    if [ -f "$file" ]; then
        print_status "PASS" "$file exists"
    else
        print_status "FAIL" "$file missing"
    fi
done
echo ""

# 4. Check build output
echo "🔨 Build Status"
echo "-------------"
if [ -d "lib" ]; then
    print_status "PASS" "lib/ directory exists"

    if [ -f "lib/index.js" ]; then
        print_status "PASS" "lib/index.js exists"
    else
        print_status "FAIL" "lib/index.js missing (run: npm run build)"
    fi
else
    print_status "FAIL" "lib/ directory missing (run: npm run build)"
fi
echo ""

# 5. Check for uncommitted changes
echo "🔄 Git Status"
echo "-----------"
if git rev-parse --git-dir > /dev/null 2>&1; then
    if [ -z "$(git status --porcelain)" ]; then
        print_status "PASS" "Working directory clean"
    else
        print_status "WARN" "Uncommitted changes detected"
        git status --short
    fi

    # Check if on main branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" == "main" ] || [ "$CURRENT_BRANCH" == "master" ]; then
        print_status "PASS" "On main branch: $CURRENT_BRANCH"
    else
        print_status "WARN" "Not on main branch (current: $CURRENT_BRANCH)"
    fi
else
    print_status "WARN" "Not a git repository"
fi
echo ""

# 6. Test build
echo "🧪 Build Test"
echo "-----------"
print_status "INFO" "Running: npm run build"
if npm run build >/dev/null 2>&1; then
    print_status "PASS" "Build succeeded"
else
    print_status "FAIL" "Build failed (check TypeScript errors)"
fi
echo ""

# 7. Check package size
echo "📦 Package Size"
echo "-------------"
if command -v npm >/dev/null 2>&1; then
    PACK_OUTPUT=$(npm pack --dry-run 2>&1)

    # Extract package size from npm pack output
    PACKAGE_SIZE=$(echo "$PACK_OUTPUT" | grep "package size:" | awk '{print $3, $4}')
    UNPACKED_SIZE=$(echo "$PACK_OUTPUT" | grep "unpacked size:" | awk '{print $3, $4}')
    FILE_COUNT=$(echo "$PACK_OUTPUT" | grep "total files:" | awk '{print $3}')

    if [ ! -z "$PACKAGE_SIZE" ]; then
        print_status "INFO" "Package size: $PACKAGE_SIZE"
    fi

    if [ ! -z "$UNPACKED_SIZE" ]; then
        print_status "INFO" "Unpacked size: $UNPACKED_SIZE"
    fi

    if [ ! -z "$FILE_COUNT" ]; then
        print_status "INFO" "Total files: $FILE_COUNT"
    fi
fi
echo ""

# 8. Check for common issues
echo "⚠️  Common Issues"
echo "--------------"

# Check for node_modules in files
if grep -q "node_modules" .npmignore 2>/dev/null || grep -q "node_modules" package.json 2>/dev/null; then
    print_status "PASS" "node_modules excluded from package"
else
    print_status "WARN" "node_modules may be included (check .npmignore)"
fi

# Check for test files
if grep -q "test" .npmignore 2>/dev/null; then
    print_status "PASS" "Test files excluded from package"
else
    print_status "WARN" "Test files may be included"
fi

# Check for .env files
if [ -f ".env" ]; then
    print_status "WARN" ".env file exists (ensure it's in .npmignore)"
else
    print_status "PASS" "No .env file found"
fi
echo ""

# 9. Summary
echo "📊 Summary"
echo "--------"
echo -e "Errors:   ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Package is ready for publishing!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review PUBLISHING.md for detailed instructions"
    echo "  2. Update version: npm version [patch|minor|major]"
    echo "  3. Test locally: npm pack && npm install ./intentguard-*.tgz"
    echo "  4. Publish: npm publish"
    echo "  5. Push to git: git push origin main --tags"
    exit 0
else
    echo -e "${RED}✗ Package has $ERRORS error(s) that must be fixed${NC}"
    echo ""
    echo "Please fix the errors above before publishing."
    exit 1
fi
