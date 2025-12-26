-- Create translations table
CREATE TABLE translations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  korean_text TEXT NOT NULL,
  english_text TEXT NOT NULL,
  edited_english_text TEXT,
  is_edited BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  llm_used TEXT,
  tags TEXT,
  is_favorite BOOLEAN DEFAULT 0,
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX idx_created_at ON translations(created_at DESC);
CREATE INDEX idx_llm_used ON translations(llm_used);
CREATE INDEX idx_is_favorite ON translations(is_favorite);
