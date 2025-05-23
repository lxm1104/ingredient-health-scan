import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import NavigationBar from "./components/NavigationBar";
import ScanPage from "./pages/ScanPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import ProductDetailPage from "./pages/ProductDetailPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <div className="min-h-screen bg-gradient-to-br from-app-green-light to-white">
          <NavigationBar />
          <main className="pt-16">
            <Routes>
              <Route path="/" element={<Navigate to="/scan" replace />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/recommendations" element={<RecommendationsPage />} />
              <Route path="/product/:id" element={<ProductDetailPage />} />
              <Route path="/ingredients" element={<Navigate to="/scan" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
