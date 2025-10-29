// Transcription module for audio-to-text conversion using OpenAI Whisper API
use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use std::io::Write;

/// Clip data representation (matching export pipeline)
#[derive(Debug, Clone, Deserialize)]
pub struct ClipData {
    pub id: u32,
    pub path: String,
    pub in_point: f64,      // Start time in source (seconds)
    pub out_point: f64,     // End time in source (seconds)
    pub start_time: f64,    // Position on timeline (seconds)
    #[serde(default)]
    pub track: u32,
}

/// Represents a transcription segment with timing information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionSegment {
    pub text: String,
    #[serde(rename = "startTime")]
    pub start_time: f64,
    pub duration: f64,
}

/// Represents the result of transcription
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub segments: Vec<TranscriptionSegment>,
}

/// Extract audio from the timeline by concatenating all clips with their trimming
/// respecting the current timeline state (trimming, positioning, etc.)
pub fn extract_timeline_audio(clips: &[ClipData]) -> Result<String, String> {
    if clips.is_empty() {
        return Err("No clips to extract audio from".to_string());
    }

    // Create temp directory
    let temp_dir = std::env::temp_dir().join("clipforge_transcription");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // If only one clip, extract and trim that clip
    if clips.len() == 1 {
        let clip = &clips[0];
        return extract_and_trim_audio(
            &clip.path,
            clip.in_point,
            clip.out_point,
        );
    }

    // Multiple clips - need to merge overlapping audio from different tracks
    // Step 1: Find all unique time boundaries
    let mut time_points: Vec<f64> = Vec::new();
    for clip in clips {
        time_points.push(clip.start_time);
        time_points.push(clip.start_time + (clip.out_point - clip.in_point));
    }
    time_points.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
    time_points.dedup_by(|a, b| (*a - *b).abs() < 0.001); // Dedup with tolerance

    eprintln!("=== MULTI-TRACK AUDIO MERGING ===");
    eprintln!("Found {} unique time points: {:?}", time_points.len(), time_points);

    // Step 2: For each time segment, identify which clips contribute audio
    let mut audio_segments: Vec<(f64, f64, Vec<usize>)> = Vec::new(); // (start, end, clip_indices)

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
            eprintln!("  Segment [{:.3}, {:.3}): clips {:?}", segment_start, segment_end, contributing_clips);
            audio_segments.push((segment_start, segment_end, contributing_clips));
        }
    }

    // Step 3: Extract audio for all clips
    let mut clip_audio_paths: Vec<Option<String>> = vec![None; clips.len()];
    for (idx, clip) in clips.iter().enumerate() {
        let audio_path = extract_and_trim_audio(
            &clip.path,
            clip.in_point,
            clip.out_point,
        )?;
        clip_audio_paths[idx] = Some(audio_path);
    }

    // Step 4: Merge audio segments - for each segment, mix contributing clips and concatenate all
    let output_path = temp_dir.join(format!("timeline_audio_{}.wav", uuid::Uuid::new_v4()));
    let mut merged_segment_paths: Vec<String> = Vec::new();

    for (seg_idx, (segment_start, segment_end, contributing_clips)) in audio_segments.iter().enumerate() {
        let segment_duration = segment_end - segment_start;

        eprintln!("Processing segment {} (duration: {:.3}s, clips: {:?})", seg_idx, segment_duration, contributing_clips);

        if contributing_clips.len() == 1 {
            // Single clip in this segment - trim it to the segment's duration
            let clip_idx = contributing_clips[0];
            let clip = &clips[clip_idx];
            let offset_in_clip = segment_start - clip.start_time;

            if let Some(audio_path) = &clip_audio_paths[clip_idx] {
                let segment_output = temp_dir.join(format!("segment_{}_{}.wav", seg_idx, uuid::Uuid::new_v4()));

                // Trim the audio to this segment's portion
                let output = Command::new("ffmpeg")
                    .arg("-i")
                    .arg(audio_path)
                    .arg("-ss")
                    .arg(offset_in_clip.to_string())
                    .arg("-t")
                    .arg(segment_duration.to_string())
                    .arg("-c:a")
                    .arg("pcm_s16le")
                    .arg("-ar")
                    .arg("16000")
                    .arg("-ac")
                    .arg("1")
                    .arg(&segment_output)
                    .arg("-y")
                    .output()
                    .map_err(|e| format!("Failed to trim audio for segment {}: {}", seg_idx, e))?;

                if !output.status.success() {
                    let stderr = String::from_utf8_lossy(&output.stderr);
                    return Err(format!("FFmpeg trim error for segment {}: {}", seg_idx, stderr));
                }

                merged_segment_paths.push(segment_output.to_string_lossy().to_string());
            }
        } else {
            // Multiple clips - need to mix them
            let segment_output = temp_dir.join(format!("segment_{}_{}.wav", seg_idx, uuid::Uuid::new_v4()));

            // Build FFmpeg command to mix this segment's audio
            let mut cmd = Command::new("ffmpeg");

            // Add input files for this segment, with atrim filters to get only the segment portion
            for (input_idx, &clip_idx) in contributing_clips.iter().enumerate() {
                if let Some(audio_path) = &clip_audio_paths[clip_idx] {
                    cmd.arg("-i").arg(audio_path);
                }
            }

            // Build filter to trim and mix the inputs
            // Each input needs to be trimmed to only the part that corresponds to this segment
            let mut filter_parts = Vec::new();
            for (input_idx, &clip_idx) in contributing_clips.iter().enumerate() {
                let clip = &clips[clip_idx];
                let offset_in_clip = segment_start - clip.start_time;

                // Create trim filter for this input
                let trim_filter = format!(
                    "[{}]atrim=start={}:duration={}[trim{}]",
                    input_idx, offset_in_clip, segment_duration, input_idx
                );
                filter_parts.push(trim_filter);
            }

            // Create mix filter using trimmed inputs
            let trim_labels: Vec<String> = (0..contributing_clips.len())
                .map(|i| format!("[trim{}]", i))
                .collect();
            let mix_filter = format!(
                "{}amix=inputs={}:duration=longest[out]",
                trim_labels.join(""),
                contributing_clips.len()
            );
            filter_parts.push(mix_filter);

            let filter_complex = filter_parts.join(";");
            eprintln!("  Mix filter for segment {}: {}", seg_idx, filter_complex);

            cmd.arg("-filter_complex")
                .arg(&filter_complex)
                .arg("-map")
                .arg("[out]")
                .arg("-c:a")
                .arg("pcm_s16le")
                .arg("-ar")
                .arg("16000")
                .arg("-ac")
                .arg("1")
                .arg(&segment_output)
                .arg("-y");

            let output = cmd
                .output()
                .map_err(|e| format!("Failed to execute FFmpeg mix for segment {}: {}", seg_idx, e))?;

            if !output.status.success() {
                let stderr = String::from_utf8_lossy(&output.stderr);
                return Err(format!("FFmpeg mix error for segment {}: {}", seg_idx, stderr));
            }

            merged_segment_paths.push(segment_output.to_string_lossy().to_string());
        }
    }

    // Step 5: Concatenate all merged segments
    if merged_segment_paths.is_empty() {
        return Err("No audio segments to concatenate".to_string());
    }

    if merged_segment_paths.len() == 1 {
        // Only one segment, copy it to output
        fs::copy(&merged_segment_paths[0], &output_path)
            .map_err(|e| format!("Failed to copy audio file: {}", e))?;
    } else {
        // Multiple segments - concatenate them
        let concat_file = temp_dir.join(format!("concat_{}.txt", uuid::Uuid::new_v4()));
        let mut concat_content = String::new();

        for path in &merged_segment_paths {
            concat_content.push_str(&format!("file '{}'\n", path.replace('\\', "\\\\")));
        }

        let mut file = fs::File::create(&concat_file)
            .map_err(|e| format!("Failed to create concat file: {}", e))?;
        file.write_all(concat_content.as_bytes())
            .map_err(|e| format!("Failed to write concat file: {}", e))?;

        let output = Command::new("ffmpeg")
            .arg("-f")
            .arg("concat")
            .arg("-safe")
            .arg("0")
            .arg("-i")
            .arg(&concat_file)
            .arg("-c:a")
            .arg("pcm_s16le")
            .arg("-ar")
            .arg("16000")
            .arg("-ac")
            .arg("1")
            .arg(&output_path)
            .arg("-y")
            .output()
            .map_err(|e| format!("Failed to execute FFmpeg concat: {}", e))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("FFmpeg concat error: {}", stderr));
        }

        let _ = fs::remove_file(&concat_file);
    }

    // Clean up segment files
    for path in &merged_segment_paths {
        let _ = fs::remove_file(path);
    }

    eprintln!("=== MERGE COMPLETE ===");
    Ok(output_path.to_string_lossy().to_string())
}

