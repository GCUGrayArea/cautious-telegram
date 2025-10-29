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
    // Need to account for clip start times and gaps
    let mut timeline_offset = 0.0;

    // Sort clips by timeline position
    let mut sorted_clips = clips.clone();
    sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap_or(std::cmp::Ordering::Equal));

    for segment in &mut result.segments {
        // Find which clip this segment belongs to based on audio time
        let mut cumulative_time = 0.0;
        for clip in &sorted_clips {
            let clip_duration = clip.out_point - clip.in_point;
            if segment.start_time < cumulative_time + clip_duration {
                // This segment is in this clip
                let segment_time_in_clip = segment.start_time - cumulative_time;
                segment.start_time = clip.start_time + segment_time_in_clip;
                break;
            }
            cumulative_time += clip_duration;
        }
    }

    // Clean up audio file
    let _ = fs::remove_file(&audio_path);

    Ok(result)
}
