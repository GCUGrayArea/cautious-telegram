use super::models::{Media, Project};
use rusqlite::{params, Connection, Result};

// ============================================================================
// Media Operations
// ============================================================================

/// Insert a new media record into the database
pub fn insert_media(conn: &Connection, media: &Media) -> Result<i64> {
    conn.execute(
        "INSERT INTO media (path, filename, duration, width, height, file_size, format, fps, thumbnail_path, created_at, metadata_json)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        params![
            media.path,
            media.filename,
            media.duration,
            media.width,
            media.height,
            media.file_size,
            media.format,
            media.fps,
            media.thumbnail_path,
            media.created_at,
            media.metadata_json,
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

/// Get a media record by ID
pub fn get_media_by_id(conn: &Connection, id: i64) -> Result<Option<Media>> {
    let mut stmt = conn.prepare(
        "SELECT id, path, filename, duration, width, height, file_size, format, fps, thumbnail_path, created_at, metadata_json
         FROM media WHERE id = ?1",
    )?;

    let media = stmt.query_row([id], |row| {
        Ok(Media {
            id: row.get(0)?,
            path: row.get(1)?,
            filename: row.get(2)?,
            duration: row.get(3)?,
            width: row.get(4)?,
            height: row.get(5)?,
            file_size: row.get(6)?,
            format: row.get(7)?,
            fps: row.get(8)?,
            thumbnail_path: row.get(9)?,
            created_at: row.get(10)?,
            metadata_json: row.get(11)?,
        })
    });

    match media {
        Ok(m) => Ok(Some(m)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Get all media records
pub fn get_all_media(conn: &Connection) -> Result<Vec<Media>> {
    let mut stmt = conn.prepare(
        "SELECT id, path, filename, duration, width, height, file_size, format, fps, thumbnail_path, created_at, metadata_json
         FROM media ORDER BY created_at DESC",
    )?;

    let media_iter = stmt.query_map([], |row| {
        Ok(Media {
            id: row.get(0)?,
            path: row.get(1)?,
            filename: row.get(2)?,
            duration: row.get(3)?,
            width: row.get(4)?,
            height: row.get(5)?,
            file_size: row.get(6)?,
            format: row.get(7)?,
            fps: row.get(8)?,
            thumbnail_path: row.get(9)?,
            created_at: row.get(10)?,
            metadata_json: row.get(11)?,
        })
    })?;

    let mut media_list = Vec::new();
    for media in media_iter {
        media_list.push(media?);
    }

    Ok(media_list)
}

/// Delete a media record by ID
pub fn delete_media(conn: &Connection, id: i64) -> Result<usize> {
    conn.execute("DELETE FROM media WHERE id = ?1", [id])
}

/// Update media metadata
pub fn update_media(conn: &Connection, media: &Media) -> Result<usize> {
    let id = media.id.ok_or_else(|| {
        rusqlite::Error::InvalidParameterName("Media ID is required for update".to_string())
    })?;

    conn.execute(
        "UPDATE media SET path = ?1, filename = ?2, duration = ?3, width = ?4, height = ?5,
         file_size = ?6, format = ?7, fps = ?8, thumbnail_path = ?9, metadata_json = ?10
         WHERE id = ?11",
        params![
            media.path,
            media.filename,
            media.duration,
            media.width,
            media.height,
            media.file_size,
            media.format,
            media.fps,
            media.thumbnail_path,
            media.metadata_json,
            id,
        ],
    )
}

// ============================================================================
// Project Operations
// ============================================================================

/// Insert a new project record into the database
pub fn insert_project(conn: &Connection, project: &Project) -> Result<i64> {
    conn.execute(
        "INSERT INTO projects (name, timeline_json, created_at, updated_at, last_opened_at)
         VALUES (?1, ?2, ?3, ?4, ?5)",
        params![
            project.name,
            project.timeline_json,
            project.created_at,
            project.updated_at,
            project.last_opened_at,
        ],
    )?;

    Ok(conn.last_insert_rowid())
}

/// Get a project by ID
pub fn get_project_by_id(conn: &Connection, id: i64) -> Result<Option<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, timeline_json, created_at, updated_at, last_opened_at
         FROM projects WHERE id = ?1",
    )?;

    let project = stmt.query_row([id], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            timeline_json: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            last_opened_at: row.get(5)?,
        })
    });

    match project {
        Ok(p) => Ok(Some(p)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Get all projects
pub fn get_all_projects(conn: &Connection) -> Result<Vec<Project>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, timeline_json, created_at, updated_at, last_opened_at
         FROM projects ORDER BY updated_at DESC",
    )?;

    let project_iter = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            timeline_json: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
            last_opened_at: row.get(5)?,
        })
    })?;

    let mut project_list = Vec::new();
    for project in project_iter {
        project_list.push(project?);
    }

    Ok(project_list)
}

/// Update a project
pub fn update_project(conn: &Connection, project: &Project) -> Result<usize> {
    let id = project.id.ok_or_else(|| {
        rusqlite::Error::InvalidParameterName("Project ID is required for update".to_string())
    })?;

    let updated_at = chrono::Utc::now().to_rfc3339();

    conn.execute(
        "UPDATE projects SET name = ?1, timeline_json = ?2, updated_at = ?3, last_opened_at = ?4
         WHERE id = ?5",
        params![
            project.name,
            project.timeline_json,
            updated_at,
            project.last_opened_at,
            id,
        ],
    )
}

/// Delete a project by ID
pub fn delete_project(conn: &Connection, id: i64) -> Result<usize> {
    conn.execute("DELETE FROM projects WHERE id = ?1", [id])
}
