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

    // Sort clips by timeline position
    let mut sorted_clips = clips.to_vec();
    sorted_clips.sort_by(|a, b| a.start_time.partial_cmp(&b.start_time).unwrap_or(std::cmp::Ordering::Equal));

    // If only one clip, extract and trim that clip
    if sorted_clips.len() == 1 {
        let clip = &sorted_clips[0];
        return extract_and_trim_audio(
            &clip.path,
            clip.in_point,
            clip.out_point,
        );
    }

    // Multiple clips - create concat demux file
    let concat_file = temp_dir.join(format!("concat_{}.txt", uuid::Uuid::new_v4()));
    let mut concat_content = String::new();

    for clip in &sorted_clips {
        // Extract trimmed audio for this clip
        let trimmed_audio = extract_and_trim_audio(
            &clip.path,
            clip.in_point,
            clip.out_point,
        )?;

        // Add to concat file
        concat_content.push_str(&format!("file '{}'\n", trimmed_audio.replace('\\', "\\\\")));
    }

    // Write concat file
    let mut file = fs::File::create(&concat_file)
        .map_err(|e| format!("Failed to create concat file: {}", e))?;
    file.write_all(concat_content.as_bytes())
        .map_err(|e| format!("Failed to write concat file: {}", e))?;

    // Output path
    let output_path = temp_dir.join(format!("timeline_audio_{}.wav", uuid::Uuid::new_v4()));

    // Use FFmpeg to concatenate
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

    // Clean up concat file and individual audio files
    let _ = fs::remove_file(&concat_file);

    Ok(output_path.to_string_lossy().to_string())
}

/// Extract and trim audio from a video file
/// Returns the path to the extracted audio file (.wav)
fn extract_and_trim_audio(video_path: &str, in_point: f64, out_point: f64) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("clipforge_transcription");
    fs::create_dir_all(&temp_dir)
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;

    let duration = out_point - in_point;
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
