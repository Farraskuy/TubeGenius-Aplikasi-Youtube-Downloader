import React, { useState } from 'react';
import { VideoMetadata, DownloadOption, AppState } from '../types';
import { Download, FileAudio, FileVideo, CheckCircle, Loader2, PlayCircle } from 'lucide-react';

interface DownloadCardProps {
  metadata: VideoMetadata;
  onDownload: (option: DownloadOption) => void;
  appState: AppState;
  progress: number;
}

const DownloadCard: React.FC<DownloadCardProps> = ({ metadata, onDownload, appState, progress }) => {
  const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');

  const options: DownloadOption[] = metadata.formats
    ? metadata.formats.map(f => ({
        quality: f.quality,
        format: f.container.toUpperCase(),
        size: f.contentLength ? `${(Number.parseInt(f.contentLength) / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
        type: f.hasVideo ? 'video' : 'audio',
        itag: f.itag
      }))
    : [
        { quality: '1080p', format: 'MP4', size: 'High', type: 'video' },
        { quality: '720p', format: 'MP4', size: 'Medium', type: 'video' },
        { quality: '480p', format: 'MP4', size: 'Low', type: 'video' },
        { quality: '320kbps', format: 'MP3', size: 'High', type: 'audio' },
        { quality: '128kbps', format: 'MP3', size: 'Medium', type: 'audio' },
      ];

  const filteredOptions = options.filter(opt => opt.type === activeTab);

  const [downloadingItag, setDownloadingItag] = useState<number | null>(null);

  const handleDownloadClick = (opt: DownloadOption) => {
    setDownloadingItag(opt.itag || null);
    onDownload(opt);
  };

  // Reset downloading state when appState changes to COMPLETE or IDLE
  React.useEffect(() => {
    if (appState === AppState.COMPLETE || appState === AppState.IDLE) {
      setDownloadingItag(null);
    }
  }, [appState]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-8 p-6 rounded-2xl glass-panel border border-white/10 shadow-2xl animate-fade-in-up">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Thumbnail & Quick Stats */}
        <div className="w-full md:w-1/3 flex flex-col gap-4">
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg group">
            <img 
              src={metadata.thumbnailUrl} 
              alt={metadata.title} 
              className="w-full h-full object-cover transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <a href={metadata.url} target="_blank" rel="noreferrer" className="bg-brand-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-brand-700 transition flex items-center gap-2">
                <PlayCircle className="w-4 h-4" /> Watch
              </a>
            </div>
          </div>
          
          <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
            <h3 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-2">Video Summary</h3>
            <p className="text-gray-300 text-sm leading-relaxed line-clamp-4">
              {metadata.summary}
            </p>
          </div>
        </div>

        {/* Right: Info & Download Options */}
        <div className="w-full md:w-2/3 flex flex-col">
          <h1 className="text-2xl font-bold text-white mb-2 line-clamp-2">{metadata.title}</h1>
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-6">
            <span className="font-medium text-brand-400">{metadata.channel}</span>
            <span className="w-1 h-1 rounded-full bg-gray-600"></span>
            <span>{metadata.views} views</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-4 bg-slate-900/50 p-1 rounded-lg w-fit">
            <button 
              onClick={() => setActiveTab('video')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'video' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <FileVideo className="w-4 h-4" /> Video (MP4)
            </button>
            <button 
              onClick={() => setActiveTab('audio')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === 'audio' ? 'bg-brand-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
            >
              <FileAudio className="w-4 h-4" /> Audio (MP3)
            </button>
          </div>

          {/* Download List */}
          <div className="flex flex-col gap-3">
            {filteredOptions.map((opt, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/40 border border-white/5 hover:border-brand-500/30 hover:bg-slate-800/60 transition-all group">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${opt.type === 'video' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {opt.type === 'video' ? 'HD' : 'MP3'}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{opt.quality}</div>
                    <div className="text-xs text-gray-500">{opt.format} • {opt.size} Quality</div>
                  </div>
                </div>
                
                <button 
                  onClick={() => handleDownloadClick(opt)}
                  disabled={appState === AppState.DOWNLOADING}
                  className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 min-w-[120px] justify-center
                    ${downloadingItag === opt.itag && appState === AppState.DOWNLOADING 
                      ? 'bg-brand-600 cursor-wait' 
                      : 'bg-slate-700 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed'}`}
                >
                  {downloadingItag === opt.itag && appState === AppState.DOWNLOADING ? (
                     <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="w-4 h-4" /> Download
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          {appState === AppState.DOWNLOADING && (
            <div className="mt-6 space-y-2 animate-fade-in-up">
              <div className="flex justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {progress < 30 
                    ? 'Resolving stream...' 
                    : (progress < 70 ? 'Transcoding media...' : 'Packaging file...')}
                </span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-brand-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          {appState === AppState.COMPLETE && (
            <div className="mt-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3 text-green-400 animate-pulse-slow">
              <CheckCircle className="w-5 h-5" />
              <div className="text-sm">
                <span className="font-bold">Success!</span> Your file has been generated and is downloading.
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DownloadCard;
