pub mod models;
pub mod operations;
pub mod schema;

use rusqlite::{Connection, Result};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    /// Initialize database at the given path
    pub fn new(db_path: PathBuf) -> Result<Self> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| {
                rusqlite::Error::ToSqlConversionFailure(Box::new(e))
            })?;
        }

        let conn = Connection::open(&db_path)?;

        // Enable foreign keys
        conn.execute("PRAGMA foreign_keys = ON", [])?;

        // Initialize schema
        schema::initialize_schema(&conn)?;

        Ok(Database {
            conn: Mutex::new(conn),
        })
    }

    /// Get database path for the application
    pub fn get_db_path() -> Result<PathBuf> {
        let app_data_dir = tauri::api::path::data_dir()
            .ok_or_else(|| rusqlite::Error::InvalidPath("Could not determine app data directory".into()))?;

        let clipforge_dir = app_data_dir.join("ClipForge");
        Ok(clipforge_dir.join("clipforge.db"))
    }
}
