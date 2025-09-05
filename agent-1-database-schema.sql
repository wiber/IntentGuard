-- Agent 1: SQLite Database Schema for Trust Debt Pipeline
-- 45-Category Hierarchical Structure with Asymmetric Matrix Support
-- Complies with Agent 0 outcome requirements and PDF template specifications

DROP TABLE IF EXISTS matrix_cells;
DROP TABLE IF EXISTS keyword_index;  
DROP TABLE IF EXISTS intent_data;
DROP TABLE IF EXISTS reality_data;
DROP TABLE IF EXISTS categories;

-- Categories table supporting 45-category hierarchical structure
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER REFERENCES categories(id),
    name TEXT NOT NULL UNIQUE,
    emoji TEXT,
    shortlex_order INTEGER UNIQUE,
    trust_debt_units INTEGER DEFAULT 0,
    percentage REAL DEFAULT 0.0,
    category_type TEXT CHECK(category_type IN ('parent', 'child')) NOT NULL,
    color TEXT DEFAULT '#ffffff',
    depth INTEGER DEFAULT 0
);

-- Keyword index supporting Intent vs Reality asymmetric data
CREATE TABLE keyword_index (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    category_id INTEGER REFERENCES categories(id),
    intent_count INTEGER DEFAULT 0,
    reality_count INTEGER DEFAULT 0,
    frequency REAL DEFAULT 0.0,
    weight REAL DEFAULT 1.0,
    source_files TEXT -- JSON array of source files
);

-- Matrix cells for 45x45 asymmetric Trust Debt matrix
CREATE TABLE matrix_cells (
    row_category_id INTEGER REFERENCES categories(id),
    col_category_id INTEGER REFERENCES categories(id),
    intent_value REAL DEFAULT 0.0,
    reality_value REAL DEFAULT 0.0,
    trust_debt_units INTEGER DEFAULT 0,
    cell_color TEXT DEFAULT '#ffffff',
    is_upper_triangle BOOLEAN DEFAULT FALSE,
    is_lower_triangle BOOLEAN DEFAULT FALSE,
    PRIMARY KEY (row_category_id, col_category_id)
);

-- Intent data from /docs directory
CREATE TABLE intent_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id),
    source_file TEXT NOT NULL,
    file_path TEXT NOT NULL,
    content TEXT,
    keyword_matches TEXT, -- JSON array of matched keywords
    weight REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Reality data from /src directory and git
CREATE TABLE reality_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER REFERENCES categories(id),
    source_file TEXT NOT NULL,
    file_path TEXT NOT NULL,
    git_hash TEXT,
    content TEXT,
    keyword_matches TEXT, -- JSON array of matched keywords
    weight REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes for ShortLex ordering and matrix operations
CREATE INDEX idx_shortlex ON categories(shortlex_order);
CREATE INDEX idx_parent_child ON categories(parent_id);
CREATE INDEX idx_category_type ON categories(category_type);
CREATE INDEX idx_keyword_category ON keyword_index(category_id);
CREATE INDEX idx_keyword_freq ON keyword_index(frequency DESC);
CREATE INDEX idx_matrix_row ON matrix_cells(row_category_id);
CREATE INDEX idx_matrix_col ON matrix_cells(col_category_id);
CREATE INDEX idx_intent_category ON intent_data(category_id);
CREATE INDEX idx_reality_category ON reality_data(category_id);

