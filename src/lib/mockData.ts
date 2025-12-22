export interface ContentItem {
  id: string;
  title: string;
  type: "image" | "video" | "template" | "qrcode";
  url: string;
  thumbnail: string;
  duration: number;
  createdAt: string;
}

export interface Playlist {
  id: string;
  name: string;
  items: ContentItem[];
  totalDuration: number;
  active: boolean;
}

export interface Advertiser {
  id: string;
  name: string;
  plan: "Basic" | "Premium" | "Gold";
  status: "Ativo" | "Pausado";
  value: number;
  logo: string;
}

export const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "Promoção Burger",
    type: "image",
    url: "https://images.unsplash.com/photo-1578752908072-1823395fd603?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    thumbnail: "https://images.unsplash.com/photo-1578752908072-1823395fd603?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
    duration: 10,
    createdAt: "2023-10-01",
  },
  {
    id: "2",
    title: "Drink Especial",
    type: "image",
    url: "https://images.unsplash.com/photo-1650691960684-c15e3e2d5c85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    thumbnail: "https://images.unsplash.com/photo-1650691960684-c15e3e2d5c85?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
    duration: 10,
    createdAt: "2023-10-02",
  },
  {
    id: "3",
    title: "Video Institucional",
    type: "video",
    url: "https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4", // Placeholder
    thumbnail: "https://images.unsplash.com/photo-1742822050731-dc9da52dad2e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
    duration: 15,
    createdAt: "2023-10-05",
  },
  {
    id: "4",
    title: "Menu QR Code",
    type: "qrcode",
    url: "",
    thumbnail: "https://upload.wikimedia.org/wikipedia/commons/d/d0/QR_code_for_mobile_English_Wikipedia.svg",
    duration: 30,
    createdAt: "2023-10-10",
  },
  {
    id: "5",
    title: "Fundo Abstrato",
    type: "template",
    url: "https://images.unsplash.com/photo-1688413709025-5f085266935a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
    thumbnail: "https://images.unsplash.com/photo-1688413709025-5f085266935a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200",
    duration: 10,
    createdAt: "2023-10-12",
  }
];

export const mockPlaylists: Playlist[] = [
  {
    id: "1",
    name: "Playlist Principal - Manhã",
    items: [mockContent[0], mockContent[1], mockContent[4]],
    totalDuration: 30,
    active: true,
  },
  {
    id: "2",
    name: "Happy Hour Especial",
    items: [mockContent[1], mockContent[2], mockContent[3]],
    totalDuration: 55,
    active: false,
  }
];

export const mockAdvertisers: Advertiser[] = [
  { id: "1", name: "Coca-Cola", plan: "Gold", status: "Ativo", value: 1500, logo: "C" },
  { id: "2", name: "Heineken", plan: "Premium", status: "Ativo", value: 900, logo: "H" },
  { id: "3", name: "Bar do Zé", plan: "Basic", status: "Pausado", value: 300, logo: "B" },
];
