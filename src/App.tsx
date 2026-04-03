import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Lancamentos from "@/pages/Lancamentos";
import FluxoCaixa from "@/pages/FluxoCaixa";
import MaoDeObra from "@/pages/MaoDeObra";
import Conciliacao from "@/pages/Conciliacao";
import Documentos from "@/pages/Documentos";
import Relatorio from "@/pages/Relatorio";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/fluxo-caixa" element={<FluxoCaixa />} />
            <Route path="/mao-de-obra" element={<MaoDeObra />} />
            <Route path="/conciliacao" element={<Conciliacao />} />
            <Route path="/documentos" element={<Documentos />} />
            <Route path="/relatorio" element={<Relatorio />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
