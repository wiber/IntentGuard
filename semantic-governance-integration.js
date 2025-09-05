#!/usr/bin/env node

/**
 * IntentGuard Semantic Governance Integration
 * Coordinates Claude-Flow agents with SQL/JSON bucket management
 * Maps Trust Debt pipeline into broader semantic ecosystem
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SemanticGovernanceManager {
    constructor(dbPath = './semantic-governance.db') {
        this.dbPath = dbPath;
        this.db = null;
        this.categories = new Map();
        this.agents = new Map();
        this.buckets = new Map();
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(new Error(`Failed to open database: ${err.message}`));
                } else {
                    console.log('✅ Semantic governance database connected');
                    resolve();
                }
            });
        });
    }

    async loadCategories() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT id, category_code, category_name, emoji, parent_id, 
                       depth_level, shortlex_position, trust_debt_units, percentage_of_total
                FROM semantic_categories 
                ORDER BY shortlex_position
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    rows.forEach(row => {
                        this.categories.set(row.category_code, row);
                    });
                    console.log(`📊 Loaded ${rows.length} semantic categories`);
                    resolve(rows);
                }
            });
        });
    }

    async loadAgents() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT a.*, c.category_code, c.category_name
                FROM agents a
                JOIN semantic_categories c ON a.category_id = c.id
                ORDER BY c.shortlex_position, a.agent_name
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    rows.forEach(row => {
                        this.agents.set(row.agent_id, row);
                    });
                    console.log(`🤖 Loaded ${rows.length} registered agents`);
                    resolve(rows);
                }
            });
        });
    }

    async loadJsonBuckets() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT b.*, c.category_code, c.category_name
                FROM json_buckets b
                JOIN semantic_categories c ON b.category_id = c.id
                ORDER BY c.shortlex_position, b.bucket_name
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    rows.forEach(row => {
                        this.buckets.set(row.bucket_name, row);
                    });
                    console.log(`📦 Loaded ${rows.length} JSON buckets`);
                    resolve(rows);
                }
            });
        });
    }

    async validateBucketIntegrity() {
        const results = {
            valid: [],
            invalid: [],
            missing: []
        };

        for (const [bucketName, bucket] of this.buckets) {
            try {
                const stats = await fs.stat(bucket.file_path);
                const content = await fs.readFile(bucket.file_path, 'utf8');
                
                // Calculate checksum
                const hash = crypto.createHash('sha256');
                hash.update(content);
                const checksum = hash.digest('hex').substring(0, 16);
                
                // Validate JSON
                const data = JSON.parse(content);
                
                // Update database with current stats
                await this.updateBucketStats(bucketName, {
                    size_bytes: stats.size,
                    validation_checksum: checksum,
                    record_count: Array.isArray(data) ? data.length : Object.keys(data).length
                });

                results.valid.push({
                    bucket: bucketName,
                    category: bucket.category_code,
                    size: stats.size,
                    checksum: checksum,
                    records: Array.isArray(data) ? data.length : Object.keys(data).length
                });

            } catch (error) {
                if (error.code === 'ENOENT') {
                    results.missing.push({
                        bucket: bucketName,
                        category: bucket.category_code,
                        path: bucket.file_path,
                        error: 'File not found'
                    });
                } else {
                    results.invalid.push({
                        bucket: bucketName,
                        category: bucket.category_code,
                        path: bucket.file_path,
                        error: error.message
                    });
                }
            }
        }

        return results;
    }

    async updateBucketStats(bucketName, stats) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE json_buckets 
                SET size_bytes = ?, validation_checksum = ?, record_count = ?, last_modified = CURRENT_TIMESTAMP
                WHERE bucket_name = ?
            `;
            
            this.db.run(query, [stats.size_bytes, stats.validation_checksum, stats.record_count, bucketName], (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async orchestrateTrustDebtPipeline() {
        console.log('🚀 Orchestrating Trust Debt Pipeline within A🛡️.1📊 category...');
        
        const trustDebtAgents = [
            'trust-debt-0', 'trust-debt-1', 'trust-debt-2', 'trust-debt-3',
            'trust-debt-4', 'trust-debt-5', 'trust-debt-6', 'trust-debt-7'
        ];

        const pipelineExecution = {
            category: 'A🛡️.1📊',
            strategy: 'sequential',
            agents: trustDebtAgents,
            buckets: [
                '0-outcome-requirements.json',
                '1-indexed-keywords.json', 
                '2-categories-balanced.json',
                '3-presence-matrix.json',
                '4-grades-statistics.json',
                '5-timeline-history.json',
                '6-analysis-narratives.json',
                'trust-debt-report.html'
            ],
            started_at: new Date().toISOString()
        };

        // Record the orchestration in database
        await this.recordOrchestration('trust-debt-pipeline', pipelineExecution);

        return pipelineExecution;
    }

    async recordOrchestration(taskName, execution) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO orchestrated_tasks 
                (task_id, task_name, description, strategy, status, assigned_agents, category_scope, started_at, output_buckets)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const taskId = `semantic-${Date.now()}`;
            const values = [
                taskId,
                taskName,
                `Orchestrated ${execution.category} category execution`,
                execution.strategy,
                'running',
                JSON.stringify(execution.agents),
                JSON.stringify([execution.category]),
                execution.started_at,
                JSON.stringify(execution.buckets)
            ];
            
            this.db.run(query, values, (err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log(`📝 Recorded orchestration: ${taskId}`);
                    resolve(taskId);
                }
            });
        });
    }

    async generateSemanticReport() {
        const categories = await this.loadCategories();
        const agents = await this.loadAgents();
        const buckets = await this.loadJsonBuckets();
        const validation = await this.validateBucketIntegrity();

        const report = {
            metadata: {
                generated_at: new Date().toISOString(),
                schema_version: '1.0',
                total_categories: categories.length,
                total_agents: agents.length,
                total_buckets: buckets.length
            },
            categories: {
                'A🛡️': {
                    name: 'Security & Trust Governance',
                    agents: agents.filter(a => a.category_code.startsWith('A🛡️')),
                    buckets: buckets.filter(b => b.category_code.startsWith('A🛡️')),
                    focus: 'Trust Debt Pipeline (Agents 0-7)'
                },
                'B⚡': {
                    name: 'Performance & Optimization', 
                    agents: agents.filter(a => a.category_code.startsWith('B⚡')),
                    buckets: buckets.filter(b => b.category_code.startsWith('B⚡')),
                    focus: 'Runtime, Database, Algorithm efficiency'
                },
                'C🎨': {
                    name: 'User Experience & Interfaces',
                    agents: agents.filter(a => a.category_code.startsWith('C🎨')),
                    buckets: buckets.filter(b => b.category_code.startsWith('C🎨')),
                    focus: 'Visual design, CLI, Documentation UX'
                },
                'D🔧': {
                    name: 'Development & Integration',
                    agents: agents.filter(a => a.category_code.startsWith('D🔧')),
                    buckets: buckets.filter(b => b.category_code.startsWith('D🔧')),
                    focus: 'Code quality, CI/CD, Testing'
                },
                'E💼': {
                    name: 'Business & Strategy',
                    agents: agents.filter(a => a.category_code.startsWith('E💼')),
                    buckets: buckets.filter(b => b.category_code.startsWith('E💼')),
                    focus: 'Market analysis, Product strategy, Revenue'
                }
            },
            validation: validation,
            orchestration: {
                trust_debt_pipeline_ready: validation.valid.length >= 8,
                cross_category_dependencies: await this.getCrossCategoryDependencies(),
                next_actions: this.recommendNextActions(validation)
            }
        };

        // Save report to file
        const reportPath = './semantic-governance-report.json';
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`📄 Semantic governance report saved: ${reportPath}`);

        return report;
    }

    async getCrossCategoryDependencies() {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT s.category_code as source, t.category_code as target,
                       d.dependency_type, d.strength_score, d.description
                FROM cross_category_dependencies d
                JOIN semantic_categories s ON d.source_category_id = s.id
                JOIN semantic_categories t ON d.target_category_id = t.id
                ORDER BY d.strength_score DESC
            `;
            
            this.db.all(query, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    recommendNextActions(validation) {
        const actions = [];

        if (validation.missing.length > 0) {
            actions.push({
                priority: 'high',
                action: 'create_missing_buckets',
                description: `Create ${validation.missing.length} missing JSON buckets`,
                buckets: validation.missing.map(m => m.bucket)
            });
        }

        if (validation.invalid.length > 0) {
            actions.push({
                priority: 'medium',
                action: 'fix_invalid_buckets',
                description: `Fix ${validation.invalid.length} invalid JSON buckets`,
                buckets: validation.invalid.map(i => i.bucket)
            });
        }

        if (validation.valid.length >= 8) {
            actions.push({
                priority: 'medium',
                action: 'execute_trust_debt_pipeline',
                description: 'Trust Debt pipeline ready for execution',
                command: 'intentguard pipeline'
            });
        }

        actions.push({
            priority: 'low',
            action: 'expand_semantic_categories',
            description: 'Add agents for B⚡, C🎨, D🔧, E💼 categories',
            categories: ['B⚡', 'C🎨', 'D🔧', 'E💼']
        });

        return actions;
    }

    async close() {
        if (this.db) {
            return new Promise((resolve) => {
                this.db.close((err) => {
                    if (err) {
                        console.error('Error closing database:', err);
                    } else {
                        console.log('🔒 Database connection closed');
                    }
                    resolve();
                });
            });
        }
    }
}

// CLI Interface
async function main() {
    const manager = new SemanticGovernanceManager();
    
    try {
        await manager.initialize();
        
        const command = process.argv[2] || 'report';
        
        switch (command) {
            case 'validate':
                console.log('🔍 Validating JSON bucket integrity...');
                const validation = await manager.validateBucketIntegrity();
                console.log('\n📊 Validation Results:');
                console.log(`✅ Valid: ${validation.valid.length}`);
                console.log(`❌ Invalid: ${validation.invalid.length}`);
                console.log(`❓ Missing: ${validation.missing.length}`);
                if (validation.invalid.length > 0) {
                    console.log('\n⚠️  Invalid buckets:', validation.invalid);
                }
                if (validation.missing.length > 0) {
                    console.log('\n🚨 Missing buckets:', validation.missing);
                }
                break;

            case 'orchestrate':
                console.log('🎭 Orchestrating Trust Debt Pipeline...');
                const execution = await manager.orchestrateTrustDebtPipeline();
                console.log('✅ Pipeline orchestration initiated:', execution);
                break;

            case 'report':
            default:
                console.log('📈 Generating comprehensive semantic governance report...');
                const report = await manager.generateSemanticReport();
                console.log('\n🎯 Semantic Governance Status:');
                console.log(`📊 Categories: ${report.metadata.total_categories}`);
                console.log(`🤖 Agents: ${report.metadata.total_agents}`);
                console.log(`📦 Buckets: ${report.metadata.total_buckets}`);
                console.log(`✅ Valid buckets: ${report.validation.valid.length}`);
                console.log(`❌ Issues: ${report.validation.invalid.length + report.validation.missing.length}`);
                
                if (report.orchestration.next_actions.length > 0) {
                    console.log('\n🎯 Recommended Actions:');
                    report.orchestration.next_actions.forEach((action, index) => {
                        console.log(`${index + 1}. [${action.priority.toUpperCase()}] ${action.description}`);
                    });
                }
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await manager.close();
    }
}

// Export for integration with other modules
module.exports = { SemanticGovernanceManager };

// Run as CLI if called directly
if (require.main === module) {
    main().catch(console.error);
}

/**
 * Usage Examples:
 * 
 * node semantic-governance-integration.js report     # Generate full report
 * node semantic-governance-integration.js validate  # Validate JSON buckets
 * node semantic-governance-integration.js orchestrate # Start Trust Debt pipeline
 * 
 * Integration with claude-flow:
 * ./claude-flow task orchestrate --task "$(node semantic-governance-integration.js orchestrate)" --strategy adaptive
 */