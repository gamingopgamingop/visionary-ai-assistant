import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Wand2, Crop, FileImage, Shield, Layers } from "lucide-react";

const GROUPS = [
  { icon: Wand2, name: "AI", desc: "Generate, segment, classify, colorize, upscale, depth, captioning.", count: 12 },
  { icon: Crop, name: "Editing", desc: "Crop, rotate, adjust, filters, text overlay, draw, redact.", count: 9 },
  { icon: FileImage, name: "Conversion", desc: "Convert formats, compress to size, strip metadata.", count: 4 },
  { icon: Layers, name: "Specialized", desc: "Stitch, diff, histogram, perceptual hash fingerprint.", count: 5 },
  { icon: Shield, name: "Security", desc: "Redact, fingerprint, NSFW detection, metadata cleaning.", count: 4 },
  { icon: Sparkles, name: "Analysis", desc: "OCR, palette, faces, similarity, properties.", count: 6 },
];

export default function Features() {
  return (
    <main className="container py-16">
      <section className="max-w-2xl mx-auto text-center">
        <h1 className="text-4xl font-bold tracking-tight">Everything you need to work with images</h1>
        <p className="mt-3 text-muted-foreground">
          One workspace for AI generation, classic editing, format conversion, analysis, and privacy tools.
        </p>
      </section>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mt-12 max-w-5xl mx-auto">
        {GROUPS.map((g) => (
          <Card key={g.name}>
            <CardHeader>
              <g.icon className="h-6 w-6 text-primary" />
              <CardTitle className="mt-2">{g.name}</CardTitle>
              <CardDescription>{g.count}+ tools</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">{g.desc}</p>
              <Link to="/workspace" className="text-sm text-primary hover:underline">Try it →</Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </main>
  );
}
