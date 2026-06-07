import { useEffect, useRef, useState } from 'react';

export function AudioPreview({ url }: { url: string | null | undefined }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    setPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, [url]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play().catch(() => undefined);
    }
    setPlaying(!playing);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={toggle}
        disabled={!url}
        className="h-24 w-24 rounded-full bg-spotify-green text-black grid place-items-center text-4xl shadow-lg shadow-spotify-green/30 hover:scale-105 active:scale-95 transition-transform disabled:opacity-40"
      >
        {playing ? '❚❚' : '▶'}
      </button>
      <p className="text-sm text-spotify-gray">
        {url ? 'Tap to play the 30s preview' : 'No preview available for this track'}
      </p>
      {url && (
        <audio
          ref={audioRef}
          src={url}
          onEnded={() => setPlaying(false)}
          preload="auto"
        />
      )}
    </div>
  );
}
