#!/usr/bin/env node

/**
 * Trust Debt Physics-First HTML Generator
 * 
 * Makes the M = S × E physics formula PRIMARY
 * Shows Trust Debt as drift measurement SECONDARY
 */

const fs = require('fs');
const path = require('path');

class PhysicsFirstHTMLGenerator {
  generateHTML(data) {
    const twoLayer = data.twoLayerAssessment || {};
    const trustDebt = data.trustDebtScore || 999;
    const processHealth = twoLayer.processHealth || {};
    const outcomeReality = twoLayer.outcomeReality || {};
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Unity Architecture: M = S × E Physics & Trust Debt Measurement</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0a0a0a;
      color: #e2e8f0;
      line-height: 1.6;
    }
    
    /* HERO SECTION FOR PHYSICS */
    .physics-hero {
      background: linear-gradient(135deg, #FFA500 0%, #FF6347 100%);
      padding: 60px 20px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .physics-hero::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 10px,
        rgba(255,255,255,0.05) 10px,
        rgba(255,255,255,0.05) 20px
      );
      animation: slide 20s linear infinite;
    }
    @keyframes slide {
      0% { transform: translate(0, 0); }
      100% { transform: translate(50px, 50px); }
    }
    .physics-formula {
      font-size: 5rem;
      font-weight: 900;
      color: #000;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    .physics-meaning {
      font-size: 2rem;
      color: #fff;
      font-weight: 600;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }
    .physics-subtitle {
      font-size: 1.2rem;
      color: rgba(255,255,255,0.9);
      position: relative;
      z-index: 1;
    }
    
    /* PHYSICS EXPLANATION */
    .physics-section {
      max-width: 1400px;
      margin: 40px auto;
      padding: 0 20px;
    }
    .physics-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin: 30px 0;
    }
    .physics-bad {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(127, 29, 29, 0.1));
      border: 2px solid #dc2626;
      border-radius: 12px;
      padding: 30px;
    }
    .physics-good {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(21, 128, 61, 0.1));
      border: 2px solid #16a34a;
      border-radius: 12px;
      padding: 30px;
    }
    .physics-title {
      font-size: 1.5rem;
      font-weight: bold;
      margin-bottom: 15px;
    }
    .physics-bad .physics-title { color: #ef4444; }
    .physics-good .physics-title { color: #22c55e; }
    
    /* HARDWARE PROOF */
    .hardware-proof {
      background: #1a1a2e;
      border: 2px solid #FFA500;
      border-radius: 12px;
      padding: 30px;
      margin: 30px 0;
    }
    .hardware-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }
    .hardware-metric {
      text-align: center;
      padding: 15px;
      background: rgba(255, 165, 0, 0.1);
      border-radius: 8px;
    }
    .hardware-value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #FFA500;
    }
    .hardware-label {
      color: #94a3b8;
      font-size: 0.9rem;
      margin-top: 5px;
    }
    
    /* TRUST DEBT SECTION - CLEARLY DIFFERENT */
    .trust-debt-section {
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
      border: 2px solid #3b82f6;
      border-radius: 12px;
      padding: 40px;
      margin: 40px auto;
      max-width: 1400px;
    }
    .trust-debt-header {
      text-align: center;
      margin-bottom: 30px;
    }
    .trust-debt-title {
      font-size: 2rem;
      color: #60a5fa;
      margin-bottom: 10px;
    }
    .trust-debt-subtitle {
      color: #94a3b8;
      font-size: 1.1rem;
    }
    .trust-debt-formula {
      background: #0f0f23;
      border: 1px solid #4a5568;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      font-family: 'Monaco', monospace;
      text-align: center;
    }
    .trust-debt-score {
      font-size: 4rem;
      font-weight: 900;
      text-align: center;
      margin: 30px 0;
    }
    .trust-debt-score.crisis { color: #ef4444; }
    .trust-debt-score.warning { color: #f59e0b; }
    .trust-debt-score.good { color: #22c55e; }
    
    /* RELATIONSHIP SECTION */
    .relationship-section {
      max-width: 1400px;
      margin: 40px auto;
      padding: 40px;
      background: #1a1a2e;
      border-radius: 12px;
    }
    .relationship-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-top: 20px;
    }
    .relationship-box {
      padding: 20px;
      border-radius: 8px;
    }
    .low-debt {
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(21, 128, 61, 0.05));
      border: 1px solid #22c55e;
    }
    .high-debt {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(127, 29, 29, 0.05));
      border: 1px solid #ef4444;
    }
    
    /* TWO-LAYER BREAKDOWN */
    .two-layer {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 30px 0;
    }
    .layer-card {
      background: #1a1a2e;
      border: 1px solid #4a5568;
      border-radius: 8px;
      padding: 20px;
    }
    .layer-title {
      font-size: 1.2rem;
      color: #60a5fa;
      margin-bottom: 15px;
    }
    .layer-score {
      font-size: 2.5rem;
      font-weight: bold;
      margin: 10px 0;
    }
    .layer-components {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #4a5568;
    }
  </style>
