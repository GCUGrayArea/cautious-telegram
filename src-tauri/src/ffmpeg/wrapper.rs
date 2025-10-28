// FFmpeg wrapper for executing FFmpeg and FFprobe commands
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

use super::metadata::VideoMetadata;

/// Progress tracking for export operations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportProgress {
    pub percentage: f64,          // 0.0 to 100.0
    pub current_operation: String, // "Trimming clips", "Encoding video", etc.
    pub eta_seconds: Option<u64>,  // Estimated time remaining
}

pub struct FFmpegWrapper {
    ffmpeg_path: PathBuf,
    ffprobe_path: PathBuf,
    progress: Arc<Mutex<ExportProgress>>,
}

impl FFmpegWrapper {
    /// Create a new FFmpegWrapper by resolving binary paths
    /// In development: looks for binaries in src-tauri/binaries/
    /// In production: uses Tauri sidecar binaries
    pub fn new() -> Result<Self, String> {
        // Try to resolve as Tauri sidecar first (production)
        let ffmpeg_path = Self::resolve_binary_path("ffmpeg")?;
        let ffprobe_path = Self::resolve_binary_path("ffprobe")?;

        Ok(Self {
            ffmpeg_path,
            ffprobe_path,
            progress: Arc::new(Mutex::new(ExportProgress {
                percentage: 0.0,
                current_operation: "Ready".to_string(),
                eta_seconds: None,
            })),
        })
    }

    /// Get current export progress
    pub fn get_progress(&self) -> ExportProgress {
        self.progress.lock()
            .map(|p| p.clone())
            .unwrap_or(ExportProgress {
                percentage: 0.0,
                current_operation: "Unknown".to_string(),
                eta_seconds: None,
            })
    }

    /// Update export progress (internal use)
    pub fn set_progress(&self, percentage: f64, operation: String, eta: Option<u64>) {
        if let Ok(mut progress) = self.progress.lock() {
            progress.percentage = percentage;
            progress.current_operation = operation;
            progress.eta_seconds = eta;
        }
    }

    /// Reset progress to initial state
    pub fn reset_progress(&self) {
        self.set_progress(0.0, "Ready".to_string(), None);
    }

    /// Resolve binary path for FFmpeg or FFprobe
    /// Tries multiple strategies: sidecar, local binaries, system PATH
    fn resolve_binary_path(binary_name: &str) -> Result<PathBuf, String> {
        // Strategy 1: Check local binaries directory (development)
        let local_path = if cfg!(target_os = "windows") {
            PathBuf::from(format!("src-tauri/binaries/{}.exe", binary_name))
        } else {
            PathBuf::from(format!("src-tauri/binaries/{}", binary_name))
        };

        if local_path.exists() {
            return Ok(local_path);
        }

        // Strategy 2: Check in current directory (development alternative)
        let current_dir_path = if cfg!(target_os = "windows") {
            PathBuf::from(format!("{}.exe", binary_name))
        } else {
            PathBuf::from(binary_name)
        };

        if current_dir_path.exists() {
            return Ok(current_dir_path);
        }

        // Strategy 3: Assume it's on system PATH (fallback)
        // This will fail if binary is not found, but Command will handle that
        Ok(PathBuf::from(binary_name))
    }

    /// Probe a video file and extract metadata using ffprobe
    pub fn probe(&self, video_path: &str) -> Result<VideoMetadata, String> {
        let output = Command::new(&self.ffprobe_path)
            .args(&[
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_format",
                "-show_streams",
                video_path,
            ])
            .output()
            .map_err(|e| format!("Failed to execute ffprobe: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFprobe failed: {}", stderr));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        VideoMetadata::from_ffprobe_json(&stdout)
    }

    /// Generate a thumbnail from a video at a specific timestamp
    /// timestamp: Time in seconds (e.g., 5.0 for 5 seconds into the video)
    pub fn generate_thumbnail(
        &self,
        video_path: &str,
        output_path: &str,
        timestamp: f64,
    ) -> Result<(), String> {
        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-ss",
                &timestamp.to_string(),
                "-i",
                video_path,
                "-vframes",
                "1",
                "-vf",
                "scale=320:-1", // Scale to 320px width, maintain aspect ratio
                "-y",            // Overwrite output file if exists
                output_path,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg thumbnail generation failed: {}", stderr));
        }

        Ok(())
    }

    /// Trim a video from start_time to end_time (in seconds)
    pub fn trim_video(
        &self,
        input_path: &str,
        output_path: &str,
        start_time: f64,
        end_time: f64,
    ) -> Result<(), String> {
        let duration = end_time - start_time;

        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-ss",
                &start_time.to_string(),
                "-i",
                input_path,
                "-t",
                &duration.to_string(),
                "-c",
                "copy", // Copy codec (fast, no re-encoding)
                "-y",
                output_path,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg trim failed: {}", stderr));
        }

        Ok(())
    }

    /// Concatenate multiple videos into a single output file
    /// Uses FFmpeg concat protocol for fast concatenation
    pub fn concat_videos(&self, input_paths: &[String], output_path: &str) -> Result<(), String> {
        if input_paths.is_empty() {
            return Err("No input videos provided for concatenation".to_string());
        }

        // Create a temporary concat file list
        // Format: file 'path/to/video1.mp4'\nfile 'path/to/video2.mp4'
        let concat_list = input_paths
            .iter()
            .map(|p| format!("file '{}'", p))
            .collect::<Vec<_>>()
            .join("\n");

        // Write concat list to temp file
        let concat_file_path = "concat_list.txt";
        std::fs::write(concat_file_path, concat_list)
            .map_err(|e| format!("Failed to write concat list: {}", e))?;

        let output = Command::new(&self.ffmpeg_path)
            .args(&[
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_file_path,
                "-c",
                "copy",
                "-y",
                output_path,
            ])
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

        // Clean up temp file
        let _ = std::fs::remove_file(concat_file_path);

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg concatenation failed: {}", stderr));
        }

        Ok(())
    }

    /// Execute a custom FFmpeg command with arbitrary arguments
    /// Useful for complex operations not covered by other methods
    pub fn execute_command(&self, args: &[&str]) -> Result<String, String> {
        let output = Command::new(&self.ffmpeg_path)
            .args(args)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .output()
            .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg command failed: {}", stderr));
        }

        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    }
}
