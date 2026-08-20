import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ExcelFileProvider } from "@/contexts/ExcelFileContext";
import { AdminAuthProvider } from "@/contexts/AdminAuthContext";
import { ManualEditProvider } from "@/contexts/ManualEditContext";
import { ManualEditDialog } from "@/components/ManualEditDialog";
import Index from "./pages/Index";
import Misc from "./pages/Misc";
import Goshi from "./pages/Goshi";
import Invoice from "./pages/Invoice";
import MarketRates from "./pages/MarketRates";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AdminAuthProvider>
        <ExcelFileProvider>
          <ManualEditProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/misc" element={<Misc />} />
                <Route path="/goshi" element={<Goshi />} />
                <Route path="/invoice" element={<Invoice />} />
                <Route path="/market-rates" element={<MarketRates />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            <ManualEditDialog />
          </ManualEditProvider>
        </ExcelFileProvider>
      </AdminAuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
