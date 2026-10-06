import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { galleryApi, type GalleryItem } from "@/lib/gallery-api";

export default function SharedView() {
  const { token = "" } = useParams();
  const [item, setItem] = useState<GalleryItem | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    galleryApi.resolveShare(token).then((r) => setItem(r.item)).catch((e) => setErr(e.message));
  }, [token]);

  if (err) return (
    <main className="container py-24 text-center space-y-4">
      <h1 className="text-2xl font-semibold">This link isn't available</h1>
      <p className="text-muted-foreground">{err}</p>
      <Button asChild variant="outline"><Link to="/gallery">Browse the public gallery</Link></Button>
    </main>
  );
  if (!item) return <main className="container py-24 text-center text-muted-foreground">Loading…</main>;

  return (
    <main className="container py-10 max-w-4xl space-y-4">
      {item.url && <img src={item.url} alt={item.title} className="w-full rounded-lg border bg-muted" />}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{item.title}</h1>
          {item.description && <p className="text-muted-foreground mt-1">{item.description}</p>}
        </div>
        {item.url && <Button asChild><a href={item.url} download={item.title}>Download</a></Button>}
      </div>
    </main>
  );
}
