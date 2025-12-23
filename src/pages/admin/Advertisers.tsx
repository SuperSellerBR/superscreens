import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Search, User, Loader2, Megaphone, Plus, Trash2, LayoutTemplate, Image as ImageIcon, Video as VideoIcon, ArrowLeft } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Badge } from "../../components/ui/badge";
import { supabaseUrl, publicAnonKey } from "../../utils/supabase/info";
import { supabase } from "../../utils/supabase/client";
import { toast } from "sonner@2.0.3";

interface UserData {
  id: string;
  email: string;
  role: 'admin' | 'advertiser' | 'client';
  nomeFantasia?: string;
  razaoSocial?: string;
  logoUrl?: string;
  mediaCount?: number;
}

interface MediaItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  duration: number;
  layout: 'fullscreen' | 'vertical' | 'horizontal';
  createdAt: number;
}

const INITIAL_MEDIA_FORM = {
  url: '',
  type: 'image' as 'image' | 'video',
  layout: 'vertical' as 'fullscreen' | 'vertical' | 'horizontal',
  duration: 10
};

export default function Advertisers() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Media Management State
  const [advertiserMedia, setAdvertiserMedia] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);
  const [mediaForm, setMediaForm] = useState(INITIAL_MEDIA_FORM);
  const [isSavingMedia, setIsSavingMedia] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setToken(session.access_token);
            const role = session.user.user_metadata?.role;
            const isUserAdmin = role === 'admin';
            setIsAdmin(isUserAdmin);

            if (isUserAdmin) {
                fetchUsers();
            } else {
                // If not admin, restrict to self
                const userData: UserData = {
                    id: session.user.id,
                    email: session.user.email || '',
                    role: role as any,
                    nomeFantasia: session.user.user_metadata?.nomeFantasia || session.user.user_metadata?.name,
                    razaoSocial: session.user.user_metadata?.razaoSocial
                };
                setSelectedAdvertiser(userData);
                
                // Fetch user logo separately if needed or just let it be empty/fallback
                fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/logo?uid=${session.user.id}`, {
                    headers: { 'Authorization': `Bearer ${publicAnonKey}` }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.logoUrl) {
                        setSelectedAdvertiser(prev => prev ? ({ ...prev, logoUrl: data.logoUrl }) : null);
                    }
                })
                .catch(console.error);
            }
        } else {
            navigate('/login');
        }
    });
  }, []);

  // Removed direct fetchUsers call from here as it's handled in the auth check
  // useEffect(() => {
  //   fetchUsers();
  // }, []);

  useEffect(() => {
    if (selectedAdvertiser) {
        fetchAdvertiserMedia(selectedAdvertiser.id);
    }
  }, [selectedAdvertiser]);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/users`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toast.error("Erro ao carregar anunciantes");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvertiserMedia = async (advertiserId: string) => {
      setIsLoadingMedia(true);
      try {
          let authToken = token;
          if (!authToken) {
              const { data: { session } } = await supabase.auth.getSession();
              authToken = session?.access_token || null;
              if (authToken) setToken(authToken);
          }
          if (!authToken) {
              throw new Error("Sessão inválida");
          }
          const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/advertisers/${advertiserId}/media`, {
             headers: { 'Authorization': `Bearer ${authToken}` }
          });
          const data = await res.json();
          setAdvertiserMedia(data.media || []);
      } catch (err) {
          toast.error("Erro ao carregar mídias do anunciante");
      } finally {
          setIsLoadingMedia(false);
      }
  };

  const handleAddMedia = async () => {
      if (!selectedAdvertiser) return;
      if (!mediaForm.url) {
          toast.error("URL da mídia é obrigatória");
          return;
      }
      let authToken = token;
      if (!authToken) {
          const { data: { session } } = await supabase.auth.getSession();
          authToken = session?.access_token || null;
          if (authToken) setToken(authToken);
      }
      if (!authToken) {
          toast.error("Sessão inválida. Faça login novamente.");
          return;
      }

      setIsSavingMedia(true);
      try {
          const newItem: MediaItem = {
              id: `media_${Date.now()}`,
              ...mediaForm,
              createdAt: Date.now()
          };

          const updatedMedia = [...advertiserMedia, newItem];

          const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/advertisers/${selectedAdvertiser.id}/media`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${authToken}`
              },
              body: JSON.stringify({
                  mediaItem: newItem
              })
          });

          if (!res.ok) throw new Error("Falha ao salvar");

          setAdvertiserMedia(updatedMedia);
          setMediaForm(INITIAL_MEDIA_FORM);
          toast.success("Mídia adicionada com sucesso!");
          
          // Update user media count locally
          setUsers(prev => prev.map(u => u.id === selectedAdvertiser.id ? {...u, mediaCount: updatedMedia.length} : u));

      } catch (err) {
          toast.error("Erro ao salvar mídia");
      } finally {
          setIsSavingMedia(false);
      }
  };

  const handleDeleteMedia = async (mediaId: string) => {
      if (!selectedAdvertiser) return;
      let authToken = token;
      if (!authToken) {
          const { data: { session } } = await supabase.auth.getSession();
          authToken = session?.access_token || null;
          if (authToken) setToken(authToken);
      }
      if (!authToken) {
          toast.error("Sessão inválida.");
          return;
      }
      if (!confirm("Tem certeza que deseja remover esta mídia?")) return;

      const updatedMedia = advertiserMedia.filter(m => m.id !== mediaId);
      setAdvertiserMedia(updatedMedia);

      try {
          const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/advertisers/${selectedAdvertiser.id}/media/${mediaId}`, {
              method: 'DELETE',
              headers: {
                  'Authorization': `Bearer ${authToken}`
              }
          });

          if (!res.ok) throw new Error("Falha ao remover");
          
           // Update user media count locally
          setUsers(prev => prev.map(u => u.id === selectedAdvertiser.id ? {...u, mediaCount: updatedMedia.length} : u));
          
          toast.success("Mídia removida");
      } catch (err) {
          toast.error("Erro ao sincronizar remoção");
          // Revert on error? For simplicity we don't revert here but could reload.
      }
  };

  const advertisers = users.filter(u => u.role === 'advertiser' && (
      (u.nomeFantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.razaoSocial || '').toLowerCase().includes(searchTerm.toLowerCase())
  ));

  return (
    <AdminLayout>
       <div className="flex flex-col h-[calc(100vh-100px)] gap-6">
          <div>
            <h1 className="text-3xl font-bold text-[#0F1C2E]">Gestão de Mídias {isAdmin ? '(Anunciantes)' : ''}</h1>
            <p className="text-gray-500 mt-1">{isAdmin ? 'Gerencie as mídias de cada anunciante cadastrado.' : 'Gerencie suas mídias e conteúdos.'}</p>
          </div>

          <div className="flex gap-6 h-full overflow-hidden">
             {/* Sidebar List - ONLY FOR ADMIN */}
             {isAdmin && (
                 <Card className={`flex flex-col h-full border-gray-200 shadow-sm bg-white overflow-hidden ${selectedAdvertiser ? 'hidden md:flex md:w-1/3' : 'w-full md:w-1/3'}`}>
                    <CardHeader className="border-b border-gray-100 py-4">
                      <CardTitle className="text-lg font-semibold">Selecione um Anunciante</CardTitle>
                      <CardDescription>Usuários com perfil "Anunciante"</CardDescription>
                       <div className="pt-2 relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input 
                          placeholder="Buscar anunciante..." 
                          className="pl-9 h-9"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                        />
                      </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-1 overflow-y-auto bg-gray-50/50">
                        {loading ? (
                            <div className="flex items-center justify-center h-40">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                               {advertisers.map(ad => (
                                   <div 
                                     key={ad.id}
                                     onClick={() => setSelectedAdvertiser(ad)}
                                     className={`p-4 cursor-pointer transition-all hover:bg-white flex items-center gap-4 border-l-4 ${selectedAdvertiser?.id === ad.id ? 'bg-white border-blue-600 shadow-sm' : 'border-transparent'}`}
                                   >
                                      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0 overflow-hidden border border-gray-100 flex items-center justify-center">
                                          {ad.logoUrl ? (
                                              <img src={ad.logoUrl} className="w-full h-full object-cover" />
                                          ) : (
                                              <User className="w-6 h-6 text-gray-400" />
                                          )}
                                      </div>
                                      <div className="min-w-0">
                                          <div className="font-semibold text-gray-900 truncate">
                                              {ad.nomeFantasia || ad.razaoSocial || 'Sem Nome'}
                                          </div>
                                          <div className="text-xs text-gray-500">
                                              {ad.mediaCount !== undefined ? ad.mediaCount : '?'} mídias cadastradas
                                          </div>
                                      </div>
                                   </div>
                               ))}
                               {advertisers.length === 0 && (
                                   <div className="p-8 text-center text-gray-400 text-sm">Nenhum anunciante encontrado</div>
                               )}
                            </div>
                        )}
                    </CardContent>
                 </Card>
             )}

             {/* Main Area */}
             <div className={`h-full bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden flex flex-col ${isAdmin ? (selectedAdvertiser ? 'w-full md:flex-1' : 'hidden md:flex md:flex-1') : 'w-full'}`}>
                 {!selectedAdvertiser ? (
                     <div className="h-full flex flex-col items-center justify-center text-center p-8">
                         <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <User className="w-10 h-10 text-gray-300" />
                         </div>
                         <h3 className="text-xl font-semibold text-gray-900 mb-2">Selecione um Anunciante</h3>
                         <p className="text-gray-500">Clique em um anunciante na lista para gerenciar suas mídias.</p>
                     </div>
                 ) : (
                     <div className="flex flex-col h-full bg-white">
                         {/* Header */}
                         <div className="p-4 md:p-6 border-b border-gray-100 bg-white">
                             <div className="flex items-center gap-2 md:gap-4">
                                 {isAdmin && (
                                     <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="md:hidden shrink-0 -ml-2 text-gray-500"
                                        onClick={() => setSelectedAdvertiser(null)}
                                     >
                                        <ArrowLeft className="w-6 h-6" />
                                     </Button>
                                 )}
                                 <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-white border border-gray-200 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                                      {selectedAdvertiser.logoUrl ? (
                                          <img src={selectedAdvertiser.logoUrl} className="w-full h-full object-cover" />
                                      ) : (
                                          <User className="w-8 h-8 text-gray-400" />
                                      )}
                                 </div>
                                 <div className="text-left">
                                     <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                         {isAdmin ? (
                                            <>Mídias de <span className="text-blue-600">{selectedAdvertiser.nomeFantasia || selectedAdvertiser.razaoSocial}</span></>
                                         ) : (
                                            <span>Minhas Mídias</span>
                                         )}
                                     </h2>
                                     <p className="text-gray-500">Adicione vídeos ou imagens. Defina a compatibilidade com os layouts da TV.</p>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
                             {/* Add Media Form */}
                             <Card className="border-gray-200 shadow-sm">
                                 <CardContent className="p-6">
                                     <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                         <div className="md:col-span-4 space-y-2">
                                             <label className="text-xs font-semibold text-gray-500 uppercase">URL da Mídia</label>
                                             <Input 
                                                placeholder="https://..." 
                                                value={mediaForm.url}
                                                onChange={e => setMediaForm({...mediaForm, url: e.target.value})}
                                             />
                                         </div>
                                         <div className="md:col-span-2 space-y-2">
                                             <label className="text-xs font-semibold text-gray-500 uppercase">Tipo</label>
                                             <Select 
                                                value={mediaForm.type} 
                                                onValueChange={(v: any) => setMediaForm({...mediaForm, type: v})}
                                             >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="image">Imagem</SelectItem>
                                                    <SelectItem value="video">Vídeo</SelectItem>
                                                </SelectContent>
                                             </Select>
                                         </div>
                                         <div className="md:col-span-3 space-y-2">
                                             <label className="text-xs font-semibold text-gray-500 uppercase">Formato da Mídia</label>
                                             <Select 
                                                value={mediaForm.layout} 
                                                onValueChange={(v: any) => setMediaForm({...mediaForm, layout: v})}
                                             >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="vertical">Vertical 9:16 (L-Bar)</SelectItem>
                                                    <SelectItem value="horizontal">Horizontal 16:9</SelectItem>
                                                    <SelectItem value="fullscreen">Fullscreen</SelectItem>
                                                </SelectContent>
                                             </Select>
                                         </div>
                                         <div className="md:col-span-2 space-y-2">
                                             <label className="text-xs font-semibold text-gray-500 uppercase">Duração (s)</label>
                                             <Input 
                                                type="number" 
                                                min={1}
                                                value={mediaForm.duration}
                                                onChange={e => setMediaForm({...mediaForm, duration: parseInt(e.target.value) || 10})}
                                             />
                                         </div>
                                         <div className="md:col-span-1">
                                             <Button 
                                                className="w-full bg-[#006CFF] hover:bg-blue-700" 
                                                onClick={handleAddMedia}
                                                disabled={isSavingMedia}
                                             >
                                                 {isSavingMedia ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                             </Button>
                                         </div>
                                     </div>
                                 </CardContent>
                             </Card>

                             {/* Active Media List */}
                             <div>
                                 <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                                     Mídias Ativas ({advertiserMedia.length})
                                 </h3>
                                 
                                 {isLoadingMedia ? (
                                     <div className="flex justify-center p-8">
                                         <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                                     </div>
                                 ) : advertiserMedia.length === 0 ? (
                                     <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-500">
                                         Nenhuma mídia ativa para este anunciante.
                                     </div>
                                 ) : (
                                     <div className="space-y-3">
                                         {advertiserMedia.map((media) => (
                                             <div key={media.id} className="group bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
                                                 <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden shrink-0 flex items-center justify-center border border-gray-100 relative">
                                                     {media.type === 'image' ? (
                                                         <img src={media.url} className="w-full h-full object-cover" />
                                                     ) : (
                                                         <div className="flex flex-col items-center">
                                                            <VideoIcon className="w-6 h-6 text-gray-400" />
                                                            <span className="text-[9px] text-gray-500 font-mono mt-1">VIDEO</span>
                                                         </div>
                                                     )}
                                                 </div>
                                                 
                                                 <div className="flex-1 min-w-0">
                                                     <div className="flex items-center gap-2 mb-1">
                                                         <Badge variant="secondary" className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                                                             {media.type}
                                                         </Badge>
                                                         <Badge variant="outline" className="text-[10px] h-5 px-1.5 text-gray-500">
                                                             <LayoutTemplate className="w-3 h-3 mr-1" />
                                                             {media.layout === 'vertical' ? 'VERTICAL 9:16' : media.layout === 'fullscreen' ? 'FULLSCREEN' : 'HORIZONTAL 16:9'}
                                                         </Badge>
                                                     </div>
                                                     <div className="text-xs text-gray-500 font-mono truncate max-w-md">
                                                         {media.url}
                                                     </div>
                                                 </div>
                                                 
                                                 <div className="flex items-center gap-4 pr-2">
                                                     <div className="text-sm font-bold text-gray-900">
                                                         {media.duration}s
                                                     </div>
                                                     <button 
                                                        onClick={() => handleDeleteMedia(media.id)}
                                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                                     >
                                                         <Trash2 className="w-4 h-4" />
                                                     </button>
                                                 </div>
                                             </div>
                                         ))}
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>
                 )}
             </div>
          </div>
       </div>
    </AdminLayout>
  );
}
