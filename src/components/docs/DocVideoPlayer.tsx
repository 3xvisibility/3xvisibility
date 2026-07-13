import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Subtitles } from "lucide-react";

interface DocVideoPlayerProps {
  src: string;
  captionSrc?: string;
  captionLang?: string;
  captionLabel?: string;
  className?: string;
}

const SPEEDS = ["0.5", "0.75", "1", "1.25", "1.5", "2"];

export function DocVideoPlayer({
  src,
  captionSrc,
  captionLang = "en",
  captionLabel = "English",
  className,
}: DocVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [speed, setSpeed] = useState("1");
  const [captionsEnabled, setCaptionsEnabled] = useState(true);
  const wasPlayingRef = useRef(false);

  // Apply playback speed changes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = Number(speed);
  }, [speed]);

  // Toggle captions on/off.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const track = video.textTracks[0];
    if (track) {
      track.mode = captionsEnabled ? "showing" : "hidden";
    }
  }, [captionsEnabled]);

  // Auto-pause when the video leaves the viewport and resume when it returns,
  // but only if it was playing before it went out of view.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.intersectionRatio < 0.5) {
            if (!video.paused) {
              wasPlayingRef.current = true;
              video.pause();
            }
          } else if (wasPlayingRef.current && video.paused) {
            video.play().catch(() => {
              // Ignore autoplay-policy errors; user can resume manually.
            });
            wasPlayingRef.current = false;
          }
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );

    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={cn("overflow-hidden rounded-xl border border-border bg-card", className)}>
      <video
        ref={videoRef}
        src={src}
        className="w-full aspect-video bg-background"
        autoPlay
        muted
        loop
        playsInline
        controls
        preload="metadata"
        crossOrigin="anonymous"
      >
        {captionSrc && (
          <track
            kind="captions"
            src={captionSrc}
            srcLang={captionLang}
            label={captionLabel}
            default
          />
        )}
      </video>

      <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-border bg-card/80">
        <span className="text-xs text-muted-foreground hidden sm:inline">
          Auto-pauses when scrolled out of view
        </span>
        <div className="flex items-center gap-2 ml-auto">
          {captionSrc && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCaptionsEnabled((v) => !v)}
              className={cn(
                "h-8 gap-1.5 text-xs",
                captionsEnabled && "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
              )}
              aria-pressed={captionsEnabled}
            >
              <Subtitles className="h-3.5 w-3.5" />
              CC
            </Button>
          )}

          <Select value={speed} onValueChange={setSpeed}>
            <SelectTrigger className="h-8 w-[4.5rem] text-xs" aria-label="Playback speed">
              <SelectValue placeholder="1x" />
            </SelectTrigger>
            <SelectContent>
              {SPEEDS.map((s) => (
                <SelectItem key={s} value={s} className="text-xs">
                  {s}x
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
