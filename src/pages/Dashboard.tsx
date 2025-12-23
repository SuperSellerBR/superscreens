import { useState, useEffect, useMemo } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { Loader2, Tv, TrendingUp, DollarSign, Activity, AlertCircle, Monitor, Search, Filter, Maximize2, X, ChevronLeft, ChevronRight, Clock, Music, Trophy } from "lucide-react";
import { supabaseUrl, publicAnonKey } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserData {
  id: string;
  email: string;
  role: 'admin' | 'advertiser' | 'client';
  active: boolean;
  name?: string;
  razaoSocial?: string;
  nomeFantasia?: string;
  logoUrl?: string;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState({
    onlineTvs: 0,
    totalClients: 0,
    onlineDevicesList: [] as any[],
    mediaCount: 0,
    activeAdvertisersCount: 0,
    totalAdsDisplayed: 0,
    jukeboxRequests: 0,
    jukeboxHistory: {},
    estimatedEarnings: 0,
    recentActivity: []
  });
  const [clients, setClients] = useState<UserData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState<string>('all');
  const LOGS_PER_PAGE = 10;
  
  const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B'];
  const SOV_COLORS = ['#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#10B981', '#6B7280'];

  useEffect(() => {
    const init = async () => {
      await Promise.all([fetchStats(), fetchClients()]);
      setLoading(false);
    };
    init();

    // Polling fallback
    const interval = setInterval(fetchStats, 30000);
    
    // Realtime Subscription
    const channel = supabase
      .channel('dashboard-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'kv_store_70a2af89',
          filter: 'key=eq.activity_log'
        },
        (payload) => {
          if (payload.new && (payload.new as any).value) {
             setStatsData(prev => ({
                 ...prev,
                 recentActivity: (payload.new as any).value
             }));
          }
        }
      )
      .subscribe();

    return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/dashboard/stats?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        setStatsData(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics", error);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/users`, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Filter only clients
        const clientList = (data.users || []).filter((u: UserData) => u.role === 'client');
        setClients(clientList);
      }
    } catch (error) {
      console.error("Failed to fetch clients", error);
    }
  };

  // Jukebox Weekly Data
  const jukeboxChartData = useMemo(() => {
     const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
     const data = [];
     const history: any = (statsData as any).jukeboxHistory || {};
     const today = new Date();

     for (let i = 6; i >= 0; i--) {
         const d = new Date(today);
         d.setDate(today.getDate() - i);
         
         // Generate YYYY-MM-DD in Local Time (BRT compatible)
         const year = d.getFullYear();
         const month = String(d.getMonth() + 1).padStart(2, '0');
         const day = String(d.getDate()).padStart(2, '0');
         const dateKey = `${year}-${month}-${day}`;
         
         const dayLabel = days[d.getDay()];
         
         data.push({
             name: dayLabel,
             value: history[dateKey] || 0,
             fullDate: d.toLocaleDateString('pt-BR')
         });
     }
     return data;
  }, [statsData]);

  // Jukebox Hourly Activity (Heatmap Logic)
  const jukeboxHourlyData = useMemo(() => {
    const hours = Array(24).fill(0);
    const logs = (statsData.recentActivity || []) as any[];

    logs.forEach(log => {
        // Filter mainly for Jukebox requests
        if (log.type === 'jukebox') {
            const date = new Date(log.time);
            const hour = date.getHours();
            if (hour >= 0 && hour < 24) {
                hours[hour]++;
            }
        }
    });

    return hours.map((count, i) => ({
        hour: `${i}h`,
        requests: count
    }));
  }, [statsData.recentActivity]);

  // Jukebox Top Songs (Ranking Logic)
  const topSongs = useMemo(() => {
    const counts: Record<string, number> = {};
    const logs = (statsData.recentActivity || []) as any[];

    logs.forEach(log => {
        if (log.type === 'jukebox') {
            // Log format is "Jukebox: Title"
            const title = log.text.replace('Jukebox: ', '').trim();
            if (title) {
                counts[title] = (counts[title] || 0) + 1;
            }
        }
    });

    return Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
  }, [statsData.recentActivity]);

  // Share of Voice Logic
  const { sovData, distinctAdvertisers } = useMemo(() => {
    const logs = (statsData.recentActivity || []) as any[];
    const counts: Record<string, number> = {};
    const advertisersSet = new Set<string>();

    logs.forEach(log => {
        // STRICT FILTER: Only consider explicit 'ad' types for Share of Voice
        // We ignore 'media' because that's usually the client's own playlist content
        if (log.type === 'ad') {
            // Extract clean name. Usually "Anúncio: Coca Cola"
            let name = log.text.replace(/^Anúncio:\s*/i, '').trim();
            
            // Fallback: If name is empty or just generic, try to make it readable
            if (!name) name = "Anúncio Desconhecido";
            
            counts[name] = (counts[name] || 0) + 1;
            advertisersSet.add(name);
        }
    });

    const totalImpressions = Object.values(counts).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a);

    // If specific filter is active
    if (selectedAdvertiser !== 'all') {
        const targetCount = counts[selectedAdvertiser] || 0;
        const othersCount = totalImpressions - targetCount;
        
        return {
            distinctAdvertisers: Array.from(advertisersSet).sort(),
            sovData: [
                { name: selectedAdvertiser, value: targetCount },
                { name: 'Outros', value: othersCount }
            ]
        };
    }

    // Default View: Top 5 + Others
    const top5 = sorted.slice(0, 5).map(([name, val]) => ({ name, value: val }));
    const others = sorted.slice(5).reduce((acc, [, val]) => acc + val, 0);
    
    if (others > 0) {
        top5.push({ name: 'Outros', value: others });
    }

    return {
        distinctAdvertisers: Array.from(advertisersSet).sort(),
        sovData: top5
    };
  }, [statsData.recentActivity, selectedAdvertiser]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  // Prepare Chart Data
  const deviceStatusData = [
    { name: 'Online', value: statsData.onlineTvs },
    { name: 'Offline', value: Math.max(0, statsData.totalClients - statsData.onlineTvs) },
  ];

  const filteredClients = clients.filter(client => {
      const isOnline = statsData.onlineDevicesList?.some((device: any) => device.id === client.id);
      const matchesSearch = (client.nomeFantasia || client.name || "").toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' 
          ? true 
          : statusFilter === 'online' ? isOnline : !isOnline;
      return matchesSearch && matchesStatus;
  }).sort((a, b) => {
      // 1. Prioritize clients with logoUrl
      const aHasLogo = !!a.logoUrl;
      const bHasLogo = !!b.logoUrl;
      if (aHasLogo && !bHasLogo) return -1;
      if (!aHasLogo && bHasLogo) return 1;
      
      // 2. Sort alphabetically by display name
      const nameA = (a.nomeFantasia || a.razaoSocial || a.name || "").toLowerCase();
      const nameB = (b.nomeFantasia || b.razaoSocial || b.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
  });

  const displayedClients = isExpanded ? filteredClients : filteredClients.slice(0, 5);

  // Pagination Logic for Logs
  const recentLogs = (statsData.recentActivity || [])
    .filter((log: any) => {
        const logTime = new Date(log.time).getTime();
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        return logTime > oneDayAgo;
    })
    .sort((a: any, b: any) => new Date(b.time).getTime() - new Date(a.time).getTime());

  const totalLogPages = Math.max(1, Math.ceil(recentLogs.length / LOGS_PER_PAGE));
  const displayedLogs = recentLogs.slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE);

  const StatusFilterControl = () => (
      <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg h-9">
        <button 
          onClick={() => setStatusFilter('all')}
          className={`px-3 text-xs font-medium rounded-md transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
        >
          Todos
        </button>
        <button 
          onClick={() => setStatusFilter('online')}
          className={`px-3 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${statusFilter === 'online' ? 'bg-white dark:bg-gray-700 text-green-700 dark:text-green-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400'}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          On
        </button>
        <button 
          onClick={() => setStatusFilter('offline')}
          className={`px-3 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${statusFilter === 'offline' ? 'bg-white dark:bg-gray-700 text-red-700 dark:text-red-400 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400'}`}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Off
        </button>
      </div>
  );

  const PlayerGrid = ({ items, isFullView }: { items: UserData[], isFullView?: boolean }) => (
      <div className={`grid grid-cols-2 ${isFullView ? 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6' : 'md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'} gap-6`}>
              {items.length > 0 ? (
                items.map((client) => {
                  const isOnline = statsData.onlineDevicesList?.some((device: any) => device.id === client.id); 
                  
                  return (
                    <div key={client.id} className="flex flex-col items-center gap-4">
                      <div className="relative group w-full flex flex-col items-center">
                          {/* Monitor Frame - Responsive Size */}
                          <div className="w-full aspect-video bg-gray-900 rounded-lg border-4 border-gray-800 shadow-xl relative overflow-hidden flex items-center justify-center max-w-[240px]">
                              {/* Screen Content - Logo or Gradient */}
                              <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black opacity-80" />
                              {client.logoUrl ? (
                                <img src={client.logoUrl} className="w-1/3 h-1/3 object-contain opacity-50 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all duration-500" alt="Screen" />
                              ) : (
                                <Monitor className="text-gray-700 w-12 h-12" />
                              )}
                              
                              {/* Glare effect */}
                              <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/5 rotate-45 blur-xl pointer-events-none" />

                              {/* Status LED (Power Light) */}
                              <div className={`absolute bottom-2 right-3 w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'}`} />
                          </div>
                          
                          {/* Stand base (decorative) */}
                          <div className="mx-auto w-10 h-2 bg-gray-800 rounded-b-lg mt-[-2px]" />
                      </div>

                      {/* Info */}
                      <div className="text-center mt-2 w-full">
                          <p className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate px-2" title={client.nomeFantasia || client.name}>
                              {client.nomeFantasia || client.razaoSocial || client.name}
                          </p>
                          <p className={`text-xs font-medium mt-0.5 ${isOnline ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                              {isOnline ? 'Online' : 'Offline'}
                          </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full w-full py-12 text-center text-gray-400 dark:text-gray-500 italic flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                        <Monitor className="w-6 h-6 opacity-30" />
                    </div>
                    <p>Nenhum player encontrado com os filtros atuais.</p>
                </div>
              )}
           </div>
  );

  return (
    <AdminLayout>
        <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
            <div>
            <h1 className="text-2xl font-bold text-[#0F1C2E] dark:text-white">Relatórios e Métricas</h1>
            <p className="text-gray-500 dark:text-gray-400">Análise detalhada do desempenho da rede</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 rounded-lg text-sm font-medium">
            <Activity className="w-4 h-4" />
            Tempo Real
            </div>
        </div>

        {/* Players Status Panel */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
           <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between items-center">
               <h3 className="text-lg font-bold text-[#0F1C2E] dark:text-white">Players ({filteredClients.length})</h3>
               
               <div className="flex gap-3 w-full sm:w-auto">
                   {/* Search Input */}
                   <div className="relative flex-1 sm:flex-none">
                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                       <input 
                           type="text" 
                           placeholder="Buscar player..." 
                           className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm w-full sm:w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                           value={searchTerm}
                           onChange={e => setSearchTerm(e.target.value)}
                       />
                   </div>

                   {/* Filter Control */}
                   <StatusFilterControl />

                   {/* Expand Button */}
                   <button 
                       onClick={() => setIsExpanded(true)}
                       className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                       title="Expandir para tela cheia"
                   >
                       <Maximize2 className="w-5 h-5" />
                   </button>
               </div>
           </div>

           <PlayerGrid items={displayedClients} />
           
           {!isExpanded && filteredClients.length > 5 && (
               <div className="mt-6 text-center">
                   <button 
                       onClick={() => setIsExpanded(true)}
                       className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                   >
                       Ver todos os {filteredClients.length} players
                   </button>
               </div>
           )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    (statsData.onlineTvs / (statsData.totalClients || 1)) >= 0.9 
                        ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                        : (statsData.onlineTvs / (statsData.totalClients || 1)) >= 0.5 
                            ? 'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400'
                }`}>
                    {(statsData.onlineTvs / (statsData.totalClients || 1)) >= 0.9 ? 'Saudável' : 'Atenção'}
                </span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Uptime da Rede</h3>
            <div className="text-2xl font-bold text-[#0F1C2E] dark:text-white mt-1">
                {statsData.totalClients > 0 
                    ? Math.round((statsData.onlineTvs / statsData.totalClients) * 100) 
                    : 0}%
            </div>
            
            {/* Health Bar */}
            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 mt-3 overflow-hidden">
                <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                        (statsData.onlineTvs / (statsData.totalClients || 1)) >= 0.9 ? 'bg-green-500' : 
                        (statsData.onlineTvs / (statsData.totalClients || 1)) >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${statsData.totalClients > 0 ? (statsData.onlineTvs / statsData.totalClients) * 100 : 0}%` }}
                />
            </div>
            
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                {statsData.onlineTvs} online de {statsData.totalClients} total
            </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">+12%</span>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Impressões Totais</h3>
            <div className="text-2xl font-bold text-[#0F1C2E] dark:text-white mt-1">{statsData.totalAdsDisplayed}</div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Visualizações de anúncios</p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 md:col-span-2">
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <DollarSign className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
            </div>
            <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium">Receita Estimada (Mensal)</h3>
            <div className="text-2xl font-bold text-[#0F1C2E] dark:text-white mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(statsData.estimatedEarnings)}
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Baseado em contratos ativos e impressões</p>
            </div>
        </div>

        {/* Full Screen Overlay */}
        {isExpanded && (
            <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-950 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="min-h-screen p-6 md:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8 max-w-7xl mx-auto">
                        <div>
                            <h2 className="text-2xl font-bold text-[#0F1C2E] dark:text-white">Monitoramento de Players</h2>
                            <p className="text-gray-500 dark:text-gray-400">Visualização completa da rede de dispositivos</p>
                        </div>
                        <button 
                            onClick={() => setIsExpanded(false)}
                            className="p-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 transition-all"
                            title="Fechar"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Toolbar (Duplicated/Synced) */}
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 max-w-7xl mx-auto flex flex-col sm:flex-row gap-4 justify-between items-center sticky top-4 z-40">
                       <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-700 dark:text-gray-200">Total: {filteredClients.length}</span>
                            <span className="text-gray-300 dark:text-gray-600">|</span>
                            <span className="text-sm text-green-600 dark:text-green-400">{filteredClients.filter(c => statsData.onlineDevicesList?.some((d: any) => d.id === c.id)).length} Online</span>
                       </div>
                       
                       <div className="flex gap-3 w-full sm:w-auto">
                           <div className="relative flex-1 sm:flex-none">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                               <input 
                                   type="text" 
                                   placeholder="Buscar player..." 
                                   className="pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm w-full sm:w-64 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all" 
                                   value={searchTerm}
                                   onChange={e => setSearchTerm(e.target.value)}
                                   autoFocus
                               />
                           </div>

                           <StatusFilterControl />
                       </div>
                    </div>

                    {/* Full Grid */}
                    <div className="max-w-7xl mx-auto">
                        <PlayerGrid items={filteredClients} isFullView={true} />
                    </div>
                </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Device Health Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-[#0F1C2E] dark:text-white mb-6">Saúde da Rede</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={deviceStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    >
                    {deviceStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                    ))}
                    </Pie>
                    <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                    />
                    <Legend />
                </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Monitoramento em tempo real dos dispositivos
            </div>
            </div>

            {/* Revenue Trend Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-[#0F1C2E] dark:text-white mb-6 flex items-center gap-2">
                <span className="text-pink-500">🎵</span> Pedidos Semanais ao Jukebox
            </h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={jukeboxChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} className="dark:text-gray-400" />
                    <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{fill: '#6B7280'}} className="dark:text-gray-400" />
                    <Tooltip 
                        cursor={{fill: 'rgba(243, 244, 246, 0.5)'}}
                        contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                        formatter={(value: number) => [value, 'Pedidos']}
                        labelFormatter={(label, payload) => {
                            if (payload && payload[0] && payload[0].payload) {
                                return payload[0].payload.fullDate;
                            }
                            return label;
                        }}
                    />
                    <Bar dataKey="value" fill="#EC4899" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
                </ResponsiveContainer>
            </div>
            </div>
        </div>

        {/* Jukebox Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Hourly Activity Chart (Heatmap) */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-[#0F1C2E] dark:text-white mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-purple-500" />
                    Horários de Pico (Jukebox)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={jukeboxHourlyData}>
                            <defs>
                                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:stroke-gray-700" />
                            <XAxis 
                                dataKey="hour" 
                                axisLine={false} 
                                tickLine={false} 
                                tick={{fill: '#6B7280'}} 
                                interval={3} // Show every 3rd hour
                                className="dark:text-gray-400" 
                            />
                            <YAxis axisLine={false} tickLine={false} allowDecimals={false} tick={{fill: '#6B7280'}} className="dark:text-gray-400" />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                formatter={(value: number) => [value, 'Pedidos']}
                            />
                            <Area type="monotone" dataKey="requests" stroke="#8B5CF6" fillOpacity={1} fill="url(#colorRequests)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Top Songs Ranking */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                 <h3 className="text-lg font-bold text-[#0F1C2E] dark:text-white mb-6 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Top Músicas
                </h3>
                
                <div className="space-y-4">
                    {topSongs.length > 0 ? (
                        topSongs.map((song, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg group hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors border border-transparent hover:border-purple-100 dark:hover:border-purple-800">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 
                                      index === 1 ? 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' : 
                                      index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 
                                      'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500'}
                                `}>
                                    {index + 1}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm" title={song.name}>
                                        {song.name}
                                    </p>
                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full mt-1.5 overflow-hidden">
                                        <div 
                                            className="h-full bg-purple-500 rounded-full" 
                                            style={{ width: `${(song.count / topSongs[0].count) * 100}%` }} 
                                        />
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                                    {song.count} <span className="font-normal text-gray-400">pedidos</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 dark:text-gray-500">
                            <Music className="w-10 h-10 mb-2 opacity-20" />
                            <p className="text-sm">Ainda sem dados suficientes para gerar o ranking.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Commercial Performance (Share of Voice) */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-[#0F1C2E] dark:text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-500" />
                        Share of Voice (Impressões)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Distribuição de exibição entre anunciantes</p>
                </div>
                
                {/* Client Filter */}
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select 
                        className="pl-9 pr-8 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none min-w-[200px]"
                        value={selectedAdvertiser}
                        onChange={(e) => setSelectedAdvertiser(e.target.value)}
                    >
                        <option value="all">Todos os Anunciantes</option>
                        {distinctAdvertisers.map(ad => (
                            <option key={ad} value={ad}>{ad}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="h-64 relative">
                    {sovData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={sovData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {sovData.map((entry, index) => (
                                        <Cell 
                                            key={`cell-${index}`} 
                                            fill={selectedAdvertiser !== 'all' && entry.name === 'Outros' ? '#E5E7EB' : SOV_COLORS[index % SOV_COLORS.length]} 
                                            strokeWidth={0} 
                                        />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
                                    formatter={(value: number, name: string) => [value, name]}
                                />
                                <Legend layout="vertical" verticalAlign="middle" align="right" />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 opacity-50">
                            <Activity className="w-12 h-12 mb-2" />
                            <p>Sem dados de impressões recentes</p>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm uppercase tracking-wider mb-4">
                        {selectedAdvertiser === 'all' ? 'Top Performance' : `Análise: ${selectedAdvertiser}`}
                    </h4>
                    
                    {sovData.map((item, idx) => {
                        const total = sovData.reduce((acc, curr) => acc + curr.value, 0);
                        const percent = total > 0 ? Math.round((item.value / total) * 100) : 0;
                        const isHighlight = selectedAdvertiser !== 'all' && item.name === selectedAdvertiser;
                        const isOthers = item.name === 'Outros';

                        return (
                            <div key={idx} className={`p-3 rounded-lg border transition-all ${isHighlight ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-transparent border-transparent'}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`font-medium ${isHighlight ? 'text-blue-700 dark:text-blue-400' : isOthers ? 'text-gray-500' : 'text-gray-700 dark:text-gray-200'}`}>
                                        {item.name}
                                    </span>
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{percent}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${isHighlight ? 'bg-blue-500' : isOthers ? 'bg-gray-400' : ''}`}
                                        style={{ 
                                            width: `${percent}%`,
                                            backgroundColor: isHighlight ? undefined : isOthers ? undefined : SOV_COLORS[idx % SOV_COLORS.length]
                                        }} 
                                    />
                                </div>
                                <div className="mt-1 text-xs text-gray-400 text-right">
                                    {item.value} impressões
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>

        {/* Activity Log Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                <h3 className="text-lg font-bold text-[#0F1C2E] dark:text-white">Logs do Sistema</h3>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium">
                <tr>
                    <th className="px-6 py-3">Evento</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Data/Hora</th>
                    <th className="px-6 py-3">Status</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {displayedLogs.length > 0 ? (
                    displayedLogs.map((log: any, i: number) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-gray-100">{log.text}</td>
                        <td className="px-6 py-4">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                log.type === 'media' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
                                log.type === 'tv' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                                log.type === 'jukebox' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300' :
                                'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                            }`}>
                                {log.type === 'media' ? 'Conteúdo' : log.type === 'tv' ? 'Sistema' : log.type === 'jukebox' ? 'Jukebox' : 'Anúncio'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                            {new Date(log.time).toLocaleString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                            <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                Sucesso
                            </div>
                        </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-gray-400 dark:text-gray-500 italic">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                            Nenhum registro de log encontrado.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>

            {/* Pagination */}
            {totalLogPages > 1 && (
                <div className="flex justify-between items-center p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <button 
                        disabled={logPage === 1}
                        onClick={() => setLogPage(p => Math.max(1, p - 1))}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                        Página {logPage} de {totalLogPages}
                    </span>
                    <button 
                        disabled={logPage === totalLogPages}
                        onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))}
                        className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
        </div>
    </AdminLayout>
  );
}
