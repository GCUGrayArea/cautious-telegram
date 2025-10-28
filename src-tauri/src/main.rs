// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod ffmpeg;
mod export;

#[cfg(test)]
mod tests;

use database::Database;
use ffmpeg::commands::FFmpegState;
use std::sync::Arc;

/// Application state that holds the database connection
pub struct AppState {
    pub db: Arc<Database>,
}

fn main() {
    // Initialize database
    let db_path = Database::get_db_path().expect("Failed to get database path");
    println!("Database path: {:?}", db_path);

    let db = Database::new(db_path).expect("Failed to initialize database");
    println!("Database initialized successfully");

    let app_state = AppState { db: Arc::new(db) };

    // Initialize FFmpeg state
    let ffmpeg_state = FFmpegState::new();

    tauri::Builder::default()
        .manage(app_state)
        .manage(ffmpeg_state)
        .invoke_handler(tauri::generate_handler![
            ffmpeg::commands::ffmpeg_probe,
            ffmpeg::commands::ffmpeg_generate_thumbnail,
            ffmpeg::commands::ffmpeg_trim_video,
            ffmpeg::commands::ffmpeg_concat_videos,
            commands::import::import_video,
            commands::import::get_media_library,
            commands::import::delete_media_item,
            commands::recording::save_recording,
            commands::recording::import_recording,
            commands::export::export_timeline,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
