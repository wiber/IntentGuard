#!/usr/bin/env node

/**
 * Agent Learning Prompt Generator
 * Generates specific learning questions for each agent based on:
 * 1. Their current COMS.txt context
 * 2. Previous agents' learnings
 * 3. Pipeline coherence requirements
 */

class AgentLearningPrompts {
  constructor() {
    this.learningAreas = {
      0: {
        critical_question: "What specific validation criteria should I extract from the HTML report to ensure Agent 1 builds the correct SQLite schema?",
        focus_areas: ["outcome_mapping", "database_requirements", "validation_framework"],
        learns_from: [],
        teaches_to: [1]
      },
      1: {
        critical_question: "How should I structure the keyword normalization to ensure Agent 2 can generate truly orthogonal categories?",
        focus_areas: ["keyword_extraction", "cross_domain_normalization", "sqlite_optimization"],
        learns_from: [0],
        teaches_to: [2]
      },
      2: {
        critical_question: "What specific orthogonality thresholds and balancing algorithms will ensure Agent 3 can build a valid ShortLex matrix?",
        focus_areas: ["category_orthogonality", "balance_iteration", "semantic_independence"],
        learns_from: [0, 1],
        teaches_to: [3]
      },
      3: {
        critical_question: "How do I validate that the matrix population maintains mathematical correctness for Agent 4's grade calculations?",
        focus_areas: ["shortlex_sorting", "matrix_population", "asymmetry_calculation"],
        learns_from: [0, 1, 2],
        teaches_to: [4]
      },
      4: {
        critical_question: "Which statistical validation checks must I perform to ensure the grades I calculate are legitimate for Agent 5's timeline analysis?",
        focus_areas: ["grade_calculation", "process_health", "legitimacy_scoring"],
        learns_from: [0, 1, 2, 3],
        teaches_to: [5]
      },
      5: {
        critical_question: "How should I structure the timeline data to provide Agent 6 with the historical context needed for pattern analysis?",
        focus_areas: ["timeline_analysis", "historical_patterns", "trend_calculation"],
        learns_from: [0, 1, 4],
        teaches_to: [6]
      },
      6: {
        critical_question: "What specific analytical frameworks should I use to ensure Agent 7 can generate actionable recommendations from my analysis?",
        focus_areas: ["cold_spot_analysis", "pattern_detection", "recommendation_generation"],
        learns_from: [0, 1, 2, 3, 4, 5],
        teaches_to: [7]
      },
      7: {
        critical_question: "How do I validate that all 52+ outcomes from Agent 0 are properly represented in the final report structure?",
        focus_areas: ["report_completeness", "pipeline_audit", "outcome_validation"],
        learns_from: [0, 1, 2, 3, 4, 5, 6],
        teaches_to: []
      }
    };
  }

  generateLearningPrompt(agentNumber) {
    const agent = this.learningAreas[agentNumber];
    if (!agent) {
      throw new Error(`Agent ${agentNumber} not found in learning system`);
    }

    return {
      agent_number: agentNumber,
      critical_question: agent.critical_question,
      focus_areas: agent.focus_areas,
      learning_context: {
        learns_from_agents: agent.learns_from,
        teaches_to_agents: agent.teaches_to,
        pipeline_position: `${agentNumber}/7`,
        dependencies: agent.learns_from.length,
        downstream_impact: agent.teaches_to.length
      },
      refinement_areas: [
        "Input validation from previous agents",
        "Output structure for next agents", 
        "Error detection and recovery mechanisms",
        "Tool access and permission requirements",
        "Performance optimization for pipeline flow"
      ],
      success_criteria: `Agent ${agentNumber} can execute without human intervention and produce valid output for downstream agents`,
      learning_instruction: `Ask ONE specific question about ${agent.focus_areas.join(', ')} that will make your pipeline stage watertight.`
    };
  }

  generateAllPrompts() {
    const prompts = {};
    for (let i = 0; i <= 7; i++) {
      prompts[`agent_${i}`] = this.generateLearningPrompt(i);
    }
    return prompts;
  }
}

// CLI usage
if (require.main === module) {
  const agentNumber = process.argv[2];
  const generator = new AgentLearningPrompts();
  
  if (agentNumber !== undefined) {
    if (!agentNumber.match(/^[0-7]$/)) {
      console.error('Usage: node agent-learning-prompts.js <agent_number>');
      console.error('Example: node agent-learning-prompts.js 0');
      process.exit(1);
    }
    
    const prompt = generator.generateLearningPrompt(parseInt(agentNumber));
    console.log(JSON.stringify(prompt, null, 2));
  } else {
    const allPrompts = generator.generateAllPrompts();
    console.log(JSON.stringify(allPrompts, null, 2));
  }
}

module.exports = AgentLearningPrompts;