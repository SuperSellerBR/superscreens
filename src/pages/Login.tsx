import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardFooter } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { supabase } from "../utils/supabase/client";
import { toast } from "sonner@2.0.3";
import { Loader2 } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        toast.success("Login realizado com sucesso!");
        
        // Redirect based on Role
        const role = data.session.user.user_metadata?.role;
        if (role === 'admin') {
           navigate('/admin/dashboard');
        } else if (role === 'client') {
           navigate('/client/home');
        } else {
           // Advertiser or others go directly to playlist
           navigate('/admin/playlist');
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(error.message || "Erro ao realizar login");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0F1C2E] p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold text-[#006CFF]">Super<span className="text-white">Screens</span></h1>
        <p className="text-gray-400 mt-2">Transforme suas TVs em canais de comunicação.</p>
      </div>
      
      <Card className="w-full max-w-md bg-white border-none shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Acesse sua conta</h2>
          <p className="text-sm text-gray-500">Entre com seu e-mail e senha para gerenciar suas telas</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="seu@email.com" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                <button type="button" onClick={() => toast.info("Funcionalidade em desenvolvimento")} className="text-xs text-[#006CFF] hover:underline bg-transparent border-none p-0">Esqueceu a senha?</button>
              </div>
              <Input  
                id="password" 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" className="w-full bg-[#006CFF] hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center text-sm text-gray-500">
          <div>
            Não tem uma conta? <button type="button" onClick={() => toast.info("Entre em contato com o suporte")} className="text-[#006CFF] hover:underline bg-transparent border-none p-0">Entre em contato</button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
