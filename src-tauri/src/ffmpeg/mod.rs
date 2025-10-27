// FFmpeg integration module for ClipForge
// Provides video metadata extraction, thumbnail generation, and export functionality

pub mod wrapper;
pub mod metadata;
pub mod commands;

pub use wrapper::FFmpegWrapper;
pub use metadata::VideoMetadata;
