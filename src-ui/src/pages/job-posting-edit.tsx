import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useJobPosting, useUpdateJobPosting } from '@/hooks/use-job-postings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function JobPostingEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: posting, isLoading, error } = useJobPosting(id!);
  const updateMut = useUpdateJobPosting();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (posting) {
      setTitle(posting.title);
      setCompany(posting.company);
      setDescription(posting.description);
    }
  }, [posting]);

  const handleSave = async () => {
    setSaveError('');
    try {
      await updateMut.mutateAsync({
        id: id!,
        data: { title, company, description },
      });
      navigate('/app/job-postings');
    } catch (err) {
      setSaveError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to save'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load job posting.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/job-postings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Edit Job Posting</h2>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{posting?.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={!title || !company || !description || updateMut.isPending}
            >
              {updateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/job-postings')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
