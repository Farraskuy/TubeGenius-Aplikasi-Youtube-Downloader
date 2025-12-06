const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');
const app = express();
const port = process.env.PORT || 3001; // Use PORT env var for Render

const ytDlpPath = path.join(__dirname, 'yt-dlp');

app.use(cors({
    exposedHeaders: ['Content-Disposition'],
}));
app.use(express.json());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

const getVideoInfo = (url) => {
    return new Promise((resolve, reject) => {
        // Add --no-warnings and --no-playlist for optimization
        const process = spawn(ytDlpPath, ['--dump-single-json', '--no-warnings', '--no-playlist', url]);
        let data = '';
        let error = '';

        // Set a timeout of 20 seconds
        const timeout = setTimeout(() => {
            process.kill();
            reject(new Error('Analysis timed out after 20 seconds'));
        }, 20000);

        process.stdout.on('data', (chunk) => {
            data += chunk;
        });

        process.stderr.on('data', (chunk) => {
            error += chunk;
        });

        process.on('close', (code) => {
            clearTimeout(timeout);
            if (code === 0) {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(new Error('Failed to parse JSON output'));
                }
            } else {
                reject(new Error(error || 'yt-dlp process failed or timed out'));
            }
        });
    });
};

app.get('/api/analyze', async (req, res) => {
    const { url } = req.query;
    console.log(`[Analyze] Request received for URL: ${url}`);
    
    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        const startTime = Date.now();
        const info = await getVideoInfo(url);
        const duration = Date.now() - startTime;
        console.log(`[Analyze] Successfully fetched info in ${duration}ms`);
        
        // Process formats
        const formats = info.formats.map(f => {
            const hasVideo = f.vcodec && f.vcodec !== 'none';
            const hasAudio = f.acodec && f.acodec !== 'none';
            
            return {
                itag: f.format_id, 
                quality: f.format_note || (f.height ? `${f.height}p` : '') || (f.abr ? `${Math.round(f.abr)}kbps` : 'Unknown'),
                container: f.ext,
                hasVideo: hasVideo,
                hasAudio: hasAudio,
                contentLength: f.filesize || f.filesize_approx || 0
            };
        }).filter(f => f.contentLength > 0 || f.hasVideo || f.hasAudio);

        // Deduplicate and select best options
        const videoFormats = new Map();
        const audioFormats = new Map();

        formats.forEach(f => {
            if (f.hasVideo && f.container === 'mp4') {
                const quality = f.quality;
                if (!quality) return;
                
                const existing = videoFormats.get(quality);
                if (!existing || (!existing.hasAudio && f.hasAudio)) {
                    videoFormats.set(quality, f);
                }
            } else if (!f.hasVideo && f.hasAudio) {
                const quality = f.quality;
                if (!audioFormats.has(quality)) {
                    audioFormats.set(quality, f);
                }
            }
        });

        const processedFormats = [
            ...Array.from(videoFormats.values()),
            ...Array.from(audioFormats.values())
        ].map(f => ({
            ...f,
            itag: isNaN(Number(f.itag)) ? f.itag : Number(f.itag)
        }));

        // Sort
        processedFormats.sort((a, b) => {
            if (a.hasVideo && !b.hasVideo) return -1;
            if (!a.hasVideo && b.hasVideo) return 1;
            const heightA = parseInt(a.quality) || 0;
            const heightB = parseInt(b.quality) || 0;
            return heightB - heightA;
        });

        const metadata = {
            id: info.id,
            url: info.webpage_url,
            title: info.title,
            channel: info.uploader,
            views: formatViews(info.view_count),
            description: info.description ? info.description.substring(0, 200) + '...' : '',
            summary: "Ready to download",
            thumbnailUrl: info.thumbnail,
            duration: formatDuration(info.duration),
            formats: processedFormats
        };

        res.json(metadata);
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: error.message || 'Failed to analyze video' });
    }
});

app.get('/api/download', async (req, res) => {
    const { url, itag, type, title } = req.query;
    console.log(`[Download] Request received: URL=${url}, itag=${itag}, type=${type}`);

    if (!url) {
        return res.status(400).json({ error: 'URL is required' });
    }

    try {
        let formatArgs = [];
        if (itag) {
            formatArgs = ['-f', `${itag}+bestaudio/${itag}`];
        } else {
            if (type === 'audio') {
                formatArgs = ['-f', 'bestaudio', '-x', '--audio-format', 'mp3'];
            } else {
                formatArgs = ['-f', 'bestvideo+bestaudio/best', '--merge-output-format', 'mp4'];
            }
        }

        const args = [
            url,
            '-o', '-',
            ...formatArgs
        ];
        
        console.log(`[Download] Spawning yt-dlp with args: ${args.join(' ')}`);

        const process = spawn(ytDlpPath, args);

        // Sanitize title for filename
        const safeTitle = (title || 'video').replace(/[^a-zA-Z0-9-_ ]/g, '').trim().replace(/\s+/g, '_');
        const filename = `${safeTitle}.${type === 'audio' ? 'mp3' : 'mp4'}`;
        res.header('Content-Disposition', `attachment; filename="${filename}"`);
        
        process.stdout.pipe(res);

        process.stderr.on('data', (data) => {
            console.error(`[yt-dlp stderr]: ${data}`);
        });

        process.on('close', (code) => {
            console.log(`[Download] Process finished with code ${code}`);
            if (code !== 0 && !res.headersSent) {
                res.status(500).json({ error: 'Download failed' });
            }
        });

    } catch (error) {
        console.error('[Download] Error:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to start download' });
        }
    }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const formatViews = (views) => {
    if (!views) return '0';
    if (views >= 1000000) return (views / 1000000).toFixed(1) + 'M';
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
};

const formatDuration = (seconds) => {
    if (!seconds) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    
    if (h > 0) {
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
};

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
