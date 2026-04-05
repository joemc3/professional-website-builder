import { useState } from 'react';
import { useCreatePreview } from '@/hooks/use-preview';
import { getPreviewUrl } from '@/services/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Eye } from 'lucide-react';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  theme: string;
  siteType: 'portfolio' | 'targeted';
  jobPostingId?: string;
  onGenerate: () => void;
}

export function PreviewModal({
  open,
  onOpenChange,
  theme,
  siteType,
  jobPostingId,
  onGenerate,
}: PreviewModalProps) {
  const createPreview = useCreatePreview();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    setLoading(true);
    try {
      const result = await createPreview.mutateAsync({
        theme,
        site_type: siteType,
        job_posting_id: jobPostingId,
      });
      setPreviewId(result.preview_id);
    } catch {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPreviewId(null);
    setLoading(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview: {theme} ({siteType})
          </DialogTitle>
        </DialogHeader>

        {!previewId && !loading && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            <p className="text-muted-foreground">
              Preview will render the {theme} theme with your actual profile data.
            </p>
            <Button onClick={handlePreview}>
              <Eye className="mr-2 h-4 w-4" />
              Load Preview
            </Button>
          </div>
        )}

        {loading && !previewId && (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <span className="ml-3 text-muted-foreground">Rendering preview...</span>
          </div>
        )}

        {previewId && (
          <>
            <div className="flex-1 overflow-hidden rounded-md border">
              <iframe
                src={getPreviewUrl(previewId)}
                className="h-full w-full"
                title="Theme preview"
                onLoad={() => setLoading(false)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Back to Themes
              </Button>
              <Button onClick={() => { handleClose(); onGenerate(); }}>
                Generate Site
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
