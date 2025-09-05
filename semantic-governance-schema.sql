-- IntentGuard Semantic Governance Database Schema
-- Purpose: Coordinate multiple agent swarms across 5 semantic categories
-- Integration: Claude-Flow orchestration with SQL/JSON bucket management

-- ============================================================================
-- SEMANTIC CATEGORY STRUCTURE
-- ============================================================================

CREATE TABLE semantic_categories (
    id INTEGER PRIMARY KEY,
    category_code TEXT NOT NULL UNIQUE,  -- A🛡️, B⚡, C🎨, D🔧, E💼
    category_name TEXT NOT NULL,
    emoji TEXT,
    description TEXT,
    parent_id INTEGER REFERENCES semantic_categories(id),
    depth_level INTEGER DEFAULT 0,
    shortlex_position INTEGER,
    agent_swarm_id TEXT,
    coordinator_agent_id TEXT,
    data_bucket_path TEXT,
    trust_debt_units INTEGER DEFAULT 0,
    percentage_of_total REAL DEFAULT 0.0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_depth CHECK (depth_level >= 0 AND depth_level <= 3)
);

-- Insert the 5 main semantic governance categories
INSERT INTO semantic_categories (category_code, category_name, emoji, description, depth_level, shortlex_position) VALUES
('A🛡️', 'Security & Trust Governance', '🛡️', 'Ensure legitimate, auditable, patent-compliant operations', 0, 1),
('B⚡', 'Performance & Optimization', '⚡', 'Maximize system efficiency and response times', 0, 2),
('C🎨', 'User Experience & Interfaces', '🎨', 'Ensure intuitive, accessible user interactions', 0, 3),
('D🔧', 'Development & Integration', '🔧', 'Maintain code quality and integration workflows', 0, 4),
('E💼', 'Business & Strategy', '💼', 'Align technical execution with business objectives', 0, 5);

-- Insert subcategories for each main category
INSERT INTO semantic_categories (category_code, category_name, parent_id, depth_level, shortlex_position) VALUES
-- A🛡️ Security & Trust Governance subcategories
('A🛡️.1📊', 'Trust Debt Analysis', 1, 1, 6),
('A🛡️.2🔒', 'Security Scanning', 1, 1, 7),
('A🛡️.3⚖️', 'Legal Compliance', 1, 1, 8),
('A🛡️.4💾', 'Data Integrity', 1, 1, 9),

-- B⚡ Performance & Optimization subcategories
('B⚡.1🚀', 'Runtime Performance', 2, 1, 10),
('B⚡.2💾', 'Database Optimization', 2, 1, 11),
('B⚡.3🧠', 'Algorithm Enhancement', 2, 1, 12),
('B⚡.4📊', 'Resource Management', 2, 1, 13),

-- C🎨 User Experience & Interfaces subcategories
('C🎨.1🖥️', 'Visual Design', 3, 1, 14),
('C🎨.2💻', 'CLI/API Interfaces', 3, 1, 15),
('C🎨.3📚', 'Documentation UX', 3, 1, 16),
('C🎨.4📱', 'Cross-Platform', 3, 1, 17),

-- D🔧 Development & Integration subcategories
('D🔧.1✅', 'Code Quality', 4, 1, 18),
('D🔧.2🔄', 'CI/CD Pipeline', 4, 1, 19),
('D🔧.3📦', 'Dependency Management', 4, 1, 20),
('D🔧.4🧪', 'Integration Testing', 4, 1, 21),

-- E💼 Business & Strategy subcategories
('E💼.1📈', 'Market Analysis', 5, 1, 22),
('E💼.2🎯', 'Product Strategy', 5, 1, 23),
('E💼.3👥', 'Customer Intelligence', 5, 1, 24),
('E💼.4💰', 'Revenue Optimization', 5, 1, 25);

-- ============================================================================
-- AGENT MANAGEMENT
-- ============================================================================

