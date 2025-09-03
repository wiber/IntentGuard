# Claude Flow Usage Guide for IntentGuard

## 🚀 Setup Complete ✅

Your IntentGuard repository is now fully configured with Claude Flow and SPARC methodology. Here's everything you need to know to leverage this powerful development workflow.

## 🔗 What's Available

### MCP Servers (Already Connected)
- **claude-flow** - SPARC development modes and agent coordination
- **ruv-swarm** - Advanced swarm intelligence and neural agents  
- **flow-nexus** - Enterprise features and sandbox environments

### SPARC Development Modes
```bash
# List all 16 available modes
./claude-flow sparc modes

# Available modes:
• 🏗️ Architect (architect)
• 🧠 Auto-Coder (code) 
• 🧪 Tester (TDD) (tdd)
• 🪲 Debugger (debug)
• 🛡️ Security Reviewer (security-review)
• 📚 Documentation Writer (docs-writer)
• 🔗 System Integrator (integration)
• 📈 Deployment Monitor (post-deployment-monitoring-mode)
• 🧹 Optimizer (refinement-optimization-mode)
• ❓Ask (ask)
• 🚀 DevOps (devops)
• 📘 SPARC Tutorial (tutorial)
• 🔐 Supabase Admin (supabase-admin)
• 📋 Specification Writer (spec-pseudocode)
• ♾️ MCP Integration (mcp)
• ⚡️ SPARC Orchestrator (sparc)
```

## 🎯 IntentGuard-Specific Workflows

### 1. Trust Debt Analysis Enhancement
```bash
# Use SPARC to enhance Trust Debt analysis features
./claude-flow sparc run code "Enhance Trust Debt matrix calculations with better scoring algorithms"
./claude-flow sparc run tdd "Add comprehensive tests for Trust Debt analysis"
./claude-flow sparc run security-review "Review Trust Debt scoring for security vulnerabilities"
```

### 2. Intent Detection Improvements
```bash
# Improve intent detection algorithms
./claude-flow sparc run architect "Design improved intent classification system"
./claude-flow sparc run code "Implement new intent detection algorithms"
./claude-flow sparc run tdd "Create test suite for intent detection accuracy"
```

### 3. Full Development Workflow
```bash
# Complete SPARC workflow for new features
./claude-flow sparc pipeline "Add real-time Trust Debt monitoring dashboard"

# This runs all phases:
# 1. Specification - Requirements analysis
# 2. Pseudocode - Algorithm design  
# 3. Architecture - System design
# 4. Refinement - TDD implementation
# 5. Completion - Integration testing
```

## 🔧 Inside Claude Code CLI

When working inside the Claude CLI, you can use both approaches:

### Claude Code Task Tool (Recommended)
```javascript
// Spawn agents for parallel work
Task("Trust Debt Analyzer", "Analyze and improve Trust Debt calculation algorithms. Use hooks for coordination.", "code-analyzer")
Task("Security Reviewer", "Review code for security vulnerabilities. Store findings in memory.", "reviewer")
Task("Test Engineer", "Create comprehensive tests with 95% coverage. Coordinate with other agents.", "tester")

// Always batch todos
TodoWrite { todos: [
  {content: "Analyze current Trust Debt algorithms", status: "in_progress", activeForm: "Analyzing Trust Debt algorithms"},
  {content: "Implement algorithm improvements", status: "pending", activeForm: "Implementing algorithm improvements"},
  {content: "Create comprehensive test suite", status: "pending", activeForm: "Creating comprehensive test suite"},
  {content: "Review security implications", status: "pending", activeForm: "Reviewing security implications"},
  {content: "Document changes", status: "pending", activeForm: "Documenting changes"}
]}
```

### MCP Tools (Coordination Only)
```javascript
// Set up coordination topology
mcp__claude-flow__swarm_init { topology: "mesh", maxAgents: 5 }
mcp__claude-flow__agent_spawn { type: "researcher" }
mcp__claude-flow__agent_spawn { type: "coder" }
```

## 📋 Agent Coordination Protocol

Every agent spawned via Claude Code's Task tool should:

### Before Work
```bash
npx claude-flow@alpha hooks pre-task --description "Enhance Trust Debt analysis"
npx claude-flow@alpha hooks session-restore --session-id "swarm-intentguard-analysis"
```

