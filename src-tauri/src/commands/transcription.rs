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
    // For merged multi-track audio, we need to build time mappings based on actual audio composition

    // Find all unique time boundaries (same logic as extract_timeline_audio)
    let mut time_points: Vec<f64> = Vec::new();
    for clip in &clips {
        time_points.push(clip.start_time);
        time_points.push(clip.start_time + (clip.out_point - clip.in_point));
    }
    time_points.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    time_points.dedup_by(|a, b| (*a - *b).abs() < 0.001);

    // Build audio segments (matching the extraction logic)
    let mut audio_segments: Vec<(f64, f64, Vec<usize>)> = Vec::new();

    for i in 0..time_points.len() - 1 {
        let segment_start = time_points[i];
        let segment_end = time_points[i + 1];
        let segment_mid = (segment_start + segment_end) / 2.0;

        let mut contributing_clips = Vec::new();
        for (clip_idx, clip) in clips.iter().enumerate() {
            let clip_end = clip.start_time + (clip.out_point - clip.in_point);
            if clip.start_time <= segment_mid && segment_mid < clip_end {
                contributing_clips.push(clip_idx);
            }
        }

        if !contributing_clips.is_empty() {
            audio_segments.push((segment_start, segment_end, contributing_clips));
        }
    }

    // Create time mappings from merged audio boundaries to timeline positions
    let mut time_mappings: Vec<(f64, f64, f64)> = Vec::new(); // (audio_start, audio_end, timeline_start)
    let mut audio_time = 0.0;

    eprintln!("=== TRANSCRIPTION TIMING DEBUG (MERGED AUDIO) ===");
    eprintln!("Found {} audio segments:", audio_segments.len());

    for (segment_start, segment_end, contributing_clips) in &audio_segments {
        let segment_duration = segment_end - segment_start;
        let audio_end = audio_time + segment_duration;
        time_mappings.push((audio_time, audio_end, *segment_start));
        eprintln!("  Audio [{:.3}, {:.3}) -> Timeline [{:.3}, {:.3}), clips: {:?}",
            audio_time, audio_end, segment_start, segment_end, contributing_clips);
        audio_time = audio_end;
    }
    eprintln!("Total merged audio duration: {:.3}s", audio_time);
    eprintln!("Received {} segments from Whisper:", result.segments.len());

    // Map each segment using the time mappings
    for segment in &mut result.segments {
        let original_time = segment.start_time;
        let mut found = false;

        for (audio_start, audio_end, timeline_start) in &time_mappings {
            if original_time >= *audio_start && original_time < *audio_end {
                // This segment belongs to this audio segment
                let offset_in_segment = original_time - audio_start;
                segment.start_time = timeline_start + offset_in_segment;
                found = true;
                eprintln!("  ✓ Segment: '{}' original_time={:.3}, mapped to timeline={:.3}",
                    &segment.text[..segment.text.len().min(30)], original_time, segment.start_time);
                break;
            }
        }

        if !found {
            eprintln!("  ✗ Segment NOT matched: '{}' original_time={:.3}s (outside all ranges)",
                &segment.text[..segment.text.len().min(30)], original_time);
        }
    }
    eprintln!("=== END TIMING DEBUG ===");

    // Clean up audio file
    let _ = fs::remove_file(&audio_path);

    Ok(result)
}
