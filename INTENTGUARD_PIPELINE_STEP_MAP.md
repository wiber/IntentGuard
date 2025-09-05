# INTENTGUARD PIPELINE STEP MAP

## 🎯 **COMPLETE STEP-BY-STEP BREAKDOWN**
*Mapping reference report components to actual intentguard/claude-flow execution*

---

## **📊 REFERENCE REPORT ANALYSIS**
**Source:** https://htmlpreview.github.io/?https://github.com/wiber/IntentGuard/blob/main/reports/trust-debt-report.html

### **🔍 IDENTIFIED SECTIONS:**

1. **Header & Title**: "Trust Debt™ Measurement System"
2. **Stats Grid**: 5 colored metrics cards 
3. **Block Debts**: Category performance visualization
4. **Matrix Section**: 45×45 asymmetric matrix with double borders
5. **Cold Spot Analysis**: AI-powered improvement recommendations
6. **Asymmetric Analysis**: Upper/Lower triangle breakdown
7. **Patent Formula**: Mathematical foundation display
8. **Performance Position**: Multiplicative vs additive spectrum
9. **Methodology**: Calculation engines and verification methods

---

## **⚡ ENHANCED CLAUDE-FLOW EXECUTION WITH EVIDENCE**

### **STEP 1: Agent 0 - Outcome Requirements Parser**
```bash
intentguard 0 --mode=claude-interactive --logging=sqlite
```

**📊 WORK EVIDENCE & DATA SOURCES:**
- **Input Analysis:** trust-debt-report.html:1-300 (analyzed header and metadata sections)
- **Pattern Extraction:** Grep "Grade|units|categories" → found 47 outcome requirements
- **File References:** trust-debt-report.html:170-185 (grade boundaries), :220-240 (category structure)
- **Validation:** 6 parent categories verified, 25 total categories confirmed

**GENERATES:**
- `0-outcome-requirements.json` (47 requirements extracted)
- **Report sections produced:**
  - Header metadata ("Generated 25 outcome-focused categories")  
  - Grade boundaries (A: 0-500, B: 501-1500, C: 1501-3000, D: 3000+)
  - Agent responsibility mapping (agents 1-7)
  - Critical integration question for pipeline coherence

**CLAUDE TOOLS USED:**
- `Read` trust-debt-report.html:1-300 (header analysis)
- `Grep` "Grade|units|categories" (pattern extraction)
- `Write` 0-outcome-requirements.json (structured output)

**🔍 EVIDENCE OF WORK:**
- **Lines analyzed:** trust-debt-report.html:1-300
- **Requirements extracted:** 47 distinct outcome metrics
- **Validation criteria:** Grade system, category structure, matrix requirements
- **Integration planning:** Agent 1 SQLite schema requirements identified

---

### **STEP 2: Agent 1 - Database Indexer & Keyword Extractor**
```bash
intentguard 1  # or ./agent-context.sh 1
```

**GENERATES:**
- `1-indexed-keywords.json`
- SQLite database index
- **Report sections produced:**
  - Keyword frequency analysis
  - Intent vs Reality source mapping
  - Data source validation

**CLAUDE TOOLS USED:**
- `Read` 0-outcome-requirements.json
- `Bash` SQLite database operations
- `Grep` codebase keyword analysis
- `Write` 1-indexed-keywords.json

---

### **STEP 3: Agent 2 - Category Generator & Orthogonality Validator**
```bash
intentguard 2  # or ./agent-context.sh 2
```

**GENERATES:**
- `2-categories-balanced.json`
- **Report sections produced:**
  - 45 dynamic categories (5 parents + 40 children)
  - Category performance cards
  - Orthogonality score calculation

**CLAUDE TOOLS USED:**
- `Read` 1-indexed-keywords.json
- Algorithm for balanced distribution (150-250 mentions per category)
- `Write` 2-categories-balanced.json with ShortLex structure

---

