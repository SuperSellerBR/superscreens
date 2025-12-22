import { useState, useMemo } from "react";
import ReactPlayer from "react-player";

const adPlayerConfig = {
    file: {
        attributes: {
            style: { objectFit: "cover", width: "100%", height: "100%" },
            playsInline: true,
            muted: true
        }
    }
};

export function AdPlayer({ url }: { url: string }) {
    const isYouTube = useMemo(() => url.includes('youtube.com') || url.includes('youtu.be'), [url]);
    const [ready, setReady] = useState(false);

    if (isYouTube) {
        return (
            <ReactPlayer
                url={url}
                playing={ready}
                muted={true}
                loop={true}
                width="100%"
                height="100%"
                config={adPlayerConfig}
                onReady={() => setReady(true)}
                onError={(e: any) => {
                    if (e?.name === 'AbortError' || e?.message?.includes('interrupted')) return;
                    console.error("Ad YouTube Error:", e);
                }}
            />
        );
    }

    return (
        <video
            src={url}
            className="w-full h-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            onError={(e) => console.error("Ad Video Tag Error:", e)}
        />
    );
}