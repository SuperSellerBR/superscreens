import { useState } from "react";
import ReactPlayer from "react-player";

const reactPlayerConfig = {
    file: {
        attributes: {
            style: { objectFit: "contain", width: "100%", height: "100%" },
            playsInline: true,
            muted: true // Fallback for autoplay policy
        }
    }
};

export function StandardPlayer({ url, isPlaying, isMuted, onComplete, onUnmuteFailed }: any) {
    // Simplified Standard Player using declarative props to avoid Ref/useEffect conflicts
    // and AbortErrors.
    const [ready, setReady] = useState(false);
    
    return (
        <div className="w-full h-full bg-black">
            <ReactPlayer
                url={url}
                playing={ready && isPlaying}
                muted={isMuted}
                width="100%"
                height="100%"
                onEnded={onComplete}
                config={reactPlayerConfig}
                onReady={() => setReady(true)}
                onError={(e: any) => {
                    // Ignore AbortError as it usually happens on unmount/skip
                    if (e?.name === 'AbortError' || e?.message?.includes('interrupted')) {
                        return;
                    }
                    console.error("Video Error:", e);
                    // On fatal error, skip to next item after a brief delay
                    setTimeout(() => {
                        if (onComplete) onComplete();
                    }, 1000);
                }}
                // Handle Autoplay blocks
                onPlay={() => {
                   // Successful play
                }}
                onPause={() => {
                   // If we paused but expect to be playing, and we are not muted, 
                   // it might be an autoplay block.
                   if (isPlaying && !isMuted) {
                       console.warn("Playback paused unexpectedly (likely Autoplay Policy). Requesting mute fallback.");
                       if (onUnmuteFailed) onUnmuteFailed();
                   }
                }}
            />
        </div>
    );
}