/// Check if a video file has an audio stream
fn has_audio_stream(video_path: &str) -> Result<bool, String> {
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(video_path)
        .output()
        .map_err(|e| format!("Failed to check audio: {}", e))?;

    let stderr = String::from_utf8_lossy(&output.stderr);
    Ok(stderr.contains("Audio:"))
}

/// Generate silent audio for a specified duration
fn generate_silent_audio(duration: f64) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("clipforge_transcription");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    let audio_path = temp_dir.join(format!("audio_{}.wav", uuid::Uuid::new_v4()));

    // Generate silent audio using anullsrc filter
    let output = Command::new("ffmpeg")
        .arg("-f")
        .arg("lavfi")
        .arg("-i")
        .arg(format!("anullsrc=r=16000:cl=mono,atrim=duration={}", duration))
        .arg("-q:a")
        .arg("9")
        .arg("-acodec")
        .arg("pcm_s16le")
        .arg(&audio_path)
        .arg("-y") // Overwrite
        .output()
        .map_err(|e| format!("Failed to generate silence: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg silence generation error: {}", stderr));
    }

    Ok(audio_path.to_string_lossy().to_string())
}

/// Extract and trim audio from a video file
/// Returns the path to the extracted audio file (.wav)
/// If the file has no audio, generates silent audio with the same duration
fn extract_and_trim_audio(video_path: &str, in_point: f64, out_point: f64) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("clipforge_transcription");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    let duration = out_point - in_point;

    // Check if file has audio
    if !has_audio_stream(video_path)? {
        // Generate silent audio matching the duration
        return generate_silent_audio(duration);
    }

    let audio_path = temp_dir.join(format!("audio_{}.wav", uuid::Uuid::new_v4()));

    // Use FFmpeg to extract and trim audio
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(video_path)
        .arg("-ss")
        .arg(in_point.to_string())
        .arg("-t")
        .arg(duration.to_string())
        .arg("-vn") // No video
        .arg("-acodec")
        .arg("pcm_s16le") // WAV codec
        .arg("-ar")
        .arg("16000") // 16kHz sample rate
        .arg("-ac")
        .arg("1") // Mono
        .arg(&audio_path)
        .arg("-y") // Overwrite
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg error: {}", stderr));
    }

    Ok(audio_path.to_string_lossy().to_string())
}

