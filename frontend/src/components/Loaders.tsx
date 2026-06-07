export function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <div className="h-12 w-12 rounded-full border-4 border-spotify-green/30 border-t-spotify-green animate-spin" />
      <p className="text-spotify-gray text-sm">Loading your music…</p>
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full" />
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}
