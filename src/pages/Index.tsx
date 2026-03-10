import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import ClerkAuth from "@/components/ClerkAuth";
import {
  Eye, ScanSearch, FileText, GitCompare, Sparkles, Eraser, Palette, Wand2, Zap, Cpu,
} from "lucide-react";

const features = [
  { icon: Eye, title: "Analyze", desc: "Get a detailed AI description of any image" },
  { icon: ScanSearch, title: "Detect Objects", desc: "Identify and label objects in your image" },
  { icon: FileText, title: "Extract Text", desc: "Pull text from photos and documents (OCR)" },
  { icon: GitCompare, title: "Compare", desc: "Compare two images side-by-side with AI" },
  { icon: Sparkles, title: "Enhance", desc: "Upscale and sharpen low-quality images" },
  { icon: Eraser, title: "Inpaint / Repair", desc: "Fill in missing or damaged parts" },
  { icon: Palette, title: "Style Transfer", desc: "Restyle images in any artistic style" },
  { icon: Wand2, title: "Generate", desc: "Create new images from text descriptions" },
  { icon: Zap, title: "WASM FX", desc: "Instant client-side image effects via WebAssembly" },
  { icon: Cpu, title: "ONNX AI", desc: "Run AI models in-browser with ONNX Runtime WASM" },
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
          <h1 className="mx-auto max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            All-in-one AI-powered image tools
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
            Analyze, enhance, generate, and transform images — powered by AI and WebAssembly.
          </p>
          <Button size="lg" className="mt-8" onClick={() => navigate("/workspace")}>
            Get Started
          </Button>
        </section>

        {/* Feature grid */}
        <section className="container pb-20">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {features.map((f) => (
              <Card
                key={f.title}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => navigate("/workspace")}
              >
                <CardContent className="flex flex-col items-start gap-2 p-6">
                  <f.icon className="h-6 w-6 text-muted-foreground" />
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
