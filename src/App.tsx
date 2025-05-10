import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import RegimenSetup from "./pages/RegimenSetup";
import DoseLogging from "./pages/DoseLogging";
import Reminders from "./pages/Reminders";
import Reports from "./pages/Reports";
import { GoogleOAuthProvider } from '@react-oauth/google';

const queryClient = new QueryClient();

const App = () => (
  <GoogleOAuthProvider clientId="318153357490-3db4ck752u4a3j4994akj748m6csdequ.apps.googleusercontent.com">
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/regimen" element={<RegimenSetup />} />
              <Route path="/log" element={<DoseLogging />} />
              <Route path="/reminders" element={<Reminders />} />
              <Route path="/reports" element={<Reports />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </GoogleOAuthProvider>
);

export default App;
