import { useCallback, useEffect, useState } from "react";
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
import { Crop, AlertTriangle, RefreshCcw } from "lucide-react";

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
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  const onCropComplete = useCallback((_: Area, areaPx: Area) => {
    setAreaPixels(areaPx);
  }, []);

  // Probe whether the source image can actually be loaded for cropping.
  useEffect(() => {
    if (!open || !imageSrc) return;
    setImageError(false);
    setError(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onerror = () => setImageError(true);
    img.src = imageSrc;
    return () => {
      img.onerror = null;
    };
  }, [open, imageSrc]);

  const handleConfirm = async () => {
    if (!areaPixels) return;
    setError(null);
    let blob: Blob;
    try {
      blob = await getCroppedBlob(imageSrc, areaPixels);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Couldn't crop this image: ${err.message}. Try a different image or reduce the zoom.`
          : "Couldn't crop this image. The file may be corrupt or blocked by CORS — try a different image.",
      );
      return;
    }
    try {
      await onCropped(blob);
    } catch (err) {
      setError(
        err instanceof Error
          ? `Upload failed: ${err.message}`
          : "Upload failed. Check your connection and try again.",
      );
    }
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
          {imageError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <p className="text-sm text-muted-foreground max-w-sm">
                This image couldn't be loaded for cropping. It may be blocked by the
                source server (CORS) or no longer available. Try downloading it and
                uploading the file directly.
              </p>
            </div>
          ) : (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={aspect}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              onMediaLoaded={() => setImageError(false)}
              restrictPosition
            />
          )}
        </div>

        <div className="px-6 py-4 space-y-2">
          <Label className="text-xs text-muted-foreground">Zoom</Label>
          <Slider
            min={1}
            max={3}
            step={0.01}
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            disabled={imageError}
          />
        </div>

        {error && (
          <div className="mx-6 mb-2 flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 flex-none mt-0.5" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSaving || !areaPixels || imageError}
            className="bg-gradient-primary hover:brightness-110 gap-2"
          >
            {error ? <RefreshCcw className="h-4 w-4" /> : <Crop className="h-4 w-4" />}
            {isSaving ? "Saving…" : error ? "Retry" : "Apply crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
