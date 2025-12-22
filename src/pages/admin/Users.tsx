import { useState, useEffect } from "react";
import { AdminLayout } from "../../components/layout/AdminLayout";
import { Button } from "../../components/ui/button";
import { Plus, Search, Trash2, Edit, Loader2, User, Shield, Briefcase, Store, Camera, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { supabase } from "../../utils/supabase/client";

type UserRole = 'admin' | 'advertiser' | 'client';

interface UserData {
  id: string;
  email: string;
  role: UserRole;
  active: boolean;
  name?: string; // Admin
  cnpj?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  address?: string;
  phone?: string;
  createdAt?: string;
  logoPath?: string;
  logoUrl?: string;
}

const INITIAL_FORM = {
  email: '',
  password: '',
  role: 'advertiser' as UserRole,
  active: true,
  name: '',
  cnpj: '',
  razaoSocial: '',
  nomeFantasia: '',
  address: '',
  phone: '',
  logoPath: ''
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/media/upload-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
        body: JSON.stringify({ filename: `avatar_${Date.now()}_${file.name.replace(/\s+/g, '-')}` })
      });
      
      const { signedUrl, path } = await res.json();
      if (!signedUrl || !path) throw new Error("Falha na preparação do upload");

      const uploadRes = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadRes.ok) throw new Error("Falha no envio da imagem");

      setFormData(prev => ({ ...prev, logoPath: path }));
      setAvatarPreview(URL.createObjectURL(file));
      toast.success("Imagem enviada com sucesso!");
    } catch (err) {
      toast.error("Erro ao enviar imagem");
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };


  const fetchUsers = async () => {
    try {
      const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/users`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      toast.error("Erro ao carregar usuários");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    // Basic validation
    if (!formData.email || (!editingId && !formData.password)) {
      toast.error("Email e senha são obrigatórios");
      return;
    }

    if (formData.role === 'admin' && !formData.name) {
      toast.error("Nome é obrigatório para administradores");
      return;
    }

    if ((formData.role === 'advertiser' || formData.role === 'client') && !formData.razaoSocial) {
      toast.error("Razão Social é obrigatória");
      return;
    }

    // Prevent Duplicate Emails on Creation
    if (!editingId) {
      const emailExists = users.some(u => u.email.toLowerCase() === formData.email.toLowerCase());
      if (emailExists) {
        toast.error("Este e-mail já está cadastrado! Use outro e-mail ou edite o usuário existente.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const url = editingId 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/users/${editingId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/users`;
      
      const method = editingId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}` 
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Erro ao salvar usuário");

      toast.success(editingId ? "Usuário atualizado!" : "Usuário criado com sucesso!");
      setIsDialogOpen(false);
      resetForm();
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este usuário?")) return;

    try {
      await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      toast.success("Usuário removido");
      fetchUsers();
    } catch (err) {
      toast.error("Erro ao excluir usuário");
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setEditingId(null);
    setAvatarPreview(null);
  };

  const handleEdit = (user: UserData) => {
    setEditingId(user.id);
    setAvatarPreview(user.logoUrl || null);
    setFormData({
      email: user.email,
      password: '', // Don't show password
      role: user.role,
      active: user.active,
      name: user.name || '',
      cnpj: user.cnpj || '',
      razaoSocial: user.razaoSocial || '',
      nomeFantasia: user.nomeFantasia || '',
      address: user.address || '',
      phone: user.phone || '',
      logoPath: user.logoPath || ''
    });
    setIsDialogOpen(true);
  };

  const handleSync = async () => {
    try {
        setIsSyncing(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const res = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-70a2af89/users/sync`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error("Falha na sincronização");
        
        const data = await res.json();
        toast.success(`Sincronização concluída! ${data.added} usuários restaurados.`);
        fetchUsers(); // Refresh list
    } catch (error) {
        console.error("Sync error:", error);
        toast.error("Erro ao sincronizar usuários");
    } finally {
        setIsSyncing(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.name && u.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (u.razaoSocial && u.razaoSocial.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <AdminLayout>
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#0F1C2E]">Usuários</h1>
            <p className="text-gray-500 mt-1">Gerencie o acesso e cadastro de clientes e administradores.</p>
          </div>
          
          <div className="flex gap-2">
            <Button 
                variant="outline" 
                onClick={handleSync} 
                disabled={isSyncing}
                className="gap-2 border-gray-200 text-gray-600 hover:text-blue-600 hover:border-blue-200"
            >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar Base'}
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="bg-[#006CFF] hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
                <DialogDescription>
                  Preencha as informações abaixo para {editingId ? 'editar' : 'criar'} um cadastro.
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-center mt-6">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg bg-gray-100 flex items-center justify-center">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-10 h-10 text-gray-400" />
                    )}
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                    {isUploading ? <Loader2 className="w-8 h-8 text-white animate-spin" /> : <Camera className="w-8 h-8 text-white" />}
                    <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={isUploading} />
                  </label>
                </div>
              </div>

              <div className="grid gap-6 py-4">
                {/* Role Selection */}
                <div className="grid grid-cols-3 gap-4">
                  <div 
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${formData.role === 'admin' ? 'border-[#006CFF] bg-blue-50 text-[#006CFF]' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setFormData({...formData, role: 'admin'})}
                  >
                    <Shield className="w-6 h-6" />
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                  <div 
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${formData.role === 'advertiser' ? 'border-[#006CFF] bg-blue-50 text-[#006CFF]' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setFormData({...formData, role: 'advertiser'})}
                  >
                    <Briefcase className="w-6 h-6" />
                    <span className="text-sm font-medium">Anunciante</span>
                  </div>
                  <div 
                    className={`flex flex-col items-center gap-2 p-4 border rounded-xl cursor-pointer transition-all ${formData.role === 'client' ? 'border-[#006CFF] bg-blue-50 text-[#006CFF]' : 'border-gray-200 hover:border-gray-300'}`}
                    onClick={() => setFormData({...formData, role: 'client'})}
                  >
                    <Store className="w-6 h-6" />
                    <span className="text-sm font-medium">Cliente</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (Usuário)</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      value={formData.email} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      disabled={!!editingId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha {editingId && '(Opcional)'}</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      value={formData.password} 
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder={editingId ? "Manter atual" : ""}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                   <Switch 
                      id="active" 
                      checked={formData.active} 
                      onCheckedChange={(c) => setFormData({...formData, active: c})} 
                   />
                   <Label htmlFor="active">Cadastro Ativo</Label>
                </div>

                {/* Dynamic Fields based on Role */}
                {formData.role === 'admin' ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input 
                      id="name" 
                      value={formData.name} 
                      onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input 
                        id="cnpj" 
                        value={formData.cnpj} 
                        onChange={e => setFormData({...formData, cnpj: e.target.value})} 
                        placeholder="00.000.000/0000-00"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 space-y-2">
                      <Label htmlFor="phone">Telefone</Label>
                      <Input 
                        id="phone" 
                        value={formData.phone} 
                        onChange={e => setFormData({...formData, phone: e.target.value})} 
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="razao">Razão Social</Label>
                      <Input 
                        id="razao" 
                        value={formData.razaoSocial} 
                        onChange={e => setFormData({...formData, razaoSocial: e.target.value})} 
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="fantasia">Nome Fantasia</Label>
                      <Input 
                        id="fantasia" 
                        value={formData.nomeFantasia} 
                        onChange={e => setFormData({...formData, nomeFantasia: e.target.value})} 
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="address">Endereço Completo</Label>
                      <Input 
                        id="address" 
                        value={formData.address} 
                        onChange={e => setFormData({...formData, address: e.target.value})} 
                      />
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? 'Salvar Alterações' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
           <div className="p-4 border-b border-gray-100 flex items-center gap-2">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="Buscar por nome ou email..." 
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
           </div>

           <div className="hidden md:block overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow className="bg-gray-50/50">
                   <TableHead>Usuário</TableHead>
                   <TableHead>Função</TableHead>
                   <TableHead>Dados</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="text-right">Ações</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {isLoading ? (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center">
                       <Loader2 className="h-6 w-6 animate-spin mx-auto text-[#006CFF]" />
                     </TableCell>
                   </TableRow>
                 ) : filteredUsers.length === 0 ? (
                   <TableRow>
                     <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                       Nenhum usuário encontrado
                     </TableCell>
                   </TableRow>
                 ) : (
                   filteredUsers.map((user) => (
                     <TableRow key={user.id} className="hover:bg-gray-50/50">
                       <TableCell>
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-200">
                             {user.logoUrl ? (
                               <img src={user.logoUrl} className="w-full h-full object-cover" />
                             ) : (
                               <span className="font-bold text-gray-500 text-xs">
                                 {(user.nomeFantasia?.[0] || user.name?.[0] || user.email[0]).toUpperCase()}
                               </span>
                             )}
                           </div>
                           <div className="flex flex-col">
                             <span className="font-medium text-gray-900">
                               {user.role === 'admin' ? user.name : (user.nomeFantasia || user.razaoSocial || 'Sem Nome')}
                             </span>
                             <span className="text-xs text-gray-500">{user.email}</span>
                           </div>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant="secondary" className={`
                           ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                             user.role === 'advertiser' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                         `}>
                           {user.role === 'admin' ? 'Administrador' : user.role === 'advertiser' ? 'Anunciante' : 'Cliente'}
                         </Badge>
                       </TableCell>
                       <TableCell>
                         <div className="text-sm text-gray-500 space-y-1">
                           {user.role !== 'admin' && (
                             <>
                               {user.cnpj && <div className="text-xs">CNPJ: {user.cnpj}</div>}
                               {user.phone && <div className="text-xs">Tel: {user.phone}</div>}
                             </>
                           )}
                           {user.role === 'admin' && <div className="text-xs text-gray-400">Acesso Total</div>}
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge className={user.active ? "bg-green-500" : "bg-gray-300"}>
                           {user.active ? "Ativo" : "Inativo"}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-right">
                         <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" onClick={() => handleEdit(user)}>
                             <Edit className="h-4 w-4 text-gray-500 hover:text-[#006CFF]" />
                           </Button>
                           <Button variant="ghost" size="icon" onClick={() => handleDelete(user.id)}>
                             <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-500" />
                           </Button>
                         </div>
                       </TableCell>
                     </TableRow>
                   ))
                 )}
               </TableBody>
             </Table>
           </div>

           {/* Mobile Card View */}
           <div className="md:hidden flex flex-col gap-4 p-4 bg-gray-50/50 overflow-y-auto">
             {isLoading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-[#006CFF]" /></div>
             ) : filteredUsers.length === 0 ? (
                <div className="text-center p-8 text-gray-500 bg-white rounded-lg border border-dashed border-gray-200">
                   Nenhum usuário encontrado
                </div>
             ) : (
                filteredUsers.map(user => (
                  <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col gap-4">
                     <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden shrink-0 flex items-center justify-center border border-gray-200 text-lg">
                              {user.logoUrl ? (
                                <img src={user.logoUrl} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-bold text-gray-500">
                                  {(user.nomeFantasia?.[0] || user.name?.[0] || user.email[0]).toUpperCase()}
                                </span>
                              )}
                           </div>
                           <div className="flex flex-col min-w-0">
                              <span className="font-bold text-gray-900 truncate">
                                {user.role === 'admin' ? user.name : (user.nomeFantasia || user.razaoSocial || 'Sem Nome')}
                              </span>
                              <span className="text-xs text-gray-500 truncate">{user.email}</span>
                           </div>
                        </div>
                        <Badge variant="secondary" className={`shrink-0 
                            ${user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                              user.role === 'advertiser' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}
                          `}>
                            {user.role === 'admin' ? 'Admin' : user.role === 'advertiser' ? 'Anunc.' : 'Cliente'}
                        </Badge>
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div className="col-span-2 flex justify-between items-center pb-2 border-b border-gray-200 mb-1">
                           <span className="text-xs font-semibold text-gray-500 uppercase">Status</span>
                           <Badge className={user.active ? "bg-green-500" : "bg-gray-300"}>
                             {user.active ? "Ativo" : "Inativo"}
                           </Badge>
                        </div>
                        {user.role !== 'admin' && (
                           <>
                             <div>
                                <span className="text-xs text-gray-400 block">CNPJ</span>
                                <span className="font-medium text-gray-700">{user.cnpj || '-'}</span>
                             </div>
                             <div>
                                <span className="text-xs text-gray-400 block">Telefone</span>
                                <span className="font-medium text-gray-700">{user.phone || '-'}</span>
                             </div>
                           </>
                        )}
                        {user.role === 'admin' && (
                           <div className="col-span-2 text-center py-2 text-gray-400 text-xs italic">
                              Acesso administrativo completo
                           </div>
                        )}
                     </div>

                     <div className="flex gap-2 pt-2 border-t border-gray-100">
                        <Button variant="outline" className="flex-1 h-9" onClick={() => handleEdit(user)}>
                           <Edit className="w-4 h-4 mr-2" /> Editar
                        </Button>
                        <Button variant="outline" className="flex-1 h-9 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-200" onClick={() => handleDelete(user.id)}>
                           <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </Button>
                     </div>
                  </div>
                ))
             )}
           </div>
        </div>
      </div>
    </AdminLayout>
  );
}
