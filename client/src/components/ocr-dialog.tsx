import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, ScanText } from "lucide-react";
import { extractTextFromImage, type OCRProgress } from "@/lib/ocr";

interface OCRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  imageName?: string;
}

export function OCRDialog({ open, onOpenChange, imageUrl, imageName }: OCRDialogProps) {
  const [extractedText, setExtractedText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<OCRProgress | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const activeRequestRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      activeRequestRef.current = null;
      setExtractedText("");
      setIsProcessing(false);
      setProgress(null);
      setCopied(false);
    }
  }, [open]);

  useEffect(() => {
    activeRequestRef.current = null;
    setExtractedText("");
    setIsProcessing(false);
    setProgress(null);
    setCopied(false);
  }, [imageUrl]);

  const handleExtractText = async () => {
    const requestId = imageUrl;
    activeRequestRef.current = requestId;
    
    setIsProcessing(true);
    setExtractedText("");
    setProgress(null);

    try {
      const text = await extractTextFromImage(imageUrl, (prog) => {
        if (activeRequestRef.current === requestId) {
          setProgress(prog);
        }
      });

      if (activeRequestRef.current !== requestId) {
        return;
      }

      setExtractedText(text);

      if (!text || text.length === 0) {
        toast({
          title: "No text found",
          description: "No readable text was detected in this image.",
        });
      } else {
        toast({
          title: "Text extracted successfully",
          description: `Extracted ${text.length} characters from the image.`,
        });
      }
    } catch (error) {
      if (activeRequestRef.current !== requestId) {
        return;
      }
      
      toast({
        title: "Extraction failed",
        description: "Failed to extract text from the image. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (activeRequestRef.current === requestId) {
        setIsProcessing(false);
        setProgress(null);
      }
    }
  };

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(extractedText);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The extracted text has been copied to your clipboard.",
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Failed to copy text to clipboard.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanText className="h-5 w-5" />
            Extract Text from Image
          </DialogTitle>
          <DialogDescription>
            {imageName || "Use OCR to extract text from this image"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <img
              src={imageUrl}
              alt="OCR source"
              className="w-32 h-32 object-cover rounded-md border"
            />
            <div className="flex-1">
              {!extractedText && !isProcessing && (
                <Button
                  onClick={handleExtractText}
                  className="w-full"
                  data-testid="button-extract-text"
                >
                  <ScanText className="h-4 w-4 mr-2" />
                  Extract Text
                </Button>
              )}
              {isProcessing && progress && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {progress.status}...
                  </p>
                  <Progress value={progress.progress * 100} />
                </div>
              )}
            </div>
          </div>

          {extractedText && (
            <div className="flex-1 flex flex-col gap-2 min-h-0">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Extracted Text</label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyToClipboard}
                  data-testid="button-copy-text"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
              <Textarea
                value={extractedText}
                onChange={(e) => setExtractedText(e.target.value)}
                className="flex-1 min-h-[200px] font-mono text-sm"
                placeholder="Extracted text will appear here..."
                data-testid="textarea-extracted-text"
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-close-ocr"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
