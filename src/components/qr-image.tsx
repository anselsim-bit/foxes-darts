import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** QR code shown as a real image (right-click/long-press to copy) with download and copy buttons. */
export function QrImage({ value, fileName, label }: { value: string; fileName: string; label: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    const canvas = holder.current?.querySelector("canvas");
    if (canvas) setSrc(canvas.toDataURL("image/png"));
  }, [value]);
  const copy = async () => {
    const canvas = holder.current?.querySelector("canvas");
    if (!canvas) return;
    try {
      const blob = await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error())), "image/png"));
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      toast.success("QR code copié.");
    } catch {
      toast.error("Copie impossible : utilisez « Télécharger ».");
    }
  };
  return (
    <div className="flex flex-col items-start gap-2">
      <div ref={holder} className="hidden">
        <QRCodeCanvas value={value} size={600} marginSize={4} bgColor="#ffffff" fgColor="#000000" />
      </div>
      {src && <img src={src} alt={label} className="h-40 w-40 rounded-lg bg-white" />}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" asChild>
          <a href={src ?? undefined} download={fileName}><Download className="h-4 w-4" /> Télécharger</a>
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={copy}><Copy className="h-4 w-4" /> Copier l'image</Button>
      </div>
    </div>
  );
}
