/// Integration tests for video export workflow
///
/// Tests the full export pipeline: timeline data → FFmpeg processing → output MP4

#[cfg(test)]
mod tests {
    use crate::export::{ExportPipeline, ExportSettings};
    use crate::export::encoder::Resolution;
    use crate::export::pipeline::ClipData;
    use crate::ffmpeg::FFmpegWrapper;
    use std::path::PathBuf;
    use std::sync::{Arc, Mutex};

    /// Test fixture path for test video
    fn get_test_video_path() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .join("src/tests/fixtures/test_video_2s.mp4")
    }

    /// Get temp output path for test exports
    fn get_test_output_path(name: &str) -> PathBuf {
        std::env::temp_dir().join(format!("clipforge_test_{}.mp4", name))
    }

    #[test]
    fn test_export_single_clip() {
        let test_video = get_test_video_path();
        assert!(test_video.exists(), "Test fixture must exist");

        let output_path = get_test_output_path("single_clip");

        // Clean up any previous test output
        let _ = std::fs::remove_file(&output_path);

        // Create clip data (2-second clip, no trimming)
        let clips = vec![ClipData {
            id: 1,
            path: test_video.to_str().unwrap().to_string(),
            in_point: 0.0,
            out_point: 2.0,
            start_time: 0.0,
            track: 0,
        }];

        // Export settings (source resolution)
        let settings = ExportSettings {
            resolution: Resolution::Source,
            output_path: output_path.to_str().unwrap().to_string(),
        };

        // Create export pipeline
        let ffmpeg = Arc::new(Mutex::new(
            FFmpegWrapper::new().expect("Failed to create FFmpeg wrapper")
        ));
        let pipeline = ExportPipeline::new(ffmpeg);

        // Execute export
        let result = pipeline.export_timeline(clips, settings);

        // Verify export succeeded
        assert!(result.is_ok(), "Export should succeed: {:?}", result.err());

        // Verify output file exists
        assert!(output_path.exists(), "Output file should exist");

        // Verify output file is not empty
        let metadata = std::fs::metadata(&output_path).expect("Should get file metadata");
        assert!(metadata.len() > 0, "Output file should not be empty");

        // Clean up
        let _ = std::fs::remove_file(&output_path);
    }

    #[test]
    fn test_export_trimmed_clip() {
        let test_video = get_test_video_path();
        assert!(test_video.exists());

        let output_path = get_test_output_path("trimmed_clip");
        let _ = std::fs::remove_file(&output_path);

        // Create clip data (trim to 1 second: 0.5s to 1.5s)
        let clips = vec![ClipData {
            id: 1,
            path: test_video.to_str().unwrap().to_string(),
            in_point: 0.5,
            out_point: 1.5,
            start_time: 0.0,
            track: 0,
        }];

        let settings = ExportSettings {
            resolution: Resolution::Source,
            output_path: output_path.to_str().unwrap().to_string(),
        };

        let ffmpeg = Arc::new(Mutex::new(FFmpegWrapper::new().unwrap()));
        let pipeline = ExportPipeline::new(ffmpeg);

        let result = pipeline.export_timeline(clips, settings);
        assert!(result.is_ok(), "Trimmed export should succeed: {:?}", result.err());
        assert!(output_path.exists());

        // Clean up
        let _ = std::fs::remove_file(&output_path);
    }

    #[test]
    fn test_export_multiple_clips() {
        let test_video = get_test_video_path();
        assert!(test_video.exists());

        let output_path = get_test_output_path("multi_clip");
        let _ = std::fs::remove_file(&output_path);

        // Create two clips concatenated (total 4 seconds)
        let clips = vec![
            ClipData {
                id: 1,
                path: test_video.to_str().unwrap().to_string(),
                in_point: 0.0,
                out_point: 2.0,
                start_time: 0.0,
                track: 0,
            },
            ClipData {
                id: 2,
                path: test_video.to_str().unwrap().to_string(),
                in_point: 0.0,
                out_point: 2.0,
                start_time: 2.0,
                track: 0,
            },
        ];

        let settings = ExportSettings {
            resolution: Resolution::Source,
            output_path: output_path.to_str().unwrap().to_string(),
        };

        let ffmpeg = Arc::new(Mutex::new(FFmpegWrapper::new().unwrap()));
        let pipeline = ExportPipeline::new(ffmpeg);

        let result = pipeline.export_timeline(clips, settings);
        assert!(result.is_ok(), "Multi-clip export should succeed: {:?}", result.err());
        assert!(output_path.exists());

        // Verify output is larger than single clip (rough check)
        let metadata = std::fs::metadata(&output_path).unwrap();
        assert!(metadata.len() > 10000, "Multi-clip export should produce larger file");

        // Clean up
        let _ = std::fs::remove_file(&output_path);
    }

    #[test]
    fn test_export_720p_resolution() {
        let test_video = get_test_video_path();
        assert!(test_video.exists());

        let output_path = get_test_output_path("720p");
        let _ = std::fs::remove_file(&output_path);

        let clips = vec![ClipData {
            id: 1,
            path: test_video.to_str().unwrap().to_string(),
            in_point: 0.0,
            out_point: 2.0,
            start_time: 0.0,
            track: 0,
        }];

        // Export with 720p resolution
        let settings = ExportSettings {
            resolution: Resolution::HD720,
            output_path: output_path.to_str().unwrap().to_string(),
        };

        let ffmpeg = Arc::new(Mutex::new(FFmpegWrapper::new().unwrap()));
        let pipeline = ExportPipeline::new(ffmpeg);

        let result = pipeline.export_timeline(clips, settings);
        assert!(result.is_ok(), "720p export should succeed: {:?}", result.err());
        assert!(output_path.exists());

        // Verify output with FFmpeg probe
        let wrapper = FFmpegWrapper::new().unwrap();
        let metadata = wrapper.probe(output_path.to_str().unwrap())
            .expect("Should probe exported video");

        assert_eq!(metadata.width, 1280, "Output should be 1280 width (720p)");
        assert_eq!(metadata.height, 720, "Output should be 720 height");

        // Clean up
        let _ = std::fs::remove_file(&output_path);
    }

    #[test]
    fn test_export_empty_timeline() {
        let output_path = get_test_output_path("empty");
        let _ = std::fs::remove_file(&output_path);

        // Empty clips array
        let clips = vec![];

        let settings = ExportSettings {
            resolution: Resolution::Source,
            output_path: output_path.to_str().unwrap().to_string(),
        };

        let ffmpeg = Arc::new(Mutex::new(FFmpegWrapper::new().unwrap()));
        let pipeline = ExportPipeline::new(ffmpeg);

        let result = pipeline.export_timeline(clips, settings);

        // Should fail with empty timeline
        assert!(result.is_err(), "Export with no clips should fail");
        assert!(result.unwrap_err().contains("No clips"), "Error should mention no clips");
    }

    #[test]
    fn test_export_invalid_clip_path() {
        let output_path = get_test_output_path("invalid");
        let _ = std::fs::remove_file(&output_path);

        // Clip with nonexistent source file
        let clips = vec![ClipData {
            id: 1,
            path: "/nonexistent/video.mp4".to_string(),
            in_point: 0.0,
            out_point: 2.0,
            start_time: 0.0,
            track: 0,
        }];

        let settings = ExportSettings {
            resolution: Resolution::Source,
            output_path: output_path.to_str().unwrap().to_string(),
        };

        let ffmpeg = Arc::new(Mutex::new(FFmpegWrapper::new().unwrap()));
        let pipeline = ExportPipeline::new(ffmpeg);

        let result = pipeline.export_timeline(clips, settings);

        // Should fail due to missing source file
        assert!(result.is_err(), "Export with invalid source should fail");
    }

    #[test]
    fn test_multitrack_export() {
        let test_video = get_test_video_path();
        assert!(test_video.exists());

        let output_path = get_test_output_path("multitrack");
        let _ = std::fs::remove_file(&output_path);

        // Create clips on different tracks (track 0 = base, track 1 = overlay)
        let clips = vec![
            ClipData {
                id: 1,
                path: test_video.to_str().unwrap().to_string(),
                in_point: 0.0,
                out_point: 2.0,
                start_time: 0.0,
                track: 0, // Base track
            },
            ClipData {
                id: 2,
                path: test_video.to_str().unwrap().to_string(),
                in_point: 0.0,
                out_point: 1.0,
                start_time: 0.5,
                track: 1, // Overlay track
            },
        ];

        let settings = ExportSettings {
            resolution: Resolution::Source,
            output_path: output_path.to_str().unwrap().to_string(),
        };

        let ffmpeg = Arc::new(Mutex::new(FFmpegWrapper::new().unwrap()));
        let pipeline = ExportPipeline::new(ffmpeg);

        let result = pipeline.export_timeline(clips, settings);
        assert!(result.is_ok(), "Multi-track export should succeed: {:?}", result.err());
        assert!(output_path.exists());

        // Clean up
        let _ = std::fs::remove_file(&output_path);
    }
}
