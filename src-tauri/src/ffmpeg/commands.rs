// Tauri commands for FFmpeg operations
use super::{FFmpegWrapper, VideoMetadata};
use tauri::State;
use std::sync::Mutex;

/// Global FFmpeg wrapper instance (lazily initialized)
pub struct FFmpegState {
    pub wrapper: Mutex<Option<FFmpegWrapper>>,
}

impl FFmpegState {
    pub fn new() -> Self {
        Self {
            wrapper: Mutex::new(None),
        }
    }

    /// Get or initialize the FFmpeg wrapper
    fn get_wrapper(&self) -> Result<FFmpegWrapper, String> {
        let mut wrapper_guard = self.wrapper.lock().unwrap();

        if wrapper_guard.is_none() {
            // Initialize FFmpeg wrapper
            let wrapper = FFmpegWrapper::new()?;
            *wrapper_guard = Some(wrapper);
        }

        // Clone the wrapper (cheap operation, just paths)
        Ok(FFmpegWrapper::new()?)
    }
}

/// Probe a video file and return metadata
#[tauri::command]
pub fn ffmpeg_probe(state: State<FFmpegState>, video_path: String) -> Result<VideoMetadata, String> {
    let wrapper = state.get_wrapper()?;
    wrapper.probe(&video_path)
}

/// Generate a thumbnail from a video at a specific timestamp
#[tauri::command]
pub fn ffmpeg_generate_thumbnail(
    state: State<FFmpegState>,
    video_path: String,
    output_path: String,
    timestamp: f64,
) -> Result<(), String> {
    let wrapper = state.get_wrapper()?;
    wrapper.generate_thumbnail(&video_path, &output_path, timestamp)
}

/// Trim a video from start_time to end_time (in seconds)
#[tauri::command]
pub fn ffmpeg_trim_video(
    state: State<FFmpegState>,
    input_path: String,
    output_path: String,
    start_time: f64,
    end_time: f64,
) -> Result<(), String> {
    let wrapper = state.get_wrapper()?;
    wrapper.trim_video(&input_path, &output_path, start_time, end_time)
}

/// Concatenate multiple videos into a single output file
#[tauri::command]
pub fn ffmpeg_concat_videos(
    state: State<FFmpegState>,
    input_paths: Vec<String>,
    output_path: String,
) -> Result<(), String> {
    let wrapper = state.get_wrapper()?;
    wrapper.concat_videos(&input_paths, &output_path)
}
