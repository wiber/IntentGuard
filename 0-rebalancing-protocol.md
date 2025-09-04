# Agent 2 Rebalancing Protocol for Pipeline Coherence

## Migration Strategy During Category Rebalancing

### Transaction Isolation Protocol

```sql
BEGIN EXCLUSIVE TRANSACTION;

-- Step 1: Agent 2 creates new category versions
INSERT INTO category_registry (
    category_uuid, 
    category_shortlex_id,
    semantic_name,
    parent_uuid,
    version_number
) 
SELECT 
    lower(hex(randomblob(16))),  -- New UUID for rebalanced version
    new_shortlex_position,        -- Updated ShortLex ID
    new_semantic_name,           -- Refined category name
    parent_uuid,                 -- Preserved hierarchy
    version_number + 1           -- Incremented version
FROM category_registry 
WHERE is_active = 1;

-- Step 2: Deactivate old categories atomically
UPDATE category_registry 
SET is_active = 0 
WHERE category_uuid IN (SELECT old_category_uuids FROM rebalance_batch);

-- Step 3: Activate new categories atomically  
UPDATE category_registry 
SET is_active = 1 
WHERE category_uuid IN (SELECT new_category_uuids FROM rebalance_batch);

-- Step 4: Log rebalancing history
INSERT INTO rebalancing_history (
    rebalance_id, agent_run_id, category_uuid,
    old_shortlex_id, new_shortlex_id,
    orthogonality_score, rebalance_reason
) VALUES (...);

COMMIT TRANSACTION;
```

### Key Properties Preserved

1. **Immutable References**: Matrix cells keep referencing original category UUIDs
2. **Atomic Activation**: Categories switch active/inactive in single transaction  
3. **Historical Tracking**: All category evolution preserved in rebalancing_history
4. **Diagonal Integrity**: UUID equality computation remains valid across versions

### Agent Coordination Rules

**Agent 1 (Database Indexer)**:
- Always creates NEW category UUIDs, never updates existing
- Uses only `is_active=1` categories for new content indexing
- Maintains historical content references to old category versions

**Agent 2 (Category Generator)**:
- Creates new category versions rather than updating in-place
- Uses EXCLUSIVE transactions to prevent Agent 3 inconsistency
- Validates orthogonality before committing rebalancing changes

**Agent 3 (Matrix Builder)**:
- Queries only `WHERE is_active=1` for current ShortLex validation
- Uses stable UUID references for matrix cell population
- Auto-corrects ShortLex based on ACTIVE categories only

### Pipeline Break Prevention

The schema ensures:
- ✅ Agent 2 rebalancing never breaks existing matrix references
- ✅ Agent 3 gets consistent category view during ShortLex validation  
- ✅ Diagonal separation maintained via UUID equality across versions
- ✅ Historical queries possible for audit and debugging
- ✅ Transaction isolation prevents partial-state reads

This eliminates the pipeline break point where category rebalancing could invalidate database relationships.