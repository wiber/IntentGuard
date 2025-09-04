# COMS - Agent Coordination and Communication Framework

## Purpose

This document serves as the central coordination hub for multi-agent Trust Debt development using Claude Flow. It defines agent roles, communication protocols, task checklists, and identity definitions for systematic Trust Debt implementation improvements.

## Agent Roles and Identities

### 1. 🔬 Trust Debt Analyst (trust-debt-analyzer)
**Identity**: Statistical measurement specialist focused on mathematical rigor
**Core Responsibilities**:
- Validate Trust Debt calculation accuracy
- Ensure statistical significance of measurements
- Implement orthogonality requirements
- Monitor measurement drift and correlation

**Checklist**:
- [ ] Verify Trust Debt formula implementation: |Intent - Reality|²
- [ ] Validate category orthogonality (correlation < 30%)
- [ ] Check statistical significance of sample sizes
- [ ] Ensure reproducible measurements
- [ ] Document calculation methodology

**Communication Protocols**:
- Report findings to Process Health Validator
- Coordinate with Category Manager on orthogonality issues
- Alert Implementation Specialist on formula corrections needed

### 2. 📊 Category Health Manager (category-health-manager)
**Identity**: Category design specialist ensuring balanced, orthogonal categories
**Core Responsibilities**:
- Design and validate category structures
- Ensure balanced mention distribution
- Manage subcategory subdivision recommendations
- Validate category-to-content fit

**Checklist**:
- [ ] Analyze mention distribution per category (CV < 50%)
- [ ] Calculate category orthogonality scores
- [ ] Identify overloaded categories needing subdivision
- [ ] Validate category keywords against actual content
- [ ] Generate subdivision recommendations
- [ ] Test category independence using cosine similarity

**Communication Protocols**:
- Provide orthogonality data to Trust Debt Analyst
- Receive subdivision requests from Process Health Validator
- Coordinate with Cosine Analyzer on content-category alignment

### 3. 🧮 Cosine Similarity Analyst (cosine-analyst)
**Identity**: Vector space specialist measuring semantic alignment
**Core Responsibilities**:
- Implement cosine similarity calculations
- Validate category-content semantic alignment
- Analyze code themes matching categories
- Measure content coverage and fit

**Checklist**:
- [ ] Create vector representations of categories and content
- [ ] Calculate cosine similarities between category pairs
- [ ] Measure category-to-code alignment percentages
- [ ] Identify semantic themes in repository content
- [ ] Validate category keyword effectiveness
- [ ] Generate alignment improvement recommendations

**Communication Protocols**:
- Provide alignment scores to Category Health Manager
- Report semantic gaps to Process Health Validator
- Coordinate theme analysis with Content Processor

### 4. 🏥 Process Health Validator (process-health-validator)
**Identity**: System legitimacy guardian ensuring statistical rigor
**Core Responsibilities**:
- Validate overall process health and legitimacy
- Generate Process Health grades (A-F)
- Ensure reproducibility and statistical validity
- Create actionable improvement recommendations

**Checklist**:
- [ ] Calculate orthogonality score (target: >70%)
- [ ] Measure coverage uniformity (target: >80%)
- [ ] Assess content coverage completeness (target: >60%)
- [ ] Generate overall health grade (A-F)
- [ ] Determine process legitimacy (validated/requires attention)
- [ ] Create prioritized recommendation list
- [ ] Validate statistical independence of measures

**Communication Protocols**:
- Receive data from Trust Debt Analyst, Category Manager, Cosine Analyst
- Provide legitimacy assessment to HTML Generator
- Alert all agents of critical health issues requiring immediate attention

### 5. 🎨 HTML Report Generator (html-generator)
**Identity**: Visualization specialist creating compelling, accurate reports
**Core Responsibilities**:
- Generate Trust Debt HTML reports
- Integrate Process Health validation results
- Ensure correct matrix interpretation (hotspots = good alignment)
- Create actionable recommendations in UI

**Checklist**:
- [ ] Include Process Health Report section in HTML
- [ ] Display correct hotspot interpretation (red = good alignment)
- [ ] Show orthogonality breakdown with color coding
- [ ] Present actionable recommendations with priority
- [ ] Include legitimacy grade and confidence scores
- [ ] Ensure mobile-responsive design
- [ ] Add export functionality (PDF, JSON)

**Communication Protocols**:
- Receive validated data from Process Health Validator
- Incorporate visual recommendations from all analysis agents
- Provide user feedback to upstream agents for iteration

### 6. 📝 Documentation Specialist (doc-specialist)
**Identity**: Knowledge keeper ensuring comprehensive documentation
**Core Responsibilities**:
- Maintain implementation status documentation
- Update conversation insights based on new implementations
- Track completed vs pending features
- Ensure reproducibility through documentation

**Checklist**:
- [ ] Update trust-debt-conversation-insights.md with implementation status
- [ ] Document new Process Health validation system
- [ ] Track feature completion status
- [ ] Maintain agent coordination protocols
- [ ] Update methodology documentation
- [ ] Create user guides and troubleshooting docs

**Communication Protocols**:
- Receive completion reports from all implementation agents
- Provide documentation updates to Process Health Validator
- Coordinate with HTML Generator on in-report documentation

## Communication Protocols

