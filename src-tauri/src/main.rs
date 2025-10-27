// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod database;

use database::Database;
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

    tauri::Builder::default()
        .manage(app_state)
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
