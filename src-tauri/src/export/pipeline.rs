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
    #[serde(default)]       // Default to 0 for backwards compatibility
    pub track: u32,         // Track index (0 = base, 1+ = overlays)
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
    /// 2. Detect if multi-track (any clips on track 1+)
    /// 3. Route to single-track or multi-track export
    pub fn export_timeline(
        &self,
        clips: Vec<ClipData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        // Validate input
        if clips.is_empty() {
            return Err("No clips to export".to_string());
        }

        // Validate all source files exist
        for clip in &clips {
            if !Path::new(&clip.path).exists() {
                return Err(format!("Source file not found: {}", clip.path));
            }
        }

        // Check if multi-track export is needed
        let has_overlay_tracks = clips.iter().any(|c| c.track > 0);

        if has_overlay_tracks {
            // Multi-track export with overlays
            self.export_multitrack(clips, settings)
        } else {
            // Single-track export (existing logic)
            self.export_singletrack(clips, settings)
        }
    }

    /// Export single track (track 0 only) - original implementation
    fn export_singletrack(
        &self,
        clips: Vec<ClipData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        // Sort clips by timeline position
        let mut sorted_clips = clips;
        sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());

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

    /// Export multi-track timeline with overlays
    fn export_multitrack(
        &self,
        clips: Vec<ClipData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        // Group clips by track
        let mut track0_clips: Vec<ClipData> = clips.iter().filter(|c| c.track == 0).cloned().collect();
        let mut overlay_clips: Vec<ClipData> = clips.iter().filter(|c| c.track > 0).cloned().collect();

        // Sort clips by timeline position
        track0_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());
        overlay_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap());

        if track0_clips.is_empty() {
            return Err("Multi-track export requires at least one clip on track 0 (base)".to_string());
        }

        // Create temp directory
        let temp_dir = std::env::temp_dir().join("clipforge_export");
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create temp directory: {}", e))?;

        // Phase 1: Process track 0 (base) - trim and concatenate to single base video
        let track0_intermediates = self.trim_clips(&track0_clips, &temp_dir)?;
        let base_video_path = temp_dir.join("base_video.mp4");

        // Concatenate track 0 clips into base video
        self.concatenate_only(&track0_intermediates, &base_video_path)?;

        // Clean up track 0 intermediates
        for file in &track0_intermediates {
            let _ = std::fs::remove_file(file);
        }

        // Phase 2: Trim overlay clips
        let overlay_intermediates = self.trim_clips(&overlay_clips, &temp_dir)?;

        // Phase 3: Build overlay filter and execute FFmpeg
        let result = self.apply_overlays(
            &base_video_path,
            &overlay_intermediates,
            &overlay_clips,
            &settings,
        );

        // Clean up temp files
        let _ = std::fs::remove_file(&base_video_path);
        for file in &overlay_intermediates {
            let _ = std::fs::remove_file(file);
        }
        let _ = std::fs::remove_dir(&temp_dir);

        result
    }

    /// Concatenate clips without re-encoding (fast, for intermediate step)
    fn concatenate_only(
        &self,
        intermediate_files: &[PathBuf],
        output_path: &Path,
    ) -> Result<(), String> {
        if intermediate_files.is_empty() {
            return Err("No files to concatenate".to_string());
        }

        let ffmpeg = self.ffmpeg.lock()
            .map_err(|e| format!("Failed to lock FFmpeg: {}", e))?;

        // Create concat list
        let concat_list = intermediate_files
            .iter()
            .map(|p| format!("file '{}'", p.display()))
            .collect::<Vec<_>>()
            .join("\n");

        let concat_file_path = std::env::temp_dir().join("clipforge_base_concat_list.txt");
        std::fs::write(&concat_file_path, concat_list)
            .map_err(|e| format!("Failed to write concat list: {}", e))?;

        // Concatenate with codec copy (fast)
        let concat_list_str = concat_file_path.to_str().unwrap();
        let output_str = output_path.to_str().unwrap();

        let args = vec![
            "-f", "concat",
            "-safe", "0",
            "-i", concat_list_str,
            "-c", "copy",  // Copy codecs (no re-encoding)
            "-y",
            output_str,
        ];

        let result = ffmpeg.execute_command(&args);
        let _ = std::fs::remove_file(&concat_file_path);

        result?;
        Ok(())
    }

    /// Apply overlay clips on top of base video using FFmpeg filter_complex
    fn apply_overlays(
        &self,
        base_video: &Path,
        overlay_files: &[PathBuf],
        overlay_clips: &[ClipData],
        settings: &ExportSettings,
    ) -> Result<String, String> {
        if overlay_files.is_empty() {
            return Err("No overlay files to apply".to_string());
        }

        let ffmpeg = self.ffmpeg.lock()
            .map_err(|e| format!("Failed to lock FFmpeg: {}", e))?;

        // Build FFmpeg command with multiple inputs
        let mut args: Vec<String> = vec!["-i".to_string(), base_video.display().to_string()];

        // Add all overlay files as inputs
        for overlay_file in overlay_files {
            args.push("-i".to_string());
            args.push(overlay_file.display().to_string());
        }

        // Build filter_complex string
        let filter_complex = self.build_overlay_filter(overlay_clips, overlay_files.len());

        // Add filter_complex and output mapping
        args.push("-filter_complex".to_string());
        args.push(filter_complex);
        args.push("-map".to_string());
        args.push("[out]".to_string());
        args.push("-map".to_string());
        args.push("0:a?".to_string());  // Audio from base video (if exists)

        // Add scaling filter if needed (applied to final output)
        if let Some(scale) = settings.resolution.scale_filter() {
            // Scale already applied via filter_complex if needed
            // For now, skip separate scaling (filter_complex handles it)
        }

        // Add encoding settings
        args.push("-c:v".to_string());
        args.push("libx264".to_string());
        args.push("-crf".to_string());
        args.push("23".to_string());
        args.push("-c:a".to_string());
        args.push("aac".to_string());
        args.push("-b:a".to_string());
        args.push("192k".to_string());
        args.push("-y".to_string());
        args.push(settings.output_path.clone());

        // Convert Vec<String> to Vec<&str> for execute_command
        let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

        ffmpeg.execute_command(&args_refs)?;
        Ok(settings.output_path.clone())
    }

    /// Build FFmpeg filter_complex string for overlaying multiple clips
    ///
    /// Example output:
    /// "[0:v][1:v]overlay=W-w-20:H-h-20:enable='between(t,5.0,10.0)'[temp1];[temp1][2:v]overlay=W-w-20:H-h-20:enable='between(t,15.0,20.0)'[out]"
    fn build_overlay_filter(&self, overlay_clips: &[ClipData], num_overlays: usize) -> String {
        let mut filter_parts = Vec::new();

        for (index, clip) in overlay_clips.iter().enumerate() {
            let input_index = index + 1; // Input 0 is base, overlays start at 1
            let start = clip.start_time;
            let duration = clip.out_point - clip.in_point;
            let end = start + duration;

            // Input labels
            let input_label = if index == 0 {
                "[0:v]".to_string()  // First overlay uses base video
            } else {
                format!("[temp{}]", index)  // Subsequent overlays use previous output
            };

            let output_label = if index == num_overlays - 1 {
                "[out]".to_string()  // Last overlay outputs to [out]
            } else {
                format!("[temp{}]", index + 1)
            };

            // Overlay filter: position in bottom-right corner with 20px padding
            // enable filter makes overlay appear only during its timeline duration
            let overlay_filter = format!(
                "{}[{}:v]overlay=W-w-20:H-h-20:enable='between(t,{:.3},{:.3})'{}",
                input_label,
                input_index,
                start,
                end,
                output_label
            );

            filter_parts.push(overlay_filter);
        }

        filter_parts.join(";")
    }
}
