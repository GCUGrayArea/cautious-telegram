/// Integration tests for media import workflow
///
/// Tests the full import pipeline: file → metadata extraction → database save

#[cfg(test)]
mod tests {
    use crate::database::Database;
    use crate::ffmpeg::FFmpegWrapper;
    use std::path::PathBuf;
    use std::sync::{Arc, Mutex};

    /// Test fixture path for test video
    fn get_test_video_path() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src/tests/fixtures/test_video_2s.mp4")
    }

    #[test]
    fn test_fixture_exists() {
        let path = get_test_video_path();
        assert!(path.exists(), "Test fixture video should exist at {:?}", path);
    }

    #[test]
    fn test_metadata_extraction() {
        // Create FFmpeg wrapper
        let wrapper = FFmpegWrapper::new().expect("Failed to create FFmpeg wrapper");

        let video_path = get_test_video_path();
        assert!(video_path.exists(), "Test video must exist");

        // Extract metadata
        let metadata = wrapper.probe(video_path.to_str().unwrap())
            .expect("Failed to extract metadata");

        // Verify metadata fields
        assert!(metadata.duration > 0.0, "Duration should be positive");
        assert_eq!(metadata.width, 320, "Expected width 320");
        assert_eq!(metadata.height, 240, "Expected height 240");
        assert!(metadata.fps > 0.0, "FPS should be positive");
        assert!(!metadata.format.is_empty(), "Format should not be empty");
    }

    #[test]
    fn test_import_workflow_integration() {
        // Create in-memory database for testing
        let db = Database::new_in_memory().expect("Failed to create in-memory database");
        let db = Arc::new(Mutex::new(db));

        // Create FFmpeg wrapper
        let wrapper = Arc::new(Mutex::new(
            FFmpegWrapper::new().expect("Failed to create FFmpeg wrapper")
        ));

        let video_path = get_test_video_path();
        let video_path_str = video_path.to_str().unwrap();

        // Step 1: Extract metadata
        let metadata = {
            let ffmpeg = wrapper.lock().unwrap();
            ffmpeg.probe(video_path_str)
                .expect("Failed to probe video")
        };

        assert!(metadata.duration > 0.0);
        assert_eq!(metadata.width, 320);
        assert_eq!(metadata.height, 240);

        // Step 2: Prepare media entry
        use crate::database::models::Media;
        use crate::database::operations::insert_media;

        let filename = video_path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("test_video_2s.mp4")
            .to_string();

        let file_size = std::fs::metadata(&video_path)
            .map(|m| m.len() as i64)
            .ok();

        let media = Media {
            id: None,
            path: video_path_str.to_string(),
            filename,
            duration: Some(metadata.duration),
            width: Some(metadata.width as i32),
            height: Some(metadata.height as i32),
            file_size,
            format: Some(metadata.format.clone()),
            fps: Some(metadata.fps),
            thumbnail_path: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            metadata_json: None,
        };

        // Step 3: Insert into database
        let db_lock = db.lock().unwrap();
        let conn = db_lock.get_connection();
        let inserted_id = insert_media(&conn, &media)
            .expect("Failed to insert media");
        drop(conn);
        drop(db_lock);

        assert!(inserted_id > 0, "Inserted ID should be positive");

        // Step 4: Verify retrieval
        use crate::database::operations::get_media_by_id;
        let db_lock = db.lock().unwrap();
        let conn = db_lock.get_connection();
        let retrieved = get_media_by_id(&conn, inserted_id)
            .expect("Failed to retrieve media");

        assert!(retrieved.is_some(), "Should retrieve inserted media");
        let retrieved = retrieved.unwrap();

        assert_eq!(retrieved.path, video_path_str);
        assert_eq!(retrieved.duration, Some(metadata.duration));
        assert_eq!(retrieved.width, Some(320));
        assert_eq!(retrieved.height, Some(240));
        assert_eq!(retrieved.format, Some(metadata.format));
    }

    #[test]
    fn test_import_duplicate_path() {
        // Create in-memory database
        let db = Database::new_in_memory().expect("Failed to create database");
        let db = Arc::new(Mutex::new(db));

        let video_path = get_test_video_path();
        let video_path_str = video_path.to_str().unwrap();

        use crate::database::models::Media;
        use crate::database::operations::insert_media;

        let media = Media {
            id: None,
            path: video_path_str.to_string(),
            filename: "test.mp4".to_string(),
            duration: Some(2.0),
            width: Some(320),
            height: Some(240),
            file_size: Some(25000),
            format: Some("mp4".to_string()),
            fps: Some(1.0),
            thumbnail_path: None,
            created_at: chrono::Utc::now().to_rfc3339(),
            metadata_json: None,
        };

        // Insert first time - should succeed
        let db_lock = db.lock().unwrap();
        let conn = db_lock.get_connection();
        let result1 = insert_media(&conn, &media);
        drop(conn);
        drop(db_lock);
        assert!(result1.is_ok(), "First insert should succeed");

        // Insert again - should fail due to UNIQUE constraint on path
        let db_lock = db.lock().unwrap();
        let conn = db_lock.get_connection();
        let result2 = insert_media(&conn, &media);
        assert!(result2.is_err(), "Second insert should fail (duplicate path)");
    }

    #[test]
    fn test_import_nonexistent_file() {
        let wrapper = FFmpegWrapper::new().expect("Failed to create FFmpeg wrapper");

        let result = wrapper.probe("/nonexistent/path/video.mp4");
        assert!(result.is_err(), "Probing nonexistent file should fail");
    }
}
