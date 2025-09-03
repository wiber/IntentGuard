/**
 * Integration tests for Intent Guard Trust Debt package
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { IntentGuard } = require('../../src/index');
const { TrustDebtAnalyzer } = require('../../src/trust-debt');

describe('Intent Guard Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-repo');
  
  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Initialize git repo
    execSync('git init', { cwd: testDir });
    
    // Create test files
    fs.writeFileSync(path.join(testDir, 'README.md'), `# Test Project
    
## Intent
This project intends to test Trust Debt measurement.

## Architecture
- Testing framework
- Performance optimization
- Security measures
`);
    
    fs.writeFileSync(path.join(testDir, 'test.js'), `
// Test file
function test() {
  console.log('testing');
}
`);
    
    // Make initial commit
    execSync('git add -A', { cwd: testDir });
    execSync('git commit -m "Initial commit: setup testing framework"', { cwd: testDir });
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      execSync(`rm -rf ${testDir}`);
    }
  });
  
  describe('IntentGuard Core', () => {
    test('should initialize Intent Guard', async () => {
      const guard = new IntentGuard(testDir);
      const result = await guard.initialize({ installHook: false });
      
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(testDir, '.intent-guard.json'))).toBe(true);
    });
    
    test('should analyze Trust Debt', async () => {
      const guard = new IntentGuard(testDir);
      await guard.initialize({ installHook: false });
      
      const analysis = await guard.analyze();
      
      expect(analysis).toHaveProperty('score');
      expect(analysis).toHaveProperty('status');
      expect(analysis).toHaveProperty('categories');
      expect(analysis.score).toBeGreaterThanOrEqual(0);
    });
    
    test('should detect intent-reality drift', async () => {
      const guard = new IntentGuard(testDir);
      await guard.initialize({ installHook: false });
      
      // Add commit that doesn't match intent
      fs.writeFileSync(path.join(testDir, 'ui.js'), 'console.log("ui");');
      execSync('git add -A', { cwd: testDir });
      execSync('git commit -m "Add UI components and interface updates"', { cwd: testDir });
      
      const analysis = await guard.analyze();
      
      // Should detect drift in User Experience category
      const uxCategory = analysis.categories.find(c => c.name === 'User Experience');
      expect(uxCategory).toBeDefined();
      expect(parseFloat(uxCategory.drift)).toBeGreaterThan(0);
    });
    
    test('should calculate time decay', async () => {
      const guard = new IntentGuard(testDir);
      await guard.initialize({ installHook: false });
      
      // Modify config to be older
      const configPath = path.join(testDir, '.intent-guard.json');
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      
      // Touch file to set old timestamp (30 days ago)
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      fs.utimesSync(configPath, oldDate, oldDate);
      
      const analysis = await guard.analyze();
      
      // Score should be higher due to time decay
      expect(analysis.score).toBeGreaterThan(0);
    });
    
    test('should generate HTML report', async () => {
      const guard = new IntentGuard(testDir);
      await guard.initialize({ installHook: false });
      
      const analysis = await guard.analyze();
      const html = await guard.generateHTMLReport(analysis);
      
      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('Trust Debt');
      expect(html).toContain(analysis.score.toString());
    });
  });
  
  describe('TrustDebtAnalyzer', () => {
    test('should detect full pipeline availability', () => {
      const analyzer = new TrustDebtAnalyzer(process.cwd());
      
      // In the main project, should detect full pipeline
      expect(analyzer.hasFullPipeline).toBe(true);
    });
    
    test('should run basic analysis without Claude', async () => {
      const analyzer = new TrustDebtAnalyzer(testDir);
      const result = await analyzer.runBasicAnalysis({ silent: true });
      
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('status');
      expect(result.score).toBe(999); // Crisis state without setup
    });
    
    test('should install git hook', async () => {
      const analyzer = new TrustDebtAnalyzer(testDir);
      const result = await analyzer.installHook();
      
      expect(result.success).toBe(true);
      
      const hookPath = path.join(testDir, '.git', 'hooks', 'post-commit');
      expect(fs.existsSync(hookPath)).toBe(true);
      
      const hookContent = fs.readFileSync(hookPath, 'utf8');
      expect(hookContent).toContain('intentguard');
      expect(hookContent).toContain('Trust Debt');
    });
    
    test('should read analysis results', () => {
      const analyzer = new TrustDebtAnalyzer(testDir);
      
      // Create mock result files
      fs.writeFileSync(
        path.join(testDir, 'trust-debt-unified.json'),
        JSON.stringify({ score: 150, status: 'WARNING' })
      );
      
      const results = analyzer.readAnalysisResults();
      
      expect(results.score).toBe(150);
      expect(results.status).toBe('WARNING');
    });
  });
  
  describe('CLI Commands', () => {
    test('should run doctor command', () => {
      const cliPath = path.join(__dirname, '..', '..', 'bin', 'cli.js');
      
      try {
        const output = execSync(`node ${cliPath} doctor -d ${testDir}`, {
          encoding: 'utf8'
        });
        
        expect(output).toContain('Intent Guard Doctor');
        expect(output).toContain('Git repository');
      } catch (error) {
        // Doctor may exit with error if checks fail
        expect(error.stdout).toContain('Intent Guard Doctor');
      }
    });
    
    test('should generate badge', async () => {
      const guard = new IntentGuard(testDir);
      await guard.initialize({ installHook: false });
      
      const cliPath = path.join(__dirname, '..', '..', 'bin', 'cli.js');
      const output = execSync(`node ${cliPath} badge -d ${testDir}`, {
        encoding: 'utf8'
      });
      
      expect(output).toContain('Trust Debt Badge');
      expect(output).toContain('img.shields.io');
      
      const badgeFile = path.join(testDir, '.intent-guard-badge.json');
      expect(fs.existsSync(badgeFile)).toBe(true);
    });
  });
  
  describe('Trust Debt Calculations', () => {
    test('should calculate category drift correctly', async () => {
      const guard = new IntentGuard(testDir);
      await guard.initialize({ installHook: false });
      
      const intent = {
        categories: {
          'Testing': 0.5,
          'Documentation': 0.3,
          'Security': 0.2
        }
      };
      
      const reality = {
        categories: {
          'Testing': 0.2,
          'Documentation': 0.1,
          'Security': 0.7
        }
      };
      
      const scores = guard.calculateCategoryDrift(intent, reality);
      
      // Testing should have 30% drift (50% - 20%)
      const testingScore = scores.find(s => s.name === 'Testing');
      expect(testingScore).toBeDefined();
      expect(parseFloat(testingScore.drift)).toBeCloseTo(30, 0);
      
      // Security should have 50% drift (70% - 20%)
      const securityScore = scores.find(s => s.name === 'Security');
      expect(securityScore).toBeDefined();
      expect(parseFloat(securityScore.drift)).toBeCloseTo(50, 0);
    });
    
    test('should apply time and spec multipliers', async () => {
      const guard = new IntentGuard(testDir);
      
      // Mock category scores with high drift
      const categoryScores = [
        { name: 'Testing', contribution: 10, weight: 15 },
        { name: 'Security', contribution: 20, weight: 20 }
      ];
      
      const baseDebt = guard.calculateTotalDebt(categoryScores);
      
      // Should apply multipliers
      expect(baseDebt).toBeGreaterThan(3000); // Base would be 30*100 = 3000
    });
    
    test('should determine correct status', async () => {
      const guard = new IntentGuard(testDir);
      await guard.initialize({ installHook: false });
      
      expect(guard.determineStatus(40)).toBe('GOOD');
      expect(guard.determineStatus(80)).toBe('WARNING');
      expect(guard.determineStatus(150)).toBe('CRITICAL');
      expect(guard.determineStatus(250)).toBe('CRISIS');
    });
    
    test('should generate appropriate recommendations', async () => {
      const guard = new IntentGuard(testDir);
      
      const analysis = {
        score: 250,
        topContributors: [
          { category: 'Testing', gap: '45%' },
          { category: 'Documentation', gap: '20%' }
        ]
      };
      
      const recommendations = guard.generateRecommendations(analysis);
      
      expect(recommendations).toContainEqual(
        expect.stringContaining('URGENT')
      );
      expect(recommendations).toContainEqual(
        expect.stringContaining('Testing')
      );
    });
  });
});

// Run tests if called directly
if (require.main === module) {
  const jest = require('jest');
  jest.run(['--config', path.join(__dirname, '..', 'config', 'jest.config.js')]);
}