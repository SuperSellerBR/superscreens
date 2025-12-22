import { useEffect, useRef, useCallback, useMemo } from "react";
import YouTube from "react-youtube";
import { getYouTubeID } from "../../lib/utils";

export function YouTubePlayer({ url, isPlaying, isMuted, onComplete, onUnmuteFailed }: any) {
    const playerRef = useRef<any>(null);
    const onCompleteRef = useRef(onComplete);

    // Keep onCompleteRef updated
    useEffect(() => {
        onCompleteRef.current = onComplete;
    }, [onComplete]);

    // Stable callback
    const handleStateChange = useCallback((event: any) => {
        // YouTube States: -1 (unstarted), 0 (ended), 1 (playing), 2 (paused), 3 (buffering), 5 (video cued)
        if (event.data === 0) {
            if (onCompleteRef.current) onCompleteRef.current();
        }
        
        // Auto-resume if paused by browser policy but we expect to be playing
        if (event.data === 2 && isPlaying) {
             // Verify if it wasn't a manual pause (unlikely in this component structure, but good to be safe)
             // We force play again. Use a small timeout to let the browser "breathe"
             setTimeout(() => {
                 if (playerRef.current && isPlaying) {
                     playerRef.current.playVideo();
                 }
             }, 250);
        }
    }, [isPlaying]);

    // Static options
    const opts = useMemo(() => ({
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 1,
            controls: 0,
            rel: 0,
            modestbranding: 1,
            fs: 0, // Disable fullscreen button in player to avoid conflicts
            disablekb: 1, // Disable keyboard
            iv_load_policy: 3, // Hide annotations
            playsinline: 1 // Prevents native player takeover on some devices
        }
    }), []);

    const onReady = (event: any) => {
        playerRef.current = event.target;
        // Always start muted to ensure autoplay works
        event.target.mute();
        event.target.playVideo();
        
        // Then try to apply requested state after a short delay
        setTimeout(() => {
            if (playerRef.current) {
                if (!isMuted) {
                    playerRef.current.unMute();
                    // If unmute causes pause (browser policy), the onStateChange handler will catch it and try to resume
                }
                
                if (!isPlaying) {
                    playerRef.current.pauseVideo();
                }
            }
        }, 500);
    };

    // Imperative Play/Pause
    useEffect(() => {
        if (!playerRef.current) return;
        if (isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
    }, [isPlaying]);

    // Imperative Mute with Safe Resume
    useEffect(() => {
        if (!playerRef.current) return;
        try {
            if (isMuted) {
                playerRef.current.mute();
            } else {
                playerRef.current.unMute();
                // Critical: Browser might pause the video if unmute fails due to lack of interaction.
                if (isPlaying) {
                    // We don't chain .catch here because YouTube API doesn't return promises for playVideo
                    playerRef.current.playVideo(); 
                    
                    // Check if it actually played or paused
                    setTimeout(() => {
                        const state = playerRef.current.getPlayerState();
                        if (state === 2) { // Paused
                            if (onUnmuteFailed) onUnmuteFailed();
                            playerRef.current.mute();
                            playerRef.current.playVideo();
                        }
                    }, 500);
                }
            }
        } catch (e) {
            console.error("YouTube Player Error:", e);
        }
    }, [isMuted, isPlaying, onUnmuteFailed]);

    return (
        <div className="w-full h-full pointer-events-none">
            <YouTube 
                videoId={getYouTubeID(url)}
                opts={opts}
                onStateChange={handleStateChange}
                onReady={onReady}
                className="w-full h-full"
            />
        </div>
    );
}