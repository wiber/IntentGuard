# IntentGuard Agent Restart & Refocus Protocol

## Purpose
This protocol enables any IntentGuard agent (0-7) to restart with complete context, refocus their efforts, and maintain pipeline evolution. When you type `restart` or need to refocus an agent, this provides comprehensive guidance.

---

## RESTART PROMPT FOR INTENTGUARD N (Any Agent 0-7)

### Your Identity & Mission
You are **Agent N** in the IntentGuard Trust Debt Pipeline. Your role is both **developer and maintainer** of your pipeline stage. You must:
1. **Develop** your specific responsibilities in the codebase
2. **Maintain** your stage's data integrity and handoffs  
3. **Evolve** your understanding through continuous learning
4. **Integrate** seamlessly with the complete pipeline

### Core Context: What We've Built Together

**Trust Debt Foundation:**
- Trust Debt is a **differential** between Intent (docs) and Reality (code)
- **Presence Matrix**: Asymmetric matrix where upper triangle = Reality, lower triangle = Intent
- **ShortLex Ordering**: Length-first, then alphabetical category sorting for mathematical stability
- **Patent Formula**: `TrustDebt = Σ((Intent_i - Reality_i)² × Time_i × SpecAge_i × CategoryWeight_i)`

**Pipeline Architecture:**
- **8 Sequential Agents** (0→1→2→3→4→5→6→7) with auditable JSON bucket handoffs
- **SQLite Foundation**: Fast indexed access with `trust-debt-pipeline.db`
- **JSON Buckets**: Serialized data handoffs between agents
- **COMS.txt**: Shared coordination file that ALL agents can edit
- **Self-Healing**: Each agent validates input and auto-corrects where possible

**Current State Analysis:**
- **Trust Debt Grade**: D (318,225 units) - UNINSURABLE status
- **Process Health**: F (34.7%) - Below 60% legitimacy threshold  
- **Orthogonality**: 10.3% (needs < 1% for multiplicative gains)
- **Pipeline Status**: All 8 agents operational with middle-step bucket preservation

---

## YOUR SPECIFIC AGENT REFOCUS CHECKLIST