CREATE TABLE agents (
    id INTEGER PRIMARY KEY,
    agent_id TEXT NOT NULL UNIQUE,  -- From claude-flow
    agent_name TEXT,
    agent_type TEXT,  -- coordinator, researcher, coder, analyst, optimizer
    category_id INTEGER REFERENCES semantic_categories(id),
    capabilities TEXT,  -- JSON array of capabilities
    status TEXT DEFAULT 'inactive',  -- active, inactive, busy, error
    swarm_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_active TIMESTAMP,
    performance_score REAL DEFAULT 0.0
);

CREATE TABLE agent_outputs (
    id INTEGER PRIMARY KEY,
    agent_id TEXT REFERENCES agents(agent_id),
    category_id INTEGER REFERENCES semantic_categories(id),
    output_type TEXT NOT NULL,  -- 'json', 'html', 'csv', 'metrics', 'sql'
    file_path TEXT,
    bucket_name TEXT,
    checksum TEXT,
    validation_status TEXT DEFAULT 'pending',  -- pending, passed, failed, warning
    trust_debt_contribution INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dependencies TEXT,  -- JSON array of prerequisite outputs
    metadata TEXT  -- JSON metadata
);

-- ============================================================================
-- CROSS-CATEGORY COORDINATION
-- ============================================================================

CREATE TABLE cross_category_dependencies (
    id INTEGER PRIMARY KEY,
    source_category_id INTEGER REFERENCES semantic_categories(id),
    target_category_id INTEGER REFERENCES semantic_categories(id),
    dependency_type TEXT,  -- 'data', 'validation', 'orchestration', 'blocking'
    strength_score REAL DEFAULT 0.0,  -- 0.0 = weak, 1.0 = strong coupling
    description TEXT,
    last_validated TIMESTAMP,
    validation_status TEXT DEFAULT 'unknown',
    CONSTRAINT no_self_dependency CHECK (source_category_id != target_category_id)
);

-- Insert Trust Debt pipeline dependencies
INSERT INTO cross_category_dependencies (source_category_id, target_category_id, dependency_type, strength_score, description) VALUES
(6, 18, 'validation', 0.8, 'Trust Debt metrics validate code quality'),
(6, 14, 'data', 0.6, 'Trust Debt analysis informs visual design decisions'),
(18, 19, 'orchestration', 0.9, 'Code quality gates CI/CD pipeline'),
(22, 23, 'data', 0.7, 'Market analysis informs product strategy');

-- ============================================================================
-- TASK ORCHESTRATION
-- ============================================================================

