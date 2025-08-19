#!/usr/bin/env node

/**
 * Trust Debt Document Processor
 * Shows how Claude processes patent, MVP, and business plan to create ShortLex hierarchy
 */

const fs = require('fs');
const path = require('path');

class DocumentProcessor {
  constructor() {
    this.projectRoot = process.cwd();
    this.categoriesFile = path.join(this.projectRoot, 'trust-debt-categories.json');
  }

  /**
   * Generate document processing visualization HTML
   */
  generateDocumentProcessingSection(data) {
    // Load categories to get document paths
    const categories = JSON.parse(fs.readFileSync(this.categoriesFile, 'utf8'));
    const intentDocs = categories.documentation.intent;
    
    // Extract key documents
    const patent = intentDocs.find(d => d.includes('v16_USPTO_FILING.txt'));
    const businessPlan = intentDocs.find(d => d.includes('CANONICAL_BUSINESS_PLAN'));
    const mvpSpec = intentDocs.find(d => d.includes('commitMVP.txt'));
    
    return `
    <!-- Document Processing Pipeline -->
    <div style="
      background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(0, 0, 0, 0.8));
      border: 3px solid #3b82f6;
      border-radius: 20px;
      padding: 40px;
      margin-bottom: 40px;
    ">
      <h2 style="color: #3b82f6; font-size: 2.2rem; margin-bottom: 35px; text-align: center;">
        📄 How Claude Processes Documents into ShortLex Categories
      </h2>
      
      <!-- Document Sources -->
      <div style="margin-bottom: 40px;">
        <h3 style="color: #60a5fa; font-size: 1.6rem; margin-bottom: 25px;">
          🔍 Step 1: Document Analysis
        </h3>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;">
          <!-- Patent Processing -->
          <div style="
            background: rgba(139, 92, 246, 0.1);
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #8b5cf6;
          ">
            <h4 style="color: #8b5cf6; margin-bottom: 15px;">
              📜 Patent v16 (USPTO Filed)
            </h4>
            <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
              <strong>Path:</strong><br>
              <code style="color: #a78bfa; font-size: 0.8rem;">${patent || '/docs/patents/v16/USPTO_FILING.txt'}</code><br><br>
              
              <strong>Extracts:</strong><br>
              • <span style="color: #10b981;">361x speed claim</span> → Performance metrics<br>
              • <span style="color: #10b981;">FIM decomposition</span> → Orthogonal categories<br>
              • <span style="color: #10b981;">Trust quantification</span> → Measurement dimension<br>
              • <span style="color: #10b981;">Visual feedback</span> → Visualization dimension<br>
              • <span style="color: #10b981;">Automated enforcement</span> → Enforcement dimension<br><br>
              
              <strong>Creates Categories:</strong><br>
              <span style="color: #fbbf24;">Α📏 Measurement (40%)</span><br>
              <span style="color: #fbbf24;">Β🎨 Visualization (35%)</span><br>
              <span style="color: #fbbf24;">Γ⚖️ Enforcement (25%)</span>
            </div>
          </div>
          
          <!-- Business Plan Processing -->
          <div style="
            background: rgba(16, 185, 129, 0.1);
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #10b981;
          ">
            <h4 style="color: #10b981; margin-bottom: 15px;">
              💼 Canonical Business Plan
            </h4>
            <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
              <strong>Path:</strong><br>
              <code style="color: #34d399; font-size: 0.8rem;">${businessPlan || '/docs/CANONICAL_BUSINESS_PLAN.md'}</code><br><br>
              
              <strong>Extracts:</strong><br>
              • <span style="color: #8b5cf6;">KPI: One Oh Moment Daily</span> → User Value<br>
              • <span style="color: #8b5cf6;">$50/month target</span> → Strategic Fit<br>
              • <span style="color: #8b5cf6;">EU AI Act compliance</span> → Ethical Integrity<br>
              • <span style="color: #8b5cf6;">Viral coefficient 1.5</span> → Growth metrics<br>
              • <span style="color: #8b5cf6;">37.7% activation</span> → Reality baseline<br><br>
              
              <strong>Sets Weights:</strong><br>
              Based on business priorities:<br>
              • User acquisition: 40%<br>
              • Revenue generation: 35%<br>
              • Risk mitigation: 25%
            </div>
          </div>
          
          <!-- MVP Spec Processing -->
          <div style="
            background: rgba(236, 72, 153, 0.1);
            padding: 20px;
            border-radius: 12px;
            border: 2px solid #ec4899;
          ">
            <h4 style="color: #ec4899; margin-bottom: 15px;">
              🎯 MVP Specification
            </h4>
            <div style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.6;">
              <strong>Path:</strong><br>
              <code style="color: #f472b6; font-size: 0.8rem;">${mvpSpec || '/docs/MVP/commitMVP.txt'}</code><br><br>
              
              <strong>Extracts:</strong><br>
              • <span style="color: #fbbf24;">Trade-off Matrix</span> → O🎯.Β🎨.M🔲<br>
              • <span style="color: #fbbf24;">Drift Detection</span> → O🎯.Α📏.D📊<br>
              • <span style="color: #fbbf24;">Commit Blocking</span> → O🎯.Γ⚖️.S🚫<br>
              • <span style="color: #fbbf24;">Real-time feedback</span> → Carrot mechanics<br>
              • <span style="color: #fbbf24;">50-unit threshold</span> → Stick mechanics<br><br>
              
              <strong>Defines Actions:</strong><br>
              Each specific feature becomes<br>
              a leaf node in hierarchy:<br>
              • 12 measurement actions<br>
              • 8 visualization components<br>
              • 6 enforcement rules
            </div>
          </div>
        </div>
      </div>
      
      <!-- Processing Pipeline -->
      <div style="margin-bottom: 40px;">
        <h3 style="color: #60a5fa; font-size: 1.6rem; margin-bottom: 25px;">
          ⚙️ Step 2: Claude's Processing Pipeline
        </h3>
        
        <div style="
          background: rgba(0, 0, 0, 0.5);
          padding: 25px;
          border-radius: 12px;
          border: 2px dashed #60a5fa;
        ">
          <div style="font-family: monospace; color: #06ffa5; line-height: 1.8;">
            <strong style="color: #60a5fa;">// Claude's semantic extraction algorithm:</strong><br><br>
            
            1. <span style="color: #fbbf24;">EXTRACT ORTHOGONAL DIMENSIONS</span> from patent claims<br>
            &nbsp;&nbsp;&nbsp;→ Find concepts that multiply (not add)<br>
            &nbsp;&nbsp;&nbsp;→ Verify independence: changing one doesn't affect others<br>
            &nbsp;&nbsp;&nbsp;→ Result: Measurement × Visualization × Enforcement<br><br>
            
            2. <span style="color: #fbbf24;">ASSIGN WEIGHTS</span> from business priorities<br>
            &nbsp;&nbsp;&nbsp;→ Parse KPIs and success metrics<br>
            &nbsp;&nbsp;&nbsp;→ Map to orthogonal dimensions<br>
            &nbsp;&nbsp;&nbsp;→ Result: 40% / 35% / 25% split<br><br>
            
            3. <span style="color: #fbbf24;">POPULATE HIERARCHY</span> from MVP features<br>
            &nbsp;&nbsp;&nbsp;→ Each feature gets semantic address (O🎯.X.Y.Z)<br>
            &nbsp;&nbsp;&nbsp;→ Group by similarity and dependency<br>
            &nbsp;&nbsp;&nbsp;→ Result: 4-level tree with 26 leaf actions<br><br>
            
            4. <span style="color: #fbbf24;">APPLY SHORTRANK ALGORITHM</span><br>
            &nbsp;&nbsp;&nbsp;→ Sort siblings by weight (highest first)<br>
            &nbsp;&nbsp;&nbsp;→ Maintain block unity (parent + all children together)<br>
            &nbsp;&nbsp;&nbsp;→ Result: Deterministic O(n) traversal order
          </div>
        </div>
      </div>
      
      <!-- ShortLex Output -->
      <div>
        <h3 style="color: #60a5fa; font-size: 1.6rem; margin-bottom: 25px;">
          📊 Step 3: ShortLex Category Generation
        </h3>
        
        <div style="
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(0, 0, 0, 0.5));
          padding: 25px;
          border-radius: 12px;
          border: 2px solid #10b981;
        ">
          <h4 style="color: #10b981; margin-bottom: 20px;">
            Generated Hierarchy (ShortRank Order)
          </h4>
          
          <div style="font-family: monospace; background: #0f172a; padding: 20px; border-radius: 8px; color: #e2e8f0; overflow-x: auto;">
            <div style="color: #06ffa5; margin-bottom: 5px;">O🎯 Trust Debt MVP (100%)</div>
            <div style="color: #fbbf24; margin-left: 20px;">├─ Α📏 Measurement (40%)</div>
            <div style="color: #60a5fa; margin-left: 40px;">│  ├─ D📊 Drift Detection (50% of 40% = 20%)</div>
            <div style="color: #94a3b8; margin-left: 60px;">│  │  ├─ S🔍 Semantic Analysis (60% of 20% = 12%)</div>
            <div style="color: #94a3b8; margin-left: 60px;">│  │  └─ C📝 Commit Parsing (40% of 20% = 8%)</div>
            <div style="color: #60a5fa; margin-left: 40px;">│  └─ S🎯 Scoring Formula (50% of 40% = 20%)</div>
            <div style="color: #94a3b8; margin-left: 60px;">│     ├─ T🏛️ Trust Score (50% of 20% = 10%)</div>
            <div style="color: #94a3b8; margin-left: 60px;">│     └─ R⏱️ Recognition Timing (50% of 20% = 10%)</div>
            <div style="color: #fbbf24; margin-left: 20px;">├─ Β🎨 Visualization (35%)</div>
            <div style="color: #60a5fa; margin-left: 40px;">│  ├─ M🔲 Trade-off Matrix (60% of 35% = 21%)</div>
            <div style="color: #60a5fa; margin-left: 40px;">│  └─ G📈 Trend Graphs (40% of 35% = 14%)</div>
            <div style="color: #fbbf24; margin-left: 20px;">└─ Γ⚖️ Enforcement (25%)</div>
            <div style="color: #60a5fa; margin-left: 40px;">   ├─ S🚫 Sticks (60% of 25% = 15%)</div>
            <div style="color: #94a3b8; margin-left: 60px;">   │  └─ B⛔ Commit Blocking (100% of 15% = 15%)</div>
            <div style="color: #60a5fa; margin-left: 40px;">   └─ C🥕 Carrots (40% of 25% = 10%)</div>
            <div style="color: #94a3b8; margin-left: 60px;">      └─ V🚀 Velocity Boost (100% of 10% = 10%)</div>
          </div>
          
          <div style="margin-top: 20px; padding: 15px; background: rgba(245, 158, 11, 0.1); border-radius: 8px;">
            <strong style="color: #f59e0b;">Why This Order?</strong><br>
            <div style="color: #e2e8f0; margin-top: 10px; line-height: 1.6;">
              1. <strong>Business Priority:</strong> Measurement (40%) comes first - can't improve what you don't measure<br>
              2. <strong>Weight-Based:</strong> Within each level, higher weights appear first (60% before 40%)<br>
              3. <strong>Block Unity:</strong> Parent and all children stay together (Α📏 + all its descendants)<br>
              4. <strong>Semantic Addressing:</strong> Each item has unique path like O🎯.Β🎨.M🔲 for precise reference
            </div>
          </div>
        </div>
      </div>
      
      <!-- The Magic Formula -->
      <div style="
        margin-top: 30px;
        padding: 25px;
        background: rgba(139, 92, 246, 0.1);
        border-radius: 12px;
        border: 2px solid #8b5cf6;
        text-align: center;
      ">
        <h4 style="color: #8b5cf6; font-size: 1.5rem; margin-bottom: 15px;">
          🎯 The Multiplicative Forcing Function
        </h4>
        <div style="font-family: monospace; color: #06ffa5; font-size: 1.3rem; margin: 20px 0;">
          Effectiveness = Measurement × Visualization × Enforcement
        </div>
        <div style="color: #e2e8f0; font-size: 1.1rem; line-height: 1.8;">
          Current: 0.446 × 0.279 × 0.275 = <strong style="color: #ef4444;">3.4%</strong><br>
          <span style="color: #94a3b8;">If any dimension → 0, entire system → 0</span><br>
          <span style="color: #10b981;">This forces balanced attention across all dimensions</span>
        </div>
      </div>
    </div>
    `;
  }
}

module.exports = { DocumentProcessor };

// CLI test
if (require.main === module) {
  const processor = new DocumentProcessor();
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Document Processing Visualization</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
            padding: 20px;
        }
    </style>
</head>
<body>
    ${processor.generateDocumentProcessingSection({})}
</body>
</html>`;
  
  fs.writeFileSync('trust-debt-document-processing.html', html);
  console.log('✅ Document processing visualization generated');
}