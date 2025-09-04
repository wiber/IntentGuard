#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema 
} from "@modelcontextprotocol/sdk/types.js";

import { StatisticalAnalyzer } from './statistical-analyzer.js';
import { ShortlexOptimizer } from './shortlex-optimizer.js';
import { CategoryManager } from './category-manager.js';
import { ClaudeEvaluator } from './claude-evaluator.js';

class TrustDebtCategoryServer {
  constructor() {
    this.server = new Server(
      {
        name: "trust-debt-categories",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.statisticalAnalyzer = new StatisticalAnalyzer();
    this.shortlexOptimizer = new ShortlexOptimizer();
    this.categoryManager = new CategoryManager();
    this.claudeEvaluator = new ClaudeEvaluator();

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "analyze_category_independence",
            description: "Analyze statistical independence between Trust Debt categories using formal logic",
            inputSchema: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of category names to analyze"
                },
                data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      commit: { type: "string" },
                      categories: { type: "object" }
                    }
                  },
                  description: "Historical trust debt data for analysis"
                },
                tests: {
                  type: "array",
                  items: { 
                    type: "string",
                    enum: ["chi_square", "mutual_information", "correlation", "cramers_v"]
                  },
                  description: "Statistical tests to perform",
                  default: ["chi_square", "mutual_information", "correlation"]
                }
              },
              required: ["categories", "data"]
            }
          },
          {
            name: "optimize_shortlex_categories",
            description: "Optimize category ordering using shortlex principles for minimal semantic overlap",
            inputSchema: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      description: { type: "string" }
                    }
                  },
                  description: "Categories to optimize"
                },
                objective: {
                  type: "string",
                  enum: ["minimize_overlap", "maximize_coverage", "balanced"],
                  default: "minimize_overlap"
                },
                algorithm: {
                  type: "string", 
                  enum: ["greedy", "simulated_annealing", "genetic"],
                  default: "greedy"
                }
              },
              required: ["categories"]
            }
          },
          {
            name: "evaluate_semantic_relationships",
            description: "Use Claude to evaluate semantic relationships between categories",
            inputSchema: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      description: { type: "string" }
                    }
                  }
                },
                context: {
                  type: "string",
                  description: "Additional context about the domain (e.g., 'software development', 'security audit')"
                },
                analysis_type: {
                  type: "string",
                  enum: ["overlap", "causality", "orthogonality", "completeness"],
                  default: "orthogonality"
                }
              },
              required: ["categories"]
            }
          },
          {
            name: "detect_cause_effect_relationships",
            description: "Detect causal relationships between category changes over time",
            inputSchema: {
              type: "object",
              properties: {
                timeseries_data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      timestamp: { type: "string" },
                      categories: { type: "object" },
                      commit_message: { type: "string" }
                    }
                  }
                },
                lag_window: {
                  type: "number",
                  description: "Number of commits to look back for causal relationships",
                  default: 5
                },
                significance_threshold: {
                  type: "number",
                  description: "P-value threshold for statistical significance",
                  default: 0.05
                }
              },
              required: ["timeseries_data"]
            }
          },
          {
            name: "generate_optimal_categories",
            description: "Generate new category set optimized for statistical independence",
            inputSchema: {
              type: "object",
              properties: {
                domain: {
                  type: "string",
                  description: "Domain context (e.g., 'software quality', 'security assessment')"
                },
                num_categories: {
                  type: "number",
                  description: "Target number of categories",
                  default: 5
                },
                constraints: {
                  type: "array",
                  items: { type: "string" },
                  description: "Constraints for category generation"
                },
                seed_categories: {
                  type: "array",
                  items: { type: "string" },
                  description: "Existing categories to build upon"
                }
              },
              required: ["domain"]
            }
          },
          {
            name: "validate_category_system",
            description: "Comprehensive validation of category system for independence and completeness",
            inputSchema: {
              type: "object",
              properties: {
                categories: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      name: { type: "string" },
                      description: { type: "string" }
                    }
                  }
                },
                historical_data: {
                  type: "array",
                  description: "Historical trust debt measurements"
                },
                validation_tests: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: ["independence", "completeness", "orthogonality", "stability", "semantic_clarity"]
                  },
                  default: ["independence", "orthogonality", "completeness"]
                }
              },
              required: ["categories"]
            }
          },
          {
            name: "get_started_guide",
            description: "Get comprehensive getting started guide and usage instructions for Trust Debt category management",
            inputSchema: {
              type: "object",
              properties: {
                user_context: {
                  type: "string",
                  description: "User's context or domain (e.g., 'mobile development', 'security audit', 'new user')",
                  default: "general"
                },
                current_categories: {
                  type: "array",
                  items: { type: "string" },
                  description: "Current categories user is working with",
                  default: []
                }
              }
            }
          }
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "analyze_category_independence":
            return await this.handleCategoryIndependenceAnalysis(args);
          
          case "optimize_shortlex_categories":
            return await this.handleShortlexOptimization(args);
          
          case "evaluate_semantic_relationships":
            return await this.handleSemanticEvaluation(args);
          
          case "detect_cause_effect_relationships":
            return await this.handleCauseEffectDetection(args);
          
          case "generate_optimal_categories":
            return await this.handleOptimalCategoryGeneration(args);
          
          case "validate_category_system":
            return await this.handleCategorySystemValidation(args);
          
          case "get_started_guide":
            return await this.handleGettingStartedGuide(args);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}\n\nStack trace:\n${error.stack}`
            }
          ],
          isError: true
        };
      }
    });
  }

  async handleCategoryIndependenceAnalysis(args) {
    const { categories, data, tests = ["chi_square", "mutual_information", "correlation"] } = args;
    
    const results = await this.statisticalAnalyzer.analyzeIndependence(categories, data, tests);
    
    return {
      content: [
        {
          type: "text",
          text: `# 🔬 Trust Debt Category Independence Analysis

