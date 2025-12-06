export interface VideoMetadata {
  id: string;
  url: string;
  title: string;
  channel: string;
  views: string;
  description: string;
  summary: string;
  thumbnailUrl: string;
  formats: {
    itag: number;
    quality: string;
    container: string;
    hasVideo: boolean;
    hasAudio: boolean;
    contentLength: string;
  }[];
}

export interface DownloadOption {
  quality: string;
  format: string;
  size: string;
  type: 'video' | 'audio';
  itag?: number;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  READY = 'READY',
  DOWNLOADING = 'DOWNLOADING',
  ERROR = 'ERROR',
  COMPLETE = 'COMPLETE'
}

export interface GroundingSource {
  web: {
    uri: string;
    title: string;
  }
}