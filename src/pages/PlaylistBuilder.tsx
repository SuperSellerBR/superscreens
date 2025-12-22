import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../components/layout/AdminLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { GripVertical, Clock, Trash2, Play, Search, Youtube, Image as ImageIcon, Plus, Loader2, Settings, Save, ListPlus, Check, HelpCircle, ArrowLeft, Edit, MoreVertical, Shuffle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "../lib/utils";
import { Switch } from "../components/ui/switch";
import { projectId, publicAnonKey } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";

// Interface for Playlist Item
interface PlaylistItem {
  id: string;
  title: string;
  type: 'video' | 'image' | 'ad' | 'youtube';
  duration: number; // seconds
  thumbnail: string;
  url?: string;
  videoId?: string;
}

interface PlaylistMeta {
  id: string;
  name: string;
  createdAt: string;
  itemsCount?: number;
  durationMinutes?: number;
}

const INITIAL_ITEMS: PlaylistItem[] = [];

// Helper to parse duration ISO 8601 (PT1H2M10S) to seconds
const parseDuration = (duration: string): number => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return 0;
  
  const hours = (parseInt(match[1]) || 0);
  const minutes = (parseInt(match[2]) || 0);
  const seconds = (parseInt(match[3]) || 0);
  
  return hours * 3600 + minutes * 60 + seconds;
};

const getPlaylistDurationMinutes = (items: any[]) => {
  const totalSeconds = items.reduce((sum, item) => sum + (Number(item?.duration) || 0), 0);
  return totalSeconds > 0 ? Math.ceil(totalSeconds / 60) : 0;
};

const ItemType = 'PLAYLIST_ITEM';