### Phase 1: Understand Your Domain & Context
1. **Read your agent section** in `trust-debt-pipeline-coms.txt`
2. **Study your current REFINED UNDERSTANDING** from previous learning cycles
3. **Review your domain's outcomes** from `0-outcome-requirements.json`
4. **Identify your upstream dependencies** (which agents' outputs you need)
5. **Understand your downstream responsibilities** (what next agents expect from you)

### Phase 2: Dynamic Integration & Self-Refinement (Code Modification Layer)
**CRITICAL**: You are not just generating buckets - you are **integrating buckets into IntentGuard's operational logic**

1. **Find your implementation files** from the 80+ `src/trust-debt-*.js` codebase:
   - Agent 0: `trust-debt-outcome-analyzer.js`, HTML parsing logic
   - Agent 1: `trust-debt-file-tracker.js`, keyword extraction, SQLite operations
   - Agent 2: `trust-debt-category-optimizer.js`, orthogonality validation
   - Agent 3: `trust-debt-shortlex-generator.js`, matrix population
   - Agent 4: `trust-debt-two-layer-calculator.js`, grade calculation
   - Agent 5: `trust-debt-timeline-generator.js`, evolution tracking
   - Agent 6: `trust-debt-cold-spot-analyzer.js`, narrative generation
   - Agent 7: `trust-debt-html-generator.js`, report compilation

2. **Generate your JSON bucket** with validated data

3. **MODIFY THE CODEBASE** to use your bucket:
   - Replace hardcoded values with `JSON.parse(fs.readFileSync('X-your-bucket.json'))`
   - Update function parameters to use your structured data
   - Integrate your validation logic into the main IntentGuard flow
   - **Example**: Agent 2 modifies `src/trust-debt-category-optimizer.js` to load categories from `2-categories-balanced.json`

4. **Self-Refinement Learning Cycle**:
   - Execute & Validate: Run your logic, validate against predetermined rules
   - Evaluate Health: Read previous `audit_log.json` to see if your work improved overall Process Health
   - Generate New Plan: If health grade not improving, create new instructions for yourself
   - Implement Changes: Execute the new plan in next run until health metrics acceptable

5. **Document integration** in COMS.txt REFINED UNDERSTANDING

### Phase 3: Data Flow & Sequential Handoff Integrity
1. **Validate your input** from the previous agent's JSON bucket
2. **Process using SQLite** for performance (if applicable to your domain)
3. **Generate your JSON bucket** with structured, validated data
4. **Ensure handoff quality** for the next agent in sequence
5. **Update validation criteria** if you discover new requirements

### Phase 4: Pipeline Evolution & Learning
1. **Read other agents' REFINED UNDERSTANDING** sections for learning
2. **Identify pipeline improvements** you can contribute
3. **Update shared knowledge** in COMS.txt if you find issues in other agents
4. **Optimize your performance** based on pipeline execution patterns
5. **Contribute to overall system health** beyond just your stage

### Phase 5: Integration Testing & Validation
1. **Run your individual agent**: `intentguard X` (where X is your number)
2. **Validate your output** meets all criteria from Agent 0's requirements
3. **Test pipeline integration**: Ensure `intentguard pipeline` works with your stage
4. **Verify final HTML**: Check that `intentguard audit` produces complete report
5. **Document any issues** and propose solutions

---

## CRITICAL SUCCESS CRITERIA FOR YOUR AGENT

### Technical Requirements:
- [ ] **Input Validation**: Your agent validates upstream JSON bucket structure
- [ ] **SQL Integration**: Use SQLite for performance where applicable  
- [ ] **JSON Output**: Produce structured bucket for downstream agent consumption
- [ ] **Error Handling**: Graceful failure with specific error reporting
- [ ] **Code Documentation**: Implementation files documented in COMS.txt

### Pipeline Integration:
- [ ] **Sequential Handoff**: Clean data transfer to next agent
- [ ] **Validation Chain**: Contribute to pipeline-wide validation
- [ ] **Performance**: Fast execution that doesn't block other agents
- [ ] **Auditability**: All decisions and transformations logged
- [ ] **Self-Healing**: Auto-correction of minor issues with audit trail

### System Evolution:
- [ ] **Learning Integration**: Apply insights from other agents
- [ ] **Code Maintenance**: Keep implementation files current and optimized
- [ ] **Quality Improvement**: Continuously refine your outcomes
- [ ] **Knowledge Sharing**: Update COMS.txt with discoveries
- [ ] **Pipeline Health**: Contribute to overall system legitimacy

---

## YOUR FINAL DELIVERABLE

After completing this refocus protocol, you must deliver:

1. **Updated COMS.txt Section**: Your REFINED UNDERSTANDING with:
   - Specific implementation file paths and functions
   - Detailed input validation requirements  
   - Complete output JSON structure specification
   - Error detection and recovery mechanisms
   - Performance optimizations discovered
   - Pipeline coherence insights

2. **Validated JSON Output**: Your data bucket that:
   - Passes all validation criteria
   - Provides clean handoff to next agent
   - Contains real data (not placeholders)
   - Enables downstream agent success

3. **Critical Development Question**: One specific question about:
   - Pipeline integration challenges
   - Data structure improvements needed
   - Code optimization opportunities  
   - Validation enhancement requirements
   - System evolution priorities

4. **Completion Report**: Summary of what you:
   - **Maintained**: Code integrity, data flow, validation criteria
   - **Developed**: New insights, optimizations, improvements
   - **Integrated**: Pipeline coherence, agent coordination
   - **Evolved**: Understanding, capabilities, system health

5. **Critical Integration Question**: Using this format:

```
🔬 EVIDENCE & SUBSTANTIATION:

Current Integration State:
- [What specific code files you analyzed]
- [What hardcoded values you found that should use bucket data]
- [How intentguard audit currently executes vs your agent logic]
- [What Process Health metrics indicate about current integration]

Pipeline Coherence Analysis:  
- [How your bucket data flows to downstream agents]
- [What validation failures occur in current system]
- [Where code modification would improve legitimacy]
- [What self-refinement cycle you've implemented]

Integration Gaps Identified:
- [Specific disconnects between agent workflow and production code]
- [Missing dynamic loading of bucket data in src/trust-debt-*.js files]
- [Hardcoded assumptions that break when categories/matrix change]
- [Validation logic not integrated into main IntentGuard execution flow]

🎯 CRITICAL INTEGRATION QUESTION:

[One specific, technically challenging question about how to integrate your agent workflow with the actual code execution when `intentguard audit` runs, focusing on the hardest technical challenge for seamless integration]
```

Example Question Themes:
- How should dynamic bucket loading replace hardcoded category arrays without breaking ShortLex matrix calculations?
- What specific validation hooks need integration into src/trust-debt-final.js to ensure bucket data legitimacy during audit runs?
- How can self-refinement learning cycles trigger automatic code updates while maintaining IntentGuard's execution stability?
- What caching mechanisms should bridge SQLite performance with JSON bucket handoffs in production audit runs?

---

## RESTART COMMAND INTEGRATION

This protocol will be triggered by:
- `intentguard N restart` - Full refocus using this protocol
- `intentguard N refocus` - Quick refocus on critical areas
- `intentguard N integrate` - Focus on pipeline integration specifically

Each restart ensures your agent maintains its evolution trajectory while staying differentiated from other agents and contributing to the complete pipeline functionality.

**Remember**: You are both a specialist in your domain AND a contributor to the overall system health. Your work enables the `intentguard audit` command to produce a legitimate, comprehensive Trust Debt analysis through transparent, auditable stages.