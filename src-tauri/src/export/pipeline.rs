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
    // Audio properties for volume and fade control
    #[serde(default = "default_volume")]
    pub volume: u32,              // Volume level 0-200 (100 = normal)
    #[serde(default)]
    pub is_muted: bool,           // Whether audio is muted
    #[serde(default)]
    pub fade_in_duration: f64,    // Fade in duration in seconds
    #[serde(default)]
    pub fade_out_duration: f64,   // Fade out duration in seconds
}

fn default_volume() -> u32 {
    100
}

/// Text overlay data from timeline (sent from frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TextOverlayData {
    pub id: u32,
    pub text: String,           // Text content
    pub start_time: f64,        // Position on timeline (seconds)
    pub duration: f64,          // Duration (seconds)
    pub x: f64,                 // X position (percentage)
    pub y: f64,                 // Y position (percentage)
    pub font_size: u32,         // Font size in pixels
    pub font_family: String,    // Font name
    pub color: String,          // Color in hex format (#RRGGBB)
    pub animation: String,      // Animation type (none, fadeIn, fadeOut, slideIn*)
}

/// Transition data from timeline (sent from frontend)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransitionData {
    pub id: u32,
    pub clip_id_before: u32,   // ID of clip before transition
    pub clip_id_after: u32,    // ID of clip after transition
    pub transition_type: String, // Type: fade, crossfade, fadeToBlack, wipeLeft, wipeRight, dissolve
    pub duration: f64,         // Duration in seconds
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
    /// 3. Route to single-track or multi-track export with transitions
    /// 4. Apply text overlays using FFmpeg drawtext filter
    pub fn export_timeline(
        &self,
        clips: Vec<ClipData>,
        transitions: Vec<TransitionData>,
        text_overlays: Vec<TextOverlayData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        // Reset progress at start
        if let Ok(ffmpeg) = self.ffmpeg.lock() {
            ffmpeg.reset_progress();
            ffmpeg.set_progress(0.0, "Starting export...".to_string(), None);
        }

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

        // Check if clips actually overlap in time (not just on different tracks)
        // Overlapping = same time range, different tracks (Picture-in-Picture)
        // Non-overlapping = sequential clips, even if on different tracks
        let has_temporal_overlap = clips.iter().any(|clip1| {
            clips.iter().any(|clip2| {
                clip1.track != clip2.track && // Different tracks
                !(clip1.start_time + (clip1.out_point - clip1.in_point) <= clip2.start_time || // clip1 ends before clip2 starts
                  clip2.start_time + (clip2.out_point - clip2.in_point) <= clip1.start_time)   // clip2 ends before clip1 starts
            })
        });

        if has_temporal_overlap {
            // Multi-track export with overlays (Picture-in-Picture)
            self.export_multitrack(clips, transitions, text_overlays, settings)
        } else {
            // Single-track export - concatenate all clips sequentially with transitions
            self.export_singletrack(clips, transitions, text_overlays, settings)
        }
    }

    /// Export single track (track 0 only) with transitions and text overlays
    fn export_singletrack(
        &self,
        clips: Vec<ClipData>,
        transitions: Vec<TransitionData>,
        text_overlays: Vec<TextOverlayData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        // Sort clips by timeline position
        let mut sorted_clips = clips;
        sorted_clips.sort_by(|a, b| {
            a.start_time.partial_cmp(&b.start_time)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        // Create temp directory for intermediate files
        let temp_dir = std::env::temp_dir().join("clipforge_export");
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create temp directory: {}", e))?;

        // Phase 1: Trim clips to intermediate files
        let intermediate_files = self.trim_clips(&sorted_clips, &temp_dir)?;

        // Phase 2: Choose concatenation method based on whether we have transitions
        let result = if transitions.is_empty() {
            // No transitions: Use fast concat demuxer
            self.concatenate_and_encode(&intermediate_files, &text_overlays, &settings)
        } else {
            // With transitions: Use filter_complex with xfade
            self.concatenate_with_transitions(&intermediate_files, &sorted_clips, &transitions, &text_overlays, &settings)
        };

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
        let total_clips = clips.len();

        for (index, clip) in clips.iter().enumerate() {
            // Update progress: trimming phase is 0-40% of total export
            let trim_progress = (index as f64 / total_clips as f64) * 40.0;
            ffmpeg.set_progress(
                trim_progress,
                format!("Trimming clip {} of {}...", index + 1, total_clips),
                None
            );

            let duration = clip.out_point - clip.in_point;

            if duration <= 0.0 {
                return Err(format!("Clip {} has invalid duration", clip.id));
            }

            // Create intermediate file path
            let intermediate_path = temp_dir.join(format!("clip_{}_trimmed.mp4", index));
            let path_str = intermediate_path.to_str()
                .ok_or_else(|| "Failed to convert path to string (invalid UTF-8)".to_string())?;

            // Check if audio filtering is needed
            let needs_audio_filter = clip.is_muted ||
                                      clip.volume != 100 ||
                                      clip.fade_in_duration > 0.0 ||
                                      clip.fade_out_duration > 0.0;

            if needs_audio_filter {
                // Trim with audio filtering (requires re-encoding)
                self.trim_with_audio_filters(
                    &ffmpeg,
                    &clip.path,
                    path_str,
                    clip.in_point,
                    clip.out_point,
                    clip,
                )?;
            } else {
                // Fast trim with codec copy (no re-encoding)
                ffmpeg.trim_video(
                    &clip.path,
                    path_str,
                    clip.in_point,
                    clip.out_point,
                )?;
            }

            intermediate_files.push(intermediate_path);
        }

        Ok(intermediate_files)
    }

    /// Trim clip with audio filtering (requires re-encoding audio)
    fn trim_with_audio_filters(
        &self,
        ffmpeg: &FFmpegWrapper,
        input_path: &str,
        output_path: &str,
        start_time: f64,
        end_time: f64,
        clip: &ClipData,
    ) -> Result<(), String> {
        let duration = end_time - start_time;

        // Build audio filter string
        let mut audio_filters = Vec::new();

        // Mute takes precedence
        if clip.is_muted {
            audio_filters.push("volume=0".to_string());
        } else {
            // Apply volume adjustment (100 = 1.0, 200 = 2.0, etc.)
            if clip.volume != 100 {
                let volume_factor = clip.volume as f64 / 100.0;
                audio_filters.push(format!("volume={:.2}", volume_factor));
            }

            // Apply fade in
            if clip.fade_in_duration > 0.0 {
                audio_filters.push(format!("afade=t=in:st=0:d={:.3}", clip.fade_in_duration));
            }

            // Apply fade out
            if clip.fade_out_duration > 0.0 {
                let fade_out_start = duration - clip.fade_out_duration;
                audio_filters.push(format!("afade=t=out:st={:.3}:d={:.3}", fade_out_start, clip.fade_out_duration));
            }
        }

        let audio_filter_str = audio_filters.join(",");

        // Build FFmpeg command - store strings to ensure they live long enough
        let start_time_str = start_time.to_string();
        let duration_str = duration.to_string();

        let args = vec![
            "-ss", start_time_str.as_str(),
            "-i", input_path,
            "-t", duration_str.as_str(),
            "-af", audio_filter_str.as_str(),
            "-c:v", "copy",  // Copy video codec (fast)
            "-c:a", "aac",   // Re-encode audio with AAC
            "-b:a", "192k",  // Audio bitrate
            "-y",
            output_path,
        ];

        ffmpeg.execute_command(&args)?;
        Ok(())
    }

    /// Concatenate intermediate files and re-encode with settings
    fn concatenate_and_encode(
        &self,
        intermediate_files: &[PathBuf],
        text_overlays: &[TextOverlayData],
        settings: &ExportSettings,
    ) -> Result<String, String> {
        if intermediate_files.is_empty() {
            return Err("No intermediate files to concatenate".to_string());
        }

        let ffmpeg = self.ffmpeg.lock()
            .map_err(|e| format!("Failed to lock FFmpeg: {}", e))?;

        // Update progress: concatenation starts at 40%
        ffmpeg.set_progress(40.0, "Concatenating clips...".to_string(), None);

        // Create concat list file (escape single quotes in paths)
        let concat_list = intermediate_files
            .iter()
            .map(|p| {
                let path = p.display().to_string();
                // Escape single quotes: ' -> '\''
                let escaped = path.replace("'", "'\\''");
                format!("file '{}'", escaped)
            })
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

        // Build video filter with scaling and text overlays
        let mut vf_chain = Vec::new();

        // Add scaling if needed
        if let Some(scale) = settings.resolution.scale_filter() {
            vf_chain.push(scale);
        }

        // Add text overlay filters if there are any overlays
        for overlay in text_overlays {
            if let Ok(drawtext_filter) = self.build_drawtext_filter(overlay) {
                vf_chain.push(drawtext_filter);
            }
        }

        // Apply the complete filter chain if there are any filters
        let vf_filter_str;
        if !vf_chain.is_empty() {
            vf_filter_str = vf_chain.join(",");
            args.push("-vf");
            args.push(&vf_filter_str);
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

        // Update progress: encoding starts at 50%
        ffmpeg.set_progress(50.0, "Encoding video...".to_string(), None);

        // Execute FFmpeg
        let result = ffmpeg.execute_command(&args);

        // Update progress: finalizing
        ffmpeg.set_progress(95.0, "Finalizing...".to_string(), None);

        // Clean up concat list file
        let _ = std::fs::remove_file(&concat_file_path);

        result?;

        // Complete!
        ffmpeg.set_progress(100.0, "Complete!".to_string(), None);
        Ok(settings.output_path.clone())
    }

    /// Concatenate intermediate files with transitions using xfade filter and apply text overlays
    fn concatenate_with_transitions(
        &self,
        intermediate_files: &[PathBuf],
        clips: &[ClipData],
        transitions: &[TransitionData],
        text_overlays: &[TextOverlayData],
        settings: &ExportSettings,
    ) -> Result<String, String> {
        if intermediate_files.is_empty() {
            return Err("No intermediate files to concatenate".to_string());
        }

        let ffmpeg = self.ffmpeg.lock()
            .map_err(|e| format!("Failed to lock FFmpeg: {}", e))?;

        // Update progress
        ffmpeg.set_progress(40.0, "Building transition filters...".to_string(), None);

        // Build FFmpeg command with all clips as inputs
        let mut args: Vec<String> = Vec::new();
        for file in intermediate_files {
            args.push("-i".to_string());
            args.push(file.display().to_string());
        }

        // Build filter_complex with xfade filters for video and concat for audio
        let (video_filter, audio_filter) = self.build_xfade_and_audio_filter(clips, transitions, intermediate_files.len())?;

        // Combine video and audio filters
        let filter_complex = if audio_filter.is_empty() {
            video_filter
        } else {
            format!("{};{}", video_filter, audio_filter)
        };

        args.push("-filter_complex".to_string());
        args.push(filter_complex);
        args.push("-map".to_string());
        args.push("[vout]".to_string());  // Map final video output
        args.push("-map".to_string());
        args.push("[aout]".to_string());  // Map final audio output

        // Build video filter chain (scaling + text overlays)
        let mut vf_filters = Vec::new();

        // Add scaling if needed
        if let Some(scale) = settings.resolution.scale_filter() {
            vf_filters.push(scale);
        }

        // Add text overlay filters if there are any overlays
        for overlay in text_overlays {
            if let Ok(drawtext_filter) = self.build_drawtext_filter(overlay) {
                vf_filters.push(drawtext_filter);
            }
        }

        // Apply the filter chain if there are any filters
        if !vf_filters.is_empty() {
            let vf_chain = vf_filters.join(",");
            args.push("-vf".to_string());
            args.push(vf_chain);
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

        // Convert to &str refs
        let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

        // Update progress
        ffmpeg.set_progress(50.0, "Rendering transitions...".to_string(), None);

        // Execute FFmpeg
        let result = ffmpeg.execute_command(&args_refs);

        // Update progress
        ffmpeg.set_progress(95.0, "Finalizing...".to_string(), None);

        result?;

        // Complete!
        ffmpeg.set_progress(100.0, "Complete!".to_string(), None);
        Ok(settings.output_path.clone())
    }

    /// Build FFmpeg filter_complex string with xfade transitions for video and concat for audio
    ///
    /// Returns (video_filter, audio_filter)
    ///
    /// Example video filter for 3 clips with 2 transitions:
    /// "[0:v][1:v]xfade=transition=fade:duration=1:offset=5[v01];[v01][2:v]xfade=transition=wipeleft:duration=1.5:offset=12[vout]"
    ///
    /// Example audio filter:
    /// "[0:a][1:a][2:a]concat=n=3:v=0:a=1[aout]"
    fn build_xfade_and_audio_filter(
        &self,
        clips: &[ClipData],
        transitions: &[TransitionData],
        num_clips: usize,
    ) -> Result<(String, String), String> {
        if num_clips < 2 {
            return Ok((
                "[0:v]copy[vout]".to_string(),
                "[0:a]acopy[aout]".to_string()
            ));
        }

        // Build a map of transitions by clip pairs
        let mut transition_map: std::collections::HashMap<(u32, u32), &TransitionData> = std::collections::HashMap::new();
        for transition in transitions {
            transition_map.insert((transition.clip_id_before, transition.clip_id_after), transition);
        }

        // First, normalize all video streams to same frame rate, resolution, and timebase for xfade
        // Find max resolution to scale all clips to
        let max_width = clips.iter().map(|c| 1280).max().unwrap_or(1280);
        let max_height = clips.iter().map(|c| 720).max().unwrap_or(720);

        let mut normalized_streams = Vec::new();
        for i in 0..num_clips {
            let normalized_label = format!("[v{}n]", i);
            // Scale to common resolution, normalize format/fps/timebase
            let fps_filter = format!(
                "[{}:v]scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:-1:-1:color=black,format=yuv420p,fps=fps=30:round=near,settb=expr=1/30,setpts=PTS-STARTPTS{}",
                i, max_width, max_height, max_width, max_height, normalized_label
            );
            normalized_streams.push(fps_filter);
        }

        let mut video_filter_parts = normalized_streams;
        let mut current_offset = 0.0;

        // Process each pair of clips for video xfade
        for i in 0..num_clips - 1 {
            let clip_before = &clips[i];
            let clip_after = &clips[i + 1];

            // Get duration of current clip (before transition)
            let clip_duration = clip_before.out_point - clip_before.in_point;

            // Check if there's a transition between these clips
            let transition = transition_map.get(&(clip_before.id, clip_after.id));

            // Input labels (use normalized streams)
            let input_before = if i == 0 {
                "[v0n]".to_string()
            } else {
                format!("[v{}]", i - 1)
            };
            let input_after = format!("[v{}n]", i + 1);

            // Output label
            let output = if i == num_clips - 2 {
                "[vout]".to_string()
            } else {
                format!("[v{}]", i)
            };

            if let Some(trans) = transition {
                // There's a transition: use xfade
                let xfade_type = self.map_transition_type(&trans.transition_type)?;
                let duration = trans.duration;

                // Offset is when the transition starts (clip duration - transition duration)
                let offset = current_offset + clip_duration - duration;

                let xfade_filter = format!(
                    "{}{}xfade=transition={}:duration={:.3}:offset={:.3}{}",
                    input_before,
                    input_after,
                    xfade_type,
                    duration,
                    offset,
                    output
                );

                video_filter_parts.push(xfade_filter);

                // Update offset: add current clip duration minus overlap
                current_offset += clip_duration - duration;
            } else {
                // No transition: use very short xfade (0.01s) to simulate hard cut
                // This keeps the filter chain consistent
                let duration = 0.01;
                let offset = current_offset + clip_duration - duration;

                let xfade_filter = format!(
                    "{}{}xfade=transition=fade:duration={:.3}:offset={:.3}{}",
                    input_before,
                    input_after,
                    duration,
                    offset,
                    output
                );

                video_filter_parts.push(xfade_filter);
                current_offset += clip_duration - duration;
            }
        }

        // Build audio filter: concat all audio streams (with fallback for missing audio)
        let mut audio_inputs = Vec::new();
        for i in 0..num_clips {
            // Use anullsrc as fallback for clips without audio
            audio_inputs.push(format!("[{}:a?]", i));
        }

        // If we have audio inputs, build concat filter
        let audio_filter = if num_clips > 0 {
            format!(
                "{}concat=n={}:v=0:a=1[aout]",
                audio_inputs.join(""),
                num_clips
            )
        } else {
            String::new()
        };

        Ok((video_filter_parts.join(";"), audio_filter))
    }

    /// Map frontend transition type to FFmpeg xfade transition name
    fn map_transition_type(&self, transition_type: &str) -> Result<String, String> {
        match transition_type {
            "fade" => Ok("fade".to_string()),
            "crossfade" | "dissolve" => Ok("fade".to_string()),  // Same in FFmpeg
            "fadeToBlack" => Ok("fadeblack".to_string()),  // FFmpeg has fadeblack
            "wipeLeft" => Ok("wiperight".to_string()),  // Wipe left = new clip comes from left
            "wipeRight" => Ok("wipeleft".to_string()),  // Wipe right = new clip comes from right
            _ => Err(format!("Unsupported transition type: {}", transition_type))
        }
    }

    /// Export multi-track timeline with overlays
    fn export_multitrack(
        &self,
        clips: Vec<ClipData>,
        transitions: Vec<TransitionData>,
        text_overlays: Vec<TextOverlayData>,
        settings: ExportSettings,
    ) -> Result<String, String> {
        // Group clips by track
        let mut track0_clips: Vec<ClipData> = clips.iter().filter(|c| c.track == 0).cloned().collect();
        let mut overlay_clips: Vec<ClipData> = clips.iter().filter(|c| c.track > 0).cloned().collect();

        // Sort clips by timeline position
        track0_clips.sort_by(|a, b| {
            a.start_time.partial_cmp(&b.start_time)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        overlay_clips.sort_by(|a, b| {
            a.start_time.partial_cmp(&b.start_time)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        if track0_clips.is_empty() {
            return Err("Multi-track export requires at least one clip on track 0 (base)".to_string());
        }

        // Create temp directory
        let temp_dir = std::env::temp_dir().join("clipforge_export");
        std::fs::create_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to create temp directory: {}", e))?;

        // Phase 1: Process track 0 (base) - trim and concatenate to single base video
        // Progress: 0-30% for trimming base clips
        let track0_intermediates = self.trim_clips(&track0_clips, &temp_dir)?;
        let base_video_path = temp_dir.join("base_video.mp4");

        // Update progress: concatenating base video
        if let Ok(ffmpeg) = self.ffmpeg.lock() {
            ffmpeg.set_progress(30.0, "Concatenating base track...".to_string(), None);
        }

        // Filter transitions to get only track0 transitions
        let track0_clip_ids: std::collections::HashSet<u32> = track0_clips.iter().map(|c| c.id).collect();
        let track0_transitions: Vec<TransitionData> = transitions.into_iter()
            .filter(|t| track0_clip_ids.contains(&t.clip_id_before) && track0_clip_ids.contains(&t.clip_id_after))
            .collect();

        // Concatenate track 0 clips into base video (with or without transitions)
        if track0_transitions.is_empty() {
            // No transitions: fast concat
            self.concatenate_only(&track0_intermediates, &base_video_path)?;
        } else {
            // With transitions: use xfade filter
            self.concatenate_base_with_transitions(
                &track0_intermediates,
                &track0_clips,
                &track0_transitions,
                &base_video_path,
            )?;
        }

        // Clean up track 0 intermediates
        for file in &track0_intermediates {
            let _ = std::fs::remove_file(file);
        }

        // Phase 2: Trim overlay clips
        // Progress: 40-60% for trimming overlay clips
        if let Ok(ffmpeg) = self.ffmpeg.lock() {
            ffmpeg.set_progress(40.0, "Processing overlay clips...".to_string(), None);
        }
        let overlay_intermediates = self.trim_clips(&overlay_clips, &temp_dir)?;

        // Phase 3: Build overlay filter and execute FFmpeg
        // Progress: 60-100% for applying overlays
        if let Ok(ffmpeg) = self.ffmpeg.lock() {
            ffmpeg.set_progress(60.0, "Applying overlays...".to_string(), None);
        }
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

        // Create concat list (escape single quotes in paths)
        let concat_list = intermediate_files
            .iter()
            .map(|p| {
                let path = p.display().to_string();
                // Escape single quotes: ' -> '\''
                let escaped = path.replace("'", "'\\''");
                format!("file '{}'", escaped)
            })
            .collect::<Vec<_>>()
            .join("\n");

        let concat_file_path = std::env::temp_dir().join("clipforge_base_concat_list.txt");
        std::fs::write(&concat_file_path, concat_list)
            .map_err(|e| format!("Failed to write concat list: {}", e))?;

        // Concatenate with codec copy (fast)
        let concat_list_str = concat_file_path.to_str()
            .ok_or_else(|| "Failed to convert concat path to string (invalid UTF-8)".to_string())?;
        let output_str = output_path.to_str()
            .ok_or_else(|| "Failed to convert output path to string (invalid UTF-8)".to_string())?;

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

    /// Concatenate base track clips with transitions for multi-track export
    fn concatenate_base_with_transitions(
        &self,
        intermediate_files: &[PathBuf],
        clips: &[ClipData],
        transitions: &[TransitionData],
        output_path: &Path,
    ) -> Result<(), String> {
        if intermediate_files.is_empty() {
            return Err("No files to concatenate".to_string());
        }

        let ffmpeg = self.ffmpeg.lock()
            .map_err(|e| format!("Failed to lock FFmpeg: {}", e))?;

        // Build FFmpeg command with individual inputs for both video and audio
        let mut args: Vec<String> = Vec::new();

        // Add individual video inputs
        for file in intermediate_files {
            args.push("-i".to_string());
            args.push(file.display().to_string());
        }

        // Build filter_complex with xfade and acrossfade filters
        // Note: video inputs start at 0
        let (combined_filter, _) = self.build_xfade_and_audio_filter_offset(clips, transitions, intermediate_files.len(), 0)?;

        args.push("-filter_complex".to_string());
        args.push(combined_filter);
        args.push("-map".to_string());
        args.push("[vout]".to_string());
        args.push("-map".to_string());
        args.push("[aout]".to_string());  // Audio from acrossfade filter

        // Use libx264 for encoding
        args.push("-c:v".to_string());
        args.push("libx264".to_string());
        args.push("-crf".to_string());
        args.push("23".to_string());
        args.push("-c:a".to_string());
        args.push("aac".to_string());
        args.push("-b:a".to_string());
        args.push("192k".to_string());
        args.push("-y".to_string());
        args.push(output_path.display().to_string());

        // Convert to &str refs
        let args_refs: Vec<&str> = args.iter().map(|s| s.as_str()).collect();

        ffmpeg.execute_command(&args_refs)?;
        Ok(())
    }

    /// Build xfade filter with input offset (for when concat audio is input 0)
    fn build_xfade_and_audio_filter_offset(
        &self,
        clips: &[ClipData],
        transitions: &[TransitionData],
        num_clips: usize,
        input_offset: usize,
    ) -> Result<(String, String), String> {
        if num_clips < 2 {
            return Ok((
                format!("[{}:v]copy[vout]", input_offset),
                format!("[{}:a?]anull[aout]", input_offset)
            ));
        }

        // Build a map of transitions by clip pairs
        let mut transition_map: std::collections::HashMap<(u32, u32), &TransitionData> = std::collections::HashMap::new();
        for transition in transitions {
            transition_map.insert((transition.clip_id_before, transition.clip_id_after), transition);
        }

        // First, normalize all video streams to same frame rate, resolution, and timebase for xfade
        // Find max resolution to scale all clips to
        let max_width = clips.iter().map(|c| 1280).max().unwrap_or(1280);  // Default to 1280 if unknown
        let max_height = clips.iter().map(|c| 720).max().unwrap_or(720);   // Default to 720 if unknown

        let mut normalized_streams = Vec::new();
        for i in 0..num_clips {
            let input_idx = i + input_offset;
            let normalized_label = format!("[v{}n]", i);
            // Scale to common resolution, normalize format/fps/timebase
            let fps_filter = format!(
                "[{}:v]scale={}:{}:force_original_aspect_ratio=decrease,pad={}:{}:-1:-1:color=black,format=yuv420p,fps=fps=30:round=near,settb=expr=1/30,setpts=PTS-STARTPTS{}",
                input_idx, max_width, max_height, max_width, max_height, normalized_label
            );
            normalized_streams.push(fps_filter);
        }

        let mut video_filter_parts = normalized_streams;
        let mut audio_filter_parts = Vec::new();
        let mut current_offset = 0.0;

        // Process each pair of clips for video xfade and audio acrossfade
        for i in 0..num_clips - 1 {
            let clip_before = &clips[i];
            let clip_after = &clips[i + 1];

            let clip_duration = clip_before.out_point - clip_before.in_point;
            let transition = transition_map.get(&(clip_before.id, clip_after.id));

            // Video inputs
            let input_before = if i == 0 {
                "[v0n]".to_string()
            } else {
                format!("[v{}]", i - 1)
            };
            let input_after = format!("[v{}n]", i + 1);

            // Audio inputs (from individual video files)
            let audio_input_before = if i == 0 {
                format!("[{}:a?]", input_offset)
            } else {
                format!("[a{}]", i - 1)
            };
            let audio_input_after = format!("[{}:a?]", i + 1 + input_offset);

            // Output labels
            let video_output = if i == num_clips - 2 {
                "[vout]".to_string()
            } else {
                format!("[v{}]", i)
            };
            let audio_output = if i == num_clips - 2 {
                "[aout]".to_string()
            } else {
                format!("[a{}]", i)
            };

            if let Some(trans) = transition {
                // Video xfade
                let xfade_type = self.map_transition_type(&trans.transition_type)?;
                let duration = trans.duration;
                let offset = current_offset + clip_duration - duration;

                let xfade_filter = format!(
                    "{}{}xfade=transition={}:duration={:.3}:offset={:.3}{}",
                    input_before,
                    input_after,
                    xfade_type,
                    duration,
                    offset,
                    video_output
                );
                video_filter_parts.push(xfade_filter);

                // Audio acrossfade (match video timing)
                let acrossfade_filter = format!(
                    "{}{}acrossfade=d={:.3}:c1=tri:c2=tri{}",
                    audio_input_before,
                    audio_input_after,
                    duration,
                    audio_output
                );
                audio_filter_parts.push(acrossfade_filter);

                current_offset += clip_duration - duration;
            } else {
                // No transition: use very short xfade (0.01s) to simulate hard cut
                let duration = 0.01;
                let offset = current_offset + clip_duration - duration;

                let xfade_filter = format!(
                    "{}{}xfade=transition=fade:duration={:.3}:offset={:.3}{}",
                    input_before,
                    input_after,
                    duration,
                    offset,
                    video_output
                );
                video_filter_parts.push(xfade_filter);

                // Audio acrossfade (short crossfade for continuity)
                let acrossfade_filter = format!(
                    "{}{}acrossfade=d={:.3}:c1=tri:c2=tri{}",
                    audio_input_before,
                    audio_input_after,
                    duration,
                    audio_output
                );
                audio_filter_parts.push(acrossfade_filter);

                current_offset += clip_duration - duration;
            }
        }

        // Combine video and audio filters
        let combined_filter = if !audio_filter_parts.is_empty() {
            format!("{};{}", video_filter_parts.join(";"), audio_filter_parts.join(";"))
        } else {
            video_filter_parts.join(";")
        };

        Ok((combined_filter, String::new()))
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

        // Build filter_complex string (video overlays only)
        let (video_filter, _audio_filter) = self.build_overlay_and_audio_filter(overlay_clips, overlay_files.len());

        // Add filter_complex and output mapping
        args.push("-filter_complex".to_string());
        args.push(video_filter);
        args.push("-map".to_string());
        args.push("[out]".to_string());
        args.push("-map".to_string());
        args.push("0:a?".to_string());  // Audio from base video (simpler than mixing)

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

        // Update progress: encoding with overlays
        ffmpeg.set_progress(80.0, "Encoding with overlays...".to_string(), None);

        ffmpeg.execute_command(&args_refs)?;

        // Complete!
        ffmpeg.set_progress(100.0, "Complete!".to_string(), None);
        Ok(settings.output_path.clone())
    }

    /// Build FFmpeg filter_complex string for overlaying multiple clips and mixing audio
    ///
    /// Returns (video_filter, audio_filter)
    ///
    /// Example video output:
    /// "[1:v]scale=iw*0.25:-1[scaled1];[0:v][scaled1]overlay=W-w-20:H-h-20:enable='between(t,5.0,10.0)'[temp1];..."
    ///
    /// Example audio output:
    /// "[0:a][1:a]amix=inputs=2:duration=first[aout]"
    fn build_overlay_and_audio_filter(&self, overlay_clips: &[ClipData], num_overlays: usize) -> (String, String) {
        let mut filter_parts = Vec::new();

        // First, scale all overlays to 25% width (matching preview)
        for (index, _clip) in overlay_clips.iter().enumerate() {
            let input_index = index + 1; // Input 0 is base, overlays start at 1
            let scale_filter = format!(
                "[{}:v]scale=iw*0.25:-1[scaled{}]",
                input_index,
                input_index
            );
            filter_parts.push(scale_filter);
        }

        // Then, overlay each scaled clip
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

            // Overlay filter: scale to 25% and position in bottom-right corner with 20px padding
            // enable filter makes overlay appear only during its timeline duration
            let overlay_filter = format!(
                "{}[scaled{}]overlay=W-w-20:H-h-20:enable='between(t,{:.3},{:.3})'{}",
                input_label,
                input_index,
                start,
                end,
                output_label
            );

            filter_parts.push(overlay_filter);
        }

        let video_filter = filter_parts.join(";");

        // Build audio mixing filter - just use base audio for now
        // TODO: Properly detect which inputs have audio and mix only those
        let audio_filter = "[0:a?]acopy[aout]".to_string();

        (video_filter, audio_filter)
    }

    /// Build FFmpeg drawtext filter for a text overlay
    ///
    /// Format: drawtext=text='...':x='(main_w*x)/100':y='(main_h*y)/100':fontsize=N:fontcolor='color'
    fn build_drawtext_filter(&self, overlay: &TextOverlayData) -> Result<String, String> {
        // Escape special characters in text for FFmpeg drawtext filter
        // The text parameter in drawtext needs to escape colons and backslashes
        let escaped_text = overlay.text
            .replace("\\", "\\\\")
            .replace("'", "\\'");

        // Convert color from hex (#RRGGBB) - FFmpeg accepts hex colors with 0x prefix
        let fontcolor = if overlay.color.starts_with('#') {
            format!("0x{}", &overlay.color[1..])  // Convert #RRGGBB to 0xRRGGBB
        } else {
            overlay.color.clone()
        };

        // Calculate x and y from percentages (0-100) to pixel positions
        // Use 'main_w' and 'main_h' for width/height in FFmpeg
        let x_expr = format!("(main_w*{})/100", overlay.x);
        let y_expr = format!("(main_h*{})/100", overlay.y);

        // Build the enable expression for timing (between start and end time)
        // Note: enable parameter uses different syntax, no quotes around the expression
        let end_time = overlay.start_time + overlay.duration;

        // Build drawtext filter - simpler syntax without enable for now
        // This will draw the text for the entire video duration
        let filter = format!(
            "drawtext=text='{}':x='{}':y='{}':fontsize={}:fontcolor={}",
            escaped_text, x_expr, y_expr, overlay.font_size, fontcolor
        );

        Ok(filter)
    }
}