function DraggableItem({ item, index, moveItem, removeItem }: { item: PlaylistItem, index: number, moveItem: (dragIndex: number, hoverIndex: number) => void, removeItem: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  
  const [{ handlerId }, drop] = useDrop({
    accept: ItemType,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      }
    },
    hover(item: any, monitor) {
      if (!ref.current) return;
      const dragIndex = item.index;
      const hoverIndex = index;
      if (dragIndex === hoverIndex) return;
      
      moveItem(dragIndex, hoverIndex);
      item.index = hoverIndex;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemType,
    item: () => {
      return { id: item.id, index };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  drag(drop(ref));

  return (
    <div 
      ref={ref} 
      data-handler-id={handlerId}
      className={cn(
        "flex items-center gap-2 md:gap-4 p-2 md:p-3 bg-white border border-gray-200 rounded-lg mb-2 group hover:border-[#006CFF] transition-colors shadow-sm",
        isDragging ? "opacity-50" : "opacity-100"
      )}
    >
      <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-[#006CFF]">
        <GripVertical className="h-4 w-4 md:h-5 md:w-5" />
      </div>
      
      <div className="h-10 w-16 md:h-12 md:w-20 bg-gray-100 rounded overflow-hidden flex-shrink-0 relative">
        <img src={item.thumbnail} alt="" className="h-full w-full object-cover" />
        {item.type === 'youtube' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Youtube className="w-5 h-5 md:w-6 md:h-6 text-red-600 drop-shadow-md" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 mr-1">
        <h4 className="text-xs md:text-sm font-medium text-gray-900 truncate">{item.title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <span className={cn(
            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded flex items-center gap-1",
            item.type === 'ad' ? "bg-yellow-100 text-yellow-700" : 
            item.type === 'youtube' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
          )}>
            {item.type === 'ad' ? 'Anúncio' : item.type === 'video' ? 'Vídeo' : item.type === 'youtube' ? 'YouTube' : 'Img'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-4 text-sm text-gray-500 flex-shrink-0">
        <div className="flex items-center gap-1.5 bg-gray-50 px-1.5 md:px-2 py-1 rounded">
          <Clock className="h-3 w-3 md:h-3.5 md:w-3.5" />
          <span className="text-xs md:text-sm">{item.duration}s</span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8 text-gray-400 hover:text-red-500"
          onClick={() => removeItem(index)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function PlaylistBuilder() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'list' | 'editor'>('list'); // 'list' or 'editor'
  
  const [items, setItems] = useState<PlaylistItem[]>(INITIAL_ITEMS);
  const [activeTab, setActiveTab] = useState<'library' | 'youtube'>('youtube');
  const [searchQuery, setSearchQuery] = useState("");
  
  // Playlist Management State
  const [playlists, setPlaylists] = useState<PlaylistMeta[]>([]);
  const [currentPlaylistId, setCurrentPlaylistId] = useState<string>("");
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false);
  const [pendingDuplicateItem, setPendingDuplicateItem] = useState<PlaylistItem | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  
  // Template State
  const [activeTemplate, setActiveTemplate] = useState<'fullscreen' | 'ticker'>('fullscreen');

  // YouTube State
  const [youtubeResults, setYoutubeResults] = useState<any[]>([]);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [prevPageToken, setPrevPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPlaylists, setIsLoadingPlaylists] = useState(true);
  const [error, setError] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Help State
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [sessionToken, setSessionToken] = useState("");
  const [userId, setUserId] = useState("");

  // 1. Load Config & Playlists on Mount
  useEffect(() => {
    const init = async () => {
      // Get Session Token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || publicAnonKey;
      setSessionToken(token);
      setUserId(session?.user?.id || "");

      // Load API Keys & Template
      try {
        const [ytRes, tplRes] = await Promise.all([
          fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/config/youtube`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/config/template`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const ytData = await ytRes.json();
        const tplData = await tplRes.json();

        if (ytData.apiKey) {
          setApiKey(ytData.apiKey);
        }
        if (tplData.template) {
          setActiveTemplate(tplData.template);
        }
      } catch (err) { console.error(err); }

      // Load Playlists
      await loadPlaylists(token);
      // Load Media Library
      await loadMediaLibrary(token);
    };
    init();
  }, []);

  const loadMediaLibrary = async (token = sessionToken) => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/media`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setMediaLibrary(data.media || []);
    } catch (err) {
      console.error("Failed to load media library", err);
    }
  };

  const loadPlaylists = async (token = sessionToken) => {
    setIsLoadingPlaylists(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      const loadedPlaylists = data.playlists || [];

      const enriched = await Promise.all(loadedPlaylists.map(async (playlist: PlaylistMeta) => {
        try {
          const detailsRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists/${playlist.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!detailsRes.ok) return { ...playlist, itemsCount: 0, durationMinutes: 0 };
          const details = await detailsRes.json();
          const items = Array.isArray(details.items) ? details.items : [];
          return {
            ...playlist,
            itemsCount: items.length,
            durationMinutes: getPlaylistDurationMinutes(items)
          };
        } catch {
          return { ...playlist, itemsCount: 0, durationMinutes: 0 };
        }
      }));

      setPlaylists(enriched);

      // We do NOT auto-select playlist anymore to support the list view first
      if (loadedPlaylists.length === 0) {
        // createDefaultPlaylist(); // Let user create one explicitly if they want
      }
    } catch (err) {
      console.error("Failed to load playlists", err);
    } finally {
        setIsLoadingPlaylists(false);
    }
  };

  const createDefaultPlaylist = async () => {
    const defaultPlaylist = { id: 'default', name: 'Playlist Principal', createdAt: new Date().toISOString() };
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ playlists: [defaultPlaylist] })
      });
      setPlaylists([defaultPlaylist]);
      // handleSwitchPlaylist('default'); 
    } catch (err) {
      console.error("Failed to create default playlist");
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) return;
    
    const newPlaylist = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: newPlaylistName, 
      createdAt: new Date().toISOString() 
    };

    // We only send the new playlist to be added (the backend will merge)
    // Actually, backend now expects a list of playlists to merge. 
    // We can send [newPlaylist] and backend logic handles the merge for this user?
    // Looking at backend code: "incomingPlaylists = playlists.map... newMasterIndex = [...otherUsers, ...incomingPlaylists]"
    // If I send ONLY the new one, I might overwrite my OTHER existing playlists if I'm not careful.
    // Backend logic: "const otherUsersPlaylists = masterIndex.filter(p => p.ownerId !== user.id);"
    // It removes ALL playlists of this user from master index, and replaces with `playlists`.
    // So I MUST send ALL playlists of this user.

    const updatedPlaylists = [...playlists, newPlaylist];
    
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ playlists: updatedPlaylists })
      });
      
      setPlaylists(updatedPlaylists);
      setNewPlaylistName("");
      setIsCreatingPlaylist(false);
      
      // Navigate to editor for the new playlist
      handleSwitchPlaylist(newPlaylist.id);
      
      toast.success("Playlist criada!");
    } catch (err) {
      toast.error("Erro ao criar playlist");
    }
  };
  
  const handleDeletePlaylist = async (idToDelete: string, e?: React.MouseEvent) => {
    e?.stopPropagation(); // Prevent card click
    
    if (!confirm("Tem certeza que deseja excluir esta playlist?")) return;

    const updatedPlaylists = playlists.filter(p => p.id !== idToDelete);

    try {
       // Update Index
       await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists/index`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ playlists: updatedPlaylists })
      });

      // Optionally delete the specific playlist key - not strictly necessary but good for cleanup
      // But we don't have a direct delete endpoint for generic keys exposed this way easily without knowing the key prefix structure inside the endpoint logic 
      // The backend probably handles cleanup or we just leave orphan keys for now (it's KV store).
      // Update: Backend has a DELETE endpoint for playlists/:id
      
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists/${idToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${sessionToken}` }
      });

      setPlaylists(updatedPlaylists);
      toast.success("Playlist excluída.");
    } catch (err) {
      toast.error("Erro ao excluir playlist.");
    }
  };

  const handleSwitchPlaylist = async (id: string) => {
    if (!id) return;
    setCurrentPlaylistId(id);
    setItems([]); // Clear current while loading
    
    // Switch view
    setViewMode('editor');

    try {
      // Ensure we have a token
      let token = sessionToken;
      if (!token) {
          const { data: { session } } = await supabase.auth.getSession();
          token = session?.access_token || publicAnonKey;
          setSessionToken(token);
      }

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
          console.error("Failed to fetch playlist", res.status, res.statusText);
          throw new Error("Erro ao carregar playlist");
      }

      const data = await res.json();
      
      // Robust handling of different data structures
      let loadedItems: PlaylistItem[] = [];
      
      if (Array.isArray(data)) {
          loadedItems = data;
      } else if (data.items && Array.isArray(data.items)) {
          loadedItems = data.items;
      } else if (data.playlist && Array.isArray(data.playlist)) {
          loadedItems = data.playlist;
      }

      setItems(loadedItems);
      setIsShuffle(data.shuffle || false);
    } catch (err) {
      console.error("Failed to load playlist items", err);
      toast.error("Não foi possível carregar os itens desta playlist.");
    }
  };

  const handleSave = async (silent = false) => {
    if (!currentPlaylistId) return;
    setIsSaving(true);
    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlists/${currentPlaylistId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ items, shuffle: isShuffle })
      });
      if (!silent) toast.success("Playlist salva!");
    } catch (err) {
      if (!silent) toast.error("Erro ao salvar.");
    } finally {
      setIsSaving(false);
    }
  };

  const moveItem = (dragIndex: number, hoverIndex: number) => {
    const newItems = [...items];
    const [draggedItem] = newItems.splice(dragIndex, 1);
    newItems.splice(hoverIndex, 0, draggedItem);
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    setItems(newItems);
  };

  const addItemToPlaylist = (item: any) => {
    let itemUrl = item.url;
    if (!itemUrl && (item.type === 'image' || !item.type)) {
       itemUrl = item.thumbnail?.replace('&w=200', '&w=1920')?.replace('&w=100', '&w=1920');
    }

    const newItem: PlaylistItem = {
      id: Math.random().toString(36).substr(2, 9),
      title: item.title,
      type: item.type || (activeTab === 'youtube' ? 'youtube' : 'image'),
      duration: item.duration || 10,
      thumbnail: item.thumbnail,
      url: item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : itemUrl,
      videoId: item.videoId
    };
    const isDuplicate = items.some(existing =>
      (existing.videoId && newItem.videoId && existing.videoId === newItem.videoId) ||
      (existing.url && newItem.url && existing.url === newItem.url)
    );
    if (isDuplicate) {
      setPendingDuplicateItem(newItem);
      setIsDuplicateDialogOpen(true);
      return;
    }
    setItems([newItem, ...items]);
  };

  const confirmDuplicate = () => {
    if (!pendingDuplicateItem) return;
    setItems([pendingDuplicateItem, ...items]);
    setPendingDuplicateItem(null);
    setIsDuplicateDialogOpen(false);
  };

  const cancelDuplicate = () => {
    setPendingDuplicateItem(null);
    setIsDuplicateDialogOpen(false);
  };

  const handlePublish = async () => {
    if (items.length === 0) {
      toast.error("A playlist está vazia. Adicione itens antes de publicar.");
      return;
    }

    setIsPublishing(true);
    
    try {
      // 1. Save current playlist state first
      await handleSave(true);

      // 2. Save Template Preference
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/config/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${sessionToken}` },
        body: JSON.stringify({ template: activeTemplate })
      });

      // 3. Publish to active_playlist
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/playlist/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ 
          playlist: items,
          settings: { shuffle: isShuffle }
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao publicar playlist');
      }

      toast.success("Playlist publicada na TV com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao publicar playlist.");
    } finally {
      setIsPublishing(false);
    }
  };

  const searchYouTube = async (query: string, pageToken?: string) => {
    if (!query || !apiKey) return;
    
    // If it's a new search (no token), reset everything
    if (!pageToken) {
        setIsLoading(true);
        setYoutubeResults([]);
        setNextPageToken(null);
        setPrevPageToken(null);
    } else {
        setIsLoadingMore(true);
    }

    setError("");

    try {
      const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(query)}&type=video&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const searchRes = await fetch(url);
      const searchData = await searchRes.json();

      if (searchData.error) throw new Error(searchData.error.message);

      setNextPageToken(searchData.nextPageToken || null);
      setPrevPageToken(searchData.prevPageToken || null);

      const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',');

      if (videoIds) {
        const detailsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${apiKey}`);
        const detailsData = await detailsRes.json();
        
        const results = detailsData.items.map((item: any) => ({
          id: item.id,
          videoId: item.id,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.medium.url,
          duration: parseDuration(item.contentDetails.duration)
        }));

        setYoutubeResults(results); // Replace results for pagination
      } else {
        setYoutubeResults([]);
      }
    } catch (err: any) {
      console.error("YouTube API Error:", err);
      setError(err.message || "Erro ao buscar vídeos");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handlePageChange = (token: string) => {
      searchYouTube(searchQuery, token);
  };

  useEffect(() => {
    if (activeTab === 'youtube' && searchQuery.length > 2) {
      const timer = setTimeout(() => {
        searchYouTube(searchQuery);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [searchQuery, activeTab, apiKey]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  if (viewMode === 'list') {
    return (
      <AdminLayout>
        <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <DialogContent className="bg-white border border-gray-200 shadow-2xl dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle>Conteúdo duplicado</DialogTitle>
              <DialogDescription>
                Este item já está na lista. Deseja duplicá-lo?
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-gray-200 bg-white/70 p-3 text-sm text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-white">
              <div className="flex items-center gap-3">
                {pendingDuplicateItem?.thumbnail ? (
                  <img
                    src={pendingDuplicateItem.thumbnail}
                    alt={pendingDuplicateItem.title || "Miniatura do conteúdo"}
                    className="h-12 w-12 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : null}
                <span className="line-clamp-2">{pendingDuplicateItem?.title || "Item selecionado"}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cancelDuplicate}>Cancelar</Button>
              <Button className="bg-[#006CFF] hover:bg-blue-700" onClick={confirmDuplicate}>
                Duplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-[#0F1C2E]">Playlists</h1>
              <p className="text-gray-500 mt-1">Gerencie suas listas de reprodução</p>
            </div>
            
            <Dialog open={isCreatingPlaylist} onOpenChange={setIsCreatingPlaylist}>
              <DialogTrigger asChild>
                <Button className="bg-[#006CFF] hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Playlist
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Nova Playlist</DialogTitle>
                  <DialogDescription>Crie uma nova lista de reprodução para sua TV.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <Label htmlFor="name">Nome da Playlist</Label>
                  <Input 
                    id="name" 
                    placeholder="Ex: Campanha de Natal" 
                    value={newPlaylistName} 
                    onChange={e => setNewPlaylistName(e.target.value)} 
                  />
                </div>
                <DialogFooter>
                  <Button onClick={handleCreatePlaylist}>Criar Playlist</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 overflow-y-auto pb-8 pr-2">
            {isLoadingPlaylists ? (
                 <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400">
                    <Loader2 className="w-12 h-12 mb-4 animate-spin text-[#006CFF]" />
                    <p className="text-lg font-medium">Carregando playlists...</p>
                 </div>
            ) : playlists.length === 0 ? (
               <div className="col-span-full flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                   <ListPlus className="w-12 h-12 mb-4 opacity-50" />
                   <p className="text-lg font-medium">Nenhuma playlist encontrada</p>
                   <p className="text-sm">Crie sua primeira playlist para começar.</p>
               </div>
            ) : (
              playlists.map(playlist => (
                <Card key={playlist.id} className="group hover:shadow-lg transition-all duration-300 border-gray-200 hover:border-blue-200">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="bg-blue-50 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                        <ListPlus className="w-5 h-5" />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-700">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleSwitchPlaylist(playlist.id)}>
                            <Edit className="mr-2 w-4 h-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={(e) => handleDeletePlaylist(playlist.id, e as any)}>
                            <Trash2 className="mr-2 w-4 h-4" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="mt-4 text-lg font-bold text-gray-800 line-clamp-1" title={playlist.name}>
                      {playlist.name}
                    </CardTitle>
                    <CardDescription>
                      Criada em {new Date(playlist.createdAt).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-2">
                     <div className="h-1 w-12 bg-gray-100 rounded-full group-hover:bg-blue-500 transition-colors duration-500"></div>
                     <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <span>{playlist.itemsCount ?? 0} itens</span>
                        <span>•</span>
                        <span>{playlist.durationMinutes ?? 0} min</span>
                     </div>
                  </CardContent>
                  <CardFooter className="pt-0">
                    <Button 
                       className="w-full bg-white text-[#006CFF] border border-[#006CFF] hover:bg-[#006CFF] hover:text-white transition-all"
                       onClick={() => handleSwitchPlaylist(playlist.id)}
                    >
                      <Edit className="mr-2 w-4 h-4" />
                      Gerenciar Conteúdo
                    </Button>
                  </CardFooter>
                </Card>
              ))
            )}
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <AdminLayout>
        <Dialog open={isDuplicateDialogOpen} onOpenChange={setIsDuplicateDialogOpen}>
          <DialogContent className="bg-white border border-gray-200 shadow-2xl dark:bg-slate-900 dark:border-slate-700">
            <DialogHeader>
              <DialogTitle>Conteúdo duplicado</DialogTitle>
              <DialogDescription>
                Este item já está na lista. Deseja duplicá-lo?
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border border-gray-200 bg-white/70 p-3 text-sm text-gray-700 dark:border-slate-600 dark:bg-slate-950 dark:text-white">
              <div className="flex items-center gap-3">
                {pendingDuplicateItem?.thumbnail ? (
                  <img
                    src={pendingDuplicateItem.thumbnail}
                    alt={pendingDuplicateItem.title || "Miniatura do conteúdo"}
                    className="h-12 w-12 rounded-md object-cover"
                    loading="lazy"
                  />
                ) : null}
                <span className="line-clamp-2">{pendingDuplicateItem?.title || "Item selecionado"}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={cancelDuplicate}>Cancelar</Button>
              <Button className="bg-[#006CFF] hover:bg-blue-700" onClick={confirmDuplicate}>
                Duplicar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <div className="flex flex-col h-[calc(100vh-120px)]">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4 flex-shrink-0">
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
              <Button variant="ghost" size="icon" onClick={() => setViewMode('list')} className="mr-2" title="Voltar para Playlists">
                 <ArrowLeft className="w-5 h-5 text-gray-600" />
              </Button>
              
              <div>
                <h1 className="text-xl font-bold text-[#0F1C2E]">Editor</h1>
                <p className="text-xs text-gray-500">
                   {playlists.find(p => p.id === currentPlaylistId)?.name || 'Nova Playlist'}
                </p>
              </div>

              {/* Playlist Selector (Optional - now secondary) */}
              <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
              
              <div className="flex items-center gap-2">
                <Select value={currentPlaylistId} onValueChange={handleSwitchPlaylist}>
                  <SelectTrigger className="w-[200px] border-none shadow-none bg-transparent hover:bg-gray-50">
                     <SelectValue placeholder="Trocar playlist..." />
                  </SelectTrigger>
                  <SelectContent>
                    {playlists.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
               {/* Help Button */}
               <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
                 <DialogTrigger asChild>
                   <Button variant="ghost" size="icon" title="Ajuda & Tutorial">
                     <HelpCircle className="h-5 w-5 text-gray-500" />
                   </Button>
                 </DialogTrigger>
                 <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 overflow-hidden gap-0">
                   <DialogHeader className="p-6 pb-2 border-b border-gray-100 bg-gray-50/50 space-y-1">
                     <DialogTitle className="flex items-center gap-2 text-xl">
                       <HelpCircle className="w-6 h-6 text-[#006CFF]" />
                       Guia do Editor de Playlist
                     </DialogTitle>
                     <DialogDescription>
                       Aprenda a gerenciar o conteúdo da sua TV de forma simples e rápida.
                     </DialogDescription>
                   </DialogHeader>
                   
                   <div className="flex-1 overflow-y-auto p-6 bg-white">
                      <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-8">
                          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                          <TabsTrigger value="content">Conteúdo</TabsTrigger>
                          <TabsTrigger value="organize">Organização</TabsTrigger>
                          <TabsTrigger value="publish">Publicação</TabsTrigger>
                        </TabsList>
                        
                        {/* 1. Overview Tab */}
                        <TabsContent value="overview" className="space-y-6">
                           <div className="grid grid-cols-2 gap-8">
                              <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800">Entendendo a Interface</h3>
                                <p className="text-gray-600 leading-relaxed">
                                   O editor é dividido em três áreas principais:
                                </p>
                                <ul className="space-y-4">
                                  <li className="flex items-start gap-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                     <div className="bg-white p-1.5 rounded-md shadow-sm text-blue-600">
                                        <ListPlus className="w-5 h-5" />
                                     </div>
                                     <div>
                                       <span className="font-bold text-blue-800 block">Linha do Tempo (Esquerda)</span>
                                       <span className="text-sm text-blue-600">Aqui ficam os itens que serão reproduzidos na TV. É a sua sequência final.</span>
                                     </div>
                                  </li>
                                  <li className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg border border-purple-100">
                                     <div className="bg-white p-1.5 rounded-md shadow-sm text-purple-600">
                                        <Search className="w-5 h-5" />
                                     </div>
                                     <div>
                                       <span className="font-bold text-purple-800 block">Biblioteca (Direita)</span>
                                       <span className="text-sm text-purple-600">Onde você busca vídeos do YouTube ou seleciona imagens para adicionar.</span>
                                     </div>
                                  </li>
                                </ul>
                              </div>
                              <div className="bg-gray-100 rounded-xl border border-gray-200 flex items-center justify-center relative overflow-hidden group">
                                 {/* Minimalist UI Representation */}
                                 <div className="w-full max-w-[300px] aspect-video bg-white shadow-xl rounded-lg border border-gray-200 p-2 flex gap-2 transform group-hover:scale-105 transition-transform duration-500">
                                    <div className="flex-1 bg-blue-50 rounded border border-blue-100 flex flex-col gap-1 p-1">
                                       <div className="h-2 w-1/2 bg-blue-200 rounded"></div>
                                       <div className="h-8 bg-white rounded border border-blue-100 shadow-sm"></div>
                                       <div className="h-8 bg-white rounded border border-blue-100 shadow-sm"></div>
                                       <div className="h-8 bg-white rounded border border-blue-100 shadow-sm"></div>
                                    </div>
                                    <div className="w-1/3 bg-purple-50 rounded border border-purple-100 flex flex-col gap-1 p-1">
                                       <div className="h-4 bg-white rounded border border-purple-100"></div>
                                       <div className="flex-1 grid grid-cols-2 gap-1 content-start">
                                          <div className="aspect-square bg-purple-200 rounded"></div>
                                          <div className="aspect-square bg-purple-200 rounded"></div>
                                          <div className="aspect-square bg-purple-200 rounded"></div>
                                          <div className="aspect-square bg-purple-200 rounded"></div>
                                       </div>
                                    </div>
                                 </div>
                                 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-gray-100 to-transparent h-12"></div>
                              </div>
                           </div>
                        </TabsContent>

                        {/* 2. Content Tab */}
                        <TabsContent value="content" className="space-y-6">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div className="border border-gray-200 rounded-xl p-5 hover:border-red-200 hover:shadow-lg transition-all group cursor-default">
                                 <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-red-100 p-2 rounded-lg text-red-600 group-hover:bg-red-600 group-hover:text-white transition-colors">
                                       <Youtube className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-800">YouTube</h3>
                                 </div>
                                 <p className="text-sm text-gray-600 mb-4">
                                    Pesquise milhões de vídeos diretamente do YouTube. Basta digitar o nome da música, artista ou tema.
                                 </p>
                                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-500">
                                    <strong>Dica:</strong> Clique no item da busca para adicionar instantaneamente à sua playlist.
                                 </div>
                              </div>

                              <div className="border border-gray-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-lg transition-all group cursor-default">
                                 <div className="flex items-center gap-3 mb-4">
                                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                       <ImageIcon className="w-6 h-6" />
                                    </div>
                                    <h3 className="font-bold text-gray-800">Imagens</h3>
                                 </div>
                                 <p className="text-sm text-gray-600 mb-4">
                                    Use imagens da nossa biblioteca ou carregue as suas próprias para promoções estáticas.
                                 </p>
                                 <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 text-xs text-gray-500">
                                    <strong>Dica:</strong> Imagens têm duração padrão de 10 segundos, mas você pode duplicá-las para durar mais.
                                 </div>
                              </div>
                           </div>
                        </TabsContent>

                        {/* 3. Organize Tab */}
                        <TabsContent value="organize" className="space-y-8">
                           <div className="flex flex-col items-center justify-center text-center max-w-2xl mx-auto">
                              <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-100 mb-6 transform rotate-2 hover:rotate-0 transition-transform duration-500">
                                 <div className="flex flex-col gap-2 w-64">
                                    <div className="flex items-center gap-2 p-3 bg-white border-2 border-blue-500 shadow-lg rounded-lg z-10 scale-105">
                                       <GripVertical className="w-5 h-5 text-gray-400" />
                                       <div className="w-8 h-8 bg-gray-200 rounded"></div>
                                       <div className="flex-1 h-2 bg-gray-200 rounded"></div>
                                    </div>
                                    <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg opacity-50">
                                       <GripVertical className="w-5 h-5 text-gray-400" />
                                       <div className="w-8 h-8 bg-gray-200 rounded"></div>
                                       <div className="flex-1 h-2 bg-gray-200 rounded"></div>
                                    </div>
                                 </div>
                              </div>
                              
                              <h3 className="text-xl font-bold text-gray-800 mb-2">Arraste e Solte</h3>
                              <p className="text-gray-600">
                                 A ordem importa! Para mudar a sequência, basta clicar e segurar no ícone <GripVertical className="w-4 h-4 inline text-gray-400"/> e arrastar o item para a posição desejada.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-4 w-full mt-8 text-left">
                                 <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
                                    <Trash2 className="w-5 h-5 text-red-500 mt-0.5" />
                                    <div>
                                       <span className="font-bold text-red-700 block text-sm">Remover Itens</span>
                                       <span className="text-xs text-red-600">Clique na lixeira para excluir um item que não deseja mais.</span>
                                    </div>
                                 </div>
                                 <div className="flex items-start gap-3 p-4 bg-green-50 rounded-lg border border-green-100">
                                    <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                                    <div>
                                       <span className="font-bold text-green-800 block text-sm">Duração Automática</span>
                                       <span className="text-xs text-green-700">O tempo total da playlist é calculado automaticamente para você.</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </TabsContent>

                        {/* 4. Publish Tab */}
                        <TabsContent value="publish" className="space-y-6">
                           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white text-center relative overflow-hidden">
                              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                              <div className="relative z-10 flex flex-col items-center">
                                 <div className="bg-white/20 p-4 rounded-full backdrop-blur-sm mb-6 animate-pulse">
                                    <Play className="w-10 h-10 text-white fill-white" />
                                 </div>
                                 <h2 className="text-3xl font-bold mb-4">Pronto para ir ao ar?</h2>
                                 <p className="text-blue-100 max-w-lg mb-8 text-lg">
                                    Ao clicar em "Publicar na TV", sua playlist é enviada instantaneamente para todos os players conectados.
                                 </p>
                                 
                                 <div className="flex gap-4">
                                    <div className="flex flex-col items-center gap-2">
                                       <div className="px-4 py-2 bg-white/10 rounded border border-white/20 flex items-center gap-2">
                                          <Save className="w-4 h-4" /> Salvar
                                       </div>
                                       <span className="text-xs text-blue-200">Salva rascunho</span>
                                    </div>
                                    <div className="h-px w-8 bg-white/20 self-center"></div>
                                    <div className="flex flex-col items-center gap-2">
                                       <div className="px-4 py-2 bg-white text-blue-700 font-bold rounded shadow-lg flex items-center gap-2">
                                          <Play className="w-4 h-4 fill-blue-700" /> Publicar
                                       </div>
                                       <span className="text-xs text-blue-200 font-bold">Vai para TV</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </TabsContent>
                      </Tabs>
                   </div>
                   <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                      <Button onClick={() => setIsHelpOpen(false)}>Entendi, vamos começar!</Button>
                   </div>
                 </DialogContent>
               </Dialog>

               {/* Settings Redirect */}
               <Button 
                 variant="ghost" 
                 size="icon" 
                 onClick={() => navigate('/admin/settings')}
                 title="Ir para Configurações"
               >
                 <Settings className="h-5 w-5 text-gray-500" />
               </Button>

              <Button 
                variant="outline" 
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="gap-2"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar
              </Button>
              
              <Button 
                className="bg-[#006CFF] gap-2 hover:bg-[#0055CC]"
                onClick={handlePublish}
                disabled={isPublishing}
              >
                {isPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Publicar na TV
              </Button>
            </div>
          </div>

          <div className="flex flex-col-reverse md:flex-row gap-6 h-full min-h-0">
            {/* Timeline */}
            <div className="flex-1 bg-gray-50 rounded-xl border border-gray-200 p-4 overflow-y-auto flex flex-col h-1/2 md:h-full">
              <div className="flex items-center justify-between mb-4 px-2 flex-shrink-0">
                <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                   Sequência: <span className="text-[#006CFF]">{playlists.find(p => p.id === currentPlaylistId)?.name}</span>
                </h3>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch 
                      id="shuffle-mode" 
                      checked={isShuffle}
                      onCheckedChange={setIsShuffle}
                    />
                    <Label htmlFor="shuffle-mode" className="text-xs text-gray-600 flex items-center gap-1 cursor-pointer">
                      <Shuffle className="w-3 h-3" /> Iniciar Aleatório
                    </Label>
                  </div>
                  <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border border-gray-200">
                    Duração: {Math.floor(items.reduce((acc, curr) => acc + curr.duration, 0) / 60)}m {items.reduce((acc, curr) => acc + curr.duration, 0) % 60}s
                  </span>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {items.length === 0 ? (
                  <div className="h-full border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-400">
                    <p>Playlist vazia.</p>
                  </div>
                ) : (
                  items.map((item, index) => (
                    <DraggableItem 
                      key={item.id} 
                      index={index} 
                      item={item} 
                      moveItem={moveItem}
                      removeItem={removeItem} 
                    />
                  ))
                )}
              </div>
            </div>

            {/* Sidebar Library */}
            <div className="w-full md:w-96 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden shadow-lg flex-shrink-0 h-1/2 md:h-full">
              <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-3 flex-shrink-0">
                <h3 className="font-semibold text-sm text-gray-700">Adicionar Conteúdo</h3>
                
                <div className="flex p-1 bg-gray-200/50 rounded-lg">
                  <button 
                    onClick={() => setActiveTab('youtube')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                      activeTab === 'youtube' ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Youtube className="w-3.5 h-3.5" /> YouTube
                  </button>
                  <button 
                    onClick={() => setActiveTab('library')}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all",
                      activeTab === 'library' ? "bg-white text-[#006CFF] shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <ImageIcon className="w-3.5 h-3.5" /> Biblioteca
                  </button>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    placeholder={activeTab === 'library' ? "Filtrar biblioteca..." : "Buscar no YouTube..."} 
                    className="pl-9 bg-white"
                    value={searchQuery}
                    onChange={handleSearch}
                  />
                  {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#006CFF]" />
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/30 custom-scrollbar">
                {activeTab === 'library' && (
                  <div className="grid grid-cols-2 gap-3 content-start">
                    {mediaLibrary.length === 0 ? (
                       <div className="col-span-2 text-center p-6 text-gray-400">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-xs">Nenhuma mídia encontrada.</p>
                          <Button variant="link" className="text-xs h-auto p-0 mt-1" onClick={() => navigate('/admin/content')}>Upload Mídia</Button>
                       </div>
                    ) : (
                      mediaLibrary
                        .filter(item => {
                            // Filter by Search
                            const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
                            // Filter by Ownership (Strict separation)
                            // Show if: 
                            // 1. I own it (item.ownerId === userId)
                            // 2. OR it has NO owner (Legacy/Global) - We keep this to not break old uploads, 
                            //    but "Frutos Goias" might be here. 
                            //    Ideally we would hide it, but we can't distinguish "Shared Stock" from "Old Ad".
                            //    Assuming Client won't have "Global" access in future.
                            // 3. To be strict as requested: If item has ownerId AND ownerId !== userId, HIDE IT.
                            
                            const isMine = !item.ownerId || item.ownerId === userId;
                            
                            return matchesSearch && isMine;
                        })
                        .map((item) => (
                        <div 
                          key={item.id} 
                          className="aspect-video bg-white rounded-lg cursor-pointer hover:ring-2 ring-[#006CFF] relative group border border-gray-200 shadow-sm overflow-hidden"
                          onClick={() => addItemToPlaylist({ 
                            title: item.title, 
                            thumbnail: item.url, 
                            type: item.type === 'video' ? 'video' : 'image', 
                            duration: item.type === 'video' ? 30 : 10,
                            url: item.url 
                          })}
                        >
                          {item.type === 'video' ? (
                             <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                <Play className="w-8 h-8 text-gray-400" />
                             </div>
                          ) : (
                             <img 
                               src={item.url} 
                               className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                               alt={item.title}
                             />
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Plus className="w-8 h-8 text-white" />
                          </div>
                          <div className="absolute bottom-0 inset-x-0 bg-black/60 p-1">
                             <p className="text-[10px] text-white truncate">{item.title}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'youtube' && (
                   <div className="space-y-3">
                     {error && <div className="p-3 bg-red-50 text-red-600 text-xs rounded-lg text-center">{error}</div>}
                     {!apiKey && (
                        <div className="text-center p-8 text-gray-400 flex flex-col items-center gap-4">
                           <Youtube className="w-8 h-8 text-red-200" />
                           <p className="text-xs">Configure sua API Key para buscar.</p>
                           <Button variant="outline" size="sm" onClick={() => navigate('/admin/settings')} className="text-xs">Configurar</Button>
                        </div>
                     )}
                     {apiKey && !youtubeResults.length && !searchQuery && (
                        <div className="text-center p-8 text-gray-400"><p className="text-xs">Digite para buscar...</p></div>
                     )}
                     {youtubeResults.map((video) => (
                       <div 
                         key={video.id}
                         className="flex gap-3 p-2 bg-white rounded-lg border border-gray-100 hover:border-red-200 hover:bg-red-50/30 cursor-pointer group transition-all shadow-sm"
                         onClick={() => addItemToPlaylist({ title: video.title, thumbnail: video.thumbnail, type: 'youtube', duration: video.duration, videoId: video.videoId })}
                       >
                          <div className="w-24 h-16 bg-gray-100 rounded overflow-hidden flex-shrink-0 relative">
                            <img src={video.thumbnail} className="w-full h-full object-cover" alt={video.title} />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                             <h4 className="text-xs font-semibold text-gray-800 line-clamp-2 leading-tight group-hover:text-red-600">{video.title}</h4>
                             <span className="text-[10px] text-gray-500 mt-1">{Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}</span>
                          </div>
                       </div>
                     ))}
                     
                     {(prevPageToken || nextPageToken) && (
                        <div className="flex gap-2 mt-2">
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => prevPageToken && handlePageChange(prevPageToken)}
                                disabled={!prevPageToken || isLoadingMore}
                            >
                                {isLoadingMore && prevPageToken ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Anterior
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm"
                                className="flex-1 text-xs"
                                onClick={() => nextPageToken && handlePageChange(nextPageToken)}
                                disabled={!nextPageToken || isLoadingMore}
                            >
                                {isLoadingMore && nextPageToken ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                                Próximo
                            </Button>
                        </div>
                     )}
                   </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </DndProvider>
  );
}