## 📊 Analysis Results
- **Categories analyzed:** ${categories.join(', ')}
- **Tests performed:** ${tests.join(', ')}
- **Data points:** ${data.length}

${this.formatIndependenceResults(results)}

## 💡 Recommendations
${this.generateIndependenceRecommendations(results)}

---

## 🎯 **What This Means for You:**

${this.explainIndependenceResults(results)}

## 🚀 **Next Steps - You Can:**

1. **🎙️ Use Natural Language:** Try saying *"Optimize these categories for better independence"*
2. **⚡ Run Optimization:** Use the \`optimize_shortlex_categories\` tool to improve ordering
3. **🤖 Get AI Recommendations:** Use \`evaluate_semantic_relationships\` for semantic analysis
4. **🔄 Interactive Mode:** Run the CLI tool: \`cd mcp-trust-debt-categories && npm run cli\`

## 📝 **Example Commands You Can Try:**
- *"Add a category for code complexity"*  
- *"Remove overlapping categories"*
- *"Make categories more specific to mobile development"*
- *"Generate new categories optimized for security assessment"*

**💡 TIP:** You can speak or type naturally - the system understands plain English!
`
        }
      ]
    };
  }

  async handleShortlexOptimization(args) {
    const { categories, objective = "minimize_overlap", algorithm = "greedy" } = args;
    
    const results = await this.shortlexOptimizer.optimize(categories, objective, algorithm);
    
    return {
      content: [
        {
          type: "text", 
          text: `# ⚡ Trust Debt Category Optimization

## 🎯 **Optimization Results**
- **Objective:** ${objective}
- **Algorithm:** ${algorithm}
- **Categories optimized:** ${categories.length}

## 📋 **Optimal Ordering**
${results.optimalOrder.map((cat, i) => `${i + 1}. **${cat.id}:** ${cat.name}`).join('\n')}

## 📊 **Performance Metrics**
- **Semantic overlap score:** ${results.overlapScore} *(lower = better)*
- **Coverage completeness:** ${results.coverageScore} *(higher = better)*  
- **Orthogonality index:** ${results.orthogonalityIndex} *(higher = better)*
- **Overall quality:** ${results.qualityScore || 'N/A'}

---

## 🎯 **What This Optimization Did:**

${this.explainOptimizationResults(results, objective)}

## 🚀 **How to Use These Optimized Categories:**

1. **📝 Update Your Configuration:** Copy the optimized ordering to your Trust Debt config
2. **🔄 Re-run Analysis:** Use the new order in your Trust Debt pipeline  
3. **📊 Validate Results:** Run \`analyze_category_independence\` to confirm improvement
4. **🎙️ Fine-tune Further:** Use natural language: *"Adjust categories for my specific domain"*

## 💡 **Want to Customize Further?**

Try these commands:
- *"Make categories more specific to mobile development"*
- *"Add a category for testing quality"*  
- *"Generate new categories optimized for security assessment"*
- *"Remove categories that overlap with performance"*

**🔄 Interactive Mode:** Run \`cd mcp-trust-debt-categories && npm run cli\` for conversational editing!
`
        }
      ]
    };
  }

  async handleSemanticEvaluation(args) {
    const { categories, context = "", analysis_type = "orthogonality" } = args;
    
    const results = await this.claudeEvaluator.evaluateRelationships(categories, context, analysis_type);
    
    return {
      content: [
        {
          type: "text",
          text: `# Semantic Relationship Analysis

## Analysis Type: ${analysis_type}
## Context: ${context || "General"}

${results.analysis}

## Category Matrix
${this.formatSemanticMatrix(results.relationshipMatrix)}

## Recommendations
${results.recommendations.join('\n')}
`
        }
      ]
    };
  }

  async handleCauseEffectDetection(args) {
    const { timeseries_data, lag_window = 5, significance_threshold = 0.05 } = args;
    
    const results = await this.statisticalAnalyzer.detectCausality(
      timeseries_data, 
      lag_window, 
      significance_threshold
    );
    
    return {
      content: [
        {
          type: "text",
          text: `# Cause-Effect Relationship Analysis

## Parameters
- Lag window: ${lag_window} commits
- Significance threshold: ${significance_threshold}
- Time series length: ${timeseries_data.length} points

## Detected Relationships
${this.formatCausalityResults(results)}

## Temporal Patterns
${results.temporalPatterns.join('\n')}
`
        }
      ]
    };
  }

  async handleOptimalCategoryGeneration(args) {
    const { domain, num_categories = 5, constraints = [], seed_categories = [] } = args;
    
    const results = await this.categoryManager.generateOptimalCategories(
      domain,
      num_categories,
      constraints,
      seed_categories
    );
    
    return {
      content: [
        {
          type: "text",
          text: `# Generated Optimal Category System

## Domain: ${domain}
## Target Categories: ${num_categories}

## Generated Categories
${results.categories.map((cat, i) => `
### ${i + 1}. ${cat.name} (${cat.id})
**Description:** ${cat.description}
**Rationale:** ${cat.rationale}
**Independence Score:** ${cat.independenceScore}
`).join('\n')}

## System Properties
- Overall Independence Score: ${results.systemIndependenceScore}
- Coverage Completeness: ${results.coverageScore}
- Semantic Clarity: ${results.semanticClarityScore}

## Validation Results
${results.validationResults}
`
        }
      ]
    };
  }

  async handleCategorySystemValidation(args) {
    const { categories, historical_data = [], validation_tests = ["independence", "orthogonality", "completeness"] } = args;
    
    const results = await this.categoryManager.validateSystem(categories, historical_data, validation_tests);
    
    return {
      content: [
        {
          type: "text",
          text: `# Category System Validation Report

## Categories Validated: ${categories.length}
## Tests Performed: ${validation_tests.join(', ')}
## Historical Data Points: ${historical_data.length}

${this.formatValidationResults(results)}

## Overall Assessment
**System Health:** ${results.overallHealth}
**Recommendation:** ${results.recommendation}

## Detailed Analysis
${results.detailedAnalysis}
`
        }
      ]
    };
  }

  async handleGettingStartedGuide(args) {
    const { user_context = "general", current_categories = [] } = args;
    
    return {
      content: [
        {
          type: "text",
          text: `# 🎯 Trust Debt Category Management - Getting Started Guide

## 🚀 **Welcome to Smart Category Management!**

You're now using an AI-powered system that helps optimize Trust Debt categories for **statistical independence** and **comprehensive coverage**.

${this.generateContextualIntro(user_context, current_categories)}

---

## 🎙️ **THE KEY FEATURE: Natural Language Input**

**You can speak or type naturally!** No need for complex commands or syntax.

### **Try saying/typing:**
- *"Add a category for code complexity"*
- *"Remove security, it overlaps with performance"*  
- *"Make categories more specific to ${user_context}"*
- *"Do these categories pass independence tests?"*
- *"Generate new categories from scratch"*

---

## 🔧 **Available Tools (What You Can Do):**

### 1. **🔬 analyze_category_independence**
**What it does:** Tests if your categories measure truly different things
**When to use:** After adding/removing categories, or when unsure about overlap
**Example result:** "Performance and Speed show 89% correlation - consider merging"

### 2. **⚡ optimize_shortlex_categories** 
**What it does:** Reorders categories to minimize overlap and maximize coverage
**When to use:** When categories seem redundant or poorly organized
**Example result:** Optimal ordering that reduces semantic overlap by 40%

### 3. **🤖 evaluate_semantic_relationships**
**What it does:** Uses AI to analyze semantic meaning and relationships
**When to use:** For deep understanding of category interactions
**Example result:** "Intelligence and Automation overlap in decision-making aspects"

### 4. **🔍 detect_cause_effect_relationships**
**What it does:** Finds when changes in one category predict changes in another  
**When to use:** With historical data to understand temporal patterns
**Example result:** "Security improvements lead to Performance gains after 3 commits"

### 5. **✨ generate_optimal_categories**
**What it does:** Creates new category sets optimized for your specific domain
**When to use:** Starting fresh or adapting to new domains
**Example result:** 5 domain-specific categories with 95% independence score

### 6. **✅ validate_category_system**
**What it does:** Comprehensive health check of your category system
**When to use:** Regular validation and before important analyses
**Example result:** "Overall Health: Excellent (91/100) - ready for production"

---

## 🎯 **Quick Start Workflows:**

### **Scenario 1: I have categories but want to improve them**
1. Run **\`validate_category_system\`** first to see current health
2. Use **\`optimize_shortlex_categories\`** to improve ordering
3. Run **\`analyze_category_independence\`** to validate improvements

### **Scenario 2: I want to create new categories**
1. Use **\`generate_optimal_categories\`** with your domain
2. Review and refine using **natural language commands**
3. Validate with **\`validate_category_system\`**

### **Scenario 3: I want interactive management**
Open terminal and run:
\`\`\`bash
cd mcp-trust-debt-categories
npm run cli
\`\`\`
Then speak/type naturally: *"Help me optimize these categories"*

---

## 📊 **Understanding the Science:**

**Statistical Independence** means:
- Changes in Category A don't predict changes in Category B
- Each category measures a truly different aspect
- No double-counting or redundant measurements
- More accurate and actionable Trust Debt insights

**Why This Matters:**
- **Prevents False Correlations** - Avoids seeing patterns that aren't real
- **Improves Accuracy** - Each measurement captures unique information  
- **Enables Better Decisions** - Clear cause-effect relationships
- **Reduces Noise** - Focus on categories that truly matter

---

## 💡 **Pro Tips:**

1. **🎙️ Use Natural Language:** The system understands context and intent
2. **🔄 Iterate Often:** Category optimization is an ongoing process
3. **📊 Validate Regularly:** Check independence as your codebase evolves
4. **🎯 Domain-Specific:** Adapt categories to your specific context
5. **📈 Use Historical Data:** More data = better statistical analysis

---

## 🆘 **Need Help?**

- **Interactive Mode:** Run \`npm run cli\` for guided experience
- **Documentation:** Check the README.md for detailed examples
- **Natural Language:** Just tell the system what you want to do!

**Remember:** You don't need to understand the statistics - just describe what you want, and the system handles the complexity!

${this.generateNextStepsForUser(current_categories)}
`
        }
      ]
    };
  }

  // Helper formatting methods
  formatIndependenceResults(results) {
    return results.tests.map(test => `
### ${test.name}
- **Statistic:** ${test.statistic}
- **P-value:** ${test.pValue}
- **Significant:** ${test.significant ? 'Yes' : 'No'}
- **Interpretation:** ${test.interpretation}
`).join('\n');
  }

  formatSemanticMatrix(matrix) {
    // Format relationship matrix as a table
    return matrix.map(row => 
      `| ${row.join(' | ')} |`
    ).join('\n');
  }

  formatCausalityResults(results) {
    return results.relationships.map(rel => `
**${rel.cause} → ${rel.effect}**
- Strength: ${rel.strength}
- Confidence: ${rel.confidence}
- Lag: ${rel.lag} commits
- Evidence: ${rel.evidence}
`).join('\n');
  }

  formatValidationResults(results) {
    return results.tests.map(test => `
## ${test.name}
- **Score:** ${test.score}/100
- **Status:** ${test.status}
- **Details:** ${test.details}
${test.issues.length > 0 ? `- **Issues:** ${test.issues.join(', ')}` : ''}
`).join('\n');
  }

  generateIndependenceRecommendations(results) {
    const recommendations = [];
    
    results.tests.forEach(test => {
      if (!test.significant) {
        recommendations.push(`- Categories may be too closely related (${test.name})`);
      }
    });
    
    if (recommendations.length === 0) {
      recommendations.push("- Categories show good statistical independence");
    }
    
    return recommendations.join('\n');
  }

  explainIndependenceResults(results) {
    const explanations = [
      "**Statistical independence** means changes in one category don't predict changes in another.",
      "This is crucial for Trust Debt analysis because:",
      "- Each category should measure a distinct aspect of code quality",
      "- Overlapping categories can lead to double-counting issues", 
      "- Independent categories give clearer insights into what needs improvement"
    ];

    // Add specific insights based on results
    const hasStrongCorrelations = results.tests.some(test => 
      test.pairwiseResults && test.pairwiseResults.some(pair => pair.significant)
    );

    if (hasStrongCorrelations) {
      explanations.push("", "⚠️  **Your categories show some dependence** - consider refinement for better accuracy.");
    } else {
      explanations.push("", "✅ **Your categories appear well-designed** with good independence.");
    }

    return explanations.join('\n');
  }

  explainOptimizationResults(results, objective) {
    const explanations = [
      `**Shortlex optimization** reordered your categories to ${objective.replace('_', ' ')}.`,
      "",
      "**Why this matters:**",
      "- Better ordering reduces semantic overlap between categories",
      "- Each category now measures a more distinct aspect", 
      "- Trust Debt measurements will be more accurate and actionable"
    ];

    if (results.overlapScore < 0.2) {
      explanations.push("", "✅ **Excellent overlap reduction** - categories are now well-separated");
    } else if (results.overlapScore < 0.4) {
      explanations.push("", "🟡 **Good overlap reduction** - consider further refinement");  
    } else {
      explanations.push("", "⚠️ **High overlap remains** - categories may need redefinition");
    }

    if (results.orthogonalityIndex > 0.8) {
      explanations.push("✅ **High orthogonality** - categories measure distinct concepts");
    }

    return explanations.join('\n');
  }

  generateContextualIntro(userContext, currentCategories) {
    if (currentCategories.length > 0) {
      return `You currently have **${currentCategories.length} categories** for ${userContext} analysis.
Let's optimize them for better statistical independence and measurement accuracy!`;
    } else {
      return `Perfect! Let's create an optimal category system for **${userContext}** that ensures 
statistically independent measurements and comprehensive Trust Debt coverage.`;
    }
  }

  generateNextStepsForUser(currentCategories) {
    if (currentCategories.length === 0) {
      return `## 🎬 **Suggested First Step:**
Run \`generate_optimal_categories\` with your domain to create an initial category set, then use natural language to refine them!`;
    } else {
      return `## 🎬 **Suggested Next Steps:**
1. Run \`validate_category_system\` to check your current categories
2. Use natural language to make improvements: *"Make these categories better for my domain"*
3. Optimize with \`optimize_shortlex_categories\` when ready`;
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Trust Debt Category Management MCP server running on stdio");
  }
}

// Start the server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new TrustDebtCategoryServer();
  server.run().catch(console.error);
}

export { TrustDebtCategoryServer };