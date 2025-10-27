use rusqlite::{Connection, Result};

/// SQL for creating the media table
const CREATE_MEDIA_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    path TEXT NOT NULL UNIQUE,
    filename TEXT NOT NULL,
    duration REAL,
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    format TEXT,
    fps REAL,
    thumbnail_path TEXT,
    created_at TEXT NOT NULL,
    metadata_json TEXT
)"#;

/// SQL for creating the projects table
const CREATE_PROJECTS_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    timeline_json TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_opened_at TEXT
)"#;

/// SQL for creating indexes on media table
const CREATE_MEDIA_INDEXES: &str = r#"
CREATE INDEX IF NOT EXISTS idx_media_created_at ON media(created_at);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media(filename);
"#;

/// SQL for creating indexes on projects table
const CREATE_PROJECTS_INDEXES: &str = r#"
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at);
CREATE INDEX IF NOT EXISTS idx_projects_last_opened_at ON projects(last_opened_at);
"#;

/// SQL for creating the schema_version table (for future migrations)
const CREATE_VERSION_TABLE: &str = r#"
CREATE TABLE IF NOT EXISTS schema_version (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    version INTEGER NOT NULL,
    updated_at TEXT NOT NULL
)"#;

/// Initialize the database schema
pub fn initialize_schema(conn: &Connection) -> Result<()> {
    // Create tables
    conn.execute(CREATE_MEDIA_TABLE, [])?;
    conn.execute(CREATE_PROJECTS_TABLE, [])?;
    conn.execute(CREATE_VERSION_TABLE, [])?;

    // Create indexes
    conn.execute_batch(CREATE_MEDIA_INDEXES)?;
    conn.execute_batch(CREATE_PROJECTS_INDEXES)?;

    // Set initial schema version if not exists
    conn.execute(
        "INSERT OR IGNORE INTO schema_version (id, version, updated_at) VALUES (1, 1, ?)",
        [chrono::Utc::now().to_rfc3339()],
    )?;

    Ok(())
}
