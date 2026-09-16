'use client';

import { useEffect, useRef } from 'react';
import Hls from 'hls.js';

interface Props {
  src: string;
  poster?: string;
  autoPlay?: boolean;
}

export default function VideoPlayer({ src, poster, autoPlay = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play().catch(() => {});
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      if (autoPlay) {
        video.play().catch(() => {});
      }
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [src, autoPlay]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        poster={poster}
        preload="metadata"
      />
    </div>
  );
}
