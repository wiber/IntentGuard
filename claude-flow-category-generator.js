#!/usr/bin/env node

/**
 * CLAUDE-FLOW CATEGORY GENERATOR
 * 
 * Creates proper structure where F🤖 represents claude-flow system
 * with Agents 0-7 as subcategories under the claude-flow orchestration
 */

const fs = require('fs');

console.log('⚡ CLAUDE-FLOW CATEGORY GENERATOR');
console.log('=================================');
console.log('');

// Updated structure with claude-flow as parent category
const CLAUDE_FLOW_CATEGORIES = [
    // LENGTH 1: Parent categories (positions 1-6)
    { id: "A🚀", name: "A🚀 CoreEngine", color: "rgba(255, 102, 0, 1)", units: 705, type: "parent" },
    { id: "B🔒", name: "B🔒 Documentation", color: "rgba(153, 0, 255, 1)", units: 411, type: "parent" },
    { id: "C💨", name: "C💨 Visualization", color: "rgba(0, 255, 255, 1)", units: 532, type: "parent" },
    { id: "D🧠", name: "D🧠 Integration", color: "rgba(255, 255, 0, 1)", units: 4184, type: "parent" },
    { id: "E🎨", name: "E🎨 BusinessLayer", color: "rgba(255, 0, 153, 1)", units: 1829, type: "parent" },
    { id: "F⚡", name: "F⚡ Claude-Flow", color: "rgba(59, 130, 246, 1)", units: 469, type: "parent", description: "Claude-Flow orchestration system" },
    
    // LENGTH 2: Child categories (positions 7-20) - Claude-Flow agents as subcategories
    { id: "A🚀.1⚡", name: "A🚀.1⚡ PatentFormula", color: "rgba(255, 102, 0, 0.8)", units: 176, parent: "A🚀" },
    { id: "A🚀.2🔥", name: "A🚀.2🔥 TrustMeasurement", color: "rgba(255, 102, 0, 0.8)", units: 176, parent: "A🚀" },
    { id: "A🚀.3📈", name: "A🚀.3📈 StatisticalAnalysis", color: "rgba(255, 102, 0, 0.8)", units: 177, parent: "A🚀" },
    { id: "B🔒.1📚", name: "B🔒.1📚 IntentSpecification", color: "rgba(153, 0, 255, 0.8)", units: 137, parent: "B🔒" },
    { id: "B🔒.2📖", name: "B🔒.2📖 BusinessPlans", color: "rgba(153, 0, 255, 0.8)", units: 137, parent: "B🔒" },
    { id: "B🔒.3📋", name: "B🔒.3📋 ProcessMethodology", color: "rgba(153, 0, 255, 0.8)", units: 137, parent: "B🔒" },
    { id: "C💨.1✨", name: "C💨.1✨ UserInterface", color: "rgba(0, 255, 255, 0.8)", units: 177, parent: "C💨" },
    { id: "C💨.2🎨", name: "C💨.2🎨 VisualDesign", color: "rgba(0, 255, 255, 0.8)", units: 178, parent: "C💨" },
    
    // CLAUDE-FLOW AGENT SUBCATEGORIES (F⚡.X = specific agents)
    { id: "F⚡.0🎯", name: "F⚡.0🎯 Agent0-OutcomeParser", color: "rgba(59, 130, 246, 0.8)", units: 58, parent: "F⚡", agent: 0, description: "Outcome requirements parser and architectural shepherd" },
    { id: "F⚡.1💾", name: "F⚡.1💾 Agent1-DatabaseIndexer", color: "rgba(59, 130, 246, 0.8)", units: 59, parent: "F⚡", agent: 1, description: "Database indexer and keyword extractor" },
    { id: "F⚡.2🏗️", name: "F⚡.2🏗️ Agent2-CategoryGenerator", color: "rgba(59, 130, 246, 0.8)", units: 58, parent: "F⚡", agent: 2, description: "Category generator and orthogonality validator" },
    { id: "F⚡.3📐", name: "F⚡.3📐 Agent3-MatrixBuilder", color: "rgba(59, 130, 246, 0.8)", units: 59, parent: "F⚡", agent: 3, description: "ShortLex validator and matrix builder" },
    { id: "F⚡.4📊", name: "F⚡.4📊 Agent4-GradeCalculator", color: "rgba(59, 130, 246, 0.8)", units: 58, parent: "F⚡", agent: 4, description: "Grades and statistics calculator" },
    { id: "F⚡.7📄", name: "F⚡.7📄 Agent7-ReportGenerator", color: "rgba(59, 130, 246, 0.8)", units: 59, parent: "F⚡", agent: 7, description: "Report generator and final auditor" }
];

