#!/usr/bin/env node

/**
 * Enhanced Trust Debt HTML Generator
 * Shows carrot/stick mechanics and reproducible success patterns
 */

const fs = require('fs');
const path = require('path');

function generateEnhancedSection(data) {
  const trustDebtScore = data.trustDebt?.score || 0;
  
  // Get actual process health and outcome reality from two-layer assessment
  const processHealthValue = data.processHealth?.overall || 0.15;
  const outcomeRealityValue = data.outcomeReality?.overall || 0.000007;
  const overallSuccess = data.overallSuccess?.value || 0.00000001;
  
  // Calculate multiplicative effectiveness (fallback for older data)
  const factors = data.shortlexAxis?.filter(i => i.depth === 1) || [];
  const realProduct = factors.reduce((acc, f) => acc * (f.realWeight || 0.01), 1);
  const idealProduct = factors.reduce((acc, f) => acc * (f.idealWeight || 0.33), 1);
  const effectiveness = processHealthValue.toFixed(2); // Use actual process health
  
  // Find biggest gaps for action items
  const gaps = data.shortlexAxis ? 
    data.shortlexAxis
      .filter(item => item.depth === 1)
      .map(item => ({
        ...item,
        gap: Math.abs((item.idealWeight || 0) - (item.realWeight || 0))
      }))
      .sort((a, b) => b.gap - a.gap) : [];
  
  return `
    <!-- Enhanced Hero with Carrot/Stick Status -->
    <div style="
      background: linear-gradient(135deg, 
        ${trustDebtScore < 20 ? 'rgba(16, 185, 129, 0.2)' : trustDebtScore < 50 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 0%, 
        rgba(0, 0, 0, 0.8) 100%);
      padding: 60px 20px;
      text-align: center;
      position: relative;
    ">
      <h1 style="font-size: 2.5rem; color: #e2e8f0; margin-bottom: 20px;">
        Trust Debt Forcing Function
      </h1>
      
      <div style="font-size: 10rem; font-weight: 900; color: ${trustDebtScore < 20 ? '#10b981' : trustDebtScore < 50 ? '#f59e0b' : '#ef4444'}; margin: 30px 0;">
        ${trustDebtScore}
      </div>
      
      <!-- Real-time Carrot/Stick Status -->
      <div style="
        background: ${trustDebtScore < 20 ? 'rgba(16, 185, 129, 0.2)' : trustDebtScore < 40 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
        border: 2px solid ${trustDebtScore < 20 ? '#10b981' : trustDebtScore < 40 ? '#f59e0b' : '#ef4444'};
        padding: 30px;
        border-radius: 15px;
        max-width: 900px;
        margin: 40px auto;
      ">
        ${trustDebtScore < 20 ? `
          <div style="font-size: 2.5rem; margin-bottom: 15px;">🥕 CARROT ZONE ACTIVE</div>
          <div style="font-size: 1.3rem; color: #10b981; font-weight: bold;">
            ✅ Fast commits • 🚀 No friction • 💚 Green momentum
          </div>
          <div style="margin-top: 15px; color: #e2e8f0; font-size: 1.1rem;">
            Your commits flow freely. Reality matches intent. This is the zone of exponential returns.
          </div>
        ` : trustDebtScore < 40 ? `
          <div style="font-size: 2.5rem; margin-bottom: 15px;">⚠️ WARNING ZONE</div>
          <div style="font-size: 1.3rem; color: #f59e0b; font-weight: bold;">
            🔍 Review suggested • ⚡ Drift detected • 🔧 Fix recommended
          </div>
          <div style="margin-top: 15px; color: #e2e8f0; font-size: 1.1rem;">
            Your next commit will trigger a review prompt. Address drift now to avoid friction.
          </div>
        ` : trustDebtScore < 50 ? `
          <div style="font-size: 2.5rem; margin-bottom: 15px;">🔨 STICK ZONE</div>
          <div style="font-size: 1.3rem; color: #ef4444; font-weight: bold;">
            👀 Review required • 🐌 Commits slowed • ⏰ Action needed
          </div>
          <div style="margin-top: 15px; color: #e2e8f0; font-size: 1.1rem;">
            You must address drift before continuing. Each commit now requires justification.
          </div>
        ` : `
          <div style="font-size: 2.5rem; margin-bottom: 15px;">📊 ANALYSIS MODE</div>
          <div style="font-size: 1.3rem; color: #10b981; font-weight: bold;">
            📈 Data analysis • 🔍 Pattern detection • ✅ Normal operation
          </div>
          <div style="margin-top: 15px; color: #e2e8f0; font-size: 1.1rem;">
            Trust Debt analysis providing insights for continuous improvement.
          </div>
        `}
      </div>
    </div>

    <!-- Reproducible Success Patterns Dashboard -->
    <div style="max-width: 1400px; margin: 0 auto; padding: 40px 20px;">
      <div style="
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(0, 0, 0, 0.5));
        border: 2px solid #8b5cf6;
        border-radius: 20px;
        padding: 30px;
        margin-bottom: 40px;
      ">
        <h2 style="color: #8b5cf6; font-size: 2rem; margin-bottom: 30px;">
          🎯 Reproducible Success Patterns
        </h2>
        
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px;">
          <!-- Pattern 1: Commit that reduces debt -->
          <div style="background: rgba(16, 185, 129, 0.1); padding: 20px; border-radius: 12px; border: 1px solid #10b981;">
            <h3 style="color: #10b981; margin-bottom: 15px;">✅ Debt-Reducing Pattern</h3>
            <div style="font-family: monospace; background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <div style="color: #06ffa5;">git commit -m "fix: Close O🎯.Β🎨 gap</div>
              <div style="color: #06ffa5; margin-top: 5px;">Intent: 35%, Reality: 13%</div>
              <div style="color: #06ffa5; margin-top: 5px;">This adds visualization"</div>
            </div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
              <strong>Result:</strong> -8 units debt<br>
              <strong>Why:</strong> Directly addresses biggest gap<br>
              <strong>Multiplier:</strong> 2.5x velocity boost
            </div>
          </div>
          
          <!-- Pattern 2: Commit that increases debt -->
          <div style="background: rgba(239, 68, 68, 0.1); padding: 20px; border-radius: 12px; border: 1px solid #ef4444;">
            <h3 style="color: #ef4444; margin-bottom: 15px;">❌ Debt-Creating Pattern</h3>
            <div style="font-family: monospace; background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <div style="color: #ff6b6b;">git commit -m "feat: Add new feature</div>
              <div style="color: #ff6b6b; margin-top: 5px;">No alignment check</div>
              <div style="color: #ff6b6b; margin-top: 5px;">Docs not updated"</div>
            </div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
              <strong>Result:</strong> +5 units debt<br>
              <strong>Why:</strong> Reality diverges from intent<br>
              <strong>Penalty:</strong> 0.7x velocity penalty
            </div>
          </div>
          
          <!-- Pattern 3: Perfect alignment -->
          <div style="background: rgba(236, 72, 153, 0.1); padding: 20px; border-radius: 12px; border: 1px solid #ec4899;">
            <h3 style="color: #ec4899; margin-bottom: 15px;">🚀 Perfect Alignment</h3>
            <div style="font-family: monospace; background: #0f172a; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
              <div style="color: #ec4899;">1. Update CLAUDE.md</div>
              <div style="color: #ec4899; margin-top: 5px;">2. Implement feature</div>
              <div style="color: #ec4899; margin-top: 5px;">3. Commit with context</div>
            </div>
            <div style="color: #e2e8f0; font-size: 0.9rem;">
              <strong>Result:</strong> 0 units added<br>
              <strong>Why:</strong> Intent = Reality<br>
              <strong>Bonus:</strong> 10x leverage unlocked
            </div>
          </div>
        </div>
        
        <!-- The Magic Formula -->
        <div style="
          margin-top: 30px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 12px;
          text-align: center;
        ">
          <h3 style="color: #06ffa5; font-family: monospace; font-size: 1.5rem; margin-bottom: 15px;">
            The Reproducible Magic: Multiplicative Reality
          </h3>
          <div style="color: #e2e8f0; font-size: 1.1rem; line-height: 1.8;">
            <strong>Current System Effectiveness: ${effectiveness}%</strong><br>
            ${factors.map(f => `${f.title}: ${((f.realWeight || 0) * 100).toFixed(0)}%`).join(' × ')}<br>
            <span style="color: #ef4444;">Weakest link: ${gaps[0]?.title || 'Unknown'} (${(gaps[0]?.gap * 100).toFixed(0)}% gap)</span><br>
            <span style="color: #10b981;">Fix this ONE thing → ${(parseFloat(effectiveness) * 1.5).toFixed(0)}% effectiveness</span>
          </div>
        </div>
      </div>

      <!-- Two-Layer Forcing Function Dashboard -->
      <div style="
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), rgba(0, 0, 0, 0.8));
        border: 3px solid #fff;
        border-radius: 20px;
        padding: 40px;
        margin-bottom: 40px;
      ">
        <h2 style="color: #fff; font-size: 2.2rem; margin-bottom: 35px; text-align: center;">
          🎯 The Two-Layer Forcing Function
        </h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 30px;">
          <!-- Layer 1: Process Health -->
          <div style="
            background: ${processHealthValue < 1 ? 'rgba(239, 68, 68, 0.1)' : processHealthValue < 10 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(139, 92, 246, 0.1)'};
            padding: 25px;
            border-radius: 15px;
            border: 2px solid ${processHealthValue < 1 ? '#ef4444' : processHealthValue < 10 ? '#f59e0b' : '#8b5cf6'};
          ">
            <h3 style="color: ${processHealthValue < 1 ? '#ef4444' : processHealthValue < 10 ? '#f59e0b' : '#8b5cf6'}; font-size: 1.5rem; margin-bottom: 20px;">
              📊 Layer 1: Process Health
            </h3>
            <div style="font-size: 2.5rem; font-weight: bold; color: ${processHealthValue < 1 ? '#ef4444' : processHealthValue < 10 ? '#f59e0b' : '#8b5cf6'}; margin: 15px 0;">
              ${processHealthValue.toFixed(2)}%
            </div>
            <div style="color: #e2e8f0; margin-bottom: 15px;">
              ${data.processHealth?.formula || 'Measurement × Visualization × Enforcement'}
            </div>
            <div style="
              padding: 15px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 8px;
              color: ${processHealthValue < 1 ? '#ef4444' : processHealthValue < 10 ? '#f59e0b' : '#10b981'};
              font-weight: bold;
            ">
              ${processHealthValue < 1 ? '❌ Process FAILING' : processHealthValue < 10 ? '⚠️ Process struggling' : '✅ Building things RIGHT'}
            </div>
            <div style="margin-top: 15px; color: #94a3b8; font-size: 0.9rem;">
              Code matches documentation<br>
              Changes are visible<br>
              Rules are enforced
            </div>
          </div>
          
          <!-- Layer 2: Outcome Reality -->
          <div style="
            background: ${outcomeRealityValue < 0.001 ? 'rgba(239, 68, 68, 0.1)' : outcomeRealityValue < 1 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(16, 185, 129, 0.1)'};
            padding: 25px;
            border-radius: 15px;
            border: 2px solid ${outcomeRealityValue < 0.001 ? '#ef4444' : outcomeRealityValue < 1 ? '#f59e0b' : '#10b981'};
          ">
            <h3 style="color: ${outcomeRealityValue < 0.001 ? '#ef4444' : outcomeRealityValue < 1 ? '#f59e0b' : '#10b981'}; font-size: 1.5rem; margin-bottom: 20px;">
              🎯 Layer 2: Outcome Reality
            </h3>
            <div style="font-size: 2.5rem; font-weight: bold; color: ${outcomeRealityValue < 0.001 ? '#ef4444' : outcomeRealityValue < 1 ? '#f59e0b' : '#10b981'}; margin: 15px 0;">
              ${outcomeRealityValue < 0.001 ? '~0%' : outcomeRealityValue.toFixed(6) + '%'}
            </div>
            <div style="color: #e2e8f0; margin-bottom: 15px;">
              ${data.outcomeReality?.formula || 'User × Strategic × Ethical'}
            </div>
            <div style="
              padding: 15px;
              background: rgba(0, 0, 0, 0.3);
              border-radius: 8px;
              color: #ef4444;
              font-weight: bold;
            ">
              ❌ Building the WRONG things
            </div>
            <div style="margin-top: 15px; color: #94a3b8; font-size: 0.9rem;">
              ${(data.outcomeReality?.user || 0.226).toFixed(1)}% user success<br>
              ${(data.outcomeReality?.strategic || 0.003).toFixed(1)}% strategic value<br>
              ${(data.outcomeReality?.ethical || 100).toFixed(0)}% compliance
            </div>
          </div>
        </div>
        
        <!-- Combined Overall Success -->
        <div style="
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(0, 0, 0, 0.8));
          padding: 30px;
          border-radius: 15px;
          text-align: center;
          border: 2px solid #ef4444;
        ">
          <h3 style="color: #fff; font-size: 1.8rem; margin-bottom: 15px;">
            ⚡ Overall Success = Process × Outcome
          </h3>
          <div style="font-size: 3rem; font-weight: 900; color: #ef4444; margin: 20px 0;">
            ${overallSuccess < 0.00001 ? '~0%' : overallSuccess.toFixed(8) + '%'}
          </div>
          <div style="color: #f59e0b; font-size: 1.3rem; font-weight: bold; margin-bottom: 15px;">
            ${processHealthValue < 1 && outcomeRealityValue < 0.001 ? 
              '💀 "Total system failure"' :
              processHealthValue > 10 && outcomeRealityValue < 0.001 ? 
              '💀 "Perfect process creating worthless outcomes"' :
              processHealthValue < 1 && outcomeRealityValue > 0.001 ?
              '🔧 "Can\'t build anything well"' :
              '⚠️ "Multiple system failures"'}
          </div>
          <div style="color: #e2e8f0; font-size: 1.1rem; line-height: 1.8;">
            ${processHealthValue < 1 ? 
              `Process health at ${processHealthValue.toFixed(2)}% (CRITICAL)<br>` :
              `We're building things RIGHT (${processHealthValue.toFixed(2)}% process health)<br>`}
            ${outcomeRealityValue < 0.001 ?
              `Building the WRONG things (${(outcomeRealityValue * 100).toFixed(6)}% outcome value)<br>` :
              `Outcome reality at ${(outcomeRealityValue * 100).toFixed(6)}%<br>`}
            <span style="color: #ef4444; font-weight: bold;">
              ${overallSuccess < 0.00001 ? 'System is effectively non-functional' : 'Major improvements needed'}
            </span>
          </div>
        </div>
        
        <!-- Critical Actions to Fix Outcome Layer -->
        <div style="
          margin-top: 30px;
          padding: 25px;
          background: rgba(245, 158, 11, 0.1);
          border-radius: 12px;
          border: 2px solid #f59e0b;
        ">
          <h4 style="color: #f59e0b; font-size: 1.4rem; margin-bottom: 20px;">
            🚨 Fix Outcome Layer FIRST (Zero Multiplier)
          </h4>
          <div style="display: grid; gap: 15px;">
            <div style="padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border-left: 4px solid #ef4444;">
              <strong style="color: #ef4444;">1. Ethical Integrity (0% - CRITICAL)</strong>
              <div style="color: #e2e8f0; margin-top: 5px;">
                Implement AI Act compliance checks immediately<br>
                Add bias detection and explainability coverage<br>
                <span style="color: #f59e0b;">Liability: Uninsurable, €35M exposure</span>
              </div>
            </div>
            <div style="padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border-left: 4px solid #f59e0b;">
              <strong style="color: #f59e0b;">2. Strategic Fit (0.003% - URGENT)</strong>
              <div style="color: #e2e8f0; margin-top: 5px;">
                Implement Stripe payment flow ($0 revenue)<br>
                Complete FIM patent implementation (30% done)<br>
                Add viral mechanics to every interaction
              </div>
            </div>
            <div style="padding: 15px; background: rgba(0, 0, 0, 0.3); border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <strong style="color: #8b5cf6;">3. User Value (0.3% - IMPORTANT)</strong>
              <div style="color: #e2e8f0; margin-top: 5px;">
                Fix 62.3% who never engage (onboarding)<br>
                Make Un-Robocall discoverable (8% adoption)<br>
                Track oh moment creation explicitly
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Forcing Functions -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 40px;">
        <!-- Carrots -->
        <div style="
          background: rgba(16, 185, 129, 0.1);
          padding: 30px;
          border-radius: 15px;
          border: 2px solid #10b981;
        ">
          <h3 style="color: #10b981; font-size: 1.8rem; margin-bottom: 25px;">
            🥕 Active Carrots (Rewards)
          </h3>
          ${trustDebtScore < 20 ? `
            <div style="display: grid; gap: 15px;">
              <div style="background: rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #10b981;">✨ Fast Commit Mode</div>
                <div style="color: #e2e8f0; margin-top: 5px;">No pre-commit checks needed</div>
              </div>
              <div style="background: rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #10b981;">🚀 ${Math.floor(20 - trustDebtScore)}x Velocity Multiplier</div>
                <div style="color: #e2e8f0; margin-top: 5px;">Each commit has exponential impact</div>
              </div>
              <div style="background: rgba(16, 185, 129, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #10b981;">🏆 Trust Badge Active</div>
                <div style="color: #e2e8f0; margin-top: 5px;">Your promises match your code</div>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 40px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
              <div style="color: #64748b; font-size: 1.2rem; margin-bottom: 15px;">
                Rewards disabled at ${trustDebtScore} units
              </div>
              <div style="color: #10b981; font-weight: bold; font-size: 1.1rem;">
                Reduce to <20 units to activate
              </div>
              ${gaps[0] ? `
              <div style="margin-top: 15px; padding: 10px; background: rgba(16, 185, 129, 0.2); border-radius: 6px;">
                <strong>Quick win:</strong> Fix "${gaps[0].title || 'highest priority'}" for -${Math.floor((gaps[0].gap || 0) * 30)} units
              </div>
              ` : `
              <div style="margin-top: 15px; padding: 10px; background: rgba(16, 185, 129, 0.2); border-radius: 6px;">
                <strong>Quick win:</strong> Improve measurement accuracy for immediate impact
              </div>
              `}
            </div>
          `}
        </div>

        <!-- Sticks -->
        <div style="
          background: rgba(239, 68, 68, 0.1);
          padding: 30px;
          border-radius: 15px;
          border: 2px solid #ef4444;
        ">
          <h3 style="color: #ef4444; font-size: 1.8rem; margin-bottom: 25px;">
            🔨 Active Sticks (Penalties)
          </h3>
          ${trustDebtScore >= 50 ? `
            <div style="display: grid; gap: 15px;">
              <div style="background: rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #ef4444;">⛔ Commits Blocked</div>
                <div style="color: #e2e8f0; margin-top: 5px;">git push will fail until debt < 50</div>
              </div>
              <div style="background: rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #ef4444;">📝 Justification Required</div>
                <div style="color: #e2e8f0; margin-top: 5px;">Must explain every change</div>
              </div>
              <div style="background: rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #ef4444;">🐌 0.1x Velocity</div>
                <div style="color: #e2e8f0; margin-top: 5px;">10x slower until aligned</div>
              </div>
            </div>
          ` : trustDebtScore >= 40 ? `
            <div style="display: grid; gap: 15px;">
              <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #f59e0b;">⚠️ Review Warnings</div>
                <div style="color: #e2e8f0; margin-top: 5px;">Each commit shows drift alert</div>
              </div>
              <div style="background: rgba(245, 158, 11, 0.2); padding: 15px; border-radius: 8px;">
                <div style="font-weight: bold; color: #f59e0b;">⏱️ ${Math.floor((trustDebtScore - 20) * 3)}% Slower</div>
                <div style="color: #e2e8f0; margin-top: 5px;">Drift creates friction</div>
              </div>
            </div>
          ` : `
            <div style="text-align: center; padding: 40px; background: rgba(0, 0, 0, 0.3); border-radius: 8px;">
              <div style="color: #10b981; font-size: 1.5rem; margin-bottom: 10px;">
                🎉 No penalties!
              </div>
              <div style="color: #e2e8f0;">
                You're in the green zone.<br>
                Keep it below 20 for maximum velocity.
              </div>
            </div>
          `}
        </div>
      </div>

      <!-- Immediate Actions -->
      <div style="
        background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(0, 0, 0, 0.5));
        padding: 30px;
        border-radius: 15px;
        border: 2px solid #f59e0b;
      ">
        <h3 style="color: #f59e0b; font-size: 1.8rem; margin-bottom: 25px;">
          ⚡ Immediate Actions (Sorted by Impact)
        </h3>
        
        <div style="display: grid; gap: 20px;">
          ${gaps.slice(0, 3).map((item, index) => `
            <div style="
              padding: 20px;
              background: rgba(0, 0, 0, 0.4);
              border-radius: 10px;
              border-left: 5px solid ${index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#8b5cf6'};
              display: flex;
              justify-content: space-between;
              align-items: center;
            ">
              <div>
                <div style="font-size: 1.2rem; font-weight: bold; color: #e2e8f0; margin-bottom: 8px;">
                  ${index + 1}. Fix ${item.title} (${item.path})
                </div>
                <div style="color: #94a3b8;">
                  Current gap: ${(item.gap * 100).toFixed(0)}% • 
                  Impact: -${Math.floor(item.gap * item.weight * 0.8)} units • 
                  Time: ~${Math.ceil(item.gap * 60)} minutes
                </div>
              </div>
              <div style="
                padding: 10px 20px;
                background: ${index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#8b5cf6'};
                color: white;
                border-radius: 8px;
                font-weight: bold;
                font-size: 1.1rem;
              ">
                ${index === 0 ? 'DO THIS FIRST' : index === 1 ? 'THEN THIS' : 'NICE TO HAVE'}
              </div>
            </div>
          `).join('')}
        </div>
        
        <div style="
          margin-top: 25px;
          padding: 20px;
          background: rgba(16, 185, 129, 0.1);
          border-radius: 10px;
          text-align: center;
        ">
          <div style="color: #10b981; font-size: 1.3rem; font-weight: bold;">
            🎯 Completing action #1 will:
          </div>
          <div style="color: #e2e8f0; font-size: 1.1rem; margin-top: 10px;">
            • Reduce Trust Debt by ~${Math.floor(gaps[0]?.gap * gaps[0]?.weight * 0.8 || 5)} units<br>
            • Increase effectiveness from ${effectiveness}% to ${(parseFloat(effectiveness) * 1.5).toFixed(0)}%<br>
            • Unlock ${trustDebtScore > 20 ? 'carrot rewards' : 'faster commits'}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Export for use in main generator
module.exports = { generateEnhancedSection };

// Also create standalone test
if (require.main === module) {
  const testData = {
    trustDebt: { score: 24, trend: 'improving' },
    shortlexAxis: [
      { depth: 1, title: 'Measurement', path: 'O🎯.Α📏', idealWeight: 0.33, realWeight: 0.36, weight: 40 },
      { depth: 1, title: 'Visualization', path: 'O🎯.Β🎨', idealWeight: 0.33, realWeight: 0.13, weight: 35 },
      { depth: 1, title: 'Enforcement', path: 'O🎯.Γ⚖️', idealWeight: 0.33, realWeight: 0.51, weight: 25 }
    ]
  };
  
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Trust Debt Enhanced View</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, sans-serif;
            background: #0f0f23;
            color: #e2e8f0;
        }
    </style>
</head>
<body>
    ${generateEnhancedSection(testData)}
</body>
</html>`;
  
  fs.writeFileSync('trust-debt-enhanced-test.html', html);
  console.log('✅ Enhanced HTML test generated');
}