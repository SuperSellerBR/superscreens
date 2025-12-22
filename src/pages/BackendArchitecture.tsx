import { AdminLayout } from "@/components/layout/AdminLayout";
import { ArrowRight, Database, Globe, Server, Tv, Users, Cloud } from "lucide-react";

function FlowNode({ icon: Icon, label, sub, color = "bg-white" }: { icon: any, label: string, sub?: string, color?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center p-4 rounded-xl border border-gray-200 shadow-sm w-48 h-32 text-center z-10 ${color}`}>
      <div className="p-2 bg-gray-100 rounded-full mb-2">
        <Icon className="h-6 w-6 text-gray-700" />
      </div>
      <span className="font-bold text-sm text-gray-900">{label}</span>
      {sub && <span className="text-xs text-gray-500 mt-1">{sub}</span>}
    </div>
  );
}

function ArrowDown() {
  return (
    <div className="h-12 w-px bg-gray-300 my-2 relative">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-300" />
    </div>
  );
}

export default function BackendArchitecture() {
  return (
    <AdminLayout>
      <div className="space-y-10 pb-20">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1C2E]">Arquitetura do Sistema (MVP)</h1>
          <p className="text-gray-500">Fluxo de dados e estrutura de banco de dados.</p>
        </div>

        {/* Architecture Diagram */}
        <div className="p-8 bg-gray-50 rounded-xl border border-gray-200 overflow-x-auto">
          <h3 className="font-bold text-lg mb-8 text-[#0F1C2E]">Fluxo de Dados: Publicação até Exibição</h3>
          
          <div className="flex flex-col items-center min-w-[800px]">
            
            {/* LAYER 1: Admin */}
            <div className="flex gap-16">
              <FlowNode icon={Users} label="Dono do Bar" sub="Upload de Mídia" />
              <FlowNode icon={Users} label="Staff SuperScreens" sub="Gestão de Anúncios" />
            </div>

            <ArrowDown />

            {/* LAYER 2: App Server / Backend */}
            <div className="relative p-8 border-2 border-dashed border-blue-200 rounded-2xl bg-blue-50/50 w-full max-w-3xl flex justify-center">
              <div className="absolute top-3 left-4 text-xs font-bold text-blue-500 uppercase">Backend / API Layer</div>
              <div className="flex gap-8 items-center">
                <FlowNode icon={Cloud} label="API Server" sub="Node.js / Next.js" color="bg-white" />
                <ArrowRight className="text-gray-400" />
                <FlowNode icon={Database} label="Database" sub="PostgreSQL (Supabase)" color="bg-white" />
                <ArrowRight className="text-gray-400" />
                <FlowNode icon={Server} label="Storage Bucket" sub="Imagens / Vídeos" color="bg-white" />
              </div>
            </div>

            <ArrowDown />

            {/* LAYER 3: Manifest Generation */}
            <div className="flex flex-col items-center">
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm font-medium mb-2">
                Gera manifest.json (Playlist)
              </div>
              <ArrowDown />
            </div>

            {/* LAYER 4: TV Player */}
            <div className="p-8 border-2 border-gray-200 rounded-2xl bg-white w-full max-w-3xl flex justify-center relative">
               <div className="absolute top-3 left-4 text-xs font-bold text-gray-500 uppercase">Client Side (TV)</div>
               <div className="flex gap-12 items-center">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-1">Polling 60s</p>
                    <ArrowRight className="rotate-90 text-gray-300 mx-auto mb-2" />
                    <FlowNode icon={Tv} label="Smart TV Player" sub="PWA / Web Browser" color="bg-gray-900 text-white border-gray-800" />
                  </div>
                  <div className="flex-1 h-px bg-gray-200 relative">
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] bg-white px-2 text-gray-400">Log de Impressões</span>
                  </div>
                  <div className="opacity-60">
                     <FlowNode icon={Database} label="Analytics DB" sub="Registro de Views" />
                  </div>
               </div>
            </div>

          </div>
        </div>

        {/* Database Schema */}
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
            <h3 className="font-bold text-lg mb-4 text-[#0F1C2E]">Entidades do Banco de Dados</h3>
            <ul className="space-y-3">
              <SchemaTable name="venues" fields={['id', 'name', 'owner_id', 'address', 'plan_type']} />
              <SchemaTable name="screens" fields={['id', 'venue_id', 'name', 'pairing_code', 'status', 'last_ping']} />
              <SchemaTable name="playlists" fields={['id', 'venue_id', 'name', 'items_json', 'is_active']} />
              <SchemaTable name="assets" fields={['id', 'venue_id', 'url', 'type', 'duration', 'created_at']} />
            </ul>
          </div>
          <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
             <h3 className="font-bold text-lg mb-4 text-[#0F1C2E] opacity-0">.</h3>
             <ul className="space-y-3">
              <SchemaTable name="advertisers" fields={['id', 'name', 'contact_email', 'plan_value']} />
              <SchemaTable name="ads" fields={['id', 'advertiser_id', 'asset_url', 'priority', 'target_venues']} />
              <SchemaTable name="impressions" fields={['id', 'ad_id', 'screen_id', 'viewed_at', 'duration']} />
            </ul>
          </div>
        </div>

        {/* Technical Requirements Spec Sheet */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#0F1C2E] p-4">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Tv className="h-5 w-5 text-[#006CFF]" />
              Especificações Técnicas do Player TV (MVP)
            </h3>
          </div>
          <div className="grid md:grid-cols-4 gap-px bg-gray-200">
             {[
               { label: "Playback", value: "Autoplay & Loop Infinito", desc: "Sem interação do usuário" },
               { label: "Atualização", value: "Polling (60s)", desc: "Verifica novas playlists" },
               { label: "Resiliência", value: "Offline Fallback", desc: "Cache local (Service Worker)" },
               { label: "Layout", value: "Fullscreen PWA", desc: "16:9 adaptativo" },
               { label: "Transições", value: "Fade Cross-dissolve", desc: "300ms entre slides" },
               { label: "Formatos", value: "JPG, PNG, MP4", desc: "Vídeos máx 15s" },
               { label: "Interatividade", value: "QR Code Estático", desc: "Overlay fixo ou L-Bar" },
               { label: "Live Mode", value: "YouTube / HDMI", desc: "Safe-zone container" },
             ].map((spec, i) => (
               <div key={i} className="bg-white p-4 flex flex-col justify-center">
                 <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{spec.label}</span>
                 <span className="font-bold text-[#0F1C2E]">{spec.value}</span>
                 <span className="text-xs text-gray-500 mt-1">{spec.desc}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

function SchemaTable({ name, fields }: { name: string, fields: string[] }) {
  return (
    <li className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 font-mono text-sm font-bold text-blue-600 border-b border-gray-100">
        {name}
      </div>
      <div className="p-3 bg-white text-xs text-gray-600 font-mono space-y-1">
        {fields.map(f => (
          <div key={f} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gray-200"></span>
            {f}
          </div>
        ))}
      </div>
    </li>
  )
}
