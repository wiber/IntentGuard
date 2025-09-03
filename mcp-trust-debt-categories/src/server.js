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
          text: `# Statistical Independence Analysis

## Summary
- Categories analyzed: ${categories.join(', ')}
- Tests performed: ${tests.join(', ')}
- Data points: ${data.length}

## Results
${this.formatIndependenceResults(results)}

## Recommendations
${this.generateIndependenceRecommendations(results)}
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
          text: `# Shortlex Category Optimization

## Objective: ${objective}
## Algorithm: ${algorithm}

## Optimal Ordering
${results.optimalOrder.map((cat, i) => `${i + 1}. ${cat.id}: ${cat.name}`).join('\n')}

## Optimization Metrics
- Semantic overlap score: ${results.overlapScore}
- Coverage completeness: ${results.coverageScore}
- Orthogonality index: ${results.orthogonalityIndex}

## Analysis
${results.analysis}
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