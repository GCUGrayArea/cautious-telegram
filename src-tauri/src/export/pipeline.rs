// Export pipeline orchestration
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use serde::{Deserialize, Serialize};

use crate::ffmpeg::FFmpegWrapper;
use super::encoder::{ExportSettings, Resolution};

/// Clip data from timeline (sent from frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClipData {
    pub id: u32,
    pub path: String,       // Source video file path
    pub in_point: f64,      // Start time in source (seconds)
    pub out_point: f64,     // End time in source (seconds)
    pub start_time: f64,    // Position on timeline (for sorting)
}

/// Export pipeline for processing timeline clips into final video
pub struct ExportPipeline {
    ffmpeg: Arc<Mutex<FFmpegWrapper>>,
}

impl ExportPipeline {
    pub fn new(ffmpeg: Arc<Mutex<FFmpegWrapper>>) -> Self {
        Self { ffmpeg }
    }

    /// Export timeline to video file
    ///
    /// Process:
    /// 1. Validate clips and sort by timeline position
    /// 2. Trim each clip to intermediate files (respecting in/out points)
    /// 3. Concatenate intermediates
    /// 4. Re-encode to final output with resolution/quality settings
    /// 5. Clean up temporary files
    pub fn export_timeline(
        &self,
        clips: Vec<ClipData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        // Validate input
        if clips.is_empty() {
            return Err("No clips to export".to_string());
        }

        // Sort clips by timeline position
        let mut sorted_clips = clips;
        sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());

        // Validate all source files exist
        for clip in &sorted_clips {
            if !Path::new(&clip.path).exists() {
                return Err(format!("Source file not found: {}", clip.path));
            }
        }

        // Create temp directory for intermediate files
        let temp_dir = std::env::temp_dir().join("clipforge_export");
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create temp directory: {}", e))?;

        // Phase 1: Trim clips to intermediate files
        let intermediate_files = self.trim_clips(&sorted_clips, &temp_dir)?;

        // Phase 2: Concatenate and re-encode
        let result = self.concatenate_and_encode(&intermediate_files, &settings);

        // Clean up temp files
        for file in &intermediate_files {
            let _ = std::fs::remove_file(file);
        }
        let _ = std::fs::remove_dir(&temp_dir);

        result
    }

    /// Trim each clip to create intermediate files
    fn trim_clips(
        &self,
        clips: &[ClipData],
        temp_dir: &Path,
    ) -> Result<Vec<PathBuf>, String> {
        let ffmpeg = self.ffmpeg.lock()
            .map_err(|e| format!("Failed to lock FFmpeg: {}", e))?;

        let mut intermediate_files = Vec::new();

        for (index, clip) in clips.iter().enumerate() {
            let duration = clip.out_point - clip.in_point;

            if duration <= 0.0 {
                return Err(format!("Clip {} has invalid duration", clip.id));
            }

            // Create intermediate file path
            let intermediate_path = temp_dir.join(format!("clip_{}_trimmed.mp4", index));

            // Trim clip using FFmpeg
            ffmpeg.trim_video(
                &clip.path,
                intermediate_path.to_str().unwrap(),
                clip.in_point,
                clip.out_point,
            )?;

            intermediate_files.push(intermediate_path);
        }

        Ok(intermediate_files)
    }

    /// Concatenate intermediate files and re-encode with settings
    fn concatenate_and_encode(
        &self,
        intermediate_files: &[PathBuf],
        settings: &ExportSettings,
    ) -> Result<String, String> {
        if intermediate_files.is_empty() {
            return Err("No intermediate files to concatenate".to_string());
        }

        let ffmpeg = self.ffmpeg.lock()
            .map_err(|e| format!("Failed to lock FFmpeg: {}", e))?;

        // Create concat list file
        let concat_list = intermediate_files
            .iter()
            .map(|p| format!("file '{}'", p.display()))
            .collect::<Vec<_>>()
            .join("\n");

        let concat_file_path = std::env::temp_dir().join("clipforge_concat_list.txt");
        std::fs::write(&concat_file_path, concat_list)
            .map_err(|e| format!("Failed to write concat list: {}", e))?;

        // Build FFmpeg arguments
        let concat_list_str = concat_file_path.to_str().unwrap();
        let output_str = &settings.output_path;

        let mut args: Vec<&str> = vec![
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_str,
        ];

        // Add scaling filter if needed
        let scale_filter;
        if let Some(scale) = settings.resolution.scale_filter() {
            scale_filter = scale;
            args.push("-vf");
            args.push(&scale_filter);
        }

        // Add encoding settings
        args.extend(&[
            "-c:v", "libx264",
            "-crf", "23",           // High quality H.264
            "-c:a", "aac",
            "-b:a", "192k",         // AAC audio bitrate
            "-y",                   // Overwrite output
            output_str,
        ]);

        // Execute FFmpeg
        let result = ffmpeg.execute_command(&args);

        // Clean up concat list file
        let _ = std::fs::remove_file(&concat_file_path);

        result?;
        Ok(settings.output_path.clone())
    }
}
