import React from "react";
import { AdminLayout } from "../components/layout/AdminLayout";
import { motion } from "motion/react";
import { 
  Tv, 
  Smartphone, 
  Zap, 
  ShieldCheck, 
  Layers, 
  WifiOff, 
  Activity,
  MonitorPlay,
  DollarSign,
  Clock,
  Smile,
  Cpu
} from "lucide-react";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

export default function About() {
  const technicalFeatures = [
    {
      icon: <Zap className="w-8 h-8 text-yellow-400" />,
      title: "Sincronização em Tempo Real",
      description: "Mudanças instantâneas em todas as telas. Graças ao Supabase Presence, o que você altera no painel reflete em milissegundos no player."
    },
    {
      icon: <Smartphone className="w-8 h-8 text-blue-400" />,
      title: "Controle Remoto PWA",
      description: "Gerencie suas telas na palma da mão. Um controle remoto mobile-first que permite pausar, pular e reorganizar o conteúdo de qualquer lugar."
    },
    {
      icon: <ShieldCheck className="w-8 h-8 text-green-400" />,
      title: "Watchdog Inteligente",
      description: "Sistema de auto-recuperação integrado. Se o player travar ou perder conexão, o Watchdog detecta e reinicia o sistema automaticamente."
    },
    {
      icon: <Layers className="w-8 h-8 text-purple-400" />,
      title: "Múltiplos Layouts",
      description: "Suporte nativo para L-Bar, Fullscreen e layouts verticais. Adapte seu conteúdo para diferentes formatos de tela sem esforço."
    },
    {
      icon: <WifiOff className="w-8 h-8 text-red-400" />,
      title: "Resiliência Offline",
      description: "Arquitetura PWA robusta que mantém suas mídias rodando mesmo se a internet cair, sincronizando assim que a conexão retornar."
    },
    {
      icon: <Activity className="w-8 h-8 text-pink-400" />,
      title: "Monitoramento Ativo",
      description: "Acompanhe o status de saúde de cada dispositivo (Heartbeat), sabendo exatamente quais telas estão online ou offline."
    }
  ];

  const businessFeatures = [
    {
      icon: <Smartphone className="w-8 h-8 text-blue-500" />,
      title: "Controle na Palma da Mão",
      description: "Mudou o preço? Quer trocar a oferta? Faça tudo pelo celular em segundos, sem precisar subir em escadas para mexer na TV."
    },
    {
      icon: <DollarSign className="w-8 h-8 text-green-500" />,
      title: "Venda Mais",
      description: "Aproveite o tempo de espera do seu cliente. Mostre promoções e novidades na tela enquanto ele aguarda na fila ou na mesa."
    },
    {
      icon: <Clock className="w-8 h-8 text-purple-500" />,
      title: "Adeus Pen-drive",
      description: "Esqueça a troca manual de arquivos. Seu conteúdo é atualizado via internet, de forma automática e organizada."
    },
    {
      icon: <Layers className="w-8 h-8 text-orange-500" />,
      title: "TV Dividida Inteligente",
      description: "Passe o futebol ou notícias em uma parte da tela, e suas propagandas na outra. Entretenimento e vendas no mesmo lugar."
    },
    {
      icon: <Smile className="w-8 h-8 text-yellow-500" />,
      title: "Sem Tela Preta",
      description: "Nosso sistema é robusto. Se a internet cair, seus vídeos continuam rodando normalmente. Você nem vai perceber."
    },
    {
      icon: <Activity className="w-8 h-8 text-red-500" />,
      title: "Gestão Tranquila",
      description: "Saiba exatamente quais TVs estão ligadas e o que está passando nelas, de onde você estiver."
    }
  ];

  return (
    <AdminLayout>
      <div className="min-h-full pb-10">
        <Tabs defaultValue="business" className="w-full">
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
             <div className="text-left">
                <h1 className="text-3xl font-bold text-[#0F1C2E]">Sobre o SuperScreens</h1>
                <p className="text-gray-500">Conheça a plataforma de sinalização digital mais moderna do mercado.</p>
             </div>
             <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                <TabsTrigger value="business">Visão do Negócio</TabsTrigger>
                <TabsTrigger value="technical">Detalhes Técnicos</TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="business" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* Hero Business */}
             <div className="relative rounded-3xl overflow-hidden shadow-xl bg-gradient-to-br from-blue-600 to-purple-700 text-white">
                <div className="absolute top-0 right-0 p-12 opacity-10">
                   <StoreIcon className="w-64 h-64" />
                </div>
                <div className="relative z-10 px-8 py-16 md:py-24 flex flex-col items-center text-center max-w-4xl mx-auto">
                    <Badge className="mb-4 bg-white/20 hover:bg-white/30 text-white border-none px-4 py-1.5 text-sm uppercase tracking-widest font-bold backdrop-blur-sm">
                      Simples e Eficiente
                    </Badge>
                    <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">
                      Sua TV trabalhando pelo <br/> seu faturamento.
                    </h2>
                    <p className="text-lg md:text-xl text-blue-100 leading-relaxed max-w-2xl mx-auto">
                      Transforme televisores comuns em vitrines digitais poderosas. Atraia a atenção dos clientes e modernize seu estabelecimento com poucos cliques.
                    </p>
                </div>
             </div>

             {/* Business Features Grid */}
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businessFeatures.map((feature, idx) => (
                  <Card key={idx} className="h-full border-gray-100 hover:border-blue-200 hover:shadow-md transition-all bg-white">
                    <CardContent className="p-6">
                      <div className="mb-4 p-3 bg-blue-50/50 rounded-xl w-fit">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                      <p className="text-gray-500 text-sm leading-relaxed">
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
             </div>
             
             {/* Call to Action Concept */}
             <div className="bg-white rounded-2xl p-8 md:p-12 border border-gray-200 flex flex-col md:flex-row items-center gap-8 shadow-sm">
                <div className="flex-1 space-y-4">
                   <h3 className="text-2xl font-bold text-[#0F1C2E]">Por que escolher o SuperScreens?</h3>
                   <p className="text-gray-600 text-lg">
                      Diferente de sistemas antigos que exigem técnicos caros e cabos complexos, nossa solução foi feita para você. 
                      Funciona na TV que você já tem, é fácil de mexer como o WhatsApp e não te deixa na mão.
                   </p>
                </div>
                <div className="shrink-0 bg-blue-50 p-6 rounded-full">
                    <Smile className="w-16 h-16 text-blue-600" />
                </div>
             </div>
          </TabsContent>

          <TabsContent value="technical" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Technical Hero */}
            <div className="relative rounded-3xl overflow-hidden mb-12 border border-blue-900/30 shadow-2xl">
              <div className="absolute inset-0 bg-[#0F1C2E]/90 z-10" />
              <div 
                className="absolute inset-0 bg-cover bg-center z-0 opacity-40 blur-sm"
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1630689491691-b1b5b30b3840?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkaWdpdGFsJTIwc2lnbmFnZSUyMGFic3RyYWN0JTIwbmVvbiUyMHRlY2hub2xvZ3l8ZW58MXx8fHwxNzY2MzQ5NzM2fDA&ixlib=rb-4.1.0&q=80&w=1080')` }}
              />
              
              <div className="relative z-20 px-8 py-16 flex flex-col items-center text-center max-w-4xl mx-auto">
                <Badge className="mb-4 bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 px-4 py-1.5 text-xs uppercase tracking-widest font-mono">
                  Architecture v2.0
                </Badge>
                <h2 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-4 font-mono">
                   &lt;System_Overview /&gt;
                </h2>
                <p className="text-gray-400 text-sm md:text-base font-mono max-w-2xl mx-auto">
                  Stack: React + Tailwind + Supabase Presence (WebSockets) + Edge Functions.
                </p>
              </div>
            </div>

            {/* Technical Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {technicalFeatures.map((feature, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1, duration: 0.5 }}
                  >
                    <Card className="h-full border-blue-900/30 bg-[#0F1C2E] text-gray-300">
                      <CardContent className="p-6">
                        <div className="mb-4 p-3 bg-blue-950/50 rounded-xl w-fit border border-blue-800/30">
                          {feature.icon}
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                        <p className="text-gray-400 text-sm leading-relaxed">
                          {feature.description}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
            </div>

             {/* Backend Link */}
             <div className="flex justify-center mt-8">
                 <p className="text-gray-500 text-sm">
                    Para diagramas de fluxo de dados, consulte a página de <a href="/admin/architecture" className="text-blue-500 hover:underline">Arquitetura de Backend</a>.
                 </p>
             </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function StoreIcon(props: any) {
    return (
        <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
        <path d="M2 7h20" />
        <path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
      </svg>
    )
}
