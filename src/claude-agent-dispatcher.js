#!/usr/bin/env node

/**
 * Claude Agent Dispatcher
 * 
 * When Claude receives "intentguard X", this dispatcher:
 * 1. Reads trust-debt-pipeline-coms.txt to get agent configuration
 * 2. Extracts agent-specific context, files, and responsibilities
 * 3. Returns structured data for Claude to execute the agent directly
 * 4. Provides tools and validation criteria for the specific agent
 */

const fs = require('fs');
const path = require('path');

class ClaudeAgentDispatcher {
  constructor() {
    this.comsPath = path.join(__dirname, '..', 'trust-debt-pipeline-coms.txt');
  }

  /**
   * Dispatch agent context to Claude
   * @param {string} agentNumber - Agent number (0-7)
   * @returns {Object} Agent context for Claude execution
   */
  dispatch(agentNumber) {
    if (!fs.existsSync(this.comsPath)) {
      throw new Error('trust-debt-pipeline-coms.txt not found');
    }

    const comsContent = fs.readFileSync(this.comsPath, 'utf8');
    const agentConfig = this.parseAgentFromComs(comsContent, agentNumber);

    if (!agentConfig) {
      throw new Error(`Agent ${agentNumber} not found in pipeline configuration`);
    }

    // Return structured context for Claude
    return {
      agent: {
        number: parseInt(agentNumber),
        name: agentConfig.name,
        keyword: agentConfig.keyword,
        responsibility: agentConfig.responsibility,
        files: agentConfig.files.split(', ').map(f => f.trim()),
        inputFile: this.getInputFile(agentNumber),
        outputFile: this.getOutputFile(agentNumber, agentConfig.keyword),
      },
      context: {
        workingDir: process.cwd(),
        comsFile: this.comsPath,
        validationCriteria: agentConfig.validationCriteria || [],
        internalAPIs: agentConfig.internalAPIs || []
      },
      instructions: this.getAgentInstructions(agentNumber, agentConfig),
      tools: this.getRequiredTools(agentNumber),
      dependencies: this.getAgentDependencies(agentNumber)
    };
  }

  parseAgentFromComs(comsContent, agentNumber) {
    const agentSection = new RegExp(`AGENT ${agentNumber}:(.*?)(?=AGENT \\d+:|DATA DOMAIN|PIPELINE EXECUTION:|$)`, 's');
    const match = comsContent.match(agentSection);
    
    if (!match) return null;
    
    const section = match[1];
    const nameMatch = section.match(/^([^\n]+)/);
    const keywordMatch = section.match(/KEYWORD:\s*"([^"]+)"/);
    const responsibilityMatch = section.match(/RESPONSIBILITY:\s*([^\n]+)/);
    const filesMatch = section.match(/FILES:\s*([^\n]+)/);
    const validationMatch = section.match(/VALIDATION CRITERIA:(.*?)(?=INPUT:|OUTPUT:|$)/s);
    const internalAPIMatch = section.match(/INTERNAL API MAPPING:(.*?)(?=VALIDATION|INPUT:|OUTPUT:|$)/s);
    
