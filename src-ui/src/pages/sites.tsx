import { useState } from 'react';
import {
  useSitesPolling,
  useGeneratePortfolio,
  useGenerateTargeted,
  useDeleteSite,
} from '@/hooks/use-sites';
import { useJobPostings } from '@/hooks/use-job-postings';
import { ThemeGallery } from '@/components/ThemeGallery';
import { PreviewModal } from '@/components/PreviewModal';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Eye,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SiteResponse } from '@/types/api';

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge>Ready</Badge>;
    case 'queued':
      return <Badge variant="secondary">Queued</Badge>;
    case 'processing':
      return (
        <Badge variant="secondary">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Generating
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SitesPage() {
  const { data: sites, isLoading, error } = useSitesPolling();
  const { data: jobPostings } = useJobPostings();
  const genPortfolio = useGeneratePortfolio();
  const genTargeted = useGenerateTargeted();
  const deleteMut = useDeleteSite();

  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [showTargetedDialog, setShowTargetedDialog] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('onyx');
  const [selectedJobId, setSelectedJobId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SiteResponse | null>(null);
  const [genError, setGenError] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewSiteType, setPreviewSiteType] = useState<'portfolio' | 'targeted'>('portfolio');

  const handleGeneratePortfolio = async () => {
    setGenError('');
    try {
      await genPortfolio.mutateAsync({ theme: selectedTheme });
      setShowPortfolioDialog(false);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '';
      if (detail.toLowerCase().includes('username')) {
        setGenError('You need to set a username in Settings before generating sites.');
      } else {
        setGenError(detail || 'Generation failed');
      }
    }
  };

  const handleGenerateTargeted = async () => {
    setGenError('');
    try {
      await genTargeted.mutateAsync({
        job_posting_id: selectedJobId,
        theme: selectedTheme,
      });
      setShowTargetedDialog(false);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '';
      if (detail.toLowerCase().includes('username')) {
        setGenError('You need to set a username in Settings before generating sites.');
      } else {
        setGenError(detail || 'Generation failed');
      }
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMut.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Sites</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setGenError('');
                setShowPortfolioDialog(true);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {sites?.find((s) => s.type === 'portfolio') ? 'Regenerate Portfolio' : 'Generate Portfolio'}
            </Button>
            <Button
              onClick={() => {
                setGenError('');
                setShowTargetedDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Generate Targeted
            </Button>
          </div>
        </div>

        {genError && (
          <Alert variant="destructive">
            <AlertDescription>
              {genError}{' '}
              {genError.includes('username') && (
                <Link to="/app/settings" className="underline">
                  Go to Settings
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>Failed to load sites.</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {sites && sites.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Globe className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-medium">No sites generated yet</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                Generate a <strong>portfolio site</strong> for your public presence, or a{' '}
                <strong>targeted site</strong> tailored to a specific job posting.
              </p>
              <p className="text-sm text-muted-foreground">
                Start with your portfolio — it uses your full profile.
              </p>
            </CardContent>
          </Card>
        )}

        {sites && sites.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={site.type === 'portfolio' ? 'default' : 'secondary'}>
                          {site.type}
                        </Badge>
                        {site.stale && site.type === 'portfolio' && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Profile updated since last generation. Consider regenerating.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{site.theme}</TableCell>
                    <TableCell>{statusBadge(site.status)}</TableCell>
                    <TableCell>{formatDate(site.generated_at)}</TableCell>
                    <TableCell>
                      {site.status === 'completed' && site.public_url ? (
                        <a
                          href={site.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {site.status === 'failed' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (site.type === 'portfolio') {
                                    genPortfolio.mutate({ theme: site.theme });
                                  }
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {site.error_message || 'Retry generation'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {site.type === 'targeted' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(site)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Generate Portfolio Dialog */}
        <Dialog open={showPortfolioDialog} onOpenChange={setShowPortfolioDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {sites?.find((s) => s.type === 'portfolio') ? 'Regenerate Portfolio Site' : 'Generate Portfolio Site'}
              </DialogTitle>
              <DialogDescription>Choose a theme.</DialogDescription>
            </DialogHeader>
            <ThemeGallery selected={selectedTheme} onSelect={setSelectedTheme} variant="portfolio" />
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewSiteType('portfolio');
                  setShowPreview(true);
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button onClick={handleGeneratePortfolio} disabled={genPortfolio.isPending}>
                {genPortfolio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Targeted Dialog */}
        <Dialog open={showTargetedDialog} onOpenChange={setShowTargetedDialog}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Generate Targeted Site</DialogTitle>
              <DialogDescription>
                Create a site tailored to a specific job posting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Posting</label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job posting" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobPostings?.map((jp) => (
                      <SelectItem key={jp.id} value={jp.id}>
                        {jp.title} — {jp.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!jobPostings || jobPostings.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No job postings yet.{' '}
                    <Link to="/app/job-postings/new" className="text-primary hover:underline">
                      Add one first
                    </Link>
                    .
                  </p>
                )}
              </div>
              <ThemeGallery selected={selectedTheme} onSelect={setSelectedTheme} variant="targeted" />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setPreviewSiteType('targeted');
                  setShowPreview(true);
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> Preview
              </Button>
              <Button
                onClick={handleGenerateTargeted}
                disabled={!selectedJobId || genTargeted.isPending}
              >
                {genTargeted.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete targeted site?</DialogTitle>
              <DialogDescription>
                This will permanently remove the site and its generated files.
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

        {/* Preview Modal */}
        <PreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          theme={selectedTheme}
          siteType={previewSiteType}
          jobPostingId={previewSiteType === 'targeted' ? selectedJobId : undefined}
          onGenerate={() => {
            if (previewSiteType === 'portfolio') {
              handleGeneratePortfolio();
            } else {
              handleGenerateTargeted();
            }
          }}
        />
      </div>
    </TooltipProvider>
  );
}