### During Work
```bash
npx claude-flow@alpha hooks post-edit --file "src/trust-debt-analyzer.ts" --memory-key "swarm/trust-debt/improvements"
npx claude-flow@alpha hooks notify --message "Improved scoring algorithm accuracy by 15%"
```

### After Work
```bash
npx claude-flow@alpha hooks post-task --task-id "trust-debt-enhancement"
npx claude-flow@alpha hooks session-end --export-metrics true
```

## 🚀 Quick Commands for IntentGuard

### Development
```bash
# Start a TDD workflow for new features
./claude-flow sparc tdd "Add Intent prediction confidence scoring"

# Code review and security analysis
./claude-flow sparc run security-review "Review all Trust Debt calculation code"

# Architecture planning for major changes
./claude-flow sparc run architect "Design microservices architecture for Intent analysis"
```

### Testing & Quality
```bash
# Comprehensive testing
./claude-flow sparc run tdd "Create integration tests for Trust Debt pipeline"

# Code optimization
./claude-flow sparc run refinement-optimization-mode "Optimize Trust Debt calculation performance"

# Documentation updates
./claude-flow sparc run docs-writer "Update API documentation for Intent classification endpoints"
```

### Deployment & Monitoring
```bash
# DevOps automation
./claude-flow sparc run devops "Set up CI/CD pipeline for Trust Debt analysis service"

# Post-deployment monitoring
./claude-flow sparc run post-deployment-monitoring-mode "Monitor Trust Debt analysis performance in production"
```

## 🎯 Best Practices for IntentGuard

### 1. Always Use Parallel Operations
```javascript
// ✅ CORRECT - Single message with all operations
[Single Message]:
  Task("Trust Debt Agent", "...", "code-analyzer")
  Task("Security Agent", "...", "reviewer") 
  Task("Test Agent", "...", "tester")
  TodoWrite { todos: [...5+ todos...] }
  Write "src/new-feature.ts"
  Write "tests/new-feature.test.ts"
  Write "docs/new-feature.md"
```

### 2. File Organization
```bash
# Never save to root - use proper directories
/src/           # Source code
/tests/         # Test files  
/docs/          # Documentation
/scripts/       # Utility scripts
/config/        # Configuration
```

### 3. Memory Coordination
```bash
# Store context for agent coordination
npx claude-flow@alpha memory store "trust-debt-requirements" "Enhanced scoring needs 95% accuracy"
npx claude-flow@alpha memory store "intent-patterns" "Common patterns: API access, data manipulation, privilege escalation"
```

## 🔍 Monitoring & Analytics

### Swarm Status
```bash
# Check active swarms
./claude-flow status

# Monitor performance
./claude-flow performance monitor

# View memory usage
./claude-flow memory list
```

### Performance Optimization
```javascript
// Use batchtools for performance
mcp__claude-flow__bottleneck_analyze { component: "trust-debt-analysis" }
mcp__claude-flow__performance_report { format: "detailed" }
```

## 🎓 Getting Started

1. **Start with exploration**: `./claude-flow sparc modes --verbose`
2. **Try a simple task**: `./claude-flow sparc run code "Add logging to Trust Debt calculator"`
3. **Use full pipeline**: `./claude-flow sparc pipeline "Implement Intent confidence scoring"`
4. **Monitor progress**: `./claude-flow status`

## 🆘 Troubleshooting

### Common Issues
```bash
# Reinitialize if needed
./claude-flow sparc modes  # Should show 16 modes

# Check MCP connection
claude mcp list  # Should show claude-flow, ruv-swarm, flow-nexus

# Reset swarms if stuck
./claude-flow swarm destroy
./claude-flow swarm init mesh
```

### Performance Tips
- Always batch operations in single messages
- Use hooks for agent coordination
- Store context in memory for cross-agent sharing
- Monitor performance with built-in analytics

---

## 🎉 You're Ready!

Your IntentGuard repository now has:
- ✅ Full SPARC development environment
- ✅ 16 specialized development modes
- ✅ Agent coordination system
- ✅ Performance monitoring
- ✅ Memory management
- ✅ GitHub integration ready

Start with: `./claude-flow sparc run ask "What should I work on first?"`