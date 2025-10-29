use crate::database::operations;
use crate::AppState;
use tauri::State;

/// Save project timeline state
#[tauri::command]
pub fn save_project(
    state: State<'_, AppState>,
    project_id: i64,
    timeline_json: String,
) -> Result<bool, String> {
    let db_conn = state.db.get_connection();

    // Parse the JSON to ensure it's valid
    let _timeline_data: serde_json::Value =
        serde_json::from_str(&timeline_json).map_err(|e| e.to_string())?;

    // Fetch existing project
    let mut project = operations::get_project_by_id(&db_conn, project_id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| format!("Project with ID {} not found", project_id))?;

    // Update project timeline
    project.timeline_json = Some(timeline_json);
    project.updated_at = chrono::Utc::now().to_rfc3339();
    project.last_opened_at = Some(chrono::Utc::now().to_rfc3339());

    // Save to database
    operations::update_project(&db_conn, &project).map_err(|e| e.to_string())?;

    println!(
        "✅ Project {} auto-saved at {}",
        project_id, project.updated_at
    );

    Ok(true)
}

/// Load project timeline state
#[tauri::command]
pub fn load_project(
    state: State<'_, AppState>,
    project_id: i64,
) -> Result<Option<String>, String> {
    let db_conn = state.db.get_connection();

    let project = operations::get_project_by_id(&db_conn, project_id)
        .map_err(|e| e.to_string())?;

    match project {
        Some(proj) => Ok(proj.timeline_json),
        None => Ok(None),
    }
}

/// Create a new project
#[tauri::command]
pub fn create_project(
    state: State<'_, AppState>,
    name: String,
) -> Result<i64, String> {
    use crate::database::models::Project;

    let db_conn = state.db.get_connection();

    let now = chrono::Utc::now().to_rfc3339();
    let empty_timeline = serde_json::json!({
        "clips": [],
        "playhead_time": 0,
        "pixels_per_second": 30
    });

    let project = Project {
        id: None,
        name: name.clone(),
        timeline_json: Some(empty_timeline.to_string()),
        created_at: now.clone(),
        updated_at: now.clone(),
        last_opened_at: Some(now),
    };

    let project_id = operations::insert_project(&db_conn, &project).map_err(|e| e.to_string())?;

    println!("✅ Created new project: {} (ID: {})", name, project_id);

    Ok(project_id)
}

/// Get or create a default project
#[tauri::command]
pub fn get_or_create_default_project(
    state: State<'_, AppState>,
) -> Result<i64, String> {
    use crate::database::models::Project;

    let db_conn = state.db.get_connection();

    // Try to get project with ID 1 (reserved for default)
    if let Ok(Some(_project)) = operations::get_project_by_id(&db_conn, 1) {
        return Ok(1);
    }

    // Create default project
    let now = chrono::Utc::now().to_rfc3339();
    let empty_timeline = serde_json::json!({
        "clips": [],
        "playhead_time": 0,
        "pixels_per_second": 30
    });

    let project = Project {
        id: Some(1),
        name: "Default Project".to_string(),
        timeline_json: Some(empty_timeline.to_string()),
        created_at: now.clone(),
        updated_at: now.clone(),
        last_opened_at: Some(now),
    };

    let _project_id =
        operations::insert_project(&db_conn, &project).map_err(|e| e.to_string())?;

    println!("✅ Created default project (ID: 1)");

    Ok(1)
}
