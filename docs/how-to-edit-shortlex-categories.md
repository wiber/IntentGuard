# How to Edit ShortLex Categories in IntentGuard

## 🎯 The Root Cause Issue

**Problem**: IntentGuard has **multiple category systems** that can override each other:
1. `trust-debt-categories.json` (dynamic from file)
2. **Hardcoded fallbacks** in `src/trust-debt-final.js` 
3. Auto-generated categories from `dynamic-category-generator.js`

**Solution**: Edit **both** the JSON file AND the hardcoded fallbacks.

## 🔧 How to Properly Edit Categories

### 1️⃣ **Edit JSON Categories** (`trust-debt-categories.json`):
```json
{
  "categories": [
    {
      "id": "A🚀",
      "name": "Features", 
      "keywords": ["feat", "feature", "add", "implement"],
      "children": [
        {
          "id": "A🚀.1⚡", 
          "name": "Analysis",
          "keywords": ["analysis", "analyze", "calculate"]
        }
      ]
    }
  ]
}
```

### 2️⃣ **Edit Hardcoded Fallbacks** (`src/trust-debt-final.js:102-130`):
```javascript
// Only add hardcoded children if no dynamic config
if (!dynamicConfig || !dynamicConfig.categories) {
    categories.push(
        { id: 'A🚀.1⚡', name: 'Analysis', parent: 'A🚀', depth: 1 },
        { id: 'A🚀.2🔥', name: 'Pipeline', parent: 'A🚀', depth: 1 },
        // ... etc
    );
}
```

### 3️⃣ **Clear Cache and Force Regeneration**:
```bash
rm -rf .trust-debt-cache
node bin/cli.js analyze --force-categories
```

## 🎯 **IntentGuard-Specific Categories** (What Worked):

### **Parent Categories:**
- **A🚀 Features** - feat, feature, add, implement
- **B🔧 Maintenance** - fix, refactor, update, improve  
- **C📚 Documentation** - docs, documentation, readme, guide
- **D🏗️ Infrastructure** - config, setup, init, build
- **E🎯 Quality** - test, quality, lint, validation

### **Child Categories:**
- **A🚀.1⚡ Analysis** - analysis, analyze, calculate
- **A🚀.2🔥 Pipeline** - pipeline, comprehensive, matrix  
- **A🚀.3📈 Visualization** - timeline, report, html
- **B🔧.1🔨 Fixes** - fix, bug, error
- **B🔧.2🔄 Refactoring** - refactor, restructure, organize
- **B🔧.3⬆️ Updates** - update, upgrade, improve
- **C📚.1📝 Content** - docs, documentation, content
- **C📚.2📋 Structure** - organize, structure, refactor
- **D🏗️.1⚙️ Configuration** - config, configuration, setup
- **D🏗️.2📦 Package** - package, dependencies, npm
- **E🎯.1✅ Testing** - test, testing, validate
- **E🎯.2🎨 Formatting** - format, lint, style

## ⚠️ **Categories to Avoid** (SaaS-focused, irrelevant):
- ❌ Defense, Authentication, Monitoring, Encryption
- ❌ LoadTime, Response, Latency, Realtime  
- ❌ AI_Models, Analytics, Prediction, Learning

## 🚀 **Results After Fix:**
- **Grade improved**: D → **C** (4160 units)
- **Better accuracy**: Categories match actual commit language
- **Relevant analysis**: Measures real IntentGuard development activities

## 📋 **Quick Edit Checklist:**
1. [ ] Edit `trust-debt-categories.json` with new categories
2. [ ] Edit hardcoded fallbacks in `src/trust-debt-final.js:102-130`  
3. [ ] Clear cache: `rm -rf .trust-debt-cache`
4. [ ] Test: `node bin/cli.js analyze --force-categories`
5. [ ] Verify: Check report has new category names in visualization

**This dual-edit approach ensures categories work regardless of which system is active.**