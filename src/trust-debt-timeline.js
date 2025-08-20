#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TrustDebtTimeline {
    constructor() {
        this.categories = [
            { id: 'A🚀', name: 'Performance', color: '#00ff88' },
            { id: 'B🔒', name: 'Security', color: '#00aaff' },
            { id: 'C⚡', name: 'Speed', color: '#ffaa00' },
            { id: 'D🧠', name: 'Intelligence', color: '#ff00aa' },
            { id: 'E🎨', name: 'Visual', color: '#ff0044' }
        ];
        
        this.keywords = {
            'A🚀': ['performance', 'optimize', 'optimization', 'efficient', 'efficiency', 'cache', 'caching', 'fast'],
            'B🔒': ['security', 'defense', 'guard', 'shield', 'protect', 'authenticate', 'monitor'],
            'C⚡': ['speed', 'fast', 'quick', 'rapid', 'instant', 'realtime', 'immediate', 'latency'],
            'D🧠': ['intelligence', 'pattern', 'analyze', 'identify', 'recognize', 'drift', 'gap', 'semantic'],
            'E🎨': ['visual', 'interface', 'ui', 'ux', 'design', 'aesthetic', 'frontend', 'animation']
        };
        
        this.timelineData = [];
    }
    
    analyzeCommit(message, date) {
        const scores = {};
        const lowerMessage = message.toLowerCase();
        
        for (const [catId, keywords] of Object.entries(this.keywords)) {
            let score = 0;
            for (const keyword of keywords) {
                if (lowerMessage.includes(keyword)) {
                    score += 1;
                }
            }
            scores[catId] = Math.min(score / keywords.length, 1.0);
        }
        
        return scores;
    }
    
    analyzeDocumentationAtTime(commitHash) {
        const docFiles = [
            'CLAUDE.md',
            'docs/01-business/THETACOACH_BUSINESS_PLAN.md',
            'docs/03-product/MVP/UNIFIED_DRIFT_MVP_SPEC.md',
            'README.md'
        ];
        
        const scores = {};
        for (const catId of Object.keys(this.keywords)) {
            scores[catId] = 0;
        }
        
        for (const file of docFiles) {
            try {
                // Get file content at specific commit
                const content = execSync(`git show ${commitHash}:${file} 2>/dev/null`, {
                    encoding: 'utf8',
                    stdio: ['pipe', 'pipe', 'pipe']
                }).toString();
                
                const lowerContent = content.toLowerCase();
                for (const [catId, keywords] of Object.entries(this.keywords)) {
                    let score = 0;
                    for (const keyword of keywords) {
                        const matches = (lowerContent.match(new RegExp(keyword, 'g')) || []).length;
                        score += matches;
                    }
                    scores[catId] += Math.min(score / (keywords.length * 10), 1.0);
                }
            } catch (e) {
                // File doesn't exist at this commit
            }
        }
        
        return scores;
    }
    
    buildTimeline() {
        console.log('📊 Building Trust Debt timeline...');
        
        // Get all commits with their timestamps
        const gitLog = execSync('git log --format="%H|%at|%s" --reverse', { encoding: 'utf8' });
        const commits = gitLog.trim().split('\n').filter(line => line);
        
        console.log(`  Found ${commits.length} commits`);
        
        // Process each commit
        commits.forEach((line, index) => {
            const [hash, timestamp, message] = line.split('|');
            const date = new Date(parseInt(timestamp) * 1000);
            
            // Skip merge commits
            if (message.startsWith('Merge')) return;
            
            // Analyze code reality (commit message)
            const realityScores = this.analyzeCommit(message, date);
            
            // Analyze documentation intent
            const intentScores = this.analyzeDocumentationAtTime(hash);
            
            // Calculate Trust Debt per category
            const trustDebt = {};
            let totalDebt = 0;
            
            for (const cat of this.categories) {
                const intent = intentScores[cat.id] || 0;
                const reality = realityScores[cat.id] || 0;
                const debt = Math.abs(intent - reality) * 100;
                trustDebt[cat.id] = debt;
                totalDebt += debt;
            }
            
            this.timelineData.push({
                hash: hash.substring(0, 7),
                date: date.toISOString(),
                timestamp: parseInt(timestamp),
                message: message.substring(0, 50),
                trustDebt,
                totalDebt,
                index
            });
            
            if (index % 10 === 0) {
                process.stdout.write(`\r  Processing: ${Math.round((index / commits.length) * 100)}%`);
            }
        });
        
        console.log('\r  Processing: 100%');
        console.log(`  Generated ${this.timelineData.length} data points`);
    }
    
    generateHTML() {
        console.log('📈 Generating timeline visualization...');
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Trust Debt Timeline - IntentGuard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            overflow: hidden;
        }
        
        #container {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        #header {
            padding: 20px;
            background: rgba(0, 0, 0, 0.8);
            border-bottom: 1px solid #333;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        h1 {
            font-size: 24px;
            font-weight: 600;
            background: linear-gradient(135deg, #00ff88, #00aaff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        #stats {
            display: flex;
            gap: 30px;
            font-size: 14px;
        }
        
        .stat {
            opacity: 0.8;
        }
        
        .stat strong {
            color: #00ff88;
        }
        
        #chart-container {
            flex: 1;
            position: relative;
            padding: 20px;
        }
        
        #chart {
            width: 100%;
            height: 100%;
        }
        
        .legend {
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 1px solid #333;
            border-radius: 8px;
            padding: 15px;
            font-size: 12px;
        }
        
        .legend-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .legend-color {
            width: 20px;
            height: 3px;
            margin-right: 10px;
            border-radius: 2px;
        }
        
        .tooltip {
            position: absolute;
            background: rgba(0, 0, 0, 0.95);
            border: 1px solid #333;
            border-radius: 6px;
            padding: 10px;
            pointer-events: none;
            display: none;
            font-size: 12px;
            z-index: 1000;
        }
        
        .tooltip-date {
            color: #666;
            margin-bottom: 5px;
        }
        
        .tooltip-value {
            color: #00ff88;
            font-weight: 600;
        }
    </style>