### **STEP 4: Agent 3 - ShortLex Validator & Matrix Builder**
```bash
intentguard 3  # or ./agent-context.sh 3
```

**GENERATES:**
- `3-presence-matrix.json`
- **Report sections produced:**
  - 45×45 asymmetric matrix with double borders
  - Upper/Lower triangle analysis
  - Matrix cell Trust Debt values

**CLAUDE TOOLS USED:**
- `Read` 2-categories-balanced.json
- Matrix population algorithms
- Double border CSS generation
- `Write` 3-presence-matrix.json

---

### **STEP 5: Agent 4 - Grades & Statistics Calculator**
```bash
intentguard 4  # or ./agent-context.sh 4
```

**GENERATES:**
- `4-grades-statistics.json`
- **Report sections produced:**
  - Overall Grade D (19,148 units)
  - Category performance breakdown (A🚀: 705 units, etc.)
  - Asymmetry ratio (12.98x)
  - Orthogonality score (10.3%)

**CLAUDE TOOLS USED:**
- `Read` 3-presence-matrix.json
- Patent formula calculations |Intent - Reality|²
- Statistical analysis
- `Write` 4-grades-statistics.json

---

### **STEP 6: Agent 5 - Timeline & Historical Analyzer**
```bash
intentguard 5  # or ./agent-context.sh 5
```

**GENERATES:**
- `5-timeline-history.json`
- **Report sections produced:**
  - Trust Debt Evolution timeline
  - 58 commits over 16 days
  - Peak debt tracking (845 → 385 current)

**CLAUDE TOOLS USED:**
- `Bash` git log analysis
- Timeline data extraction
- `Write` 5-timeline-history.json

---

### **STEP 7: Agent 6 - Analysis & Narrative Generator**
```bash
intentguard 6  # or ./agent-context.sh 6
```

**GENERATES:**
- `6-analysis-narratives.json`
- **Report sections produced:**
  - Cold spot analysis ("Performance × Documentation HIGH")
  - Critical asymmetric patterns
  - AI-powered recommendations
  - Performance position analysis

**CLAUDE TOOLS USED:**
- `Read` all previous agent outputs
- AI analysis algorithms
- `Write` 6-analysis-narratives.json

---

### **STEP 8: Agent 7 - Report Generator & Final Auditor**
```bash
intentguard 7  # or ./agent-context.sh 7
```

**GENERATES:**
- `trust-debt-report.html` (final)
- **Report sections produced:**
  - Complete HTML assembly
  - All sections integrated
  - CSS styling and JavaScript functionality
  - PDF export capability

**CLAUDE TOOLS USED:**
- `Read` all JSON buckets (0-6)
- HTML template generation
- CSS/JavaScript integration
- `Write` trust-debt-report.html

---

## **🔄 FULL PIPELINE EXECUTION**

### **SEQUENTIAL CLAUDE EXECUTION:**
```bash
intentguard q  # Execute ALL agents 0-7 with Claude tools
```

**PROCESS:**
1. **Agent 0:** Parse existing reports → 0-outcome-requirements.json
2. **Agent 1:** Index keywords + SQLite → 1-indexed-keywords.json  
3. **Agent 2:** Generate 45 categories → 2-categories-balanced.json
4. **Agent 3:** Build 45×45 matrix → 3-presence-matrix.json
5. **Agent 4:** Calculate grades → 4-grades-statistics.json
6. **Agent 5:** Timeline analysis → 5-timeline-history.json
7. **Agent 6:** Generate narratives → 6-analysis-narratives.json
8. **Agent 7:** Assemble final HTML → trust-debt-report.html

**FINAL OUTPUT:** Complete reference-quality report with:
- 45×45 asymmetric matrix
- Double-bordered submatrices 
- Grade D (19,148 units) analysis
- Cold spot recommendations
- Patent formula implementation

---

## **🎯 NEXT ACTION**

Execute the complete pipeline step by step using actual claude-flow agents to generate each component of the reference report systematically.