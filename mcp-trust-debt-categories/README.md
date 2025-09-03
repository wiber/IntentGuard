# 🎯 Trust Debt Category Management Tool

**MCP Server & CLI for statistical analysis and optimization of Trust Debt categories with natural language support**

## 🎙️ **VOICE & TEXT INPUT SUPPORTED**

**You can speak or type naturally!** This tool understands plain English commands for managing Trust Debt categories.

### Examples of Natural Language Input:
- *"Add a category for code complexity"*
- *"Remove the security category, it overlaps too much"*  
- *"Rename Performance to Speed and Efficiency"*
- *"Make the categories more specific to mobile development"*
- *"Do these categories pass statistical independence tests?"*
- *"Generate new categories optimized for my domain"*

## ✨ Key Features

### 🔬 **Statistical Independence Analysis**
- **Chi-Square Tests** - Formal independence testing
- **Mutual Information** - Information-theoretic dependency measurement  
- **Correlation Analysis** - Linear relationship detection
- **Cramer's V** - Categorical association strength

### 🎯 **Shortlex Optimization**
- **Minimize Semantic Overlap** - Reduce category redundancy
- **Maximize Domain Coverage** - Ensure comprehensive measurement
- **Orthogonality Maximization** - Categories measure distinct aspects
- **Multiple Algorithms**: Greedy, Simulated Annealing, Genetic

### 🤖 **Claude AI Integration**
- **Natural Language Processing** - Understand user intent from speech/text
- **Semantic Analysis** - Deep understanding of category relationships
- **Smart Recommendations** - AI-powered improvement suggestions
- **Domain Adaptation** - Generate categories specific to your context

### ⚡ **Cause-Effect Detection**
- **Granger Causality** - Statistical causation analysis
- **Time Series Analysis** - Temporal relationship detection
- **Lag Analysis** - Optimal time delay identification

## 🚀 Quick Start

### Installation

```bash
cd mcp-trust-debt-categories
npm install
```

### Interactive CLI (Recommended)

```bash
npm start
# or
node cli.js
```

The CLI provides a natural language interface where you can:
- **Speak** your commands (if using voice input software)
- **Type** your requests in plain English
- Get **real-time validation** and optimization
- **Save/load** category configurations

