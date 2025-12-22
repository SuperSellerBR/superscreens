import { useEffect } from "react";

export function DurationHandler({ duration, onComplete }: any) {
    useEffect(() => {
        const timer = setTimeout(onComplete, (duration || 10) * 1000);
        return () => clearTimeout(timer);
    }, [duration, onComplete]);
    return null;
}