</head>
<body>
    <div id="container">
        <div id="header">
            <h1>Trust Debt Timeline</h1>
            <div id="stats">
                <div class="stat">Commits: <strong id="commit-count">0</strong></div>
                <div class="stat">Time Span: <strong id="time-span">-</strong></div>
                <div class="stat">Peak Debt: <strong id="peak-debt">0</strong></div>
                <div class="stat">Current Debt: <strong id="current-debt">0</strong></div>
            </div>
        </div>
        
        <div id="chart-container">
            <canvas id="chart"></canvas>
            <div class="legend">
                ${this.categories.map(cat => `
                    <div class="legend-item">
                        <div class="legend-color" style="background: ${cat.color}"></div>
                        <span>${cat.name}</span>
                    </div>
                `).join('')}
            </div>
            <div class="tooltip" id="tooltip">
                <div class="tooltip-date" id="tooltip-date"></div>
                <div class="tooltip-value" id="tooltip-value"></div>
            </div>
        </div>
    </div>
    
    <script>
        const data = ${JSON.stringify(this.timelineData)};
        const categories = ${JSON.stringify(this.categories)};
        
        const canvas = document.getElementById('chart');
        const ctx = canvas.getContext('2d');
        const tooltip = document.getElementById('tooltip');
        
        // Set canvas size
        function resizeCanvas() {
            const container = document.getElementById('chart-container');
            canvas.width = container.clientWidth - 40;
            canvas.height = container.clientHeight - 40;
            draw();
        }
        
        window.addEventListener('resize', resizeCanvas);
        
        // Update stats
        document.getElementById('commit-count').textContent = data.length;
        if (data.length > 0) {
            const firstDate = new Date(data[0].date);
            const lastDate = new Date(data[data.length - 1].date);
            const days = Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24));
            document.getElementById('time-span').textContent = days + ' days';
            
            const maxDebt = Math.max(...data.map(d => d.totalDebt));
            document.getElementById('peak-debt').textContent = Math.round(maxDebt);
            document.getElementById('current-debt').textContent = Math.round(data[data.length - 1].totalDebt);
        }
        
        function draw() {
            if (data.length === 0) return;
            
            const width = canvas.width;
            const height = canvas.height;
            const padding = { top: 40, right: 40, bottom: 60, left: 60 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;
            
            // Clear canvas
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, width, height);
            
            // Find max values
            const maxDebt = Math.max(...data.flatMap(d => 
                categories.map(cat => d.trustDebt[cat.id] || 0)
            ));
            
            // Draw grid
            ctx.strokeStyle = '#222';
            ctx.lineWidth = 1;
            
            // Horizontal grid lines
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (chartHeight * i / 5);
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
                
                // Y-axis labels
                ctx.fillStyle = '#666';
                ctx.font = '11px monospace';
                ctx.textAlign = 'right';
                const value = Math.round(maxDebt * (1 - i / 5));
                ctx.fillText(value, padding.left - 10, y + 4);
            }
            
            // Draw axes
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top);
            ctx.lineTo(padding.left, height - padding.bottom);
            ctx.lineTo(width - padding.right, height - padding.bottom);
            ctx.stroke();
            
            // Draw lines for each category
            categories.forEach(cat => {
                ctx.strokeStyle = cat.color;
                ctx.lineWidth = 2;
                ctx.globalAlpha = 0.8;
                
                ctx.beginPath();
                data.forEach((point, i) => {
                    const x = padding.left + (i / (data.length - 1)) * chartWidth;
                    const y = padding.top + chartHeight * (1 - (point.trustDebt[cat.id] || 0) / maxDebt);
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                });
                ctx.stroke();
                
                // Fill area under line
                ctx.globalAlpha = 0.1;
                ctx.fillStyle = cat.color;
                ctx.lineTo(padding.left + chartWidth, height - padding.bottom);
                ctx.lineTo(padding.left, height - padding.bottom);
                ctx.closePath();
                ctx.fill();
                ctx.globalAlpha = 1;
            });
            
            // Draw x-axis labels (dates)
            ctx.fillStyle = '#666';
            ctx.font = '10px monospace';
            ctx.textAlign = 'center';
            
            const labelCount = Math.min(10, data.length);
            const step = Math.floor(data.length / labelCount);
            
            for (let i = 0; i < data.length; i += step) {
                const x = padding.left + (i / (data.length - 1)) * chartWidth;
                const date = new Date(data[i].date);
                const label = (date.getMonth() + 1) + '/' + date.getDate();
                ctx.fillText(label, x, height - padding.bottom + 20);
            }
            
            // Title
            ctx.fillStyle = '#888';
            ctx.font = '12px monospace';
            ctx.textAlign = 'left';
            ctx.fillText('Trust Debt per Category Over Time', padding.left, 20);
        }
        
        // Mouse interaction
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const padding = { left: 60, right: 40 };
            const chartWidth = canvas.width - padding.left - padding.right;
            
            if (x >= padding.left && x <= canvas.width - padding.right) {
                const dataIndex = Math.round(((x - padding.left) / chartWidth) * (data.length - 1));
                const point = data[Math.min(dataIndex, data.length - 1)];
                
                if (point) {
                    const date = new Date(point.date);
                    tooltip.style.display = 'block';
                    tooltip.style.left = e.clientX + 10 + 'px';
                    tooltip.style.top = e.clientY - 30 + 'px';
                    
                    document.getElementById('tooltip-date').textContent = 
                        date.toLocaleDateString() + ' - ' + point.message;
                    
                    const debtInfo = categories.map(cat => 
                        cat.name + ': ' + Math.round(point.trustDebt[cat.id] || 0)
                    ).join(', ');
                    
                    document.getElementById('tooltip-value').textContent = 
                        'Total: ' + Math.round(point.totalDebt) + ' | ' + debtInfo;
                }
            } else {
                tooltip.style.display = 'none';
            }
        });
        
        canvas.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
        
        // Initial draw
        resizeCanvas();
    </script>
</body>
</html>`;
        
        const outputPath = path.join(process.cwd(), 'trust-debt-timeline.html');
        fs.writeFileSync(outputPath, html);
        console.log(`  ✓ Generated ${outputPath}`);
        
        return outputPath;
    }
    
    run() {
        console.log('🚀 IntentGuard Timeline Analysis\n');
        
        this.buildTimeline();
        const outputPath = this.generateHTML();
        
        console.log('\n✅ Timeline analysis complete!');
        console.log(`   View: open ${outputPath}`);
        
        // Save data as JSON for further analysis
        const jsonPath = path.join(process.cwd(), 'trust-debt-timeline.json');
        fs.writeFileSync(jsonPath, JSON.stringify(this.timelineData, null, 2));
        console.log(`   Data: ${jsonPath}`);
    }
}

// Run if called directly
if (require.main === module) {
    const analyzer = new TrustDebtTimeline();
    analyzer.run();
}

module.exports = TrustDebtTimeline;