    return {
      name: nameMatch ? nameMatch[1].trim() : `Agent ${agentNumber}`,
      keyword: keywordMatch ? keywordMatch[1] : '',
      responsibility: responsibilityMatch ? responsibilityMatch[1].trim() : '',
      files: filesMatch ? filesMatch[1].trim() : '',
      validationCriteria: validationMatch ? validationMatch[1].trim().split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : [],
      internalAPIs: internalAPIMatch ? internalAPIMatch[1].trim().split('\n').filter(line => line.trim().startsWith('-')).map(line => line.trim().substring(1).trim()) : []
    };
  }

  getInputFile(agentNumber) {
    const inputFiles = {
      '0': null, // No input - first agent
      '1': '0-outcome-requirements.json',
      '2': '1-indexed-keywords.json', 
      '3': '2-categories-balanced.json',
      '4': '3-presence-matrix.json',
      '5': '4-grades-statistics.json',
      '6': '5-timeline-history.json',
      '7': '6-analysis-narratives.json'
    };
    return inputFiles[agentNumber];
  }

  getOutputFile(agentNumber, keyword) {
    const outputFiles = {
      '0': '0-outcome-requirements.json',
      '1': '1-indexed-keywords.json',
      '2': '2-categories-balanced.json', 
      '3': '3-presence-matrix.json',
      '4': '4-grades-statistics.json',
      '5': '5-timeline-history.json',
      '6': '6-analysis-narratives.json',
      '7': 'trust-debt-report.html'
    };
    return outputFiles[agentNumber];
  }

  getAgentInstructions(agentNumber, config) {
    const instructions = {
      '0': `You are Agent 0: Outcome Requirements Parser. Your task is to:
1. Read the current trust-debt-report.html file
2. Extract ALL outcome requirements (47+ metrics, grades, features)
3. Map each outcome to its responsible agent (1-7) 
4. Create 0-outcome-requirements.json with complete objective mapping
5. Ensure every metric in the HTML report has a validation criteria defined`,

      '1': `You are Agent 1: Database Indexer & Keyword Extractor. Your task is to:
1. Read 0-outcome-requirements.json to understand what data is needed
2. Build SQLite database with intent_content and reality_content tables
3. Extract keywords using hybrid LLM-regex approach with learning feedback
4. Create normalized keyword counts across code and docs domains
5. Output 1-indexed-keywords.json with structured keyword data`,

      '2': `You are Agent 2: Category Generator & Orthogonality Validator. Your task is to:
1. Read 1-indexed-keywords.json keyword data
2. Generate semantically orthogonal categories using iterative LLM balancing
3. Ensure coefficient of variation < 0.30 for mention distribution
4. Validate orthogonality score > 0.95 between category pairs
5. Output 2-categories-balanced.json with validated taxonomy`,

      '3': `You are Agent 3: ShortLex Validator & Matrix Builder. Your task is to:
1. Read 2-categories-balanced.json category data
2. Validate ShortLex sorting (length-first, then alphabetical)
3. Populate presence matrix with intent/reality values
4. Auto-correct any sorting errors and log corrections
5. Output 3-presence-matrix.json with complete matrix data`,

      '4': `You are Agent 4: Grades & Statistics Calculator. Your task is to:
1. Read 3-presence-matrix.json matrix data
2. Calculate Trust Debt grade using patent formula
3. Compute Process Health grade and legitimacy scores
4. Generate all statistical metrics required by Agent 0's requirements
5. Output 4-grades-statistics.json with all calculated metrics`,

      '5': `You are Agent 5: Timeline & Historical Analyzer. Your task is to:
1. Read 1-indexed-keywords.json and 4-grades-statistics.json
2. Analyze git commit history for Trust Debt evolution
3. Generate timeline data with trend analysis
4. Create evolution graph data for visualization
5. Output 5-timeline-history.json with historical analysis`,

      '6': `You are Agent 6: Analysis & Narrative Generator. Your task is to:
1. Read all previous agent outputs (0-5)
2. Generate cold spot analysis from matrix sparse regions
3. Detect asymmetric patterns with specific ratios
4. Create actionable recommendations with priority levels
5. Output 6-analysis-narratives.json with complete analysis`,

      '7': `You are Agent 7: Report Generator & Final Auditor. Your task is to:
1. Read all agent outputs (0-6) 
2. Validate pipeline integrity and all outcome requirements
3. Generate final HTML report using existing templates
4. Ensure all 47+ outcomes from Agent 0 are populated
5. Output trust-debt-report.html and 7-audit-log.json`
    };

    return instructions[agentNumber] || `Execute ${config.responsibility}`;
  }

  getRequiredTools(agentNumber) {
    const tools = {
      '0': ['Read', 'Write', 'Grep'],
      '1': ['Read', 'Write', 'Bash', 'Grep', 'Glob'],
      '2': ['Read', 'Write'], 
      '3': ['Read', 'Write'],
      '4': ['Read', 'Write'],
      '5': ['Read', 'Write', 'Bash'],
      '6': ['Read', 'Write'],
      '7': ['Read', 'Write', 'MultiEdit']
    };
    return tools[agentNumber] || ['Read', 'Write'];
  }

  getAgentDependencies(agentNumber) {
    const dependencies = {
      '0': [],
      '1': ['Agent 0'],
      '2': ['Agent 1'],
      '3': ['Agent 2'], 
      '4': ['Agent 3'],
      '5': ['Agent 1', 'Agent 4'],
      '6': ['Agents 0-5'],
      '7': ['Agents 0-6']
    };
    return dependencies[agentNumber] || [];
  }
}

// CLI usage
if (require.main === module) {
  const agentNumber = process.argv[2];
  
  if (!agentNumber || !agentNumber.match(/^[0-7]$/)) {
    console.error('Usage: node claude-agent-dispatcher.js <agent_number>');
    console.error('Example: node claude-agent-dispatcher.js 0');
    process.exit(1);
  }

  try {
    const dispatcher = new ClaudeAgentDispatcher();
    const context = dispatcher.dispatch(agentNumber);
    console.log(JSON.stringify(context, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

module.exports = ClaudeAgentDispatcher;