use serde::{Deserialize, Serialize};

/// Media file metadata stored in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Media {
    pub id: Option<i64>,
    pub path: String,
    pub filename: String,
    pub duration: Option<f64>,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub file_size: Option<i64>,
    pub format: Option<String>,
    pub fps: Option<f64>,
    pub thumbnail_path: Option<String>,
    pub created_at: String,
    pub metadata_json: Option<String>,
}

/// Project metadata stored in the database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: Option<i64>,
    pub name: String,
    pub timeline_json: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub last_opened_at: Option<String>,
}

impl Media {
    /// Create a new Media instance with minimal required fields
    pub fn new(path: String, filename: String) -> Self {
        Media {
            id: None,
            path,
            filename,
            duration: None,
            width: None,
            height: None,
            file_size: None,
            format: None,
            fps: None,
            thumbnail_path: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            metadata_json: None,
        }
    }
}

impl Project {
    /// Create a new Project instance
    pub fn new(name: String) -> Self {
        let now = chrono::Utc::now().to_rfc3339();
        Project {
            id: None,
            name,
            timeline_json: None,
            created_at: now.clone(),
            updated_at: now,
            last_opened_at: None,
        }
    }
}
