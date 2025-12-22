export interface PlaylistItem {
  id: string;
  title: string;
  type: 'video' | 'image' | 'ad' | 'youtube';
  duration: number;
  url?: string;
  thumbnail?: string;
}

export interface AdItem {
    id: string;
    url: string;
    type: string;
    duration: number;
    layout: 'sidebar' | 'footer' | 'stripe' | 'fullscreen';
}
