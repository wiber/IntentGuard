# IntentGuard Package Refactoring Plan

## ❓ QUESTIONS & BLOCKERS (TO BE RESOLVED)

### Priority Questions:
1. **Test File Organization**: Should we move `test-*.js` files in root to `tests/` or keep them as utility scripts?
2. **Fix Script Files**: Are `fix-*.js` files temporary utilities or permanent tools? Should they go to `scripts/`?
3. **Configuration Files**: Should config files like `intentguard.config.js` go to `config/` or stay in root?
4. **Generated Files**: Should generated files like `trust-debt-report.html` be moved or stay in root for easy access?
5. **Lib Directory**: Current `lib/` appears to contain built/compiled files. Should we preserve this structure?

## 📋 CURRENT STRUCTURE ANALYSIS

### Root Directory Issues:
- **82 files** cluttered in root directory
- **80+ .md files** in root (should be in docs/)
- **Multiple test files** scattered (`test-*.js`)
- **Fix/utility scripts** in root (`fix-*.js`, `generate-*.js`)
- **Configuration files** mixed with source
- **JSON data files** in root

### Current Directory Structure:
```
/
├── bin/cli.js ✅ (correct)
├── lib/ ✅ (built files - keep)
├── src/ ✅ (source files - already structured)
├── tests/ ✅ (test files - needs consolidation)
├── docs/ ✅ (documentation - needs consolidation)
├── config/ ✅ (config files - underutilized)
├── templates/ ✅ (template files)
└── [80+ files in root] ❌ (needs organization)
```

## 🎯 PROPOSED NEW STRUCTURE

```
/
├── bin/
│   └── cli.js
├── lib/
│   ├── index.js
│   └── trust-debt.js
├── src/
│   ├── core/           # Core trust-debt modules
│   ├── analyzers/      # Analysis modules
│   ├── generators/     # HTML/report generators  
│   ├── utilities/      # Utility modules
│   └── index.js
├── tests/
│   ├── unit/
│   ├── integration/
│   └── utilities/
├── scripts/
│   ├── fixes/          # Fix scripts
│   ├── generators/     # Generation scripts
│   └── utilities/      # Utility scripts
├── config/
│   ├── jest.config.js
│   ├── intentguard.config.js
│   └── claude-flow.config.json
├── docs/
│   ├── strategic/      # Strategic documents
│   ├── technical/      # Technical docs
│   ├── patents/        # Patent docs
│   └── api/           # API documentation
├── data/
│   ├── trust-debt-categories.json
│   ├── trust-debt-timeline.json
│   └── generated/     # Generated JSON data
├── reports/
│   ├── trust-debt-report.html
│   ├── coverage/
│   └── analysis/
└── [package.json, README.md, LICENSE] (essential root files only)
```

## 📝 DETAILED REFACTORING STEPS

### Phase 1: Create Directory Structure
- Create missing directories: `scripts/`, `data/`, `reports/`
- Create subdirectories in existing directories

### Phase 2: Move Documentation Files (80+ .md files)
- Strategic docs → `docs/strategic/`
- Technical docs → `docs/technical/`
- Patent docs → `docs/patents/`
- API docs → `docs/api/`

### Phase 3: Move Utility Scripts
- `fix-*.js` → `scripts/fixes/`
- `generate-*.js` → `scripts/generators/`
- `test-*.js` → `scripts/utilities/` (if utility scripts)
- `validate-*.js` → `scripts/utilities/`

### Phase 4: Move Configuration Files
- `jest.config.js` → `config/`
- `intentguard.config.js` → `config/`
- `documentation-config.json` → `config/`

### Phase 5: Move Data Files
- `trust-debt-categories*.json` → `data/`
- `trust-debt-timeline.json` → `data/`
- `trust-debt-dynamic.json` → `data/`
- `intent-guard-analysis.json` → `data/`

### Phase 6: Move Generated Reports
- `trust-debt-*.html` → `reports/`
- `coverage/` → `reports/coverage/`

### Phase 7: Reorganize Source Files
- Core modules → `src/core/`
- Analyzers → `src/analyzers/`
- HTML generators → `src/generators/`
- Utilities → `src/utilities/`

### Phase 8: Move Test Files
- `test/` content → `tests/unit/`
- Root test files → appropriate test directories

### Phase 9: Update References
- Update all `require()` and `import` statements
- Update package.json paths
- Update configuration file references
- Update documentation links

### Phase 10: Validation
- Test IntentGuard functionality after each phase
- Run npm scripts to ensure they work
- Validate CLI functionality

## 🔧 IMPLEMENTATION STRATEGY

1. **Incremental Approach**: Move files in small batches
2. **Test After Each Step**: Verify IntentGuard still works
3. **Backup Important Files**: Create backups before major moves
4. **Update References Immediately**: Fix imports after each move
5. **Validate CLI**: Test `intentguard` command after each phase

## 📊 SUCCESS METRICS

- [ ] Root directory reduced from 155 to <20 files
- [ ] All .md files properly organized in docs/
- [ ] All scripts in scripts/ directory  
- [ ] All data files in data/ directory
- [ ] All reports in reports/ directory
- [ ] IntentGuard CLI still functional
- [ ] All npm scripts work correctly
- [ ] All tests pass
- [ ] No broken imports/exports

## 🚨 RISK MITIGATION

- **Backup Strategy**: Create git branch before major changes
- **Validation Points**: Test functionality after each phase
- **Rollback Plan**: Keep track of moved files for quick rollback
- **Import Tracking**: Maintain list of all import changes needed

---

**Status**: Ready to begin Phase 1 - awaiting approval and question resolution