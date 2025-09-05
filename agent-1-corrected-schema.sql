-- Agent 1: Corrected SQLite Database Schema 
-- EXACTLY 5 Parent + 40 Child = 45 Categories per Agent 0 Requirements

DROP TABLE IF EXISTS matrix_cells;
DROP TABLE IF EXISTS keyword_index;  
DROP TABLE IF EXISTS intent_data;
DROP TABLE IF EXISTS reality_data;
DROP TABLE IF EXISTS categories;

-- Categories table supporting EXACTLY 45-category hierarchical structure
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

-- Performance indexes
CREATE INDEX idx_shortlex ON categories(shortlex_order);
CREATE INDEX idx_parent_child ON categories(parent_id);
CREATE INDEX idx_category_type ON categories(category_type);
CREATE INDEX idx_keyword_category ON keyword_index(category_id);
CREATE INDEX idx_keyword_freq ON keyword_index(frequency DESC);
CREATE INDEX idx_matrix_row ON matrix_cells(row_category_id);
CREATE INDEX idx_matrix_col ON matrix_cells(col_category_id);

-- Insert EXACTLY 5 Parent Categories (ShortLex ordering 1-5)
INSERT INTO categories (name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
('A🚀 CoreEngine', '🚀', 1, 705, 3.7, 'parent', '#ff6b6b', 0),
('B🔒 Documentation', '🔒', 2, 411, 2.1, 'parent', '#4ecdc4', 0),
('C💨 Visualization', '💨', 3, 532, 2.8, 'parent', '#45b7d1', 0),
('D🧠 Integration', '🧠', 4, 4184, 21.9, 'parent', '#96ceb4', 0),
('E🎨 BusinessLayer', '🎨', 5, 1829, 9.6, 'parent', '#feca57', 0);

-- Insert EXACTLY 40 Child Categories (8 per parent, ShortLex ordering 6-45)
-- A🚀 CoreEngine children (6-13) - 8 children
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(1, 'A🚀.1⚡ Algorithm', '⚡', 6, 88, 0.46, 'child', '#ff6b6b', 1),
(1, 'A🚀.2🔥 Metrics', '🔥', 7, 88, 0.46, 'child', '#ff6b6b', 1),
(1, 'A🚀.3📈 Analysis', '📈', 8, 88, 0.46, 'child', '#ff6b6b', 1),
(1, 'A🚀.4🎯 Detection', '🎯', 9, 88, 0.46, 'child', '#ff6b6b', 1),
(1, 'A🚀.5🔍 Scanning', '🔍', 10, 88, 0.46, 'child', '#ff6b6b', 1),
(1, 'A🚀.6⚙️ Processing', '⚙️', 11, 88, 0.46, 'child', '#ff6b6b', 1),
(1, 'A🚀.7🏗️ Architecture', '🏗️', 12, 88, 0.46, 'child', '#ff6b6b', 1),
(1, 'A🚀.8🧪 Validation', '🧪', 13, 88, 0.46, 'child', '#ff6b6b', 1);

-- B🔒 Documentation children (14-21) - 8 children
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(2, 'B🔒.1🛡️ Specifications', '🛡️', 14, 51, 0.26, 'child', '#4ecdc4', 1),
(2, 'B🔒.2🔐 Guides', '🔐', 15, 51, 0.26, 'child', '#4ecdc4', 1),
(2, 'B🔒.3🗂️ Reference', '🗂️', 16, 51, 0.26, 'child', '#4ecdc4', 1),
(2, 'B🔒.4🔓 Examples', '🔓', 17, 51, 0.26, 'child', '#4ecdc4', 1),
(2, 'B🔒.5📖 Tutorials', '📖', 18, 51, 0.26, 'child', '#4ecdc4', 1),
(2, 'B🔒.6🎯 API Docs', '🎯', 19, 51, 0.26, 'child', '#4ecdc4', 1),
(2, 'B🔒.7🔬 Research', '🔬', 20, 52, 0.27, 'child', '#4ecdc4', 1),
(2, 'B🔒.8📋 Standards', '📋', 21, 52, 0.27, 'child', '#4ecdc4', 1);

-- C💨 Visualization children (22-29) - 8 children
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(3, 'C💨.1🌊 Reports', '🌊', 22, 67, 0.35, 'child', '#45b7d1', 1),
(3, 'C💨.2📊 Charts', '📊', 23, 67, 0.35, 'child', '#45b7d1', 1),
(3, 'C💨.3💨 Interface', '💨', 24, 67, 0.35, 'child', '#45b7d1', 1),
(3, 'C💨.4🖥️ Display', '🖥️', 25, 67, 0.35, 'child', '#45b7d1', 1),
(3, 'C💨.5🎨 Styling', '🎨', 26, 66, 0.35, 'child', '#45b7d1', 1),
(3, 'C💨.6🎭 Animation', '🎭', 27, 66, 0.35, 'child', '#45b7d1', 1),
(3, 'C💨.7🎪 Interactive', '🎪', 28, 66, 0.35, 'child', '#45b7d1', 1),
(3, 'C💨.8🌈 Theming', '🌈', 29, 66, 0.35, 'child', '#45b7d1', 1);

-- D🧠 Integration children (30-37) - 8 children
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(4, 'D🧠.1🤖 CLI', '🤖', 30, 523, 2.74, 'child', '#96ceb4', 1),
(4, 'D🧠.2📊 Package', '📊', 31, 523, 2.74, 'child', '#96ceb4', 1),
(4, 'D🧠.3🔮 Config', '🔮', 32, 523, 2.74, 'child', '#96ceb4', 1),
(4, 'D🧠.4🎲 Export', '🎲', 33, 523, 2.74, 'child', '#96ceb4', 1),
(4, 'D🧠.5🌐 API', '🌐', 34, 523, 2.74, 'child', '#96ceb4', 1),
(4, 'D🧠.6🔗 Pipeline', '🔗', 35, 523, 2.74, 'child', '#96ceb4', 1),
(4, 'D🧠.7🚀 Deploy', '🚀', 36, 523, 2.74, 'child', '#96ceb4', 1),
(4, 'D🧠.8🛡️ Security', '🛡️', 37, 523, 2.74, 'child', '#96ceb4', 1);

-- E🎨 BusinessLayer children (38-45) - 8 children
INSERT INTO categories (parent_id, name, emoji, shortlex_order, trust_debt_units, percentage, category_type, color, depth) VALUES
(5, 'E🎨.1✨ Strategy', '✨', 38, 229, 1.20, 'child', '#feca57', 1),
(5, 'E🎨.2🎯 Planning', '🎯', 39, 229, 1.20, 'child', '#feca57', 1),
(5, 'E🎨.3🎨 Marketing', '🎨', 40, 229, 1.20, 'child', '#feca57', 1),
(5, 'E🎨.4🌈 Enterprise', '🌈', 41, 229, 1.20, 'child', '#feca57', 1),
(5, 'E🎨.5💼 Sales', '💼', 42, 228, 1.20, 'child', '#feca57', 1),
(5, 'E🎨.6📈 Growth', '📈', 43, 228, 1.20, 'child', '#feca57', 1),
(5, 'E🎨.7🎪 Operations', '🎪', 44, 228, 1.20, 'child', '#feca57', 1),
(5, 'E🎨.8🏆 Success', '🏆', 45, 228, 1.20, 'child', '#feca57', 1);

-- Initialize EXACTLY 45x45 matrix foundation (2025 cells total)
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