import { useCallback, useState } from 'react';
import { useDocuments, useUploadDocuments, useDeleteDocument } from '@/hooks/use-documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import type { DocumentResponse } from '@/types/api';

function statusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'default' as const;
    case 'processing':
      return 'secondary' as const;
    case 'failed':
      return 'destructive' as const;
    default:
      return 'outline' as const;
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsPage() {
  const { data: documents, isLoading, error } = useDocuments();
  const upload = useUploadDocuments();
  const deleteMut = useDeleteDocument();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      upload.mutate(Array.from(files));
    },
    [upload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMut.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Documents</h2>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">
          Drag and drop files here, or{' '}
          <label className="cursor-pointer text-primary hover:underline">
            browse
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.doc,.md,.txt"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, DOCX, MD, TXT — resumes, project descriptions, accomplishments
        </p>
        {upload.isPending && (
          <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
        )}
        {upload.isError && (
          <p className="mt-2 text-sm text-destructive">
            Upload failed: {(upload.error as Error).message}
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load documents. Try refreshing.</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {/* Empty state */}
      {documents && documents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">No documents yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your resumes, project descriptions, and accomplishment summaries to get
              started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Document list */}
      {documents && documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div
                  className="flex cursor-pointer items-center gap-3"
                  onClick={() =>
                    setExpandedId(expandedId === doc.id ? null : doc.id)
                  }
                >
                  {expandedId === doc.id ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm font-medium">
                    {doc.filename}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(doc.file_size)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </span>
                  <Badge variant={statusColor(doc.status)}>{doc.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(doc);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {expandedId === doc.id && (
                  <div className="mt-4 border-t pt-4">
                    {doc.error_message && (
                      <p className="mb-2 text-sm text-destructive">{doc.error_message}</p>
                    )}
                    {doc.parsed_text ? (
                      <ScrollArea className="h-64 rounded-md border p-4">
                        <pre className="whitespace-pre-wrap text-xs">{doc.parsed_text}</pre>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {doc.status === 'processing'
                          ? 'Still processing...'
                          : 'No parsed text available.'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.filename}&quot; and its parsed
              content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
