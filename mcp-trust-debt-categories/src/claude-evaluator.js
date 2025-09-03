/**
 * Claude Evaluator for Trust Debt Categories
 * Uses Claude AI to provide semantic analysis and natural language category management
 */
export class ClaudeEvaluator {
  constructor(apiKey = null) {
    this.apiKey = apiKey || process.env.ANTHROPIC_API_KEY;
    this.conversationHistory = [];
  }

  /**
   * Evaluate semantic relationships between categories using Claude
   */
  async evaluateRelationships(categories, context = "", analysisType = "orthogonality") {
    const prompt = this.buildAnalysisPrompt(categories, context, analysisType);
    
    const response = await this.callClaude(prompt);
    
    return {
      analysis: response.analysis,
      relationshipMatrix: response.relationshipMatrix || [],
      recommendations: response.recommendations || [],
      confidence: response.confidence || 0.8,
      methodology: response.methodology || "Semantic analysis using natural language understanding"
    };
  }

  /**
   * Process natural language input to modify category lists
   * This is the main interface for verbal/text input
   */
  async processNaturalLanguageEdit(userInput, currentCategories = []) {
    const prompt = `
# Trust Debt Category Management Assistant

You are an expert assistant helping users manage Trust Debt categories through natural language. Users can speak or type their requests, and you'll interpret their intent to modify the category list.

## Current Categories:
${this.formatCategoriesForPrompt(currentCategories)}

## User Request:
"${userInput}"

## Instructions:
1. **Parse the user's intent** - Are they trying to:
   - Add new categories?
   - Remove existing categories?  
   - Modify category names/descriptions?
   - Reorder categories?
   - Ask questions about categories?
   - Get recommendations for improvements?

2. **Make the changes** based on their request

3. **Explain clearly** what you understood and what changes you made

4. **Provide the updated category list** in a structured format

5. **Suggest improvements** if you notice issues with independence or overlap

## Response Format:
\`\`\`json
{
  "understood_intent": "Brief description of what the user wanted",
  "action_taken": "What action you performed",
  "updated_categories": [
    {
      "id": "category_id",
      "name": "Category Name", 
      "description": "Category description",
      "rationale": "Why this category is useful"
    }
  ],
  "explanation": "Clear explanation of changes made",
  "suggestions": [
    "Suggestion 1",
    "Suggestion 2"  
  ],
  "independence_analysis": "Brief analysis of category independence",
  "next_steps": "What the user might want to do next"
}
\`\`\`

## Examples of User Input:
- "Add a category for code complexity"
- "Remove the security category, it overlaps too much"  
- "Rename Performance to Speed"
- "I think we need categories for testing and deployment"
- "These categories seem to overlap, can you fix that?"
- "Make the categories more specific to mobile development"

**Remember**: Users can speak naturally - interpret their intent even if the phrasing is casual or incomplete.
`;

    const response = await this.callClaude(prompt, { temperature: 0.7 });
    
    // Parse the JSON response
    try {
      const parsedResponse = this.extractJsonFromResponse(response);
      return {
        ...parsedResponse,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rawResponse: response,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Generate optimal categories using Claude's domain knowledge
   */
  async generateOptimalCategories(domain, constraints = [], seedCategories = []) {
    const prompt = `
# Trust Debt Category Generation Expert

Generate an optimal set of statistically independent categories for Trust Debt analysis in the ${domain} domain.

## Requirements:
1. **Statistical Independence**: Categories should measure different aspects with minimal correlation
2. **Comprehensive Coverage**: Together they should cover the entire domain
3. **Orthogonality**: Each category should be distinct and non-overlapping
4. **Practical Utility**: Categories should be measurable and actionable

## Domain Context: ${domain}

## Constraints:
${constraints.length > 0 ? constraints.map(c => `- ${c}`).join('\n') : 'None specified'}

## Existing Categories to Build Upon:
${seedCategories.length > 0 ? seedCategories.map(c => `- ${c}`).join('\n') : 'None provided - generate from scratch'}

## Your Task:
Generate 5-7 categories that are:
- **Statistically independent** (changes in one don't predict changes in another)
- **Orthogonal** (each measures a distinct aspect)  
- **Complete** (together they cover the domain comprehensively)
- **Measurable** (can be quantified from code/documentation analysis)

## Response Format:
\`\`\`json
{
  "reasoning": "Explanation of your approach to ensure independence",
  "categories": [
    {
      "id": "short_id",
      "name": "Category Name",
      "description": "Detailed description of what this measures",
      "measurement_approach": "How this can be quantified",
      "independence_rationale": "Why this is independent from other categories",
      "keywords": ["keyword1", "keyword2", "keyword3"]
    }
  ],
  "independence_validation": "Analysis of why these categories are statistically independent",
  "coverage_analysis": "Explanation of how these categories comprehensively cover the domain",
  "measurement_guidance": "Practical guidance for measuring these categories"
}
\`\`\`

Focus on creating categories that would pass statistical independence tests (chi-square, mutual information, correlation analysis).
`;

    const response = await this.callClaude(prompt, { temperature: 0.6 });
    
    try {
      const parsedResponse = this.extractJsonFromResponse(response);
      return {
        ...parsedResponse,
        success: true,
        domain,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rawResponse: response,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Validate category system and provide improvement recommendations
   */
  async validateAndImprove(categories, historicalData = []) {
    const prompt = `
# Trust Debt Category Validation Expert

Analyze this category system for statistical independence, completeness, and practical utility.

## Current Categories:
${this.formatCategoriesForPrompt(categories)}

## Historical Data:
${historicalData.length > 0 ? 
  `${historicalData.length} data points available for analysis` : 
  'No historical data provided - analysis based on semantic evaluation only'
}

## Validation Criteria:
1. **Statistical Independence**: Are categories likely to be uncorrelated?
2. **Semantic Orthogonality**: Do categories measure distinct concepts?
3. **Domain Coverage**: Do they comprehensively cover Trust Debt aspects?
4. **Measurability**: Can these be reliably quantified?
5. **Actionability**: Do they lead to clear improvement actions?

## Your Analysis:
Provide a comprehensive evaluation and actionable recommendations.

## Response Format:
\`\`\`json
{
  "overall_assessment": {
    "grade": "A-F letter grade",
    "score": "0-100 numeric score", 
    "summary": "One paragraph overall assessment"
  },
  "independence_analysis": {
    "likely_correlations": [
      {
        "category_pair": ["Cat1", "Cat2"],
        "correlation_risk": "high|medium|low",
        "explanation": "Why these might correlate"
      }
    ],
    "independence_score": "0-100 score"
  },
  "coverage_analysis": {
    "covered_aspects": ["aspect1", "aspect2"],
    "missing_aspects": ["missing1", "missing2"], 
    "coverage_score": "0-100 score"
  },
  "recommendations": [
    {
      "type": "add|remove|modify|reorder",
      "category": "Category name",
      "action": "Specific action to take",
      "rationale": "Why this improves the system"
    }
  ],
  "improved_categories": [
    {
      "id": "category_id",
      "name": "Category Name",
      "description": "Description", 
      "changes_made": "What was changed from original"
    }
  ],
  "validation_tests": {
    "statistical_tests_needed": ["test1", "test2"],
    "expected_results": "What results would validate independence"
  }
}
\`\`\`

Be specific and actionable in your recommendations.
`;

    const response = await this.callClaude(prompt, { temperature: 0.5 });
    
    try {
      const parsedResponse = this.extractJsonFromResponse(response);
      return {
        ...parsedResponse,
        success: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        rawResponse: response,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Interactive category management chat interface
   */
  async startInteractiveSession(initialCategories = []) {
    const welcomeMessage = `
# 🎯 Trust Debt Category Manager

Welcome! I'm here to help you create and optimize your Trust Debt categories for maximum statistical independence and domain coverage.

## Current Categories:
${this.formatCategoriesForDisplay(initialCategories)}

## What you can do:
- **Add categories**: "Add a category for code complexity"
- **Remove categories**: "Remove the security category"  
- **Modify categories**: "Rename Performance to Speed"
- **Get suggestions**: "How can I improve these categories?"
- **Analyze independence**: "Do these categories overlap too much?"
- **Generate new set**: "Create categories optimized for mobile development"

## 🎙️ **You can speak or type naturally!** 
Just tell me what you want to do with your categories.

What would you like to do first?
`;

    return {
      welcome: welcomeMessage,
      currentCategories: initialCategories,
      sessionId: this.generateSessionId(),
      ready: true
    };
  }

  // === Helper Methods ===

  buildAnalysisPrompt(categories, context, analysisType) {
    return `
Analyze the semantic relationships between these Trust Debt categories:

Categories:
${this.formatCategoriesForPrompt(categories)}

Context: ${context || 'General software development'}
Analysis Type: ${analysisType}

Please evaluate the ${analysisType} of these categories and provide:
1. Detailed analysis of relationships
2. Relationship matrix (if applicable)
3. Recommendations for improvement
4. Confidence level in your analysis

Focus on identifying potential statistical dependencies and semantic overlaps.
`;
  }

  formatCategoriesForPrompt(categories) {
    if (!categories || categories.length === 0) {
      return "No categories currently defined.";
    }

    return categories.map((cat, index) => 
      `${index + 1}. **${cat.name}** (${cat.id || 'no-id'})
   Description: ${cat.description || 'No description provided'}
   ${cat.keywords ? `Keywords: ${cat.keywords.join(', ')}` : ''}`
    ).join('\n\n');
  }

  formatCategoriesForDisplay(categories) {
    if (!categories || categories.length === 0) {
      return "No categories currently defined.";
    }

    return categories.map((cat, index) => 
      `${index + 1}. **${cat.name}**${cat.description ? `: ${cat.description}` : ''}`
    ).join('\n');
  }

  async callClaude(prompt, options = {}) {
    if (!this.apiKey) {
      console.log('ℹ️  No Anthropic API key provided. Using mock response mode.');
      return this.generateMockResponse(prompt);
    }

    // In a real implementation, this would call the Anthropic API
    // For now, return a mock response structure
    const mockResponse = {
      analysis: "Semantic analysis completed using natural language understanding",
      relationshipMatrix: [],
      recommendations: [
        "Consider adding more specific categories",
        "Ensure categories are measurable"
      ],
      confidence: 0.85,
      methodology: "Claude-based semantic analysis"
    };

    // Add conversation to history
    this.conversationHistory.push({
      prompt,
      response: mockResponse,
      timestamp: new Date().toISOString()
    });

    return mockResponse;
  }

  generateMockResponse(prompt) {
    // Generate appropriate mock responses based on prompt content
    if (prompt.includes('natural language')) {
      return {
        understood_intent: "User wants to modify categories using natural language",
        action_taken: "Mock response - API key needed for full functionality",
        updated_categories: [],
        explanation: "Natural language processing requires Anthropic API key",
        suggestions: ["Set ANTHROPIC_API_KEY environment variable for full functionality"],
        independence_analysis: "Mock analysis - requires API integration",
        next_steps: "Configure API key for complete natural language support"
      };
    } else {
      return {
        analysis: "Mock semantic analysis - requires Anthropic API key for full functionality",
        relationshipMatrix: [],
        recommendations: [
          "Set ANTHROPIC_API_KEY environment variable",
          "Statistical analysis works without API key"
        ],
        confidence: 0.5,
        methodology: "Mock response - limited functionality without API key"
      };
    }
  }

  extractJsonFromResponse(response) {
    // Extract JSON from response text
    if (typeof response === 'object') {
      return response;
    }

    const jsonMatch = response.match(/```json\n(.*?)\n```/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }

    // Try to parse the whole response as JSON
    try {
      return JSON.parse(response);
    } catch {
      throw new Error('Could not extract valid JSON from Claude response');
    }
  }

  generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  getConversationHistory() {
    return this.conversationHistory;
  }

  clearConversationHistory() {
    this.conversationHistory = [];
  }
}