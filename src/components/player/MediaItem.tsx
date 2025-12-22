import { DurationHandler } from "./DurationHandler";
import { YouTubePlayer } from "./YouTubePlayer";
import { StandardPlayer } from "./StandardPlayer";

export function MediaItem({ item, onComplete, isPlaying, isMuted, onUnmuteFailed }: any) {
  if (!item) return null;

  if (item.type === 'image') {
    return (
       <div className="w-full h-full relative">
          <img src={item.url} className="w-full h-full object-contain" />
          <DurationHandler duration={item.duration} onComplete={onComplete} />
       </div>
    );
  }

  if (item.type === 'youtube') {
      return (
          <YouTubePlayer 
              url={item.url} 
              isPlaying={isPlaying} 
              isMuted={isMuted} 
              onComplete={onComplete}
              onUnmuteFailed={onUnmuteFailed} 
          />
      );
  }

  return (
      <StandardPlayer 
          url={item.url} 
          isPlaying={isPlaying} 
          isMuted={isMuted} 
          onComplete={onComplete}
          onUnmuteFailed={onUnmuteFailed} 
      />
  );
}