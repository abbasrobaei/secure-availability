import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import SignaturePadLib from "signature_pad";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSignatureChange?: (isEmpty: boolean) => void;
}

export interface SignaturePadRef {
  isEmpty: () => boolean;
  toDataURL: () => string;
  clear: () => void;
}

export const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ onSignatureChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const signaturePadRef = useRef<SignaturePadLib | null>(null);

    useEffect(() => {
      if (canvasRef.current) {
        signaturePadRef.current = new SignaturePadLib(canvasRef.current, {
          backgroundColor: "rgb(255, 255, 255)",
          penColor: "rgb(0, 0, 0)",
        });

        signaturePadRef.current.addEventListener("endStroke", () => {
          onSignatureChange?.(signaturePadRef.current?.isEmpty() ?? true);
        });

        // Resize canvas
        const resizeCanvas = () => {
          const canvas = canvasRef.current;
          if (canvas && signaturePadRef.current) {
            const ratio = Math.max(window.devicePixelRatio || 1, 1);
            canvas.width = canvas.offsetWidth * ratio;
            canvas.height = canvas.offsetHeight * ratio;
            canvas.getContext("2d")?.scale(ratio, ratio);
            signaturePadRef.current.clear();
          }
        };

        resizeCanvas();
        window.addEventListener("resize", resizeCanvas);

        return () => {
          window.removeEventListener("resize", resizeCanvas);
          signaturePadRef.current?.off();
        };
      }
    }, [onSignatureChange]);

    useImperativeHandle(ref, () => ({
      isEmpty: () => signaturePadRef.current?.isEmpty() ?? true,
      toDataURL: () => signaturePadRef.current?.toDataURL() ?? "",
      clear: () => {
        signaturePadRef.current?.clear();
        onSignatureChange?.(true);
      },
    }));

    return (
      <div className="space-y-2">
        <div className="border-2 border-dashed border-border rounded-lg p-2 bg-white">
          <canvas
            ref={canvasRef}
            className="w-full h-32 touch-none cursor-crosshair"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            signaturePadRef.current?.clear();
            onSignatureChange?.(true);
          }}
        >
          <Eraser className="w-4 h-4 mr-2" />
          Unterschrift löschen
        </Button>
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