CREATE TABLE orchestrated_tasks (
    id INTEGER PRIMARY KEY,
    task_id TEXT NOT NULL UNIQUE,  -- From claude-flow
    task_name TEXT,
    description TEXT,
    strategy TEXT,  -- sequential, parallel, adaptive, balanced
    priority TEXT,  -- low, medium, high, critical
    status TEXT DEFAULT 'pending',  -- pending, running, completed, failed, cancelled
    assigned_agents TEXT,  -- JSON array of agent IDs
    category_scope TEXT,  -- JSON array of category IDs involved
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_duration INTEGER,  -- in seconds
    actual_duration INTEGER,
    success_criteria TEXT,  -- JSON validation rules
    output_buckets TEXT,  -- JSON array of expected output files
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE task_progress (
    id INTEGER PRIMARY KEY,
    task_id TEXT REFERENCES orchestrated_tasks(task_id),
    agent_id TEXT REFERENCES agents(agent_id),
    stage_name TEXT,
    progress_percentage INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    output_data TEXT,  -- JSON snapshot of current state
    error_message TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_progress CHECK (progress_percentage >= 0 AND progress_percentage <= 100)
);

-- ============================================================================
-- TRUST DEBT INTEGRATION (Map existing pipeline)
-- ============================================================================

-- Map the existing 8-agent Trust Debt pipeline to A🛡️.1📊 category
INSERT INTO agents (agent_id, agent_name, agent_type, category_id, capabilities, status) VALUES
('trust-debt-0', 'Outcome Requirements Parser', 'researcher', 6, '["parsing", "requirements", "html-analysis"]', 'active'),
('trust-debt-1', 'Database Indexer & Keyword Extractor', 'coder', 6, '["database", "sqlite", "keywords", "indexing"]', 'active'),
('trust-debt-2', 'Category Generator & Orthogonality Validator', 'analyst', 6, '["categories", "orthogonality", "validation"]', 'active'),
('trust-debt-3', 'ShortLex Validator & Matrix Builder', 'coder', 6, '["shortlex", "matrix", "validation"]', 'active'),
('trust-debt-4', 'Grades & Statistics Calculator', 'analyst', 6, '["statistics", "grades", "calculation"]', 'active'),
('trust-debt-5', 'Timeline & Historical Analyzer', 'researcher', 6, '["timeline", "history", "git-analysis"]', 'active'),
('trust-debt-6', 'Analysis & Narrative Generator', 'analyst', 6, '["narrative", "analysis", "recommendations"]', 'active'),
('trust-debt-7', 'Report Generator & Final Auditor', 'coordinator', 6, '["reporting", "html", "audit", "validation"]', 'active');

-- ============================================================================
-- JSON BUCKET TRACKING
-- ============================================================================

CREATE TABLE json_buckets (
    id INTEGER PRIMARY KEY,
    bucket_name TEXT NOT NULL UNIQUE,
    category_id INTEGER REFERENCES semantic_categories(id),
    file_path TEXT,
    schema_version TEXT DEFAULT '1.0',
    last_modified TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    size_bytes INTEGER,
    record_count INTEGER,
    validation_checksum TEXT,
    dependencies TEXT,  -- JSON array of prerequisite buckets
    consumers TEXT,  -- JSON array of agents that consume this bucket
    metadata TEXT  -- JSON metadata including versioning
);

-- Insert Trust Debt pipeline JSON buckets
INSERT INTO json_buckets (bucket_name, category_id, file_path, dependencies, consumers) VALUES
('0-outcome-requirements.json', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/0-outcome-requirements.json', '[]', '["trust-debt-1"]'),
('1-indexed-keywords.json', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/1-indexed-keywords.json', '["0-outcome-requirements.json"]', '["trust-debt-2"]'),
('2-categories-balanced.json', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/2-categories-balanced.json', '["1-indexed-keywords.json"]', '["trust-debt-3"]'),
('3-presence-matrix.json', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/3-presence-matrix.json', '["2-categories-balanced.json"]', '["trust-debt-4"]'),
('4-grades-statistics.json', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/4-grades-statistics.json', '["3-presence-matrix.json"]', '["trust-debt-5"]'),
('5-timeline-history.json', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/5-timeline-history.json', '["4-grades-statistics.json"]', '["trust-debt-6"]'),
('6-analysis-narratives.json', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/6-analysis-narratives.json', '["5-timeline-history.json"]', '["trust-debt-7"]'),
('trust-debt-report.html', 6, '/Users/eliasmoosman/Documents/GitHub/IntentGuard/trust-debt-report.html', '["6-analysis-narratives.json"]', '[]');

-- ============================================================================
-- PERFORMANCE MONITORING
-- ============================================================================

CREATE TABLE performance_metrics (
    id INTEGER PRIMARY KEY,
    category_id INTEGER REFERENCES semantic_categories(id),
    agent_id TEXT REFERENCES agents(agent_id),
    metric_name TEXT,
    metric_value REAL,
    metric_unit TEXT,
    collected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    context_data TEXT  -- JSON additional context
);

-- ============================================================================
-- ORTHOGONALITY TRACKING
-- ============================================================================

CREATE TABLE category_correlations (
    id INTEGER PRIMARY KEY,
    category_1_id INTEGER REFERENCES semantic_categories(id),
    category_2_id INTEGER REFERENCES semantic_categories(id),
    correlation_score REAL,  -- 0.0 = orthogonal, 1.0 = completely correlated
    measurement_method TEXT,  -- 'keyword-overlap', 'agent-interaction', 'output-dependency'
    measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT no_self_correlation CHECK (category_1_id != category_2_id),
    CONSTRAINT ordered_pairs CHECK (category_1_id < category_2_id)  -- Prevent duplicate pairs
);

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- View: Category hierarchy with trust debt distribution
CREATE VIEW category_hierarchy AS
SELECT 
    c.id,
    c.category_code,
    c.category_name,
    c.emoji,
    p.category_name as parent_name,
    c.depth_level,
    c.shortlex_position,
    c.trust_debt_units,
    c.percentage_of_total,
    COUNT(a.id) as agent_count,
    COUNT(ab.id) as bucket_count
FROM semantic_categories c
LEFT JOIN semantic_categories p ON c.parent_id = p.id
LEFT JOIN agents a ON c.id = a.category_id
LEFT JOIN json_buckets ab ON c.id = ab.category_id
GROUP BY c.id
ORDER BY c.shortlex_position;

-- View: Agent status across all categories
CREATE VIEW agent_status_overview AS
SELECT 
    a.agent_id,
    a.agent_name,
    a.agent_type,
    c.category_code,
    c.category_name,
    a.status,
    a.performance_score,
    COUNT(ao.id) as output_count,
    a.last_active
FROM agents a
JOIN semantic_categories c ON a.category_id = c.id
LEFT JOIN agent_outputs ao ON a.agent_id = ao.agent_id
GROUP BY a.agent_id
ORDER BY c.shortlex_position, a.agent_name;

-- View: Cross-category dependency network
CREATE VIEW dependency_network AS
SELECT 
    s.category_code as source_category,
    s.category_name as source_name,
    t.category_code as target_category,
    t.category_name as target_name,
    d.dependency_type,
    d.strength_score,
    d.description,
    d.validation_status
FROM cross_category_dependencies d
JOIN semantic_categories s ON d.source_category_id = s.id
JOIN semantic_categories t ON d.target_category_id = t.id
ORDER BY d.strength_score DESC;

-- ============================================================================
-- TRIGGERS FOR DATA INTEGRITY
-- ============================================================================

-- Update last_modified timestamp when buckets change
CREATE TRIGGER update_bucket_timestamp
    AFTER UPDATE ON json_buckets
    BEGIN
        UPDATE json_buckets 
        SET last_modified = CURRENT_TIMESTAMP 
        WHERE id = NEW.id;
    END;

-- Validate shortlex ordering on insert/update
CREATE TRIGGER validate_shortlex_ordering
    BEFORE INSERT ON semantic_categories
    BEGIN
        -- Ensure shortlex_position is unique and sequential
        SELECT CASE 
            WHEN EXISTS(SELECT 1 FROM semantic_categories WHERE shortlex_position = NEW.shortlex_position)
            THEN RAISE(ABORT, 'ShortLex position must be unique')
        END;
    END;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_categories_shortlex ON semantic_categories(shortlex_position);
CREATE INDEX idx_categories_parent ON semantic_categories(parent_id);
CREATE INDEX idx_agents_category ON agents(category_id);
CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_outputs_agent ON agent_outputs(agent_id);
CREATE INDEX idx_outputs_category ON agent_outputs(category_id);
CREATE INDEX idx_tasks_status ON orchestrated_tasks(status);
CREATE INDEX idx_buckets_category ON json_buckets(category_id);
CREATE INDEX idx_dependencies_source ON cross_category_dependencies(source_category_id);
CREATE INDEX idx_dependencies_target ON cross_category_dependencies(target_category_id);

-- ============================================================================
-- INITIAL DATA VALIDATION
-- ============================================================================

-- Verify the schema is properly initialized
SELECT 'Semantic Governance Schema Initialized Successfully' as status,
       COUNT(*) as total_categories,
       (SELECT COUNT(*) FROM semantic_categories WHERE parent_id IS NULL) as parent_categories,
       (SELECT COUNT(*) FROM agents) as registered_agents,
       (SELECT COUNT(*) FROM json_buckets) as tracked_buckets
FROM semantic_categories;