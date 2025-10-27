// Video metadata structures and parsing logic
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoMetadata {
    pub duration: f64,           // Duration in seconds
    pub width: u32,              // Video width in pixels
    pub height: u32,             // Video height in pixels
    pub format: String,          // Container format (e.g., "mov,mp4,m4a,3gp,3g2,mj2")
    pub codec: String,           // Video codec (e.g., "h264")
    pub fps: f64,                // Frames per second
    pub bitrate: Option<u64>,    // Bitrate in bits/second
    pub audio_codec: Option<String>, // Audio codec (e.g., "aac")
    pub file_size: u64,          // File size in bytes
}

#[derive(Debug, Deserialize)]
struct FFprobeOutput {
    format: Format,
    streams: Vec<Stream>,
}

#[derive(Debug, Deserialize)]
struct Format {
    duration: Option<String>,
    format_name: String,
    size: Option<String>,
    bit_rate: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Stream {
    codec_type: String,
    codec_name: String,
    width: Option<u32>,
    height: Option<u32>,
    r_frame_rate: Option<String>,
    avg_frame_rate: Option<String>,
}

impl VideoMetadata {
    /// Parse FFprobe JSON output into VideoMetadata
    pub fn from_ffprobe_json(json: &str) -> Result<Self, String> {
        let output: FFprobeOutput = serde_json::from_str(json)
            .map_err(|e| format!("Failed to parse FFprobe JSON: {}", e))?;

        // Find video stream
        let video_stream = output
            .streams
            .iter()
            .find(|s| s.codec_type == "video")
            .ok_or_else(|| "No video stream found".to_string())?;

        // Find audio stream (optional)
        let audio_stream = output.streams.iter().find(|s| s.codec_type == "audio");

        // Parse duration
        let duration = output
            .format
            .duration
            .as_ref()
            .and_then(|d| d.parse::<f64>().ok())
            .unwrap_or(0.0);

        // Parse file size
        let file_size = output
            .format
            .size
            .as_ref()
            .and_then(|s| s.parse::<u64>().ok())
            .unwrap_or(0);

        // Parse bitrate
        let bitrate = output
            .format
            .bit_rate
            .as_ref()
            .and_then(|b| b.parse::<u64>().ok());

        // Parse FPS from frame rate (e.g., "30/1" = 30 fps)
        let fps = video_stream
            .r_frame_rate
            .as_ref()
            .or(video_stream.avg_frame_rate.as_ref())
            .and_then(|fps_str| {
                let parts: Vec<&str> = fps_str.split('/').collect();
                if parts.len() == 2 {
                    let numerator = parts[0].parse::<f64>().ok()?;
                    let denominator = parts[1].parse::<f64>().ok()?;
                    if denominator > 0.0 {
                        Some(numerator / denominator)
                    } else {
                        None
                    }
                } else {
                    None
                }
            })
            .unwrap_or(30.0); // Default to 30 fps if parsing fails

        Ok(VideoMetadata {
            duration,
            width: video_stream.width.unwrap_or(0),
            height: video_stream.height.unwrap_or(0),
            format: output.format.format_name,
            codec: video_stream.codec_name.clone(),
            fps,
            bitrate,
            audio_codec: audio_stream.map(|s| s.codec_name.clone()),
            file_size,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ffprobe_json() {
        let json = r#"{
            "format": {
                "duration": "10.5",
                "format_name": "mov,mp4,m4a,3gp,3g2,mj2",
                "size": "1048576",
                "bit_rate": "800000"
            },
            "streams": [
                {
                    "codec_type": "video",
                    "codec_name": "h264",
                    "width": 1920,
                    "height": 1080,
                    "r_frame_rate": "30/1"
                },
                {
                    "codec_type": "audio",
                    "codec_name": "aac"
                }
            ]
        }"#;

        let metadata = VideoMetadata::from_ffprobe_json(json).unwrap();
        assert_eq!(metadata.duration, 10.5);
        assert_eq!(metadata.width, 1920);
        assert_eq!(metadata.height, 1080);
        assert_eq!(metadata.codec, "h264");
        assert_eq!(metadata.fps, 30.0);
        assert_eq!(metadata.audio_codec, Some("aac".to_string()));
    }
}
