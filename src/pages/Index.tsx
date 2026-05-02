import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import ClerkAuth from "@/components/ClerkAuth";
import {
  Eye, ScanSearch, FileText, GitCompare, Sparkles, Eraser, Palette, Wand2, Zap, Cpu,
  Scissors, Droplet, MessageSquareQuote, Crop, Boxes,
} from "lucide-react";

type Service = {
  icon: React.ElementType;
  title: string;
  desc: string;
  badge?: string;
};

const groups: { title: string; subtitle: string; services: Service[] }[] = [
  {
    title: "AI Vision",
    subtitle: "Cloud microservices powered by Lovable AI Gateway (Gemini)",
    services: [
      { icon: Eye, title: "Analyze", desc: "Detailed AI description of any image", badge: "AI" },
      { icon: ScanSearch, title: "Detect Objects", desc: "Identify and label objects in scenes", badge: "AI" },
      { icon: FileText, title: "Extract Text", desc: "OCR for photos, screenshots, receipts", badge: "AI" },
      { icon: GitCompare, title: "Compare", desc: "Side-by-side AI comparison of two images", badge: "AI" },
      { icon: MessageSquareQuote, title: "Image → Prompt", desc: "Reverse-engineer a generation prompt", badge: "AI" },
    ],
  },
  {
    title: "AI Generation",
    subtitle: "Create and transform with generative image models",
    services: [
      { icon: Sparkles, title: "Enhance", desc: "Upscale and sharpen low-quality images", badge: "AI" },
      { icon: Eraser, title: "Inpaint / Repair", desc: "Fill in missing or damaged areas", badge: "AI" },
      { icon: Palette, title: "Style Transfer", desc: "Restyle images in any artistic style", badge: "AI" },
      { icon: Wand2, title: "Generate", desc: "Create new images from text prompts", badge: "AI" },
    ],
  },
  {
    title: "Local Processing",
    subtitle: "Runs in your browser — instant, private, offline-capable",
    services: [
      { icon: Scissors, title: "Background Remover", desc: "RMBG-1.4 via Transformers.js", badge: "WebGPU" },
      { icon: Droplet, title: "Color Palette", desc: "Extract dominant colors instantly", badge: "Local" },
      { icon: Zap, title: "WASM FX", desc: "11 effects via Photon WebAssembly", badge: "WASM" },
      { icon: Cpu, title: "ONNX Inference", desc: "MobileNet v2 image classification", badge: "ONNX" },
    ],
  },
  {
    title: "Image Tools",
    subtitle: "Quick edits without leaving the browser",
    services: [
      { icon: Crop, title: "Editor", desc: "Resize, rotate, convert format & quality", badge: "Local" },
    ],
  },
];

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container flex h-16 items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">AI Image Toolkit</h2>
          <div className="flex items-center gap-3">
            <ClerkAuth />
            <Button onClick={() => navigate("/workspace")} size="sm">
              Open Workspace
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="container py-20 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted/30 px-3 py-1 text-xs text-muted-foreground mb-6">
            <Boxes className="h-3.5 w-3.5" />
            14 microservices · cloud + local
          </div>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            All-in-one AI image microservices
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            A modular toolkit of independent services — analyze, enhance, generate, and transform images
            using AI in the cloud and WebAssembly in your browser.
          </p>
          <div className="flex justify-center gap-3 mt-8">
            <Button size="lg" onClick={() => navigate("/workspace")}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById("services")?.scrollIntoView({ behavior: "smooth" });
            }}>
              Browse Services
            </Button>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="container pb-24 space-y-12">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="mb-5">
                <h2 className="text-2xl font-semibold tracking-tight">{g.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{g.subtitle}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {g.services.map((s) => (
                  <Card
                    key={s.title}
                    className="group cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5"
                    onClick={() => navigate("/workspace")}
                  >
                    <CardContent className="flex flex-col items-start gap-3 p-6">
                      <div className="flex w-full items-start justify-between">
                        <div className="rounded-md bg-muted/60 p-2 group-hover:bg-muted transition-colors">
                          <s.icon className="h-5 w-5" />
                        </div>
                        {s.badge && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground border rounded px-1.5 py-0.5">
                            {s.badge}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="text-sm text-muted-foreground">{s.desc}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Index;
