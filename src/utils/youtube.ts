/**
 * Extracts the YouTube Video ID from various URL formats.
 * Supports: standard, short, embed, and mobile URLs.
 */
export const extractVideoId = (url: string): string | null => {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?)|(shorts\/))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[8].length === 11) ? match[8] : null;
};

/**
 * Generates the thumbnail URL for a given video ID.
 */
export const getThumbnailUrl = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
};

/**
 * Formats a number into a readable string (e.g., 1.5M views).
 */
export const formatViews = (views: number): string => {
  if (views >= 1000000) {
    return (views / 1000000).toFixed(1) + 'M';
  }
  if (views >= 1000) {
    return (views / 1000).toFixed(1) + 'K';
  }
  return views.toString();
};