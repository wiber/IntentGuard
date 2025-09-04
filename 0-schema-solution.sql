-- SOLUTION: Intent/Reality Diagonal Separation with Category ID Stability
-- Agent 1 Schema Design for Pipeline Coherence
-- Ensures Agent 2 rebalancing doesn't break Agent 3 matrix builder

-- Core principle: Immutable category UUIDs with semantic versioning
-- Pipeline stages maintain referential integrity through category evolution

CREATE TABLE category_registry (
    category_uuid TEXT PRIMARY KEY,  -- Immutable UUID, never changes
    category_shortlex_id TEXT NOT NULL,  -- ShortLex position (A1, B3, etc.)
    semantic_name TEXT NOT NULL,         -- Human name (CoreEngine, Documentation)  
    parent_uuid TEXT,                    -- For hierarchical categories
    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    version_number INTEGER DEFAULT 1,    -- Incremented by Agent 2 rebalancing
    is_active BOOLEAN DEFAULT 1,         -- Deactivated during rebalancing
    FOREIGN KEY (parent_uuid) REFERENCES category_registry(category_uuid)
);

-- Intent content with immutable category references
CREATE TABLE intent_content (
    content_id TEXT PRIMARY KEY,
    category_uuid TEXT NOT NULL,         -- References category_registry.category_uuid
    file_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    keyword_count INTEGER DEFAULT 0,
    mention_units INTEGER DEFAULT 0,
    extraction_confidence REAL DEFAULT 1.0,
    indexed_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (category_uuid) REFERENCES category_registry(category_uuid)
);

-- Reality content with immutable category references  
CREATE TABLE reality_content (
    content_id TEXT PRIMARY KEY,
    category_uuid TEXT NOT NULL,         -- References category_registry.category_uuid
    file_path TEXT NOT NULL,
    content_hash TEXT NOT NULL,
    keyword_count INTEGER DEFAULT 0,
    mention_units INTEGER DEFAULT 0,
    git_activity INTEGER DEFAULT 0,
    indexed_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (category_uuid) REFERENCES category_registry(category_uuid)
);

-- Matrix cells maintain diagonal separation via category UUIDs
CREATE TABLE keyword_matrix (
    matrix_id TEXT PRIMARY KEY,
    row_category_uuid TEXT NOT NULL,     -- Intent category (immutable reference)
    col_category_uuid TEXT NOT NULL,     -- Reality category (immutable reference)  
    intent_value INTEGER DEFAULT 0,
    reality_value INTEGER DEFAULT 0,
    trust_debt_units INTEGER DEFAULT 0,
    is_diagonal BOOLEAN AS (row_category_uuid = col_category_uuid),  -- Computed diagonal
    debt_classification TEXT CHECK (debt_classification IN ('debt-none', 'debt-low', 'debt-medium', 'debt-high')),
    last_updated INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (row_category_uuid) REFERENCES category_registry(category_uuid),
    FOREIGN KEY (col_category_uuid) REFERENCES category_registry(category_uuid),
    UNIQUE(row_category_uuid, col_category_uuid)  -- Ensure single cell per category pair
);

-- Agent 2 rebalancing history with category version tracking
CREATE TABLE rebalancing_history (
    rebalance_id TEXT PRIMARY KEY,
    agent_run_id TEXT NOT NULL,
    category_uuid TEXT NOT NULL,
    old_shortlex_id TEXT,
    new_shortlex_id TEXT, 
    old_semantic_name TEXT,
    new_semantic_name TEXT,
    orthogonality_score REAL,
    mention_count_before INTEGER,
    mention_count_after INTEGER,
    rebalance_reason TEXT,
    rebalanced_at INTEGER DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (category_uuid) REFERENCES category_registry(category_uuid)
);

-- Migration Strategy for Agent 2 Rebalancing:
-- 1. Agent 2 creates NEW category versions rather than updating existing
-- 2. Old categories marked is_active=0, new categories get is_active=1
-- 3. Matrix cells reference UUIDs remain valid across rebalancing
-- 4. Agent 3 uses ONLY active categories for ShortLex validation
-- 5. Historical queries can access all category versions via version_number

-- Key Constraints for Pipeline Coherence:
-- ✓ Category UUIDs never change (immutable foreign keys)
-- ✓ ShortLex IDs can change but maintain history
-- ✓ Matrix diagonal separation preserved via UUID equality
-- ✓ Agent 2 rebalancing creates new versions, doesn't break existing references
-- ✓ Agent 3 matrix builder gets stable category references
-- ✓ Transaction isolation during rebalancing prevents inconsistent reads

-- Query patterns for agents:
-- Agent 1: INSERT with new UUIDs, never UPDATE category references
-- Agent 2: INSERT new category versions, UPDATE is_active flags in transactions  
-- Agent 3: SELECT only WHERE is_active=1 for current ShortLex validation
-- Agent 4-7: Use stable UUIDs for all statistical and analytical queries

-- CRITICAL: This ensures Agent 2's iterative category balancing never breaks
-- the Intent/Reality diagonal separation that Agent 3's matrix builder depends on.