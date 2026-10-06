import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Workspace from "./pages/Workspace";
import Pricing from "./pages/Pricing";
import Features from "./pages/Features";
import Pipelines from "./pages/Pipelines";
import Donations from "./pages/Donations";
import Callback from "./pages/Callback";
import Gallery from "./pages/Gallery";
import SharedView from "./pages/SharedView";
import Admin from "./pages/Admin";
import ApiKeys from "./pages/ApiKeys";
import NotFound from "./pages/NotFound";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/providers/AuthProvider";
import V2Router from "./features/v2/routing/V2Router";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Navbar />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/workspace" element={<Workspace />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pipelines" element={<Pipelines />} />
            <Route path="/donate" element={<Donations />} />
            <Route path="/callback" element={<Callback />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/s/:token" element={<SharedView />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/keys" element={<ApiKeys />} />
            <Route path="/v2/*" element={<V2Router />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