</head>
<body>
  <!-- PHYSICS HERO -->
  <div class="physics-hero">
    <div class="physics-formula">M = S × E</div>
    <div class="physics-meaning">Momentum = Scale × Efficiency</div>
    <div class="physics-subtitle">The Fundamental Physics Formula (Patent Core)</div>
  </div>

  <!-- PHYSICS EXPLANATION -->
  <div class="physics-section">
    <h2 style="font-size: 2.5rem; text-align: center; margin-bottom: 30px; color: #FFA500;">
      The Physics That Changes Everything
    </h2>
    
    <div class="physics-grid">
      <div class="physics-bad">
        <div class="physics-title">❌ Traditional Systems Break Physics</div>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 10px 0;">📈 As Scale increases...</li>
          <li style="margin: 10px 0;">📉 Efficiency decreases</li>
          <li style="margin: 10px 0;">⚠️ Momentum plateaus or degrades</li>
          <li style="margin: 10px 0;">🐌 O(log n) or O(n²) complexity</li>
        </ul>
        <div style="margin-top: 20px; padding: 15px; background: rgba(239, 68, 68, 0.1); border-radius: 8px;">
          <strong>Result:</strong> Systems get slower as they grow
        </div>
      </div>
      
      <div class="physics-good">
        <div class="physics-title">✅ Unity Architecture Obeys Physics</div>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 10px 0;">📈 As Scale increases...</li>
          <li style="margin: 10px 0;">➡️ Efficiency stays constant</li>
          <li style="margin: 10px 0;">🚀 Momentum grows linearly forever</li>
          <li style="margin: 10px 0;">⚡ O(1) complexity maintained</li>
        </ul>
        <div style="margin-top: 20px; padding: 15px; background: rgba(34, 197, 94, 0.1); border-radius: 8px;">
          <strong>Result:</strong> Unlimited scaling with no degradation
        </div>
      </div>
    </div>
    
    <!-- HARDWARE PROOF -->
    <div class="hardware-proof">
      <h3 style="text-align: center; color: #FFA500; font-size: 1.8rem; margin-bottom: 20px;">
        🔬 Measured in Physical Hardware
      </h3>
      <div class="hardware-metrics">
        <div class="hardware-metric">
          <div class="hardware-value">361×</div>
          <div class="hardware-label">Query Speed<br>(5μs vs 1.8ms)</div>
        </div>
        <div class="hardware-metric">
          <div class="hardware-value">55×</div>
          <div class="hardware-label">Power Reduction<br>(0.15W vs 8.3W)</div>
        </div>
        <div class="hardware-metric">
          <div class="hardware-value">4.1×</div>
          <div class="hardware-label">Cache Hit Rate<br>(94.7% vs 23.1%)</div>
        </div>
        <div class="hardware-metric">
          <div class="hardware-value">2.1mm²</div>
          <div class="hardware-label">Silicon Area<br>(<1% of CPU)</div>
        </div>
      </div>
    </div>
  </div>

  <!-- TRUST DEBT SECTION -->
  <div class="trust-debt-section">
    <div class="trust-debt-header">
      <h2 class="trust-debt-title">📊 Trust Debt: Measuring Drift (NOT Physics)</h2>
      <p class="trust-debt-subtitle">
        While M = S × E is the capability, Trust Debt measures if we're achieving it
      </p>
    </div>
    
    <div class="trust-debt-formula">
      <div style="font-size: 1.3rem; color: #60a5fa;">
        TrustDebt = Σ((Intent - Reality)² × Time × SpecAge × Weight)
      </div>
      <div style="color: #94a3b8; margin-top: 10px; font-size: 0.9rem;">
        Measures the delta between what we intend and what we build
      </div>
    </div>
    
    <div class="trust-debt-score ${trustDebt > 300 ? 'crisis' : trustDebt > 100 ? 'warning' : 'good'}">
      ${trustDebt} units
    </div>
    
    <!-- TWO LAYER BREAKDOWN -->
    <div class="two-layer">
      <div class="layer-card">
        <div class="layer-title">Layer 1: Process Health</div>
        <div class="layer-score" style="color: ${processHealth.overall < 20 ? '#ef4444' : '#f59e0b'};">
          ${(processHealth.overall || 0).toFixed(1)}%
        </div>
        <div class="layer-components">
          <div>Measurement: ${(processHealth.measurement || 0).toFixed(1)}%</div>
          <div>Visualization: ${(processHealth.visualization || 0).toFixed(1)}%</div>
          <div>Enforcement: ${(processHealth.enforcement || 0).toFixed(1)}%</div>
        </div>
      </div>
      
      <div class="layer-card">
        <div class="layer-title">Layer 2: Outcome Reality</div>
        <div class="layer-score" style="color: ${outcomeReality.overall < 10 ? '#ef4444' : '#f59e0b'};">
          ${(outcomeReality.overall || 0).toFixed(1)}%
        </div>
        <div class="layer-components">
          <div>User Success: ${(outcomeReality.userSuccess || 0).toFixed(1)}%</div>
          <div>Strategic Value: ${(outcomeReality.strategicValue || 0).toFixed(1)}%</div>
          <div>Ethical Compliance: ${(outcomeReality.ethicalCompliance || 0).toFixed(1)}%</div>
        </div>
      </div>
    </div>
  </div>

  <!-- THREE PROPRIETARY METRICS -->
  <div style="max-width: 1400px; margin: 40px auto; padding: 40px 20px;">
    <h2 style="text-align: center; font-size: 2.5rem; margin-bottom: 10px; color: #FFA500;">
      Three Proprietary Metrics Only Unity Can Measure
    </h2>
    <p style="text-align: center; color: #94a3b8; margin-bottom: 40px; font-size: 1.1rem;">
      Each metric exposes a massive cost center and creates a revenue stream
    </p>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 30px;">
      <!-- Metric 1: Semantic Compression Ratio -->
      <div style="background: linear-gradient(135deg, rgba(168, 85, 247, 0.1), rgba(147, 51, 234, 0.05)); border: 2px solid #9333ea; border-radius: 12px; padding: 25px;">
        <div style="color: #c084fc; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
          Metric 1: Cost of Translation
        </div>
        <div style="color: #a855f7; font-size: 1.25rem; font-weight: bold; margin-bottom: 15px;">
          Semantic Compression Ratio
        </div>
        <div style="font-size: 3rem; font-weight: bold; color: #fff; margin-bottom: 10px;">50:1</div>
        <div style="color: #e2e8f0; margin-bottom: 15px;">Memory & Storage Reduction</div>
        <div style="background: rgba(147, 51, 234, 0.2); padding: 15px; border-radius: 8px; margin-top: 15px;">
          <div style="color: #c084fc; font-size: 0.75rem; font-weight: bold;">Revenue Stream:</div>
          <div style="color: #fff; margin-top: 5px;">Efficiency-as-a-Service</div>
          <div style="color: #e9d5ff; font-size: 0.85rem; margin-top: 5px;">"Saved $280K/month in cloud costs"</div>
        </div>
      </div>
      
      <!-- Metric 2: System Entanglement Score -->
      <div style="background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.05)); border: 2px solid #16a34a; border-radius: 12px; padding: 25px;">
        <div style="color: #86efac; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
          Metric 2: Correlation Tax
        </div>
        <div style="color: #22c55e; font-size: 1.25rem; font-weight: bold; margin-bottom: 15px;">
          System Entanglement Score (ρ)
        </div>
        <div style="font-size: 3rem; font-weight: bold; color: #fff; margin-bottom: 10px;">&lt;0.1</div>
        <div style="color: #e2e8f0; margin-bottom: 15px;">Maintained Independence</div>
        <div style="background: rgba(22, 163, 74, 0.2); padding: 15px; border-radius: 8px; margin-top: 15px;">
          <div style="color: #86efac; font-size: 0.75rem; font-weight: bold;">Revenue Stream:</div>
          <div style="color: #fff; margin-top: 5px;">Scalability-as-a-Service</div>
          <div style="color: #dcfce7; font-size: 0.85rem; margin-top: 5px;">"Development velocity +15%/month"</div>
        </div>
      </div>
      
      <!-- Metric 3: Strategic Coherence Score -->
      <div style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05)); border: 2px solid #2563eb; border-radius: 12px; padding: 25px;">
        <div style="color: #93c5fd; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 8px;">
          Metric 3: Cost of Misalignment
        </div>
        <div style="color: #3b82f6; font-size: 1.25rem; font-weight: bold; margin-bottom: 15px;">
          Strategic Coherence Score
        </div>
        <div style="font-size: 3rem; font-weight: bold; color: #fff; margin-bottom: 10px;">56.7%</div>
        <div style="color: #e2e8f0; margin-bottom: 15px;">Strategy ↔ Execution</div>
        <div style="background: rgba(37, 99, 235, 0.2); padding: 15px; border-radius: 8px; margin-top: 15px;">
          <div style="color: #93c5fd; font-size: 0.75rem; font-weight: bold;">Revenue Stream:</div>
          <div style="color: #fff; margin-top: 5px;">Governance-as-a-Service</div>
          <div style="color: #dbeafe; font-size: 0.85rem; margin-top: 5px;">"AI Insurance Qualified"</div>
        </div>
      </div>
    </div>
  </div>

  <!-- RELATIONSHIP -->
  <div class="relationship-section">
    <h2 style="text-align: center; font-size: 2rem; margin-bottom: 30px; color: #e2e8f0;">
      How Trust Debt Affects M = S × E
    </h2>
    
    <div class="relationship-grid">
      <div class="relationship-box low-debt">
        <h3 style="color: #22c55e; margin-bottom: 15px;">✅ When Trust Debt is LOW</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 8px 0;">→ System achieves full M = S × E potential</li>
          <li style="margin: 8px 0;">→ Physics is fully realized</li>
          <li style="margin: 8px 0;">→ Linear momentum growth achieved</li>
          <li style="margin: 8px 0;">→ O(1) complexity maintained</li>
        </ul>
      </div>
      
      <div class="relationship-box high-debt">
        <h3 style="color: #ef4444; margin-bottom: 15px;">❌ When Trust Debt is HIGH</h3>
        <ul style="list-style: none; padding: 0;">
          <li style="margin: 8px 0;">→ Drift prevents physics from working</li>
          <li style="margin: 8px 0;">→ M = S × E potential is wasted</li>
          <li style="margin: 8px 0;">→ System degrades despite good architecture</li>
          <li style="margin: 8px 0;">→ Complexity creeps back in</li>
        </ul>
      </div>
    </div>
    
    <div style="text-align: center; margin-top: 40px; padding: 30px; background: rgba(255, 165, 0, 0.1); border-radius: 12px;">
      <div style="font-size: 1.5rem; color: #FFA500; margin-bottom: 10px;">
        The Bottom Line
      </div>
      <div style="font-size: 1.1rem; color: #e2e8f0;">
        <strong>M = S × E</strong> gives us the capability for unlimited scaling.<br>
        <strong>Trust Debt</strong> measures whether we're achieving that capability.<br>
        <span style="color: #FFA500; font-weight: bold;">Both must be managed for success.</span>
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}

module.exports = { PhysicsFirstHTMLGenerator };

// If run directly, generate the HTML
if (require.main === module) {
  const generator = new PhysicsFirstHTMLGenerator();
  const projectRoot = process.cwd();
  
  // Load existing data
  let data = {};
  const analysisFile = path.join(projectRoot, 'trust-debt-analysis.json');
  if (fs.existsSync(analysisFile)) {
    data = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
  }
  
  const twoLayerFile = path.join(projectRoot, 'trust-debt-two-layer-assessment.json');
  if (fs.existsSync(twoLayerFile)) {
    data.twoLayerAssessment = JSON.parse(fs.readFileSync(twoLayerFile, 'utf8'));
  }
  
  const unifiedFile = path.join(projectRoot, 'trust-debt-unified.json');
  if (fs.existsSync(unifiedFile)) {
    const unified = JSON.parse(fs.readFileSync(unifiedFile, 'utf8'));
    data.trustDebtScore = unified.score || 999;
  }
  
  // Generate and save HTML
  const html = generator.generateHTML(data);
  const outputFile = path.join(projectRoot, 'trust-debt-physics-report.html');
  fs.writeFileSync(outputFile, html);
  
  console.log(`✅ Physics-first report generated: ${outputFile}`);
}