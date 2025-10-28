use crate::commands::import::{import_video, ImportResult};
use crate::ffmpeg::commands::FFmpegState;
use crate::AppState;
use std::fs;
use tauri::State;

/// Saves a recording blob to the temp directory and returns the file path
///
/// # Arguments
/// * `blob_data` - The video blob data as bytes
/// * `filename` - The filename to save (e.g., "recording_20251027_143022.webm")
///
/// # Returns
/// * `Result<String, String>` - The full file path on success, error message on failure
#[tauri::command]
pub async fn save_recording(blob_data: Vec<u8>, filename: String) -> Result<String, String> {
    // Get the system temp directory
    let temp_dir = std::env::temp_dir();
    let recordings_dir = temp_dir.join("ClipForge").join("recordings");

    // Create recordings directory if it doesn't exist
    fs::create_dir_all(&recordings_dir)
        .map_err(|e| format!("Failed to create recordings directory: {}", e))?;

    // Build the full file path
    let file_path = recordings_dir.join(&filename);

    // Write the blob data to file
    fs::write(&file_path, blob_data)
        .map_err(|e| format!("Failed to write recording file: {}", e))?;

    // Return the absolute path as a string
    file_path
        .to_str()
        .ok_or_else(|| "Failed to convert path to string".to_string())
        .map(|s| s.to_string())
}

/// Imports a saved recording into the media library
///
/// # Arguments
/// * `file_path` - The path to the recording file
/// * `duration_override` - Optional duration in seconds to use if FFprobe fails
/// * `app_state` - The application state containing the database
/// * `ffmpeg_state` - The FFmpeg state for metadata extraction
///
/// # Returns
/// * `Result<ImportResult, String>` - The import result on success, error message on failure
#[tauri::command]
pub async fn import_recording(
    file_path: String,
    duration_override: Option<f64>,
    app_state: State<'_, AppState>,
    ffmpeg_state: State<'_, FFmpegState>,
) -> Result<ImportResult, String> {
    // Reuse the existing import_video command with duration override
    import_video(file_path, duration_override, app_state, ffmpeg_state).await
}
