import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Crop } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Source image (object URL or data URL) to crop. */
  imageSrc: string;
  /** Target aspect ratio (width / height). */
  aspect: number;
  /** Friendly label of the slot being replaced. */
  label?: string;
  /** Called with the cropped image as a Blob when the user confirms. */
  onCropped: (blob: Blob) => void | Promise<void>;
  isSaving?: boolean;
}

/** Produce a cropped JPEG/PNG Blob from a source image and pixel crop area. */
async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(area.width);
  canvas.height = Math.round(area.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.drawImage(
    image,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height,
  );

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))),
      "image/jpeg",
      0.92,
    );
  });
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageSrc,
  aspect,
  label,
  onCropped,
  isSaving,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPixels, setAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setAreaPixels(areaPx);
  }, []);

  const handleConfirm = async () => {
    if (!areaPixels) return;
    const blob = await getCroppedBlob(imageSrc, areaPixels);
    await onCropped(blob);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Crop className="h-5 w-5 text-primary" />
            Crop image{label ? ` — ${label}` : ""}
          </DialogTitle>
          <DialogDescription>
            Drag to reposition and zoom to frame the image. The crop matches this slot's aspect ratio.
          </DialogDescription>
        </DialogHeader>

        <div className="relative h-[360px] bg-muted/40">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            restrictPosition
          />
        </div>

        <div className="px-6 py-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Zoom</Label>
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
          />
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !areaPixels}
            className="bg-gradient-primary hover:brightness-110 gap-2"
          >
            <Crop className="h-4 w-4" />
            {isSaving ? "Saving…" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
