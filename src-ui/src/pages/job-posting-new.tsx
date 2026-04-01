import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateJobPosting,
  useScrapeJobPosting,
  useParseJobPosting,
} from '@/hooks/use-job-postings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { JobPostingCreate } from '@/types/api';

export default function JobPostingNewPage() {
  const navigate = useNavigate();
  const createMut = useCreateJobPosting();
  const scrapeMut = useScrapeJobPosting();
  const parseMut = useParseJobPosting();

  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [form, setForm] = useState<JobPostingCreate>({
    title: '',
    company: '',
    description: '',
    source_url: null,
    raw_text: null,
    requirements: null,
  });
  const [extracted, setExtracted] = useState(false);
  const [error, setError] = useState('');

  const populateForm = (draft: Partial<JobPostingCreate>) => {
    setForm({
      title: draft.title || '',
      company: draft.company || '',
      description: draft.description || '',
      source_url: draft.source_url || null,
      raw_text: draft.raw_text || null,
      requirements: draft.requirements || null,
    });
    setExtracted(true);
  };

  const handleScrape = async () => {
    setError('');
    try {
      const draft = await scrapeMut.mutateAsync({ url });
      populateForm({ ...draft, source_url: url });
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to extract from URL'
      );
    }
  };

  const handleParse = async () => {
    setError('');
    try {
      const draft = await parseMut.mutateAsync({ raw_text: rawText });
      populateForm({ ...draft, raw_text: rawText });
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to parse text'
      );
    }
  };

  const handleSave = async () => {
    setError('');
    try {
      await createMut.mutateAsync(form);
      navigate('/app/job-postings');
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to save'
      );
    }
  };

  const isExtracting = scrapeMut.isPending || parseMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/job-postings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Add Job Posting</h2>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="url">
            <TabsList className="mb-4">
              <TabsTrigger value="url">Paste URL</TabsTrigger>
              <TabsTrigger value="text">Paste Text</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="https://jobs.example.com/senior-engineer"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleScrape} disabled={!url || isExtracting}>
                  {scrapeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Extract
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-3">
              <Textarea
                placeholder="Paste the full job description text here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
              />
              <Button onClick={handleParse} disabled={!rawText || isExtracting}>
                {parseMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Extract
              </Button>
            </TabsContent>

            <TabsContent value="manual">
              {!extracted && (
                <Button
                  variant="secondary"
                  onClick={() => setExtracted(true)}
                >
                  Enter details manually
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {extracted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {form.title ? 'Review and edit' : 'Enter details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={10}
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!form.title || !form.company || !form.description || createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Job Posting
              </Button>
              <Button variant="outline" onClick={() => navigate('/app/job-postings')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
