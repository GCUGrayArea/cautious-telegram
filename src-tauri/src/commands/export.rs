// Export command for Tauri
use tauri::State;

use crate::export::{ExportPipeline, ExportSettings};
use crate::export::pipeline::{ClipData, TransitionData};
use crate::ffmpeg::commands::FFmpegState;
use crate::ffmpeg::wrapper::ExportProgress;

/// Tauri command to export timeline to video file
///
/// Takes timeline clips, transitions, and export settings from frontend,
/// processes them through ExportPipeline, and returns output path.
#[tauri::command]
pub fn export_timeline(
    clips: Vec<ClipData>,
    transitions: Vec<TransitionData>,
    settings: ExportSettings,
    ffmpeg_state: State<'_, FFmpegState>,
) -> Result<String, String> {
    // Get FFmpeg wrapper from state
    let ffmpeg_wrapper = ffmpeg_state.get_wrapper()?;

    // Create export pipeline
    let pipeline = ExportPipeline::new(std::sync::Arc::new(std::sync::Mutex::new(ffmpeg_wrapper)));

    // Execute export (blocking operation)
    pipeline.export_timeline(clips, transitions, settings)
}

/// Tauri command to get current export progress
///
/// Frontend can poll this command to get real-time progress updates
#[tauri::command]
pub fn get_export_progress(ffmpeg_state: State<'_, FFmpegState>) -> Result<ExportProgress, String> {
    // Get FFmpeg wrapper from state
    let ffmpeg_wrapper = ffmpeg_state.get_wrapper()?;

    // Get current progress
    Ok(ffmpeg_wrapper.get_progress())
}