-- Insert 5 Parent Categories (ShortLex ordering 1-5)
INSERT INTO categories (name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
('A🚀 CoreEngine', '🚀', 1, 705, 3.7, 'parent', '#ff6b6b', 0),
('B🔒 Documentation', '🔒', 2, 411, 2.1, 'parent', '#4ecdc4', 0),
('C💨 Visualization', '💨', 3, 532, 2.8, 'parent', '#45b7d1', 0),
('D🧠 Integration', '🧠', 4, 4184, 21.9, 'parent', '#96ceb4', 0),
('E🎨 BusinessLayer', '🎨', 5, 1829, 9.6, 'parent', '#feca57', 0);

-- Insert 40 Child Categories (ShortLex ordering 6-45)
-- A🚀 CoreEngine children (6-9)
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(1, 'A🚀.1⚡ Algorithm', '⚡', 6, 176, 0.93, 'child', '#ff6b6b', 1),
(1, 'A🚀.2🔥 Metrics', '🔥', 7, 176, 0.93, 'child', '#ff6b6b', 1),
(1, 'A🚀.3📈 Analysis', '📈', 8, 176, 0.93, 'child', '#ff6b6b', 1),
(1, 'A🚀.4🎯 Detection', '🎯', 9, 176, 0.93, 'child', '#ff6b6b', 1);

-- B🔒 Documentation children (10-13)
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(2, 'B🔒.1🛡️ Specifications', '🛡️', 10, 103, 0.53, 'child', '#4ecdc4', 1),
(2, 'B🔒.2🔐 Guides', '🔐', 11, 103, 0.53, 'child', '#4ecdc4', 1),
(2, 'B🔒.3🗂️ Reference', '🗂️', 12, 103, 0.53, 'child', '#4ecdc4', 1),
(2, 'B🔒.4🔓 Examples', '🔓', 13, 103, 0.53, 'child', '#4ecdc4', 1);

-- C💨 Visualization children (14-17)
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(3, 'C💨.1🌊 Reports', '🌊', 14, 133, 0.70, 'child', '#45b7d1', 1),
(3, 'C💨.2📊️ Charts', '📊', 15, 133, 0.70, 'child', '#45b7d1', 1),
(3, 'C💨.3💨 Interface', '💨', 16, 133, 0.70, 'child', '#45b7d1', 1),
(3, 'C💨.4🖥️ Display', '🖥️', 17, 133, 0.70, 'child', '#45b7d1', 1);

-- D🧠 Integration children (18-21)
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(4, 'D🧠.1🤖 CLI', '🤖', 18, 1046, 5.48, 'child', '#96ceb4', 1),
(4, 'D🧠.2📊 Package', '📊', 19, 1046, 5.48, 'child', '#96ceb4', 1),
(4, 'D🧠.3🔮 Config', '🔮', 20, 1046, 5.48, 'child', '#96ceb4', 1),
(4, 'D🧠.4🎲 Export', '🎲', 21, 1046, 5.48, 'child', '#96ceb4', 1);

-- E🎨 BusinessLayer children (22-25)
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(5, 'E🎨.1✨ Strategy', '✨', 22, 457, 2.40, 'child', '#feca57', 1),
(5, 'E🎨.2🎯 Planning', '🎯', 23, 457, 2.40, 'child', '#feca57', 1),
(5, 'E🎨.3🎨 Marketing', '🎨', 24, 457, 2.40, 'child', '#feca57', 1),
(5, 'E🎨.4🌈 Enterprise', '🌈', 25, 457, 2.40, 'child', '#feca57', 1);

-- Additional specialized categories to reach 45 total (26-45)
-- F🔧 Infrastructure (26-29)
INSERT INTO categories (name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
('F🔧 Infrastructure', '🔧', 26, 892, 4.68, 'parent', '#ff9ff3', 0);

INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(26, 'F🔧.1⚙️ Database', '⚙️', 27, 223, 1.17, 'child', '#ff9ff3', 1),
(26, 'F🔧.2🔗 Pipeline', '🔗', 28, 223, 1.17, 'child', '#ff9ff3', 1),
(26, 'F🔧.3🏗️ Build', '🏗️', 29, 223, 1.17, 'child', '#ff9ff3', 1),
(26, 'F🔧.4🧪 Testing', '🧪', 30, 223, 1.17, 'child', '#ff9ff3', 1);

-- G🎭 Quality (31-34)
INSERT INTO categories (name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
('G🎭 Quality', '🎭', 31, 645, 3.38, 'parent', '#54a0ff', 0);

INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(31, 'G🎭.1🎯 Standards', '🎯', 32, 161, 0.85, 'child', '#54a0ff', 1),
(31, 'G🎭.2🔍 Review', '🔍', 33, 161, 0.85, 'child', '#54a0ff', 1),
(31, 'G🎭.3🎪 Performance', '🎪', 34, 161, 0.85, 'child', '#54a0ff', 1),
(31, 'G🎭.4🎨 Refactor', '🎨', 35, 161, 0.85, 'child', '#54a0ff', 1);

-- H🌊 Operations (36-39)
INSERT INTO categories (name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
('H🌊 Operations', '🌊', 36, 738, 3.87, 'parent', '#5f27cd', 0);

INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(36, 'H🌊.1🚀 Deploy', '🚀', 37, 185, 0.97, 'child', '#5f27cd', 1),
(36, 'H🌊.2📊 Monitor', '📊', 38, 185, 0.97, 'child', '#5f27cd', 1),
(36, 'H🌊.3🔧 Maintain', '🔧', 39, 185, 0.97, 'child', '#5f27cd', 1),
(36, 'H🌊.4🛡️ Security', '🛡️', 40, 185, 0.97, 'child', '#5f27cd', 1);

-- I🎨 Innovation (41-44)
INSERT INTO categories (name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
('I🎨 Innovation', '🎨', 41, 567, 2.97, 'parent', '#00d2d3', 0);

INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(41, 'I🎨.1💡 Research', '💡', 42, 142, 0.74, 'child', '#00d2d3', 1),
(41, 'I🎨.2🚀 Prototype', '🚀', 43, 142, 0.74, 'child', '#00d2d3', 1),
(41, 'I🎨.3🎯 Experiment', '🎯', 44, 142, 0.74, 'child', '#00d2d3', 1),
(41, 'I🎨.4🌟 Patent', '🌟', 45, 142, 0.74, 'child', '#00d2d3', 1);

-- Initialize 45x45 matrix foundation
INSERT INTO matrix_cells (row_category_id, col_category_id, intent_value, reality_value, trust_debt_units, is_upper_triangle, is_lower_triangle)
SELECT 
    c1.id as row_category_id,
    c2.id as col_category_id,
    0.0 as intent_value,
    0.0 as reality_value,
    0 as trust_debt_units,
    CASE WHEN c1.shortlex_order < c2.shortlex_order THEN TRUE ELSE FALSE END as is_upper_triangle,
    CASE WHEN c1.shortlex_order > c2.shortlex_order THEN TRUE ELSE FALSE END as is_lower_triangle
FROM categories c1 
CROSS JOIN categories c2;