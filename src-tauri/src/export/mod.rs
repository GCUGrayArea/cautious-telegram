// Export module for ClipForge
// Handles timeline export to video files using FFmpeg

pub mod encoder;
pub mod pipeline;

pub use encoder::{ExportSettings, Resolution};
pub use pipeline::ExportPipeline;