console.log('⚡ CLAUDE-FLOW STRUCTURE:');
console.log('========================');
console.log('');

// Show the corrected structure
CLAUDE_FLOW_CATEGORIES.forEach((cat, i) => {
    const type = cat.type === 'parent' ? '[PARENT]' : cat.agent !== undefined ? '[AGENT]' : '[CHILD]';
    const agentInfo = cat.agent !== undefined ? ` (Agent ${cat.agent})` : '';
    console.log(`${(i+1).toString().padStart(2)}: ${cat.name.padEnd(45)} | ${cat.units.toString().padStart(4)} units ${type}${agentInfo}`);
});

console.log('');
console.log('🎯 KEY INSIGHT: F⚡ Claude-Flow Structure');
console.log('========================================');
console.log('• F⚡ Claude-Flow = Parent category (orchestration system)');
console.log('• F⚡.0🎯, F⚡.1💾, F⚡.2🏗️, etc. = Individual agents as subcategories');
console.log('• Each agent maintains its specific role within claude-flow ecosystem');
console.log('• Trust Debt measures claude-flow orchestration vs individual agent performance');
console.log('');

// Generate updated seed prompt
const UPDATED_SEED_PROMPT = `
**TRUST DEBT CATEGORY SEED PROMPT v2.0**

Generate exactly 20 business outcome categories where claude-flow orchestration is the parent category F⚡ containing individual agents as subcategories:

**Structure:**
- A🚀 CoreEngine (mathematical foundation)
- B🔒 Documentation (intent specifications)  
- C💨 Visualization (visual systems)
- D🧠 Integration (system integration)
- E🎨 BusinessLayer (business logic)
- **F⚡ Claude-Flow (orchestration system)**
  - F⚡.0🎯 Agent0-OutcomeParser
  - F⚡.1💾 Agent1-DatabaseIndexer
  - F⚡.2🏗️ Agent2-CategoryGenerator
  - F⚡.3📐 Agent3-MatrixBuilder
  - F⚡.4📊 Agent4-GradeCalculator
  - F⚡.7📄 Agent7-ReportGenerator

**Trust Debt Analysis:**
- Intent: Documented claude-flow orchestration capabilities
- Reality: Actual agent coordination and performance delivery
- Measurement: |Intent - Reality|² between planned vs actual multi-agent coordination

This structure allows measuring Trust Debt between intended claude-flow orchestration design and actual agent execution reality.
`;

fs.writeFileSync('claude-flow-seed-prompt.txt', UPDATED_SEED_PROMPT);

console.log('💾 SAVED UPDATED STRUCTURES:');
console.log('   • claude-flow-categories.json');
console.log('   • claude-flow-seed-prompt.txt');
console.log('');
console.log('✅ Ready to regenerate matrix with F⚡ Claude-Flow parent structure');

// Save the categories structure
fs.writeFileSync('claude-flow-categories.json', JSON.stringify({
    metadata: {
        type: "claude_flow_focused_categories",
        generated: new Date().toISOString(),
        total_categories: 20,
        parent_categories: 6,
        claude_flow_agents: 6,
        structure: "claude_flow_orchestration_with_agent_subcategories"
    },
    categories: CLAUDE_FLOW_CATEGORIES
}, null, 2));