import React, { useState } from 'react';
import axios from 'axios';
import Navbar from './components/Navbar';
import DownloadCard from './components/DownloadCard';
import { extractVideoId } from './utils/youtube';
import { VideoMetadata, AppState, DownloadOption } from './types';
import { Search, Link as LinkIcon, AlertCircle, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [url, setUrl] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setError(null);
    const videoId = extractVideoId(url);

    if (!videoId) {
      setError("Please enter a valid YouTube URL (Video or Shorts).");
      return;
    }

    setAppState(AppState.ANALYZING);
    setMetadata(null);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
      const response = await fetch(`http://localhost:3001/api/analyze?url=${encodeURIComponent(url)}`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      const data = await response.json();
      
      setMetadata(data);
      setAppState(AppState.READY);
    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(err);
      if (err.name === 'AbortError') {
        setError("Analysis timed out. The server took too long to respond.");
      } else {
        setError(err.message || "Failed to analyze video. Ensure the backend server is running.");
      }
      setAppState(AppState.IDLE);
    }
  };

  const handleDownload = async (option: DownloadOption) => {
    if (!metadata) return;

    setAppState(AppState.DOWNLOADING);
    setProgress(0);

    try {
      const itagParam = option.itag ? `&itag=${option.itag}` : '';
      // Pass title to server for filename generation
      const titleParam = `&title=${encodeURIComponent(metadata.title)}`;
      const downloadUrl = `http://localhost:3001/api/download?url=${encodeURIComponent(metadata.url)}&type=${option.type}${itagParam}${titleParam}`;
      
      // Try to parse size from option string (e.g. "15.5 MB") to bytes for progress fallback
      let estimatedSize = 0;
      if (option.size && option.size !== 'Unknown') {
        const match = option.size.match(/([\d.]+)\s*MB/);
        if (match) {
          estimatedSize = parseFloat(match[1]) * 1024 * 1024;
        }
      }

      const response = await axios.get(downloadUrl, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const total = progressEvent.total || estimatedSize;
          if (total > 0) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / total);
            setProgress(Math.min(percentCompleted, 99)); // Cap at 99 until done
          } else {
             // Fake progress if unknown
             setProgress((prev) => (prev < 90 ? prev + 5 : prev));
          }
        }
      });

      // Create a link to download the blob
      const url = globalThis.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from header if possible, or fallback
      const contentDisposition = response.headers['content-disposition'];
      let filename = `download.${option.format.toLowerCase()}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch?.length === 2)
          filename = filenameMatch[1];
      } else {
         // Fallback filename using title
         const safeTitle = metadata.title.replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
         filename = `${safeTitle}.${option.format.toLowerCase()}`;
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      link.remove();
      globalThis.URL.revokeObjectURL(url);

      setProgress(100);
      setAppState(AppState.COMPLETE);
      
    } catch (e) {
      console.error("Download failed", e);
      setError("Could not download file. Please try again.");
      setAppState(AppState.IDLE);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch (err) {
      // Permission denied or not supported
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-brand-500/30">
      <Navbar />

      <main className="container mx-auto px-4 py-12 flex flex-col items-center">
        
        {/* Hero Section */}
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold mb-6 border border-brand-500/20">
            <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse"></span>
            Universal Video Extractor
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400">
            Download Video & Shorts <br />
            <span className="text-brand-500">Fast & Free</span>
          </h1>
          <p className="text-gray-400 text-lg leading-relaxed">
            Extract high-quality MP4 and MP3 files from any YouTube URL instantly. No registration required.
          </p>
        </div>

        {/* Input Section */}
        <div className="w-full max-w-3xl relative z-10">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex items-center bg-slate-900 border border-white/10 rounded-xl p-2 shadow-2xl">
              <div className="pl-4 text-gray-500">
                <LinkIcon className="w-5 h-5" />
              </div>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste YouTube Video or Shorts URL here..." 
                className="w-full bg-transparent border-none text-white placeholder-gray-500 focus:ring-0 px-4 py-3 text-lg"
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />
              <div className="flex gap-2">
                {!url && (
                  <button 
                    onClick={handlePaste}
                    className="hidden md:flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-all"
                  >
                    Paste
                  </button>
                )}
                <button 
                  onClick={handleAnalyze}
                  disabled={appState === AppState.ANALYZING}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-brand-900/20 disabled:opacity-70 disabled:cursor-not-allowed min-w-[140px] justify-center"
                >
                  {appState === AppState.ANALYZING ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Start</span>
                      <Search className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400 text-sm animate-fade-in-up">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        {/* Results Section */}
        {(metadata) && (
          <DownloadCard 
            metadata={metadata} 
            onDownload={handleDownload}
            appState={appState}
            progress={progress}
          />
        )}

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mt-24">
          <Feature 
            title="Real HD Video" 
            desc="Downloads true .mp4 files compatible with all media players."
          />
          <Feature 
            title="High Quality Audio" 
            desc="Extract crystal clear .mp3 audio from music videos and talks."
          />
          <Feature 
            title="Instant Processing" 
            desc="Powered by advanced cloud transcoding for minimal wait times."
          />
        </div>

        <footer className="mt-24 text-gray-500 text-sm text-center">
          <p>© {new Date().getFullYear()} TubeGenius. All rights reserved.</p>
        </footer>

      </main>
    </div>
  );
};

const Feature: React.FC<{title: string, desc: string}> = ({ title, desc }) => (
  <div className="p-6 rounded-2xl bg-slate-900/50 border border-white/5 hover:border-brand-500/20 transition duration-300">
    <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
    <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
  </div>
);

export default App;
