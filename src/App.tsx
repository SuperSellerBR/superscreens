import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "./utils/supabase/client";
import Dashboard from "./pages/Dashboard";
import ContentManager from "./pages/ContentManager";
import PlaylistBuilder from "./pages/PlaylistBuilder";
import AdvertisersPage from "./pages/admin/Advertisers"; // Updated import to new file
import UsersPage from "./pages/admin/Users";
import TVPlayer from "./pages/TVPlayer";
import TestPlayer from "./pages/TestPlayer";
import RequestRemote from "./pages/RequestRemote";
import BackendArchitecture from "./pages/BackendArchitecture";
import Settings from "./pages/Settings";
import About from "./pages/About";
import Login from "./pages/Login";
import { Toaster } from "./components/ui/sonner";
import { TooltipProvider } from "./components/ui/tooltip";
import RemoteControl from "./pages/admin/RemoteControl";
import AdDistributionPage from "./pages/admin/AdDistribution";
import MyAdvertisers from "./pages/client/MyAdvertisers"; // New page
import ClientHome from "./pages/client/ClientHome";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import { SEO } from "./components/SEO";

function RootRedirect() {
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState("/login");

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error("Supabase session error:", error);
          setTarget("/login");
          return;
        }

        if (!session) {
          setTarget("/login");
        } else {
          const role = session.user.user_metadata?.role;
          if (role === 'client') {
            setTarget("/client/home");
          } else if (role === 'admin') {
            setTarget("/admin/dashboard");
          } else {
            setTarget("/admin/playlist");
          }
        }
      } catch (err) {
        console.error("Unexpected error during session check:", err);
        setTarget("/login");
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
  return <Navigate to={target} replace />;
}

import { ThemeProvider } from "./components/theme-provider";

export default function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
    <TooltipProvider>
      <SEO />
      <Router>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/admin/remote" element={
            <ProtectedRoute>
              <RemoteControl />
            </ProtectedRoute>
          } />
          <Route path="/admin/content" element={
            <ProtectedRoute>
              <ContentManager />
            </ProtectedRoute>
          } />
          <Route path="/admin/playlist" element={
            <ProtectedRoute>
              <PlaylistBuilder />
            </ProtectedRoute>
          } />
          
          {/* Restricted Admin-Only Routes */}
          <Route path="/admin/users" element={
            <AdminRoute>
              <UsersPage />
            </AdminRoute>
          } />
          <Route path="/admin/advertisers" element={
            <ProtectedRoute>
              <AdvertisersPage /> 
            </ProtectedRoute>
          } />
          <Route path="/admin/advertise" element={
            <AdminRoute>
              <AdDistributionPage />
            </AdminRoute>
          } />
          <Route path="/admin/reports" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/admin/architecture" element={
            <AdminRoute>
              <BackendArchitecture />
            </AdminRoute>
          } />
          <Route path="/admin/about" element={
            <ProtectedRoute>
              <About />
            </ProtectedRoute>
          } />

          {/* Client Routes */}
          <Route path="/client/home" element={
            <ProtectedRoute>
               <ClientHome />
            </ProtectedRoute>
          } />
          <Route path="/admin/my-advertisers" element={
            <ProtectedRoute>
               <MyAdvertisers />
            </ProtectedRoute>
          } />

          {/* Settings is available to all, but has internal restriction logic */}
          <Route path="/admin/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />

          {/* Player Route - Generally public, but could be protected if needed. Leaving public for now as they are displays. */}
          <Route path="/player" element={<TVPlayer />} />
          <Route path="/test" element={<TestPlayer />} />
          <Route path="/remote" element={<RequestRemote />} />
        </Routes>
        </Router>
      <Toaster />
    </TooltipProvider>
    </ThemeProvider>
  );
}