/// Extract audio from a video file using FFmpeg
/// Returns the path to the extracted audio file (.wav)
pub fn extract_audio(video_path: &str) -> Result<String, String> {
    // Create temp directory if it doesn't exist
    let temp_dir = std::env::temp_dir().join("clipforge_transcription");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    // Generate output filename
    let audio_path = temp_dir.join(format!(
        "audio_{}.wav",
        uuid::Uuid::new_v4()
    ));

    // Use FFmpeg to extract audio
    let output = Command::new("ffmpeg")
        .arg("-i")
        .arg(video_path)
        .arg("-vn") // No video
        .arg("-acodec")
        .arg("pcm_s16le") // WAV codec
        .arg("-ar")
        .arg("16000") // 16kHz sample rate (standard for Whisper)
        .arg("-ac")
        .arg("1") // Mono
        .arg(&audio_path)
        .arg("-y") // Overwrite
        .output()
        .map_err(|e| format!("Failed to execute FFmpeg: {}", e))?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("FFmpeg error: {}", stderr));
    }

    Ok(audio_path.to_string_lossy().to_string())
}

/// Call OpenAI Whisper API to transcribe audio
pub async fn transcribe_with_whisper(audio_path: &str, api_key: &str) -> Result<TranscriptionResult, String> {
    // Read audio file
    let audio_data = fs::read(audio_path)
        .map_err(|e| format!("Failed to read audio file: {}", e))?;

    // Create multipart form data
    let client = reqwest::Client::new();
    let form = reqwest::multipart::Form::new()
        .part("file", reqwest::multipart::Part::bytes(audio_data)
            .file_name("audio.wav"))
        .text("model", "whisper-1")
        .text("language", "en")
        .text("response_format", "verbose_json")
        .text("timestamp_granularities", "segment");

    // Call Whisper API
    let response = client
        .post("https://api.openai.com/v1/audio/transcriptions")
        .header("Authorization", format!("Bearer {}", api_key))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("Failed to call Whisper API: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Whisper API error: {}", error_text));
    }

    // Parse response
    let whisper_response: WhisperResponse = response.json().await
        .map_err(|e| format!("Failed to parse Whisper response: {}", e))?;

    // Convert Whisper response to our format
    let segments = whisper_response.segments.into_iter().map(|seg| {
        TranscriptionSegment {
            text: seg.text.trim().to_string(),
            start_time: seg.start,
            duration: seg.end - seg.start,
        }
    }).collect();

    Ok(TranscriptionResult { segments })
}

/// Internal struct to parse Whisper API response
#[derive(Debug, Deserialize)]
struct WhisperResponse {
    text: String,
    segments: Vec<WhisperSegment>,
}

#[derive(Debug, Deserialize)]
struct WhisperSegment {
    id: u32,
    seek: u32,
    start: f64,
    end: f64,
    text: String,
    #[serde(default)]
    tokens: Vec<u32>,
    #[serde(default)]
    temperature: f32,
    #[serde(default)]
    avg_logprob: f32,
    #[serde(default)]
    compression_ratio: f32,
    #[serde(default)]
    no_speech_prob: f32,
}

/// Clean up temporary audio files
pub fn cleanup_temp_files() -> Result<(), String> {
    let temp_dir = std::env::temp_dir().join("clipforge_transcription");
    if temp_dir.exists() {
        fs::remove_dir_all(&temp_dir)
            .map_err(|e| format!("Failed to cleanup temp files: {}", e))?;
    }
    Ok(())
}
