import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export type PlayerStatus = {
  isPlaying: boolean;
  currentId: string | null;
  currentIndex: number;
  volume: number;
  isMuted: boolean;
  isShuffle: boolean;
  queue: string[];
  layoutMode: 'auto' | 'fullscreen' | 'l-bar';
  showTicker: boolean;
};

export function usePlayerControl(userId: string) {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<PlayerStatus>({
    isPlaying: true,
    currentId: null,
    currentIndex: 0,
    volume: 100,
    isMuted: true,
    isShuffle: false,
    queue: [],
    layoutMode: 'auto',
    showTicker: true
  });

  const channelRef = useRef<any>(null);

  const [isPlayerActive, setIsPlayerActive] = useState(false);
  const lastHeartbeat = useRef<number>(0);

  useEffect(() => {
    if (!supabase) return;

    // Watchdog for Player Activity
    const watchdog = setInterval(() => {
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeat.current;
        // If no heartbeat for over 45 seconds (TV sends every 30s), consider offline
        // Note: checking > 45s allows for some network latency/jitter
        if (isPlayerActive && timeSinceLastHeartbeat > 45000) {
            setIsPlayerActive(false);
        }
    }, 5000);

    // Use user-specific channel if available
    const channelName = userId ? `tv-control-${userId}` : 'tv-control';

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false, ack: true },
        presence: { key: 'remote-control' }
      }
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          // Check if 'tv-player' is present in the state
          if ('tv-player' in state) {
              setIsPlayerActive(true);
              lastHeartbeat.current = Date.now();
          }
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          if (key === 'tv-player') {
              setIsPlayerActive(true);
              lastHeartbeat.current = Date.now();
              // Request status immediately when player joins
              channel.send({
                  type: 'broadcast',
                  event: 'get_status',
                  payload: {}
              });
          }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
           if (key === 'tv-player') {
               setIsPlayerActive(false);
           }
      })
      .on('broadcast', { event: 'status_update' }, (payload) => {
        // console.log("Status Update Received:", payload.payload);
        setStatus(prev => ({ ...prev, ...payload.payload }));
        lastHeartbeat.current = Date.now();
        setIsPlayerActive(true);
      })
      .on('broadcast', { event: 'queue_update' }, (payload) => {
        if (payload.payload?.queue) {
           setStatus(prev => ({ ...prev, queue: payload.payload.queue }));
           // Queue update also counts as activity
           lastHeartbeat.current = Date.now();
           setIsPlayerActive(true);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          await channel.track({ online_at: new Date().toISOString() });
          
          // Request initial status immediately
          channel.send({
            type: 'broadcast',
            event: 'get_status',
            payload: {}
          });
        } else {
          setIsConnected(false);
          // If socket drops, player is definitely not active to us
          setIsPlayerActive(false);
        }
      });

    return () => {
      clearInterval(watchdog);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setIsConnected(false);
      setIsPlayerActive(false);
    };
  }, [userId]);

  const sendCommand = useCallback(async (action: string, payload: any = {}) => {
    if (!channelRef.current || !isConnected) return;
    try {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'control_command',
        payload: { action, ...payload }
      });
      // toast.success(`Comando enviado: ${action}`); 
    } catch (err) {
      console.error("Error sending command:", err);
      toast.error("Erro ao enviar comando. Verifique a conexão.");
    }
  }, [isConnected]);

  return {
    isConnected,
    isPlayerActive,
    status,
    play: () => sendCommand('PLAY'),
    pause: () => sendCommand('PAUSE'),
    next: () => sendCommand('NEXT'),
    prev: () => sendCommand('PREV'),
    toggleMute: () => sendCommand('TOGGLE_MUTE'),
    setVolume: (vol: number) => sendCommand('SET_VOLUME', { volume: vol }),
    jumpTo: (id: string) => sendCommand('JUMP_TO', { id }),
    removeFromQueue: (index: number) => sendCommand('REMOVE_FROM_QUEUE', { index }),
    clearQueue: () => sendCommand('CLEAR_QUEUE'),
    reload: () => sendCommand('RELOAD'),
    toggleTicker: () => sendCommand('TOGGLE_TICKER'),
    toggleShuffle: () => sendCommand('TOGGLE_SHUFFLE'),
    toggleLayout: () => sendCommand('TOGGLE_LAYOUT'),
    requestVideo: (item: { id: string, title: string }) => {
        if (!channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'request_video',
            payload: { id: item.id, title: item.title }
        });
    }
  };
}
