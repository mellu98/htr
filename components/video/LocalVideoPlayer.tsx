'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Film, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn, formatDuration } from '@/lib/utils';

interface LocalVideoPlayerProps {
  slug: string;
  videoPath: string;
  durationSeconds: number;
  initialTime?: number;
  initialPercent?: number;
  onProgress?: (data: { watchedSeconds: number; percent: number }) => void;
  onComplete?: () => void;
}

/**
 * Pure HTML5 <video> player.
 *
 * - Loads ONLY local files under /public/videos/...
 * - Restores currentTime from the DB on mount
 * - Reports progress back via onProgress so the lesson page can save it
 * - Calls onComplete when the user crosses 90%
 * - Renders a graceful placeholder when the file is missing
 *
 * No external video library, no JS player dependency — keeps the bundle small
 * and the behaviour predictable.
 */
export function LocalVideoPlayer({
  slug,
  videoPath,
  durationSeconds,
  initialTime = 0,
  initialPercent = 0,
  onProgress,
  onComplete,
}: LocalVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialTime);
  const [duration, setDuration] = useState(durationSeconds || 0);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const completedFiredRef = useRef(false);

  // Resume from where we left off once metadata loads.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setVideoReady(true);
      if (Number.isFinite(video.duration) && video.duration > 0) {
        setDuration(video.duration);
      }
      if (initialTime > 0 && initialTime < (video.duration || Infinity)) {
        try {
          video.currentTime = initialTime;
        } catch {
          /* ignore — some browsers throw if metadata not yet decoded */
        }
      }
    };
    const handleError = () => {
      setError('Impossibile caricare il file video locale.');
      setMissing(true);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [initialTime]);

  // Periodically persist progress every 5 seconds while playing.
  useEffect(() => {
    if (!isPlaying) return;
    const id = window.setInterval(() => {
      const video = videoRef.current;
      if (!video || !videoReady) return;
      const t = Math.floor(video.currentTime);
      const dur = video.duration || duration || durationSeconds || 1;
      const pct = Math.min(100, Math.round((t / dur) * 100));
      setCurrentTime(t);
      onProgress?.({ watchedSeconds: t, percent: pct });
      if (!completedFiredRef.current && pct >= 90) {
        completedFiredRef.current = true;
        onComplete?.();
      }
    }, 5000);
    return () => window.clearInterval(id);
  }, [isPlaying, videoReady, duration, durationSeconds, onProgress, onComplete]);

  const handleManualPlay = () => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch((e) => setError(String(e)));
  };

  const percent =
    duration > 0
      ? Math.min(100, Math.round((currentTime / duration) * 100))
      : initialPercent;

  if (missing) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-gradient-to-br from-card to-background">
        <div className="absolute inset-0 bg-mesh-dark opacity-50" />
        <div className="relative flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted/60 ring-1 ring-border">
            <Film className="h-7 w-7 text-muted-foreground" />
          </div>
          <div className="max-w-md space-y-1.5">
            <h3 className="text-lg font-semibold tracking-tight">
              Video locale non trovato
            </h3>
            <p className="text-sm text-muted-foreground">
              {error ??
                `Per riprodurre questa lezione devi inserire il file MP4 manualmente in /public/videos/${videoPath
                  .replace('/videos/', '')
                  }`}
            </p>
            <p className="text-xs text-muted-foreground">
              Slug: <code className="rounded bg-muted px-1.5 py-0.5">{slug}</code>
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="/library">Vai alla libreria</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-black shadow-2xl shadow-black/40">
      <video
        ref={videoRef}
        className="aspect-video w-full bg-black"
        controls
        preload="metadata"
        playsInline
        src={videoPath}
      >
        <track kind="captions" />
      </video>

      {!isPlaying && videoReady && (
        <button
          type="button"
          onClick={handleManualPlay}
          aria-label="Play"
          className={cn(
            'pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity',
            'opacity-0 group-hover:opacity-100',
          )}
        >
          <span className="pointer-events-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-brand shadow-2xl shadow-primary/40 transition-transform hover:scale-105">
            <Play className="h-8 w-8 fill-white text-white" />
          </span>
        </button>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-border/40 bg-card/60 px-4 py-2.5 text-xs backdrop-blur">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Film className="h-3.5 w-3.5" />
          <span>
            {formatDuration(currentTime)} / {formatDuration(duration || durationSeconds)}
          </span>
        </div>
        <div className="flex flex-1 items-center gap-3">
          <Progress value={percent} className="h-1.5 max-w-[200px]" />
          <span className="font-mono text-foreground/80">{percent}%</span>
        </div>
        <div className="hidden items-center gap-1.5 text-muted-foreground sm:flex">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400/80" />
          <span>Salvataggio automatico ogni 5s</span>
        </div>
      </div>
    </div>
  );
}
