import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Card, CardContent } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Loader2, User, Play, Image as ImageIcon, Video as VideoIcon, LayoutTemplate, X, Megaphone } from "lucide-react";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration: number;
  layout: 'fullscreen' | 'vertical' | 'horizontal';
}

interface Advertiser {
  id: string;
  name: string;
  logoUrl?: string; // Optional if returned from legacy or user endpoint
  media: MediaItem[];
}

export default function MyAdvertisers() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAd, setSelectedAd] = useState<Advertiser | null>(null);

  useEffect(() => {
    fetchMyAdvertisers();
  }, []);

  const fetchMyAdvertisers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/advertisers?uid=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      
      // Map response to match interface if needed (backend returns 'advertisers' array)
      // Note: Backend endpoint /advertisers?uid=... returns objects with { id, name, media, ... }
      // We might need to fetch logoUrl separately if not included in /advertisers endpoint for user-based ads.
      // Let's check backend... backend constructs the object manually in lines 196-200 and DOES NOT include logoUrl currently.
      // I need to update backend to include logoUrl or fetch user details here.
      // For now, let's assume names are correct and media is correct.
      
      setAdvertisers(data.advertisers || []);
    } catch (err) {
      toast.error("Erro ao carregar anunciantes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1C2E]">Meus Anunciantes</h1>
          <p className="text-gray-500">Visualize os parceiros e mídias exibidos em suas telas.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : advertisers.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Megaphone className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">Nenhum anunciante vinculado</h3>
            <p className="text-gray-500 max-w-sm mx-auto mt-1">
              Entre em contato com o administrador para solicitar inclusão de parceiros em sua grade.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {advertisers.map((ad) => (
              <Card key={ad.id} className="overflow-hidden border-gray-200 hover:shadow-md transition-shadow group">
                <CardContent className="p-0">
                  <div className="p-6 flex items-center gap-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                        {/* 
                           Note: The backend /advertisers endpoint currently constructs the object manually 
                           and might not be passing the logoUrl. If it's missing, we show initials.
                        */}
                        {ad.logoUrl ? (
                           <img src={ad.logoUrl} className="w-full h-full object-cover" />
                        ) : (
                           <span className="text-xl font-bold text-gray-400">
                              {ad.name.charAt(0).toUpperCase()}
                           </span>
                        )}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{ad.name}</h3>
                      <p className="text-xs text-gray-500">{ad.media?.length || 0} mídias ativas</p>
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <div className="space-y-3">
                       {ad.media?.slice(0, 3).map((media, idx) => (
                         <div key={idx} className="flex items-center gap-3 text-sm p-2 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                            <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center shrink-0 overflow-hidden relative">
                               {media.type === 'image' ? (
                                  <img src={media.url} className="w-full h-full object-cover" />
                               ) : (
                                  <VideoIcon className="w-4 h-4 text-gray-400" />
                               )}
                            </div>
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2">
                                  <Badge variant="secondary" className="text-[9px] px-1 h-4">{media.layout || 'ALL'}</Badge>
                                  <span className="text-xs text-gray-400">{media.duration}s</span>
                               </div>
                            </div>
                         </div>
                       ))}
                       
                       {ad.media?.length > 3 && (
                          <Button variant="ghost" className="w-full text-xs text-blue-600 hover:text-blue-700 h-8">
                             Ver mais {ad.media.length - 3} mídias
                          </Button>
                       )}
                       
                       {(!ad.media || ad.media.length === 0) && (
                          <div className="text-center py-4 text-xs text-gray-400 italic">
                             Nenhuma mídia disponível
                          </div>
                       )}
                    </div>
                    
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="w-full mt-4 bg-gray-900 hover:bg-gray-800 text-xs">
                           <Play className="w-3 h-3 mr-2" />
                           Visualizar Playlist
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                             Playlist: {ad.name}
                          </DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
                           {ad.media?.map((media, i) => (
                              <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-gray-100 aspect-video">
                                 {media.type === 'image' ? (
                                    <img src={media.url} className="w-full h-full object-cover" />
                                 ) : (
                                    <video src={media.url} className="w-full h-full object-cover" controls />
                                 )}
                                 <div className="absolute top-2 left-2 flex gap-1">
                                    <Badge className="bg-black/60 text-white hover:bg-black/70 text-[10px] h-5 border-none">
                                       {media.layout}
                                    </Badge>
                                    <Badge className="bg-white/90 text-black hover:bg-white text-[10px] h-5 border-none">
                                       {media.duration}s
                                    </Badge>
                                 </div>
                              </div>
                           ))}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}