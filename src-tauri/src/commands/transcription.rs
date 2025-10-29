// Transcription command for Tauri
use serde::{Deserialize, Serialize};
use crate::transcription::{extract_timeline_audio, transcribe_with_whisper, TranscriptionResult, ClipData};
use std::fs;

/// Tauri command to transcribe timeline
/// Extracts audio from the timeline (respecting clip trimming) and sends to Whisper API
#[tauri::command]
pub async fn transcribe_timeline(clips: Vec<ClipData>) -> Result<TranscriptionResult, String> {
    if clips.is_empty() {
        return Err("No clips to transcribe".to_string());
    }

    // Get API key from environment variable
    let api_key = std::env::var("OPENAI_API_KEY")
        .map_err(|_| "OPENAI_API_KEY environment variable not set".to_string())?;

    // Extract audio from the timeline (respecting all trimming and positioning)
    let audio_path = extract_timeline_audio(&clips)
        .map_err(|e| format!("Failed to extract timeline audio: {}", e))?;

    // Transcribe the audio
    let mut result = transcribe_with_whisper(&audio_path, &api_key).await
        .map_err(|e| format!("Failed to transcribe timeline: {}", e))?;

    // Adjust segment timings to match timeline positions
    // Build a mapping of audio time ranges to timeline positions
    let mut sorted_clips = clips.clone();
    sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap_or(std::cmp::Ordering::Equal));

    // Create array of (audio_start, audio_end, timeline_start) for each clip
    let mut time_mappings: Vec<(f64, f64, f64)> = Vec::new();
    let mut audio_time = 0.0;

    for clip in &sorted_clips {
        let clip_duration = clip.out_point - clip.in_point;
        let audio_end = audio_time + clip_duration;
        time_mappings.push((audio_time, audio_end, clip.start_time));
        audio_time = audio_end;
    }

    // Map each segment using the time mappings
    for segment in &mut result.segments {
        let original_time = segment.start_time;
        for (audio_start, audio_end, timeline_start) in &time_mappings {
            if original_time >= *audio_start && original_time < *audio_end {
                // This segment belongs to this clip
                let offset_in_clip = original_time - audio_start;
                segment.start_time = timeline_start + offset_in_clip;
                break;
            }
        }
        // If segment wasn't found in any clip (shouldn't happen), leave it as-is
    }

    // Clean up audio file
    let _ = fs::remove_file(&audio_path);

    Ok(result)
}