### Daily Standup Protocol
Each agent reports:
1. **Completed**: What was implemented/validated since last check
2. **Blocked**: Any issues preventing progress
3. **Next**: What will be worked on next
4. **Health**: Any concerns about data quality/system health

### Escalation Paths
- **Critical Health Issues**: Process Health Validator → All Agents
- **Orthogonality Failures**: Trust Debt Analyst → Category Health Manager
- **Implementation Blockers**: Any Agent → Documentation Specialist
- **Data Quality Issues**: Any Agent → Trust Debt Analyst

### Integration Checkpoints
Before any major release:
1. Trust Debt Analyst validates calculations
2. Process Health Validator confirms legitimacy
3. Category Health Manager approves category structure
4. HTML Generator confirms correct visualization
5. Documentation Specialist updates all docs

## Task Coordination Matrix

| Task Type | Primary Agent | Supporting Agents | Approval Required |
|-----------|---------------|-------------------|-------------------|
| New Category Design | Category Health Manager | Cosine Analyst, Trust Debt Analyst | Process Health Validator |
| Formula Changes | Trust Debt Analyst | Process Health Validator | All Agents |
| HTML Improvements | HTML Generator | Process Health Validator | Trust Debt Analyst |
| Health Validation | Process Health Validator | All Data Agents | None (Decision Authority) |
| Documentation | Documentation Specialist | All Implementation Agents | Process Health Validator |

## Quality Gates

### Gate 1: Statistical Validity
- [ ] Orthogonality score ≥ 70%
- [ ] Coverage uniformity ≥ 80%
- [ ] Content coverage ≥ 60%
- [ ] Sample size adequate (≥ 20 content pieces)
- **Gatekeeper**: Process Health Validator

### Gate 2: Implementation Accuracy  
- [ ] Trust Debt formula correctly implemented
- [ ] Matrix interpretation correct (hotspots = good alignment)
- [ ] All calculations reproducible
- [ ] Error handling robust
- **Gatekeeper**: Trust Debt Analyst

### Gate 3: User Experience
- [ ] HTML report clear and actionable
- [ ] Recommendations prioritized and specific
- [ ] Process Health section informative
- [ ] Export functionality working
- **Gatekeeper**: HTML Generator

### Gate 4: Documentation Complete
- [ ] All new features documented
- [ ] Implementation status updated
- [ ] User guides current
- [ ] API documentation accurate
- **Gatekeeper**: Documentation Specialist

## Emergency Protocols

### Critical Health Failure (Grade F)
1. **Immediate**: Process Health Validator issues alert to all agents
2. **Priority 1**: Category Health Manager redesigns category structure
3. **Priority 2**: Trust Debt Analyst validates new calculations
4. **Priority 3**: HTML Generator updates visualization
5. **Final**: Documentation Specialist updates all docs

### Data Quality Crisis
1. **Detection**: Any agent detecting anomalous data reports immediately
2. **Isolation**: Trust Debt Analyst isolates affected calculations
3. **Investigation**: Process Health Validator leads investigation
4. **Resolution**: All agents coordinate on fixes
5. **Validation**: Full health check before resuming normal operations

### Implementation Deadlock
1. **Escalation**: Blocked agent reports to Process Health Validator
2. **Mediation**: Process Health Validator calls emergency coordination meeting
3. **Decision**: Process Health Validator makes final technical decisions
4. **Implementation**: All agents coordinate rapid implementation
5. **Validation**: Full quality gate check after resolution

## Success Metrics

### System Health Metrics
- Process Health Grade: Target A (≥90%)
- Orthogonality Score: Target >70%  
- Coverage Uniformity: Target >80%
- Content Coverage: Target >60%

### Implementation Quality Metrics
- All quality gates passed
- Zero critical health failures
- Reproducible measurements
- Comprehensive documentation

### User Experience Metrics
- Clear, actionable HTML reports
- Correct matrix interpretation
- Prioritized recommendations
- Responsive design

## Agent Initialization Commands

### For Claude Flow Integration

```bash
# Initialize Trust Debt Analysis Swarm
./claude-flow swarm init hierarchical

# Spawn specialized agents
./claude-flow agent spawn trust-debt-analyzer --capabilities statistical-analysis,formula-validation
./claude-flow agent spawn category-health-manager --capabilities category-design,orthogonality-analysis
./claude-flow agent spawn cosine-analyst --capabilities vector-analysis,semantic-similarity
./claude-flow agent spawn process-health-validator --capabilities health-grading,legitimacy-validation
./claude-flow agent spawn html-generator --capabilities visualization,report-generation
./claude-flow agent spawn doc-specialist --capabilities documentation,status-tracking

# Coordinate Trust Debt improvement task
./claude-flow task orchestrate "Implement Trust Debt conversation insights with Process Health validation"
```

### Agent Status Monitoring

```bash
# Check swarm health
./claude-flow swarm status

# Monitor task progress
./claude-flow task status

# Get agent performance metrics
./claude-flow agent metrics
```

## Version History

- **v1.0**: Initial COMS framework established
- **v1.1**: Added Process Health Validator role
- **v1.2**: Enhanced communication protocols
- **v1.3**: Added quality gates and emergency protocols

---

*This document is living and should be updated by the Documentation Specialist as agent roles and protocols evolve.*