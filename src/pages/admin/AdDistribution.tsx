import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Button } from "../../components/ui/button";
import { Search, Loader2, Save, Store, Megaphone, Check } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { supabase } from "../../utils/supabase/client";

interface UserData {
  id: string;
  email: string;
  role: 'admin' | 'advertiser' | 'client';
  name?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  logoUrl?: string;
}

export default function AdDistributionPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<UserData | null>(null);
  const [linkedAdvertisers, setLinkedAdvertisers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/users`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toast.error("Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  const loadClientLinks = async (client: UserData) => {
    setSelectedClient(client);
    setLinkedAdvertisers([]); // Reset while loading
    
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/advertise/distribute/${client.id}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      setLinkedAdvertisers(data.advertiserIds || []);
    } catch (err) {
      toast.error("Erro ao carregar associações");
    }
  };

  const handleSave = async () => {
    if (!selectedClient) return;
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/advertise/distribute`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || publicAnonKey}` 
        },
        body: JSON.stringify({ 
          clientId: selectedClient.id, 
          advertiserIds: linkedAdvertisers 
        })
      });
      
      if (!res.ok) throw new Error("Falha na requisição");

      toast.success(`Anúncios atualizados para ${selectedClient.nomeFantasia || selectedClient.razaoSocial || selectedClient.email}`);
    } catch (err) {
      toast.error("Erro ao salvar distribuição");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleAdvertiser = (id: string) => {
    setLinkedAdvertisers(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // Filter Lists
  const clients = users.filter(u => (u.role === 'client' || u.role === 'admin') && 
    (u.nomeFantasia?.toLowerCase().includes(searchTerm.toLowerCase()) || 
     u.razaoSocial?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const advertisers = users.filter(u => u.role === 'advertiser');

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="flex flex-col h-auto md:h-[calc(100vh-100px)] gap-6">
        <div>
          <h1 className="text-3xl font-bold text-[#0F1C2E]">Distribuição de Anúncios</h1>
          <p className="text-gray-500 mt-1">Defina quais anunciantes serão exibidos em cada cliente.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 h-full overflow-visible md:overflow-hidden">
          {/* Left Column: Clients List */}
          <Card className="w-full md:w-1/3 flex flex-col h-[50vh] md:h-full border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 py-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="w-5 h-5 text-blue-600" /> Clientes
              </CardTitle>
              <div className="pt-2 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Buscar cliente..." 
                  className="pl-9 h-9"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-y-auto bg-gray-50/50">
              <div className="divide-y divide-gray-100">
                {clients.map(client => (
                  <div 
                    key={client.id}
                    onClick={() => loadClientLinks(client)}
                    className={`p-4 cursor-pointer transition-all hover:bg-blue-50/50 ${selectedClient?.id === client.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="font-medium text-gray-900 truncate">
                      {client.nomeFantasia || client.razaoSocial || 'Cliente sem nome'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 truncate">{client.email}</div>
                  </div>
                ))}
                {clients.length === 0 && (
                  <div className="p-8 text-center text-gray-400 text-sm">
                    Nenhum cliente encontrado.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Advertisers Selection */}
          <Card className="flex-1 flex flex-col h-[50vh] md:h-full border-gray-200 shadow-sm">
             <CardHeader className="border-b border-gray-100 py-4 bg-white z-10">
                <div className="flex justify-between items-center">
                   <div>
                     <CardTitle className="flex items-center gap-2 text-lg">
                       <Megaphone className="w-5 h-5 text-purple-600" /> Anunciantes Disponíveis
                     </CardTitle>
                     <CardDescription className="mt-1">
                       {selectedClient 
                         ? `Selecione os anunciantes para "${selectedClient.nomeFantasia || selectedClient.email}"`
                         : "Selecione um cliente ao lado para começar"
                       }
                     </CardDescription>
                   </div>
                   {selectedClient && (
                     <Button onClick={handleSave} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                       {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                       Salvar Distribuição
                     </Button>
                   )}
                </div>
             </CardHeader>
             <CardContent className="p-6 flex-1 overflow-y-auto bg-white">
               {!selectedClient ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                    <Store className="w-16 h-16 mb-4 stroke-1" />
                    <p className="text-lg font-medium">Nenhum cliente selecionado</p>
                 </div>
               ) : (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {advertisers.map(ad => {
                       const isSelected = linkedAdvertisers.includes(ad.id);
                       return (
                         <div 
                           key={ad.id}
                           onClick={() => toggleAdvertiser(ad.id)}
                           className={`
                             relative p-4 rounded-xl border-2 transition-all cursor-pointer flex items-center justify-between group
                             ${isSelected 
                               ? 'border-[#006CFF] bg-blue-50/30' 
                               : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                             }
                           `}
                         >
                            <div className="flex items-center gap-3 min-w-0">
                               <div className={`
                                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden shrink-0
                                  ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}
                               `}>
                                  {ad.logoUrl ? (
                                     <img src={ad.logoUrl} alt={ad.nomeFantasia} className="w-full h-full object-cover" />
                                  ) : (
                                     (ad.nomeFantasia?.[0] || ad.email[0]).toUpperCase()
                                  )}
                               </div>
                               <div className="min-w-0">
                                  <div className={`font-semibold truncate ${isSelected ? 'text-[#006CFF]' : 'text-gray-700'}`}>
                                     {ad.nomeFantasia || ad.razaoSocial || 'Anunciante'}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">{ad.email}</div>
                               </div>
                            </div>
                            
                            <div className={`
                              w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors
                              ${isSelected ? 'border-[#006CFF] bg-[#006CFF]' : 'border-gray-300 group-hover:border-gray-400'}
                            `}>
                               {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                         </div>
                       );
                    })}
                    {advertisers.length === 0 && (
                      <div className="col-span-full p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                        Nenhum anunciante cadastrado no sistema.
                        <br />
                        <span className="text-xs">Vá em Usuários e crie usuários com perfil "Anunciante".</span>
                      </div>
                    )}
                 </div>
               )}
             </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
