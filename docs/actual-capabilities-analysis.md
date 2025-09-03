# IntentGuard Actual Capabilities Analysis

## 🎯 **What IntentGuard Actually Does** (Based on Source Code Examination)

### **Core Classes & Functionality:**

#### **1. IntentGuard Class** (`src/index.js`)
- **Purpose**: Main Trust Debt measurement engine
- **Methods**: 
  - `analyze()` - Core analysis of intent vs reality drift
  - `loadConfig()` - Load `.intent-guard.json` configuration  
  - `extractIntent()` - Parse documentation for intent keywords
  - `extractReality()` - Parse git commits for reality patterns
  - `calculateDrift()` - Measure alignment gaps

#### **2. TrustDebtAnalyzer Class** (`src/trust-debt.js`)  
- **Purpose**: Integration with Trust Debt pipeline scripts
- **Methods**:
  - `detectFullPipeline()` - Check if analysis scripts exist
  - `runBasicAnalysis()` - Execute simplified analysis
  - `installHook()` - Set up git hooks for monitoring
  - `readAnalysisResults()` - Parse existing analysis files

#### **3. TrustDebtCalculator Class** (`src/trust-debt-final.js`)
- **Purpose**: Advanced matrix-based calculation engine
- **Methods**:
  - `analyze()` - Comprehensive asymmetric matrix analysis
  - `buildShortLexCategories()` - Dynamic category extraction
  - `generateHTML()` - HTML report generation

## 🖥️ **Actual CLI Commands**

### **Available Commands** (from `bin/cli.js`):

```bash
intentguard analyze [options]     # Core Trust Debt analysis
intentguard init [options]        # Initialize .intent-guard.json config
intentguard ci [options]          # CI/CD integration mode  
intentguard report [options]      # Generate comprehensive reports
intentguard badge [options]       # Generate Trust Debt badge
intentguard categories [options]  # Generate dynamic categories
intentguard doctor [options]      # System health check
intentguard enterprise           # Enterprise info (no functionality)
```

### **Analysis Options:**
- `-d, --dir <path>` - Project directory
- `-o, --output <format>` - json|html|console
- `--threshold <number>` - CI failure threshold  
- `--generate-categories` - Dynamic category generation
- `--force-categories` - Force category regeneration
- `--full-pipeline` - Matrix-based comprehensive analysis

## 📊 **What The Analysis Actually Measures**

### **Intent Extraction** (`src/index.js:190-250`):
- **Source**: Documentation files (`.md` files)
- **Method**: Keyword frequency analysis from config patterns
- **Categories**: Dynamic from `trust-debt-categories.json` (25 categories)
- **Weight**: Based on file type and documentation depth

### **Reality Extraction** (`src/index.js:170-190`):
- **Source**: Git commit messages (`git log`)  
- **Method**: Keyword pattern matching in commit text
- **Timeframe**: Configurable (default recent commits)
- **Analysis**: Frequency of category keywords in actual work

### **Delta Calculation**:
```javascript
// Patent-based formula (from source)
TrustDebt = Σ((Intent_i - Reality_i)² × Time_i × SpecAge_i × CategoryWeight_i)
```

## 📈 **Report Generation Capabilities**

### **1. Standard Analysis** (`analyze -o html`):
- **Output**: `trust-debt-report.html` (comprehensive matrix)
- **Size**: 135KB+ with full analysis
- **Features**: 
  - 25×25 asymmetric matrix visualization
  - Patent formula calculations  
  - Asymmetry ratio analysis (88.96x)
  - Cold spot detection and recommendations
  - Orthogonality metrics (4.3% correlation)

### **2. Timeline Analysis** (`analyze --full-pipeline`):
- **Output**: `trust-debt-timeline.html` + `trust-debt-matrix-report.html`
- **Features**:
  - Historical progression across all commits (57 analyzed)
  - Temporal Trust Debt evolution (25.8 → 387.8 units)  
  - Per-category trend lines
  - Matrix trade-off analysis (6×6 dynamic categories)

### **3. JSON Output** (`analyze -o json`):
- **Output**: `intent-guard-analysis.json`
- **Content**: Raw analysis data for external tools
- **Structure**: Categories, debt scores, recommendations

## 🔧 **Actual File Processing**

### **Documentation Sources Analyzed:**
- `README.md` (primary intent source)
- `docs/**/*.md` (organized documentation)
- `CONTRIBUTING.md` → `docs/CONTRIBUTING.md` (developer guidelines)
- Dynamic discovery of `.md` files in project

### **Code Sources Analyzed:**
- **Git commits**: `git log` message analysis  
- **Source files**: `src/**/*.js` keyword scanning
- **Lib files**: `lib/**/*.js` built code analysis
- **Scripts**: Various utility scripts (now in `scripts/`)

## ⚠️ **What IntentGuard Does NOT Include**

### **No Email/Notification Features:**
- No email sending capabilities
- No SMTP configuration  
- No notification system
- No automated alerts

### **No External Integrations:**
- No GitHub API calls (uses local git only)
- No Slack/Discord webhooks
- No CI platform integrations beyond exit codes
- No cloud storage or external reporting

### **Local Analysis Only:**
- File system analysis
- Git repository analysis  
- Local HTML report generation
- Local JSON data output

## ✅ **Verified Capabilities** (Tested & Working):

1. **Trust Debt Analysis**: ✅ Working (3715 units calculated)
2. **Matrix Generation**: ✅ Working (25×25 intersections)  
3. **Timeline Analysis**: ✅ Working (57 commits processed)
4. **HTML Report Generation**: ✅ Working (auto-opens in browser)
5. **Dynamic Categories**: ✅ Working (extracts from actual project)
6. **Git Hook Installation**: ✅ Working (automated monitoring)
7. **Badge Generation**: ✅ Working (README integration)
8. **CI/CD Integration**: ✅ Working (exit codes for failure)

## 🎯 **Corrected Understanding**

IntentGuard is a **local analysis tool** that:
- Measures documentation vs implementation drift
- Generates detailed HTML and JSON reports
- Provides mathematical Trust Debt quantification  
- Uses patent-pending orthogonal category analysis
- Works entirely with local git repositories and file systems

**No external dependencies** beyond Node.js and git - it's a self-contained measurement system.