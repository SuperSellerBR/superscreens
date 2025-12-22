import { AdminLayout } from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image as ImageIcon, Video, LayoutTemplate, Search, Trash2, Loader2, Play } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEffect, useRef, useState } from "react";
import { projectId, publicAnonKey } from "@/utils/supabase/info";
import { toast } from "sonner@2.0.3";
import { supabase } from "@/utils/supabase/client";
import { useNavigate } from "react-router-dom";

// Supabase Client for Storage

export default function ContentManager() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaItems, setMediaItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
       setUserId(session?.user?.id || null);
    });
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/media`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      
      // Filter media client-side based on current user (if known)
      // Note: Admin should probably see ALL. Client should see ONLY THEIRS.
      // But we need to know the role. We can't easily get role here without parsing token or checking session metadata.
      // Let's rely on simple owner check first.
      
      const { data: { session } } = await supabase.auth.getSession();
      const currentUserId = session?.user?.id;
      const role = session?.user?.user_metadata?.role;
      
      const allMedia = data.media || [];
      
      if (role === 'admin') {
          setMediaItems(allMedia); // Admin sees everything
      } else {
          // Client sees only their own + legacy (no owner)
          // If we want to be SUPER strict and hide legacy from clients (risking missing files), we would remove !m.ownerId
          // But for now, let's filter out explicit others.
          const myMedia = allMedia.filter((m: any) => !m.ownerId || m.ownerId === currentUserId);
          setMediaItems(myMedia);
      }
    } catch (err) {
      console.error("Failed to load media", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // 1. Get Signed Upload Token from Server
      const tokenRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/media/upload-token`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ filename: file.name })
      });
      
      const { token, path, signedUrl } = await tokenRes.json();
      if (!token || !path) throw new Error("Failed to get upload token");

      // 2. Upload to Storage using the token
      const { error: uploadError } = await supabase.storage
        .from('make-70a2af89-media')
        .uploadToSignedUrl(path, token, file);

      if (uploadError) throw uploadError;

      // 3. Save Metadata
      const newItem = {
        id: Math.random().toString(36).substr(2, 9),
        title: file.name,
        type: file.type.startsWith('video') ? 'video' : 'image',
        path: path,
        uploadedAt: new Date().toISOString(),
        size: file.size,
        ownerId: userId // Associate media with uploader
      };

      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/media`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ mediaItem: newItem })
      });

      toast.success("Mídia enviada com sucesso!");
      fetchMedia();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao enviar mídia.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir?")) return;

    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/media/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      setMediaItems(items => items.filter(i => i.id !== id));
      toast.success("Mídia excluída.");
    } catch (err) {
      toast.error("Erro ao excluir.");
    }
  };

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0F1C2E]">Gerenciador de Conteúdos</h1>
            <p className="text-gray-500 mt-1">Faça upload de mídias para usar na TV.</p>
          </div>
          <div className="flex gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*,video/*"
              onChange={handleFileSelect}
            />
            <Button 
              className="bg-[#006CFF] gap-2" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} 
              Upload Mídia
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input className="pl-9 border-gray-200" placeholder="Buscar conteúdos..." />
          </div>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Todos ({mediaItems.length})</TabsTrigger>
            <TabsTrigger value="images">Imagens ({mediaItems.filter(i => i.type === 'image').length})</TabsTrigger>
            <TabsTrigger value="videos">Vídeos ({mediaItems.filter(i => i.type === 'video').length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="mt-0">
             {isLoading ? (
               <div className="py-20 flex justify-center text-gray-400"><Loader2 className="animate-spin w-8 h-8" /></div>
             ) : mediaItems.length === 0 ? (
               <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                 <p>Nenhuma mídia encontrada. Faça upload para começar.</p>
               </div>
             ) : (
               <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {mediaItems.map(item => (
                    <ContentCard key={item.id} item={item} onDelete={(e) => handleDelete(item.id, e)} />
                  ))}
               </div>
             )}
          </TabsContent>

          <TabsContent value="images" className="mt-0">
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mediaItems.filter(i => i.type === 'image').map(item => (
                  <ContentCard key={item.id} item={item} onDelete={(e) => handleDelete(item.id, e)} />
                ))}
             </div>
          </TabsContent>

          <TabsContent value="videos" className="mt-0">
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {mediaItems.filter(i => i.type === 'video').map(item => (
                  <ContentCard key={item.id} item={item} onDelete={(e) => handleDelete(item.id, e)} />
                ))}
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function ContentCard({ item, onDelete }: { item: any, onDelete: (e: React.MouseEvent) => void }) {
  const Icon = item.type === 'video' ? Video : ImageIcon;
  const isVideo = item.type === 'video';
  
  return (
    <Card className="overflow-hidden group cursor-default hover:shadow-md transition-all border-gray-200">
      <div className="aspect-[16/9] relative bg-gray-100 overflow-hidden">
        {isVideo ? (
           <div className="w-full h-full flex items-center justify-center bg-gray-900 text-white">
              <Play className="w-8 h-8 opacity-50" />
           </div>
        ) : (
           <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        )}
        
        <div className="absolute top-2 right-2 flex gap-1">
          <Badge variant="secondary" className="bg-black/50 text-white backdrop-blur-sm border-none">
            <Icon className="h-3 w-3 mr-1" /> 
            {item.type === 'video' ? 'VÍDEO' : 'IMG'}
          </Badge>
        </div>
        
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
            <Button 
               size="icon" 
               variant="destructive" 
               className="h-8 w-8 rounded-full"
               onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
        </div>
      </div>
      <CardFooter className="p-3 flex flex-col items-start">
        <h4 className="font-medium text-sm text-gray-900 truncate w-full" title={item.title}>{item.title}</h4>
        <p className="text-xs text-gray-500 mt-1">
          {new Date(item.uploadedAt).toLocaleDateString('pt-BR')}
        </p>
      </CardFooter>
    </Card>
  )
}