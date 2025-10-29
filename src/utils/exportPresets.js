/**
 * Export Presets Configuration
 *
 * Predefined export settings optimized for different platforms and use cases.
 * Each preset includes resolution, bitrate, and format recommendations.
 */

export const EXPORT_PRESETS = {
  // YouTube - Recommended for maximum compatibility and quality
  youtube: {
    name: 'YouTube',
    description: 'Optimized for YouTube (1080p, high quality)',
    resolution: '1080p',
    videoBitrate: '8000k',  // 8 Mbps for 1080p
    audioBitrate: '192k',
    frameRate: 30,
    format: 'mp4',
    notes: 'H.264 MP4, recommended for YouTube uploads'
  },

  // TikTok/Instagram - Vertical or square format
  tiktok: {
    name: 'TikTok / Reels',
    description: 'Optimized for TikTok and Instagram Reels (vertical, smaller file)',
    resolution: '720p',
    videoBitrate: '4000k',  // 4 Mbps for smaller file
    audioBitrate: '128k',
    frameRate: 30,
    format: 'mp4',
    notes: 'Vertical format, optimized for mobile viewing'
  },

  // Twitter/X - GIF-like or short clips
  twitter: {
    name: 'Twitter / X',
    description: 'Optimized for Twitter (maximum 15min, high quality at 720p)',
    resolution: '720p',
    videoBitrate: '6000k',
    audioBitrate: '160k',
    frameRate: 30,
    format: 'mp4',
    notes: 'Max 15min duration, H.264 MP4'
  },

  // LinkedIn - Professional content
  linkedin: {
    name: 'LinkedIn',
    description: 'Optimized for LinkedIn (1080p, professional quality)',
    resolution: '1080p',
    videoBitrate: '6000k',
    audioBitrate: '160k',
    frameRate: 30,
    format: 'mp4',
    notes: 'Professional video format'
  },

  // Vimeo - High-quality streaming
  vimeo: {
    name: 'Vimeo',
    description: 'Optimized for Vimeo (1080p or 4K, highest quality)',
    resolution: '1080p',
    videoBitrate: '10000k',  // 10 Mbps for higher quality
    audioBitrate: '192k',
    frameRate: 60,
    format: 'mp4',
    notes: 'High-quality streaming platform'
  },

  // Discord - Lower file size for sharing
  discord: {
    name: 'Discord',
    description: 'Optimized for Discord (720p, smaller file < 25MB)',
    resolution: '720p',
    videoBitrate: '2500k',  // 2.5 Mbps for smaller file
    audioBitrate: '128k',
    frameRate: 30,
    format: 'mp4',
    notes: 'Optimized for Discord file size limits'
  },

  // Web - General web hosting
  web: {
    name: 'Web Streaming',
    description: 'Optimized for web hosting (1080p, balanced quality/size)',
    resolution: '1080p',
    videoBitrate: '5000k',
    audioBitrate: '128k',
    frameRate: 30,
    format: 'mp4',
    notes: 'Balanced quality and file size for web'
  },

  // Mobile - Phone playback
  mobile: {
    name: 'Mobile',
    description: 'Optimized for mobile playback (480p, small file)',
    resolution: '720p',  // Note: using 720p since our presets support source/720p/1080p
    videoBitrate: '2000k',
    audioBitrate: '128k',
    frameRate: 24,
    format: 'mp4',
    notes: 'Optimized for mobile devices'
  },

  // Archive - Maximum quality (lossless-ish)
  archive: {
    name: 'Archive (Maximum Quality)',
    description: 'Maximum quality for archival (1080p, highest bitrate)',
    resolution: '1080p',
    videoBitrate: '12000k',  // 12 Mbps for maximum quality
    audioBitrate: '256k',
    frameRate: 60,
    format: 'mp4',
    notes: 'Highest quality for archival purposes'
  }
};

/**
 * Get all available presets as an array
 */
export function getPresets() {
  return Object.entries(EXPORT_PRESETS).map(([key, preset]) => ({
    id: key,
    ...preset
  }));
}

/**
 * Get a specific preset by ID
 */
export function getPreset(presetId) {
  return EXPORT_PRESETS[presetId];
}

/**
 * Get user-friendly description of a preset's settings
 */
export function getPresetDescription(presetId) {
  const preset = EXPORT_PRESETS[presetId];
  if (!preset) return '';

  return `${preset.resolution} • ${preset.videoBitrate} • ${preset.description}`;
}

/**
 * Apply preset settings to export settings object
 * Maps preset bitrate to our existing resolution options
 */
export function applyPreset(presetId) {
  const preset = EXPORT_PRESETS[presetId];
  if (!preset) return null;

  return {
    resolution: preset.resolution,
    // Note: Current export dialog only supports resolution setting
    // Future enhancement: add bitrate and frameRate controls
  };
}
