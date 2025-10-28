// Export encoder settings and resolution options
use serde::{Deserialize, Serialize};

/// Resolution options for export
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Resolution {
    Source,      // Use source resolution (from first clip)
    #[serde(rename = "720p")]
    HD720,       // 1280x720
    #[serde(rename = "1080p")]
    HD1080,      // 1920x1080
}

impl Resolution {
    /// Get width and height for this resolution
    /// Returns None for Source (will be determined from first clip)
    pub fn dimensions(&self) -> Option<(u32, u32)> {
        match self {
            Resolution::Source => None,
            Resolution::HD720 => Some((1280, 720)),
            Resolution::HD1080 => Some((1920, 1080)),
        }
    }

    /// Get FFmpeg scale filter string
    /// Returns None for Source (no scaling needed)
    pub fn scale_filter(&self) -> Option<String> {
        self.dimensions()
            .map(|(w, h)| format!("scale={}:{}", w, h))
    }
}

/// Export settings for timeline export
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportSettings {
    pub resolution: Resolution,
    pub output_path: String,
}

impl ExportSettings {
    pub fn new(resolution: Resolution, output_path: String) -> Self {
        Self {
            resolution,
            output_path,
        }
    }
}
