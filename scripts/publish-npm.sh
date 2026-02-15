#!/bin/bash
# NPM Publishing Script for IntentGuard
# This script automates the npm publishing process with safety checks

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== IntentGuard NPM Publishing Script ===${NC}\n"

# 1. Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found. Run this script from the project root.${NC}"
    exit 1
fi

# 2. Check if npm is logged in
echo -e "${BLUE}Checking npm authentication...${NC}"
if ! npm whoami &> /dev/null; then
    echo -e "${RED}Error: Not logged in to npm. Please run 'npm login' first.${NC}"
    exit 1
fi
NPM_USER=$(npm whoami)
echo -e "${GREEN}✓ Logged in as: $NPM_USER${NC}\n"

# 3. Check for uncommitted changes
echo -e "${BLUE}Checking for uncommitted changes...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}Warning: You have uncommitted changes:${NC}"
    git status --short
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${RED}Aborted.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Working directory clean${NC}\n"
fi

# 4. Run tests
echo -e "${BLUE}Running tests...${NC}"
if npm test; then
    echo -e "${GREEN}✓ Tests passed${NC}\n"
else
    echo -e "${RED}Error: Tests failed. Fix tests before publishing.${NC}"
    exit 1
fi

# 5. Build the package
echo -e "${BLUE}Building package...${NC}"
if npm run build; then
    echo -e "${GREEN}✓ Build successful${NC}\n"
else
    echo -e "${RED}Error: Build failed.${NC}"
    exit 1
fi

# 6. Check current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}Current version: ${YELLOW}$CURRENT_VERSION${NC}"

# 7. Check if version exists on npm
echo -e "${BLUE}Checking if version exists on npm...${NC}"
if npm view intentguard@$CURRENT_VERSION version &> /dev/null; then
    echo -e "${RED}Error: Version $CURRENT_VERSION already published to npm.${NC}"
    echo -e "${YELLOW}Please bump the version first using:${NC}"
    echo -e "  npm version patch   # for bug fixes (1.8.3 → 1.8.4)"
    echo -e "  npm version minor   # for new features (1.8.3 → 1.9.0)"
    echo -e "  npm version major   # for breaking changes (1.8.3 → 2.0.0)"
    exit 1
fi
echo -e "${GREEN}✓ Version $CURRENT_VERSION is available${NC}\n"

# 8. Dry run to see what will be published
echo -e "${BLUE}Preview of package contents:${NC}"
npm pack --dry-run | head -20
echo -e "${YELLOW}... (truncated)${NC}\n"

# 9. Final confirmation
echo -e "${YELLOW}Ready to publish intentguard@$CURRENT_VERSION to npm${NC}"
read -p "Continue with publishing? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}Publishing cancelled.${NC}"
    exit 0
fi

# 10. Publish to npm
echo -e "\n${BLUE}Publishing to npm...${NC}"
if npm publish; then
    echo -e "\n${GREEN}✓ Successfully published intentguard@$CURRENT_VERSION!${NC}"

    # 11. Create git tag
    echo -e "\n${BLUE}Creating git tag...${NC}"
    git tag -a "v$CURRENT_VERSION" -m "Release v$CURRENT_VERSION"
    echo -e "${GREEN}✓ Created tag v$CURRENT_VERSION${NC}"

    # 12. Push tag to remote
    read -p "Push tag to GitHub? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push origin "v$CURRENT_VERSION"
        echo -e "${GREEN}✓ Tag pushed to GitHub${NC}"
    fi

    # 13. Verify publication
    echo -e "\n${BLUE}Verifying publication...${NC}"
    sleep 3  # Wait for npm registry to update
    if npm view intentguard@$CURRENT_VERSION version &> /dev/null; then
        echo -e "${GREEN}✓ Package verified on npm registry${NC}"
        echo -e "\n${GREEN}=== Publication Complete ===${NC}"
        echo -e "${BLUE}View at: https://www.npmjs.com/package/intentguard${NC}"
        echo -e "${BLUE}Install with: npm install intentguard@$CURRENT_VERSION${NC}"
    else
        echo -e "${YELLOW}Warning: Could not verify package (may take a few minutes to appear)${NC}"
    fi
else
    echo -e "\n${RED}Error: Publishing failed${NC}"
    exit 1
fi
