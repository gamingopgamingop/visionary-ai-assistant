import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ImageUploader from "@/components/ImageUploader";
import ResultDisplay from "@/components/ResultDisplay";
import {
  Eye, ScanSearch, FileText, GitCompare, Sparkles, Eraser, Palette, Wand2,
} from "lucide-react";

type TabId = "analyze" | "detect" | "ocr" | "compare" | "enhance" | "inpaint" | "style" | "generate";

const tabs: { id: TabId; label: string; icon: React.ElementType; needsImage: boolean; needsSecondImage?: boolean; needsPrompt?: boolean }[] = [
  { id: "analyze", label: "Analyze", icon: Eye, needsImage: true },
  { id: "detect", label: "Detect", icon: ScanSearch, needsImage: true },
  { id: "ocr", label: "OCR", icon: FileText, needsImage: true },
  { id: "compare", label: "Compare", icon: GitCompare, needsImage: true, needsSecondImage: true },
  { id: "enhance", label: "Enhance", icon: Sparkles, needsImage: true },
  { id: "inpaint", label: "Inpaint", icon: Eraser, needsImage: true, needsPrompt: true },
  { id: "style", label: "Style", icon: Palette, needsImage: true, needsPrompt: true },
  { id: "generate", label: "Generate", icon: Wand2, needsImage: false, needsPrompt: true },
];

const Workspace = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("analyze");
  const [image1, setImage1] = useState<string | null>(null);
  const [image2, setImage2] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ type: "text" | "image"; content: string } | null>(null);

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageDrop = useCallback(
    async (file: File, slot: 1 | 2) => {
      const base64 = await fileToBase64(file);
      if (slot === 1) setImage1(base64);
      else setImage2(base64);
    },
    [],
  );

  const handleProcess = async () => {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, string> = { action: activeTab };
      if (image1) body.image1 = image1;
      if (image2) body.image2 = image2;
      if (prompt) body.prompt = prompt;

      const { data, error } = await supabase.functions.invoke("image-ai", { body });
      if (error) throw error;

      if (data.resultImage) {
        setResult({ type: "image", content: data.resultImage });
      } else {
        setResult({ type: "text", content: data.resultText });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setImage1(null);
    setImage2(null);
    setPrompt("");
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b">
        <div className="container flex h-14 items-center gap-4">
          <button onClick={() => navigate("/")} className="text-sm font-semibold tracking-tight hover:opacity-70">
            AI Image Toolkit
          </button>
        </div>
      </header>

      <div className="container flex-1 py-6">
        <Tabs
          value={activeTab}
          onValueChange={(v) => {
            setActiveTab(v as TabId);
            resetState();
          }}
        >
          <TabsList className="mb-6 flex flex-wrap h-auto gap-1">
            {tabs.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="gap-1.5">
                <t.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map((t) => (
            <TabsContent key={t.id} value={t.id}>
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Input side */}
                <div className="space-y-4">
                  {t.needsImage && (
                    <ImageUploader
                      label={t.needsSecondImage ? "Image 1" : "Upload Image"}
                      image={image1}
                      onDrop={(f) => handleImageDrop(f, 1)}
                      onClear={() => setImage1(null)}
                    />
                  )}
                  {t.needsSecondImage && (
                    <ImageUploader
                      label="Image 2"
                      image={image2}
                      onDrop={(f) => handleImageDrop(f, 2)}
                      onClear={() => setImage2(null)}
                    />
                  )}
                  {t.needsPrompt && (
                    <Textarea
                      placeholder={
                        t.id === "generate"
                          ? "Describe the image you want to generate…"
                          : t.id === "style"
                            ? 'Describe the style, e.g. "oil painting", "anime"…'
                            : "Describe what to fix or fill in…"
                      }
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      rows={3}
                    />
                  )}

                  <Button
                    onClick={handleProcess}
                    disabled={
                      loading ||
                      (t.needsImage && !image1) ||
                      (t.needsSecondImage && !image2) ||
                      (t.needsPrompt && !t.needsImage && !prompt)
                    }
                    className="w-full"
                  >
                    {loading ? "Processing…" : `Run ${t.label}`}
                  </Button>

                  {loading && <Progress value={undefined} className="h-1.5 animate-pulse" />}
                </div>

                {/* Result side */}
                <ResultDisplay result={result} loading={loading} />
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
};

export default Workspace;
