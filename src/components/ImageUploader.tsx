import { useCallback, useRef } from "react";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  label: string;
  image: string | null;
  onDrop: (file: File) => void;
  onClear: () => void;
}

const ImageUploader = ({ label, image, onDrop, onClear }: Props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDropEvent = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files?.[0];
      if (file?.type.startsWith("image/")) onDrop(file);
    },
    [onDrop],
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onDrop(file);
    },
    [onDrop],
  );

  if (image) {
    return (
      <div className="relative rounded-lg border overflow-hidden">
        <img src={image} alt="Uploaded" className="w-full object-contain max-h-80" />
        <Button
          variant="destructive"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-10 text-muted-foreground cursor-pointer hover:border-primary/40 transition-colors"
      onDragOver={handleDragOver}
      onDrop={handleDropEvent}
      onClick={() => inputRef.current?.click()}
    >
      <Upload className="h-8 w-8" />
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs">Drag & drop or click to browse</p>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
    </div>
  );
};

export default ImageUploader;
