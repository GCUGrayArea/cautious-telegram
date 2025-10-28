use crate::database::models::Media;
use crate::database::operations::{get_all_media, insert_media};
use crate::ffmpeg::commands::FFmpegState;
use crate::ffmpeg::metadata::VideoMetadata;
use crate::AppState;
use std::path::{Path, PathBuf};
use tauri::State;

#[derive(Debug, serde::Serialize)]
pub struct ImportResult {
    pub success: bool,
    pub media: Option<Media>,
    pub error: Option<String>,
}

/// Import a video file: extract metadata, generate thumbnail, save to database
#[tauri::command]
pub async fn import_video(
    video_path: String,
    duration_override: Option<f64>,
    app_state: State<'_, AppState>,
    ffmpeg_state: State<'_, FFmpegState>,
) -> Result<ImportResult, String> {
    println!("Importing video: {}", video_path);

    // Validate file exists
    let path = Path::new(&video_path);
    if !path.exists() {
        return Ok(ImportResult {
            success: false,
            media: None,
            error: Some("File does not exist".to_string()),
        });
    }

    // Extract filename
    let filename = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    // Get file size
    let file_size = std::fs::metadata(&video_path)
        .map(|m| m.len() as i64)
        .ok();

    // Probe video metadata using FFmpeg
    let wrapper = match ffmpeg_state.get_wrapper() {
        Ok(w) => w,
        Err(e) => {
            return Ok(ImportResult {
                success: false,
                media: None,
                error: Some(format!("FFmpeg initialization failed: {}", e)),
            });
        }
    };

    let metadata_result = wrapper.probe(&video_path);
    let metadata: Option<VideoMetadata> = match metadata_result {
        Ok(m) => Some(m),
        Err(e) => {
            println!("Warning: Failed to probe video metadata: {}", e);
            None
        }
    };

    // Generate thumbnail
    let thumbnail_path = generate_thumbnail_path(&video_path);
    let thumbnail_result = wrapper.generate_thumbnail(&video_path, &thumbnail_path, 1.0);

    let thumbnail_path_opt = match thumbnail_result {
        Ok(_) => Some(thumbnail_path),
        Err(e) => {
            println!("Warning: Failed to generate thumbnail: {}", e);
            None
        }
    };

    // Create Media record
    let mut media = Media::new(video_path.clone(), filename);

    // Populate metadata if available
    if let Some(meta) = metadata {
        // Use duration override if provided and metadata duration is zero
        let duration = if meta.duration == 0.0 && duration_override.is_some() {
            let override_val = duration_override.unwrap();
            println!("DEBUG: FFprobe duration is 0.0, using override: {} seconds", override_val);
            override_val
        } else {
            println!("DEBUG: Using FFprobe duration: {} seconds", meta.duration);
            meta.duration
        };

        println!("DEBUG: Final duration set to: {} seconds", duration);
        media.duration = Some(duration);
        media.width = Some(meta.width as i32);
        media.height = Some(meta.height as i32);
        media.format = Some(meta.codec);
        media.fps = Some(meta.fps);
        media.file_size = file_size;
        media.thumbnail_path = thumbnail_path_opt;
    } else {
        // If metadata extraction completely failed but we have duration override, use it
        if let Some(dur) = duration_override {
            media.duration = Some(dur);
        }
        media.file_size = file_size;
        media.thumbnail_path = thumbnail_path_opt;
    }

    // Insert into database
    let conn = app_state
        .db
        .conn
        .lock()
        .map_err(|e| format!("Database lock error: {}", e))?;

    let media_id = insert_media(&conn, &media)
        .map_err(|e| format!("Database insert error: {}", e))?;

    media.id = Some(media_id);

    Ok(ImportResult {
        success: true,
        media: Some(media),
        error: None,
    })
}

/// Get all media from the library
#[tauri::command]
pub async fn get_media_library(app_state: State<'_, AppState>) -> Result<Vec<Media>, String> {
    let conn = app_state
        .db
        .conn
        .lock()
        .map_err(|e| format!("Database lock error: {}", e))?;

    get_all_media(&conn).map_err(|e| format!("Database query error: {}", e))
}

/// Delete media from the library
#[tauri::command]
pub async fn delete_media_item(
    media_id: i64,
    app_state: State<'_, AppState>,
) -> Result<bool, String> {
    let conn = app_state
        .db
        .conn
        .lock()
        .map_err(|e| format!("Database lock error: {}", e))?;

    crate::database::operations::delete_media(&conn, media_id)
        .map(|_| true)
        .map_err(|e| format!("Database delete error: {}", e))
}

/// Generate a thumbnail file path based on the video path
fn generate_thumbnail_path(video_path: &str) -> String {
    let path = Path::new(video_path);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("video");

    // Get app data directory for storing thumbnails
    let app_data = tauri::api::path::app_data_dir(&tauri::Config::default())
        .unwrap_or_else(|| PathBuf::from("."));

    let thumbnails_dir = app_data.join("thumbnails");

    // Create thumbnails directory if it doesn't exist
    std::fs::create_dir_all(&thumbnails_dir).ok();

    let thumbnail_filename = format!("{}_thumb.jpg", stem);
    thumbnails_dir
        .join(thumbnail_filename)
        .to_str()
        .unwrap_or("thumbnail.jpg")
        .to_string()
}
