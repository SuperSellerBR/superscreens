import { cn } from "../lib/utils";
import { useState, useEffect } from "react";
import { Save, Loader2, Youtube, Rss, Image as ImageIcon, CheckCircle2, LayoutTemplate, Timer, Sun, Moon, Monitor } from "lucide-react";
import { Input } from "../components/ui/input";
import { useTheme } from "../components/theme-provider";
import { ToggleGroup, ToggleGroupItem } from "../components/ui/toggle-group";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Slider } from "../components/ui/slider";
import { supabaseUrl, publicAnonKey } from "../utils/supabase/info";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { AdminLayout } from "../components/layout/AdminLayout";
import { useUserRole } from "../hooks/useUserRole";

// RSS Feed Sources
const RSS_SOURCES = {
  subjects: [
    { name: "Brasil", url: "https://g1.globo.com/dynamo/brasil/rss2.xml" },
    { name: "Carros (Autoesporte)", url: "https://g1.globo.com/dynamo/carros/rss2.xml" },
    { name: "Ciência e Saúde", url: "https://g1.globo.com/dynamo/ciencia-e-saude/rss2.xml" },
    { name: "Concursos e Emprego", url: "https://g1.globo.com/dynamo/concursos-e-emprego/rss2.xml" },
    { name: "Economia", url: "https://g1.globo.com/dynamo/economia/rss2.xml" },
    { name: "Educação", url: "https://g1.globo.com/dynamo/educacao/rss2.xml" },
    { name: "Loterias", url: "https://g1.globo.com/dynamo/loterias/rss2.xml" },
    { name: "Mundo", url: "https://g1.globo.com/dynamo/mundo/rss2.xml" },
    { name: "Música", url: "https://g1.globo.com/dynamo/musica/rss2.xml" },
    { name: "Natureza", url: "https://g1.globo.com/dynamo/natureza/rss2.xml" },
    { name: "Planeta Bizarro", url: "https://g1.globo.com/dynamo/planeta-bizarro/rss2.xml" },
    { name: "Política", url: "https://g1.globo.com/dynamo/politica/mensalao/rss2.xml" },
    { name: "Pop & Arte", url: "https://g1.globo.com/dynamo/pop-arte/rss2.xml" },
    { name: "Tecnologia e Games", url: "https://g1.globo.com/dynamo/tecnologia/rss2.xml" },
    { name: "Turismo e Viagem", url: "https://g1.globo.com/dynamo/turismo-e-viagem/rss2.xml" },
    { name: "VC no G1", url: "https://g1.globo.com/dynamo/vc-no-g1/rss2.xml" }
  ],
  regions: [
    { name: "Acre", url: "https://g1.globo.com/dynamo/ac/acre/rss2.xml" },
    { name: "Alagoas", url: "https://g1.globo.com/dynamo/al/alagoas/rss2.xml" },
    { name: "Amapá", url: "https://g1.globo.com/dynamo/ap/amapa/rss2.xml" },
    { name: "Amazonas", url: "https://g1.globo.com/dynamo/am/amazonas/rss2.xml" },
    { name: "Bahia", url: "https://g1.globo.com/dynamo/bahia/rss2.xml" },
    { name: "Ceará", url: "https://g1.globo.com/dynamo/ceara/rss2.xml" },
    { name: "Distrito Federal", url: "https://g1.globo.com/dynamo/distrito-federal/rss2.xml" },
    { name: "Espírito Santo", url: "https://g1.globo.com/dynamo/espirito-santo/rss2.xml" },
    { name: "Goiás", url: "https://g1.globo.com/dynamo/goias/rss2.xml" },
    { name: "Maranhão", url: "https://g1.globo.com/dynamo/ma/maranhao/rss2.xml" },
    { name: "Mato Grosso", url: "https://g1.globo.com/dynamo/mato-grosso/rss2.xml" },
    { name: "Mato Grosso do Sul", url: "https://g1.globo.com/dynamo/mato-grosso-do-sul/rss2.xml" },
    { name: "Minas Gerais", url: "https://g1.globo.com/dynamo/minas-gerais/rss2.xml" },
    { name: "MG - Centro-Oeste", url: "https://g1.globo.com/dynamo/mg/centro-oeste/rss2.xml" },
    { name: "MG - Grande Minas", url: "https://g1.globo.com/dynamo/mg/grande-minas/rss2.xml" },
    { name: "MG - Sul de Minas", url: "https://g1.globo.com/dynamo/mg/sul-de-minas/rss2.xml" },
    { name: "MG - Triângulo Mineiro", url: "https://g1.globo.com/dynamo/minas-gerais/triangulo-mineiro/rss2.xml" },
    { name: "MG - Vales de Minas Gerais", url: "https://g1.globo.com/dynamo/mg/vales-mg/rss2.xml" },
    { name: "MG - Zona da Mata", url: "https://g1.globo.com/dynamo/mg/zona-da-mata/rss2.xml" },
    { name: "Pará", url: "https://g1.globo.com/dynamo/pa/para/rss2.xml" },
    { name: "Paraíba", url: "https://g1.globo.com/dynamo/pb/paraiba/rss2.xml" },
    { name: "Paraná", url: "https://g1.globo.com/dynamo/pr/parana/rss2.xml" },
    { name: "PR - Campos Gerais e Sul", url: "https://g1.globo.com/dynamo/pr/campos-gerais-sul/rss2.xml" },
    { name: "PR - Oeste e Sudoeste", url: "https://g1.globo.com/dynamo/pr/oeste-sudoeste/rss2.xml" },
    { name: "PR - Norte e Noroeste", url: "https://g1.globo.com/dynamo/pr/norte-noroeste/rss2.xml" },
    { name: "Pernambuco", url: "https://g1.globo.com/dynamo/pernambuco/rss2.xml" },
    { name: "PE - Caruaru e Região", url: "https://g1.globo.com/dynamo/pe/caruaru-regiao/rss2.xml" },
    { name: "PE - Petrolina e Região", url: "https://g1.globo.com/dynamo/pe/petrolina-regiao/rss2.xml" },
    { name: "Rio de Janeiro", url: "https://g1.globo.com/dynamo/rio-de-janeiro/rss2.xml" },
    { name: "RJ - Região Serrana", url: "https://g1.globo.com/dynamo/rj/regiao-serrana/rss2.xml" },
    { name: "RJ - Região dos Lagos", url: "https://g1.globo.com/dynamo/rj/regiao-dos-lagos/rss2.xml" },
    { name: "RJ - Norte Fluminense", url: "https://g1.globo.com/dynamo/rj/norte-fluminense/rss2.xml" },
    { name: "RJ - Sul e Costa Verde", url: "https://g1.globo.com/dynamo/rj/sul-do-rio-costa-verde/rss2.xml" },
    { name: "Rio Grande do Norte", url: "https://g1.globo.com/dynamo/rn/rio-grande-do-norte/rss2.xml" },
    { name: "Rio Grande do Sul", url: "https://g1.globo.com/dynamo/rs/rio-grande-do-sul/rss2.xml" },
    { name: "Rondônia", url: "https://g1.globo.com/dynamo/ro/rondonia/rss2.xml" },
    { name: "Roraima", url: "https://g1.globo.com/dynamo/rr/roraima/rss2.xml" },
    { name: "Santa Catarina", url: "https://g1.globo.com/dynamo/sc/santa-catarina/rss2.xml" },
    { name: "São Paulo", url: "https://g1.globo.com/dynamo/sao-paulo/rss2.xml" },
    { name: "SP - Bauru e Marília", url: "https://g1.globo.com/dynamo/sp/bauru-marilia/rss2.xml" },
    { name: "SP - Campinas e região", url: "https://g1.globo.com/dynamo/sp/campinas-regiao/rss2.xml" },
    { name: "SP - Itapetininga e região", url: "https://g1.globo.com/dynamo/sao-paulo/itapetininga-regiao/rss2.xml" },
    { name: "SP - Mogi das Cruzes e Suzano", url: "https://g1.globo.com/dynamo/sp/mogi-das-cruzes-suzano/rss2.xml" },
    { name: "SP - Piracicaba e região", url: "https://g1.globo.com/dynamo/sp/piracicaba-regiao/rss2.xml" },
    { name: "SP - Prudente e região", url: "https://g1.globo.com/dynamo/sp/presidente-prudente-regiao/rss2.xml" },
    { name: "SP - Ribeirão Preto e Franca", url: "https://g1.globo.com/dynamo/sp/ribeirao-preto-franca/rss2.xml" },
    { name: "SP - Rio Preto e Araçatuba", url: "https://g1.globo.com/dynamo/sao-paulo/sao-jose-do-rio-preto-aracatuba/rss2.xml" },
    { name: "SP - Santos e Região", url: "https://g1.globo.com/dynamo/sp/santos-regiao/rss2.xml" },
    { name: "SP - São Carlos e Araraquara", url: "https://g1.globo.com/dynamo/sp/sao-carlos-regiao/rss2.xml" },
    { name: "SP - Sorocaba e Jundiaí", url: "https://g1.globo.com/dynamo/sao-paulo/sorocaba-jundiai/rss2.xml" },
    { name: "SP - Vale do Paraíba e região", url: "https://g1.globo.com/dynamo/sp/vale-do-paraiba-regiao/rss2.xml" },
    { name: "Sergipe", url: "https://g1.globo.com/dynamo/se/sergipe/rss2.xml" },
    { name: "Tocantins", url: "https://g1.globo.com/dynamo/to/tocantins/rss2.xml" },
    { name: "VC no G1", url: "https://g1.globo.com/dynamo/vc-no-g1/rss2.xml" }
  ]
};

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Settings State
  const [youtubeKey, setYoutubeKey] = useState("");
  const [rssUrl, setRssUrl] = useState("https://g1.globo.com/dynamo/brasil/rss2.xml");
  const [rssCategory, setRssCategory] = useState<'subjects' | 'regions'>('subjects');
  const [logoUrl, setLogoUrl] = useState("");
  const [activeTemplate, setActiveTemplate] = useState("fullscreen");
  const [contentRatio, setContentRatio] = useState(70);

  useEffect(() => {
    // Get Session Token on Mount
    supabase.auth.getSession().then(({ data: { session } }) => {
       const token = session?.access_token || publicAnonKey;
       setSessionToken(token);
       loadSettings(token);
    });
  }, []);

  const loadSettings = async (token: string) => {
    setIsLoading(true);
    try {
      const [ytRes, newsRes, logoRes, tplRes, cycleRes] = await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/youtube`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/news`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/logo`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/template`, {
            headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/cycle`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      // ... rest of loadSettings


      const ytData = await ytRes.json();
      const newsData = await newsRes.json();
      const logoData = await logoRes.json();
      const tplData = await tplRes.json();
      const cycleData = await cycleRes.json();

      if (ytData.apiKey) setYoutubeKey(ytData.apiKey);
      if (newsData.rssUrl) {
          setRssUrl(newsData.rssUrl);
          const isRegion = RSS_SOURCES.regions.some(r => r.url === newsData.rssUrl);
          setRssCategory(isRegion ? 'regions' : 'subjects');
      }
      if (logoData.logoUrl) setLogoUrl(logoData.logoUrl);
      if (tplData.template) setActiveTemplate(tplData.template);
      if (cycleData.contentRatio !== undefined) setContentRatio(cycleData.contentRatio);

    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Erro ao carregar configurações.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const token = sessionToken || publicAnonKey;
    try {
      await Promise.all([
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/youtube`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ apiKey: youtubeKey })
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/news`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ rssUrl: rssUrl })
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/logo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ logoUrl: logoUrl })
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/template`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ template: activeTemplate })
        }),
        fetch(`${supabaseUrl}/functions/v1/make-server-70a2af89/config/cycle`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ contentRatio: contentRatio })
        })
      ]);

      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 100 * 1024) { // 100KB limit for KV store safety
        toast.error("A imagem deve ter no máximo 100KB para upload direto. Para imagens maiores, use uma URL externa.");
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setLogoUrl(base64);
        toast.success("Imagem carregada para visualização. Salve para confirmar.");
    };
    reader.readAsDataURL(file);
  };

  if (isLoading || roleLoading) {
    return (
      <AdminLayout>
        <div className="flex h-full items-center justify-center bg-gray-50 min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500 mt-2">Gerencie as integrações e aparência do sistema.</p>
        </div>

      <div className="grid gap-6">
        {/* Appearance Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="w-5 h-5 text-yellow-500" /> Aparência
            </CardTitle>
            <CardDescription>
              Escolha o tema da interface administrativa.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Label className="w-20">Tema</Label>
              <ToggleGroup type="single" value={theme} onValueChange={(val) => val && setTheme(val as any)} className="justify-start">
                 <ToggleGroupItem value="light" aria-label="Modo Claro" className="data-[state=on]:bg-blue-100 data-[state=on]:text-blue-900 border border-transparent data-[state=on]:border-blue-200">
                    <Sun className="h-4 w-4 mr-2" /> Claro
                 </ToggleGroupItem>
                 <ToggleGroupItem value="dark" aria-label="Modo Escuro" className="data-[state=on]:bg-slate-800 data-[state=on]:text-white border border-transparent data-[state=on]:border-slate-700">
                    <Moon className="h-4 w-4 mr-2" /> Escuro
                 </ToggleGroupItem>
                 <ToggleGroupItem value="system" aria-label="Sistema" className="data-[state=on]:bg-gray-200 border border-transparent data-[state=on]:border-gray-300">
                    <Monitor className="h-4 w-4 mr-2" /> Sistema
                 </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </CardContent>
        </Card>

        {/* Template Config - Admin Only */}
        {isAdmin && (
          <Card className="border-blue-200 bg-blue-50/50">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <LayoutTemplate className="w-5 h-5 text-blue-600" /> Layout do Player
               </CardTitle>
               <CardDescription>
                 Escolha como o conteúdo será distribuído na tela.
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid gap-2">
                 <Label>Template Ativo</Label>
                 <Select value={activeTemplate} onValueChange={setActiveTemplate}>
                   <SelectTrigger className="bg-white">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="fullscreen">Fullscreen Padrão</SelectItem>
                     <SelectItem value="l-bar">TV Ao Vivo (L-Bar + Ads Intercalados)</SelectItem>
                     <SelectItem value="menu-board">Menu Board (Restaurante)</SelectItem>
                     <SelectItem value="events">Agenda de Eventos</SelectItem>
                     <SelectItem value="split">Split Screen (50/50)</SelectItem>
                   </SelectContent>
                 </Select>
                 <p className="text-xs text-gray-500 mt-1">
                   O template <strong>L-Bar</strong> agora alterna automaticamente para Fullscreen quando há anúncios de tela cheia agendados.
                 </p>
               </div>
             </CardContent>
          </Card>
        )}

        {/* Cycle Config */}
        <Card className="border-purple-200 bg-purple-50/50">
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Timer className="w-5 h-5 text-purple-600" /> Ciclo de Exibição
               </CardTitle>
               <CardDescription>
                 Defina a proporção de tempo entre conteúdo principal e anúncios.
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="grid gap-6">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Conteúdo Principal ({contentRatio}%)</Label>
                      <span className="text-sm font-medium text-gray-500">Anúncios ({100 - contentRatio}%)</span>
                    </div>
                    <Slider
                      defaultValue={[70]}
                      value={[contentRatio]}
                      min={10}
                      max={90}
                      step={5}
                      onValueChange={(vals) => setContentRatio(vals[0])}
                      className="py-4"
                    />
                    <p className="text-xs text-gray-500">
                      O player ajustará automaticamente a duração do ciclo para respeitar essa proporção. 
                      Ex: Em um ciclo com {100 - contentRatio}% de anúncios, o conteúdo será exibido por um tempo proporcionalmente maior.
                    </p>
                 </div>
               </div>
             </CardContent>
        </Card>

        {/* Youtube Config - Admin Only */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Youtube className="w-5 h-5 text-red-600" /> YouTube API
              </CardTitle>
              <CardDescription>
                Necessário para buscar vídeos do YouTube na biblioteca.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2">
                <Label htmlFor="youtube-key">API Key</Label>
                <Input
                  id="youtube-key"
                  value={youtubeKey}
                  onChange={(e) => setYoutubeKey(e.target.value)}
                  placeholder="Cole sua chave de API aqui..."
                  type="password"
                />
                <p className="text-xs text-gray-500">
                  Acesse o Google Cloud Console para gerar uma chave.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RSS Config - All Roles? Or just Admin? Assuming all for now unless specified otherwise in prompt. 
            Prompt said: "Arquitetura (Backend) e os itens da página de configuração "Layout do player", "ciclo de exibição" e "Youtube API" só devem ser visíveis para admins". 
            RSS and Logo were not explicitly restricted, but maybe they should be? 
            Let's keep RSS and Logo visible for now as user didn't mention them.
        */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="w-5 h-5 text-orange-500" /> Notícias (RSS)
            </CardTitle>
            <CardDescription>
              Fonte de notícias para o ticker do player.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              <Label>Fonte de Notícias (G1)</Label>
              
              <div className="bg-gray-100 p-1 rounded-lg flex mb-2 gap-1">
                <button 
                  className={cn(
                    "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                    rssCategory === 'subjects' ? "bg-white shadow-sm text-gray-900 font-bold" : "text-gray-500 hover:text-gray-700"
                  )}
                  onClick={() => setRssCategory('subjects')}
                >
                    Editorias
                </button>
                <button 
                  className={cn(
                    "flex-1 text-xs font-medium py-1.5 rounded-md transition-all",
                    rssCategory === 'regions' ? "bg-white shadow-sm text-gray-900 font-bold" : "text-gray-500 hover:text-gray-700"
                  )}
                  onClick={() => setRssCategory('regions')}
                >
                    Regiões
                </button>
              </div>

              <Select value={rssUrl} onValueChange={setRssUrl}>
                <SelectTrigger>
                    <SelectValue placeholder="Selecione um feed..." />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                    {RSS_SOURCES[rssCategory].map((feed) => (
                      <SelectItem key={feed.url} value={feed.url}>{feed.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-gray-500">Exibido no rodapé do template "Com Notícias".</p>
            </div>
          </CardContent>
        </Card>

        {/* Logo Config */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-blue-600" /> Logomarca
            </CardTitle>
            <CardDescription>
              Personalize a marca exibida no canto inferior direito do player (L-Bar).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Upload da Logo</Label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                   <Input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="cursor-pointer"
                   />
                </div>
                <div className="text-sm text-gray-500">ou</div>
                <div className="flex-[2]">
                    <Input 
                       placeholder="URL da imagem (ex: https://...)" 
                       value={logoUrl}
                       onChange={(e) => setLogoUrl(e.target.value)}
                    />
                </div>
              </div>
              <p className="text-[10px] text-gray-400">Recomendado: Imagem quadrada ou retangular transparente (PNG). Máx 100KB para upload direto.</p>
            </div>

            {logoUrl && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg flex items-center justify-center border border-dashed border-gray-300">
                    <div className="relative">
                        <img src={logoUrl} alt="Logo Preview" className="h-20 object-contain" />
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                        </div>
                    </div>
                </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="w-32">
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" /> Salvar
              </>
            )}
          </Button>
        </div>
      </div>
      </div>
    </AdminLayout>
  );
}