### MCP Server Integration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "trust-debt-categories": {
      "command": "node",
      "args": ["/path/to/mcp-trust-debt-categories/src/server.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

## 📝 Usage Examples

### CLI Natural Language Examples

```bash
🎯 Tell me what to do: Add categories for mobile app development

✅ Added 3 new categories optimized for mobile development:
• UI Responsiveness: Measures interface adaptation and performance
• Battery Efficiency: Tracks power consumption impact  
• Platform Integration: Evaluates native feature utilization

💡 Suggestions:
• Consider adding Network Efficiency category
• Test categories for statistical independence

🔄 Next: Run 'validate' to check independence
```

```bash
🎯 Tell me what to do: These categories seem to overlap, can you fix that?

✅ Optimized categories to minimize overlap:
Reordered 5 categories using shortlex optimization
Semantic overlap reduced from 0.73 to 0.31
Orthogonality improved from 0.45 to 0.82

📊 Validation: Overall Health: Excellent (87/100)
```

### MCP Server Tools

#### `analyze_category_independence`
```json
{
  "categories": ["Performance", "Security", "Maintainability"],
  "data": [/* historical trust debt measurements */],
  "tests": ["chi_square", "mutual_information", "correlation"]
}
```

#### `optimize_shortlex_categories`
```json
{
  "categories": [
    {"id": "A", "name": "Performance", "description": "Speed and efficiency"},
    {"id": "B", "name": "Security", "description": "Safety and protection"}
  ],
  "objective": "minimize_overlap",
  "algorithm": "simulated_annealing"
}
```

#### `evaluate_semantic_relationships`
```json
{
  "categories": [/* category definitions */],
  "context": "mobile app development", 
  "analysis_type": "orthogonality"
}
```

## 🧪 Statistical Methods

### Independence Testing
- **Chi-Square Test**: Tests null hypothesis of independence
- **Mutual Information**: Measures information shared between categories
- **Correlation Matrix**: Linear dependency analysis
- **Cramer's V**: Measures association strength for categorical data

### Optimization Algorithms
- **Greedy**: Fast, local optimization
- **Simulated Annealing**: Global optimization with probabilistic acceptance
- **Genetic Algorithm**: Population-based evolutionary optimization

### Validation Metrics
- **Independence Score**: Composite measure of statistical independence
- **Orthogonality Index**: Semantic separation measurement
- **Coverage Score**: Domain completeness assessment
- **Stability Score**: Measurement consistency over time

## 🎛️ CLI Commands

### Natural Language (Primary Interface)
Just describe what you want to do:
- *"Add a category for testing quality"*
- *"Remove performance and security categories"*
- *"Optimize these categories for independence"*
- *"Generate categories for healthcare software"*

### Quick Commands
- `help` - Show detailed help
- `validate` - Run statistical independence tests
- `optimize` - Apply shortlex optimization
- `clear` - Clear screen and show current categories
- `export` - Export categories to JSON file
- `quit` - Save and exit

## 📊 Example Output

### Statistical Independence Analysis
```
Statistical Independence Analysis

Summary:
- Categories analyzed: Performance, Security, Speed, Intelligence, Visual
- Tests performed: chi_square, mutual_information, correlation
- Data points: 57

Results:
### Chi-Square Independence Test
- Statistic: 23.456
- P-value: 0.032
- Significant: Yes
- Interpretation: Performance and Security show significant dependence

### Mutual Information Analysis  
- Performance ↔ Security: 0.23 (moderate dependence)
- Speed ↔ Performance: 0.45 (high dependence)
- Intelligence ↔ Visual: 0.08 (low dependence)

Recommendations:
- Consider merging or redefining Performance and Speed categories
- Categories show good independence overall
```

### Shortlex Optimization
```
Shortlex Category Optimization

Objective: minimize_overlap
Algorithm: simulated_annealing

Optimal Ordering:
1. Intelligence: Pattern recognition and smart automation
2. Security: Protection and vulnerability management  
3. Visual: Interface and aesthetic quality
4. Performance: Speed and efficiency optimization
5. Integration: External system compatibility

Optimization Metrics:
- Semantic overlap score: 0.31 (lower is better)
- Coverage completeness: 0.89 (higher is better)  
- Orthogonality index: 0.82 (higher is better)
```

## 🔧 Configuration

### Environment Variables
```bash
ANTHROPIC_API_KEY=your_anthropic_key_here  # For Claude AI integration
```

### Category File Format
```json
{
  "categories": [
    {
      "id": "performance", 
      "name": "Performance",
      "description": "Measures speed, efficiency, and resource utilization",
      "keywords": ["speed", "latency", "throughput", "efficiency"],
      "measurement_approach": "Automated performance profiling",
      "independence_rationale": "Distinct from security - measures different aspects"
    }
  ],
  "metadata": {
    "last_updated": "2025-01-03T10:30:00Z",
    "total_categories": 5,
    "domain": "software_quality"
  }
}
```

## 🤝 Integration with Trust Debt Analysis

This tool is designed to work with the existing IntentGuard Trust Debt analysis:

```bash
# Use optimized categories in your Trust Debt pipeline
node cli.js  # Optimize categories
# Categories saved to trust-debt-categories.json

# Use in your existing pipeline
node trust-debt.js --categories=trust-debt-categories.json
```

## 📈 Advanced Usage

### Batch Category Generation
```javascript
import { CategoryManager } from './src/category-manager.js';

const manager = new CategoryManager();
const result = await manager.generateOptimalCategories(
  'healthcare software',
  7,  // number of categories
  ['HIPAA compliance required', 'Patient safety critical'],
  ['Security', 'Performance']  // seed categories
);

console.log(result.categories);
```

### Custom Validation Pipeline
```javascript
const validation = await manager.validateSystem(
  categories,
  historicalData,
  ['independence', 'orthogonality', 'completeness', 'stability']
);

if (validation.overallHealth === 'Poor') {
  const optimized = await manager.generateOptimalCategories(domain);
  categories = optimized.categories;
}
```

## 🔬 Scientific Basis

This tool implements peer-reviewed statistical methods:

- **Pearson's Chi-Square Test** (1900) for independence testing
- **Mutual Information** (Shannon, 1948) for information-theoretic analysis  
- **Granger Causality** (1969) for temporal causation detection
- **Shortlex Ordering** for lexicographic optimization
- **Simulated Annealing** (Kirkpatrick et al., 1983) for global optimization

## 🛠️ Development

### Running Tests
```bash
npm test
```

### Development Mode
```bash
npm run dev  # Auto-restart on changes
```

### Building
```bash
npm run build
```

## 📄 License

MIT License - see LICENSE file for details

---

## 🎯 **Remember: You can speak or type naturally!**

This tool is designed for human-friendly interaction. Don't worry about exact syntax - just tell it what you want to do with your Trust Debt categories.

*"Make my categories better for mobile development"* works just as well as formal commands.